import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, FolderPlus } from "lucide-react";
import type { ServiceType } from "@/mocks/types";

const newProjectSchema = z.object({
  client: z.string().min(2, "Nome do cliente ou empresa é obrigatório"),
  type: z.enum(["IA", "Trafego", "Sites"]),
  description: z.string().min(10, "Descreva brevemente o projeto (mín. 10 caracteres)"),
  budget: z.coerce.number().min(100, "Orçamento deve ser no mínimo R$ 100"),
  freelancerCost: z.coerce.number().min(0, "Custo do freelancer deve ser válido"),
  deadline: z.string().min(1, "Selecione o prazo de entrega"),
  driveLink: z.string().url("Informe uma URL válida do Google Drive").or(z.literal("")),
  overview: z.string().optional(),
  technicalSpecs: z.string().optional(),
});

type NewProjectFormData = z.infer<typeof newProjectSchema>;

export const Route = createFileRoute("/app/projects/new")({
  head: () => ({
    meta: [
      { title: "Novo Projeto — Delski ERP" },
    ],
  }),
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const addProject = useStore((s) => s.addProject);
  const user = useStore((s) => s.user);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      client: "",
      type: "IA",
      description: "",
      budget: 5000,
      freelancerCost: 1800,
      deadline: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
      driveLink: "",
      overview: "",
      technicalSpecs: "",
    },
  });

  const selectedType = watch("type");

  const onSubmit = (data: NewProjectFormData) => {
    const project = addProject({
      client: data.client,
      type: data.type as ServiceType,
      description: data.description,
      budget: data.budget,
      freelancerCost: data.freelancerCost,
      deadline: data.deadline,
      driveLink: data.driveLink || undefined,
      briefingSections: {
        overview: data.overview || data.description,
        technicalSpecs: data.technicalSpecs || `Stack e especificações para ${data.type}`,
        repositoryNotes: data.driveLink ? `Drive: ${data.driveLink}` : "Anexos e documentos",
      },
    });

    toast.success(`Projeto ${project.client} cadastrado com sucesso!`);
    navigate({ to: "/app/projects/$id", params: { id: project.id } });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate({ to: "/app/projects" })} className="hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar aos Projetos
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-indigo-500" />
            Cadastrar Novo Projeto
          </CardTitle>
          <CardDescription>
            Preencha os detalhes do cliente, escopo inicial, restrições financeiras e links de arquivos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente ou Empresa</Label>
                <Input placeholder="Ex: Studio Lumina" {...register("client")} />
                {errors.client && <p className="text-xs text-destructive">{errors.client.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Vertical de Serviço</Label>
                <Select value={selectedType} onValueChange={(val) => setValue("type", val as ServiceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IA">Automação com IA</SelectItem>
                    <SelectItem value="Trafego">Tráfego Pago & Social Media</SelectItem>
                    <SelectItem value="Sites">Desenvolvimento de Sites</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição Curta do Escopo</Label>
              <Textarea
                placeholder="Ex: Desenvolvimento de agente IA para agendamento via WhatsApp..."
                {...register("description")}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Orçamento Bruto (R$)</Label>
                <Input type="number" placeholder="5000" {...register("budget")} />
                {errors.budget && <p className="text-xs text-destructive">{errors.budget.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Custo Freelancer (R$)</Label>
                <Input type="number" placeholder="1800" {...register("freelancerCost")} />
                {errors.freelancerCost && <p className="text-xs text-destructive">{errors.freelancerCost.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Prazo Final de Entrega</Label>
                <Input type="date" {...register("deadline")} />
                {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link da Pasta do Google Drive (Opcional)</Label>
              <Input placeholder="https://drive.google.com/drive/folders/..." {...register("driveLink")} />
              {errors.driveLink && <p className="text-xs text-destructive">{errors.driveLink.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Briefing — Visão Geral Inicial (Opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais de escopo, público-alvo e restrições do cliente..."
                {...register("overview")}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/projects" })}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                Criar Projeto & Abrir Painel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
