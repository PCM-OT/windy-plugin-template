import Dexie, { type EntityTable } from 'dexie';
import type { ActiveSession, Plan, Session, Settings } from '../domain/schemas';
import { SCHEMA_VERSION } from '../domain/schemas';

export interface QuarantineRow {
  id?: number;
  table: string;
  key: string | null;
  reason: string;
  raw: unknown;
  at: number;
}

/** Só existe uma sessão em andamento: fica sempre no slot 'current'. */
export type ActiveRow = ActiveSession & { slot: 'current' };

export type SyncTable = 'sessions' | 'plan' | 'settings';

/** Alteração local ainda não enviada. Uma linha por (table, id): a mais nova substitui a anterior. */
export interface OutboxRow {
  seq?: number;
  table: SyncTable;
  id: string;
  op: 'upsert' | 'delete';
  /** UTC ms da alteração (usado como updated_at/deleted_at ao excluir). */
  at: number;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export class FichaDB extends Dexie {
  plan!: EntityTable<Plan, 'id'>;
  activeSession!: EntityTable<ActiveRow, 'slot'>;
  sessions!: EntityTable<Session, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  quarantine!: EntityTable<QuarantineRow, 'id'>;
  outbox!: EntityTable<OutboxRow, 'seq'>;
  meta!: EntityTable<MetaRow, 'key'>;
  private outboxListeners = new Set<() => void>();

  constructor(name = 'ficha-abcde') {
    super(name);
    // v1: tabelas base.
    this.version(1).stores({
      plan: 'id',
      activeSession: 'slot',
      sessions: 'id, startedAt, workoutId',
      settings: 'id',
    });
    // v2: quarentena de registros inválidos, índice por endedAt e schemaVersion em registros antigos.
    this.version(2)
      .stores({
        plan: 'id',
        activeSession: 'slot',
        sessions: 'id, startedAt, endedAt, workoutId',
        settings: 'id',
        quarantine: '++id, table',
      })
      .upgrade(async (tx) => {
        for (const t of ['plan', 'sessions', 'settings'] as const) {
          await tx
            .table(t)
            .toCollection()
            .modify((row: { schemaVersion?: number }) => {
              row.schemaVersion ??= SCHEMA_VERSION;
            });
        }
      });
    // v3: sincronização. Fila de saída (idempotente, coalescida por table+id) e metadados
    // (cursor de leitura, usuário da nuvem). Nada de dados existentes muda.
    this.version(3).stores({ outbox: '++seq, [table+id]', meta: 'key' });

    this.outbox.hook('creating', () => {
      queueMicrotask(() => this.outboxListeners.forEach((cb) => cb()));
    });
  }

  /** Avisa quando entra algo na fila de saída (para agendar o envio). */
  onOutboxChange(cb: () => void): () => void {
    this.outboxListeners.add(cb);
    return () => this.outboxListeners.delete(cb);
  }
}
