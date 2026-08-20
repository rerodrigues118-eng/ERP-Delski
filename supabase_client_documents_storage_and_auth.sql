-- =========================================================================
-- SCRIPT SQL: BUCKET CLIENT-DOCUMENTS, POLICIES & AUTO-CONFIRMAÇÃO DE EMAIL
-- =========================================================================

-- 1. Criação do Bucket de Documentos do Cliente (Público)
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', true)
on conflict (id) do update set public = true;

-- 2. Políticas de Leitura e Escrita no Storage
drop policy if exists "client_documents_storage_select" on storage.objects;
create policy "client_documents_storage_select" on storage.objects
  for select using (bucket_id = 'client-documents');

drop policy if exists "client_documents_storage_insert" on storage.objects;
create policy "client_documents_storage_insert" on storage.objects
  for insert with check (bucket_id = 'client-documents');

drop policy if exists "client_documents_storage_update" on storage.objects;
create policy "client_documents_storage_update" on storage.objects
  for update using (bucket_id = 'client-documents');

drop policy if exists "client_documents_storage_delete" on storage.objects;
create policy "client_documents_storage_delete" on storage.objects
  for delete using (bucket_id = 'client-documents');

-- 3. Tabela public.client_documents
create table if not exists public.client_documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  document_type text not null,
  file_path text not null,
  file_url text,
  status text check (status in ('pendente', 'em_analise', 'aprovado', 'rejeitado')) default 'em_analise',
  review_notes text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.client_documents enable row level security;

drop policy if exists "client_documents_all" on public.client_documents;
create policy "client_documents_all" on public.client_documents
  for all using (true) with check (true);

-- 4. Auto-confirmação de novos e-mails cadastrados (elimina erro "Email not confirmed")
create or replace function public.handle_auto_confirm_user_email()
returns trigger as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row execute function public.handle_auto_confirm_user_email();

-- Atualizar usuários já existentes que estejam com e-mail não confirmado
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
