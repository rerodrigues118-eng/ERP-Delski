-- ============================================================================
-- Migração: Ajustes em Company Settings, Tasks (Descrição + Anexos), Setup Fee e Vendas
-- Data: 22/08/2026
-- ============================================================================

-- 1. Colunas adicionais para company_settings (Padrões do Sistema)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'company_settings' and column_name = 'banco_padrao') then
    alter table public.company_settings add column banco_padrao text default 'Banco Inter (077)';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'company_settings' and column_name = 'tipo_chave_pix_padrao') then
    alter table public.company_settings add column tipo_chave_pix_padrao text default 'CNPJ';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'company_settings' and column_name = 'chave_pix_padrao') then
    alter table public.company_settings add column chave_pix_padrao text default '45.892.123/0001-90';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'company_settings' and column_name = 'multa_rescisoria_padrao_percentual') then
    alter table public.company_settings add column multa_rescisoria_padrao_percentual numeric default 10;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'company_settings' and column_name = 'juros_mora_padrao_percentual') then
    alter table public.company_settings add column juros_mora_padrao_percentual numeric default 1;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'company_settings' and column_name = 'foro_padrao') then
    alter table public.company_settings add column foro_padrao text default 'Comarca de Curitiba - PR';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'company_settings' and column_name = 'data_pagamento_padrao') then
    alter table public.company_settings add column data_pagamento_padrao text default 'Dia 10 de cada mês';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'company_settings' and column_name = 'metodo_pagamento_padrao') then
    alter table public.company_settings add column metodo_pagamento_padrao text default 'PIX';
  end if;
end $$;

-- 2. Colunas de Descrição e Anexos para project_tasks
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'project_tasks' and column_name = 'description') then
    alter table public.project_tasks add column description text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'project_tasks' and column_name = 'attachments') then
    alter table public.project_tasks add column attachments jsonb default '[]'::jsonb;
  end if;
end $$;

-- 3. Coluna setup_fee para projects
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'setup_fee') then
    alter table public.projects add column setup_fee numeric default 0;
  end if;
end $$;

-- 4. Coluna project_id para sales
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'sales') then
    if not exists (select 1 from information_schema.columns where table_name = 'sales' and column_name = 'project_id') then
      alter table public.sales add column project_id uuid references public.projects(id) on delete set null;
    end if;
  end if;
end $$;
