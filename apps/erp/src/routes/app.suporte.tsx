import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  LifeBuoy,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  User,
  Mail,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useSupportTickets,
  useSendTicketReply,
  useUpdateTicketStatus,
  type SupportTicket,
  type TicketStatus,
} from "@/hooks/useSupportTickets";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/app/suporte")({
  head: () => ({
    meta: [{ title: "Gestão de Suporte — Delski ERP" }],
  }),
  component: SupportPage,
});

const STATUS_BADGE_STYLES: Record<TicketStatus, string> = {
  Aberto: "bg-rose-100 text-rose-800 border-rose-300 font-bold text-xs",
  "Em Andamento": "bg-blue-100 text-blue-800 border-blue-300 font-bold text-xs",
  Resolvido: "bg-green-100 text-green-800 border-green-300 font-bold text-xs",
};

function SupportPage() {
  const { data: tickets = [], isLoading } = useSupportTickets();
  const sendReplyMutation = useSendTicketReply();
  const updateStatusMutation = useUpdateTicketStatus();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  // Sync active ticket data when tickets mutate
  const currentActiveTicket = useMemo(() => {
    if (!activeTicket) return null;
    return tickets.find((t) => t.id === activeTicket.id) || activeTicket;
  }, [tickets, activeTicket]);

  // Metrics
  const metrics = useMemo(() => {
    const total = tickets.length;
    const abertos = tickets.filter((t) => t.status === "Aberto").length;
    const emAndamento = tickets.filter((t) => t.status === "Em Andamento").length;
    const resolvidos = tickets.filter((t) => t.status === "Resolvido").length;
    return { total, abertos, emAndamento, resolvidos };
  }, [tickets]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus = selectedStatus === "all" || t.status === selectedStatus;
      const term = search.toLowerCase();
      const matchesSearch =
        !search ||
        t.client_name.toLowerCase().includes(term) ||
        (t.client_email && t.client_email.toLowerCase().includes(term)) ||
        t.subject.toLowerCase().includes(term) ||
        t.message.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [tickets, selectedStatus, search]);

  const handleSendReply = async () => {
    if (!currentActiveTicket) return;
    if (!replyMessage.trim()) {
      return toast.error("Por favor, digite uma mensagem para enviar.");
    }

    try {
      await sendReplyMutation.mutateAsync({
        ticketId: currentActiveTicket.id,
        message: replyMessage.trim(),
        newStatus:
          currentActiveTicket.status === "Aberto" ? "Em Andamento" : currentActiveTicket.status,
      });
      toast.success("Resposta enviada com sucesso ao cliente!");
      setReplyMessage("");
    } catch {
      toast.error("Erro ao enviar resposta. Tente novamente.");
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!currentActiveTicket) return;
    try {
      await updateStatusMutation.mutateAsync({
        ticketId: currentActiveTicket.id,
        status: newStatus,
      });
      toast.success(`Status do chamado alterado para "${newStatus}".`);
    } catch {
      toast.error("Erro ao alterar o status do chamado.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="section-label mb-1">Atendimento ao Cliente</p>
          <h1 className="page-title">Central de Suporte</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie e responda os chamados abertos pelos clientes.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Total</span>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50">
              <MessageSquare className="h-4 w-4 text-gray-500" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value">{metrics.total}</div>
          <p className="text-xs text-gray-400 mt-1.5">Chamados registrados</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Abertos</span>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-500" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-red-600">{metrics.abertos}</div>
          <p className="text-xs text-gray-400 mt-1.5">Aguardando resposta</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Em Andamento</span>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-blue-700">{metrics.emAndamento}</div>
          <p className="text-xs text-gray-400 mt-1.5">Em atendimento</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Resolvidos</span>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-green-700">{metrics.resolvidos}</div>
          <p className="text-xs text-gray-400 mt-1.5">Concluídos</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card rounded-2xl border border-border p-3 shadow-subtle">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, e-mail ou assunto..."
            className="pl-9 bg-muted/50 border-border text-sm rounded-xl h-9 focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "Aberto", "Em Andamento", "Resolvido"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === status
                  ? status === "Aberto"
                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                    : status === "Em Andamento"
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : status === "Resolvido"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "btn-gradient text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {status === "all" ? "Todos" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List / Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Carregando chamados de suporte...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <LifeBuoy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">Nenhum chamado encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Tente ajustar a busca ou filtro de status.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Categoria</th>
                  <th>Assunto</th>
                  <th>Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-accent/40 transition-colors cursor-pointer"
                    onClick={() => setActiveTicket(ticket)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{ticket.client_name}</div>
                      {ticket.client_email && (
                        <div className="text-xs text-muted-foreground font-normal">
                          {ticket.client_email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant="outline"
                        className="text-[11px] bg-stone-50 text-stone-700 border-stone-200 font-medium"
                      >
                        {ticket.category || "Dúvida / Informação"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-stone-800 max-w-xs truncate">
                      {ticket.subject}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-500 font-medium">
                      {formatDate(ticket.created_at, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={
                          STATUS_BADGE_STYLES[ticket.status] || "bg-stone-100 text-stone-800"
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTicket(ticket);
                        }}
                        className="h-8 text-xs border-stone-200 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300 font-medium"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> Atender
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Details & Reply Sheet (Drawer) */}
      <Sheet open={!!currentActiveTicket} onOpenChange={(open) => !open && setActiveTicket(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col h-full bg-white p-0">
          {currentActiveTicket && (
            <>
              {/* Sheet Header */}
              <SheetHeader className="p-6 border-b border-stone-100 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge className={STATUS_BADGE_STYLES[currentActiveTicket.status]}>
                    {currentActiveTicket.status}
                  </Badge>
                  <span className="text-xs text-stone-400 font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(currentActiveTicket.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold text-stone-900 leading-tight">
                    {currentActiveTicket.subject}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-stone-400" />
                    <span className="font-semibold text-stone-700">
                      {currentActiveTicket.client_name}
                    </span>
                    {currentActiveTicket.client_email && (
                      <span className="text-stone-400">({currentActiveTicket.client_email})</span>
                    )}
                  </SheetDescription>
                </div>

                {/* Status Change Selector */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <span className="text-xs font-semibold text-stone-600">Alterar Status:</span>
                  <Select
                    value={currentActiveTicket.status}
                    onValueChange={(val) => handleStatusChange(val as TicketStatus)}
                  >
                    <SelectTrigger className="h-8 text-xs w-40 bg-white border-stone-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aberto">Aberto</SelectItem>
                      <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                      <SelectItem value="Resolvido">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </SheetHeader>

              {/* Chat Thread / Messages Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/30">
                {/* Original Client Message */}
                <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-100 pb-2">
                    <span className="font-bold text-stone-900 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-blue-700" />
                      {currentActiveTicket.client_name} (Cliente)
                    </span>
                    <span>
                      {formatDate(currentActiveTicket.created_at, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
                    {currentActiveTicket.message}
                  </p>
                </div>

                {/* Previous Replies */}
                {currentActiveTicket.replies && currentActiveTicket.replies.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 px-1">
                      Histórico de Respostas
                    </p>
                    {currentActiveTicket.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`border rounded-lg p-4 shadow-xs space-y-1.5 ${
                          reply.sender_role === "gestor"
                            ? "bg-blue-50/60 border-blue-200 ml-4"
                            : "bg-white border-stone-200 mr-4"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-stone-500 border-b border-blue-100/50 pb-1.5">
                          <span className="font-bold text-blue-900">{reply.sender_name}</span>
                          <span>
                            {formatDate(reply.created_at, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Form Footer */}
              <div className="p-4 border-t border-stone-200 bg-white space-y-3">
                <Textarea
                  placeholder="Escreva a resposta para o cliente..."
                  className="min-h-[90px] text-sm bg-white border-stone-200 focus-visible:ring-blue-900 resize-none"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400">
                    Ao responder, o chamado irá para &quot;Em Andamento&quot;.
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={sendReplyMutation.isPending || !replyMessage.trim()}
                    className="bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white font-medium shadow-sm h-9 px-4"
                  >
                    {sendReplyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1.5" /> Enviar Resposta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
