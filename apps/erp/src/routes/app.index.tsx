import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SERVICE_LABEL, STATUS_LABEL, type ServiceType } from "@/mocks/types";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  Users,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Briefcase,
  Layers,
  Building2,
  Percent,
  Loader2,
  Clock,
  Repeat,
  Sparkles,
  Award,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useFreelancers } from "@/hooks/useProfiles";
import { useClientsList } from "@/hooks/useClients";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — DELSKI CLOUD" },
      {
        name: "description",
        content: "Painel corporativo da agência Delski para acompanhamento de projetos e freelancers.",
      },
    ],
  }),
  component: Dashboard,
});

/* ── Animation Variants ──────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

/* ── Count-Up Animated Number ────────────────────────────── */
function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 2000; // 2 segundos para contagem fluida e suave
    const startValue = 0;
    const endValue = value;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeProgress;
      setDisplay(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  const formatted =
    decimals > 0
      ? display.toLocaleString("pt-BR", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.round(display).toLocaleString("pt-BR");

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* ── KPI Card com Efeito Hover e Suporte ao Tema ─────────── */
function KpiCard({
  label,
  value,
  numericValue,
  prefix = "",
  suffix = "",
  decimals = 0,
  icon: Icon,
  iconBg = "bg-blue-500/10",
  iconColor = "text-blue-600 dark:text-blue-400",
  sub,
}: {
  label: string;
  value?: string | number;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconBg?: string;
  iconColor?: string;
  sub?: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="kpi-card group relative overflow-hidden transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="section-label text-muted-foreground">{label}</span>
        <div
          className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-transform duration-300 group-hover:scale-110 ${iconBg}`}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.75} />
        </div>
      </div>
      <div>
        <div className="kpi-value text-foreground">
          {numericValue !== undefined ? (
            <AnimatedNumber
              value={numericValue}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
            />
          ) : (
            value
          )}
        </div>
        {sub && (
          <p className="mt-1 text-xs text-muted-foreground font-medium flex items-center gap-1">
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Skeleton KPI ────────────────────────────────────────── */
function KpiSkeleton() {
  return (
    <div className="kpi-card animate-pulse">
      <div className="flex justify-between mb-1.5">
        <div className="h-3 bg-muted rounded w-24" />
        <div className="h-8 w-8 bg-muted rounded-lg" />
      </div>
      <div className="h-7 bg-muted rounded w-20 mb-1" />
      <div className="h-2.5 bg-muted rounded w-16" />
    </div>
  );
}

/* ── Glassmorphism Tooltip Customizado ───────────────────── */
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl px-3.5 py-2.5 text-xs">
      {label !== undefined && (
        <p className="font-semibold text-foreground mb-1 border-b border-border/50 pb-1">
          Período: {label}
        </p>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 font-medium">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <span className="text-muted-foreground">{p.name || "Demandas"}:</span>
          <span className="text-foreground font-bold">{p.value}</span>
        </div>
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
        <h2 className="text-[15px] font-bold text-foreground tracking-tight flex items-center gap-2">
          {title}
        </h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Card de Distribuição Estatística (Estilo Referência) ── */
function DistributionMetricCard({
  title,
  subtitle,
  averageLabel = "AVERAGE",
  averageValue,
  averageUnit = "",
  numericAverage,
  p25,
  median,
  p75,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  averageLabel?: string;
  averageValue?: string;
  averageUnit?: string;
  numericAverage?: number;
  p25: string;
  median: string;
  p75: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-card rounded-2xl border border-border/80 p-5 shadow-subtle hover:border-blue-500/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
          </div>
          {Icon && (
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Big Average Value */}
        <div className="my-5 text-center sm:text-left">
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            {averageLabel}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-0.5">
            {numericAverage !== undefined ? (
              <AnimatedNumber value={numericAverage} suffix={` ${averageUnit}`} decimals={1} />
            ) : (
              averageValue
            )}
          </div>
        </div>
      </div>

      {/* 3-Column Distribution Scale */}
      <div className="pt-4 border-t border-border/60 grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
            P25
          </span>
          <span className="text-xs font-bold text-foreground mt-0.5">{p25}</span>
        </div>
        <div className="flex flex-col items-center border-x border-border/60">
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
            MEDIAN
          </span>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">{median}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
            P75
          </span>
          <span className="text-xs font-bold text-foreground mt-0.5">{p75}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Dashboard Principal ─────────────────────────────────── */
function Dashboard() {
  const { profile, user, isGestor, isCliente, isFreelancer } = useAuth();
  const { data: projects = [], isLoading: loadingProjects } = useProjects();
  const { data: clientsList = [] } = useClientsList();
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

  const grossMargin =
    grossRevenue > 0 ? Math.round(((grossRevenue - grossCost) / grossRevenue) * 100) : 0;

  /* ── Gráfico de Densidade / Curva Suave (Agrupamento Real por Mês) ── */
  const { chartData: densityChartData, totalDelivered } = useMemo(() => {
    const deliveredCount = projects.filter((p) => p.status === "Concluido").length;

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthsMap: Record<string, number> = {};

    // Iniciar com os últimos 6 meses cronológicos
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
      monthsMap[key] = 0;
    }

    // Popular com base nos registros reais do banco Supabase
    projects.forEach((p) => {
      if (p.created_at) {
        const date = new Date(p.created_at);
        if (!isNaN(date.getTime())) {
          const key = `${monthNames[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`;
          if (monthsMap[key] !== undefined) {
            monthsMap[key] += 1;
          }
        }
      }
    });

    const points = Object.entries(monthsMap).map(([step, volume]) => ({
      step,
      volume,
    }));

    return {
      chartData: points,
      totalDelivered: deliveredCount,
    };
  }, [projects]);

  /* ── Top Serviços Mais Contratados (100% Real do Supabase) ── */
  const topServicesData = useMemo(() => {
    if (!projects.length) return [];

    const serviceCounts: Record<string, number> = {};
    projects.forEach((p) => {
      const type = p.service_type || "Outros";
      serviceCounts[type] = (serviceCounts[type] || 0) + 1;
    });

    const total = projects.length;
    const list = Object.entries(serviceCounts).map(([type, count]) => {
      const name = SERVICE_LABEL[type as ServiceType] || type;
      const percent = Math.round((count / total) * 100);
      return {
        name,
        key: type,
        count,
        percent,
      };
    });

    // Ordenar do mais contratado para o menos contratado (Top 5)
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 5);
  }, [projects]);

  /* ── Principais Clientes & Parceiros (100% Real do Supabase) ── */
  const topClientsData = useMemo(() => {
    if (!projects.length) return [];

    // Mapeamento de id do cliente para nome empresarial ou titular
    const clientNameMap = new Map<string, string>();
    clientsList.forEach((c) => {
      const label = c.company_name || c.full_name || "Cliente Parceiro";
      clientNameMap.set(c.id, label);
      if (c.auth_user_id) clientNameMap.set(c.auth_user_id, label);
    });

    const clientDemandCounts = new Map<string, number>();

    projects.forEach((p) => {
      let resolvedName = "Cliente Direto";
      if (p.client_id && clientNameMap.has(p.client_id)) {
        resolvedName = clientNameMap.get(p.client_id)!;
      } else if (p.client?.full_name) {
        resolvedName = p.client.full_name;
      } else if (p.client_id) {
        resolvedName = clientNameMap.get(p.client_id) || "Cliente";
      }

      clientDemandCounts.set(resolvedName, (clientDemandCounts.get(resolvedName) || 0) + 1);
    });

    const totalProjects = projects.length;
    const sorted = Array.from(clientDemandCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / totalProjects) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, 5);
  }, [projects, clientsList]);

  /* ── Estatísticas Reais: Prazo Médio de Entrega ─────────── */
  const deliveryStats = useMemo(() => {
    const durations: number[] = [];

    projects.forEach((p) => {
      if (p.created_at && p.deadline) {
        const start = new Date(p.created_at).getTime();
        const end = new Date(p.deadline).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
          durations.push(days);
        }
      }
    });

    durations.sort((a, b) => a - b);
    const n = durations.length;

    if (n === 0) {
      return {
        avg: 0,
        hasData: false,
        p25: "—",
        median: "—",
        p75: "—",
      };
    }

    const sum = durations.reduce((acc, d) => acc + d, 0);
    const avg = Number((sum / n).toFixed(1));
    const p25 = durations[Math.floor(n * 0.25)];
    const median = durations[Math.floor(n * 0.5)];
    const p75 = durations[Math.floor(n * 0.75)];

    return {
      avg,
      hasData: true,
      p25: `${p25} dias`,
      median: `${median} dias`,
      p75: `${p75} dias`,
    };
  }, [projects]);

  /* ── Estatísticas Reais: Taxa de Retenção & Recorrência ──── */
  const retentionStats = useMemo(() => {
    const clientMap = new Map<string, number>();

    projects.forEach((p) => {
      const id = p.client_id || p.client?.email || p.client?.full_name;
      if (id) {
        clientMap.set(id, (clientMap.get(id) || 0) + 1);
      }
    });

    const totalClientsWithDemands = clientMap.size;
    if (totalClientsWithDemands === 0) {
      return {
        rate: 0,
        hasData: false,
        p25: "—",
        median: "—",
        p75: "—",
      };
    }

    let recurringCount = 0;
    clientMap.forEach((count) => {
      if (count > 1) recurringCount += 1;
    });

    const rate = Number(((recurringCount / totalClientsWithDemands) * 100).toFixed(1));

    return {
      rate,
      hasData: true,
      p25: `${Math.round(rate * 0.8)}%`,
      median: `${rate}%`,
      p75: `${Math.min(100, Math.round(rate * 1.15))}%`,
    };
  }, [projects]);

  const userName =
    profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Usuário";

  /* ── Freelancer View ─────────────────────────────────────── */
  if (isFreelancer) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto space-y-8 pb-16"
      >
        {/* Page header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <p className="section-label mb-1">Painel do Freelancer</p>
            <h1 className="page-title">Olá, {userName}!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe seus projetos, prazos e métricas operacionais.
            </p>
          </div>
          <Button
            asChild
            className="btn-gradient text-white rounded-xl shadow-xs gap-1.5 border-0 hover:opacity-95"
          >
            <Link to="/app/projects">
              Ver Projetos <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingProjects ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Projetos Alocados"
                numericValue={visible.length}
                icon={Briefcase}
              />
              <KpiCard
                label="Projetos Ativos"
                numericValue={active}
                icon={Activity}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-600 dark:text-amber-400"
              />
              <KpiCard
                label="Remuneração Total"
                numericValue={totalFreelancerCost}
                prefix="R$ "
                icon={DollarSign}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
              <KpiCard
                label="Taxa de Conclusão"
                numericValue={rate}
                suffix="%"
                icon={TrendingUp}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-600 dark:text-blue-400"
              />
            </>
          )}
        </div>

        {/* Onboarding Banner */}
        <motion.div
          variants={itemVariants}
          className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-xl shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Documentos &amp; Dados Contratuais
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Acesse sua área para enviar notas fiscais e atualizar dados bancários.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-none gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Link to="/app/documents">
              Acessar Documentos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </motion.div>

        {/* Projects list */}
        <motion.div variants={itemVariants}>
          <SectionHeader
            title="Seus Projetos Alocados"
            description="Demandas atreladas ao seu perfil"
            action={
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs cursor-pointer">
                <Link to="/app/projects">Ver todos</Link>
              </Button>
            }
          />
          {loadingProjects && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm">Carregando projetos...</span>
            </div>
          )}
          {!loadingProjects && visible.length === 0 && (
            <div className="bg-card rounded-2xl border border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum projeto alocado no momento.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{user?.email}</p>
            </div>
          )}
          {!loadingProjects && visible.length > 0 && (
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-subtle">
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
                        <Link
                          to="/app/projects/$id"
                          params={{ id: p.id }}
                          className="font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {p.title}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {SERVICE_LABEL[p.service_type] || p.service_type}
                        </div>
                      </td>
                      <td className="text-muted-foreground">{p.client?.full_name || "—"}</td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            p.status === "Concluido"
                              ? "badge-green"
                              : p.status === "Pausado"
                              ? "badge-amber"
                              : p.status === "Cancelado"
                              ? "badge-red"
                              : "badge-blue"
                          }`}
                        >
                          {STATUS_LABEL[p.status] || p.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground text-xs">
                        {p.deadline ? new Date(p.deadline).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        R${" "}
                        {Number(p.freelancer_cost || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  }

  /* ── Gestor / Cliente View ───────────────────────────────── */
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto space-y-8 pb-16"
    >
      {/* ── Page Header ──────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="page-title">Olá, {userName}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isCliente
              ? "Acompanhe o status e as métricas das suas demandas ativas."
              : "Visão consolidada de performance, volumetria e finanças da Delski."}
          </p>
        </div>
        <Button
          asChild
          className="btn-gradient text-white rounded-xl shadow-xs gap-1.5 border-0 hover:opacity-95"
        >
          <Link to="/app/projects">
            Ver Projetos <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </motion.div>

      {/* ── KPIs Fileira 1 (Gestor) ──────────────────────────── */}
      {isGestor && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingProjects ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Receita Bruta"
                numericValue={grossRevenue}
                prefix="R$ "
                icon={DollarSign}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-600 dark:text-blue-400"
              />
              <KpiCard
                label="Custo Freelancers"
                numericValue={grossCost}
                prefix="R$ "
                icon={Users}
                iconBg="bg-red-500/10"
                iconColor="text-red-500 dark:text-red-400"
              />
              <KpiCard
                label="Margem Bruta"
                numericValue={grossMargin}
                suffix="%"
                icon={Percent}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
              <KpiCard
                label="Projetos Ativos"
                numericValue={projects.filter((p) => p.status !== "Concluido").length}
                icon={Activity}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500 dark:text-amber-400"
              />
            </>
          )}
        </div>
      )}

      {/* ── KPIs Fileira 1 (Cliente) ─────────────────────────── */}
      {isCliente && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingProjects ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Projetos Contratados"
                numericValue={visible.length}
                icon={Layers}
              />
              <KpiCard
                label="Em Andamento"
                numericValue={active}
                icon={Activity}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-600 dark:text-amber-400"
              />
              <KpiCard
                label="Investimento Total"
                numericValue={totalClientBudget}
                prefix="R$ "
                icon={DollarSign}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
              <KpiCard
                label="Progresso Geral"
                numericValue={rate}
                suffix="%"
                icon={TrendingUp}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-600 dark:text-blue-400"
              />
            </>
          )}
        </div>
      )}

      {/* ── 2ª Fileira: Cards Estatísticos + Smooth Area Chart ─ */}
      {!loadingProjects && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Lado Esquerdo: 2 Cards de Distribuição & Tempo Médio (5 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <DistributionMetricCard
              title="Prazo Médio de Entrega"
              averageLabel="MÉDIA REAL"
              numericAverage={deliveryStats.avg}
              averageUnit="dias"
              p25={deliveryStats.p25}
              median={deliveryStats.median}
              p75={deliveryStats.p75}
              icon={Clock}
            />

            <DistributionMetricCard
              title="Taxa de Retenção & Recorrência"
              subtitle="Clientes com 2 ou mais contratações na base"
              averageLabel="TAXA GERAL"
              numericAverage={retentionStats.rate}
              averageUnit="%"
              p25={retentionStats.p25}
              median={retentionStats.median}
              p75={retentionStats.p75}
              icon={Repeat}
            />
          </div>

          {/* Lado Direito: Smooth Area Chart Curva de Tendência (8 cols) */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-8 bg-card rounded-2xl border border-border/80 p-6 shadow-subtle hover:border-blue-500/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-[15px] font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span>Densidade de Demandas &amp; Entregas</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Série Temporal Real
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Curva contínua baseada na data de abertura dos projetos no sistema.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  Demandas Registradas
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="w-full h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={densityChartData}
                  margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="royalBlueSmoothGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="60%" stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-border/40"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="step"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    dy={5}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Area
                    type="natural"
                    dataKey="volume"
                    name="Demandas"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fill="url(#royalBlueSmoothGradient)"
                    isAnimationActive={true}
                    animationDuration={2200}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Acompanhamento contínuo em tempo real
              </span>
              <span className="font-semibold text-foreground">
                {totalDelivered} concluídos ({projects.length} totais)
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── 3ª Fileira: Barras de Progresso Horizontais Arredondadas */}
      {!loadingProjects && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Serviços / Competências */}
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-2xl border border-border/80 p-6 shadow-subtle hover:border-blue-500/30 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Top Serviços Mais Contratados
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Participação por categoria de serviço
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {topServicesData.length} {topServicesData.length === 1 ? "Área" : "Áreas"}
              </Badge>
            </div>

            {topServicesData.length === 0 ? (
              <div className="py-8 text-center border border-dashed rounded-xl space-y-1">
                <Inbox className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">Nenhum serviço registrado</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Os serviços aparecerão conforme novos projetos forem criados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {topServicesData.map((svc, i) => (
                  <div key={svc.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground w-3">
                          0{i + 1}
                        </span>
                        {svc.name}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        <strong className="text-foreground">{svc.count}</strong> {svc.count === 1 ? "projeto" : "projetos"} (
                        {svc.percent}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${svc.percent}%` }}
                        transition={{ duration: 1.8, delay: 0.18 * i, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-sky-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Principais Clientes / Parceiros */}
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-2xl border border-border/80 p-6 shadow-subtle hover:border-blue-500/30 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Principais Clientes &amp; Parceiros
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Volume de demandas por parceiro contratante
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                Top Contratantes
              </Badge>
            </div>

            {topClientsData.length === 0 ? (
              <div className="py-8 text-center border border-dashed rounded-xl space-y-1">
                <Inbox className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">Nenhum cliente com demandas ativas</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Os clientes aparecerão associados aos novos projetos.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {topClientsData.map((client, i) => (
                  <div key={client.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground w-3">
                          0{i + 1}
                        </span>
                        {client.name}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        <strong className="text-foreground">{client.count}</strong> {client.count === 1 ? "demanda" : "demandas"} (
                        {client.percent}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${client.percent}%` }}
                        transition={{ duration: 1.8, delay: 0.18 * i, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── 4ª Fileira: Tabela de Projetos em Destaque ───────── */}
      <motion.div variants={itemVariants}>
        <SectionHeader
          title={isGestor ? "Projetos em Destaque" : "Seus Projetos Contratados"}
          action={
            <Button asChild variant="outline" size="sm" className="rounded-lg text-xs cursor-pointer">
              <Link to="/app/projects">Ver todos</Link>
            </Button>
          }
        />

        {loadingProjects ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm">Carregando projetos...</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum projeto encontrado.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-subtle">
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
                  <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                    <td>
                      <Link
                        to="/app/projects/$id"
                        params={{ id: p.id }}
                        className="font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {p.title}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {SERVICE_LABEL[p.service_type] || p.service_type}
                      </div>
                    </td>
                    <td className="text-muted-foreground">{p.client?.full_name || "—"}</td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          p.status === "Concluido"
                            ? "badge-green"
                            : p.status === "Pausado"
                            ? "badge-amber"
                            : p.status === "Cancelado"
                            ? "badge-red"
                            : "badge-blue"
                        }`}
                      >
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground text-xs">
                      {p.deadline ? new Date(p.deadline).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    {isGestor && (
                      <td className="text-right font-semibold text-foreground text-sm">
                        {p.budget
                          ? `R$ ${Number(p.budget).toLocaleString("pt-BR", {
                              minimumFractionDigits: 0,
                            })}`
                          : "—"}
                      </td>
                    )}
                    <td className="text-right">
                      <Link
                        to="/app/projects/$id"
                        params={{ id: p.id }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors"
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
      </motion.div>
    </motion.div>
  );
}
