import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App';
import { AppDataProvider } from '../../src/data/AppData';
import { freshRepo, session, set } from './helpers';

const NOW = Date.parse('2026-06-10T15:00:00Z');
const D = (iso: string) => Date.parse(iso);

async function open(sessions: ReturnType<typeof session>[]) {
  const r = freshRepo(() => NOW);
  await r.db.sessions.bulkPut(sessions);
  render(
    <AppDataProvider repo={r.repo} now={() => NOW}>
      <App />
    </AppDataProvider>,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Histórico' }));
  return r;
}
const s = (id: string, iso: string, p: Parameters<typeof session>[0] = {}) =>
  session({ id, startedAt: D(iso), endedAt: D(iso) + 3_600_000, ...p });

describe('aba Histórico', () => {
  it('estado vazio', async () => {
    await open([]);
    expect(await screen.findByText('Nenhum treino ainda')).toBeInTheDocument();
  });

  it('resumo, calendário com letras e lista por mês', async () => {
    await open([
      s('1', '2026-06-08T15:00:00Z', {
        workoutId: 'B',
        sets: [set({ kg: 40 }), set({ kg: 50, idx: 1 })],
      }),
      s('2', '2026-05-20T15:00:00Z', { workoutId: 'A', sets: [set({ kg: 30 })] }),
    ]);
    const summary = await screen.findByLabelText('Resumo');
    expect(summary).toHaveTextContent('Sessões2');
    expect(summary).toHaveTextContent('Na semana1');
    expect(summary).toHaveTextContent('Duração média1:00:00');
    expect(screen.getByRole('cell', { name: '8, treino B' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '10, hoje' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'junho de 2026' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'maio de 2026' })).toBeInTheDocument();
  });

  it('gráfico de evolução troca de exercício', async () => {
    await open([
      s('1', '2026-06-01T15:00:00Z', { sets: [set({ kg: 40 })] }),
      s('2', '2026-06-08T15:00:00Z', {
        sets: [set({ kg: 45 }), set({ exerciseId: 'A-3', kg: 80, idx: 0 })],
        exercises: [
          {
            id: 'A-2',
            name: 'Cadeira adutora',
            restSec: 60,
            noLoad: false,
            reps: null,
            machine: null,
          },
          {
            id: 'A-3',
            name: 'Agachamento',
            restSec: 90,
            noLoad: false,
            reps: null,
            machine: null,
          },
        ],
      }),
    ]);
    expect(
      await screen.findByRole('img', { name: /Carga máxima em Agachamento: 80 kg/ }),
    ).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Exercício'), 'A-2');
    expect(
      screen.getByRole('img', { name: /de 40 kg em 01\/06 para 45 kg em 08\/06/ }),
    ).toBeInTheDocument();
  });

  it('expande com todas as séries e anotação; excluir pede confirmação', async () => {
    const r = await open([
      s('1', '2026-06-08T15:00:00Z', {
        note: 'foi bem',
        sets: [
          set({ kg: 40, reps: 12 }),
          set({ kg: 40, reps: 11, idx: 1 }),
          set({ idx: 2, done: false }),
        ],
      }),
    ]);
    await userEvent.click(
      await screen.findByRole('button', { name: /Treino A/, expanded: false }),
    );
    expect(screen.getByText('40 kg × 12')).toBeInTheDocument();
    expect(screen.getByText('40 kg × 11')).toBeInTheDocument();
    expect(screen.getByText('não feita')).toBeInTheDocument();
    expect(screen.getByText(/foi bem/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir treino' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    );
    expect(await r.repo.listSessions()).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir treino' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }),
    );
    await waitFor(async () => expect(await r.repo.listSessions()).toHaveLength(0));
    expect(await screen.findByText('Nenhum treino ainda')).toBeInTheDocument();
  });

  it('pagina a lista longa (não renderiza tudo de uma vez)', async () => {
    const many = Array.from({ length: 120 }, (_, i) =>
      s(`s${i}`, new Date(D('2026-01-01T15:00:00Z') + i * 86_400_000).toISOString()),
    );
    await open(many);
    await screen.findByText(/Mostrar mais \(70 restantes\)/);
    expect(screen.getAllByRole('button', { name: /^Treino A/ })).toHaveLength(50);
    await userEvent.click(screen.getByRole('button', { name: /Mostrar mais/ }));
    expect(screen.getAllByRole('button', { name: /^Treino A/ })).toHaveLength(100);
  });
});
