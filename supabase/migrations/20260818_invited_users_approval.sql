-- ==============================================================
-- FLUXO DE APROVAÇÃO: CONVITE POR GESTOR vs. CADASTRO PÚBLICO
-- ==============================================================
-- Regra:
--   • Auto-cadastro público (/auth)           → approval_status = 'pending'
--   • Convidado pelo gestor (modais)          → approval_status = 'approved'
--
-- Implementação:
--   Coluna `invited_by_gestor` sinaliza convites diretos.
--   O trigger `handle_new_user_approval` aplica a aprovação automática
--   quando o usuário cria conta com e-mail previamente pré-cadastrado
--   pelo gestor com invited_by_gestor = TRUE.
-- ==============================================================

-- 1. Adicionar coluna invited_by_gestor em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_by_gestor BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Adicionar coluna invited_by_gestor em clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS invited_by_gestor BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Índice para buscas rápidas por e-mail + convite
CREATE INDEX IF NOT EXISTS idx_profiles_email_invited
  ON public.profiles (email, invited_by_gestor);

-- 4. Função de trigger: ao criar conta no auth.users,
--    se o e-mail foi pré-cadastrado como convidado, aprova automaticamente.
CREATE OR REPLACE FUNCTION public.handle_new_user_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se existe um perfil pré-cadastrado como convidado com este e-mail
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
      AND invited_by_gestor = TRUE
  ) THEN
    -- Aprova automaticamente ao criar a conta de auth
    UPDATE public.profiles
      SET approval_status = 'approved'
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
      AND invited_by_gestor = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Cria/substitui o trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_approval ON auth.users;
CREATE TRIGGER on_auth_user_created_approval
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_approval();

-- 6. Retrocompatibilidade:
--    Marcar todos os clientes/freelancers pré-existentes que foram cadastrados
--    pelos modais como convidados (approval_status = 'approved' já setado)
UPDATE public.profiles
  SET invited_by_gestor = TRUE
WHERE approval_status = 'approved'
  AND role IN ('freelancer', 'cliente');
