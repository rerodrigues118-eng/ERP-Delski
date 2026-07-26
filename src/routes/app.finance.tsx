import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ExpenseCategory, ExpenseStatus } from "@/mocks/types";

export const Route = createFileRoute("/app/finance")({
  head: () => ({
    meta: [
      { title: "Financeiro — Delski" },
      { name: "description", content: "Receitas, despesas, lucro por projeto e pagamentos de freelancers." },
      { property: "og:title", content: "Financeiro — Delski" },
      { property: "og:description", content: "Controle financeiro por projeto e pagamentos de freelancers." },
    ],
  }),
  component: FinancePage,
});

const money = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

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

function FinancePage() {
  const projects = useStore((s) => s.projects);
  const expenses = useStore((s) => s.expenses);
  const freelancers = useStore((s) => s.freelancers);
  const addExpense = useStore((s) => s.addExpense);
  const updateExpenseStatus = useStore((s) => s.updateExpenseStatus);
  const removeExpense = useStore((s) => s.removeExpense);

  const perProject = useMemo(() => projects.map((p) => {
    const cost = expenses.filter((e) => e.projectId === p.id).reduce((a, b) => a + b.amount, 0);
    return { ...p, cost, profit: p.budget - cost, margin: p.budget ? ((p.budget - cost) / p.budget) * 100 : 0 };
  }), [projects, expenses]);

  const totals = useMemo(() => {
    const revenue = projects.reduce((a, p) => a + p.budget, 0);
    const paid = expenses.filter((e) => e.status === "Pago").reduce((a, e) => a + e.amount, 0);
    const owed = expenses.filter((e) => e.status !== "Pago" && e.category === "freelancer").reduce((a, e) => a + e.amount, 0);
    const profit = revenue - expenses.reduce((a, e) => a + e.amount, 0);
    return { revenue, paid, owed, profit };
  }, [projects, expenses]);

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ projectId: "", description: "", amount: "", category: "freelancer" as ExpenseCategory, freelancerId: "", status: "Pendente" as ExpenseStatus });

  const submit = () => {
    if (!form.projectId || !form.description || !form.amount) return toast.error("Preencha projeto, descrição e valor.");
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
    setForm({ projectId: "", description: "", amount: "", category: "freelancer", freelancerId: "", status: "Pendente" });
  };

  const kpis = [
    { label: "Receita total", value: money(totals.revenue), icon: DollarSign, tone: "text-brand" },
    { label: "Já pago", value: money(totals.paid), icon: Wallet, tone: "text-chart-3" },
    { label: "A pagar (freelas)", value: money(totals.owed), icon: TrendingDown, tone: "text-chart-4" },
    { label: "Lucro estimado", value: money(totals.profit), icon: TrendingUp, tone: "text-chart-2" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Receitas, custos e pagamento de freelancers.</p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nova despesa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar despesa</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Projeto</Label>
                <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.client}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (R$)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {form.category === "freelancer" && (
                <div>
                  <Label>Freelancer</Label>
                  <Select value={form.freelancerId} onValueChange={(v) => setForm({ ...form, freelancerId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>{freelancers.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ExpenseStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={submit}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="mt-2 text-2xl font-bold">{k.value}</div>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-lg bg-accent ${k.tone}`}><k.icon className="h-5 w-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Lucro por projeto</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="freelas">Pagamentos de freelas</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <Card>
            <CardHeader><CardTitle className="text-base">Receita vs custo por projeto</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr className="text-left">
                    <th className="py-2 pr-2">Cliente</th><th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2 text-right">Receita</th><th className="py-2 pr-2 text-right">Custo</th>
                    <th className="py-2 pr-2 text-right">Lucro</th><th className="py-2 pr-2 text-right">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {perProject.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 pr-2 font-medium">{p.client}</td>
                      <td className="py-2 pr-2"><Badge variant="outline">{p.type}</Badge></td>
                      <td className="py-2 pr-2 text-right">{money(p.budget)}</td>
                      <td className="py-2 pr-2 text-right text-muted-foreground">{money(p.cost)}</td>
                      <td className={`py-2 pr-2 text-right font-medium ${p.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(p.profit)}</td>
                      <td className="py-2 pr-2 text-right">{p.margin.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader><CardTitle className="text-base">Todas as despesas</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {expenses.map((e) => {
                const project = projects.find((p) => p.id === e.projectId);
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.description}</div>
                      <div className="text-xs text-muted-foreground">{project?.client || "—"} · {CATEGORIES.find((c) => c.value === e.category)?.label}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right font-medium">{money(e.amount)}</div>
                      <Select value={e.status} onValueChange={(v) => updateExpenseStatus(e.id, v as ExpenseStatus)}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Badge className={statusColor[e.status]}>{e.status}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => removeExpense(e.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
              {expenses.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma despesa ainda.</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="freelas">
          <Card>
            <CardHeader><CardTitle className="text-base">Pagamentos por freelancer</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {freelancers.map((f) => {
                const items = expenses.filter((e) => e.category === "freelancer" && e.freelancerId === f.id);
                const pend = items.filter((e) => e.status !== "Pago").reduce((a, b) => a + b.amount, 0);
                const paid = items.filter((e) => e.status === "Pago").reduce((a, b) => a + b.amount, 0);
                return (
                  <div key={f.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-muted-foreground">{f.email}</div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div><span className="text-muted-foreground">A pagar:</span> <span className="font-medium">{money(pend)}</span></div>
                        <div><span className="text-muted-foreground">Pago:</span> <span className="font-medium text-emerald-600">{money(paid)}</span></div>
                      </div>
                    </div>
                    {items.length > 0 && (
                      <div className="mt-2 space-y-1 pl-4 border-l">
                        {items.map((e) => (
                          <div key={e.id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{e.description}</span>
                            <span className="flex items-center gap-2">
                              {money(e.amount)}
                              <Badge className={statusColor[e.status]}>{e.status}</Badge>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
