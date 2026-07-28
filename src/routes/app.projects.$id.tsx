import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, DollarSign, ExternalLink, FileText, Plus, Upload, CheckCircle2,
  AlertCircle, ShieldCheck, Share2, Sparkles, Lock, Clock, UserCheck, Layers, Link as LinkIcon, Trash2, Loader2
} from "lucide-react";
import { sendTriageInviteEmail, sendDelegationEmail } from "@/integrations/brevo";
import { calculateFreelancerMatch } from "@/lib/matchmaking";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProject, useUpdateProject, useAssignFreelancer, type ProjectStatus } from "@/hooks/useProjects";
import { useProjectTasks, useCreateTask, useUpdateTaskStatus, useDeleteTask, type TaskStatus } from "@/hooks/useTasks";
import { useFreelancers } from "@/hooks/useProfiles";
import { SERVICE_LABEL, STATUS_LABEL } from "@/mocks/types";

export const Route = createFileRoute("/app/projects/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do Projeto — Delski ERP" },
    ],
  }),
  component: ProjectDetailPage,
});

const taskSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  phase: z.string().min(1, "Fase é obrigatória"),
  startDate: z.string().min(1, "Data de início obrigatória"),
  dueDate: z.string().min(1, "Data de término obrigatória"),
  predecessorId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { isGestor, isCliente, isFreelancer, user } = useAuth();

  const { data: project, isLoading: loadingProject } = useProject(id);
  const { data: tasks = [], isLoading: loadingTasks } = useProjectTasks(id);
  const { data: freelancers = [] } = useFreelancers();

  const updateProject = useUpdateProject();
  const assignFreelancer = useAssignFreelancer();
  const createTask = useCreateTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  // States
  const [activeBriefingTab, setActiveBriefingTab] = useState("overview");
  const [briefingText, setBriefingText] = useState("");
  const [driveInput, setDriveInput] = useState("");

  // Triage modal state
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Task dialog
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<{ id: string; name: string; url: string; uploadedAt: string }[]>([]);

  useEffect(() => {
    if (project) {
      setBriefingText(project.briefing_content || "");
      setDriveInput(project.google_drive_link || "");
    }
  }, [project]);

  const {
    register: registerTask,
    handleSubmit: handleSubmitTask,
    reset: resetTask,
    formState: { errors: taskErrors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      phase: "Fase 1: Alinhamento & Setup",
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    },
  });

  if (loadingProject) {
    return (
      <div className="p-16 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
        <p className="text-sm text-muted-foreground">Carregando dados do projeto via Supabase...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Projeto não encontrado no Supabase</h2>
        <Button onClick={() => navigate({ to: "/app/projects" })}>Voltar aos Projetos</Button>
      </div>
    );
  }

  // Briefing Saving
  const handleSaveBriefing = () => {
    updateProject.mutate({
      id: project.id,
      patch: { briefing_content: briefingText },
    });
  };

  const handleSaveDriveLink = () => {
    updateProject.mutate({
      id: project.id,
      patch: { google_drive_link: driveInput },
    });
  };

  // Attachments Handling with Supabase Storage Bucket
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${project.id}/${Math.random().toString(36).slice(2)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("project-attachments")
        .upload(filePath, file);

      let publicUrl = "";
      if (data?.path) {
        const { data: pubData } = supabase.storage
          .from("project-attachments")
          .getPublicUrl(data.path);
        publicUrl = pubData.publicUrl;
      } else {
        publicUrl = URL.createObjectURL(file);
      }

      setFiles((prev) => [
        ...prev,
        { id: Math.random().toString(), name: file.name, url: publicUrl, uploadedAt: new Date().toLocaleDateString("pt-BR") },
      ]);

      toast.success(`Arquivo ${file.name} anexado com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao fazer upload do arquivo");
    } finally {
      setUploading(false);
    }
  };

  // Task Creation
  const onAddTask = (data: TaskFormData) => {
    createTask.mutate(
      {
        project_id: project.id,
        title: data.title,
        phase: data.phase,
        status: "Pendente",
        start_date: data.startDate,
        due_date: data.dueDate,
        predecessor_id: data.predecessorId || undefined,
      },
      {
        onSuccess: () => {
          resetTask();
          setShowTaskModal(false);
        },
      }
    );
  };

  // Handle Task Status Change with Dependency Validation
  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTaskStatus.mutate({
      taskId,
      projectId: project.id,
      newStatus,
      tasks,
    });
  };

  // Send Triage Invite via Brevo
  const handleSendTriageInvite = async () => {
    if (!inviteEmail) return toast.error("Informe um e-mail válido");
    const triageLink = `${window.location.origin}/triagem/${project.id}`;
    
    await sendTriageInviteEmail({
      to: { name: inviteEmail.split("@")[0], email: inviteEmail },
      projectClient: project.title,
      triageLink,
    });

    setInviteEmail("");
    setShowTriageModal(false);
  };

  // Assign Freelancer from Selection
  const handleAssignFreelancer = (fId: string) => {
    assignFreelancer.mutate(
      { projectId: project.id, freelancerId: fId },
      {
        onSuccess: () => {
          const f = freelancers.find((x) => x.id === fId);
          if (f) {
            sendDelegationEmail({
              to: { name: f.full_name, email: f.email },
              projectClient: project.title,
              projectId: project.id,
              publicLink: window.location.href,
            });
          }
        },
      }
    );
  };

  // Calculate Progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Concluida").length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const currentFreelancer = project.freelancers?.[0]?.profile;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/app/projects" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Voltar aos Projetos
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              {SERVICE_LABEL[project.service_type] || project.service_type}
            </Badge>
            <Badge className="bg-zinc-800 text-zinc-300 text-xs">
              {STATUS_LABEL[project.status] || project.status}
            </Badge>
          </div>
          {project.client?.full_name && (
            <p className="text-xs text-muted-foreground">Cliente contratante: {project.client.full_name} ({project.client.email})</p>
          )}
        </div>

        {isGestor && (
          <div className="flex items-center gap-2">
            <Select
              value={project.status}
              onValueChange={(status) => updateProject.mutate({ id: project.id, patch: { status: status as ProjectStatus } })}
            >
              <SelectTrigger className="w-[180px] bg-card border-border">
                <SelectValue placeholder="Alterar Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Solicitado">Solicitado</SelectItem>
                <SelectItem value="Delegado">Delegado</SelectItem>
                <SelectItem value="Em Producao">Em Produção</SelectItem>
                <SelectItem value="Em Revisao">Em Revisão</SelectItem>
                <SelectItem value="Concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setShowTriageModal(true)} className="gap-1.5 text-xs">
              <Share2 className="h-3.5 w-3.5" /> Enviar Triagem
            </Button>
          </div>
        )}
      </div>

      {/* Top Details & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Prazo Final</div>
            <div className="text-lg font-bold mt-1 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-indigo-400" />
              {project.deadline ? new Date(project.deadline).toLocaleDateString("pt-BR") : "N/A"}
            </div>
          </CardContent>
        </Card>

        {isGestor && (
          <>
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-medium">Orçamento Bruto</div>
                <div className="text-lg font-bold mt-1 text-emerald-400">
                  R$ {Number(project.budget || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-medium">Custo Freelancer</div>
                <div className="text-lg font-bold mt-1 text-rose-400">
                  R$ {Number(project.freelancer_cost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {isFreelancer && (
          <Card className="bg-card border-indigo-500/20 bg-indigo-500/5">
            <CardContent className="p-4">
              <div className="text-xs text-indigo-300 font-medium">Seu Repasse / Remuneração</div>
              <div className="text-lg font-bold mt-1 text-indigo-400 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                R$ {Number(project.freelancer_cost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        )}

        {isCliente && (
          <Card className="bg-card border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-300 font-medium">Valor do Contrato</div>
              <div className="text-lg font-bold mt-1 text-emerald-400 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                R$ {Number(project.budget || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Progresso das Tarefas</div>
            <div className="text-lg font-bold mt-1 flex items-center justify-between">
              <span>{progressPct}%</span>
              <span className="text-xs font-normal text-muted-foreground">{completedTasks}/{totalTasks} concluídas</span>
            </div>
            <Progress value={progressPct} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="briefing" className="w-full">
        <TabsList className="bg-muted p-1 border-b border-border">
          <TabsTrigger value="briefing" className="gap-1.5">
            <FileText className="h-4 w-4" /> Briefing Estruturado
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <Layers className="h-4 w-4" /> Tarefas & Gantt ({totalTasks})
          </TabsTrigger>
          {isGestor && (
            <TabsTrigger value="matchmaking" className="gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" /> Triagem & Matchmaking
            </TabsTrigger>
          )}
        </TabsList>

        {/* Briefing Tab */}
        <TabsContent value="briefing" className="pt-4 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Conteúdo do Briefing</CardTitle>
                <CardDescription>Escopo, requisitos técnicos e documentação centralizada.</CardDescription>
              </div>
              {isGestor && (
                <Button onClick={handleSaveBriefing} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Salvar Briefing
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                rows={8}
                value={briefingText}
                disabled={!isGestor}
                onChange={(e) => setBriefingText(e.target.value)}
                placeholder="Escreva os detalhes completos do briefing..."
              />

              {/* Google Drive Link Section */}
              <div className="pt-4 border-t border-border space-y-2">
                <Label className="font-semibold text-sm flex items-center gap-1.5">
                  <LinkIcon className="h-4 w-4 text-indigo-400" /> Google Drive do Projeto
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={driveInput}
                    disabled={!isGestor}
                    onChange={(e) => setDriveInput(e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                  {isGestor && (
                    <Button onClick={handleSaveDriveLink} variant="outline" size="sm">
                      Salvar Link
                    </Button>
                  )}
                  {project.google_drive_link && (
                    <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <a href={project.google_drive_link} target="_blank" rel="noreferrer">
                        Abrir Drive <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">Anexos & Documentos ({files.length})</Label>
                  <label className="cursor-pointer">
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                    <Button variant="outline" size="sm" asChild disabled={uploading}>
                      <span>
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                        Anexar Arquivo
                      </span>
                    </Button>
                  </label>
                </div>

                <div className="divide-y border border-border rounded-lg">
                  {files.map((file) => (
                    <div key={file.id} className="p-3 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium text-foreground">{file.name}</div>
                        <div className="text-xs text-muted-foreground">Enviado em {file.uploadedAt}</div>
                      </div>
                      <a href={file.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-xs flex items-center gap-1">
                        Download <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                  {files.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">Nenhum anexo adicionado ainda.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Cronograma & Dependências de Tarefas</h3>
            {!isCliente && (
              <Button onClick={() => setShowTaskModal(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                <Plus className="h-4 w-4" /> Nova Tarefa
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {loadingTasks && (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando tarefas do Supabase...</div>
            )}
            {!loadingTasks && tasks.map((task) => {
              const predecessor = tasks.find((t) => t.id === task.predecessor_id);
              const isLocked = predecessor && predecessor.status !== "Concluida";

              return (
                <Card key={task.id} className={`bg-card transition-all ${isLocked ? "opacity-75 border-amber-500/30" : ""}`}>
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isLocked && <Lock className="h-4 w-4 text-amber-500" title={`Bloqueada por: ${predecessor?.title}`} />}
                        <span className="font-semibold text-foreground">{task.title}</span>
                        <Badge variant="outline" className="text-[10px]">{task.phase}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>Início: {task.start_date}</span>
                        <span>Término: {task.due_date}</span>
                        {predecessor && (
                          <span className={predecessor.status === "Concluida" ? "text-emerald-400" : "text-amber-400"}>
                            Depende de: {predecessor.title} ({predecessor.status})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={task.status}
                        onValueChange={(st) => handleTaskStatusChange(task.id, st as TaskStatus)}
                        disabled={isLocked && task.status === "Pendente"}
                      >
                        <SelectTrigger className="w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em andamento">Em andamento</SelectItem>
                          <SelectItem value="Em revisao">Em revisão</SelectItem>
                          <SelectItem value="Concluida">Concluída</SelectItem>
                        </SelectContent>
                      </Select>

                      {isGestor && (
                        <Button size="icon" variant="ghost" onClick={() => deleteTask.mutate({ taskId: task.id, projectId: project.id })}>
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-rose-500" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!loadingTasks && tasks.length === 0 && (
              <div className="p-8 text-center border border-dashed rounded-xl text-sm text-muted-foreground">
                Nenhuma tarefa criada para este projeto ainda.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Matchmaking Tab (Gestor Only) */}
        {isGestor && (
          <TabsContent value="matchmaking" className="pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  Alocação de Freelancer para o Projeto
                </CardTitle>
                <CardDescription>
                  Selecione um freelancer cadastrado no banco de dados para assumir este projeto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentFreelancer ? (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Freelancer Atribuído</div>
                      <div className="text-lg font-bold text-foreground mt-0.5">{currentFreelancer.full_name}</div>
                      <div className="text-xs text-muted-foreground">{currentFreelancer.email}</div>
                    </div>
                    <Badge className="bg-emerald-600 text-white">Alocado(a)</Badge>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Nenhum freelancer alocado neste projeto. Escolha um abaixo:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {freelancers.map((f) => (
                        <Card key={f.id} className="p-4 bg-card flex justify-between items-center">
                          <div>
                            <div className="font-bold text-sm text-foreground">{f.full_name}</div>
                            <div className="text-xs text-muted-foreground">{f.email}</div>
                          </div>
                          <Button size="sm" onClick={() => handleAssignFreelancer(f.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                            Atribuir ao Projeto
                          </Button>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Tarefa</DialogTitle>
            <DialogDescription>Adicione uma tarefa ao cronograma e defina dependências.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTask(onAddTask)} className="space-y-4">
            <div className="space-y-1">
              <Label>Título da Tarefa</Label>
              <Input placeholder="Ex: Criação de Telas UI" {...registerTask("title")} />
              {taskErrors.title && <p className="text-xs text-destructive">{taskErrors.title.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Fase do Projeto</Label>
              <Input placeholder="Fase 1: Alinhamento & Setup" {...registerTask("phase")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data de Início</Label>
                <Input type="date" {...registerTask("startDate")} />
              </div>
              <div className="space-y-1">
                <Label>Data de Término</Label>
                <Input type="date" {...registerTask("dueDate")} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Depende da Tarefa (Opcional)</Label>
              <Select onValueChange={(val) => registerTask("predecessorId").onChange({ target: { value: val, name: "predecessorId" } })}>
                <SelectTrigger><SelectValue placeholder="Selecione uma tarefa antecedente..." /></SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTaskModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={createTask.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Criar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Triage Invite Modal */}
      <Dialog open={showTriageModal} onOpenChange={setShowTriageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Link de Triagem ao Cliente</DialogTitle>
            <DialogDescription>Envia um e-mail com link exclusivo para preenchimento de requisitos do projeto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>E-mail do Destinatário</Label>
            <Input
              type="email"
              placeholder="cliente@empresa.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTriageModal(false)}>Cancelar</Button>
            <Button onClick={handleSendTriageInvite} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Enviar Convite via Brevo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
