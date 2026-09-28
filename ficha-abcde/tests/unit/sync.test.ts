import { describe, expect, it } from 'vitest';
import { decideRemote } from '../../src/sync/conflicts';
import { createEngine } from '../../src/sync/engine';
import { FakeServer } from './fakeServer';
import { freshRepo, session } from './helpers';

const U = 'user-1';

describe('fila de saída (outbox)', () => {
  it('finalizar enfileira a sessão na mesma transação; reenfileirar coalesce', async () => {
    const { repo, db } = freshRepo();
    await repo.finishWith({ ...session(), rest: null, updatedAt: 1 } as never, 500);
    await repo.finishWith({ ...session(), rest: null, updatedAt: 1 } as never, 500); // idempotente
    expect(await db.outbox.toArray()).toMatchObject([
      { table: 'sessions', id: 'sess-1', op: 'upsert', at: 500 },
    ]);
  });
  it('é atômico: se enfileirar falha, a sessão não é gravada', async () => {
    const { repo, db } = freshRepo();
    db.outbox.hook('creating', () => {
      throw new Error('falha');
    });
    await expect(
      repo.finishWith({ ...session(), rest: null, updatedAt: 1 } as never, 500),
    ).rejects.toThrow();
    expect(await db.sessions.count()).toBe(0);
  });
  it('excluir vira operação delete; editar plano e resetar enfileiram; seed virgem não', async () => {
    const { repo, db } = freshRepo(() => 900);
    await db.sessions.put(session({ id: 'x' }));
    await repo.deleteSession('x');
    expect(await db.outbox.get({ table: 'sessions', id: 'x' })).toMatchObject({
      op: 'delete',
      at: 900,
    });

    await db.outbox.clear();
    const p = await repo.getPlan(); // seed virgem
    expect(p.updatedAt).toBe(0);
    expect(await db.outbox.count()).toBe(0);
    await repo.savePlan({ ...p, totalSessions: 12 });
    expect(await db.outbox.get({ table: 'plan', id: 'plan' })).toMatchObject({
      op: 'upsert',
      at: 900,
    });
    await db.outbox.clear();
    await repo.resetPlan();
    expect(await db.outbox.count()).toBe(1);
  });
  it('só som/vibração sincronizam; persistGranted não enfileira', async () => {
    const { repo, db } = freshRepo(() => 7);
    const s = await repo.getSettings();
    await repo.saveSettings({ ...s, persistGranted: true });
    expect(await db.outbox.count()).toBe(0);
    await repo.saveSettings({ ...s, sound: false });
    expect(await db.outbox.get({ table: 'settings', id: 'settings' })).toMatchObject({
      at: 7,
    });
    expect((await repo.getSettings()).updatedAt).toBe(7);
  });
  it('importar backup enfileira só o que é novo', async () => {
    const a = freshRepo();
    await a.db.sessions.bulkPut([session({ id: 's1' }), session({ id: 's2' })]);
    const json = await a.repo.exportBackup();
    const b = freshRepo();
    await b.db.sessions.put(session({ id: 's1' }));
    await b.repo.importBackup(json);
    expect((await b.db.outbox.toArray()).map((o) => o.id)).toEqual(['s2']);
  });
  it('enqueueAll sobe tudo, menos padrões nunca editados', async () => {
    const { repo, db } = freshRepo(() => 5);
    await db.sessions.bulkPut([session({ id: 'a' }), session({ id: 'b' })]);
    await repo.getPlan();
    await repo.getSettings();
    expect(await repo.enqueueAll()).toBe(2);
    expect((await db.outbox.toArray()).map((o) => o.table)).toEqual([
      'sessions',
      'sessions',
    ]);
  });
});

describe('regras de conflito (cliente)', () => {
  const d = (
    t: Parameters<typeof decideRemote>[0],
    local: number | null,
    remote: number,
    deleted = false,
  ) =>
    decideRemote(t, local === null ? null : { updatedAt: local }, {
      updatedAt: remote,
      deleted,
    });
  it('excluir vence editar', () => expect(d('sessions', 5, 1, true)).toBe('delete'));
  it('sessão finalizada é imutável', () => {
    expect(d('sessions', 1, 99)).toBe('skip');
    expect(d('sessions', null, 1)).toBe('apply');
  });
  it('plano/ajustes: última escrita vence; empate mantém o local', () => {
    expect(d('plan', 5, 9)).toBe('apply');
    expect(d('plan', 9, 5)).toBe('skip');
    expect(d('settings', 5, 5)).toBe('skip');
    expect(d('plan', null, 1)).toBe('apply');
  });
});

describe('motor de sincronização (dois aparelhos + servidor simulado)', () => {
  async function device(server: FakeServer, clock = () => 1000) {
    const d = freshRepo(clock);
    await d.repo.getPlan();
    await d.repo.getSettings();
    const engine = createEngine(d.db, server.remote(U));
    return { ...d, engine, sync: () => engine.sync() };
  }

  it('sessão finalizada no aparelho A aparece no B, e a fila esvazia', async () => {
    const server = new FakeServer();
    const A = await device(server);
    const B = await device(server);
    await A.db.sessions.put(session({ id: 's1' }));
    await A.repo.enqueueAll();
    expect(await A.sync()).toMatchObject({ pushed: 1 });
    expect(await A.engine.pending()).toBe(0);
    expect(await B.sync()).toMatchObject({ applied: 1 });
    expect((await B.repo.listSessions()).map((s) => s.id)).toEqual(['s1']);
    expect(await B.engine.pending()).toBe(0); // não devolve o que recebeu
  });

  it('é idempotente: repetir o ciclo não duplica nem reaplica', async () => {
    const server = new FakeServer();
    const A = await device(server);
    const B = await device(server);
    await A.db.sessions.put(session({ id: 's1' }));
    await A.repo.enqueueAll();
    await A.sync();
    await B.sync();
    expect(await B.sync()).toEqual({ pushed: 0, applied: 0 });
    expect(await B.db.sessions.count()).toBe(1);
    expect([...server.rows.keys()].filter((k) => k.includes('sessions'))).toHaveLength(1);
  });

  it('excluir vence editar: exclusão em A e edição concorrente em B convergem para excluído', async () => {
    const server = new FakeServer();
    const A = await device(server);
    const B = await device(server);
    await A.db.sessions.put(session({ id: 's1' }));
    await A.repo.enqueueAll();
    await A.sync();
    await B.sync();
    await A.repo.deleteSession('s1');
    await A.sync();
    // B "edita" sem saber (reenfileira a sessão) e só então sincroniza
    await B.db.outbox.add({ table: 'sessions', id: 's1', op: 'upsert', at: 9_999_999 });
    await B.sync();
    expect(await A.db.sessions.count()).toBe(0);
    expect(await B.db.sessions.count()).toBe(0);
    expect(server.get(U, 'sessions', 's1')?.deleted_at).not.toBeNull();
  });

  it('plano: última escrita vence entre aparelhos', async () => {
    const server = new FakeServer();
    let ta = 1000;
    const A = await device(server, () => ta);
    const B = await device(server, () => 2000);
    await A.repo.savePlan({ ...(await A.repo.getPlan()), totalSessions: 11 }); // updatedAt 1000
    await B.repo.savePlan({ ...(await B.repo.getPlan()), totalSessions: 22 }); // updatedAt 2000
    await B.sync();
    await A.sync(); // A envia o mais antigo (ignorado) e recebe o mais novo
    expect((await A.repo.getPlan()).totalSessions).toBe(22);
    ta = 3000;
    await A.repo.savePlan({ ...(await A.repo.getPlan()), totalSessions: 33 });
    await A.sync();
    await B.sync();
    expect((await B.repo.getPlan()).totalSessions).toBe(33);
  });

  it('seed virgem de um aparelho novo não sobrescreve a ficha editada em outro', async () => {
    const server = new FakeServer();
    const A = await device(server, () => 5000);
    await A.repo.savePlan({ ...(await A.repo.getPlan()), totalSessions: 12 });
    await A.sync();
    const B = await device(server, () => 9_000_000); // relógio bem mais novo, ficha nunca editada
    await B.repo.enqueueAll();
    await B.sync();
    expect((await B.repo.getPlan()).totalSessions).toBe(12);
    expect(server.get(U, 'plan', 'plan')?.data).toMatchObject({ totalSessions: 12 });
  });

  it('ajustes sincronizam som/vibração e mantêm persistGranted local', async () => {
    const server = new FakeServer();
    const A = await device(server, () => 100);
    const B = await device(server, () => 50);
    await B.repo.saveSettings({ ...(await B.repo.getSettings()), persistGranted: true });
    await A.repo.saveSettings({
      ...(await A.repo.getSettings()),
      sound: false,
      persistGranted: false,
    });
    await A.sync();
    expect(server.get(U, 'settings', 'settings')?.data).toEqual({
      sound: false,
      vibration: true,
    });
    await B.sync();
    expect(await B.repo.getSettings()).toMatchObject({
      sound: false,
      persistGranted: true,
    });
  });

  it('sem rede: nada se perde; a fila fica e sai quando a rede volta', async () => {
    const server = new FakeServer();
    const A = await device(server);
    await A.db.sessions.put(session({ id: 's1' }));
    await A.repo.enqueueAll();
    server.failing = 'fetch failed';
    await expect(A.sync()).rejects.toThrow('fetch failed');
    expect(await A.engine.pending()).toBe(1);
    server.failing = null;
    await A.sync();
    expect(await A.engine.pending()).toBe(0);
    expect(server.get(U, 'sessions', 's1')).toBeDefined();
  });

  it('linhas inválidas vindas da nuvem são ignoradas sem quebrar o ciclo', async () => {
    const server = new FakeServer();
    const A = await device(server);
    await server.remote(U).push('sessions', [
      {
        id: 'lixo',
        data: { qualquer: 'coisa' },
        updated_at: new Date(1).toISOString(),
        deleted_at: null,
      },
    ]);
    await server.remote(U).push('sessions', [
      {
        id: 'ok',
        data: session({ id: 'ok' }),
        updated_at: new Date(2).toISOString(),
        deleted_at: null,
      },
    ]);
    expect(await A.sync()).toMatchObject({ applied: 1 });
    expect((await A.repo.listSessions()).map((s) => s.id)).toEqual(['ok']);
  });

  it('cada usuário só enxerga o próprio espaço', async () => {
    const server = new FakeServer();
    const A = await device(server);
    await A.db.sessions.put(session({ id: 's1' }));
    await A.repo.enqueueAll();
    await A.sync();
    const other = freshRepo();
    const engine = createEngine(other.db, server.remote('user-2'));
    expect(await engine.sync()).toEqual({ pushed: 0, applied: 0 });
    expect(await other.db.sessions.count()).toBe(0);
  });

  it('leitura é incremental (cursor) e uma alteração reenfileirada durante o envio não se perde', async () => {
    const server = new FakeServer();
    const A = await device(server);
    const B = await device(server);
    await A.db.sessions.put(session({ id: 's1' }));
    await A.repo.enqueueAll();
    await A.sync();
    await B.sync();
    expect((await B.db.meta.get('cursor'))?.value).toMatchObject({
      sessions: expect.any(String),
    });
    await A.db.sessions.put(session({ id: 's2', startedAt: 9 }));
    await A.repo.enqueueAll();
    await A.sync();
    expect(await B.sync()).toMatchObject({ applied: 1 });
    expect(await B.db.sessions.count()).toBe(2);
  });
});
