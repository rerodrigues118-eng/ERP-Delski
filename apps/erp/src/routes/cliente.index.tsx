import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  FileText,
  DollarSign,
  Kanban,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  useUploadTicketEvidence,
  type SupportTicket,
} from "@/hooks/useSupportTickets";
import { useEmittedServiceInvoices } from "@/hooks/useServiceInvoices";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cliente/")({
  head: () => ({
    meta: [
      { title: "Portal do Cliente — DELSKI CLOUD" },
      { name: "description", content: "Acompanhe seus projetos, documentos, faturas e suporte." },
    ],
  }),
  component: ClienteDashboardPage,
});

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

const STATUS_BADGE_STYLES: Record<string, string> = {
  Pendente: "bg-amber-50 text-amber-700 border-amber-200",
  Pago: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Atrasado: "bg-red-50 text-red-700 border-red-200",
  Aberto: "bg-blue-50 text-blue-700 border-blue-200",
  "Em atendimento": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Em Andamento": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Resolvido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Expirado: "bg-gray-100 text-gray-700 border-gray-200",
  Concluido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pausado: "bg-amber-50 text-amber-700 border-amber-200",
  Cancelado: "bg-red-50 text-red-700 border-red-200",
  aprovado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  em_analise: "bg-purple-50 text-purple-700 border-purple-200",
  rejeitado: "bg-red-50 text-red-700 border-red-200",
};

function ClienteDashboardPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("cadastrais");

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
  const uploadEvidence = useUploadTicketEvidence();

  // Emitted Service Invoices (NFS-e)
  const { data: emittedNfses = [] } = useEmittedServiceInvoices(clientId);

  // Update client mutation
  const updateClientProfile = useUpdateCurrentClientProfile();
  const uploadPaymentReceipt = useUploadClientPaymentReceipt();

  // ── Tab 1: Form state (Dados Cadastrais) ──────────────────────────────────
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
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");

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
      setInstagram(client.instagram || "");
      setLinkedin(client.linkedin || "");
      setWebsite(client.website || "");
    }
  }, [client, user, profile]);

  const handleSaveCadastral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !corporateEmail.trim()) {
      return toast.error("Nome Fantasia e E-mail corporativo são obrigatórios.");
    }

    updateClientProfile.mutate({
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
        instagram: instagram.trim(),
        linkedin: linkedin.trim(),
        website: website.trim(),
      },
    });
  };

  // ── Tab 2: Document upload state ──────────────────────────────────────────
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const handleDocUpload = async (docType: any, file: File) => {
    if (!clientId) return;
    setUploadingType(docType);
    try {
      await uploadDoc.mutateAsync({
        clientId,
        documentType: docType,
        file,
      });
    } finally {
      setUploadingType(null);
    }
  };

  // ── Tab 3: Receipt upload modal state ──────────────────────────────────────
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

  // ── Tab 5: SAC / Support ticket modal state ────────────────────────────────
  const [openTicketModal, setOpenTicketModal] = useState(false);
  const [ticketProject, setTicketProject] = useState<string>("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"Baixa" | "Media" | "Alta" | "Critica">("Media");
  const [ticketEvidenceFile, setTicketEvidenceFile] = useState<File | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      return toast.error("Preencha o assunto e a descrição do problema.");
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
        clientName: client?.company_name || contactName || "Cliente",
        clientEmail: user?.email || corporateEmail,
        category: "Projeto",
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

  if (loadingClient) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
        <p className="text-sm text-gray-500 font-medium">Carregando painel do cliente...</p>
      </div>
    );
  }

  // Derived projects
  const clientProjects = client?.projects || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge className="bg-white/20 hover:bg-white/25 text-white border-0 text-xs font-semibold py-1 px-3">
            Área Restrita do Cliente
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Olá, {contactName || "Cliente"} 👋
          </h1>
          <p className="text-blue-100 text-sm max-w-xl">
            Bem-vindo(a) ao painel corporativo da <strong className="text-white">{client?.company_name || "sua empresa"}</strong>. Aqui você gerencia seus dados, acompanha serviços contratados, documentos fiscais e ocorrências em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setOpenTicketModal(true)}
            className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm text-xs sm:text-sm h-10 px-4 flex items-center gap-2"
          >
            <LifeBuoy className="h-4 w-4" /> Registrar Ocorrência
          </Button>
        </div>
      </div>

      {/* Main Tabs Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex gap-1 min-w-max">
            <TabsTrigger
              value="cadastrais"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-bold text-gray-600 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" /> Dados Cadastrais
            </TabsTrigger>
            <TabsTrigger
              value="documentacao"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-bold text-gray-600 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Documentação
            </TabsTrigger>
            <TabsTrigger
              value="financeiro"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-bold text-gray-600 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" /> Dados Financeiros
            </TabsTrigger>
            <TabsTrigger
              value="projetos"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-bold text-gray-600 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <Kanban className="h-4 w-4" /> Projetos & Serviços ({clientProjects.length})
            </TabsTrigger>
            <TabsTrigger
              value="ocorrencias"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-bold text-gray-600 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <LifeBuoy className="h-4 w-4" /> Ocorrências & SAC ({tickets.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── ABA 1: DADOS CADASTRAIS ──────────────────────────────────────── */}
        <TabsContent value="cadastrais" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" /> Informações Corporativas e de Contato
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Visualize e edite os dados cadastrais da sua empresa. As atualizações refletem nos contratos e faturamento.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCadastral} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name" className="text-xs font-semibold text-gray-700">
                    Nome Fantasia <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="c-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nome comercial da empresa"
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-corp" className="text-xs font-semibold text-gray-700">
                    Razão Social
                  </Label>
                  <Input
                    id="c-corp"
                    value={corporateName}
                    onChange={(e) => setCorporateName(e.target.value)}
                    placeholder="Razão Social completa"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-cnpj" className="text-xs font-semibold text-gray-700">
                    CNPJ
                  </Label>
                  <Input
                    id="c-cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="h-10 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-segment" className="text-xs font-semibold text-gray-700">
                    Segmento de Atuação
                  </Label>
                  <Input
                    id="c-segment"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: E-commerce, Tecnologia, Saúde"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-email" className="text-xs font-semibold text-gray-700">
                    E-mail Corporativo <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="c-email"
                      type="email"
                      value={corporateEmail}
                      onChange={(e) => setCorporateEmail(e.target.value)}
                      placeholder="financeiro@empresa.com"
                      className="h-10 pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-addr" className="text-xs font-semibold text-gray-700">
                    Endereço Completo
                  </Label>
                  <Input
                    id="c-addr"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro, Complemento"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-cep" className="text-xs font-semibold text-gray-700">
                    CEP
                  </Label>
                  <Input
                    id="c-cep"
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                    className="h-10 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-city" className="text-xs font-semibold text-gray-700">
                    Cidade / UF
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="c-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                      className="h-10 flex-1"
                    />
                    <Input
                      id="c-state"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      placeholder="UF"
                      maxLength={2}
                      className="h-10 w-16 text-center font-mono text-sm uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-contact" className="text-xs font-semibold text-gray-700">
                    Responsável Principal
                  </Label>
                  <Input
                    id="c-contact"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nome do representante legal"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-role" className="text-xs font-semibold text-gray-700">
                    Cargo / Função
                  </Label>
                  <Input
                    id="c-role"
                    value={rolePosition}
                    onChange={(e) => setRolePosition(e.target.value)}
                    placeholder="Ex: Diretor / Sócio-Administrador"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-phone" className="text-xs font-semibold text-gray-700">
                    WhatsApp Corporativo
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="c-phone"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className="h-10 pl-9 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-site" className="text-xs font-semibold text-gray-700">
                    Site Institucional
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="c-site"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://empresa.com"
                      className="h-10 pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-insta" className="text-xs font-semibold text-gray-700">
                    Instagram
                  </Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="c-insta"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@empresa"
                      className="h-10 pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-link" className="text-xs font-semibold text-gray-700">
                    LinkedIn
                  </Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="c-link"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="linkedin.com/company/..."
                      className="h-10 pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button
                  type="submit"
                  disabled={updateClientProfile.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-sm flex items-center gap-2"
                >
                  {updateClientProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Salvar Alterações Cadastrais
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* ── ABA 2: DOCUMENTAÇÃO ─────────────────────────────────────────── */}
        <TabsContent value="documentacao" className="space-y-6 focus-visible:outline-none">
          {/* Seção 1: Contrato Oficial Emitido pela Delski (Somente Leitura do Cliente) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" /> Contrato de Prestação de Serviços (Delski)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Documento formal emitido pela diretoria da Delski regulamentando os serviços contratados.
                </p>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 text-gray-700 border-gray-200">
                Apenas Gestor Emite
              </Badge>
            </div>

            {(() => {
              const contractDoc = clientDocs.find(
                (d) => d.document_type === "contrato_prestacao" || d.document_type === "contrato_assinado"
              );
              const projectWithContract = clientProjects.find((p: any) => p.client_contract_url);

              const downloadUrl = contractDoc?.file_url || contractDoc?.public_url || projectWithContract?.client_contract_url;

              if (downloadUrl) {
                return (
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Contrato Oficial de Prestação de Serviços</p>
                        <p className="text-xs text-gray-500">Documento homologado pela Delski Serviços de Tecnologia</p>
                      </div>
                    </div>

                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
                    >
                      <Download className="h-4 w-4" /> Baixar Contrato
                    </a>
                  </div>
                );
              }

              return (
                <div className="p-6 rounded-xl border border-dashed border-gray-200 text-center space-y-2">
                  <FileText className="h-8 w-8 text-gray-300 mx-auto" />
                  <p className="text-sm font-medium text-gray-700">Contrato em emissão pela diretoria</p>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Assim que seu contrato for emitido e homologado pelo gestor Delski, ele ficará disponível para download imediato aqui.
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Seção 2: Documentos da Empresa (Cliente envia e visualiza) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600" /> Documentos Cadastrais da Empresa
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Envie e consulte os comprovantes da sua empresa para manutenção de cadastro e conformidade fiscal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: "cartao_cnpj", title: "Comprovante de CNPJ Ativo", desc: "Cartão CNPJ atualizado da Receita Federal" },
                { id: "doc_constitutivo", title: "Documento Constitutivo", desc: "Contrato Social, Requerimento ou CCMEI" },
                { id: "rg_cnh", title: "RG / CNH do Responsável", desc: "Documento com foto do responsável legal" },
                { id: "procuracao", title: "Procuração (se aplicável)", desc: "Instrumento de representação legal" },
              ].map((item) => {
                const existing = clientDocs.find((d) => d.document_type === item.id);
                const isUploading = uploadingType === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-xl border transition-all ${
                      existing
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-gray-900">{item.title}</h3>
                          {existing && (
                            <Badge className={`text-[10px] py-0 px-2 font-medium ${STATUS_BADGE_STYLES[existing.status] || "bg-gray-100 text-gray-700"}`}>
                              {existing.status === "aprovado" ? "Aprovado" : existing.status === "em_analise" ? "Em Análise" : "Pendente"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      {existing ? (
                        <div className="flex items-center justify-between w-full">
                          <a
                            href={existing.file_url || existing.public_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Visualizar Arquivo
                          </a>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDoc.mutate({ documentId: existing.id, filePath: existing.file_path })}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs px-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Substituir
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDocUpload(item.id, file);
                            }}
                            disabled={isUploading}
                          />
                          {isUploading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
                            </>
                          ) : (
                            <>
                              <UploadCloud className="h-3.5 w-3.5" /> Anexar Documento
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── ABA 3: DADOS FINANCEIROS ─────────────────────────────────────── */}
        <TabsContent value="financeiro" className="space-y-6 focus-visible:outline-none">
          {/* Card Resumo do Contrato Financeiro (Gestor Define / Cliente Apenas Visualiza) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" /> Condições Comerciais & Faturamento
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Parâmetros de contratação, mensalidades e vencimentos pactuados com a Delski.
                </p>
              </div>
              <Badge className={`text-xs px-3 py-1 font-semibold ${STATUS_BADGE_STYLES[client?.financial_status || "Pendente"]}`}>
                Status: {client?.financial_status || "Pendente"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Modelo Contratual</span>
                <p className="text-lg font-bold text-gray-900 mt-1">{client?.contract_model || "Mensal"}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor Contratado</span>
                <p className="text-lg font-bold text-blue-600 mt-1">{money(Number(client?.contract_value) || 0)}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Taxa de Setup</span>
                <p className="text-lg font-bold text-gray-900 mt-1">{money(Number(client?.setup_value) || 0)}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duração</span>
                <p className="text-lg font-bold text-gray-900 mt-1">{client?.contract_duration || "12 meses"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-900">Data de Faturamento / Pagamento</span>
                  <p className="text-sm font-bold text-blue-950 mt-0.5">
                    {client?.payment_date ? new Date(client.payment_date).toLocaleDateString("pt-BR") : "Dia 10 de cada mês"}
                  </p>
                </div>
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-900">Próximo Vencimento</span>
                  <p className="text-sm font-bold text-amber-950 mt-0.5">
                    {client?.due_date ? new Date(client.due_date).toLocaleDateString("pt-BR") : "A definir"}
                  </p>
                </div>
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Seção de Notas Fiscais e Comprovantes de Pagamento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notas Fiscais Emitidas pela Delski */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-600" /> Notas Fiscais de Serviço (NFS-e)
                </h3>
                <span className="text-xs text-gray-400">Faturamento Oficial</span>
              </div>

              {(() => {
                const legacyInvoices = clientDocs.filter((d) => d.document_type === "nota_fiscal");
                const authorizedNfse = emittedNfses.filter((n) => n.status === "autorizada");

                if (authorizedNfse.length === 0 && legacyInvoices.length === 0) {
                  return (
                    <div className="p-8 text-center border border-dashed border-gray-200 rounded-xl space-y-2">
                      <Receipt className="h-6 w-6 text-gray-300 mx-auto" />
                      <p className="text-xs text-gray-500 font-medium">Nenhuma nota fiscal emitida no momento.</p>
                      <p className="text-[11px] text-gray-400">Assim que uma NFS-e for autorizada pela prefeitura, ela estará disponível aqui para download.</p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-gray-100">
                    {authorizedNfse.map((nf) => (
                      <div key={nf.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 font-mono">
                              NFS-e nº {nf.number || "—"}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {formatDate(nf.issued_at)}{" "}
                              • <span className="font-semibold text-blue-600">{money(Number(nf.service_value))}</span>
                            </p>
                            {nf.verification_code && (
                              <p className="text-[10px] text-gray-400 font-mono">
                                Cód: {nf.verification_code}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {nf.pdf_url && (
                            <a
                              href={nf.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <Download className="h-3 w-3" /> PDF
                            </a>
                          )}
                          {nf.xml_url && (
                            <a
                              href={nf.xml_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                              <FileCode className="h-3 w-3" /> XML
                            </a>
                          )}
                        </div>
                      </div>
                    ))}

                    {legacyInvoices.map((nf) => (
                      <div key={nf.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-xs font-semibold text-gray-900">Nota Fiscal Avulsa</p>
                            <p className="text-[11px] text-gray-400">{formatDate(nf.uploaded_at || (nf as any).created_at)}</p>
                          </div>
                        </div>
                        <a
                          href={nf.file_url || nf.public_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Download className="h-3.5 w-3.5" /> Baixar NF
                        </a>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Comprovantes de Pagamento (Cliente Envia) */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Comprovantes de Pagamento
                </h3>
                <Button
                  size="sm"
                  onClick={() => setOpenReceiptModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Anexar Comprovante
                </Button>
              </div>

              {(() => {
                const receipts = clientDocs.filter((d) => d.document_type === "comprovante_pagamento");
                if (receipts.length === 0) {
                  return (
                    <div className="p-8 text-center border border-dashed border-gray-200 rounded-xl space-y-2">
                      <FileCheck className="h-6 w-6 text-gray-300 mx-auto" />
                      <p className="text-xs text-gray-500 font-medium">Nenhum comprovante enviado.</p>
                      <p className="text-[11px] text-gray-400">Após realizar o pagamento da fatura, envie o comprovante acima.</p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-gray-100">
                    {receipts.map((rec) => (
                      <div key={rec.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileCheck className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{rec.review_notes || "Comprovante de Pagamento"}</p>
                            <p className="text-[11px] text-gray-400">{formatDate(rec.uploaded_at || (rec as any).created_at)}</p>
                          </div>
                        </div>
                        <Badge className={`text-[10px] py-0 px-2 ${STATUS_BADGE_STYLES[rec.status] || "bg-gray-100 text-gray-700"}`}>
                          {rec.status === "aprovado" ? "Confirmado" : "Em Análise"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </TabsContent>

        {/* ── ABA 4: PROJETOS / SERVIÇOS ───────────────────────────────────── */}
        <TabsContent value="projetos" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Kanban className="h-5 w-5 text-blue-600" /> Projetos & Escopos Contratados
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Acompanhamento de entregas, responsáveis operacionais e prazos de cada serviço.
                </p>
              </div>
            </div>

            {clientProjects.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3">
                <Kanban className="h-10 w-10 text-gray-300 mx-auto" />
                <h3 className="font-semibold text-gray-800 text-sm">Nenhum projeto alocado no momento</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Os projetos contratados serão sincronizados automaticamente pela equipe Delski com seus respectivos prazos e responsáveis.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {clientProjects.map((project: any) => (
                  <div
                    key={project.id}
                    className="p-5 rounded-2xl border border-gray-200/90 bg-white hover:shadow-sm transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 uppercase font-bold">
                          {project.service_type || "Geral"}
                        </Badge>
                        <h3 className="font-bold text-base text-gray-900">{project.title}</h3>
                      </div>
                      <Badge className={`text-xs px-2.5 py-0.5 font-medium ${STATUS_BADGE_STYLES[project.status] || "bg-gray-100 text-gray-700"}`}>
                        {project.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-400">Responsável Delski:</span>
                        <p className="font-semibold text-gray-800 mt-0.5">Gestor de Contas Delski</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Responsável pelo Cliente:</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{contactName}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Data de Início:</span>
                        <p className="font-medium text-gray-800 mt-0.5">
                          {project.created_at ? new Date(project.created_at).toLocaleDateString("pt-BR") : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Prazo Estimado:</span>
                        <p className="font-medium text-gray-800 mt-0.5">
                          {project.deadline ? new Date(project.deadline).toLocaleDateString("pt-BR") : "Contínuo"}
                        </p>
                      </div>
                    </div>

                    {project.google_drive_link && (
                      <div className="pt-2">
                        <a
                          href={project.google_drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Acessar Pasta de Arquivos e Entregas
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── ABA 5: OCORRÊNCIAS E SAC ─────────────────────────────────────── */}
        <TabsContent value="ocorrencias" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-blue-600" /> Chamados e Alterações de Projeto (SAC)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Registre solicitações de ajuste, dúvidas técnicas ou reporte de ocorrências com acompanhamento em tempo real.
                </p>
              </div>

              <Button
                onClick={() => setOpenTicketModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm h-10 px-4 flex items-center gap-2 shadow-xs"
              >
                <Plus className="h-4 w-4" /> Nova Ocorrência
              </Button>
            </div>

            {tickets.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3">
                <LifeBuoy className="h-10 w-10 text-gray-300 mx-auto" />
                <h3 className="font-semibold text-gray-800 text-sm">Nenhuma ocorrência em aberto</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Precisa de alguma alteração no projeto ou suporte da equipe? Clique no botão acima para abrir um novo chamado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Assunto / Descrição</th>
                      <th className="py-3 px-4">Responsável</th>
                      <th className="py-3 px-4">Prioridade</th>
                      <th className="py-3 px-4">Prazo Resolução</th>
                      <th className="py-3 px-4">Data Resolução</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-900 max-w-xs">
                          <p className="font-semibold text-gray-900 truncate">{t.subject}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{t.message}</p>
                          {t.evidence_url && (
                            <a
                              href={t.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Paperclip className="h-3 w-3" /> Ver Anexo de Evidência
                            </a>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap">
                          {t.responsible_name || "Equipe Delski"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {t.priority || "Média"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap font-mono text-xs">
                          {t.deadline_date ? new Date(t.deadline_date).toLocaleDateString("pt-BR") : "24 a 48h"}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap font-mono text-xs">
                          {t.resolution_date ? new Date(t.resolution_date).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge className={`text-xs px-2.5 py-0.5 font-medium ${STATUS_BADGE_STYLES[t.status] || "bg-gray-100 text-gray-700"}`}>
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── MODAL: Anexar Comprovante de Pagamento ─────────────────────────── */}
      <Dialog open={openReceiptModal} onOpenChange={setOpenReceiptModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Enviar Comprovante de Pagamento
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Anexe o comprovante bancário (PIX, TED ou Boleto) para que a equipe financeira confirme a liquidação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceiptSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Arquivo do Comprovante (PDF, PNG, JPG) *</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-notes" className="text-xs font-semibold text-gray-700">
                Observações / Mês de Referência (Opcional)
              </Label>
              <Input
                id="rec-notes"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Ex: Mensalidade referente a Agosto/2026"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setOpenReceiptModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploadingReceipt}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
              >
                {uploadingReceipt ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Enviar Comprovante
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Nova Ocorrência / Chamado ─────────────────────────────────── */}
      <Dialog open={openTicketModal} onOpenChange={setOpenTicketModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <LifeBuoy className="h-5 w-5 text-blue-600" /> Registrar Nova Ocorrência / Solicitação
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Descreva detalhadamente a alteração desejada ou problema identificado para a equipe técnica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicketSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-proj" className="text-xs font-semibold text-gray-700">
                Projeto Vinculado
              </Label>
              <Select value={ticketProject} onValueChange={setTicketProject}>
                <SelectTrigger id="t-proj" className="h-10">
                  <SelectValue placeholder="Selecione o projeto (ou Geral)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral / Suporte Corporativo</SelectItem>
                  {clientProjects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} ({p.service_type || "Serviço"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-subj" className="text-xs font-semibold text-gray-700">
                Assunto da Solicitação <span className="text-red-500">*</span>
              </Label>
              <Input
                id="t-subj"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Ex: Ajuste no fluxo de captação de leads / Correção visual"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-prio" className="text-xs font-semibold text-gray-700">
                Nível de Prioridade
              </Label>
              <Select value={ticketPriority} onValueChange={(val: any) => setTicketPriority(val)}>
                <SelectTrigger id="t-prio" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa (Dúvidas ou pequenas melhorias)</SelectItem>
                  <SelectItem value="Media">Média (Ajustes de rotina)</SelectItem>
                  <SelectItem value="Alta">Alta (Impacto no fluxo de conversão)</SelectItem>
                  <SelectItem value="Critica">Crítica (Interrupção total de serviço)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="t-msg" className="text-xs font-semibold text-gray-700">
                Descrição Detalhada do Problema / Ajuste <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="t-msg"
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Explique o que aconteceu, onde ocorreu e qual resultado esperado..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Anexo de Evidências / Prints (Opcional)
              </Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setTicketEvidenceFile(e.target.files?.[0] || null)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setOpenTicketModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingTicket}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
              >
                {submittingTicket ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Registrando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Enviar Ocorrência
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
