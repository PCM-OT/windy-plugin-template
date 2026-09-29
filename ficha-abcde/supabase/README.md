# Supabase (sincronização opcional)

Projeto: `ficha-abcde` (região `sa-east-1`, plano gratuito). O app funciona sem isto; a nuvem é só
cópia e ponte entre aparelhos (o IndexedDB é a fonte da verdade).

- `migrations/20260928000000_sync_schema.sql`: tabelas `sessions`, `plan`, `settings` (`user_id`,
  `updated_at`, `deleted_at`, `synced_at`), gatilho de conflito e RLS. Já aplicada no projeto.
- `tests/rls_and_conflicts.sql`: testa RLS (isolamento entre usuários, anônimo, sem DELETE físico) e as
  regras de conflito (sessão imutável, última escrita vence, excluir vence editar). Termina com a exceção
  proposital `TESTES_OK`, que desfaz tudo. Cole no SQL Editor do Supabase.

## Configurar o app

Copie `.env.example` para `.env.local` (ou defina as variáveis na Vercel):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...   # pública por desenho; a RLS protege os dados
```

## No painel do Supabase (não dá para fazer por código)

1. **Authentication → URL Configuration**: `Site URL` = URL do app publicado e, em `Redirect URLs`,
   a mesma URL (e `http://localhost:4173` para testes). Sem isso o link mágico volta para o lugar errado.
2. **Authentication → Email Templates → Magic Link**: acrescente o código `{{ .Token }}` ao texto do
   e-mail. Assim dá para entrar digitando o código de 6 dígitos, necessário no app instalado (o link
   abre no navegador, não no app instalado, principalmente no iPhone).
3. O e-mail embutido do Supabase tem limite baixo de envios por hora; para uso contínuo, configure um
   SMTP próprio em Authentication → SMTP.

## Login por e-mail e senha

O app usa e-mail + senha. Criar a conta envia **um** e-mail de confirmação; entrar depois não envia nada.
Para evitar até esse e-mail (uso pessoal), desligue **Authentication → Sign In / Providers → Email →
Confirm email** (qualquer pessoa poderá criar conta sem confirmar o e-mail). O limite de envio do e-mail
embutido do Supabase é baixo (`429 email rate limit exceeded`); para uso contínuo configure um SMTP próprio.
