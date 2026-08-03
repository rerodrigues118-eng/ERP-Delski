-- migration: company_settings + notifications
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

alter table public.notifications
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('manual', 'sistema', 'alerta'));

alter table public.notifications alter column type set default 'sistema';

-- preserve existing broad auth policy but tighten it to the intended user scope

drop policy if exists "Acesso autenticado a notifications" on public.notifications;
drop policy if exists "Gestores enviam notificar usuarios" on public.notifications;
drop policy if exists "Gestores atualizam notifications" on public.notifications;
drop policy if exists "Gestores removem notifications" on public.notifications;

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
