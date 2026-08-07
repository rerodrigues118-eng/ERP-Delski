-- ==========================================================
-- ESTRUTURA DE BANCO DE DADOS - DELSKI ERP (SUPABASE SQL)
-- CORREÇÃO DE RLS: Função Security Definer evita recursão infinita
-- ==========================================================

-- 1. Tabela de Perfis de Usuários (Gestor, Freelancer, Cliente)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text unique not null,
  role text check (role in ('gestor', 'freelancer', 'cliente')) not null default 'freelancer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1b. Tabela de Gestão de Clientes
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  company_name text,
  phone text,
  status text check (status in ('convidado', 'ativo', 'bloqueado')) default 'convidado',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Projetos
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
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
  status text check (status in ('Convidado', 'Aceito', 'Recusado')) default 'Convidado',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela de Tarefas com Dependências (Gantt)
create table if not exists public.project_tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  phase text not null,
  status text check (status in ('Pendente', 'Em andamento', 'Em revisao', 'Concluida')) default 'Pendente',
  predecessor_id uuid references public.project_tasks(id) on delete set null,
  start_date date,
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabela de Triagem de Freelancers
create table if not exists public.project_triage (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  token uuid default gen_random_uuid() unique,
  freelancer_name text,
  freelancer_email text,
  skills text[],
  availability_hours integer,
  portfolio_url text,
  proposed_rate numeric(10,2),
  experience_summary text,
  considerations text,
  notes text,
  status text check (status in ('Rascunho', 'Enviado', 'Aprovado', 'Rejeitado')) default 'Rascunho',
  score integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabela de Despesas / Pagamentos por Projeto
create table if not exists public.project_expenses (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  amount numeric(10,2) not null default 0.00,
  description text,
  category text check (category in ('freelancer','ads','ferramentas','outros')) default 'outros',
  status text check (status in ('Pendente','Aprovado','Pago')) default 'Pendente',
  freelancer_id uuid references public.profiles(id),
  proof_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6b. Tabela de Repasses de Freelancers
create table if not exists public.freelancer_payouts (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  freelancer_id uuid references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null default 0.00,
  due_date date,
  payment_date date,
  status text check (status in ('pendente','pago','agendado')) default 'pendente',
  payment_receipt_path text,
  payment_receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================================
-- FUNÇÃO AUXILIAR SECURITY DEFINER (EVITA RECURSÃO INFINITA)
-- ==========================================================
create or replace function public.is_gestor(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'gestor'
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
-- SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- ==========================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.clients enable row level security;
alter table public.project_freelancers enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_triage enable row level security;
alter table public.project_expenses enable row level security;
alter table public.freelancer_payouts enable row level security;

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check check (status in ('Criado', 'Aguardando Candidaturas', 'Em Triagem', 'Em Andamento', 'Em Revisao', 'Concluido', 'Solicitado', 'Delegado', 'Em Producao'));

alter table public.project_triage add column if not exists experience_summary text;
alter table public.project_triage add column if not exists considerations text;
alter table public.project_triage add column if not exists notes text;

-- Limpa políticas antigas
drop policy if exists "Gestores acesso total a profiles" on public.profiles;
drop policy if exists "Usuarios leem proprio perfil" on public.profiles;
drop policy if exists "Perfis leitura e gestor total" on public.profiles;
drop policy if exists "Gestores acesso total a projects" on public.projects;
drop policy if exists "Clientes veem apenas seus projetos" on public.projects;
drop policy if exists "Freelancers veem projetos atribuídos" on public.projects;
drop policy if exists "Gestores acesso total a tasks" on public.project_tasks;
drop policy if exists "Usuarios vinculados veem tarefas" on public.project_tasks;
drop policy if exists "Project freelancers gestor total" on public.project_freelancers;
drop policy if exists "Project freelancers leitura alocados" on public.project_freelancers;

drop policy if exists "Leitura de perfis autenticados" on public.profiles;
drop policy if exists "Escrita no proprio perfil ou gestor" on public.profiles;

-- 1. Políticas para Profiles (Sem recursão infinita)
create policy "Leitura de perfis autenticados" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Escrita no proprio perfil ou gestor" on public.profiles
  for all using (auth.uid() = id or public.is_gestor(auth.uid()));

drop policy if exists "Gestores acesso total a projects" on public.projects;
drop policy if exists "Clientes veem apenas seus projetos" on public.projects;
drop policy if exists "Freelancers veem projetos atribuídos" on public.projects;

-- 2. Políticas para Projects
create policy "Gestores acesso total a projects" on public.projects
  for all using (public.is_gestor(auth.uid()));

create policy "Clientes veem apenas seus projetos" on public.projects
  for select using (
    client_id = auth.uid()
    OR client_id IN (
      select id from public.profiles where lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

create policy "Freelancers veem projetos atribuídos" on public.projects
  for select using (
    id in (select project_id from public.project_freelancers where freelancer_id = auth.uid())
  );

drop policy if exists "Gestores acesso total a project_freelancers" on public.project_freelancers;
drop policy if exists "Freelancers veem suas atribuicoes" on public.project_freelancers;
drop policy if exists "Project freelancers gestor total" on public.project_freelancers;
drop policy if exists "Project freelancers leitura alocados" on public.project_freelancers;
drop policy if exists "Acesso autenticado a project_freelancers" on public.project_freelancers;

-- 3. Políticas para Project Freelancers
create policy "Acesso autenticado a project_freelancers" on public.project_freelancers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Gestores acesso total a tasks" on public.project_tasks;
drop policy if exists "Usuarios vinculados veem tarefas" on public.project_tasks;

-- 4. Políticas para Project Tasks
create policy "Gestores acesso total a tasks" on public.project_tasks
  for all using (public.is_gestor(auth.uid()));

create policy "Usuarios vinculados veem tarefas" on public.project_tasks
  for select using (
    project_id in (
      select id from public.projects where client_id = auth.uid()
      union
      select project_id from public.project_freelancers where freelancer_id = auth.uid()
    )
  );

drop policy if exists "Acesso livre para leitura e inserção de triagem" on public.project_triage;

drop policy if exists "Gestores acesso total a clients" on public.clients;
drop policy if exists "Clientes veem seu registro de client" on public.clients;
drop policy if exists "Gestores acesso total a project_expenses" on public.project_expenses;
drop policy if exists "Freelancers veem despesas proprio" on public.project_expenses;
drop policy if exists "Gestores acesso total a freelancer_payouts" on public.freelancer_payouts;
drop policy if exists "Freelancers veem seus repasses" on public.freelancer_payouts;

-- 5. Políticas para Project Triage
create policy "Acesso livre para leitura e inserção de triagem" on public.project_triage
  for all using (true);

-- 5b. Políticas para Clients, Project Expenses e Freelancer Payouts
create policy "Gestores acesso total a clients" on public.clients
  for all using (public.is_gestor(auth.uid())) with check (public.is_gestor(auth.uid()));

create policy "Clientes veem seu registro de client" on public.clients
  for select using (
    auth.role() = 'authenticated' and (
      auth_user_id = auth.uid()
      or lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

create policy "Gestores acesso total a project_expenses" on public.project_expenses
  for all using (public.is_gestor(auth.uid())) with check (public.is_gestor(auth.uid()));

create policy "Freelancers veem despesas proprio" on public.project_expenses
  for select using (
    auth.role() = 'authenticated' and (
      freelancer_id = auth.uid()
      or project_id in (select project_id from public.project_freelancers where freelancer_id = auth.uid())
    )
  );

create policy "Gestores acesso total a freelancer_payouts" on public.freelancer_payouts
  for all using (public.is_gestor(auth.uid())) with check (public.is_gestor(auth.uid()));

create policy "Freelancers veem seus repasses" on public.freelancer_payouts
  for select using (freelancer_id = auth.uid());

-- ==========================================================
-- STORAGE BUCKET PARA ANEXOS DE PROJETOS
-- ==========================================================
insert into storage.buckets (id, name, public)
values ('project-attachments', 'project-attachments', true)
on conflict (id) do nothing;

-- Bucket para contratos assinados por freelancers
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', true)
on conflict (id) do nothing;

drop policy if exists "Uploads permitidos para usuarios autenticados" on storage.objects;
drop policy if exists "Leitura publica de anexos" on storage.objects;

create policy "Uploads permitidos para usuarios autenticados" on storage.objects
  for insert with check (bucket_id = 'project-attachments' and auth.role() = 'authenticated');

create policy "Leitura publica de anexos" on storage.objects
  for select using (bucket_id = 'project-attachments');

-- Ensure we drop these if they already exist to avoid "policy already exists" errors
drop policy if exists "Uploads permitidos para contratos autenticados" on storage.objects;
drop policy if exists "Leitura publica de contratos" on storage.objects;

create policy "Uploads permitidos para contratos autenticados" on storage.objects
  for insert with check (bucket_id = 'contracts' and auth.role() = 'authenticated');

create policy "Leitura publica de contratos" on storage.objects
  for select using (bucket_id = 'contracts');

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists "Uploads permitidos para recibos" on storage.objects;
create policy "Uploads permitidos para recibos" on storage.objects
  for insert with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

drop policy if exists "Leitura autenticada de recibos" on storage.objects;
create policy "Leitura autenticada de recibos" on storage.objects
  for select using (bucket_id = 'receipts' and auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('contract-templates', 'contract-templates', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('contract-generated', 'contract-generated', true)
on conflict (id) do nothing;

drop policy if exists "Uploads permitidos para modelos de contrato autenticados" on storage.objects;
drop policy if exists "Leitura publica de modelos de contrato" on storage.objects;

create policy "Uploads permitidos para modelos de contrato autenticados" on storage.objects
  for insert with check (bucket_id = 'contract-templates' and auth.role() = 'authenticated');

create policy "Leitura publica de modelos de contrato" on storage.objects
  for select using (bucket_id = 'contract-templates');

drop policy if exists "Uploads permitidos para contratos gerados autenticados" on storage.objects;
drop policy if exists "Leitura publica de contratos gerados" on storage.objects;

create policy "Uploads permitidos para contratos gerados autenticados" on storage.objects
  for insert with check (bucket_id = 'contract-generated' and auth.role() = 'authenticated');

create policy "Leitura publica de contratos gerados" on storage.objects
  for select using (bucket_id = 'contract-generated');

-- Tabela de modelos de contrato
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

alter table public.contract_models enable row level security;

drop policy if exists "Gestores acesso total a contract_models" on public.contract_models;
create policy "Gestores acesso total a contract_models" on public.contract_models
  for all using (public.is_gestor(auth.uid()));

drop policy if exists "Todos os usuarios autenticados leem contract_models" on public.contract_models;
create policy "Todos os usuarios autenticados leem contract_models" on public.contract_models
  for select using (auth.role() = 'authenticated');

-- Tabela de contratos gerados
create table if not exists public.generated_contracts (
  id uuid default gen_random_uuid() primary key,
  model_id uuid references public.contract_models(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  freelancer_id uuid references public.profiles(id) on delete set null,
  values jsonb not null default '{}'::jsonb,
  docx_path text not null,
  pdf_path text,
  signed_docx_path text,
  status text check (status in ('draft','rascunho','aguardando_upload_gestor','generated','aguardando_assinatura_freelancer','exported','assinado_freelancer','concluido')) default 'rascunho',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.generated_contracts enable row level security;

drop policy if exists "Gestores acesso total a generated_contracts" on public.generated_contracts;
create policy "Gestores acesso total a generated_contracts" on public.generated_contracts
  for all using (public.is_gestor(auth.uid()));

drop policy if exists "Freelancers veem seus contratos gerados" on public.generated_contracts;
create policy "Freelancers veem seus contratos gerados" on public.generated_contracts
  for select using (freelancer_id = auth.uid());

drop policy if exists "Freelancers inserem contrato gerado proprio" on public.generated_contracts;
create policy "Freelancers inserem contrato gerado proprio" on public.generated_contracts
  for insert with check (freelancer_id = auth.uid());

drop policy if exists "Freelancers atualizam seus contratos gerados" on public.generated_contracts;
create policy "Freelancers atualizam seus contratos gerados" on public.generated_contracts
  for update using (freelancer_id = auth.uid());

-- Tabela para rastrear contratos enviados pelos freelancers
create table if not exists public.project_contracts (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  freelancer_id uuid references public.profiles(id),
  file_path text,
  file_url text,
  status text check (status in ('Enviado','Aprovado','Indeferido','Ajustes')) default 'Enviado',
  manager_message text,
  manager_response_file_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.project_contracts enable row level security;

drop policy if exists "Gestores acesso total a project_contracts" on public.project_contracts;
create policy "Gestores acesso total a project_contracts" on public.project_contracts
  for all using (public.is_gestor(auth.uid()));

drop policy if exists "Freelancer ve contratos proprios" on public.project_contracts;
create policy "Freelancer ve contratos proprios" on public.project_contracts
  for select using (freelancer_id = auth.uid());

-- Ensure drop before create to avoid "policy already exists" errors
drop policy if exists "Freelancer insere contrato propio" on public.project_contracts;
create policy "Freelancer insere contrato propio" on public.project_contracts
  for insert with check (freelancer_id = auth.uid());

-- Tabela de informações contratuais do Freelancer
create table if not exists public.freelancers (
  id uuid references public.profiles(id) on delete cascade primary key,
  contract_field_values jsonb not null default '{}'::jsonb,
  contract_fields_status text check (contract_fields_status in ('pendente', 'completo')) default 'pendente',
  documents_status text check (documents_status in ('pendente', 'em_analise', 'aprovado', 'rejeitado')) default 'pendente',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.freelancers enable row level security;

drop policy if exists "Gestores acesso total a freelancers" on public.freelancers;
create policy "Gestores acesso total a freelancers" on public.freelancers
  for all using (public.is_gestor(auth.uid()));

drop policy if exists "Freelancer ve e atualiza proprio cadastro" on public.freelancers;
create policy "Freelancer ve e atualiza proprio cadastro" on public.freelancers
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Tabela de documentos do Freelancer
create table if not exists public.freelancer_documents (
  id uuid default gen_random_uuid() primary key,
  freelancer_id uuid references public.profiles(id) on delete cascade not null,
  document_type text check (document_type in ('documento_identidade_1', 'documento_identidade_2', 'rg_frente', 'rg_verso', 'cnh', 'comprovante_residencia', 'situacao_cadastral_cpf', 'certidao_antecedentes_criminais')) not null,
  file_path text not null,
  status text check (status in ('pendente', 'aprovado', 'rejeitado')) default 'pendente',
  review_notes text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone,
  reviewed_by uuid references public.profiles(id),
  constraint freelancer_documents_freelancer_type_unique unique (freelancer_id, document_type)
);

alter table public.freelancer_documents enable row level security;

-- 7. Função Helper Security Definer para Evitar Recursão em RLS
drop function if exists public.is_gestor(uuid) cascade;

create or replace function public.is_gestor(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and lower(role) in ('gestor', 'admin', 'manager', 'administrator')
  );
$$;

drop policy if exists "Gestores acesso total a freelancers" on public.freelancers;
create policy "Gestores acesso total a freelancers" on public.freelancers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Leitura autenticada de freelancers" on public.freelancers;
create policy "Leitura autenticada de freelancers" on public.freelancers
  for select using (auth.role() = 'authenticated');

drop policy if exists "Gestores acesso total a freelancer_documents" on public.freelancer_documents;
create policy "Gestores acesso total a freelancer_documents" on public.freelancer_documents
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Leitura de freelancer_documents" on public.freelancer_documents;
create policy "Leitura de freelancer_documents" on public.freelancer_documents
  for select using (auth.role() = 'authenticated');

drop policy if exists "Freelancer ve e insere proprios documentos" on public.freelancer_documents;
create policy "Freelancer ve e insere proprios documentos" on public.freelancer_documents
  for all using (freelancer_id = auth.uid()) with check (freelancer_id = auth.uid());

-- Storage Bucket para freelancer-documents
insert into storage.buckets (id, name, public)
values ('freelancer-documents', 'freelancer-documents', true)
on conflict (id) do nothing;

drop policy if exists "Uploads permitidos para freelancer-documents" on storage.objects;
create policy "Uploads permitidos para freelancer-documents" on storage.objects
  for insert with check (bucket_id = 'freelancer-documents' and auth.role() = 'authenticated');

drop policy if exists "Leitura publica de freelancer-documents" on storage.objects;
create policy "Leitura publica de freelancer-documents" on storage.objects
  for select using (bucket_id = 'freelancer-documents');

-- Tabela de Documentos do Cliente
create table if not exists public.client_documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  document_type text not null check (document_type in ('contrato_assinado', 'comprovante_pagamento', 'cartao_cnpj', 'outro')),
  file_path text not null,
  file_url text,
  status text check (status in ('pendente', 'aprovado', 'rejeitado')) default 'pendente',
  review_notes text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.client_documents enable row level security;

drop policy if exists "Clientes acessam proprios documentos" on public.client_documents;
create policy "Clientes acessam proprios documentos" on public.client_documents
  for all using (client_id = auth.uid());

drop policy if exists "Gestores acesso total a client_documents" on public.client_documents;
create policy "Gestores acesso total a client_documents" on public.client_documents
  for all using (public.is_gestor(auth.uid()));

-- Storage Bucket client-documents
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', true)
on conflict (id) do update set public = true;

drop policy if exists "Clientes Upload Documents" on storage.objects;
create policy "Clientes Upload Documents" on storage.objects 
  for insert with check (bucket_id = 'client-documents');

drop policy if exists "Clientes Read Documents" on storage.objects;
create policy "Clientes Read Documents" on storage.objects 
  for select using (bucket_id = 'client-documents');

-- Tabela singleton de dados da empresa usados nos contratos
create table if not exists public.company_settings (
  id integer primary key default 1 check (id = 1),
  razao_social text,
  cnpj text,
  nome_representante text,
  cargo_representante text,
  email_contratante text,
  telefone_contratante text,
  endereco text,
  cidade_padrao_assinatura text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.company_settings enable row level security;

insert into public.company_settings (
  id,
  razao_social,
  cnpj,
  nome_representante,
  cargo_representante,
  email_contratante,
  telefone_contratante,
  endereco,
  cidade_padrao_assinatura
)
values (
  1,
  'Delski Serviços de Tecnologia Ltda',
  '45.892.123/0001-90',
  'Diretoria Delski',
  'Diretoria',
  'contato@delski.com.br',
  '(41) 99876-5432',
  'Av. Cândido de Abreu, 526 - Centro Cívico, Curitiba - PR',
  'Curitiba'
)
on conflict (id) do nothing;

drop policy if exists "Gestores acesso total a company_settings" on public.company_settings;
create policy "Gestores acesso total a company_settings" on public.company_settings
  for all using (public.is_gestor(auth.uid())) with check (public.is_gestor(auth.uid()));

-- Tabela de artigos da Wiki / SOPs
create table if not exists public.wiki_articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null check (category in ('Geral', 'IA', 'Trafego', 'Sites')) default 'Geral',
  content text not null,
  audience text not null default 'todos' check (audience in ('todos', 'freelancers', 'clientes', 'gestor')),
  attachment_url text,
  attachment_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.wiki_articles enable row level security;

drop policy if exists "Gestor acesso total a wiki_articles" on public.wiki_articles;
create policy "Gestor acesso total a wiki_articles" on public.wiki_articles
  for all using (public.is_gestor(auth.uid())) with check (public.is_gestor(auth.uid()));

drop policy if exists "Freelancers e clientes leem wiki_articles visíveis" on public.wiki_articles;
create policy "Freelancers e clientes leem wiki_articles visíveis" on public.wiki_articles
  for select using (
    auth.role() = 'authenticated' and (
      public.is_gestor(auth.uid())
      or audience = 'todos'
      or (public.is_freelancer(auth.uid()) and audience = 'freelancers')
      or (public.is_cliente(auth.uid()) and audience = 'clientes')
    )
  );

-- Tabela de Notificações
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'sistema' check (type in ('manual', 'sistema', 'alerta')),
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id) on delete set null
);

-- ==========================================================
-- Tabela de Chamados / Suporte (support_tickets)
-- ==========================================================
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  client_name text,
  client_email text,
  category text,
  subject text not null,
  message text not null,
  status text check (status in ('Aberto','Em Andamento','Resolvido','Fechado')) default 'Aberto',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

alter table public.support_tickets enable row level security;

drop policy if exists "Usuarios podem ver seus propios chamados" on public.support_tickets;
create policy "Usuários podem ver seus próprios chamados" on public.support_tickets
  for select using (
    auth.role() = 'authenticated' and (
      client_id = auth.uid()
      or user_id = auth.uid()
      or lower(client_email) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "Gestores podem ver todos os chamados" on public.support_tickets;
create policy "Gestores podem ver todos os chamados" on public.support_tickets
  for select using (public.is_gestor(auth.uid()));

drop policy if exists "Clientes inserem chamados" on public.support_tickets;
create policy "Clientes inserem chamados" on public.support_tickets
  for insert with check (
    auth.role() = 'authenticated' and (
      client_id = auth.uid() or user_id = auth.uid() or created_by = auth.uid()
    )
  );

drop policy if exists "Gestores atualizam chamados" on public.support_tickets;
create policy "Gestores atualizam chamados" on public.support_tickets
  for update using (public.is_gestor(auth.uid())) with check (public.is_gestor(auth.uid()));

-- Trigger: notify managers when a new ticket is created
drop function if exists public.notify_managers_new_ticket;
create or replace function public.notify_managers_new_ticket()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Insert a notification for each gestor/admin
  insert into public.notifications (user_id, title, message, type, created_at, created_by)
  select p.id,
    'Novo chamado de suporte',
    'Novo chamado: ' || coalesce(new.subject, '<sem assunto>') || ' — ' || substring(new.message for 160),
    'sistema', timezone('utc', now()), new.created_by
  from public.profiles p
  where lower(p.role) in ('gestor', 'admin');

  return new;
end;
$$;

drop trigger if exists trg_notify_managers_on_ticket on public.support_tickets;
create trigger trg_notify_managers_on_ticket
  after insert on public.support_tickets
  for each row execute function public.notify_managers_new_ticket();
-- Ensure notifications has expected columns before creating policies
alter table public.notifications add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.notifications add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.notifications enable row level security;

drop policy if exists "Acesso autenticado a notifications" on public.notifications;
create policy "Acesso autenticado a notifications" on public.notifications
  for select using (auth.role() = 'authenticated' and (user_id = auth.uid() or public.is_gestor(auth.uid())));

create policy "Gestores enviam notificar usuarios" on public.notifications
  for insert with check (
    auth.role() = 'authenticated' and (
      public.is_gestor(auth.uid()) or user_id = auth.uid()
    )
  );

create policy "Gestores atualizam notifications" on public.notifications
  for update using (auth.role() = 'authenticated' and (user_id = auth.uid() or public.is_gestor(auth.uid())));

create policy "Gestores removem notifications" on public.notifications
  for delete using (auth.role() = 'authenticated' and public.is_gestor(auth.uid()));

