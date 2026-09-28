import { describe, expect, it } from 'vitest';
import { createSaver } from '../../src/features/sessao/saver';

const tick = () => new Promise((r) => setTimeout(r, 0));
const noWait = () => Promise.resolve();

describe('saver', () => {
  it('grava a versão mais nova e serializa as escritas', async () => {
    const written: number[] = [];
    const s = createSaver(
      async (v: number) => {
        await tick();
        written.push(v);
      },
      () => {},
      noWait,
    );
    s.schedule(1);
    s.schedule(2);
    s.schedule(3);
    await new Promise((r) => setTimeout(r, 20));
    expect(written.at(-1)).toBe(3);
    expect(written.length).toBeLessThanOrEqual(2); // 1 e depois 3: a 2 foi coalescida
  });
  it('em falha avisa, tenta de novo e limpa o aviso ao conseguir', async () => {
    let calls = 0;
    const msgs: (string | null)[] = [];
    const s = createSaver(
      async () => {
        if (++calls < 3) throw new Error('cota cheia');
      },
      (m) => msgs.push(m),
      noWait,
    );
    s.schedule('x');
    await new Promise((r) => setTimeout(r, 30));
    expect(calls).toBe(3);
    expect(msgs).toEqual(['cota cheia', 'cota cheia', null]);
  });
  it('durante a falha, uma versão mais nova substitui a antiga', async () => {
    const seen: string[] = [];
    let fail = true;
    const s = createSaver(
      async (v: string) => {
        seen.push(v);
        if (fail) {
          fail = false;
          throw new Error('x');
        }
      },
      () => {},
      noWait,
    );
    s.schedule('velha');
    s.schedule('nova');
    await new Promise((r) => setTimeout(r, 20));
    expect(seen.at(-1)).toBe('nova');
  });
  it('depois de close() nada mais é gravado', async () => {
    const written: number[] = [];
    const s = createSaver(
      async (v: number) => {
        written.push(v);
      },
      () => {},
      noWait,
    );
    s.close();
    s.schedule(1);
    await tick();
    expect(written).toEqual([]);
  });
});
