import { useState, useMemo, useCallback } from "react";
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
} from "@/types/crm";
import { useCrmLeads, useUpdateCrmLeadStage } from "@/hooks/useCrmLeads";
import { LeadDetailsSheet } from "./LeadDetailsSheet";
import {
  Search,
  MessageSquare,
  Flame,
  Zap,
  Snowflake,
  User,
} from "lucide-react";
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

interface CrmKanbanProps {
  onConvertLeadToSale: (lead: CrmLead) => void;
}

const STAGES: { id: CrmLeadStage; label: string; badge: string; border: string }[] = [
  {
    id: "novo_lead",
    label: "Novo Lead / Sem Contato",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
    border: "border-t-blue-500",
  },
  {
    id: "qualificacao",
    label: "Em Qualificação (SDR)",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
    border: "border-t-amber-500",
  },
  {
    id: "reuniao",
    label: "Reunião Agendada",
    badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    border: "border-t-indigo-500",
  },
  {
    id: "proposta",
    label: "Proposta Enviada",
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
    border: "border-t-purple-500",
  },
  {
    id: "fechado",
    label: "Fechado / Ganho",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    border: "border-t-emerald-500",
  },
  {
    id: "perdido",
    label: "Perdido",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
    border: "border-t-rose-500",
  },
];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
};

/* ── Card do Lead Arrastável com DnD Kit ─────────────────────── */
function DraggableLeadCard({
  lead,
  onClick,
  onQuickWhatsApp,
}: {
  lead: CrmLead;
  onClick: () => void;
  onQuickWhatsApp: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`w-full rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs transition-all cursor-grab active:cursor-grabbing group select-none ${
        isDragging
          ? "opacity-30 shadow-2xl scale-105 border-primary"
          : "hover:border-primary/50 hover:shadow-md"
      }`}
    >
      {/* Linha 1: Serviço Badge + Temperatura + Quick WhatsApp */}
      <div className="flex items-center justify-between gap-2 w-full">
        <Badge
          variant="secondary"
          className="text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20 truncate max-w-[170px]"
        >
          {lead.service}
        </Badge>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick WhatsApp button (pointer-events-auto to handle click) */}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 p-0 rounded-full"
            onClick={onQuickWhatsApp}
            title="Abrir WhatsApp rápido"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>

          {/* Temperatura Badge */}
          {lead.temperature === "quente" && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              title="Lead Quente - Alta Intenção"
            >
              <Flame className="h-3 w-3 fill-rose-500/40 text-rose-500" /> Quente
            </span>
          )}
          {lead.temperature === "morno" && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              title="Lead Morno - Em Avaliação"
            >
              <Zap className="h-3 w-3 fill-amber-500/40 text-amber-500" /> Morno
            </span>
          )}
          {lead.temperature === "frio" && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
              title="Lead Frio - Primeiro Contato"
            >
              <Snowflake className="h-3 w-3 text-slate-500" /> Frio
            </span>
          )}
        </div>
      </div>

      {/* Linha 2: Nome do Lead / Empresa em destaque */}
      <div>
        <h4
          className="font-bold text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors"
          title={lead.name}
        >
          {lead.name}
        </h4>
      </div>

      {/* Linha 3: Responsável / Closer & Contato */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
        <div className="flex items-center gap-1.5 truncate max-w-[180px]" title={lead.seller_name || "SDR"}>
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{lead.seller_name || "SDR Responsável"}</span>
        </div>
        {lead.contact && (
          <span className="text-[11px] text-muted-foreground truncate max-w-[100px]" title={lead.contact}>
            {lead.contact}
          </span>
        )}
      </div>

      {/* Linha 4: Valor R$ em destaque + Origem/Canal */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
        <span className="text-base sm:text-lg font-extrabold text-foreground tabular-nums tracking-tight">
          {formatCurrency(lead.estimatedValue)}
        </span>
        <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md font-medium shrink-0">
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
  );
}

/* ── Coluna Droppable do Kanban ───────────────────────────────── */
function KanbanColumn({
  stage,
  leads,
  stageTotal,
  onCardClick,
  onQuickWhatsApp,
}: {
  stage: (typeof STAGES)[number];
  leads: CrmLead[];
  stageTotal: number;
  onCardClick: (lead: CrmLead) => void;
  onQuickWhatsApp: (e: React.MouseEvent, lead: CrmLead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <Card
      ref={setNodeRef}
      className={`w-[320px] min-w-[320px] shrink-0 border border-border ${stage.border} border-t-4 bg-card/70 dark:bg-card/40 rounded-2xl shadow-xs flex flex-col min-h-[520px] transition-all ${
        isOver ? "ring-2 ring-primary/40 bg-accent/30 scale-[1.01]" : ""
      }`}
    >
      {/* Header da Coluna */}
      <CardHeader className="p-4 border-b border-border/80 bg-muted/40 space-y-1.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <CardTitle className="text-sm font-bold text-foreground truncate" title={stage.label}>
            {stage.label}
          </CardTitle>
          <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 h-6 rounded-full shrink-0 bg-muted/80 text-muted-foreground border-border/80">
            {leads.length}
          </Badge>
        </div>
        <div className="text-xs font-semibold text-muted-foreground tracking-tight">
          Total: <span className="font-bold text-foreground">{formatCurrency(stageTotal)}</span>
        </div>
      </CardHeader>

      {/* Lista de Leads do Estágio */}
      <CardContent className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[640px]">
        {leads.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-16 border-2 border-dashed border-border/80 rounded-xl bg-muted/20">
            Arraste um lead para cá
          </div>
        ) : (
          leads.map((lead) => (
            <DraggableLeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onCardClick(lead)}
              onQuickWhatsApp={(e) => onQuickWhatsApp(e, lead)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function CrmKanban({ onConvertLeadToSale }: CrmKanbanProps) {
  const { data: leads = [], isLoading } = useCrmLeads();
  const updateStageMutation = useUpdateCrmLeadStage();

  const [searchTerm, setSearchTerm] = useState("");
  const [temperatureFilter, setTemperatureFilter] = useState<string>("all");

  // Estado de Drag and Drop
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);

  // Estado do Drawer de Detalhes
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimento para iniciar o arraste, permitindo cliques normais
      },
    })
  );

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

  const handleCardClick = useCallback((lead: CrmLead) => {
    setSelectedLead(lead);
    setIsDetailsOpen(true);
  }, []);

  const handleQuickWhatsApp = useCallback((e: React.MouseEvent, lead: CrmLead) => {
    e.stopPropagation();
    const rawNumber = (lead.phone || lead.contact || "").replace(/\D/g, "");
    if (!rawNumber) return;
    const cleanPhone = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    const firstName = lead.name.split(" ")[0];
    const greeting = encodeURIComponent(
      `Olá ${firstName}, tudo bem? Aqui é o ${lead.seller_name || "consultor"} da Delski.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${greeting}`, "_blank");
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) {
      setActiveLead(lead);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = String(active.id);
    const overId = String(over.id);

    // Identificar a etapa de destino
    let targetStage: CrmLeadStage | undefined;
    if (STAGES.some((s) => s.id === overId)) {
      targetStage = overId as CrmLeadStage;
    } else {
      const targetLead = leads.find((l) => l.id === overId);
      if (targetLead) {
        targetStage = targetLead.stage;
      }
    }

    const currentLead = leads.find((l) => l.id === leadId);
    if (currentLead && targetStage && targetStage !== currentLead.stage) {
      try {
        await updateStageMutation.mutateAsync({
          id: leadId,
          stage: targetStage,
        });
        const stageLabel = STAGES.find((s) => s.id === targetStage)?.label || targetStage;
        toast.success(`Lead movido para "${stageLabel}"`);
      } catch (err) {
        toast.error("Erro ao atualizar etapa do lead.");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros rápidos do CRM */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3.5 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por lead, empresa, contato ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
            <SelectTrigger className="h-10 text-xs w-[170px] rounded-xl">
              <SelectValue placeholder="Temperatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Temperaturas</SelectItem>
              <SelectItem value="quente">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
                  <span>Quente</span>
                </div>
              </SelectItem>
              <SelectItem value="morno">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                  <span>Morno</span>
                </div>
              </SelectItem>
              <SelectItem value="frio">
                <div className="flex items-center gap-1.5">
                  <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                  <span>Frio</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DndContext para Arrastar e Soltar */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4.5 overflow-x-auto pb-6 pt-1 items-start scrollbar-thin">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
            const stageTotal = stageLeads.reduce(
              (acc, l) => acc + (Number(l.estimatedValue) || 0),
              0
            );

            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={stageLeads}
                stageTotal={stageTotal}
                onCardClick={handleCardClick}
                onQuickWhatsApp={handleQuickWhatsApp}
              />
            );
          })}
        </div>

        {/* Drag Overlay para feedback visual durante o arraste */}
        {activeLead && (
          <DragOverlay>
            <div className="w-[310px] rounded-2xl border-2 border-primary bg-card p-4 space-y-3 shadow-2xl opacity-95 pointer-events-none scale-105">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary">
                  {activeLead.service}
                </Badge>
                <span className="text-xs font-bold text-foreground">
                  {formatCurrency(activeLead.estimatedValue)}
                </span>
              </div>
              <h4 className="font-bold text-base text-foreground line-clamp-2">
                {activeLead.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                Arraste para soltar na etapa desejada
              </p>
            </div>
          </DragOverlay>
        )}
      </DndContext>

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
