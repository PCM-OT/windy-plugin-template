import { defaultSettings } from '../data/seed';
import type { FichaDB, SyncTable } from '../data/db';
import { PlanSchema, SessionSchema, SettingsSchema } from '../domain/schemas';
import { decideRemote } from './conflicts';

export interface PushRow {
  id: string;
  data: unknown;
  /** ISO. Relógio do cliente: decide "última escrita vence". */
  updated_at: string;
  deleted_at: string | null;
}

export interface RemoteRow extends PushRow {
  /** ISO. Relógio do servidor: cursor de leitura. */
  synced_at: string;
}

/** Ponte com a nuvem (Supabase em produção, simulada nos testes). */
export interface Remote {
  push(table: SyncTable, rows: PushRow[]): Promise<void>;
  /** Linhas com synced_at >= since (inclusivo; a aplicação é idempotente). */
  pull(table: SyncTable, since: string | null): Promise<RemoteRow[]>;
}

const TABLES: SyncTable[] = ['sessions', 'plan', 'settings'];
const CHUNK = 50;
const iso = (ms: number) => new Date(ms).toISOString();

export interface SyncResult {
  pushed: number;
  /** Mudanças realmente aplicadas neste aparelho (se > 0, a tela precisa recarregar). */
  applied: number;
}

export function createEngine(db: FichaDB, remote: Remote) {
  /** Envia a fila. Cada lote só sai da fila depois de confirmado; falha = tenta de novo depois. */
  async function push(): Promise<number> {
    const rows = await db.outbox.orderBy('seq').toArray();
    const payloads: Record<SyncTable, { seq: number; row: PushRow }[]> = {
      sessions: [],
      plan: [],
      settings: [],
    };
    const drop: number[] = [];

    for (const r of rows) {
      const seq = r.seq!;
      if (r.op === 'delete') {
        payloads[r.table].push({
          seq,
          row: { id: r.id, data: {}, updated_at: iso(r.at), deleted_at: iso(r.at) },
        });
        continue;
      }
      if (r.table === 'sessions') {
        const s = await db.sessions.get(r.id);
        if (!s) drop.push(seq);
        else
          payloads.sessions.push({
            seq,
            row: { id: r.id, data: s, updated_at: iso(s.endedAt), deleted_at: null },
          });
      } else if (r.table === 'plan') {
        const p = await db.plan.get('plan');
        if (!p) drop.push(seq);
        else
          payloads.plan.push({
            seq,
            row: { id: r.id, data: p, updated_at: iso(p.updatedAt), deleted_at: null },
          });
      } else {
        const st = await db.settings.get('settings');
        if (!st) drop.push(seq);
        // persistGranted é do aparelho: não sobe.
        else
          payloads.settings.push({
            seq,
            row: {
              id: r.id,
              data: { sound: st.sound, vibration: st.vibration },
              updated_at: iso(st.updatedAt ?? 0),
              deleted_at: null,
            },
          });
      }
    }
    if (drop.length) await db.outbox.bulkDelete(drop);

    let pushed = 0;
    for (const table of TABLES) {
      const list = payloads[table];
      for (let i = 0; i < list.length; i += CHUNK) {
        const chunk = list.slice(i, i + CHUNK);
        await remote.push(
          table,
          chunk.map((c) => c.row),
        );
        // Só remove o que foi enviado: se a linha foi reenfileirada (seq novo), continua na fila.
        await db.outbox.bulkDelete(chunk.map((c) => c.seq));
        pushed += chunk.length;
      }
    }
    return pushed;
  }

  async function getCursor(): Promise<Partial<Record<SyncTable, string>>> {
    return (
      ((await db.meta.get('cursor'))?.value as
        Partial<Record<SyncTable, string>> | undefined) ?? {}
    );
  }

  /** Lê o que mudou na nuvem e aplica com as regras de conflito. Devolve quantas mudanças aplicou. */
  async function pull(): Promise<number> {
    const cursor = await getCursor();
    let applied = 0;

    for (const table of TABLES) {
      const rows = await remote.pull(table, cursor[table] ?? null);
      let maxSynced = cursor[table] ?? null;

      for (const row of rows) {
        if (maxSynced === null || row.synced_at > maxSynced) maxSynced = row.synced_at;
        const remoteAt = Date.parse(row.updated_at);
        const deleted = row.deleted_at !== null;

        if (table === 'sessions') {
          const local = await db.sessions.get(row.id);
          const decision = decideRemote(
            'sessions',
            local ? { updatedAt: local.endedAt } : null,
            { updatedAt: remoteAt, deleted },
          );
          if (decision === 'delete') {
            if (local) {
              await db.sessions.delete(row.id);
              applied++;
            }
            await db.outbox.where('[table+id]').equals(['sessions', row.id]).delete(); // não ressuscitar
          } else if (decision === 'apply') {
            const parsed = SessionSchema.safeParse(row.data);
            if (parsed.success) {
              await db.sessions.put(parsed.data);
              applied++;
            }
          }
        } else if (table === 'plan') {
          const local = await db.plan.get('plan');
          if (decideRemote('plan', local, { updatedAt: remoteAt, deleted }) === 'apply') {
            const parsed = PlanSchema.safeParse(row.data);
            if (parsed.success) {
              await db.plan.put(parsed.data);
              applied++;
            }
          }
        } else {
          const local = await db.settings.get('settings');
          if (
            decideRemote('settings', local ? { updatedAt: local.updatedAt ?? 0 } : null, {
              updatedAt: remoteAt,
              deleted,
            }) === 'apply'
          ) {
            const d = row.data as { sound?: unknown; vibration?: unknown };
            const parsed = SettingsSchema.safeParse({
              ...(local ?? defaultSettings()),
              sound: d.sound,
              vibration: d.vibration,
              updatedAt: remoteAt,
            });
            if (parsed.success) {
              await db.settings.put(parsed.data);
              applied++;
            }
          }
        }
      }
      if (maxSynced !== null && maxSynced !== cursor[table]) {
        cursor[table] = maxSynced;
        await db.meta.put({ key: 'cursor', value: { ...cursor } });
      }
    }
    return applied;
  }

  return {
    /** Um ciclo: primeiro envia (para uma exclusão nossa chegar antes de lermos), depois lê. */
    async sync(): Promise<SyncResult> {
      const pushed = await push();
      const applied = await pull();
      return { pushed, applied };
    },
    pending: () => db.outbox.count(),
  };
}
