export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface ProfilesRow {
  id: string;
  full_name: string;
  email: string;
  role: "gestor" | "freelancer" | "cliente";
  created_at: string;
}

export interface ProfilesInsert {
  id: string;
  full_name: string;
  email: string;
  role?: "gestor" | "freelancer" | "cliente";
  created_at?: string;
}

export interface ProfilesUpdate {
  full_name?: string;
  email?: string;
  role?: "gestor" | "freelancer" | "cliente";
  created_at?: string;
}

export interface ProjectsRow {
  id: string;
  title: string;
  client_id: string | null;
  service_type: "IA" | "Trafego" | "Sites" | "Social Media";
  status:
    | "Criado"
    | "Aguardando Candidaturas"
    | "Em Triagem"
    | "Emitir contrato"
    | "Revisão de Contrato"
    | "Em Andamento"
    | "Em Revisao"
    | "Concluido"
    | "Solicitado"
    | "Delegado"
    | "Em Producao";
  budget: number;
  freelancer_cost: number;
  deadline: string | null;
  briefing_content: string | null;
  google_drive_link: string | null;
  public_token: string | null;
  client_contract_path: string | null;
  client_contract_url: string | null;
  contract_field_values?: Json;
  contract_fields_status?: "pendente" | "completo";
  created_at: string;
}

export interface ProjectsInsert {
  id?: string;
  title: string;
  client_id?: string | null;
  service_type: "IA" | "Trafego" | "Sites" | "Social Media";
  status?:
    | "Criado"
    | "Aguardando Candidaturas"
    | "Em Triagem"
    | "Emitir contrato"
    | "Revisão de Contrato"
    | "Em Andamento"
    | "Em Revisao"
    | "Concluido"
    | "Solicitado"
    | "Delegado"
    | "Em Producao";
  budget?: number;
  freelancer_cost?: number;
  deadline?: string;
  briefing_content?: string;
  google_drive_link?: string;
  public_token?: string | null;
  client_contract_path?: string | null;
  client_contract_url?: string | null;
  contract_field_values?: Json;
  contract_fields_status?: "pendente" | "completo";
  created_at?: string;
}

export interface ProjectsUpdate {
  title?: string;
  client_id?: string | null;
  service_type?: "IA" | "Trafego" | "Sites" | "Social Media";
  status?:
    | "Criado"
    | "Aguardando Candidaturas"
    | "Em Triagem"
    | "Emitir contrato"
    | "Revisão de Contrato"
    | "Em Andamento"
    | "Em Revisao"
    | "Concluido"
    | "Solicitado"
    | "Delegado"
    | "Em Producao";
  budget?: number;
  freelancer_cost?: number;
  deadline?: string;
  briefing_content?: string;
  google_drive_link?: string;
  public_token?: string | null;
  client_contract_path?: string | null;
  client_contract_url?: string | null;
  contract_field_values?: Json;
  contract_fields_status?: "pendente" | "completo";
  created_at?: string;
}

export interface ProjectFreelancersRow {
  id: string;
  project_id: string;
  freelancer_id: string;
  invitation_token: string;
  status: "Convidado" | "Aceito" | "Recusado";
  created_at: string;
}

export interface ProjectFreelancersInsert {
  id?: string;
  project_id: string;
  freelancer_id: string;
  invitation_token?: string;
  status?: "Convidado" | "Aceito" | "Recusado";
  created_at?: string;
}

export interface ProjectFreelancersUpdate {
  project_id?: string;
  freelancer_id?: string;
  invitation_token?: string;
  status?: "Convidado" | "Aceito" | "Recusado";
  created_at?: string;
}

export interface ProjectTasksRow {
  id: string;
  project_id: string;
  title: string;
  phase: string;
  status: "Pendente" | "Em andamento" | "Em revisao" | "Concluida";
  predecessor_id: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
}

export interface ProjectTasksInsert {
  id?: string;
  project_id: string;
  title: string;
  phase: string;
  status?: "Pendente" | "Em andamento" | "Em revisao" | "Concluida";
  predecessor_id?: string | null;
  start_date?: string;
  due_date?: string;
  created_at?: string;
}

export interface ProjectTasksUpdate {
  project_id?: string;
  title?: string;
  phase?: string;
  status?: "Pendente" | "Em andamento" | "Em revisao" | "Concluida";
  predecessor_id?: string | null;
  start_date?: string;
  due_date?: string;
  created_at?: string;
}

export interface ProjectTriageRow {
  id: string;
  project_id: string;
  token: string;
  freelancer_name: string | null;
  freelancer_email: string | null;
  skills: string[] | null;
  availability_hours: number | null;
  portfolio_url: string | null;
  proposed_rate: number | null;
  experience_summary: string | null;
  considerations: string | null;
  notes: string | null;
  status: "Rascunho" | "Enviado" | "Aprovado" | "Rejeitado";
  score: number;
  created_at: string;
}

export interface ProjectTriageInsert {
  id?: string;
  project_id: string;
  token?: string;
  freelancer_name?: string | null;
  freelancer_email?: string | null;
  skills?: string[] | null;
  availability_hours?: number | null;
  portfolio_url?: string | null;
  proposed_rate?: number | null;
  experience_summary?: string | null;
  considerations?: string | null;
  notes?: string | null;
  status?: "Rascunho" | "Enviado" | "Aprovado" | "Rejeitado";
  score?: number;
  created_at?: string;
}

export interface ProjectTriageUpdate {
  project_id?: string;
  token?: string;
  freelancer_name?: string | null;
  freelancer_email?: string | null;
  skills?: string[] | null;
  availability_hours?: number | null;
  portfolio_url?: string | null;
  proposed_rate?: number | null;
  experience_summary?: string | null;
  considerations?: string | null;
  notes?: string | null;
  status?: "Rascunho" | "Enviado" | "Aprovado" | "Rejeitado";
  score?: number;
  created_at?: string;
}

export interface ProjectExpensesRow {
  id: string;
  project_id: string | null;
  amount: number;
  description: string | null;
  category: string;
  nature?: "fixo" | "variavel";
  due_date?: string | null;
  payment_date?: string | null;
  status: "Pendente" | "Aprovado" | "Pago";
  freelancer_id: string | null;
  proof_url: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ProjectExpensesInsert {
  id?: string;
  project_id?: string | null;
  amount: number;
  description?: string | null;
  category?: string;
  nature?: "fixo" | "variavel";
  due_date?: string | null;
  payment_date?: string | null;
  status?: "Pendente" | "Aprovado" | "Pago";
  freelancer_id?: string | null;
  proof_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectExpensesUpdate {
  project_id?: string | null;
  amount?: number;
  description?: string | null;
  category?: string;
  nature?: "fixo" | "variavel";
  due_date?: string | null;
  payment_date?: string | null;
  status?: "Pendente" | "Aprovado" | "Pago";
  freelancer_id?: string | null;
  proof_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FreelancerPayoutsRow {
  id: string;
  project_id: string;
  freelancer_id: string;
  amount: number;
  due_date: string | null;
  payment_date: string | null;
  status: "pendente" | "pago" | "agendado";
  payment_receipt_path: string | null;
  payment_receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FreelancerPayoutsInsert {
  id?: string;
  project_id: string;
  freelancer_id: string;
  amount: number;
  due_date?: string | null;
  payment_date?: string | null;
  status?: "pendente" | "pago" | "agendado";
  payment_receipt_path?: string | null;
  payment_receipt_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FreelancerPayoutsUpdate {
  project_id?: string;
  freelancer_id?: string;
  amount?: number;
  due_date?: string | null;
  payment_date?: string | null;
  status?: "pendente" | "pago" | "agendado";
  payment_receipt_path?: string | null;
  payment_receipt_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectContractsRow {
  id: string;
  project_id: string;
  freelancer_id: string | null;
  file_path: string | null;
  file_url: string | null;
  status: "Enviado" | "Aprovado" | "Indeferido" | "Ajustes";
  manager_message: string | null;
  manager_response_file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectContractsInsert {
  id?: string;
  project_id: string;
  freelancer_id?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  status?: "Enviado" | "Aprovado" | "Indeferido" | "Ajustes";
  manager_message?: string | null;
  manager_response_file_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectContractsUpdate {
  project_id?: string;
  freelancer_id?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  status?: "Enviado" | "Aprovado" | "Indeferido" | "Ajustes";
  manager_message?: string | null;
  manager_response_file_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContractModelsRow {
  id: string;
  name: string;
  service_type: string;
  docx_path: string;
  variable_map: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContractModelsInsert {
  id?: string;
  name: string;
  service_type: string;
  docx_path: string;
  variable_map?: Json;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ContractModelsUpdate {
  name?: string;
  service_type?: string;
  docx_path?: string;
  variable_map?: Json;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GeneratedContractsRow {
  id: string;
  model_id: string;
  project_id: string;
  freelancer_id: string | null;
  values: Json;
  docx_path: string;
  pdf_path: string | null;
  signed_docx_path: string | null;
  status: "draft" | "rascunho" | "aguardando_upload_gestor" | "generated" | "aguardando_assinatura_freelancer" | "exported" | "assinado_freelancer" | "concluido";
  created_at: string;
  updated_at: string;
}

export interface GeneratedContractsInsert {
  id?: string;
  model_id: string;
  project_id: string;
  freelancer_id?: string | null;
  values?: Json;
  docx_path: string;
  pdf_path?: string | null;
  signed_docx_path?: string | null;
  status?:
    | "draft"
    | "rascunho"
    | "aguardando_upload_gestor"
    | "generated"
    | "aguardando_assinatura_freelancer"
    | "exported"
    | "assinado_freelancer"
    | "concluido";
  created_at?: string;
  updated_at?: string;
}

export interface GeneratedContractsUpdate {
  model_id?: string;
  project_id?: string;
  freelancer_id?: string | null;
  values?: Json;
  docx_path?: string;
  pdf_path?: string | null;
  signed_docx_path?: string | null;
  status?:
    | "draft"
    | "rascunho"
    | "aguardando_upload_gestor"
    | "generated"
    | "aguardando_assinatura_freelancer"
    | "exported"
    | "assinado_freelancer"
    | "concluido";
  created_at?: string;
  updated_at?: string;
}

export interface FreelancersRow {
  id: string;
  contract_field_values: Json;
  contract_fields_status: "pendente" | "completo";
  documents_status: "pendente" | "em_analise" | "aprovado" | "rejeitado";
  created_at: string;
  updated_at: string;
}

export interface FreelancersInsert {
  id: string;
  contract_field_values?: Json;
  contract_fields_status?: "pendente" | "completo";
  documents_status?: "pendente" | "em_analise" | "aprovado" | "rejeitado";
  created_at?: string;
  updated_at?: string;
}

export interface FreelancersUpdate {
  id?: string;
  contract_field_values?: Json;
  contract_fields_status?: "pendente" | "completo";
  documents_status?: "pendente" | "em_analise" | "aprovado" | "rejeitado";
  created_at?: string;
  updated_at?: string;
}

export interface FreelancerDocumentsRow {
  id: string;
  freelancer_id: string;
  document_type:
    | "rg_frente"
    | "rg_verso"
    | "cnh"
    | "comprovante_residencia"
    | "situacao_cadastral_cpf"
    | "certidao_antecedentes_criminais";
  file_path: string;
  status: "pendente" | "aprovado" | "rejeitado";
  review_notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface FreelancerDocumentsInsert {
  id?: string;
  freelancer_id: string;
  document_type:
    | "rg_frente"
    | "rg_verso"
    | "cnh"
    | "comprovante_residencia"
    | "situacao_cadastral_cpf"
    | "certidao_antecedentes_criminais";
  file_path: string;
  status?: "pendente" | "aprovado" | "rejeitado";
  review_notes?: string | null;
  uploaded_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface FreelancerDocumentsUpdate {
  freelancer_id?: string;
  document_type?:
    | "rg_frente"
    | "rg_verso"
    | "cnh"
    | "comprovante_residencia"
    | "situacao_cadastral_cpf"
    | "certidao_antecedentes_criminais";
  file_path?: string;
  status?: "pendente" | "aprovado" | "rejeitado";
  review_notes?: string | null;
  uploaded_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface ClientsRow {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  company_name: string | null;
  phone: string | null;
  status: "convidado" | "ativo" | "bloqueado";
  created_at: string;
}

export interface ClientsInsert {
  id?: string;
  auth_user_id?: string | null;
  full_name: string;
  email: string;
  company_name?: string | null;
  phone?: string | null;
  status?: "convidado" | "ativo" | "bloqueado";
  created_at?: string;
}

export interface ClientsUpdate {
  id?: string;
  auth_user_id?: string | null;
  full_name?: string;
  email?: string;
  company_name?: string | null;
  phone?: string | null;
  status?: "convidado" | "ativo" | "bloqueado";
  created_at?: string;
}

export interface Database {
  public: {
    clients: {
      Row: ClientsRow;
      Insert: ClientsInsert;
      Update: ClientsUpdate;
    };
    profiles: {
      Row: ProfilesRow;
      Insert: ProfilesInsert;
      Update: ProfilesUpdate;
    };
    projects: {
      Row: ProjectsRow;
      Insert: ProjectsInsert;
      Update: ProjectsUpdate;
    };
    project_freelancers: {
      Row: ProjectFreelancersRow;
      Insert: ProjectFreelancersInsert;
      Update: ProjectFreelancersUpdate;
    };
    project_tasks: {
      Row: ProjectTasksRow;
      Insert: ProjectTasksInsert;
      Update: ProjectTasksUpdate;
    };
    project_triage: {
      Row: ProjectTriageRow;
      Insert: ProjectTriageInsert;
      Update: ProjectTriageUpdate;
    };
    project_expenses: {
      Row: ProjectExpensesRow;
      Insert: ProjectExpensesInsert;
      Update: ProjectExpensesUpdate;
    };
    freelancer_payouts: {
      Row: FreelancerPayoutsRow;
      Insert: FreelancerPayoutsInsert;
      Update: FreelancerPayoutsUpdate;
    };
    project_contracts: {
      Row: ProjectContractsRow;
      Insert: ProjectContractsInsert;
      Update: ProjectContractsUpdate;
    };
    contract_models: {
      Row: ContractModelsRow;
      Insert: ContractModelsInsert;
      Update: ContractModelsUpdate;
    };
    generated_contracts: {
      Row: GeneratedContractsRow;
      Insert: GeneratedContractsInsert;
      Update: GeneratedContractsUpdate;
    };
    freelancers: {
      Row: FreelancersRow;
      Insert: FreelancersInsert;
      Update: FreelancersUpdate;
    };
    freelancer_documents: {
      Row: FreelancerDocumentsRow;
      Insert: FreelancerDocumentsInsert;
      Update: FreelancerDocumentsUpdate;
    };
    client_documents: {
      Row: ClientDocumentsRow;
      Insert: ClientDocumentsInsert;
      Update: ClientDocumentsUpdate;
    };
  };
}

export type ClientDocumentType =
  "contrato_assinado" | "comprovante_pagamento" | "cartao_cnpj" | "outro";

export interface ClientDocumentsRow {
  id: string;
  client_id: string;
  project_id: string | null;
  document_type: ClientDocumentType;
  file_path: string;
  file_url: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  review_notes: string | null;
  uploaded_at: string;
}

export interface ClientDocumentsInsert {
  id?: string;
  client_id: string;
  project_id?: string | null;
  document_type: ClientDocumentType;
  file_path: string;
  file_url?: string | null;
  status?: "pendente" | "aprovado" | "rejeitado";
  review_notes?: string | null;
  uploaded_at?: string;
}

export interface ClientDocumentsUpdate {
  client_id?: string;
  project_id?: string | null;
  document_type?: ClientDocumentType;
  file_path?: string;
  file_url?: string | null;
  status?: "pendente" | "aprovado" | "rejeitado";
  review_notes?: string | null;
  uploaded_at?: string;
}
