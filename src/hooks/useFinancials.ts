import { useProjects } from "./useProjects";

export interface FinancialSummary {
  totalRevenue: number;
  totalFreelancerCost: number;
  netMargin: number;
  marginPercentage: number;
  projectCount: number;
  completedCount: number;
}

export function useFinancials() {
  const { data: projects = [], isLoading, error } = useProjects();

  const totalRevenue = projects.reduce((acc, p) => acc + (Number(p.budget) || 0), 0);
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
  };

  return {
    summary,
    projects,
    isLoading,
    error,
  };
}
