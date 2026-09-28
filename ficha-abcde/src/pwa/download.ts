/** Baixa um texto como arquivo (backup). Funciona offline: só usa Blob local. */
export function downloadText(filename: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const backupFilename = (now: number) =>
  `ficha-abcde-${new Date(now).toISOString().slice(0, 10)}.json`;
