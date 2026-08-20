export type ContractModelOrigin = "company" | "gestor" | "freelancer" | "project" | "manual" | "system";
export type ContractModality = "PJ" | "CLT" | "Estágio" | "Aprendiz";

export interface ContractModelVariable {
  name: string;
  origin: ContractModelOrigin;
  section: string;
  order: number;
  label: string;
  defaultValue?: string | null;
}

export interface ContractModel {
  id: string;
  name: string;
  service_type: string;
  contract_type?: ContractModality | string;
  docx_path: string;
  variable_map: ContractModelVariable[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GeneratedContractStatus =
  | "draft"
  | "rascunho"
  | "aguardando_upload_gestor"
  | "generated"
  | "aguardando_assinatura_freelancer"
  | "exported"
  | "assinado_freelancer"
  | "concluido";

export interface GeneratedContract {
  id: string;
  model_id: string;
  project_id: string;
  freelancer_id: string | null;
  values: Record<string, string>;
  docx_path: string;
  pdf_path?: string | null;
  signed_docx_path: string | null;
  status: GeneratedContractStatus;
  created_at: string;
  updated_at: string;
}
