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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 flex items-center gap-2.5">
            <LifeBuoy className="h-7 w-7 text-blue-700" />
            Central de Suporte & Atendimento
          </h1>
          <p className="text-sm text-stone-500 font-medium mt-1">
            Gerencie, responda e solucione os chamados abertos pelos clientes da Delski.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-stone-200 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Total de Chamados
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-stone-900">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
              Chamados Abertos
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-rose-600">{metrics.abertos}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Em Andamento
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-700">{metrics.emAndamento}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Resolvidos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-700">{metrics.resolvidos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Buscar por cliente, e-mail ou assunto do chamado..."
            className="pl-9 bg-white border-stone-200 text-sm focus-visible:ring-blue-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "Aberto", "Em Andamento", "Resolvido"].map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus(status)}
              className={
                selectedStatus === status
                  ? "bg-blue-900 text-white hover:bg-blue-950 rounded-md font-medium"
                  : "border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md font-medium"
              }
            >
              {status === "all" ? "Todos" : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Tickets List / Table */}
      {isLoading ? (
        <div className="p-12 text-center border border-dashed rounded-lg text-stone-500 space-y-3 bg-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-900" />
          <p className="font-medium text-sm">Carregando chamados de suporte...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-lg text-stone-500 space-y-3 bg-white">
          <LifeBuoy className="h-10 w-10 text-stone-400 mx-auto" />
          <p className="font-semibold text-stone-900">Nenhum chamado encontrado</p>
          <p className="text-xs text-stone-500">
            Tente ajustar a busca ou alterar o filtro de status.
          </p>
        </div>
      ) : (
        <Card className="bg-white border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Assunto</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-stone-50/80 transition-colors cursor-pointer"
                    onClick={() => setActiveTicket(ticket)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-stone-900">{ticket.client_name}</div>
                      {ticket.client_email && (
                        <div className="text-xs text-stone-500 font-normal">
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
                      {new Date(ticket.created_at).toLocaleDateString("pt-BR", {
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
        </Card>
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
                      {new Date(currentActiveTicket.created_at).toLocaleTimeString("pt-BR", {
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
                            {new Date(reply.created_at).toLocaleTimeString("pt-BR", {
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
