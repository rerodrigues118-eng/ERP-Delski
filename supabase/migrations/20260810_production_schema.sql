-- ==========================================================
-- MIGRATION PRODUCTION SCHEMA (POLÍTICAS RLS ATUALIZADAS)
-- ==========================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.contract_models enable row level security;
alter table public.financial_records enable row level security;

drop policy if exists "Perfis leitura publica" on public.profiles;
create policy "Perfis leitura publica" on public.profiles for select using (true);

drop policy if exists "Projetos leitura publica" on public.projects;
create policy "Projetos leitura publica" on public.projects for select using (true);

drop policy if exists "Modelos contrato leitura publica" on public.contract_models;
create policy "Modelos contrato leitura publica" on public.contract_models for select using (true);

drop policy if exists "Financeiro leitura publica" on public.financial_records;
create policy "Financeiro leitura publica" on public.financial_records for select using (true);
