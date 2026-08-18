export type ServiceType = "IA" | "Trafego" | "Sites" | "Social Media";
export type ProjectStatus =
  | "Criado"
  | "Solicitado"
  | "Aguardando Candidaturas"
  | "Emitir contrato"
  | "Revisão de Contrato"
  | "Delegado"
  | "Em Producao"
  | "Concluido";

export const SERVICE_TYPES: ServiceType[] = ["IA", "Trafego", "Sites", "Social Media"];
export const STATUSES: ProjectStatus[] = [
  "Criado",
  "Solicitado",
  "Aguardando Candidaturas",
  "Emitir contrato",
  "Revisão de Contrato",
  "Delegado",
  "Em Producao",
  "Concluido",
];

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  Criado: "Criado",
  Solicitado: "Solicitado",
  "Aguardando Candidaturas": "Aguardando Candidaturas",
  "Emitir contrato": "Emitir contrato",
  "Revisão de Contrato": "Revisão de Contrato",
  Concluido: "Concluído",
  "Em Producao": "Em Produção",
  Delegado: "Delegado",
};

// Muted service badge styles — soft background, colored text, thin border
export const SERVICE_BADGE_COLORS: Record<ServiceType, string> = {
  IA: "bg-purple-50 text-purple-800 border-purple-200 font-semibold",
  Trafego: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
  Sites: "bg-blue-50 text-blue-800 border-blue-200 font-semibold",
  "Social Media": "bg-rose-50 text-rose-800 border-rose-200 font-semibold",
};

export const STATUS_BADGE_COLORS: Record<ProjectStatus, string> = {
  Criado: "bg-slate-100 text-slate-700 border-slate-200 font-semibold",
  Solicitado: "bg-sky-50 text-sky-800 border-sky-200 font-semibold",
  "Aguardando Candidaturas": "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
  "Emitir contrato": "bg-purple-50 text-purple-800 border-purple-200 font-semibold",
  "Revisão de Contrato": "bg-yellow-50 text-yellow-800 border-yellow-200 font-semibold",
  Delegado: "bg-teal-50 text-teal-800 border-teal-200 font-semibold",
  "Em Producao": "bg-blue-50 text-blue-800 border-blue-200 font-semibold",
  Concluido: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold",
};

export const SERVICE_LABEL: Record<ServiceType, string> = {
  IA: "Automação com IA",
  Trafego: "Tráfego Pago",
  Sites: "Desenvolvimento de Sites",
  "Social Media": "Social Media",
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

export type ExpenseCategory =
  | "apis"
  | "ferramentas"
  | "ads"
  | "ia_automacao"
  | "influencers"
  | "aquisicao_leads"
  | "dominios_infra"
  | "freelancers"
  | "freelancer"
  | "custos_fixos"
  | "infra"
  | "escritorio"
  | "impostos"
  | "equipamentos"
  | "outros";

export type ExpenseNature = "fixo" | "variavel";
export type ExpenseStatus = "Pendente" | "Aprovado" | "Pago";

export interface Expense {
  id: string;
  projectId?: string | null;
  description: string;
  amount: number;
  category: ExpenseCategory;
  nature?: ExpenseNature;
  dueDate?: string | null;
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
  audience?: "todos" | "freelancers" | "clientes" | "gestor";
  attachmentUrl?: string | null;
  createdBy?: string | null;
}
