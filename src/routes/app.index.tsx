import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUSES, SERVICE_LABEL, STATUS_LABEL, type ServiceType } from "@/mocks/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Briefcase,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useFreelancers } from "@/hooks/useProfiles";
import { FreelancerOnboardingSection } from "@/components/FreelancerOnboardingSection";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Delski ERP" },
      {
        name: "description",
        content:
          "Painel corporativo da agência Delski para acompanhamento de projetos e freelancers.",
      },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = ["#1E3A8A", "#2563EB", "#059669", "#D97706", "#475569"];

function Dashboard() {
  const { profile, user, isGestor, isCliente, isFreelancer } = useAuth();
  const { data: projects = [], isLoading: loadingProjects } = useProjects();
  const { data: freelancers = [] } = useFreelancers();

  // Filter projects by role
  const visible = useMemo(() => {
    if (isGestor) return projects;
    if (isFreelancer) {
      return projects.filter((p) =>
        p.freelancers?.some((f: any) => {
          const fId = f?.id || f?.profile?.id;
          const fEmail = f?.email || f?.profile?.email;
          return (
            (user?.id && fId === user.id) ||
            (user?.email && fEmail?.toLowerCase() === user.email.toLowerCase())
          );
        }),
      );
    }
    if (isCliente) {
      return projects.filter(
        (p) =>
          (user?.id && p.client_id === user.id) ||
          (user?.email && p.client?.email?.toLowerCase() === user.email.toLowerCase()),
      );
    }
    return projects;
  }, [projects, isGestor, isFreelancer, isCliente, user]);

  const active = visible.filter((p) => p.status !== "Concluido").length;
  const done = visible.filter((p) => p.status === "Concluido").length;
  const rate = visible.length ? Math.round((done / visible.length) * 100) : 0;

  const totalFreelancerCost = useMemo(() => {
    return visible.reduce((acc, p) => acc + Number(p.freelancer_cost || 0), 0);
  }, [visible]);

  const totalClientBudget = useMemo(() => {
    return visible.reduce((acc, p) => acc + Number(p.budget || 0), 0);
  }, [visible]);

  const byType = (["IA", "Trafego", "Sites"] as ServiceType[]).map((t) => ({
    name: SERVICE_LABEL[t]?.split(" ")[0] || t,
    total: visible.filter((p) => p.service_type === t).length,
  }));

  const byStatus = STATUSES.map((s) => ({
    name: STATUS_LABEL[s] || s,
    value: visible.filter((p) => p.status === s).length,
  })).filter((d) => d.value > 0);

  const kpis = isFreelancer
    ? [
        {
          label: "Projetos Alocados",
          value: visible.length,
          icon: Briefcase,
          color: "text-blue-900",
        },
        { label: "Projetos Ativos", value: active, icon: Activity, color: "text-amber-700" },
        {
          label: "Sua Remuneração Total",
          value: `R$ ${totalFreelancerCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          icon: DollarSign,
          color: "text-emerald-700",
        },
        {
          label: "Taxa de Conclusão",
          value: `${rate}%`,
          icon: TrendingUp,
          color: "text-stone-700",
        },
      ]
    : isCliente
      ? [
          {
            label: "Seus Projetos Contratados",
            value: visible.length,
            icon: Layers,
            color: "text-blue-900",
          },
          {
            label: "Projetos em Andamento",
            value: active,
            icon: Activity,
            color: "text-amber-700",
          },
          {
            label: "Investimento Total",
            value: `R$ ${totalClientBudget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: DollarSign,
            color: "text-emerald-700",
          },
          {
            label: "Progresso Geral",
            value: `${rate}%`,
            icon: CheckCircle2,
            color: "text-blue-700",
          },
        ]
      : [
          { label: "Projetos Ativos", value: active, icon: Activity, color: "text-blue-900" },
          {
            label: "Entregas Concluídas",
            value: done,
            icon: CheckCircle2,
            color: "text-emerald-700",
          },
          {
            label: "Freelancers Cadastrados",
            value: freelancers.length,
            icon: Users,
            color: "text-amber-700",
          },
          {
            label: "Taxa de Conclusão",
            value: `${rate}%`,
            icon: TrendingUp,
            color: "text-stone-700",
          },
        ];

  const userName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
            Olá, {userName}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {isCliente
              ? "Portal do Cliente — Visão consolidada do progresso das suas demandas."
              : isFreelancer
                ? "Painel do Freelancer — Seus projetos alocados, prazos e métricas de execução."
                : "Painel do Gestor — Visão consolidada da operação Delski."}
          </p>
        </div>
        <Button
          asChild
          className="bg-blue-900 hover:bg-blue-950 text-white font-medium rounded-md shadow-none"
        >
          <Link to="/app/projects">
            Ver Todos os Projetos <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-white border border-stone-200/80 shadow-sm rounded-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-stone-500 font-medium">{k.label}</div>
                  <div className="mt-2 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-stone-900">
                    {k.value}
                  </div>
                </div>
                <div
                  className={`grid h-10 w-10 place-items-center rounded-md bg-stone-100 ${k.color}`}
                >
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Banner discreto para acessar a página de Documentos */}
      {isFreelancer && (
        <Card className="border border-stone-200 bg-stone-50/50 shadow-sm rounded-lg">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-blue-900 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-900">Documentos & Dados Contratuais</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Acesse sua página dedicada para preencher seus dados de contrato, anexar seus
                  documentos pessoais e assinar seus contratos.
                </p>
              </div>
            </div>

            <Button
              asChild
              size="sm"
              className="bg-blue-900 hover:bg-blue-950 text-white text-xs gap-1.5 shrink-0 rounded-md shadow-none"
            >
              <Link to="/app/documents">
                Ir para Documentos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              {isFreelancer ? "Meus Projetos por Tipo de Serviço" : "Projetos por Tipo de Serviço"}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} />
                <YAxis stroke="#a1a1aa" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                />
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
            {byStatus.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {byStatus.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {byStatus.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">
                        {d.name} · {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Nenhum dado de status no momento
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects List Section */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold">
            {isFreelancer
              ? "Seus Projetos Alocados"
              : isCliente
                ? "Seus Projetos Contratados"
                : "Projetos em Destaque"}
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/projects">Ver Todos</Link>
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {loadingProjects && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Carregando projetos do Supabase...
            </div>
          )}
          {!loadingProjects &&
            visible.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                to="/app/projects/$id"
                params={{ id: p.id }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3.5 hover:bg-muted/50 -mx-2 px-3 rounded-lg transition-colors gap-2"
              >
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    {p.title}
                    <Badge variant="outline" className="text-[10px]">
                      {SERVICE_LABEL[p.service_type] || p.service_type}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Cliente: {p.client?.full_name || "Delski Agency"} • Prazo:{" "}
                    {p.deadline ? new Date(p.deadline).toLocaleDateString("pt-BR") : "N/A"}
                    {isFreelancer && (
                      <span className="ml-2 font-medium text-emerald-400">
                        • Seu repasse: R${" "}
                        {Number(p.freelancer_cost || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-zinc-800 text-zinc-300 text-xs">
                    {STATUS_LABEL[p.status] || p.status}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1">
                    Detalhes <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Link>
            ))}
          {!loadingProjects && visible.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground space-y-2">
              <p>Nenhum projeto alocado no seu perfil neste momento.</p>
              <p className="text-xs text-muted-foreground">
                Assim que um Gestor vincular seu e-mail ({user?.email}) a um projeto, ele aparecerá
                aqui automaticamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
