/**
 * Fila de gravação da sessão em andamento: coalescida (só a versão mais nova importa),
 * serial e com nova tentativa em falha. Nunca engole erro: `onError` mostra o aviso.
 */
export function createSaver<T>(
  write: (v: T) => Promise<void>,
  onError: (message: string | null) => void,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  let latest: { v: T } | null = null;
  let running = false;
  let closed = false;

  async function run() {
    if (running) return;
    running = true;
    let attempt = 0;
    while (latest && !closed) {
      const job = latest;
      latest = null;
      try {
        await write(job.v);
        attempt = 0;
        onError(null);
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
        latest ??= job; // uma versão mais nova, se houver, já substitui esta
        attempt++;
        await wait(Math.min(5000, 300 * 2 ** attempt));
      }
    }
    running = false;
  }

  return {
    schedule(v: T) {
      if (closed) return;
      latest = { v };
      void run();
    },
    /** Após finalizar/descartar: nada mais deve ser gravado. */
    close() {
      closed = true;
      latest = null;
    },
  };
}
