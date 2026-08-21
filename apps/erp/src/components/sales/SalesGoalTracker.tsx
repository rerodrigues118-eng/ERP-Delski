import { motion } from "framer-motion";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesGoal, GoalPeriodType } from "@/types/sales";

interface SalesGoalTrackerProps {
  goal: SalesGoal | null;
  currentRealized: number;
  periodType: GoalPeriodType;
  onPeriodChange: (type: GoalPeriodType) => void;
  onOpenSetGoalModal: () => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
};

export function SalesGoalTracker({
  goal,
  currentRealized,
  periodType,
  onPeriodChange,
  onOpenSetGoalModal,
}: SalesGoalTrackerProps) {
  const targetAmount = goal?.target_amount || (periodType === "weekly" ? 15000 : 60000);
  const percentage = Math.min(100, Math.round((currentRealized / targetAmount) * 100));
  const remaining = Math.max(0, targetAmount - currentRealized);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm"
    >
      {/* Decorative neon gradient blur accents */}
      <div className="absolute top-0 right-1/4 h-32 w-48 rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 h-32 w-48 rounded-full bg-sky-500/10 dark:bg-sky-500/20 blur-3xl pointer-events-none" />

      {/* Header with Switcher & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            Acompanhamento de Metas
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Toggle buttons */}
          <div className="inline-flex p-1 rounded-xl bg-muted/70 border border-border">
            <button
              type="button"
              onClick={() => onPeriodChange("weekly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodType === "weekly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => onPeriodChange("monthly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodType === "monthly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
          </div>

          {/* Action button */}
          <Button
            onClick={onOpenSetGoalModal}
            size="sm"
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Definir</span> Nova Meta
          </Button>
        </div>
      </div>

      {/* Main Goal Stats and Neon Progress Bar */}
      <div className="pt-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-xl bg-background/50 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Realizado</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{percentage}%</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
              {formatCurrency(currentRealized)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-background/50 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Meta Alvo</span>
              <span className="text-primary font-bold">{periodType === "weekly" ? "7 dias" : "30 dias"}</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
              {formatCurrency(targetAmount)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-background/50 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Falta para atingir</span>
              <span className="text-muted-foreground font-bold">{100 - percentage}%</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums text-primary">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Dynamic Blue Gradient Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-muted-foreground">
              Progresso da Meta ({periodType === "weekly" ? "Semanal" : "Mensal"})
            </span>
            <span className="font-bold text-foreground">{percentage}% Concluído</span>
          </div>

          <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-muted/80 p-0.5 ring-1 ring-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="relative h-full rounded-full bg-gradient-to-r from-blue-900 via-blue-600 to-sky-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              {/* Subtle light shimmer sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </motion.div>
          </div>

          <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
            <span>R$ 0,00</span>
            <span className="font-semibold text-foreground">
              {percentage >= 100 ? "Superada em " + formatCurrency(currentRealized - targetAmount) : `Faltam ${formatCurrency(remaining)}`}
            </span>
            <span>{formatCurrency(targetAmount)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
