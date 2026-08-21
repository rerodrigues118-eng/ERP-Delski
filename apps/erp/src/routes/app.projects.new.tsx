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
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ProjectContractFieldsSection } from "@/components/ProjectContractFieldsSection";

const newProjectSchema = z.object({
  title: z.string().min(2, "Título do projeto / cliente é obrigatório"),
  service_type: z.enum(["IA", "Trafego", "Sites", "Social Media"], {
    errorMap: () => ({ message: "Selecione uma vertical de serviço" }),
  }),
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

const newProjectResolver = zodResolver(newProjectSchema) as any;

function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const clientsQuery = useClients();
  const clients = useMemo(() => clientsQuery.data || [], [clientsQuery.data]);
  const loadingClients = clientsQuery.isLoading;
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewProjectFormData>({
    resolver: newProjectResolver,
    defaultValues: {
      title: "",
      service_type: "" as any,
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
    if (!data.service_type || (data.service_type as string) === "") {
      toast.error("Por favor, selecione uma Vertical de Serviço antes de salvar.");
      return;
    }
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
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => navigate({ to: "/app/projects" })}
          className="hover:underline flex items-center gap-1 text-xs sm:text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos Projetos
        </button>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5 text-foreground">
          <FolderPlus className="h-6 w-6 text-indigo-500" />
          Cadastrar Novo Projeto
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Defina as configurações iniciais, cliente, vertical de serviço e os termos contratuais do projeto.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Título do Projeto / Empresa</Label>
            <Input placeholder="Inserir nome" {...register("title")} className="bg-card" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Vertical de Serviço</Label>
            <Select
              value={selectedType || ""}
              onValueChange={(val) => setValue("service_type", val as ServiceType)}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Nenhum" />
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
        <div className="space-y-2 pt-4 border-t border-border">
          <Label className="flex items-center gap-1.5 text-xs font-semibold">
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
        <div className="space-y-2 pt-4 border-t border-border">
          <Label className="text-xs font-semibold">Contrato do Cliente (Opcional)</Label>
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
                className="text-indigo-500 hover:underline text-xs"
              >
                Visualizar contrato carregado
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              id="sendAccess"
              type="checkbox"
              checked={sendClientAccess}
              onChange={(e) => setSendClientAccess(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="sendAccess" className="text-xs text-foreground cursor-pointer">
              Criar Acesso / Enviar Convite para o Cliente
            </label>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs font-semibold">Descrição / Briefing do Escopo</Label>
          <Textarea
            rows={4}
            placeholder="Ex: Desenvolvimento de agente IA para atendimento e agendamento via WhatsApp..."
            {...register("briefing_content")}
            className="bg-card"
          />
          {errors.briefing_content && (
            <p className="text-xs text-destructive">{errors.briefing_content.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Orçamento Bruto (R$)</Label>
            <Input type="number" placeholder="5000" {...register("budget")} className="bg-card" />
            {errors.budget && (
              <p className="text-xs text-destructive">{errors.budget.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Custo Freelancer (R$)</Label>
            <Input type="number" placeholder="1800" {...register("freelancer_cost")} className="bg-card" />
            {errors.freelancer_cost && (
              <p className="text-xs text-destructive">{errors.freelancer_cost.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Prazo Final de Entrega</Label>
            <Input type="date" {...register("deadline")} className="bg-card" />
            {errors.deadline && (
              <p className="text-xs text-destructive">{errors.deadline.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Link da Pasta do Google Drive (Opcional)</Label>
          <Input
            placeholder="https://drive.google.com/drive/folders/..."
            {...register("google_drive_link")}
            className="bg-card"
          />
          {errors.google_drive_link && (
            <p className="text-xs text-destructive">{errors.google_drive_link.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
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
            className="bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-medium gap-2 shadow-xs border-0"
          >
            {createProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar Projeto
          </Button>
        </div>
      </form>
    </div>
  );
}
