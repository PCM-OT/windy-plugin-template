# Ficha ABCDE

App de treino de academia (PWA, pt-BR), offline-first. Veja `docs/decisoes.md`.

## Rodar

```bash
cd ficha-abcde
npm ci
npm run dev
```

## Qualidade

```bash
npm run lint && npm run typecheck && npm test
npm run build
npm run test:e2e   # sobe build + preview em :4173
```

No e2e, se não houver Chromium do Playwright: `PW_CHROMIUM_PATH=/caminho/chrome npm run test:e2e`.
Na primeira vez: `npx playwright install chromium`.

## Publicar (Fase 5)

Site estático na Vercel: root `ficha-abcde`, build `npm run build`, saída `dist`.

## Instalar no celular

Abra o site no Chrome (Android) ou Safari (iOS) e use "Adicionar à tela inicial".

## Status

Fases 0 e 1 concluídas (scaffold; domínio, Dexie, seed, migrações). Próxima: Fase 2 (telas Treinos e editor).
