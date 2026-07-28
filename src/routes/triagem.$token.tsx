import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/mocks/store";
import { toast } from "sonner";
import { CheckCircle2, Save, Send, Sparkles, Clock, Globe, Award } from "lucide-react";
import { calculateFreelancerMatch } from "@/lib/matchmaking";

const triageSchema = z.object({
  fullName: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("E-mail inválido"),
  skills: z.array(z.string()).min(1, "Selecione ao menos uma especialidade"),
  availabilityHours: z.coerce.number().min(1, "Informe as horas semanais disponíveis"),
  proposedRate: z.coerce.number().min(10, "Informe sua pretensão de valor"),
  portfolioUrl: z.string().url("Insira uma URL válida de portfólio (ex: https://...)"),
  notes: z.string().optional(),
});

type TriageFormData = z.infer<typeof triageSchema>;

export const Route = createFileRoute("/triagem/$token")({
  head: () => ({
    meta: [
      { title: "Formulário de Triagem de Freelancer — Delski" },
      { name: "description", content: "Formulário oficial de triagem e avaliação de capacidade técnica Delski." },
    ],
  }),
  component: TriagePage,
});

function TriagePage() {
  const { token } = Route.useParams();
  const projects = useStore((s) => s.projects);
  const addTriageResponse = useStore((s) => s.addTriageResponse);
  const getTriageResponse = useStore((s) => s.getTriageResponse);

  // Match project from token or fallback to demo project
  const project = projects.find((p) => p.id === token || token.includes(p.id)) || projects[0];

  const existingTriage = getTriageResponse ? getTriageResponse(token) : null;
  const [isSubmitted, setIsSubmitted] = useState(existingTriage?.status === "Enviado");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<TriageFormData | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TriageFormData>({
    resolver: zodResolver(triageSchema),
    defaultValues: {
      fullName: "",
      email: "",
      skills: [project?.type || "IA"],
      availabilityHours: 20,
      proposedRate: 1500,
      portfolioUrl: "https://github.com",
      notes: "",
    },
  });

  const selectedSkills = watch("skills") || [];

  // Load draft from localStorage on mount
  useEffect(() => {
    const draftKey = `delski_triage_draft_${token}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft && !isSubmitted) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.fullName) setValue("fullName", parsed.fullName);
        if (parsed.email) setValue("email", parsed.email);
        if (parsed.skills) setValue("skills", parsed.skills);
        if (parsed.availabilityHours) setValue("availabilityHours", parsed.availabilityHours);
        if (parsed.proposedRate) setValue("proposedRate", parsed.proposedRate);
        if (parsed.portfolioUrl) setValue("portfolioUrl", parsed.portfolioUrl);
        if (parsed.notes) setValue("notes", parsed.notes);
        toast.info("Rascunho de triagem restaurado com sucesso!");
      } catch (e) {
        console.error(e);
      }
    }
  }, [token, isSubmitted, setValue]);

  const handleSaveDraft = () => {
    const currentValues = watch();
    const draftKey = `delski_triage_draft_${token}`;
    localStorage.setItem(draftKey, JSON.stringify(currentValues));
    toast.success("Rascunho salvo no seu navegador!");
  };

  const toggleSkill = (skill: string) => {
    const current = watch("skills") || [];
    if (current.includes(skill)) {
      setValue("skills", current.filter((s) => s !== skill));
    } else {
      setValue("skills", [...current, skill]);
    }
  };

  const onPreSubmit = (data: TriageFormData) => {
    setPendingData(data);
    setShowConfirmModal(true);
  };

  const confirmSubmission = () => {
    if (!pendingData) return;
    
    // Calculate Matchmaking Score
    const match = calculateFreelancerMatch({
      projectServiceType: project.type,
      freelancerSkills: pendingData.skills,
      availabilityHours: pendingData.availabilityHours,
      hasPortfolio: Boolean(pendingData.portfolioUrl),
      proposedRate: pendingData.proposedRate,
      projectBudget: project.budget,
    });

    if (addTriageResponse) {
      addTriageResponse({
        token,
        projectId: project.id,
        freelancerName: pendingData.fullName,
        freelancerEmail: pendingData.email,
        skills: pendingData.skills,
        availabilityHours: pendingData.availabilityHours,
        portfolioUrl: pendingData.portfolioUrl,
        proposedRate: pendingData.proposedRate,
        notes: pendingData.notes,
        score: match.score,
        status: "Enviado",
        submittedAt: new Date().toISOString(),
      });
    }

    // Clear local draft
    localStorage.removeItem(`delski_triage_draft_${token}`);
    setIsSubmitted(true);
    setShowConfirmModal(false);
    toast.success("Triagem enviada com sucesso!");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-950/40">
              Triagem Concluída
            </Badge>
            <h1 className="text-2xl font-bold text-white">Respostas Registradas!</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Sua candidatura e respostas de capacidade foram salvas para o projeto <strong className="text-zinc-200">{project.client}</strong>.
            </p>
          </div>
          <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 text-left text-xs space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>Projeto Requerido:</span>
              <span className="text-indigo-400 font-semibold">{project.type}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Status da Seleção:</span>
              <span className="text-emerald-400 font-semibold">Em Análise pelo Gestor</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            O Gestor da Delski entrará em contato por e-mail após validar o índice de compatibilidade.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
              D
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Delski Triagem</span>
              <h1 className="text-xl font-bold text-white">Avaliação de Capacidade Técnica</h1>
            </div>
          </div>
          <p className="text-sm text-zinc-400">
            Você foi convidado(a) a participar do processo de alocação para o projeto <strong className="text-white">{project.client}</strong> ({project.type}).
          </p>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/80">
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
              Serviço: {project.type}
            </Badge>
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
              Prazo Estimado: {project.deadline || "A definir"}
            </Badge>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit(onPreSubmit)} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
            <h2 className="text-lg font-bold text-white">Dados do Freelancer</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Salvar Rascunho
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nome Completo</Label>
              <Input
                placeholder="Seu nome"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
                {...register("fullName")}
              />
              {errors.fullName && <p className="text-xs text-rose-400">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">E-mail de Contato</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
            </div>
          </div>

          {/* Skill Matrix Checkboxes */}
          <div className="space-y-3">
            <Label className="text-zinc-300 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-indigo-400" />
              Especialidades Técnicas (Selecione todas que domina):
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {["IA", "Trafego", "Sites"].map((skill) => {
                const checked = selectedSkills.includes(skill);
                return (
                  <button
                    type="button"
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      checked
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={checked} onCheckedChange={() => toggleSkill(skill)} />
                      <span>{skill === "IA" ? "Automação IA" : skill === "Trafego" ? "Tráfego Pago" : "Desenvolvimento Sites"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.skills && <p className="text-xs text-rose-400">{errors.skills.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-400" />
                Disponibilidade (Horas/semana)
              </Label>
              <Input
                type="number"
                placeholder="20"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
                {...register("availabilityHours")}
              />
              {errors.availabilityHours && <p className="text-xs text-rose-400">{errors.availabilityHours.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Pretensão Financeira (R$)</Label>
              <Input
                type="number"
                placeholder="1500"
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
                {...register("proposedRate")}
              />
              {errors.proposedRate && <p className="text-xs text-rose-400">{errors.proposedRate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-indigo-400" />
              Link do Portfólio / GitHub / LinkedIn
            </Label>
            <Input
              placeholder="https://..."
              className="bg-zinc-950 border-zinc-800 text-zinc-100"
              {...register("portfolioUrl")}
            />
            {errors.portfolioUrl && <p className="text-xs text-rose-400">{errors.portfolioUrl.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Observações adicionais (Opcional)</Label>
            <Textarea
              placeholder="Descreva experiências anteriores relacionadas a este projeto..."
              className="bg-zinc-950 border-zinc-800 text-zinc-100 min-h-[100px]"
              {...register("notes")}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              className="flex-1 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Send className="h-4 w-4 mr-2" />
              Enviar Triagem
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal before final submission */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar envio da triagem?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Após o envio, suas respostas de capacidade técnica e disponibilidade serão encaminhadas ao Gestor e a triagem será concluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
              Revisar Respostas
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmission} className="bg-indigo-600 text-white hover:bg-indigo-700">
              Confirmar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
