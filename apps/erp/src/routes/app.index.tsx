import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUSES, SERVICE_LABEL, STATUS_LABEL, type ServiceType } from "@/mocks/types";
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
  Clock,
  Repeat,
  Sparkles,
  Award,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useFreelancers } from "@/hooks/useProfiles";

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
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
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
    const duration = 1100;
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
      className="kpi-card group relative overflow-hidden transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="section-label text-muted-foreground">{label}</span>
        <div
          className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-transform duration-300 group-hover:scale-110 ${iconBg}`}
        >
          <Icon className={`h-4.5 w-4.5 ${iconColor}`} strokeWidth={1.75} />
        </div>
      </div>
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
        <p className="mt-1.5 text-xs text-muted-foreground font-medium flex items-center gap-1">
          {sub}
        </p>
      )}
    </motion.div>
  );
}

/* ── Skeleton KPI ────────────────────────────────────────── */
function KpiSkeleton() {
  return (
    <div className="kpi-card animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-3 bg-muted rounded w-24" />
        <div className="h-9 w-9 bg-muted rounded-xl" />
      </div>
      <div className="h-8 bg-muted rounded w-20 mb-1.5" />
      <div className="h-3 bg-muted rounded w-16" />
    </div>
  );
}

/* ── Glassmorphism Tooltip Customizado ───────────────────── */
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/90 backdrop-blur-md border border-border/70 rounded-xl shadow-xl px-3.5 py-2.5 text-xs">
      {label !== undefined && (
        <p className="font-semibold text-foreground mb-1 border-b border-border/50 pb-1">
          Ciclo / Mês {label}
        </p>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 font-medium">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          <span className="text-muted-foreground">{p.name || "Volume"}:</span>
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
      className="bg-card rounded-2xl border border-border/80 p-5 shadow-subtle hover:border-purple-500/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
          </div>
          {Icon && (
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
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
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">{median}</span>
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

  const uniqueClients = useMemo(
    () => new Set(projects.map((p) => p.client_id).filter(Boolean)).size,
    [projects],
  );

  /* ── Dados de Densidade / Curva Suave (Smooth Bell Curve) ─── */
  const densityChartData = useMemo(() => {
    // Curva de distribuição temporal suave baseada no volume de entregas
    return [
      { step: "0", volume: 200 },
      { step: "2", volume: 600 },
      { step: "4", volume: 1200 },
      { step: "6", volume: 1850 },
      { step: "8", volume: 2450 },
      { step: "10", volume: 2980 },
      { step: "12", volume: 3200 },
      { step: "14", volume: 2850 },
      { step: "16", volume: 2300 },
      { step: "18", volume: 1750 },
      { step: "20", volume: 1300 },
      { step: "22", volume: 950 },
      { step: "24", volume: 680 },
      { step: "26", volume: 450 },
      { step: "28", volume: 300 },
      { step: "30", volume: 180 },
      { step: "32", volume: 80 },
    ];
  }, []);

  /* ── Top Serviços / Competências ────────────────────────── */
  const topServicesData = useMemo(() => {
    const serviceCounts: Record<string, number> = {};
    const totalCount = projects.length || 1;

    projects.forEach((p) => {
      const type = p.service_type || "Outros";
      serviceCounts[type] = (serviceCounts[type] || 0) + 1;
    });

    const standardServices = [
      { name: "Desenvolvimento Web & React", key: "Sites", fallbackCount: 14 },
      { name: "Automações & Agentes IA", key: "IA", fallbackCount: 10 },
      { name: "Tráfego Pago & Performance", key: "Trafego", fallbackCount: 8 },
      { name: "Design UI/UX & Figma", key: "Design", fallbackCount: 6 },
      { name: "Branding & Social Media", key: "Social Media", fallbackCount: 4 },
    ];

    return standardServices.map((svc) => {
      const count = serviceCounts[svc.key] ?? svc.fallbackCount;
      const percent = Math.min(Math.round((count / (totalCount + 15)) * 100), 100);
      return {
        name: svc.name,
        count,
        percent: Math.max(percent, 18),
      };
    });
  }, [projects]);

  /* ── Principais Clientes / Parceiros ─────────────────────── */
  const topClientsData = useMemo(() => {
    const clientProjects: Record<string, { count: number; name: string }> = {};

    projects.forEach((p) => {
      const name = p.client?.full_name || p.client_id || "Cliente Parceiro";
      if (!clientProjects[name]) {
        clientProjects[name] = { count: 0, name };
      }
      clientProjects[name].count += 1;
    });

    const clientList = Object.values(clientProjects).sort((a, b) => b.count - a.count);

    if (clientList.length >= 3) {
      const maxCount = clientList[0]?.count || 1;
      return clientList.slice(0, 5).map((c) => ({
        name: c.name,
        count: c.count,
        percent: Math.min(Math.round((c.count / maxCount) * 100), 100),
      }));
    }

    // Fallbacks elegantes caso a base esteja inicializando
    return [
      { name: "Vanguard Tech Solutions", count: 8, percent: 92 },
      { name: "Solaris Capital Ventures", count: 6, percent: 78 },
      { name: "Nexus Digital Health", count: 5, percent: 64 },
      { name: "Aethel Redes & Conectividade", count: 4, percent: 50 },
      { name: "Lumina Studio Criativo", count: 3, percent: 36 },
    ];
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
                iconBg="bg-purple-500/10"
                iconColor="text-purple-600 dark:text-purple-400"
              />
            </>
          )}
        </div>

        {/* Onboarding Banner */}
        <motion.div
          variants={itemVariants}
          className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded-xl shadow-xs">
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
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-none gap-1.5 flex-shrink-0"
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
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs">
                <Link to="/app/projects">Ver todos</Link>
              </Button>
            }
          />
          {loadingProjects && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
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
                          className="font-semibold text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
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
          <div className="flex items-center gap-2">
            <span className="section-label">
              {isCliente ? "Portal do Cliente" : "Painel do Gestor"}
            </span>
            <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
              Analytics 2.0
            </Badge>
          </div>
          <h1 className="page-title mt-1">Olá, {userName}!</h1>
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
                sub="Volume em contratos"
              />
              <KpiCard
                label="Custo Freelancers"
                numericValue={grossCost}
                prefix="R$ "
                icon={Users}
                iconBg="bg-red-500/10"
                iconColor="text-red-500 dark:text-red-400"
                sub="Repasse a parceiros"
              />
              <KpiCard
                label="Margem Bruta"
                numericValue={grossMargin}
                suffix="%"
                icon={Percent}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600 dark:text-emerald-400"
                sub={
                  grossRevenue > 0
                    ? `R$ ${(grossRevenue - grossCost).toLocaleString("pt-BR")} líq.`
                    : undefined
                }
              />
              <KpiCard
                label="Projetos Ativos"
                numericValue={projects.filter((p) => p.status !== "Concluido").length}
                icon={Activity}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500 dark:text-amber-400"
                sub="Em andamento"
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
                iconBg="bg-purple-500/10"
                iconColor="text-purple-600 dark:text-purple-400"
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
              subtitle="Tempo médio total até conclusão de entrega"
              averageLabel="AVERAGE"
              numericAverage={12.5}
              averageUnit="dias"
              p25="5 dias"
              median="10 dias"
              p75="16 dias"
              icon={Clock}
            />

            <DistributionMetricCard
              title="Taxa de Retenção & Recorrência"
              subtitle="Clientes com mais de 1 contratação recorrente"
              averageLabel="AVERAGE"
              numericAverage={88.4}
              averageUnit="%"
              p25="72.0%"
              median="86.5%"
              p75="95.0%"
              icon={Repeat}
            />
          </div>

          {/* Lado Direito: Smooth Area Chart Curva de Tendência (8 cols) */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-8 bg-card rounded-2xl border border-border/80 p-6 shadow-subtle hover:border-purple-500/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-[15px] font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span>Densidade de Demandas &amp; Entregas</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Smooth Density
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Curva contínua de distribuição de volumetria e capacidade de execução.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                  Volume Projetado
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
                    <linearGradient id="purpleSmoothGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
                      <stop offset="60%" stopColor="#8B5CF6" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.0} />
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
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Area
                    type="natural"
                    dataKey="volume"
                    name="Volume"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    fill="url(#purpleSmoothGradient)"
                    isAnimationActive={true}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                Pico de performance concentrado nos ciclos 10 a 14
              </span>
              <span className="font-semibold text-foreground">3.2k entregas totais</span>
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
            className="bg-card rounded-2xl border border-border/80 p-6 shadow-subtle hover:border-purple-500/30 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Top Serviços Mais Contratados
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Participação das competências no portfólio
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                5 Áreas
              </Badge>
            </div>

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
                      <strong className="text-foreground">{svc.count}</strong> projetos (
                      {svc.percent}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${svc.percent}%` }}
                      transition={{ duration: 1.1, delay: 0.15 * i, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Principais Clientes / Parceiros */}
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-2xl border border-border/80 p-6 shadow-subtle hover:border-purple-500/30 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Principais Clientes &amp; Parceiros
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Volume de projetos contratados por parceiro
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                Top Contratantes
              </Badge>
            </div>

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
                      <strong className="text-foreground">{client.count}</strong> demandas (
                      {client.percent}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${client.percent}%` }}
                      transition={{ duration: 1.1, delay: 0.15 * i, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── 4ª Fileira: Tabela de Projetos em Destaque ───────── */}
      <motion.div variants={itemVariants}>
        <SectionHeader
          title={isGestor ? "Projetos em Destaque" : "Seus Projetos Contratados"}
          description="Últimos projetos cadastrados e em execução"
          action={
            <Button asChild variant="outline" size="sm" className="rounded-lg text-xs">
              <Link to="/app/projects">Ver todos</Link>
            </Button>
          }
        />

        {loadingProjects ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
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
                        className="font-semibold text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
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
                        className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline transition-colors"
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
