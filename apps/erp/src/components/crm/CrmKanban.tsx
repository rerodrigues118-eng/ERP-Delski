import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCrmLeads, useUpdateCrmLeadStage, useDeleteCrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";
import {
  Search,
  MessageSquare,
  Sparkles,
  DollarSign,
  UserCheck,
  Flame,
  Zap,
  Snowflake,
  Trash2,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface CrmKanbanProps {
  onConvertLeadToSale: (lead: CrmLead) => void;
}

const STAGES: { id: CrmLeadStage; label: string; color: string; badge: string }[] = [
  {
    id: "novo_lead",
    label: "Novo Lead / Sem Contato",
    color: "border-blue-500/30 bg-blue-500/5",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  {
    id: "qualificacao",
    label: "Em Qualificação (SDR)",
    color: "border-amber-500/30 bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  {
    id: "reuniao",
    label: "Reunião Agendada",
    color: "border-indigo-500/30 bg-indigo-500/5",
    badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  },
  {
    id: "proposta",
    label: "Proposta Enviada",
    color: "border-purple-500/30 bg-purple-500/5",
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  {
    id: "fechado",
    label: "Fechado / Ganho",
    color: "border-emerald-500/30 bg-emerald-500/5",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    id: "perdido",
    label: "Perdido",
    color: "border-rose-500/30 bg-rose-500/5",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
};

export function CrmKanban({ onConvertLeadToSale }: CrmKanbanProps) {
  const { data: leads = [], isLoading } = useCrmLeads();
  const updateStageMutation = useUpdateCrmLeadStage();
  const deleteLeadMutation = useDeleteCrmLead();

  const [searchTerm, setSearchTerm] = useState("");
  const [temperatureFilter, setTemperatureFilter] = useState<string>("all");

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.seller_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.service || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchTemp =
        temperatureFilter === "all" || l.temperature === temperatureFilter;

      return matchSearch && matchTemp;
    });
  }, [leads, searchTerm, temperatureFilter]);

  const handleStageChange = async (lead: CrmLead, newStage: CrmLeadStage) => {
    if (newStage === "fechado") {
      // Automatic trigger: open register sale modal
      onConvertLeadToSale(lead);
      return;
    }

    try {
      await updateStageMutation.mutateAsync({
        id: lead.id,
        stage: newStage,
      });
      toast.success(`Lead movido para "${STAGES.find((s) => s.id === newStage)?.label}"`);
    } catch {
      toast.error("Erro ao atualizar estágio do lead.");
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o lead "${name}" do funil?`)) return;
    try {
      await deleteLeadMutation.mutateAsync(id);
      toast.success("Lead removido com sucesso.");
    } catch {
      toast.error("Erro ao remover lead.");
    }
  };

  const handleOpenWhatsApp = (lead: CrmLead) => {
    const rawNumber = (lead.phone || lead.contact || "").replace(/\D/g, "");
    if (!rawNumber) {
      toast.error("Número de WhatsApp não informado para este lead.");
      return;
    }

    const cleanPhone = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    const greeting = encodeURIComponent(
      `Olá ${lead.name.split(" ")[0]}, tudo bem? Aqui é o ${lead.seller_name || "consultor"} da Delski.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${greeting}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Filtros rápidos do CRM */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por lead, empresa, contato ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
            <SelectTrigger className="h-9 text-xs w-[160px]">
              <SelectValue placeholder="Temperatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Temperaturas</SelectItem>
              <SelectItem value="quente">🔥 Quente</SelectItem>
              <SelectItem value="morno">⚡ Morno</SelectItem>
              <SelectItem value="frio">❄️ Frio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Grid (6 Colunas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
          const stageTotal = stageLeads.reduce(
            (acc, l) => acc + (Number(l.estimatedValue) || 0),
            0
          );

          return (
            <Card
              key={stage.id}
              className={`border bg-card/70 dark:bg-card/40 rounded-xl overflow-hidden shadow-xs flex flex-col min-h-[500px]`}
            >
              {/* Header da Coluna */}
              <CardHeader className="p-3 border-b border-border/80 bg-muted/40 space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <CardTitle className="text-xs font-bold text-foreground truncate" title={stage.label}>
                    {stage.label}
                  </CardTitle>
                  <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 h-5 shrink-0 ${stage.badge}`}>
                    {stageLeads.length}
                  </Badge>
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground">
                  {formatCurrency(stageTotal)}
                </div>
              </CardHeader>

              {/* Lista de Leads do Estágio */}
              <CardContent className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[640px]">
                {stageLeads.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground text-center py-12 border border-dashed border-border rounded-lg bg-muted/20">
                    Nenhum lead
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-border bg-card p-3 space-y-2.5 shadow-xs hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      {/* Top Row: Nome & Temperatura */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-foreground truncate" title={lead.name}>
                            {lead.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate">{lead.contact}</p>
                        </div>

                        {/* Temperatura */}
                        {lead.temperature === "quente" && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0"
                            title="Lead Quente - Alta Intenção"
                          >
                            <Flame className="h-3 w-3 fill-rose-500/40 text-rose-500" /> Quente
                          </span>
                        )}
                        {lead.temperature === "morno" && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0"
                            title="Lead Morno - Em Avaliação"
                          >
                            <Zap className="h-3 w-3 fill-amber-500/40 text-amber-500" /> Morno
                          </span>
                        )}
                        {lead.temperature === "frio" && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 shrink-0"
                            title="Lead Frio - Primeiro Contato"
                          >
                            <Snowflake className="h-3 w-3 text-slate-500" /> Frio
                          </span>
                        )}
                      </div>

                      {/* Badges de Serviço & Origem */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-semibold py-0 px-1.5 bg-muted/50">
                          {lead.service}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                          {lead.channel === "inbound"
                            ? "Inbound"
                            : lead.channel === "sdr_whatsapp"
                            ? "SDR WhatsApp"
                            : lead.channel === "indicacao"
                            ? "Indicação"
                            : lead.channel === "parceiros"
                            ? "Parceiros"
                            : lead.channel === "outbound"
                            ? "Outbound"
                            : "Outro"}
                        </span>
                      </div>

                      {/* Valor Estimado */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                        <span className="font-extrabold text-foreground text-xs">
                          {formatCurrency(lead.estimatedValue)}
                        </span>
                        {lead.seller_name && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={lead.seller_name}>
                            {lead.seller_name}
                          </span>
                        )}
                      </div>

                      {/* Anotações */}
                      {lead.notes && (
                        <p className="text-[11px] text-muted-foreground bg-muted/30 p-1.5 rounded-md line-clamp-2 italic">
                          "{lead.notes}"
                        </p>
                      )}

                      {/* Ações Rápidas de SDR */}
                      <div className="space-y-1.5 pt-1 border-t border-border/60">
                        <div className="flex items-center gap-1.5">
                          {/* Direct WhatsApp */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2 flex-1 gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            onClick={() => handleOpenWhatsApp(lead)}
                            title="Abrir conversa no WhatsApp"
                          >
                            <MessageSquare className="h-3 w-3" />
                            WhatsApp
                          </Button>

                          {/* Botão Fechar Venda */}
                          {lead.stage !== "fechado" && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              onClick={() => onConvertLeadToSale(lead)}
                              title="Converter em Venda e Registrar Faturamento"
                            >
                              <TrendingUp className="h-3 w-3" />
                              Ganho
                            </Button>
                          )}

                          {/* Botão Excluir */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0"
                            onClick={() => handleDeleteLead(lead.id, lead.name)}
                            title="Excluir Lead"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Mudar Estágio Select */}
                        <Select
                          value={lead.stage}
                          onValueChange={(val: CrmLeadStage) => handleStageChange(lead, val)}
                        >
                          <SelectTrigger className="h-6 text-[10px] w-full bg-muted/50 border-border">
                            <SelectValue placeholder="Mover etapa" />
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
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
