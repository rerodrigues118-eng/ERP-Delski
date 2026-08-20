import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Clock,
  AlertTriangle,
  Send,
  Trash2,
  CheckCircle2,
  ExternalLink,
  LifeBuoy,
  FileText,
  DollarSign,
  TrendingDown,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  RefreshCw,
  Plus,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFreelancers, useProfiles } from "@/hooks/useProfiles";
import { useProjects } from "@/hooks/useProjects";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { supabase } from "@/integrations/supabase/client";
import {
  useManualNotifications,
  useNotifications,
  useSendManualNotification,
  useDeleteNotification,
  useClearAllNotifications,
  type NotificationRow,
} from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Central de Notificações & Alertas Inteligentes — DELSKI CLOUD" },
      {
        name: "description",
        content: "Feed de Alertas Inteligentes e Logs Operacionais do Gestor.",
      },
    ],
  }),
  component: NotificationsPage,
});

type CategoryFilter =
  | "all"
  | "prazos"
  | "inatividade"
  | "financeiro"
  | "sac"
  | "margem"
  | "manual";

const money = (n: number) =>
  `R$\u00A0${(n || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function NotificationsPage() {
  const { user, isGestor, isFreelancer } = useAuth();
  const { data: dbProjects = [] } = useProjects();
  const { data: freelancers = [] } = useFreelancers();
  const { data: profiles = [] } = useProfiles();
  const { data: tickets = [] } = useSupportTickets();
  const { data: inbox = [], refetch: refetchNotifications } = useNotifications(user?.id);
  const { data: sent = [] } = useManualNotifications(user?.id);

  const sendManualNotification = useSendManualNotification();
  const deleteNotification = useDeleteNotification();
  const clearAllNotifications = useClearAllNotifications();

  const [filterCategory, setFilterCategory] = useState<CategoryFilter>("all");
  const [showSendModal, setShowSendModal] = useState(false);
  const [recipientMode, setRecipientMode] = useState<"all" | "specific">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const recipientOptions = useMemo(() => freelancers.map((f) => f.id), [freelancers]);

  // ── Smart Alert Triggers & Anti-Duplication Engine ────────────────────────
  useEffect(() => {
    if (!isGestor || !user?.id || !dbProjects.length) return;

    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);

    const insertSmartAlerts = async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Fetch notifications created today to prevent duplicate alerts
        const { data: todayNotifications } = await supabase
          .from("notifications")
          .select("id, title, message, created_at")
          .eq("user_id", user.id)
          .eq("type", "alerta")
          .gte("created_at", startOfDay.toISOString());

        const existingMessages = new Set((todayNotifications ?? []).map((n) => n.message));

        const alertsToCreate: Array<{
          user_id: string;
          title: string;
          message: string;
          type: "alerta";
          read: boolean;
          created_by: null;
        }> = [];

        // 1. 🚨 Gatilho: Atraso de Prazos (Deadline ultrapassada sem conclusão)
        for (const project of dbProjects) {
          if (!project.deadline) continue;
          if (project.status === "Concluido" || project.status === "Cancelado") continue;

          const dueTime = new Date(project.deadline).getTime();
          if (dueTime < now) {
            const formattedDeadline = new Date(project.deadline).toLocaleDateString("pt-BR");
            const msg = `[PRAZO_VENCIDO] O projeto "${project.title}" ultrapassou o prazo de entrega estipulado (${formattedDeadline}). [ID:${project.id}]`;
            if (!existingMessages.has(msg)) {
              alertsToCreate.push({
                user_id: user.id,
                title: "🚨 Atraso de Prazo: Projeto Vencido",
                message: msg,
                type: "alerta",
                read: false,
                created_by: null,
              });
              existingMessages.add(msg);
            }
          }
        }

        // 2. ⏱️ Gatilho: Inatividade de Projetos (Sem movimentação há mais de 7 dias)
        for (const project of dbProjects) {
          if (project.status === "Concluido" || project.status === "Cancelado") continue;
          const lastActivity = new Date(project.updated_at || project.created_at).getTime();
          const inactiveDays = Math.floor((now - lastActivity) / 86_400_000);

          if (inactiveDays >= 7) {
            const msg = `[INATIVIDADE_7D] O projeto "${project.title}" está sem atualizações de status há ${inactiveDays} dias. [ID:${project.id}]`;
            if (!existingMessages.has(msg)) {
              alertsToCreate.push({
                user_id: user.id,
                title: "⏱️ Inatividade: Projeto sem Atualização há 7+ Dias",
                message: msg,
                type: "alerta",
                read: false,
                created_by: null,
              });
              existingMessages.add(msg);
            }
          }
        }

        // 3. 📊 Gatilho: Alerta de Margem Crítica (< 30%)
        for (const project of dbProjects) {
          if (project.status === "Cancelado") continue;
          const budget = Number(project.budget || 0);
          const cogs = Number(project.cogs || 0);

          if (budget > 0) {
            const grossMargin = (budget - cogs) / budget;
            if (grossMargin < 0.3) {
              const marginPct = (grossMargin * 100).toFixed(1);
              const msg = `[MARGEM_CRITICA] O projeto "${project.title}" possui margem líquida crítica de ${marginPct}% (Orçamento: ${money(budget)}, Custos: ${money(cogs)}). [ID:${project.id}]`;
              if (!existingMessages.has(msg)) {
                alertsToCreate.push({
                  user_id: user.id,
                  title: "📊 Margem Crítica: Projeto abaixo de 30%",
                  message: msg,
                  type: "alerta",
                  read: false,
                  created_by: null,
                });
                existingMessages.add(msg);
              }
            }
          }
        }

        // 4. 📩 Gatilho: Abertura de Chamado SAC (Tickets com status "Aberto")
        for (const ticket of tickets) {
          if (ticket.status === "Aberto") {
            const msg = `[SAC_NOVO] O cliente "${ticket.client_name}" abriu o chamado de suporte: "${ticket.subject}". [TICKET:${ticket.id}]`;
            if (!existingMessages.has(msg)) {
              alertsToCreate.push({
                user_id: user.id,
                title: "📩 Novo Chamado SAC / Central de Atendimento",
                message: msg,
                type: "alerta",
                read: false,
                created_by: null,
              });
              existingMessages.add(msg);
            }
          }
        }

        // 5. 📑 Gatilho: Faturas & Repasses Pendentes nos próximos 3 dias
        try {
          const { data: pendingInvoices } = await supabase
            .from("freelancer_invoices")
            .select("id, amount, due_date, status, provider_name, project_title")
            .eq("status", "Pendente");

          if (pendingInvoices && pendingInvoices.length > 0) {
            for (const inv of pendingInvoices) {
              if (!inv.due_date) continue;
              const dueTime = new Date(inv.due_date).getTime();
              const diffDays = Math.ceil((dueTime - now) / 86_400_000);

              if (diffDays >= 0 && diffDays <= 3) {
                const formattedDate = new Date(inv.due_date).toLocaleDateString("pt-BR");
                const msg = `[REPASSE_PENDENTE] Repasse para ${inv.provider_name || "Prestador"} no valor de ${money(inv.amount || 0)} vence em ${formattedDate} (${diffDays === 0 ? "Hoje" : `em ${diffDays} dias`}). [INV:${inv.id}]`;
                if (!existingMessages.has(msg)) {
                  alertsToCreate.push({
                    user_id: user.id,
                    title: "📑 Repasse a Vencer nos Próximos 3 Dias",
                    message: msg,
                    type: "alerta",
                    read: false,
                    created_by: null,
                  });
                  existingMessages.add(msg);
                }
              }
            }
          }
        } catch (e) {}

        // 6. 💰 Gatilho: Movimentações Financeiras recentes (NFS-e Emitidas nas últimas 24h)
        try {
          const yesterday = new Date(now - 86_400_000).toISOString();
          const { data: recentNfse } = await supabase
            .from("emitted_service_invoices")
            .select("id, invoice_number, total_amount, client_name, created_at")
            .gte("created_at", yesterday);

          if (recentNfse && recentNfse.length > 0) {
            for (const nf of recentNfse) {
              const msg = `[NFSE_EMITIDA] Nova NFS-e nº ${nf.invoice_number || "S/N"} emitida para ${nf.client_name || "Cliente"} no valor de ${money(nf.total_amount || 0)}. [NF:${nf.id}]`;
              if (!existingMessages.has(msg)) {
                alertsToCreate.push({
                  user_id: user.id,
                  title: "💰 NFS-e Emitida com Sucesso",
                  message: msg,
                  type: "alerta",
                  read: false,
                  created_by: null,
                });
                existingMessages.add(msg);
              }
            }
          }
        } catch (e) {}

        // Batch insert alerts with anti-duplication safety
        if (alertsToCreate.length > 0) {
          await supabase.from("notifications").insert(alertsToCreate);
          refetchNotifications();
        }
      } catch (err) {
        console.warn("Erro ao gerar alertas automáticos:", err);
      }
    };

    insertSmartAlerts();
  }, [isGestor, user?.id, dbProjects, tickets]);

  // Classification helper for notifications
  const parseAlertData = (n: NotificationRow) => {
    const rawMsg = n.message || "";
    const rawTitle = n.title || "";

    let category: CategoryFilter = "manual";
    let projectId: string | null = null;
    let ticketId: string | null = null;
    let badgeLabel = "Comunicado";
    let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
    let icon = Bell;
    let actionLink: string | null = null;
    let actionLabel = "Ver Detalhes";

    // Extract project ID if present: [ID:xxx]
    const projMatch = rawMsg.match(/\[ID:([^\]]+)\]/);
    if (projMatch) projectId = projMatch[1];

    // Extract ticket ID if present: [TICKET:xxx]
    const ticketMatch = rawMsg.match(/\[TICKET:([^\]]+)\]/);
    if (ticketMatch) ticketId = ticketMatch[1];

    if (rawMsg.includes("[PRAZO_VENCIDO]") || rawTitle.includes("Atraso de Prazo") || rawTitle.includes("Prazo")) {
      category = "prazos";
      badgeLabel = "🚨 Prazo Vencido";
      badgeColor = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400";
      icon = AlertCircle;
      actionLink = projectId ? `/app/projects/${projectId}` : "/app/projects";
      actionLabel = "Abrir Projeto";
    } else if (rawMsg.includes("[INATIVIDADE_7D]") || rawTitle.includes("Inatividade") || rawTitle.includes("7 dias")) {
      category = "inatividade";
      badgeLabel = "⏱️ Inatividade (7d+)";
      badgeColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400";
      icon = Clock;
      actionLink = projectId ? `/app/projects/${projectId}` : "/app/projects";
      actionLabel = "Revisar Projeto";
    } else if (rawMsg.includes("[MARGEM_CRITICA]") || rawTitle.includes("Margem")) {
      category = "margem";
      badgeLabel = "📊 Margem Crítica (<30%)";
      badgeColor = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400";
      icon = TrendingDown;
      actionLink = projectId ? `/app/projects/${projectId}` : "/app/finance";
      actionLabel = "Auditar Custos";
    } else if (rawMsg.includes("[SAC_NOVO]") || rawTitle.includes("SAC") || rawTitle.includes("Chamado")) {
      category = "sac";
      badgeLabel = "📩 SAC / Suporte";
      badgeColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400";
      icon = LifeBuoy;
      actionLink = "/app/suporte";
      actionLabel = "Atender Chamado";
    } else if (rawMsg.includes("[REPASSE_PENDENTE]") || rawMsg.includes("[NFSE_EMITIDA]") || rawTitle.includes("NFS-e") || rawTitle.includes("Repasse") || rawTitle.includes("Despesa")) {
      category = "financeiro";
      badgeLabel = "💰 Movimentação Financeira";
      badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400";
      icon = DollarSign;
      actionLink = "/app/finance";
      actionLabel = "Abrir Financeiro";
    } else {
      category = "manual";
      badgeLabel = n.type === "manual" ? "📤 Comunicado" : "ℹ️ Sistema";
      badgeColor = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300";
      icon = Bell;
    }

    // Clean brackets from display message
    const cleanMessage = rawMsg
      .replace(/\[PRAZO_VENCIDO\]\s*/g, "")
      .replace(/\[INATIVIDADE_7D\]\s*/g, "")
      .replace(/\[MARGEM_CRITICA\]\s*/g, "")
      .replace(/\[SAC_NOVO\]\s*/g, "")
      .replace(/\[REPASSE_PENDENTE\]\s*/g, "")
      .replace(/\[NFSE_EMITIDA\]\s*/g, "")
      .replace(/\[ID:[^\]]+\]/g, "")
      .replace(/\[TICKET:[^\]]+\]/g, "")
      .replace(/\[INV:[^\]]+\]/g, "")
      .replace(/\[NF:[^\]]+\]/g, "")
      .trim();

    return {
      category,
      badgeLabel,
      badgeColor,
      icon,
      cleanMessage,
      actionLink,
      actionLabel,
    };
  };

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    if (filterCategory === "all") return inbox;
    return inbox.filter((n) => {
      const { category } = parseAlertData(n);
      return category === filterCategory;
    });
  }, [inbox, filterCategory]);

  // Dynamic counts for category tabs
  const counts = useMemo(() => {
    const total = inbox.length;
    let prazos = 0;
    let inatividade = 0;
    let financeiro = 0;
    let sac = 0;
    let margem = 0;
    let manual = 0;

    inbox.forEach((n) => {
      const { category } = parseAlertData(n);
      if (category === "prazos") prazos++;
      else if (category === "inatividade") inatividade++;
      else if (category === "financeiro") financeiro++;
      else if (category === "sac") sac++;
      else if (category === "margem") margem++;
      else if (category === "manual") manual++;
    });

    return { total, prazos, inatividade, financeiro, sac, margem, manual };
  }, [inbox]);

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Informe título e mensagem.");
      return;
    }

    const recipients = recipientMode === "all" ? recipientOptions : selectedRecipients;
    if (!recipients.length) {
      toast.error("Nenhum destinatário selecionado.");
      return;
    }

    await sendManualNotification.mutateAsync({
      recipients,
      title,
      message,
      createdBy: user?.id || "",
    });

    setTitle("");
    setMessage("");
    setSelectedRecipients([]);
    setShowSendModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ── 1. Hero Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-slate-900 dark:text-white" />
            Central de Alertas & Notificações
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Feed operacional com monitoramento de prazos, inatividade, movimentações financeiras e chamados SAC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {inbox.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearAllNotifications.mutate(user?.id)}
              disabled={clearAllNotifications.isPending}
              className="text-xs font-semibold border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 gap-1.5 rounded-xl h-9"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              Limpar Feed
            </Button>
          )}

          {isGestor && (
            <Button
              size="sm"
              onClick={() => setShowSendModal(!showSendModal)}
              className="text-xs font-semibold bg-slate-900 hover:bg-black text-white gap-1.5 rounded-xl h-9 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Comunicado
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. KPI HUD Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setFilterCategory("all")}
          className={`cursor-pointer border rounded-2xl p-4 transition-all ${
            filterCategory === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium opacity-80">
            <span>Total</span>
            <Bell className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-bold mt-1">{counts.total}</p>
          <p className="text-[11px] opacity-70 mt-0.5">Todos os registros</p>
        </div>

        <div
          onClick={() => setFilterCategory("prazos")}
          className={`cursor-pointer border rounded-2xl p-4 transition-all ${
            filterCategory === "prazos"
              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
              : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium opacity-80">
            <span>Prazos</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">{counts.prazos}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Entregas vencidas</p>
        </div>

        <div
          onClick={() => setFilterCategory("inatividade")}
          className={`cursor-pointer border rounded-2xl p-4 transition-all ${
            filterCategory === "inatividade"
              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
              : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium opacity-80">
            <span>Inatividade</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{counts.inatividade}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">7+ dias sem update</p>
        </div>

        <div
          onClick={() => setFilterCategory("margem")}
          className={`cursor-pointer border rounded-2xl p-4 transition-all ${
            filterCategory === "margem"
              ? "bg-orange-600 text-white border-orange-600 shadow-sm"
              : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white hover:border-orange-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium opacity-80">
            <span>Margem</span>
            <TrendingDown className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">{counts.margem}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Margem &lt; 30%</p>
        </div>

        <div
          onClick={() => setFilterCategory("sac")}
          className={`cursor-pointer border rounded-2xl p-4 transition-all ${
            filterCategory === "sac"
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium opacity-80">
            <span>SAC</span>
            <LifeBuoy className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{counts.sac}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Chamados abertos</p>
        </div>

        <div
          onClick={() => setFilterCategory("financeiro")}
          className={`cursor-pointer border rounded-2xl p-4 transition-all ${
            filterCategory === "financeiro"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium opacity-80">
            <span>Financeiro</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{counts.financeiro}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Faturas & Repasses</p>
        </div>
      </div>

      {/* ── 3. Modal / Card Recolhível: Envio Manual de Comunicado ────── */}
      <AnimatePresence>
        {showSendModal && isGestor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                    Emitir Comunicado aos Prestadores / Freelancers
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dispare comunicados instantâneos para toda a rede ou prestadores específicos.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSendModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Fechar
                </Button>
              </div>

              <form onSubmit={handleSendManual} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Destinatários
                    </Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setRecipientMode("all"); setSelectedRecipients([]); }}
                        className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                          recipientMode === "all"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        Todos os Freelancers ({freelancers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipientMode("specific")}
                        className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                          recipientMode === "specific"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        Selecionar Específicos
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Título do Comunicado
                    </Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Atualização de Diretrizes de Entrega"
                      className="h-9.5 text-xs rounded-xl bg-slate-50/50"
                      required
                    />
                  </div>
                </div>

                {recipientMode === "specific" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Escolha os Prestadores
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                      {freelancers.map((f) => (
                        <label
                          key={f.id}
                          className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer p-1.5 rounded-lg hover:bg-white transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(f.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecipients((prev) => [...prev, f.id]);
                              } else {
                                setSelectedRecipients((prev) => prev.filter((id) => id !== f.id));
                              }
                            }}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="truncate">{f.full_name || f.email}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Mensagem
                  </Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escreva as instruções ou orientações para a equipe..."
                    className="text-xs rounded-xl min-h-[80px] bg-slate-50/50"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={sendManualNotification.isPending}
                    className="text-xs font-semibold bg-slate-900 hover:bg-black text-white rounded-xl h-9 px-5 shadow-sm"
                  >
                    {sendManualNotification.isPending ? "Disparando..." : "Disparar Comunicado"}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 4. Category Filter Tabs & Quick Search ────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            filterCategory === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50"
          }`}
        >
          Todos ({counts.total})
        </button>

        <button
          onClick={() => setFilterCategory("prazos")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            filterCategory === "prazos"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50"
          }`}
        >
          🚨 Prazos & Críticos ({counts.prazos})
        </button>

        <button
          onClick={() => setFilterCategory("inatividade")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            filterCategory === "inatividade"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50"
          }`}
        >
          ⏱️ Inatividade ({counts.inatividade})
        </button>

        <button
          onClick={() => setFilterCategory("margem")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            filterCategory === "margem"
              ? "bg-orange-600 text-white shadow-xs"
              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50"
          }`}
        >
          📊 Margem Crítica ({counts.margem})
        </button>

        <button
          onClick={() => setFilterCategory("sac")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            filterCategory === "sac"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50"
          }`}
        >
          📩 SAC & Suporte ({counts.sac})
        </button>

        <button
          onClick={() => setFilterCategory("financeiro")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            filterCategory === "financeiro"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50"
          }`}
        >
          💰 Financeiro ({counts.financeiro})
        </button>

        <button
          onClick={() => setFilterCategory("manual")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            filterCategory === "manual"
              ? "bg-slate-800 text-white shadow-xs"
              : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50"
          }`}
        >
          📤 Comunicados ({counts.manual})
        </button>
      </div>

      {/* ── 5. Feed de Alertas Inteligentes ───────────────────────────── */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nenhum alerta pendente nesta categoria
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Todos os projetos, cronogramas, margens financeiras e chamados de suporte estão em conformidade.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const {
              badgeLabel,
              badgeColor,
              icon: IconComp,
              cleanMessage,
              actionLink,
              actionLabel,
            } = parseAlertData(n);

            const formattedTime = new Date(n.created_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <IconComp className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{formattedTime}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {n.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                      {cleanMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {actionLink && (
                    <Link
                      to={actionLink as any}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-white transition-colors cursor-pointer"
                    >
                      <span>{actionLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </Link>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotification.mutate(n.id)}
                    className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Dispensar alerta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
