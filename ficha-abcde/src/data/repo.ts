import type { ZodType } from 'zod';
import {
  ActiveSessionSchema,
  PlanSchema,
  SCHEMA_VERSION,
  SessionSchema,
  SettingsSchema,
} from '../domain/schemas';
import type { ActiveSession, Plan, Session, Settings } from '../domain/schemas';
import { buildBackup, mergeBackup, parseBackup } from '../domain/backup';
import type { BackupData } from '../domain/backup';
import type { FichaDB } from './db';
import { defaultSettings, seedPlan } from './seed';

/** Valida uma linha; se inválida, isola em `quarantine` e devolve null (nunca lança). */
async function validated<T>(
  db: FichaDB,
  table: string,
  schema: ZodType<T>,
  raw: unknown,
  now: number,
): Promise<T | null> {
  const r = schema.safeParse(raw);
  if (r.success) return r.data;
  const id = (raw as { id?: unknown } | null)?.id;
  // Sem id, identifica pelo conteúdo. Assim reler o mesmo registro ruim não infla a contagem.
  const key = typeof id === 'string' ? id : (JSON.stringify(raw) ?? 'null').slice(0, 200);
  const already = await db.quarantine
    .where('table')
    .equals(table)
    .filter((q) => q.key === key)
    .count();
  if (already === 0) {
    await db.quarantine.add({
      table,
      key,
      reason: r.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
        .slice(0, 500),
      raw,
      at: now,
    });
  }
  return null;
}

export function createRepo(db: FichaDB, clock: () => number = Date.now) {
  const stripSlot = ({ slot: _slot, ...rest }: ActiveSession & { slot: 'current' }) =>
    rest;

  return {
    // ---- ficha ----
    async getPlan(): Promise<Plan> {
      const raw = await db.plan.get('plan');
      const plan = raw ? await validated(db, 'plan', PlanSchema, raw, clock()) : null;
      if (plan) return plan;
      return this.resetPlan(); // ausente ou corrompida: volta ao seed (a corrompida fica na quarentena)
    },
    async savePlan(plan: Plan): Promise<Plan> {
      const next = PlanSchema.parse({
        ...plan,
        schemaVersion: SCHEMA_VERSION,
        updatedAt: clock(),
      });
      await db.plan.put(next);
      return next;
    },
    async resetPlan(): Promise<Plan> {
      const plan = seedPlan(clock());
      await db.plan.put(plan);
      return plan;
    },

    // ---- sessão em andamento ----
    async getActive(): Promise<ActiveSession | null> {
      const raw = await db.activeSession.get('current');
      if (!raw) return null;
      const s = await validated(
        db,
        'activeSession',
        ActiveSessionSchema,
        stripSlot(raw),
        clock(),
      );
      if (!s) await db.activeSession.delete('current');
      return s;
    },
    /** Grava a cada alteração. Lança em caso de falha: quem chama mostra o aviso e tenta de novo. */
    async saveActive(s: ActiveSession): Promise<void> {
      const next = ActiveSessionSchema.parse({
        ...s,
        schemaVersion: SCHEMA_VERSION,
        updatedAt: clock(),
      });
      await db.activeSession.put({ ...next, slot: 'current' });
    },
    async discardActive(): Promise<void> {
      await db.activeSession.delete('current');
    },
    /**
     * Grava no histórico e apaga a sessão ativa na MESMA transação.
     * Idempotente: finalizar duas vezes mantém uma única linha (mesmo id, `put`).
     */
    async finishActive(endedAt: number = clock()): Promise<Session | null> {
      return db.transaction('rw', db.activeSession, db.sessions, async () => {
        const raw = await db.activeSession.get('current');
        if (!raw) return null;
        const { rest: _rest, updatedAt: _u, ...base } = stripSlot(raw);
        const done = SessionSchema.parse({
          ...base,
          schemaVersion: SCHEMA_VERSION,
          endedAt,
        });
        await db.sessions.put(done);
        await db.activeSession.delete('current');
        return done;
      });
    },

    /**
     * Finaliza a partir do estado em memória (não depende de a última gravação ter chegado):
     * grava no histórico e apaga a ativa numa transação só. Idempotente (mesmo id, `put`).
     */
    async finishWith(active: ActiveSession, endedAt: number = clock()): Promise<Session> {
      const { rest: _rest, updatedAt: _u, ...base } = active;
      const done = SessionSchema.parse({
        ...base,
        schemaVersion: SCHEMA_VERSION,
        endedAt,
      });
      await db.transaction('rw', db.activeSession, db.sessions, async () => {
        await db.sessions.put(done);
        await db.activeSession.delete('current');
      });
      return done;
    },

    // ---- histórico ----
    /** Histórico válido, do mais novo ao mais antigo. */
    async listSessions(): Promise<Session[]> {
      // toArray (e não orderBy): linhas sem o campo indexado sumiriam da leitura em vez de irem à quarentena.
      const rows = await db.sessions.toArray();
      const out: Session[] = [];
      for (const raw of rows) {
        const s = await validated(db, 'sessions', SessionSchema, raw, clock());
        if (s) out.push(s);
      }
      return out.sort((a, b) => b.startedAt - a.startedAt);
    },
    async deleteSession(id: string): Promise<void> {
      await db.sessions.delete(id);
    },

    // ---- ajustes ----
    async getSettings(): Promise<Settings> {
      const raw = await db.settings.get('settings');
      const s = raw
        ? await validated(db, 'settings', SettingsSchema, raw, clock())
        : null;
      if (s) return s;
      const d = defaultSettings();
      await db.settings.put(d);
      return d;
    },
    async saveSettings(s: Settings): Promise<void> {
      await db.settings.put(
        SettingsSchema.parse({ ...s, schemaVersion: SCHEMA_VERSION }),
      );
    },
    async quarantineCount(): Promise<number> {
      return db.quarantine.count();
    },

    // ---- backup ----
    async exportBackup(): Promise<string> {
      const data: BackupData = {
        plan: await this.getPlan(),
        settings: await this.getSettings(),
        sessions: await this.listSessions(),
      };
      return JSON.stringify(buildBackup(data, clock()), null, 2);
    },
    /** Mescla por id, sem duplicar. Devolve contagens para mostrar ao usuário. */
    async importBackup(json: string) {
      let raw: unknown;
      try {
        raw = JSON.parse(json);
      } catch {
        throw new Error('Arquivo de backup inválido (não é JSON).');
      }
      const incoming = parseBackup(raw);
      const local: BackupData = {
        plan: await this.getPlan(),
        settings: await this.getSettings(),
        sessions: await this.listSessions(),
      };
      const { data, added, skipped } = mergeBackup(local, incoming);
      await db.transaction('rw', db.plan, db.sessions, db.settings, async () => {
        if (data.plan) await db.plan.put(data.plan);
        if (data.settings) await db.settings.put(data.settings);
        await db.sessions.bulkPut(data.sessions);
      });
      return { added, skipped, ignored: incoming.ignored };
    },
  };
}
export type Repo = ReturnType<typeof createRepo>;
