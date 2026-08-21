-- ==============================================================================
-- DELSKI ERP & CLOUD: SCRIPT COMPLETO DE ATUALIZAÇÃO DO SUPABASE
-- Execute este script no SQL Editor do Supabase para sincronizar todas as tabelas
-- ==============================================================================

-- 1. TABELA public.projects
DO $$
BEGIN
  -- 1.1 Adicionar colunas de campos de contrato no projeto se não existirem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'contract_field_values'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN contract_field_values jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'contract_fields_status'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN contract_fields_status text DEFAULT 'pendente';
  END IF;

  -- 1.2 Remover constraints restritivas de service_type e status para aceitar 'Social Media' e todos os status
  ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_service_type_check;
  ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
  ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_contract_fields_status_check;
END $$;

-- 2. TABELA public.contract_models
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contract_models' AND column_name = 'contract_type'
  ) THEN
    ALTER TABLE public.contract_models ADD COLUMN contract_type text DEFAULT 'PJ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contract_models' AND column_name = 'target_type'
  ) THEN
    ALTER TABLE public.contract_models ADD COLUMN target_type text DEFAULT 'freelancer';
  END IF;
END $$;

-- Políticas RLS de contract_models
ALTER TABLE public.contract_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Modelos contrato leitura publica" ON public.contract_models;
CREATE POLICY "Modelos contrato leitura publica" ON public.contract_models FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestores escrita modelos contrato" ON public.contract_models;
CREATE POLICY "Gestores escrita modelos contrato" ON public.contract_models FOR ALL USING (true) WITH CHECK (true);

-- 3. TABELA public.freelancers
DO $$
BEGIN
  -- Adicionar colunas opcionais caso ainda não existam
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'freelancers' AND column_name = 'behance'
  ) THEN
    ALTER TABLE public.freelancers ADD COLUMN behance text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'freelancers' AND column_name = 'contract_field_values'
  ) THEN
    ALTER TABLE public.freelancers ADD COLUMN contract_field_values jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'freelancers' AND column_name = 'contract_fields_status'
  ) THEN
    ALTER TABLE public.freelancers ADD COLUMN contract_fields_status text DEFAULT 'pendente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'freelancers' AND column_name = 'documents_status'
  ) THEN
    ALTER TABLE public.freelancers ADD COLUMN documents_status text DEFAULT 'pendente';
  END IF;
END $$;

-- 4. BUCKETS DE STORAGE DO SUPABASE (Garante que todos os buckets existam e sejam públicos para upload)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('contract-templates', 'contract-templates', true),
  ('contracts', 'contracts', true),
  ('freelancer-documents', 'freelancer-documents', true),
  ('client-documents', 'client-documents', true),
  ('contract-generated', 'contract-generated', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage
DROP POLICY IF EXISTS "Template docx upload publico" ON storage.objects;
CREATE POLICY "Template docx upload publico" ON storage.objects
FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. TABELA public.client_documents (Remover check constraints restritivas)
DO $$
BEGIN
  -- Remover constraints restritivas de document_type e status
  ALTER TABLE public.client_documents DROP CONSTRAINT IF EXISTS client_documents_document_type_check;
  ALTER TABLE public.client_documents DROP CONSTRAINT IF EXISTS client_documents_doc_type_check;
  ALTER TABLE public.client_documents DROP CONSTRAINT IF EXISTS client_documents_status_check;
END $$;

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_documents_policy" ON public.client_documents;
CREATE POLICY "client_documents_policy" ON public.client_documents FOR ALL USING (true) WITH CHECK (true);

-- 6. CAMPOS DE CPF, BLOQUEIO (STATUS), SOFT DELETE E PARÂMETROS CADASTRAIS/FINANCEIROS
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS contract_model TEXT DEFAULT 'Mensal';
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS contract_value NUMERIC DEFAULT 0;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS payment_date TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS financial_status TEXT DEFAULT 'Pendente';
ALTER TABLE public.freelancers ADD COLUMN IF NOT EXISTS contract_field_values JSONB DEFAULT '{}'::jsonb;

-- Remover bloqueio estrito de FK que pode falhar em upsert descentralizado
ALTER TABLE public.freelancers DROP CONSTRAINT IF EXISTS freelancers_id_fkey;

ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "freelancers_all_policy" ON public.freelancers;
DROP POLICY IF EXISTS "Freelancers podem ver seu próprio perfil" ON public.freelancers;
DROP POLICY IF EXISTS "Freelancers podem atualizar seu próprio perfil" ON public.freelancers;
DROP POLICY IF EXISTS "Freelancers podem inserir seu próprio perfil" ON public.freelancers;
CREATE POLICY "freelancers_all_policy" ON public.freelancers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Tabela Profiles: Adicionar todas as colunas para paridade completa com freelancers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contract_model TEXT DEFAULT 'Mensal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contract_value NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS financial_status TEXT DEFAULT 'Pendente';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contract_field_values JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS corporate_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS segment TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS behance TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_agency TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_all_policy" ON public.profiles;
CREATE POLICY "profiles_all_policy" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 7. SUPORTE A ANEXOS, PRIORIDADE E CAMPOS COMPLETOS NOS CHAMADOS SAC
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Média';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS evidence_url TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS client_id UUID;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "support_tickets_all_policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Clientes e Gestores gerenciam chamados" ON public.support_tickets;
CREATE POLICY "support_tickets_all_policy" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- Fim do Script de Atualização
-- ==============================================================================
