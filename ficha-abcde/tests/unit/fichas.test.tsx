import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App';
import { AppDataProvider } from '../../src/data/AppData';
import { getTemplate, planFromTemplate } from '../../src/data/templates';
import { freshRepo, session } from './helpers';

const NOW = Date.parse('2026-06-01T15:00:00Z');

async function open(pre?: (r: ReturnType<typeof freshRepo>) => Promise<void>) {
  const r = freshRepo(() => NOW);
  await pre?.(r);
  render(
    <AppDataProvider repo={r.repo} now={() => NOW}>
      <App />
    </AppDataProvider>,
  );
  await screen.findByText(/Próximo treino/);
  return r;
}
const click = (name: string | RegExp, opts: { exact?: boolean } = {}) =>
  userEvent.click(screen.getByRole('button', { name, ...opts } as never));

/** Usuário que já tem ficha própria (editada): sem tela de boas-vindas. */
const withOwnPlan = async (r: ReturnType<typeof freshRepo>) => {
  await r.repo.savePlan(planFromTemplate(getTemplate('abc-3x')!, NOW));
};

describe('boas-vindas (primeiro acesso)', () => {
  it('convida a escolher a ficha enquanto ainda é o exemplo, e some ao manter o exemplo', async () => {
    const r = await open();
    expect(
      screen.getByRole('heading', { name: 'Escolha sua ficha' }),
    ).toBeInTheDocument();
    await click('Manter a ficha de exemplo');
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Escolha sua ficha' })).toBeNull(),
    );
    expect((await r.repo.getPlan()).updatedAt).toBeGreaterThan(0);
  });
  it('não aparece para quem já tem treinos ou ficha própria', async () => {
    await open(withOwnPlan);
    expect(screen.queryByRole('heading', { name: 'Escolha sua ficha' })).toBeNull();
  });
});

describe('fichas prontas', () => {
  it('lista os modelos, abre o detalhe com as fontes e aplica a ficha', async () => {
    const r = await open();
    await click('Ver fichas prontas');
    expect(
      screen.getByRole('heading', { name: 'Escolha sua ficha' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /^Ver a ficha/ }).length,
    ).toBeGreaterThanOrEqual(6);

    await click('Ver a ficha Superior / Inferior · 4 dias');
    expect(
      screen.getByRole('heading', { name: /Superior \/ Inferior/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /Treino A: Superior 1/ }),
    ).toBeInTheDocument();
    // fontes com link externo seguro
    const link = screen.getByRole('link', { name: /ACSM \(2009\)/ });
    expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText(/não é prescrição individual/i)).toBeInTheDocument();

    await click('Usar esta ficha'); // ficha ainda é o exemplo: sem confirmação
    expect(await screen.findByText('Sessões: 0/48')).toBeInTheDocument();
    const plan = await r.repo.getPlan();
    expect(plan).toMatchObject({
      name: 'Superior / Inferior · 4 dias',
      source: { templateId: 'superior-inferior-4x' },
      validUntil: null,
    });
    expect(plan.workouts.map((w) => w.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(screen.queryByText(/Ficha válida até/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Escolha sua ficha' })).toBeNull(); // boas-vindas encerradas
  });

  it('quem já tem ficha própria confirma antes de trocar; cancelar não altera nada', async () => {
    const r = await open(withOwnPlan);
    await click('Fichas prontas');
    await click('Ver a ficha Empurrar / Puxar / Pernas (PPL)');
    await click('Usar esta ficha');
    const dlg = await screen.findByRole('dialog');
    expect(dlg).toHaveTextContent('ABC · 3 dias');
    expect(dlg).toHaveTextContent('histórico de treinos não muda');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Cancelar' }));
    expect((await r.repo.getPlan()).name).toBe('ABC · 3 dias (divisão clássica)');
    await click('Usar esta ficha');
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Usar esta ficha',
      }),
    );
    await waitFor(async () =>
      expect((await r.repo.getPlan()).name).toBe('Empurrar / Puxar / Pernas (PPL)'),
    );
  });

  it('trocar de ficha mantém o histórico e a rotação recomeça no primeiro treino', async () => {
    const r = await open(async (x) => {
      await withOwnPlan(x);
      await x.db.sessions.put(
        session({ id: 'h', workoutId: 'C', startedAt: 5, endedAt: 9 }),
      );
    });
    expect(
      await screen.findByRole('heading', { name: /Treino A · Peito e tríceps/ }),
    ).toBeInTheDocument(); // C → A (ABC)
    await click('Fichas prontas');
    await click('Ver a ficha Mínimo eficaz · 2 dias por semana');
    await click('Usar esta ficha');
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Usar esta ficha',
      }),
    );
    expect(await screen.findByText('Sessões: 1/24')).toBeInTheDocument(); // histórico preservado
    expect(await r.repo.listSessions()).toHaveLength(1);
  });

  it('mostra "Como fazer" dentro da ficha pronta', async () => {
    await open();
    await click('Ver fichas prontas');
    await click('Ver a ficha Corpo inteiro em casa · iniciante (halteres)');
    const first = screen.getAllByRole('button', { name: 'Como fazer' })[0]!;
    await userEvent.click(first);
    expect(await screen.findByText('Dicas e erros comuns')).toBeInTheDocument();
    expect(screen.getByText(/Pare se sentir dor/)).toBeInTheDocument();
  });
});

describe('montar a própria ficha', () => {
  it('do zero: treino A vazio, adiciona do catálogo e o exercício traz as dicas', async () => {
    const r = await open();
    await click('Montar do zero');
    expect(
      await screen.findByRole('heading', { name: /Editar treino A/ }),
    ).toBeInTheDocument();
    await click('+ Adicionar exercício');
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(within(dlg).getByLabelText('Buscar exercício'), 'agachamento');
    await userEvent.click(
      within(dlg).getByRole('button', { name: 'Adicionar Agachamento livre' }),
    );
    expect(
      within(dlg).getByText(/“Agachamento livre” foi adicionado/),
    ).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: /Concluir \(1\)/ }));
    await click('Salvar');
    await screen.findByRole('heading', { name: /Treino A/ });
    const plan = await r.repo.getPlan();
    expect(plan.workouts).toHaveLength(1);
    expect(plan.workouts[0]!.exercises[0]).toMatchObject({
      name: 'Agachamento livre',
      catalogId: 'agachamento-livre',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Como fazer' }));
    expect(
      await screen.findByText('Como fazer', { selector: '.howto-title' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Aprenda o movimento sem carga/)).toBeInTheDocument();
  });

  it('seletor: filtra por grupo, mostra dicas e permite vários exercícios', async () => {
    await open(withOwnPlan);
    await click('Treino A, Peito e tríceps');
    await click('Editar treino');
    await click('+ Adicionar exercício');
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Panturrilha' }));
    expect(within(dlg).getAllByRole('button', { name: /^Adicionar / })).toHaveLength(2);
    await userEvent.click(within(dlg).getAllByRole('button', { name: 'Como fazer' })[0]!);
    expect(within(dlg).getByText('Dicas e erros comuns')).toBeInTheDocument();
    await userEvent.click(
      within(dlg).getByRole('button', { name: 'Adicionar Panturrilha em pé' }),
    );
    await userEvent.click(
      within(dlg).getByRole('button', { name: 'Adicionar Panturrilha sentado' }),
    );
    await userEvent.click(within(dlg).getByRole('button', { name: /Concluir \(2\)/ }));
    expect(screen.getByDisplayValue('Panturrilha em pé')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Panturrilha sentado')).toBeInTheDocument();
  });

  it('não achou? cria o exercício manualmente, com anotação própria (sem catálogo)', async () => {
    const r = await open(withOwnPlan);
    await click('Treino A, Peito e tríceps');
    await click('Editar treino');
    await click('+ Adicionar exercício');
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(
      within(dlg).getByLabelText('Buscar exercício'),
      'zzz sem resultado',
    );
    expect(within(dlg).getByText('0 exercícios')).toBeInTheDocument();
    await userEvent.click(
      within(dlg).getByRole('button', { name: 'Criar exercício manualmente' }),
    );
    expect(within(dlg).getByLabelText('Nome do exercício')).toHaveValue(
      'zzz sem resultado',
    ); // aproveita o que foi buscado
    const add = within(dlg).getByRole('button', { name: 'Adicionar ao treino' });
    await userEvent.clear(within(dlg).getByLabelText('Nome do exercício'));
    expect(add).toBeDisabled();
    await userEvent.type(
      within(dlg).getByLabelText('Nome do exercício'),
      'Remada cavalinho',
    );
    await userEvent.type(
      within(dlg).getByLabelText(/Sua anotação ou dica/),
      'Usar a pegada fechada',
    );
    await userEvent.click(add);
    await userEvent.click(within(dlg).getByRole('button', { name: /Concluir/ }));
    await click('Salvar');
    await waitFor(async () => {
      const e = (await r.repo.getPlan()).workouts[0]!.exercises.at(-1)!;
      expect(e).toMatchObject({
        name: 'Remada cavalinho',
        catalogId: null,
        note: 'Usar a pegada fechada',
      });
    });
    // na pré-visualização a anotação própria aparece como dica
    await userEvent.click(screen.getAllByRole('button', { name: 'Como fazer' }).at(-1)!);
    expect(await screen.findByText('Usar a pegada fechada')).toBeInTheDocument();
  });

  it('novo treino usa a próxima letra e o treino pode ser excluído (nunca o último)', async () => {
    const r = await open(async (x) => {
      await x.repo.savePlan({ ...planFromTemplate(getTemplate('minimo-2x')!, NOW) });
    });
    await click('+ Novo treino');
    expect(
      await screen.findByRole('heading', { name: /Editar treino C/ }),
    ).toBeInTheDocument();
    await click('Voltar');
    await click('← Treinos');
    expect(
      screen.getByRole('button', { name: /Treino C, Treino C/ }),
    ).toBeInTheDocument();
    await click(/Treino C, Treino C/);
    await click('Excluir treino');
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }),
    );
    await waitFor(async () =>
      expect((await r.repo.getPlan()).workouts.map((w) => w.id)).toEqual(['A', 'B']),
    );
    await screen.findByText(/Próximo treino/);
  });

  it('não deixa excluir o único treino da ficha', async () => {
    await open(async (x) => {
      await x.repo.savePlan({
        ...planFromTemplate(getTemplate('abc-3x')!, NOW),
        workouts: [planFromTemplate(getTemplate('abc-3x')!, NOW).workouts[0]!],
      });
    });
    await click(/Treino A, /);
    expect(screen.queryByRole('button', { name: 'Excluir treino' })).toBeNull();
  });

  it('treino vazio: em vez de iniciar, convida a adicionar exercícios', async () => {
    await open(async (x) => {
      const p = planFromTemplate(getTemplate('abc-3x')!, NOW);
      await x.repo.savePlan({
        ...p,
        workouts: [{ ...p.workouts[0]!, exercises: [] }, p.workouts[1]!],
      });
    });
    expect(screen.queryByRole('button', { name: /Iniciar treino/ })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Adicionar exercícios' }),
    ).toBeInTheDocument();
  });
});

describe('dados da ficha (nome, meta e validade opcionais)', () => {
  it('edita o nome, remove a meta e define a validade', async () => {
    const r = await open(withOwnPlan);
    await click('Dados da ficha');
    const name = screen.getByLabelText('Nome da ficha');
    await userEvent.clear(name);
    await userEvent.type(name, 'Minha divisão');
    await userEvent.clear(screen.getByLabelText(/Meta de sessões/));
    await userEvent.type(screen.getByLabelText(/Validade da ficha/), '2026-12-31');
    await click('Salvar');
    await waitFor(async () =>
      expect(await r.repo.getPlan()).toMatchObject({
        name: 'Minha divisão',
        totalSessions: null,
        validUntil: '2026-12-31',
      }),
    );
    expect(await screen.findByText('Sessões feitas: 0')).toBeInTheDocument(); // sem meta: só a contagem
    expect(screen.getByText('Ficha válida até 31/12/2026')).toBeInTheDocument();
  });
  it('meta inválida bloqueia o salvamento', async () => {
    await open(withOwnPlan);
    await click('Dados da ficha');
    const goal = screen.getByLabelText(/Meta de sessões/);
    await userEvent.clear(goal);
    await userEvent.type(goal, 'abc');
    expect(goal).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });
});

describe('dicas durante o treino', () => {
  it('o exercício do catálogo tem "Como fazer" na sessão; o criado à mão sem anotação, não', async () => {
    await open(async (x) => {
      const p = planFromTemplate(getTemplate('minimo-2x')!, NOW);
      const custom = {
        ...p.workouts[0]!.exercises[0]!,
        id: 'x',
        name: 'Exercício meu',
        catalogId: null,
        note: '',
      };
      await x.repo.savePlan({
        ...p,
        workouts: [
          {
            ...p.workouts[0]!,
            exercises: [custom, ...p.workouts[0]!.exercises.slice(1)],
          },
          p.workouts[1]!,
        ],
      });
    });
    await click('Iniciar treino A');
    await screen.findByText('Treino A', { selector: '.brand' });
    // primeiro exercício (manual, sem nota): sem botão
    expect(screen.queryByRole('button', { name: 'Como fazer' })).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: /Série 1 de Exercício meu/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Série 2 de Exercício meu/ }),
    );
    // o próximo exercício (Supino) abre e traz as dicas
    await userEvent.click(await screen.findByRole('button', { name: 'Como fazer' }));
    expect(screen.getAllByText(/Costas apoiadas/).length).toBeGreaterThan(0);
  });
});

describe('fontes em Ajustes', () => {
  it('lista as referências com links', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Ajustes' }));
    expect(
      await screen.findByRole('heading', { name: 'Fontes e referências' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link').filter((a) => a.getAttribute('target') === '_blank')
        .length,
    ).toBeGreaterThanOrEqual(8);
    expect(
      screen.getByRole('link', {
        name: /Guia de Atividade Física para a População Brasileira/,
      }),
    ).toBeInTheDocument();
  });
});
