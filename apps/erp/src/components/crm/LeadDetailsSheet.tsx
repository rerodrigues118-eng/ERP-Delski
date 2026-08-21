import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  CrmLead,
  CrmLeadStage,
  LeadTemperature,
} from "@/types/crm";
import { SalesChannel } from "@/types/sales";
import { ServiceType } from "@/mocks/types";
import { useUpdateCrmLead, useDeleteCrmLead } from "@/hooks/useCrmLeads";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MessageSquare,
  TrendingUp,
  Save,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  User,
  Building2,
  Flame,
  Zap,
  Snowflake,
  DollarSign,
  Phone,
  Mail,
  Layers,
  Sparkles,
  Link as LinkIcon,
  BellRing,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface LeadDetailsSheetProps {
  lead: CrmLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvertLeadToSale: (lead: CrmLead) => void;
}

const STAGES: { id: CrmLeadStage; label: string }[] = [
  { id: "novo_lead", label: "Novo Lead / Sem Contato" },
  { id: "qualificacao", label: "Em Qualificação (SDR)" },
  { id: "reuniao", label: "Reunião Agendada" },
  { id: "proposta", label: "Proposta Enviada" },
  { id: "fechado", label: "Fechado / Ganho" },
  { id: "perdido", label: "Perdido" },
];

const OFFICIAL_SERVICES: { value: ServiceType; label: string }[] = [
  { value: "ia", label: "Automação IA" },
  { value: "trafego", label: "Tráfego Pago" },
  { value: "social", label: "Social Media" },
  { value: "sites", label: "Sites" },
];

const CHANNELS: { value: SalesChannel; label: string }[] = [
  { value: "inbound", label: "Inbound (Site / Form)" },
  { value: "sdr_whatsapp", label: "SDR WhatsApp" },
  { value: "indicacao", label: "Indicação" },
  { value: "parceiros", label: "Parceiros" },
  { value: "outbound", label: "Outbound (Ativo)" },
  { value: "outro", label: "Outro" },
];

export function LeadDetailsSheet({
  lead,
  open,
  onOpenChange,
  onConvertLeadToSale,
}: LeadDetailsSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateLeadMutation = useUpdateCrmLead();
  const deleteLeadMutation = useDeleteCrmLead();

  // Estados editáveis de todos os campos do Lead
  const [name, setName] = useState("");
  const [estimatedValue, setEstimatedValue] = useState<number>(0);
  const [service, setService] = useState<ServiceType>("ia");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<SalesChannel>("inbound");
  const [sellerName, setSellerName] = useState("");
  const [notes, setNotes] = useState("");
  const [temperature, setTemperature] = useState<LeadTemperature>("quente");
  const [stage, setStage] = useState<CrmLeadStage>("novo_lead");

  // Campos específicos de Reunião
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setName(lead.name || "");
      setEstimatedValue(lead.estimatedValue || 0);

      // Map service string to ServiceType
      let serv: ServiceType = "ia";
      if (lead.service) {
        const s = lead.service.toLowerCase();
        if (s.includes("trafego") || s.includes("tráfego")) serv = "trafego";
        else if (s.includes("social") || s.includes("media") || s.includes("mídia")) serv = "social";
        else if (s.includes("site") || s.includes("web")) serv = "sites";
        else serv = "ia";
      }
      setService(serv);

      setContact(lead.contact || lead.phone || "");
      setEmail(lead.email || "");
      setChannel(lead.channel || "inbound");
      setSellerName(lead.seller_name || "SDR Comercial");
      setNotes(lead.notes || "");
      setTemperature(lead.temperature || "quente");
      setStage(lead.stage || "novo_lead");

      // Meeting details
      setMeetingLink(lead.meeting_link || "");
      setMeetingDate(lead.meeting_date || lead.meetingDate || "");
      setMeetingTime(lead.meeting_time || "14:00");
    }
  }, [lead]);

  if (!lead) return null;

  const handleOpenWhatsApp = () => {
    const rawNumber = (contact || lead.phone || "").replace(/\D/g, "");
    if (!rawNumber) {
      toast.error("Número de WhatsApp não informado para este lead.");
      return;
    }

    const cleanPhone = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    const firstName = name.split(" ")[0];
    const greeting = encodeURIComponent(
      `Olá ${firstName}, tudo bem? Aqui é o ${sellerName || "consultor"} da Delski.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${greeting}`, "_blank");
  };

  const handleSaveDetails = async () => {
    if (!name.trim()) {
      toast.error("O nome do lead é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const serviceLabel = OFFICIAL_SERVICES.find((s) => s.value === service)?.label || "Automação IA";

      // 1. Atualizar o lead com todos os campos editáveis
      await updateLeadMutation.mutateAsync({
        id: lead.id,
        patch: {
          name: name.trim(),
          estimatedValue: Number(estimatedValue) || 0,
          service: serviceLabel as any,
          contact: contact.trim(),
          phone: contact.replace(/\D/g, ""),
          email: email.trim(),
          channel,
          seller_name: sellerName.trim(),
          notes: notes.trim(),
          temperature,
          stage,
          meeting_link: meetingLink.trim(),
          meeting_date: meetingDate,
          meeting_time: meetingTime,
          meetingDate: meetingDate || null,
        },
      });

      // 2. Programar/Gerar notificações automáticas se etapa for "Reunião Agendada"
      if (stage === "reuniao" && meetingDate) {
        const linkStr = meetingLink.trim() ? meetingLink.trim() : "Link do Google Meet a definir";
        const formattedTime = meetingTime || "14:00";
        const targetUserId = user?.id || null;

        const meetingNotifications = [
          {
            user_id: targetUserId,
            title: `📅 Reunião Amanhã: ${name.trim()}`,
            message: `Lembrete de Reunião com o lead ${name.trim()} agendada para amanhã às ${formattedTime}. Link: ${linkStr}`,
            type: "alerta" as const,
            read: false,
            created_by: targetUserId,
          },
          {
            user_id: targetUserId,
            title: `⏰ Reunião em 40min: ${name.trim()}`,
            message: `A reunião com ${name.trim()} (${serviceLabel}) começará em 40 minutos (às ${formattedTime}). Link: ${linkStr}`,
            type: "alerta" as const,
            read: false,
            created_by: targetUserId,
          },
          {
            user_id: targetUserId,
            title: `🚀 Reunião em 10min: ${name.trim()}`,
            message: `Sua reunião com ${name.trim()} começa em 10 minutos! Acesse agora pelo link: ${linkStr}`,
            type: "alerta" as const,
            read: false,
            created_by: targetUserId,
          },
        ];

        try {
          // Insere os 3 alertas na tabela de notificações do Supabase
          await supabase.from("notifications").insert(meetingNotifications);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        } catch (notifErr) {
          console.warn("Falha ao sincronizar notificações no Supabase:", notifErr);
        }

        toast.success("Informações do lead salvas e 3 alertas de reunião programados em Notificações!");
      } else {
        toast.success("Informações do lead salvas com sucesso!");
      }
    } catch {
      toast.error("Erro ao salvar informações do lead.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsWon = () => {
    onOpenChange(false);
    onConvertLeadToSale({
      ...lead,
      name,
      estimatedValue,
      service: OFFICIAL_SERVICES.find((s) => s.value === service)?.label as any || lead.service,
      contact,
      email,
      channel,
      seller_name: sellerName,
      notes,
    });
  };

  const handleMarkAsLost = async () => {
    try {
      await updateLeadMutation.mutateAsync({
        id: lead.id,
        patch: { stage: "perdido" },
      });
      setStage("perdido");
      toast.success('Lead marcado como "Perdido".');
    } catch {
      toast.error("Erro ao atualizar status do lead.");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Deseja realmente remover o lead "${name || lead.name}" do CRM?`)) return;
    try {
      await deleteLeadMutation.mutateAsync(lead.id);
      toast.success("Lead removido com sucesso.");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao remover lead.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto flex flex-col p-6 space-y-5">
        <SheetHeader className="space-y-2 border-b border-border/80 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Edição & Detalhes do Lead
              </span>
              <div className="mt-1">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do Lead / Empresa"
                  className="font-bold text-lg text-foreground h-9 px-2"
                />
              </div>
            </div>

            {/* Temperatura Badge Indicativa */}
            {temperature === "quente" && (
              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 text-xs shrink-0 mt-6">
                <Flame className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" /> Quente
              </Badge>
            )}
            {temperature === "morno" && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-xs shrink-0 mt-6">
                <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" /> Morno
              </Badge>
            )}
            {temperature === "frio" && (
              <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30 gap-1 text-xs shrink-0 mt-6">
                <Snowflake className="h-3.5 w-3.5 text-blue-500" /> Frio
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs">
            Edite os dados cadastrais, programe reuniões com notificações ou converta o lead em faturamento.
          </SheetDescription>
        </SheetHeader>

        {/* Ações Principais de SDR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Button
            onClick={handleOpenWhatsApp}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
          >
            <MessageSquare className="h-4 w-4" />
            Conversar no WhatsApp
          </Button>

          {stage !== "fechado" ? (
            <Button
              onClick={handleMarkAsWon}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              <TrendingUp className="h-4 w-4" />
              Converter em Venda (Ganho)
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              className="w-full gap-2 border-emerald-500/40 text-emerald-700 bg-emerald-500/10 text-xs font-bold"
            >
              <CheckCircle2 className="h-4 w-4" />
              Venda Concluída
            </Button>
          )}
        </div>

        {/* Etapa e Temperatura (Editáveis) */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-muted/40">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Etapa do Funil *</Label>
            <Select value={stage} onValueChange={(val: CrmLeadStage) => setStage(val)}>
              <SelectTrigger className="text-xs h-9 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Temperatura / Intenção *</Label>
            <Select
              value={temperature}
              onValueChange={(val: LeadTemperature) => setTemperature(val)}
            >
              <SelectTrigger className="text-xs h-9 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quente" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
                    <span>Quente</span>
                  </div>
                </SelectItem>
                <SelectItem value="morno" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                    <span>Morno</span>
                  </div>
                </SelectItem>
                <SelectItem value="frio" className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                    <span>Frio</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── SEÇÃO DEDICADA: REUNIÃO AGENDADA (Exibida quando stage === "reuniao") ── */}
        {stage === "reuniao" && (
          <div className="p-4 rounded-2xl border-2 border-indigo-500/30 bg-indigo-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Video className="h-4 w-4 text-indigo-500" /> Agendamento de Reunião & Alertas
              </h4>
              <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 flex items-center gap-1">
                <BellRing className="h-3 w-3" /> 3 Notificações Automáticas
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="meeting_link" className="text-xs font-semibold flex items-center gap-1">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" /> Link da Reunião (Google Meet / Zoom)
                </Label>
                <Input
                  id="meeting_link"
                  placeholder="Ex: https://meet.google.com/abc-defg-hij"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="h-8 text-xs bg-card"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="meeting_date" className="text-xs font-semibold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Data da Reunião
                </Label>
                <Input
                  id="meeting_date"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="h-8 text-xs bg-card"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="meeting_time" className="text-xs font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Horário da Reunião
                </Label>
                <Input
                  id="meeting_time"
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="h-8 text-xs bg-card"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              * Ao salvar, alertas serão programados em <strong>Notificações</strong>: 1 dia antes, 40min antes e 10min antes.
            </p>
          </div>
        )}

        {/* Informações Cadastrais e Comerciais (Totalmente Editáveis) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" /> Informações Comerciais (Editáveis)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Valor Estimado */}
            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Valor Estimado (R$) *
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(Number(e.target.value))}
                  className="pl-8 h-8 text-xs font-bold"
                />
              </div>
            </div>

            {/* Serviço de Interesse */}
            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Serviço de Interesse *
              </Label>
              <Select value={service} onValueChange={(val: ServiceType) => setService(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {OFFICIAL_SERVICES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Telefone / Contato */}
            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Telefone / WhatsApp *
              </Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {/* Canal de Origem */}
            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Canal de Origem *
              </Label>
              <Select value={channel} onValueChange={(val: SalesChannel) => setChannel(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SDR / Closer Responsável */}
            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                SDR / Closer Responsável
              </Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {/* E-mail de Contato */}
            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                E-mail de Contato
              </Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Anotações e Histórico */}
        <div className="space-y-1.5 flex-1">
          <Label htmlFor="lead-notes" className="text-xs font-bold flex items-center gap-1.5 text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Anotações & Histórico de Qualificação
          </Label>
          <Textarea
            id="lead-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Registre aqui as necessidades levantadas, objeções, links de reuniões ou combinados..."
            className="h-24 text-xs resize-none"
          />
        </div>

        {/* Footer com Salvar e Ações Secundárias */}
        <SheetFooter className="pt-3 border-t border-border flex flex-col sm:flex-row gap-2 justify-between items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/20"
              title="Excluir lead"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
            </Button>
            {stage !== "perdido" && stage !== "fechado" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarkAsLost}
                className="text-xs text-muted-foreground hover:text-rose-600"
              >
                Marcar como Perdido
              </Button>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveDetails}
            disabled={isSaving || updateLeadMutation.isPending}
            className="w-full sm:w-auto gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
