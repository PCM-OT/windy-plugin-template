import { describe, expect, it } from 'vitest';
import { buildBackup, parseBackup } from '../../src/domain/backup';
import { active, freshRepo, session } from './helpers';

describe('plano', () => {
  it('cria o seed na primeira leitura e restaura a original', async () => {
    const { repo } = freshRepo();
    const p = await repo.getPlan();
    expect(p.workouts).toHaveLength(5);
    await repo.savePlan({ ...p, totalSessions: 10 });
    expect((await repo.getPlan()).totalSessions).toBe(10);
    expect((await repo.resetPlan()).totalSessions).toBe(40);
  });
  it('plano corrompido vai para a quarentena e volta ao seed', async () => {
    const { repo, db } = freshRepo();
    await db.plan.put({ id: 'plan', lixo: true } as never);
    expect((await repo.getPlan()).workouts).toHaveLength(5);
    expect(await repo.quarantineCount()).toBe(1);
  });
});

describe('sessão ativa e finalização', () => {
  it('persiste e retoma exatamente como estava (incluindo descanso)', async () => {
    const { repo } = freshRepo();
    const rest = { endAt: 5_000, totalMs: 60_000, exerciseId: 'A-2' };
    await repo.saveActive(active({ rest, note: 'ok' }));
    const back = await repo.getActive();
    expect(back?.rest).toEqual(rest);
    expect(back?.note).toBe('ok');
  });
  it('finalizar grava histórico, apaga a ativa e é idempotente', async () => {
    const { repo, db } = freshRepo();
    await repo.saveActive(active());
    const done = await repo.finishActive(999);
    expect(done?.endedAt).toBe(999);
    expect(await repo.getActive()).toBeNull();
    expect(await repo.finishActive(1234)).toBeNull(); // segunda vez: nada a fazer
    expect(await db.sessions.count()).toBe(1);
    expect((await repo.listSessions())[0]?.endedAt).toBe(999);
  });
  it('é atômico: se a gravação do histórico falha, a sessão ativa continua', async () => {
    const { repo, db } = freshRepo();
    await repo.saveActive(active());
    db.sessions.hook('creating', () => {
      throw new Error('cota cheia');
    });
    await expect(repo.finishActive()).rejects.toThrow();
    expect(await repo.getActive()).not.toBeNull();
    expect(await db.sessions.count()).toBe(0);
  });
  it('sessão ativa inválida é isolada, não derruba a leitura', async () => {
    const { repo, db } = freshRepo();
    await db.activeSession.put({ slot: 'current', id: 'x' } as never);
    expect(await repo.getActive()).toBeNull();
    expect(await repo.quarantineCount()).toBe(1);
  });
  it('valores fora do limite são recusados na escrita', async () => {
    const { repo } = freshRepo();
    const bad = active({
      sets: [{ exerciseId: 'A-2', idx: 0, kg: 900, reps: 1, done: true, doneAt: 1 }],
    });
    await expect(repo.saveActive(bad)).rejects.toThrow();
  });
});

describe('histórico e backup', () => {
  it('ignora registros inválidos no histórico e conta na quarentena', async () => {
    const { repo, db } = freshRepo();
    await db.sessions.bulkPut([
      session({ id: 'ok' }),
      { id: 'ruim', startedAt: 1 } as never,
    ]);
    const list = await repo.listSessions();
    expect(list.map((s) => s.id)).toEqual(['ok']);
    expect(await repo.quarantineCount()).toBe(1);
  });
  it('exportar → apagar tudo → importar não perde nem duplica', async () => {
    const a = freshRepo();
    await a.db.sessions.bulkPut([
      session({ id: 's1', startedAt: 1 }),
      session({ id: 's2', startedAt: 2 }),
    ]);
    const json = await a.repo.exportBackup();

    const b = freshRepo();
    const r1 = await b.repo.importBackup(json);
    expect(r1).toMatchObject({ added: 2, skipped: 0, ignored: 0 });
    const r2 = await b.repo.importBackup(json); // de novo: nada duplica
    expect(r2).toMatchObject({ added: 0, skipped: 2 });
    expect((await b.repo.listSessions()).map((s) => s.id).sort()).toEqual(['s1', 's2']);
  });
  it('sessão finalizada local é imutável: importação não sobrescreve', async () => {
    const { repo } = freshRepo();
    await repo.importBackup(
      JSON.stringify(
        buildBackup(
          { plan: null, settings: null, sessions: [session({ id: 's', note: 'local' })] },
          1,
        ),
      ),
    );
    await repo.importBackup(
      JSON.stringify(
        buildBackup(
          { plan: null, settings: null, sessions: [session({ id: 's', note: 'outra' })] },
          2,
        ),
      ),
    );
    expect((await repo.listSessions())[0]?.note).toBe('local');
  });
  it('backup corrompido: itens inválidos são ignorados e contados', async () => {
    const { repo } = freshRepo();
    const raw = {
      ...buildBackup({ plan: null, settings: null, sessions: [session({ id: 'v' })] }, 1),
    };
    (raw.sessions as unknown[]).push({ id: 'quebrada' }, 42);
    expect(await repo.importBackup(JSON.stringify(raw))).toMatchObject({
      added: 1,
      ignored: 2,
    });
  });
  it('rejeita arquivo que não é backup', async () => {
    const { repo } = freshRepo();
    await expect(repo.importBackup('não é json')).rejects.toThrow(/inválido/);
    await expect(repo.importBackup('{"foo":1}')).rejects.toThrow();
  });
  it('parseBackup separa válidos e inválidos', () => {
    const p = parseBackup({
      app: 'ficha-abcde',
      schemaVersion: 1,
      exportedAt: 1,
      plan: { x: 1 },
      settings: null,
      sessions: [session()],
    });
    expect(p.sessions).toHaveLength(1);
    expect(p.ignored).toBe(1); // plano inválido
  });
});
