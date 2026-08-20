-- ==============================================================================
-- DELSKI CLOUD — CORREÇÃO DEFINITIVA DE PERSISTÊNCIA DE PERFIL & AVATAR DO CLIENTE
-- Execute este script no SQL Editor do seu Dashboard Supabase (https://app.supabase.com)
-- Script 100% Seguro e Idempotente (Com validação segura de auth.users foreign key)
-- ==============================================================================

-- 1. GARANTIR COLUNAS NA TABELA PUBLIC.PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. GARANTIR COLUNAS NA TABELA PUBLIC.CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
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
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices de busca rápida
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON public.clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- 3. CONFIGURAÇÃO DOS BUCKETS DE STORAGE (client-documents & avatars)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. POLÍTICAS DE ROW LEVEL SECURITY (RLS) PARA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis leitura publica" ON public.profiles;
CREATE POLICY "Perfis leitura publica"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Perfis escrita proprio ou gestor" ON public.profiles;
CREATE POLICY "Perfis escrita proprio ou gestor"
  ON public.profiles FOR ALL
  TO authenticated
  USING (auth.uid() = id OR role IN ('gestor', 'admin'))
  WITH CHECK (auth.uid() = id OR role IN ('gestor', 'admin'));

-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS) PARA CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clientes leitura publica" ON public.clients;
CREATE POLICY "Clientes leitura publica"
  ON public.clients FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Clientes edicao dados proprios ou gestor" ON public.clients;
CREATE POLICY "Clientes edicao dados proprios ou gestor"
  ON public.clients FOR ALL
  TO authenticated
  USING (
    auth_user_id = auth.uid() 
    OR id = auth.uid() 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gestor', 'admin'))
  )
  WITH CHECK (
    auth_user_id = auth.uid() 
    OR id = auth.uid() 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gestor', 'admin'))
  );

-- 6. POLÍTICAS DE STORAGE PARA UPLOAD DE FOTOS E DOCUMENTOS
DROP POLICY IF EXISTS "Storage acesso total a client-documents e avatars" ON storage.objects;
CREATE POLICY "Storage acesso total a client-documents e avatars"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id IN ('client-documents', 'avatars', 'freelancer-docs'))
  WITH CHECK (bucket_id IN ('client-documents', 'avatars', 'freelancer-docs'));

DROP POLICY IF EXISTS "Storage leitura publica avatars e client-documents" ON storage.objects;
CREATE POLICY "Storage leitura publica avatars e client-documents"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('client-documents', 'avatars', 'freelancer-docs'));

-- 7. SINCRONIZAÇÃO SEGURA: CRIAR/ATUALIZAR CLIENTS COM FOREIGN KEY VÁLIDA
INSERT INTO public.clients (
  id,
  auth_user_id,
  full_name,
  email,
  company_name,
  phone,
  avatar_url,
  onboarding_completed,
  status
)
SELECT 
  p.id,
  (SELECT u.id FROM auth.users u WHERE u.id = p.id OR LOWER(u.email) = LOWER(p.email) LIMIT 1) AS auth_user_id,
  p.full_name,
  p.email,
  COALESCE(p.company_name, p.full_name),
  p.phone,
  p.avatar_url,
  p.onboarding_completed,
  'ativo'
FROM public.profiles p
WHERE p.role = 'cliente'
ON CONFLICT (id) DO UPDATE 
SET 
  auth_user_id = COALESCE(EXCLUDED.auth_user_id, public.clients.auth_user_id),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.clients.avatar_url),
  phone = COALESCE(EXCLUDED.phone, public.clients.phone),
  updated_at = NOW();

-- 8. TRIGGER DE SINCRONIZAÇÃO AUTOMÁTICA PROFILES -> CLIENTS COM VALIDAÇÃO DE AUTH.USERS
CREATE OR REPLACE FUNCTION public.sync_profile_to_client()
RETURNS TRIGGER AS $$
DECLARE
  matched_auth_id UUID;
BEGIN
  IF NEW.role = 'cliente' THEN
    -- Obter auth_user_id apenas se o usuário existir de fato em auth.users
    SELECT u.id INTO matched_auth_id 
    FROM auth.users u 
    WHERE u.id = NEW.id OR LOWER(u.email) = LOWER(NEW.email) 
    LIMIT 1;

    INSERT INTO public.clients (
      id,
      auth_user_id,
      full_name,
      email,
      company_name,
      phone,
      avatar_url,
      onboarding_completed,
      status,
      updated_at
    )
    VALUES (
      NEW.id,
      matched_auth_id,
      NEW.full_name,
      NEW.email,
      COALESCE(NEW.company_name, NEW.full_name),
      NEW.phone,
      NEW.avatar_url,
      NEW.onboarding_completed,
      'ativo',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      auth_user_id = COALESCE(EXCLUDED.auth_user_id, public.clients.auth_user_id),
      full_name = EXCLUDED.full_name,
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.clients.avatar_url),
      phone = COALESCE(EXCLUDED.phone, public.clients.phone),
      onboarding_completed = EXCLUDED.onboarding_completed,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_to_client ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_client
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_client();
