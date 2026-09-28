import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { FichaDB } from '../../src/data/db';

/** Cria um banco no formato da v1 (sem quarentena, sem schemaVersion) e reabre na versão atual. */
async function legacyV1(name: string) {
  const old = new Dexie(name);
  old.version(1).stores({
    plan: 'id',
    activeSession: 'slot',
    sessions: 'id, startedAt, workoutId',
    settings: 'id',
  });
  await old.open();
  await old.table('sessions').put({
    id: 'antiga',
    workoutId: 'A',
    startedAt: 1,
    endedAt: 2,
    exercises: [],
    sets: [],
    note: '',
  });
  await old
    .table('settings')
    .put({ id: 'settings', sound: false, vibration: true, persistGranted: null });
  old.close();
}

describe('migração v1 → v3', () => {
  it('preserva dados, carimba schemaVersion e cria a quarentena', async () => {
    const name = `mig-${Math.random()}`;
    await legacyV1(name);
    const db = new FichaDB(name);
    await db.open();
    expect(db.verno).toBe(3);
    const s = await db.sessions.get('antiga');
    expect(s).toMatchObject({ id: 'antiga', schemaVersion: 1 });
    expect((await db.settings.get('settings'))?.sound).toBe(false);
    expect(await db.quarantine.count()).toBe(0);
    expect(db.sessions.schema.idxByName['endedAt']).toBeDefined();
    db.close();
  });
  it('não sobrescreve schemaVersion já existente', async () => {
    const name = `mig-${Math.random()}`;
    const old = new Dexie(name);
    old.version(1).stores({
      plan: 'id',
      activeSession: 'slot',
      sessions: 'id, startedAt, workoutId',
      settings: 'id',
    });
    await old.open();
    await old.table('settings').put({ id: 'settings', schemaVersion: 7 });
    old.close();
    const db = new FichaDB(name);
    expect((await db.settings.get('settings'))?.schemaVersion).toBe(7);
    db.close();
  });
  it('banco novo abre direto na versão atual', async () => {
    const db = new FichaDB(`novo-${Math.random()}`);
    await db.open();
    expect(db.verno).toBe(3);
    db.close();
  });
});

describe('migração v2 → v3 (sincronização)', () => {
  it('preserva os dados e cria outbox e meta, vazias', async () => {
    const name = `mig-v2-${Math.random()}`;
    const v2 = new Dexie(name);
    v2.version(1).stores({
      plan: 'id',
      activeSession: 'slot',
      sessions: 'id, startedAt, workoutId',
      settings: 'id',
    });
    v2.version(2).stores({
      plan: 'id',
      activeSession: 'slot',
      sessions: 'id, startedAt, endedAt, workoutId',
      settings: 'id',
      quarantine: '++id, table',
    });
    await v2.open();
    await v2.table('sessions').put({
      id: 's',
      schemaVersion: 1,
      workoutId: 'A',
      startedAt: 1,
      endedAt: 2,
      exercises: [],
      sets: [],
      note: '',
    });
    v2.close();

    const db = new FichaDB(name);
    await db.open();
    expect(db.verno).toBe(3);
    expect(await db.sessions.count()).toBe(1);
    expect(await db.outbox.count()).toBe(0);
    expect(await db.meta.count()).toBe(0);
    // a fila é coalescida por (table, id)
    await db.outbox.add({ table: 'sessions', id: 's', op: 'upsert', at: 1 });
    expect(db.outbox.schema.idxByName['[table+id]']).toBeDefined();
    db.close();
  });
});
