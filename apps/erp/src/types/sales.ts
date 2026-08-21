export type SaleStatus = "concluida" | "em_negociacao" | "cancelada";

export type SalesChannel =
  | "inbound"
  | "sdr_whatsapp"
  | "indicacao"
  | "parceiros"
  | "outbound"
  | "outro";

export type GoalPeriodType = "weekly" | "monthly";

export interface Sale {
  id: string;
  client_name: string;
  service_name: string;
  service_id?: string | null;
  amount: number;
  status: SaleStatus;
  channel: SalesChannel;
  payment_terms?: string | null;
  seller_id?: string | null;
  seller_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesGoal {
  id: string;
  period_type: GoalPeriodType;
  target_amount: number;
  current_amount: number;
  start_date: string;
  end_date: string;
  seller_id?: string | null;
  team_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesMetrics {
  totalMonthSales: number;
  totalWeekSales: number;
  monthGrowthPercentage: number;
  weekGrowthPercentage: number;
  averageTicket: number;
  conversionRate: number;
  totalDeals: number;
  closedDeals: number;
  negotiationDeals: number;
  activeGoal: SalesGoal | null;
  goalProgressPercentage: number;
  remainingGoalAmount: number;
}

export interface SalesFilterState {
  search: string;
  period: "all" | "this_week" | "this_month" | "last_30_days";
  status: "all" | SaleStatus;
  channel: "all" | SalesChannel;
  sellerId: "all" | string;
}
