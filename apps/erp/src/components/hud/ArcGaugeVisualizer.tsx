import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Zap } from "lucide-react";

interface ArcGaugeVisualizerProps {
  percentage?: number; // 0 to 100
  title?: string;
  subtitle?: string;
  slaPercentage?: number;
  activeProjectsCount?: number;
  totalProjectsCount?: number;
}

export function ArcGaugeVisualizer({
  percentage = 85,
  title = "Progresso Geral de Entregas",
  subtitle = "Índice de performance e execução de demandas contratadas",
  slaPercentage = 100,
  activeProjectsCount = 0,
  totalProjectsCount = 0,
}: ArcGaugeVisualizerProps) {
  // Animated value ticker across 2.5 seconds
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

  // Semi-circle arc geometry
  // Center: (160, 150), Radius: 120
  // Arc path: Left (40, 150) -> Top (160, 30) -> Right (280, 150)
  const radius = 120;
  const strokeWidth = 14;
  const arcLength = Math.PI * radius; // ~376.99
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = arcLength * (1 - clampedPercentage / 100);

  return (
    <div className="relative w-full overflow-hidden rounded-[32px] bg-white dark:bg-[#11131A] border border-slate-200/70 dark:border-white/10 p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
      {/* ── Ambient Radial Glow Light Beam (Cobalt Breath 2.5s) ────────── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[60px] pointer-events-none hud-glow-pulse" />

      {/* Top Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60">
              <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              HUD Visualizer • Tempo Real
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              SLA {slaPercentage}%
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium">
            {subtitle}
          </p>
        </div>

        {/* Quick Context Pill */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900 p-2 px-3.5 rounded-2xl border border-slate-200/70 dark:border-zinc-800 self-start sm:self-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Status Geral</p>
            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-hud">
              {activeProjectsCount} de {totalProjectsCount} em execução
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Semi-Circular Arc Visualizer ───────────────────────────── */}
      <div className="relative z-10 pt-6 pb-2 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[320px] aspect-[320/180] flex items-center justify-center">
          <svg
            viewBox="0 0 320 180"
            className="w-full h-full overflow-visible drop-shadow-sm"
          >
            <defs>
              {/* Vibrant Cobalt & Royal Blue Gradient */}
              <linearGradient id="hudArcGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1E40AF" />
                <stop offset="50%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#4F46E5" />
              </linearGradient>

              {/* Diffuse glow filter */}
              <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Track Arc */}
            <path
              d="M 40 150 A 120 120 0 0 1 280 150"
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="text-slate-100 dark:text-zinc-800"
            />

            {/* Tick lines (0%, 25%, 50%, 75%, 100%) */}
            {[0, 25, 50, 75, 100].map((t) => {
              const angle = Math.PI - (t / 100) * Math.PI;
              const x1 = 160 + (radius - 18) * Math.cos(angle);
              const y1 = 150 - (radius - 18) * Math.sin(angle);
              const x2 = 160 + (radius - 26) * Math.cos(angle);
              const y2 = 150 - (radius - 26) * Math.sin(angle);
              return (
                <line
                  key={t}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-slate-300 dark:text-zinc-700"
                />
              );
            })}

            {/* Animated Active Arc (Duration: 2.5s) */}
            <motion.path
              d="M 40 150 A 120 120 0 0 1 280 150"
              fill="none"
              stroke="url(#hudArcGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={arcLength}
              initial={{ strokeDashoffset: arcLength }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
              filter="url(#arcGlow)"
            />
          </svg>

          {/* Center Digital Readout */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="flex items-baseline justify-center"
            >
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white font-hud tracking-tight">
                {displayValue}
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 ml-1">
                %
              </span>
            </motion.div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500 mt-1 font-hud">
              Conformidade de Escopo
            </p>
          </div>
        </div>

        {/* Scale labels */}
        <div className="w-full max-w-[320px] flex items-center justify-between px-6 pt-2 text-[11px] font-bold text-slate-400 dark:text-zinc-500 font-hud">
          <span>0% Início</span>
          <span>50%</span>
          <span>100% Entregue</span>
        </div>
      </div>
    </div>
  );
}
