import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, DollarSign, TrendingUp, Users, PieChart, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFinancials } from "@/hooks/useFinancials";
import { SERVICE_LABEL, STATUS_LABEL } from "@/mocks/types";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios & Exportação Financeira — Delski ERP" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { isGestor } = useAuth();
  const { summary, projects, isLoading } = useFinancials();

  if (!isGestor) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Acesso Restrito ao Gestor</h2>
        <p className="text-sm text-muted-foreground">
          O painel de consolidação financeira e exportação em CSV é exclusivo para gestores da agência. Níveis de permissão são definidos e protegidos pelo banco de dados Supabase (RLS).
        </p>
      </div>
    );
  }

  // Instant CSV Export Functionality (UTF-8 BOM for Excel)
  const exportFinancialCSV = () => {
    const headers = [
      "ID Projeto",
      "Título / Projeto",
      "Cliente",
      "Tipo de Serviço",
      "Status",
      "Prazo",
      "Receita Bruta (R$)",
      "Custo Freelancer (R$)",
      "Margem Líquida (R$)",
      "Margem (%)"
    ];

    const rows = projects.map((p) => {
      const budget = Number(p.budget) || 0;
      const cost = Number(p.freelancer_cost) || 0;
      const margin = budget - cost;
      const pct = budget > 0 ? ((margin / budget) * 100).toFixed(1) + "%" : "0%";
      const clientName = p.client?.full_name || "N/A";

      return [
        `"${p.id}"`,
        `"${p.title.replace(/"/g, '""')}"`,
        `"${clientName.replace(/"/g, '""')}"`,
        `"${p.service_type}"`,
        `"${p.status}"`,
        `"${p.deadline || "-"}"`,
        budget.toFixed(2),
        cost.toFixed(2),
        margin.toFixed(2),
        `"${pct}"`
      ];
    });

    const csvContent =
      "\uFEFF" + // UTF-8 BOM
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `delski_relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Relatório CSV gerado e baixado com sucesso!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consolidação & Exportação Financeira</h1>
          <p className="text-sm text-muted-foreground">
            Painel de métricas operacionais, controle de custos com freelancers e margem líquida (Fonte de dados: Supabase DB).
          </p>
        </div>
        <Button onClick={exportFinancialCSV} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2" disabled={isLoading || projects.length === 0}>
          <Download className="h-4 w-4" />
          Exportar Relatório CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Receita Bruta Total
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              R$ {summary.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Soma dos contratos cadastrados no Supabase</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Custos com Freelancers
              <Users className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-rose-500">
              R$ {summary.totalFreelancerCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Repasses alocados aos freelancers</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Margem de Contribuição Líquida
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-indigo-500 flex items-center gap-2">
              R$ {summary.netMargin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                {summary.marginPercentage.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lucro operacional antes dos custos fixos</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Financial Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <PieChart className="h-5 w-5 text-indigo-500" />
            Detalhamento por Projeto & Serviço
          </CardTitle>
          <CardDescription>
            Visão individualizada de receitas, custos diretos e margem líquida calculada por projeto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span>Calculando métricas financeiras a partir do banco de dados...</span>
            </div>
          )}

          {!isLoading && projects.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum projeto cadastrado no banco de dados para calcular métricas financeiras.
            </div>
          )}

          {!isLoading && projects.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Título do Projeto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vertical</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Receita Bruta</TableHead>
                    <TableHead className="text-right">Custo Freelancer</TableHead>
                    <TableHead className="text-right">Margem Líquida</TableHead>
                    <TableHead className="text-right">Margem %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => {
                    const budget = Number(p.budget) || 0;
                    const cost = Number(p.freelancer_cost) || 0;
                    const margin = budget - cost;
                    const pct = budget > 0 ? ((margin / budget) * 100).toFixed(1) : "0.0";

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-semibold text-foreground">{p.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.client?.full_name || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {SERVICE_LABEL[p.service_type] || p.service_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-zinc-800 text-zinc-300 text-xs">
                            {STATUS_LABEL[p.status] || p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-rose-500 font-medium">
                          R$ {cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-indigo-400">
                          R$ {margin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400">
                            {pct}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
