-- ==========================================================
-- MIGRATION: CLIENT ONBOARDING, PORTAL DO CLIENTE & RLS
-- ==========================================================

-- 1. Coluna onboarding_completed na tabela profiles
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- 2. Colunas cadastrais e financeiras na tabela clients
alter table public.clients
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists corporate_name text,
  add column if not exists cnpj text,
  add column if not exists segment text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists cep text,
  add column if not exists contact_name text,
  add column if not exists role_position text,
  add column if not exists instagram text,
  add column if not exists linkedin text,
  add column if not exists website text,
  add column if not exists contract_model text default 'Mensal',
  add column if not exists contract_value numeric(10,2) default 0.00,
  add column if not exists setup_value numeric(10,2) default 0.00,
  add column if not exists contract_duration text,
  add column if not exists payment_date date,
  add column if not exists due_date date,
  add column if not exists financial_status text default 'Pendente' check (financial_status in ('Pendente', 'Pago', 'Atrasado')),
  add column if not exists invoices jsonb default '[]'::jsonb,
  add column if not exists payment_receipts jsonb default '[]'::jsonb;

-- 3. Tabela de Documentos do Cliente (client_documents)
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

-- 4. Tabela de Ocorrências e Chamados (support_tickets)
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

-- 5. Tabela de Respostas de Chamados (ticket_replies)
create table if not exists public.ticket_replies (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender_name text not null,
  sender_role text check (sender_role in ('gestor', 'cliente', 'admin')) not null default 'gestor',
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Habilitar RLS em todas as tabelas
alter table public.client_documents enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_replies enable row level security;

-- Policies para client_documents
drop policy if exists "client_documents_leitura" on public.client_documents;
create policy "client_documents_leitura" on public.client_documents
  for select using (
    public.is_gestor(auth.uid()) or
    client_id in (select id from public.clients where auth_user_id = auth.uid() or id = auth.uid()) or
    auth.role() = 'anon'
  );

drop policy if exists "client_documents_escrita" on public.client_documents;
create policy "client_documents_escrita" on public.client_documents
  for all using (
    public.is_gestor(auth.uid()) or
    client_id in (select id from public.clients where auth_user_id = auth.uid() or id = auth.uid()) or
    auth.role() = 'anon'
  );

-- Policies para support_tickets
drop policy if exists "support_tickets_leitura" on public.support_tickets;
create policy "support_tickets_leitura" on public.support_tickets
  for select using (
    public.is_gestor(auth.uid()) or
    client_id in (select id from public.clients where auth_user_id = auth.uid() or id = auth.uid()) or
    created_by = auth.uid() or
    auth.role() = 'anon'
  );

drop policy if exists "support_tickets_escrita" on public.support_tickets;
create policy "support_tickets_escrita" on public.support_tickets
  for all using (
    public.is_gestor(auth.uid()) or
    client_id in (select id from public.clients where auth_user_id = auth.uid() or id = auth.uid()) or
    created_by = auth.uid() or
    auth.role() = 'anon'
  );

-- Policies para ticket_replies
drop policy if exists "ticket_replies_leitura" on public.ticket_replies;
create policy "ticket_replies_leitura" on public.ticket_replies
  for select using (true);

drop policy if exists "ticket_replies_escrita" on public.ticket_replies;
create policy "ticket_replies_escrita" on public.ticket_replies
  for all using (
    public.is_gestor(auth.uid()) or
    auth.role() = 'authenticated' or
    auth.role() = 'anon'
  );

-- Configuração do Storage Bucket para Documentos do Cliente (se não existir)
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', true)
on conflict (id) do update set public = true;

-- Storage Policy para Leitura e Escrita
drop policy if exists "client_documents_storage_select" on storage.objects;
create policy "client_documents_storage_select" on storage.objects
  for select using (bucket_id = 'client-documents');

drop policy if exists "client_documents_storage_insert" on storage.objects;
create policy "client_documents_storage_insert" on storage.objects
  for insert with check (bucket_id = 'client-documents');

drop policy if exists "client_documents_storage_update" on storage.objects;
create policy "client_documents_storage_update" on storage.objects
  for update using (bucket_id = 'client-documents');
