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
  files: ProjectFile[];
  history: HistoryEntry[];
  createdAt: string;
}

export type Role = "gestor" | "freelancer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  freelancerId?: string;
}
