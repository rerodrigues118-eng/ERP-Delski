export type TransactionType = "income" | "expense";
export type TransactionStatus = "paid" | "pending" | "cancelled";

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  category: string;
  description: string;
  payment_method?: string | null;
  sales_id?: string | null;
  project_id?: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}
