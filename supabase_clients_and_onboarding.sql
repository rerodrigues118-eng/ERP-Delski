-- ==============================================================================
-- DELSKI CLOUD — SCRIPT SQL DE ESTRUTURAÇÃO DE CLIENTES & ONBOARDING NO SUPABASE
-- Execute este script no SQL Editor do seu Dashboard Supabase.
-- Ele é totalmente idempotente (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ==============================================================================

-- 1. TABELA PUBLIC.CLIENTS (EXPANSÃO DE CAMPOS CORPORATIVOS, FISCAIS E ENDEREÇO)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  corporate_name TEXT,
  cnpj TEXT,
  segment TEXT,
  cep TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  contact_name TEXT,
  role_position TEXT,
  phone TEXT,
  instagram TEXT,
  linkedin TEXT,
  website TEXT,
  contract_model TEXT DEFAULT 'Mensal',
  contract_value NUMERIC DEFAULT 0,
  setup_value NUMERIC DEFAULT 0,
  contract_duration TEXT DEFAULT '12 meses',
  payment_date DATE,
  due_date DATE,
  financial_status TEXT DEFAULT 'Pendente',
  invoices JSONB DEFAULT '[]'::jsonb,
  payment_receipts JSONB DEFAULT '[]'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'convidado' CHECK (status IN ('convidado', 'ativo', 'bloqueado')),
  invited_by_gestor BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir adição de todas as colunas caso a tabela já exista:
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS corporate_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS segment TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS role_position TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_model TEXT DEFAULT 'Mensal';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_value NUMERIC DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS setup_value NUMERIC DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_duration TEXT DEFAULT '12 meses';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS financial_status TEXT DEFAULT 'Pendente';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invoices JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_receipts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'convidado';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invited_by_gestor BOOLEAN DEFAULT true;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON public.clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- ------------------------------------------------------------------------------
-- 2. TABELA PUBLIC.CLIENT_DOCUMENTS (ANEXOS DE ONBOARDING & HOMOLOGAÇÃO)
CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  status TEXT DEFAULT 'em_analise' CHECK (status IN ('pendente', 'em_analise', 'aprovado', 'rejeitado')),
  review_notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_doc_type ON public.client_documents(document_type);

-- ------------------------------------------------------------------------------
-- 3. TABELA PUBLIC.FREELANCER_DOCUMENTS (ANEXOS DE ONBOARDING FREELANCER)
CREATE TABLE IF NOT EXISTS public.freelancer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  status TEXT DEFAULT 'em_analise' CHECK (status IN ('pendente', 'em_analise', 'aprovado', 'rejeitado')),
  review_notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_freelancer_documents_fid ON public.freelancer_documents(freelancer_id);

-- ------------------------------------------------------------------------------
-- 4. BUCKETS DE STORAGE DO SUPABASE (client-documents & freelancer-docs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('freelancer-docs', 'freelancer-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_documents ENABLE ROW LEVEL SECURITY;

-- Políticas para public.clients
DROP POLICY IF EXISTS "Gestores possuem controle total sobre clients" ON public.clients;
CREATE POLICY "Gestores possuem controle total sobre clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Clientes podem visualizar e editar seus próprios dados" ON public.clients;
CREATE POLICY "Clientes podem visualizar e editar seus próprios dados"
  ON public.clients FOR ALL
  TO authenticated
  USING (
    auth_user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    auth_user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Políticas para public.client_documents
DROP POLICY IF EXISTS "Gestores possuem acesso aos documentos de clientes" ON public.client_documents;
CREATE POLICY "Gestores possuem acesso aos documentos de clientes"
  ON public.client_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('gestor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Clientes podem gerenciar seus próprios documentos" ON public.client_documents;
CREATE POLICY "Clientes podem gerenciar seus próprios documentos"
  ON public.client_documents FOR ALL
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE auth_user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ) OR client_id = auth.uid()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE auth_user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ) OR client_id = auth.uid()
  );

-- Políticas de Storage para o bucket client-documents
DROP POLICY IF EXISTS "Acesso público ou autenticado ao bucket client-documents" ON storage.objects;
CREATE POLICY "Acesso público ou autenticado ao bucket client-documents"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id IN ('client-documents', 'freelancer-docs'))
  WITH CHECK (bucket_id IN ('client-documents', 'freelancer-docs'));
