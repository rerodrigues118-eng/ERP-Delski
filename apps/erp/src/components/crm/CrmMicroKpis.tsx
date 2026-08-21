import { motion } from "framer-motion";
import { UserPlus, Calendar, DollarSign, Award, Percent } from "lucide-react";
import { CrmMicroMetrics } from "@/types/crm";

interface CrmMicroKpisProps {
  metrics: CrmMicroMetrics;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
};

export function CrmMicroKpis({ metrics }: CrmMicroKpisProps) {
  const cards = [
    {
      id: "leads-today",
      label: "Novos Leads (Hoje)",
      value: metrics.newLeadsToday,
      subtitle: "Entradas recentes",
      icon: UserPlus,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
    },
    {
      id: "meetings-week",
      label: "Reuniões Agendadas",
      value: metrics.meetingsThisWeek,
      subtitle: "Nesta semana",
      icon: Calendar,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    },
    {
      id: "pipeline-open",
      label: "Pipeline em Aberto",
      value: formatCurrency(metrics.openPipelineAmount),
      subtitle: "Propostas ativas",
      icon: DollarSign,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
    },
    {
      id: "closed-month",
      label: "Fechado no Mês",
      value: formatCurrency(metrics.closedMonthAmount),
      subtitle: "Vendas ganhas",
      icon: Award,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    },
    {
      id: "sdr-rate",
      label: "Conversão SDR",
      value: `${metrics.sdrConversionRate.toFixed(1)}%`,
      subtitle: `${metrics.totalLeads} leads no total`,
      icon: Percent,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {c.label}
              </span>
              <div className={`p-1.5 rounded-lg ${c.bg} ${c.color} shrink-0`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight tabular-nums">
                {c.value}
              </div>
              <span className="text-[10px] text-muted-foreground">{c.subtitle}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
