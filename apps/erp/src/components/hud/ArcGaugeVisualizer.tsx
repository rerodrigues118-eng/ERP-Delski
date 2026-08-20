import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Zap, ShieldCheck, Activity, TrendingUp, CheckCircle2, Clock } from "lucide-react";

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
  subtitle = "Visão consolidada de performance, cronogramas e conformidade de entregas corporativas.",
  slaPercentage = 100,
  activeProjectsCount = 0,
  totalProjectsCount = 0,
}: ArcGaugeVisualizerProps) {
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

  // Compact semi-circle arc geometry
  const radius = 72;
  const strokeWidth = 9;
  const arcLength = Math.PI * radius; // ~226.19
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = arcLength * (1 - clampedPercentage / 100);

  return (
    <div className="relative w-full overflow-hidden rounded-[32px] bg-white dark:bg-[#11131A] border border-slate-200/70 dark:border-white/10 p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)] space-y-6">
      {/* ── Ambient Radial Glow Light Beam ──────────────────────────────── */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[60px] pointer-events-none hud-glow-pulse" />

      {/* Top Header Row */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 font-hud">
              <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              HUD Visualizer • Tempo Real
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-hud">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium font-hud">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-900 p-2 px-3.5 rounded-2xl border border-slate-200/70 dark:border-zinc-800">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-hud">Status Geral</p>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-hud">
                {activeProjectsCount} de {totalProjectsCount} em execução
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cohesive HUD Multi-Panel (Arc Gauge + Micro-Charts Side by Side) ─ */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* 1. Compact Arc Speedometer Gauge (4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60">
          <div className="relative w-full max-w-[210px] aspect-[210/120] flex items-center justify-center">
            <svg
              viewBox="0 0 210 120"
              className="w-full h-full overflow-visible drop-shadow-sm"
            >
              <defs>
                <linearGradient id="hudArcGradientCompact" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1E40AF" />
                  <stop offset="50%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#4F46E5" />
                </linearGradient>
                <filter id="arcGlowCompact" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Track */}
              <path
                d="M 33 105 A 72 72 0 0 1 177 105"
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className="text-slate-200 dark:text-zinc-800"
              />

              {/* Ticks */}
              {[0, 50, 100].map((t) => {
                const angle = Math.PI - (t / 100) * Math.PI;
                const x1 = 105 + (radius - 12) * Math.cos(angle);
                const y1 = 105 - (radius - 12) * Math.sin(angle);
                const x2 = 105 + (radius - 18) * Math.cos(angle);
                const y2 = 105 - (radius - 18) * Math.sin(angle);
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

              {/* Animated Stroke (2.5s) */}
              <motion.path
                d="M 33 105 A 72 72 0 0 1 177 105"
                fill="none"
                stroke="url(#hudArcGradientCompact)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={arcLength}
                initial={{ strokeDashoffset: arcLength }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
                filter="url(#arcGlowCompact)"
              />
            </svg>

            {/* Center Digits */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center text-center">
              <div className="flex items-baseline justify-center">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-hud tracking-tight">
                  {displayValue}
                </span>
                <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 ml-0.5">
                  %
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-hud">
                Conformidade de Escopo
              </p>
            </div>
          </div>

          <div className="w-full flex items-center justify-between px-3 pt-2 text-[10px] font-bold text-slate-400 dark:text-zinc-500 font-hud">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* 2. Real-Time SLA Response Performance Bar (4 cols) */}
        <div className="md:col-span-4 p-4 rounded-2xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 font-hud flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> SLA em Tempo Real
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 font-hud">
              {slaPercentage}% Ativo
            </span>
          </div>

          {/* Progress Bar with 2.5s animation */}
          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${slaPercentage}%` }}
                transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium font-hud">
              <span>Meta SLA: &lt; 2 horas</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">100% no prazo</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-800 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-white dark:bg-zinc-800/70 border border-slate-200/50 dark:border-zinc-700/50">
              <p className="text-[10px] text-slate-400 font-medium">Tempo Médio</p>
              <p className="text-xs font-bold text-slate-800 dark:text-white font-hud mt-0.5">38 minutos</p>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-zinc-800/70 border border-slate-200/50 dark:border-zinc-700/50">
              <p className="text-[10px] text-slate-400 font-medium">Chamados Resolvidos</p>
              <p className="text-xs font-bold text-slate-800 dark:text-white font-hud mt-0.5">100% Taxa</p>
            </div>
          </div>
        </div>

        {/* 3. Delivery Velocity & Activity Sparkline (4 cols) */}
        <div className="md:col-span-4 p-4 rounded-2xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 font-hud flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-600" /> Velocidade de Entregas
            </span>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-hud">
              +14% esse mês
            </span>
          </div>

          {/* Sparkline curve (SVG) */}
          <div className="h-12 w-full flex items-center justify-center">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 160 48">
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Fill area */}
              <motion.path
                d="M 0 40 Q 30 15, 60 28 T 110 12 T 160 8 L 160 48 L 0 48 Z"
                fill="url(#sparkGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
              />
              {/* Stroke line with 2.5s duration */}
              <motion.path
                d="M 0 40 Q 30 15, 60 28 T 110 12 T 160 8"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* Pulsing dot at latest point */}
              <circle cx="160" cy="8" r="3.5" fill="#2563EB" className="animate-ping" />
              <circle cx="160" cy="8" r="3" fill="#2563EB" />
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium font-hud pt-1">
            <span>S1</span>
            <span>S2</span>
            <span>S3</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">S4 Atual</span>
          </div>
        </div>
      </div>
    </div>
  );
}
