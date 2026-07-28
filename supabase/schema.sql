-- ==========================================================
-- ESTRUTURA DE BANCO DE DADOS - DELSKI ERP (SUPABASE SQL)
-- ==========================================================

-- 1. Tabela de Perfis de Usuários (Gestor, Freelancer, Cliente)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text unique not null,
  role text check (role in ('gestor', 'freelancer', 'cliente')) not null default 'freelancer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Projetos
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  client_id uuid references public.profiles(id),
  service_type text check (service_type in ('IA', 'Trafego', 'Sites')) not null,
  status text check (status in ('Solicitado', 'Delegado', 'Em Producao', 'Em Revisao', 'Concluido')) default 'Solicitado',
  budget numeric(10,2) default 0.00,
  freelancer_cost numeric(10,2) default 0.00,
  deadline date,
  briefing_content text,
  google_drive_link text,
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
  status text check (status in ('Pendente', 'Em Andamento', 'Concluida')) default 'Pendente',
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
  status text check (status in ('Rascunho', 'Enviado', 'Aprovado', 'Rejeitado')) default 'Rascunho',
  score integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================================
-- SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- ==========================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_freelancers enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_triage enable row level security;

-- Políticas para Profiles
drop policy if exists "Gestores acesso total a profiles" on public.profiles;
create policy "Gestores acesso total a profiles" on public.profiles for all using (
  auth.uid() in (select id from public.profiles where role = 'gestor')
);

drop policy if exists "Usuarios leem proprio perfil" on public.profiles;
create policy "Usuarios leem proprio perfil" on public.profiles for select using (auth.uid() = id);

-- Políticas para Projects
drop policy if exists "Gestores acesso total a projects" on public.projects;
create policy "Gestores acesso total a projects" on public.projects for all using (
  auth.uid() in (select id from public.profiles where role = 'gestor')
);

drop policy if exists "Clientes veem apenas seus projetos" on public.projects;
create policy "Clientes veem apenas seus projetos" on public.projects for select using (client_id = auth.uid());

drop policy if exists "Freelancers veem projetos atribuídos" on public.projects;
create policy "Freelancers veem projetos atribuídos" on public.projects for select using (
  id in (select project_id from public.project_freelancers where freelancer_id = auth.uid())
);

-- Políticas para Project Tasks
drop policy if exists "Gestores acesso total a tasks" on public.project_tasks;
create policy "Gestores acesso total a tasks" on public.project_tasks for all using (
  auth.uid() in (select id from public.profiles where role = 'gestor')
);

drop policy if exists "Usuarios vinculados veem tarefas" on public.project_tasks;
create policy "Usuarios vinculados veem tarefas" on public.project_tasks for select using (
  project_id in (
    select id from public.projects where client_id = auth.uid()
    union
    select project_id from public.project_freelancers where freelancer_id = auth.uid()
  )
);

-- ==========================================================
-- STORAGE BUCKET PARA ANEXOS DE PROJETOS
-- ==========================================================
insert into storage.buckets (id, name, public)
values ('project-attachments', 'project-attachments', true)
on conflict (id) do nothing;

create policy "Uploads permitidos para usuarios autenticados" on storage.objects
  for insert with check (bucket_id = 'project-attachments' and auth.role() = 'authenticated');

create policy "Leitura publica de anexos" on storage.objects
  for select using (bucket_id = 'project-attachments');
