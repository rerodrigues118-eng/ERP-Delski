import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FolderPlus, Loader2 } from "lucide-react";
import { useCreateProject, type ServiceType } from "@/hooks/useProjects";

const newProjectSchema = z.object({
  title: z.string().min(2, "Título do projeto / cliente é obrigatório"),
  service_type: z.enum(["IA", "Trafego", "Sites"]),
  briefing_content: z.string().min(10, "Descreva brevemente o projeto (mín. 10 caracteres)"),
  budget: z.coerce.number().min(100, "Orçamento deve ser no mínimo R$ 100"),
  freelancer_cost: z.coerce.number().min(0, "Custo do freelancer deve ser válido"),
  deadline: z.string().min(1, "Selecione o prazo de entrega"),
  google_drive_link: z.string().url("Informe uma URL válida do Google Drive").or(z.literal("")),
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
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      title: "",
      service_type: "IA",
      briefing_content: "",
      budget: 5000,
      freelancer_cost: 1800,
      deadline: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
      google_drive_link: "",
    },
  });

  const selectedType = watch("service_type");

  const onSubmit = (data: NewProjectFormData) => {
    createProject.mutate(
      {
        title: data.title,
        service_type: data.service_type as ServiceType,
        briefing_content: data.briefing_content,
        budget: data.budget,
        freelancer_cost: data.freelancer_cost,
        deadline: data.deadline,
        status: "Solicitado",
      },
      {
        onSuccess: (newProj) => {
          navigate({ to: "/app/projects/$id", params: { id: newProj.id } });
        },
      }
    );
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
            Cadastrar Novo Projeto no Banco Supabase
          </CardTitle>
          <CardDescription>
            Preencha os detalhes do cliente, escopo inicial, restrições financeiras e valores do contrato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título / Nome do Cliente</Label>
                <Input placeholder="Ex: Studio Lumina — Automação LeadGen" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Vertical de Serviço</Label>
                <Select value={selectedType} onValueChange={(val) => setValue("service_type", val as ServiceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IA">Automação com IA</SelectItem>
                    <SelectItem value="Trafego">Tráfego Pago & Social Media</SelectItem>
                    <SelectItem value="Sites">Desenvolvimento de Sites</SelectItem>
                  </SelectContent>
                </Select>
                {errors.service_type && <p className="text-xs text-destructive">{errors.service_type.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição / Briefing do Escopo</Label>
              <Textarea
                rows={4}
                placeholder="Ex: Desenvolvimento de agente IA para atendimento e agendamento via WhatsApp..."
                {...register("briefing_content")}
              />
              {errors.briefing_content && <p className="text-xs text-destructive">{errors.briefing_content.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Orçamento Bruto (R$)</Label>
                <Input type="number" placeholder="5000" {...register("budget")} />
                {errors.budget && <p className="text-xs text-destructive">{errors.budget.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Custo Freelancer (R$)</Label>
                <Input type="number" placeholder="1800" {...register("freelancer_cost")} />
                {errors.freelancer_cost && <p className="text-xs text-destructive">{errors.freelancer_cost.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Prazo Final de Entrega</Label>
                <Input type="date" {...register("deadline")} />
                {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link da Pasta do Google Drive (Opcional)</Label>
              <Input placeholder="https://drive.google.com/drive/folders/..." {...register("google_drive_link")} />
              {errors.google_drive_link && <p className="text-xs text-destructive">{errors.google_drive_link.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/projects" })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProject.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2">
                {createProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar no Banco & Abrir Projeto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
