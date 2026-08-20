-- =========================================================================
-- SCRIPT SQL: SUPABASE PORTAL DO CLIENTE (SAC, TICKET REPLIES & PROJETOS)
-- =========================================================================

-- 1. Buckets de Storage (Públicos)
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('project-attachments', 'project-attachments', true)
on conflict (id) do update set public = true;

-- Políticas de Storage para client-documents e project-attachments
drop policy if exists "client_docs_storage_all" on storage.objects;
create policy "client_docs_storage_all" on storage.objects
  for all using (bucket_id in ('client-documents', 'project-attachments'))
  with check (bucket_id in ('client-documents', 'project-attachments'));

-- 2. Tabela de Documentos do Cliente e Projetos
create table if not exists public.client_documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  document_type text not null,
  file_path text not null,
  file_url text,
  status text check (status in ('pendente', 'em_analise', 'aprovado', 'rejeitado')) default 'aprovado',
  review_notes text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.client_documents enable row level security;

drop policy if exists "client_documents_policy" on public.client_documents;
create policy "client_documents_policy" on public.client_documents
  for all using (true) with check (true);

-- 3. Tabela de Chamados / SAC (support_tickets)
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
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

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_policy" on public.support_tickets;
create policy "support_tickets_policy" on public.support_tickets
  for all using (true) with check (true);

-- 4. Tabela de Histórico e Respostas de Chamados (ticket_replies)
create table if not exists public.ticket_replies (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender_name text not null,
  sender_role text check (sender_role in ('gestor', 'cliente', 'admin')) not null default 'cliente',
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ticket_replies enable row level security;

drop policy if exists "ticket_replies_policy" on public.ticket_replies;
create policy "ticket_replies_policy" on public.ticket_replies
  for all using (true) with check (true);
