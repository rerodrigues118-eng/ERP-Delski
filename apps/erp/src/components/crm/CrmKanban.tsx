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
import { useCrmLeads } from "@/hooks/useCrmLeads";
import { LeadDetailsSheet } from "./LeadDetailsSheet";
import {
  Search,
  MessageSquare,
  Flame,
  Zap,
  Snowflake,
} from "lucide-react";

interface CrmKanbanProps {
  onConvertLeadToSale: (lead: CrmLead) => void;
}

const STAGES: { id: CrmLeadStage; label: string; badge: string }[] = [
  {
    id: "novo_lead",
    label: "Novo Lead / Sem Contato",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  {
    id: "qualificacao",
    label: "Em Qualificação (SDR)",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  {
    id: "reuniao",
    label: "Reunião Agendada",
    badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  },
  {
    id: "proposta",
    label: "Proposta Enviada",
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  {
    id: "fechado",
    label: "Fechado / Ganho",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    id: "perdido",
    label: "Perdido",
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

  const [searchTerm, setSearchTerm] = useState("");
  const [temperatureFilter, setTemperatureFilter] = useState<string>("all");

  // Estado do Drawer de Detalhes
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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

  const handleCardClick = (lead: CrmLead) => {
    setSelectedLead(lead);
    setIsDetailsOpen(true);
  };

  const handleQuickWhatsApp = (e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    const rawNumber = (lead.phone || lead.contact || "").replace(/\D/g, "");
    if (!rawNumber) return;
    const cleanPhone = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    const firstName = lead.name.split(" ")[0];
    const greeting = encodeURIComponent(
      `Olá ${firstName}, tudo bem? Aqui é o ${lead.seller_name || "consultor"} da Delski.`
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
              className="w-full max-w-full overflow-hidden box-border border border-border bg-card/60 dark:bg-card/30 rounded-xl shadow-xs flex flex-col min-h-[460px]"
            >
              {/* Header da Coluna */}
              <CardHeader className="p-3 border-b border-border/80 bg-muted/40 space-y-1">
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <CardTitle className="text-xs font-bold text-foreground truncate" title={stage.label}>
                    {stage.label}
                  </CardTitle>
                  <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 h-5 shrink-0 ${stage.badge}`}>
                    {stageLeads.length}
                  </Badge>
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground truncate">
                  {formatCurrency(stageTotal)}
                </div>
              </CardHeader>

              {/* Lista de Leads do Estágio */}
              <CardContent className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
                {stageLeads.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground text-center py-12 border border-dashed border-border rounded-lg bg-muted/20">
                    Vazio
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => handleCardClick(lead)}
                      className="w-full max-w-full overflow-hidden box-border rounded-xl border border-border bg-card p-3 space-y-2 shadow-xs hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
                    >
                      {/* Linha 1: Nome da Empresa/Lead + Temperatura + Quick WhatsApp no hover */}
                      <div className="flex items-center justify-between gap-1.5 min-w-0 w-full">
                        <span
                          className="font-bold text-xs text-foreground truncate flex-1"
                          title={lead.name}
                        >
                          {lead.name}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Quick WhatsApp hover icon */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 p-0"
                            onClick={(e) => handleQuickWhatsApp(e, lead)}
                            title="Abrir WhatsApp rápido"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>

                          {/* Temperatura Badge */}
                          {lead.temperature === "quente" && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              title="Lead Quente - Alta Intenção"
                            >
                              <Flame className="h-2.5 w-2.5 fill-rose-500/40 text-rose-500" /> Quente
                            </span>
                          )}
                          {lead.temperature === "morno" && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              title="Lead Morno - Em Avaliação"
                            >
                              <Zap className="h-2.5 w-2.5 fill-amber-500/40 text-amber-500" /> Morno
                            </span>
                          )}
                          {lead.temperature === "frio" && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400"
                              title="Lead Frio - Primeiro Contato"
                            >
                              <Snowflake className="h-2.5 w-2.5 text-slate-500" /> Frio
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Linha 2: Valor R$ em destaque + Nome do Responsável */}
                      <div className="flex items-baseline justify-between gap-2 min-w-0 w-full">
                        <span className="font-extrabold text-xs sm:text-sm text-foreground tabular-nums truncate">
                          {formatCurrency(lead.estimatedValue)}
                        </span>
                        <span
                          className="text-[10px] text-muted-foreground truncate max-w-[85px]"
                          title={lead.seller_name || "SDR"}
                        >
                          {lead.seller_name || "SDR"}
                        </span>
                      </div>

                      {/* Linha 3: 2 Badges pequenas e discretas (Serviço | Origem) */}
                      <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-medium py-0 px-1.5 bg-muted/40 truncate shrink-0 max-w-[100px]"
                        >
                          {lead.service}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.2 rounded truncate">
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
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Drawer Lateral com Detalhes e Ações Operacionais */}
      <LeadDetailsSheet
        lead={selectedLead}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onConvertLeadToSale={onConvertLeadToSale}
      />
    </div>
  );
}
