import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUSES, SERVICE_LABEL, STATUS_LABEL, type ServiceType } from "@/mocks/types";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Activity, CheckCircle2, Users, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Delski" },
      { name: "description", content: "Métricas de projetos, freelancers e taxa de conclusão da agência Delski." },
      { property: "og:title", content: "Dashboard — Delski" },
      { property: "og:description", content: "Métricas e visão geral dos projetos Delski." },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const projects = useStore((s) => s.projects);
  const freelancers = useStore((s) => s.freelancers);
  const user = useStore((s) => s.user);

  const visible = useMemo(
    () => (user?.role === "freelancer" ? projects.filter((p) => p.freelancerId === user.freelancerId) : projects),
    [projects, user],
  );

  const active = visible.filter((p) => p.status !== "Concluido").length;
  const done = visible.filter((p) => p.status === "Concluido").length;
  const rate = visible.length ? Math.round((done / visible.length) * 100) : 0;

  const byType = (["IA", "Trafego", "Sites"] as ServiceType[]).map((t) => ({
    name: SERVICE_LABEL[t].split(" ")[0],
    total: visible.filter((p) => p.type === t).length,
  }));
  const byStatus = STATUSES.map((s) => ({ name: STATUS_LABEL[s], value: visible.filter((p) => p.status === s).length })).filter((d) => d.value > 0);

  const kpis = [
    { label: "Projetos ativos", value: active, icon: Activity, color: "text-brand" },
    { label: "Concluídos", value: done, icon: CheckCircle2, color: "text-chart-3" },
    { label: "Freelancers", value: freelancers.filter((f) => f.active).length, icon: Users, color: "text-chart-2" },
    { label: "Taxa de conclusão", value: `${rate}%`, icon: TrendingUp, color: "text-chart-4" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {user?.name} 👋</h1>
          <p className="text-sm text-muted-foreground">Visão geral da operação Delski.</p>
        </div>
        <Button asChild variant="outline"><Link to="/app/projects">Ver todos os projetos <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="mt-2 text-3xl font-bold">{k.value}</div>
                </div>
                <div className={`grid h-10 w-10 place-items-center rounded-lg bg-accent ${k.color}`}>
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Projetos por tipo de serviço</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="total" fill="var(--brand)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Distribuição por status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {byStatus.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{d.name} · {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Projetos recentes</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {visible.slice(0, 5).map((p) => (
            <Link key={p.id} to="/app/projects/$id" params={{ id: p.id }} className="flex items-center justify-between py-3 hover:bg-accent/40 -mx-2 px-2 rounded-md transition-colors">
              <div>
                <div className="font-medium">{p.client}</div>
                <div className="text-xs text-muted-foreground">{SERVICE_LABEL[p.type]} · prazo {new Date(p.deadline).toLocaleDateString("pt-BR")}</div>
              </div>
              <Badge variant="secondary">{STATUS_LABEL[p.status]}</Badge>
            </Link>
          ))}
          {visible.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Nenhum projeto ainda.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
