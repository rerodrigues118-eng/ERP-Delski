/**
 * Origins for contract template variables.
 * - 'company'    → resolved from Delski company settings
 * - 'gestor'     → resolved from the logged-in gestor's profile
 * - 'freelancer' → resolved from the selected freelancer profile (target_type='freelancer')
 * - 'client'     → resolved from the selected client record (target_type='client')
 * - 'project'    → resolved from the selected project record
 * - 'manual'     → must be filled in manually by the gestor
 * - 'system'     → resolved from system values (date, contract type, etc.)
 */
export type ContractModelOrigin = "company" | "gestor" | "freelancer" | "client" | "project" | "manual" | "system";
export type ContractModality = "PJ" | "CLT" | "Estágio" | "Aprendiz";

/** Which "party" this model targets: Delski↔Freelancer or Delski↔Client */
export type ContractTargetType = "freelancer" | "client";

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
  /** Indicates if this model is for a Freelancer or a Client contract. Defaults to 'freelancer'. */
  target_type?: ContractTargetType;
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
  /** Populated when the contract targets a freelancer. Mutually exclusive with client_id. */
  freelancer_id: string | null;
  /** Populated when the contract targets a client. Mutually exclusive with freelancer_id. */
  client_id?: string | null;
  values: Record<string, string>;
  docx_path: string;
  pdf_path?: string | null;
  signed_docx_path: string | null;
  status: GeneratedContractStatus;
  created_at: string;
  updated_at: string;
}
