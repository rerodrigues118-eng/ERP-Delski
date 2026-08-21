import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSales, useSalesGoals, useSalesMetrics } from "@/hooks/useSales";
import { SalesKpiCards } from "@/components/sales/SalesKpiCards";
import { SalesGoalTracker } from "@/components/sales/SalesGoalTracker";
import { SalesCharts } from "@/components/sales/SalesCharts";
import { SalesTable } from "@/components/sales/SalesTable";
import { NewSaleModal } from "@/components/sales/NewSaleModal";
import { SetGoalModal } from "@/components/sales/SetGoalModal";
import { GoalPeriodType } from "@/types/sales";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/app/vendas")({
  head: () => ({
    meta: [{ title: "Vendas & Metas — DELSKI CLOUD" }],
  }),
  component: VendasPage,
});

function VendasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, isGestor, loading: authLoading } = useAuth();

  const [periodType, setPeriodType] = useState<GoalPeriodType>("monthly");
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [setGoalModalOpen, setSetGoalModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: goals = [] } = useSalesGoals();
  const { metrics, activeGoal } = useSalesMetrics(periodType);

  // Access control
  useEffect(() => {
    if (!authLoading && !isGestor && profile?.role !== "admin") {
      navigate({ to: "/app", replace: true });
    }
  }, [authLoading, isGestor, profile, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sales"] }),
      queryClient.invalidateQueries({ queryKey: ["sales-goals"] }),
    ]);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Dados de vendas atualizados!");
    }, 400);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentRealized =
    periodType === "weekly" ? metrics.totalWeekSales : metrics.totalMonthSales;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Gestão de Vendas & Performance
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Acompanhamento de conversão, metas financeiras, pipeline e origem de novos clientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 rounded-xl border-border bg-card shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setNewSaleModalOpen(true)}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Registrar Venda
          </Button>
        </div>
      </motion.div>

      {/* 1. KPI Cards Header */}
      <SalesKpiCards metrics={metrics} periodType={periodType} />

      {/* 2. Goal Tracking Hero Module */}
      <SalesGoalTracker
        goal={activeGoal}
        currentRealized={currentRealized}
        periodType={periodType}
        onPeriodChange={setPeriodType}
        onOpenSetGoalModal={() => setSetGoalModalOpen(true)}
      />

      {/* 3. Interactive Charts (Weekly Evolution & Channels Donut) */}
      <SalesCharts sales={sales} periodType={periodType} />

      {/* 4. Sales Records Table and Filters */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Histórico de Vendas & Propostas
            </h2>
            <p className="text-xs text-muted-foreground">
              Transações comerciais registradas e acompanhamento individual
            </p>
          </div>
        </div>

        <SalesTable
          sales={sales}
          isLoading={salesLoading}
          onOpenNewSaleModal={() => setNewSaleModalOpen(true)}
        />
      </div>

      {/* Modals */}
      <NewSaleModal open={newSaleModalOpen} onOpenChange={setNewSaleModalOpen} />
      <SetGoalModal
        open={setGoalModalOpen}
        onOpenChange={setSetGoalModalOpen}
        defaultPeriod={periodType}
      />
    </div>
  );
}
