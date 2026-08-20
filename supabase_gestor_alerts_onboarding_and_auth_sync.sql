-- ==============================================================================
-- DELSKI CLOUD — SCRIPT SQL CONSOLIDADO DE AUTENTICAÇÃO, ONBOARDING & ALERTAS
-- 
-- Execute este script no SQL Editor do Dashboard do Supabase (https://supabase.com).
-- Este script é 100% IDEMPOTENTE e SEGURO (não deleta registros vinculados a projetos).
-- Trata perfeitamente integridade referencial, e-mail único e sincronização de auth.users.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA DE PERFIS (PUBLIC.PROFILES) & EXTENSÃO DE STATUS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'freelancer' CHECK (role IN ('gestor', 'admin', 'freelancer', 'cliente')),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado', 'pendente')),
  approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir adição de colunas caso a tabela já exista
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'freelancer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 2. TABELA DE PRESTADORES / FREELANCERS (PUBLIC.FREELANCERS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelancers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,        -- Nome Fantasia
  corporate_name TEXT,      -- Razão Social / MEI
  cnpj TEXT,
  segment TEXT,
  cep TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  contact_name TEXT,        -- Nome do Responsável Legal
  role_position TEXT,       -- Cargo / Função
  phone TEXT,               -- WhatsApp
  instagram TEXT,
  linkedin TEXT,
  website TEXT,
  documents_status TEXT DEFAULT 'em_analise' CHECK (documents_status IN ('pendente', 'em_analise', 'aprovado', 'rejeitado')),
  onboarding_completed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado', 'convidado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas na tabela freelancers
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS corporate_name TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS segment TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS role_position TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS documents_status TEXT DEFAULT 'em_analise';
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

-- ------------------------------------------------------------------------------
-- 3. TABELA DE DOCUMENTOS DO FREELANCER (PUBLIC.FREELANCER_DOCUMENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelancer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL,
  document_type TEXT NOT NULL, 
  -- Tipos: 'antecedentes_criminais', 'situacao_cpf', 'situacao_cnpj', 'foto_rosto', 'contrato_prestacao', etc.
  file_path TEXT NOT NULL,
  file_url TEXT,
  status TEXT DEFAULT 'em_analise' CHECK (status IN ('em_analise', 'aprovado', 'rejeitado', 'pendente')),
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Constraint única para upsert automático (1 documento por tipo por prestador)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_freelancer_document_type'
  ) THEN
    ALTER TABLE public.freelancer_documents 
    ADD CONSTRAINT uq_freelancer_document_type UNIQUE (freelancer_id, document_type);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 4. TABELA DE NOTIFICAÇÕES & ALERTAS INTELIGENTES DO GESTOR
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'alerta' CHECK (type IN ('alerta', 'sistema', 'manual')),
  read BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. TRIGGER DE SINCRONIZAÇÃO AUTOMÁTICA AUTH.USERS <-> PROFILES / FREELANCERS / CLIENTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_email TEXT;
BEGIN
  v_email := LOWER(TRIM(NEW.email));
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'freelancer');
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(v_email, '@', 1));

  -- 1. Sincronizar na tabela public.profiles sem violar Foreign Keys nem Email Único
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    UPDATE public.profiles
    SET
      email = v_email,
      full_name = COALESCE(full_name, v_name),
      role = COALESCE(role, v_role),
      status = 'ativo',
      approval_status = 'approved',
      updated_at = NOW()
    WHERE id = NEW.id;
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(TRIM(email)) = v_email) THEN
    UPDATE public.profiles
    SET
      full_name = COALESCE(full_name, v_name),
      role = COALESCE(role, v_role),
      status = 'ativo',
      approval_status = 'approved',
      updated_at = NOW()
    WHERE LOWER(TRIM(email)) = v_email;
  ELSE
    INSERT INTO public.profiles (id, email, full_name, role, status, approval_status, updated_at)
    VALUES (
      NEW.id,
      v_email,
      v_name,
      v_role,
      'ativo',
      'approved',
      NOW()
    );
  END IF;

  -- 2. Vincular auth_user_id na tabela freelancers caso o e-mail exista
  UPDATE public.freelancers
  SET auth_user_id = NEW.id, updated_at = NOW()
  WHERE LOWER(TRIM(email)) = v_email AND (auth_user_id IS NULL OR auth_user_id != NEW.id);

  -- 3. Vincular auth_user_id na tabela clients caso o e-mail exista
  UPDATE public.clients
  SET auth_user_id = NEW.id, status = 'ativo', updated_at = NOW()
  WHERE LOWER(TRIM(email)) = v_email AND (auth_user_id IS NULL OR auth_user_id != NEW.id);

  RETURN NEW;
END;
$$;

-- Criar o trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_sync();

-- ------------------------------------------------------------------------------
-- 6. STORAGE BUCKETS (FREELANCER-DOCS, CLIENT-DOCUMENTS, PROJECT-ATTACHMENTS)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('freelancer-docs', 'freelancer-docs', true, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']),
  ('client-documents', 'client-documents', true, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']),
  ('project-attachments', 'project-attachments', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de Acesso aos Buckets de Storage
DROP POLICY IF EXISTS "Public access to freelancer-docs" ON storage.objects;
CREATE POLICY "Public access to freelancer-docs" ON storage.objects
  FOR SELECT USING (bucket_id IN ('freelancer-docs', 'client-documents', 'project-attachments'));

DROP POLICY IF EXISTS "Allow upload to storage" ON storage.objects;
CREATE POLICY "Allow upload to storage" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('freelancer-docs', 'client-documents', 'project-attachments'));

DROP POLICY IF EXISTS "Allow update to storage" ON storage.objects;
CREATE POLICY "Allow update to storage" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('freelancer-docs', 'client-documents', 'project-attachments'));

DROP POLICY IF EXISTS "Allow delete from storage" ON storage.objects;
CREATE POLICY "Allow delete from storage" ON storage.objects
  FOR DELETE USING (bucket_id IN ('freelancer-docs', 'client-documents', 'project-attachments'));

-- ------------------------------------------------------------------------------
-- 7. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) & POLÍTICAS PERMISSIVAS
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de PROFILES
DROP POLICY IF EXISTS "profiles_all_read" ON public.profiles;
CREATE POLICY "profiles_all_read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_self_write" ON public.profiles;
CREATE POLICY "profiles_self_write" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Políticas de FREELANCERS
DROP POLICY IF EXISTS "freelancers_all_access" ON public.freelancers;
CREATE POLICY "freelancers_all_access" ON public.freelancers FOR ALL USING (true) WITH CHECK (true);

-- Políticas de FREELANCER_DOCUMENTS
DROP POLICY IF EXISTS "freelancer_documents_all_access" ON public.freelancer_documents;
CREATE POLICY "freelancer_documents_all_access" ON public.freelancer_documents FOR ALL USING (true) WITH CHECK (true);

-- Políticas de NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_all_access" ON public.notifications;
CREATE POLICY "notifications_all_access" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. SINCRONIZAÇÃO RETROATIVA DE USUÁRIOS EXISTENTES (100% PRESERVANDO PROJETOS)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  u RECORD;
  v_user_email TEXT;
  v_role TEXT;
  v_name TEXT;
BEGIN
  FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    v_user_email := LOWER(TRIM(u.email));
    v_role := COALESCE(u.raw_user_meta_data->>'role', 'freelancer');
    v_name := COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1));

    -- Atualiza por ID se já existe, ou atualiza por Email sem deletar registros referenciados
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
      UPDATE public.profiles
      SET
        email = v_user_email,
        full_name = COALESCE(full_name, v_name),
        role = COALESCE(role, v_role),
        status = 'ativo',
        approval_status = 'approved',
        updated_at = NOW()
      WHERE id = u.id;
    ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(TRIM(email)) = v_user_email) THEN
      UPDATE public.profiles
      SET
        full_name = COALESCE(full_name, v_name),
        role = COALESCE(role, v_role),
        status = 'ativo',
        approval_status = 'approved',
        updated_at = NOW()
      WHERE LOWER(TRIM(email)) = v_user_email;
    ELSE
      INSERT INTO public.profiles (id, email, full_name, role, status, approval_status, updated_at)
      VALUES (
        u.id,
        v_user_email,
        v_name,
        v_role,
        'ativo',
        'approved',
        NOW()
      );
    END IF;

    -- Vincular freelancers e clients pelo email
    UPDATE public.freelancers
    SET auth_user_id = u.id, updated_at = NOW()
    WHERE LOWER(TRIM(email)) = v_user_email AND (auth_user_id IS NULL OR auth_user_id != u.id);

    UPDATE public.clients
    SET auth_user_id = u.id, status = 'ativo', updated_at = NOW()
    WHERE LOWER(TRIM(email)) = v_user_email AND (auth_user_id IS NULL OR auth_user_id != u.id);
  END LOOP;
END $$;
