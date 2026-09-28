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

export class FichaDB extends Dexie {
  plan!: EntityTable<Plan, 'id'>;
  activeSession!: EntityTable<ActiveRow, 'slot'>;
  sessions!: EntityTable<Session, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  quarantine!: EntityTable<QuarantineRow, 'id'>;

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
  }
}
