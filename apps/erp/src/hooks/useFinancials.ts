import { useProjects } from "./useProjects";
import { useSales } from "./useSales";

export interface FinancialSummary {
  totalRevenue: number;
  totalFreelancerCost: number;
  netMargin: number;
  marginPercentage: number;
  projectCount: number;
  completedCount: number;
  salesRevenue: number;
  cashRevenue: number;
}

export function useFinancials() {
  const { data: projects = [], isLoading: projectsLoading, error } = useProjects();
  const { data: sales = [], isLoading: salesLoading } = useSales();

  // Closed/Approved Sales Revenue
  const salesRevenue = sales
    .filter((s) => s.status === "concluida")
    .reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  // Liquidated Cash Revenue (À vista / Pix / Concluído)
  const cashRevenue = sales
    .filter((s) => s.status === "concluida" || (s.payment_terms || "").toLowerCase().includes("vista") || (s.payment_terms || "").toLowerCase().includes("pix"))
    .reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  const projectsBudget = projects.reduce((acc, p) => acc + (Number(p.budget) || 0), 0);
  
  // Single Source of Truth: Total Revenue from Sales (or projects if no sales recorded)
  const totalRevenue = salesRevenue > 0 ? salesRevenue : projectsBudget;

  const totalFreelancerCost = projects.reduce(
    (acc, p) => acc + (Number(p.freelancer_cost) || 0),
    0,
  );
  const netMargin = totalRevenue - totalFreelancerCost;
  const marginPercentage = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;
  const completedCount = projects.filter((p) => p.status === "Concluido").length;

  const summary: FinancialSummary = {
    totalRevenue,
    totalFreelancerCost,
    netMargin,
    marginPercentage,
    projectCount: projects.length,
    completedCount,
    salesRevenue,
    cashRevenue,
  };

  return {
    summary,
    projects,
    sales,
    isLoading: projectsLoading || salesLoading,
    error,
  };
}
