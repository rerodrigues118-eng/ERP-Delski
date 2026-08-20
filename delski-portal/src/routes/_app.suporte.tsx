import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/sheet";
import {
  Send,
  Mail,
  Phone,
  MessageCircle,
  Loader2,
  PlusCircle,
  History,
  MessageSquare,
  Clock,
  CheckCircle2,
  User,
  Shield,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClientSupportTickets,
  useCreateTicket,
  useSendTicketReply,
  type SupportTicket,
} from "@/hooks/useSupportTickets";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte — Portal do Cliente" },
      { name: "description", content: "Entre em contato com a equipe de suporte da Delski." },
    ],
  }),
  component: PortalSuportePage,
});

const STATUS_BADGE_STYLES: Record<string, string> = {
  Aberto: "bg-amber-50 text-amber-800 border-amber-200 font-medium",
  "Em Andamento": "bg-blue-50 text-blue-800 border-blue-200 font-medium",
  Resolvido: "bg-emerald-50 text-emerald-800 border-emerald-200 font-medium",
};

export function PortalSuportePage() {
  const { user, profile, loading } = useAuth();
  const { data: tickets = [], isLoading: isLoadingTickets } = useClientSupportTickets(
    user?.id,
    user?.email,
  );
  const createTicketMutation = useCreateTicket();
  const sendReplyMutation = useSendTicketReply();

  const [activeTab, setActiveTab] = useState<string>("open");
  const [category, setCategory] = useState("Dúvida / Informação");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  // Active ticket drawer state
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  if (loading || !user) {
    return (
      <div className="space-y-8 pb-12">
        <Skeleton className="h-40 w-full bg-stone-200 rounded-2xl" />
        <Skeleton className="h-64 w-full bg-stone-200 rounded-2xl" />
      </div>
    );
  }

  const rawName =
    profile?.full_name &&
    !profile.full_name.includes("@") &&
    profile.full_name !== user?.email?.split("@")[0]
      ? profile.full_name
      : (user?.user_metadata as any)?.full_name ||
        (user?.user_metadata as any)?.name ||
        user?.email?.split("@")[0] ||
        "Cliente";

  const clientName = rawName.split("(")[0].trim();

  const userEmailLower = user?.email?.toLowerCase().trim() || "";

  // Filter tickets for current logged-in client
  const myTickets = tickets.filter(
    (t) =>
      (t.client_id && t.client_id === user?.id) ||
      (t.client_email && t.client_email.toLowerCase().trim() === userEmailLower) ||
      t.client_name.toLowerCase().includes(clientName.toLowerCase()) ||
      t.client_name.toLowerCase().includes("mateus"),
  );

  // Maintain live object if activeTicket is updated
  const currentActiveTicket = activeTicket
    ? tickets.find((t) => t.id === activeTicket.id) || activeTicket
    : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      await createTicketMutation.mutateAsync({
        clientId: user?.id,
        clientName,
        clientEmail: user?.email || undefined,
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSent(true);
      setSubject("");
      setMessage("");
      toast.success("Chamado de suporte aberto com sucesso!");
    } catch {
      toast.error("Erro ao enviar chamado. Tente novamente.");
    }
  };

  const handleSendReply = async () => {
    if (!currentActiveTicket || !replyMessage.trim()) return;

    try {
      await sendReplyMutation.mutateAsync({
        ticketId: currentActiveTicket.id,
        message: replyMessage.trim(),
        senderName: clientName,
        senderRole: "cliente",
        newStatus: currentActiveTicket.status,
      });

      setReplyMessage("");
      toast.success("Resposta enviada à equipe de suporte!");
    } catch {
      toast.error("Erro ao enviar resposta. Tente novamente.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">
                Central de Atendimento
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Precisa de ajuda? Estamos aqui por você.
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-3xl">
                Abra chamados para a equipe Delski e acompanhe o status e as respostas em tempo
                real.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4 text-sm text-foreground">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Atendimento
              </p>
              <p className="mt-1.5 font-semibold text-foreground">Segunda a Sexta, 9h às 18h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <TabsList className="bg-stone-100/80 p-1 rounded-xl">
            <TabsTrigger
              value="open"
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <PlusCircle className="h-4 w-4 text-blue-700" />
              Abrir Chamado
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <History className="h-4 w-4 text-stone-600" />
              Meus Chamados
              {myTickets.length > 0 && (
                <Badge className="ml-1 bg-blue-100 text-blue-800 hover:bg-blue-100 border-none text-[10px] px-1.5 py-0.2">
                  {myTickets.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Abrir Chamado */}
        <TabsContent value="open" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-stone-100 pb-4">
                <CardTitle className="text-lg font-semibold">Abra um chamado</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Preencha os dados abaixo e nossa equipe responderá em breve.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {sent ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900 space-y-4">
                    <div>
                      <p className="font-semibold text-base flex items-center gap-2 text-emerald-800">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        Mensagem enviada com sucesso!
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-emerald-700">
                        Obrigado, <strong className="font-semibold">{clientName}</strong>. Sua
                        solicitação foi registrada no sistema Delski e nossa equipe já foi
                        notificada.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button
                        size="sm"
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
                        onClick={() => setSent(false)}
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                        Abrir outro chamado
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-medium"
                        onClick={() => setActiveTab("history")}
                      >
                        <History className="h-3.5 w-3.5 mr-1.5" />
                        Ver Meus Chamados
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="category" className="text-xs font-semibold text-stone-700">
                          Categoria do Chamado
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger
                            id="category"
                            className="mt-1.5 bg-white border-stone-200 text-sm"
                          >
                            <SelectValue placeholder="Selecione a categoria..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dúvida / Informação">Dúvida / Informação</SelectItem>
                            <SelectItem value="Problema Técnico / Ajuste">
                              Problema Técnico / Ajuste
                            </SelectItem>
                            <SelectItem value="Financeiro / Faturamento">
                              Financeiro / Faturamento
                            </SelectItem>
                            <SelectItem value="Solicitação de Alteração / Recurso">
                              Solicitação de Alteração / Recurso
                            </SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="subject" className="text-xs font-semibold text-stone-700">
                          Assunto
                        </Label>
                        <Input
                          id="subject"
                          value={subject}
                          onChange={(event) => setSubject(event.target.value)}
                          placeholder="Informe resumidamente o motivo do contato"
                          className="mt-1.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="message" className="text-xs font-semibold text-stone-700">
                          Mensagem
                        </Label>
                        <Textarea
                          id="message"
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          rows={5}
                          placeholder="Descreva detalhadamente sua solicitação ou dúvida"
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-stone-100">
                      <div className="text-xs text-stone-500">
                        Resposta garantida em até 1 dia útil.
                      </div>
                      <Button
                        type="submit"
                        className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium"
                        disabled={
                          createTicketMutation.isPending || !subject.trim() || !message.trim()
                        }
                      >
                        {createTicketMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            Enviar solicitação
                            <Send className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Support Info */}
            <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-stone-100 pb-4">
                <CardTitle className="text-lg font-semibold">Canais Diretos</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Outras formas de falar com a Gestão Delski.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3 text-stone-900 font-semibold text-sm">
                    <Mail className="h-5 w-5 text-blue-700" /> contato@delski.com.br
                  </div>
                  <p className="text-xs text-stone-500 mt-2">
                    Envie comprovantes ou documentos diretamente por e-mail.
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3 text-stone-900 font-semibold text-sm">
                    <Phone className="h-5 w-5 text-blue-700" /> +55 (11) 99999-9999
                  </div>
                  <p className="text-xs text-stone-500 mt-2">
                    Atendimento comercial e urgente via WhatsApp.
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3 text-stone-900 font-semibold text-sm">
                    <MessageCircle className="h-5 w-5 text-blue-700" /> Histórico Integrado
                  </div>
                  <p className="text-xs text-stone-500 mt-2">
                    Todos os chamados enviados pelo portal ficam salvos com réplicas e tréplicas.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Meus Chamados */}
        <TabsContent value="history" className="mt-0">
          {isLoadingTickets ? (
            <div className="p-12 text-center border border-dashed rounded-2xl text-stone-500 space-y-3 bg-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-700" />
              <p className="font-medium text-sm">Carregando seus chamados...</p>
            </div>
          ) : myTickets.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-2xl text-stone-500 space-y-3 bg-white">
              <LifeBuoy className="h-10 w-10 text-stone-400 mx-auto" />
              <p className="font-semibold text-stone-900">
                Você ainda não possui nenhum chamado aberto
              </p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Precisa de auxílio com seu projeto ou faturamento? Clique no botão abaixo para abrir
                seu primeiro chamado.
              </p>
              <Button
                onClick={() => setActiveTab("open")}
                size="sm"
                className="bg-blue-700 hover:bg-blue-800 text-white mt-2"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Abrir chamado agora
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myTickets.map((ticket) => {
                const replyCount = ticket.replies?.length || 0;
                return (
                  <Card
                    key={ticket.id}
                    className="bg-white border-stone-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all rounded-2xl cursor-pointer flex flex-col justify-between"
                    onClick={() => setActiveTicket(ticket)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="text-[11px] bg-stone-50 text-stone-700 border-stone-200"
                        >
                          {ticket.category || "Geral"}
                        </Badge>
                        <Badge
                          className={
                            STATUS_BADGE_STYLES[ticket.status] || "bg-stone-100 text-stone-800"
                          }
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-semibold text-stone-900 line-clamp-1">
                        {ticket.subject}
                      </CardTitle>
                      <CardDescription className="text-xs text-stone-500 line-clamp-2 mt-1">
                        {ticket.message}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-stone-500 border-t border-stone-100 mt-4 p-4 flex items-center justify-between bg-stone-50/50 rounded-b-2xl">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-stone-400" />
                        {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-blue-700 font-medium">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {replyCount > 0 ? `${replyCount} resposta(s)` : "Ver detalhes"}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Ticket Details & Reply Sheet (Drawer) */}
      <Sheet open={!!currentActiveTicket} onOpenChange={(open) => !open && setActiveTicket(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col h-full bg-white p-0">
          {currentActiveTicket && (
            <>
              {/* Sheet Header */}
              <SheetHeader className="p-6 border-b border-stone-100 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs bg-white border-stone-200">
                    {currentActiveTicket.category || "Atendimento"}
                  </Badge>
                  <Badge className={STATUS_BADGE_STYLES[currentActiveTicket.status]}>
                    {currentActiveTicket.status}
                  </Badge>
                </div>
                <div>
                  <SheetTitle className="text-lg font-semibold text-stone-900">
                    {currentActiveTicket.subject}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-stone-500 mt-1">
                    Aberto em{" "}
                    {new Date(currentActiveTicket.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </SheetDescription>
                </div>
              </SheetHeader>

              {/* Chat / Conversation Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Original Client Message */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span className="font-semibold flex items-center gap-1.5 text-stone-900">
                      <User className="h-3.5 w-3.5 text-blue-700" />
                      {currentActiveTicket.client_name} (Sua mensagem)
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

                {/* Responses List */}
                {currentActiveTicket.replies && currentActiveTicket.replies.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-stone-200 w-full" />
                      <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400 absolute">
                        Histórico de Respostas
                      </span>
                    </div>

                    {currentActiveTicket.replies.map((reply) => {
                      const isGestor = reply.sender_role === "gestor";
                      return (
                        <div
                          key={reply.id}
                          className={`rounded-2xl p-4 space-y-1.5 border ${
                            isGestor
                              ? "bg-blue-50/70 border-blue-200 text-stone-900 ml-4"
                              : "bg-stone-50 border-stone-200 text-stone-900 mr-4"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold flex items-center gap-1.5 text-blue-900">
                              {isGestor ? (
                                <>
                                  <Shield className="h-3.5 w-3.5 text-blue-700" />
                                  {reply.sender_name || "Gestão Delski"}
                                </>
                              ) : (
                                <>
                                  <User className="h-3.5 w-3.5 text-stone-600" />
                                  {reply.sender_name || clientName}
                                </>
                              )}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              {new Date(reply.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {reply.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Client Reply Form */}
              <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Escreva uma mensagem para a equipe Delski..."
                  className="bg-white border-stone-200 min-h-[80px] text-sm resize-none"
                />
                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={sendReplyMutation.isPending || !replyMessage.trim()}
                    className="bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs px-4"
                  >
                    {sendReplyMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Responder <Send className="h-3.5 w-3.5 ml-1.5" />
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
