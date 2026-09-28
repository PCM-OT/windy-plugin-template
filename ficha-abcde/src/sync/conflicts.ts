import type { SyncTable } from '../data/db';

export type RemoteDecision = 'apply' | 'delete' | 'skip';

/**
 * Regras de conflito ao receber uma linha da nuvem (o servidor aplica as mesmas ao gravar):
 *  - excluir vence editar;
 *  - sessão finalizada é imutável: se já existe aqui, ignora;
 *  - plano/ajustes: última escrita vence por updated_at (empate mantém o local).
 */
export function decideRemote(
  table: SyncTable,
  local: { updatedAt: number } | null | undefined,
  remote: { updatedAt: number; deleted: boolean },
): RemoteDecision {
  if (remote.deleted) return table === 'sessions' ? 'delete' : 'skip';
  if (table === 'sessions') return local ? 'skip' : 'apply';
  if (local && local.updatedAt >= remote.updatedAt) return 'skip';
  return 'apply';
}
