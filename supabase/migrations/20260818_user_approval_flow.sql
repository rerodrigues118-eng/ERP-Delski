-- ==========================================================
-- FLUXO DE APROVAÇÃO DE NOVOS USUÁRIOS (APPROVAL STATUS)
-- ==========================================================

-- 1. Adiciona a coluna approval_status na tabela profiles
alter table public.profiles
  add column if not exists approval_status text check (approval_status in ('pending', 'approved', 'rejected')) default 'pending';

-- 2. Retrocompatibilidade: Define approval_status = 'approved' para todos os gestores e usuários já existentes
update public.profiles
set approval_status = 'approved'
where approval_status is null or approval_status = 'pending';

-- 3. Índices para performance em consultas de aprovações
create index if not exists idx_profiles_approval_status on public.profiles(approval_status);
create index if not exists idx_profiles_role_approval on public.profiles(role, approval_status);

-- 4. RLS: Garantir que gestores e admins possam ler e atualizar o status de aprovação de qualquer perfil
drop policy if exists "Gestores e Admins podem atualizar status de aprovação" on public.profiles;
create policy "Gestores e Admins podem atualizar status de aprovação"
  on public.profiles
  for update
  using (
    (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin')
  )
  with check (
    (select role from public.profiles where id = auth.uid()) in ('gestor', 'admin')
  );

drop policy if exists "Gestores e Admins podem visualizar todos os perfis" on public.profiles;
create policy "Gestores e Admins podem visualizar todos os perfis"
  on public.profiles
  for select
  using (
    auth.role() = 'authenticated'
  );
