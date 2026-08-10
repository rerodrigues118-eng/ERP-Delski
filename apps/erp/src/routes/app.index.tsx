import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Area,
  AreaChart,
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
  Building2,
  UserCheck,
  Percent,
  BarChart2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useFreelancers } from "@/hooks/useProfiles";


export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Delski ERP" },
      {
        name: "description",
        content: "Painel corporativo da agência Delski para acompanhamento de projetos e freelancers.",
      },
    ],
  }),
  component: Dashboard,
});

/* ── Paleta dos gráficos ─────────────────────────────────── */
const CHART_COLORS = ["#64748B", "#0EA5E9", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#3B82F6", "#10B981"];
const STATUS_COLORS: Record<string, string> = {
  Criado: "#64748B",                   // Slate 500
  Solicitado: "#0EA5E9",               // Sky 500
  "Aguardando Candidaturas": "#F59E0B", // Amber 500
  "Emitir contrato": "#8B5CF6",       // Purple 500
  "Revisão de Contrato": "#EC4899",    // Pink 500
  Delegado: "#14B8A6",                // Teal 500
  "Em Producao": "#3B82F6",            // Blue 500
  "Em Produção": "#3B82F6",            // Blue 500
  Concluido: "#10B981",                // Emerald 500
  "Concluído": "#10B981",              // Emerald 500
  Ativo: "#3B82F6",
  "Em Andamento": "#10B981",
  Pausado: "#F59E0B",
  Cancelado: "#EF4444",
};

/* ── KPI Card ────────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg = "bg-blue-50",
  iconColor = "text-blue-600",
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconBg?: string;
  iconColor?: string;
  sub?: string;
}) {
  return (
    <div className="kpi-card group">
      <div className="flex items-start justify-between mb-3">
        <span className="section-label">{label}</span>
        <div className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl ${iconBg}`}>
          <Icon className={`h-4.5 w-4.5 ${iconColor}`} strokeWidth={1.75} />
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <p className="mt-1.5 text-xs text-gray-400 font-medium">{sub}</p>}
    </div>
  );
}

/* ── Skeleton KPI ────────────────────────────────────────── */
function KpiSkeleton() {
  return (
    <div className="kpi-card animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-3 bg-gray-100 rounded w-24" />
        <div className="h-9 w-9 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-8 bg-gray-100 rounded w-20 mb-1.5" />
      <div className="h-3 bg-gray-100 rounded w-16" />
    </div>
  );
}

/* ── Custom Tooltip ──────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name || "Valor"}: <span className="text-gray-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

/* ── Section Header ──────────────────────────────────────── */
function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">{title}</h2>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Chart Card ──────────────────────────────────────────── */
function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-6 shadow-card ${className}`}>
      <h3 className="text-[13px] font-semibold text-gray-700 mb-5">{title}</h3>
      {children}
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────── */
function Dashboard() {
  const { profile, user, isGestor, isCliente, isFreelancer } = useAuth();
  const { data: projects = [], isLoading: loadingProjects } = useProjects();
  const { data: freelancers = [] } = useFreelancers();

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

  const totalFreelancerCost = useMemo(
    () => visible.reduce((acc, p) => acc + Number(p.freelancer_cost || 0), 0),
    [visible],
  );

  const totalClientBudget = useMemo(
    () => visible.reduce((acc, p) => acc + Number(p.budget || 0), 0),
    [visible],
  );

  const grossRevenue = useMemo(
    () => projects.reduce((acc, p) => acc + Number(p.budget || 0), 0),
    [projects],
  );

  const grossCost = useMemo(
    () => projects.reduce((acc, p) => acc + Number(p.freelancer_cost || 0), 0),
    [projects],
  );

  const grossMargin = grossRevenue > 0 ? Math.round(((grossRevenue - grossCost) / grossRevenue) * 100) : 0;

  const uniqueClients = useMemo(
    () => new Set(projects.map((p) => p.client_id).filter(Boolean)).size,
    [projects],
  );

  // Per-service gradient definitions — match project badge colors
  const SERVICE_GRADIENTS: Record<string, { id: string; from: string; to: string }> = {
    IA: { id: "gradIA", from: "#7C3AED", to: "#A78BFA" },
    Trafego: { id: "gradTrafego", from: "#D97706", to: "#FCD34D" },
    Sites: { id: "gradSites", from: "#2563EB", to: "#60A5FA" },
    "Social Media": { id: "gradSocialMedia", from: "#DB2777", to: "#F9A8D4" },
  };

  const byType = (["IA", "Trafego", "Sites", "Social Media"] as ServiceType[]).map((t) => ({
    key: t,
    name: t === "IA" ? "Automação" : t === "Trafego" ? "Tráfego" : t === "Sites" ? "Desenvolvimento" : "Social Media",
    total: visible.filter((p) => p.service_type === t).length,
    receita: visible
      .filter((p) => p.service_type === t)
      .reduce((acc, p) => acc + Number(p.budget || 0), 0),
    gradId: SERVICE_GRADIENTS[t]?.id,
  }));

  const byStatus = STATUSES.map((s, index) => ({
    name: STATUS_LABEL[s] || s,
    value: visible.filter((p) => p.status === s).length,
    color: STATUS_COLORS[s] || CHART_COLORS[index % CHART_COLORS.length],
  })).filter((d) => d.value > 0);

  const userName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Usuário";

  /* ── Freelancer view ─────────────────────────────────── */
  if (isFreelancer) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="section-label mb-1">Painel do Freelancer</p>
            <h1 className="page-title">Olá, {userName}!</h1>
            <p className="text-sm text-gray-400 mt-1">Acompanhe seus projetos, prazos e métricas.</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white rounded-xl shadow-xs gap-1.5 border-0">
            <Link to="/app/projects">Ver Projetos <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingProjects ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Projetos Alocados" value={visible.length} icon={Briefcase} />
              <KpiCard label="Projetos Ativos" value={active} icon={Activity} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard
                label="Remuneração Total"
                value={`R$ ${totalFreelancerCost.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
                icon={DollarSign}
                iconBg="bg-green-50"
                iconColor="text-green-600"
              />
              <KpiCard label="Taxa de Conclusão" value={`${rate}%`} icon={TrendingUp} iconBg="bg-purple-50" iconColor="text-purple-600" />
            </>
          )}
        </div>

        {/* Onboarding Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900">Documentos &amp; Dados Contratuais</h4>
              <p className="text-xs text-blue-600 mt-0.5">Acesse sua área para enviar documentos e dados de contrato.</p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-none gap-1.5 flex-shrink-0">
            <Link to="/app/documents">Acessar Documentos <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>

        {/* Projects list */}
        <div>
          <SectionHeader title="Seus Projetos Alocados" description="Projetos vinculados ao seu perfil" action={
            <Button asChild variant="outline" size="sm" className="rounded-lg text-xs border-gray-200">
              <Link to="/app/projects">Ver todos</Link>
            </Button>
          } />
          {loadingProjects && (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando projetos...</span>
            </div>
          )}
          {!loadingProjects && visible.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-400">Nenhum projeto alocado no momento.</p>
              <p className="text-xs text-gray-300 mt-1">{user?.email}</p>
            </div>
          )}
          {!loadingProjects && visible.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-card">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Projeto</th>
                    <th>Cliente</th>
                    <th>Status</th>
                    <th>Prazo</th>
                    <th className="text-right">Remuneração</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.slice(0, 8).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to="/app/projects/$id" params={{ id: p.id }} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                          {p.title}
                        </Link>
                        <div className="text-xs text-gray-400 mt-0.5">{SERVICE_LABEL[p.service_type] || p.service_type}</div>
                      </td>
                      <td className="text-gray-600">{p.client?.full_name || "—"}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          p.status === "Concluido" ? "badge-green" :
                          p.status === "Pausado" ? "badge-amber" :
                          p.status === "Cancelado" ? "badge-red" : "badge-blue"
                        }`}>
                          {STATUS_LABEL[p.status] || p.status}
                        </span>
                      </td>
                      <td className="text-gray-500 text-xs">{p.deadline ? new Date(p.deadline).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="text-right font-semibold text-green-700">
                        R$ {Number(p.freelancer_cost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    );
  }

  /* ── Gestor / Cliente view ─────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="section-label mb-1">
            {isCliente ? "Portal do Cliente" : "Painel do Gestor"}
          </p>
          <h1 className="page-title">Olá, {userName}!</h1>
          <p className="text-sm text-gray-400 mt-1">
            {isCliente
              ? "Acompanhe o progresso das suas demandas."
              : "Visão consolidada da operação Delski."}
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white rounded-xl shadow-xs gap-1.5 border-0">
          <Link to="/app/projects">
            Ver Projetos <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* ── KPIs Gestor ──────────────────────────────────── */}
      {isGestor && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingProjects ? (
            Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Receita Bruta"
                value={`R$ ${grossRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
                icon={DollarSign}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                sub="Total em contratos"
              />
              <KpiCard
                label="Custo Freelancers"
                value={`R$ ${grossCost.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
                icon={Users}
                iconBg="bg-red-50"
                iconColor="text-red-500"
                sub="Repasse a parceiros"
              />
              <KpiCard
                label="Margem Bruta"
                value={`${grossMargin}%`}
                icon={Percent}
                iconBg="bg-green-50"
                iconColor="text-green-600"
                sub={grossRevenue > 0 ? `R$ ${(grossRevenue - grossCost).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} líquido` : undefined}
              />
              <KpiCard
                label="Projetos Ativos"
                value={projects.filter((p) => p.status !== "Concluido").length}
                icon={Activity}
                iconBg="bg-amber-50"
                iconColor="text-amber-500"
                sub="Em andamento"
              />
              <KpiCard
                label="Projetos Concluídos"
                value={projects.filter((p) => p.status === "Concluido").length}
                icon={CheckCircle2}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
              <KpiCard
                label="Freelancers"
                value={freelancers.length}
                icon={UserCheck}
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
                sub="Cadastrados"
              />
              <KpiCard
                label="Clientes Ativos"
                value={uniqueClients}
                icon={Building2}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
              />
              <KpiCard
                label="Taxa de Conclusão"
                value={`${rate}%`}
                icon={BarChart2}
                iconBg="bg-teal-50"
                iconColor="text-teal-600"
                sub={`${done} de ${projects.length} projetos`}
              />
            </>
          )}
        </div>
      )}

      {/* ── KPIs Cliente ─────────────────────────────────── */}
      {isCliente && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingProjects ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Projetos Contratados" value={visible.length} icon={Layers} />
              <KpiCard label="Em Andamento" value={active} icon={Activity} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <KpiCard
                label="Investimento Total"
                value={`R$ ${totalClientBudget.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
                icon={DollarSign}
                iconBg="bg-green-50"
                iconColor="text-green-600"
              />
              <KpiCard label="Progresso Geral" value={`${rate}%`} icon={TrendingUp} iconBg="bg-purple-50" iconColor="text-purple-600" />
            </>
          )}
        </div>
      )}

      {/* ── Charts ───────────────────────────────────────── */}
      {!loadingProjects && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 min-w-0">
          <ChartCard title={isGestor ? "Receita por Tipo de Serviço" : "Projetos por Tipo de Serviço"} className="lg:col-span-3 min-w-0">
            <div className="w-full min-w-0 h-[220px]">
              <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={100}>
                <BarChart data={byType} barSize={28}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "#D1D5DB" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F9FAFB" }} />
                  <defs>
                    <linearGradient id="gradIA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="100%" stopColor="#A78BFA" />
                    </linearGradient>
                    <linearGradient id="gradTrafego" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D97706" />
                      <stop offset="100%" stopColor="#FCD34D" />
                    </linearGradient>
                    <linearGradient id="gradSites" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#60A5FA" />
                    </linearGradient>
                    <linearGradient id="gradSocialMedia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DB2777" />
                      <stop offset="100%" stopColor="#F9A8D4" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey={isGestor ? "receita" : "total"} name={isGestor ? "Receita (R$)" : "Projetos"} radius={[6, 6, 0, 0]}>
                    {byType.map((entry) => (
                      <Cell key={entry.key} fill={`url(#${entry.gradId})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Distribuição por Status" className="lg:col-span-2 min-w-0">
            {byStatus.length > 0 ? (
              <>
                <div className="w-full min-w-0 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={100}>
                    <PieChart>
                      <Pie
                        data={byStatus}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {byStatus.map((entry, i) => (
                          <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {byStatus.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-gray-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-gray-300">
                Nenhum dado de status
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* ── Projects list ─────────────────────────────────── */}
      <div>
        <SectionHeader
          title={isGestor ? "Projetos em Destaque" : "Seus Projetos Contratados"}
          description="Últimos projetos do portfólio"
          action={
            <Button asChild variant="outline" size="sm" className="rounded-lg text-xs border-gray-200">
              <Link to="/app/projects">Ver todos</Link>
            </Button>
          }
        />

        {loadingProjects ? (
          <div className="flex items-center justify-center py-16 text-gray-300 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            <span className="text-sm text-gray-400">Carregando projetos...</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">Nenhum projeto encontrado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-card">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Prazo</th>
                  {isGestor && <th className="text-right">Valor</th>}
                  <th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to="/app/projects/$id" params={{ id: p.id }} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {p.title}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5">{SERVICE_LABEL[p.service_type] || p.service_type}</div>
                    </td>
                    <td className="text-gray-600">{p.client?.full_name || "—"}</td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        p.status === "Concluido" ? "badge-green" :
                        p.status === "Pausado" ? "badge-amber" :
                        p.status === "Cancelado" ? "badge-red" : "badge-blue"
                      }`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                    <td className="text-gray-400 text-xs">{p.deadline ? new Date(p.deadline).toLocaleDateString("pt-BR") : "—"}</td>
                    {isGestor && (
                      <td className="text-right font-semibold text-gray-800 text-sm">
                        {p.budget ? `R$ ${Number(p.budget).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : "—"}
                      </td>
                    )}
                    <td className="text-right">
                      <Link
                        to="/app/projects/$id"
                        params={{ id: p.id }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Detalhes <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
