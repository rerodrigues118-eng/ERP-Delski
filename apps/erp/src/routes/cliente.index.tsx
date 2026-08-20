import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  FileText,
  DollarSign,
  Briefcase,
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertCircle,
  UploadCloud,
  FileCheck,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
  ShieldCheck,
  Send,
  Calendar,
  CreditCard,
  Receipt,
  Eye,
  KeyRound,
  Camera,
  Layers,
  Sparkles,
  Search,
  MessageSquare,
  ChevronRight,
  Check,
  User,
  Phone,
  Mail,
  Zap,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useCurrentClientProfile,
  useUpdateCurrentClientProfile,
  useUploadClientPaymentReceipt,
} from "@/hooks/useClients";
import {
  useClientDocuments,
  useUploadClientDocument,
  useDeleteClientDocument,
} from "@/hooks/useClientDocuments";
import {
  useClientSupportTickets,
  useCreateTicket,
  useSendTicketReply,
  useUploadTicketEvidence,
  type SupportTicket,
} from "@/hooks/useSupportTickets";
import { useProjects, type Project } from "@/hooks/useProjects";
import { useEmittedServiceInvoices } from "@/hooks/useServiceInvoices";
import { supabase } from "@/integrations/supabase/client";

// HUD Components
import { ArcGaugeVisualizer } from "@/components/hud/ArcGaugeVisualizer";
import { DonutProgressMeter } from "@/components/hud/DonutProgressMeter";
import { NodeJourneyTimeline } from "@/components/hud/NodeJourneyTimeline";

export const Route = createFileRoute("/cliente/")({
  head: () => ({
    meta: [
      { title: "Portal do Cliente — DELSKI HUD" },
      { name: "description", content: "Acompanhe seus projetos, documentos, faturas, SAC e configurações em tempo real." },
    ],
  }),
  component: ClienteDashboardPage,
});

// Formatters
const money = (n: number) =>
  `R$\u00A0${(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (val?: string | number | Date | null) => {
  if (!val) return "—";
  try {
    const d = typeof val === "object" && val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
};

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  }
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};

const SERVICE_TAG_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  IA: { label: "Inteligência Artificial", bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  Trafego: { label: "Tráfego Pago", bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  Sites: { label: "Desenvolvimento Web", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  "Social Media": { label: "Social Media", bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
};

const STATUS_BADGE_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Criado: { label: "Planejamento", bg: "bg-slate-100 dark:bg-zinc-800", text: "text-slate-700 dark:text-zinc-300", border: "border-slate-200 dark:border-zinc-700" },
  Solicitado: { label: "Em Análise", bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  "Aguardando Candidaturas": { label: "Alocando Especialista", bg: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" },
  "Emitir Contrato": { label: "Formalização", bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  "Em Execução": { label: "Em Andamento", bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  "Em Andamento": { label: "Em Andamento", bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  "Em Revisão": { label: "Em Revisão", bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
  "Aprovado pelo Cliente": { label: "Concluído", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  Concluida: { label: "Concluído", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  Concluido: { label: "Concluído", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  Pausado: { label: "Pausado", bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  Cancelado: { label: "Cancelado", bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  Aberto: { label: "Aberto", bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  "Em atendimento": { label: "Em Atendimento", bg: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" },
  Resolvido: { label: "Resolvido", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
};

function ClienteDashboardPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Queries
  const { data: client, isLoading: loadingClient } = useCurrentClientProfile(user?.id, user?.email || undefined);
  const clientId = client?.id || user?.id || "";
  const { data: clientDocs = [] } = useClientDocuments(clientId);
  const uploadDoc = useUploadClientDocument();
  const deleteDoc = useDeleteClientDocument();

  const { data: tickets = [] } = useClientSupportTickets(clientId, user?.email || undefined);
  const createTicket = useCreateTicket();
  const sendReply = useSendTicketReply();
  const uploadEvidence = useUploadTicketEvidence();

  const { data: allProjects = [] } = useProjects();
  const clientProjects = useMemo(() => {
    if (!client && !user) return [];
    const cId = client?.id;
    const aId = client?.auth_user_id || user?.id;
    const emailLower = user?.email?.toLowerCase().trim();

    return allProjects.filter((p) => {
      if (cId && p.client_id === cId) return true;
      if (aId && p.client_id === aId) return true;
      if (emailLower && p.client?.email?.toLowerCase().trim() === emailLower) return true;
      return false;
    });
  }, [allProjects, client, user]);

  const { data: emittedNfses = [] } = useEmittedServiceInvoices(clientId);

  const updateClientProfile = useUpdateCurrentClientProfile();
  const uploadPaymentReceipt = useUploadClientPaymentReceipt();

  // Listen to tab switch events from top navbar
  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("delski_switch_client_tab", handleTabSwitch);
    return () => window.removeEventListener("delski_switch_client_tab", handleTabSwitch);
  }, []);

  // ── Projects Filter & Search State ────────────────────────────────────────
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilterService, setProjectFilterService] = useState<string>("all");

  const filteredProjects = useMemo(() => {
    return clientProjects.filter((p) => {
      if (projectFilterService !== "all" && p.service_type !== projectFilterService) return false;
      if (projectSearch) {
        const query = projectSearch.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesBriefing = (p.briefing_content || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesBriefing) return false;
      }
      return true;
    });
  }, [clientProjects, projectFilterService, projectSearch]);

  // Project Doc Upload State
  const [projectDocType, setProjectDocType] = useState<string>("contrato_prestacao_servicos");
  const [projectDocFile, setProjectDocFile] = useState<File | null>(null);
  const [uploadingProjectDoc, setUploadingProjectDoc] = useState(false);

  const handleUploadProjectDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectDocFile || !selectedProject || !clientId) {
      return toast.error("Selecione um arquivo para enviar.");
    }
    setUploadingProjectDoc(true);
    try {
      await uploadDoc.mutateAsync({
        clientId,
        documentType: projectDocType as any,
        file: projectDocFile,
      });
      setProjectDocFile(null);
      toast.success("Documento vinculado com sucesso!");
    } finally {
      setUploadingProjectDoc(false);
    }
  };

  // ── SAC Ticket Management & Chat State ────────────────────────────────────
  const [openTicketModal, setOpenTicketModal] = useState(false);
  const [ticketProject, setTicketProject] = useState<string>("");
  const [ticketCategory, setTicketCategory] = useState<string>("Projeto");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"Baixa" | "Media" | "Alta" | "Critica">("Media");
  const [ticketEvidenceFile, setTicketEvidenceFile] = useState<File | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [chatReplyMessage, setChatReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      return toast.error("Preencha o assunto e a descrição da solicitação.");
    }

    setSubmittingTicket(true);
    try {
      let evidenceUrl: string | null = null;
      if (ticketEvidenceFile) {
        evidenceUrl = await uploadEvidence.mutateAsync({
          file: ticketEvidenceFile,
          clientId,
        });
      }

      await createTicket.mutateAsync({
        clientId,
        projectId: ticketProject || undefined,
        clientName: client?.company_name || client?.contact_name || profile?.full_name || "Cliente",
        clientEmail: user?.email || client?.email,
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        priority: ticketPriority,
        evidenceUrl,
      });

      setTicketSubject("");
      setTicketMessage("");
      setTicketProject("");
      setTicketEvidenceFile(null);
      setOpenTicketModal(false);
      toast.success("Chamado aberto com sucesso!");
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !chatReplyMessage.trim()) return;

    setSendingReply(true);
    try {
      await sendReply.mutateAsync({
        ticketId: selectedTicket.id,
        message: chatReplyMessage.trim(),
        senderName: client?.contact_name || profile?.full_name || "Cliente",
        senderRole: "cliente",
        newStatus: "Em Andamento",
      });
      setChatReplyMessage("");
      setSelectedTicket((prev) => {
        if (!prev) return null;
        const newReply = {
          id: `reply-${Date.now()}`,
          ticket_id: prev.id,
          sender_name: client?.contact_name || profile?.full_name || "Cliente",
          sender_role: "cliente" as const,
          message: chatReplyMessage.trim(),
          created_at: new Date().toISOString(),
        };
        return {
          ...prev,
          replies: [...(prev.replies || []), newReply],
        };
      });
      toast.success("Mensagem enviada com sucesso!");
    } finally {
      setSendingReply(false);
    }
  };

  // ── Account Settings State ────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [corporateName, setCorporateName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [segment, setSegment] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cep, setCep] = useState("");
  const [contactName, setContactName] = useState("");
  const [rolePosition, setRolePosition] = useState("");
  const [phone, setPhone] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (client) {
      setCompanyName(client.company_name || "");
      setCorporateName(client.corporate_name || "");
      setCnpj(client.cnpj ? formatCNPJ(client.cnpj) : "");
      setSegment(client.segment || "");
      setCorporateEmail(client.email || user?.email || "");
      setAddress(client.address || "");
      setCity(client.city || "");
      setState(client.state || "");
      setCep(client.cep ? formatCEP(client.cep) : "");
      setContactName(client.contact_name || client.full_name || profile?.full_name || "");
      setRolePosition(client.role_position || "");
      setPhone(client.phone ? formatPhone(client.phone) : "");
    }
    if (profile?.avatar_url) {
      setAvatarPreview(profile.avatar_url);
    }
  }, [client, user, profile]);

  const handleCepLookup = async (cepVal: string) => {
    const cleanCep = cepVal.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(`${data.logradouro || ""}${data.bairro ? `, ${data.bairro}` : ""}`);
          setCity(data.localidade || "");
          setState(data.uf || "");
          toast.success("Endereço preenchido via CEP.");
        }
      } catch (err) {
        console.warn("ViaCEP lookup error:", err);
      }
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("A imagem deve ter no máximo 5MB.");
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${user.id}_${Date.now()}.${fileExt}`;

      const { data } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file, { upsert: true });

      let publicUrl = "";
      if (data?.path) {
        const { data: pub } = supabase.storage.from("client-documents").getPublicUrl(data.path);
        publicUrl = pub.publicUrl;
      } else {
        publicUrl = URL.createObjectURL(file);
      }

      setAvatarPreview(publicUrl);

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      toast.success("Foto de perfil atualizada!");
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      toast.error("Erro ao enviar foto de perfil.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !corporateEmail.trim()) {
      return toast.error("Nome da Empresa e E-mail corporativo são necessários.");
    }

    setSavingSettings(true);
    try {
      await updateClientProfile.mutateAsync({
        clientId: client?.id,
        userId: user?.id,
        patch: {
          company_name: companyName.trim(),
          corporate_name: corporateName.trim(),
          cnpj: cnpj.trim(),
          segment: segment.trim(),
          email: corporateEmail.trim().toLowerCase(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          cep: cep.trim(),
          contact_name: contactName.trim(),
          role_position: rolePosition.trim(),
          phone: phone.trim(),
        },
      });

      if (user?.id && contactName.trim()) {
        await supabase
          .from("profiles")
          .update({ full_name: contactName.trim(), updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message || "Tente novamente"}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      return toast.error("A nova senha deve ter no mínimo 6 caracteres.");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("As senhas digitadas não coincidem.");
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao alterar senha: ${err.message || "Tente novamente"}`);
    } finally {
      setChangingPassword(false);
    }
  };

  // Receipt Modal State
  const [openReceiptModal, setOpenReceiptModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile) return toast.error("Selecione um arquivo de comprovante.");

    setUploadingReceipt(true);
    try {
      await uploadPaymentReceipt.mutateAsync({
        clientId,
        file: receiptFile,
        notes: receiptNotes.trim() || undefined,
      });
      setReceiptFile(null);
      setReceiptNotes("");
      setOpenReceiptModal(false);
      toast.success("Comprovante enviado com sucesso!");
    } finally {
      setUploadingReceipt(false);
    }
  };

  if (loadingClient) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 font-hud">
          Carregando DELSKI HUD...
        </p>
      </div>
    );
  }

  // Active Metrics
  const activeProjectsCount = clientProjects.filter(
    (p) => !["Concluido", "Concluida", "Aprovado pelo Cliente", "Cancelado"].includes(p.status)
  ).length;

  const openTicketsCount = tickets.filter((t) => ["Aberto", "Em atendimento", "Em Andamento"].includes(t.status)).length;
  const availableDocsCount = clientDocs.length + emittedNfses.length;

  // Calculate Overall Deliveries Progress Percentage
  const overallProgressPercentage = clientProjects.length === 0
    ? 100
    : Math.round(
        (clientProjects.reduce((acc, p) => {
          if (["Concluido", "Concluida", "Aprovado pelo Cliente"].includes(p.status)) return acc + 100;
          if (p.status === "Em Execução" || p.status === "Em Andamento") return acc + 65;
          if (p.status === "Em Revisão") return acc + 85;
          return acc + 25;
        }, 0) / (clientProjects.length * 100)) * 100
      );

  const slaPercentage = openTicketsCount === 0 ? 100 : Math.max(75, 100 - openTicketsCount * 5);

  const TABS_NAV = [
    { value: "dashboard", label: "Dashboard HUD", icon: <Sparkles className="h-4 w-4" /> },
    { value: "projetos", label: "Projetos", count: clientProjects.length, icon: <Briefcase className="h-4 w-4" /> },
    { value: "ocorrencias", label: "SAC / Suporte", count: tickets.length, icon: <LifeBuoy className="h-4 w-4" /> },
    { value: "documentos", label: "Documentos & Faturas", count: availableDocsCount, icon: <FileText className="h-4 w-4" /> },
    { value: "configuracoes", label: "Configurações", icon: <User className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ── Segmented HUD Tab Navigation (Floating Pill Bar) ───────────── */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar py-2">
        <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          {TABS_NAV.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`hud-nav-pill ${isActive ? "active" : ""}`}
              >
                {tab.icon}
                <span className="font-hud tracking-tight">{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full font-hud ${
                      isActive
                        ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                        : "bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Views (With Fluid AnimatePresence Transitions) ──────────── */}
      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: DASHBOARD HUD (HERO ARC GAUGE, DONUT METERS, JOURNEY MAP)
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* 1. Hero Arc Gauge Visualizer (2.5s sweep) */}
            <ArcGaugeVisualizer
              percentage={overallProgressPercentage}
              slaPercentage={slaPercentage}
              activeProjectsCount={activeProjectsCount}
              totalProjectsCount={clientProjects.length}
              title={`Olá, ${client?.contact_name || profile?.full_name || "Cliente"}`}
              subtitle="Visão consolidada de performance, cronogramas e conformidade de entregas corporativas."
            />

            {/* 2. Donut Mini-Gauges Ecosystem Row (3 Modular HUD Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <DonutProgressMeter
                label="Projetos Contratados"
                sublabel={`${activeProjectsCount} serviço(s) em execução ativa`}
                percentage={overallProgressPercentage}
                countNumber={clientProjects.length}
                badgeText={`${activeProjectsCount} Ativos`}
                badgeType="blue"
                icon={<Briefcase className="h-5 w-5" />}
                onClick={() => setActiveTab("projetos")}
                accentColor="#2563EB"
              />

              <DonutProgressMeter
                label="SAC / Central de Suporte"
                sublabel={openTicketsCount === 0 ? "SLA 100% Homologado" : `${openTicketsCount} chamado(s) em andamento`}
                percentage={slaPercentage}
                countNumber={tickets.length}
                badgeText={openTicketsCount === 0 ? "Em Dia" : "Atendimento"}
                badgeType={openTicketsCount === 0 ? "green" : "amber"}
                icon={<LifeBuoy className="h-5 w-5" />}
                onClick={() => setActiveTab("ocorrencias")}
                accentColor={openTicketsCount === 0 ? "#10B981" : "#F59E0B"}
              />

              <DonutProgressMeter
                label="Documentos & Faturas"
                sublabel="Contratos assinados e NFS-e"
                percentage={100}
                countNumber={availableDocsCount}
                badgeText="Acesso Imediato"
                badgeType="neutral"
                icon={<FileText className="h-5 w-5" />}
                onClick={() => setActiveTab("documentos")}
                accentColor="#4F46E5"
              />
            </div>

            {/* 3. Customer Journey Map (Node-Journey Flow) */}
            <NodeJourneyTimeline
              projects={clientProjects}
              onSelectProject={(p) => {
                setSelectedProject(p);
                setProjectModalOpen(true);
              }}
              onViewAll={() => setActiveTab("projetos")}
            />

            {/* 4. Quick Actions Concierge Card */}
            <div className="hud-card p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 mb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-hud tracking-tight">
                    Acesso Rápido & Concierge Executivo
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Ações frequentes do seu dia a dia na plataforma.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setOpenTicketModal(true)}
                  className="p-4 rounded-[24px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-blue-500/20 transition-all cursor-pointer group font-hud"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </div>
                    <span>Abrir Chamado SAC</span>
                  </div>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("projetos")}
                  className="p-4 rounded-[24px] bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/70 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-between transition-all cursor-pointer group font-hud"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <span>Meus Projetos</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("documentos")}
                  className="p-4 rounded-[24px] bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/70 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-between transition-all cursor-pointer group font-hud"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <span>Baixar Contratos & NF-e</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => setOpenReceiptModal(true)}
                  className="p-4 rounded-[24px] bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/70 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-between transition-all cursor-pointer group font-hud"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300">
                      <UploadCloud className="h-4 w-4" />
                    </div>
                    <span>Enviar Comprovante</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: MEUS PROJETOS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "projetos" && (
          <motion.div
            key="projetos"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="hud-card p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center gap-2.5">
                  <Briefcase className="h-5 w-5 text-blue-600" /> Meus Projetos Contratados
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">
                  Acompanhe escopo, prazos, entregáveis e acesse os contratos assinados e notas fiscais de cada demanda.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Buscar por título ou escopo..."
                    className="h-10 pl-10 text-xs w-52 sm:w-64 rounded-2xl bg-slate-50 dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 font-hud"
                  />
                </div>
                <Select value={projectFilterService} onValueChange={setProjectFilterService}>
                  <SelectTrigger className="h-10 text-xs w-40 rounded-2xl bg-slate-50 dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 font-hud">
                    <SelectValue placeholder="Área de Atuação" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">Todas as Áreas</SelectItem>
                    <SelectItem value="IA">Inteligência Artificial</SelectItem>
                    <SelectItem value="Trafego">Tráfego Pago</SelectItem>
                    <SelectItem value="Sites">Desenvolvimento Web</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Briefcase className="h-12 w-12 text-slate-300 dark:text-zinc-700 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200 font-hud">
                  Nenhum projeto encontrado
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {projectSearch || projectFilterService !== "all"
                    ? "Tente ajustar os filtros de busca para encontrar o projeto desejado."
                    : "Você ainda não possui projetos em andamento. Entre em contato com a equipe Delski para novas contratações."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((p) => {
                  const tag = SERVICE_TAG_STYLES[p.service_type] || {
                    label: p.service_type,
                    bg: "bg-slate-100 dark:bg-zinc-800",
                    text: "text-slate-700 dark:text-zinc-300",
                    border: "border-slate-200 dark:border-zinc-700",
                  };
                  const statusInfo = STATUS_BADGE_STYLES[p.status] || {
                    label: p.status,
                    bg: "bg-blue-50 dark:bg-blue-950",
                    text: "text-blue-700 dark:text-blue-300",
                    border: "border-blue-200 dark:border-blue-800",
                  };

                  const isDone = ["Concluido", "Concluida", "Aprovado pelo Cliente"].includes(p.status);
                  const progressVal = isDone ? 100 : p.status === "Em Execução" || p.status === "Em Andamento" ? 65 : 25;

                  return (
                    <motion.div
                      key={p.id}
                      whileHover={{ y: -3 }}
                      className="p-6 rounded-[28px] bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between space-y-4 hover:border-blue-400/50 transition-all shadow-xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-3 py-1 rounded-full ${tag.bg} ${tag.text} ${tag.border} text-xs font-bold font-hud`}>
                            {tag.label}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text} text-[11px] font-bold font-hud`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1 font-hud">
                            {p.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                            {p.briefing_content || "Projeto corporativo com escopo e entregas gerenciadas pela equipe Delski."}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-zinc-800">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-500 font-hud">
                            <span>Progresso</span>
                            <span className="text-blue-600 dark:text-blue-400">{progressVal}%</span>
                          </div>
                          <Progress value={progressVal} className="h-1.5 bg-slate-200 dark:bg-zinc-800" />
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{p.deadline ? formatDate(p.deadline) : "Em definição"}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProject(p);
                              setProjectModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all font-hud cursor-pointer"
                          >
                            Ver Detalhes
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: SAC / SUPORTE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "ocorrencias" && (
          <motion.div
            key="ocorrencias"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="hud-card p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center gap-2.5">
                  <LifeBuoy className="h-5 w-5 text-blue-600" /> Central de Atendimento & SAC
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">
                  Abra solicitações de suporte, tire dúvidas de faturamento ou escopo com SLA de atendimento direto.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenTicketModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer font-hud self-start sm:self-center"
              >
                <Plus className="h-4 w-4" /> Novo Chamado
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <LifeBuoy className="h-12 w-12 text-slate-300 dark:text-zinc-700 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200 font-hud">
                  Nenhum chamado aberto
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Seu atendimento está 100% em dia. Para tirar qualquer dúvida de escopo ou faturamento, clique em "Novo Chamado".
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((t) => {
                  const statusInfo = STATUS_BADGE_STYLES[t.status] || {
                    label: t.status,
                    bg: "bg-slate-100 dark:bg-zinc-800",
                    text: "text-slate-700 dark:text-zinc-300",
                    border: "border-slate-200 dark:border-zinc-700",
                  };

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="p-5 rounded-[24px] bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 hover:border-blue-400/50 hover:shadow-xs transition-all cursor-pointer space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-hud">
                              {t.subject}
                            </h4>
                            <p className="text-xs text-slate-400 font-medium">
                              Protocolo: <span className="font-mono text-[11px]">#{t.id.slice(0, 8)}</span> • {formatDate(t.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-hud ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-hud">
                            {t.category || "Geral"}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-2 leading-relaxed bg-white dark:bg-zinc-950 p-3 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                        {t.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold font-hud">
                          <MessageSquare className="h-3.5 w-3.5" /> {(t.replies || []).length} resposta{(t.replies || []).length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 hover:underline font-hud">
                          Abrir conversa <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: DOCUMENTOS & FATURAS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "documentos" && (
          <motion.div
            key="documentos"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="hud-card p-6 sm:p-8 space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-blue-600" /> Documentos, Contratos & Notas Fiscais
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">
                  Acesse contratos assinados, relatórios de entregas e faça download das Notas Fiscais de Serviço (NFS-e).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenReceiptModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer font-hud self-start sm:self-center"
              >
                <UploadCloud className="h-4 w-4" /> Enviar Comprovante de Pagamento
              </button>
            </div>

            {/* Documentos Anexados */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-hud">
                <FileCheck className="h-4 w-4 text-blue-600" /> Arquivos & Contratos da Empresa
              </h3>

              {clientDocs.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-[24px] border-slate-200 dark:border-zinc-800 text-slate-400 text-xs font-medium">
                  Nenhum documento anexado no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-5 rounded-[24px] bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate font-hud uppercase">
                            {doc.document_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">{formatDate(doc.uploaded_at)}</p>
                        </div>
                      </div>

                      {doc.file_url && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => window.open(doc.file_url!, "_blank")}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 font-hud flex items-center justify-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = doc.file_url!;
                              a.download = `${doc.document_type}.pdf`;
                              a.target = "_blank";
                              a.click();
                            }}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-hud flex items-center justify-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5" /> Baixar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notas Fiscais (NFS-e) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-hud">
                <Receipt className="h-4 w-4 text-emerald-600" /> Notas Fiscais de Serviço Emitidas (NFS-e)
              </h3>

              {emittedNfses.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-[24px] border-slate-200 dark:border-zinc-800 text-slate-400 text-xs font-medium">
                  Nenhuma nota fiscal emitida até o momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {emittedNfses.map((nf) => (
                    <div
                      key={nf.id}
                      className="p-5 rounded-[24px] bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white font-hud">
                            NFS-e Nº {nf.invoice_number || "—"}
                          </p>
                          <p className="text-xs font-extrabold text-emerald-600 font-hud">{money(nf.amount)}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{formatDate(nf.issue_date || nf.created_at)}</p>
                        </div>
                      </div>

                      {nf.pdf_url && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => window.open(nf.pdf_url!, "_blank")}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 font-hud flex items-center justify-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = nf.pdf_url!;
                              a.download = `NFSe_${nf.invoice_number || nf.id}.pdf`;
                              a.target = "_blank";
                              a.click();
                            }}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-hud flex items-center justify-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5" /> Baixar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 5: CONFIGURAÇÕES
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "configuracoes" && (
          <motion.div
            key="configuracoes"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="hud-card p-6 sm:p-8 space-y-8"
          >
            <div className="border-b border-slate-100 dark:border-white/5 pb-5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center gap-2.5">
                <User className="h-5 w-5 text-blue-600" /> Configurações da Conta & Segurança
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">
                Gerencie dados cadastrais, responsável de contato, foto de perfil e senha corporativa.
              </p>
            </div>

            {/* Avatar Profile */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[28px] bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800">
              <div className="relative group">
                <Avatar className="h-20 w-20 rounded-full border-2 border-slate-200 dark:border-zinc-700 shadow-sm">
                  <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-to-tr from-blue-700 to-indigo-600 text-white text-xl font-extrabold rounded-full">
                    {(companyName || contactName || "CL").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Alterar foto"
                >
                  <Camera className="h-6 w-6" />
                </button>
                <input
                  type="file"
                  ref={avatarFileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>

              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-hud">Foto de Perfil / Logotipo</h3>
                <p className="text-xs text-slate-400">Arquivos PNG, JPG ou WEBP até 5MB.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="h-8 text-xs font-bold rounded-xl gap-1.5 mt-2 font-hud"
                >
                  {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                  {uploadingAvatar ? "Enviando..." : "Alterar Foto"}
                </Button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-hud">
                <Building2 className="h-4 w-4 text-blue-600" /> Dados Corporativos & Contato
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Nome Fantasia <span className="text-blue-600">*</span>
                  </Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Razão Social
                  </Label>
                  <Input
                    value={corporateName}
                    onChange={(e) => setCorporateName(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    CNPJ
                  </Label>
                  <Input
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                    className="h-10 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Segmento
                  </Label>
                  <Input
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: Tecnologia, Varejo"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    E-mail Corporativo <span className="text-blue-600">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={corporateEmail}
                    onChange={(e) => setCorporateEmail(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Responsável Legal
                  </Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Cargo / Função
                  </Label>
                  <Input
                    value={rolePosition}
                    onChange={(e) => setRolePosition(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    CEP
                  </Label>
                  <Input
                    value={cep}
                    onChange={(e) => {
                      const v = formatCEP(e.target.value);
                      setCep(v);
                      if (v.length === 9) handleCepLookup(v);
                    }}
                    maxLength={9}
                    placeholder="00000-000"
                    className="h-10 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Endereço Completo
                  </Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={savingSettings}
                  className="h-10 px-6 text-xs font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 font-hud"
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {savingSettings ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>

            {/* Troca de Senha */}
            <form onSubmit={handleChangePassword} className="space-y-5 pt-6 border-t border-slate-100 dark:border-white/5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 font-hud">
                <KeyRound className="h-4 w-4 text-blue-600" /> Alteração Segura de Senha
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Nova Senha <span className="text-blue-600">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                    Confirmar Senha <span className="text-blue-600">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="h-10 px-6 text-xs font-bold rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-hud"
                >
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {changingPassword ? "Alterando..." : "Atualizar Senha"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: Project Detail & Documents ─────────────────────────── */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
        <DialogContent className="sm:max-w-[650px] bg-white dark:bg-[#11131A] rounded-[32px] p-6 sm:p-8 space-y-6 border border-slate-200/80 dark:border-white/10 shadow-2xl">
          <DialogHeader className="space-y-1.5 border-b border-slate-100 dark:border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold font-hud">
                {selectedProject?.service_type || "Projeto"}
              </span>
              <Badge variant="outline" className="text-xs font-semibold">
                {selectedProject?.status || "Em Andamento"}
              </Badge>
            </div>
            <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white font-hud">
              {selectedProject?.title}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="escopo" className="space-y-5">
            <TabsList className="bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl">
              <TabsTrigger value="escopo" className="rounded-xl text-xs font-bold font-hud">
                Escopo & Prazos
              </TabsTrigger>
              <TabsTrigger value="documentos" className="rounded-xl text-xs font-bold font-hud">
                Documentações & Anexos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="escopo" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Resumo do Briefing</Label>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed max-h-48 overflow-y-auto">
                  {selectedProject?.briefing_content || "Sem descrição detalhada cadastrada."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-400 font-medium">Início / Criação</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5 font-hud">{formatDate(selectedProject?.created_at)}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-400 font-medium">Prazo Estimado</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5 font-hud">{selectedProject?.deadline ? formatDate(selectedProject.deadline) : "Em definição"}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documentos" className="space-y-4">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Documentos do Projeto</Label>

                {(() => {
                  const projectDocs = clientDocs.filter((d) => d.project_id === selectedProject?.id || ["contrato_prestacao_servicos", "nota_fiscal"].includes(d.document_type));

                  if (projectDocs.length === 0) {
                    return (
                      <div className="p-6 text-center border border-dashed rounded-[24px] border-slate-200 dark:border-zinc-800 text-xs text-slate-400 space-y-1">
                        <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700 dark:text-zinc-300">Nenhum documento anexado ainda</p>
                        <p className="text-[11px]">O contrato assinado e a NF-e estarão disponíveis aqui.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto">
                      {projectDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate font-hud uppercase">
                                {doc.document_type.replace(/_/g, " ")}
                              </p>
                              <p className="text-[10px] text-slate-400">{formatDate(doc.uploaded_at)}</p>
                            </div>
                          </div>

                          {doc.file_url && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(doc.file_url!, "_blank")}
                                className="h-7 px-2.5 text-xs font-bold rounded-lg font-hud"
                              >
                                <Eye className="h-3 w-3" /> Ver
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const a = document.createElement("a");
                                  a.href = doc.file_url!;
                                  a.download = `${doc.document_type}.pdf`;
                                  a.target = "_blank";
                                  a.click();
                                }}
                                className="h-7 px-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-hud"
                              >
                                <Download className="h-3 w-3" /> Baixar
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Upload form for project document */}
              <form onSubmit={handleUploadProjectDoc} className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Anexar Novo Arquivo</Label>
                <div className="flex items-center gap-2">
                  <Select value={projectDocType} onValueChange={setProjectDocType}>
                    <SelectTrigger className="h-9 text-xs w-44 rounded-xl font-hud">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contrato_prestacao_servicos">Contrato</SelectItem>
                      <SelectItem value="nota_fiscal">Nota Fiscal (NF-e)</SelectItem>
                      <SelectItem value="relatorio_entrega">Relatório</SelectItem>
                      <SelectItem value="anexo_geral">Outro Anexo</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="file"
                    onChange={(e) => setProjectDocFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs rounded-xl flex-1"
                  />

                  <Button
                    type="submit"
                    size="sm"
                    disabled={uploadingProjectDoc || !projectDocFile}
                    className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    {uploadingProjectDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProjectModalOpen(false)}
              className="h-9 px-4 text-xs font-bold rounded-xl font-hud"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: SAC New Ticket ─────────────────────────────────────── */}
      <Dialog open={openTicketModal} onOpenChange={setOpenTicketModal}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#11131A] rounded-[32px] p-6 sm:p-8 space-y-4 border border-slate-200/80 dark:border-white/10 shadow-2xl">
          <DialogHeader className="space-y-1.5 border-b border-slate-100 dark:border-white/5 pb-3">
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white font-hud flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-blue-600" /> Abrir Novo Chamado no SAC
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Envie sua solicitação diretamente para a equipe de gestão da Delski com SLA ágil.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                Assunto <span className="text-blue-600">*</span>
              </Label>
              <Input
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Ex: Dúvida sobre entrega do Projeto"
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Categoria</Label>
                <Select value={ticketCategory} onValueChange={setTicketCategory}>
                  <SelectTrigger className="h-10 text-xs rounded-xl font-hud">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Projeto">Projeto</SelectItem>
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Dúvida">Dúvida Geral</SelectItem>
                    <SelectItem value="Alteração de Escopo">Alteração de Escopo</SelectItem>
                    <SelectItem value="Técnico">Suporte Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Prioridade</Label>
                <Select value={ticketPriority} onValueChange={(val: any) => setTicketPriority(val)}>
                  <SelectTrigger className="h-10 text-xs rounded-xl font-hud">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Media">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Critica">Crítica (Urgente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {clientProjects.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Projeto Vinculado (Opcional)</Label>
                <Select value={ticketProject} onValueChange={setTicketProject}>
                  <SelectTrigger className="h-10 text-xs rounded-xl font-hud">
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum (Dúvida Geral)</SelectItem>
                    {clientProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                Descrição da Solicitação <span className="text-blue-600">*</span>
              </Label>
              <Textarea
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Detalhe o que você precisa..."
                rows={4}
                className="text-xs rounded-2xl resize-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Anexo de Evidência (Opcional)</Label>
              <Input
                type="file"
                onChange={(e) => setTicketEvidenceFile(e.target.files?.[0] || null)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenTicketModal(false)}
                disabled={submittingTicket}
                className="h-9 px-4 text-xs font-bold rounded-xl font-hud"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingTicket}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer font-hud"
              >
                {submittingTicket ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {submittingTicket ? "Enviando..." : "Enviar Chamado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: SAC Chat / Conversation ────────────────────────────── */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-[#11131A] rounded-[32px] p-6 sm:p-8 space-y-5 border border-slate-200/80 dark:border-white/10 shadow-2xl">
          <DialogHeader className="space-y-1 border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold font-hud">
                {selectedTicket?.category || "SAC"}
              </span>
              <Badge variant="outline" className="text-xs font-semibold">
                {selectedTicket?.status || "Aberto"}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white font-hud">
              {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Aberto em {formatDate(selectedTicket?.created_at)} • Protocolo #{selectedTicket?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 max-h-72 overflow-y-auto p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
            {/* Original message */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 font-hud">
                <span>{selectedTicket?.client_name || "Você"}</span>
                <span className="text-[10px] font-normal text-slate-400">{formatDate(selectedTicket?.created_at)}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">{selectedTicket?.message}</p>
              {selectedTicket?.evidence_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(selectedTicket.evidence_url!, "_blank")}
                  className="h-7 text-xs font-bold rounded-lg gap-1 mt-1 font-hud"
                >
                  <Eye className="h-3 w-3" /> Ver anexo
                </Button>
              )}
            </div>

            {/* Replies */}
            {(selectedTicket?.replies || []).map((reply, idx) => {
              const isGestorSender = reply.sender_role === "gestor" || reply.sender_role === "admin";

              return (
                <div
                  key={reply.id || idx}
                  className={`p-3.5 rounded-2xl border space-y-1.5 ${
                    isGestorSender
                      ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 ml-4 text-slate-900 dark:text-white"
                      : "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 mr-4 text-slate-900 dark:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold font-hud">
                    <span className={isGestorSender ? "text-blue-700 dark:text-blue-400 flex items-center gap-1" : "text-slate-800 dark:text-zinc-200"}>
                      {isGestorSender && <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
                      {reply.sender_name}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">{formatDate(reply.created_at)}</span>
                  </div>
                  <p className="text-xs leading-relaxed font-medium">{reply.message}</p>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendChatReply} className="space-y-3 pt-2">
            <Textarea
              value={chatReplyMessage}
              onChange={(e) => setChatReplyMessage(e.target.value)}
              placeholder="Digite sua resposta para a equipe..."
              rows={3}
              className="text-xs rounded-2xl resize-none"
              required
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedTicket(null)}
                className="h-9 px-4 text-xs font-bold rounded-xl font-hud"
              >
                Fechar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={sendingReply || !chatReplyMessage.trim()}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer font-hud"
              >
                {sendingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {sendingReply ? "Enviando..." : "Enviar Resposta"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Receipt Upload ─────────────────────────────────────── */}
      <Dialog open={openReceiptModal} onOpenChange={setOpenReceiptModal}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-[#11131A] rounded-[32px] p-6 sm:p-8 space-y-4 border border-slate-200/80 dark:border-white/10 shadow-2xl">
          <DialogHeader className="space-y-1.5 border-b border-slate-100 dark:border-white/5 pb-3">
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white font-hud flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-blue-600" /> Enviar Comprovante
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Anexe o comprovante de transferência ou boleto pago para agilizar a baixa financeira.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceiptSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">
                Arquivo do Comprovante (PDF/Imagem) <span className="text-blue-600">*</span>
              </Label>
              <Input
                type="file"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-hud">Observações (Opcional)</Label>
              <Textarea
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Ex: Pagamento referente à parcela do mês..."
                rows={3}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenReceiptModal(false)}
                disabled={uploadingReceipt}
                className="h-9 px-4 text-xs font-bold rounded-xl font-hud"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={uploadingReceipt}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer font-hud"
              >
                {uploadingReceipt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                {uploadingReceipt ? "Enviando..." : "Enviar Comprovante"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
