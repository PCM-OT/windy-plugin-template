export interface Source {
  id: string;
  title: string;
  detail: string;
  url: string;
  kind: 'diretriz' | 'estudo' | 'tecnica';
}

/**
 * Referências usadas para montar as fichas prontas e os textos de execução. Cada item foi conferido
 * (título, veículo, ano e endereço) por busca antes de entrar aqui. As fichas seguem os princípios
 * dessas fontes; não são "aprovadas" pelos autores nem prescrição individual.
 */
export const SOURCES: readonly Source[] = [
  {
    id: 'acsm-2009',
    kind: 'diretriz',
    title: 'ACSM (2009). Progression models in resistance training for healthy adults',
    detail:
      'Medicine & Science in Sports & Exercise, 41(3), 687–708. doi:10.1249/MSS.0b013e3181915670. Iniciantes: 2–3 dias por semana; intermediários: 3–4; 1–3 séries de 8–12 repetições.',
    url: 'https://journals.lww.com/acsm-msse/fulltext/2009/03000/progression_models_in_resistance_training_for.26.aspx',
  },
  {
    id: 'pag-2018',
    kind: 'diretriz',
    title: 'HHS (2018). Physical Activity Guidelines for Americans, 2ª edição',
    detail:
      'Fortalecimento muscular em 2 ou mais dias por semana, trabalhando todos os grandes grupos musculares.',
    url: 'https://odphp.health.gov/sites/default/files/2019-09/Physical_Activity_Guidelines_2nd_edition.pdf',
  },
  {
    id: 'ms-2021',
    kind: 'diretriz',
    title:
      'Ministério da Saúde (2021). Guia de Atividade Física para a População Brasileira',
    detail:
      'Adultos: incluir atividades de fortalecimento muscular e ósseo pelo menos 2 vezes por semana.',
    url: 'https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/guias-e-manuais/2021/guia-de-atividade-fisica-para-a-populacao-brasileira.pdf/view',
  },
  {
    id: 'schoenfeld-2016-freq',
    kind: 'estudo',
    title:
      'Schoenfeld, Ogborn & Krieger (2016). Effects of resistance training frequency on measures of muscle hypertrophy: a systematic review and meta-analysis',
    detail:
      'Sports Medicine, 46(11), 1689–1697. doi:10.1007/s40279-016-0543-8. Treinar cada grande grupo muscular ao menos 2 vezes por semana.',
    url: 'https://link.springer.com/article/10.1007/s40279-016-0543-8',
  },
  {
    id: 'schoenfeld-2017-vol',
    kind: 'estudo',
    title:
      'Schoenfeld, Ogborn & Krieger (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis',
    detail:
      'Journal of Sports Sciences, 35(11), 1073–1082. Mais séries semanais por músculo tendem a gerar mais ganho de massa muscular, com efeito que se estabiliza acima de cerca de 10 séries.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27433992/',
  },
  {
    id: 'schoenfeld-2016-rest',
    kind: 'estudo',
    title:
      'Schoenfeld et al. (2016). Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men',
    detail:
      'Journal of Strength and Conditioning Research, 30(7), 1805–1812. doi:10.1519/JSC.0000000000001272. Descansos mais longos (3 min) superaram descansos curtos (1 min) em treinados.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26605807/',
  },
  {
    id: 'ace-library',
    kind: 'tecnica',
    title: 'ACE (American Council on Exercise). Exercise Library',
    detail:
      'Descrições de execução, erros comuns e variações, por região do corpo, nível e equipamento.',
    url: 'https://www.acefitness.org/resources/everyone/exercise-library/',
  },
  {
    id: 'exrx',
    kind: 'tecnica',
    title: 'ExRx.net. Exercise Directory',
    detail:
      'Diretório de exercícios por grupo muscular, com músculos envolvidos e cinesiologia.',
    url: 'https://exrx.net/Lists/Directory',
  },
  {
    id: 'nsca-essentials',
    kind: 'tecnica',
    title:
      'Haff & Triplett (orgs.) (2016). Essentials of Strength Training and Conditioning, 4ª edição',
    detail:
      'NSCA / Human Kinetics. Livro de referência em técnica de exercícios e prescrição de treino.',
    url: 'https://www.vitalsource.com/products/essentials-of-strength-training-and-conditioning-national-strength-and-v9781718210882',
  },
];

export const getSource = (id: string) => SOURCES.find((s) => s.id === id);

export const DISCLAIMER =
  'Conteúdo informativo, não é prescrição individual. Se você tem lesão, doença ou dúvida, consulte um médico ou um profissional de Educação Física. Pare o exercício se sentir dor.';
