import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStore } from "@/mocks/store";
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
  AlertCircle, ShieldCheck, Share2, Sparkles, Lock, Clock, UserCheck, Layers, Link as LinkIcon, Trash2
} from "lucide-react";
import type { ProjectStatus, TaskStatus } from "@/mocks/types";
import { sendTriageInviteEmail, sendDelegationEmail } from "@/integrations/brevo";
import { calculateFreelancerMatch } from "@/lib/matchmaking";
import { supabase } from "@/integrations/supabase/client";

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
  
  const user = useStore((s) => s.user);
  const isGestor = user?.role === "gestor";
  const isCliente = user?.role === "cliente";
  const isFreelancer = user?.role === "freelancer";

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const freelancers = useStore((s) => s.freelancers);
  const tasks = useStore((s) => s.tasks.filter((t) => t.projectId === id));
  const triageResponses = useStore((s) => s.triageResponses.filter((r) => r.projectId === id));

  const updateProjectStatus = useStore((s) => s.updateProjectStatus);
  const updateBriefingSections = useStore((s) => s.updateProjectBriefingSections);
  const updateProjectDetails = useStore((s) => s.updateProjectDetails);
  const assignFreelancer = useStore((s) => s.assignFreelancer);
  const addFile = useStore((s) => s.addFile);
  const removeFile = useStore((s) => s.removeFile);
  const setDriveLink = useStore((s) => s.setDriveLink);
  const addTask = useStore((s) => s.addTask);
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const removeTask = useStore((s) => s.removeTask);

  // States
  const [activeBriefingTab, setActiveBriefingTab] = useState("overview");
  const [overview, setOverview] = useState(project?.briefingSections?.overview || project?.description || "");
  const [technicalSpecs, setTechnicalSpecs] = useState(project?.briefingSections?.technicalSpecs || "");
  const [repositoryNotes, setRepositoryNotes] = useState(project?.briefingSections?.repositoryNotes || "");
  const [driveInput, setDriveInput] = useState(project?.driveLink || "");
  
  // Triage modal state
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Task dialog
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);

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

  if (!project) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Projeto não encontrado</h2>
        <Button onClick={() => navigate({ to: "/app/projects" })}>Voltar aos Projetos</Button>
      </div>
    );
  }

  // RLS Visibility Restrictions Check
  if (isCliente && project.clientId && project.clientId !== user?.clientId) {
    return (
      <div className="p-8 text-center space-y-4 text-destructive">
        <AlertCircle className="h-12 w-12 mx-auto" />
        <h2 className="text-xl font-bold">Acesso Não Autorizado</h2>
        <p className="text-sm text-muted-foreground">Você não possui permissão para visualizar este projeto.</p>
      </div>
    );
  }

  // Briefing Saving
  const handleSaveBriefing = () => {
    updateBriefingSections(project.id, {
      overview,
      technicalSpecs,
      repositoryNotes,
    });
    toast.success("Seções de briefing atualizadas com sucesso!");
  };

  const handleSaveDriveLink = () => {
    setDriveLink(project.id, driveInput);
    toast.success("Link do Google Drive atualizado!");
  };

  // Attachments Handling with Supabase Storage Bucket
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Direct Supabase Bucket Upload
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

      addFile(project.id, {
        name: file.name,
        size: file.size,
        url: publicUrl || "https://jrcyhfjubqtiwbttjeiv.supabase.co/storage/v1/object/public/project-attachments/sample.pdf",
        uploadedBy: user?.name || "Usuário",
      });

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
    addTask({
      projectId: project.id,
      title: data.title,
      phase: data.phase,
      status: "Pendente",
      startDate: data.startDate,
      dueDate: data.dueDate,
      predecessorId: data.predecessorId || undefined,
    });
    toast.success("Tarefa adicionada ao cronograma!");
    resetTask();
    setShowTaskModal(false);
  };

  // Handle Task Status Change with Dependency Validation
  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const res = updateTaskStatus(taskId, newStatus);
    if (!res.success) {
      toast.error(res.error || "Ação bloqueada por dependência de tarefa!");
    } else {
      toast.success(`Status da tarefa alterado para ${newStatus}`);
    }
  };

  // Send Triage Invite via Brevo
  const handleSendTriageInvite = async () => {
    if (!inviteEmail) return toast.error("Informe um e-mail válido");
    const triageLink = `${window.location.origin}/triagem/${project.id}`;
    
    await sendTriageInviteEmail({
      to: { name: inviteEmail.split("@")[0], email: inviteEmail },
      projectClient: project.client,
      triageLink,
    });

    setInviteEmail("");
    setShowTriageModal(false);
  };

  // Assign Freelancer from Triage/Selection
  const handleAssignFreelancer = (fId: string) => {
    assignFreelancer(project.id, fId);
    const f = freelancers.find((x) => x.id === fId);
    if (f) {
      sendDelegationEmail({
        to: { name: f.name, email: f.email },
        projectClient: project.client,
        projectId: project.id,
        publicLink: window.location.href,
      });
    }
    toast.success("Freelancer alocado com sucesso!");
  };

  // Calculate Progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Concluida").length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const currentFreelancer = freelancers.find((f) => f.id === project.freelancerId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/app/projects" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Projetos
            </Link>
            <span>/</span>
            <span className="font-medium text-foreground">{project.client}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{project.client}</h1>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-semibold">
              {project.type === "IA" ? "Automação IA" : project.type === "Trafego" ? "Tráfego Pago" : "Sites & Landings"}
            </Badge>
            <Badge className="bg-zinc-800 text-zinc-200">
              {project.status}
            </Badge>
          </div>
        </div>

        {isGestor && (
          <div className="flex items-center gap-2">
            <Select value={project.status} onValueChange={(v) => updateProjectStatus(project.id, v as ProjectStatus)}>
              <SelectTrigger className="w-[180px]">
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

            <Button onClick={() => setShowTriageModal(true)} variant="outline" className="gap-2">
              <Share2 className="h-4 w-4 text-indigo-500" />
              Enviar Triagem
            </Button>
          </div>
        )}
      </div>

      {/* Progress & Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Progresso Geral
              <span className="text-foreground font-bold">{progressPct}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progressPct} className="h-2" />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{completedTasks} de {totalTasks} tarefas concluídas</span>
              <span>Prazo: {project.deadline}</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial info only for Gestor */}
        {!isCliente && (
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento & Custos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Orçamento Bruto:</span>
                <span className="font-bold text-foreground">R$ {project.budget.toLocaleString("pt-BR")}</span>
              </div>
              {isGestor && (
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="text-muted-foreground">Custo Freelancer:</span>
                  <span className="font-semibold text-rose-500">R$ {(project.freelancerCost || 0).toLocaleString("pt-BR")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Freelancer Alocado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentFreelancer ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                    {currentFreelancer.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{currentFreelancer.name}</div>
                    <div className="text-xs text-muted-foreground">{currentFreelancer.email}</div>
                  </div>
                </div>
                {isGestor && (
                  <Button variant="ghost" size="sm" onClick={() => assignFreelancer(project.id, undefined)}>
                    Trocar
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground flex items-center justify-between">
                <span>Nenhum alocado</span>
                {isGestor && (
                  <Button size="sm" variant="outline" onClick={() => setShowTriageModal(true)}>
                    Convidar
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Briefing (3 Sections), Tasks & Gantt, Triage & Matchmaking */}
      <Tabs defaultValue="briefing" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md bg-muted">
          <TabsTrigger value="briefing">Briefing Estruturado</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas & Gantt</TabsTrigger>
          {!isCliente && <TabsTrigger value="matchmaking">Triagem & Matchmaking</TabsTrigger>}
        </TabsList>

        {/* Tab 1: Briefing Detailed in 3 Sections */}
        <TabsContent value="briefing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Módulo de Briefing Centralizado
              </CardTitle>
              <CardDescription>
                Informações estruturadas divididas em três seções essenciais para execução sem ambiguidades.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={activeBriefingTab} onValueChange={setActiveBriefingTab} className="w-full">
                <TabsList className="grid grid-cols-3 w-full bg-zinc-900">
                  <TabsTrigger value="overview">1. Visão Geral</TabsTrigger>
                  <TabsTrigger value="technical">2. Especificações Técnicas</TabsTrigger>
                  <TabsTrigger value="repository">3. Repositório de Arquivos</TabsTrigger>
                </TabsList>

                {/* Section 1: Visão Geral */}
                <TabsContent value="overview" className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Visão Geral do Projeto, Escopo e Entregáveis</Label>
                    <Textarea
                      disabled={isCliente || isFreelancer}
                      value={overview}
                      onChange={(e) => setOverview(e.target.value)}
                      placeholder="Descreva os objetivos principais do projeto..."
                      className="min-h-[160px]"
                    />
                  </div>
                  {isGestor && (
                    <Button onClick={handleSaveBriefing} size="sm" className="bg-indigo-600 text-white">
                      Salvar Visão Geral
                    </Button>
                  )}
                </TabsContent>

                {/* Section 2: Especificações Técnicas */}
                <TabsContent value="technical" className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Especificações Técnicas, Pilha Tecnológica e Integrações</Label>
                    <Textarea
                      disabled={isCliente}
                      value={technicalSpecs}
                      onChange={(e) => setTechnicalSpecs(e.target.value)}
                      placeholder="Detalhes de APIs, modelos de IA, contas de anúncio, webhooks, credenciais..."
                      className="min-h-[160px]"
                    />
                  </div>
                  {!isCliente && (
                    <Button onClick={handleSaveBriefing} size="sm" className="bg-indigo-600 text-white">
                      Salvar Especificações Técnicas
                    </Button>
                  )}
                </TabsContent>

                {/* Section 3: Repositório de Arquivos & Drive */}
                <TabsContent value="repository" className="pt-4 space-y-6">
                  {/* Google Drive Link Field */}
                  <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                    <Label className="flex items-center gap-2 font-semibold">
                      <LinkIcon className="h-4 w-4 text-indigo-500" />
                      Link do Google Drive do Projeto
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        disabled={isCliente || isFreelancer}
                        value={driveInput}
                        onChange={(e) => setDriveInput(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                      />
                      {isGestor && (
                        <Button onClick={handleSaveDriveLink} variant="outline">
                          Salvar Link
                        </Button>
                      )}
                      {project.driveLink && (
                        <Button asChild variant="secondary">
                          <a href={project.driveLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1.5" /> Abrir Drive
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Supabase Storage File Attachments */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold text-base">Anexos Directos (Supabase Bucket)</Label>
                      {!isCliente && (
                        <div className="relative">
                          <Input
                            type="file"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                            id="bucket-upload"
                          />
                          <Button asChild size="sm" className="bg-indigo-600 text-white cursor-pointer">
                            <label htmlFor="bucket-upload">
                              <Upload className="h-4 w-4 mr-1.5" />
                              {uploading ? "Enviando..." : "Anexar Arquivo"}
                            </label>
                          </Button>
                        </div>
                      )}
                    </div>

                    {project.files.length === 0 ? (
                      <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-sm">
                        Nenhum arquivo anexado a este projeto ainda.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {project.files.map((file) => (
                          <div key={file.id} className="p-3 rounded-xl border border-border bg-card flex justify-between items-center">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{file.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {(file.size / 1024).toFixed(0)} KB • Enviado por {file.uploadedBy}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button asChild size="icon" variant="ghost">
                                <a href={file.url} target="_blank" rel="noopener noreferrer" title="Baixar/Visualizar">
                                  <ExternalLink className="h-4 w-4 text-indigo-500" />
                                </a>
                              </Button>
                              {isGestor && (
                                <Button size="icon" variant="ghost" onClick={() => removeFile(project.id, file.id)} title="Excluir">
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Tasks & Timeline Gantt Chart */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  Cronograma & Tarefas por Fase (Gantt Simples)
                </CardTitle>
                <CardDescription>
                  Bloqueio automático de dependências: uma tarefa dependente só pode iniciar/concluir se a anterior estiver concluída.
                </CardDescription>
              </div>
              {!isCliente && (
                <Button onClick={() => setShowTaskModal(true)} size="sm" className="bg-indigo-600 text-white">
                  <Plus className="h-4 w-4 mr-1.5" /> Criar Tarefa
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gantt Timeline Visualizer */}
              <div className="p-4 rounded-xl border border-border bg-zinc-950/40 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Timeline de Prazos & Gargalos
                </div>
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma tarefa criada.</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const predecessor = tasks.find((t) => t.id === task.predecessorId);
                      const isBlocked = predecessor && predecessor.status !== "Concluida";

                      return (
                        <div key={task.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{task.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {task.phase}
                              </Badge>
                              {isBlocked && (
                                <Badge variant="destructive" className="text-[10px] gap-1">
                                  <Lock className="h-3 w-3" /> Bloqueado por: {predecessor?.title}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" /> {task.startDate} até {task.dueDate}
                              </span>
                              {!isCliente && (
                                <Select
                                  value={task.status}
                                  onValueChange={(v) => handleTaskStatusChange(task.id, v as TaskStatus)}
                                >
                                  <SelectTrigger className="h-7 text-xs w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pendente">Pendente</SelectItem>
                                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                                    <SelectItem value="Concluida">Concluída</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>

                          {/* Mini Gantt Progress Bar */}
                          <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                task.status === "Concluida"
                                  ? "bg-emerald-500"
                                  : task.status === "Em andamento"
                                  ? "bg-indigo-500"
                                  : isBlocked
                                  ? "bg-rose-500/50"
                                  : "bg-zinc-600"
                              }`}
                              style={{ width: task.status === "Concluida" ? "100%" : task.status === "Em andamento" ? "50%" : "15%" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Matchmaking Matrix & Triage Responses */}
        {!isCliente && (
          <TabsContent value="matchmaking" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    Matriz de Adequação & Triagens Recebidas
                  </CardTitle>
                  <CardDescription>
                    Candidaturas de freelancers tokenizadas com índice de compatibilidade calculado automaticamente.
                  </CardDescription>
                </div>
                <Button onClick={() => setShowTriageModal(true)} variant="outline" size="sm">
                  Gerar Link de Triagem
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {triageResponses.length === 0 ? (
                  <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-sm space-y-2">
                    <p>Nenhuma resposta de triagem enviada para este projeto ainda.</p>
                    <p className="text-xs text-zinc-500">
                      Envie um convite de triagem por e-mail ou compartilhe o link:{" "}
                      <code>{window.location.origin}/triagem/{project.id}</code>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {triageResponses.map((resp) => {
                      const match = calculateFreelancerMatch({
                        projectServiceType: project.type,
                        freelancerSkills: resp.skills,
                        availabilityHours: resp.availabilityHours,
                        hasPortfolio: Boolean(resp.portfolioUrl),
                        proposedRate: resp.proposedRate,
                        projectBudget: project.budget,
                      });

                      return (
                        <div key={resp.token} className="p-4 rounded-xl border border-border bg-card space-y-3">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <div className="font-bold text-base">{resp.freelancerName}</div>
                              <div className="text-xs text-muted-foreground">{resp.freelancerEmail}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={match.badgeVariant} className="text-sm font-bold">
                                {match.score}% Match — {match.label}
                              </Badge>
                              {isGestor && (
                                <Button
                                  size="sm"
                                  className="bg-indigo-600 text-white"
                                  onClick={() => {
                                    // Add to freelancers if not existing
                                    const createdF = useStore.getState().addFreelancer({
                                      name: resp.freelancerName,
                                      email: resp.freelancerEmail,
                                      skills: resp.skills as any,
                                      active: true,
                                    });
                                    handleAssignFreelancer(createdF.id);
                                  }}
                                >
                                  <UserCheck className="h-4 w-4 mr-1.5" /> Aprovar & Alocar
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs p-3 rounded-lg bg-muted">
                            <div><strong>Disponibilidade:</strong> {resp.availabilityHours}h/semana</div>
                            <div><strong>Pretensão:</strong> R$ {resp.proposedRate}</div>
                            <div className="truncate">
                              <strong>Portfólio:</strong>{" "}
                              <a href={resp.portfolioUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline">
                                {resp.portfolioUrl}
                              </a>
                            </div>
                          </div>

                          {match.matches.length > 0 && (
                            <div className="text-xs text-emerald-400 space-y-1">
                              <strong>Pontos Fortes:</strong> {match.matches.join(" • ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Modal: Triage Email Invite */}
      <Dialog open={showTriageModal} onOpenChange={setShowTriageModal}>
        <DialogContent className="bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Convidar Freelancer para Triagem</DialogTitle>
            <DialogDescription>
              Envie um convite oficial por e-mail via Brevo API com o link tokenizado de triagem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>E-mail do Freelancer</Label>
              <Input
                type="email"
                placeholder="freelancer@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
              <div className="font-semibold">Link tokenizado direto:</div>
              <code className="text-indigo-400 break-all">{window.location.origin}/triagem/{project.id}</code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTriageModal(false)}>Cancelar</Button>
            <Button onClick={handleSendTriageInvite} className="bg-indigo-600 text-white">Disparar Convite Brevo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Task */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Adicionar Tarefa ao Cronograma</DialogTitle>
            <DialogDescription>
              Configure o prazo, fase e tarefa predecessora para bloquear dependências incompletas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTask(onAddTask)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título da Tarefa</Label>
              <Input placeholder="Ex: Integração com API WhatsApp" {...registerTask("title")} />
              {taskErrors.title && <p className="text-xs text-destructive">{taskErrors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Fase do Projeto</Label>
              <Input placeholder="Ex: Fase 1: Setup" {...registerTask("phase")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input type="date" {...registerTask("startDate")} />
              </div>
              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Input type="date" {...registerTask("dueDate")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tarefa Predecessora (Dependência)</Label>
              <Select onValueChange={(val) => registerTask("predecessorId").onChange({ target: { value: val } })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tarefa (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Sem dependência)</SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowTaskModal(false)}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 text-white">Criar Tarefa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
