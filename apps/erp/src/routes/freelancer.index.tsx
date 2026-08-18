import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  FileText,
  CreditCard,
  Receipt,
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
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Instagram,
  Linkedin,
  Check,
  Briefcase,
  FileSpreadsheet,
  HelpCircle,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  useCurrentFreelancerProfile,
  useUpdateCurrentFreelancerProfile,
  useFreelancerPortalDocuments,
  useUploadFreelancerPortalDocument,
  useDeleteFreelancerPortalDocument,
} from "@/hooks/useFreelancerPortal";
import {
  useFreelancerInvoices,
  useCreateFreelancerInvoice,
  useDeleteFreelancerInvoice,
} from "@/hooks/useFreelancerInvoices";

export const Route = createFileRoute("/freelancer/")({
  head: () => ({
    meta: [
      { title: "Painel do Prestador — DELSKI CLOUD" },
      {
        name: "description",
        content: "Gestão cadastral, financeira e envio de notas fiscais de prestadores Delski.",
      },
    ],
  }),
  component: FreelancerDashboardPage,
});

const money = (n: number) =>
  `R$\u00A0${(n || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (val?: string | null) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
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
  "Em análise": "bg-purple-50 text-purple-700 border-purple-200",
  Aprovada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Reprovada: "bg-red-50 text-red-700 border-red-200",
  aprovado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  em_analise: "bg-purple-50 text-purple-700 border-purple-200",
  rejeitado: "bg-red-50 text-red-700 border-red-200",
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
};

function FreelancerDashboardPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("cadastrais");

  // Profile Query & Mutations
  const {
    data: freelancer,
    isLoading: loadingProfile,
  } = useCurrentFreelancerProfile(user?.id, user?.email || undefined);
  const updateProfile = useUpdateCurrentFreelancerProfile();

  // Documents Query & Mutations
  const freelancerId = freelancer?.id || user?.id || "";
  const {
    data: freelancerDocs = [],
    isLoading: loadingDocs,
  } = useFreelancerPortalDocuments(freelancerId);
  const uploadDoc = useUploadFreelancerPortalDocument();
  const deleteDoc = useDeleteFreelancerPortalDocument();

  // Invoices Query & Mutations
  const {
    data: invoices = [],
    isLoading: loadingInvoices,
  } = useFreelancerInvoices(freelancerId);
  const createInvoice = useCreateFreelancerInvoice();
  const deleteInvoice = useDeleteFreelancerInvoice();

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

  // ── Tab 3: Form state (Dados Bancários do Prestador) ───────────────────────
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [pixType, setPixType] = useState("CNPJ");
  const [pixKey, setPixKey] = useState("");

  useEffect(() => {
    if (freelancer) {
      setCompanyName(freelancer.company_name || "");
      setCorporateName(freelancer.corporate_name || "");
      setCnpj(freelancer.cnpj ? formatCNPJ(freelancer.cnpj) : "");
      setSegment(freelancer.segment || "");
      setCorporateEmail(freelancer.email || user?.email || "");
      setAddress(freelancer.address || "");
      setCity(freelancer.city || "");
      setState(freelancer.state || "");
      setCep(freelancer.cep ? formatCEP(freelancer.cep) : "");
      setContactName(freelancer.full_name || profile?.full_name || "");
      setRolePosition(freelancer.role_position || "");
      setPhone(freelancer.phone ? formatPhone(freelancer.phone) : "");
      setInstagram(freelancer.instagram || "");
      setLinkedin(freelancer.linkedin || "");
      setWebsite(freelancer.website || "");

      setBankName(freelancer.bank_name || "");
      setBankAgency(freelancer.bank_agency || "");
      setBankAccount(freelancer.bank_account || "");
      setPixType(freelancer.pix_type || "CNPJ");
      setPixKey(freelancer.pix_key || "");
    }
  }, [freelancer, user, profile]);

  const handleSaveCadastral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corporateEmail.trim()) {
      return toast.error("E-mail corporativo é obrigatório.");
    }

    updateProfile.mutate({
      freelancerId,
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
        full_name: contactName.trim(),
        role_position: rolePosition.trim(),
        phone: phone.trim(),
        instagram: instagram.trim(),
        linkedin: linkedin.trim(),
        website: website.trim(),
      },
    });
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !pixKey.trim()) {
      return toast.error("Informe o Banco e a Chave PIX.");
    }

    updateProfile.mutate({
      freelancerId,
      userId: user?.id,
      patch: {
        bank_name: bankName.trim(),
        bank_agency: bankAgency.trim(),
        bank_account: bankAccount.trim(),
        pix_type: pixType,
        pix_key: pixKey.trim(),
      },
    });
  };

  // ── Tab 2: Document upload state ──────────────────────────────────────────
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const handleDocUpload = async (docType: any, file: File) => {
    if (!freelancerId) return;
    setUploadingType(docType);
    try {
      await uploadDoc.mutateAsync({
        freelancerId,
        documentType: docType,
        file,
      });
    } finally {
      setUploadingType(null);
    }
  };

  // ── Tab 4: Invoice upload modal state ─────────────────────────────────────
  const [openInvoiceModal, setOpenInvoiceModal] = useState(false);
  const [invNumber, setInvNumber] = useState("");
  const [invIssueDate, setInvIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [invCompetence, setInvCompetence] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invPdfFile, setInvPdfFile] = useState<File | null>(null);
  const [invXmlFile, setInvXmlFile] = useState<File | null>(null);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invNumber.trim() || !invAmount || !invPdfFile) {
      return toast.error("Preencha todos os campos obrigatórios e anexe o PDF.");
    }

    setSubmittingInvoice(true);
    try {
      await createInvoice.mutateAsync({
        freelancerId,
        invoiceNumber: invNumber.trim(),
        issueDate: invIssueDate,
        competence: invCompetence.trim() || "Atual",
        amount: Number(invAmount) || 0,
        providerName: companyName || contactName || "Prestador",
        pdfFile: invPdfFile,
        xmlFile: invXmlFile,
      });

      setInvNumber("");
      setInvAmount("");
      setInvCompetence("");
      setInvPdfFile(null);
      setInvXmlFile(null);
      setOpenInvoiceModal(false);
    } finally {
      setSubmittingInvoice(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
        <p className="text-sm text-gray-500 font-medium">
          Carregando painel do prestador...
        </p>
      </div>
    );
  }

  const displayName = companyName || contactName || "Prestador";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Badge className="bg-white/20 hover:bg-white/25 text-white border-0 text-xs font-semibold py-1 px-3">
            Portal do Prestador PJ
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Olá, {contactName || "Prestador"} 👋
          </h1>
          <p className="text-blue-100 text-sm max-w-xl">
            Gerencie seus dados cadastrais, documentação societária, dados bancários e envie suas Notas Fiscais para liquidação de honorários.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setOpenInvoiceModal(true)}
            className="bg-white text-indigo-700 hover:bg-blue-50 font-semibold shadow-sm text-xs sm:text-sm h-10 px-4 flex items-center gap-2"
          >
            <Receipt className="h-4 w-4" /> Cadastrar Nota Fiscal
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
              <Building2 className="h-4 w-4" /> 1. Dados Cadastrais
            </TabsTrigger>
            <TabsTrigger
              value="documentacao"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-bold text-gray-600 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> 2. Documentação
            </TabsTrigger>
            <TabsTrigger
              value="financeiro"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-bold text-gray-600 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" /> 3. Dados Financeiros
            </TabsTrigger>
            <TabsTrigger
              value="notas"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-bold text-gray-600 text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" /> 4. Comprovantes Fiscais (NFs) ({invoices.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── ABA 1: DADOS CADASTRAIS ──────────────────────────────────────── */}
        <TabsContent value="cadastrais" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" /> Informações Cadastrais da PJ
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Mantenha os dados cadastrais da sua empresa atualizados para fins de contrato e faturamento.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCadastral} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="f-name" className="text-xs font-semibold text-gray-700">
                    Nome Fantasia
                  </Label>
                  <Input
                    id="f-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nome comercial ou artístico"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="f-corp" className="text-xs font-semibold text-gray-700">
                    Razão Social
                  </Label>
                  <Input
                    id="f-corp"
                    value={corporateName}
                    onChange={(e) => setCorporateName(e.target.value)}
                    placeholder="Razão Social completa"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-cnpj" className="text-xs font-semibold text-gray-700">
                    CNPJ
                  </Label>
                  <Input
                    id="f-cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="h-10 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-segment" className="text-xs font-semibold text-gray-700">
                    Segmento / Especialidade
                  </Label>
                  <Input
                    id="f-segment"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex: Tráfego Pago, Desenvolvimento, Design"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-email" className="text-xs font-semibold text-gray-700">
                    E-mail Corporativo <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="f-email"
                      type="email"
                      value={corporateEmail}
                      onChange={(e) => setCorporateEmail(e.target.value)}
                      placeholder="prestador@empresa.com"
                      className="h-10 pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="f-addr" className="text-xs font-semibold text-gray-700">
                    Endereço Completo
                  </Label>
                  <Input
                    id="f-addr"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro, Complemento"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-cep" className="text-xs font-semibold text-gray-700">
                    CEP
                  </Label>
                  <Input
                    id="f-cep"
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    placeholder="00000-000"
                    maxLength={9}
                    className="h-10 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-city" className="text-xs font-semibold text-gray-700">
                    Cidade / UF
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="f-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                      className="h-10 flex-1"
                    />
                    <Input
                      id="f-state"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      placeholder="UF"
                      maxLength={2}
                      className="h-10 w-16 text-center font-mono text-sm uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-contact" className="text-xs font-semibold text-gray-700">
                    Nome do Responsável
                  </Label>
                  <Input
                    id="f-contact"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nome completo"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-role" className="text-xs font-semibold text-gray-700">
                    Cargo / Função
                  </Label>
                  <Input
                    id="f-role"
                    value={rolePosition}
                    onChange={(e) => setRolePosition(e.target.value)}
                    placeholder="Ex: Desenvolvedor Senior / Gestor de Tráfego"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-phone" className="text-xs font-semibold text-gray-700">
                    WhatsApp
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="f-phone"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className="h-10 pl-9 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-site" className="text-xs font-semibold text-gray-700">
                    Site / Portfólio
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="f-site"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://meusite.com"
                      className="h-10 pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-insta" className="text-xs font-semibold text-gray-700">
                    Instagram
                  </Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="f-insta"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@perfil"
                      className="h-10 pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-link" className="text-xs font-semibold text-gray-700">
                    LinkedIn
                  </Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="f-link"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="linkedin.com/in/..."
                      className="h-10 pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-sm flex items-center gap-2"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Salvar Dados Cadastrais
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* ── ABA 2: DOCUMENTAÇÃO ─────────────────────────────────────────── */}
        <TabsContent value="documentacao" className="space-y-6 focus-visible:outline-none">
          {/* Seção 1: Contrato Oficial Emitido pela Delski (Visualização do Prestador) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" /> Contrato de Prestação de Serviços (Delski)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Documento formal emitido e homologado pela diretoria da Delski regulamentando as entregas.
                </p>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 text-gray-700 border-gray-200">
                Homologado pela Diretoria
              </Badge>
            </div>

            {(() => {
              const contractDoc = freelancerDocs.find(
                (d) =>
                  d.document_type === "contrato_prestacao" ||
                  d.document_type === "contrato_assinado"
              );

              const downloadUrl = contractDoc?.file_url || contractDoc?.public_url;

              if (downloadUrl) {
                return (
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Contrato Oficial de Prestação de Serviços
                        </p>
                        <p className="text-xs text-gray-500">
                          Documento disponível para consulta e download
                        </p>
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
                  <p className="text-sm font-medium text-gray-700">
                    Contrato em elaboração pelo gestor
                  </p>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Assim que seu contrato for anexado pela equipe jurídica/administrativa da Delski, ele ficará disponível para download aqui.
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Seção 2: Documentos Societários e Certidões (Prestador Envia e Consulta) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600" /> Documentos do Prestador
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Envie os comprovantes e certidões necessárias para a manutenção da conformidade do seu cadastro.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: "cartao_cnpj",
                  title: "Comprovante de CNPJ Ativo",
                  desc: "Cartão CNPJ atualizado da Receita Federal",
                },
                {
                  id: "doc_constitutivo",
                  title: "Documento Constitutivo ou CCMEI",
                  desc: "Contrato Social ou Certificado MEI registrado",
                },
                {
                  id: "consulta_projudi",
                  title: "Consulta ProJudi",
                  desc: "Certidão ou comprovante de distribuição judicial",
                },
                {
                  id: "rg_cnh",
                  title: "RG ou CNH do Responsável",
                  desc: "Documento com foto do responsável legal pela PJ",
                },
                {
                  id: "certidao_trabalhista",
                  title: "Certidão de Débitos Trabalhistas (CNDT)",
                  desc: "Certidão negativa emitida pela Justiça do Trabalho",
                },
              ].map((item) => {
                const existing = freelancerDocs.find(
                  (d) => d.document_type === item.id
                );
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
                          <h3 className="font-semibold text-sm text-gray-900">
                            {item.title}
                          </h3>
                          {existing && (
                            <Badge
                              className={`text-[10px] py-0 px-2 font-medium ${
                                STATUS_BADGE_STYLES[existing.status] ||
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {existing.status === "aprovado"
                                ? "Aprovado"
                                : existing.status === "em_analise"
                                  ? "Em Análise"
                                  : "Pendente"}
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
                            href={
                              existing.file_url || existing.public_url || "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Visualizar Arquivo
                          </a>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              deleteDoc.mutate({
                                documentId: existing.id,
                                filePath: existing.file_path,
                              })
                            }
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
          {/* Seção A: Dados Bancários & Chave PIX (Preenchidos pelo Prestador) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" /> Dados Bancários & Chave PIX
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Informe a conta bancária da sua PJ onde os pagamentos e reembolsos serão creditados.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveBank} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="bank" className="text-xs font-semibold text-gray-700">
                    Banco <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú, Banco Inter"
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pixtype" className="text-xs font-semibold text-gray-700">
                    Tipo de Chave PIX <span className="text-red-500">*</span>
                  </Label>
                  <Select value={pixType} onValueChange={setPixType}>
                    <SelectTrigger id="pixtype" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                      <SelectItem value="E-mail">E-mail</SelectItem>
                      <SelectItem value="Telefone">Telefone</SelectItem>
                      <SelectItem value="Chave Aleatória">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pixkey" className="text-xs font-semibold text-gray-700">
                    Chave PIX <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pixkey"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Chave Pix para recebimento"
                    className="h-10 font-mono text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="agency" className="text-xs font-semibold text-gray-700">
                    Agência
                  </Label>
                  <Input
                    id="agency"
                    value={bankAgency}
                    onChange={(e) => setBankAgency(e.target.value)}
                    placeholder="0001"
                    className="h-10 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account" className="text-xs font-semibold text-gray-700">
                    Conta Corrente
                  </Label>
                  <Input
                    id="account"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="123456-7"
                    className="h-10 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5 shadow-sm flex items-center gap-2"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Atualizar Dados Bancários
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Seção B: Condições de Contratação & Comprovantes (Definidos pelo Gestor) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" /> Condições Comerciais & Pagamentos (Delski)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Parâmetros de remuneração acordados e comprovantes bancários de liquidação.
                </p>
              </div>
              <Badge
                className={`text-xs px-3 py-1 font-semibold ${
                  STATUS_BADGE_STYLES[freelancer?.financial_status || "Pendente"]
                }`}
              >
                Status: {freelancer?.financial_status || "Pendente"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Modelo Contratual
                </span>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {freelancer?.contract_model || "Mensal"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Valor Contratado
                </span>
                <p className="text-lg font-bold text-blue-600 mt-1">
                  {money(Number(freelancer?.contract_value) || 0)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Data de Pagamento
                </span>
                <p className="text-sm font-bold text-gray-900 mt-2">
                  {freelancer?.payment_date
                    ? formatDate(freelancer.payment_date)
                    : "Dia 10 do mês subsequente"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Data de Vencimento
                </span>
                <p className="text-sm font-bold text-gray-900 mt-2">
                  {freelancer?.due_date
                    ? formatDate(freelancer.due_date)
                    : "Dia 15 do mês"}
                </p>
              </div>
            </div>

            {/* Comprovantes de Pagamento anexados pela Delski */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Comprovantes de Pagamento Anexados
              </h3>

              {(() => {
                const receipts = freelancerDocs.filter(
                  (d) => d.document_type === "comprovante_pagamento"
                );

                if (receipts.length === 0) {
                  return (
                    <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl space-y-1">
                      <p className="text-xs text-gray-500 font-medium">
                        Nenhum comprovante de pagamento anexado pela equipe financeira.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-gray-100 border rounded-xl">
                    {receipts.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileCheck className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {rec.review_notes || "Comprovante de Pagamento Bancário"}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Anexado em {formatDate(rec.uploaded_at || rec.created_at)}
                            </p>
                          </div>
                        </div>

                        <a
                          href={rec.file_url || rec.public_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-3.5 w-3.5" /> Baixar Comprovante
                        </a>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </TabsContent>

        {/* ── ABA 4: COMPROVANTES FISCAIS (NOTAS FISCAIS) ──────────────────── */}
        <TabsContent value="notas" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" /> Histórico & Envio de Notas Fiscais
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cadastre as Notas Fiscais de prestação de serviços com seus respectivos arquivos PDF e XML para liquidação.
                </p>
              </div>

              <Button
                onClick={() => setOpenInvoiceModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm h-10 px-4 flex items-center gap-2 shadow-xs"
              >
                <Plus className="h-4 w-4" /> Nova Nota Fiscal
              </Button>
            </div>

            {invoices.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3">
                <Receipt className="h-10 w-10 text-gray-300 mx-auto" />
                <h3 className="font-semibold text-gray-800 text-sm">
                  Nenhuma nota fiscal cadastrada
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Envie sua Nota Fiscal mensal clicando no botão acima para que a equipe financeira valide e libere o pagamento.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Número NF</th>
                      <th className="py-3 px-4">Competência</th>
                      <th className="py-3 px-4">Data Emissão</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4">Arquivos</th>
                      <th className="py-3 px-4">Parecer do Gestor</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap">
                          {inv.competence}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">
                          {formatDate(inv.issue_date || inv.created_at)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-600 whitespace-nowrap">
                          {money(Number(inv.amount))}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap space-x-2">
                          {inv.file_url && (
                            <a
                              href={inv.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <Download className="h-3 w-3" /> PDF
                            </a>
                          )}
                          {inv.xml_file_url && (
                            <a
                              href={inv.xml_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                            >
                              <FileCode className="h-3 w-3" /> XML
                            </a>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600 max-w-xs">
                          {inv.review_notes ? (
                            <span className="italic">{inv.review_notes}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            className={`text-xs px-2.5 py-0.5 font-medium ${
                              STATUS_BADGE_STYLES[inv.status] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {inv.status}
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

      {/* ── MODAL: Cadastrar Nota Fiscal ────────────────────────────────────── */}
      <Dialog open={openInvoiceModal} onOpenChange={setOpenInvoiceModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Receipt className="h-5 w-5 text-blue-600" /> Cadastrar Nova Nota Fiscal
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Preencha os dados da NF emitida e anexe o arquivo PDF (e opcionalmente XML).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-num" className="text-xs font-semibold text-gray-700">
                  Número da Nota Fiscal <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="inv-num"
                  value={invNumber}
                  onChange={(e) => setInvNumber(e.target.value)}
                  placeholder="Ex: 2026/001"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-comp" className="text-xs font-semibold text-gray-700">
                  Competência (Mês/Ano) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="inv-comp"
                  value={invCompetence}
                  onChange={(e) => setInvCompetence(e.target.value)}
                  placeholder="Ex: 08/2026"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-date" className="text-xs font-semibold text-gray-700">
                  Data de Emissão <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="inv-date"
                  type="date"
                  value={invIssueDate}
                  onChange={(e) => setInvIssueDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-amt" className="text-xs font-semibold text-gray-700">
                  Valor da NF (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="inv-amt"
                  type="number"
                  step="0.01"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Arquivo PDF da Nota Fiscal <span className="text-red-500">*</span>
              </Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setInvPdfFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Arquivo XML da Nota Fiscal (Opcional)
              </Label>
              <Input
                type="file"
                accept=".xml"
                onChange={(e) => setInvXmlFile(e.target.files?.[0] || null)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenInvoiceModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingInvoice}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
              >
                {submittingInvoice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Enviar Nota Fiscal
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
