-- ==========================================================
-- MIGRATION: EMITTED SERVICE INVOICES (NFS-e) & FISCAL AUTOMATION
-- ==========================================================

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

-- Índices de consulta rápida
create index if not exists idx_emitted_invoices_client on public.emitted_service_invoices(client_id);
create index if not exists idx_emitted_invoices_status on public.emitted_service_invoices(status);
create index if not exists idx_emitted_invoices_created on public.emitted_service_invoices(created_at desc);

-- RLS
alter table public.emitted_service_invoices enable row level security;

drop policy if exists "Gestores have full access to emitted_service_invoices" on public.emitted_service_invoices;
create policy "Gestores have full access to emitted_service_invoices"
  on public.emitted_service_invoices
  for all
  using (
    (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin')
  )
  with check (
    (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin')
  );

drop policy if exists "Clients can view their own emitted_service_invoices" on public.emitted_service_invoices;
create policy "Clients can view their own emitted_service_invoices"
  on public.emitted_service_invoices
  for select
  using (
    client_id in (
      select id from public.clients where auth_user_id = auth.uid()
    )
  );
