-- ==============================================================================
-- DELSKI ERP & PORTAL DO CLIENTE - CONTROLE DE ONBOARDING ÚNICO
-- Execute este script no SQL Editor do Supabase para adicionar a coluna
-- onboarding_completed nas tabelas clients, profiles e freelancers.
-- ==============================================================================

-- 1. Tabela CLIENTS
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 2. Tabela PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 3. Tabela FREELANCERS (Prestadores)
ALTER TABLE public.freelancers 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 4. Criação de índices para otimização de leitura e auth guards
CREATE INDEX IF NOT EXISTS idx_clients_onboarding_completed ON public.clients(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_freelancers_onboarding_completed ON public.freelancers(onboarding_completed);

-- 5. Comentários explicativos para documentação no schema
COMMENT ON COLUMN public.clients.onboarding_completed IS 'Flag booleana indicando se o cliente já finalizou o fluxo inicial de onboarding e validação cadastral.';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Flag de controle de onboarding do usuário autenticado no sistema.';
COMMENT ON COLUMN public.freelancers.onboarding_completed IS 'Flag booleana indicando se o freelancer já completou as etapas de cadastro técnico e bancário.';

-- 6. Garantir que gestores e admins sempre tenham onboarding_completed = TRUE
UPDATE public.profiles 
SET onboarding_completed = TRUE 
WHERE role IN ('gestor', 'admin', 'manager', 'administrator');
