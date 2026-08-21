import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCrmLead } from "@/hooks/useCrmLeads";
import { CrmLeadStage, LeadTemperature } from "@/types/crm";
import { SalesChannel } from "@/types/sales";
import { ServiceType, SERVICE_TYPES, SERVICE_LABEL } from "@/mocks/types";
import { toast } from "sonner";
import { UserPlus, User, Phone, Mail, DollarSign, Flame, Zap, Snowflake, Sparkles } from "lucide-react";

const newLeadSchema = z.object({
  name: z.string().min(2, "Nome do lead / empresa é obrigatório"),
  contact: z.string().min(8, "Telefone / WhatsApp é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  service: z.enum(["IA", "Trafego", "Sites", "Social Media"] as const),
  estimatedValue: z.coerce.number().positive("Valor estimado deve ser maior que zero"),
  stage: z.enum(["novo_lead", "qualificacao", "reuniao", "proposta", "fechado", "perdido"] as const),
  temperature: z.enum(["quente", "morno", "frio"] as const),
  channel: z.enum(["inbound", "sdr_whatsapp", "indicacao", "parceiros", "outbound", "outro"] as const),
  seller_name: z.string().min(2, "SDR / Closer responsável é obrigatório"),
  notes: z.string().optional(),
});

type NewLeadFormValues = z.infer<typeof newLeadSchema>;

// IMPORTANT (AGENTS.md Rule 1): Module-scope resolver to avoid CPU lockup
const newLeadResolver = zodResolver(newLeadSchema);

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewLeadModal({ open, onOpenChange }: NewLeadModalProps) {
  const createLeadMutation = useCreateCrmLead();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewLeadFormValues>({
    resolver: newLeadResolver,
    defaultValues: {
      name: "",
      contact: "",
      email: "",
      service: "IA",
      estimatedValue: 5000,
      stage: "novo_lead",
      temperature: "quente",
      channel: "inbound",
      seller_name: "SDR Comercial",
      notes: "",
    },
  });

  const selectedService = watch("service");
  const selectedStage = watch("stage");
  const selectedTemperature = watch("temperature");
  const selectedChannel = watch("channel");

  const onSubmit = async (data: NewLeadFormValues) => {
    try {
      await createLeadMutation.mutateAsync({
        name: data.name.trim(),
        contact: data.contact.trim(),
        email: data.email?.trim() || undefined,
        service: data.service,
        estimatedValue: data.estimatedValue,
        stage: data.stage,
        temperature: data.temperature,
        channel: data.channel,
        seller_name: data.seller_name.trim(),
        notes: data.notes?.trim() || undefined,
      });

      toast.success("Lead adicionado ao Funil de Vendas com sucesso!");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao cadastrar lead. Tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="h-5 w-5 text-primary" />
            Cadastrar Novo Lead no CRM
          </DialogTitle>
          <DialogDescription>
            Insira os dados do potencial cliente para triagem e fluxo de prospecção do SDR.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name" className="text-xs font-semibold">
                Nome do Lead / Empresa *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Ex: Studio Lumina Arquitetura"
                  className="pl-9 text-xs"
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Telefone / WhatsApp */}
            <div className="space-y-1.5">
              <Label htmlFor="contact" className="text-xs font-semibold">
                WhatsApp / Celular *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contact"
                  placeholder="(11) 98765-4321"
                  className="pl-9 text-xs"
                  {...register("contact")}
                />
              </div>
              {errors.contact && (
                <p className="text-xs text-destructive font-medium">{errors.contact.message}</p>
              )}
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                E-mail de Contato
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@empresa.com.br"
                  className="pl-9 text-xs"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Serviço Desejado */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Serviço de Interesse *</Label>
              <Select
                value={selectedService}
                onValueChange={(val: ServiceType) => setValue("service", val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SERVICE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor Estimado */}
            <div className="space-y-1.5">
              <Label htmlFor="estimatedValue" className="text-xs font-semibold">
                Valor Estimado (R$) *
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="estimatedValue"
                  type="number"
                  step="100"
                  placeholder="5000"
                  className="pl-9 text-xs"
                  {...register("estimatedValue")}
                />
              </div>
              {errors.estimatedValue && (
                <p className="text-xs text-destructive font-medium">
                  {errors.estimatedValue.message}
                </p>
              )}
            </div>

            {/* Temperatura do Lead */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Temperatura / Prioridade *</Label>
              <Select
                value={selectedTemperature}
                onValueChange={(val: LeadTemperature) => setValue("temperature", val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Temperatura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quente" className="text-xs">
                    <div className="flex items-center gap-2">
                      <Flame className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
                      <span>Quente (Alta Intenção)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="morno" className="text-xs">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                      <span>Morno (Em Avaliação)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="frio" className="text-xs">
                    <div className="flex items-center gap-2">
                      <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                      <span>Frio (Primeiro Contato)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Canal de Origem */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Canal de Origem *</Label>
              <Select
                value={selectedChannel}
                onValueChange={(val: SalesChannel) => setValue("channel", val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound (Site / Form)</SelectItem>
                  <SelectItem value="sdr_whatsapp">SDR WhatsApp</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="parceiros">Parceiros</SelectItem>
                  <SelectItem value="outbound">Outbound (Ativo)</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estágio Inicial */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estágio Inicial no Funil *</Label>
              <Select
                value={selectedStage}
                onValueChange={(val: CrmLeadStage) => setValue("stage", val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Estágio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo_lead">Novo Lead / Sem Contato</SelectItem>
                  <SelectItem value="qualificacao">Em Qualificação (SDR)</SelectItem>
                  <SelectItem value="reuniao">Reunião Agendada</SelectItem>
                  <SelectItem value="proposta">Proposta Enviada</SelectItem>
                  <SelectItem value="fechado">Fechado / Ganho</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SDR Responsável */}
            <div className="space-y-1.5">
              <Label htmlFor="seller_name" className="text-xs font-semibold">
                SDR / Closer Responsável *
              </Label>
              <Input
                id="seller_name"
                placeholder="Ex: Carlos Eduardo"
                className="text-xs"
                {...register("seller_name")}
              />
              {errors.seller_name && (
                <p className="text-xs text-destructive font-medium">{errors.seller_name.message}</p>
              )}
            </div>

            {/* Notas / Dores do Lead */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Anotações de Qualificação / Dores
              </Label>
              <Textarea
                id="notes"
                placeholder="Detalhes sobre o momento do lead, orçamento disponível e expectativas..."
                className="resize-none h-20 text-xs"
                {...register("notes")}
              />
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || createLeadMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {createLeadMutation.isPending ? "Salvando..." : "Adicionar ao Funil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
