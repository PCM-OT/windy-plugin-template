import {
  BackupSchema,
  PlanSchema,
  SCHEMA_VERSION,
  SessionSchema,
  SettingsSchema,
} from './schemas';
import type { Plan, Session, Settings } from './schemas';

export interface BackupData {
  plan: Plan | null;
  settings: Settings | null;
  sessions: Session[];
}

export function buildBackup(data: BackupData, now: number) {
  return {
    app: 'ficha-abcde' as const,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    ...data,
  };
}

export interface ParsedBackup extends BackupData {
  /** Registros inválidos ignorados (nunca derrubam a importação). */
  ignored: number;
}

/** Lê um backup qualquer (JSON desconhecido). Lança só se nem o envelope for válido. */
export function parseBackup(raw: unknown): ParsedBackup {
  const env = BackupSchema.parse(raw);
  let ignored = 0;
  const sessions: Session[] = [];
  for (const item of env.sessions) {
    const r = SessionSchema.safeParse(item);
    if (r.success) sessions.push(r.data);
    else ignored++;
  }
  const plan = env.plan == null ? null : PlanSchema.safeParse(env.plan);
  const settings = env.settings == null ? null : SettingsSchema.safeParse(env.settings);
  if (plan && !plan.success) ignored++;
  if (settings && !settings.success) ignored++;
  return {
    sessions,
    plan: plan?.success ? plan.data : null,
    settings: settings?.success ? settings.data : null,
    ignored,
  };
}

/**
 * Mescla por id, sem duplicar. Sessões finalizadas são imutáveis: se o id já existe, mantém a local.
 * Plano: vence o de `updatedAt` maior. Configurações locais são mantidas se existirem.
 */
export function mergeBackup(local: BackupData, incoming: BackupData) {
  const known = new Set(local.sessions.map((s) => s.id));
  const added: Session[] = [];
  for (const s of incoming.sessions) {
    if (!known.has(s.id)) {
      known.add(s.id);
      added.push(s);
    }
  }
  const plan =
    incoming.plan && (!local.plan || incoming.plan.updatedAt > local.plan.updatedAt)
      ? incoming.plan
      : local.plan;
  return {
    data: {
      plan,
      settings: local.settings ?? incoming.settings,
      sessions: [...local.sessions, ...added],
    } satisfies BackupData,
    added: added.length,
    skipped: incoming.sessions.length - added.length,
  };
}
