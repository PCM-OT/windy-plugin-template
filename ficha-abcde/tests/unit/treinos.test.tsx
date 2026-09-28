import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App';
import { AppDataProvider } from '../../src/data/AppData';
import { freshRepo, session } from './helpers';

const NOW = Date.parse('2026-06-01T15:00:00Z');
function setup(pre?: (r: ReturnType<typeof freshRepo>) => Promise<void>, now = NOW) {
  const r = freshRepo(() => now);
  const ready = pre ? pre(r) : Promise.resolve();
  const view = ready.then(() =>
    render(
      <AppDataProvider repo={r.repo} now={() => now}>
        <App />
      </AppDataProvider>,
    ),
  );
  return { ...r, view };
}

describe('aba Treinos', () => {
  it('destaca o próximo treino da rotação e mostra a última execução', async () => {
    const { view } = setup((r) =>
      r.db.sessions
        .bulkPut([
          session({
            id: '1',
            workoutId: 'B',
            startedAt: Date.parse('2026-05-20T15:00:00Z'),
            endedAt: Date.parse('2026-05-20T16:00:00Z'),
          }),
        ])
        .then(() => undefined),
    );
    await view;
    expect(
      await screen.findByRole('heading', { name: /Treino C · Bíceps femoral/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Treino B, Superiores' }),
    ).toHaveTextContent('último: 20/05');
    expect(screen.getByText('Sessões: 1/40')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Progresso das sessões' }),
    ).toHaveAttribute('aria-valuenow', '1');
  });
  it('avisa quando faltam 14 dias ou menos para a validade', async () => {
    const { view } = setup(undefined, Date.parse('2026-11-10T15:00:00Z'));
    await view;
    expect(await screen.findByRole('status')).toHaveTextContent('vence em 6 dias');
  });
  it('não avisa quando falta mais de 14 dias', async () => {
    await setup().view;
    await screen.findByText(/Ficha válida até 16\/11\/2026/);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('abre a pré-visualização com séries, reps, máquina e descanso', async () => {
    await setup().view;
    await userEvent.click(await screen.findByRole('button', { name: 'Ver' }));
    expect(await screen.findByRole('heading', { name: /Treino A/ })).toBeInTheDocument();
    const ex = screen.getByText('Cadeira extensora').closest('li')!;
    expect(ex).toHaveTextContent('4×10-12 · máq. 07 · descanso 1 min');
  });
  it('marca "a definir" no treino C', async () => {
    await setup().view;
    await userEvent.click(
      await screen.findByRole('button', { name: 'Treino C, Bíceps femoral' }),
    );
    expect(
      within(screen.getByText('Cadeira flexora').closest('li')!).getAllByText('a definir')
        .length,
    ).toBeGreaterThan(0);
  });
});

describe('editor', () => {
  async function openEditor() {
    const ctx = setup();
    await ctx.view;
    await userEvent.click(
      await screen.findByRole('button', { name: 'Treino A, Quadríceps' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Editar treino' }));
    return ctx;
  }
  it('edita, reordena, adiciona, remove com confirmação e salva no banco', async () => {
    const { repo } = await openEditor();
    const name = screen.getByLabelText('Nome');
    await userEvent.clear(name);
    await userEvent.type(name, 'Pernas');
    await userEvent.click(
      screen.getByRole('button', { name: 'Descer Mobilidade de quadril e tornozelo' }),
    );
    await userEvent.click(screen.getByRole('button', { name: '+ Adicionar exercício' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remover Leg press' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => {
      const a = (await repo.getPlan()).workouts[0]!;
      expect(a.name).toBe('Pernas');
      expect(a.exercises).toHaveLength(7); // 7 - 1 + 1
      expect(a.exercises[0]!.name).toBe('Cadeira adutora');
      expect(a.exercises.some((e) => e.name === 'Leg press')).toBe(false);
    });
  });
  it('aceita vírgula/ponto e rejeita valor inválido sem salvar', async () => {
    const { repo } = await openEditor();
    const rests = screen.getAllByLabelText('Descanso (s)');
    await userEvent.clear(rests[1]!);
    await userEvent.type(rests[1]!, '9999');
    expect(rests[1]).toHaveAttribute('aria-invalid', 'true');
    await userEvent.clear(rests[1]!);
    await userEvent.type(rests[1]!, '75');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () =>
      expect((await repo.getPlan()).workouts[0]!.exercises[1]!.restSec).toBe(75),
    );
  });
  it('mostra o erro (e não fecha) se a gravação falhar', async () => {
    const { db } = await openEditor();
    db.plan.hook('updating', () => {
      throw new Error('cota cheia');
    });
    const name = screen.getByLabelText('Nome');
    await userEvent.type(name, ' x');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível salvar/);
    expect(screen.getByRole('heading', { name: /Editar treino A/ })).toBeInTheDocument();
  });
  it('bloqueia salvar com nome vazio e lista o erro', async () => {
    await openEditor();
    await userEvent.clear(screen.getByLabelText('Exercício 1'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Exercício 1/);
  });
});

describe('restaurar ficha original', () => {
  it('pede confirmação e volta ao seed', async () => {
    const { repo, view } = setup();
    await view;
    await repo.savePlan({ ...(await repo.getPlan()), totalSessions: 12 });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Restaurar ficha original' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Restaurar' }),
    );
    await waitFor(async () => expect((await repo.getPlan()).totalSessions).toBe(40));
  });
  it('cancelar não altera nada', async () => {
    const { repo, view } = setup();
    await view;
    await repo.savePlan({ ...(await repo.getPlan()), totalSessions: 12 });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Restaurar ficha original' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    );
    expect((await repo.getPlan()).totalSessions).toBe(12);
  });
});
