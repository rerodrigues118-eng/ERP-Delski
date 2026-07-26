export type ServiceType = "IA" | "Trafego" | "Sites";
export type ProjectStatus =
  | "Solicitado"
  | "Delegado"
  | "Em Producao"
  | "Em Revisao"
  | "Concluido";

export const SERVICE_TYPES: ServiceType[] = ["IA", "Trafego", "Sites"];
export const STATUSES: ProjectStatus[] = [
  "Solicitado",
  "Delegado",
  "Em Producao",
  "Em Revisao",
  "Concluido",
];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  Solicitado: "Solicitado",
  Delegado: "Delegado",
  "Em Producao": "Em Produção",
  "Em Revisao": "Em Revisão",
  Concluido: "Concluído",
};

export const SERVICE_LABEL: Record<ServiceType, string> = {
  IA: "Automação com IA",
  Trafego: "Tráfego / Social Media",
  Sites: "Desenvolvimento de Sites",
};

export interface Freelancer {
  id: string;
  name: string;
  email: string;
  skills: ServiceType[];
  active: boolean;
  createdAt: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface HistoryEntry {
  id: string;
  at: string;
  actor: string;
  message: string;
}

export interface Project {
  id: string;
  client: string;
  type: ServiceType;
  description: string;
  deadline: string;
  budget: number;
  referenceLink?: string;
  status: ProjectStatus;
  freelancerId?: string;
  driveLink?: string;
  publicToken?: string;
  clientToken?: string;
  clientFeedback?: ClientFeedback[];
  files: ProjectFile[];
  history: HistoryEntry[];
  createdAt: string;
  lastStatusChangeAt?: string;
}

export type Role = "gestor" | "freelancer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  freelancerId?: string;
}

export type LeadStage = "Prospeccao" | "Reuniao" | "Proposta" | "Fechado" | "Perdido";
export const LEAD_STAGES: LeadStage[] = ["Prospeccao", "Reuniao", "Proposta", "Fechado", "Perdido"];
export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  Prospeccao: "Prospecção",
  Reuniao: "Reunião agendada",
  Proposta: "Proposta enviada",
  Fechado: "Fechado",
  Perdido: "Perdido",
};

export interface Lead {
  id: string;
  name: string;
  contact: string;
  service: ServiceType;
  estimatedValue: number;
  stage: LeadStage;
  notes?: string;
  createdAt: string;
  convertedProjectId?: string;
}

export type ExpenseCategory = "freelancer" | "ads" | "ferramentas" | "outros";
export type ExpenseStatus = "Pendente" | "Aprovado" | "Pago";

export interface Expense {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  status: ExpenseStatus;
  freelancerId?: string;
  createdAt: string;
}

export type ClientDecision = "aprovado" | "ajuste";

export interface ClientFeedback {
  id: string;
  decision: ClientDecision;
  message?: string;
  at: string;
}

export interface WikiArticle {
  id: string;
  title: string;
  category: "IA" | "Trafego" | "Sites" | "Geral";
  content: string;
  updatedAt: string;
}
