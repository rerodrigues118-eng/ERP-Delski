import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUSES, SERVICE_LABEL, STATUS_LABEL, type ServiceType } from "@/mocks/types";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Activity, CheckCircle2, Users, TrendingUp, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Delski ERP" },
      { name: "description", content: "Painel corporativo da agência Delski para acompanhamento de projetos e freelancers." },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

function Dashboard() {
  const projects = useStore((s) => s.projects);
  const freelancers = useStore((s) => s.freelancers);
  const user = useStore((s) => s.user);

  const isCliente = user?.role === "cliente";
  const isFreelancer = user?.role === "freelancer";

  const visible = useMemo(() => {
    if (isCliente) {
      return projects.filter((p) => !p.clientId || p.clientId === user?.clientId);
    }
    if (isFreelancer) {
      return projects.filter((p) => p.freelancerId === user?.freelancerId);
    }
    return projects;
  }, [projects, user, isCliente, isFreelancer]);

  const active = visible.filter((p) => p.status !== "Concluido").length;
  const done = visible.filter((p) => p.status === "Concluido").length;
  const rate = visible.length ? Math.round((done / visible.length) * 100) : 0;

  const byType = (["IA", "Trafego", "Sites"] as ServiceType[]).map((t) => ({
    name: SERVICE_LABEL[t].split(" ")[0],
    total: visible.filter((p) => p.type === t).length,
  }));
  
  const byStatus = STATUSES.map((s) => ({
    name: STATUS_LABEL[s],
    value: visible.filter((p) => p.status === s).length,
  })).filter((d) => d.value > 0);

  const kpis = [
    { label: "Projetos Ativos", value: active, icon: Activity, color: "text-indigo-400" },
    { label: "Entregas Concluídas", value: done, icon: CheckCircle2, color: "text-emerald-400" },
    { label: isCliente ? "Plano de Serviço" : "Freelancers Ativos", value: isCliente ? "Enterprise" : freelancers.filter((f) => f.active).length, icon: isCliente ? ShieldCheck : Users, color: "text-amber-400" },
    { label: "Taxa de Conclusão", value: `${rate}%`, icon: TrendingUp, color: "text-rose-400" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Olá, {user?.name} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {isCliente
              ? "Portal do Cliente — Acompanhamento em tempo real do progresso das suas demandas."
              : isFreelancer
              ? "Área do Freelancer — Projetos e tarefas sob sua responsabilidade."
              : "Painel do Gestor — Visão consolidada da operação Delski."}
          </p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Link to="/app/projects">
            Ver Todos os Projetos <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">{k.label}</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{k.value}</div>
                </div>
                <div className={`grid h-10 w-10 place-items-center rounded-xl bg-muted ${k.color}`}>
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      {!isCliente && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3 bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Projetos por Tipo de Serviço</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff" }} />
                  <Bar dataKey="total" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
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
      )}

      {/* Recent Projects List */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base font-bold">Projetos em Destaque</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {visible.slice(0, 5).map((p) => (
            <Link
              key={p.id}
              to="/app/projects/$id"
              params={{ id: p.id }}
              className="flex items-center justify-between py-3.5 hover:bg-muted/50 -mx-2 px-3 rounded-lg transition-colors"
            >
              <div>
                <div className="font-semibold text-foreground">{p.client}</div>
                <div className="text-xs text-muted-foreground">
                  {SERVICE_LABEL[p.type]} • Prazo: {p.deadline}
                </div>
              </div>
              <Badge className="bg-zinc-800 text-zinc-300 text-xs">
                {STATUS_LABEL[p.status]}
              </Badge>
            </Link>
          ))}
          {visible.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum projeto encontrado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
