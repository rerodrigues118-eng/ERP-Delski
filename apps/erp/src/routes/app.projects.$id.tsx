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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  ExternalLink,
  FileText,
  Plus,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Share2,
  Sparkles,
  Lock,
  Clock,
  UserCheck,
  UserPlus,
  Search,
  Layers,
  Link as LinkIcon,
  Trash2,
  Loader2,
  Copy,
  Paperclip,
  X,
} from "lucide-react";
import { sendTriageInviteEmail, sendDelegationEmail } from "@/integrations/brevo";
import { calculateFreelancerMatch } from "@/lib/matchmaking";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useProject,
  useUpdateProject,
  useAssignFreelancer,
  useDeleteProject,
  type ProjectStatus,
} from "@/hooks/useProjects";
import {
  useProjectTasks,
  useCreateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  type TaskStatus,
} from "@/hooks/useTasks";
import { useFreelancers } from "@/hooks/useProfiles";
import {
  useProjectCandidaturas,
  useApproveCandidato,
  useUpdateCandidatura,
  type Candidatura,
} from "@/hooks/useTriage";
import { SERVICE_LABEL, STATUS_LABEL, STATUSES } from "@/mocks/types";
import { ProjectContractFieldsSection } from "@/components/ProjectContractFieldsSection";
import { TriageFormBuilderSection } from "@/components/TriageFormBuilderSection";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/app/projects/$id")({
  head: () => ({
    meta: [{ title: "Detalhes do Projeto — DELSKI CLOUD" }],
  }),
  component: ProjectDetailPage,
});

const taskSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  phase: z.string().min(1, "Fase é obrigatória"),
  startDate: z.string().min(1, "Data de início obrigatória"),
  dueDate: z.string().min(1, "Data de término obrigatória"),
  predecessorId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;
const taskResolver = zodResolver(taskSchema);

const editCandidaturaSchema = z.object({
  freelancer_name: z.string().min(3, "Nome completo é obrigatório"),
  freelancer_email: z.string().email("Endereço de e-mail inválido"),
  availability_hours: z.coerce.number().min(1, "Informe as horas semanais disponíveis"),
  proposed_rate: z.coerce.number().min(10, "Informe sua pretensão de valor (R$)"),
  portfolio_url: z
    .string()
    .url("Insira uma URL válida (ex: https://github.com/...)")
    .or(z.literal("")),
  experience_summary: z.string().min(10, "Descreva sua experiência relevante"),
  considerations: z.string().min(10, "Descreva suas considerações técnicas"),
});

type EditCandidaturaFormData = z.infer<typeof editCandidaturaSchema>;
const editCandidaturaResolver = zodResolver(editCandidaturaSchema) as any;

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { isGestor, isCliente, isFreelancer, user } = useAuth();

  const { data: project, isLoading: loadingProject } = useProject(id);
  const { data: tasks = [], isLoading: loadingTasks } = useProjectTasks(id);
  const { data: freelancers = [] } = useFreelancers();
  const { data: candidaturas = [], isLoading: loadingCandidaturas } = useProjectCandidaturas(id);

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const approveCandidato = useApproveCandidato();
  const updateCandidatura = useUpdateCandidatura();
  const assignFreelancer = useAssignFreelancer();
  const createTask = useCreateTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  // States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeBriefingTab, setActiveBriefingTab] = useState("overview");
  const [briefingText, setBriefingText] = useState("");
  const [driveInput, setDriveInput] = useState("");
  const [projectContractValues, setProjectContractValues] = useState<Record<string, string>>({});

  // Triage modal state
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showEditCandidaturaModal, setShowEditCandidaturaModal] = useState(false);
  const [editingCandidatura, setEditingCandidatura] = useState<Candidatura | null>(null);
  const [viewingCandidaturaDetail, setViewingCandidaturaDetail] = useState<Candidatura | null>(null);
  const [directAssignFreelancerId, setDirectAssignFreelancerId] = useState<string>("");

  // Task dialog
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<{ name: string; url: string; size?: number }[]>([]);
  const [taskAttachmentUploading, setTaskAttachmentUploading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<
    { id: string; name: string; url: string; uploadedAt: string }[]
  >([]);

  useEffect(() => {
    if (project) {
      setBriefingText(project.briefing_content || "");
      setDriveInput(project.google_drive_link || "");
      setProjectContractValues(project.contract_field_values || {});
    }
  }, [project]);

  const {
    register: registerEditCandidatura,
    handleSubmit: handleSubmitEditCandidatura,
    reset: resetEditCandidatura,
    formState: { errors: editCandidaturaErrors },
  } = useForm<EditCandidaturaFormData>({
    resolver: editCandidaturaResolver,
    defaultValues: {
      freelancer_name: "",
      freelancer_email: "",
      availability_hours: 20,
      proposed_rate: 1500,
      portfolio_url: "",
      experience_summary: "",
      considerations: "",
    },
  });

  const {
    register: registerTask,
    handleSubmit: handleSubmitTask,
    reset: resetTask,
    formState: { errors: taskErrors },
  } = useForm<TaskFormData>({
    resolver: taskResolver,
    defaultValues: {
      title: "",
      description: "",
      phase: "Fase 1: Alinhamento & Setup",
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    },
  });

  const [contractUploading, setContractUploading] = useState(false);
  const [contractRecord, setContractRecord] = useState<any | null>(null);

  useEffect(() => {
    if (!project?.id) {
      return;
    }

    const projectId = project.id;

    (async () => {
      const { data } = await supabase
        .from("project_contracts")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setContractRecord(data ?? null);
    })();

    const channel = supabase
      .channel("contracts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_contracts",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          (async () => {
            const { data } = await supabase
              .from("project_contracts")
              .select("*")
              .eq("project_id", projectId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            setContractRecord(data ?? null);
          })();
        },
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [project?.id]);

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

  // Strict Freelancer RBAC Isolation & Security Guard
  if (isFreelancer) {
    const userEmail = (user?.email || "").toLowerCase().trim();
    const userId = user?.id;

    const isAssigned = (project.freelancers || []).some((f: any) => {
      const fId = f.id || f.freelancer_id || f.profile?.id;
      const fEmail = (f.email || f.profile?.email || "").toLowerCase().trim();
      return (userId && fId === userId) || (userEmail && fEmail === userEmail);
    });

    if (!isAssigned) {
      return (
        <div className="space-y-6 max-w-5xl mx-auto pb-16">
          <Link
            to="/app/projects"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Meus Projetos
          </Link>
          <Card className="p-12 text-center space-y-3 border-dashed border-rose-500/30 rounded-2xl shadow-subtle">
            <Lock className="h-10 w-10 text-rose-500 mx-auto" />
            <h2 className="text-base font-bold text-foreground">Acesso Restrito ao Projeto</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Você não possui autorização para acessar os detalhes deste projeto pois não está alocado a ele como prestador responsável.
            </p>
            <div className="pt-2">
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link to="/app/projects">Voltar aos Meus Projetos</Link>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <FreelancerProjectDetailView
        project={project}
        tasks={tasks}
        updateTaskStatus={updateTaskStatus}
      />
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
        {
          id: Math.random().toString(),
          name: file.name,
          url: publicUrl,
          uploadedAt: new Date().toLocaleDateString("pt-BR"),
        },
      ]);

      toast.success(`Arquivo ${file.name} anexado com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao fazer upload do arquivo");
    } finally {
      setUploading(false);
    }
  };

  // Task Attachment Upload
  const handleTaskAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTaskAttachmentUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `tasks/${project.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from("project-attachments").upload(filePath, file);
      if (error) {
        // Fallback to contracts bucket
        const { data: cData, error: cErr } = await supabase.storage.from("contracts").upload(filePath, file);
        if (cErr) throw cErr;
        const { data: pubData } = supabase.storage.from("contracts").getPublicUrl(cData.path);
        setTaskAttachments((prev) => [...prev, { name: file.name, url: pubData.publicUrl, size: file.size }]);
      } else {
        const { data: pubData } = supabase.storage.from("project-attachments").getPublicUrl(data.path);
        setTaskAttachments((prev) => [...prev, { name: file.name, url: pubData.publicUrl, size: file.size }]);
      }
      toast.success("Anexo carregado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar anexo: " + (err.message || ""));
    } finally {
      setTaskAttachmentUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // Task Creation
  const onAddTask = (data: TaskFormData) => {
    createTask.mutate(
      {
        project_id: project.id,
        title: data.title,
        description: data.description || null,
        attachments: taskAttachments,
        phase: data.phase,
        status: "Pendente",
        start_date: data.startDate,
        due_date: data.dueDate,
        predecessor_id: data.predecessorId || undefined,
      },
      {
        onSuccess: () => {
          resetTask();
          setTaskAttachments([]);
          setShowTaskModal(false);
        },
      },
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

  const handleCopyCandidacyLink = async () => {
    const link = `${window.location.origin}/candidatura/${project.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success("Link de candidatura copiado para a área de transferência!");
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      toast.error("Não foi possível copiar o link automaticamente.");
    }
  };

  const handleApproveCandidato = (candidatura: (typeof candidaturas)[number]) => {
    approveCandidato.mutate({
      candidaturaId: candidatura.id,
      projectId: project.id,
      projectTitle: project.title,
      freelancerName: candidatura.freelancer_name,
      freelancerEmail: candidatura.freelancer_email,
      proposedRate: candidatura.proposed_rate ?? undefined,
    });
  };

  const openEditCandidatura = (candidatura: Candidatura) => {
    setEditingCandidatura(candidatura);
    resetEditCandidatura({
      freelancer_name: candidatura.freelancer_name,
      freelancer_email: candidatura.freelancer_email,
      availability_hours: candidatura.availability_hours ?? 0,
      proposed_rate: candidatura.proposed_rate ?? 0,
      portfolio_url: candidatura.portfolio_url ?? "",
      experience_summary: candidatura.experience_summary ?? "",
      considerations: candidatura.considerations ?? candidatura.notes ?? "",
    });
    setShowEditCandidaturaModal(true);
  };

  const handleSaveCandidatura = (data: EditCandidaturaFormData) => {
    if (!editingCandidatura) return;
    updateCandidatura.mutate(
      {
        id: editingCandidatura.id,
        freelancer_name: data.freelancer_name,
        freelancer_email: data.freelancer_email,
        availability_hours: data.availability_hours,
        portfolio_url: data.portfolio_url || undefined,
        proposed_rate: data.proposed_rate,
        experience_summary: data.experience_summary,
        considerations: data.considerations,
        notes: data.considerations,
      },
      {
        onSuccess: () => {
          setShowEditCandidaturaModal(false);
          setEditingCandidatura(null);
        },
      },
    );
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
      },
    );
  };

  // Calculate Progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Concluida").length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const rawFreelancer = project?.freelancers?.[0];
  const currentFreelancer = rawFreelancer
    ? "profile" in (rawFreelancer as any) && (rawFreelancer as any).profile
      ? (rawFreelancer as any).profile
      : rawFreelancer
    : null;

  const generateContractPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(12);
      doc.text(`Contrato de Prestação de Serviços`, 20, 20);
      doc.text(`Projeto: ${project.title}`, 20, 40);
      doc.text(`Freelancer: ${currentFreelancer?.full_name || ""}`, 20, 50);
      doc.text(`E-mail: ${currentFreelancer?.email || ""}`, 20, 60);
      doc.text(`Valor acordado: R$ ${Number(project.freelancer_cost || 0).toFixed(2)}`, 20, 70);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, "_")}_contrato.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar contrato em PDF");
    }
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setContractUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `contracts/${project.id}/${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { data, error } = await supabase.storage.from("contracts").upload(filePath, file);
      let publicUrl = "";
      if (data?.path) {
        const { data: pub } = supabase.storage.from("contracts").getPublicUrl(data.path);
        publicUrl = pub.publicUrl;
      } else {
        publicUrl = URL.createObjectURL(file);
      }

      const { data: inserted, error: insErr } = await (supabase.from("project_contracts") as any)
        .insert({
          project_id: project.id,
          freelancer_id: currentFreelancer?.id,
          file_path: data?.path,
          file_url: publicUrl,
        })
        .select()
        .maybeSingle();

      if (insErr) throw insErr;
      setContractRecord(inserted ?? null);
      toast.success("Contrato enviado para análise do Gestor.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar contrato");
    } finally {
      setContractUploading(false);
      if (e.target) e.target.value = "";
    }
  };

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
            <Badge
              variant="outline"
              className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            >
              {SERVICE_LABEL[project.service_type] || project.service_type}
            </Badge>
            <Badge className="bg-zinc-800 text-zinc-300 text-xs">
              {STATUS_LABEL[project.status] || project.status}
            </Badge>
          </div>
          {project.client?.full_name && (
            <p className="text-xs text-muted-foreground">
              Cliente contratante: {project.client.full_name} ({project.client.email})
            </p>
          )}
        </div>

        {isGestor && (
          <div className="flex items-center gap-2">
            <Select
              value={project.status}
              onValueChange={(status) =>
                updateProject.mutate({ id: project.id, patch: { status: status as ProjectStatus } })
              }
            >
              <SelectTrigger className="w-[200px] bg-card border-border">
                <SelectValue placeholder="Alterar Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABEL[status] || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5 font-medium">
                  <Trash2 className="h-4 w-4" /> Excluir Projeto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-rose-600">
                    <Trash2 className="h-5 w-5" /> Confirmar Exclusão de Projeto
                  </DialogTitle>
                  <DialogDescription>
                    Tem certeza de que deseja excluir permanentemente o projeto{" "}
                    <strong>"{project.title}"</strong>? Esta ação removerá o projeto e todos os
                    registros associados no banco de dados e não poderá ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteProject.isPending}
                    onClick={() => {
                      deleteProject.mutate(project.id, {
                        onSuccess: () => {
                          setShowDeleteConfirm(false);
                          navigate({ to: "/app/projects" });
                        },
                      });
                    }}
                  >
                    {deleteProject.isPending ? "Excluindo..." : "Sim, Excluir Projeto"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleCopyCandidacyLink} className="gap-1.5 text-xs">
              <Copy className="h-3.5 w-3.5" />{" "}
              {copiedLink ? "Link Copiado" : "Copiar Link de Candidatura"}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowTriageModal(true)}
              className="gap-1.5 text-xs"
            >
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
                <div className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  R${" "}
                  {Number(project.budget || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-medium">Custo Freelancer</div>
                <div className="text-lg font-bold mt-1 text-rose-600 dark:text-rose-400">
                  R${" "}
                  {Number(project.freelancer_cost || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
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
                R${" "}
                {Number(project.freelancer_cost || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {isCliente && (
          <Card className="bg-card border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-300 font-medium">Valor do Contrato</div>
              <div className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                R${" "}
                {Number(project.budget || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Progresso das Tarefas</div>
            <div className="text-lg font-bold mt-1 flex items-center justify-between">
              <span>{progressPct}%</span>
              <span className="text-xs font-normal text-muted-foreground">
                {completedTasks}/{totalTasks} concluídas
              </span>
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
            <TabsTrigger value="candidaturas" className="gap-1.5">
              <UserCheck className="h-4 w-4" /> Candidaturas
            </TabsTrigger>
          )}
          {isGestor && (
            <TabsTrigger value="matchmaking" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Triagem Freelas
            </TabsTrigger>
          )}
          {isGestor && (
            <TabsTrigger value="alocar" className="gap-1.5">
              <UserPlus className="h-4 w-4" /> Alocar Freela Existente
            </TabsTrigger>
          )}
        </TabsList>

        {/* Briefing Tab */}
        <TabsContent value="briefing" className="pt-4 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Conteúdo do Briefing</CardTitle>
                <CardDescription>
                  Escopo, requisitos técnicos e documentação centralizada.
                </CardDescription>
              </div>
              {isGestor && (
                <Button
                  onClick={handleSaveBriefing}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
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
                    <Button
                      asChild
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
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
                  <Label className="font-semibold text-sm">
                    Anexos & Documentos ({files.length})
                  </Label>
                  <label className="cursor-pointer">
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                    <Button variant="outline" size="sm" asChild disabled={uploading}>
                      <span>
                        {uploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 mr-1" />
                        )}
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
                        <div className="text-xs text-muted-foreground">
                          Enviado em {file.uploadedAt}
                        </div>
                      </div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline text-xs flex items-center gap-1"
                      >
                        Download <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                  {files.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Nenhum anexo adicionado ainda.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados para Contrato do Projeto */}
          <ProjectContractFieldsSection
            serviceType={project.service_type}
            values={projectContractValues}
            readOnly={!isGestor}
            onChange={(newVals, complete) => {
              setProjectContractValues(newVals);
              if (isGestor) {
                updateProject.mutate({
                  id: project.id,
                  patch: {
                    contract_field_values: newVals,
                    contract_fields_status: complete ? "completo" : "pendente",
                  },
                });
              }
            }}
          />

          {/* Manager / Client view of latest freelancer contract */}
          {(isGestor || isCliente) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documentos e Contrato do Freelancer</CardTitle>
                <CardDescription>
                  Último contrato enviado pelo freelancer e resultado da análise do gestor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contractRecord ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {contractRecord.file_path?.split("/").pop() || "Contrato enviado"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Enviado em {new Date(contractRecord.created_at).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Status: {contractRecord.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contractRecord.file_url && (
                          <a
                            href={contractRecord.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:underline text-sm"
                          >
                            Abrir arquivo
                          </a>
                        )}
                        {contractRecord.manager_response_file_url && (
                          <a
                            href={contractRecord.manager_response_file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-500 hover:underline text-sm"
                          >
                            Ver arquivo de resposta do gestor
                          </a>
                        )}
                      </div>
                    </div>

                    {contractRecord.manager_message && (
                      <div className="p-3 border border-border rounded">
                        <div className="text-sm font-semibold">Comentário do Gestor</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {contractRecord.manager_message}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Ainda não há contrato enviado pelo freelancer.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Cronograma & Dependências de Tarefas</h3>
            {!isCliente && (
              <Button
                onClick={() => setShowTaskModal(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <Plus className="h-4 w-4" /> Nova Tarefa
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {loadingTasks && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Carregando tarefas do Supabase...
              </div>
            )}
            {!loadingTasks &&
              tasks.map((task) => {
                const predecessor = tasks.find((t) => t.id === task.predecessor_id);
                const isLocked = predecessor && predecessor.status !== "Concluida";

                return (
                  <Card
                    key={task.id}
                    className={`bg-card transition-all ${isLocked ? "opacity-75 border-amber-500/30" : ""}`}
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {isLocked && (
                            <span title={`Bloqueada por: ${predecessor?.title}`}>
                              <Lock className="h-4 w-4 text-amber-500" />
                            </span>
                          )}
                          <span className="font-semibold text-foreground">{task.title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {task.phase}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                            {task.description}
                          </p>
                        )}
                        {task.attachments && task.attachments.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {task.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                              >
                                <Paperclip className="h-3 w-3 text-primary" />
                                <span className="truncate max-w-[150px]">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground flex items-center gap-3 pt-1">
                          <span>Início: {task.start_date}</span>
                          <span>Término: {task.due_date}</span>
                          {predecessor && (
                            <span
                              className={
                                predecessor.status === "Concluida"
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }
                            >
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
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              deleteTask.mutate({ taskId: task.id, projectId: project.id })
                            }
                          >
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

        {/* Candidaturas Tab (Gestor Only) */}
        {isGestor && (
          <TabsContent value="candidaturas" className="pt-4 space-y-6">
            {/* Quick Assign Registered Freelancer Card */}
            <Card className="border border-indigo-200/70 bg-indigo-50/30">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-indigo-600" />
                    Atribuir Freelancer Cadastrado Direto
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Selecione qualquer freelancer já cadastrado no ERP para vinculá-lo imediatamente ao projeto.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select
                    value={directAssignFreelancerId}
                    onValueChange={setDirectAssignFreelancerId}
                  >
                    <SelectTrigger className="w-full sm:w-[260px] bg-background text-xs h-9">
                      <SelectValue placeholder="Selecione um freelancer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {freelancers.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.full_name} ({f.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!directAssignFreelancerId || assignFreelancer.isPending}
                    onClick={() => {
                      if (!directAssignFreelancerId) return;
                      handleAssignFreelancer(directAssignFreelancerId);
                      setDirectAssignFreelancerId("");
                    }}
                    className="bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-medium text-xs h-9 px-4 shrink-0 shadow-xs border-0"
                  >
                    Atribuir
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  Candidaturas Recebidas
                </CardTitle>
                <CardDescription>
                  Analise as candidaturas recebidas pelo formulário público e aprove cada freelancer diretamente para o projeto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingCandidaturas ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Carregando candidaturas...
                  </div>
                ) : candidaturas.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Nenhuma candidatura registrada para este projeto ainda.
                  </div>
                ) : (
                  candidaturas.map((candidatura) => {
                    const registeredFreelancer = freelancers.find(
                      (f) => f.email?.toLowerCase().trim() === candidatura.freelancer_email?.toLowerCase().trim(),
                    );

                    return (
                      <div
                        key={candidatura.id}
                        className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-foreground text-base">
                                {candidatura.freelancer_name}
                              </h4>
                              <Badge
                                variant={candidatura.status === "Aprovado" ? "default" : "outline"}
                                className={
                                  candidatura.status === "Aprovado"
                                    ? "bg-emerald-600 text-white"
                                    : candidatura.status === "Rejeitado"
                                    ? "bg-rose-100 text-rose-700 border-rose-200"
                                    : ""
                                }
                              >
                                {candidatura.status}
                              </Badge>

                              {registeredFreelancer ? (
                                <Link
                                  to="/app/freelancers/$id"
                                  params={{ id: registeredFreelancer.id }}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md hover:bg-indigo-100 transition-colors"
                                >
                                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                                  Já cadastrado — ver ficha
                                </Link>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[11px] px-2 py-0.5"
                                >
                                  <Sparkles className="h-3 w-3 text-emerald-600 mr-1 inline" />
                                  Candidato novo
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                              <span>{candidatura.freelancer_email}</span>
                              {candidatura.phone && <span>• {candidatura.phone}</span>}
                              <span>• Enviado em {formatDate(candidatura.created_at)}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingCandidaturaDetail(candidatura)}
                              className="text-xs gap-1.5"
                            >
                              Ver Respostas Completas
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={candidatura.status === "Rejeitado" || updateCandidatura.isPending}
                              onClick={() =>
                                updateCandidatura.mutate({ id: candidatura.id, status: "Rejeitado" })
                              }
                              className="text-xs"
                            >
                              Rejeitar
                            </Button>

                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                              disabled={
                                candidatura.status === "Aprovado" || approveCandidato.isPending
                              }
                              onClick={() => handleApproveCandidato(candidatura)}
                            >
                              Aprovar e Atribuir ao Projeto
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 text-xs">
                          <div className="rounded-lg border border-border/70 p-3 bg-muted/20">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                              Disponibilidade
                            </div>
                            <div className="mt-1 font-medium text-foreground text-sm">
                              {candidatura.availability_hours ?? 0}h/semana
                            </div>
                          </div>
                          <div className="rounded-lg border border-border/70 p-3 bg-muted/20">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                              Pretensão de Valor
                            </div>
                            <div className="mt-1 font-medium text-emerald-600 text-sm">
                              R$ {Number(candidatura.proposed_rate || 0).toLocaleString("pt-BR")}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Matchmaking & Triage Config Tab (Gestor Only) */}
        {isGestor && (
          <TabsContent value="matchmaking" className="pt-4 space-y-6">
            {/* Custom Form Builder */}
            <TriageFormBuilderSection
              initialConfig={project.triage_form_config}
              onSave={(newConfig) =>
                updateProject.mutate({
                  id: project.id,
                  patch: { triage_form_config: newConfig },
                })
              }
              saving={updateProject.isPending}
            />
          </TabsContent>
        )}

        {/* Nova Aba Dedicada: Alocar Freela Existente (Gestor Only) */}
        {isGestor && (
          <TabsContent value="alocar" className="pt-4 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-foreground" />
                      Alocar Freelancer Cadastrado no ERP
                    </CardTitle>
                    <CardDescription>
                      Selecione um freelancer já existente no banco de dados para vincular imediatamente a este projeto.
                    </CardDescription>
                  </div>
                  {currentFreelancer && (
                    <Badge className="bg-emerald-600 text-white gap-1.5 px-3 py-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 1 Freela Alocado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Se já houver freelancer alocado */}
                {currentFreelancer && (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {currentFreelancer.full_name?.charAt(0)?.toUpperCase() || "F"}
                      </div>
                      <div>
                        <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
                          Freelancer Atribuído ao Projeto
                        </div>
                        <div className="text-base font-bold text-foreground mt-0.5">
                          {currentFreelancer.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{currentFreelancer.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                        Alocado(a)
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Seleção rápida via Select / Dropdown */}
                <div className="p-5 rounded-2xl border border-border bg-muted/30 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">
                      Selecione um Freelancer da Base de Dados
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                      <div className="flex-1">
                        <Select
                          value={directAssignFreelancerId}
                          onValueChange={setDirectAssignFreelancerId}
                        >
                          <SelectTrigger className="h-10 text-xs bg-card">
                            <SelectValue placeholder="Escolha um freelancer cadastrado no ERP..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {freelancers.map((f) => (
                              <SelectItem key={f.id} value={f.id} className="text-xs">
                                {f.full_name} — {f.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        disabled={!directAssignFreelancerId || assignFreelancer.isPending}
                        onClick={() => {
                          if (directAssignFreelancerId) {
                            handleAssignFreelancer(directAssignFreelancerId);
                            setDirectAssignFreelancerId("");
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-5 gap-1.5 shadow-sm"
                      >
                        {assignFreelancer.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Vinculando...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" /> Vincular ao Projeto
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Grid com lista de Freelancers Cadastrados */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Todos os Freelancers Disponíveis ({freelancers.length})
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-96 overflow-y-auto pr-1">
                    {freelancers.map((f) => {
                      const isCurrent =
                        currentFreelancer &&
                        (currentFreelancer.id === f.id || currentFreelancer.email === f.email);
                      return (
                        <div
                          key={f.id}
                          className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isCurrent
                              ? "bg-emerald-500/5 border-emerald-500/30"
                              : "bg-card border-border hover:border-border/80 shadow-2xs"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-foreground truncate">
                              {f.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{f.email}</div>
                          </div>

                          {isCurrent ? (
                            <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] shrink-0">
                              Vinculado
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignFreelancer(f.id)}
                              disabled={assignFreelancer.isPending}
                              className="text-xs shrink-0 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50"
                            >
                              Alocar
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
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
            <DialogDescription>
              Adicione uma tarefa ao cronograma e defina dependências.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTask(onAddTask)} className="space-y-4">
            <div className="space-y-1">
              <Label>Título da Tarefa</Label>
              <Input placeholder="Ex: Criação de Telas UI" {...registerTask("title")} />
              {taskErrors.title && (
                <p className="text-xs text-destructive">{taskErrors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Descrição / Orientações da Tarefa (Opcional)</Label>
              <Textarea
                placeholder="Detalhes, especificações técnicas ou orientações para a execução desta tarefa..."
                rows={3}
                className="resize-none text-xs"
                {...registerTask("description")}
              />
            </div>

            {/* Anexos da Tarefa */}
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-primary" /> Anexos da Tarefa (Opcional)
                </Label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleTaskAttachmentUpload}
                    className="hidden"
                    disabled={taskAttachmentUploading}
                  />
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    {taskAttachmentUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> Adicionar Anexo
                      </>
                    )}
                  </span>
                </label>
              </div>

              {taskAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                  {taskAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-muted border border-border text-foreground"
                    >
                      <Paperclip className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate max-w-[180px] font-medium">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setTaskAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-rose-500 transition-colors ml-1 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              <Select
                onValueChange={(val) =>
                  registerTask("predecessorId").onChange({
                    target: { value: val, name: "predecessorId" },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tarefa antecedente..." />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTaskModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTask.isPending || taskAttachmentUploading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {createTask.isPending ? "Criando..." : "Criar Tarefa"}
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
            <DialogDescription>
              Envia um e-mail com link exclusivo para preenchimento de requisitos do projeto.
            </DialogDescription>
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
            <Button variant="outline" onClick={() => setShowTriageModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendTriageInvite}
              className="bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white border-0"
            >
              Enviar Convite via Brevo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditCandidaturaModal} onOpenChange={setShowEditCandidaturaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Candidatura</DialogTitle>
            <DialogDescription>Atualize os dados de triagem antes de aprovar.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEditCandidatura(handleSaveCandidatura)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input {...registerEditCandidatura("freelancer_name")} />
                {editCandidaturaErrors.freelancer_name && (
                  <p className="text-xs text-destructive">
                    {editCandidaturaErrors.freelancer_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input {...registerEditCandidatura("freelancer_email")} />
                {editCandidaturaErrors.freelancer_email && (
                  <p className="text-xs text-destructive">
                    {editCandidaturaErrors.freelancer_email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Disponibilidade (h/sem)</Label>
                <Input type="number" {...registerEditCandidatura("availability_hours")} />
                {editCandidaturaErrors.availability_hours && (
                  <p className="text-xs text-destructive">
                    {editCandidaturaErrors.availability_hours.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Pretensão de Valor (R$)</Label>
                <Input type="number" {...registerEditCandidatura("proposed_rate")} />
                {editCandidaturaErrors.proposed_rate && (
                  <p className="text-xs text-destructive">
                    {editCandidaturaErrors.proposed_rate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Portfólio / URL</Label>
              <Input {...registerEditCandidatura("portfolio_url")} />
              {editCandidaturaErrors.portfolio_url && (
                <p className="text-xs text-destructive">
                  {editCandidaturaErrors.portfolio_url.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Experiência Relevante</Label>
              <Textarea rows={4} {...registerEditCandidatura("experience_summary")} />
              {editCandidaturaErrors.experience_summary && (
                <p className="text-xs text-destructive">
                  {editCandidaturaErrors.experience_summary.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Considerações</Label>
              <Textarea rows={4} {...registerEditCandidatura("considerations")} />
              {editCandidaturaErrors.considerations && (
                <p className="text-xs text-destructive">
                  {editCandidaturaErrors.considerations.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditCandidaturaModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white border-0">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Candidatura Detail Modal */}
      <Dialog
        open={Boolean(viewingCandidaturaDetail)}
        onOpenChange={(open) => !open && setViewingCandidaturaDetail(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewingCandidaturaDetail && (
            <>
              <DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                      {viewingCandidaturaDetail.freelancer_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {viewingCandidaturaDetail.freelancer_email} • Enviado em{" "}
                      {formatDate(viewingCandidaturaDetail.created_at)}
                    </DialogDescription>
                  </div>
                  <Badge
                    variant={viewingCandidaturaDetail.status === "Aprovado" ? "default" : "outline"}
                    className={
                      viewingCandidaturaDetail.status === "Aprovado"
                        ? "bg-emerald-600 text-white"
                        : viewingCandidaturaDetail.status === "Rejeitado"
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : ""
                    }
                  >
                    {viewingCandidaturaDetail.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2 text-sm">
                {/* Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border p-3 bg-muted/30">
                    <span className="text-xs text-muted-foreground font-semibold block uppercase tracking-wider">
                      Disponibilidade
                    </span>
                    <span className="font-bold text-foreground text-sm mt-0.5 block">
                      {viewingCandidaturaDetail.availability_hours ?? 0}h/semana
                    </span>
                  </div>
                  <div className="rounded-xl border border-border p-3 bg-muted/30">
                    <span className="text-xs text-muted-foreground font-semibold block uppercase tracking-wider">
                      Pretensão
                    </span>
                    <span className="font-bold text-emerald-600 text-sm mt-0.5 block">
                      R${" "}
                      {Number(viewingCandidaturaDetail.proposed_rate || 0).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border p-3 bg-muted/30 col-span-2 sm:col-span-1">
                    <span className="text-xs text-muted-foreground font-semibold block uppercase tracking-wider">
                      Telefone / Whats
                    </span>
                    <span className="font-semibold text-foreground text-sm mt-0.5 block">
                      {viewingCandidaturaDetail.phone || "Não informado"}
                    </span>
                  </div>
                </div>

                {viewingCandidaturaDetail.portfolio_url && (
                  <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-1">
                    <span className="text-xs font-semibold text-indigo-700 block">
                      Portfólio / Link relevante
                    </span>
                    <a
                      href={viewingCandidaturaDetail.portfolio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 hover:underline font-medium break-all flex items-center gap-1"
                    >
                      {viewingCandidaturaDetail.portfolio_url} <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </div>
                )}

                {viewingCandidaturaDetail.experience_summary && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                      Resumo de Experiência
                    </span>
                    <p className="p-3 rounded-xl border border-border bg-muted/20 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {viewingCandidaturaDetail.experience_summary}
                    </p>
                  </div>
                )}

                {(viewingCandidaturaDetail.considerations || viewingCandidaturaDetail.notes) && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                      Considerações &amp; Observações
                    </span>
                    <p className="p-3 rounded-xl border border-border bg-muted/20 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {viewingCandidaturaDetail.considerations || viewingCandidaturaDetail.notes}
                    </p>
                  </div>
                )}

                {/* Custom Answers List */}
                {viewingCandidaturaDetail.custom_answers &&
                  Object.keys(viewingCandidaturaDetail.custom_answers).length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <span className="text-xs font-bold text-foreground block uppercase tracking-wider">
                        Respostas das Perguntas Customizadas
                      </span>
                      <div className="space-y-2">
                        {Object.entries(viewingCandidaturaDetail.custom_answers).map(([key, answer]) => {
                          const fieldConfig = (project?.triage_form_config as any[])?.find(
                            (f) => f.field_key === key,
                          );
                          const label = fieldConfig?.label || key;
                          return (
                            <div key={key} className="p-3 rounded-xl border border-border bg-card space-y-1">
                              <span className="text-xs font-semibold text-indigo-600 block">{label}</span>
                              <p className="text-xs text-foreground whitespace-pre-wrap">{answer || "Sem resposta"}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={viewingCandidaturaDetail.status === "Rejeitado" || updateCandidatura.isPending}
                  onClick={() => {
                    updateCandidatura.mutate({ id: viewingCandidaturaDetail.id, status: "Rejeitado" });
                    setViewingCandidaturaDetail(null);
                  }}
                >
                  Rejeitar Candidatura
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={
                    viewingCandidaturaDetail.status === "Aprovado" || approveCandidato.isPending
                  }
                  onClick={() => {
                    handleApproveCandidato(viewingCandidaturaDetail);
                    setViewingCandidaturaDetail(null);
                  }}
                >
                  Aprovar e Atribuir ao Projeto
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── FREELANCER EXCLUSIVE DETAIL VIEW (RBAC ISOLATED) ─────────────────────────
function FreelancerProjectDetailView({
  project,
  tasks,
  updateTaskStatus,
}: {
  project: any;
  tasks: any[];
  updateTaskStatus: any;
}) {
  const completedTasks = tasks.filter((t) => t.status === "Concluida").length;
  const progressPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  let formattedDeadline = "Sem prazo definido";
  if (project.deadline) {
    try {
      const d = new Date(project.deadline);
      if (!isNaN(d.getTime())) {
        formattedDeadline = d.toLocaleDateString("pt-BR");
      }
    } catch {}
  }

  const clientName = project.client?.full_name || "Cliente Parceiro";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <Link
            to="/app/projects"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 w-fit mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Meus Projetos
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.title}</h1>
            <Badge
              variant="outline"
              className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20 text-xs font-semibold"
            >
              {SERVICE_LABEL[project.service_type] || project.service_type}
            </Badge>
            <Badge className="bg-zinc-800 text-zinc-200 border-zinc-700 text-xs font-medium">
              {STATUS_LABEL[project.status] || project.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Empresa Parceira: <strong className="text-foreground">{clientName}</strong> • Prazo final:{" "}
            <strong className="text-foreground">{formattedDeadline}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col (2/3): Briefing & Tarefas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Briefing & Escopo da Demanda */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Briefing & Escopo da Demanda
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Orientações, especificações e diretrizes de execução do projeto.
                  </CardDescription>
                </div>
                {project.google_drive_link && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer"
                    asChild
                  >
                    <a href={project.google_drive_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir Pasta de Arquivos
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                {project.briefing_content || "Nenhum briefing descritivo inserido para este projeto."}
              </div>

              {project.google_drive_link && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/15">
                  <ExternalLink className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <span className="truncate">
                    Repositório de arquivos do projeto:{" "}
                    <a
                      href={project.google_drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {project.google_drive_link}
                    </a>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Tarefas & Atividades Atribuídas */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Quadro de Tarefas da Sua Entrega
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Atualize o status das suas atividades à medida que for avançando na produção.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {completedTasks}/{tasks.length} concluídas
                  </span>
                  <div className="w-24">
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {tasks.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl space-y-1">
                  <CheckCircle2 className="h-7 w-7 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Nenhuma tarefa estruturada para este projeto no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">{task.title}</span>
                          {task.phase && (
                            <Badge variant="outline" className="text-[10px] bg-background">
                              {task.phase}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          {task.start_date && <span>Início: {formatDate(task.start_date)}</span>}
                          {task.due_date && <span>Prazo: {formatDate(task.due_date)}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Select
                          value={task.status}
                          onValueChange={(newStatus) =>
                            updateTaskStatus.mutate({
                              id: task.id,
                              projectId: project.id,
                              status: newStatus as TaskStatus,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs w-36 bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Em andamento">Em andamento</SelectItem>
                            <SelectItem value="Em revisao">Em revisão</SelectItem>
                            <SelectItem value="Concluida">Concluída</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col (1/3): Remuneração, Contrato & Gestão */}
        <div className="space-y-6">
          {/* Card 3: Sua Remuneração */}
          <Card className="bg-card border-emerald-500/20 shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Sua Remuneração Acordada
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <span className="text-xs text-muted-foreground font-medium">Valor do Seu Repasse</span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  R$ {Number(project.freelancer_cost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Status do Pagamento:</span>
                  <Badge
                    className={`text-[10px] ${
                      project.status === "Concluido"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {project.status === "Concluido" ? "Liberado para Pagamento" : "Aguardando Conclusão"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Prazo Previsto:</span>
                  <span className="font-semibold text-foreground">{formattedDeadline}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Empresa Parceira */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Informações da Demanda
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Empresa:</span>
                <span className="font-bold text-foreground">{clientName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Categoria:</span>
                <span className="font-semibold text-foreground">
                  {SERVICE_LABEL[project.service_type] || project.service_type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status do Projeto:</span>
                <span className="font-semibold text-foreground">{STATUS_LABEL[project.status] || project.status}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Suporte & Contato */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Alinhamento com Gestor Delski
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-3">
              <p>
                Dúvidas sobre o escopo ou ajustes de prazos? Entre em contato diretamente com o gestor responsável ou abra um chamado pelo painel.
              </p>
              <Button asChild size="sm" variant="outline" className="w-full text-xs cursor-pointer">
                <Link to="/app/suporte">Acessar Canal de Suporte</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
