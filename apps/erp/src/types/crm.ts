import { ServiceType } from "@/mocks/types";
import { SalesChannel } from "@/types/sales";

export type CrmLeadStage =
  | "novo_lead"
  | "qualificacao"
  | "reuniao"
  | "proposta"
  | "fechado"
  | "perdido";

export type LeadTemperature = "quente" | "morno" | "frio";

export interface CrmLead {
  id: string;
  name: string;
  contact: string;
  phone?: string;
  email?: string;
  service: ServiceType;
  estimatedValue: number;
  stage: CrmLeadStage;
  temperature: LeadTemperature;
  channel: SalesChannel;
  seller_name?: string;
  notes?: string;
  meetingDate?: string | null;
  convertedSaleId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmMicroMetrics {
  newLeadsToday: number;
  meetingsThisWeek: number;
  openPipelineAmount: number;
  closedMonthAmount: number;
  sdrConversionRate: number;
  totalLeads: number;
}
