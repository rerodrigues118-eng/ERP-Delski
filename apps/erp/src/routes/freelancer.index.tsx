import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo } from "react";
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
  LayoutDashboard,
  ArrowRight,
  AlertTriangle,
  FolderKanban,
  Search,
  Filter,
  Eye,
  Layers,
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
import { useProjects, type Project } from "@/hooks/useProjects";
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
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Synchronize activeTab via CustomEvent with the top floating navbar
  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      if (e.detail && typeof e.detail === "string") {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("delski_switch_freelancer_tab", handleTabSwitch);
    return () => window.removeEventListener("delski_switch_freelancer_tab", handleTabSwitch);
  }, []);

  const changeTab = (tabName: string) => {
    setActiveTab(tabName);
    window.dispatchEvent(new CustomEvent("delski_switch_freelancer_tab", { detail: tabName }));
  };

  // Profile Query & Mutations
  const {
    data: freelancer,
    isLoading: loadingProfile,
  } = useCurrentFreelancerProfile(user?.id, user?.email || undefined);
  const updateProfile = useUpdateCurrentFreelancerProfile();

  // Projects Query
  const { data: allProjects = [], isLoading: loadingProjects } = useProjects();

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

  // Filter projects assigned to this freelancer
  const assignedProjects = useMemo(() => {
    return allProjects.filter((p) =>
      p.freelancers?.some((f: any) => {
        const fId = f?.id || f?.profile?.id;
        const fEmail = f?.email || f?.profile?.email;
        return (
          (user?.id && fId === user.id) ||
          (freelancerId && fId === freelancerId) ||
          (user?.email && fEmail?.toLowerCase() === user.email.toLowerCase()) ||
          (corporateEmail && fEmail?.toLowerCase() === corporateEmail.toLowerCase())
        );
      })
    );
  }, [allProjects, user, freelancerId, corporateEmail]);

  const activeProjectsCount = assignedProjects.filter(
    (p) => p.status !== "Concluido" && p.status !== "Cancelado"
  ).length;
  const pendingProjectsCount = assignedProjects.filter(
    (p) => p.status === "Em Andamento" || p.status === "Em Producao" || p.status === "Em Revisao"
  ).length;
  const totalHonorarios = assignedProjects.reduce(
    (acc, p) => acc + Number(p.freelancer_cost || 0),
    0
  );

  const hasPendingDocsOrBank =
    freelancerDocs.length < 3 ||
    !freelancer?.bank_name ||
    !freelancer?.pix_key;

  // Projects Tab Filter State
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("todos");
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<Project | null>(null);

  const filteredAssignedProjects = useMemo(() => {
    return assignedProjects.filter((p) => {
      const q = projectSearchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.client?.full_name && p.client.full_name.toLowerCase().includes(q)) ||
        (p.service_type && p.service_type.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q));

      let matchStatus = true;
      if (projectStatusFilter === "Em Andamento") {
        matchStatus = p.status === "Em Andamento" || p.status === "Em Producao";
      } else if (projectStatusFilter === "Aguardando Inicio") {
        matchStatus =
          p.status === "Criado" ||
          p.status === "Delegado" ||
          p.status === "Solicitado" ||
          p.status === "Aguardando Candidaturas" ||
          p.status === "Em Triagem";
      } else if (projectStatusFilter === "Em Revisao") {
        matchStatus = p.status === "Em Revisao" || p.status === "Revisão de Contrato";
      } else if (projectStatusFilter === "Concluido") {
        matchStatus = p.status === "Concluido";
      }

      return matchSearch && matchStatus;
    });
  }, [assignedProjects, projectSearchTerm, projectStatusFilter]);

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
    <div className="space-y-6">
      {/* Welcome Title (Clean & Modern, idêntico ao Portal do Cliente) */}
      <div className="pt-2 pb-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Bem-vindo de volta,{" "}
          <span className="text-blue-600 dark:text-blue-400">
            {contactName || profile?.full_name || "Prestador"}
          </span>
        </h1>
      </div>

      {/* Main Tabs Workspace (Sincronizado com a Navbar Flutuante Superior) */}
      <Tabs value={activeTab} onValueChange={changeTab} className="space-y-6">

        {/* ── ABA 0: DASHBOARD ────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-6 focus-visible:outline-none">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Projetos Ativos */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Projetos Ativos
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-gray-900">
                {activeProjectsCount}
              </div>
              <p className="text-xs text-gray-400 mt-1 font-medium">
                {assignedProjects.length} demanda(s) atribuída(s)
              </p>
            </div>

            {/* Card 2: Entregas Pendentes */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Entregas Pendentes
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-gray-900">
                {pendingProjectsCount}
              </div>
              <p className="text-xs text-gray-400 mt-1 font-medium">
                Demandas em produção / revisão
              </p>
            </div>

            {/* Card 3: Honorários Alocados */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Honorários Alocados
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">
                {money(totalHonorarios)}
              </div>
              <p className="text-xs text-gray-400 mt-1 font-medium">
                {invoices.length} nota(s) fiscal(is) emitida(s)
              </p>
            </div>
          </div>

          {/* Compliance Banner */}
          {hasPendingDocsOrBank ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Pendência na Homologação Cadastral</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Mantenha sua documentação societária e dados bancários atualizados para garantir a liquidação pontual de seus honorários.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => changeTab("documentacao")}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs gap-1.5 h-9"
                >
                  <FileText className="w-3.5 h-3.5" /> Enviar Documentação
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeTab("financeiro")}
                  className="rounded-xl text-xs gap-1.5 h-9 border-amber-300 text-amber-900"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Dados Bancários
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Cadastro Homologado & Em Dia</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Seus dados cadastrais, documentação societária e chave PIX estão verificados pelo Gestor.
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs px-3 py-1 font-semibold">
                ✓ Regular
              </Badge>
            </div>
          )}

          {/* Recent Assigned Projects Table / List */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-600" /> Últimos Projetos Delegados
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Demandas e serviços vinculados ao seu perfil de especialista
                </p>
              </div>
            </div>

            {loadingProjects ? (
              <div className="py-12 text-center text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs">Carregando projetos...</p>
              </div>
            ) : assignedProjects.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <Briefcase className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-sm font-medium text-gray-600">Nenhum projeto atribuído no momento</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Assim que um novo projeto for delegado a você pelo Gestor, ele aparecerá listado nesta área com prazos e briefing.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3">Projeto</th>
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Serviço</th>
                      <th className="pb-3">Prazo</th>
                      <th className="pb-3 text-right">Honorários</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assignedProjects.slice(0, 8).map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 pr-3 font-semibold text-gray-900">
                          {p.title}
                        </td>
                        <td className="py-3.5 pr-3 text-gray-600">
                          {p.client?.full_name || "Cliente Delski"}
                        </td>
                        <td className="py-3.5 pr-3">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100">
                            {p.service_type}
                          </span>
                        </td>
                        <td className="py-3.5 pr-3 text-gray-600">
                          {formatDate(p.deadline)}
                        </td>
                        <td className="py-3.5 pr-3 text-right font-bold text-emerald-600">
                          {money(p.freelancer_cost || 0)}
                        </td>
                        <td className="py-3.5 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              p.status === "Concluido"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : p.status === "Em Andamento" || p.status === "Em Producao"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── ABA 0.5: PROJETOS DELEGADOS ─────────────────────────────────── */}
        <TabsContent value="projetos" className="space-y-6 focus-visible:outline-none">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-blue-600" /> Projetos Delegados
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Acompanhe os projetos, prazos e escopos atribuídos a você pela equipe Delski Cloud.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
                  {filteredAssignedProjects.length} de {assignedProjects.length} projeto(s)
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  placeholder="Buscar por projeto, cliente ou serviço..."
                  className="pl-9 h-10 text-xs sm:text-sm rounded-xl border-gray-200"
                />
                {projectSearchTerm && (
                  <button
                    onClick={() => setProjectSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="w-full sm:w-56">
                <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                  <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <SelectValue placeholder="Status do Projeto" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Aguardando Inicio">Aguardando Início</SelectItem>
                    <SelectItem value="Em Revisao">Em Revisão</SelectItem>
                    <SelectItem value="Concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Projects List / Grid */}
            {loadingProjects ? (
              <div className="py-16 text-center text-gray-400 space-y-3">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-xs font-medium">Carregando seus projetos...</p>
              </div>
            ) : filteredAssignedProjects.length === 0 ? (
              <div className="py-16 text-center space-y-3 border border-dashed border-gray-200 rounded-2xl p-8 bg-gray-50/50">
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto text-gray-400 shadow-xs">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-800">
                    {projectSearchTerm || projectStatusFilter !== "todos"
                      ? "Nenhum projeto encontrado com os filtros selecionados"
                      : "Nenhum projeto atribuído no momento"}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    {projectSearchTerm || projectStatusFilter !== "todos"
                      ? "Tente alterar os termos de busca ou remover o filtro de status."
                      : "Assim que a equipe gestora delegar um novo projeto a você, ele aparecerá nesta listagem."}
                  </p>
                </div>
                {(projectSearchTerm || projectStatusFilter !== "todos") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProjectSearchTerm("");
                      setProjectStatusFilter("todos");
                    }}
                    className="rounded-xl text-xs mt-2"
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAssignedProjects.map((project) => {
                  const status = project.status;
                  const isDone = status === "Concluido";
                  const isInProgress = status === "Em Andamento" || status === "Em Producao";
                  const isReview = status === "Em Revisao" || status === "Revisão de Contrato";

                  return (
                    <div
                      key={project.id}
                      className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs hover:shadow-md hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Card Header: Title + Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">
                              {project.client?.full_name || "Cliente Delski"}
                            </span>
                            <h3 className="text-base font-bold text-gray-900 leading-snug">
                              {project.title}
                            </h3>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${
                              isDone
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isInProgress
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : isReview
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {isInProgress && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            )}
                            {isDone && <CheckCircle2 className="w-3 h-3" />}
                            {project.status}
                          </span>
                        </div>

                        {/* Scope / Role Tag */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium">Sua Função / Escopo:</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                            {project.service_type || "Especialista PJ"}
                          </span>
                        </div>

                        {/* Briefing preview if available */}
                        {project.briefing_content && (
                          <p className="text-xs text-gray-500 line-clamp-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                            {project.briefing_content}
                          </p>
                        )}
                      </div>

                      {/* Card Footer: Prazo, Honorários, Botões */}
                      <div className="border-t border-gray-100 pt-3.5 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              Entrega até:{" "}
                              <strong className="text-gray-900 font-semibold">
                                {formatDate(project.deadline)}
                              </strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1 font-bold text-emerald-600">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{money(project.freelancer_cost || 0)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => setSelectedProjectForDetails(project)}
                            className="flex-1 bg-slate-900 hover:bg-black text-white text-xs h-9 rounded-xl font-semibold gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Detalhes do Projeto
                          </Button>

                          {project.google_drive_link && (
                            <a
                              href={project.google_drive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 gap-1.5 transition-colors"
                              title="Abrir Pasta / Entregáveis no Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

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

      {/* Project Details Modal Dialog */}
      <Dialog
        open={Boolean(selectedProjectForDetails)}
        onOpenChange={(open) => {
          if (!open) setSelectedProjectForDetails(null);
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          {selectedProjectForDetails && (
            <div className="space-y-6">
              <DialogHeader className="space-y-2 text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {selectedProjectForDetails.service_type || "Projeto"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      selectedProjectForDetails.status === "Concluido"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedProjectForDetails.status === "Em Andamento" ||
                          selectedProjectForDetails.status === "Em Producao"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {selectedProjectForDetails.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {selectedProjectForDetails.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Cliente:{" "}
                  <strong className="text-gray-700">
                    {selectedProjectForDetails.client?.full_name || "Cliente Delski"}
                  </strong>
                </DialogDescription>
              </DialogHeader>

              {/* Info Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                <div>
                  <span className="text-[11px] text-gray-400 font-semibold uppercase block">
                    Prazo de Entrega
                  </span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {formatDate(selectedProjectForDetails.deadline)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-semibold uppercase block">
                    Honorário Combinado
                  </span>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">
                    {money(selectedProjectForDetails.freelancer_cost || 0)}
                  </p>
                </div>
              </div>

              {/* Briefing Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Escopo & Briefing da Demanda
                </h4>
                <div className="p-4 rounded-2xl bg-white border border-gray-200 text-xs text-gray-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedProjectForDetails.briefing_content ||
                    "Nenhuma instrução ou briefing específico foi detalhado para este projeto."}
                </div>
              </div>

              {/* Links & Entregáveis */}
              {selectedProjectForDetails.google_drive_link && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" /> Pasta de Entregáveis / Drive
                  </h4>
                  <a
                    href={selectedProjectForDetails.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-blue-700 hover:bg-blue-100/70 transition-colors text-xs font-semibold"
                  >
                    <span className="truncate max-w-sm">
                      {selectedProjectForDetails.google_drive_link}
                    </span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setSelectedProjectForDetails(null)}
                  className="w-full h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold"
                >
                  Fechar Detalhes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
