import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { AppDataProvider } from '../../src/data/AppData';
import { useAppData } from '../../src/data/appDataContext';
import { SessaoScreen } from '../../src/features/sessao/SessaoScreen';
import { freshRepo, session } from './helpers';

const T0 = Date.parse('2026-06-01T15:00:00Z');

function setup(opts: { pre?: (r: ReturnType<typeof freshRepo>) => Promise<void> } = {}) {
  const clock = { t: T0 };
  const now = () => clock.t;
  const r = freshRepo(now);
  const ready = (opts.pre ? opts.pre(r) : Promise.resolve()).then(() =>
    render(
      <AppDataProvider repo={r.repo} now={now}>
        <App />
      </AppDataProvider>,
    ),
  );
  return { ...r, clock, ready };
}

async function startA(ctx: ReturnType<typeof setup>) {
  await ctx.ready;
  await userEvent.click(await screen.findByRole('button', { name: 'Iniciar treino A' }));
  await screen.findByText('Treino A', { selector: '.brand' });
}
const head = (name: string) =>
  screen
    .getAllByRole('button')
    .find((b) => b.hasAttribute('aria-expanded') && b.textContent?.includes(name))!;
const check = (n: number, ex: string) =>
  screen.getByRole('button', { name: `Série ${n} de ${ex}` });

describe('sessão de treino', () => {
  it('iniciar cria a sessão, grava no banco e mostra o primeiro exercício aberto', async () => {
    const ctx = setup();
    await startA(ctx);
    expect(await ctx.repo.getActive()).not.toBeNull();
    expect(check(1, 'Mobilidade de quadril e tornozelo')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // botões de check têm pelo menos 48px de área (classe com min 56px no CSS)
    expect(check(1, 'Mobilidade de quadril e tornozelo')).toHaveClass('check-btn');
  });

  it('marcar série preenche reps com o alvo, inicia o descanso e mostra o rótulo do próximo', async () => {
    const ctx = setup();
    await startA(ctx);
    await userEvent.click(check(1, 'Mobilidade de quadril e tornozelo'));
    expect(
      screen.getByLabelText('Repetições da série 1 de Mobilidade de quadril e tornozelo'),
    ).toHaveValue('15');
    const timer = screen.getByRole('timer', { name: 'Descanso' });
    expect(timer).toHaveTextContent('0:30');
    expect(timer).toHaveTextContent(
      'Próxima: série 2 de Mobilidade de quadril e tornozelo',
    );
    await waitFor(async () => {
      const a = await ctx.repo.getActive();
      expect(a?.rest?.totalMs).toBe(30_000);
      expect(a?.sets[0]).toMatchObject({ done: true, reps: 15 });
    });
  });

  it('na última série do exercício o rótulo mostra o próximo exercício', async () => {
    const ctx = setup();
    await startA(ctx);
    for (const n of [1, 2, 3])
      await userEvent.click(check(n, 'Mobilidade de quadril e tornozelo'));
    expect(screen.getByRole('timer')).toHaveTextContent('Próximo: Cadeira adutora');
    // exercício concluído recolhe e mostra o resumo
    expect(
      screen.getByRole('button', { name: /Mobilidade de quadril/, expanded: false }),
    ).toHaveTextContent('15 · 15 · 15');
  });

  it('desmarcar cancela o descanso que a série iniciou', async () => {
    const ctx = setup();
    await startA(ctx);
    await userEvent.click(check(1, 'Mobilidade de quadril e tornozelo'));
    await userEvent.click(check(1, 'Mobilidade de quadril e tornozelo'));
    expect(screen.queryByRole('timer')).toBeNull();
    expect(check(1, 'Mobilidade de quadril e tornozelo')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('±15 s e pular ajustam o descanso', async () => {
    const ctx = setup();
    await startA(ctx);
    await userEvent.click(check(1, 'Mobilidade de quadril e tornozelo'));
    await userEvent.click(screen.getByRole('button', { name: '+15 s' }));
    expect(screen.getByRole('timer')).toHaveTextContent('0:45');
    await userEvent.click(screen.getByRole('button', { name: '−15 s' }));
    expect(screen.getByRole('timer')).toHaveTextContent('0:30');
    await userEvent.click(screen.getByRole('button', { name: 'Pular' }));
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('adiciona e remove série extra', async () => {
    const ctx = setup();
    await startA(ctx);
    const block = screen.getByRole('region', {
      name: 'Mobilidade de quadril e tornozelo',
    });
    await userEvent.click(within(block).getByRole('button', { name: '+ Série' }));
    expect(check(4, 'Mobilidade de quadril e tornozelo')).toBeInTheDocument();
    await userEvent.click(within(block).getByRole('button', { name: '− Série' }));
    expect(
      screen.queryByRole('button', {
        name: 'Série 4 de Mobilidade de quadril e tornozelo',
      }),
    ).toBeNull();
  });

  it('aceita carga com vírgula e grava; valor inválido é sinalizado', async () => {
    const ctx = setup();
    await startA(ctx);
    await userEvent.click(head('Cadeira adutora'));
    const kg = screen.getByLabelText('Carga da série 1 de Cadeira adutora (kg)');
    await userEvent.type(kg, '22,5');
    await waitFor(async () =>
      expect(
        (await ctx.repo.getActive())?.sets.find((s) => s.exerciseId === 'A-2')?.kg,
      ).toBe(22.5),
    );
    await userEvent.clear(kg);
    await userEvent.type(kg, '-5');
    expect(kg).toHaveAttribute('aria-invalid', 'true');
  });

  it('pré-preenche a carga e mostra "Última vez"', async () => {
    const ctx = setup({
      pre: async ({ db }) => {
        await db.sessions.put(
          session({
            id: 'h',
            workoutId: 'E',
            startedAt: 5,
            sets: [
              { exerciseId: 'A-2', idx: 0, kg: 40, reps: 12, done: true, doneAt: 1 },
              { exerciseId: 'A-2', idx: 1, kg: 40, reps: 11, done: true, doneAt: 2 },
            ],
          }),
        );
      },
    });
    await startA(ctx);
    await userEvent.click(head('Cadeira adutora'));
    expect(screen.getByText(/Última vez: 40×12 · 40×11/)).toBeInTheDocument();
    expect(screen.getByLabelText('Carga da série 1 de Cadeira adutora (kg)')).toHaveValue(
      '40',
    );
  });

  it('finalizar mostra resumo, aceita séries faltando e grava no histórico sem duplicar', async () => {
    const ctx = setup();
    await startA(ctx);
    await userEvent.click(head('Cadeira adutora'));
    await userEvent.type(
      screen.getByLabelText('Carga da série 1 de Cadeira adutora (kg)'),
      '40',
    );
    await userEvent.click(check(1, 'Cadeira adutora'));
    ctx.clock.t += 90_000;
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    const dlg = await screen.findByRole('dialog');
    expect(dlg).toHaveTextContent('1/25');
    expect(dlg).toHaveTextContent('480 kg');
    expect(dlg).toHaveTextContent('24 séries ficarão registradas como não feitas');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Finalizar' }));
    await screen.findByRole('heading', { name: /Treino B/ });
    expect(await ctx.repo.getActive()).toBeNull();
    const list = await ctx.repo.listSessions();
    expect(list).toHaveLength(1);
    expect(list[0]!.sets.filter((s) => s.done)).toHaveLength(1);
    expect(list[0]!.sets.filter((s) => !s.done)).toHaveLength(24);
    expect(screen.getByText('Sessões: 1/40')).toBeInTheDocument();
  });

  it('descartar exige confirmação e apaga a sessão', async () => {
    const ctx = setup();
    await startA(ctx);
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    );
    expect(await ctx.repo.getActive()).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Descartar' }),
    );
    await screen.findByRole('heading', { name: /Treino A · Quadríceps/ });
    expect(await ctx.repo.getActive()).toBeNull();
    expect(await ctx.repo.listSessions()).toHaveLength(0);
  });

  it('retoma exatamente de onde parou, com o descanso correto', async () => {
    const ctx = setup();
    await startA(ctx);
    await userEvent.click(check(1, 'Mobilidade de quadril e tornozelo'));
    await waitFor(async () => expect((await ctx.repo.getActive())?.rest).not.toBeNull());
    // "matar o app": desmonta tudo e reabre 12 s depois, com o mesmo banco
    document.body.innerHTML = '';
    const again = { t: ctx.clock.t + 12_000 };
    const view = render(
      <AppDataProvider repo={ctx.repo} now={() => again.t}>
        <App />
      </AppDataProvider>,
    );
    expect(
      await screen.findByRole('button', {
        name: 'Série 1 de Mobilidade de quadril e tornozelo',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent('0:18'));
    view.unmount();
  });

  it('descanso vencido enquanto o app estava fechado some em silêncio (sem apitar)', async () => {
    const ctx = setup();
    await startA(ctx);
    await userEvent.click(check(1, 'Mobilidade de quadril e tornozelo'));
    await waitFor(async () => expect((await ctx.repo.getActive())?.rest).not.toBeNull());
    document.body.innerHTML = '';
    render(
      <AppDataProvider repo={ctx.repo} now={() => ctx.clock.t + 10 * 60_000}>
        <App />
      </AppDataProvider>,
    );
    await screen.findByRole('button', {
      name: 'Série 1 de Mobilidade de quadril e tornozelo',
    });
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('ao vencer o descanso: alerta uma vez e limpa o descanso; ao voltar do bloqueio o tempo está certo', async () => {
    const ctx = setup();
    await startA(ctx);
    await userEvent.click(check(1, 'Mobilidade de quadril e tornozelo'));
    const active = (await ctx.repo.getActive())!;
    const alerts = { prime: vi.fn(), finished: vi.fn(async () => {}) };
    // Novo tree com alerts injetados, retomando a sessão em curso.
    document.body.innerHTML = '';
    const t = { v: ctx.clock.t + 5_000 };
    function Harness() {
      const { active: a } = useAppData();
      return a ? <SessaoScreen initial={a} alerts={alerts} /> : null;
    }
    render(
      <AppDataProvider repo={ctx.repo} now={() => t.v}>
        <Harness />
      </AppDataProvider>,
    );
    await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent('0:25'));
    // "Bloqueia a tela 2 min": nenhum tick roda; ao voltar (visibilitychange) o tempo é recalculado.
    t.v = active.rest!.endAt + 90_000;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(screen.queryByRole('timer')).toBeNull());
    expect(alerts.finished).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 400)); // o timeout de segundo plano não repete o alerta
    expect(alerts.finished).toHaveBeenCalledTimes(1);
  });

  it('falha de gravação mostra aviso visível e se recupera sozinha', async () => {
    const ctx = setup();
    await startA(ctx);
    let fail = true;
    ctx.db.activeSession.hook('updating', () => {
      if (fail) throw new Error('cota cheia');
    });
    await userEvent.click(check(1, 'Mobilidade de quadril e tornozelo'));
    expect(
      await screen.findByText(/Não foi possível salvar no aparelho \(cota cheia\)/),
    ).toBeInTheDocument();
    fail = false;
    await waitFor(
      () => expect(screen.queryByText(/Não foi possível salvar/)).toBeNull(),
      { timeout: 4000 },
    );
    expect((await ctx.repo.getActive())?.sets[0]?.done).toBe(true);
  });
});
