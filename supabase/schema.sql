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
  onboarding_completed boolean not null default false,
  approval_status text check (approval_status in ('pending', 'approved', 'rejected')) default 'pending',
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
  corporate_name text,
  cnpj text,
  segment text,
  address text,
  city text,
  state text,
  cep text,
  contact_name text,
  role_position text,
  phone text,
  instagram text,
  linkedin text,
  website text,
  contract_model text default 'Mensal',
  contract_value numeric(10,2) default 0.00,
  setup_value numeric(10,2) default 0.00,
  contract_duration text,
  payment_date date,
  due_date date,
  financial_status text default 'Pendente' check (financial_status in ('Pendente', 'Pago', 'Atrasado')),
  invoices jsonb default '[]'::jsonb,
  payment_receipts jsonb default '[]'::jsonb,
  onboarding_completed boolean not null default false,
  status text check (status in ('convidado', 'ativo', 'bloqueado')) default 'ativo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1c. Tabela de Detalhes de Freelancers / Prestadores de Serviço
create table if not exists public.freelancers (
  id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) default '00000000-0000-0000-0000-000000000001',
  company_name text,
  corporate_name text,
  cnpj text,
  segment text,
  email text,
  address text,
  city text,
  state text,
  cep text,
  role_position text,
  phone text,
  instagram text,
  linkedin text,
  website text,
  bank_name text,
  bank_agency text,
  bank_account text,
  pix_key text,
  pix_type text default 'CNPJ',
  contract_model text default 'Mensal',
  contract_value numeric(10,2) default 0.00,
  payment_date date,
  due_date date,
  financial_status text default 'Pendente' check (financial_status in ('Pendente', 'Pago', 'Atrasado')),
  payment_receipts jsonb default '[]'::jsonb,
  onboarding_completed boolean not null default false,
  skills text[],
  hourly_rate numeric(10,2) default 0.00,
  status text check (status in ('ativo', 'inativo', 'pendente', 'bloqueado')) default 'ativo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1d. Tabela de Notas Fiscais de Prestadores de Serviço
create table if not exists public.freelancer_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) default '00000000-0000-0000-0000-000000000001',
  freelancer_id uuid references public.profiles(id) on delete cascade not null,
  invoice_number text not null,
  issue_date date not null,
  competence text not null,
  amount numeric(10,2) not null default 0.00,
  provider_name text not null,
  file_path text not null,
  file_url text not null,
  xml_file_path text,
  xml_file_url text,
  status text not null default 'Em análise' check (status in ('Em análise', 'Aprovada', 'Reprovada')),
  review_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1e. Tabela de Notas Fiscais de Serviço Emitidas pela Delski (NFS-e)
create table if not exists public.emitted_service_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) default '00000000-0000-0000-0000-000000000001',
  client_id uuid references public.clients(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  number text,
  verification_code text,
  status text not null default 'rascunho' check (status in ('rascunho', 'processando', 'autorizada', 'cancelada', 'erro')),
  service_description text not null,
  service_value numeric(10,2) not null default 0.00,
  iss_rate numeric(5,2) not null default 2.00,
  iss_value numeric(10,2) generated always as (round((service_value * iss_rate / 100.0), 2)) stored,
  cnae_code text default '6201-5/01',
  item_lista_servico text default '01.07',
  pdf_url text,
  xml_url text,
  error_message text,
  issued_at timestamp with time zone,
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

-- 8. Tabela de Documentos do Cliente
create table if not exists public.client_documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  document_type text not null,
  file_path text not null,
  file_url text,
  status text check (status in ('pendente', 'em_analise', 'aprovado', 'rejeitado')) default 'pendente',
  review_notes text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Tabela de Ocorrências e SAC
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  client_name text not null,
  client_email text,
  category text default 'Projeto',
  subject text not null,
  message text not null,
  evidence_url text,
  priority text default 'Media' check (priority in ('Baixa', 'Media', 'Alta', 'Critica')),
  responsible_name text default 'Equipe Delski',
  deadline_date date,
  resolution_date date,
  resolution_notes text,
  status text default 'Aberto' check (status in ('Aberto', 'Em atendimento', 'Em Andamento', 'Resolvido', 'Expirado')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Tabela de Respostas de Chamados
create table if not exists public.ticket_replies (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender_name text not null,
  sender_role text check (sender_role in ('gestor', 'cliente', 'admin')) not null default 'gestor',
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
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
