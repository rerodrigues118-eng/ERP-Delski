-- ==============================================================================
-- CORREÇÃO DEFINITIVA DE CONSTRAINTS, KANBAN, COLUNAS E STORAGE BUCKETS
-- Execute no SQL Editor do Supabase para destravar o Kanban, Documentos e Contratos
-- ==============================================================================

-- 1. Remove qualquer constraint restritiva anterior de document_type
ALTER TABLE public.freelancer_documents 
DROP CONSTRAINT IF EXISTS freelancer_documents_document_type_check;

-- 2. Recria o check constraint permitindo todos os tipos mantidos no sistema
ALTER TABLE public.freelancer_documents 
ADD CONSTRAINT freelancer_documents_document_type_check 
CHECK (document_type IN (
  'rg_cnh', 'documento_identidade_1', 'documento_identidade_2', 'rg_frente', 'rg_verso', 'cnh',
  'comprovante_cpf', 'situacao_cpf', 'situacao_cadastral_cpf',
  'foto_rosto', 'foto_rosto_3x4',
  'cnpj_ativo', 'cartao_cnpj', 'situacao_cnpj',
  'antecedentes_criminais', 'certidao_antecedentes_criminais',
  'contrato_social', 'doc_constitutivo',
  'contrato_prestacao', 'contrato_assinado', 'comprovante_pagamento', 'comprovante_residencia',
  'outro'
));

-- 3. Remove qualquer constraint restritiva anterior de status em documentos
ALTER TABLE public.freelancer_documents 
DROP CONSTRAINT IF EXISTS freelancer_documents_status_check;

-- 4. Recria o check constraint permitindo todos os status válidos do sistema
ALTER TABLE public.freelancer_documents 
ADD CONSTRAINT freelancer_documents_status_check 
CHECK (status IN ('pendente', 'em_analise', 'aprovado', 'rejeitado', 'adequacao_solicitada'));

-- 5. Remove a trava de Foreign Key que bloqueia freelancers criados antes do login auth
ALTER TABLE public.freelancer_documents 
DROP CONSTRAINT IF EXISTS freelancer_documents_freelancer_id_fkey;

-- 6. Cria índice para performance sem travar a integridade relacional
CREATE INDEX IF NOT EXISTS idx_freelancer_documents_freelancer_id ON public.freelancer_documents(freelancer_id);

-- 7. Garante colunas de suporte para homologação, auditoria e timestamp
ALTER TABLE public.freelancer_documents ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.freelancer_documents ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.freelancer_documents ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.freelancer_documents ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE public.freelancer_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.freelancer_documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- 8. Libera MIME Types no Supabase Storage para permitir documentos Word (.docx / .doc) e PDF
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id IN ('freelancer-docs', 'freelancer-invoices', 'client-documents');

-- 9. CORREÇÃO DEFINITIVA DO DRAG-AND-DROP DO KANBAN (projects_status_check)
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN (
  'Criado', 'criado',
  'Solicitado', 'solicitado',
  'Aguardando Candidaturas', 'aguardando_candidaturas',
  'Emitir contrato', 'Emitir Contrato', 'emitir_contrato',
  'Revisão de Contrato', 'Revisao de Contrato', 'revisao_contrato',
  'Delegado', 'delegado',
  'Em Producao', 'Em Produção', 'em_producao',
  'Em Andamento', 'em_andamento', 'execucao',
  'Em Revisao', 'Em Revisão', 'em_revisao', 'revisao',
  'Concluido', 'Concluído', 'concluido',
  'Cancelado', 'cancelado',
  'Planejamento', 'planejamento',
  'Em Triagem', 'em_triagem'
));

-- 10. Garante suporte a todos os tipos de serviço nos projetos
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_service_type_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_service_type_check 
CHECK (service_type IN ('IA', 'Trafego', 'Sites', 'Social Media'));
