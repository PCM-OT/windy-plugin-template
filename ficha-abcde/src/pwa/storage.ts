import type { Repo } from '../data/repo';

/** Pede armazenamento persistente uma vez (primeiro uso) e guarda o resultado para mostrar em Ajustes. */
export async function ensurePersistence(repo: Repo): Promise<boolean | null> {
  const settings = await repo.getSettings();
  if (settings.persistGranted !== null) return settings.persistGranted;
  if (!navigator.storage?.persist) return null;
  const granted =
    (await navigator.storage.persisted?.()) || (await navigator.storage.persist());
  await repo.saveSettings({ ...settings, persistGranted: granted });
  return granted;
}

export async function storageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  const e = await navigator.storage?.estimate?.();
  return e?.usage !== undefined && e.quota !== undefined
    ? { usage: e.usage, quota: e.quota }
    : null;
}
