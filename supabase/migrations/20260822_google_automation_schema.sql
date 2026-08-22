-- ============================================================================
-- Migração: Automação Google (Drive, Calendar, Sheets) & Logs de Sincronização
-- Data: 22/08/2026
-- ============================================================================

-- 1. Criação da tabela automation_logs
create table if not exists public.automation_logs (
  id uuid default gen_random_uuid() primary key,
  event_type text not null check (event_type in (
    'drive_folder_creation',
    'calendar_event_upsert',
    'sheets_append',
    'drive_permission_update',
    'crm_meeting_calendar'
  )),
  entity_id text not null,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'retrying', 'success', 'error'
  )),
  attempts integer not null default 0,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Idempotência: impede reprocessamento do mesmo evento bem-sucedido
create unique index if not exists automation_logs_event_success_unique
  on public.automation_logs (event_type, entity_id)
  where status = 'success';

create index if not exists automation_logs_status_idx
  on public.automation_logs (status);

create index if not exists automation_logs_created_at_idx
  on public.automation_logs (created_at desc);

-- 2. Habilitação de RLS para automation_logs
alter table public.automation_logs enable row level security;

drop policy if exists "Gestores leem automation_logs" on public.automation_logs;
create policy "Gestores leem automation_logs" on public.automation_logs
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'gestor'
    )
  );

-- 3. Adicionar colunas de referência do ecossistema Google
do $$
begin
  -- Coluna drive_folder_id na tabela clients
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'clients' and column_name = 'drive_folder_id'
  ) then
    alter table public.clients add column drive_folder_id text;
  end if;

  -- Colunas calendar_event_id e drive_folder_id na tabela projects
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'projects' and column_name = 'calendar_event_id'
  ) then
    alter table public.projects add column calendar_event_id text;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'projects' and column_name = 'drive_folder_id'
  ) then
    alter table public.projects add column drive_folder_id text;
  end if;

  -- Coluna calendar_event_id na tabela crm_leads
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'crm_leads' and column_name = 'calendar_event_id'
  ) then
    alter table public.crm_leads add column calendar_event_id text;
  end if;
end $$;
