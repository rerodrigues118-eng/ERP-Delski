import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Check,
  AlertCircle,
  FolderKanban,
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
    return <ImageIcon className="w-4 h-4 text-purple-600" />;
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  }
  if (["pdf"].includes(ext) || mimetype === "application/pdf") {
    return <FileText className="w-4 h-4 text-rose-600" />;
  }
  return <File className="w-4 h-4 text-blue-600" />;
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
  const progressPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const handleStatusChange = (task: ProjectTask, newStatus: TaskStatus) => {
    updateTaskStatusMutation.mutate({
      taskId: task.id,
      projectId: project.id,
      newStatus,
      tasks,
    });
  };

  return (
    <Dialog open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
        <div className="space-y-6">
          {/* Header */}
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {project.service_type || "Demanda"}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${
                  project.status === "Concluido"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : project.status === "Em Andamento" || project.status === "Em Producao"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : project.status === "Em Revisao"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {project.status === "Em Andamento" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
                {project.status === "Concluido" && <CheckCircle2 className="w-3 h-3" />}
                {project.status}
              </span>
            </div>

            <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white">
              {project.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cliente:{" "}
              <strong className="text-slate-700 dark:text-zinc-300">
                {project.client?.full_name || "Cliente Parceiro"}
              </strong>
            </DialogDescription>
          </DialogHeader>

          {/* Info Metrics Banner */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Prazo de Entrega
              </span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                {formatDate(project.deadline)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Honorário Combinado
              </span>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                {formatMoney(project.freelancer_cost || 0)}
              </p>
            </div>
          </div>

          {/* Internal Modal Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="grid grid-cols-2 w-full bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl">
              <TabsTrigger
                value="briefing"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Briefing & Documentos</span>
              </TabsTrigger>
              <TabsTrigger
                value="tarefas"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white flex items-center justify-center gap-2"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tarefas & Cronograma ({tasks.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* ── ABA 1: BRIEFING & DOCUMENTOS ─────────────────────────────── */}
            <TabsContent value="briefing" className="space-y-5 focus-visible:outline-none">
              {/* Conteúdo do Briefing */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Conteúdo do Briefing
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap font-sans">
                  {project.briefing_content?.trim() || (
                    <span className="text-slate-400 italic">
                      Nenhum briefing descritivo detalhado foi inserido pelo gestor para este projeto.
                    </span>
                  )}
                </div>
              </div>

              {/* Google Drive do Projeto */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-blue-600" /> Google Drive do Projeto
                </h4>
                {project.google_drive_link ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          Pasta Oficial do Projeto no Google Drive
                        </h5>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                          {project.google_drive_link}
                        </p>
                      </div>
                    </div>
                    <a
                      href={project.google_drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <span>Abrir no Google Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-800 text-xs text-slate-400 italic">
                    Nenhum repositório de Google Drive anexado pelo gestor.
                  </div>
                )}
              </div>

              {/* Anexos & Documentos do Projeto */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-blue-600" /> Anexos & Documentos ({projectFiles.length})
                  </h4>
                </div>

                {loadingFiles ? (
                  <div className="py-6 text-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-600 mb-1" />
                    <span className="text-xs">Carregando anexos...</span>
                  </div>
                ) : projectFiles.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-zinc-800/20">
                    Nenhum anexo ou arquivo adicional inserido pelo gestor para este projeto.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                    {projectFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-blue-600 transition-colors shrink-0"
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
            <TabsContent value="tarefas" className="space-y-4 focus-visible:outline-none">
              {/* Header com Progresso */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Progresso das Entregas
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {completedTasks} de {tasks.length} tarefa(s) concluída(s) ({progressPercent}%)
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <Progress value={progressPercent} className="h-2 rounded-full" />
                </div>
              </div>

              {/* Listagem de Tarefas */}
              {loadingTasks ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                  <span className="text-xs">Carregando tarefas delegadas...</span>
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-6 bg-slate-50/50 dark:bg-zinc-800/20">
                  <Layers className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                  <h5 className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Nenhuma tarefa delegada cadastrada
                  </h5>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                    Assim que o gestor estruturar as etapas ou o cronograma do projeto, as tarefas aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {tasks.map((task) => {
                    const isDone = task.status === "Concluida";

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isDone
                            ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-800/40"
                            : "bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isDone
                                  ? "line-through text-slate-400 dark:text-zinc-500"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.phase && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                                {task.phase}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Limite: {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Select Control */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={task.status}
                            onValueChange={(val: TaskStatus) => handleStatusChange(task, val)}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            <SelectTrigger
                              className={`h-8 text-xs font-semibold rounded-xl border w-36 ${
                                task.status === "Concluida"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : task.status === "Em andamento"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : task.status === "Em revisao"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Pendente">Pendente</SelectItem>
                              <SelectItem value="Em andamento">Em andamento</SelectItem>
                              <SelectItem value="Em revisao">Em revisão</SelectItem>
                              <SelectItem value="Concluida">Concluída</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2">
            <Button
              onClick={onClose}
              className="w-full h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold"
            >
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
