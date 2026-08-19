-- ==============================================================================
-- DELSKI CLOUD — SCRIPT SQL: ROW LEVEL SECURITY (RLS) PARA FREELANCER
-- Execute este script no SQL Editor do seu Dashboard Supabase.
-- Garante o isolamento total de dados entre Gestores, Freelancers e Clientes.
-- ==============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY EM TODAS AS TABELAS SENSÍVEIS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_invoices ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. TABELA PUBLIC.PROJECTS (ISOLAMENTO DE PROJETOS)
-- Gestores: Acesso Total
-- Freelancers: Apenas leitura dos projetos aos quais estão alocados
-- Clientes: Apenas leitura dos seus próprios projetos

DROP POLICY IF EXISTS "Gestores possuem controle total sobre projects" ON public.projects;
CREATE POLICY "Gestores possuem controle total sobre projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Freelancers podem visualizar apenas projetos atribuidos" ON public.projects;
CREATE POLICY "Freelancers podem visualizar apenas projetos atribuidos"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_freelancers
      WHERE project_freelancers.project_id = projects.id
        AND project_freelancers.freelancer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clientes podem visualizar apenas seus proprios projetos" ON public.projects;
CREATE POLICY "Clientes podem visualizar apenas seus proprios projetos"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = projects.client_id
        AND (clients.auth_user_id = auth.uid() OR clients.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

-- ------------------------------------------------------------------------------
-- 3. TABELA PUBLIC.PROJECT_FREELANCERS (VÍNCULO DE PRESTADORES)
DROP POLICY IF EXISTS "Gestores possuem controle total sobre project_freelancers" ON public.project_freelancers;
CREATE POLICY "Gestores possuem controle total sobre project_freelancers"
  ON public.project_freelancers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Freelancers podem visualizar apenas suas proprias atribuicoes" ON public.project_freelancers;
CREATE POLICY "Freelancers podem visualizar apenas suas proprias atribuicoes"
  ON public.project_freelancers FOR SELECT
  TO authenticated
  USING (
    freelancer_id = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- 4. TABELA PUBLIC.PROJECT_TASKS (TAREFAS E ATIVIDADES)
DROP POLICY IF EXISTS "Gestores possuem controle total sobre project_tasks" ON public.project_tasks;
CREATE POLICY "Gestores possuem controle total sobre project_tasks"
  ON public.project_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Freelancers podem visualizar tarefas de seus projetos alocados" ON public.project_tasks;
CREATE POLICY "Freelancers podem visualizar tarefas de seus projetos alocados"
  ON public.project_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_freelancers
      WHERE project_freelancers.project_id = project_tasks.project_id
        AND project_freelancers.freelancer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Freelancers podem atualizar status de tarefas de seus projetos" ON public.project_tasks;
CREATE POLICY "Freelancers podem atualizar status de tarefas de seus projetos"
  ON public.project_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_freelancers
      WHERE project_freelancers.project_id = project_tasks.project_id
        AND project_freelancers.freelancer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_freelancers
      WHERE project_freelancers.project_id = project_tasks.project_id
        AND project_freelancers.freelancer_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 5. TABELA PUBLIC.FREELANCER_PAYOUTS (REPASSES E EXTRATOS)
DROP POLICY IF EXISTS "Gestores possuem controle total sobre freelancer_payouts" ON public.freelancer_payouts;
CREATE POLICY "Gestores possuem controle total sobre freelancer_payouts"
  ON public.freelancer_payouts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Freelancers podem visualizar apenas seus proprios repasses" ON public.freelancer_payouts;
CREATE POLICY "Freelancers podem visualizar apenas seus proprios repasses"
  ON public.freelancer_payouts FOR SELECT
  TO authenticated
  USING (
    freelancer_id = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- 6. TABELA PUBLIC.PROJECT_EXPENSES (DESPESAS DA AGÊNCIA - BLOQUEADO PARA FREELANCER)
DROP POLICY IF EXISTS "Apenas gestores possuem acesso as despesas da empresa" ON public.project_expenses;
CREATE POLICY "Apenas gestores possuem acesso as despesas da empresa"
  ON public.project_expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('gestor', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- 7. TABELA PUBLIC.FREELANCER_DOCUMENTS & INVOICES (DOCUMENTAÇÃO DO PRESTADOR)
DROP POLICY IF EXISTS "Gestores possuem acesso a documentos de freelancers" ON public.freelancer_documents;
CREATE POLICY "Gestores possuem acesso a documentos de freelancers"
  ON public.freelancer_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Freelancers podem gerenciar seus proprios documentos" ON public.freelancer_documents;
CREATE POLICY "Freelancers podem gerenciar seus proprios documentos"
  ON public.freelancer_documents FOR ALL
  TO authenticated
  USING (
    freelancer_id = auth.uid()
  )
  WITH CHECK (
    freelancer_id = auth.uid()
  );

DROP POLICY IF EXISTS "Gestores possuem acesso a notas fiscais de freelancers" ON public.freelancer_invoices;
CREATE POLICY "Gestores possuem acesso a notas fiscais de freelancers"
  ON public.freelancer_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Freelancers podem gerenciar suas proprias notas fiscais" ON public.freelancer_invoices;
CREATE POLICY "Freelancers podem gerenciar suas proprias notas fiscais"
  ON public.freelancer_invoices FOR ALL
  TO authenticated
  USING (
    freelancer_id = auth.uid()
  )
  WITH CHECK (
    freelancer_id = auth.uid()
  );
