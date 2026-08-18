-- ==============================================================
-- GARANTIA DE PERMISSÕES E RLS: TABELAS CLIENTS E PROFILES
-- ==============================================================

-- 1. Habilitar RLS na tabela clients (caso ainda não esteja)
alter table if exists public.clients enable row level security;

-- 2. Políticas de Acesso para a tabela public.clients
drop policy if exists "clients_select_all_authenticated" on public.clients;
create policy "clients_select_all_authenticated" on public.clients
  for select
  using (
    auth.role() = 'authenticated' or
    auth.role() = 'anon'
  );

drop policy if exists "clients_insert_authenticated" on public.clients;
create policy "clients_insert_authenticated" on public.clients
  for insert
  with check (
    auth.role() = 'authenticated' or
    auth.role() = 'anon'
  );

drop policy if exists "clients_update_authenticated" on public.clients;
create policy "clients_update_authenticated" on public.clients
  for update
  using (
    auth.role() = 'authenticated' or
    auth.role() = 'anon'
  )
  with check (
    auth.role() = 'authenticated' or
    auth.role() = 'anon'
  );

drop policy if exists "clients_delete_authenticated" on public.clients;
create policy "clients_delete_authenticated" on public.clients
  for delete
  using (
    auth.role() = 'authenticated'
  );

-- 3. Índices adicionais para consultas de performance por ID, auth_user_id e email
create index if not exists idx_clients_auth_user_id on public.clients(auth_user_id);
create index if not exists idx_clients_email on public.clients(email);
