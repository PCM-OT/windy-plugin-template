import type { SyncTable } from '../../src/data/db';
import type { PushRow, Remote, RemoteRow } from '../../src/sync/engine';

/** Réplica em memória das regras do servidor (supabase/migrations: sync_guard + RLS por usuário). */
export class FakeServer {
  rows = new Map<string, RemoteRow>(); // `${user}|${table}|${id}`
  private tick = 0;
  failing: string | null = null; // simula rede/servidor fora
  pushCalls = 0;

  private syncedAt = () =>
    new Date(Date.UTC(2026, 0, 1) + ++this.tick * 1000).toISOString();

  remote(user: string): Remote {
    return {
      push: async (table: SyncTable, rows: PushRow[]) => {
        this.pushCalls++;
        if (this.failing) throw new Error(this.failing);
        for (const r of rows) {
          const key = `${user}|${table}|${r.id}`;
          const old = this.rows.get(key);
          if (!old) {
            this.rows.set(key, { ...r, synced_at: this.syncedAt() });
            continue;
          }
          if (old.deleted_at) continue; // excluir vence editar
          if (r.deleted_at) {
            this.rows.set(key, {
              ...r,
              data: {},
              updated_at: r.updated_at > old.updated_at ? r.updated_at : old.updated_at,
              synced_at: this.syncedAt(),
            });
            continue;
          }
          if (table === 'sessions') continue; // finalizada é imutável
          if (r.updated_at < old.updated_at) continue; // última escrita vence
          this.rows.set(key, { ...r, synced_at: this.syncedAt() });
        }
      },
      pull: async (table: SyncTable, since: string | null) => {
        if (this.failing) throw new Error(this.failing);
        return [...this.rows.entries()]
          .filter(
            ([k, v]) =>
              k.startsWith(`${user}|${table}|`) &&
              (since === null || v.synced_at >= since),
          )
          .map(([, v]) => v)
          .sort((a, b) => a.synced_at.localeCompare(b.synced_at));
      },
    };
  }

  get(user: string, table: SyncTable, id: string) {
    return this.rows.get(`${user}|${table}|${id}`);
  }
}
