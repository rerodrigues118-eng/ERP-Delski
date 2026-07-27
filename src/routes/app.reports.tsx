import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileSpreadsheet } from "lucide-react";
import { STATUS_LABEL } from "@/mocks/types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios & Custos — Delski" },
      { name: "description", content: "Exporte relatórios de projetos, receitas e pagamentos de freelancers em CSV." },
      { property: "og:title", content: "Relatórios & Custos — Delski" },
      { property: "og:description", content: "Exportação de dados em CSV para análise externa." },
    ],
  }),
  component: ReportsPage,
});

const escapeCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (rows: (string | number | undefined)[][]) =>
  rows.map((r) => r.map(escapeCell).join(";")).join("\n");

const download = (filename: string, csv: string) => {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`${filename} exportado`);
};

function ReportsPage() {
  const projects = useStore((s) => s.projects);
  const freelancers = useStore((s) => s.freelancers);
  const expenses = useStore((s) => s.expenses);

  const projectsRows = useMemo(() => {
    const header = ["ID", "Cliente", "Tipo", "Status", "Orçamento", "Custos", "Lucro", "Freelancer", "Prazo", "Criado em"];
    const body = projects.map((p) => {
      const custos = expenses.filter((e) => e.projectId === p.id).reduce((s, e) => s + e.amount, 0);
      const f = freelancers.find((x) => x.id === p.freelancerId);
      return [
        p.id, p.client, p.type, STATUS_LABEL[p.status],
        p.budget, custos, p.budget - custos,
        f?.name || "",
        new Date(p.deadline).toLocaleDateString("pt-BR"),
        new Date(p.createdAt).toLocaleDateString("pt-BR"),
      ];
    });
    return [header, ...body];
  }, [projects, expenses, freelancers]);

  const revenueRows = useMemo(() => {
    const header = ["Cliente", "Projeto", "Tipo", "Status", "Receita (R$)", "Data"];
    const body = projects.map((p) => [
      p.client, p.id, p.type, STATUS_LABEL[p.status], p.budget,
      new Date(p.createdAt).toLocaleDateString("pt-BR"),
    ]);
    return [header, ...body];
  }, [projects]);

  const freelancerRows = useMemo(() => {
    const header = ["Freelancer", "Projeto", "Descrição", "Valor (R$)", "Status", "Data"];
    const body = expenses
      .filter((e) => e.category === "freelancer")
      .map((e) => {
        const p = projects.find((x) => x.id === e.projectId);
        const f = freelancers.find((x) => x.id === e.freelancerId);
        return [
          f?.name || "",
          p?.client || e.projectId,
          e.description,
          e.amount,
          e.status,
          new Date(e.createdAt).toLocaleDateString("pt-BR"),
        ];
      });
    return [header, ...body];
  }, [expenses, projects, freelancers]);

  const totals = useMemo(() => {
    const receita = projects.reduce((s, p) => s + p.budget, 0);
    const custo = expenses.reduce((s, e) => s + e.amount, 0);
    const pagFreela = expenses.filter((e) => e.category === "freelancer").reduce((s, e) => s + e.amount, 0);
    return { receita, custo, pagFreela, lucro: receita - custo };
  }, [projects, expenses]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios & Custos</h1>
          <p className="text-sm text-muted-foreground">Exporte dados operacionais e financeiros em CSV (compatível com Excel/Google Sheets).</p>
        </div>
        <Badge variant="secondary" className="gap-1"><FileSpreadsheet className="h-3 w-3" /> Formato CSV UTF-8</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Receita bruta</div><div className="text-xl font-semibold">R$ {totals.receita.toLocaleString("pt-BR")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Custos totais</div><div className="text-xl font-semibold">R$ {totals.custo.toLocaleString("pt-BR")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Pagamentos freelas</div><div className="text-xl font-semibold">R$ {totals.pagFreela.toLocaleString("pt-BR")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Lucro líquido</div><div className="text-xl font-semibold text-brand">R$ {totals.lucro.toLocaleString("pt-BR")}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projetos</TabsTrigger>
          <TabsTrigger value="revenue">Receitas de clientes</TabsTrigger>
          <TabsTrigger value="freelancers">Pagamentos de freelancers</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <ReportCard
            title="Projetos consolidados"
            description="Uma linha por projeto com orçamento, custos, lucro e freelancer."
            rows={projectsRows}
            filename="delski-projetos.csv"
          />
        </TabsContent>
        <TabsContent value="revenue">
          <ReportCard
            title="Receitas de clientes"
            description="Faturamento por projeto para conciliação financeira."
            rows={revenueRows}
            filename="delski-receitas.csv"
          />
        </TabsContent>
        <TabsContent value="freelancers">
          <ReportCard
            title="Pagamentos de freelancers"
            description="Todas as despesas categorizadas como pagamento de freelancer."
            rows={freelancerRows}
            filename="delski-pagamentos-freelancers.csv"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportCard({
  title, description, rows, filename,
}: { title: string; description: string; rows: (string | number | undefined)[][]; filename: string }) {
  const [header, ...body] = rows;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <Button onClick={() => download(filename, toCsv(rows))}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase">
              <tr>{header?.map((h, i) => <th key={i} className="text-left px-3 py-2 whitespace-nowrap">{String(h)}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {body.slice(0, 20).map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => <td key={j} className="px-3 py-2 whitespace-nowrap">{c === undefined ? "" : String(c)}</td>)}
                </tr>
              ))}
              {body.length === 0 && (
                <tr><td colSpan={header?.length || 1} className="text-center py-6 text-muted-foreground">Sem dados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {body.length > 20 && (
          <p className="text-xs text-muted-foreground mt-2">Mostrando 20 de {body.length} linhas. Exporte o CSV para ver tudo.</p>
        )}
      </CardContent>
    </Card>
  );
}
