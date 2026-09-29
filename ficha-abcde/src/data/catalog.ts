/**
 * Catálogo de exercícios (embutido no app: funciona offline).
 * Os textos de "como fazer" e dicas foram escritos para este app, em português, seguindo a técnica
 * padrão descrita nas referências listadas em `sources.ts` (ACE, ExRx, NSCA). Não copiam nenhuma delas.
 * São informativos e não substituem a orientação de um profissional de Educação Física.
 */
export type MuscleGroup =
  | 'Peito'
  | 'Costas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Abdômen'
  | 'Quadríceps'
  | 'Posterior de coxa'
  | 'Glúteos'
  | 'Adutores e abdutores'
  | 'Panturrilha'
  | 'Corpo todo'
  | 'Mobilidade';

export type Equipment = 'Máquina' | 'Halteres' | 'Barra' | 'Polia' | 'Peso corporal';

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
  'Quadríceps',
  'Posterior de coxa',
  'Glúteos',
  'Adutores e abdutores',
  'Panturrilha',
  'Corpo todo',
  'Mobilidade',
];

export interface CatalogExercise {
  id: string;
  name: string;
  group: MuscleGroup;
  equipment: Equipment;
  /** Passo a passo da execução. */
  steps: string[];
  /** Dicas e erros comuns. */
  tips: string[];
  /** Sugestão inicial ao adicionar à ficha. */
  sets: number;
  reps: [number, number];
  restSec: number;
  /** Sem carga (registra só repetições/segundos). */
  noLoad?: boolean;
}

type Def = { sets: number; reps: [number, number]; restSec: number; noLoad?: boolean };
const ex = (
  id: string,
  name: string,
  group: MuscleGroup,
  equipment: Equipment,
  d: Def,
  steps: string[],
  tips: string[],
): CatalogExercise => ({ id, name, group, equipment, ...d, steps, tips });

const HEAVY: Def = { sets: 3, reps: [6, 10], restSec: 120 };
const COMPOUND: Def = { sets: 3, reps: [8, 12], restSec: 90 };
const ISOLATION: Def = { sets: 3, reps: [10, 15], restSec: 60 };
const CORE: Def = { sets: 3, reps: [12, 20], restSec: 45 };
const BODY: Def = { sets: 3, reps: [8, 15], restSec: 60, noLoad: true };
const MOB: Def = { sets: 2, reps: [8, 12], restSec: 30, noLoad: true };

export const CATALOG: readonly CatalogExercise[] = [
  // ---------------------------------------------------------------- Peito
  ex(
    'supino-reto-barra',
    'Supino reto com barra',
    'Peito',
    'Barra',
    HEAVY,
    [
      'Deite no banco com os olhos sob a barra, pés firmes no chão e as escápulas juntas e para baixo.',
      'Segure a barra um pouco mais aberta que os ombros e retire-a do suporte com os braços estendidos.',
      'Desça a barra de forma controlada até tocar de leve na parte média do peito.',
      'Empurre para cima até estender os cotovelos, sem tirar o quadril do banco.',
    ],
    [
      'Nas séries pesadas, use os pinos de segurança ou peça ajuda a alguém.',
      'Mantenha os cotovelos a cerca de 45° do tronco, não abertos a 90°.',
      'Evite quicar a barra no peito e levantar o quadril do banco.',
    ],
  ),
  ex(
    'supino-reto-halteres',
    'Supino reto com halteres',
    'Peito',
    'Halteres',
    COMPOUND,
    [
      'Sente com os halteres apoiados nas coxas e deite-se levando-os ao lado do peito.',
      'Com as escápulas juntas, estenda os braços empurrando os halteres para cima, alinhados aos ombros.',
      'Desça devagar até sentir o peito alongar, com os cotovelos um pouco abaixo da linha do banco.',
    ],
    [
      'Os halteres permitem amplitude maior que a barra: desça só até onde o ombro estiver confortável.',
      'Mantenha os punhos firmes, alinhados com os antebraços.',
    ],
  ),
  ex(
    'supino-inclinado-halteres',
    'Supino inclinado com halteres',
    'Peito',
    'Halteres',
    COMPOUND,
    [
      'Ajuste o banco em inclinação leve a moderada (cerca de 30° a 45°).',
      'Leve os halteres à altura do peito, com as escápulas juntas e o peito aberto.',
      'Empurre para cima até estender os cotovelos e desça com controle.',
    ],
    [
      'Inclinação muito alta transfere o esforço para os ombros; prefira 30° a 45°.',
      'Não deixe as costas “afundarem” no banco: mantenha o peito alto.',
    ],
  ),
  ex(
    'supino-maquina',
    'Supino na máquina',
    'Peito',
    'Máquina',
    COMPOUND,
    [
      'Ajuste o assento para que as pegadas fiquem na altura do meio do peito.',
      'Costas apoiadas, escápulas juntas; segure as pegadas e empurre até estender os braços.',
      'Volte devagar, sem deixar o peso de baixo encostar entre as repetições.',
    ],
    [
      'Máquinas guiam o movimento: boa opção para quem está começando.',
      'Não trave os cotovelos com força no fim do movimento.',
    ],
  ),
  ex(
    'supino-declinado-maquina',
    'Supino declinado na máquina',
    'Peito',
    'Máquina',
    COMPOUND,
    [
      'Ajuste o assento e apoie bem as costas.',
      'Empurre as pegadas para frente e um pouco para baixo até estender os braços.',
      'Retorne com controle até sentir o peito alongar.',
    ],
    [
      'Use uma carga que permita controlar a volta, sem “jogar” o peso.',
      'Ombros para baixo e para trás, longe das orelhas.',
    ],
  ),
  ex(
    'crucifixo-halteres',
    'Crucifixo com halteres',
    'Peito',
    'Halteres',
    ISOLATION,
    [
      'Deite no banco com os halteres acima do peito, palmas voltadas uma para a outra.',
      'Com os cotovelos levemente flexionados, abra os braços em arco até sentir o peito alongar.',
      'Feche o movimento em arco, como se abraçasse uma árvore, sem bater os halteres.',
    ],
    [
      'Use carga leve: é um exercício de isolamento e exige controle.',
      'Não desça além da linha dos ombros.',
    ],
  ),
  ex(
    'peck-deck',
    'Peck deck (voador)',
    'Peito',
    'Máquina',
    ISOLATION,
    [
      'Ajuste o assento para que as pegadas fiquem na altura do peito.',
      'Costas apoiadas, cotovelos levemente flexionados; feche os braços à frente do peito.',
      'Volte devagar até sentir o peito alongar, sem deixar os ombros irem para frente.',
    ],
    [
      'Concentre-se em “apertar” o peito, não em puxar com as mãos.',
      'Não use impulso do tronco.',
    ],
  ),
  ex(
    'flexao-bracos',
    'Flexão de braços',
    'Peito',
    'Peso corporal',
    BODY,
    [
      'Apoie as mãos no chão, um pouco mais abertas que os ombros; corpo em linha reta, abdômen firme.',
      'Flexione os cotovelos descendo o peito em direção ao chão.',
      'Empurre o chão até estender os braços, mantendo o corpo alinhado.',
    ],
    [
      'Muito difícil? Apoie os joelhos no chão ou as mãos em um banco.',
      'Não deixe o quadril cair nem subir.',
    ],
  ),
  ex(
    'crossover-polia',
    'Crossover na polia',
    'Peito',
    'Polia',
    ISOLATION,
    [
      'Regule as polias no alto, segure as pegadas e dê um passo à frente, tronco levemente inclinado.',
      'Com os cotovelos levemente flexionados, leve as mãos para frente e para baixo até se encontrarem.',
      'Volte devagar, abrindo os braços até sentir o peito alongar.',
    ],
    [
      'Mantenha o tronco parado: o movimento é dos braços.',
      'Comece leve para aprender a trajetória.',
    ],
  ),

  // --------------------------------------------------------------- Costas
  ex(
    'puxada-frontal',
    'Puxada frontal (pegada aberta)',
    'Costas',
    'Polia',
    COMPOUND,
    [
      'Ajuste o apoio das coxas e segure a barra mais aberta que os ombros.',
      'Com o peito aberto, puxe a barra até a altura do queixo/clavícula, levando os cotovelos para baixo e para trás.',
      'Suba devagar, estendendo os braços sem deixar os ombros “subirem” até as orelhas.',
    ],
    [
      'Pense em “puxar com os cotovelos”, não com as mãos.',
      'Evite se jogar para trás para ganhar impulso.',
    ],
  ),
  ex(
    'puxada-triangulo',
    'Puxada com pegada neutra (triângulo)',
    'Costas',
    'Polia',
    COMPOUND,
    [
      'Prenda o triângulo na polia alta e segure com as palmas voltadas uma para a outra.',
      'Puxe em direção ao peito, cotovelos junto ao corpo.',
      'Retorne com controle, alongando as costas.',
    ],
    [
      'Costas retas e peito aberto durante todo o movimento.',
      'Escolha uma carga que permita a amplitude completa.',
    ],
  ),
  ex(
    'remada-baixa',
    'Remada baixa na polia',
    'Costas',
    'Polia',
    COMPOUND,
    [
      'Sente com os pés apoiados, joelhos levemente flexionados e coluna ereta.',
      'Puxe a pegada até o abdômen, juntando as escápulas.',
      'Volte devagar, estendendo os braços sem arredondar as costas.',
    ],
    [
      'Não balance o tronco para trás e para frente.',
      'Mantenha o peito aberto e os ombros longe das orelhas.',
    ],
  ),
  ex(
    'remada-curvada',
    'Remada curvada com barra',
    'Costas',
    'Barra',
    HEAVY,
    [
      'Segure a barra, incline o tronco à frente com a coluna neutra e joelhos levemente flexionados.',
      'Puxe a barra em direção ao abdômen, cotovelos para trás.',
      'Desça com controle, sem perder a posição do tronco.',
    ],
    [
      'Se não conseguir manter as costas retas, reduza a carga.',
      'Não use impulso do quadril para “roubar” a repetição.',
    ],
  ),
  ex(
    'remada-unilateral',
    'Remada unilateral com halter (serrote)',
    'Costas',
    'Halteres',
    COMPOUND,
    [
      'Apoie uma mão e o joelho do mesmo lado no banco; coluna neutra.',
      'Com o halter na outra mão, puxe-o em direção ao quadril, cotovelo junto ao corpo.',
      'Desça devagar até alongar as costas; repita e troque de lado.',
    ],
    [
      'Evite girar o tronco: só o braço se move.',
      'Faça o mesmo número de repetições nos dois lados.',
    ],
  ),
  ex(
    'remada-maquina',
    'Remada na máquina (articulada)',
    'Costas',
    'Máquina',
    COMPOUND,
    [
      'Ajuste o assento e o apoio do peito de modo que os braços fiquem alinhados às pegadas.',
      'Puxe levando os cotovelos para trás e juntando as escápulas.',
      'Volte devagar, sem soltar o peso.',
    ],
    [
      'Mantenha o peito apoiado e o pescoço relaxado.',
      'Uma pausa curta com as escápulas juntas ajuda a sentir o músculo.',
    ],
  ),
  ex(
    'barra-fixa',
    'Barra fixa (ou puxada assistida)',
    'Costas',
    'Peso corporal',
    { sets: 3, reps: [4, 10], restSec: 120, noLoad: true },
    [
      'Segure a barra um pouco mais aberta que os ombros, com o corpo estendido.',
      'Puxe o corpo até o queixo passar da barra, levando os cotovelos para baixo.',
      'Desça devagar até estender os braços.',
    ],
    [
      'Ainda não consegue? Use a máquina de puxada assistida ou um elástico.',
      'Evite balançar o corpo.',
    ],
  ),
  ex(
    'pulldown-braco-reto',
    'Puxada com braço estendido na polia',
    'Costas',
    'Polia',
    ISOLATION,
    [
      'De frente para a polia alta, segure a barra com os braços quase estendidos e o tronco levemente inclinado.',
      'Leve a barra até as coxas, mantendo os cotovelos quase retos.',
      'Volte devagar até alongar as costas.',
    ],
    [
      'O movimento vem dos ombros e das costas, não dos cotovelos.',
      'Use carga moderada.',
    ],
  ),
  ex(
    'extensao-lombar',
    'Extensão lombar (banco romano)',
    'Costas',
    'Peso corporal',
    { sets: 3, reps: [10, 15], restSec: 60, noLoad: true },
    [
      'Posicione o quadril na almofada, com os pés travados e o corpo em linha.',
      'Desça o tronco com a coluna reta.',
      'Suba até o corpo ficar alinhado, sem esticar demais as costas.',
    ],
    [
      'Suba só até a linha do corpo: passar disso não traz benefício.',
      'Movimento lento, sem impulso.',
    ],
  ),

  // --------------------------------------------------------------- Ombros
  ex(
    'desenvolvimento-halteres',
    'Desenvolvimento com halteres',
    'Ombros',
    'Halteres',
    COMPOUND,
    [
      'Sentado com as costas apoiadas, leve os halteres à altura dos ombros, cotovelos abaixo dos punhos.',
      'Empurre para cima até quase estender os braços, sem bater os halteres.',
      'Desça controlando até a altura das orelhas.',
    ],
    [
      'Abdômen firme para não arquear as costas.',
      'Evite subir os ombros em direção às orelhas.',
    ],
  ),
  ex(
    'desenvolvimento-maquina',
    'Desenvolvimento na máquina',
    'Ombros',
    'Máquina',
    COMPOUND,
    [
      'Ajuste o assento para que as pegadas comecem na altura dos ombros.',
      'Empurre para cima até estender quase totalmente os braços.',
      'Desça devagar, sem deixar o peso encostar embaixo.',
    ],
    ['Costas apoiadas e pescoço relaxado.', 'Não trave os cotovelos no topo.'],
  ),
  ex(
    'elevacao-lateral',
    'Elevação lateral com halteres',
    'Ombros',
    'Halteres',
    ISOLATION,
    [
      'Em pé, halteres ao lado do corpo, cotovelos levemente flexionados.',
      'Eleve os braços para os lados até a altura dos ombros.',
      'Desça devagar, controlando o peso.',
    ],
    [
      'Carga leve: se balançar o corpo, o halter está pesado demais.',
      'Suba os cotovelos primeiro, como se “derramasse água” de uma jarra.',
    ],
  ),
  ex(
    'elevacao-frontal-corda',
    'Elevação frontal com corda na polia baixa',
    'Ombros',
    'Polia',
    ISOLATION,
    [
      'De costas para a polia baixa, segure a corda entre as pernas.',
      'Eleve os braços à frente até a altura dos ombros, com os cotovelos levemente flexionados.',
      'Desça devagar mantendo a tensão.',
    ],
    [
      'Mantenha o tronco parado, sem se inclinar para trás.',
      'Não passe da altura dos ombros.',
    ],
  ),
  ex(
    'crucifixo-inverso',
    'Crucifixo inverso (máquina)',
    'Ombros',
    'Máquina',
    ISOLATION,
    [
      'Sente de frente para o apoio do peito e segure as pegadas com os braços à frente.',
      'Abra os braços para trás, juntando as escápulas e mirando a parte de trás dos ombros.',
      'Volte devagar sem soltar o peso.',
    ],
    [
      'Use carga leve a moderada; é um músculo pequeno.',
      'Não incline o tronco para ajudar.',
    ],
  ),
  ex(
    'encolhimento',
    'Encolhimento de ombros',
    'Ombros',
    'Halteres',
    ISOLATION,
    [
      'Em pé, com halteres ao lado do corpo e braços estendidos.',
      'Eleve os ombros em direção às orelhas, sem girá-los.',
      'Segure um instante e desça devagar.',
    ],
    [
      'Movimento reto para cima e para baixo, sem rodar os ombros.',
      'Pescoço relaxado, olhar à frente.',
    ],
  ),
  ex(
    'face-pull',
    'Face pull na polia',
    'Ombros',
    'Polia',
    ISOLATION,
    [
      'Regule a polia na altura do rosto, com a corda; segure com as palmas voltadas uma para a outra.',
      'Puxe a corda em direção ao rosto, abrindo os cotovelos para os lados.',
      'Volte devagar até estender os braços.',
    ],
    [
      'Boa opção para a parte de trás dos ombros e a postura.',
      'Carga leve, foco na técnica.',
    ],
  ),

  // --------------------------------------------------------------- Bíceps
  ex(
    'rosca-direta',
    'Rosca direta com barra',
    'Bíceps',
    'Barra',
    ISOLATION,
    [
      'Em pé, segure a barra com as palmas para cima, na largura dos ombros.',
      'Flexione os cotovelos levando a barra até a altura do peito, cotovelos junto ao corpo.',
      'Desça devagar até estender os braços.',
    ],
    ['Não balance o tronco para levantar o peso.', 'Punhos alinhados com os antebraços.'],
  ),
  ex(
    'rosca-alternada',
    'Rosca alternada com halteres',
    'Bíceps',
    'Halteres',
    ISOLATION,
    [
      'Em pé, halteres ao lado do corpo, palmas voltadas para frente.',
      'Flexione um cotovelo de cada vez, levando o halter aos ombros.',
      'Desça devagar e alterne os braços.',
    ],
    ['Cotovelos parados ao lado do corpo.', 'Se precisar balançar, diminua a carga.'],
  ),
  ex(
    'rosca-martelo',
    'Rosca martelo',
    'Bíceps',
    'Halteres',
    ISOLATION,
    [
      'Em pé, segure os halteres com as palmas voltadas uma para a outra (pegada neutra).',
      'Flexione os cotovelos levando os halteres aos ombros, sem girar os punhos.',
      'Desça com controle.',
    ],
    ['Trabalha bíceps e antebraço.', 'Mantenha os cotovelos junto ao corpo.'],
  ),
  ex(
    'rosca-maquina',
    'Rosca na máquina',
    'Bíceps',
    'Máquina',
    ISOLATION,
    [
      'Ajuste o assento para que os cotovelos fiquem alinhados ao eixo da máquina, com os braços apoiados.',
      'Flexione os cotovelos até contrair o bíceps.',
      'Volte devagar até quase estender os braços.',
    ],
    [
      'Braços sempre apoiados; não levante os ombros.',
      'Controle a descida: ela também trabalha o músculo.',
    ],
  ),

  // -------------------------------------------------------------- Tríceps
  ex(
    'triceps-pulley',
    'Tríceps pulley (barra reta)',
    'Tríceps',
    'Polia',
    ISOLATION,
    [
      'De frente para a polia alta, segure a barra com as mãos na largura dos ombros.',
      'Cotovelos junto ao corpo, estenda os braços para baixo até quase travar.',
      'Volte devagar até os antebraços passarem de 90°.',
    ],
    [
      'Só os antebraços se movem: cotovelos parados.',
      'Não incline o corpo sobre a barra para “empurrar” com o peso.',
    ],
  ),
  ex(
    'triceps-corda',
    'Tríceps na polia com corda',
    'Tríceps',
    'Polia',
    ISOLATION,
    [
      'Na polia alta, segure a corda com as palmas voltadas uma para a outra.',
      'Estenda os braços para baixo abrindo levemente a corda no final.',
      'Volte devagar, mantendo os cotovelos junto ao corpo.',
    ],
    ['A corda deixa o punho mais confortável.', 'Evite balançar o tronco.'],
  ),
  ex(
    'triceps-frances-corda',
    'Tríceps francês com corda na polia',
    'Tríceps',
    'Polia',
    ISOLATION,
    [
      'De costas para a polia, segure a corda atrás da cabeça, cotovelos apontando para frente.',
      'Estenda os braços à frente, sem mexer os cotovelos.',
      'Volte devagar até sentir o tríceps alongar.',
    ],
    [
      'Cotovelos fechados, apontados para frente, durante todo o movimento.',
      'Abdômen firme para não arquear as costas.',
    ],
  ),
  ex(
    'triceps-testa',
    'Tríceps testa com barra',
    'Tríceps',
    'Barra',
    ISOLATION,
    [
      'Deite no banco segurando a barra acima do peito, com os braços estendidos.',
      'Flexione os cotovelos levando a barra em direção à testa, cotovelos apontando para cima.',
      'Estenda os braços de volta à posição inicial.',
    ],
    ['Use carga leve para proteger os cotovelos.', 'Só os antebraços se movem.'],
  ),
  ex(
    'triceps-mergulho-maquina',
    'Mergulho na máquina (tríceps)',
    'Tríceps',
    'Máquina',
    COMPOUND,
    [
      'Ajuste o assento e segure as pegadas com as palmas voltadas para baixo.',
      'Empurre as pegadas para baixo até estender os braços.',
      'Volte devagar, sem deixar os ombros subirem.',
    ],
    ['Cotovelos junto ao corpo.', 'Ombros para baixo, longe das orelhas.'],
  ),

  // -------------------------------------------------------------- Abdômen
  ex(
    'abdominal-maquina',
    'Abdominal na máquina',
    'Abdômen',
    'Máquina',
    CORE,
    [
      'Ajuste o assento e segure as pegadas junto ao peito.',
      'Contraia o abdômen, enrolando o tronco para frente.',
      'Volte devagar sem soltar o peso.',
    ],
    ['O movimento vem do abdômen, não dos braços.', 'Expire ao contrair.'],
  ),
  ex(
    'abdominal-supra',
    'Abdominal supra (crunch)',
    'Abdômen',
    'Peso corporal',
    { sets: 3, reps: [12, 20], restSec: 45, noLoad: true },
    [
      'Deite de costas, joelhos flexionados e pés no chão; mãos ao lado da cabeça.',
      'Eleve os ombros do chão contraindo o abdômen.',
      'Desça com controle, sem relaxar totalmente.',
    ],
    [
      'Não puxe o pescoço com as mãos.',
      'Olhe para o teto, mantendo um espaço entre queixo e peito.',
    ],
  ),
  ex(
    'prancha',
    'Prancha (registre os segundos)',
    'Abdômen',
    'Peso corporal',
    { sets: 3, reps: [20, 45], restSec: 45, noLoad: true },
    [
      'Apoie os antebraços e as pontas dos pés no chão, cotovelos abaixo dos ombros.',
      'Mantenha o corpo em linha reta, do calcanhar à cabeça, com abdômen e glúteos contraídos.',
      'Sustente respirando normalmente.',
    ],
    [
      'Neste app, registre o tempo em segundos no campo de repetições.',
      'Não deixe o quadril cair nem subir. Se perder a postura, encerre a série.',
    ],
  ),
  ex(
    'elevacao-pernas',
    'Elevação de pernas',
    'Abdômen',
    'Peso corporal',
    { sets: 3, reps: [8, 15], restSec: 45, noLoad: true },
    [
      'Deite de costas com as mãos sob o quadril ou ao lado do corpo.',
      'Com as pernas quase estendidas, eleve-as até formar 90° com o tronco.',
      'Desça devagar, sem deixar a lombar sair do chão.',
    ],
    ['Se a lombar arquear, flexione os joelhos.', 'Movimento lento nos dois sentidos.'],
  ),
  ex(
    'prancha-lateral',
    'Prancha lateral (registre os segundos)',
    'Abdômen',
    'Peso corporal',
    { sets: 2, reps: [15, 30], restSec: 30, noLoad: true },
    [
      'Deite de lado, apoie o antebraço no chão com o cotovelo abaixo do ombro.',
      'Eleve o quadril formando uma linha reta da cabeça aos pés.',
      'Sustente e troque de lado.',
    ],
    [
      'Registre os segundos no campo de repetições e faça os dois lados.',
      'Ombro afastado da orelha, quadril alto.',
    ],
  ),

  // ----------------------------------------------------------- Quadríceps
  ex(
    'agachamento-livre',
    'Agachamento livre',
    'Quadríceps',
    'Barra',
    HEAVY,
    [
      'Pés na largura dos ombros, pontas levemente para fora; barra apoiada nas costas (ou sem barra, para aprender).',
      'Inicie levando o quadril para trás e flexionando os joelhos, peito aberto e coluna neutra.',
      'Desça até onde conseguir manter a coluna reta e os calcanhares no chão.',
      'Suba empurrando o chão com o pé inteiro.',
    ],
    [
      'Joelhos acompanham a direção dos pés, sem cair para dentro.',
      'Aprenda o movimento sem carga antes de colocar a barra.',
      'Nas séries pesadas, use suportes de segurança.',
    ],
  ),
  ex(
    'agachamento-maquina',
    'Agachamento guiado (Smith/máquina)',
    'Quadríceps',
    'Máquina',
    COMPOUND,
    [
      'Posicione a barra nas costas e os pés ligeiramente à frente do corpo.',
      'Flexione os joelhos descendo com o tronco firme.',
      'Suba empurrando o chão com o pé inteiro.',
    ],
    [
      'Ajuste a posição dos pés para que os joelhos não avancem demais.',
      'Mantenha o abdômen firme e o olhar à frente.',
    ],
  ),
  ex(
    'leg-press',
    'Leg press',
    'Quadríceps',
    'Máquina',
    COMPOUND,
    [
      'Sente com as costas e o quadril totalmente apoiados; pés na largura dos ombros na plataforma.',
      'Solte a trava e desça flexionando os joelhos, sem tirar o quadril do banco.',
      'Empurre a plataforma sem travar os joelhos no final.',
    ],
    [
      'Se o quadril descolar do banco, você desceu demais.',
      'Não coloque as mãos nos joelhos e não trave as pernas no topo.',
    ],
  ),
  ex(
    'cadeira-extensora',
    'Cadeira extensora',
    'Quadríceps',
    'Máquina',
    ISOLATION,
    [
      'Ajuste o encosto para que os joelhos fiquem alinhados ao eixo da máquina.',
      'Estenda os joelhos elevando as pernas até quase alinhá-las.',
      'Volte devagar, sem deixar o peso encostar embaixo.',
    ],
    [
      'Controle a descida; não “jogue” as pernas.',
      'Se sentir dor no joelho, reduza a carga ou procure orientação.',
    ],
  ),
  ex(
    'avanco-halteres',
    'Avanço com halteres',
    'Quadríceps',
    'Halteres',
    COMPOUND,
    [
      'Em pé, halteres ao lado do corpo. Dê um passo largo à frente.',
      'Flexione os dois joelhos até a coxa da frente ficar próxima da horizontal.',
      'Empurre com o pé da frente para voltar e alterne as pernas.',
    ],
    [
      'Tronco ereto e joelho da frente alinhado ao pé.',
      'Passo longo o bastante para o joelho não avançar demais.',
    ],
  ),
  ex(
    'agachamento-bulgaro',
    'Agachamento búlgaro',
    'Quadríceps',
    'Halteres',
    COMPOUND,
    [
      'De costas para um banco, apoie o peito do pé de trás nele; halteres ao lado do corpo.',
      'Desça flexionando o joelho da frente, tronco levemente inclinado.',
      'Suba empurrando com a perna da frente e repita dos dois lados.',
    ],
    [
      'Exercício exigente: comece sem carga para achar o equilíbrio.',
      'Distância do banco: o joelho da frente não deve passar muito dos dedos.',
    ],
  ),
  ex(
    'agachamento-sumo-halter',
    'Agachamento sumô com halter',
    'Quadríceps',
    'Halteres',
    COMPOUND,
    [
      'Pés mais abertos que os ombros, pontas para fora; segure um halter com as duas mãos à frente do corpo.',
      'Desça flexionando os joelhos na direção dos pés, tronco ereto.',
      'Suba apertando os glúteos.',
    ],
    [
      'Trabalha coxas, glúteos e parte interna das coxas.',
      'Joelhos seguem a direção dos pés.',
    ],
  ),

  // ---------------------------------------------------- Posterior de coxa
  ex(
    'mesa-flexora',
    'Mesa flexora',
    'Posterior de coxa',
    'Máquina',
    ISOLATION,
    [
      'Deite de bruços, joelhos alinhados ao eixo da máquina e o rolo logo acima dos calcanhares.',
      'Flexione os joelhos levando o rolo em direção aos glúteos.',
      'Volte devagar até quase estender as pernas.',
    ],
    ['Mantenha o quadril no banco.', 'Descida lenta: ela trabalha o músculo.'],
  ),
  ex(
    'cadeira-flexora',
    'Cadeira flexora',
    'Posterior de coxa',
    'Máquina',
    ISOLATION,
    [
      'Sente com as costas apoiadas e o rolo acima dos calcanhares.',
      'Flexione os joelhos levando o rolo para baixo e para trás.',
      'Volte controlando o peso.',
    ],
    ['Ajuste o apoio das coxas para não sair do lugar.', 'Não use impulso do tronco.'],
  ),
  ex(
    'stiff',
    'Stiff (terra romeno)',
    'Posterior de coxa',
    'Barra',
    COMPOUND,
    [
      'Em pé, segure a barra ou os halteres à frente das coxas, joelhos levemente flexionados.',
      'Leve o quadril para trás, descendo o peso rente às pernas, com a coluna reta.',
      'Desça até sentir a parte de trás das coxas alongar e volte estendendo o quadril.',
    ],
    [
      'O movimento é uma dobradiça de quadril, não uma flexão das costas.',
      'Se as costas arredondarem, reduza a amplitude e a carga.',
    ],
  ),

  // -------------------------------------------------------------- Glúteos
  ex(
    'elevacao-pelvica',
    'Elevação pélvica (hip thrust)',
    'Glúteos',
    'Barra',
    COMPOUND,
    [
      'Apoie as costas no banco (altura das escápulas), com a barra ou o halter sobre o quadril e os pés no chão.',
      'Empurre o chão e eleve o quadril até o corpo formar uma linha dos ombros aos joelhos.',
      'Aperte os glúteos no topo e desça devagar.',
    ],
    [
      'Queixo levemente para o peito e costelas “fechadas”, sem arquear a lombar.',
      'Use uma almofada na barra para conforto.',
    ],
  ),
  ex(
    'ponte-gluteos',
    'Ponte de glúteos',
    'Glúteos',
    'Peso corporal',
    { sets: 3, reps: [12, 20], restSec: 45, noLoad: true },
    [
      'Deite de costas, joelhos flexionados e pés apoiados no chão.',
      'Eleve o quadril apertando os glúteos.',
      'Desça devagar sem encostar totalmente no chão.',
    ],
    [
      'Boa para aprender a ativar os glúteos antes de usar carga.',
      'Não arqueie a lombar no topo.',
    ],
  ),
  ex(
    'gluteo-polia',
    'Coice na polia (glúteo)',
    'Glúteos',
    'Polia',
    ISOLATION,
    [
      'Prenda a tornozeleira na polia baixa e apoie as mãos na máquina.',
      'Leve a perna para trás com o joelho quase estendido, apertando o glúteo.',
      'Volte devagar sem apoiar o peso.',
    ],
    [
      'Não arqueie a lombar para ganhar amplitude.',
      'Faça o mesmo número de repetições nas duas pernas.',
    ],
  ),

  // ----------------------------------------------- Adutores e abdutores
  ex(
    'cadeira-adutora',
    'Cadeira adutora',
    'Adutores e abdutores',
    'Máquina',
    ISOLATION,
    [
      'Sente com as costas apoiadas e as pernas abertas nos apoios.',
      'Feche as pernas até se aproximarem.',
      'Volte devagar até o ponto que você controla.',
    ],
    [
      'Comece leve; a parte interna da coxa se lesiona com facilidade.',
      'Não use impulso.',
    ],
  ),
  ex(
    'cadeira-abdutora',
    'Cadeira abdutora',
    'Adutores e abdutores',
    'Máquina',
    ISOLATION,
    [
      'Sente com as costas apoiadas e as pernas juntas, apoiadas nas almofadas.',
      'Abra as pernas empurrando as almofadas para fora.',
      'Volte devagar sem deixar o peso encostar.',
    ],
    [
      'Incline levemente o tronco à frente para focar mais o glúteo.',
      'Movimento controlado, sem balançar.',
    ],
  ),

  // ----------------------------------------------------------- Panturrilha
  ex(
    'panturrilha-em-pe',
    'Panturrilha em pé',
    'Panturrilha',
    'Máquina',
    { sets: 3, reps: [10, 15], restSec: 45 },
    [
      'Apoie a ponta dos pés na plataforma, calcanhares livres, joelhos quase estendidos.',
      'Suba o máximo que conseguir, contraindo a panturrilha.',
      'Desça devagar até alongar bem.',
    ],
    ['Amplitude completa: descer bem e subir bem.', 'Sem quicar no fundo do movimento.'],
  ),
  ex(
    'panturrilha-sentado',
    'Panturrilha sentado',
    'Panturrilha',
    'Máquina',
    { sets: 3, reps: [12, 20], restSec: 45 },
    [
      'Sente com a ponta dos pés na plataforma e as almofadas sobre os joelhos.',
      'Suba os calcanhares o máximo que conseguir.',
      'Desça devagar, alongando a panturrilha.',
    ],
    [
      'Trabalha mais o músculo profundo da panturrilha (sóleo).',
      'Movimento lento e completo.',
    ],
  ),

  // ------------------------------------------------------------ Corpo todo
  ex(
    'levantamento-terra',
    'Levantamento terra',
    'Corpo todo',
    'Barra',
    HEAVY,
    [
      'Pés na largura do quadril, barra sobre o meio dos pés; segure a barra na largura dos ombros.',
      'Peito aberto, coluna neutra, empurre o chão com as pernas mantendo a barra rente ao corpo.',
      'Estenda quadril e joelhos ao mesmo tempo; no topo, fique reto sem se inclinar para trás.',
      'Desça a barra controlando, dobrando o quadril e depois os joelhos.',
    ],
    [
      'É um exercício técnico: aprenda com carga leve e, se possível, com um profissional.',
      'Nunca arredonde as costas sob carga.',
    ],
  ),

  // ------------------------------------------------------------ Mobilidade
  ex(
    'mob-quadril-tornozelo',
    'Mobilidade de quadril e tornozelo',
    'Mobilidade',
    'Peso corporal',
    MOB,
    [
      'Em afundo baixo, com o pé da frente inteiro no chão.',
      'Leve o joelho da frente para frente sem tirar o calcanhar do chão e sinta o tornozelo e o quadril abrirem.',
      'Volte e repita, alternando os lados.',
    ],
    [
      'Movimento suave, sem dor. Sentir alongar é normal; dor, não.',
      'Respire de forma tranquila.',
    ],
  ),
  ex(
    'mob-ombro',
    'Mobilidade de ombro',
    'Mobilidade',
    'Peso corporal',
    MOB,
    [
      'Em pé, braços estendidos à frente.',
      'Faça círculos amplos e lentos com os braços, para frente e depois para trás.',
      'Mantenha o tronco parado e os ombros longe das orelhas.',
    ],
    ['Comece com círculos pequenos e aumente aos poucos.', 'Sem forçar amplitude.'],
  ),
  ex(
    'gato-camelo',
    'Gato-camelo (coluna)',
    'Mobilidade',
    'Peso corporal',
    MOB,
    [
      'De quatro apoios, mãos sob os ombros e joelhos sob o quadril.',
      'Arredonde as costas empurrando o chão, olhando para o umbigo.',
      'Depois desça o abdômen e olhe à frente, abrindo o peito. Alterne devagar.',
    ],
    [
      'Movimento lento, acompanhando a respiração.',
      'Ótimo para aquecer a coluna antes do treino.',
    ],
  ),
  ex(
    'rotacao-toracica',
    'Rotação torácica',
    'Mobilidade',
    'Peso corporal',
    MOB,
    [
      'De quatro apoios, leve uma mão atrás da cabeça.',
      'Gire o tronco levando o cotovelo em direção ao teto, seguindo-o com o olhar.',
      'Volte e repita; depois troque de lado.',
    ],
    ['O giro vem das costas do meio, não da lombar.', 'Quadril parado.'],
  ),
];

const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

export const getCatalogExercise = (
  id: string | null | undefined,
): CatalogExercise | undefined => (id ? BY_ID.get(id) : undefined);

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca sem acento, por nome ou grupo; filtro opcional por grupo. */
export function searchCatalog(
  query: string,
  group: MuscleGroup | null,
): CatalogExercise[] {
  const q = norm(query.trim());
  return CATALOG.filter(
    (e) =>
      (!group || e.group === group) &&
      (!q ||
        norm(e.name).includes(q) ||
        norm(e.group).includes(q) ||
        norm(e.equipment).includes(q)),
  );
}
