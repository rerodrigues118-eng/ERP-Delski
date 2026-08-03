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
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
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
      { title: "Financeiro — Delski ERP" },
      {
        name: "description",
        content: "Receitas, despesas, repasses de freelancers e investimento do cliente.",
      },
    ],
  }),
  component: FinancePage,
});

const money = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "freelancer", label: "Pagamento freelancer" },
  { value: "ads", label: "Verba de anúncios" },
  { value: "ferramentas", label: "Ferramentas / SaaS" },
  { value: "outros", label: "Outros" },
];
const STATUSES: ExpenseStatus[] = ["Pendente", "Aprovado", "Pago"];

const statusColor: Record<ExpenseStatus, string> = {
  Pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Aprovado: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Pago: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

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

  const totalFreelancerCost = useMemo(() => {
    return projects.reduce((a, p) => a + Number(p.freelancer_cost || 0), 0);
  }, [projects]);

  const completedFreelancerCost = useMemo(() => {
    return projects
      .filter((p) => p.status === "Concluido")
      .reduce((a, p) => a + Number(p.freelancer_cost || 0), 0);
  }, [projects]);

  const pendingFreelancerCost = totalFreelancerCost - completedFreelancerCost;

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
                  Recebido / Concluído
                </div>
                <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {money(completedFreelancerCost)}
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
                      <Badge
                        className={`text-xs ${
                          p.status === "Concluido"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {p.status === "Concluido" ? "Liberado / Quitado" : "A Receber na Conclusão"}
                      </Badge>
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
  const expenses = useStore((s) => s.expenses);
  const freelancersStore = useStore((s) => s.freelancers);
  const addExpense = useStore((s) => s.addExpense);
  const updateExpenseStatus = useStore((s) => s.updateExpenseStatus);
  const removeExpense = useStore((s) => s.removeExpense);

  const queryClient = useQueryClient();
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

  const perProject = useMemo(
    () =>
      projects.map((p) => {
        const freelancerCost = Number(p.freelancer_cost || 0);
        const additionalCost = Number(p.additional_costs || 0);
        const projectExpenses = expenses
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
    [projects, expenses],
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
    const paidFromExpenses = expenses
      .filter((e) => e.status === "Pago")
      .reduce((a, e) => a + e.amount, 0);
    const paid = paidFromProjects + paidFromExpenses;

    const totalFreelancerCosts = projects.reduce((a, p) => a + Number(p.freelancer_cost || 0), 0);
    const totalAdditionalCosts = projects.reduce((a, p) => a + Number(p.additional_costs || 0), 0);
    const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);

    const totalCosts = totalFreelancerCosts + totalAdditionalCosts + totalExpenses;
    const profit = revenue - totalCosts;

    return { revenue, paid, owed, profit };
  }, [projects, expenses]);

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

  const submit = () => {
    if (!form.projectId || !form.description || !form.amount)
      return toast.error("Preencha projeto, descrição e valor.");
    addExpense({
      projectId: form.projectId,
      description: form.description,
      amount: Number(form.amount),
      category: form.category,
      status: form.status,
      freelancerId: form.category === "freelancer" ? form.freelancerId || undefined : undefined,
    });
    toast.success("Despesa registrada.");
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar nova despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Projeto</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                >
                  <SelectTrigger>
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
              <div>
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Entrega landing page"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  placeholder="1500"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as ExpenseCategory }))}
                >
                  <SelectTrigger>
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
                <div>
                  <Label>Freelancer</Label>
                  <Select
                    value={form.freelancerId}
                    onValueChange={(v) => setForm((f) => ({ ...f, freelancerId: v }))}
                  >
                    <SelectTrigger>
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
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as ExpenseStatus }))}
                >
                  <SelectTrigger>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAdd(false)}>
                Cancelar
              </Button>
              <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Receita total</div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {money(totals.revenue)}
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Já pago</div>
                <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {money(totals.paid)}
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">A pagar (freelas)</div>
                <div className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {money(totals.owed)}
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Lucro estimado</div>
                <div className="mt-2 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {money(totals.profit)}
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profit" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="profit">Lucro por projeto</TabsTrigger>
          <TabsTrigger value="expenses">Despesas ({expenses.length})</TabsTrigger>
          <TabsTrigger value="freelancers">Pagamentos de freelas</TabsTrigger>
        </TabsList>

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

        <TabsContent value="expenses">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Lançamentos de despesas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3">Descrição</th>
                      <th className="text-left px-4 py-3">Categoria</th>
                      <th className="text-right px-4 py-3">Valor</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-foreground">
                          {e.description}
                        </td>
                        <td className="px-4 py-3.5 capitalize text-xs text-muted-foreground">
                          {e.category}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold">{money(e.amount)}</td>
                        <td className="px-4 py-3.5">
                          <Select
                            value={e.status}
                            onValueChange={(st) => updateExpenseStatus(e.id, st as ExpenseStatus)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs bg-card border-border">
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
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeExpense(e.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        <TabsContent value="freelancers">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Status de pagamentos dos freelancers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3">Projeto</th>
                      <th className="text-left px-4 py-3">Freelancer</th>
                      <th className="text-right px-4 py-3">Valor Acordado</th>
                      <th className="text-right px-4 py-3">Status da Despesa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expenses
                      .filter((e) => e.category === "freelancer")
                      .map((e) => {
                        const proj = projects.find((p) => p.id === e.projectId);
                        const free = freelancersStore.find((f) => f.id === e.freelancerId);
                        return (
                          <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3.5 font-bold">{proj?.title || "N/A"}</td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              {free?.name || "Freelancer Registrado"}
                            </td>
                            <td className="px-4 py-3.5 text-right font-extrabold text-amber-600 dark:text-amber-400">
                              {money(e.amount)}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <Badge className={statusColor[e.status]}>{e.status}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
export function FinancePage() {
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
