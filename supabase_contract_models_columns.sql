-- ==============================================================================
-- Script de Atualização: Tabela public.contract_models
-- Adiciona suporte a contract_type, target_type e garante políticas RLS
-- ==============================================================================

-- 1. Adicionar colunas se não existirem
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

-- 2. Garantir políticas RLS permissivas para leitura e escrita por gestores/anônimos se configurado
ALTER TABLE public.contract_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Modelos contrato leitura publica" ON public.contract_models;
CREATE POLICY "Modelos contrato leitura publica" ON public.contract_models FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestores escrita modelos contrato" ON public.contract_models;
CREATE POLICY "Gestores escrita modelos contrato" ON public.contract_models FOR ALL USING (true) WITH CHECK (true);

-- 3. Storage bucket contract-templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-templates', 'contract-templates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Template docx upload publico" ON storage.objects;
CREATE POLICY "Template docx upload publico" ON storage.objects
FOR ALL TO public USING (bucket_id = 'contract-templates') WITH CHECK (bucket_id = 'contract-templates');
