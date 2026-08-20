import { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Project } from "@/hooks/useProjects";

interface NodeJourneyTimelineProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onViewAll?: () => void;
}

const JOURNEY_STEPS = [
  { id: "planejamento", label: "Planejamento" },
  { id: "contrato", label: "Contrato" },
  { id: "execucao", label: "Execução" },
  { id: "revisao", label: "Revisão" },
  { id: "concluido", label: "Concluído" },
];

export function getProjectCurrentStep(status?: string | null): number {
  if (!status) return 1;
  const s = status
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Normaliza e remove acentos para compatibilidade total

  // 1. Planejamento: CRIADO, SOLICITADO ou AGUARDANDO CANDIDATURAS
  if (
    s === "CRIADO" ||
    s === "SOLICITADO" ||
    s === "AGUARDANDO CANDIDATURAS" ||
    s.includes("CANDIDATURA") ||
    s === "PLANEJAMENTO"
  ) {
    return 1;
  }

  // 2. Contrato: EMITIR CONTRATO ou CONTRATADO
  if (
    s === "EMITIR CONTRATO" ||
    s === "CONTRATADO" ||
    s === "CONTRATO" ||
    s.includes("CONTRATO") ||
    s === "ASSINATURA"
  ) {
    return 2;
  }

  // 3. Execução: DELEGADO ou EM PRODUÇÃO (Em Andamento, Em Execução)
  if (
    s === "DELEGADO" ||
    s === "EM PRODUCAO" ||
    s === "EM ANDAMENTO" ||
    s === "EM EXECUCAO" ||
    s === "PRODUCAO" ||
    s === "EXECUCAO"
  ) {
    return 3;
  }

  // 4. Revisão: EM REVISÃO ou HOMOLOGAÇÃO
  if (
    s === "EM REVISAO" ||
    s === "REVISAO" ||
    s === "HOMOLOGACAO" ||
    s.includes("HOMOLOGACAO")
  ) {
    return 4;
  }

  // 5. Concluído: CONCLUÍDO ou ENTREGUE (Aprovado pelo Cliente, Finalizado)
  if (
    s === "CONCLUIDO" ||
    s === "CONCLUIDA" ||
    s === "ENTREGUE" ||
    s === "FINALIZADO" ||
    s === "APROVADO PELO CLIENTE" ||
    s.includes("CONCLUID") ||
    s.includes("ENTREGUE")
  ) {
    return 5;
  }

  return 1;
}

export function NodeJourneyTimeline({
  projects = [],
  onSelectProject,
  onViewAll,
}: NodeJourneyTimelineProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeProject = projects[selectedIdx] || projects[0];

  const formatDate = (val?: string | number | Date | null) => {
    if (!val) return "Em definição";
    try {
      const d = typeof val === "object" && val instanceof Date ? val : new Date(val);
      if (isNaN(d.getTime())) return "Em definição";
      return d.toLocaleDateString("pt-BR");
    } catch {
      return "Em definição";
    }
  };

  return (
    <div className="hud-card p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
              <Layers className="h-3.5 w-3.5" />
              Customer Journey Flow
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud">
            Jornada de Entregas & Marcos de Projetos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium">
            Acompanhamento de nós e etapas em tempo real de cada serviço contratado.
          </p>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="hud-nav-pill text-xs font-bold self-start sm:self-center"
          >
            Ver todos os projetos
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto">
            <Briefcase className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-hud">
            Nenhum projeto ativo no momento
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Assim que novos serviços forem contratados, o fluxo de etapas da jornada aparecerá aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Projects Selector Pills */}
          {projects.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {projects.map((p, idx) => (
                <button
                  key={p.id || idx}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer font-hud flex items-center gap-2 ${
                    selectedIdx === idx
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ["Concluido", "Concluida", "Aprovado pelo Cliente"].includes(p.status)
                        ? "bg-emerald-400"
                        : "bg-blue-500"
                    }`}
                  />
                  <span className="truncate max-w-[180px]">{p.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Active Project Journey Card */}
          {activeProject && (
            <motion.div
              key={activeProject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="p-6 rounded-[28px] bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200/70 dark:border-zinc-800 space-y-6"
            >
              {/* Project title and meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-hud">
                      {activeProject.service_type || "Serviço PJ"}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Prazo Estimado: {formatDate(activeProject.deadline)}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-hud tracking-tight">
                    {activeProject.title}
                  </h3>
                  {activeProject.briefing_content && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {activeProject.briefing_content}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectProject(activeProject)}
                  className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all self-start sm:self-center font-hud"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ver Escopo & Contrato
                </button>
              </div>

              {/* ── Visual Node Steps Flow ─────────────────────────────── */}
              <div className="pt-4">
                <div className="relative flex items-center justify-between">
                  {/* Connecting background line */}
                  <div className="absolute top-1/2 left-5 right-5 -translate-y-1/2 h-1 bg-slate-200 dark:bg-zinc-700 rounded-full pointer-events-none" />

                  {/* Connecting active filled line */}
                  <div className="absolute top-1/2 left-5 right-5 -translate-y-1/2 h-1 overflow-hidden rounded-full pointer-events-none">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{
                        width: `${((getProjectCurrentStep(activeProject.status) - 1) / (JOURNEY_STEPS.length - 1)) * 100}%`,
                      }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>

                  {/* Journey Stage Nodes */}
                  {JOURNEY_STEPS.map((step, sIdx) => {
                    const stepNum = sIdx + 1;
                    const currentStep = getProjectCurrentStep(activeProject.status);
                    const isCompleted = stepNum < currentStep;
                    const isCurrent = stepNum === currentStep;

                    return (
                      <div
                        key={step.id}
                        className="relative z-10 flex flex-col items-center group cursor-pointer"
                      >
                        {/* Node circle */}
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                            isCompleted
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                              : isCurrent
                              ? "bg-white dark:bg-zinc-900 border-2 border-blue-600 text-blue-600 dark:text-blue-400 ring-4 ring-blue-500/20"
                              : "bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isCurrent ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                          ) : (
                            stepNum
                          )}
                        </div>

                        {/* Node Label */}
                        <p
                          className={`text-[10px] sm:text-xs font-bold mt-2 text-center whitespace-nowrap font-hud ${
                            isCurrent
                              ? "text-blue-600 dark:text-blue-400"
                              : isCompleted
                              ? "text-slate-800 dark:text-zinc-200"
                              : "text-slate-400 dark:text-zinc-500"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
