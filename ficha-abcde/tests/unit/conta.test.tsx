import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { FichaDB } from '../../src/data/db';
import {
  dbNameFor,
  hasLocalData,
  loadProfile,
  moveLocalData,
  saveProfile,
} from '../../src/data/profile';
import { Root } from '../../src/Root';
import { seedPlan } from '../../src/data/seed';
import { friendlyAuthError } from '../../src/sync/supabaseBackend';
import { ACCOUNTS, fakeBackend } from './fakeBackend';
import { FakeServer } from './fakeServer';
import { session } from './helpers';

const ANON = 'ficha-abcde';
const U1 = dbNameFor({ userId: 'u1' });
const U2 = dbNameFor({ userId: 'u2' });

async function wipeAll() {
  localStorage.clear();
  for (const n of [ANON, U1, U2]) await Dexie.delete(n);
}
beforeEach(wipeAll);

async function seedDb(name: string, sessions: string[]) {
  const db = new FichaDB(name);
  await db.sessions.bulkPut(sessions.map((id) => session({ id, startedAt: 10 })));
  db.close();
}
async function sessionIds(name: string) {
  const db = new FichaDB(name);
  const ids = (await db.sessions.toArray()).map((s) => s.id).sort();
  db.close();
  return ids;
}

async function goAjustes() {
  await userEvent.click(await screen.findByRole('button', { name: 'Ajustes' }));
  await screen.findByText('Alerta de descanso');
}
async function loginUI(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.type(screen.getByLabelText('Senha'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

function mount(server = new FakeServer(), initial?: { id: string; email: string }) {
  const { backend, set } = fakeBackend(server, initial ?? null);
  render(<Root loadBackend={async () => backend} configured />);
  return { server, backend, set };
}

describe('perfil local por conta', () => {
  it('guarda só quem é o perfil ativo e nomeia o banco por conta', () => {
    expect(loadProfile()).toBeNull();
    saveProfile({ userId: 'abc', email: 'a@b.com' });
    expect(loadProfile()).toEqual({ userId: 'abc', email: 'a@b.com' });
    expect(dbNameFor(loadProfile())).toBe('ficha-abcde-u-abc');
    expect(dbNameFor(null)).toBe('ficha-abcde');
    saveProfile(null);
    expect(loadProfile()).toBeNull();
  });

  it('moveLocalData une sem duplicar, respeita o mais novo e esvazia a origem', async () => {
    const from = new FichaDB('mv-from');
    const to = new FichaDB('mv-to');
    await from.sessions.bulkPut([session({ id: 'a' }), session({ id: 'b' })]);
    await to.sessions.put(session({ id: 'b', note: 'da conta' }));
    await from.plan.put({ ...seedPlan(500), totalSessions: 9 });
    await to.plan.put({ ...seedPlan(100), totalSessions: 3 });
    expect(await hasLocalData(from)).toBe(true);
    await moveLocalData(from, to);
    expect((await to.sessions.toArray()).map((s) => s.id).sort()).toEqual(['a', 'b']);
    expect((await to.plan.get('plan'))?.totalSessions).toBe(9);
    expect(await hasLocalData(from)).toBe(false);
    expect(await from.sessions.count()).toBe(0);
    from.close();
    to.close();
    await Dexie.delete('mv-from');
    await Dexie.delete('mv-to');
  });

  it('banco vazio ou só com a ficha padrão não conta como dado local', async () => {
    const db = new FichaDB('vazio');
    await db.plan.put(seedPlan(0));
    expect(await hasLocalData(db)).toBe(false);
    db.close();
    await Dexie.delete('vazio');
  });
});

describe('mensagens de erro do login', () => {
  it('traduz os erros comuns', () => {
    expect(friendlyAuthError('Invalid login credentials')).toBe(
      'E-mail ou senha incorretos.',
    );
    expect(friendlyAuthError('Email not confirmed')).toMatch(/confirmar o e-mail/);
    expect(friendlyAuthError('email rate limit exceeded')).toMatch(/Muitos e-mails/);
    expect(
      friendlyAuthError(
        'For security purposes, you can only request this after 49 seconds.',
      ),
    ).toBe('Aguarde 49 segundos para pedir outro e-mail.');
    expect(friendlyAuthError('User already registered')).toMatch(/já tem conta/);
    expect(friendlyAuthError('outra coisa')).toBe('outra coisa');
  });
});

describe('contas diferentes no mesmo aparelho', () => {
  it('entrar com senha; senha errada mostra o erro e não conecta', async () => {
    mount();
    await goAjustes();
    await loginUI('ana@exemplo.com', 'errada');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha incorretos.',
    );
    expect(screen.queryByText(/Conectado como/)).toBeNull();
  });

  it('criar conta exige senha de 8+ caracteres e avisa para confirmar o e-mail', async () => {
    const { backend } = mount();
    await goAjustes();
    await userEvent.click(screen.getByRole('button', { name: 'Quero criar conta' }));
    await userEvent.type(screen.getByLabelText('E-mail'), 'nova@exemplo.com');
    await userEvent.type(screen.getByLabelText(/Senha \(mínimo 8/), '1234567');
    const submit = screen.getByRole('button', {
      name: 'Criar conta',
      pressed: undefined,
      description: '',
    } as never);
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Senha \(mínimo 8/), '8');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(
      await screen.findByText(/Enviamos um e-mail de confirmação/),
    ).toBeInTheDocument();
    expect(backend.signUp).toHaveBeenCalledWith('nova@exemplo.com', '12345678');
  });

  it('e-mail já cadastrado: orienta a usar "Entrar"', async () => {
    mount();
    await goAjustes();
    await userEvent.click(screen.getByRole('button', { name: 'Quero criar conta' }));
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await userEvent.type(screen.getByLabelText(/Senha \(mínimo 8/), 'qualquer-senha');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/já tem conta/);
  });

  it('treinos do aparelho (sem login) são vinculados à conta que entrar, e a nuvem recebe', async () => {
    await seedDb(ANON, ['treino-antigo']);
    const { server } = mount();
    await goAjustes();
    await loginUI('ana@exemplo.com', ACCOUNTS['ana@exemplo.com']!.password);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('ana@exemplo.com');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Vincular à conta' }),
    );

    await waitFor(async () => expect(await sessionIds(U1)).toEqual(['treino-antigo']));
    await waitFor(async () => expect(await sessionIds(ANON)).toEqual([])); // movido, não copiado
    expect(loadProfile()).toEqual({ userId: 'u1', email: 'ana@exemplo.com' });
    await waitFor(() =>
      expect(server.get('u1', 'sessions', 'treino-antigo')).toBeDefined(),
    );
    // e a tela já mostra o treino dela
    expect(await screen.findByText('Sessões: 1/40')).toBeInTheDocument();
  });

  it('recusar o vínculo começa do zero e os treinos do aparelho continuam guardados', async () => {
    await seedDb(ANON, ['so-do-aparelho']);
    const { server } = mount();
    await goAjustes();
    await loginUI('bia@exemplo.com', ACCOUNTS['bia@exemplo.com']!.password);
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Começar do zero',
      }),
    );
    expect(await screen.findByText('Sessões: 0/40')).toBeInTheDocument();
    expect(await sessionIds(ANON)).toEqual(['so-do-aparelho']);
    await waitFor(() => expect(loadProfile()?.userId).toBe('u2'));
    expect(server.get('u2', 'sessions', 'so-do-aparelho')).toBeUndefined(); // nada vazou para a conta
  });

  it('duas pessoas no mesmo celular: cada uma vê só os próprios treinos, e nada se perde ao trocar', async () => {
    await seedDb(U1, ['treino-da-ana-1', 'treino-da-ana-2']);
    saveProfile({ userId: 'u1', email: 'ana@exemplo.com' });
    const server = new FakeServer();
    const { backend } = fakeBackend(server, { id: 'u1', email: 'ana@exemplo.com' });
    localStorage.setItem('sb-x-auth-token', '{}');
    render(<Root loadBackend={async () => backend} configured />);
    expect(await screen.findByText('Sessões: 2/40')).toBeInTheDocument();

    await goAjustes();
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));
    // agora anônimo: nenhum treino da Ana aparece
    expect(await screen.findByText('Sessões: 0/40')).toBeInTheDocument();
    expect(loadProfile()).toBeNull();

    // Bia entra no mesmo aparelho
    await goAjustes();
    await loginUI('bia@exemplo.com', ACCOUNTS['bia@exemplo.com']!.password);
    expect(await screen.findByText('Sessões: 0/40')).toBeInTheDocument();
    expect(await sessionIds(U1)).toEqual(['treino-da-ana-1', 'treino-da-ana-2']); // intactos
    expect(server.get('u2', 'sessions', 'treino-da-ana-1')).toBeUndefined();
    await goAjustes();
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    // Ana volta e reencontra tudo
    await goAjustes();
    await loginUI('ana@exemplo.com', ACCOUNTS['ana@exemplo.com']!.password);
    expect(await screen.findByText('Sessões: 2/40')).toBeInTheDocument();
  });

  it('sessão trocada por fora (outra conta): abre o banco da nova conta sem vazar dados da anterior', async () => {
    await seedDb(U1, ['da-ana']);
    saveProfile({ userId: 'u1', email: 'ana@exemplo.com' });
    const server = new FakeServer();
    const { backend } = fakeBackend(server, { id: 'u2', email: 'bia@exemplo.com' });
    localStorage.setItem('sb-x-auth-token', '{}');
    render(<Root loadBackend={async () => backend} configured />);
    await waitFor(() => expect(loadProfile()?.userId).toBe('u2'));
    expect(await screen.findByText('Sessões: 0/40')).toBeInTheDocument();
    expect(server.get('u2', 'sessions', 'da-ana')).toBeUndefined();
  });

  it('"Sair e apagar dados deste aparelho" remove o banco da conta (a nuvem fica)', async () => {
    await seedDb(U1, ['a']);
    saveProfile({ userId: 'u1', email: 'ana@exemplo.com' });
    const server = new FakeServer();
    await server.remote('u1').push('sessions', [
      {
        id: 'a',
        data: session({ id: 'a' }),
        updated_at: new Date(1).toISOString(),
        deleted_at: null,
      },
    ]);
    const { backend } = fakeBackend(server, { id: 'u1', email: 'ana@exemplo.com' });
    localStorage.setItem('sb-x-auth-token', '{}');
    render(<Root loadBackend={async () => backend} configured />);
    await screen.findByText('Sessões: 1/40');
    await goAjustes();
    await userEvent.click(await screen.findByText('Emprestando este aparelho?'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Sair e apagar dados deste aparelho' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Sair e apagar' }),
    );
    await waitFor(async () => expect(await Dexie.exists(U1)).toBe(false));
    expect(server.get('u1', 'sessions', 'a')).toBeDefined();
    expect(loadProfile()).toBeNull();
  });
});
