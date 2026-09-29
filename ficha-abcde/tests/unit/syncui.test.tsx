import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App';
import { AppDataProvider } from '../../src/data/AppData';
import { SyncProvider } from '../../src/sync/SyncProvider';
import type { SyncBackend } from '../../src/sync/types';
import { fakeBackend } from './fakeBackend';
import { FakeServer } from './fakeServer';
import { freshRepo, session } from './helpers';

async function open(
  opts: {
    backend?: SyncBackend | null;
    configured?: boolean;
    pre?: (r: ReturnType<typeof freshRepo>) => Promise<void>;
  } = {},
) {
  const r = freshRepo(() => 5000);
  await opts.pre?.(r);
  render(
    <AppDataProvider repo={r.repo} now={() => 5000}>
      <SyncProvider
        db={r.db}
        configured={opts.configured ?? true}
        loadBackend={async () => opts.backend ?? null}
      >
        <App />
      </SyncProvider>
    </AppDataProvider>,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Ajustes' }));
  await screen.findByText('Alerta de descanso');
  return r;
}

describe('Ajustes › sincronização', () => {
  it('sem configuração: explica e o app segue local', async () => {
    await open({ configured: false });
    expect(screen.getByText(/não estão configuradas neste build/)).toBeInTheDocument();
    expect(screen.getByTestId('sync-status')).toHaveTextContent('Salvo neste aparelho.');
  });

  it('sem login: pede e-mail, envia o link e aceita o código', async () => {
    const server = new FakeServer();
    const { backend } = fakeBackend(server);
    await open({ backend });
    expect(screen.getByTestId('sync-status')).toHaveTextContent('Salvo neste aparelho.');
    const send = screen.getByRole('button', { name: 'Enviar link de acesso' });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await userEvent.click(send);
    expect(await screen.findByText(/Link enviado/)).toBeInTheDocument();
    expect(backend.signInWithEmail).toHaveBeenCalledWith('ana@exemplo.com');
    await userEvent.type(screen.getByLabelText('Ou digite o código do e-mail'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar com código' }));
    expect(await screen.findByText(/Conectado como/)).toHaveTextContent(
      'ana@exemplo.com',
    );
  });

  it('ao entrar, sobe o que já existe no aparelho e mostra Sincronizado', async () => {
    const server = new FakeServer();
    const { backend } = fakeBackend(server);
    const r = await open({
      backend,
      pre: (x) => x.db.sessions.put(session({ id: 'antiga' })).then(() => undefined),
    });
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link de acesso' }));
    await userEvent.type(
      await screen.findByLabelText('Ou digite o código do e-mail'),
      '123456',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Entrar com código' }));
    await waitFor(() => expect(server.get('u1', 'sessions', 'antiga')).toBeDefined());
    await waitFor(() =>
      expect(screen.getByTestId('sync-status')).toHaveTextContent('Sincronizado.'),
    );
    expect(await r.db.outbox.count()).toBe(0);
    expect((await r.db.meta.get('user'))?.value).toBe('u1');
  });

  it('já logado: mostra a conta, sincroniza e "Sair" não apaga dados locais', async () => {
    const server = new FakeServer();
    await server.remote('u1').push('sessions', [
      {
        id: 'da-nuvem',
        data: session({ id: 'da-nuvem' }),
        updated_at: new Date(1).toISOString(),
        deleted_at: null,
      },
    ]);
    const { backend } = fakeBackend(server, { id: 'u1', email: 'ana@exemplo.com' });
    // simula "tinha login guardado": o provider só carrega o backend se houver token
    localStorage.setItem('sb-x-auth-token', '{}');
    const r = await open({ backend });
    expect(await screen.findByText(/Conectado como/)).toHaveTextContent(
      'ana@exemplo.com',
    );
    await waitFor(async () => expect(await r.db.sessions.count()).toBe(1)); // veio da nuvem
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(
      await screen.findByRole('button', { name: 'Enviar link de acesso' }),
    ).toBeInTheDocument();
    expect(await r.db.sessions.count()).toBe(1);
    localStorage.removeItem('sb-x-auth-token');
  });

  it('conta diferente da última usada: zera a fila antiga (não vaza dados para outra conta)', async () => {
    const server = new FakeServer();
    const { backend } = fakeBackend(server, { id: 'u2', email: 'b@exemplo.com' });
    localStorage.setItem('sb-x-auth-token', '{}');
    const r = await open({
      backend,
      pre: async (x) => {
        await x.db.meta.put({ key: 'user', value: 'u1' });
        await x.db.outbox.add({ table: 'sessions', id: 'orfa', op: 'upsert', at: 1 });
      },
    });
    await waitFor(async () => expect((await r.db.meta.get('user'))?.value).toBe('u2'));
    expect(server.get('u2', 'sessions', 'orfa')).toBeUndefined();
    localStorage.removeItem('sb-x-auth-token');
  });

  it('sem rede: mostra "Sem conexão" com as pendências e nada se perde', async () => {
    const server = new FakeServer();
    server.failing = 'fetch failed';
    const { backend } = fakeBackend(server, { id: 'u1', email: 'a@b.com' });
    localStorage.setItem('sb-x-auth-token', '{}');
    const r = await open({
      backend,
      pre: (x) => x.db.sessions.put(session({ id: 's' })).then(() => undefined),
    });
    await waitFor(() =>
      expect(screen.getByTestId('sync-status')).toHaveTextContent(
        /Sem conexão \(1 alteração pendente\)/,
      ),
    );
    expect(await r.db.sessions.count()).toBe(1);
    localStorage.removeItem('sb-x-auth-token');
  });
});
