import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSales, useSalesGoals, useSalesMetrics } from "@/hooks/useSales";
import { useCrmMetrics, useUpdateCrmLeadStage } from "@/hooks/useCrmLeads";
import { CrmLead } from "@/types/crm";
import { GoalPeriodType, SalesChannel } from "@/types/sales";
import { SalesKpiCards } from "@/components/sales/SalesKpiCards";
import { SalesGoalTracker } from "@/components/sales/SalesGoalTracker";
import { SalesCharts } from "@/components/sales/SalesCharts";
import { SalesTable } from "@/components/sales/SalesTable";
import { NewSaleModal, NewSaleFormValues } from "@/components/sales/NewSaleModal";
import { SetGoalModal } from "@/components/sales/SetGoalModal";
import { CrmMicroKpis } from "@/components/crm/CrmMicroKpis";
import { CrmKanban } from "@/components/crm/CrmKanban";
import { NewLeadModal } from "@/components/crm/NewLeadModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Sparkles,
  UserPlus,
  BarChart3,
  ListOrdered,
  Layers,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface VendasSearch {
  tab?: string;
}

export const Route = createFileRoute("/app/vendas")({
  validateSearch: (search: Record<string, unknown>): VendasSearch => {
    return {
      tab: (search?.tab as string) || "crm",
    };
  },
  head: () => ({
    meta: [{ title: "Ecossistema de Vendas — DELSKI CLOUD" }],
  }),
  component: VendasPage,
});

function VendasPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const activeTab = search?.tab === "dashboard" || search?.tab === "historico" ? search.tab : "crm";

  const queryClient = useQueryClient();
  const { profile, isGestor, loading: authLoading } = useAuth();

  const [periodType, setPeriodType] = useState<GoalPeriodType>("monthly");
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [setGoalModalOpen, setSetGoalModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Lead sendo convertido em venda
  const [leadToConvert, setLeadToConvert] = useState<CrmLead | null>(null);
  const [saleInitialValues, setSaleInitialValues] = useState<Partial<NewSaleFormValues> | undefined>(undefined);

  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: goals = [] } = useSalesGoals();
  const { metrics, activeGoal } = useSalesMetrics(periodType);
  const { metrics: crmMetrics } = useCrmMetrics();
  const updateLeadStageMutation = useUpdateCrmLeadStage();

  // Access control
  useEffect(() => {
    if (!authLoading && !isGestor && profile?.role !== "admin") {
      navigate({ to: "/app", replace: true });
    }
  }, [authLoading, isGestor, profile, navigate]);

  const handleTabChange = (val: string) => {
    navigate({
      search: (prev: any) => ({ ...prev, tab: val }),
      replace: true,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sales"] }),
      queryClient.invalidateQueries({ queryKey: ["sales-goals"] }),
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] }),
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["finance"] }),
    ]);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Dados de vendas e CRM sincronizados!");
    }, 400);
  };

  const handleConvertLeadToSale = (lead: CrmLead) => {
    setLeadToConvert(lead);
    setSaleInitialValues({
      client_name: lead.name,
      service_name: `Projeto de ${lead.service}`,
      amount: lead.estimatedValue,
      channel: (lead.channel as SalesChannel) || "inbound",
      seller_name: lead.seller_name || "Gestor Comercial",
      status: "concluida",
      payment_terms: "À vista (PIX)",
      notes: lead.notes ? `Convertido do Lead CRM: ${lead.notes}` : undefined,
    });
    setNewSaleModalOpen(true);
  };

  const handleSaleSuccessCallback = async () => {
    if (leadToConvert) {
      await updateLeadStageMutation.mutateAsync({
        id: leadToConvert.id,
        stage: "fechado",
      });
      setLeadToConvert(null);
      setSaleInitialValues(undefined);
      toast.success("Lead marcado como Ganho e faturamento sincronizado!");
    }
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
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16">
      {/* Page Header - Refinado: Sem ícone circular e sem subtítulo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Ecossistema de Vendas
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            variant="outline"
            onClick={() => setNewLeadModalOpen(true)}
            className="gap-1.5 rounded-xl border-border bg-card text-foreground font-semibold shadow-xs hover:border-primary/50"
          >
            <UserPlus className="h-3.5 w-3.5 text-primary" />
            + Novo Lead
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setLeadToConvert(null);
              setSaleInitialValues(undefined);
              setNewSaleModalOpen(true);
            }}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Registrar Venda
          </Button>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="bg-card p-1.5 rounded-xl border border-border shadow-xs overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex gap-1 min-w-max">
            <TabsTrigger
              value="crm"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <Layers className="h-4 w-4" /> Funil de Vendas (CRM)
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" /> Dashboard & Metas
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <ListOrdered className="h-4 w-4" /> Histórico de Vendas
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── ABA 1: FUNIL DE VENDAS (CRM) ─────────────────────────── */}
        <TabsContent value="crm" className="space-y-6 focus-visible:outline-none">
          {/* Micro KPIs de SDR */}
          <CrmMicroKpis metrics={crmMetrics} />

          {/* Kanban Board */}
          <CrmKanban onConvertLeadToSale={handleConvertLeadToSale} />
        </TabsContent>

        {/* ── ABA 2: DASHBOARD & METAS ────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-6 focus-visible:outline-none">
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
        </TabsContent>

        {/* ── ABA 3: HISTÓRICO DE VENDAS ──────────────────────────── */}
        <TabsContent value="historico" className="space-y-4 focus-visible:outline-none">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Histórico de Vendas
            </h2>
          </div>

          <SalesTable
            sales={sales}
            isLoading={salesLoading}
            onOpenNewSaleModal={() => {
              setLeadToConvert(null);
              setSaleInitialValues(undefined);
              setNewSaleModalOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <NewLeadModal open={newLeadModalOpen} onOpenChange={setNewLeadModalOpen} />
      <NewSaleModal
        open={newSaleModalOpen}
        onOpenChange={setNewSaleModalOpen}
        initialValues={saleInitialValues}
        onSuccessCallback={handleSaleSuccessCallback}
      />
      <SetGoalModal
        open={setGoalModalOpen}
        onOpenChange={setSetGoalModalOpen}
        defaultPeriod={periodType}
      />
    </div>
  );
}
