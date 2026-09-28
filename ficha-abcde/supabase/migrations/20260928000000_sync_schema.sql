-- Ficha ABCDE: cópia na nuvem (local-first). O IndexedDB do aparelho é a fonte da verdade;
-- estas tabelas são só cópia e ponte entre aparelhos. Exclusão sempre lógica (deleted_at).

create table public.sessions (
  user_id   uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id        text        not null,
  data      jsonb       not null,
  updated_at timestamptz not null,               -- relógio do cliente: decide "última escrita vence"
  synced_at  timestamptz not null default now(), -- relógio do servidor: cursor de leitura (imune a relógio errado)
  deleted_at timestamptz,
  primary key (user_id, id),
  constraint sessions_data_size check (pg_column_size(data) < 262144)
);
create table public.plan (like public.sessions including all);
create table public.settings (like public.sessions including all);

-- LIKE não copia a FK nem a policy: refaz a FK.
alter table public.plan     add constraint plan_user_fk     foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.settings add constraint settings_user_fk foreign key (user_id) references auth.users (id) on delete cascade;

create index sessions_user_synced_idx on public.sessions (user_id, synced_at);
create index plan_user_synced_idx     on public.plan     (user_id, synced_at);
create index settings_user_synced_idx on public.settings (user_id, synced_at);

-- Regras de conflito no servidor (valem para qualquer aparelho, mesmo com relógio errado):
--   1. excluir vence editar: linha excluída nunca é "ressuscitada";
--   2. sessão finalizada é imutável: só pode ser excluída;
--   3. plano/ajustes: última escrita vence por updated_at.
-- Retornar NULL num BEFORE UPDATE ignora a escrita em silêncio (o upsert do cliente segue idempotente).
create function public.sync_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.synced_at := now();
    return new;
  end if;

  if old.deleted_at is not null then
    return null;
  end if;

  if new.deleted_at is not null then
    new.data := '{}'::jsonb;
    new.updated_at := greatest(old.updated_at, new.updated_at);
    new.synced_at := now();
    return new;
  end if;

  if tg_table_name = 'sessions' then
    return null;
  end if;

  if new.updated_at < old.updated_at then
    return null;
  end if;

  new.synced_at := now();
  return new;
end;
$$;

create trigger sessions_guard before insert or update on public.sessions for each row execute function public.sync_guard();
create trigger plan_guard     before insert or update on public.plan     for each row execute function public.sync_guard();
create trigger settings_guard before insert or update on public.settings for each row execute function public.sync_guard();

-- RLS: cada usuário só lê e escreve as próprias linhas. Sem policy de DELETE (só exclusão lógica).
alter table public.sessions enable row level security;
alter table public.plan     enable row level security;
alter table public.settings enable row level security;

create policy sessions_select_own on public.sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy sessions_insert_own on public.sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sessions_update_own on public.sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy plan_select_own on public.plan for select to authenticated using ((select auth.uid()) = user_id);
create policy plan_insert_own on public.plan for insert to authenticated with check ((select auth.uid()) = user_id);
create policy plan_update_own on public.plan for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy settings_select_own on public.settings for select to authenticated using ((select auth.uid()) = user_id);
create policy settings_insert_own on public.settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy settings_update_own on public.settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.sessions, public.plan, public.settings from anon;
revoke delete, truncate on public.sessions, public.plan, public.settings from authenticated;
grant select, insert, update on public.sessions, public.plan, public.settings to authenticated;
