import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  ShieldCheck,
  MoreVertical,
  CheckCheck,
  XOctagon,
  Save,
  Eye,
  Download,
  Upload,
  Ban,
  Trash2,
  ArrowLeft,
  Building2,
  CreditCard,
  Receipt,
  DollarSign,
  Send,
  UploadCloud,
  FileCheck,
  FileCode,
  ExternalLink,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useToggleFreelancerBlock, useDeleteFreelancer } from "@/hooks/useProfiles";
import {
  useCurrentFreelancerProfile,
  useUpdateCurrentFreelancerProfile,
  useFreelancerPortalDocuments,
  useUploadFreelancerPortalDocument,
  useDeleteFreelancerPortalDocument,
  useUploadFreelancerPaymentReceipt,
  useUpdateFreelancerFinancialTerms,
  type FreelancerPortalDocumentItem,
} from "@/hooks/useFreelancerPortal";
import {
  useFreelancerInvoices,
  useReviewFreelancerInvoice,
  useDeleteFreelancerInvoice,
  type FreelancerInvoiceItem,
} from "@/hooks/useFreelancerInvoices";

export const Route = createFileRoute("/app/freelancers/$id")({
  head: () => ({
    meta: [{ title: "Gestão do Prestador — DELSKI CLOUD" }],
  }),
  component: FreelancerDetailPage,
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

const DOC_LABELS: Record<string, string> = {
  cartao_cnpj: "Comprovante de CNPJ Ativo",
  doc_constitutivo: "Documento Constitutivo ou CCMEI",
  consulta_projudi: "Consulta ProJudi",
  rg_cnh: "RG ou CNH do Responsável",
  certidao_trabalhista: "Certidão de Débitos Trabalhistas",
  contrato_prestacao: "Contrato Oficial de Prestação de Serviços",
  comprovante_pagamento: "Comprovante de Pagamento Bancário",
};

function FreelancerDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("cadastrais");

  // Queries
  const { data: freelancer, isLoading: loadingFreelancer } =
    useCurrentFreelancerProfile(id);
  const { data: docs = [], isLoading: loadingDocs } =
    useFreelancerPortalDocuments(id);
  const { data: invoices = [], isLoading: loadingInvoices } =
    useFreelancerInvoices(id);

  // Mutations
  const updateProfile = useUpdateCurrentFreelancerProfile();
  const uploadDoc = useUploadFreelancerPortalDocument();
  const deleteDoc = useDeleteFreelancerPortalDocument();
  const uploadReceipt = useUploadFreelancerPaymentReceipt();
  const updateFinancial = useUpdateFreelancerFinancialTerms();
  const reviewInvoice = useReviewFreelancerInvoice();
  const deleteInvoice = useDeleteFreelancerInvoice();
  const toggleBlock = useToggleFreelancerBlock();
  const deleteFreelancer = useDeleteFreelancer();

  // ── Tab 1: Form state (Dados Cadastrais) ──────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [corporateName, setCorporateName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [segment, setSegment] = useState("");
  const [email, setEmail] = useState("");
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

  // ── Tab 3: Gestor Financial Form state ────────────────────────────────────
  const [contractModel, setContractModel] = useState("Mensal");
  const [contractValue, setContractValue] = useState("0");
  const [paymentDate, setPaymentDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [financialStatus, setFinancialStatus] = useState("Pendente");

  // ── Document Review Modal State ───────────────────────────────────────────
  const [openDocRejectModal, setOpenDocRejectModal] = useState(false);
  const [rejectingDoc, setRejectingDoc] =
    useState<FreelancerPortalDocumentItem | null>(null);
  const [docRejectReason, setDocRejectReason] = useState("");

  // ── Invoice Review Modal State ────────────────────────────────────────────
  const [openInvRejectModal, setOpenInvRejectModal] = useState(false);
  const [rejectingInvoice, setRejectingInvoice] =
    useState<FreelancerInvoiceItem | null>(null);
  const [invRejectReason, setInvRejectReason] = useState("");

  // ── Receipt Upload Modal State ────────────────────────────────────────────
  const [openReceiptModal, setOpenReceiptModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  useEffect(() => {
    if (freelancer) {
      setCompanyName(freelancer.company_name || "");
      setCorporateName(freelancer.corporate_name || "");
      setCnpj(freelancer.cnpj || "");
      setSegment(freelancer.segment || "");
      setEmail(freelancer.email || "");
      setAddress(freelancer.address || "");
      setCity(freelancer.city || "");
      setState(freelancer.state || "");
      setCep(freelancer.cep || "");
      setContactName(freelancer.full_name || "");
      setRolePosition(freelancer.role_position || "");
      setPhone(freelancer.phone || "");
      setInstagram(freelancer.instagram || "");
      setLinkedin(freelancer.linkedin || "");
      setWebsite(freelancer.website || "");

      setContractModel(freelancer.contract_model || "Mensal");
      setContractValue(String(freelancer.contract_value || "0"));
      setPaymentDate(freelancer.payment_date || "");
      setDueDate(freelancer.due_date || "");
      setFinancialStatus(freelancer.financial_status || "Pendente");
    }
  }, [freelancer]);

  const handleSaveCadastral = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      freelancerId: id,
      patch: {
        company_name: companyName.trim(),
        corporate_name: corporateName.trim(),
        cnpj: cnpj.trim(),
        segment: segment.trim(),
        email: email.trim().toLowerCase(),
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

  const handleSaveFinancial = (e: React.FormEvent) => {
    e.preventDefault();
    updateFinancial.mutate({
      freelancerId: id,
      contractModel,
      contractValue: Number(contractValue) || 0,
      paymentDate: paymentDate || null,
      dueDate: dueDate || null,
      financialStatus,
    });
  };

  const handleApproveDoc = async (docId: string) => {
    const { error } = await (supabase.from("freelancer_documents") as any)
      .update({
        status: "aprovado",
        review_notes: null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", docId);

    if (error) {
      toast.error(`Erro ao aprovar documento: ${error.message}`);
    } else {
      qc.invalidateQueries({ queryKey: ["freelancer_documents"] });
      toast.success("Documento aprovado!");
    }
  };

  const handleRejectDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDoc) return;

    const { error } = await (supabase.from("freelancer_documents") as any)
      .update({
        status: "rejeitado",
        review_notes: docRejectReason.trim() || "Documento rejeitado na análise",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", rejectingDoc.id);

    if (error) {
      toast.error(`Erro ao rejeitar documento: ${error.message}`);
    } else {
      qc.invalidateQueries({ queryKey: ["freelancer_documents"] });
      toast.success("Documento marcado como rejeitado.");
      setOpenDocRejectModal(false);
      setRejectingDoc(null);
      setDocRejectReason("");
    }
  };

  const handleRejectInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingInvoice) return;

    await reviewInvoice.mutateAsync({
      invoiceId: rejectingInvoice.id,
      status: "Reprovada",
      reviewNotes: invRejectReason.trim() || "Nota fiscal reprovada na análise",
    });

    setOpenInvRejectModal(false);
    setRejectingInvoice(null);
    setInvRejectReason("");
  };

  const handleReceiptUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile) return toast.error("Selecione o comprovante bancário.");

    setUploadingReceipt(true);
    try {
      await uploadReceipt.mutateAsync({
        freelancerId: id,
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

  if (loadingFreelancer) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">
          Carregando informações do prestador...
        </p>
      </div>
    );
  }

  if (!loadingFreelancer && (!freelancer || (!freelancer.id && !freelancer.email && !freelancer.full_name))) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        <Link
          to="/app/freelancers"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Lista de Prestadores
        </Link>
        <Card className="p-12 text-center space-y-3 border-dashed">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-foreground">Prestador não encontrado</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            O prestador de serviços com ID <span className="font-mono">{id}</span> não foi encontrado no banco de dados.
          </p>
          <div className="pt-2">
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link to="/app/freelancers">Voltar para a Lista de Freelancers</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isBlocked = freelancer?.status === "bloqueado";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Back button & Header */}
      <div className="space-y-2">
        <Link
          to="/app/freelancers"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Lista de Prestadores
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {freelancer?.company_name || freelancer?.full_name || "Prestador de Serviço"}
              </h1>
              {freelancer?.corporate_name && (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  {freelancer.corporate_name}
                </Badge>
              )}
              {isBlocked ? (
                <Badge variant="outline" className="bg-rose-500/15 text-rose-700 border-rose-500/30 gap-1 text-xs">
                  <Ban className="h-3 w-3" /> Bloqueado
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" /> Acesso Ativo
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-3">
              <span>E-mail: {freelancer?.email}</span>
              {freelancer?.phone && <span>• WhatsApp: {freelancer.phone}</span>}
              {freelancer?.cnpj && <span>• CNPJ: {freelancer.cnpj}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toggleBlock.mutate({
                  id,
                  currentStatus: isBlocked ? "bloqueado" : "ativo",
                })
              }
              className={
                isBlocked
                  ? "text-emerald-600 hover:text-emerald-700 text-xs"
                  : "text-rose-600 hover:text-rose-700 text-xs"
              }
            >
              {isBlocked ? "Desbloquear Prestador" : "Bloquear Acesso"}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Workspace for Gestor */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-card p-1.5 rounded-xl border border-border shadow-xs overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex gap-1 min-w-max">
            <TabsTrigger
              value="cadastrais"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" /> 1. Dados Cadastrais
            </TabsTrigger>
            <TabsTrigger
              value="documentacao"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> 2. Documentação ({docs.length})
            </TabsTrigger>
            <TabsTrigger
              value="financeiro"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" /> 3. Dados Financeiros
            </TabsTrigger>
            <TabsTrigger
              value="notas"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" /> 4. Notas Fiscais ({invoices.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── ABA 1: DADOS CADASTRAIS ──────────────────────────────────────── */}
        <TabsContent value="cadastrais" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Dados Cadastrais do Prestador
              </CardTitle>
              <CardDescription className="text-xs">
                Informações da pessoa jurídica e do representante legal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCadastral} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome Fantasia</Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Razão Social</Label>
                    <Input
                      value={corporateName}
                      onChange={(e) => setCorporateName(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">CNPJ</Label>
                    <Input
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="h-9 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Segmento</Label>
                    <Input
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">E-mail Corporativo *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Endereço Completo</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">CEP</Label>
                    <Input
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="h-9 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Cidade / UF</Label>
                    <div className="flex gap-2">
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="h-9 flex-1"
                      />
                      <Input
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        className="h-9 w-16 text-center font-mono text-sm"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome do Responsável</Label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Cargo / Função</Label>
                    <Input
                      value={rolePosition}
                      onChange={(e) => setRolePosition(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">WhatsApp</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-9 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Instagram</Label>
                    <Input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">LinkedIn</Label>
                    <Input
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Site / Portfólio</Label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t">
                  <Button
                    type="submit"
                    disabled={updateProfile.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium gap-1.5"
                  >
                    {updateProfile.isPending && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Salvar Dados Cadastrais
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 2: DOCUMENTAÇÃO ─────────────────────────────────────────── */}
        <TabsContent value="documentacao" className="space-y-6">
          {/* Card: Upload de Contrato Oficial pelo Gestor */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Contrato Oficial de Prestação de Serviços (Delski)
              </CardTitle>
              <CardDescription className="text-xs">
                Anexe o contrato formal assinado pela diretoria para disponibilizar no portal do prestador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white transition-colors">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      uploadDoc.mutate({
                        freelancerId: id,
                        documentType: "contrato_prestacao",
                        file,
                      });
                    }
                  }}
                />
                <UploadCloud className="h-4 w-4" /> Anexar Contrato Oficial
              </label>
            </CardContent>
          </Card>

          {/* Card: Análise e Homologação de Documentos do Prestador */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                Documentos Societários & Certidões ({docs.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Valide os comprovantes e certidões enviadas pelo prestador de serviços.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Nenhum documento anexado pelo prestador ainda.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border border rounded-xl">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {DOC_LABELS[doc.document_type] || doc.document_type}
                          </span>
                          <Badge
                            className={`text-[10px] py-0 px-2 font-medium ${
                              STATUS_BADGE_STYLES[doc.status] || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {doc.status === "aprovado"
                              ? "Aprovado"
                              : doc.status === "rejeitado"
                                ? "Rejeitado"
                                : "Em Análise"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Anexado em {formatDate(doc.uploaded_at || doc.created_at)}
                          {doc.review_notes && (
                            <span className="text-rose-500 font-medium ml-2">
                              • Motivo: {doc.review_notes}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={doc.file_url || doc.public_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver Arquivo
                        </a>

                        {doc.status !== "aprovado" && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveDoc(doc.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2.5"
                          >
                            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Aprovar
                          </Button>
                        )}

                        {doc.status !== "rejeitado" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectingDoc(doc);
                              setOpenDocRejectModal(true);
                            }}
                            className="h-7 text-xs px-2.5"
                          >
                            <XOctagon className="h-3.5 w-3.5 mr-1" /> Rejeitar
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteDoc.mutate({
                              documentId: doc.id,
                              filePath: doc.file_path,
                            })
                          }
                          className="text-rose-500 hover:bg-rose-50 h-7 text-xs px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 3: DADOS FINANCEIROS ─────────────────────────────────────── */}
        <TabsContent value="financeiro" className="space-y-6">
          {/* Card: Dados Bancários informados pelo Prestador */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Dados Bancários & Chave PIX (Informados pelo Prestador)
              </CardTitle>
              <CardDescription className="text-xs">
                Dados da conta jurídica fornecidos para crédito de pagamentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border">
                <div>
                  <span className="text-xs text-muted-foreground">Instituição Bancária:</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {freelancer?.bank_name || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tipo de PIX:</span>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {freelancer?.pix_type || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Chave PIX:</span>
                  <p className="text-sm font-bold text-foreground font-mono mt-0.5">
                    {freelancer?.pix_key || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Agência / Conta:</span>
                  <p className="text-sm font-bold text-foreground font-mono mt-0.5">
                    {freelancer?.bank_agency ? `Ag: ${freelancer.bank_agency}` : ""}{" "}
                    {freelancer?.bank_account ? `Cc: ${freelancer.bank_account}` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Parâmetros Financeiros definidos pelo Gestor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Condições Contratuais & Pagamentos (Gestor)
              </CardTitle>
              <CardDescription className="text-xs">
                Defina o modelo de remuneração, valores e datas que aparecerão na área restrita deste prestador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveFinancial} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Modelo de Contrato</Label>
                    <Select value={contractModel} onValueChange={setContractModel}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensal">Mensal (Recorrência)</SelectItem>
                        <SelectItem value="Único">Único (Por Projeto)</SelectItem>
                        <SelectItem value="Por Hora">Por Hora</SelectItem>
                        <SelectItem value="Por Entrega">Por Entrega</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Valor Contratado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={contractValue}
                      onChange={(e) => setContractValue(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Data de Pagamento</Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Data de Vencimento</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Status Financeiro</Label>
                    <Select value={financialStatus} onValueChange={setFinancialStatus}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Atrasado">Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenReceiptModal(true)}
                    className="text-xs font-semibold text-emerald-600 gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" /> Anexar Comprovante de Pagamento
                  </Button>

                  <Button
                    type="submit"
                    disabled={updateFinancial.isPending}
                    className="bg-primary hover:bg-primary/90 text-white text-xs font-medium gap-1.5"
                  >
                    {updateFinancial.isPending && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Salvar Parâmetros Financeiros
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 4: NOTAS FISCAIS ─────────────────────────────────────────── */}
        <TabsContent value="notas" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Notas Fiscais Enviadas pelo Prestador ({invoices.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Revise os arquivos fiscais e aprove ou rejeite com parecer para liberação de honorários.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="p-10 text-center border border-dashed rounded-xl space-y-1">
                  <Receipt className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground font-medium">
                    Nenhuma nota fiscal enviada por este prestador.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground font-semibold uppercase text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Número NF</th>
                        <th className="py-3 px-4">Competência</th>
                        <th className="py-3 px-4">Emissão</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4">Arquivos</th>
                        <th className="py-3 px-4">Parecer do Gestor</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3.5 px-4 text-foreground whitespace-nowrap">
                            {inv.competence}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                            {formatDate(inv.issue_date || inv.created_at)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-primary whitespace-nowrap">
                            {money(Number(inv.amount))}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap space-x-2">
                            {inv.file_url && (
                              <a
                                href={inv.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
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
                          <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs">
                            {inv.review_notes ? (
                              <span className="italic">{inv.review_notes}</span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Badge
                              className={`text-xs px-2 py-0.5 font-medium ${
                                STATUS_BADGE_STYLES[inv.status] || "bg-muted text-muted-foreground"
                              }`}
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                            {inv.status !== "Aprovada" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  reviewInvoice.mutate({
                                    invoiceId: inv.id,
                                    status: "Aprovada",
                                    reviewNotes: "Nota fiscal validada e aprovada pelo gestor",
                                  })
                                }
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2"
                              >
                                <CheckCheck className="h-3 w-3 mr-1" /> Aprovar
                              </Button>
                            )}

                            {inv.status !== "Reprovada" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setRejectingInvoice(inv);
                                  setOpenInvRejectModal(true);
                                }}
                                className="h-7 text-xs px-2"
                              >
                                <XOctagon className="h-3 w-3 mr-1" /> Reprovar
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                deleteInvoice.mutate({
                                  invoiceId: inv.id,
                                  filePath: inv.file_path,
                                  xmlPath: inv.xml_file_path,
                                })
                              }
                              className="text-rose-500 hover:bg-rose-50 h-7 text-xs px-1.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── MODAL: Rejeitar Documento ──────────────────────────────────────── */}
      <Dialog open={openDocRejectModal} onOpenChange={setOpenDocRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">
              Rejeitar Documento
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe a justificativa ou instrução para que o prestador possa reenviar o arquivo correto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectDocSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo da Rejeição</Label>
              <Textarea
                value={docRejectReason}
                onChange={(e) => setDocRejectReason(e.target.value)}
                placeholder="Ex: Documento com validade expirada ou ilegível..."
                rows={3}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDocRejectModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Confirmar Rejeição
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Reprovar Nota Fiscal ────────────────────────────────────── */}
      <Dialog open={openInvRejectModal} onOpenChange={setOpenInvRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">
              Reprovar Nota Fiscal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Explique o motivo da recusa para que o prestador faça a retificação necessária.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectInvoiceSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo da Reprovação</Label>
              <Textarea
                value={invRejectReason}
                onChange={(e) => setInvRejectReason(e.target.value)}
                placeholder="Ex: Valor incorreto ou divergência na competência informada..."
                rows={3}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenInvRejectModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive">
                Confirmar Reprovação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Anexar Comprovante Bancário ──────────────────────────────── */}
      <Dialog open={openReceiptModal} onOpenChange={setOpenReceiptModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" /> Anexar Comprovante de Pagamento
            </DialogTitle>
            <DialogDescription className="text-xs">
              Anexe o comprovante PIX ou TED para que o prestador visualize a confirmação no portal dele.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceiptUploadSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Arquivo do Comprovante (PDF, PNG, JPG) *</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações / Referência</Label>
              <Input
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Ex: Liquidação de honorários - Agosto/2026"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenReceiptModal(false)}
              >
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
                    <CheckCheck className="h-4 w-4" /> Anexar Comprovante
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
