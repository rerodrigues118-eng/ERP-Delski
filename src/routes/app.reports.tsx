import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, DollarSign, TrendingUp, Users, PieChart, ArrowUpRight, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios & Exportação Financeira — Delski ERP" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const user = useStore((s) => s.user);
  const projects = useStore((s) => s.projects);
  const isGestor = user?.role === "gestor";

  if (!isGestor) {
    return (
      <div className="p-8 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Acesso Restrito ao Gestor</h2>
        <p className="text-sm text-muted-foreground">
          O painel de consolidação financeira e exportação em CSV é exclusivo para gestores da agência.
        </p>
      </div>
    );
  }

  // Financial Metric Calculations
  const totalGrossRevenue = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const totalFreelancerCost = projects.reduce((acc, p) => acc + (p.freelancerCost || 0), 0);
  const netContributionMargin = totalGrossRevenue - totalFreelancerCost;
  const marginPercentage = totalGrossRevenue > 0 ? ((netContributionMargin / totalGrossRevenue) * 100).toFixed(1) : "0.0";

  // Instant CSV Export Functionality (UTF-8 BOM for Excel)
  const exportFinancialCSV = () => {
    const headers = [
      "ID Projeto",
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
      const budget = p.budget || 0;
      const cost = p.freelancerCost || 0;
      const margin = budget - cost;
      const pct = budget > 0 ? ((margin / budget) * 100).toFixed(1) + "%" : "0%";

      return [
        `"${p.id}"`,
        `"${p.client.replace(/"/g, '""')}"`,
        `"${p.type}"`,
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
            Painel de métricas operacionais, controle de custos com freelancers e margem líquida.
          </p>
        </div>
        <Button onClick={exportFinancialCSV} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2">
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
              R$ {totalGrossRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Soma de todos os contratos vigentes</p>
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
              R$ {totalFreelancerCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Repasses alocados para freelancers</p>
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
              R$ {netContributionMargin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                {marginPercentage}%
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
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Cliente / Projeto</TableHead>
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
                  const budget = p.budget || 0;
                  const cost = p.freelancerCost || 0;
                  const margin = budget - cost;
                  const pct = budget > 0 ? ((margin / budget) * 100).toFixed(1) : "0.0";

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-foreground">{p.client}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {p.type === "IA" ? "Automação IA" : p.type === "Trafego" ? "Tráfego Pago" : "Sites"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-zinc-800 text-zinc-300 text-xs">
                          {p.status}
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
        </CardContent>
      </Card>
    </div>
  );
}
