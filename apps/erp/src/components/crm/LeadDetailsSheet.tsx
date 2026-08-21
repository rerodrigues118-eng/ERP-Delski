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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useUpdateCrmLead, useDeleteCrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";
import {
  MessageSquare,
  TrendingUp,
  Trash2,
  Save,
  Building2,
  Phone,
  Mail,
  DollarSign,
  User,
  Flame,
  Zap,
  Snowflake,
  ExternalLink,
  Tag,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";

interface LeadDetailsSheetProps {
  lead: CrmLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvertLeadToSale: (lead: CrmLead) => void;
}

const STAGES: { id: CrmLeadStage; label: string; badge: string }[] = [
  { id: "novo_lead", label: "Novo Lead / Sem Contato", badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  { id: "qualificacao", label: "Em Qualificação (SDR)", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { id: "reuniao", label: "Reunião Agendada", badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400" },
  { id: "proposta", label: "Proposta Enviada", badge: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  { id: "fechado", label: "Fechado / Ganho", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { id: "perdido", label: "Perdido", badge: "bg-rose-500/15 text-rose-700 dark:text-rose-400" },
];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
};

export function LeadDetailsSheet({
  lead,
  open,
  onOpenChange,
  onConvertLeadToSale,
}: LeadDetailsSheetProps) {
  const updateLeadMutation = useUpdateCrmLead();
  const deleteLeadMutation = useDeleteCrmLead();

  const [notes, setNotes] = useState("");
  const [temperature, setTemperature] = useState<LeadTemperature>("quente");
  const [stage, setStage] = useState<CrmLeadStage>("novo_lead");
  const [estimatedValue, setEstimatedValue] = useState<number>(0);

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || "");
      setTemperature(lead.temperature || "quente");
      setStage(lead.stage || "novo_lead");
      setEstimatedValue(lead.estimatedValue || 0);
    }
  }, [lead]);

  if (!lead) return null;

  const handleOpenWhatsApp = () => {
    const rawNumber = (lead.phone || lead.contact || "").replace(/\D/g, "");
    if (!rawNumber) {
      toast.error("Número de WhatsApp não informado para este lead.");
      return;
    }

    const cleanPhone = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    const firstName = lead.name.split(" ")[0];
    const greeting = encodeURIComponent(
      `Olá ${firstName}, tudo bem? Aqui é o ${lead.seller_name || "consultor"} da Delski.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${greeting}`, "_blank");
  };

  const handleSaveDetails = async () => {
    try {
      await updateLeadMutation.mutateAsync({
        id: lead.id,
        patch: {
          notes: notes.trim(),
          temperature,
          stage,
          estimatedValue: Number(estimatedValue) || 0,
        },
      });
      toast.success("Detalhes do lead salvos com sucesso!");
    } catch {
      toast.error("Erro ao salvar detalhes do lead.");
    }
  };

  const handleMarkAsWon = () => {
    onOpenChange(false);
    onConvertLeadToSale(lead);
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
    if (!confirm(`Deseja realmente remover o lead "${lead.name}" do CRM?`)) return;
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
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto flex flex-col p-6 space-y-5">
        <SheetHeader className="space-y-2 border-b border-border/80 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Detalhes da Oportunidade
              </span>
              <SheetTitle className="text-xl font-bold text-foreground truncate">
                {lead.name}
              </SheetTitle>
            </div>

            {/* Temperatura Badge */}
            {temperature === "quente" && (
              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 text-xs">
                <Flame className="h-3 w-3 text-rose-500" /> Quente
              </Badge>
            )}
            {temperature === "morno" && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-xs">
                <Zap className="h-3 w-3 text-amber-500" /> Morno
              </Badge>
            )}
            {temperature === "frio" && (
              <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30 gap-1 text-xs">
                <Snowflake className="h-3 w-3 text-slate-500" /> Frio
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs">
            Gerencie o avanço deste lead no pipeline, inicie conversas e registre a conversão em faturamento.
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

        {/* Etapa e Temperatura */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-muted/40">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Etapa do Funil</Label>
            <Select value={stage} onValueChange={(val: CrmLeadStage) => setStage(val)}>
              <SelectTrigger className="text-xs h-8 bg-card border-border">
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
            <Label className="text-xs font-semibold">Temperatura / Intenção</Label>
            <Select
              value={temperature}
              onValueChange={(val: LeadTemperature) => setTemperature(val)}
            >
              <SelectTrigger className="text-xs h-8 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quente" className="text-xs">🔥 Quente</SelectItem>
                <SelectItem value="morno" className="text-xs">⚡ Morno</SelectItem>
                <SelectItem value="frio" className="text-xs">❄️ Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid de Informações do Lead */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" /> Informações Comerciais
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-border bg-card space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Valor Estimado</span>
              <div className="flex items-center gap-1 font-bold text-foreground text-sm">
                <span>R$</span>
                <Input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(Number(e.target.value))}
                  className="h-7 text-xs font-bold"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Serviço de Interesse</span>
              <p className="font-semibold text-foreground truncate">{lead.service}</p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Telefone / Contato</span>
              <p className="font-semibold text-foreground truncate">{lead.contact}</p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Canal de Origem</span>
              <p className="font-semibold text-foreground truncate">{lead.channel}</p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-card space-y-1 sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">SDR / Closer Responsável</span>
              <p className="font-semibold text-foreground">{lead.seller_name || "Não atribuído"}</p>
            </div>
          </div>
        </div>

        {/* Anotações e Histórico */}
        <div className="space-y-1.5 flex-1">
          <Label htmlFor="lead-notes" className="text-xs font-bold flex items-center gap-1.5 text-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Anotações & Histórico de Qualificação
          </Label>
          <Textarea
            id="lead-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Registre aqui as necessidades levantadas, objeções, links de reuniões ou combinados..."
            className="h-28 text-xs resize-none"
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
            disabled={updateLeadMutation.isPending}
            className="w-full sm:w-auto gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            Salvar Alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
