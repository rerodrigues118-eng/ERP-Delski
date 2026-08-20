import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Layers,
  Calendar,
  DollarSign,
  ExternalLink,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  HardDrive,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  AlertCircle,
  FolderKanban,
  Building2,
  Sparkles,
  X,
  UserCheck,
} from "lucide-react";
import { useProjectTasks, useUpdateTaskStatus, type ProjectTask, type TaskStatus } from "@/hooks/useTasks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/hooks/useProjects";

interface FreelancerProjectDetailsModalProps {
  project: Project | null;
  onClose: () => void;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "A definir";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "A definir";
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch {
    return "A definir";
  }
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename: string, mimetype?: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext) || mimetype?.startsWith("image/")) {
    return <ImageIcon className="w-5 h-5 text-purple-600" />;
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  }
  if (["pdf"].includes(ext) || mimetype === "application/pdf") {
    return <FileText className="w-5 h-5 text-rose-600" />;
  }
  return <File className="w-5 h-5 text-blue-600" />;
}

export function FreelancerProjectDetailsModal({
  project,
  onClose,
}: FreelancerProjectDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<string>("briefing");

  // Query Project Tasks
  const { data: tasks = [], isLoading: loadingTasks } = useProjectTasks(project?.id || "");
  const updateTaskStatusMutation = useUpdateTaskStatus();

  // Query Project Files / Attachments from storage bucket
  const { data: projectFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: ["project-attachments", project?.id],
    enabled: Boolean(project?.id),
    queryFn: async () => {
      if (!project?.id) return [];
      try {
        const { data, error } = await supabase.storage
          .from("project-attachments")
          .list(project.id);

        if (error || !data) return [];

        return data
          .filter((f) => f.name !== ".emptyFolderPlaceholder")
          .map((f) => {
            const { data: pub } = supabase.storage
              .from("project-attachments")
              .getPublicUrl(`${project.id}/${f.name}`);
            return {
              id: f.id || f.name,
              name: f.name,
              size: f.metadata?.size || 0,
              mimetype: f.metadata?.mimetype || "",
              created_at: f.created_at,
              url: pub?.publicUrl || "",
            };
          });
      } catch (err) {
        console.warn("Erro ao buscar arquivos do projeto:", err);
        return [];
      }
    },
  });

  if (!project) return null;

  const completedTasks = tasks.filter((t) => t.status === "Concluida").length;
  const inProgressTasks = tasks.filter((t) => t.status === "Em andamento").length;
  const reviewTasks = tasks.filter((t) => t.status === "Em revisao").length;
  const pendingTasks = tasks.filter((t) => t.status === "Pendente").length;
  const progressPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const handleStatusChange = (task: ProjectTask, newStatus: TaskStatus) => {
    updateTaskStatusMutation.mutate({
      taskId: task.id,
      projectId: project.id,
      newStatus,
      tasks,
    });
  };

  const isDone = project.status === "Concluido";
  const isInProgress = project.status === "Em Andamento" || project.status === "Em Producao";
  const isReview = project.status === "Em Revisao" || project.status === "Revisão de Contrato";

  return (
    <Dialog open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] max-w-5xl md:max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl">
        {/* ── CABEÇALHO ULTRA-MINIMALISTA DO PROJETO ───────────────────────── */}
        <div className="p-6 sm:p-8 bg-white dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0 pr-4">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {project.title}
              </h2>
            </div>

            {/* Quick Metrics Header Cards */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Prazo de Entrega
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {formatDate(project.deadline)}
                </span>
              </div>

              <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Honorário Combinado
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  {formatMoney(project.freelancer_cost || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTEÚDO COM ABAS INTERNAS CENTRALIZADAS E ALINHADAS ──────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 sm:px-8 py-3 bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-center">
            <TabsList className="bg-slate-200/70 dark:bg-zinc-800/90 p-1 rounded-xl w-full max-w-lg grid grid-cols-2">
              <TabsTrigger
                value="briefing"
                className="rounded-lg px-4 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Briefing & Documentos</span>
              </TabsTrigger>
              <TabsTrigger
                value="tarefas"
                className="rounded-lg px-4 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Tarefas & Cronograma ({tasks.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* ── ABA 1: BRIEFING & DOCUMENTOS ─────────────────────────────── */}
            <TabsContent value="briefing" className="space-y-6 m-0 focus-visible:outline-none">
              {/* Box 1: Leitura Ampla do Escopo e Briefing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Escopo & Briefing Estruturado
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Definido pela Gestão Delski
                  </span>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 text-sm text-slate-800 dark:text-zinc-200 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap font-sans select-text shadow-inner">
                  {project.briefing_content?.trim() ? (
                    project.briefing_content
                  ) : (
                    <div className="py-6 text-center text-slate-400 italic">
                      Nenhum briefing descritivo detalhado foi inserido pelo gestor para este projeto.
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Google Drive do Projeto */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-600" /> Repositório de Entregáveis & Arquivos
                </h3>

                {project.google_drive_link ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-zinc-900 border border-blue-200/80 dark:border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                        <HardDrive className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Pasta Oficial do Projeto no Google Drive
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-md mt-0.5">
                          {project.google_drive_link}
                        </p>
                      </div>
                    </div>
                    <a
                      href={project.google_drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer active:scale-98"
                    >
                      <span>Abrir no Google Drive</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800 text-xs text-slate-400 italic flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    Nenhum link de pasta do Google Drive anexado pelo gestor até o momento.
                  </div>
                )}
              </div>

              {/* Box 3: Anexos e Documentos para Download */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-blue-600" /> Anexos & Arquivos de Apoio ({projectFiles.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Download direto
                  </span>
                </div>

                {loadingFiles ? (
                  <div className="py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-medium">Carregando anexos do projeto...</span>
                  </div>
                ) : projectFiles.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-zinc-900/20 space-y-1">
                    <FolderKanban className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-700" />
                    <p className="font-semibold text-slate-600 dark:text-zinc-400">Nenhum anexo adicional</p>
                    <p className="text-[11px] text-slate-400">Os arquivos enviados pela gestão ou cliente ficarão listados aqui.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {projectFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-blue-400/50 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            {getFileIcon(file.name, file.mimetype)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                              {file.name}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              {formatBytes(file.size)}
                              {file.created_at && ` • ${new Date(file.created_at).toLocaleDateString("pt-BR")}`}
                            </span>
                          </div>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-zinc-200 hover:text-blue-600 text-xs font-bold transition-all shrink-0"
                          title="Baixar arquivo"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── ABA 2: TAREFAS & CRONOGRAMA ──────────────────────────────── */}
            <TabsContent value="tarefas" className="space-y-6 m-0 focus-visible:outline-none">
              {/* Header com Estatísticas e Barra de Progresso */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" /> Progresso Geral das Entregas
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Atualize o status das suas etapas à medida que for avançando na execução.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {progressPercent}% Concluído
                    </span>
                  </div>
                </div>

                <Progress value={progressPercent} className="h-2.5 rounded-full bg-slate-200 dark:bg-zinc-800" />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pendentes</span>
                    <p className="text-base font-black text-amber-600 mt-0.5">{pendingTasks}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Em Andamento</span>
                    <p className="text-base font-black text-blue-600 mt-0.5">{inProgressTasks}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Em Revisão</span>
                    <p className="text-base font-black text-purple-600 mt-0.5">{reviewTasks}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Concluídas</span>
                    <p className="text-base font-black text-emerald-600 mt-0.5">{completedTasks}</p>
                  </div>
                </div>
              </div>

              {/* Tabela / Lista Completa de Tarefas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" /> Etapas & Entregas Atribuídas ({tasks.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Clique no status para atualizar
                  </span>
                </div>

                {loadingTasks ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span className="text-xs font-medium">Carregando cronograma de tarefas...</span>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl p-8 bg-slate-50/50 dark:bg-zinc-900/20 space-y-2">
                    <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-700 mb-1" />
                    <h5 className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                      Nenhuma etapa ou tarefa estruturada
                    </h5>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Assim que o gestor cadastrar as tarefas específicas no cronograma, elas aparecerão aqui para você acompanhar e alterar o status.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const isTaskDone = task.status === "Concluida";

                      return (
                        <div
                          key={task.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isTaskDone
                              ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-800/40"
                              : "bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 hover:border-blue-400/40 shadow-xs"
                          }`}
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-sm font-bold ${
                                  isTaskDone
                                    ? "line-through text-slate-400 dark:text-zinc-500"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.phase && (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700">
                                  {task.phase}
                                </span>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-slate-400 pt-0.5">
                              {task.due_date && (
                                <span className="flex items-center gap-1 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  Prazo: <strong className="text-slate-700 dark:text-zinc-300">{formatDate(task.due_date)}</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Seletor Interativo de Status */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Select
                              value={task.status}
                              onValueChange={(val: TaskStatus) => handleStatusChange(task, val)}
                              disabled={updateTaskStatusMutation.isPending}
                            >
                              <SelectTrigger
                                className={`h-9 text-xs font-bold rounded-xl border w-40 shadow-xs transition-all ${
                                  task.status === "Concluida"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                    : task.status === "Em andamento"
                                    ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                    : task.status === "Em revisao"
                                    ? "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                    : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                }`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl">
                                <SelectItem value="Pendente">🟡 Pendente</SelectItem>
                                <SelectItem value="Em andamento">🔵 Em andamento</SelectItem>
                                <SelectItem value="Em revisao">🟣 Em revisão</SelectItem>
                                <SelectItem value="Concluida">🟢 Concluída</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* ── RODAPÉ DISCRETO ──────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>As alterações no status das tarefas são salvas e sincronizadas automaticamente.</span>
          </div>

          <Button
            onClick={onClose}
            className="w-full sm:w-auto px-6 h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Fechar Detalhes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
