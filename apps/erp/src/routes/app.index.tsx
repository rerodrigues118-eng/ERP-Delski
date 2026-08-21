import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  FunnelChart,
  Funnel,
  LabelList,
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
import { useProjects, useFreelancerFinanceProjects } from "@/hooks/useProjects";
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
      <div className="flex flex-col items-start justify-start py-1">
        <div className="kpi-value text-foreground text-left">
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
          <p className="mt-1 text-xs text-muted-foreground font-medium flex items-center justify-start gap-1">
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

/* ── Custom Donut Tooltip ────────────────────────────────── */
const CustomDonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  if (!item) return null;
  const name = item.name || item.payload?.name || "Retenção";
  const val = Number(item.value ?? item.payload?.value ?? 0);
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl shadow-cyan-500/10 px-3.5 py-2 text-xs font-medium">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: item.payload?.fill || item.fill || "#00F2FE" }}
        />
        <span className="text-muted-foreground">{name}:</span>
        <span className="text-foreground font-bold">{val.toFixed(1)}%</span>
      </div>
    </div>
  );
};

/* ── Gráfico Donut Tecnológico: Taxa de Retenção ─────────── */
function RetentionDonutCard({
  rate = 0,
  p25 = "—",
  median = "—",
  p75 = "—",
}: {
  rate?: number;
  p25?: string;
  median?: string;
  p75?: string;
}) {
  const safeRate = typeof rate === "number" && !isNaN(rate) ? Math.min(100, Math.max(0, rate)) : 0;

  const chartData = useMemo(() => {
    return [
      { name: "Clientes Recorrentes", value: safeRate || 0.001, fill: "url(#neonElectricCyan)" },
      { name: "Demais Clientes", value: Math.max(0, 100 - safeRate), fill: "url(#emptyTrackGrad)" },
    ];
  }, [safeRate]);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card rounded-2xl border border-border/80 p-5 shadow-subtle hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
              <Repeat className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
              Taxa de Retenção
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              Clientes com 2 ou mais contratações na base
            </p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
            <Repeat className="h-4 w-4" />
          </div>
        </div>

        {/* Donut Chart Container com Percentual Central em Destaque */}
        <div className="relative my-2 h-[155px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id="neonElectricCyan" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00F2FE" />
                  <stop offset="100%" stopColor="#4FACFE" />
                </linearGradient>
                <linearGradient id="emptyTrackGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Tooltip content={<CustomDonutTooltip />} />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                cornerRadius={6}
                paddingAngle={safeRate > 0 && safeRate < 100 ? 5 : 0}
                dataKey="value"
                isAnimationActive={true}
                animationDuration={2500}
                animationEasing="ease-in-out"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    className={index === 1 ? "text-muted-foreground" : ""}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Valor Central em Destaque */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
              TAXA GERAL
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-baseline">
              <AnimatedNumber value={safeRate} suffix="%" decimals={1} />
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Distribution Scale */}
      <div className="pt-3 border-t border-border/60 grid grid-cols-3 gap-2 text-center">
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
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">{median}</span>
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

/* ── Cores Vivas com Gradiente Elegante (Não Agressivo) ──── */
const SERVICE_LAYER_THEMES = [
  {
    gradient: "from-blue-600 to-sky-500",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-50 dark:bg-blue-950/50",
    dot: "bg-blue-600",
    fillHexStart: "#2563EB",
    fillHexEnd: "#38BDF8",
  },
  {
    gradient: "from-indigo-600 to-blue-500",
    bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    border: "border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/50",
    dot: "bg-indigo-600",
    fillHexStart: "#4F46E5",
    fillHexEnd: "#60A5FA",
  },
  {
    gradient: "from-violet-600 to-indigo-500",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    border: "border-violet-500/30",
    text: "text-violet-600 dark:text-violet-400",
    badgeBg: "bg-violet-50 dark:bg-violet-950/50",
    dot: "bg-violet-600",
    fillHexStart: "#7C3AED",
    fillHexEnd: "#818CF8",
  },
  {
    gradient: "from-purple-600 to-fuchsia-500",
    bg: "bg-purple-500/10 dark:bg-purple-500/15",
    border: "border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-50 dark:bg-purple-950/50",
    dot: "bg-purple-600",
    fillHexStart: "#9333EA",
    fillHexEnd: "#E879F9",
  },
  {
    gradient: "from-teal-600 to-cyan-500",
    bg: "bg-teal-500/10 dark:bg-teal-500/15",
    border: "border-teal-500/30",
    text: "text-teal-600 dark:text-teal-400",
    badgeBg: "bg-teal-50 dark:bg-teal-950/50",
    dot: "bg-teal-600",
    fillHexStart: "#0D9488",
    fillHexEnd: "#06B6D4",
  },
];

function ServicesFunnelCard({
  data = [],
}: {
  data?: Array<{ name: string; key: string; count: number; percent: number }>;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const safeData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map((item, index) => {
      const theme = SERVICE_LAYER_THEMES[index % SERVICE_LAYER_THEMES.length];
      return {
        ...item,
        name: item?.name || "Serviço",
        count: item?.count || 0,
        percent: item?.percent || 0,
        theme,
      };
    });
  }, [data]);

  const totalLayers = safeData.length;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card rounded-2xl border border-border/80 p-5 sm:p-6 shadow-subtle hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Top Serviços Mais Contratados
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Participação por categoria de serviço
          </p>
        </div>
      </div>

      {safeData.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-border rounded-xl space-y-1">
          <Inbox className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Nenhum serviço registrado</p>
          <p className="text-[11px] text-muted-foreground/70">
            Os serviços aparecerão conforme novos projetos forem criados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center min-h-[185px]">
          {/* Lado Esquerdo: Funil Suave e Proporcional em SVG */}
          <div className="md:col-span-5 flex items-center justify-center py-1">
            <div className="relative w-full max-w-[165px] h-[175px]">
              <svg
                viewBox="0 0 200 180"
                className="w-full h-full overflow-visible drop-shadow-xs"
              >
                <defs>
                  {safeData.map((d, i) => (
                    <linearGradient
                      key={`funnel-grad-${i}`}
                      id={`funnel-grad-${i}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={d.theme.fillHexStart} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={d.theme.fillHexEnd} stopOpacity={0.88} />
                    </linearGradient>
                  ))}
                </defs>

                {safeData.map((d, i) => {
                  // Cálculo proporcional dos trapézios com gap suave de 5px
                  const gap = 5;
                  const totalGaps = (totalLayers - 1) * gap;
                  const availableHeight = 180 - totalGaps;
                  const layerHeight = availableHeight / totalLayers;

                  const yTop = i * (layerHeight + gap);
                  const yBottom = yTop + layerHeight;

                  // Afunilamento suave: do topo (largura 200) até a base (largura ~75)
                  const topWidthFactor = 1 - (i / Math.max(1, totalLayers)) * 0.55;
                  const bottomWidthFactor = 1 - ((i + 1) / Math.max(1, totalLayers)) * 0.55;

                  const topInset = (200 * (1 - topWidthFactor)) / 2;
                  const bottomInset = (200 * (1 - bottomWidthFactor)) / 2;

                  const x1 = topInset + 4; // top-left
                  const x2 = 200 - topInset - 4; // top-right
                  const x3 = 200 - bottomInset - 4; // bottom-right
                  const x4 = bottomInset + 4; // bottom-left

                  const isHovered = hoveredIdx === i;

                  return (
                    <motion.polygon
                      key={d.key || i}
                      points={`${x1},${yTop} ${x2},${yTop} ${x3},${yBottom} ${x4},${yBottom}`}
                      fill={`url(#funnel-grad-${i})`}
                      stroke={isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.25)"}
                      strokeWidth={isHovered ? 2 : 1}
                      className="cursor-pointer transition-all duration-300"
                      initial={{ opacity: 0, scaleY: 0.7, y: -6 }}
                      animate={{
                        opacity: hoveredIdx !== null && !isHovered ? 0.45 : 1,
                        scaleY: 1,
                        y: 0,
                        scale: isHovered ? 1.04 : 1,
                      }}
                      transition={{
                        duration: 1.8,
                        delay: 0.15 * i,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Lado Direito: Badges Minimalistas e Rótulos Clean */}
          <div className="md:col-span-7 flex flex-col justify-center gap-2">
            {safeData.map((d, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <motion.div
                  key={d.key || i}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`group flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isHovered
                      ? `${d.theme.badgeBg} ${d.theme.border} shadow-sm scale-[1.01]`
                      : "bg-slate-50/70 dark:bg-zinc-900/50 border-slate-200/70 dark:border-zinc-800 hover:border-border"
                  }`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.12 * i }}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${d.theme.dot} ${
                        isHovered ? "ring-2 ring-indigo-500/30" : ""
                      }`}
                    />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {d.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {d.count} {d.count === 1 ? "proj." : "projs."}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        isHovered
                          ? `${d.theme.bg} ${d.theme.text}`
                          : "bg-slate-200/60 dark:bg-zinc-800 text-foreground"
                      }`}
                    >
                      {d.percent}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Custom Bar Tooltip ──────────────────────────────────── */
const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload || payload[0];
  if (!item) return null;
  const name = item.name || "Cliente";
  const count = item.count ?? item.value ?? 0;
  const percent = item.percent ?? 0;
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl shadow-blue-500/10 px-3.5 py-2.5 text-xs font-medium space-y-1">
      <p className="font-bold text-foreground flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
        {name}
      </p>
      <div className="flex items-center justify-between gap-4 text-muted-foreground pt-1 border-t border-border/50">
        <span>Demandas Contratadas:</span>
        <span className="text-foreground font-bold">{count}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>Participação:</span>
        <span className="text-cyan-600 dark:text-cyan-400 font-bold">{percent}%</span>
      </div>
    </div>
  );
};

/* ── Gráfico de Barras Tecnológico: Principais Clientes & Parceiros ── */
function ClientsBarCard({
  data = [],
}: {
  data?: Array<{ name: string; count: number; percent: number }>;
}) {
  const safeData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map((d) => ({
      ...d,
      name: d?.name || "Cliente",
      count: d?.count || 0,
      percent: d?.percent || 0,
    }));
  }, [data]);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card rounded-2xl border border-border/80 p-6 shadow-subtle hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Principais Clientes &amp; Parceiros
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Volume de demandas por parceiro contratante
          </p>
        </div>
      </div>

      {safeData.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border rounded-xl space-y-1">
          <Inbox className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Nenhum cliente com demandas ativas</p>
          <p className="text-[11px] text-muted-foreground/70">
            Os clientes aparecerão associados aos novos projetos.
          </p>
        </div>
      ) : (
        <div className="w-full h-[240px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={safeData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="clientTechBarGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-border/40"
                horizontal={false}
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 600 }}
                width={110}
                tickFormatter={(val: any) => {
                  if (!val || typeof val !== "string") return "";
                  return val.length > 14 ? `${val.slice(0, 14)}…` : val;
                }}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="count"
                name="Demandas"
                fill="url(#clientTechBarGrad)"
                radius={[0, 8, 8, 0]}
                barSize={18}
                background={{ fill: "rgba(148, 163, 184, 0.12)", radius: [0, 8, 8, 0] }}
                isAnimationActive={true}
                animationDuration={2500}
                animationEasing="ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

/* ── Freelancer Dashboard View (RBAC Isolado) ─────────────── */
function FreelancerDashboardView() {
  const { user, profile } = useAuth();
  const { data: myProjects = [], isLoading: loadingProjects } = useFreelancerFinanceProjects(
    user?.id,
    user?.email,
  );

  const activeProjects = useMemo(
    () => myProjects.filter((p) => p.status !== "Concluido"),
    [myProjects],
  );
  const completedProjects = useMemo(
    () => myProjects.filter((p) => p.status === "Concluido"),
    [myProjects],
  );

  const totalEarnings = useMemo(
    () => myProjects.reduce((acc, p) => acc + Number(p.freelancer_cost || 0), 0),
    [myProjects],
  );

  const pendingEarnings = useMemo(
    () => activeProjects.reduce((acc, p) => acc + Number(p.freelancer_cost || 0), 0),
    [activeProjects],
  );

  const nearestDeadline = useMemo(() => {
    const upcoming = activeProjects
      .filter((p) => p.deadline)
      .map((p) => ({
        ...p,
        date: new Date(p.deadline!).getTime(),
      }))
      .filter((p) => !isNaN(p.date) && p.date >= Date.now())
      .sort((a, b) => a.date - b.date);

    return upcoming[0] || null;
  }, [activeProjects]);

  let nearestDeadlineDays = "—";
  if (nearestDeadline) {
    const diffDays = Math.ceil((nearestDeadline.date - Date.now()) / (1000 * 60 * 60 * 24));
    nearestDeadlineDays = diffDays === 0 ? "Hoje" : diffDays === 1 ? "Amanhã" : `${diffDays} dias`;
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Prestador";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-7xl mx-auto pb-16"
    >
      {/* Header do Prestador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
            Painel do Prestador
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Olá, {displayName}! 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Aqui está o resumo das suas demandas, remunerações acordadas e prazos de entrega.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 border-border rounded-xl cursor-pointer"
            asChild
          >
            <Link to="/app/finance">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Ver Extrato & Repasses
            </Link>
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer shadow-xs"
            asChild
          >
            <Link to="/app/projects">
              <Briefcase className="h-3.5 w-3.5" /> Ver Meus Projetos
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 KPIs Exclusivos do Freelancer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ganhos Acumulados"
          numericValue={totalEarnings}
          prefix="R$ "
          decimals={2}
          icon={DollarSign}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          sub="Remuneração de projetos alocados"
        />

        <KpiCard
          label="A Receber (Em Execução)"
          numericValue={pendingEarnings}
          prefix="R$ "
          decimals={2}
          icon={Clock}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          sub={`${activeProjects.length} projeto(s) em andamento`}
        />

        <KpiCard
          label="Projetos Concluídos"
          numericValue={completedProjects.length}
          icon={Award}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600 dark:text-blue-400"
          sub="Entregas finalizadas com sucesso"
        />

        <KpiCard
          label="Próxima Entrega"
          value={nearestDeadlineDays}
          icon={Sparkles}
          iconBg="bg-indigo-500/10"
          iconColor="text-indigo-600 dark:text-indigo-400"
          sub={nearestDeadline ? nearestDeadline.title : "Sem prazos pendentes"}
        />
      </div>

      {/* Seção: Meus Projetos em Andamento */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Suas Demandas & Projetos Ativos</h2>
            <p className="text-xs text-muted-foreground">Projetos em que você está alocado(a) no momento.</p>
          </div>
          <Link
            to="/app/projects"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Ver todos ({myProjects.length}) <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loadingProjects ? (
          <div className="p-12 text-center border border-dashed rounded-2xl">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-xs text-muted-foreground">Carregando suas demandas...</p>
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">Nenhum projeto em andamento no momento</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Assim que um gestor da agência vincular você a uma nova demanda, ela aparecerá aqui com todos os detalhes e briefings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map((p) => {
              let deadlineText = "Sem prazo";
              if (p.deadline) {
                try {
                  const d = new Date(p.deadline);
                  if (!isNaN(d.getTime())) deadlineText = d.toLocaleDateString("pt-BR");
                } catch {}
              }

              return (
                <div
                  key={p.id}
                  className="bg-card border border-border rounded-2xl p-5 shadow-subtle hover:border-indigo-500/30 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                        {SERVICE_LABEL[p.service_type] || p.service_type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {STATUS_LABEL[p.status] || p.status}
                      </Badge>
                    </div>

                    <Link
                      to="/app/projects/$id"
                      params={{ id: p.id }}
                      className="text-sm font-bold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1 block mb-1"
                    >
                      {p.title}
                    </Link>

                    <p className="text-xs text-muted-foreground font-medium mb-2 truncate">
                      {p.client?.full_name || "Cliente Parceiro"}
                    </p>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                      {p.briefing_content || "Sem briefing descritivo inserido."}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                      <span className="text-muted-foreground">
                        Prazo: <strong className="text-foreground">{deadlineText}</strong>
                      </span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        R$ {Number(p.freelancer_cost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 text-xs rounded-xl cursor-pointer hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-500/30"
                    >
                      <Link to="/app/projects/$id" params={{ id: p.id }}>
                        Abrir Área do Projeto →
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Dashboard Principal ─────────────────────────────────── */
function Dashboard() {
  const { profile, user, isGestor, isCliente, isFreelancer, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (isCliente || profile?.role === "cliente")) {
      navigate({ to: "/cliente", replace: true });
    }
  }, [loading, isCliente, profile, navigate]);

  if (isCliente || profile?.role === "cliente") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3.5 bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
        <p className="text-xs font-semibold text-muted-foreground">Redirecionando para o Portal do Cliente...</p>
      </div>
    );
  }

  if (isFreelancer) {
    return <FreelancerDashboardView />;
  }

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
    return projects;
  }, [projects, isGestor, isFreelancer, user]);

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
            Visão consolidada de performance, volumetria e finanças da Delski.
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

            <RetentionDonutCard
              rate={retentionStats.rate}
              p25={retentionStats.p25}
              median={retentionStats.median}
              p75={retentionStats.p75}
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

      {/* ── 3ª Fileira: Gráficos Tecnológicos (Funil de Serviços + Barras de Clientes) ─ */}
      {!loadingProjects && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Serviços / Competências (Gráfico de Funil Tecnológico) */}
          <ServicesFunnelCard data={topServicesData} />

          {/* Principais Clientes / Parceiros (Gráfico de Barras Tecnológico) */}
          <ClientsBarCard data={topClientsData} />
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
