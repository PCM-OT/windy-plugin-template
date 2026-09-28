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
