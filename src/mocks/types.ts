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

export type TaskStatus = "Pendente" | "Em andamento" | "Concluida" | "Bloqueada";
export const TASK_STATUSES: TaskStatus[] = ["Pendente", "Em andamento", "Concluida", "Bloqueada"];

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  phase?: string; // Phase 1, Phase 2, Phase 3
  status: TaskStatus;
  startDate: string; // ISO yyyy-mm-dd
  dueDate: string;
  baselineStart?: string;
  baselineDue?: string;
  predecessorId?: string;
  createdAt: string;
}

export type ApplicationStatus = "Pendente" | "Respondida" | "Selecionada" | "Recusada";

export interface ProjectApplication {
  id: string;
  projectId: string;
  freelancerId?: string;
  token: string;
  status: ApplicationStatus;
  invitedAt: string;
  respondedAt?: string;
  freelancerName?: string;
  freelancerEmail?: string;
  skills?: string[];
  availabilityHours?: number;
  portfolioUrl?: string;
  proposedRate?: number;
  notes?: string;
  score?: number;
}

export interface ProjectTriageResponse {
  token: string;
  projectId: string;
  freelancerName: string;
  freelancerEmail: string;
  skills: string[];
  availabilityHours: number;
  portfolioUrl: string;
  proposedRate: number;
  notes?: string;
  score: number;
  status: "Rascunho" | "Enviado" | "Aprovado" | "Rejeitado";
  submittedAt: string;
}

export interface ProjectBriefingSections {
  overview: string;
  technicalSpecs: string;
  repositoryNotes: string;
}

export interface Project {
  id: string;
  client: string;
  type: ServiceType;
  description: string;
  briefing?: string; // Markdown or overview
  briefingSections?: ProjectBriefingSections;
  deadline: string;
  budget: number;
  freelancerCost?: number;
  referenceLink?: string;
  status: ProjectStatus;
  freelancerId?: string;
  clientId?: string;
  driveLink?: string;
  publicToken?: string;
  clientToken?: string;
  clientFeedback?: ClientFeedback[];
  files: ProjectFile[];
  history: HistoryEntry[];
  createdAt: string;
  lastStatusChangeAt?: string;
}

export type Role = "gestor" | "freelancer" | "cliente";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  freelancerId?: string;
  clientId?: string;
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
