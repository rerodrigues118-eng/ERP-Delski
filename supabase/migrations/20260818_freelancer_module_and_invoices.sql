-- ==========================================================
-- MIGRATION: FREELANCER MODULE, INVOICES & STORAGE
-- ==========================================================

-- 1. Garantir colunas cadastrais e financeiras na tabela freelancers
alter table public.freelancers
  add column if not exists company_name text,
  add column if not exists corporate_name text,
  add column if not exists cnpj text,
  add column if not exists segment text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists cep text,
  add column if not exists role_position text,
  add column if not exists phone text,
  add column if not exists instagram text,
  add column if not exists linkedin text,
  add column if not exists website text,
  add column if not exists bank_name text,
  add column if not exists bank_agency text,
  add column if not exists bank_account text,
  add column if not exists pix_key text,
  add column if not exists pix_type text default 'CNPJ',
  add column if not exists contract_model text default 'Mensal',
  add column if not exists contract_value numeric(10,2) default 0.00,
  add column if not exists payment_date date,
  add column if not exists due_date date,
  add column if not exists financial_status text default 'Pendente' check (financial_status in ('Pendente', 'Pago', 'Atrasado')),
  add column if not exists payment_receipts jsonb default '[]'::jsonb,
  add column if not exists onboarding_completed boolean not null default false;

-- 2. Tabela de Gestão de Notas Fiscais de Prestadores (freelancer_invoices)
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

-- 3. Garantir estrutura e tipos na tabela freelancer_documents
create table if not exists public.freelancer_documents (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid references public.profiles(id) on delete cascade not null,
  document_type text not null,
  file_path text not null,
  file_url text,
  status text check (status in ('pendente', 'em_analise', 'aprovado', 'rejeitado')) default 'pendente',
  review_notes text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone,
  reviewed_by uuid references public.profiles(id) on delete set null
);

-- 4. Criar Buckets no Supabase Storage se não existirem
insert into storage.buckets (id, name, public)
values ('freelancer-docs', 'freelancer-docs', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('freelancer-invoices', 'freelancer-invoices', true)
on conflict (id) do nothing;

-- 5. Configuração de RLS
alter table public.freelancers enable row level security;
alter table public.freelancer_invoices enable row level security;
alter table public.freelancer_documents enable row level security;

-- Políticas freelancers
drop policy if exists "Freelancers can view and edit their own row" on public.freelancers;
create policy "Freelancers can view and edit their own row"
  on public.freelancers
  for all
  using (auth.uid() = id or (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin'))
  with check (auth.uid() = id or (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin'));

-- Políticas freelancer_invoices
drop policy if exists "Freelancers and Gestores access freelancer_invoices" on public.freelancer_invoices;
create policy "Freelancers and Gestores access freelancer_invoices"
  on public.freelancer_invoices
  for all
  using (
    auth.uid() = freelancer_id or
    (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin')
  )
  with check (
    auth.uid() = freelancer_id or
    (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin')
  );

-- Políticas freelancer_documents
drop policy if exists "Freelancers and Gestores access freelancer_documents" on public.freelancer_documents;
create policy "Freelancers and Gestores access freelancer_documents"
  on public.freelancer_documents
  for all
  using (
    auth.uid() = freelancer_id or
    (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin')
  )
  with check (
    auth.uid() = freelancer_id or
    (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin')
  );

-- Políticas Storage para freelancer-docs e freelancer-invoices
drop policy if exists "Freelancer Docs Public Read" on storage.objects;
create policy "Freelancer Docs Public Read"
  on storage.objects for select
  using (bucket_id in ('freelancer-docs', 'freelancer-invoices'));

drop policy if exists "Freelancer Docs Upload Access" on storage.objects;
create policy "Freelancer Docs Upload Access"
  on storage.objects for insert
  with check (bucket_id in ('freelancer-docs', 'freelancer-invoices'));

drop policy if exists "Freelancer Docs Update/Delete Access" on storage.objects;
create policy "Freelancer Docs Update/Delete Access"
  on storage.objects for all
  using (bucket_id in ('freelancer-docs', 'freelancer-invoices'));
