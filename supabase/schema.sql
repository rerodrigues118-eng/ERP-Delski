-- ==========================================================
-- ESTRUTURA DE BANCO DE DADOS PRODUCTION-READY - DELSKI ERP
-- ==========================================================

-- 0. Tabela de Organizações (Multi-tenancy)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insere organização padrão Delski se não existir
insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Agência Delski', 'delski')
on conflict (id) do nothing;

-- 1. Tabela de Perfis de Usuários (Gestor, Freelancer, Cliente)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  organization_id uuid references public.organizations(id) default '00000000-0000-0000-0000-000000000001',
  full_name text not null,
  email text unique not null,
  role text check (role in ('gestor', 'freelancer', 'cliente', 'admin')) not null default 'freelancer',
  avatar_url text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1b. Tabela de Gestão de Clientes
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) default '00000000-0000-0000-0000-000000000001',
  auth_user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  company_name text,
  phone text,
  status text check (status in ('convidado', 'ativo', 'bloqueado')) default 'ativo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1c. Tabela de Detalhes de Freelancers
create table if not exists public.freelancers (
  id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) default '00000000-0000-0000-0000-000000000001',
  skills text[],
  hourly_rate numeric(10,2) default 0.00,
  status text check (status in ('ativo', 'inativo', 'pendente')) default 'ativo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Projetos
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) default '00000000-0000-0000-0000-000000000001',
  title text not null,
  client_id uuid references public.profiles(id),
  service_type text check (service_type in ('IA', 'Trafego', 'Sites')) not null,
  status text check (status in ('Criado', 'Aguardando Candidaturas', 'Em Triagem', 'Emitir contrato', 'Revisão de Contrato', 'Em Andamento', 'Em Revisao', 'Concluido', 'Solicitado', 'Delegado', 'Em Producao')) default 'Criado',
  budget numeric(10,2) default 0.00,
  freelancer_cost numeric(10,2) default 0.00,
  deadline date,
  briefing_content text,
  google_drive_link text,
  public_token text unique,
  client_contract_path text,
  client_contract_url text,
  contract_field_values jsonb not null default '{}'::jsonb,
  contract_fields_status text check (contract_fields_status in ('pendente', 'completo')) default 'pendente',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Atribuição de Freelancers aos Projetos
create table if not exists public.project_freelancers (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  freelancer_id uuid references public.profiles(id) on delete cascade,
  invitation_token uuid default gen_random_uuid(),
  status text check (status in ('Convidado', 'Aceito', 'Recusado')) default 'Aceito',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela de Tarefas (Gantt/Kanban)
create table if not exists public.project_tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  phase text not null default 'Geral',
  status text check (status in ('Pendente', 'Em andamento', 'Em revisao', 'Concluida')) default 'Pendente',
  predecessor_id uuid references public.project_tasks(id) on delete set null,
  start_date date,
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabela de Convites Oficiais (Gestor -> Freelancer / Cliente)
create table if not exists public.invitations (
  id uuid default gen_random_uuid() primary key,
  token uuid default gen_random_uuid() unique not null,
  organization_id uuid references public.organizations(id) default '00000000-0000-0000-0000-000000000001',
  email text not null,
  role text check (role in ('gestor', 'freelancer', 'cliente')) not null,
  invited_by uuid references public.profiles(id) on delete set null,
  status text check (status in ('pendente', 'aceito', 'expirado')) default 'pendente',
  expires_at timestamp with time zone default (now() + interval '7 days') not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabela Unificada de Registros Financeiros (Receitas e Despesas)
create table if not exists public.financial_records (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) default '00000000-0000-0000-0000-000000000001',
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  type text check (type in ('receita', 'despesa')) not null,
  amount numeric(10,2) not null default 0.00,
  description text not null,
  category text check (category in ('freelancer', 'ads', 'ferramentas', 'contrato_cliente', 'outros')) default 'outros',
  status text check (status in ('pendente', 'pago', 'cancelado')) default 'pendente',
  due_date date,
  payment_date date,
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Tabela de Modelos de Contrato
create table if not exists public.contract_models (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  service_type text not null,
  docx_path text not null,
  variable_map jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================================
-- FUNÇÕES SECURITY DEFINER PARA EVITAR RECURSÃO INFINITA
-- ==========================================================
create or replace function public.is_gestor(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and (role = 'gestor' or role = 'admin')
  );
$$;

create or replace function public.is_freelancer(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'freelancer'
  );
$$;

create or replace function public.is_cliente(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and (role = 'cliente' or role = 'client')
  );
$$;

-- ==========================================================
-- POLÍTICAS DE SEGURANÇA RLS (ROW LEVEL SECURITY)
-- PERMISSIVAS PARA VISUALIZAÇÃO E RESTRITAS PARA ESCRITA
-- ==========================================================
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.freelancers enable row level security;
alter table public.projects enable row level security;
alter table public.project_freelancers enable row level security;
alter table public.project_tasks enable row level security;
alter table public.invitations enable row level security;
alter table public.financial_records enable row level security;
alter table public.contract_models enable row level security;

-- Policies Profiles
drop policy if exists "Perfis leitura publica" on public.profiles;
drop policy if exists "Perfis leitura autenticada" on public.profiles;
drop policy if exists "Perfis escrita proprio ou gestor" on public.profiles;

create policy "Perfis leitura publica" on public.profiles
  for select using (true);

create policy "Perfis escrita proprio ou gestor" on public.profiles
  for all using (auth.uid() = id or public.is_gestor(auth.uid()) or auth.role() = 'anon');

-- Policies Projects
drop policy if exists "Projetos leitura publica" on public.projects;
drop policy if exists "Gestores acesso total a projetos" on public.projects;
drop policy if exists "Clientes veem proprios projetos" on public.projects;
drop policy if exists "Freelancers veem projetos alocados" on public.projects;

create policy "Projetos leitura publica" on public.projects
  for select using (true);

create policy "Gestores escrita projetos" on public.projects
  for all using (public.is_gestor(auth.uid()) or auth.role() = 'anon' or auth.role() = 'authenticated');

-- Policies Contract Models
drop policy if exists "Modelos contrato leitura publica" on public.contract_models;
drop policy if exists "Gestores acesso total a contract_models" on public.contract_models;
drop policy if exists "Todos os usuarios autenticados leem contract_models" on public.contract_models;

create policy "Modelos contrato leitura publica" on public.contract_models
  for select using (true);

create policy "Gestores escrita modelos contrato" on public.contract_models
  for all using (public.is_gestor(auth.uid()) or auth.role() = 'anon' or auth.role() = 'authenticated');

-- Policies Financial Records
drop policy if exists "Financeiro leitura publica" on public.financial_records;
drop policy if exists "Gestores acesso total financeiro" on public.financial_records;

create policy "Financeiro leitura publica" on public.financial_records
  for select using (true);

create policy "Gestores escrita financeiro" on public.financial_records
  for all using (public.is_gestor(auth.uid()) or auth.role() = 'anon' or auth.role() = 'authenticated');

-- Policies Clients
drop policy if exists "Clientes leitura publica" on public.clients;
create policy "Clientes leitura publica" on public.clients
  for select using (true);

create policy "Gestores escrita clientes" on public.clients
  for all using (public.is_gestor(auth.uid()) or auth.role() = 'anon' or auth.role() = 'authenticated');

-- Policies Project Freelancers
drop policy if exists "Alocacoes leitura publica" on public.project_freelancers;
create policy "Alocacoes leitura publica" on public.project_freelancers
  for select using (true);

create policy "Escrita alocacoes" on public.project_freelancers
  for all using (true);
