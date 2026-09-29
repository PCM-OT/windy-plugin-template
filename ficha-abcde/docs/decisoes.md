# Decisões, arquitetura e riscos

## Decisões

1. **Pasta `ficha-abcde/` dentro do repositório atual.** O repositório de trabalho já continha
   outro projeto (template de plugin do Windy). Em vez de misturar arquivos na raiz, o app vive
   em subpasta, com CI próprio (`.github/workflows/ficha-abcde-ci.yml`, `working-directory`).
   Para mover para um repositório próprio basta copiar a pasta e o workflow.
2. **Lockfile versionado.** O `.gitignore` da raiz ignora `package-lock.json` e `dist/*`; o
   `.gitignore` local reabilita o lockfile (o CI usa `npm ci`).
3. **Vite 8, Vitest 5, ESLint 10 (flat config), Playwright 1.63** (versões atuais na instalação).
4. **Testes de unidade em `tests/unit`, e2e em `tests/e2e`.** Vitest só roda `tests/unit`.
5. **`vite-plugin-pwa` já no scaffold** (`registerType: "prompt"`), para o build gerar e
   pré-cachear o SW desde o início. Ícones e manifest completo entram na Fase 4.
6. **Chromium no e2e:** o CI instala o do Playwright; localmente, `PW_CHROMIUM_PATH` aponta
   para um Chromium existente (evita download).
7. **Estado de UI:** Zustand só para estado efêmero; a fonte da verdade é o Dexie.

## Arquitetura

```
src/domain/    tipos, schemas zod, regras puras (rotação, volume, descanso por endAt, mescla)
src/data/      Dexie (versões/migrações), repositórios, seed, backup import/export
src/features/  treinos/, sessao/, historico/, ajustes/
src/components/ botões, campos, gráfico SVG, modais
src/pwa/       registro do SW, prompt de atualização, wake lock, alertas
src/sync/      outbox, cliente Supabase, conflitos (Fase 5)
```

Regra: `domain/` não importa React nem Dexie. `data/` depende de `domain/`. `features/`
dependem de ambos. Nada em `domain/` toca em relógio global: receba `now` por parâmetro.

## Modelo de dados (Dexie, `schemaVersion` em toda estrutura)

- `plan` — `{ id, schemaVersion, validUntil, totalSessions, workouts: Workout[], updatedAt }`
  - `Workout { id: 'A'..'E', name, muscles, exercises: Exercise[] }`
  - `Exercise { id, name, sets, reps: {min,max}|null (a definir), machine?, restSec, noLoad }`
- `activeSession` — uma linha (`id: 'current'`): `{ id(uuid), workoutId, startedAt, exercises[],
sets[{exerciseId, idx, kg, reps, done, doneAt}], rest: {endAt, exerciseId}|null, note }`
- `sessions` — histórico imutável após finalizar: `{ id, workoutId, startedAt, endedAt,
sets[], note, schemaVersion }`; índices em `startedAt` e `workoutId`.
- `settings` — som, vibração, resultado de `storage.persist()`.
- `quarantine` — registros inválidos isolados (zod), contados em Ajustes.
- `outbox` (Fase 5).

Datas sempre em UTC (ms); exibição em `America/Sao_Paulo`; o dia da sessão é o do `startedAt`.
Finalizar = transação única (grava em `sessions` + apaga `activeSession`), idempotente por `id`.
Descanso = `endAt` absoluto; restante = `max(0, endAt - now)`, recalculado a cada tick e em
`visibilitychange`; relógio que salta para trás é limitado ao tempo total do descanso.

## Riscos e mitigação

| Risco                                  | Mitigação                                                              |
| -------------------------------------- | ---------------------------------------------------------------------- |
| iOS/Safari evicta IndexedDB            | `storage.persist()`, aviso em Ajustes, exportação de backup            |
| Timer congela com tela bloqueada       | `endAt` + `visibilitychange`; notificação local como reforço           |
| Atualização do SW no meio do treino    | `prompt`; só aplica sem sessão ativa                                   |
| Duas abas sobrescrevem a sessão        | Web Locks/BroadcastChannel; 2ª aba só leitura                          |
| Migração quebra dados                  | `version()` do Dexie + testes de migração com dados da versão anterior |
| Dado corrompido derruba o app          | zod nas bordas; quarentena; ErrorBoundary com exportação               |
| Cota cheia / IDB indisponível          | Erro visível + retry; nunca engolir em silêncio                        |
| Orçamento de 150 KB gzip de JS         | React+Dexie+zod+zustand; verificar tamanho a cada fase                 |
| Wake Lock / Notification indisponíveis | Degradação: som+vibração; feature-detect                               |

## Fases

0 scaffold+plano · 1 domínio+Dexie+seed+migrações · 2 Treinos/editor · 3 sessão + e2e offline ·
4 histórico, gráfico, backup, ajustes, PWA completo · 5 Supabase + Vercel.

## Fase 1: decisões

- **Sessão ativa** fica na tabela `activeSession` com chave fixa `slot: 'current'` (o `id` da linha
  é o uuid da sessão, que vira o id do histórico ao finalizar → `put` idempotente).
- **Migração v1→v2** (a v1 é o formato inicial): adiciona `quarantine`, índice `endedAt` e carimba
  `schemaVersion` em registros antigos. Testada abrindo um banco criado no formato v1.
- **Leitura validada:** `repo.ts` valida com zod ao ler; linha inválida vai para `quarantine`
  (contada em Ajustes) e é ignorada. Plano corrompido volta ao seed.
- **Histórico guarda um snapshot** dos exercícios (nome, descanso, sem carga) para não mudar
  se a ficha for editada depois.
- **Backup:** sessões finalizadas são imutáveis (id existente = mantém a local); plano vence por
  `updatedAt`; itens inválidos são ignorados e contados.
- Dexie não permite trocar chave primária em migração; por isso a chave da ativa já nasce como `slot`.

## Fase 2: decisões

- **Navegação por estado** (aba + visão), sem router. O botão "voltar" do Android ainda sai do app;
  avaliar `history.pushState` na Fase 3, quando houver sessão em andamento a proteger.
- **Editor edita um treino por vez** e valida com o mesmo `WorkoutSchema` do banco
  (`validateWorkout`). Campos numéricos guardam o texto digitado e só propagam valor válido.
- **"Restaurar ficha original"** fica na aba Treinos (afeta a ficha inteira) e pede confirmação.
- **Botão "Iniciar treino"** já existe no card, desabilitado até a Fase 3.
- **Fontes** Barlow / Barlow Condensed self-hosted via `@fontsource` (só subconjunto latin).
- **Tamanho:** JS ≈ 108 KB gzip (React + Dexie + zod). Orçamento é 150 KB; vigiar nas próximas fases.
- Testes com Testing Library precisam de `cleanup` explícito (Vitest sem globals): está em `tests/setup.ts`.

## Fase 3: decisões

- **Descanso = `endAt` absoluto.** `setInterval` (250 ms) é só gatilho de re-render; todo valor sai de
  `restRemainingMs(endAt, now, totalMs)`. Também recalcula em `visibilitychange`, `focus` e `pageshow`.
- **Fim do descanso** (`alertOnce(endAt)`): 3 bipes (WebAudio) + vibração conforme Ajustes, e notificação
  local só se o app estiver oculto e a permissão tiver sido concedida. Um `setTimeout` no instante exato
  reforça em segundo plano; um controle por `endAt` impede alerta duplicado. O áudio é liberado no toque
  de marcar a série (exigência dos navegadores).
- **Limite conhecido:** com a tela bloqueada, navegadores móveis podem congelar timers. O alerta então
  dispara ao desbloquear (o tempo continua correto, pois vem de `endAt`). Notificação agendada com o
  app fechado não é possível de forma confiável na web.
- **Reabrir o app:** descanso em curso continua com o tempo certo; descanso já vencido some em silêncio
  (não apita por algo do passado).
- **Persistência a cada alteração:** `useSession` atualiza a tela na hora e grava por uma fila coalescida
  e serial (`saver.ts`) com retry exponencial. Falha mostra aviso visível e se recupera sozinha.
- **Finalizar** usa o estado em memória (`repo.finishWith`), numa transação (histórico + apaga ativa).
  O saver é fechado antes, para nenhuma gravação atrasada recriar a sessão ativa.
- **Reps ao marcar** = máximo da faixa (10-12 → 12), só se o campo estiver vazio. Carga pré-preenchida
  com a da última vez, série a série (se faltar, repete a última).
- **Só o exercício atual abre**; concluídos recolhem com resumo; os demais abrem por toque.
- **Descanso não inicia** na última série pendente do treino nem se o descanso do exercício for 0.
- **Wake Lock** reaplicado ao voltar para o app; sem suporte, ignora.
- **Adiado para a Fase 4:** aviso de atualização do SW (hoje só registra), modo "uma aba só",
  tela de Ajustes (som/vibração já são lidos do banco; padrão = ligados).
- Service worker registrado só em produção (`import.meta.env.PROD`).

## Fase 4: decisões

- **Histórico:** semana = segunda a domingo (São Paulo). "Sessões na semana" conta do início da semana até hoje.
  Calendário mostra as letras dos treinos do dia (ex.: "AB"); o dia é o de `startedAt`.
  Lista pagina de 50 em 50 ("Mostrar mais") para não renderizar centenas de itens.
- **Gráfico:** SVG próprio (`LineChart`), carga máxima por sessão, eixo X proporcional ao tempo;
  `role="img"` com resumo em texto. Só entram exercícios com carga registrada (mobilidade fica de fora).
- **Backup:** exportar baixa `ficha-abcde-AAAA-MM-DD.json`; importar mescla, nunca sobrescreve sessão
  finalizada, e uma falha deixa tudo como estava. Erros de escrita/importação sempre viram aviso visível.
- **Uma aba só:** Web Locks. A primeira aba escreve; as demais ficam em leitura (com aviso) e assumem
  sozinhas se a primeira fechar (relendo o banco). Se houver sessão ativa, a 2ª aba não a exibe (evita
  dois editores). Sem Web Locks o app se comporta como antes.
- **Atualização do PWA:** `registerType: "prompt"`; o banner "Nova versão disponível" só existe fora de
  sessão, então a atualização nunca recarrega no meio de um treino.
- **Armazenamento persistente:** pedido uma vez, na primeira abertura; resultado guardado em `settings` e
  mostrado em Ajustes, com aviso e orientação se negado.
- **ErrorBoundary** global: recarregar, exportar dados e (com segunda confirmação) limpar dados locais.
- **Bug corrigido:** a leitura do histórico usava `orderBy` do Dexie, que ignora linhas sem o campo
  indexado (registros muito corrompidos sumiam sem ir à quarentena). Agora lê tudo, valida e ordena em
  memória; a quarentena deduplica por tabela+chave (reler não infla a contagem).
- **Ícones** gerados por script a partir de um SVG e versionados; maskable com fundo cheio e conteúdo na
  zona segura.
- **Acessibilidade:** teste e2e com axe-core (WCAG 2.1 AA) nas telas principais, em tema claro e escuro.
- **Lighthouse:** não foi possível rodar aqui (recusa o Chromium disponível por ser antigo). Rodar
  localmente em Chrome atual: `npx lighthouse http://localhost:4173 --form-factor=mobile`.

## Fase 5: decisões (sincronização e deploy)

- **Local-first.** O IndexedDB continua sendo a fonte da verdade. Sem login nada roda e o cliente Supabase
  nem é baixado (import dinâmico, chunk separado de ~55 KB gzip; o JS inicial fica em ~121 KB).
- **Fila de saída (`outbox`, Dexie v3).** Toda alteração de sessão/ficha/ajustes entra na fila **na mesma
  transação** da gravação (ou grava e enfileira, ou nada). Uma linha por (tabela, id): a mais nova
  substitui a anterior. O envio lê o estado atual e faz `upsert` por `(user_id, id)`: idempotente.
- **Ciclo = enviar, depois ler.** Assim uma exclusão nossa chega ao servidor antes de lermos de volta.
  Leitura incremental por `synced_at` (relógio do **servidor**, definido por gatilho), inclusiva e
  idempotente; `updated_at` (relógio do cliente) só decide "última escrita vence". Isso evita perder
  linhas de um aparelho com relógio errado.
- **Conflitos (aplicados no cliente e, de novo, no servidor pelo gatilho `sync_guard`):** sessão finalizada
  é imutável; excluir vence editar (a linha excluída nunca ressuscita); plano/ajustes: última escrita vence.
  Exclusão é lógica (`deleted_at`); não existe policy de DELETE.
- **Seed nunca sobrescreve.** A ficha padrão (nunca editada) tem `updatedAt = 0` e não sincroniza; senão
  um aparelho novo, com relógio mais novo, apagaria a ficha editada em outro aparelho.
- **Ajustes:** só som/vibração sincronizam; `persistGranted` é do aparelho.
- **Sessão em andamento não sincroniza** (só treinos finalizados), para não haver dois aparelhos editando
  a mesma sessão.
- **Agendador:** ao iniciar, ao voltar a rede (`online`), após alterações (atraso de 1,5 s), a cada 60 s e
  com backoff exponencial (2 s, 4 s … teto de 5 min) após falhas; o gatilho periódico respeita o backoff.
  Só a aba líder (Web Locks) sincroniza.
- **Trocar de conta** no mesmo aparelho zera fila e cursor e reenvia tudo, para nunca vazar dados da conta
  anterior para a nova. Sair não apaga nada local.
- **Login:** link mágico + código de 6 dígitos (o link abre no navegador, não no app instalado). O token
  fica no `localStorage` (gerido pelo supabase-js); dados de treino nunca.
- **CSP** restritiva no `vercel.json` (`script-src 'self'`, `connect-src` só `self` e `*.supabase.co`, sem
  `unsafe-eval`/`unsafe-inline` em scripts). O `vite preview` serve os mesmos cabeçalhos e um teste e2e
  confere que o app inteiro roda sem violações. Para isso o zod roda com `jitless` (ele sondava
  `new Function`, o que a CSP reporta).
- **RLS testada** com dois usuários simulados (SQL em `supabase/tests`), e os alertas de segurança do
  Supabase estão vazios.
- **Deploy:** `vercel.json` pronto; a publicação depende de decidir de qual repositório/branch a Vercel
  vai construir (veja o resumo da fase).

## Contas (várias pessoas, mesmo aparelho)

- **Login por e-mail + senha** (Supabase Auth). O link mágico gasta e-mail a cada entrada e bate no limite do
  envio embutido do Supabase (~2/h, erro `429 email rate limit exceeded`); com senha só a criação da conta
  envia e-mail (confirmação). Link/código continuam como "Entrar sem senha" (útil para recuperar a senha:
  entra-se assim e define-se uma nova em Ajustes).
- **Um banco local por conta** (`ficha-abcde-u-<userId>`), além do banco original (perfil "anônimo", sem
  login). Só o _id/e-mail do perfil ativo_ fica no `localStorage`; dados de treino continuam só no
  IndexedDB. Duas pessoas no mesmo celular nunca misturam treinos e nada se apaga ao trocar de conta.
- **Vincular treinos do aparelho:** ao entrar numa conta, se o perfil anônimo tiver treinos, o app pergunta
  se devem ser vinculados à conta. "Vincular" _move_ os dados (união por id, o mais novo vence na ficha) e o
  motor os envia à nuvem da conta; "Começar do zero" mantém os treinos guardados no perfil anônimo.
- **Sair** não apaga nada. **Sair e apagar dados deste aparelho** remove o banco da conta (a nuvem fica).
- **Sessão trocada por fora** (outra conta no navegador): abre o banco da nova conta; os dados da anterior
  não são enviados a ela.
- **Um cliente Supabase por página** (cache de módulo): vários clientes disputam o mesmo login guardado.

## Fichas prontas, catálogo e dicas (várias pessoas)

- **Ficha flexível:** de 1 a 7 treinos (A–G), nome, meta de sessões e validade **opcionais**. Ficha antiga (5 treinos,
  com validade e meta) continua válida (campos novos têm padrão). A rotação segue a ordem da ficha; se o
  último treino feito não existe mais na ficha, recomeça no primeiro. Letras nunca são renumeradas
  (o histórico continua fazendo sentido); um novo treino usa a primeira letra livre.
- **Boas-vindas:** enquanto a ficha ainda é o exemplo que veio com o app (`updatedAt = 0`) e não há treinos
  feitos, a aba Treinos convida a escolher uma ficha pronta, montar do zero ou manter o exemplo. O exemplo
  (ficha real de academia) também está na lista de fichas prontas, para não haver perda ao trocar.
- **Fichas prontas** (`src/data/templates.ts`): 7 modelos montados só com exercícios do catálogo, cada um com
  as fontes em que se baseia. Testes garantem: schema válido, exercícios existentes no catálogo, fontes
  existentes, iniciantes com ≤ 3 dias/semana e intermediários com 3–4 (faixas do ACSM 2009).
  Aplicar uma ficha cria **cópia** com ids novos e pede confirmação se o usuário já tem ficha própria; o
  histórico nunca é alterado.
- **Catálogo** (`src/data/catalog.ts`): 61 exercícios em 13 grupos, com passo a passo, dicas/erros comuns e
  sugestão de séries/repetições/descanso. Embutido no app (funciona offline). Os textos foram escritos para
  este app, em português, seguindo a técnica padrão; **não copiam** as referências.
- **Exercício manual:** quando não acha no catálogo, o usuário cria um exercício com nome e anotação própria
  (sem vínculo com o catálogo). As dicas aparecem na pré-visualização, na escolha de exercícios e **durante o
  treino** ("Como fazer"). O histórico guarda `catalogId`/`note` no snapshot do exercício.
- **Fontes** (`src/data/sources.ts`): diretrizes (ACSM 2009, HHS 2018, Ministério da Saúde 2021), estudos
  (Schoenfeld 2016 frequência, 2017 volume, 2016 descanso) e referências de técnica (ACE, ExRx, NSCA).
  **Como foram verificadas:** por busca na web (título, veículo, ano, DOI e endereço conferidos nos
  resultados). As páginas em si não puderam ser abertas neste ambiente (bloqueio de rede), então as
  afirmações citadas são as que os resultados da busca confirmaram (ex.: ACSM: 2–3 dias iniciantes, 3–4
  intermediários, 1–3 séries de 8–12; HHS e Ministério da Saúde: fortalecimento ≥ 2 dias/semana;
  Schoenfeld 2016: cada grande grupo ≥ 2×/semana). As fichas seguem esses princípios; **não** foram
  aprovadas pelos autores e não são prescrição individual (aviso na tela e em Ajustes).
- **Tamanho:** o catálogo e as fichas somam ~14 KB gzip; o JS inicial ficou em ~138 KB (limite 150 KB). Se
  crescer mais, carregar `templates`/`sources` sob demanda.
- **Teste instável corrigido:** o e2e "offline" às vezes falhava porque marcava as séries antes de a tela do
  treino abrir (o início grava no banco antes). O teste agora espera a tela do treino.
