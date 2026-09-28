import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { UpdateBanner } from '../../src/components/UpdateBanner';
import { useLeader } from '../../src/pwa/leader';
import { ensurePersistence } from '../../src/pwa/storage';
import { setUpdateAvailable } from '../../src/pwa/update';
import * as download from '../../src/pwa/download';
import { freshRepo } from './helpers';

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error limpeza do mock
  delete navigator.locks;
  setUpdateAvailable(null);
});

describe('aviso de atualização', () => {
  it('só aparece quando há versão nova e aplica ao tocar', async () => {
    render(<UpdateBanner />);
    expect(screen.queryByRole('status')).toBeNull();
    const apply = vi.fn();
    act(() => setUpdateAvailable(apply));
    expect(await screen.findByRole('status')).toHaveTextContent('Nova versão disponível');
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe('uma aba só (Web Locks)', () => {
  function fakeLocks() {
    let held = false;
    const queue: (() => void)[] = [];
    return {
      request: vi.fn(
        async (
          _n: string,
          opts: { ifAvailable?: boolean },
          cb?: (l: object | null) => Promise<unknown>,
        ) => {
          const run = async () => {
            held = true;
            try {
              await cb!({});
            } finally {
              held = false;
              queue.shift()?.();
            }
          };
          if (!held) return run();
          if (opts.ifAvailable) return cb!(null);
          return new Promise<void>((res) => queue.push(() => void run().then(res)));
        },
      ),
    };
  }
  it('sem Web Locks: escreve normalmente', () => {
    const { result } = renderHook(() => useLeader());
    expect(result.current).toBe(true);
  });
  it('primeira aba lidera; a segunda fica em leitura e assume quando a primeira sai', async () => {
    Object.defineProperty(navigator, 'locks', { value: fakeLocks(), configurable: true });
    const a = renderHook(() => useLeader());
    await waitFor(() => expect(a.result.current).toBe(true));
    const b = renderHook(() => useLeader());
    await waitFor(() => expect(b.result.current).toBe(false));
    a.unmount();
    await waitFor(() => expect(b.result.current).toBe(true));
  });
});

describe('armazenamento persistente', () => {
  it('pede uma vez e guarda o resultado', async () => {
    const persist = vi.fn(async () => true);
    Object.defineProperty(navigator, 'storage', {
      value: { persist, persisted: async () => false },
      configurable: true,
    });
    const { repo } = freshRepo();
    expect(await ensurePersistence(repo)).toBe(true);
    expect(await ensurePersistence(repo)).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
    expect((await repo.getSettings()).persistGranted).toBe(true);
  });
  it('sem suporte: não quebra e não registra nada', async () => {
    Object.defineProperty(navigator, 'storage', { value: {}, configurable: true });
    const { repo } = freshRepo();
    expect(await ensurePersistence(repo)).toBeNull();
    expect((await repo.getSettings()).persistGranted).toBeNull();
  });
});

describe('ErrorBoundary', () => {
  const Boom = () => {
    throw new Error('quebrou');
  };
  it('mostra tela de recuperação e permite exportar antes de limpar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const spy = vi.spyOn(download, 'downloadText').mockImplementation(() => {});
    const { repo, db } = freshRepo();
    render(
      <ErrorBoundary repo={repo} db={db}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado');
    await userEvent.click(screen.getByRole('button', { name: /Exportar meus dados/ }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.getByText(/Backup baixado/)).toBeInTheDocument();
    // limpar exige uma segunda confirmação
    await userEvent.click(screen.getByRole('button', { name: /Limpar dados locais/ }));
    expect(screen.getByText(/Exporte o backup antes/)).toBeInTheDocument();
  });
});
