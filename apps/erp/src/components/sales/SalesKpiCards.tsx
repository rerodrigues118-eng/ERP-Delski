import { motion } from "framer-motion";
import { Target, DollarSign, Percent, ArrowUpRight } from "lucide-react";
import { SalesMetrics } from "@/types/sales";

interface SalesKpiCardsProps {
  metrics: SalesMetrics;
  periodType: "weekly" | "monthly";
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
};

export function SalesKpiCards({ metrics, periodType }: SalesKpiCardsProps) {
  const currentSalesAmount =
    periodType === "weekly" ? metrics.totalWeekSales : metrics.totalMonthSales;

  const cards = [
    {
      id: "sales-total",
      label: periodType === "weekly" ? "Vendas da Semana" : "Vendas do Mês",
      value: formatCurrency(currentSalesAmount),
      icon: DollarSign,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20",
      accentBorder: "hover:border-blue-500/40",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(37,99,235,0.12)]",
    },
    {
      id: "meta-atingida",
      label: "Meta Atingida",
      value: `${metrics.goalProgressPercentage}%`,
      icon: Target,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20",
      accentBorder: "hover:border-emerald-500/40",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]",
    },
    {
      id: "ticket-medio",
      label: "Ticket Médio",
      value: formatCurrency(metrics.averageTicket),
      icon: ArrowUpRight,
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/20",
      accentBorder: "hover:border-indigo-500/40",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(99,102,241,0.12)]",
    },
    {
      id: "taxa-conversao",
      label: "Taxa de Conversão",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      icon: Percent,
      iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 dark:bg-cyan-500/20",
      accentBorder: "hover:border-cyan-500/40",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(6,182,212,0.12)]",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.06, ease: "easeOut" }}
            className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all duration-300 ${card.accentBorder} ${card.glowColor}`}
          >
            {/* Ambient subtle glow background */}
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-xl pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl ${card.iconBg} transition-transform duration-300 group-hover:scale-105`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="py-0.5">
              <div className="text-2xl sm:text-2xl font-extrabold text-foreground tracking-tight tabular-nums font-sans">
                {card.value}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
