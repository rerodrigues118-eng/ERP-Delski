import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Trash2,
  Briefcase,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Pencil,
  Loader2,
  FileText,
  ExternalLink,
  Filter,
  UploadCloud,
  FileCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDeletePayout } from "@/hooks/useExpenses";
import {
  useFreelancerFinanceProjects,
  useClienteFinanceProjects,
  useGestorFinanceProjects,
  type Project,
} from "@/hooks/useProjects";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  type ExpenseCategory,
  type ExpenseStatus,
} from "@/mocks/types";

export const Route = createFileRoute("/app/finance")({
  head: () => ({
    meta: [
      { title: "Financeiro — DELSKI CLOUD" },
      {
        name: "description",
        content: "Receitas, despesas, repasses de freelancers e investimento do cliente.",
      },
    ],
  }),
  component: FinancePage,
});

const money = (n: number) =>
  `R$\u00A0${(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type PayoutStatus = "pendente" | "pago" | "agendado";

interface FreelancerPayout {
  id: string;
  project_id: string;
  freelancer_id: string | null;
  amount: number;
  due_date: string | null;
  payment_date: string | null;
  status: PayoutStatus | string;
  payment_receipt_path: string | null;
  payment_receipt_url: string | null;
  created_at: string;
  updated_at?: string;
  isVirtual?: boolean;
  project?: { id: string; title: string; service_type: string; status: string } | null;
  freelancer?: { id: string; full_name: string; email: string } | null;
}

function paymentStatusFrom({
  status,
  due_date,
}: {
  status?: string;
  due_date?: string | null;
}) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "pago" || normalized === "freelancer pago") {
    return { label: "Freelancer Pago", color: "emerald" };
  }
  if (normalized === "agendado") return { label: "Agendado", color: "amber" };
  if (!due_date) return { label: "Pendente", color: "rose" };
  const now = new Date();
  const due = new Date(due_date);
  if (now > due) return { label: "Atrasado", color: "rose" };
  return { label: "A Pagar", color: "amber" };
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "freelancer", label: "Pagamento freelancer" },
  { value: "ads", label: "Verba de anúncios" },
  { value: "ferramentas", label: "Ferramentas / SaaS" },
  { value: "outros", label: "Outros" },
];
const STATUSES: ExpenseStatus[] = ["Pendente", "Aprovado", "Pago"];

// ── Skeleton Loader Neutro Guard (Evita Vazamento de Dados na Troca de Sessão) ──
function FinanceSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-stone-200" />
          <Skeleton className="h-4 w-96 bg-stone-100" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-28 bg-stone-200" />
              <Skeleton className="h-8 w-36 bg-stone-200" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-card p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48 bg-stone-200" />
          <Skeleton className="h-10 w-full bg-stone-100" />
          <Skeleton className="h-10 w-full bg-stone-100" />
        </div>
      </Card>
    </div>
  );
}

// ── 1. Visão Exclusiva do FREELANCER (RBAC Isolado) ─────────────────────────
function FreelancerFinanceView({ user }: { user: any }) {
  const { data: projects = [], isLoading } = useFreelancerFinanceProjects(user?.id, user?.email);

  // Fetch this freelancer's payout records to show real payment status
  const { data: payouts = [] } = useQuery<any[]>({
    queryKey: ["freelancer_payouts_self", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("freelancer_payouts")
        .select("*")
        .eq("freelancer_id", user.id);
      return data ?? [];
    },
  });

  // Map project_id -> payout record for quick lookup
  const payoutByProject = useMemo(() => {
    const map = new Map<string, any>();
    payouts.forEach((p: any) => map.set(p.project_id, p));
    return map;
  }, [payouts]);

  const totalFreelancerCost = useMemo(() => {
    return projects.reduce((a, p) => a + Number(p.freelancer_cost || 0), 0);
  }, [projects]);

  // Paid amount = sum of projects whose payout status is "pago"
  const paidFreelancerCost = useMemo(() => {
    return projects
      .filter((p) => {
        const payout = payoutByProject.get(p.id);
        return payout?.status === "pago" || p.status === "Concluido";
      })
      .reduce((a, p) => a + Number(p.freelancer_cost || 0), 0);
  }, [projects, payoutByProject]);

  const pendingFreelancerCost = totalFreelancerCost - paidFreelancerCost;

  if (isLoading) return <FinanceSkeleton />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sua Remuneração & Repasses</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe os repasses acordados por projeto alocado e histórico de recebimento.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-indigo-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Sua Remuneração Total
                </div>
                <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {money(totalFreelancerCost)}
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-emerald-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Recebido / Pago
                </div>
                <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {money(paidFreelancerCost)}
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-amber-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  A Receber (Em Andamento)
                </div>
                <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {money(pendingFreelancerCost)}
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Projetos Alocados</div>
                <div className="mt-2 text-2xl font-bold text-foreground">{projects.length}</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold">Meus Projetos & Repasses Acordados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3">Projeto</th>
                  <th className="text-left px-4 py-3">Serviço</th>
                  <th className="text-left px-4 py-3">Status do Projeto</th>
                  <th className="text-right px-4 py-3">Seu Repasse (R$)</th>
                  <th className="text-right px-4 py-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-foreground">{p.title}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-xs">
                        {SERVICE_LABEL[p.service_type] || p.service_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="secondary" className="text-xs">
                        {STATUS_LABEL[p.status] || p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                      {money(Number(p.freelancer_cost || 0))}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {(() => {
                        const payout = payoutByProject.get(p.id);
                        const isPago = payout?.status === "pago";
                        const paymentDate = payout?.payment_date
                          ? new Date(payout.payment_date).toLocaleDateString("pt-BR")
                          : null;
                        return (
                          <Badge
                            className={`text-xs ${
                              isPago
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : p.status === "Concluido"
                                ? "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {isPago
                              ? paymentDate
                                ? `Pago em ${paymentDate}`
                                : "Pago"
                              : p.status === "Concluido"
                              ? "Liberado / Quitado"
                              : "A Receber na Conclusão"}
                          </Badge>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum projeto alocado ao seu perfil.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 2. Visão Exclusiva do CLIENTE (RBAC Isolado) ────────────────────────────
function ClienteFinanceView({ user }: { user: any }) {
  const { data: projects = [], isLoading } = useClienteFinanceProjects(user?.id, user?.email);

  const totalBudget = useMemo(() => {
    return projects.reduce((a, p) => a + Number(p.budget || 0), 0);
  }, [projects]);

  if (isLoading) return <FinanceSkeleton />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro do Seu Contrato</h1>
          <p className="text-sm text-muted-foreground">
            Consulte o investimento total contratado e o demonstrativo das suas demandas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-card border-emerald-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Investimento Total Contratado
                </div>
                <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {money(totalBudget)}
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-indigo-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Situação dos Pagamentos
                </div>
                <div className="mt-2 text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-5 w-5" /> Regular / Adimplente
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Projetos Contratados
                </div>
                <div className="mt-2 text-3xl font-bold text-foreground">{projects.length}</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold">Investimentos por Projeto</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3">Projeto</th>
                  <th className="text-left px-4 py-3">Modalidade</th>
                  <th className="text-left px-4 py-3">Status do Projeto</th>
                  <th className="text-right px-4 py-3">Investimento Contratado</th>
                  <th className="text-right px-4 py-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-foreground">{p.title}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-xs">
                        {SERVICE_LABEL[p.service_type] || p.service_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="secondary" className="text-xs">
                        {STATUS_LABEL[p.status] || p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                      {money(Number(p.budget || 0))}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                        Acordo Ativo
                      </Badge>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum projeto registrado no seu perfil.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 3. Visão Exclusiva do GESTOR (Corporate Revenue & Margins) ────────────────
function GestorFinanceView() {
  const { data: projects = [], isLoading } = useGestorFinanceProjects();
  const storeExpenses = useStore((s) => s.expenses);
  const freelancersStore = useStore((s) => s.freelancers);
  const addExpense = useStore((s) => s.addExpense);
  const updateExpenseStatus = useStore((s) => s.updateExpenseStatus);
  const removeExpense = useStore((s) => s.removeExpense);
  const deletePayout = useDeletePayout();

  const queryClient = useQueryClient();

  // ── Database Expenses Query ────────────────────────────────────────────────
  // ── Database Expenses Query ────────────────────────────────────────────────
  const { data: dbExpenses = [] } = useQuery({
    queryKey: ["project_expenses"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("project_expenses")
          .select("*, project:projects(id, title)")
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch {
        // Fallback
      }

      try {
        const { data: adminData } = await supabaseAdmin
          .from("project_expenses")
          .select("*, project:projects(id, title)")
          .order("created_at", { ascending: false });
        return adminData ?? [];
      } catch (err) {
        console.warn("DB expenses query fallback:", err);
        return [];
      }
    },
  });

  // Combine database expenses and local store expenses, avoiding duplicate IDs
  const combinedExpenses = useMemo(() => {
    const map = new Map<string, any>();
    storeExpenses.forEach((e) => {
      map.set(e.id, {
        id: e.id,
        description: e.description,
        category: e.category,
        amount: e.amount,
        status: e.status,
        projectId: e.projectId,
      });
    });
    dbExpenses.forEach((e: any) => {
      map.set(e.id, {
        id: e.id,
        description: e.description,
        category: e.category,
        amount: Number(e.amount || 0),
        status: e.status || "Pendente",
        projectId: e.project_id,
        projectName: e.project?.title,
      });
    });
    return Array.from(map.values());
  }, [storeExpenses, dbExpenses]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editBudget, setEditBudget] = useState("");
  const [editAdditionalCosts, setEditAdditionalCosts] = useState("");
  const [isSavingProjectFinance, setIsSavingProjectFinance] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    description: "",
    amount: "",
    category: "freelancer" as ExpenseCategory,
    freelancerId: "",
    status: "Pendente" as ExpenseStatus,
  });

  // Payouts filter state: 'all' | 'pending' | 'paid'
  const [payoutFilter, setPayoutFilter] = useState<"all" | "pending" | "paid">("all");

  // Payment modal state for payouts management
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<FreelancerPayout | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const perProject = useMemo(
    () =>
      projects.map((p) => {
        const freelancerCost = Number(p.freelancer_cost || 0);
        const additionalCost = Number(p.additional_costs || 0);
        const projectExpenses = combinedExpenses
          .filter((e) => e.projectId === p.id)
          .reduce((a, b) => a + b.amount, 0);
        const totalCost = freelancerCost + additionalCost + projectExpenses;
        const budget = Number(p.budget || 0);
        const profit = budget - totalCost;
        const margin = budget ? (profit / budget) * 100 : 0;
        return {
          ...p,
          freelancerCost,
          additionalCost,
          cost: totalCost,
          profit,
          margin,
        };
      }),
    [projects, combinedExpenses],
  );

  const totals = useMemo(() => {
    const revenue = projects.reduce((a, p) => a + Number(p.budget || 0), 0);

    const statusStr = (s: string) => (s || "").toString().toLowerCase();
    const owed = projects
      .filter((p) => !statusStr(p.status).includes("concluid"))
      .reduce((a, p) => a + Number(p.freelancer_cost || 0), 0);

    const paidFromProjects = projects
      .filter((p) => statusStr(p.status).includes("concluid"))
      .reduce((a, p) => a + Number(p.freelancer_cost || 0), 0);
    const paidFromExpenses = combinedExpenses
      .filter((e) => e.status === "Pago")
      .reduce((a, e) => a + e.amount, 0);
    const paid = paidFromProjects + paidFromExpenses;

    const totalFreelancerCosts = projects.reduce((a, p) => a + Number(p.freelancer_cost || 0), 0);
    const totalAdditionalCosts = projects.reduce((a, p) => a + Number(p.additional_costs || 0), 0);
    const totalExpenses = combinedExpenses.reduce((a, e) => a + e.amount, 0);

    const totalCosts = totalFreelancerCosts + totalAdditionalCosts + totalExpenses;
    const profit = revenue - totalCosts;

    return { revenue, paid, owed, profit };
  }, [projects, combinedExpenses]);

  // Fetch payouts (gestor) and enrich with project / freelancer info
  const { data: dbPayouts = [], isLoading: payoutsLoading } = useQuery<FreelancerPayout[]>({
    queryKey: ["freelancer_payouts"],
    queryFn: async () => {
      try {
        const clientToUse = supabase;
        const { data: rows, error } = await clientToUse
          .from("freelancer_payouts")
          .select("*")
          .order("due_date", { ascending: true });
        
        let prs = rows ?? [];
        if (prs.length === 0) {
          const { data: adminRows } = await supabaseAdmin
            .from("freelancer_payouts")
            .select("*")
            .order("due_date", { ascending: true });
          prs = adminRows ?? [];
        }

        if (prs.length === 0) return [];

        const projectIds = Array.from(new Set(prs.map((r) => r.project_id).filter(Boolean)));
        const freelancerIds = Array.from(
          new Set(prs.map((r) => r.freelancer_id).filter(Boolean)),
        );

        const [{ data: projectsData }, { data: profilesData }] = await Promise.all([
          projectIds.length
            ? supabaseAdmin
                .from("projects")
                .select("id,title,service_type,status")
                .in("id", projectIds)
            : Promise.resolve({ data: [] as any[] }),
          freelancerIds.length
            ? supabaseAdmin.from("profiles").select("id,full_name,email").in("id", freelancerIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const projectMap = new Map((projectsData ?? []).map((p: any) => [p.id, p]));
        const profileMap = new Map((profilesData ?? []).map((p: any) => [p.id, p]));

        return prs.map((r) => ({
          ...r,
          project: projectMap.get(r.project_id) || null,
          freelancer: profileMap.get(r.freelancer_id) || null,
        }));
      } catch (err) {
        console.warn("DB payouts query fallback:", err);
        return [];
      }
    },
    staleTime: 1000 * 60,
  });

  // Combine DB payouts + virtual payouts for any project with costs/freelancers
  const allPayouts = useMemo(() => {
    const list: FreelancerPayout[] = [...dbPayouts];
    const coveredProjectIds = new Set(dbPayouts.map((p) => p.project_id));

    projects.forEach((proj: any) => {
      if (proj.freelancers && proj.freelancers.length > 0) {
        proj.freelancers.forEach((fl: any) => {
          const flProfile = fl.profile || fl;
          const flId = flProfile?.id || "";
          const alreadyInDb = dbPayouts.some(
            (p) => p.project_id === proj.id && p.freelancer_id === flId,
          );
          if (!alreadyInDb) {
            list.push({
              id: `virtual_${proj.id}_${flId || Math.random()}`,
              project_id: proj.id,
              freelancer_id: flId || null,
              amount: Number(proj.freelancer_cost || 0),
              due_date: proj.deadline || null,
              payment_date: proj.status === "Concluido" ? proj.created_at : null,
              status: proj.status === "Concluido" ? "pago" : "pendente",
              payment_receipt_path: null,
              payment_receipt_url: null,
              created_at: proj.created_at || new Date().toISOString(),
              isVirtual: true,
              project: {
                id: proj.id,
                title: proj.title,
                service_type: proj.service_type,
                status: proj.status,
              },
              freelancer: flProfile
                ? { id: flProfile.id, full_name: flProfile.full_name, email: flProfile.email }
                : { id: "", full_name: "Freelancer do Projeto", email: "" },
            });
          }
        });
      } else if (Number(proj.freelancer_cost || 0) > 0 && !coveredProjectIds.has(proj.id)) {
        list.push({
          id: `virtual_${proj.id}_auto`,
          project_id: proj.id,
          freelancer_id: null,
          amount: Number(proj.freelancer_cost || 0),
          due_date: proj.deadline || null,
          payment_date: proj.status === "Concluido" ? proj.created_at : null,
          status: proj.status === "Concluido" ? "pago" : "pendente",
          payment_receipt_path: null,
          payment_receipt_url: null,
          created_at: proj.created_at || new Date().toISOString(),
          isVirtual: true,
          project: {
            id: proj.id,
            title: proj.title,
            service_type: proj.service_type,
            status: proj.status,
          },
          freelancer: { id: "", full_name: "Freelancer do Projeto", email: "" },
        });
      }
    });

    return list;
  }, [dbPayouts, projects]);

  const visiblePayouts = useMemo(() => {
    if (payoutFilter === "pending") {
      return allPayouts.filter((p) => String(p.status).toLowerCase() !== "pago");
    }
    if (payoutFilter === "paid") {
      return allPayouts.filter((p) => String(p.status).toLowerCase() === "pago");
    }
    return allPayouts;
  }, [allPayouts, payoutFilter]);

  const payoutTotals = useMemo(
    () => ({
      paid: allPayouts.reduce(
        (sum, payout) =>
          String(payout.status).toLowerCase() === "pago" ? sum + Number(payout.amount || 0) : sum,
        0,
      ),
      owed: allPayouts.reduce(
        (sum, payout) =>
          String(payout.status).toLowerCase() !== "pago" ? sum + Number(payout.amount || 0) : sum,
        0,
      ),
    }),
    [allPayouts],
  );

  const handleOpenEditModal = (p: any) => {
    setEditingProject(p);
    setEditBudget(String(p.budget || 0));
    setEditAdditionalCosts(String(p.additional_costs || 0));
    setEditModalOpen(true);
  };

  const handleSaveProjectFinance = async () => {
    if (!editingProject) return;
    const newBudget = Number(editBudget);
    const newAdditionalCosts = Number(editAdditionalCosts);
    if (isNaN(newBudget) || newBudget < 0)
      return toast.error("Digite um orçamento de receita válido.");
    if (isNaN(newAdditionalCosts) || newAdditionalCosts < 0)
      return toast.error("Digite um custo adicional válido.");

    setIsSavingProjectFinance(true);
    try {
      await supabase
        .from("projects")
        .update({ budget: newBudget, additional_costs: newAdditionalCosts })
        .eq("id", editingProject.id);

      queryClient.invalidateQueries({ queryKey: ["finance", "gestor"] });
      toast.success("Financeiro do projeto atualizado com sucesso!");
      setEditModalOpen(false);
    } catch {
      toast.error("Erro ao atualizar o financeiro do projeto.");
    } finally {
      setIsSavingProjectFinance(false);
    }
  };

  const submitExpense = async () => {
    if (!form.projectId || !form.description || !form.amount)
      return toast.error("Preencha projeto, descrição e valor.");

    const amountNum = Number(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) return toast.error("Informe um valor válido.");

    try {
      await supabase.from("project_expenses").insert({
        project_id: form.projectId,
        description: form.description,
        amount: amountNum,
        category: form.category,
        status: form.status,
        freelancer_id:
          form.category === "freelancer" && form.freelancerId ? form.freelancerId : null,
      });
      queryClient.invalidateQueries({ queryKey: ["project_expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "gestor"] });
    } catch (err) {
      console.warn("DB expense insert fallback:", err);
    }

    addExpense({
      projectId: form.projectId,
      description: form.description,
      amount: amountNum,
      category: form.category,
      status: form.status,
      freelancerId: form.category === "freelancer" ? form.freelancerId || undefined : undefined,
    });

    toast.success("Despesa registrada com sucesso!");
    setOpenAdd(false);
    setForm({
      projectId: "",
      description: "",
      amount: "",
      category: "freelancer",
      freelancerId: "",
      status: "Pendente",
    });
  };

  const handleUpdateExpenseStatus = async (id: string, newStatus: ExpenseStatus) => {
    updateExpenseStatus(id, newStatus);
    try {
      await supabase.from("project_expenses").update({ status: newStatus }).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["project_expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "gestor"] });
    } catch (err) {
      console.warn("DB expense update status fallback:", err);
    }
    toast.success(`Status da despesa atualizado para "${newStatus}".`);
  };

  const handleDeleteExpense = async (id: string) => {
    removeExpense(id);
    try {
      await supabase.from("project_expenses").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["project_expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "gestor"] });
    } catch (err) {
      console.warn("DB expense delete fallback:", err);
    }
    toast.success("Despesa removida com sucesso.");
  };

  const openPaymentDialog = (payout: any) => {
    setSelectedPayout(payout);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentFile(null);
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayout) return;

    setIsProcessingPayment(true);
    try {
      let uploadPath: string | null = null;
      let publicUrl: string | null = null;

      // Upload receipt file to Storage bucket 'receipts'
      if (paymentFile) {
        try {
          const ext = paymentFile.name.split(".").pop()?.toLowerCase() || "jpg";
          // Path inside the bucket: {payoutId_or_projectId}_{timestamp}.{ext}
          const fileId = selectedPayout.id.startsWith("virtual_")
            ? selectedPayout.project_id
            : selectedPayout.id;
          const storagePath = `${fileId}_${Date.now()}.${ext}`;

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("receipts")
            .upload(storagePath, paymentFile, { upsert: true, contentType: paymentFile.type });

          if (uploadErr) {
            console.warn("[Receipt Upload Error]", uploadErr);
            toast.error(`Aviso: comprovante não foi anexado — ${uploadErr.message}`);
          } else if (uploadData) {
            uploadPath = uploadData.path;
            const { data: urlData } = supabase.storage
              .from("receipts")
              .getPublicUrl(uploadData.path);
            publicUrl = urlData?.publicUrl || null;
          }
        } catch (err) {
          console.warn("[Storage upload exception]", err);
        }
      }

      const basePayload: Record<string, unknown> = {
        project_id: selectedPayout.project_id,
        freelancer_id: selectedPayout.freelancer_id || null,
        amount: Number(selectedPayout.amount || 0),
        due_date: selectedPayout.due_date || new Date().toISOString(),
        payment_date: paymentDate,
        status: "pago",
        updated_at: new Date().toISOString(),
      };

      const fullPayload = {
        ...basePayload,
        payment_receipt_path: uploadPath,
        payment_receipt_url: publicUrl,
      };

      let opError: any = null;
      if (selectedPayout.id && !selectedPayout.id.startsWith("virtual_")) {
        // Update existing real payout row
        const { error } = await supabase
          .from("freelancer_payouts")
          .update(fullPayload)
          .eq("id", selectedPayout.id);
        opError = error;
      } else {
        // Insert new payout row for a virtual (project-derived) entry
        const { error } = await supabase.from("freelancer_payouts").insert(fullPayload);
        opError = error;
      }

      // If column 'payment_receipt_path' does not exist in DB yet, fallback to base payload
      if (
        opError &&
        (opError.message?.includes("payment_receipt") || opError.code === "PGRST204" || opError.code === "42703")
      ) {
        console.warn("[Payment Fallback] Missing receipt column, attempting base payload:", opError);
        if (selectedPayout.id && !selectedPayout.id.startsWith("virtual_")) {
          const { error: fallbackErr } = await supabase
            .from("freelancer_payouts")
            .update(basePayload)
            .eq("id", selectedPayout.id);
          if (fallbackErr) throw fallbackErr;
        } else {
          const { error: fallbackErr } = await supabase
            .from("freelancer_payouts")
            .insert(basePayload);
          if (fallbackErr) throw fallbackErr;
        }
      } else if (opError) {
        throw opError;
      }

      toast.success("Pagamento registrado com sucesso!");
      setPaymentModalOpen(false);
      setPaymentFile(null);
      setPayoutFilter("paid"); // Switch view to 'Pagos' tab automatically
      queryClient.invalidateQueries({ queryKey: ["freelancer_payouts"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "gestor"] });
    } catch (err: any) {
      console.error("[handleConfirmPayment]", err);
      toast.error(err?.message || "Erro ao registrar pagamento.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (isLoading) return <FinanceSkeleton />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro Corporativo</h1>
          <p className="text-sm text-muted-foreground">
            Receitas, custos, margem de lucro por projeto e pagamentos de freelancers.
          </p>
        </div>

        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
              <Plus className="h-4 w-4" /> Nova despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Registrar nova despesa</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Lance uma despesa associada a um projeto ou categoria.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Projeto</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Descrição</Label>
                <Input
                  placeholder="Ex: Entrega landing page / Meta Ads"
                  className="text-xs"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor (R$)</Label>
                <Input
                  type="number"
                  placeholder="1500"
                  className="text-xs"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as ExpenseCategory }))}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.category === "freelancer" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Freelancer</Label>
                  <Select
                    value={form.freelancerId}
                    onValueChange={(v) => setForm((f) => ({ ...f, freelancerId: v }))}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Selecione um freelancer" />
                    </SelectTrigger>
                    <SelectContent>
                      {freelancersStore.map((fl) => (
                        <SelectItem key={fl.id} value={fl.id}>
                          {fl.name} ({(fl as any).role || (fl as any).specialty || "Freelancer"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Inicial</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as ExpenseStatus }))}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setOpenAdd(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={submitExpense}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                Salvar Despesa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground font-medium">Receita total</div>
                <div className="mt-1.5 text-lg sm:text-xl font-bold text-foreground break-all">
                  {money(totals.revenue)}
                </div>
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground font-medium">Já pago</div>
                <div className="mt-1.5 text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 break-all">
                  {money(payoutTotals.paid)}
                </div>
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Wallet className="h-4.5 w-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground font-medium">A pagar (freelas)</div>
                <div className="mt-1.5 text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 break-all">
                  {money(payoutTotals.owed)}
                </div>
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                <TrendingDown className="h-4.5 w-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground font-medium">Lucro estimado</div>
                <div className="mt-1.5 text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 break-all">
                  {money(totals.profit)}
                </div>
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profit" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="profit">Lucro por projeto</TabsTrigger>
          <TabsTrigger value="expenses">Despesas ({combinedExpenses.length})</TabsTrigger>
          <TabsTrigger value="freelancers">
            Pagamentos de freelas ({allPayouts.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: LUCRO POR PROJETO */}
        <TabsContent value="profit">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Receita vs custo por projeto</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3">Cliente / Projeto</th>
                      <th className="text-left px-4 py-3">Tipo</th>
                      <th className="text-right px-4 py-3">Receita</th>
                      <th className="text-right px-4 py-3">Custo Total</th>
                      <th className="text-right px-4 py-3">Lucro</th>
                      <th className="text-right px-4 py-3">Margem</th>
                      <th className="text-right px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {perProject.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-foreground">
                          {p.title}
                          {p.client?.full_name && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {p.client.full_name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="outline" className="text-xs">
                            {SERVICE_LABEL[p.service_type] || p.service_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium">
                          {money(p.budget || 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-rose-500 font-medium">
                          {money(p.cost)}
                        </td>
                        <td
                          className={`px-4 py-3.5 text-right font-extrabold ${
                            p.profit >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-500"
                          }`}
                        >
                          {money(p.profit)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium">
                          {p.margin.toFixed(0)}%
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(p)}
                            title="Editar Financeiro do Projeto"
                            className="h-8 w-8 p-0 text-stone-500 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: LANÇAMENTOS DE DESPESAS */}
        <TabsContent value="expenses">
          <Card className="bg-card border border-stone-200">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold text-stone-900">
                  Lançamentos de despesas
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Despesas operacionais, verba de anúncios e pagamentos gerais de serviços.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setOpenAdd(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Nova despesa
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50/80 text-[11px] uppercase tracking-wider text-stone-500 border-y border-stone-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold">Descrição</th>
                      <th className="text-left px-4 py-3 font-bold">Categoria</th>
                      <th className="text-right px-4 py-3 font-bold">Valor</th>
                      <th className="text-left px-4 py-3 font-bold">Status</th>
                      <th className="text-right px-4 py-3 font-bold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {combinedExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-stone-900">
                          <div>{e.description}</div>
                          {e.projectName && (
                            <span className="text-[11px] font-normal text-stone-500">
                              Projeto: {e.projectName}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 capitalize text-xs text-stone-600">
                          <Badge variant="outline" className="text-xs font-normal">
                            {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-stone-900">
                          {money(e.amount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Select
                            value={e.status}
                            onValueChange={(st) =>
                              handleUpdateExpenseStatus(e.id, st as ExpenseStatus)
                            }
                          >
                            <SelectTrigger className="w-32 h-8 text-xs bg-white border-stone-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            onClick={() => handleDeleteExpense(e.id)}
                            title="Remover despesa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {combinedExpenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-sm text-stone-500">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <FileText className="h-8 w-8 text-stone-300" />
                            <p className="font-semibold text-stone-700">Nenhuma despesa lançada</p>
                            <p className="text-xs text-stone-400">
                              Clique no botão "+ Nova despesa" para registrar lançamentos.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => setOpenAdd(true)}
                              className="mt-2 bg-indigo-600 text-white text-xs"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Criar Lançamento
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PAGAMENTOS DE FREELANCERS */}
        <TabsContent value="freelancers">
          <Card className="bg-card border border-stone-200">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold text-stone-900">
                  Pagamentos de freelas
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gerencie prazos de pagamento, faça o envio de comprovantes e monitore quitações.
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
                <Button
                  size="sm"
                  variant={payoutFilter === "all" ? "default" : "ghost"}
                  onClick={() => setPayoutFilter("all")}
                  className={`text-xs h-7 px-3 rounded-lg font-medium ${
                    payoutFilter === "all"
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Todos ({allPayouts.length})
                </Button>
                <Button
                  size="sm"
                  variant={payoutFilter === "pending" ? "default" : "ghost"}
                  onClick={() => setPayoutFilter("pending")}
                  className={`text-xs h-7 px-3 rounded-lg font-medium ${
                    payoutFilter === "pending"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-amber-700"
                  }`}
                >
                  A Pagar ({allPayouts.filter((p) => String(p.status).toLowerCase() !== "pago").length})
                </Button>
                <Button
                  size="sm"
                  variant={payoutFilter === "paid" ? "default" : "ghost"}
                  onClick={() => setPayoutFilter("paid")}
                  className={`text-xs h-7 px-3 rounded-lg font-medium ${
                    payoutFilter === "paid"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-emerald-700"
                  }`}
                >
                  Pagos ({allPayouts.filter((p) => String(p.status).toLowerCase() === "pago").length})
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50/80 text-[11px] uppercase tracking-wider text-stone-500 border-y border-stone-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold">Projeto</th>
                      <th className="text-left px-4 py-3 font-bold">Freelancer</th>
                      <th className="text-right px-4 py-3 font-bold">Valor Acordado</th>
                      <th className="text-left px-4 py-3 font-bold">Prazo de Pagamento</th>
                      <th className="text-left px-4 py-3 font-bold">Status do Pagamento</th>
                      <th className="text-left px-4 py-3 font-bold">Comprovante</th>
                      <th className="text-right px-4 py-3 font-bold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {visiblePayouts.map((p: FreelancerPayout) => {
                      const statusInfo = paymentStatusFrom({
                        status: p.status,
                        due_date: p.due_date,
                      });
                      const isPaid = String(p.status).toLowerCase() === "pago";

                      return (
                        <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-stone-900">
                            {p.project?.title || "Projeto da Agência"}
                            {p.project?.service_type && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-[10px] font-medium">
                                  {SERVICE_LABEL[p.project.service_type] || p.project.service_type}
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-stone-800">
                            {p.freelancer?.full_name || "Freelancer Alocado"}
                            {p.freelancer?.email && (
                              <span className="block text-[11px] font-normal text-stone-500">
                                {p.freelancer.email}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-amber-600 dark:text-amber-400">
                            {money(Number(p.amount || 0))}
                          </td>
                          <td className="px-4 py-3.5 text-stone-600 text-xs">
                            {p.due_date
                              ? new Date(p.due_date).toLocaleDateString("pt-BR")
                              : "Na Conclusão"}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              className={`text-xs px-2.5 py-0.5 font-semibold ${
                                isPaid
                                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                  : statusInfo.color === "amber"
                                  ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-700 border-rose-500/30"
                              }`}
                            >
                              {isPaid ? "Pago" : statusInfo.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            {p.payment_receipt_url ? (
                              <a
                                href={p.payment_receipt_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Ver comprovante
                              </a>
                            ) : (
                              <span className="text-xs text-stone-400">Sem comprovante</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right flex items-center justify-end gap-1.5">
                            {isPaid ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPaymentDialog(p)}
                                className="text-xs font-semibold h-8 border-stone-200 text-stone-700"
                              >
                                Editar Repasse
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => openPaymentDialog(p)}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8 px-4 shadow-sm"
                              >
                                Pagar / Anexar
                              </Button>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                              onClick={() => {
                                if (window.confirm("Deseja realmente apagar este registro de pagamento de freela?")) {
                                  deletePayout.mutate(p.id);
                                }
                              }}
                              title="Remover pagamento de freela"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}

                    {visiblePayouts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-stone-500">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Wallet className="h-8 w-8 text-stone-300" />
                            <p className="font-semibold text-stone-700">
                              Nenhum repasse registrado para o filtro selecionado
                            </p>
                            <p className="text-xs text-stone-400">
                              Os repasses de freelancers serão listados automaticamente ao criar projetos.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment Modal */}
          <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
            <DialogContent className="sm:max-w-lg bg-white">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600" /> Registrar Pagamento de Freelancer
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  Confirme o repasse do valor acordado e anexe o comprovante (PIX / Transferência).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider">
                    Projeto & Freelancer
                  </span>
                  <div className="font-bold text-stone-900 text-sm">
                    {selectedPayout?.project?.title || "Projeto"}
                  </div>
                  <div className="text-stone-600">
                    Freelancer: {selectedPayout?.freelancer?.full_name || "Não especificado"}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                  <span className="font-semibold text-emerald-800">Valor a ser Pago:</span>
                  <span className="font-extrabold text-base text-emerald-700">
                    {money(Number(selectedPayout?.amount || 0))}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payment-date" className="text-xs font-semibold text-stone-700">
                    Data do Pagamento
                  </Label>
                  <Input
                    id="payment-date"
                    type="date"
                    className="bg-white border-stone-200 text-xs"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                    <span>Anexar Comprovante (PDF, PNG, JPG)</span>
                    {paymentFile && (
                      <span className="text-[11px] font-normal text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Comprovante Selecionado
                      </span>
                    )}
                  </Label>

                  {!paymentFile ? (
                    <label
                      htmlFor="payment-file"
                      className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/70 transition-all rounded-xl cursor-pointer p-4 text-center"
                    >
                      <div className="p-2.5 rounded-full bg-indigo-100/80 group-hover:bg-indigo-200 text-indigo-600 transition-colors mb-2">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-stone-800 group-hover:text-indigo-700">
                        Clique ou arraste o comprovante aqui
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Formatos aceitos: PDF, PNG, JPG (máx. 10MB)
                      </p>
                      <Input
                        id="payment-file"
                        type="file"
                        accept="application/pdf,image/*"
                        className="sr-only"
                        onChange={(e) => setPaymentFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50/60 rounded-xl">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                          <FileCheck className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-stone-900 truncate">
                            {paymentFile.name}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {(paymentFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setPaymentFile(null)}
                        className="h-7 px-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 text-xs shrink-0"
                        title="Remover arquivo"
                      >
                        <X className="h-4 w-4 mr-1" /> Remover
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentModalOpen(false)}
                  className="border-stone-200 text-stone-700 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={isProcessingPayment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processando...
                    </>
                  ) : (
                    "Confirmar Pagamento"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Edit Project Finance Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-700" /> Editar Financeiro do Projeto
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Altere a Receita (Orçamento) e inclua Custos Adicionais para o cálculo preciso de
              Custo Total e Lucro.
            </DialogDescription>
          </DialogHeader>

          {editingProject && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                  Projeto
                </span>
                <p className="text-sm font-bold text-stone-900">{editingProject.title}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-budget" className="text-xs font-semibold text-stone-700">
                  Receita do Projeto (R$)
                </Label>
                <Input
                  id="edit-budget"
                  type="number"
                  placeholder="0.00"
                  className="bg-white border-stone-200 text-sm focus-visible:ring-blue-900"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-additional-costs"
                  className="text-xs font-semibold text-stone-700"
                >
                  Custos Adicionais / Despesas Extras (R$)
                </Label>
                <Input
                  id="edit-additional-costs"
                  type="number"
                  placeholder="0.00"
                  className="bg-white border-stone-200 text-sm focus-visible:ring-blue-900"
                  value={editAdditionalCosts}
                  onChange={(e) => setEditAdditionalCosts(e.target.value)}
                />
              </div>

              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs space-y-1.5 text-stone-700">
                <div className="flex justify-between">
                  <span>Pagamento Freelancer:</span>
                  <span className="font-semibold">
                    {money(Number(editingProject.freelancer_cost || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Custos Adicionais:</span>
                  <span className="font-semibold">{money(Number(editAdditionalCosts || 0))}</span>
                </div>
                <div className="flex justify-between border-t border-blue-200/60 pt-1 font-bold text-stone-900">
                  <span>Custo Total Estimado:</span>
                  <span className="text-rose-600">
                    {money(
                      Number(editingProject.freelancer_cost || 0) +
                        Number(editAdditionalCosts || 0),
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-stone-900">
                  <span>Lucro Estimado:</span>
                  <span className="text-emerald-700">
                    {money(
                      Number(editBudget || 0) -
                        (Number(editingProject.freelancer_cost || 0) +
                          Number(editAdditionalCosts || 0)),
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              className="border-stone-200 text-stone-700"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveProjectFinance}
              disabled={isSavingProjectFinance}
              className="bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white font-medium shadow-sm"
            >
              {isSavingProjectFinance ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Componente Principal / Guard Estrito de RBAC ─────────────────────────────
function FinancePage() {
  const { user, loading, isGestor, isFreelancer, isCliente } = useAuth();

  // Guard Neutro: Enquanto o estado do usuário/sessão carrega, NUNCA renderizar dados
  if (loading || !user) {
    return <FinanceSkeleton />;
  }

  // Renderização 100% isolada por papel (Sem vazamento de estado ou cache de gestor)
  if (isFreelancer) {
    return <FreelancerFinanceView user={user} />;
  }

  if (isCliente) {
    return <ClienteFinanceView user={user} />;
  }

  if (isGestor) {
    return <GestorFinanceView />;
  }

  return <FinanceSkeleton />;
}
