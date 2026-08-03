export type ContractModelOrigin = "company" | "freelancer" | "project" | "manual" | "system";

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
  docx_path: string;
  variable_map: ContractModelVariable[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GeneratedContractStatus = "draft" | "generated" | "exported";

export interface GeneratedContract {
  id: string;
  model_id: string;
  project_id: string;
  freelancer_id: string | null;
  values: Record<string, string>;
  docx_path: string;
  pdf_path?: string | null;
  status: GeneratedContractStatus;
  created_at: string;
  updated_at: string;
}
