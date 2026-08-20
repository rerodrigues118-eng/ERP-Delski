-- ==============================================================================
-- DELSKI CLOUD — SCRIPT SQL DE HARDENING DE SEGURANÇA, RLS & RBAC
-- 
-- Execute este script no SQL Editor do Dashboard do Supabase (https://supabase.com).
-- Este script aplica Row Level Security (RLS) estrito com isolamento RBAC
-- para impedir qualquer ataque de IDOR entre Gestores, Freelancers e Clientes.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNÇÕES AUXILIARES DE VERIFICAÇÃO DE PAPEL (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- Função para obter o papel (role) do usuário autenticado atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'freelancer')
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Função rápida para checar se o usuário atual é Gestor ou Admin
CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('gestor', 'admin')
      AND status = 'ativo'
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS DO SISTEMA
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_freelancers') THEN
    ALTER TABLE public.project_freelancers ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_tasks') THEN
    ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'freelancer_invoices') THEN
    ALTER TABLE public.freelancer_invoices ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_expenses') THEN
    ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'emitted_service_invoices') THEN
    ALTER TABLE public.emitted_service_invoices ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
    ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS DE RLS — TABELA: PROFILES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_write" ON public.profiles;

-- Gestor visualiza todos; Freelancer e Cliente visualizam a si mesmos
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_gestor() 
    OR id = auth.uid()
  );

-- Usuário autenticado atualiza seu próprio perfil; Gestor pode atualizar qualquer um
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_gestor() 
    OR id = auth.uid()
  )
  WITH CHECK (
    public.is_gestor() 
    OR id = auth.uid()
  );

-- Inserção permitida para o próprio usuário autenticado ou Gestor
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_gestor() 
    OR id = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS DE RLS — TABELA: FREELANCERS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "freelancers_select_policy" ON public.freelancers;
DROP POLICY IF EXISTS "freelancers_update_policy" ON public.freelancers;
DROP POLICY IF EXISTS "freelancers_insert_policy" ON public.freelancers;
DROP POLICY IF EXISTS "freelancers_delete_policy" ON public.freelancers;
DROP POLICY IF EXISTS "freelancers_all_access" ON public.freelancers;

CREATE POLICY "freelancers_select_policy" ON public.freelancers
  FOR SELECT
  TO authenticated
  USING (
    public.is_gestor()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
  );

CREATE POLICY "freelancers_update_policy" ON public.freelancers
  FOR UPDATE
  TO authenticated
  USING (
    public.is_gestor()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
  )
  WITH CHECK (
    public.is_gestor()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
  );

CREATE POLICY "freelancers_insert_policy" ON public.freelancers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_gestor()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
  );

CREATE POLICY "freelancers_delete_policy" ON public.freelancers
  FOR DELETE
  TO authenticated
  USING (public.is_gestor());

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS DE RLS — TABELA: CLIENTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

CREATE POLICY "clients_select_policy" ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.is_gestor()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
  );

CREATE POLICY "clients_update_policy" ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    public.is_gestor()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
  )
  WITH CHECK (
    public.is_gestor()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
  );

CREATE POLICY "clients_insert_policy" ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_gestor()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
  );

CREATE POLICY "clients_delete_policy" ON public.clients
  FOR DELETE
  TO authenticated
  USING (public.is_gestor());

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS DE RLS — TABELA: PROJECTS (ISOLAMENTO DE PROJETOS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_modify_policy" ON public.projects;
DROP POLICY IF EXISTS "Gestores possuem controle total sobre projects" ON public.projects;
DROP POLICY IF EXISTS "Freelancers podem visualizar apenas projetos atribuidos" ON public.projects;
DROP POLICY IF EXISTS "Clientes podem visualizar apenas seus proprios projetos" ON public.projects;

CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_gestor()
    OR client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = projects.client_id
        AND (clients.auth_user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.project_freelancers
      WHERE project_freelancers.project_id = projects.id
        AND project_freelancers.freelancer_id = auth.uid()
    )
  );

CREATE POLICY "projects_modify_policy" ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_gestor())
  WITH CHECK (public.is_gestor());

-- ------------------------------------------------------------------------------
-- 7. POLÍTICAS DE RLS — TABELA: PROJECT_FREELANCERS & PROJECT_TASKS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_freelancers') THEN
    DROP POLICY IF EXISTS "project_freelancers_select_policy" ON public.project_freelancers;
    DROP POLICY IF EXISTS "project_freelancers_all_policy" ON public.project_freelancers;
    
    CREATE POLICY "project_freelancers_select_policy" ON public.project_freelancers
      FOR SELECT TO authenticated
      USING (public.is_gestor() OR freelancer_id = auth.uid());

    CREATE POLICY "project_freelancers_all_policy" ON public.project_freelancers
      FOR ALL TO authenticated
      USING (public.is_gestor())
      WITH CHECK (public.is_gestor());
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. POLÍTICAS DE RLS — TABELA: FREELANCER_DOCUMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.freelancer_documents ADD COLUMN IF NOT EXISTS file_url text;

DROP POLICY IF EXISTS "freelancer_documents_select_policy" ON public.freelancer_documents;
DROP POLICY IF EXISTS "freelancer_documents_modify_policy" ON public.freelancer_documents;
DROP POLICY IF EXISTS "freelancer_documents_all_access" ON public.freelancer_documents;

CREATE POLICY "freelancer_documents_select_policy" ON public.freelancer_documents
  FOR SELECT
  TO authenticated
  USING (
    public.is_gestor()
    OR freelancer_id = auth.uid()
  );

CREATE POLICY "freelancer_documents_modify_policy" ON public.freelancer_documents
  FOR ALL
  TO authenticated
  USING (
    public.is_gestor()
    OR freelancer_id = auth.uid()
  )
  WITH CHECK (
    public.is_gestor()
    OR freelancer_id = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- 9. POLÍTICAS DE RLS — TABELA: NOTIFICATIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_modify_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_all_access" ON public.notifications;

CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    public.is_gestor()
    OR user_id = auth.uid()
  );

CREATE POLICY "notifications_modify_policy" ON public.notifications
  FOR ALL
  TO authenticated
  USING (
    public.is_gestor()
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.is_gestor()
    OR user_id = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- 10. RECARREGAR SCHEMA CACHE DO POSTGREST
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
