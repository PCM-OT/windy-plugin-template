import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { AppDataProvider } from '../../src/data/AppData';
import { buildBackup } from '../../src/domain/backup';
import * as download from '../../src/pwa/download';
import { freshRepo, session } from './helpers';

const NOW = Date.parse('2026-06-10T15:00:00Z');

async function open(pre?: (r: ReturnType<typeof freshRepo>) => Promise<void>) {
  const r = freshRepo(() => NOW);
  await pre?.(r);
  render(
    <AppDataProvider repo={r.repo} now={() => NOW}>
      <App />
    </AppDataProvider>,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Ajustes' }));
  await screen.findByText('Alerta de descanso');
  return r;
}
const file = (obj: unknown) =>
  new File([typeof obj === 'string' ? obj : JSON.stringify(obj)], 'b.json', {
    type: 'application/json',
  });

beforeEach(() => vi.restoreAllMocks());

describe('aba Ajustes', () => {
  it('som e vibração ligam/desligam e persistem', async () => {
    const r = await open();
    await userEvent.click(screen.getByLabelText('Som'));
    await userEvent.click(screen.getByLabelText('Vibração'));
    await waitFor(async () =>
      expect(await r.repo.getSettings()).toMatchObject({
        sound: false,
        vibration: false,
      }),
    );
    expect(screen.getByLabelText('Som')).not.toBeChecked();
  });

  it('testar alerta usa os ajustes atuais', async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Testar alerta' }));
    await waitFor(() => expect(vibrate).toHaveBeenCalled());
    vibrate.mockClear();
    await userEvent.click(screen.getByLabelText('Vibração'));
    await userEvent.click(screen.getByRole('button', { name: 'Testar alerta' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('exporta o backup em JSON com nome datado', async () => {
    const spy = vi.spyOn(download, 'downloadText').mockImplementation(() => {});
    await open((r) => r.db.sessions.put(session({ id: 'x' })).then(() => undefined));
    await userEvent.click(screen.getByRole('button', { name: 'Exportar backup' }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [name, text] = spy.mock.calls[0]!;
    expect(name).toBe('ficha-abcde-2026-06-10.json');
    expect(JSON.parse(text).sessions.map((s: { id: string }) => s.id)).toEqual(['x']);
  });

  it('importa mesclando sem duplicar e informa as contagens', async () => {
    const r = await open((x) =>
      x.db.sessions.put(session({ id: 'ja-existe' })).then(() => undefined),
    );
    const backup = buildBackup(
      {
        plan: null,
        settings: null,
        sessions: [session({ id: 'ja-existe' }), session({ id: 'nova', startedAt: 500 })],
      },
      1,
    );
    await userEvent.upload(screen.getByLabelText('Importar backup'), file(backup));
    expect(
      await screen.findByText(/1 treino adicionado, 1 já existiam/),
    ).toBeInTheDocument();
    expect(await r.repo.listSessions()).toHaveLength(2);
    await userEvent.upload(screen.getByLabelText('Importar backup'), file(backup));
    expect(
      await screen.findByText(/0 treinos adicionados, 2 já existiam/),
    ).toBeInTheDocument();
    expect(await r.repo.listSessions()).toHaveLength(2);
  });

  it('backup corrompido: avisa e não altera nada; itens inválidos são contados', async () => {
    const r = await open();
    await userEvent.upload(
      screen.getByLabelText('Importar backup'),
      file('isto não é json'),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Importação cancelada, nada foi alterado/,
    );
    const partial = buildBackup(
      { plan: null, settings: null, sessions: [session({ id: 'ok' })] },
      1,
    );
    (partial.sessions as unknown[]).push({ id: 'quebrada' });
    await userEvent.upload(screen.getByLabelText('Importar backup'), file(partial));
    expect(await screen.findByText(/1 registro ignorado/)).toBeInTheDocument();
    expect(await r.repo.listSessions()).toHaveLength(1);
  });

  it('mostra registros isolados na quarentena', async () => {
    await open((r) =>
      r.db.sessions
        .put({ id: 'ruim' } as never)
        .then(() => r.repo.listSessions())
        .then(() => undefined),
    );
    expect(
      await screen.findByText(/1 registro ignorado por estarem inválidos/),
    ).toBeInTheDocument();
  });

  it('armazenamento persistente negado: avisa e sugere instalar', async () => {
    const r = await open((x) =>
      x.repo
        .getSettings()
        .then((s) => x.repo.saveSettings({ ...s, persistGranted: false })),
    );
    expect(await screen.findByText(/Instale o app na tela inicial/)).toBeInTheDocument();
    expect(screen.getByText('negado')).toBeInTheDocument();
    expect((await r.repo.getSettings()).persistGranted).toBe(false);
  });

  it('mostra status de sincronização e o guia de instalação', async () => {
    await open();
    expect(screen.getByText('Salvo neste aparelho.')).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
  });
});
