import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, ArrowUpRight } from "lucide-react";
import { SalesMetrics } from "@/types/sales";

interface SalesKpiCardsProps {
  metrics: SalesMetrics;
  periodType: "weekly" | "monthly";
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
};

export function SalesKpiCards({ metrics, periodType }: SalesKpiCardsProps) {
  const currentSalesAmount =
    periodType === "weekly" ? metrics.totalWeekSales : metrics.totalMonthSales;
  const growth =
    periodType === "weekly"
      ? metrics.weekGrowthPercentage
      : metrics.monthGrowthPercentage;
  const isPositiveGrowth = growth >= 0;

  const cards = [
    {
      id: "sales-total",
      label: periodType === "weekly" ? "Vendas da Semana" : "Vendas do Mês",
      value: formatCurrency(currentSalesAmount),
      badge: {
        text: `${isPositiveGrowth ? "+" : ""}${growth.toFixed(1)}%`,
        isPositive: isPositiveGrowth,
        subtitle: "vs. período anterior",
      },
      icon: DollarSign,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20",
      accentBorder: "hover:border-blue-500/40",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(37,99,235,0.15)]",
    },
    {
      id: "meta-atingida",
      label: "Meta Atingida",
      value: `${metrics.goalProgressPercentage}%`,
      badge: {
        text: metrics.goalProgressPercentage >= 100 ? "Meta Batida! 🎯" : `${formatCurrency(metrics.remainingGoalAmount)} restante`,
        isPositive: metrics.goalProgressPercentage >= 75,
        subtitle: "Progresso atual",
      },
      icon: Target,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20",
      accentBorder: "hover:border-emerald-500/40",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
      progress: metrics.goalProgressPercentage,
    },
    {
      id: "ticket-medio",
      label: "Ticket Médio",
      value: formatCurrency(metrics.averageTicket),
      badge: {
        text: `${metrics.closedDeals} fechamentos`,
        isPositive: true,
        subtitle: "Por venda aprovada",
      },
      icon: ArrowUpRight,
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/20",
      accentBorder: "hover:border-indigo-500/40",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]",
    },
    {
      id: "taxa-conversao",
      label: "Taxa de Conversão",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      badge: {
        text: `${metrics.closedDeals} de ${metrics.totalDeals} propostas`,
        isPositive: metrics.conversionRate >= 30,
        subtitle: "Propostas vs Vendas",
      },
      icon: Percent,
      iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 dark:bg-cyan-500/20",
      accentBorder: "hover:border-cyan-500/40",
      glowColor: "group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08, ease: "easeOut" }}
            className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 ${card.accentBorder} ${card.glowColor}`}
          >
            {/* Ambient subtle glow background */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-xl pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                {card.label}
              </span>
              <div className={`p-2.5 rounded-xl ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums font-sans">
                {card.value}
              </div>

              {card.progress !== undefined ? (
                <div className="space-y-1.5 pt-1">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(card.progress, 100)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">{card.badge.subtitle}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{card.badge.text}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold text-[11px] ${
                      card.badge.isPositive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {card.badge.isPositive ? (
                      <TrendingUp className="h-3 w-3 inline" />
                    ) : (
                      <TrendingDown className="h-3 w-3 inline" />
                    )}
                    {card.badge.text}
                  </span>
                  <span className="text-muted-foreground truncate">{card.badge.subtitle}</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
