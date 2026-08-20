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
  FileSpreadsheet,
  HelpCircle,
  Paperclip,
  Check,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Instagram,
  Linkedin,
  FileCode,
  ArrowRight,
  Eye,
  KeyRound,
  Camera,
  Layers,
  Sparkles,
  Search,
  MessageSquare,
  ChevronRight,
  X,
  AlertTriangle,
  FolderArchive,
  Info,
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

export const Route = createFileRoute("/cliente/")({
  head: () => ({
    meta: [
      { title: "Portal do Cliente — DELSKI CLOUD" },
      { name: "description", content: "Acompanhe seus projetos, documentos, faturas, SAC e configurações." },
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

// Badges & Tag helpers
const SERVICE_TAG_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  IA: { label: "Inteligência Artificial", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Trafego: { label: "Tráfego Pago", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Sites: { label: "Desenvolvimento Web", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Social Media": { label: "Social Media", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
};

const STATUS_BADGE_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Criado: { label: "Planejamento", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  Solicitado: { label: "Em Análise", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Aguardando Candidaturas": { label: "Alocando Especialista", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  "Emitir Contrato": { label: "Formalização", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Em Execução": { label: "Em Andamento", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Em Andamento": { label: "Em Andamento", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Em Revisão": { label: "Em Revisão", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Aprovado pelo Cliente": { label: "Concluído", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Concluida: { label: "Concluído", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Concluido: { label: "Concluído", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Pausado: { label: "Pausado", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Cancelado: { label: "Cancelado", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  Aberto: { label: "Aberto", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Em atendimento": { label: "Em Atendimento", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  Resolvido: { label: "Resolvido", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

// Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

function ClienteDashboardPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Client profile query
  const { data: client, isLoading: loadingClient } = useCurrentClientProfile(user?.id, user?.email || undefined);

  // Client Documents query & mutations
  const clientId = client?.id || user?.id || "";
  const { data: clientDocs = [], isLoading: loadingDocs } = useClientDocuments(clientId);
  const uploadDoc = useUploadClientDocument();
  const deleteDoc = useDeleteClientDocument();

  // Support Tickets query & mutation
  const { data: tickets = [], isLoading: loadingTickets } = useClientSupportTickets(clientId, user?.email || undefined);
  const createTicket = useCreateTicket();
  const sendReply = useSendTicketReply();
  const uploadEvidence = useUploadTicketEvidence();

  // All projects query (filtered for this client)
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

  // Emitted Service Invoices (NFS-e)
  const { data: emittedNfses = [] } = useEmittedServiceInvoices(clientId);

  // Update client mutation
  const updateClientProfile = useUpdateCurrentClientProfile();
  const uploadPaymentReceipt = useUploadClientPaymentReceipt();

  // Listen to cross-component tab switch events (e.g. from top navbar)
  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("delski_switch_client_tab", handleTabSwitch);
    return () => window.removeEventListener("delski_switch_client_tab", handleTabSwitch);
  }, []);

  // ── Project Modal & Inspection State ──────────────────────────────────────
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

  // ── Project Document Upload state ─────────────────────────────────────────
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

  // Selected ticket for chat/detail view
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
      // Update local selected ticket
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

  // Avatar Upload State
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Password Change State
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

      const { data, error } = await supabase.storage
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

      // Persist in profiles
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

      // Also update profiles table full_name
      if (user?.id && contactName.trim()) {
        await supabase
          .from("profiles")
          .update({ full_name: contactName.trim(), updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }

      toast.success("Configurações da conta salvas com sucesso!");
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

  // ── Document Upload Modal State (Empresa / Gerais) ────────────────────────
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const handleGeneralDocUpload = async (docType: string, file: File) => {
    if (!clientId) return;
    setUploadingDocType(docType);
    try {
      await uploadDoc.mutateAsync({
        clientId,
        documentType: docType as any,
        file,
      });
    } finally {
      setUploadingDocType(null);
    }
  };

  // ── Receipt Upload Modal State ────────────────────────────────────────────
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
    } finally {
      setUploadingReceipt(false);
    }
  };

  if (loadingClient) {
    return (
      <div className="p-20 text-center space-y-4">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Carregando Portal do Cliente...</p>
      </div>
    );
  }

  // Active KPI Counters
  const activeProjectsCount = clientProjects.filter(
    (p) => !["Concluido", "Concluida", "Aprovado pelo Cliente", "Cancelado"].includes(p.status)
  ).length;

  const openTicketsCount = tickets.filter((t) => ["Aberto", "Em atendimento", "Em Andamento"].includes(t.status)).length;
  const availableDocsCount = clientDocs.length + emittedNfses.length;

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* ── Welcome Header & Quick Action ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden"
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-2xl border-2 border-blue-600/20 shadow-xs">
            <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white text-lg font-bold rounded-2xl">
              {(client?.company_name || client?.contact_name || "CL").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="h-3 w-3 text-blue-600" /> Portal Oficial
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Olá, {contactName || "Cliente"} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Acompanhe o andamento dos seus projetos, solicite suporte no SAC e acesse seus documentos e notas fiscais.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setOpenTicketModal(true)}
            className="h-10 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" /> Abrir Chamado SAC
          </Button>
        </div>
      </motion.div>

      {/* ── Main Navigation Tabs ────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex gap-1 min-w-max">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-bold text-slate-600 hover:text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="projetos"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-bold text-slate-600 hover:text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <Briefcase className="h-4 w-4" /> Meus Projetos ({clientProjects.length})
            </TabsTrigger>
            <TabsTrigger
              value="ocorrencias"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-bold text-slate-600 hover:text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <LifeBuoy className="h-4 w-4" /> SAC / Suporte ({tickets.length})
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-bold text-slate-600 hover:text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Documentos & Faturas ({availableDocsCount})
            </TabsTrigger>
            <TabsTrigger
              value="configuracoes"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-bold text-slate-600 hover:text-slate-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <User className="h-4 w-4" /> Configurações da Conta
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 1: DASHBOARD ANIMADO (FRAMER MOTION STAGGERED)
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="dashboard" className="space-y-6 focus-visible:outline-none">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Card 1: Projetos Ativos */}
              <motion.div
                variants={itemVariants}
                whileHover={{ y: -3 }}
                onClick={() => setActiveTab("projetos")}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
                    <Briefcase className="h-6 w-6" />
                  </span>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold">
                    {activeProjectsCount} Ativo{activeProjectsCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{clientProjects.length}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Projetos Contratados</p>
                </div>
                <div className="flex items-center justify-between text-xs text-blue-600 font-bold pt-2 border-t border-slate-100">
                  <span>Ver projetos e documentos</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </motion.div>

              {/* Card 2: Chamados SAC */}
              <motion.div
                variants={itemVariants}
                whileHover={{ y: -3 }}
                onClick={() => setActiveTab("ocorrencias")}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="p-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
                    <LifeBuoy className="h-6 w-6" />
                  </span>
                  <Badge className={openTicketsCount > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                    {openTicketsCount > 0 ? `${openTicketsCount} Em Aberto` : "Tudo Resolvido ✓"}
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{tickets.length}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Chamados de Suporte & SAC</p>
                </div>
                <div className="flex items-center justify-between text-xs text-blue-600 font-bold pt-2 border-t border-slate-100">
                  <span>Abrir ou responder chamado</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </motion.div>

              {/* Card 3: Documentos & NF-e */}
              <motion.div
                variants={itemVariants}
                whileHover={{ y: -3 }}
                onClick={() => setActiveTab("documentos")}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                    <FileCheck className="h-6 w-6" />
                  </span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                    Prontos para Download
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{availableDocsCount}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Documentos, Contratos & NF-e</p>
                </div>
                <div className="flex items-center justify-between text-xs text-blue-600 font-bold pt-2 border-t border-slate-100">
                  <span>Acessar pasta digital</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </motion.div>
            </div>

            {/* Quick Actions & Timeline Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Linha do Tempo dos Projetos */}
              <motion.div
                variants={itemVariants}
                className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" /> Linha do Tempo & Atualizações
                    </h2>
                    <p className="text-xs text-slate-500">Últimos eventos e marcos registrados nos seus projetos.</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("projetos")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Ver todos
                  </Button>
                </div>

                {clientProjects.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">Nenhum projeto registrado no momento</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Assim que um projeto for iniciado pela equipe Delski, o progresso aparecerá aqui em tempo real.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clientProjects.slice(0, 4).map((p, idx) => {
                      const tag = SERVICE_TAG_STYLES[p.service_type] || {
                        label: p.service_type,
                        bg: "bg-slate-100",
                        text: "text-slate-700",
                        border: "border-slate-200",
                      };
                      const statusInfo = STATUS_BADGE_STYLES[p.status] || {
                        label: p.status,
                        bg: "bg-blue-50",
                        text: "text-blue-700",
                        border: "border-blue-200",
                      };

                      return (
                        <div
                          key={p.id || idx}
                          onClick={() => {
                            setSelectedProject(p);
                            setProjectModalOpen(true);
                          }}
                          className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50/50 transition-all cursor-pointer group"
                        >
                          <div className="mt-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-50 flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                              <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                {p.title}
                              </p>
                              <Badge className={`${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} text-[11px] font-semibold`}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className={`px-2 py-0.5 rounded-md ${tag.bg} ${tag.text} font-semibold text-[10px]`}>
                                {tag.label}
                              </span>
                              {p.deadline && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Entrega: {formatDate(p.deadline)}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all self-center" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Right Col: Atalhos Rápidos */}
              <motion.div
                variants={itemVariants}
                className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" /> Atalhos Rápidos
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Ações essenciais do seu dia a dia.</p>
                  </div>

                  <div className="space-y-2.5">
                    <Button
                      onClick={() => setOpenTicketModal(true)}
                      variant="outline"
                      className="w-full justify-start gap-3 h-11 text-xs font-bold text-slate-800 hover:text-blue-600 hover:border-blue-300 rounded-xl"
                    >
                      <LifeBuoy className="h-4 w-4 text-blue-600" /> Abrir Novo Chamado no SAC
                    </Button>
                    <Button
                      onClick={() => setActiveTab("projetos")}
                      variant="outline"
                      className="w-full justify-start gap-3 h-11 text-xs font-bold text-slate-800 hover:text-blue-600 hover:border-blue-300 rounded-xl"
                    >
                      <Briefcase className="h-4 w-4 text-blue-600" /> Acessar Meus Projetos
                    </Button>
                    <Button
                      onClick={() => setActiveTab("documentos")}
                      variant="outline"
                      className="w-full justify-start gap-3 h-11 text-xs font-bold text-slate-800 hover:text-blue-600 hover:border-blue-300 rounded-xl"
                    >
                      <FileCheck className="h-4 w-4 text-blue-600" /> Baixar Contratos & Notas Fiscais
                    </Button>
                    <Button
                      onClick={() => setActiveTab("configuracoes")}
                      variant="outline"
                      className="w-full justify-start gap-3 h-11 text-xs font-bold text-slate-800 hover:text-blue-600 hover:border-blue-300 rounded-xl"
                    >
                      <User className="h-4 w-4 text-blue-600" /> Atualizar Dados & Senha
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Info className="h-4 w-4 text-blue-600" /> Atendimento Exclusivo
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Precisa de um suporte emergencial? Nosso SAC responde seus chamados em até 2 horas úteis.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 2: MEUS PROJETOS (SEM KANBAN - GRADE DE CARDS ELEGANTES)
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="projetos" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <Briefcase className="h-5 w-5 text-blue-600" /> Meus Projetos Contratados
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Acompanhe o escopo, cronograma, entregáveis e acesse os contratos e notas fiscais de cada serviço.
                </p>
              </div>

              {/* Search & Service Filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Buscar projeto..."
                    className="h-9 pl-9 text-xs w-48 sm:w-56 rounded-xl"
                  />
                </div>
                <Select value={projectFilterService} onValueChange={setProjectFilterService}>
                  <SelectTrigger className="h-9 text-xs w-36 rounded-xl">
                    <SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Áreas</SelectItem>
                    <SelectItem value="IA">Inteligência Artificial</SelectItem>
                    <SelectItem value="Trafego">Tráfego Pago</SelectItem>
                    <SelectItem value="Sites">Sites & Web</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Projects Card Grid */}
            {filteredProjects.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Briefcase className="h-12 w-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Nenhum projeto encontrado</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {projectSearch || projectFilterService !== "all"
                    ? "Tente ajustar os filtros de busca para encontrar o projeto desejado."
                    : "Você ainda não possui projetos em andamento. Entre em contato com nossa equipe para novas contratações."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((p) => {
                  const tag = SERVICE_TAG_STYLES[p.service_type] || {
                    label: p.service_type,
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    border: "border-slate-200",
                  };
                  const statusInfo = STATUS_BADGE_STYLES[p.status] || {
                    label: p.status,
                    bg: "bg-blue-50",
                    text: "text-blue-700",
                    border: "border-blue-200",
                  };

                  // Calculate estimated progress
                  const isDone = ["Concluido", "Concluida", "Aprovado pelo Cliente"].includes(p.status);
                  const progressVal = isDone ? 100 : p.status === "Em Execução" || p.status === "Em Andamento" ? 65 : 25;

                  return (
                    <motion.div
                      key={p.id}
                      whileHover={{ y: -3 }}
                      className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-1 rounded-full ${tag.bg} ${tag.text} ${tag.border} text-xs font-bold`}>
                            {tag.label}
                          </span>
                          <Badge className={`${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} text-xs font-semibold`}>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">{p.title}</h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {p.briefing_content || "Projeto de prestação de serviços com escopo e entregas gerenciadas pela Delski Cloud."}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>Progresso Estimado</span>
                            <span className="text-blue-600">{progressVal}%</span>
                          </div>
                          <Progress value={progressVal} className="h-1.5 bg-slate-100" />
                        </div>

                        {/* Deadline & Details Button */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{p.deadline ? formatDate(p.deadline) : "Em definição"}</span>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedProject(p);
                              setProjectModalOpen(true);
                            }}
                            className="h-8 px-3 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200/80 rounded-xl transition-all"
                          >
                            Ver Detalhes & Documentos
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 3: CENTRAL DE ATENDIMENTO / SAC
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="ocorrencias" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <LifeBuoy className="h-5 w-5 text-blue-600" /> Central de Atendimento & SAC
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Abra solicitações de suporte, tire dúvidas de faturamento ou escopo e converse diretamente com a gestão.
                </p>
              </div>

              <Button
                onClick={() => setOpenTicketModal(true)}
                className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Novo Chamado
              </Button>
            </div>

            {/* Tickets List */}
            {tickets.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <LifeBuoy className="h-12 w-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Nenhum chamado aberto</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Você não possui ocorrências pendentes no momento. Caso precise de suporte, clique em "Novo Chamado".
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((t) => {
                  const statusInfo = STATUS_BADGE_STYLES[t.status] || {
                    label: t.status,
                    bg: "bg-blue-50",
                    text: "text-blue-700",
                    border: "border-blue-200",
                  };

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="p-5 rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <MessageSquare className="h-4 w-4" />
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{t.subject}</h4>
                            <p className="text-xs text-slate-500">
                              Protocolo: <span className="font-mono text-[11px]">{t.id.slice(0, 8)}</span> • {formatDate(t.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={`${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} text-xs font-semibold`}>
                            {statusInfo.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-medium text-slate-600">
                            {t.category || "Geral"}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/80 p-3 rounded-xl">
                        {t.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 text-blue-600 font-semibold">
                          <MessageSquare className="h-3.5 w-3.5" /> {(t.replies || []).length} resposta{(t.replies || []).length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-blue-600 font-bold flex items-center gap-1 hover:underline">
                          Abrir conversa <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 4: DOCUMENTOS & FATURAS
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="documentos" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-blue-600" /> Documentos, Contratos & Notas Fiscais
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Acesse os contratos assinados, relatórios de entrega e faça download das Notas Fiscais de Serviço (NFS-e).
                </p>
              </div>

              <Button
                onClick={() => setOpenReceiptModal(true)}
                className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
              >
                <UploadCloud className="h-4 w-4" /> Enviar Comprovante de Pagamento
              </Button>
            </div>

            {/* Documentos Anexados */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-600" /> Arquivos & Contratos da Empresa
              </h3>

              {clientDocs.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-2xl border-slate-200 text-slate-500 text-xs">
                  Nenhum documento anexado no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3 bg-slate-50/50"
                    >
                      <div className="flex items-start gap-3">
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {doc.document_type.replace(/_/g, " ").toUpperCase()}
                          </p>
                          <p className="text-[11px] text-slate-500">{formatDate(doc.uploaded_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                        {doc.file_url && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(doc.file_url!, "_blank")}
                              className="h-8 text-xs font-semibold flex-1 rounded-xl gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" /> Visualizar
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
                              className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5"
                            >
                              <Download className="h-3.5 w-3.5" /> Baixar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notas Fiscais Emitidas (NFS-e) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" /> Notas Fiscais de Serviço (NFS-e)
              </h3>

              {emittedNfses.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-2xl border-slate-200 text-slate-500 text-xs">
                  Nenhuma nota fiscal emitida até o momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {emittedNfses.map((nf) => (
                    <div
                      key={nf.id}
                      className="p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3 bg-white shadow-xs"
                    >
                      <div className="flex items-start gap-3">
                        <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                          <Receipt className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900">
                            NFS-e Nº {nf.invoice_number || "—"}
                          </p>
                          <p className="text-xs font-semibold text-emerald-700">{money(nf.amount)}</p>
                          <p className="text-[11px] text-slate-500">{formatDate(nf.issue_date || nf.created_at)}</p>
                        </div>
                      </div>

                      {nf.pdf_url && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(nf.pdf_url!, "_blank")}
                            className="h-8 text-xs font-semibold flex-1 rounded-xl gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" /> Visualizar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = nf.pdf_url!;
                              a.download = `NFSe_${nf.invoice_number || nf.id}.pdf`;
                              a.target = "_blank";
                              a.click();
                            }}
                            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" /> Baixar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            ABA 5: CONFIGURAÇÕES DA CONTA DO CLIENTE
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="configuracoes" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <User className="h-5 w-5 text-blue-600" /> Configurações da Conta & Segurança
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Gerencie seus dados corporativos, responsável de contato, foto de perfil e senha de acesso.
              </p>
            </div>

            {/* Avatar & Identidade */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              <div className="relative group">
                <Avatar className="h-20 w-20 rounded-2xl border-2 border-blue-600/20 shadow-xs">
                  <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-blue-600 text-white text-xl font-bold rounded-2xl">
                    {(companyName || contactName || "CL").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/40 text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                <h3 className="text-sm font-bold text-slate-900">Foto de Perfil / Logotipo</h3>
                <p className="text-xs text-slate-500">Arquivos PNG, JPG ou WEBP de até 5MB.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="h-8 text-xs font-semibold rounded-xl gap-1.5 mt-2"
                >
                  {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                  {uploadingAvatar ? "Enviando..." : "Alterar Foto"}
                </Button>
              </div>
            </div>

            {/* Form Dados Corporativos */}
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" /> Dados Corporativos & Contato
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="s-company" className="text-xs font-semibold text-slate-700">
                    Nome Fantasia <span className="text-blue-600">*</span>
                  </Label>
                  <Input
                    id="s-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="s-corp" className="text-xs font-semibold text-slate-700">
                    Razão Social
                  </Label>
                  <Input
                    id="s-corp"
                    value={corporateName}
                    onChange={(e) => setCorporateName(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-cnpj" className="text-xs font-semibold text-slate-700">
                    CNPJ
                  </Label>
                  <Input
                    id="s-cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                    className="h-10 text-xs rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-segment" className="text-xs font-semibold text-slate-700">
                    Segmento de Atuação
                  </Label>
                  <Input
                    id="s-segment"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: Tecnologia, E-commerce"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-email" className="text-xs font-semibold text-slate-700">
                    E-mail Corporativo <span className="text-blue-600">*</span>
                  </Label>
                  <Input
                    id="s-email"
                    type="email"
                    value={corporateEmail}
                    onChange={(e) => setCorporateEmail(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-contact" className="text-xs font-semibold text-slate-700">
                    Nome do Responsável Legal
                  </Label>
                  <Input
                    id="s-contact"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-role" className="text-xs font-semibold text-slate-700">
                    Cargo / Função
                  </Label>
                  <Input
                    id="s-role"
                    value={rolePosition}
                    onChange={(e) => setRolePosition(e.target.value)}
                    placeholder="Ex: Diretor de Operações"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-phone" className="text-xs font-semibold text-slate-700">
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    id="s-phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-cep" className="text-xs font-semibold text-slate-700">
                    CEP
                  </Label>
                  <Input
                    id="s-cep"
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
                  <Label htmlFor="s-addr" className="text-xs font-semibold text-slate-700">
                    Endereço Completo
                  </Label>
                  <Input
                    id="s-addr"
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
                  className="h-10 px-6 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {savingSettings ? "Salvando..." : "Salvar Alterações Cadastrais"}
                </Button>
              </div>
            </form>

            {/* Troca de Senha */}
            <form onSubmit={handleChangePassword} className="space-y-5 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-600" /> Alteração Segura de Senha
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="s-new-pass" className="text-xs font-semibold text-slate-700">
                    Nova Senha <span className="text-blue-600">*</span>
                  </Label>
                  <Input
                    id="s-new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-conf-pass" className="text-xs font-semibold text-slate-700">
                    Confirmar Nova Senha <span className="text-blue-600">*</span>
                  </Label>
                  <Input
                    id="s-conf-pass"
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
                  className="h-10 px-6 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {changingPassword ? "Alterando..." : "Atualizar Senha de Acesso"}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: DETALHES DO PROJETO & DOCUMENTAÇÕES / ANEXOS
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
        <DialogContent className="sm:max-w-[650px] bg-white rounded-3xl p-6 sm:p-8 space-y-6">
          <DialogHeader className="space-y-1.5 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                {selectedProject?.service_type || "Projeto"}
              </span>
              <Badge variant="outline" className="text-xs font-semibold">
                {selectedProject?.status || "Em Andamento"}
              </Badge>
            </div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              {selectedProject?.title}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="escopo" className="space-y-5">
            <TabsList className="bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="escopo" className="rounded-lg text-xs font-bold">
                Escopo & Prazos
              </TabsTrigger>
              <TabsTrigger value="documentos" className="rounded-lg text-xs font-bold">
                Documentações & Anexos
              </TabsTrigger>
            </TabsList>

            {/* Guia 1: Escopo & Prazos */}
            <TabsContent value="escopo" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Resumo do Briefing</Label>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
                  {selectedProject?.briefing_content || "Sem descrição detalhada cadastrada."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium">Início / Criação</span>
                  <p className="font-bold text-slate-900 mt-0.5">{formatDate(selectedProject?.created_at)}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium">Prazo de Conclusão</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedProject?.deadline ? formatDate(selectedProject.deadline) : "Em definição"}</p>
                </div>
              </div>
            </TabsContent>

            {/* Guia 2: Documentações & Anexos */}
            <TabsContent value="documentos" className="space-y-4">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-700">Documentos do Projeto (Contratos & NF-e)</Label>

                {/* Filter docs for this project */}
                {(() => {
                  const projectDocs = clientDocs.filter((d) => d.project_id === selectedProject?.id || ["contrato_prestacao_servicos", "nota_fiscal"].includes(d.document_type));

                  if (projectDocs.length === 0) {
                    return (
                      <div className="p-6 text-center border border-dashed rounded-2xl border-slate-200 text-xs text-slate-500 space-y-1">
                        <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">Nenhum documento anexado ainda</p>
                        <p className="text-[11px]">O gestor anexará o contrato assinado e a NF-e em breve.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto">
                      {projectDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/70"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {doc.document_type.replace(/_/g, " ").toUpperCase()}
                              </p>
                              <p className="text-[10px] text-slate-500">{formatDate(doc.uploaded_at)}</p>
                            </div>
                          </div>

                          {doc.file_url && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(doc.file_url!, "_blank")}
                                className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1"
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
                                className="h-7 px-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1"
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

              {/* Upload form for client/manager inside modal */}
              <form onSubmit={handleUploadProjectDoc} className="space-y-3 pt-3 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-700">Anexar Novo Arquivo / Documento</Label>
                <div className="flex items-center gap-2">
                  <Select value={projectDocType} onValueChange={setProjectDocType}>
                    <SelectTrigger className="h-9 text-xs w-44 rounded-xl">
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
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: ABERTURA DE NOVO CHAMADO NO SAC
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={openTicketModal} onOpenChange={setOpenTicketModal}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl p-6 sm:p-8 space-y-4">
          <DialogHeader className="space-y-1.5 border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-blue-600" /> Abrir Novo Chamado no SAC
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Envie sua solicitação diretamente para a equipe de gestão da Delski.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Assunto <span className="text-blue-600">*</span>
              </Label>
              <Input
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Ex: Dúvida sobre entrega do Site"
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Categoria</Label>
                <Select value={ticketCategory} onValueChange={setTicketCategory}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
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
                <Label className="text-xs font-bold text-slate-700">Prioridade</Label>
                <Select value={ticketPriority} onValueChange={(val: any) => setTicketPriority(val)}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
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
                <Label className="text-xs font-bold text-slate-700">Projeto Vinculado (Opcional)</Label>
                <Select value={ticketProject} onValueChange={setTicketProject}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
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
              <Label className="text-xs font-bold text-slate-700">
                Descrição do Problema / Solicitação <span className="text-blue-600">*</span>
              </Label>
              <Textarea
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Detalhe o que você precisa..."
                rows={4}
                className="text-xs rounded-xl resize-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Anexo de Evidência / Imagem (Opcional)</Label>
              <Input
                type="file"
                onChange={(e) => setTicketEvidenceFile(e.target.files?.[0] || null)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenTicketModal(false)}
                disabled={submittingTicket}
                className="h-9 px-4 text-xs font-bold rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingTicket}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {submittingTicket ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {submittingTicket ? "Enviando..." : "Enviar Chamado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: CHAT & HISTÓRICO DE RESPOSTAS DO CHAMADO
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-3xl p-6 sm:p-8 space-y-5">
          <DialogHeader className="space-y-1 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold">
                {selectedTicket?.category || "SAC"}
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold">
                {selectedTicket?.status || "Aberto"}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Aberto em {formatDate(selectedTicket?.created_at)} • Protocolo #{selectedTicket?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {/* Conversation Bubble Feed */}
          <div className="space-y-3.5 max-h-72 overflow-y-auto p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            {/* Original message */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>{selectedTicket?.client_name || "Você"}</span>
                <span className="text-[10px] font-normal text-slate-400">{formatDate(selectedTicket?.created_at)}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{selectedTicket?.message}</p>
              {selectedTicket?.evidence_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(selectedTicket.evidence_url!, "_blank")}
                  className="h-7 text-xs font-semibold rounded-lg gap-1 mt-1"
                >
                  <Eye className="h-3 w-3" /> Ver anexo enviado
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
                      ? "bg-blue-50/80 border-blue-200 ml-4 text-slate-900"
                      : "bg-white border-slate-200 mr-4 text-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={isGestorSender ? "text-blue-700 flex items-center gap-1" : "text-slate-800"}>
                      {isGestorSender && <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
                      {reply.sender_name}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">{formatDate(reply.created_at)}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{reply.message}</p>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendChatReply} className="space-y-3 pt-2">
            <Textarea
              value={chatReplyMessage}
              onChange={(e) => setChatReplyMessage(e.target.value)}
              placeholder="Digite sua resposta para a equipe Delski..."
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
                className="h-9 px-4 text-xs font-bold rounded-xl"
              >
                Fechar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={sendingReply || !chatReplyMessage.trim()}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {sendingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {sendingReply ? "Enviando..." : "Enviar Resposta"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: ENVIO DE COMPROVANTE DE PAGAMENTO
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={openReceiptModal} onOpenChange={setOpenReceiptModal}>
        <DialogContent className="sm:max-w-[450px] bg-white rounded-3xl p-6 sm:p-8 space-y-4">
          <DialogHeader className="space-y-1.5 border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-blue-600" /> Enviar Comprovante
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Anexe o comprovante de transferência ou boleto pago para agilizar a baixa financeira.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceiptSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Arquivo do Comprovante (PDF/Imagem) <span className="text-blue-600">*</span></Label>
              <Input
                type="file"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Observações (Opcional)</Label>
              <Textarea
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Ex: Pagamento referente à parcela do mês..."
                rows={3}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenReceiptModal(false)}
                disabled={uploadingReceipt}
                className="h-9 px-4 text-xs font-bold rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={uploadingReceipt}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
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
