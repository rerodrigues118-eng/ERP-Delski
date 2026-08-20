import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface DonutProgressMeterProps {
  percentage: number;
  label: string;
  sublabel?: string;
  badgeText?: string;
  badgeType?: "blue" | "green" | "amber" | "neutral";
  icon?: React.ReactNode;
  onClick?: () => void;
  accentColor?: string;
  countNumber?: number | string;
}

export function DonutProgressMeter({
  percentage = 92,
  label = "SLA de Atendimento",
  sublabel = "Chamados dentro da meta",
  badgeText = "92% Ótimo",
  badgeType = "blue",
  icon,
  onClick,
  accentColor = "#2563EB",
  countNumber,
}: DonutProgressMeterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(count, percentage, {
      duration: 2.5,
      ease: [0.16, 1, 0.3, 1],
    });

    const unsubscribe = rounded.on("change", (latest) => {
      setDisplayValue(latest);
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [percentage]);

  const radius = 34;
  const strokeWidth = 6.5;
  const circumference = 2 * Math.PI * radius; // ~213.6
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference * (1 - clampedPercentage / 100);

  const badgeStyles = {
    blue: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/60",
    green: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60",
    amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60",
    neutral: "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700",
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`hud-card hud-card-hover p-6 flex flex-col justify-between cursor-pointer ${
        onClick ? "group" : ""
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-center text-slate-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {icon}
            </div>
          )}
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeStyles[badgeType]}`}>
              {badgeText}
            </span>
          </div>
        </div>

        {onClick && (
          <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Center Donut & Numbers */}
      <div className="my-5 flex items-center justify-between gap-4">
        <div>
          {countNumber !== undefined && (
            <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-hud tracking-tight">
              {countNumber}
            </p>
          )}
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-hud mt-0.5">
            {label}
          </h3>
          {sublabel && (
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 font-medium">
              {sublabel}
            </p>
          )}
        </div>

        {/* Circular Donut Meter */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            {/* Track */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-100 dark:text-zinc-800"
            />
            {/* Progress Stroke with 2.5s duration */}
            <motion.circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={accentColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-black text-slate-900 dark:text-white font-hud">
              {displayValue}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
