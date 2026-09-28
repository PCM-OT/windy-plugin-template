-- Testa RLS e regras de conflito. Roda dentro de um DO e termina com uma exceção proposital
-- ('TESTES_OK'), o que desfaz tudo (usuários e linhas de teste não ficam no banco).
-- Uso: colar no SQL Editor do Supabase ou rodar com `psql -f`. Qualquer falha lança 'FALHA: ...'.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n int;
  v text;
  del timestamptz;
begin
  insert into auth.users (id, email) values (a, 'a@test.local'), (b, 'b@test.local');

  -- ===== usuário A =====
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.sessions (user_id, id, data, updated_at) values (a, 's1', '{"note":"orig"}', '2026-01-01T10:00:00Z');
  insert into public.plan (user_id, id, data, updated_at) values (a, 'plan', '{"v":1}', '2026-01-01T10:00:00Z');

  -- 1. A não pode escrever como B
  begin
    insert into public.sessions (user_id, id, data, updated_at) values (b, 'x', '{}', now());
    raise exception 'FALHA: A conseguiu inserir linha de B';
  exception when sqlstate '42501' then null;
  end;

  -- 2. exclusão física bloqueada (só exclusão lógica)
  begin
    delete from public.sessions where id = 's1';
    raise exception 'FALHA: DELETE físico permitido';
  exception when sqlstate '42501' then null;
  end;

  -- 3. sessão finalizada é imutável (edição com updated_at maior é ignorada)
  insert into public.sessions (user_id, id, data, updated_at) values (a, 's1', '{"note":"editada"}', '2026-02-01T10:00:00Z')
    on conflict (user_id, id) do update set data = excluded.data, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at;
  select data ->> 'note' into v from public.sessions where id = 's1';
  if v <> 'orig' then raise exception 'FALHA: sessão finalizada foi alterada (%)', v; end if;

  -- 4. plano: última escrita vence
  insert into public.plan (user_id, id, data, updated_at) values (a, 'plan', '{"v":2}', '2026-03-01T10:00:00Z')
    on conflict (user_id, id) do update set data = excluded.data, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at;
  select data ->> 'v' into v from public.plan where id = 'plan';
  if v <> '2' then raise exception 'FALHA: escrita mais nova não venceu (%)', v; end if;
  insert into public.plan (user_id, id, data, updated_at) values (a, 'plan', '{"v":0}', '2026-01-15T10:00:00Z')
    on conflict (user_id, id) do update set data = excluded.data, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at;
  select data ->> 'v' into v from public.plan where id = 'plan';
  if v <> '2' then raise exception 'FALHA: escrita mais antiga sobrescreveu (%)', v; end if;

  -- 5. excluir vence editar (mesmo com editar mais novo depois)
  insert into public.sessions (user_id, id, data, updated_at, deleted_at) values (a, 's1', '{}', '2026-02-02T10:00:00Z', '2026-02-02T10:00:00Z')
    on conflict (user_id, id) do update set data = excluded.data, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at;
  select deleted_at into del from public.sessions where id = 's1';
  if del is null then raise exception 'FALHA: exclusão lógica não gravada'; end if;
  insert into public.sessions (user_id, id, data, updated_at, deleted_at) values (a, 's1', '{"note":"volta"}', '2026-12-01T10:00:00Z', null)
    on conflict (user_id, id) do update set data = excluded.data, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at;
  select deleted_at, data ->> 'note' into del, v from public.sessions where id = 's1';
  if del is null or v is not null then raise exception 'FALHA: linha excluída foi ressuscitada'; end if;

  -- 6. plano excluído também não volta
  update public.plan set deleted_at = '2026-04-01T10:00:00Z', updated_at = '2026-04-01T10:00:00Z' where id = 'plan';
  update public.plan set deleted_at = null, data = '{"v":9}', updated_at = '2026-05-01T10:00:00Z' where id = 'plan';
  select deleted_at into del from public.plan where id = 'plan';
  if del is null then raise exception 'FALHA: plano excluído voltou'; end if;

  -- ===== usuário B =====
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.sessions;
  if n <> 0 then raise exception 'FALHA: B enxerga % sessões de A', n; end if;
  select count(*) into n from public.plan;
  if n <> 0 then raise exception 'FALHA: B enxerga plano de A'; end if;

  update public.sessions set data = '{"hack":true}' where id = 's1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA: B atualizou linha de A'; end if;

  -- mesmo id, outro usuário: são linhas independentes
  insert into public.sessions (user_id, id, data, updated_at) values (b, 's1', '{"note":"de B"}', now());
  select data ->> 'note' into v from public.sessions where id = 's1';
  if v <> 'de B' then raise exception 'FALHA: B não vê a própria linha'; end if;

  -- ===== anônimo =====
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    perform 1 from public.sessions limit 1;
    raise exception 'FALHA: anônimo leu sessions';
  exception when sqlstate '42501' then null;
  end;

  reset role;
  raise exception 'TESTES_OK';
end;
$$;
