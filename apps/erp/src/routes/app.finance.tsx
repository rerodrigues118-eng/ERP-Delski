import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Receipt,
  FileCode,
  CheckCheck,
  XOctagon,
  RotateCcw,
  Send,
  FileSpreadsheet,
  Building,
  Download,
  Search,
  Clock,
  Zap,
  Wrench,
  Megaphone,
  Bot,
  Sparkles,
  Target,
  Globe,
  Users,
  Package,
  FolderKanban,
  Tag,
  Calculator,
  AlertCircle,
  Calendar,
  Layers,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Percent,
  Scale,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  ReceiptText,
  CircleAlert,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import { useDeletePayout } from "@/hooks/useExpenses";
import { exportAccountingPDF, exportAccountingCSV } from "@/lib/accountingExport";
import {
  useFreelancerFinanceProjects,
  useClienteFinanceProjects,
  useGestorFinanceProjects,
  type Project,
} from "@/hooks/useProjects";
import {
  useEmittedServiceInvoices,
  useEmitServiceInvoice,
  useCancelServiceInvoice,
  useRetryServiceInvoice,
  type EmittedServiceInvoiceItem,
} from "@/hooks/useServiceInvoices";
import { useClientsList } from "@/hooks/useClients";
import { useSales } from "@/hooks/useSales";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
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

export interface ExpenseCategoryConfig {
  value: ExpenseCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  badgeClass: string;
}

export const CATEGORIES: ExpenseCategoryConfig[] = [
  {
    value: "apis",
    label: "APIs & Webhooks",
    description: "OpenAI, Anthropic, WhatsApp API, gateways, etc.",
    icon: Zap,
    colorClass: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    value: "ferramentas",
    label: "Ferramentas & Softwares (SaaS)",
    description: "Hospedagem, Vercel, Supabase, Adobe, Figma",
    icon: Wrench,
    colorClass: "text-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    value: "ads",
    label: "Tráfego Pago & Mídia",
    description: "Meta Ads, Google Ads, TikTok Ads",
    icon: Megaphone,
    colorClass: "text-rose-500",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    value: "ia_automacao",
    label: "Ferramentas de IA & Automação",
    description: "ChatGPT Enterprise, Make, Zapier, Midjourney",
    icon: Bot,
    colorClass: "text-indigo-500",
    badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  {
    value: "influencers",
    label: "Influencers & Criadores de Conteúdo",
    description: "Parcerias, publis, afiliados",
    icon: Sparkles,
    colorClass: "text-pink-500",
    badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  },
  {
    value: "aquisicao_leads",
    label: "Aquisição de Leads & Prospecção",
    description: "Bases de dados, scrapers, cold mail",
    icon: Target,
    colorClass: "text-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    value: "dominios_infra",
    label: "Domínios & Infraestrutura de Sites",
    description: "Registros, SSL, servidores",
    icon: Globe,
    colorClass: "text-cyan-500",
    badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  {
    value: "freelancers",
    label: "Freelancers & Prestadores de Serviço",
    description: "Serviços e repasses a freelancers",
    icon: Users,
    colorClass: "text-violet-500",
    badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  {
    value: "custos_fixos",
    label: "Custos Operacionais Fixos",
    description: "Aluguel, contabilidade, utilidades",
    icon: Building2,
    colorClass: "text-slate-500",
    badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
  {
    value: "outros",
    label: "Outras Despesas Variáveis",
    description: "Despesas pontuais, deslocamento, taxas",
    icon: Package,
    colorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
];

export function getCategoryInfo(categoryKey?: string) {
  const cat = CATEGORIES.find((c) => c.value === categoryKey);
  if (cat) return cat;
  if (categoryKey === "freelancer") {
    return {
      value: "freelancers" as ExpenseCategory,
      label: "Freelancers & Prestadores de Serviço",
      description: "Serviços e repasses a freelancers",
      icon: Users,
      colorClass: "text-violet-500",
      badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    };
  }
  if (categoryKey === "infra") {
    return {
      value: "dominios_infra" as ExpenseCategory,
      label: "Domínios & Infraestrutura de Sites",
      description: "Registros, SSL, servidores",
      icon: Globe,
      colorClass: "text-cyan-500",
      badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    };
  }
  if (categoryKey === "escritorio" || categoryKey === "impostos" || categoryKey === "equipamentos") {
    return {
      value: "custos_fixos" as ExpenseCategory,
      label: "Custos Operacionais Fixos",
      description: "Aluguel, contabilidade, utilidades",
      icon: Building2,
      colorClass: "text-slate-500",
      badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    };
  }
  return {
    value: "outros" as ExpenseCategory,
    label: "Outras Despesas Variáveis",
    description: "Despesas pontuais, deslocamento, taxas",
    icon: Package,
    colorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  };
}

const NATURES: { value: ExpenseNature; label: string; description: string }[] = [
  { value: "variavel", label: "Gasto Variável / Pontual", description: "Gasto único ou demanda específica" },
  { value: "fixo", label: "Custo Fixo / Mensal", description: "Assinatura recorrente que se repete a cada mês" },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-indigo-500/20">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Sua Remuneração Total
                </div>
                <div className="mt-0.5 text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {money(totalFreelancerCost)}
                </div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-emerald-500/20">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Recebido / Pago
                </div>
                <div className="mt-0.5 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {money(paidFreelancerCost)}
                </div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-amber-500/20">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  A Receber (Em Andamento)
                </div>
                <div className="mt-0.5 text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {money(pendingFreelancerCost)}
                </div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Projetos Alocados</div>
                <div className="mt-0.5 text-xl sm:text-2xl font-bold text-foreground">{projects.length}</div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-subtle rounded-2xl">
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Meus Projetos & Extrato de Repasses
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Consulte o histórico de honorários por projeto, datas de liberação e comprovantes de transferência.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border font-semibold">
                <tr>
                  <th className="text-left px-4 py-3">Projeto</th>
                  <th className="text-left px-4 py-3">Serviço</th>
                  <th className="text-left px-4 py-3">Prazo do Projeto</th>
                  <th className="text-right px-4 py-3">Seu Repasse (R$)</th>
                  <th className="text-center px-4 py-3">Situação</th>
                  <th className="text-right px-4 py-3">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {projects.map((p) => {
                  const payout = payoutByProject.get(p.id);
                  const isPago = payout?.status === "pago" || p.status === "Concluido";
                  const paymentDate = payout?.payment_date ? formatDate(payout.payment_date) : null;
                  const receiptUrl = payout?.payment_receipt_url || null;

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-foreground">
                        <Link
                          to="/app/projects/$id"
                          params={{ id: p.id }}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="text-[10px]">
                          {SERVICE_LABEL[p.service_type] || p.service_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
                        {p.deadline ? formatDate(p.deadline) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                        {money(Number(p.freelancer_cost || 0))}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            payout?.status === "pago"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : p.status === "Concluido"
                              ? "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {payout?.status === "pago"
                            ? paymentDate
                              ? `Pago em ${paymentDate}`
                              : "Pago / Liquidado"
                            : p.status === "Concluido"
                            ? "Liberado / Quitado"
                            : "A Receber na Conclusão"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {receiptUrl ? (
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20"
                          >
                            <Download className="h-3 w-3" /> Comprovante
                          </a>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">Não anexado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum projeto alocado ao seu perfil no momento.
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

function ClienteFinanceView({ user }: { user: any }) {
  const { data: projects = [], isLoading } = useClienteFinanceProjects(user?.id, user?.email);
  const { data: clientNfses = [] } = useEmittedServiceInvoices();

  const totalBudget = useMemo(() => {
    return projects.reduce((a, p) => a + Number(p.budget || 0) + Number(p.setup_fee || 0), 0);
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-emerald-500/20">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Investimento Total Contratado
                </div>
                <div className="mt-0.5 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {money(totalBudget)}
                </div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-indigo-500/20">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Situação dos Pagamentos
                </div>
                <div className="mt-0.5 text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Regular / Adimplente
                </div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">
                  Projetos Contratados
                </div>
                <div className="mt-0.5 text-xl sm:text-2xl font-bold text-foreground">{projects.length}</div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Building2 className="h-4 w-4" />
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
                  <th className="text-right px-4 py-3">Mensalidade</th>
                  <th className="text-right px-4 py-3">Setup</th>
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
                    <td className="px-4 py-3.5 text-right font-semibold text-foreground">
                      {p.setup_fee ? money(Number(p.setup_fee)) : "—"}
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
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum projeto registrado no seu perfil.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notas Fiscais de Serviço (NFS-e) do Cliente */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-600" />
            Notas Fiscais de Serviço Emitidas ({clientNfses.filter((n) => n.status === "autorizada").length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clientNfses.length === 0 ? (
            <div className="p-8 text-center border-t border-dashed space-y-1">
              <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">
                Nenhuma nota fiscal de serviço emitida contra seu CNPJ até o momento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] border-b">
                  <tr>
                    <th className="text-left px-4 py-3">Número NFS-e</th>
                    <th className="text-left px-4 py-3">Cód. Verificação</th>
                    <th className="text-left px-4 py-3">Data Emissão</th>
                    <th className="text-left px-4 py-3">Descrição do Serviço</th>
                    <th className="text-right px-4 py-3">Valor Bruto</th>
                    <th className="text-right px-4 py-3">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clientNfses.map((nf) => (
                    <tr key={nf.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3.5 font-bold font-mono text-foreground">
                        {nf.number ? `NFS-e ${nf.number}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground">
                        {nf.verification_code || "—"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground whitespace-nowrap">
                        {formatDate(nf.issued_at)}
                      </td>
                      <td className="px-4 py-3.5 text-foreground max-w-xs truncate">
                        {nf.service_description}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-blue-600 whitespace-nowrap">
                        {money(Number(nf.service_value))}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                        {nf.pdf_url && (
                          <a
                            href={nf.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <Download className="h-3 w-3" /> PDF
                          </a>
                        )}
                        {nf.xml_url && (
                          <a
                            href={nf.xml_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          >
                            <FileCode className="h-3 w-3" /> XML
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── 3. Visão Exclusiva do GESTOR (Corporate Revenue & Margins) ────────────────
function GestorFinanceView() {
  const { data: projects = [], isLoading } = useGestorFinanceProjects();
  const { data: sales = [] } = useSales();
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
        nature: e.nature || "variavel",
        dueDate: e.dueDate || null,
        projectId: e.projectId || null,
        projectName: e.projectId ? undefined : "Corporativo (Empresa)",
      });
    });
    dbExpenses.forEach((e: any) => {
      map.set(e.id, {
        id: e.id,
        description: e.description,
        category: e.category,
        amount: Number(e.amount || 0),
        status: e.status || "Pendente",
        nature: e.nature || "variavel",
        dueDate: e.due_date || e.dueDate || null,
        projectId: e.project_id,
        projectName: e.project?.title || (e.project_id ? "Projeto Vinculado" : "Corporativo (Empresa)"),
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
    projectId: "none",
    description: "",
    amount: "",
    category: "ads" as ExpenseCategory,
    nature: "variavel" as ExpenseNature,
    dueDate: new Date().toISOString().slice(0, 10),
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

  // ── Emitted Service Invoices (NFS-e) Query & Mutations ─────────────────────
  const { data: emittedInvoices = [], isLoading: loadingNfse } = useEmittedServiceInvoices();
  const { data: clientsList = [] } = useClientsList();
  const emitNfse = useEmitServiceInvoice();
  const cancelNfse = useCancelServiceInvoice();
  const retryNfse = useRetryServiceInvoice();

  const [activeMainFinanceTab, setActiveMainFinanceTab] = useState<string>("geral");
  const [openNfseModal, setOpenNfseModal] = useState(false);
  const [nfseClientId, setNfseClientId] = useState("");
  const [nfseProjectId, setNfseProjectId] = useState("none");
  const [nfseServiceValue, setNfseServiceValue] = useState("");
  const [nfseDescription, setNfseDescription] = useState("");
  const [nfseCnaeCode, setNfseCnaeCode] = useState("6201-5/01");
  const [nfseItemLista, setNfseItemLista] = useState("01.07");
  const [nfseIssRate, setNfseIssRate] = useState("2.0");
  const [isSubmittingNfse, setIsSubmittingNfse] = useState(false);
  const [nfseFilterStatus, setNfseFilterStatus] = useState<string>("all");
  const [nfseSearch, setNfseSearch] = useState("");

  // ── Accounting & Advanced Reports States ──────────────────────────────────
  const [reportPeriod, setReportPeriod] = useState<
    "mes_atual" | "mes_anterior" | "trimestre" | "ano" | "custom"
  >("mes_atual");
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [reportRegime, setReportRegime] = useState<"competencia" | "caixa">("competencia");
  const [reportSubTab, setReportSubTab] = useState<
    "dre_dfc" | "inadimplencia" | "lucratividade" | "projecao" | "balanco" | "fiscal"
  >("dre_dfc");
  const [dreEvolutionYear, setDreEvolutionYear] = useState<string>(
    String(new Date().getFullYear())
  );
  const [dreEvolutionPeriod, setDreEvolutionPeriod] = useState<
    "all" | "q1" | "q2" | "q3" | "q4"
  >("all");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cogs: true,
    opex: true,
  });

  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [cancelingInvoice, setCancelingInvoice] = useState<EmittedServiceInvoiceItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const selectedClientInfo = useMemo(() => {
    if (!nfseClientId) return null;
    return (clientsList as any[]).find(
      (c: any) => c.id === nfseClientId || c.resolved_id === nfseClientId
    );
  }, [nfseClientId, clientsList]);

  const nfseTotals = useMemo(() => {
    const authorized = emittedInvoices.filter((i) => i.status === "autorizada");
    const totalBilled = authorized.reduce((acc, i) => acc + Number(i.service_value || 0), 0);
    const totalIss = authorized.reduce(
      (acc, i) => acc + Number(i.iss_value || (i.service_value * i.iss_rate) / 100 || 0),
      0
    );
    const pendingCount = emittedInvoices.filter(
      (i) => i.status === "processando" || i.status === "erro"
    ).length;
    return {
      totalBilled,
      totalCount: emittedInvoices.length,
      totalIss,
      pendingCount,
    };
  }, [emittedInvoices]);

  const filteredNfse = useMemo(() => {
    return emittedInvoices.filter((inv) => {
      if (nfseFilterStatus !== "all" && inv.status !== nfseFilterStatus) return false;
      if (nfseSearch.trim()) {
        const q = nfseSearch.toLowerCase();
        const num = (inv.number || "").toLowerCase();
        const clientName = (
          inv.client?.company_name ||
          inv.client?.full_name ||
          ""
        ).toLowerCase();
        const code = (inv.verification_code || "").toLowerCase();
        const desc = (inv.service_description || "").toLowerCase();
        return (
          num.includes(q) ||
          clientName.includes(q) ||
          code.includes(q) ||
          desc.includes(q)
        );
      }
      return true;
    });
  }, [emittedInvoices, nfseFilterStatus, nfseSearch]);

  const handleEmitNfseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfseClientId) return toast.error("Selecione o cliente tomador do serviço.");
    const val = Number(nfseServiceValue);
    if (isNaN(val) || val <= 0) return toast.error("Informe um valor de serviço válido.");
    if (!nfseDescription.trim()) return toast.error("Informe a descrição detalhada do serviço.");

    setIsSubmittingNfse(true);
    try {
      await emitNfse.mutateAsync({
        clientId: nfseClientId,
        projectId: nfseProjectId === "none" || !nfseProjectId ? null : nfseProjectId,
        serviceValue: val,
        serviceDescription: nfseDescription.trim(),
        cnaeCode: nfseCnaeCode.trim(),
        itemListaServico: nfseItemLista.trim(),
        issRate: Number(nfseIssRate) || 2.0,
      });

      setNfseClientId("");
      setNfseProjectId("none");
      setNfseServiceValue("");
      setNfseDescription("");
      setOpenNfseModal(false);
    } finally {
      setIsSubmittingNfse(false);
    }
  };

  const handleConfirmCancelNfse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelingInvoice) return;
    if (!cancelReason.trim()) return toast.error("Informe a justificativa do cancelamento.");

    await cancelNfse.mutateAsync({
      invoiceId: cancelingInvoice.id,
      reason: cancelReason.trim(),
    });

    setOpenCancelModal(false);
    setCancelingInvoice(null);
    setCancelReason("");
  };

  const perProject = useMemo(
    () =>
      projects.map((p) => {
        const budget = Number(p.budget || 0);
        const setupFee = Number(p.setup_fee || 0);
        const totalProjectRevenue = budget + setupFee;
        const freelancerCost = Number(p.freelancer_cost || 0);
        const directExpenses = combinedExpenses.filter((e) => e.projectId === p.id);
        const directExpensesTotal = directExpenses.reduce((a, b) => a + Number(b.amount || 0), 0);
        const totalCost = freelancerCost + directExpensesTotal;
        const profit = totalProjectRevenue - totalCost;
        const margin = totalProjectRevenue > 0 ? (profit / totalProjectRevenue) * 100 : 0;
        return {
          ...p,
          setupFee,
          totalProjectRevenue,
          freelancerCost,
          directExpensesTotal,
          directExpenses,
          cost: totalCost,
          profit,
          margin,
        };
      }),
    [projects, combinedExpenses],
  );

  const totals = useMemo(() => {
    // 1. Receita Total Estrita dos Projetos Ativos (/projetos) incluindo Taxa de Setup
    const projectsBudget = projects.reduce((a, p) => a + Number(p.budget || 0), 0);
    const totalSetupFees = projects.reduce((a, p) => a + Number(p.setup_fee || 0), 0);
    const completedSalesRevenue = sales
      .filter((s) => s.status === "concluida")
      .reduce((a, s) => a + Number(s.amount || 0), 0);

    const revenue = projects.length > 0 ? projectsBudget + totalSetupFees : completedSalesRevenue;

    // 2. Custos com Freelancers (Repasses acordados dos projetos)
    const freelancerCosts = projects.reduce((a, p) => a + Number(p.freelancer_cost || 0), 0);

    // 3. Despesas (Diretas de Projetos + Corporativas Gerais)
    const projectExpenses = combinedExpenses.filter((e) => Boolean(e.projectId));
    const corporateExpenses = combinedExpenses.filter((e) => !e.projectId);
    const projectExpensesTotal = projectExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
    const corporateExpensesTotal = corporateExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
    const totalExpenses = combinedExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);

    // 4. Lucro Real Consolidado e Margem Líquida
    const totalCosts = freelancerCosts + totalExpenses;
    const realProfit = revenue - totalCosts;
    const profitMargin = revenue > 0 ? (realProfit / revenue) * 100 : 0;

    return {
      revenue,
      totalSetupFees,
      freelancerCosts,
      totalExpenses,
      projectExpensesTotal,
      corporateExpensesTotal,
      projectExpensesCount: projectExpenses.length,
      corporateExpensesCount: corporateExpenses.length,
      realProfit,
      profitMargin,
    };
  }, [projects, combinedExpenses, sales]);

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

  // ── Accounting & Reports Date Range Calculation ───────────────────────────
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (reportPeriod === "mes_atual") {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start, end, label: format(start, "MMMM 'de' yyyy", { locale: ptBR }) };
    }
    if (reportPeriod === "mes_anterior") {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      return { start, end, label: format(start, "MMMM 'de' yyyy", { locale: ptBR }) };
    }
    if (reportPeriod === "trimestre") {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start, end: now, label: "Último Trimestre (90 dias)" };
    }
    if (reportPeriod === "ano") {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return { start, end, label: `Ano ${year} (YTD)` };
    }

    const start = customStartDate ? new Date(customStartDate + "T00:00:00") : new Date(year, month, 1);
    const end = customEndDate ? new Date(customEndDate + "T23:59:59") : now;
    return {
      start,
      end,
      label: `${formatDate(customStartDate || start.toISOString())} até ${formatDate(customEndDate || end.toISOString())}`,
    };
  }, [reportPeriod, customStartDate, customEndDate]);

  // ── Full Accounting Suite Calculation (DRE, DFC, Aging, Profitability, Runway, Balance, Fiscal) ──
  const accountingData = useMemo(() => {
    const { start, end, label } = dateRange;

    // 1. Projetos filtrados
    const filteredProjects = projects.filter((p) => {
      const d = new Date(p.created_at || (p as any).created_at);
      return d >= start && d <= end;
    });

    // 2. Despesas filtradas
    const filteredExpenses = combinedExpenses.filter((e) => {
      const d = new Date(e.dueDate ? e.dueDate + "T12:00:00" : Date.now());
      return d >= start && d <= end;
    });

    // 3. Payouts filtrados
    const filteredPayouts = allPayouts.filter((po) => {
      const targetDate = reportRegime === "caixa" ? (po.payment_date || po.due_date) : po.due_date;
      if (!targetDate) return true;
      const d = new Date(targetDate);
      return d >= start && d <= end;
    });

    // ── DRE (COMPETÊNCIA - Vendas Concluídas no período) ───────────────────
    const filteredSales = sales.filter((s) => {
      const d = new Date(s.created_at);
      return d >= start && d <= end;
    });

    const salesRevenueInRange = filteredSales
      .filter((s) => s.status === "concluida")
      .reduce((a, s) => a + Number(s.amount || 0), 0);

    const projectsRevenueInRange = filteredProjects.reduce((acc, p) => acc + Number(p.budget || 0), 0);
    const grossRevenue = salesRevenueInRange > 0 ? salesRevenueInRange : projectsRevenueInRange;

    // COGS (Custos Diretos dos Projetos)
    const projectExpensesList = filteredExpenses.filter((e) => Boolean(e.projectId));
    const cogsFreela = filteredPayouts.reduce((acc, po) => acc + Number(po.amount || 0), 0);
    const cogsApis = projectExpensesList.filter((e) => e.category === "apis").reduce((a, b) => a + Number(b.amount || 0), 0);
    const cogsAds = projectExpensesList.filter((e) => e.category === "ads").reduce((a, b) => a + Number(b.amount || 0), 0);
    const cogsDominios = projectExpensesList.filter((e) => e.category === "dominios_infra").reduce((a, b) => a + Number(b.amount || 0), 0);
    const cogsOther = projectExpensesList.filter((e) => !["apis", "ads", "dominios_infra"].includes(e.category)).reduce((a, b) => a + Number(b.amount || 0), 0);
    const totalDirectCosts = cogsFreela + cogsApis + cogsAds + cogsDominios + cogsOther;

    const grossProfit = grossRevenue - totalDirectCosts;
    const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    // OPEX (Despesas Operacionais Corporativas)
    const corporateExpensesList = filteredExpenses.filter((e) => !e.projectId);
    const opexSaas = corporateExpensesList.filter((e) => e.category === "ferramentas").reduce((a, b) => a + Number(b.amount || 0), 0);
    const opexIa = corporateExpensesList.filter((e) => e.category === "ia_automacao").reduce((a, b) => a + Number(b.amount || 0), 0);
    const opexMarketing = corporateExpensesList.filter((e) => e.category === "influencers" || e.category === "ads").reduce((a, b) => a + Number(b.amount || 0), 0);
    const opexLeads = corporateExpensesList.filter((e) => e.category === "aquisicao_leads").reduce((a, b) => a + Number(b.amount || 0), 0);
    const opexFixos = corporateExpensesList.filter((e) => e.category === "custos_fixos").reduce((a, b) => a + Number(b.amount || 0), 0);
    const opexOther = corporateExpensesList.filter((e) => !["ferramentas", "ia_automacao", "influencers", "ads", "aquisicao_leads", "custos_fixos"].includes(e.category)).reduce((a, b) => a + Number(b.amount || 0), 0);
    const totalOpex = opexSaas + opexIa + opexMarketing + opexLeads + opexFixos + opexOther;

    const netProfit = grossProfit - totalOpex;
    const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    // ── DFC (CAIXA - Entradas Liquidadas no período) ────────────────────────
    const cashInSales = filteredSales
      .filter((s) => s.status === "concluida" || (s.payment_terms || "").toLowerCase().includes("vista") || (s.payment_terms || "").toLowerCase().includes("pix"))
      .reduce((acc, s) => acc + Number(s.amount || 0), 0);

    const cashInProjects = filteredProjects.filter((p) => p.status === "Concluido" || p.status === "Em Andamento").reduce((acc, p) => acc + Number(p.budget || 0), 0);
    const cashIn = cashInSales > 0 ? cashInSales : cashInProjects;

    const cashOutDirect = filteredPayouts.filter((po) => String(po.status).toLowerCase() === "pago").reduce((acc, po) => acc + Number(po.amount || 0), 0) +
      projectExpensesList.filter((e) => e.status === "Pago").reduce((a, b) => a + Number(b.amount || 0), 0);
    const cashOutOpex = corporateExpensesList.filter((e) => e.status === "Pago").reduce((a, b) => a + Number(b.amount || 0), 0);
    const netCashFlow = cashIn - (cashOutDirect + cashOutOpex);

    // ── AGING LIST & INADIMPLÊNCIA ───────────────────────────────────────────
    const nowTime = Date.now();
    const agingList = projects.map((p) => {
      const deadlineDate = p.deadline ? new Date(p.deadline).getTime() : nowTime;
      const diffDays = Math.floor((nowTime - deadlineDate) / (1000 * 60 * 60 * 24));
      let bracket: "no_prazo" | "1_30" | "31_60" | "61_90_plus" = "no_prazo";
      if (diffDays > 60) bracket = "61_90_plus";
      else if (diffDays > 30) bracket = "31_60";
      else if (diffDays > 0) bracket = "1_30";

      const isPending = p.status !== "Concluido";
      return {
        id: p.id,
        title: p.title,
        clientName: p.client?.company_name || p.client?.full_name || "Cliente",
        clientEmail: p.client?.email || "",
        clientPhone: p.client?.phone || "",
        amount: Number(p.budget || 0),
        deadline: p.deadline,
        diffDays: Math.max(0, diffDays),
        bracket,
        isOverdue: isPending && diffDays > 0,
        status: p.status,
      };
    });

    const totalReceivables = agingList.reduce((a, b) => a + b.amount, 0);
    const overdueReceivables = agingList.filter((x) => x.isOverdue).reduce((a, b) => a + b.amount, 0);
    const defaultRate = totalReceivables > 0 ? (overdueReceivables / totalReceivables) * 100 : 0;

    // ── RANKING DE LUCRATIVIDADE ────────────────────────────────────────────
    const profitabilityRanking = projects
      .map((p) => {
        const rev = Number(p.budget || 0);
        const flCost = Number(p.freelancer_cost || 0);
        const directExp = combinedExpenses.filter((e) => e.projectId === p.id).reduce((a, b) => a + Number(b.amount || 0), 0);
        const totDirect = flCost + directExp;
        const marginNum = rev - totDirect;
        const marginPercent = rev > 0 ? (marginNum / rev) * 100 : 0;
        return {
          id: p.id,
          title: p.title,
          clientName: p.client?.company_name || p.client?.full_name || "Cliente",
          serviceType: p.service_type,
          revenue: rev,
          directCosts: totDirect,
          freelancerCost: flCost,
          directExpenses: directExp,
          margin: marginNum,
          marginPercent,
        };
      })
      .sort((a, b) => b.margin - a.margin);

    // ── PROJEÇÃO DE CONTAS A PAGAR (30, 60, 90 DIAS) ────────────────────────
    const fixedMonthlyExpenses = combinedExpenses.filter((e) => e.nature === "fixo").reduce((a, b) => a + Number(b.amount || 0), 0);
    const scheduledPayouts30 = allPayouts.filter((p) => p.status === "agendado" || p.status === "pendente").reduce((a, b) => a + Number(b.amount || 0), 0);

    const projection30 = fixedMonthlyExpenses + scheduledPayouts30;
    const projection60 = fixedMonthlyExpenses * 2 + scheduledPayouts30;
    const projection90 = fixedMonthlyExpenses * 3 + scheduledPayouts30;

    // ── BALANÇO PATRIMONIAL SIMPLIFICADO ────────────────────────────────────
    const assetsCash = Math.max(0, netCashFlow);
    const assetsReceivables = totalReceivables;
    const totalAssets = assetsCash + assetsReceivables;

    const liabilitiesPayable = combinedExpenses.filter((e) => e.status === "Pendente").reduce((a, b) => a + Number(b.amount || 0), 0);
    const liabilitiesFreelancers = allPayouts.filter((p) => String(p.status).toLowerCase() !== "pago").reduce((a, b) => a + Number(b.amount || 0), 0);
    const liabilitiesTaxesEstimated = grossRevenue * 0.06;
    const totalLiabilities = liabilitiesPayable + liabilitiesFreelancers + liabilitiesTaxesEstimated;

    const estimatedEquity = totalAssets - totalLiabilities;

    // ── FECHAMENTO FISCAL & CONTABILIDADE ───────────────────────────────────
    const nfseCount = emittedInvoices.length;
    const nfseTotalBilled = emittedInvoices.filter((i) => i.status === "autorizada").reduce((a, b) => a + Number(b.service_value || 0), 0);
    const byServiceType = {
      IA: filteredProjects.filter((p) => p.service_type === "IA").reduce((a, b) => a + Number(b.budget || 0), 0),
      Trafego: filteredProjects.filter((p) => p.service_type === "Trafego").reduce((a, b) => a + Number(b.budget || 0), 0),
      Sites: filteredProjects.filter((p) => p.service_type === "Sites").reduce((a, b) => a + Number(b.budget || 0), 0),
      SocialMedia: filteredProjects.filter((p) => p.service_type === "Social Media").reduce((a, b) => a + Number(b.budget || 0), 0),
    };
    const estimatedTaxes = {
      das: grossRevenue * 0.06,
      iss: grossRevenue * 0.02,
      irrf: grossRevenue * 0.015,
    };

    return {
      periodLabel: label,
      grossRevenue,
      cogs: {
        freela: cogsFreela,
        apis: cogsApis,
        ads: cogsAds,
        dominios: cogsDominios,
        other: cogsOther,
        total: totalDirectCosts,
      },
      grossProfit,
      grossMargin,
      opex: {
        saas: opexSaas,
        ia: opexIa,
        marketing: opexMarketing,
        leads: opexLeads,
        fixos: opexFixos,
        other: opexOther,
        total: totalOpex,
      },
      netProfit,
      netMargin,
      cashFlow: {
        cashIn,
        cashOutDirect,
        cashOutOpex,
        netCashFlow,
      },
      agingList,
      totalReceivables,
      overdueReceivables,
      defaultRate,
      profitabilityRanking,
      projections: {
        fixedMonthlyExpenses,
        scheduledPayouts30,
        d30: projection30,
        d60: projection60,
        d90: projection90,
      },
      balanceSheet: {
        assetsCash,
        assetsReceivables,
        totalAssets,
        liabilitiesPayable,
        liabilitiesFreelancers,
        liabilitiesTaxesEstimated,
        totalLiabilities,
        estimatedEquity,
      },
      fiscal: {
        nfseCount,
        nfseTotalBilled,
        byServiceType,
        estimatedTaxes,
      },
      filteredProjects,
      filteredExpenses,
      filteredPayouts,
    };
  }, [dateRange, projects, combinedExpenses, allPayouts, emittedInvoices, reportRegime]);

  const handleExportPDF = () => {
    try {
      const dreRows = [
        { label: "RECEITA BRUTA OPERACIONAL", type: "header" as const, value: accountingData.grossRevenue },
        { label: "CUSTOS DIRETOS DOS PROJETOS (COGS)", type: "header" as const, value: accountingData.cogs.total, isNegative: true },
        { label: "Repasses a Freelancers", type: "item" as const, value: accountingData.cogs.freela, isNegative: true },
        { label: "APIs & Webhooks (OpenAI, WhatsApp, etc.)", type: "item" as const, value: accountingData.cogs.apis, isNegative: true },
        { label: "Tráfego Pago & Mídia de Clientes", type: "item" as const, value: accountingData.cogs.ads, isNegative: true },
        { label: "Domínios & Infraestrutura de Projetos", type: "item" as const, value: accountingData.cogs.dominios, isNegative: true },
        { label: "Outros Custos Diretos de Entrega", type: "item" as const, value: accountingData.cogs.other, isNegative: true },
        { label: "LUCRO BRUTO OPERACIONAL", type: "subtotal" as const, value: accountingData.grossProfit },
        { label: "Margem Bruta %", type: "margin" as const, value: `${accountingData.grossMargin.toFixed(1)}%` },
        { label: "DESPESAS OPERACIONAIS (OPEX)", type: "header" as const, value: accountingData.opex.total, isNegative: true },
        { label: "Ferramentas SaaS & Softwares (Empresa)", type: "item" as const, value: accountingData.opex.saas, isNegative: true },
        { label: "Ferramentas de IA & Automação Corporativa", type: "item" as const, value: accountingData.opex.ia, isNegative: true },
        { label: "Influencers & Marketing Próprio", type: "item" as const, value: accountingData.opex.marketing, isNegative: true },
        { label: "Aquisição de Leads & Prospecção", type: "item" as const, value: accountingData.opex.leads, isNegative: true },
        { label: "Custos Operacionais Fixos (Aluguel, Contabilidade)", type: "item" as const, value: accountingData.opex.fixos, isNegative: true },
        { label: "Outras Despesas Variáveis", type: "item" as const, value: accountingData.opex.other, isNegative: true },
        { label: "RESULTADO OPERACIONAL LÍQUIDO (LUCRO LÍQUIDO)", type: "total" as const, value: accountingData.netProfit },
        { label: "Margem Líquida Real %", type: "margin" as const, value: `${accountingData.netMargin.toFixed(1)}%` },
      ];

      exportAccountingPDF({
        companyName: "DELSKI CLOUD",
        periodLabel: accountingData.periodLabel,
        regime: reportRegime,
        generatedAt: new Date().toLocaleString("pt-BR"),
        totals: {
          revenue: accountingData.grossRevenue,
          directCosts: accountingData.cogs.total,
          grossProfit: accountingData.grossProfit,
          grossMargin: accountingData.grossMargin,
          opex: accountingData.opex.total,
          netProfit: accountingData.netProfit,
          netMargin: accountingData.netMargin,
        },
        dreRows,
        revenueRecords: accountingData.filteredProjects.map((p) => ({
          date: formatDate(p.created_at || (p as any).created_at),
          project: p.title,
          client: p.client?.company_name || p.client?.full_name || "Cliente",
          serviceType: SERVICE_LABEL[p.service_type] || p.service_type,
          amount: Number(p.budget || 0),
          status: p.status,
        })),
        expenseRecords: accountingData.filteredExpenses.map((e) => ({
          date: formatDate(e.dueDate),
          description: e.description || "",
          category: getCategoryInfo(e.category).label,
          nature: e.nature === "fixo" ? "Fixo Mensal" : "Variável",
          projectOrCompany: e.projectId ? `Projeto: ${e.projectName}` : "🏢 Empresa (Corporativo)",
          amount: Number(e.amount || 0),
          status: e.status,
        })),
        freelancerRecords: accountingData.filteredPayouts.map((po) => ({
          date: formatDate(po.due_date),
          freelancerName: po.freelancer?.full_name || "Freelancer",
          projectName: po.project?.title || "Projeto",
          amount: Number(po.amount || 0),
          status: po.status,
        })),
      });
      toast.success("Relatório executivo em PDF baixado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + (err?.message || "falha desconhecida"));
    }
  };

  const handleExportCSV = () => {
    try {
      const dreRows = [
        { label: "RECEITA BRUTA OPERACIONAL", type: "header" as const, value: accountingData.grossRevenue },
        { label: "CUSTOS DIRETOS DOS PROJETOS (COGS)", type: "header" as const, value: accountingData.cogs.total, isNegative: true },
        { label: "Repasses a Freelancers", type: "item" as const, value: accountingData.cogs.freela, isNegative: true },
        { label: "APIs & Webhooks (OpenAI, WhatsApp, etc.)", type: "item" as const, value: accountingData.cogs.apis, isNegative: true },
        { label: "Tráfego Pago & Mídia de Clientes", type: "item" as const, value: accountingData.cogs.ads, isNegative: true },
        { label: "Domínios & Infraestrutura de Projetos", type: "item" as const, value: accountingData.cogs.dominios, isNegative: true },
        { label: "Outros Custos Diretos de Entrega", type: "item" as const, value: accountingData.cogs.other, isNegative: true },
        { label: "LUCRO BRUTO OPERACIONAL", type: "subtotal" as const, value: accountingData.grossProfit },
        { label: "Margem Bruta %", type: "margin" as const, value: `${accountingData.grossMargin.toFixed(1)}%` },
        { label: "DESPESAS OPERACIONAIS (OPEX)", type: "header" as const, value: accountingData.opex.total, isNegative: true },
        { label: "Ferramentas SaaS & Softwares (Empresa)", type: "item" as const, value: accountingData.opex.saas, isNegative: true },
        { label: "Ferramentas de IA & Automação Corporativa", type: "item" as const, value: accountingData.opex.ia, isNegative: true },
        { label: "Influencers & Marketing Próprio", type: "item" as const, value: accountingData.opex.marketing, isNegative: true },
        { label: "Aquisição de Leads & Prospecção", type: "item" as const, value: accountingData.opex.leads, isNegative: true },
        { label: "Custos Operacionais Fixos (Aluguel, Contabilidade)", type: "item" as const, value: accountingData.opex.fixos, isNegative: true },
        { label: "Outras Despesas Variáveis", type: "item" as const, value: accountingData.opex.other, isNegative: true },
        { label: "RESULTADO OPERACIONAL LÍQUIDO (LUCRO LÍQUIDO)", type: "total" as const, value: accountingData.netProfit },
        { label: "Margem Líquida Real %", type: "margin" as const, value: `${accountingData.netMargin.toFixed(1)}%` },
      ];

      exportAccountingCSV({
        companyName: "DELSKI CLOUD",
        periodLabel: accountingData.periodLabel,
        regime: reportRegime,
        generatedAt: new Date().toLocaleString("pt-BR"),
        totals: {
          revenue: accountingData.grossRevenue,
          directCosts: accountingData.cogs.total,
          grossProfit: accountingData.grossProfit,
          grossMargin: accountingData.grossMargin,
          opex: accountingData.opex.total,
          netProfit: accountingData.netProfit,
          netMargin: accountingData.netMargin,
        },
        dreRows,
        revenueRecords: accountingData.filteredProjects.map((p) => ({
          date: formatDate(p.created_at || (p as any).created_at),
          project: p.title,
          client: p.client?.company_name || p.client?.full_name || "Cliente",
          serviceType: SERVICE_LABEL[p.service_type] || p.service_type,
          amount: Number(p.budget || 0),
          status: p.status,
        })),
        expenseRecords: accountingData.filteredExpenses.map((e) => ({
          date: formatDate(e.dueDate),
          description: e.description || "",
          category: getCategoryInfo(e.category).label,
          nature: e.nature === "fixo" ? "Fixo Mensal" : "Variável",
          projectOrCompany: e.projectId ? `Projeto: ${e.projectName}` : "🏢 Empresa (Corporativo)",
          amount: Number(e.amount || 0),
          status: e.status,
        })),
        freelancerRecords: accountingData.filteredPayouts.map((po) => ({
          date: formatDate(po.due_date),
          freelancerName: po.freelancer?.full_name || "Freelancer",
          projectName: po.project?.title || "Projeto",
          amount: Number(po.amount || 0),
          status: po.status,
        })),
      });
      toast.success("Pacote contábil para Excel baixado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar pacote contábil: " + (err?.message || "falha desconhecida"));
    }
  };

  const handleSendReminder = (item: any, channel: "whatsapp" | "email") => {
    if (channel === "whatsapp") {
      const msg = encodeURIComponent(
        `Olá! Aqui é da equipe financeira da DELSKI CLOUD. Gostaríamos de verificar o status do pagamento referente ao projeto "${item.title}" no valor de ${money(item.amount)}. Podemos ajudar com a 2ª via?`
      );
      const phoneClean = (item.clientPhone || "").replace(/\D/g, "");
      if (!phoneClean) {
        toast.info("Telefone não cadastrado. Abrindo WhatsApp Web...");
        window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
      } else {
        window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${msg}`, "_blank");
      }
      toast.success(`Lembrete de cobrança via WhatsApp aberto para ${item.clientName}!`);
    } else {
      const subject = encodeURIComponent(`Lembrete Financeiro — Projeto ${item.title}`);
      const body = encodeURIComponent(
        `Prezado(a) ${item.clientName},\n\nConstatamos que o pagamento referente ao projeto "${item.title}" no valor de ${money(item.amount)} está pendente.\n\nQualquer dúvida ou caso necessite de novo comprovante/fatura, estamos à total disposição.\n\nAtenciosamente,\nDELSKI CLOUD Financeiro`
      );
      window.location.href = `mailto:${item.clientEmail}?subject=${subject}&body=${body}`;
      toast.success(`Lembrete por e-mail preparado para ${item.clientEmail || item.clientName}!`);
    }
  };

  const handleOpenEditModal = (p: any) => {
    setEditingProject(p);
    setEditBudget(String(p.budget || 0));
    setEditModalOpen(true);
  };

  const handleSaveProjectFinance = async () => {
    if (!editingProject) return;
    const newBudget = Number(editBudget);
    if (isNaN(newBudget) || newBudget < 0)
      return toast.error("Digite um orçamento de receita válido.");

    // Direct expenses sum for this project
    const projectExpensesSum = combinedExpenses
      .filter((e) => e.projectId === editingProject.id)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    setIsSavingProjectFinance(true);
    try {
      await supabase
        .from("projects")
        .update({ budget: newBudget, additional_costs: projectExpensesSum })
        .eq("id", editingProject.id);

      queryClient.invalidateQueries({ queryKey: ["finance", "gestor"] });
      toast.success("Receita e financeiro do projeto atualizados com sucesso!");
      setEditModalOpen(false);
    } catch {
      toast.error("Erro ao atualizar o financeiro do projeto.");
    } finally {
      setIsSavingProjectFinance(false);
    }
  };

  const submitExpense = async () => {
    if (!form.description || !form.amount)
      return toast.error("Preencha descrição e valor da despesa.");

    const amountNum = Number(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) return toast.error("Informe um valor válido.");

    const selectedProjId = form.projectId === "none" || !form.projectId ? null : form.projectId;

    const basePayload: Record<string, any> = {
      project_id: selectedProjId,
      description: form.description.trim(),
      amount: amountNum,
      category: form.category,
      nature: form.nature,
      due_date: form.dueDate || null,
      status: form.status,
      freelancer_id:
        (form.category === "freelancers" || form.category === "freelancer") && form.freelancerId
          ? form.freelancerId
          : null,
    };

    try {
      const { error } = await supabase.from("project_expenses").insert(basePayload);
      if (error) {
        // Fallback if nature / due_date columns are not in DB schema yet
        delete basePayload.nature;
        await supabase.from("project_expenses").insert(basePayload);
      }
      queryClient.invalidateQueries({ queryKey: ["project_expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "gestor"] });
    } catch (err) {
      console.warn("DB expense insert fallback:", err);
    }

    addExpense({
      projectId: selectedProjId,
      description: form.description.trim(),
      amount: amountNum,
      category: form.category,
      nature: form.nature,
      dueDate: form.dueDate || null,
      status: form.status,
      freelancerId:
        (form.category === "freelancers" || form.category === "freelancer")
          ? form.freelancerId || undefined
          : undefined,
    });

    if (selectedProjId) {
      toast.success("Despesa vinculada ao projeto registrada com sucesso!");
    } else {
      toast.success("Despesa corporativa da empresa registrada com sucesso!");
    }

    setOpenAdd(false);
    setForm({
      projectId: "none",
      description: "",
      amount: "",
      category: "apis",
      nature: "variavel",
      dueDate: new Date().toISOString().slice(0, 10),
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
            Receitas, custos por projeto, repasses a prestadores e emissão de Notas Fiscais de Serviço (NFS-e).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMainFinanceTab === "nfse" ? (
            <Button
              onClick={() => setOpenNfseModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs font-semibold h-9 px-4 shadow-sm"
            >
              <Receipt className="h-4 w-4" /> Gerar Nova NFS-e
            </Button>
          ) : activeMainFinanceTab === "relatorios" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="gap-1.5 text-xs font-semibold h-9 px-3 border-border shadow-xs hover:bg-muted"
              >
                <Download className="h-4 w-4 text-blue-500" /> Exportar PDF
              </Button>
              <Button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold h-9 px-3.5 shadow-sm"
              >
                <FileSpreadsheet className="h-4 w-4" /> Pacote Contábil
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setOpenAdd(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold h-9 px-4 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Nova despesa
            </Button>
          )}
        </div>
      </div>

      {/* Top Tabs Switcher */}
      <Tabs value={activeMainFinanceTab} onValueChange={setActiveMainFinanceTab} className="space-y-6">
        <div className="bg-card p-1.5 rounded-xl border border-border shadow-xs overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex gap-1 min-w-max">
            <TabsTrigger
              value="geral"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" /> Visão Geral & Despesas
            </TabsTrigger>
            <TabsTrigger
              value="nfse"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" /> Emissão de NFS-e
            </TabsTrigger>
            <TabsTrigger
              value="relatorios"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" /> Relatórios Contábeis
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── ABA 1: VISÃO GERAL & DESPESAS ────────────────────────────────── */}
        <TabsContent value="geral" className="space-y-6 focus-visible:outline-none">
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogContent className="sm:max-w-lg bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-500" /> Registrar nova despesa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Lance uma despesa vinculada diretamente a um projeto ou como custo corporativo da empresa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Projeto (Opcional)</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Selecione um projeto ou escolha Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>Empresa (Despesa Corporativa Geral — Sem projeto)</span>
                      </div>
                    </SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-blue-500" />
                          <span className="truncate">{p.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">
                  Selecione "Empresa" para custos corporativos ou escolha o projeto para compor sua DRE direta.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Descrição *</Label>
                <Input
                  placeholder="Ex: Assinatura OpenAI / Hospedagem Vercel / Aluguel do Escritório"
                  className="text-xs"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Valor (R$) *</Label>
                  <Input
                    type="number"
                    placeholder="1500.00"
                    className="text-xs"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Tipo de Gasto / Recorrência</Label>
                  <Select
                    value={form.nature}
                    onValueChange={(v) => setForm((f) => ({ ...f, nature: v as ExpenseNature }))}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NATURES.map((n) => (
                        <SelectItem key={n.value} value={n.value}>
                          <div className="flex flex-col text-left py-0.5">
                            <span className="font-semibold text-xs text-foreground">{n.label}</span>
                            <span className="text-[10px] text-muted-foreground">{n.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v as ExpenseCategory }))}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {CATEGORIES.map((c) => {
                        const Icon = c.icon;
                        return (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-2.5 py-0.5">
                              <div className={`p-1 rounded-md bg-muted/60 ${c.colorClass}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="font-medium text-xs text-foreground">{c.label}</span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[260px]">
                                  {c.description}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Data de Vencimento</Label>
                  <Input
                    type="date"
                    className="text-xs"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              {(form.category === "freelancers" || form.category === "freelancer") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Freelancer Alocado (Opcional)</Label>
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
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-violet-500" />
                            <span>{fl.name} ({(fl as any).role || (fl as any).specialty || "Freelancer"})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Status Inicial</Label>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Receita Total */}
        <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-4 sm:p-5 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Receita Total
                </div>
                <div className="mt-1 text-xl sm:text-2xl font-bold text-foreground break-all">
                  {money(totals.revenue)}
                </div>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Custos com Freelancers */}
        <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-4 sm:p-5 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Custos com Freelancers">
                  Custos com Freelancers
                </div>
                <div className="mt-1 text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 break-all">
                  {money(totals.freelancerCosts)}
                </div>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Despesas Operacionais */}
        <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-4 sm:p-5 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Despesas Operacionais">
                  Despesas Operacionais
                </div>
                <div className="mt-1 text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 break-all">
                  {money(totals.totalExpenses)}
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3 text-rose-500" />
                  <span>{totals.projectExpensesCount} em projetos • {totals.corporateExpensesCount} corporativas</span>
                </div>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Lucro Real Consolidado */}
        <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-4 sm:p-5 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title="Lucro Real Consolidado">
                  Lucro Real Consolidado
                </div>
                <div
                  className={`mt-1 text-xl sm:text-2xl font-bold break-all ${
                    totals.realProfit >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {money(totals.realProfit)}
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <TrendingUp className="h-3 w-3 text-indigo-500" />
                  <span>Margem Líquida Real: {totals.profitMargin.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profit" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="profit">Lucro por projeto</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="freelancers">Pagamentos de freelas</TabsTrigger>
        </TabsList>

        {/* TAB 1: LUCRO POR PROJETO */}
        <TabsContent value="profit">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground">Receita vs custo por projeto</CardTitle>
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
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-blue-500 shrink-0" />
                            <span>{p.title}</span>
                          </div>
                          {p.client?.full_name && (
                            <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                              {p.client.full_name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="outline" className="text-xs">
                            {SERVICE_LABEL[p.service_type] || p.service_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-foreground">
                          {money(p.budget || 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {money(p.cost)}
                          </span>
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            {money(p.freelancerCost)} freela {p.directExpensesTotal > 0 ? `+ ${money(p.directExpensesTotal)} direto` : ""}
                          </span>
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
                        <td className="px-4 py-3.5 text-right font-medium text-foreground">
                          {p.margin.toFixed(0)}%
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(p)}
                            title="Editar Financeiro do Projeto"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded-md"
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
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Lançamentos de despesas
                </CardTitle>
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
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Descrição / Origem</th>
                      <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold">Categoria</th>
                      <th className="text-left px-4 py-3 font-semibold">Vencimento</th>
                      <th className="text-right px-4 py-3 font-semibold">Valor</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-right px-4 py-3 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {combinedExpenses.map((e) => {
                      const isFixo = e.nature === "fixo";
                      const formattedDueDate = formatDate(e.dueDate);
                      const catInfo = getCategoryInfo(e.category);
                      const CatIcon = catInfo.icon;

                      return (
                        <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-foreground">
                            <div>{e.description}</div>
                            <span className="text-[11px] font-normal text-muted-foreground flex items-center gap-1 mt-0.5">
                              {e.projectId ? (
                                <>
                                  <FolderKanban className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span>Projeto: {e.projectName}</span>
                                </>
                              ) : (
                                <>
                                  <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span>Empresa (Corporativo Geral)</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant="outline"
                              className={
                                isFixo
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-xs font-semibold"
                                  : "bg-muted text-muted-foreground border-border text-xs font-normal"
                              }
                            >
                              {isFixo ? "Fixo Mensal" : "Variável"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 capitalize text-xs">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium inline-flex items-center gap-1.5 px-2.5 py-0.5 ${catInfo.badgeClass}`}
                            >
                              <CatIcon className="h-3 w-3" />
                              <span>{catInfo.label}</span>
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {formattedDueDate}
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-foreground">
                            {money(e.amount)}
                          </td>
                          <td className="px-4 py-3.5">
                            <Select
                              value={e.status}
                              onValueChange={(st) =>
                                handleUpdateExpenseStatus(e.id, st as ExpenseStatus)
                              }
                            >
                              <SelectTrigger className="w-32 h-8 text-xs bg-card border-border text-foreground">
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
                              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-md"
                              onClick={() => handleDeleteExpense(e.id)}
                              title="Remover despesa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}

                    {combinedExpenses.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <FileText className="h-8 w-8 text-muted-foreground/40" />
                            <p className="font-semibold text-foreground">Nenhuma despesa lançada</p>
                            <p className="text-xs text-muted-foreground">
                              Clique no botão "+ Nova despesa" para registrar lançamentos.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => setOpenAdd(true)}
                              className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
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
                            {p.due_date ? formatDate(p.due_date) : "Na Conclusão"}
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
        <DialogContent className="sm:max-w-lg bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-500" /> Editar Financeiro do Projeto
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Altere a Receita do projeto e confira a soma automática de repasses a freelancers e custos diretos.
            </DialogDescription>
          </DialogHeader>

          {editingProject && (() => {
            const budgetNum = Number(editBudget || 0);
            const freelaCost = Number(editingProject.freelancer_cost || 0);
            const projectExpenses = combinedExpenses.filter((e) => e.projectId === editingProject.id);
            const directExpensesTotal = projectExpenses.reduce((a, b) => a + Number(b.amount || 0), 0);
            const totalProjectCost = freelaCost + directExpensesTotal;
            const netProfit = budgetNum - totalProjectCost;
            const marginPct = budgetNum > 0 ? (netProfit / budgetNum) * 100 : 0;

            return (
              <div className="space-y-4 py-2">
                {/* Project Header Info */}
                <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                      <FolderKanban className="h-3 w-3 text-blue-500" /> Projeto
                    </span>
                    <p className="text-sm font-bold text-foreground">{editingProject.title}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {SERVICE_LABEL[editingProject.service_type] || editingProject.service_type}
                  </Badge>
                </div>

                {/* Budget Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-budget" className="text-xs font-semibold text-foreground">
                    Receita do Projeto (R$) *
                  </Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    placeholder="0.00"
                    className="text-sm"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Valor total de orçamento contratado pelo cliente para este projeto.
                  </span>
                </div>

                {/* Calculation Breakdown Card */}
                <div className="p-3.5 bg-card border border-border rounded-xl text-xs space-y-2 shadow-xs">
                  <div className="flex items-center justify-between font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Plus className="h-3.5 w-3.5 text-emerald-500" /> (+) Receita do Projeto:
                    </span>
                    <span className="font-bold text-foreground">{money(budgetNum)}</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-medium">
                      <Users className="h-3.5 w-3.5" /> (-) Pagamento Freelancers:
                    </span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {money(freelaCost)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-medium">
                      <Zap className="h-3.5 w-3.5" /> (-) Custos Diretos (APIs, Mídia, IA, etc.):
                    </span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {money(directExpensesTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2 font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calculator className="h-3.5 w-3.5 text-blue-500" /> (=) Custo Total do Projeto:
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 text-sm font-bold">
                      {money(totalProjectCost)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/80 pt-2 font-extrabold text-foreground">
                    <span className="flex items-center gap-1.5 text-sm">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> (=) Lucro Líquido Real:
                    </span>
                    <div className="text-right">
                      <span
                        className={`text-sm ${
                          netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                        }`}
                      >
                        {money(netProfit)}
                      </span>
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        Margem: {marginPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Expenses Detailed List */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-blue-500" /> Despesas Diretas Vinculadas ({projectExpenses.length})
                    </span>
                  </div>

                  {projectExpenses.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {projectExpenses.map((exp) => {
                        const catInfo = getCategoryInfo(exp.category);
                        const CatIcon = catInfo.icon;
                        return (
                          <div
                            key={exp.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`p-1 rounded-md bg-background ${catInfo.colorClass}`}>
                                <CatIcon className="h-3 w-3" />
                              </div>
                              <div className="min-w-0 truncate">
                                <p className="font-medium text-foreground truncate">{exp.description}</p>
                                <span className="text-[10px] text-muted-foreground">
                                  {catInfo.label} • {exp.nature === "fixo" ? "Fixo Mensal" : "Variável"}
                                </span>
                              </div>
                            </div>
                            <span className="font-bold text-rose-500 shrink-0 ml-2">
                              {money(exp.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/20 border border-dashed border-border rounded-xl text-center">
                      <p className="text-xs text-muted-foreground">
                        Nenhuma despesa direta vinculada a este projeto ainda.
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        Lance despesas selecionando este projeto no botão "+ Nova despesa".
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveProjectFinance}
              disabled={isSavingProjectFinance}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
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
    </TabsContent>

        {/* ── ABA 2: EMISSÃO DE NFS-E ──────────────────────────────────────── */}
        <TabsContent value="nfse" className="space-y-6 focus-visible:outline-none">
          {/* Métricas de Faturamento Fiscal */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-5 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Total Faturado (NFS-e)
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 break-all">
                      {money(nfseTotals.totalBilled)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Notas fiscais autorizadas
                    </p>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Receipt className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-5 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Notas Emitidas
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-foreground break-all">
                      {nfseTotals.totalCount}
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      Histórico completo
                    </p>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-5 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      ISS Calculado
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 break-all">
                      {money(nfseTotals.totalIss)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Tributo municipal provisionado
                    </p>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Building className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-5 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Em Análise / Atenção
                    </div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 break-all">
                      {nfseTotals.pendingCount}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Processando ou com erro
                    </p>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Notas Fiscais Emitidas com Filtros */}
          <Card className="bg-card shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-blue-600" />
                    Notas Fiscais de Serviço Eletrônicas Emitidas ({filteredNfse.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Histórico de NFS-e transmitidas e autorizadas pela prefeitura para faturamento de clientes.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nº, cliente..."
                      value={nfseSearch}
                      onChange={(e) => setNfseSearch(e.target.value)}
                      className="h-9 pl-8 w-48 text-xs"
                    />
                  </div>

                  <Select value={nfseFilterStatus} onValueChange={setNfseFilterStatus}>
                    <SelectTrigger className="h-9 w-36 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="autorizada">Autorizadas</SelectItem>
                      <SelectItem value="processando">Processando</SelectItem>
                      <SelectItem value="cancelada">Canceladas</SelectItem>
                      <SelectItem value="erro">Com Erro</SelectItem>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => setOpenNfseModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-3.5 gap-1.5 shadow-xs"
                  >
                    <Plus className="h-4 w-4" /> Nova NFS-e
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredNfse.length === 0 ? (
                <div className="p-12 text-center border-t border-dashed space-y-2">
                  <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Nenhuma NFS-e encontrada
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {nfseSearch || nfseFilterStatus !== "all"
                      ? "Nenhuma nota corresponde aos filtros selecionados."
                      : "Clique no botão 'Nova NFS-e' para emitir a primeira nota fiscal de serviço para um cliente."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-y text-muted-foreground font-semibold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Número da Nota</th>
                        <th className="py-3 px-4">Cód. Verificação</th>
                        <th className="py-3 px-4">Tomador / Cliente</th>
                        <th className="py-3 px-4">Projeto</th>
                        <th className="py-3 px-4">Emissão</th>
                        <th className="py-3 px-4">Valor Bruto</th>
                        <th className="py-3 px-4">ISS</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredNfse.map((inv) => {
                        const statusStyles: Record<string, string> = {
                          autorizada: "bg-emerald-50 text-emerald-700 border-emerald-200",
                          processando: "bg-purple-50 text-purple-700 border-purple-200",
                          cancelada: "bg-stone-100 text-stone-600 border-stone-200",
                          erro: "bg-rose-50 text-rose-700 border-rose-200",
                          rascunho: "bg-amber-50 text-amber-700 border-amber-200",
                        };

                        const clientDisplayName =
                          inv.client?.company_name ||
                          inv.client?.corporate_name ||
                          inv.client?.full_name ||
                          "Cliente";

                        return (
                          <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                              {inv.number ? `NFS-e ${inv.number}` : "—"}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                              {inv.verification_code || "—"}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-foreground truncate max-w-[180px]">
                                {clientDisplayName}
                              </p>
                              {inv.client?.cnpj && (
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {inv.client.cnpj}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground">
                              {inv.project?.title || "Avulso"}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                              {formatDate(inv.issued_at || inv.created_at)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-blue-600 whitespace-nowrap">
                              {money(Number(inv.service_value))}
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                              {money(Number(inv.iss_value || (inv.service_value * inv.iss_rate) / 100))}
                              <span className="text-[10px] text-muted-foreground/60 ml-1">
                                ({inv.iss_rate}%)
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <Badge
                                className={`text-xs px-2.5 py-0.5 font-medium capitalize ${
                                  statusStyles[inv.status] || "bg-muted text-muted-foreground"
                                }`}
                              >
                                {inv.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                              {inv.pdf_url && (
                                <a
                                  href={inv.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                  title="Visualizar PDF Oficial da NFS-e"
                                >
                                  <Download className="h-3 w-3" /> PDF
                                </a>
                              )}
                              {inv.xml_url && (
                                <a
                                  href={inv.xml_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                  title="Baixar XML de Integração"
                                >
                                  <FileCode className="h-3 w-3" /> XML
                                </a>
                              )}
                              {inv.status === "erro" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => retryNfse.mutate(inv.id)}
                                  className="h-7 text-xs px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" /> Reenviar
                                </Button>
                              )}
                              {inv.status === "autorizada" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setCancelingInvoice(inv);
                                    setOpenCancelModal(true);
                                  }}
                                  className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50"
                                  title="Cancelar Nota Fiscal"
                                >
                                  <XOctagon className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 3: RELATÓRIOS & CONTABILIDADE ───────────────────────────── */}
        <TabsContent value="relatorios" className="space-y-6 focus-visible:outline-none">
          {/* Painel Superior de Filtros e Controles Globais */}
          <Card className="bg-card border-border shadow-xs">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  {/* Seletor de Período */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-blue-500" /> Período de Apuração
                    </span>
                    <Select
                      value={reportPeriod}
                      onValueChange={(v) => setReportPeriod(v as any)}
                    >
                      <SelectTrigger className="w-44 h-9 text-xs bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mes_atual">Mês Atual</SelectItem>
                        <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                        <SelectItem value="trimestre">Último Trimestre (90d)</SelectItem>
                        <SelectItem value="ano">Ano Atual (YTD)</SelectItem>
                        <SelectItem value="custom">Intervalo Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Inputs para Período Personalizado */}
                  {reportPeriod === "custom" && (
                    <div className="flex items-center gap-2 pt-4 sm:pt-0">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium">De</span>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="h-9 text-xs w-36 bg-background border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Até</span>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="h-9 text-xs w-36 bg-background border-border text-foreground"
                        />
                      </div>
                    </div>
                  )}

                  {/* Seletor de Regime Contábil */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Scale className="h-3 w-3 text-emerald-500" /> Regime Contábil
                    </span>
                    <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setReportRegime("competencia")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          reportRegime === "competencia"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        <span>Competência (DRE)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportRegime("caixa")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          reportRegime === "caixa"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Caixa (DFC)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botões de Exportação */}
                <div className="flex items-center gap-2 self-end lg:self-auto w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-border shadow-xs hover:bg-muted"
                  >
                    <Download className="h-4 w-4 text-blue-500" />
                    <span>Exportar PDF</span>
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    className="h-9 px-3.5 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Pacote Contábil (Excel)</span>
                  </Button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Período Ativo: <strong className="text-foreground">{accountingData.periodLabel}</strong></span>
                </span>
                <span className="text-[11px]">
                  Regime: <strong className="text-foreground">{reportRegime === "competencia" ? "Competência (Fechamento do Contrato)" : "Caixa (Efetivação Bancária)"}</strong>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 4 Cards de Resumo Rápido Contábil */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-5 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Receita Bruta</div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-foreground break-all">
                      {money(accountingData.grossRevenue)}
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                      <FolderKanban className="h-3 w-3 text-blue-500" />
                      <span>{accountingData.filteredProjects.length} contratos no período</span>
                    </div>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-5 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Lucro Bruto Operacional</div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 break-all">
                      {money(accountingData.grossProfit)}
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span>Margem Bruta: {accountingData.grossMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-5 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Despesas OPEX Corporativas</div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 break-all">
                      {money(accountingData.opex.total)}
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                      <Layers className="h-3 w-3 text-rose-500" />
                      <span>SaaS, IA, Fixos e Mídia</span>
                    </div>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 dark:border-border bg-white dark:bg-card rounded-2xl p-5 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {reportRegime === "competencia" ? "Lucro Líquido Real" : "Saldo Líquido de Caixa"}
                    </div>
                    <div
                      className={`mt-1 text-xl sm:text-2xl font-bold break-all ${
                        accountingData.netProfit >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {money(reportRegime === "competencia" ? accountingData.netProfit : accountingData.cashFlow.netCashFlow)}
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                      <span>
                        {reportRegime === "competencia"
                          ? `Margem Líquida: ${accountingData.netMargin.toFixed(1)}%`
                          : `Entradas: ${money(accountingData.cashFlow.cashIn)}`}
                      </span>
                    </div>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navegação Secundária dos Módulos de Relatórios Contábeis (Pills / Segmented Control Minimalista) */}
          <div className="bg-slate-100/80 dark:bg-muted/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-border flex flex-wrap gap-1.5">
            {[
              { key: "dre_dfc", label: "DRE & DFC" },
              { key: "inadimplencia", label: "Inadimplência & Aging" },
              { key: "lucratividade", label: "Rentabilidade por Projeto" },
              { key: "projecao", label: "Projeção de Contas" },
              { key: "balanco", label: "Balanço Patrimonial" },
              { key: "fiscal", label: "Fechamento Fiscal Contábil" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setReportSubTab(tab.key as any)}
                className={`flex-1 min-w-fit px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap text-center ${
                  reportSubTab === tab.key
                    ? "bg-white dark:bg-background text-foreground font-bold shadow-xs border border-slate-200/60 dark:border-border"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── MÓDULO A: DRE & DFC ────────────────────────────────────────── */}
          {reportSubTab === "dre_dfc" && (
            <div className="space-y-6">
              <Card className="bg-card border border-slate-200/80 dark:border-border shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-100 dark:border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {reportRegime === "competencia"
                          ? "Demonstração do Resultado do Exercício (DRE Gerencial)"
                          : "Demonstração do Fluxo de Caixa (DFC — Regime de Caixa)"}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Linhas consolidadas e detalhamento analítico com suporte a linhas expansíveis.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto">
                      Período: {accountingData.periodLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/80 dark:bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Conta / Discriminação Contábil</th>
                          <th className="text-center px-4 py-3 font-semibold">Composição</th>
                          <th className="text-right px-4 py-3 font-semibold">Valor (R$)</th>
                          <th className="text-right px-4 py-3 font-semibold">% Sobre Receita</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* RECEITA BRUTA OPERACIONAL */}
                        <tr className="bg-muted/20 font-bold">
                          <td className="px-4 py-3.5 text-foreground">
                            RECEITA BRUTA OPERACIONAL
                          </td>
                          <td className="px-4 py-3.5 text-center text-muted-foreground">
                            {accountingData.filteredProjects.length} Projetos
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {money(accountingData.grossRevenue)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground font-semibold">
                            100,0%
                          </td>
                        </tr>

                        {/* CUSTOS DIRETOS DOS PROJETOS (COGS) Header */}
                        <tr
                          onClick={() => setExpandedSections((s) => ({ ...s, cogs: !s.cogs }))}
                          className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors font-bold"
                        >
                          <td className="px-4 py-3 text-foreground flex items-center justify-between">
                            <span>CUSTOS DIRETOS DOS PROJETOS (COGS / CPV)</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground">
                              {expandedSections.cogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground font-normal">
                            Freelancers + APIs + Mídia
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                            -{money(accountingData.cogs.total)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-semibold">
                            {accountingData.grossRevenue > 0
                              ? ((accountingData.cogs.total / accountingData.grossRevenue) * 100).toFixed(1)
                              : 0}%
                          </td>
                        </tr>

                        {/* Sub-linhas COGS Expandíveis */}
                        {expandedSections.cogs && (
                          <>
                            <tr className="bg-background hover:bg-muted/20 transition-colors">
                              <td className="px-8 py-2 text-muted-foreground">
                                Repasses a Freelancers & Prestadores
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">
                                {accountingData.filteredPayouts.length} pagamentos
                              </td>
                              <td className="px-4 py-2 text-right text-red-600 font-medium">
                                -{money(accountingData.cogs.freela)}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {accountingData.grossRevenue > 0 ? ((accountingData.cogs.freela / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-background hover:bg-muted/20 transition-colors">
                              <td className="px-8 py-2 text-muted-foreground">
                                APIs & Webhooks Diretos (OpenAI, WhatsApp, etc.)
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Custos de IA por projeto</td>
                              <td className="px-4 py-2 text-right text-red-600 font-medium">
                                -{money(accountingData.cogs.apis)}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {accountingData.grossRevenue > 0 ? ((accountingData.cogs.apis / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-background hover:bg-muted/20 transition-colors">
                              <td className="px-8 py-2 text-muted-foreground">
                                Tráfego Pago & Mídia de Clientes (Ads)
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Meta / Google Ads</td>
                              <td className="px-4 py-2 text-right text-red-600 font-medium">
                                -{money(accountingData.cogs.ads)}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {accountingData.grossRevenue > 0 ? ((accountingData.cogs.ads / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-background hover:bg-muted/20 transition-colors">
                              <td className="px-8 py-2 text-muted-foreground">
                                Domínios & Infraestrutura Dedicada
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Servidores e registros</td>
                              <td className="px-4 py-2 text-right text-red-600 font-medium">
                                -{money(accountingData.cogs.dominios)}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {accountingData.grossRevenue > 0 ? ((accountingData.cogs.dominios / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            {accountingData.cogs.other > 0 && (
                              <tr className="bg-background hover:bg-muted/20 transition-colors">
                                <td className="px-8 py-2 text-muted-foreground">
                                  Outros Custos Diretos de Entrega
                                </td>
                                <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Diversos de projetos</td>
                                <td className="px-4 py-2 text-right text-red-600 font-medium">
                                  -{money(accountingData.cogs.other)}
                                </td>
                                <td className="px-4 py-2 text-right text-muted-foreground">
                                  {accountingData.grossRevenue > 0 ? ((accountingData.cogs.other / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                                </td>
                              </tr>
                            )}
                          </>
                        )}

                        {/* LUCRO BRUTO OPERACIONAL */}
                        <tr className="bg-slate-50 dark:bg-zinc-900/60 font-bold border-y-2 border-border">
                          <td className="px-4 py-3.5 text-slate-900 dark:text-white font-bold">
                            LUCRO BRUTO OPERACIONAL
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-700 dark:text-zinc-300 font-semibold">
                            Margem Bruta: {accountingData.grossMargin.toFixed(1)}%
                          </td>
                          <td className={`px-4 py-3.5 text-right font-bold text-sm ${
                            accountingData.grossProfit >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {money(accountingData.grossProfit)}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-bold ${
                            accountingData.grossProfit >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {accountingData.grossMargin.toFixed(1)}%
                          </td>
                        </tr>

                        {/* DESPESAS OPERACIONAIS (OPEX) Header */}
                        <tr
                          onClick={() => setExpandedSections((s) => ({ ...s, opex: !s.opex }))}
                          className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors font-bold"
                        >
                          <td className="px-4 py-3 text-foreground flex items-center justify-between">
                            <span>DESPESAS OPERACIONAIS / CORPORATIVAS (OPEX)</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground">
                              {expandedSections.opex ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground font-normal">
                            SaaS + IA + Marketing + Fixos
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                            -{money(accountingData.opex.total)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-semibold">
                            {accountingData.grossRevenue > 0
                              ? ((accountingData.opex.total / accountingData.grossRevenue) * 100).toFixed(1)
                              : 0}%
                          </td>
                        </tr>

                        {/* Sub-linhas OPEX Expandíveis */}
                        {expandedSections.opex && (
                          <>
                            <tr className="bg-background hover:bg-muted/20 transition-colors">
                              <td className="px-8 py-2 text-muted-foreground">
                                Ferramentas & Softwares SaaS (Vercel, Supabase, Adobe)
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Infraestrutura corporativa</td>
                              <td className="px-4 py-2 text-right text-red-600 font-medium">
                                -{money(accountingData.opex.saas)}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {accountingData.grossRevenue > 0 ? ((accountingData.opex.saas / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-background hover:bg-muted/20 transition-colors">
                              <td className="px-8 py-2 text-muted-foreground">
                                Ferramentas de IA & Automação Corporativa (ChatGPT, Make)
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Assinaturas da agência</td>
                              <td className="px-4 py-2 text-right text-red-600 font-medium">
                                -{money(accountingData.opex.ia)}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {accountingData.grossRevenue > 0 ? ((accountingData.opex.ia / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-background hover:bg-muted/20 transition-colors">
                              <td className="px-8 py-2 text-muted-foreground">
                                Influencers & Marketing Próprio da Agência
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Branding e publis</td>
                              <td className="px-4 py-2 text-right text-red-600 font-medium">
                                -{money(accountingData.opex.marketing)}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {accountingData.grossRevenue > 0 ? ((accountingData.opex.marketing / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-background hover:bg-muted/20 transition-colors">
                              <td className="px-8 py-2 text-muted-foreground">
                                Aquisição de Leads & Prospecção (Apollo, Scrapers)
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Cold mail e bases</td>
                              <td className="px-4 py-2 text-right text-red-600 font-medium">
                                -{money(accountingData.opex.leads)}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {accountingData.grossRevenue > 0 ? ((accountingData.opex.leads / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            <tr className="bg-background hover:bg-muted/20 transition-colors">
                              <td className="px-8 py-2 text-muted-foreground">
                                Custos Operacionais Fixos (Aluguel, Contabilidade)
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Estrutura e serviços</td>
                              <td className="px-4 py-2 text-right text-red-600 font-medium">
                                -{money(accountingData.opex.fixos)}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {accountingData.grossRevenue > 0 ? ((accountingData.opex.fixos / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                            {accountingData.opex.other > 0 && (
                              <tr className="bg-background hover:bg-muted/20 transition-colors">
                                <td className="px-8 py-2 text-muted-foreground">
                                  Outras Despesas Variáveis Corporativas
                                </td>
                                <td className="px-4 py-2 text-center text-muted-foreground text-[10px]">Deslocamento e taxas</td>
                                <td className="px-4 py-2 text-right text-red-600 font-medium">
                                  -{money(accountingData.opex.other)}
                                </td>
                                <td className="px-4 py-2 text-right text-muted-foreground">
                                  {accountingData.grossRevenue > 0 ? ((accountingData.opex.other / accountingData.grossRevenue) * 100).toFixed(1) : 0}%
                                </td>
                              </tr>
                            )}
                          </>
                        )}

                        {/* RESULTADO OPERACIONAL LÍQUIDO */}
                        <tr className="bg-slate-50 dark:bg-zinc-900/60 font-bold border-t-2 border-border">
                          <td className="px-4 py-4 text-slate-900 dark:text-white font-bold text-sm">
                            RESULTADO OPERACIONAL LÍQUIDO (LUCRO LÍQUIDO)
                          </td>
                          <td className="px-4 py-4 text-center text-slate-700 dark:text-zinc-300 font-semibold">
                            Margem Líquida Real: {accountingData.netMargin.toFixed(1)}%
                          </td>
                          <td className={`px-4 py-4 text-right font-black text-base ${
                            accountingData.netProfit >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {money(accountingData.netProfit)}
                          </td>
                          <td className={`px-4 py-4 text-right font-bold text-sm ${
                            accountingData.netProfit >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {accountingData.netMargin.toFixed(1)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela Comparativa Mês a Mês com Filtros de Ano e Período */}
              <Card className="bg-card border border-slate-200/80 dark:border-border shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-100 dark:border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        Evolução da {reportRegime === "competencia" ? "DRE" : "DFC"} Mês a Mês — Ano {dreEvolutionYear}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Acompanhamento de sazonalidade, receita bruta, despesas e margem líquida {reportRegime === "competencia" ? "(Regime de Competência)" : "(Regime de Caixa)"}.
                      </CardDescription>
                    </div>

                    {/* Controles de Filtro: Ano e Trimestre/Período */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={dreEvolutionYear}
                        onValueChange={(v) => setDreEvolutionYear(v)}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs font-semibold bg-background border-slate-200 dark:border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">Ano 2024</SelectItem>
                          <SelectItem value="2025">Ano 2025</SelectItem>
                          <SelectItem value="2026">Ano 2026</SelectItem>
                          <SelectItem value="2027">Ano 2027</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={dreEvolutionPeriod}
                        onValueChange={(v) => setDreEvolutionPeriod(v as any)}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs font-semibold bg-background border-slate-200 dark:border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Ano Completo (12M)</SelectItem>
                          <SelectItem value="q1">1º Trim (Jan - Mar)</SelectItem>
                          <SelectItem value="q2">2º Trim (Abr - Jun)</SelectItem>
                          <SelectItem value="q3">3º Trim (Jul - Set)</SelectItem>
                          <SelectItem value="q4">4º Trim (Out - Dez)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/80 dark:bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Mês</th>
                          <th className="px-4 py-3 text-right font-semibold">Receita Bruta</th>
                          <th className="px-4 py-3 text-right font-semibold">Custos Diretos</th>
                          <th className="px-4 py-3 text-right font-semibold">Lucro Bruto</th>
                          <th className="px-4 py-3 text-right font-semibold">OPEX</th>
                          <th className="px-4 py-3 text-right font-semibold">Lucro Líquido</th>
                          <th className="px-4 py-3 text-right font-semibold">Margem %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Array.from({ length: 12 })
                          .map((_, mIdx) => mIdx)
                          .filter((mIdx) => {
                            if (dreEvolutionPeriod === "q1") return mIdx >= 0 && mIdx <= 2;
                            if (dreEvolutionPeriod === "q2") return mIdx >= 3 && mIdx <= 5;
                            if (dreEvolutionPeriod === "q3") return mIdx >= 6 && mIdx <= 8;
                            if (dreEvolutionPeriod === "q4") return mIdx >= 9 && mIdx <= 11;
                            return true;
                          })
                          .map((mIdx) => {
                            const targetYear = Number(dreEvolutionYear) || new Date().getFullYear();
                            const mStart = new Date(targetYear, mIdx, 1);
                            const mEnd = new Date(targetYear, mIdx + 1, 0, 23, 59, 59);

                            // Receita
                            const mProjects = projects.filter((p) => {
                              const d = new Date(p.created_at || (p as any).created_at);
                              return d >= mStart && d <= mEnd;
                            });
                            const mRev = mProjects.reduce((a, b) => a + Number(b.budget || 0), 0);

                            // Despesas
                            const mExpenses = combinedExpenses.filter((e) => {
                              const d = new Date(e.dueDate ? e.dueDate + "T12:00:00" : Date.now());
                              return d >= mStart && d <= mEnd;
                            });
                            const mDirectExp = mExpenses
                              .filter((e) => Boolean(e.projectId))
                              .reduce((a, b) => a + Number(b.amount || 0), 0);

                            // Payouts
                            const mPayouts = allPayouts
                              .filter((p) => {
                                const targetDate = reportRegime === "caixa" ? (p.payment_date || p.due_date) : p.due_date;
                                if (!targetDate) return false;
                                const d = new Date(targetDate);
                                return d >= mStart && d <= mEnd;
                              })
                              .reduce((a, b) => a + Number(b.amount || 0), 0);

                            const mCogs = mPayouts + mDirectExp;
                            const mGross = mRev - mCogs;
                            const mOpex = mExpenses
                              .filter((e) => !e.projectId)
                              .reduce((a, b) => a + Number(b.amount || 0), 0);
                            const mNet = mGross - mOpex;
                            const mMargin = mRev > 0 ? (mNet / mRev) * 100 : 0;
                            const monthName = format(mStart, "MMM", { locale: ptBR }).toUpperCase();

                            return (
                              <tr key={mIdx} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 font-bold text-foreground">
                                  {monthName}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                  {money(mRev)}
                                </td>
                                <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                                  {mCogs > 0 ? `-${money(mCogs)}` : money(0)}
                                </td>
                                <td className={`px-4 py-3 text-right font-semibold ${mGross >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                  {money(mGross)}
                                </td>
                                <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                                  {mOpex > 0 ? `-${money(mOpex)}` : money(0)}
                                </td>
                                <td
                                  className={`px-4 py-3 text-right font-bold ${
                                    mNet >= 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {money(mNet)}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-foreground">
                                  {mMargin.toFixed(0)}%
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── MÓDULO B: INADIMPLÊNCIA & AGING LIST ───────────────────────── */}
          {reportSubTab === "inadimplencia" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground font-medium">Total de Recebíveis da Carteira</div>
                    <div className="text-xl font-bold text-foreground mt-0.5">
                      {money(accountingData.totalReceivables)}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      {accountingData.agingList.length} contratos monitorados
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground font-medium">Total em Atraso (Vencidos)</div>
                    <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                      {money(accountingData.overdueReceivables)}
                    </div>
                    <span className="text-[11px] text-rose-500 mt-1 block font-medium">
                      {accountingData.agingList.filter((x) => x.isOverdue).length} cobranças em aberto
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground font-medium">Taxa de Inadimplência</div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {accountingData.defaultRate.toFixed(1)}%
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      % do valor global em atraso
                    </span>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <span>Aging List — Mapa Cronológico de Vencimentos</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Classificação de cobranças por faixa de atraso com envio direto de lembretes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Cliente / Projeto</th>
                          <th className="text-left px-4 py-3 font-semibold">Prazo / Vencimento</th>
                          <th className="text-right px-4 py-3 font-semibold">Valor Contratado</th>
                          <th className="text-center px-4 py-3 font-semibold">Faixa de Atraso</th>
                          <th className="text-right px-4 py-3 font-semibold">Ação de Cobrança</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {accountingData.agingList.map((item) => {
                          const badgeColor =
                            item.bracket === "61_90_plus"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : item.bracket === "31_60"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : item.bracket === "1_30"
                              ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";

                          const labelText =
                            item.bracket === "61_90_plus"
                              ? "61+ dias de atraso"
                              : item.bracket === "31_60"
                              ? "31 a 60 dias de atraso"
                              : item.bracket === "1_30"
                              ? "1 a 30 dias de atraso"
                              : "No Prazo / A Vencer";

                          return (
                            <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3.5 font-semibold text-foreground">
                                <div className="flex items-center gap-2">
                                  <FolderKanban className="h-4 w-4 text-blue-500 shrink-0" />
                                  <span>{item.title}</span>
                                </div>
                                <span className="text-[11px] font-normal text-muted-foreground block mt-0.5">
                                  {item.clientName}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-muted-foreground">
                                {formatDate(item.deadline)}
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-foreground">
                                {money(item.amount)}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <Badge variant="outline" className={`text-xs font-semibold ${badgeColor}`}>
                                  {labelText}
                                </Badge>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendReminder(item, "whatsapp")}
                                    className="h-7 px-2 text-[11px] gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                    title="Enviar Lembrete por WhatsApp"
                                  >
                                    <Send className="h-3 w-3" /> WhatsApp
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendReminder(item, "email")}
                                    className="h-7 px-2 text-[11px] gap-1 text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                                    title="Enviar Lembrete por E-mail"
                                  >
                                    <Mail className="h-3 w-3" /> E-mail
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── MÓDULO C: MARGEM DE CONTRIBUIÇÃO POR PROJETO ───────────────── */}
          {reportSubTab === "lucratividade" && (
            <div className="space-y-6">
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span>Ranking de Lucratividade & Margem de Contribuição por Projeto</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Avaliação unitária da rentabilidade de cada contrato (Receita - Custos Diretos de Freela, APIs e Mídia).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Posição / Projeto</th>
                          <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                          <th className="text-right px-4 py-3 font-semibold">Receita</th>
                          <th className="text-right px-4 py-3 font-semibold">Custos Diretos</th>
                          <th className="text-right px-4 py-3 font-semibold">Margem Líquida ($)</th>
                          <th className="text-right px-4 py-3 font-semibold">Margem %</th>
                          <th className="text-center px-4 py-3 font-semibold">Classificação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {accountingData.profitabilityRanking.map((proj, idx) => {
                          const isHigh = proj.marginPercent >= 50;
                          const isMed = proj.marginPercent >= 25 && proj.marginPercent < 50;
                          const maxMargin = Math.max(...accountingData.profitabilityRanking.map((p) => p.margin), 1);
                          const barWidth = Math.max(5, (proj.margin / maxMargin) * 100);

                          return (
                            <tr key={proj.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3.5 font-bold text-foreground">
                                <div className="flex items-center gap-2">
                                  <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[10px] text-muted-foreground font-bold">
                                    #{idx + 1}
                                  </span>
                                  <span className="truncate max-w-[200px]">{proj.title}</span>
                                </div>
                                <div className="w-full bg-muted/60 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      isHigh ? "bg-emerald-500" : isMed ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-muted-foreground">
                                {proj.clientName}
                              </td>
                              <td className="px-4 py-3.5 text-right font-medium text-foreground">
                                {money(proj.revenue)}
                              </td>
                              <td className="px-4 py-3.5 text-right text-rose-500 font-medium">
                                {money(proj.directCosts)}
                              </td>
                              <td className="px-4 py-3.5 text-right font-extrabold text-foreground">
                                {money(proj.margin)}
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-foreground">
                                {proj.marginPercent.toFixed(1)}%
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-semibold ${
                                    isHigh
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                      : isMed
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                      : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                  }`}
                                >
                                  {isHigh ? "Alta Rentabilidade" : isMed ? "Moderada" : "Alerta / Baixa"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── MÓDULO D: PROJEÇÃO DE CONTAS A PAGAR ───────────────────────── */}
          {reportSubTab === "projecao" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Próximos 30 Dias
                      </span>
                      <Calendar className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                      {money(accountingData.projections.d30)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Assinaturas fixas + repasses de freelas agendados
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Projeção para 60 Dias
                      </span>
                      <CalendarDays className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                      {money(accountingData.projections.d60)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      2 ciclos fixos + compromissos firmados
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Projeção para 90 Dias
                      </span>
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                      {money(accountingData.projections.d90)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Runway e previsão de desembolsos trimestrais
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-500" />
                    <span>Mapeamento de Obrigações Recorrentes & Fixas da Empresa</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Assinaturas de IA, ferramentas SaaS corporativas e infraestrutura mensal mapeada.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {combinedExpenses.filter((e) => e.nature === "fixo").length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {combinedExpenses
                        .filter((e) => e.nature === "fixo")
                        .map((exp) => {
                          const catInfo = getCategoryInfo(exp.category);
                          const CatIcon = catInfo.icon;
                          return (
                            <div
                              key={exp.id}
                              className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-background ${catInfo.colorClass}`}>
                                  <CatIcon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-xs text-foreground">{exp.description}</p>
                                  <span className="text-[11px] text-muted-foreground">
                                    {catInfo.label} • Vencimento: {formatDate(exp.dueDate)}
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                                {money(exp.amount)}/mês
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Nenhuma despesa fixa recorrente cadastrada. Ao registrar despesas, marque o tipo como "Custo Fixo / Mensal".
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── MÓDULO E: BALANÇO PATRIMONIAL ─────────────────────────────── */}
          {reportSubTab === "balanco" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna 1: ATIVOS */}
                <Card className="bg-card border-border shadow-xs">
                  <CardHeader className="pb-3 border-b border-border bg-emerald-500/5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                        <span>ATIVOS DA EMPRESA (+)</span>
                      </CardTitle>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                        {money(accountingData.balanceSheet.totalAssets)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs">
                      <div>
                        <p className="font-semibold text-foreground">Saldo Líquido em Caixa / Bancos</p>
                        <span className="text-[11px] text-muted-foreground">Recursos disponíveis imediatos</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {money(accountingData.balanceSheet.assetsCash)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs">
                      <div>
                        <p className="font-semibold text-foreground">Contas a Receber (Clientes & Projetos)</p>
                        <span className="text-[11px] text-muted-foreground">Valor total em contratos vigentes</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {money(accountingData.balanceSheet.assetsReceivables)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Coluna 2: PASSIVOS */}
                <Card className="bg-card border-border shadow-xs">
                  <CardHeader className="pb-3 border-b border-border bg-rose-500/5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <ArrowDownRight className="h-5 w-5 text-rose-500" />
                        <span>PASSIVOS & OBRIGAÇÕES (-)</span>
                      </CardTitle>
                      <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                        {money(accountingData.balanceSheet.totalLiabilities)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs">
                      <div>
                        <p className="font-semibold text-foreground">Contas a Pagar (Fornecedores & SaaS)</p>
                        <span className="text-[11px] text-muted-foreground">Despesas pendentes de quitação</span>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {money(accountingData.balanceSheet.liabilitiesPayable)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs">
                      <div>
                        <p className="font-semibold text-foreground">Repasses a Freelancers (A Pagar)</p>
                        <span className="text-[11px] text-muted-foreground">Obrigações com prestadores de serviço</span>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {money(accountingData.balanceSheet.liabilitiesFreelancers)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs">
                      <div>
                        <p className="font-semibold text-foreground">Provisão de Impostos (Simples Nacional ~6%)</p>
                        <span className="text-[11px] text-muted-foreground">Estimativa fiscal sobre faturamento</span>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {money(accountingData.balanceSheet.liabilitiesTaxesEstimated)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Card Destaque: Patrimônio Líquido Estimado */}
              <Card className="bg-card border-indigo-500/30 shadow-xs">
                <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-indigo-500" />
                      <span>(=) PATRIMÔNIO LÍQUIDO ESTIMADO (ATIVOS - PASSIVOS)</span>
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Indicador sintético de solidez financeira e valor contábil líquido da operação.
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-2xl font-black ${
                        accountingData.balanceSheet.estimatedEquity >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {money(accountingData.balanceSheet.estimatedEquity)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── MÓDULO F: FECHAMENTO FISCAL & CONTABILIDADE ───────────────── */}
          {reportSubTab === "fiscal" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground font-medium">NFS-e Emitidas no Período</div>
                    <div className="text-xl font-bold text-foreground mt-0.5">
                      {accountingData.fiscal.nfseCount} notas
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Faturamento oficial: {money(accountingData.fiscal.nfseTotalBilled)}
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground font-medium">Impostos Estimados (DAS ~6%)</div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                      {money(accountingData.fiscal.estimatedTaxes.das)}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Simples Nacional (Anexo III)
                    </span>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground font-medium">ISS Estimado (2% a 5%)</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {money(accountingData.fiscal.estimatedTaxes.iss)}
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Tributo municipal
                    </span>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <ReceiptText className="h-4 w-4 text-purple-500" />
                      <span>Faturamento Bruto por Tipo de Serviço (Enquadramento Fiscal)</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Discriminação por atividade para conferência de alíquotas e apuração do Simples Nacional / Lucro Presumido.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleExportCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs self-start sm:self-auto"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Baixar Pacote Contábil Completo
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border">
                      <span className="text-[11px] uppercase font-semibold text-muted-foreground block">
                        Automação & IA
                      </span>
                      <div className="text-lg font-bold text-foreground mt-1">
                        {money(accountingData.fiscal.byServiceType.IA)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">LC 116 / 01.07</span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border">
                      <span className="text-[11px] uppercase font-semibold text-muted-foreground block">
                        Tráfego Pago & Mídia
                      </span>
                      <div className="text-lg font-bold text-foreground mt-1">
                        {money(accountingData.fiscal.byServiceType.Trafego)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">LC 116 / 17.06</span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border">
                      <span className="text-[11px] uppercase font-semibold text-muted-foreground block">
                        Desenvolvimento de Sites
                      </span>
                      <div className="text-lg font-bold text-foreground mt-1">
                        {money(accountingData.fiscal.byServiceType.Sites)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">LC 116 / 01.05</span>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/30 border border-border">
                      <span className="text-[11px] uppercase font-semibold text-muted-foreground block">
                        Social Media & Gestão
                      </span>
                      <div className="text-lg font-bold text-foreground mt-1">
                        {money(accountingData.fiscal.byServiceType.SocialMedia)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">LC 116 / 17.01</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── MODAL: Gerar Nova NFS-e ────────────────────────────────────────── */}
      <Dialog open={openNfseModal} onOpenChange={setOpenNfseModal}>
        <DialogContent className="sm:max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" /> Emitir Nota Fiscal de Serviço (NFS-e)
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Gere a NFS-e oficial preenchendo os dados do tomador e as especificações tributárias do serviço prestado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEmitNfseSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">
                Cliente Tomador do Serviço <span className="text-rose-500">*</span>
              </Label>
              <Select value={nfseClientId} onValueChange={setNfseClientId} required>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione a empresa / cliente tomador" />
                </SelectTrigger>
                <SelectContent>
                  {clientsList.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name || c.full_name} {c.cnpj ? `— CNPJ: ${c.cnpj}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClientInfo && (
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                  Dados Fiscais do Tomador
                </span>
                <p className="font-semibold text-stone-800">
                  {selectedClientInfo.corporate_name || selectedClientInfo.company_name || selectedClientInfo.full_name}
                </p>
                <div className="grid grid-cols-2 gap-2 text-stone-500 text-[11px]">
                  <span>CNPJ/CPF: {selectedClientInfo.cnpj || "Não cadastrado"}</span>
                  <span>E-mail: {selectedClientInfo.email || "—"}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Projeto Vinculado (Opcional)
                </Label>
                <Select value={nfseProjectId} onValueChange={setNfseProjectId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione um projeto ou Avulso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Faturamento Avulso)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Item da Lista de Serviços (LC 116) <span className="text-rose-500">*</span>
                </Label>
                <Select value={nfseItemLista} onValueChange={setNfseItemLista}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01.07">01.07 - Suporte Técnico e Software</SelectItem>
                    <SelectItem value="17.06">17.06 - Propaganda e Marketing Digital</SelectItem>
                    <SelectItem value="01.05">01.05 - Licenciamento de Programas</SelectItem>
                    <SelectItem value="10.02">10.02 - Agenciamento e Intermediação</SelectItem>
                    <SelectItem value="17.01">17.01 - Assessoria e Consultoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Valor Bruto dos Serviços (R$) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={nfseServiceValue}
                  onChange={(e) => setNfseServiceValue(e.target.value)}
                  className="h-9 text-xs font-mono font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-stone-700">
                  Alíquota ISS (%) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={nfseIssRate}
                  onChange={(e) => setNfseIssRate(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">
                Discriminação dos Serviços Prestados <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Descreva detalhadamente as atividades executadas para constar no corpo da NFS-e..."
                value={nfseDescription}
                onChange={(e) => setNfseDescription(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenNfseModal(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingNfse}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
              >
                {isSubmittingNfse ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Transmitindo à Prefeitura...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Transmitir e Emitir NFS-e
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Cancelar NFS-e ──────────────────────────────────────────── */}
      <Dialog open={openCancelModal} onOpenChange={setOpenCancelModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <XOctagon className="h-5 w-5" /> Cancelar Nota Fiscal de Serviço
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Informe a justificativa legal do cancelamento da NFS-e nº {cancelingInvoice?.number}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmCancelNfse} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-stone-700">
                Motivo do Cancelamento <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Ex: Erro de digitação no valor / emissão em duplicidade..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCancelModal(false)}
                className="text-xs"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={cancelNfse.isPending}
                className="text-xs font-semibold"
              >
                {cancelNfse.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Componente Principal / Guard Estrito de RBAC ─────────────────────────────
function FinancePage() {
  const { user, isLoading, isGestor, isFreelancer, isCliente } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isCliente) {
      navigate({ to: "/cliente", replace: true });
    }
  }, [isLoading, isCliente, navigate]);

  // Guard Neutro: Enquanto o estado do usuário/sessão carrega, NUNCA renderizar dados
  if (isLoading || !user || isCliente) {
    return <FinanceSkeleton />;
  }

  // Renderização 100% isolada por papel (Sem vazamento de estado ou cache de gestor)
  if (isFreelancer) {
    return <FreelancerFinanceView user={user} />;
  }

  if (isGestor) {
    return <GestorFinanceView />;
  }

  return <FinanceSkeleton />;
}
