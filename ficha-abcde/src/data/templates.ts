import { SCHEMA_VERSION } from '../domain/schemas';
import type { Exercise, Plan, Workout, WorkoutId } from '../domain/schemas';
import { getCatalogExercise } from './catalog';
import { seedPlan } from './seed';

export type Level = 'Iniciante' | 'Intermediário' | 'Qualquer nível';

export interface Template {
  id: string;
  title: string;
  summary: string;
  level: Level;
  place: 'Academia' | 'Em casa';
  daysPerWeek: number;
  goal: string;
  /** Meta de sessões (semanas × dias). */
  totalSessions: number | null;
  /** Ids em `sources.ts` em que a estrutura se baseia. */
  basedOn: string[];
  /** Observações de como usar. */
  notes?: string;
  workouts: Workout[];
}

type Item =
  string | [id: string, sets?: number, reps?: [number, number], restSec?: number];

/** Monta um treino a partir de ids do catálogo (nome, tipo e sugestões vêm de lá). */
function workout(
  templateId: string,
  id: WorkoutId,
  name: string,
  muscles: string,
  items: Item[],
): Workout {
  const exercises: Exercise[] = items.map((it, i) => {
    const [catalogId, sets, reps, restSec] = typeof it === 'string' ? [it] : it;
    const c = getCatalogExercise(catalogId);
    if (!c)
      throw new Error(`Exercício inexistente no catálogo: ${catalogId} (${templateId})`);
    const r = reps ?? c.reps;
    return {
      id: `${templateId}:${id}-${i + 1}`,
      name: c.name,
      sets: sets ?? c.sets,
      reps: { min: r[0], max: r[1] },
      machine: null,
      restSec: restSec ?? c.restSec,
      noLoad: Boolean(c.noLoad),
      catalogId: c.id,
      note: '',
    };
  });
  return { id, name, muscles, exercises };
}

const t = (
  id: string,
  title: string,
  rest: Omit<Template, 'id' | 'title'>,
): Template => ({ id, title, ...rest });

export const TEMPLATES: readonly Template[] = [
  t('minimo-2x', 'Mínimo eficaz · 2 dias por semana', {
    summary:
      'Duas sessões curtas de corpo inteiro, para quem tem pouco tempo e quer cumprir a recomendação mínima de fortalecimento.',
    level: 'Qualquer nível',
    place: 'Academia',
    daysPerWeek: 2,
    goal: 'Saúde geral e manutenção da força',
    totalSessions: 24,
    basedOn: ['pag-2018', 'ms-2021', 'acsm-2009'],
    notes:
      'Alterne os treinos A e B. Comece com cargas leves e aumente aos poucos quando conseguir completar todas as repetições com boa técnica.',
    workouts: [
      workout('minimo-2x', 'A', 'Corpo inteiro A', 'Pernas, peito, costas, abdômen', [
        ['leg-press', 2, [10, 12]],
        ['supino-maquina', 2, [10, 12]],
        ['puxada-frontal', 2, [10, 12]],
        ['desenvolvimento-maquina', 2, [10, 12]],
        ['abdominal-maquina', 2, [12, 15]],
      ]),
      workout('minimo-2x', 'B', 'Corpo inteiro B', 'Pernas, costas, peito, ombros', [
        ['agachamento-maquina', 2, [10, 12]],
        ['remada-baixa', 2, [10, 12]],
        ['supino-reto-halteres', 2, [10, 12]],
        ['mesa-flexora', 2, [10, 12]],
        ['prancha', 2, [20, 40]],
      ]),
    ],
  }),

  t('corpo-inteiro-iniciante', 'Corpo inteiro · iniciante (academia)', {
    summary:
      'Três dias por semana alternando dois treinos de corpo inteiro, com máquinas e movimentos simples. Ideal para começar.',
    level: 'Iniciante',
    place: 'Academia',
    daysPerWeek: 3,
    goal: 'Aprender os movimentos e ganhar força base',
    totalSessions: 36,
    basedOn: ['acsm-2009', 'pag-2018', 'ms-2021', 'schoenfeld-2016-freq'],
    notes:
      'Treine em dias alternados (por exemplo seg, qua e sex), alternando A e B. Cada grande grupo é treinado 1 a 2 vezes por semana.',
    workouts: [
      workout(
        'corpo-inteiro-iniciante',
        'A',
        'Corpo inteiro A',
        'Pernas, peito, costas, ombros',
        [
          ['mob-quadril-tornozelo', 2],
          ['leg-press', 3, [10, 12]],
          ['supino-maquina', 3, [10, 12]],
          ['puxada-frontal', 3, [10, 12]],
          ['desenvolvimento-maquina', 2, [10, 12]],
          ['mesa-flexora', 2, [10, 12]],
          ['abdominal-maquina', 2, [12, 15]],
        ],
      ),
      workout(
        'corpo-inteiro-iniciante',
        'B',
        'Corpo inteiro B',
        'Pernas, costas, peito, braços',
        [
          ['mob-ombro', 2],
          ['agachamento-maquina', 3, [10, 12]],
          ['remada-maquina', 3, [10, 12]],
          ['supino-reto-halteres', 3, [10, 12]],
          ['elevacao-lateral', 2, [12, 15]],
          ['elevacao-pelvica', 2, [10, 12]],
          ['prancha', 2, [20, 40]],
        ],
      ),
    ],
  }),

  t('corpo-inteiro-casa', 'Corpo inteiro em casa · iniciante (halteres)', {
    summary:
      'Dois treinos de corpo inteiro para fazer em casa, só com um par de halteres e o peso do corpo.',
    level: 'Iniciante',
    place: 'Em casa',
    daysPerWeek: 3,
    goal: 'Ganhar força e condicionamento sem academia',
    totalSessions: 36,
    basedOn: ['acsm-2009', 'pag-2018', 'ms-2021'],
    notes:
      'Alterne A e B em dias não consecutivos. Sem carga suficiente? Faça as repetições mais devagar (3 segundos para descer).',
    workouts: [
      workout('corpo-inteiro-casa', 'A', 'Casa A', 'Pernas, peito, costas, ombros', [
        ['mob-quadril-tornozelo', 2],
        ['agachamento-sumo-halter', 3, [10, 15]],
        ['flexao-bracos', 3, [6, 12]],
        ['remada-unilateral', 3, [10, 12]],
        ['elevacao-lateral', 2, [12, 15]],
        ['ponte-gluteos', 3, [12, 20]],
        ['abdominal-supra', 2, [12, 20]],
      ]),
      workout('corpo-inteiro-casa', 'B', 'Casa B', 'Pernas, ombros, costas, braços', [
        ['mob-ombro', 2],
        ['avanco-halteres', 3, [8, 12]],
        ['desenvolvimento-halteres', 3, [10, 12]],
        ['remada-unilateral', 3, [10, 12]],
        ['rosca-alternada', 2, [10, 12]],
        ['ponte-gluteos', 3, [12, 20]],
        ['prancha', 3, [20, 40]],
      ]),
    ],
  }),

  t('abc-3x', 'ABC · 3 dias (divisão clássica)', {
    summary:
      'Divisão muito usada nas academias: peito e tríceps, costas e bíceps, pernas e ombros.',
    level: 'Intermediário',
    place: 'Academia',
    daysPerWeek: 3,
    goal: 'Hipertrofia com sessões focadas',
    totalSessions: 36,
    basedOn: ['acsm-2009', 'pag-2018', 'schoenfeld-2017-vol'],
    notes:
      'Cada grupo é treinado 1 vez por semana. Se quiser treinar cada grupo 2 vezes, repita a sequência ABC em 6 dias (com descanso) ou prefira a ficha Superior/Inferior.',
    workouts: [
      workout('abc-3x', 'A', 'Peito e tríceps', 'Peito, tríceps', [
        ['supino-reto-barra', 4, [6, 10]],
        ['supino-inclinado-halteres', 3, [8, 12]],
        ['crucifixo-halteres', 3, [10, 12]],
        ['triceps-pulley', 3, [10, 12]],
        ['triceps-frances-corda', 3, [10, 12]],
      ]),
      workout('abc-3x', 'B', 'Costas e bíceps', 'Costas, bíceps, abdômen', [
        ['puxada-frontal', 4, [8, 12]],
        ['remada-curvada', 3, [6, 10]],
        ['remada-baixa', 3, [10, 12]],
        ['rosca-direta', 3, [10, 12]],
        ['rosca-martelo', 3, [10, 12]],
        ['abdominal-maquina', 3, [12, 15]],
      ]),
      workout('abc-3x', 'C', 'Pernas e ombros', 'Quadríceps, posterior, ombros', [
        ['agachamento-livre', 4, [6, 10]],
        ['leg-press', 3, [10, 12]],
        ['mesa-flexora', 3, [10, 12]],
        ['desenvolvimento-halteres', 3, [8, 12]],
        ['elevacao-lateral', 3, [12, 15]],
        ['panturrilha-em-pe', 3, [10, 15]],
      ]),
    ],
  }),

  t('superior-inferior-4x', 'Superior / Inferior · 4 dias', {
    summary:
      'Quatro dias por semana alternando treinos de parte superior e inferior. Cada grande grupo é treinado 2 vezes por semana.',
    level: 'Intermediário',
    place: 'Academia',
    daysPerWeek: 4,
    goal: 'Força e hipertrofia com boa frequência por músculo',
    totalSessions: 48,
    basedOn: [
      'acsm-2009',
      'schoenfeld-2016-freq',
      'schoenfeld-2017-vol',
      'schoenfeld-2016-rest',
    ],
    notes:
      'Exemplo de semana: seg superior, ter inferior, qui superior, sex inferior. Nos exercícios principais descanse de 2 a 3 minutos entre as séries.',
    workouts: [
      workout(
        'superior-inferior-4x',
        'A',
        'Superior 1 (força)',
        'Peito, costas, ombros, braços',
        [
          ['supino-reto-barra', 3, [6, 10], 150],
          ['remada-curvada', 3, [6, 10], 150],
          ['desenvolvimento-halteres', 3, [8, 12]],
          ['puxada-frontal', 3, [8, 12]],
          ['rosca-direta', 2, [10, 12]],
          ['triceps-pulley', 2, [10, 12]],
        ],
      ),
      workout(
        'superior-inferior-4x',
        'B',
        'Inferior 1 (força)',
        'Quadríceps, posterior, panturrilha, abdômen',
        [
          ['agachamento-livre', 3, [6, 10], 150],
          ['stiff', 3, [8, 12], 120],
          ['leg-press', 3, [10, 12]],
          ['mesa-flexora', 3, [10, 12]],
          ['panturrilha-em-pe', 3, [10, 15]],
          ['abdominal-maquina', 3, [12, 15]],
        ],
      ),
      workout(
        'superior-inferior-4x',
        'C',
        'Superior 2 (volume)',
        'Peito, costas, ombros, braços',
        [
          ['supino-inclinado-halteres', 3, [8, 12]],
          ['remada-unilateral', 3, [8, 12]],
          ['elevacao-lateral', 3, [12, 15]],
          ['puxada-triangulo', 3, [10, 12]],
          ['rosca-martelo', 2, [10, 12]],
          ['triceps-corda', 2, [10, 12]],
        ],
      ),
      workout(
        'superior-inferior-4x',
        'D',
        'Inferior 2 (volume)',
        'Quadríceps, glúteos, posterior, panturrilha',
        [
          ['agachamento-maquina', 3, [8, 12]],
          ['elevacao-pelvica', 3, [8, 12]],
          ['cadeira-extensora', 3, [10, 15]],
          ['cadeira-flexora', 3, [10, 15]],
          ['panturrilha-sentado', 3, [12, 20]],
          ['prancha', 3, [20, 45]],
        ],
      ),
    ],
  }),

  t('push-pull-legs', 'Empurrar / Puxar / Pernas (PPL)', {
    summary:
      'Três treinos: empurrar (peito, ombros, tríceps), puxar (costas, bíceps) e pernas.',
    level: 'Intermediário',
    place: 'Academia',
    daysPerWeek: 3,
    goal: 'Hipertrofia e força',
    totalSessions: 36,
    basedOn: ['acsm-2009', 'schoenfeld-2016-freq', 'schoenfeld-2017-vol'],
    notes:
      'Em 3 dias por semana, cada grupo é treinado 1 vez. Como a frequência de 2 vezes por semana por grupo tende a ser melhor, quem tem tempo pode repetir a sequência (6 dias, com um dia de descanso no meio).',
    workouts: [
      workout('push-pull-legs', 'A', 'Empurrar', 'Peito, ombros, tríceps', [
        ['supino-reto-barra', 3, [6, 10]],
        ['supino-inclinado-halteres', 3, [8, 12]],
        ['desenvolvimento-halteres', 3, [8, 12]],
        ['elevacao-lateral', 3, [12, 15]],
        ['triceps-corda', 3, [10, 12]],
        ['triceps-frances-corda', 2, [10, 12]],
      ]),
      workout('push-pull-legs', 'B', 'Puxar', 'Costas, ombros posteriores, bíceps', [
        ['puxada-frontal', 3, [8, 12]],
        ['remada-curvada', 3, [6, 10]],
        ['remada-baixa', 3, [10, 12]],
        ['crucifixo-inverso', 3, [12, 15]],
        ['rosca-direta', 3, [10, 12]],
        ['rosca-martelo', 2, [10, 12]],
      ]),
      workout(
        'push-pull-legs',
        'C',
        'Pernas',
        'Quadríceps, posterior, glúteos, panturrilha',
        [
          ['agachamento-livre', 3, [6, 10], 150],
          ['leg-press', 3, [10, 12]],
          ['stiff', 3, [8, 12]],
          ['cadeira-extensora', 3, [10, 15]],
          ['mesa-flexora', 3, [10, 15]],
          ['panturrilha-em-pe', 3, [10, 15]],
        ],
      ),
    ],
  }),

  t('academia-abcde', 'Ficha de academia ABCDE (exemplo)', {
    summary:
      'Ficha transcrita de um instrutor de academia, com máquinas numeradas: cinco treinos (A a E) em rotação.',
    level: 'Qualquer nível',
    place: 'Academia',
    daysPerWeek: 5,
    goal: 'Exemplo de ficha de academia (não baseada em diretriz)',
    totalSessions: 40,
    basedOn: [],
    notes:
      'É o exemplo que veio com o app. Os números de máquina são da academia original: ajuste para a sua.',
    workouts: seedPlan(0).workouts,
  }),
];

export const getTemplate = (id: string) => TEMPLATES.find((x) => x.id === id);

const uid = () => crypto.randomUUID().slice(0, 8);

/** Cria a ficha do usuário a partir de uma ficha pronta (ids novos; nada é compartilhado com o modelo). */
export function planFromTemplate(tpl: Template, now: number): Plan {
  return {
    id: 'plan',
    schemaVersion: SCHEMA_VERSION,
    name: tpl.title,
    source: { templateId: tpl.id, title: tpl.title },
    validUntil: null,
    totalSessions: tpl.totalSessions,
    updatedAt: now,
    workouts: tpl.workouts.map((w) => ({
      ...w,
      exercises: w.exercises.map((e) => ({ ...e, id: `${w.id}-${uid()}` })),
    })),
  };
}

/** Ficha vazia para o usuário montar do zero. */
export function starterPlan(now: number): Plan {
  return {
    id: 'plan',
    schemaVersion: SCHEMA_VERSION,
    name: 'Minha ficha',
    source: null,
    validUntil: null,
    totalSessions: null,
    updatedAt: now,
    workouts: [{ id: 'A', name: 'Treino A', muscles: '', exercises: [] }],
  };
}
