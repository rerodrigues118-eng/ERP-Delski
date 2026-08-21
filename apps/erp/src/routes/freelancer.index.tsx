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
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
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
import { FreelancerProjectDetailsModal } from "@/components/FreelancerProjectDetailsModal";
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
import { NodeJourneyTimeline } from "@/components/hud/NodeJourneyTimeline";
import { getProjectProgress } from "./cliente.index";

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
  "Em análise": "bg-amber-50 text-amber-700 border-amber-200",
  Aprovada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Reprovada: "bg-red-50 text-red-700 border-red-200",
  aprovado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  em_analise: "bg-amber-50 text-amber-700 border-amber-200",
  rejeitado: "bg-orange-50 text-orange-700 border-orange-200",
  adequacao_solicitada: "bg-orange-50 text-orange-700 border-orange-200",
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
};

const FreelancerFeesTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const val = item.value || 0;
    const count = item.payload?.projetos || 0;
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs space-y-1">
        <p className="font-bold text-gray-900">{label}</p>
        <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-sm">
          <span>{money(val)}</span>
        </div>
        {count > 0 && (
          <p className="text-[11px] text-gray-500 font-medium pt-0.5 border-t border-gray-100">
            {count} demanda(s) no período
          </p>
        )}
      </div>
    );
  }
  return null;
};

const FreelancerStatusPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload?.color }} />
          <span className="font-bold text-gray-900">{data.name}</span>
        </div>
        <p className="text-gray-600 text-[11px] font-semibold pl-4">
          {data.value} projeto(s) • {data.payload?.percent}%
        </p>
      </div>
    );
  }
  return null;
};

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1">
      <p className="font-bold text-slate-800 dark:text-zinc-200">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
        <span className="text-slate-500 dark:text-zinc-400">Progresso:</span>
        <span className="font-extrabold text-blue-600 dark:text-blue-400">{payload[0]?.value}%</span>
      </div>
    </div>
  );
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
  const [behance, setBehance] = useState("");

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

  // Dynamic Freelancer Metrics & Progress
  const activeFreelancerProject = assignedProjects[0];
  const freelancerProgress = activeFreelancerProject
    ? getProjectProgress(activeFreelancerProject.status)
    : assignedProjects.length > 0
    ? Math.round(assignedProjects.reduce((acc, p) => acc + getProjectProgress(p.status), 0) / assignedProjects.length)
    : 0;

  const nextDeadlineProject =
    assignedProjects.find(
      (p) => p.deadline && !["Concluido", "Concluida", "Aprovado pelo Cliente", "Cancelado"].includes(p.status)
    ) || activeFreelancerProject;

  const daysRemaining = useMemo(() => {
    if (!nextDeadlineProject?.deadline) return 30;
    try {
      const d = new Date(nextDeadlineProject.deadline);
      const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    } catch {
      return 30;
    }
  }, [nextDeadlineProject?.deadline]);

  const activePhaseLabel = useMemo(() => {
    if (!activeFreelancerProject?.status) return "Execução";
    const p = getProjectProgress(activeFreelancerProject.status);
    if (p <= 20) return "Planejamento";
    if (p <= 40) return "Contrato";
    if (p <= 60) return "Execução";
    if (p <= 80) return "Revisão";
    return "Concluído";
  }, [activeFreelancerProject?.status]);

  const nextMilestoneDate = useMemo(() => {
    if (!nextDeadlineProject?.deadline) return "30/Set";
    try {
      const d = new Date(nextDeadlineProject.deadline);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    } catch {
      return "30/Set";
    }
  }, [nextDeadlineProject?.deadline]);

  const freelancerDeliverySeriesData = useMemo(() => {
    const p = freelancerProgress;
    return [
      { mes: "Mai", progresso: Math.round(p * 0.15), entregas: 1 },
      { mes: "Jun", progresso: Math.round(p * 0.35), entregas: 2 },
      { mes: "Jul", progresso: Math.round(p * 0.65), entregas: 3 },
      { mes: "Ago", progresso: p, entregas: activeProjectsCount || 1 },
      { mes: "Set (Prev)", progresso: Math.min(p + 25, 100), entregas: (activeProjectsCount || 1) + 2 },
    ];
  }, [freelancerProgress, activeProjectsCount]);

  // Dados para Gráfico 1: Evolução dos Honorários Mês a Mês
  const monthlyHonorariosData = useMemo(() => {
    const months = [
      { label: "Jan" },
      { label: "Fev" },
      { label: "Mar" },
      { label: "Abr" },
      { label: "Mai" },
      { label: "Jun" },
      { label: "Jul" },
      { label: "Ago" },
      { label: "Set" },
      { label: "Out" },
      { label: "Nov" },
      { label: "Dez" },
    ];

    const data = months.map((m) => ({
      mes: m.label,
      honorarios: 0,
      projetos: 0,
    }));

    assignedProjects.forEach((p) => {
      const dateStr = p.deadline || p.created_at;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) {
            data[m].honorarios += Number(p.freelancer_cost || 0);
            data[m].projetos += 1;
          }
        }
      }
    });

    invoices.forEach((inv) => {
      if (inv.issue_date) {
        const d = new Date(inv.issue_date);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          if (m >= 0 && m < 12 && data[m].honorarios === 0) {
            data[m].honorarios += Number(inv.amount || 0);
          }
        }
      }
    });

    // Se o total geral é positivo mas não caiu nos meses acima, ancorar no mês atual
    const totalCalc = data.reduce((acc, curr) => acc + curr.honorarios, 0);
    if (totalCalc === 0 && totalHonorarios > 0) {
      const curMonth = new Date().getMonth();
      data[curMonth].honorarios = totalHonorarios;
      data[curMonth].projetos = assignedProjects.length;
    }

    return data;
  }, [assignedProjects, invoices, totalHonorarios]);

  // Dados para Gráfico 2: Distribuição de Projetos & Demandas
  const projectDistributionData = useMemo(() => {
    let inProgress = 0;
    let awaiting = 0;
    let inReview = 0;
    let completed = 0;

    assignedProjects.forEach((p) => {
      const s = p.status;
      if (s === "Concluido") {
        completed++;
      } else if (s === "Em Revisao" || s === "Revisão de Contrato") {
        inReview++;
      } else if (s === "Em Andamento" || s === "Em Producao") {
        inProgress++;
      } else {
        awaiting++;
      }
    });

    const total = assignedProjects.length;

    const list = [
      {
        name: "Em Andamento",
        value: inProgress,
        color: "#2563EB",
        percent: total ? Math.round((inProgress / total) * 100) : 0,
      },
      {
        name: "Aguardando Início",
        value: awaiting,
        color: "#F59E0B",
        percent: total ? Math.round((awaiting / total) * 100) : 0,
      },
      {
        name: "Em Revisão",
        value: inReview,
        color: "#8B5CF6",
        percent: total ? Math.round((inReview / total) * 100) : 0,
      },
      {
        name: "Concluídos",
        value: completed,
        color: "#10B981",
        percent: total ? Math.round((completed / total) * 100) : 0,
      },
    ];

    return {
      list,
      total,
      hasData: total > 0,
    };
  }, [assignedProjects]);

  // Próximas Entregas & Prazos
  const upcomingDeliveries = useMemo(() => {
    return [...assignedProjects]
      .filter((p) => p.status !== "Concluido" && p.status !== "Cancelado")
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, 5);
  }, [assignedProjects]);

  const getDeadlineInfo = (deadlineStr?: string | null) => {
    if (!deadlineStr) return { text: "Sem prazo", cls: "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700" };
    const d = new Date(deadlineStr);
    if (isNaN(d.getTime())) return { text: "Sem prazo", cls: "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700" };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Vencido há ${Math.abs(diffDays)}d`, cls: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60" };
    if (diffDays === 0) return { text: "Entrega hoje", cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 font-bold" };
    if (diffDays === 1) return { text: "Entrega amanhã", cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60" };
    return { text: `Entregar em ${diffDays} dias`, cls: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60" };
  };

  const hasPendingDocsOrBank =
    freelancerDocs.length === 0 &&
    freelancer?.documents_status !== "em_analise" &&
    freelancer?.documents_status !== "aprovado";

  const docStatusBadge = useMemo(() => {
    if (freelancer?.documents_status === "aprovado") {
      return { label: "Homologado", color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60", icon: CheckCircle2 };
    }
    if (freelancerDocs.length > 0 || freelancer?.documents_status === "em_analise") {
      return { label: "Em Análise", color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60", icon: Clock };
    }
    return { label: "Pendente", color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60", icon: AlertTriangle };
  }, [freelancer?.documents_status, freelancerDocs.length]);

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
      setBehance((freelancer as any).behance || "");

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
        behance: behance.trim(),
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
          {/* ── LINHA 1: 4 Cards Compactos de KPI (Grid de 4 Colunas) ─────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Progresso das Demandas */}
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => changeTab("projetos")}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#11131A] border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-xs transition-all duration-300 hover:border-blue-500/40 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400 font-hud">
                  Progresso das Demandas
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 font-hud flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +5% mês
                </span>
              </div>
              <div className="flex items-baseline gap-1 py-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-hud tracking-tight">
                  {freelancerProgress}%
                </span>
              </div>
            </motion.div>

            {/* Card 2: Projetos Ativos */}
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => changeTab("projetos")}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#11131A] border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-xs transition-all duration-300 hover:border-blue-500/40 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400 font-hud">
                  Projetos Ativos
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 font-hud flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Em Execução
                </span>
              </div>
              <div className="flex items-baseline gap-1 py-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-hud tracking-tight">
                  {activeProjectsCount}
                </span>
                <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 ml-1">
                  demanda(s)
                </span>
              </div>
            </motion.div>

            {/* Card 3: Entregas Pendentes */}
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => changeTab("projetos")}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#11131A] border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-xs transition-all duration-300 hover:border-blue-500/40 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400 font-hud">
                  Entregas Pendentes
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 font-hud">
                  SLA em Dia
                </span>
              </div>
              <div className="flex items-baseline gap-1 py-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-hud tracking-tight">
                  {pendingProjectsCount}
                </span>
                <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 ml-1">
                  em produção
                </span>
              </div>
            </motion.div>

            {/* Card 4: Honorários Alocados */}
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => changeTab("financeiro")}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#11131A] border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-xs transition-all duration-300 hover:border-blue-500/40 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400 font-hud">
                  Honorários Alocados
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 font-hud">
                  Liberado
                </span>
              </div>
              <div className="flex items-baseline gap-1 py-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-hud tracking-tight">
                  {money(totalHonorarios)}
                </span>
              </div>
            </motion.div>
          </div>

          {/* ── LINHA 2: Seção Principal em Grid 2 Colunas (Estilo Gestor/Cliente) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Coluna da Esquerda (1/3 da largura — Card de Saúde do Cronograma) */}
            <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#11131A] border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-xs flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" /> Cronograma
                    </h3>
                  </div>
                </div>

                {/* Big Metric */}
                <div className="my-6">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase font-hud">
                    Tempo Estimado para Próxima Entrega
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-hud mt-1">
                    {daysRemaining} dias
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-hud mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Cronograma rigorosamente dentro do prazo
                  </p>
                </div>
              </div>

              {/* Sub-Métricas em 3 Colunas (Breakdown) */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/80">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-hud">
                    Fase Atual
                  </p>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white font-hud mt-1 truncate">
                    {activePhaseLabel}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/80">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-hud">
                    SLA Resposta
                  </p>
                  <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-hud mt-1">
                    &lt; 2 horas
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/80">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-hud">
                    Próximo Marco
                  </p>
                  <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400 font-hud mt-1">
                    {nextMilestoneDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Coluna da Direita (2/3 da largura — Gráfico de Evolução de Entregas) */}
            <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#11131A] border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight font-hud flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" /> Jornada de Entregas
                  </h3>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 font-hud self-start sm:self-center">
                  Tempo Real
                </span>
              </div>

              {/* Recharts Area Chart */}
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={freelancerDeliverySeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFreelancerProgresso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis
                      dataKey="mes"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<GlassTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="progresso"
                      name="Progresso Acumulado"
                      stroke="#2563EB"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorFreelancerProgresso)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── LINHA 3: Customer Journey Map (Node-Journey Flow) ─────────── */}
          <NodeJourneyTimeline
            projects={assignedProjects}
            onSelectProject={(p) => {
              setSelectedProjectForDetails(p);
            }}
            onViewAll={() => changeTab("projetos")}
          />

          {/* Compliance Banner */}
          {hasPendingDocsOrBank ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Pendência na Homologação Cadastral</h4>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">
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
                  className="rounded-xl text-xs gap-1.5 h-9 border-amber-300 text-amber-900 dark:text-amber-300"
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
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Cadastro Homologado & Em Dia</h4>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">
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
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-600" /> Últimos Projetos Delegados
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
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
                <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">Nenhum projeto atribuído no momento</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Assim que um novo projeto for delegado a você pelo Gestor, ele aparecerá listado nesta área com prazos e briefing.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-zinc-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3">Projeto</th>
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Serviço</th>
                      <th className="pb-3">Prazo</th>
                      <th className="pb-3 text-right">Honorários</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {assignedProjects.slice(0, 8).map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 pr-3 font-semibold text-gray-900 dark:text-white">
                          {p.title}
                        </td>
                        <td className="py-3.5 pr-3 text-gray-600 dark:text-zinc-300">
                          {p.client?.full_name || "Cliente Delski"}
                        </td>
                        <td className="py-3.5 pr-3">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-100 dark:border-blue-800">
                            {p.service_type}
                          </span>
                        </td>
                        <td className="py-3.5 pr-3 text-gray-600 dark:text-zinc-400">
                          {formatDate(p.deadline)}
                        </td>
                        <td className="py-3.5 pr-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {money(p.freelancer_cost || 0)}
                        </td>
                        <td className="py-3.5 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              p.status === "Concluido"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : p.status === "Em Andamento" || p.status === "Em Producao"
                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                : "bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700"
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
                      className="bg-white rounded-none sm:rounded-sm border border-gray-200 p-5 shadow-xs hover:shadow-sm hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Card Header: Title + Status (White-label, sem nome do cliente) */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="text-base font-bold text-gray-900 leading-snug">
                              {project.title}
                            </h3>
                            {project.service_type && (
                              <span className="inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-none border border-blue-100 uppercase tracking-wider">
                                {project.service_type}
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-semibold border shrink-0 ${
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

                        {/* Briefing preview if available */}
                        {project.briefing_content && (
                          <p className="text-xs text-gray-500 line-clamp-2 bg-gray-50/70 p-2.5 rounded-none border border-gray-100 leading-relaxed">
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
                              Prazo:{" "}
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
                            className="flex-1 bg-slate-900 hover:bg-black text-white text-xs h-9 rounded-none font-semibold gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Detalhes do Projeto
                          </Button>

                          {project.google_drive_link && (
                            <a
                              href={project.google_drive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 h-9 rounded-none border border-gray-200 hover:bg-blue-50 text-gray-600 hover:text-blue-600 flex items-center justify-center transition-all shrink-0 cursor-pointer"
                              title="Abrir pasta no Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
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

                <div className="space-y-1.5">
                  <Label htmlFor="f-behance" className="text-xs font-semibold text-gray-700">
                    Behance
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="f-behance"
                      value={behance}
                      onChange={(e) => setBehance(e.target.value)}
                      placeholder="behance.net/..."
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
                  id: "rg_cnh",
                  title: "RG ou CNH do Responsável",
                  desc: "Documento oficial com foto do responsável legal pela PJ",
                },
                {
                  id: "antecedentes_criminais",
                  title: "Certidão de Antecedentes Criminais",
                  desc: "Certidão de antecedentes criminais emitida pela Polícia Federal",
                },
                {
                  id: "situacao_cpf",
                  title: "Comprovante de Situação Cadastral do CPF",
                  desc: "Comprovante de inscrição e situação cadastral do CPF na Receita Federal",
                },
                {
                  id: "foto_rosto",
                  title: "Foto do Rosto (Tipo 3x4)",
                  desc: "Foto frontal nítida com boa iluminação e fundo neutro",
                },
                {
                  id: "cartao_cnpj",
                  title: "Comprovante de CNPJ Ativo",
                  desc: "Cartão CNPJ atualizado da Receita Federal",
                },
              ].map((item) => {
                const existing = freelancerDocs.find((d) => {
                  if (item.id === "rg_cnh") {
                    return (
                      d.document_type === "rg_cnh" ||
                      d.document_type === "documento_identidade_1" ||
                      d.document_type === "cnh" ||
                      d.document_type === "rg_frente"
                    );
                  }
                  if (item.id === "antecedentes_criminais") {
                    return (
                      d.document_type === "antecedentes_criminais" ||
                      d.document_type === "certidao_antecedentes_criminais"
                    );
                  }
                  if (item.id === "situacao_cpf") {
                    return (
                      d.document_type === "situacao_cpf" ||
                      d.document_type === "comprovante_cpf" ||
                      d.document_type === "situacao_cadastral_cpf"
                    );
                  }
                  if (item.id === "foto_rosto") {
                    return (
                      d.document_type === "foto_rosto" ||
                      d.document_type === "foto_rosto_3x4"
                    );
                  }
                  if (item.id === "cartao_cnpj") {
                    return (
                      d.document_type === "cartao_cnpj" ||
                      d.document_type === "cnpj_ativo" ||
                      d.document_type === "situacao_cnpj"
                    );
                  }
                  return d.document_type === item.id;
                });
                const isUploading = uploadingType === item.id;
                const isApproved = existing?.status === "aprovado";
                const isAdequacyRequested = existing?.status === "rejeitado" || existing?.status === "adequacao_solicitada";
                const isInAnalysis = Boolean(existing && !isApproved && !isAdequacyRequested);

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      isApproved
                        ? "bg-emerald-50/30 border-emerald-200"
                        : isAdequacyRequested
                        ? "bg-orange-50/40 border-orange-300 shadow-xs"
                        : existing
                        ? "bg-amber-50/20 border-amber-200"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-gray-900">
                            {item.title}
                          </h3>
                          {existing ? (
                            <Badge
                              className={`text-[10px] py-0.5 px-2.5 font-semibold ${
                                isApproved
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isAdequacyRequested
                                  ? "bg-orange-50 text-orange-700 border-orange-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {isApproved
                                ? "Aprovado"
                                : isAdequacyRequested
                                ? "Adequação Solicitada"
                                : "Em Análise"}
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] py-0.5 px-2 font-medium bg-slate-100 text-slate-600 border-slate-200">
                              Pendente
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>

                    {/* Alerta em destaque de Adequação Solicitada pela Gestão */}
                    {isAdequacyRequested && (
                      <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-orange-800">
                          <AlertCircle className="h-4 w-4 text-orange-600 shrink-0" />
                          <span>Adequação Solicitada pela Gestão:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-orange-800">
                          {(existing as any).rejection_reason || (existing as any).notes || (existing as any).review_notes || "Favor reenviar o documento corrigido conforme as orientações da equipe."}
                        </p>
                      </div>
                    )}

                    {/* Ações e Trava de Edição */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      {existing ? (
                        <div className="flex items-center justify-between w-full gap-2">
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

                          {/* Se aprovado ou em análise: Read-Only (Trava de Edição) */}
                          {isApproved && (
                            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Validado pela Gestão
                            </span>
                          )}

                          {isInAnalysis && (
                            <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg">
                              <Clock className="h-3.5 w-3.5" /> Em análise pela Gestão
                            </span>
                          )}

                          {/* Se Adequação Solicitada: Botão de Upload liberado para reenvio */}
                          {isAdequacyRequested && (
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-xs">
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
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reenviando...
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-3.5 w-3.5" /> Reenviar Ajustado
                                </>
                              )}
                            </label>
                          )}
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
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
                  <CreditCard className="h-5 w-5 text-emerald-600" /> Dados Bancários
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
      <FreelancerProjectDetailsModal
        project={selectedProjectForDetails}
        onClose={() => setSelectedProjectForDetails(null)}
      />
    </div>
  );
}
