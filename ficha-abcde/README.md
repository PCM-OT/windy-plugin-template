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

## Publicar

Site estático na Vercel: root `ficha-abcde`, build `npm run build`, saída `dist` (já em `vercel.json`, com CSP
restritiva e cabeçalhos de segurança). Variáveis de ambiente opcionais para a sincronização: veja
`.env.example` e `supabase/README.md`. Sem elas o app funciona 100% local.

## Instalar no celular

Abra o site no Chrome (Android) ou Safari (iOS) e use "Adicionar à tela inicial".

## Status

Fases 0–5 concluídas no código (sincronização opcional com Supabase, CSP, `vercel.json`). Falta publicar na Vercel e configurar a URL no Supabase (veja `supabase/README.md`).

## Ícones do PWA

Os PNGs (192, 512, maskable, apple-touch) saem de `public/icon.svg`: `npm run icons` (usa `sharp`).

## Backup

Ajustes → Exportar backup (JSON) / Importar backup (mescla por id, sem duplicar; itens inválidos são
ignorados e contados). Faça um backup de vez em quando: navegadores podem apagar dados locais.
