import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FolderPlus, Loader2, UserCheck } from "lucide-react";
import { useCreateProject, type ServiceType } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useProfiles";
import { supabase } from "@/integrations/supabase/client";
import { sendClientInvite } from "@/integrations/brevo";
import { useState } from "react";
import { toast } from "sonner";
import { ProjectContractFieldsSection } from "@/components/ProjectContractFieldsSection";

const newProjectSchema = z.object({
  title: z.string().min(2, "Título do projeto / cliente é obrigatório"),
  service_type: z.enum(["IA", "Trafego", "Sites", "Social Media"]),
  briefing_content: z.string().min(10, "Descreva brevemente o projeto (mín. 10 caracteres)"),
  budget: z.coerce.number().min(100, "Orçamento deve ser no mínimo R$ 100"),
  freelancer_cost: z.coerce.number().min(0, "Custo do freelancer deve ser válido"),
  deadline: z.string().min(1, "Selecione o prazo de entrega"),
  google_drive_link: z.string().url("Informe uma URL válida do Google Drive").or(z.literal("")),
  client_id: z.string().optional(),
});

type NewProjectFormData = z.infer<typeof newProjectSchema>;

export const Route = createFileRoute("/app/projects/new")({
  head: () => ({
    meta: [{ title: "Novo Projeto — Delski ERP" }],
  }),
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const { data: clients = [], isLoading: loadingClients } = useClients();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema) as any,
    defaultValues: {
      title: "",
      service_type: "IA",
      briefing_content: "",
      budget: 5000,
      freelancer_cost: 1800,
      deadline: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
      google_drive_link: "",
      client_id: "",
    },
  });

  const [clientContractUploading, setClientContractUploading] = useState(false);
  const [clientContractUrl, setClientContractUrl] = useState<string | null>(null);
  const [clientContractPath, setClientContractPath] = useState<string | null>(null);
  const [sendClientAccess, setSendClientAccess] = useState(false);

  const [contractFieldValues, setContractFieldValues] = useState<Record<string, string>>({});
  const [isContractFieldsComplete, setIsContractFieldsComplete] = useState(false);

  const selectedType = watch("service_type");
  const selectedClientId = watch("client_id");

  const onSubmit = (data: NewProjectFormData) => {
    const publicToken = sendClientAccess ? crypto.randomUUID() : undefined;
    createProject.mutate(
      {
        title: data.title,
        service_type: data.service_type as ServiceType,
        briefing_content: data.briefing_content,
        budget: data.budget,
        freelancer_cost: data.freelancer_cost,
        deadline: data.deadline,
        status: "Criado",
        client_id: data.client_id || undefined,
        public_token: publicToken,
        client_contract_path: clientContractPath ?? undefined,
        client_contract_url: clientContractUrl ?? undefined,
        contract_field_values: contractFieldValues,
        contract_fields_status: isContractFieldsComplete ? "completo" : "pendente",
      },
      {
        onSuccess: async (newProj) => {
          // If requested, send client invite via Brevo
          if (sendClientAccess && data.client_id) {
            try {
              const { data: clientData } = await supabase
                .from("profiles")
                .select("full_name,email")
                .eq("id", data.client_id)
                .maybeSingle();
              const client = clientData as any;
              if (client?.email) {
                const link = `${window.location.origin}/p/${publicToken}`;
                await sendClientInvite({
                  to: { name: client.full_name || "Cliente", email: client.email },
                  projectTitle: data.title,
                  projectLink: link,
                });
              }
            } catch (e) {
              console.warn("Erro ao enviar convite para o cliente:", e);
            }
          }

          navigate({ to: "/app/projects/$id", params: { id: (newProj as any).id } });
        },
      },
    );
  };

  const handleClientContractSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setClientContractUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `contracts/client/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from("contracts").upload(filePath, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("contracts").getPublicUrl(data.path);
      setClientContractPath(data.path);
      setClientContractUrl(pub.publicUrl);
      toast.success("Contrato do cliente carregado.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar contrato do cliente");
    } finally {
      setClientContractUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => navigate({ to: "/app/projects" })}
          className="hover:underline flex items-center gap-1"
        >
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
            Preencha os detalhes do projeto, escopo inicial, restrições financeiras e vinculação
            opcional de cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título do Projeto / Empresa</Label>
                <Input placeholder="Ex: Studio Lumina — Automação LeadGen" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Vertical de Serviço</Label>
                <Select
                  value={selectedType}
                  onValueChange={(val) => setValue("service_type", val as ServiceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IA">Automação com IA</SelectItem>
                    <SelectItem value="Trafego">Tráfego Pago</SelectItem>
                    <SelectItem value="Sites">Desenvolvimento de Sites</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                  </SelectContent>
                </Select>
                {errors.service_type && (
                  <p className="text-xs text-destructive">{errors.service_type.message}</p>
                )}
              </div>
            </div>

            {/* Vinculação Opcional de Cliente */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                Vincular Cliente do Projeto (Opcional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Se vinculado, este projeto será visível exclusivamente para a conta deste cliente no
                Portal do Cliente.
              </p>
              <Select
                value={selectedClientId || "none"}
                onValueChange={(val) => setValue("client_id", val === "none" ? "" : val)}
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue
                    placeholder={
                      loadingClients
                        ? "Carregando clientes..."
                        : "Selecione um cliente cadastrado (Opcional)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Projeto Sem Cliente Restrito)</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.auth_user_id || c.id}>
                      {c.full_name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seção Dinâmica: Dados para Contrato */}
            <ProjectContractFieldsSection
              serviceType={selectedType}
              values={contractFieldValues}
              onChange={(newVals, complete) => {
                setContractFieldValues(newVals);
                setIsContractFieldsComplete(complete);
              }}
            />

            {/* Client Contract & Invite */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-sm font-semibold">Contrato do Cliente (Opcional)</Label>
              <p className="text-xs text-muted-foreground">
                Anexe o contrato assinado com o cliente para fins administrativos. Opcionalmente,
                envie acesso ao portal do cliente.
              </p>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleClientContractSelect}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" disabled={clientContractUploading}>
                    {clientContractUploading ? "Enviando..." : "Enviar Contrato do Cliente (PDF)"}
                  </Button>
                </label>
                {clientContractUrl && (
                  <a
                    href={clientContractUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-500 hover:underline text-sm"
                  >
                    Visualizar contrato carregado
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="sendAccess"
                  type="checkbox"
                  checked={sendClientAccess}
                  onChange={(e) => setSendClientAccess(e.target.checked)}
                />
                <label htmlFor="sendAccess" className="text-sm">
                  Criar Acesso / Enviar Convite para o Cliente
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição / Briefing do Escopo</Label>
              <Textarea
                rows={4}
                placeholder="Ex: Desenvolvimento de agente IA para atendimento e agendamento via WhatsApp..."
                {...register("briefing_content")}
              />
              {errors.briefing_content && (
                <p className="text-xs text-destructive">{errors.briefing_content.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Orçamento Bruto (R$)</Label>
                <Input type="number" placeholder="5000" {...register("budget")} />
                {errors.budget && (
                  <p className="text-xs text-destructive">{errors.budget.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Custo Freelancer (R$)</Label>
                <Input type="number" placeholder="1800" {...register("freelancer_cost")} />
                {errors.freelancer_cost && (
                  <p className="text-xs text-destructive">{errors.freelancer_cost.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Prazo Final de Entrega</Label>
                <Input type="date" {...register("deadline")} />
                {errors.deadline && (
                  <p className="text-xs text-destructive">{errors.deadline.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link da Pasta do Google Drive (Opcional)</Label>
              <Input
                placeholder="https://drive.google.com/drive/folders/..."
                {...register("google_drive_link")}
              />
              {errors.google_drive_link && (
                <p className="text-xs text-destructive">{errors.google_drive_link.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/app/projects" })}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createProject.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2"
              >
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
