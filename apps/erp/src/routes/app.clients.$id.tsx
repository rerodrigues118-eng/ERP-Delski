import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Ban,
  Mail,
  Phone,
  FolderKanban,
  Send,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  FileText,
  UploadCloud,
  Copy,
  Download,
  Eye,
  FileCheck,
  DollarSign,
  AlertCircle,
  MapPin,
  User,
  Save,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import {
  useClientDetail,
  useUpdateClient,
  useDeleteClient,
  useLinkProjectClient,
  useUnlinkProjectClient,
  useResendClientInvite,
} from "@/hooks/useClients";
import {
  useClientDocuments,
  useUploadClientDocument,
  useDeleteClientDocument,
} from "@/hooks/useClientDocuments";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";

const DOCUMENT_TYPE_META: Record<string, { label: string; description: string; badge: string }> = {
  cartao_cnpj: {
    label: "Comprovante de CNPJ Ativo",
    description: "Cartão CNPJ oficial da Receita Federal",
    badge: "Cadastral",
  },
  doc_constitutivo: {
    label: "Documento Constitutivo",
    description: "Contrato Social ou Certificado MEI registrado",
    badge: "Jurídico",
  },
  rg_cnh: {
    label: "RG / CNH do Responsável Legal",
    description: "Documento oficial de identificação com foto",
    badge: "Identificação",
  },
  procuracao: {
    label: "Procuração",
    description: "Instrumento público/particular de representação",
    badge: "Legal",
  },
  contrato_prestacao: {
    label: "Contrato Oficial de Prestação",
    description: "Contrato de serviços emitido para o cliente",
    badge: "Contrato",
  },
  nota_fiscal: {
    label: "Nota Fiscal",
    description: "Nota fiscal de prestação de serviços",
    badge: "Financeiro",
  },
  contrato_assinado: {
    label: "Contrato Assinado",
    description: "Via digital assinada pelo cliente",
    badge: "Contrato",
  },
};

const getFileName = (path?: string | null, url?: string | null, docType?: string) => {
  if (path) {
    const parts = path.split("/");
    return parts[parts.length - 1];
  }
  if (url) {
    const cleanUrl = url.split("?")[0];
    const parts = cleanUrl.split("/");
    return parts[parts.length - 1];
  }
  return `${docType || "documento"}.pdf`;
};

export const Route = createFileRoute("/app/clients/$id")({
  head: () => ({
    meta: [{ title: "Detalhes do Cliente — DELSKI CLOUD" }],
  }),
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isGestor, loading: authLoading } = useAuth();

  const { data: client, isLoading: loadingClient } = useClientDetail(id);
  const { data: allProjects = [] } = useProjects();

  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const linkProject = useLinkProjectClient();
  const unlinkProject = useUnlinkProjectClient();
  const resendInvite = useResendClientInvite();

  // Form edit state - Dados Cadastrais & Corporativos
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [corporateName, setCorporateName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [segment, setSegment] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [rolePosition, setRolePosition] = useState("");
  const [fetchingCep, setFetchingCep] = useState(false);

  // Financial Form state (Gestor definition)
  const [contractModel, setContractModel] = useState("Mensal");
  const [contractValue, setContractValue] = useState("0");
  const [setupValue, setSetupValue] = useState("0");
  const [contractDuration, setContractDuration] = useState("12 meses");
  const [paymentDate, setPaymentDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [financialStatus, setFinancialStatus] = useState("Pendente");

  // Modal link project state
  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Modal delete client state
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const handleCepBlur = async () => {
    const rawCep = cep.replace(/\D/g, "");
    if (rawCep.length === 8) {
      setFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(`${data.logradouro || ""} - ${data.bairro || ""}`.trim().replace(/^-\s*/, ""));
          setCity(data.localidade || "");
          setState(data.uf || "");
          toast.success("Endereço preenchido automaticamente pelo CEP!");
        }
      } catch (err) {
        console.warn("Erro ao buscar CEP:", err);
      } finally {
        setFetchingCep(false);
      }
    }
  };

  useEffect(() => {
    if (client) {
      setFullName(client.full_name || (client as any).contact_name || "");
      setEmail(client.email || "");
      setCompanyName(client.company_name || "");
      setCorporateName((client as any).corporate_name || client.company_name || "");
      setCnpj((client as any).cnpj || "");
      setSegment((client as any).segment || "");
      setPhone(client.phone || "");
      setCep((client as any).cep || "");
      setAddress((client as any).address || "");
      setCity((client as any).city || "");
      setState((client as any).state || "");
      setRolePosition((client as any).role_position || "");
      setContractModel((client as any).contract_model || "Mensal");
      setContractValue(String((client as any).contract_value || "0"));
      setSetupValue(String((client as any).setup_value || "0"));
      setContractDuration((client as any).contract_duration || "12 meses");
      setPaymentDate((client as any).payment_date || "");
      setDueDate((client as any).due_date || "");
      setFinancialStatus((client as any).financial_status || "Pendente");
    }
  }, [client]);

  const resolvedClientId = client?.resolved_id || client?.id;
  const { data: clientDocs = [] } = useClientDocuments(client?.id, client?.auth_user_id);
  const uploadDoc = useUploadClientDocument();
  const deleteDoc = useDeleteClientDocument();

  useEffect(() => {
    if (!authLoading && !isGestor) {
      navigate({ to: "/app/projects", replace: true });
    }
  }, [isGestor, authLoading, navigate]);

  if (authLoading || loadingClient) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Carregando detalhes do cliente...</p>
      </div>
    );
  }

  if (!isGestor) return null;

  if (!client || (!client.id && !client.email && !client.full_name)) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <Link
          to="/app/clients"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Lista de Clientes
        </Link>
        <Card className="p-12 text-center space-y-3 border-dashed">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-foreground">Cliente não encontrado</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            O cliente solicitado com ID <span className="font-mono">{id}</span> não foi encontrado no banco de dados.
          </p>
          <div className="pt-2">
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link to="/app/clients">Voltar para a Lista de Clientes</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Unlinked projects available to be linked
  const unlinkedProjects = allProjects.filter((p) => p.client_id !== resolvedClientId);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      return toast.error("Preencha o Nome Fantasia da empresa.");
    }
    if (!email.trim()) {
      return toast.error("Preencha o E-mail Corporativo.");
    }
    if (!fullName.trim()) {
      return toast.error("Preencha o Nome do Responsável Legal.");
    }

    updateClient.mutate({
      id: client.id,
      patch: {
        company_name: companyName.trim(),
        corporate_name: corporateName.trim() || companyName.trim(),
        cnpj: cnpj.trim() || undefined,
        segment: segment.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        cep: cep.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        full_name: fullName.trim(),
        contact_name: fullName.trim(),
        role_position: rolePosition.trim() || undefined,
      },
    });
  };

  const handleSaveFinancial = (e: React.FormEvent) => {
    e.preventDefault();
    updateClient.mutate({
      id: client.id,
      patch: {
        contract_model: contractModel,
        contract_value: Number(contractValue) || 0,
        setup_value: Number(setupValue) || 0,
        contract_duration: contractDuration,
        payment_date: paymentDate || null,
        due_date: dueDate || null,
        financial_status: financialStatus,
      },
    });
  };

  const handleToggleStatus = () => {
    const nextStatus = client.status === "bloqueado" ? "ativo" : "bloqueado";
    updateClient.mutate({
      id: client.id,
      patch: { status: nextStatus },
    });
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return toast.error("Selecione um projeto para vincular");

    linkProject.mutate(
      { projectId: selectedProjectId, clientId: resolvedClientId || client.id },
      {
        onSuccess: () => {
          setOpenLinkModal(false);
          setSelectedProjectId("");
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Back button & Header */}
      <div className="space-y-2">
        <Link
          to="/app/clients"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Lista de Clientes
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{client.company_name || client.full_name}</h1>
              {client.company_name && (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  {client.full_name}
                </Badge>
              )}
              {client.status === "ativo" && (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs"
                >
                  <CheckCircle2 className="h-3 w-3" /> Ativo
                </Badge>
              )}
              {client.status === "convidado" && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1 text-xs"
                >
                  <Clock className="h-3 w-3" /> Convidado
                </Badge>
              )}
              {client.status === "bloqueado" && (
                <Badge
                  variant="outline"
                  className="bg-rose-500/15 text-rose-700 border-rose-500/30 gap-1 text-xs"
                >
                  <Ban className="h-3 w-3" /> Bloqueado
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-3">
              <span>E-mail: {client.email}</span>
              {client.phone && <span>• WhatsApp: {client.phone}</span>}
              <span>• Cadastrado em {formatDate(client.created_at)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={resendInvite.isPending}
              onClick={() =>
                resendInvite.mutate({
                  name: client.full_name,
                  email: client.email,
                  companyName: client.company_name || undefined,
                })
              }
              className="gap-1.5 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
            >
              <Send className="h-3.5 w-3.5" /> Reenviar Convite
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              className={
                client.status === "bloqueado"
                  ? "text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  : "text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              }
            >
              {client.status === "bloqueado" ? "Ativar Acesso" : "Bloquear Acesso"}
            </Button>

            <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5 text-xs">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir Cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-rose-600">
                    <Trash2 className="h-5 w-5" /> Excluir Conta do Cliente
                  </DialogTitle>
                  <DialogDescription>
                    Tem certeza de que deseja apagar o acesso e cadastro do cliente{" "}
                    <strong>"{client.company_name || client.full_name}"</strong>? Esta ação removerá a conta do banco de
                    dados e desvinculará seus projetos.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                  <Button variant="outline" onClick={() => setOpenDeleteModal(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteClient.isPending}
                    onClick={() => {
                      deleteClient.mutate(client.id, {
                        onSuccess: () => {
                          setOpenDeleteModal(false);
                          navigate({ to: "/app/clients" });
                        },
                      });
                    }}
                  >
                    {deleteClient.isPending ? "Excluindo..." : "Sim, Excluir Cliente"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form & Projects */}
        <div className="md:col-span-2 space-y-6">
          {/* Card 1: Dados Cadastrais & Corporativos */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Dados Cadastrais do Cliente
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Informações corporativas, fiscais, endereço e contato do responsável legal.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono bg-muted text-muted-foreground">
                  ID: {resolvedClientId?.slice(0, 8)}...
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Subseção 1: Dados Corporativos da Empresa */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Dados Corporativos da Empresa
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Nome Fantasia *</Label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ex: Studio Lumina Mídia"
                        className="bg-muted/40 border-border rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Razão Social</Label>
                      <Input
                        value={corporateName}
                        onChange={(e) => setCorporateName(e.target.value)}
                        placeholder="Ex: Lumina Mídia e Serviços LTDA"
                        className="bg-muted/40 border-border rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">CNPJ</Label>
                      <Input
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="bg-muted/40 border-border rounded-xl font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Segmento de Atuação</Label>
                      <Input
                        value={segment}
                        onChange={(e) => setSegment(e.target.value)}
                        placeholder="Ex: Tráfego Pago, Design, IA"
                        className="bg-muted/40 border-border rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">E-mail Corporativo *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="carlos@empresa.com.br"
                        className="bg-muted/40 border-border rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Telefone / WhatsApp</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 98888-7777"
                        className="bg-muted/40 border-border rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Subseção 2: Endereço & Localização */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Endereço & Localização
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">CEP</Label>
                      <div className="relative">
                        <Input
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          className="bg-muted/40 border-border rounded-xl font-mono text-xs pr-8"
                        />
                        {fetchingCep && (
                          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-blue-600" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold text-foreground">Endereço Completo</Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Rua, Número, Bairro, Complemento"
                        className="bg-muted/40 border-border rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold text-foreground">Cidade</Label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cidade"
                        className="bg-muted/40 border-border rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">UF</Label>
                      <Input
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        placeholder="UF"
                        maxLength={2}
                        className="bg-muted/40 border-border rounded-xl font-mono uppercase text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Subseção 3: Responsável Legal & Contato */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Responsável Legal & Contato
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Responsável Legal *</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: Carlos Eduardo Silva"
                        className="bg-muted/40 border-border rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Cargo / Função</Label>
                      <Input
                        value={rolePosition}
                        onChange={(e) => setRolePosition(e.target.value)}
                        placeholder="Ex: Sócio-Administrador"
                        className="bg-muted/40 border-border rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-border">
                  <Button
                    type="submit"
                    disabled={updateClient.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 rounded-xl cursor-pointer shadow-xs"
                  >
                    {updateClient.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Salvar Dados Cadastrais
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card 1b: Gestão Financeira do Cliente (Definido pelo Gestor) */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Parâmetros Financeiros & Contrato (Gestor)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Defina o modelo de contratação, valores e datas que aparecerão na área restrita deste cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
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
                        <SelectItem value="Único">Único (Pontual)</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
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
                    <Label className="text-xs font-semibold">Valor do Setup (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={setupValue}
                      onChange={(e) => setSetupValue(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Duração do Contrato</Label>
                    <Input
                      value={contractDuration}
                      onChange={(e) => setContractDuration(e.target.value)}
                      placeholder="Ex: 12 meses"
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

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={updateClient.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 rounded-xl cursor-pointer"
                  >
                    {updateClient.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Salvar Parâmetros Financeiros
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card 1c: Documentação & Arquivos de Homologação */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <FileCheck className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                    Documentação & Arquivos de Homologação ({clientDocs.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Arquivos submetidos pelo cliente no onboarding e documentos oficiais vinculados à conta.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 w-fit">
                  Homologação Cadastral
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Listagem de Documentos de Homologação */}
              {clientDocs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-muted/20 space-y-2">
                  <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">Nenhum documento anexado ainda</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    O cliente poderá enviar o Cartão CNPJ, Contrato Social e RG/CNH durante o processo de ativação/onboarding.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    {(clientDocs || []).map((doc) => {
                      const docType = doc?.document_type || "documento";
                      const meta = (doc?.document_type && DOCUMENT_TYPE_META[doc.document_type]) || {
                        label: String(docType).replace(/_/g, " ").toUpperCase(),
                        description: "Documento oficial do cliente",
                        badge: "Arquivo",
                      };
                      const fileName = getFileName(doc?.file_path, doc?.file_url || doc?.public_url, docType);
                      const fileUrl = doc?.file_url || doc?.public_url || "#";
                      const isPending = !doc?.status || doc.status === "pendente" || doc.status === "em_analise";

                      return (
                        <div
                          key={doc.id}
                          className="p-4 border border-border/80 rounded-2xl bg-card hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-bold text-foreground truncate">
                                  {meta.label}
                                </h4>
                                <Badge variant="outline" className="text-[10px] font-semibold py-0 px-1.5 bg-muted text-muted-foreground border-border">
                                  {meta.badge}
                                </Badge>
                                {isPending ? (
                                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/40 text-[10px] font-bold py-0 px-2">
                                    Em Análise
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/40 text-[10px] font-bold py-0 px-2">
                                    {doc.status}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate font-mono">
                                {fileName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Enviado em: {formatDate(doc.uploaded_at || (doc as any).created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl border-border hover:bg-muted cursor-pointer"
                            >
                              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Visualizar
                              </a>
                            </Button>

                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl border-border hover:bg-muted cursor-pointer"
                            >
                              <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Baixar
                              </a>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDoc.mutate({ documentId: doc.id, filePath: doc.file_path })}
                              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer rounded-xl"
                              title="Excluir documento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seção para o Gestor Anexar Contrato ou NF adicional */}
              <div className="pt-4 border-t border-border space-y-3">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UploadCloud className="h-4 w-4 text-blue-600" /> Anexar Documento / Nota Fiscal pelo Gestor:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 border border-border rounded-xl bg-muted/20 space-y-2">
                    <p className="text-xs font-bold text-foreground">Contrato Oficial de Prestação</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Disponibiliza o contrato oficial para consulta do cliente no portal.
                    </p>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && resolvedClientId) {
                            uploadDoc.mutate({
                              clientId: resolvedClientId,
                              documentType: "contrato_prestacao",
                              file,
                            });
                          }
                        }}
                      />
                      <UploadCloud className="h-3.5 w-3.5" /> Upload de Contrato
                    </label>
                  </div>

                  <div className="p-3.5 border border-border rounded-xl bg-muted/20 space-y-2">
                    <p className="text-xs font-bold text-foreground">Nota Fiscal Emitida</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Disponibiliza a NF emitida para download pelo cliente na aba financeira.
                    </p>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.xml,.png,.jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && resolvedClientId) {
                            uploadDoc.mutate({
                              clientId: resolvedClientId,
                              documentType: "nota_fiscal",
                              file,
                            });
                          }
                        }}
                      />
                      <UploadCloud className="h-3.5 w-3.5" /> Upload de Nota Fiscal
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Projetos Vinculados */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/70">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Projetos Vinculados ({client.projects?.length || 0})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Projetos que este cliente pode visualizar exclusivamente no Portal do Cliente.
                </CardDescription>
              </div>

              <Dialog open={openLinkModal} onOpenChange={setOpenLinkModal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-xl border-border cursor-pointer">
                    <Plus className="h-3.5 w-3.5" /> Vincular Projeto
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                      <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Vincular Projeto ao Cliente
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Selecione um projeto cadastrado para associar à conta deste cliente.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleLinkSubmit} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label className="text-foreground">Projeto Existente</Label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="w-full bg-muted/40 border-border rounded-xl">
                          <SelectValue placeholder="Selecione um projeto..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {unlinkedProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title} ({p.service_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {unlinkedProjects.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Não há projetos não vinculados disponíveis no momento.
                        </p>
                      )}
                    </div>

                    <DialogFooter className="pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpenLinkModal(false)}
                        className="rounded-xl border-border cursor-pointer"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={linkProject.isPending || !selectedProjectId}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl cursor-pointer"
                      >
                        {linkProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirmar Vinculação
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              {client.projects && client.projects.length > 0 ? (
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                  {client.projects.map((proj: any) => (
                    <div
                      key={proj.id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-muted/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <Link
                            to="/app/projects/$id"
                            params={{ id: proj.id }}
                            className="hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {proj.title}
                          </Link>
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                            {proj.service_type || "Geral"}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
                          <span>Status: {proj.status}</span>
                          {proj.budget && (
                            <span>
                              Orçamento: R${" "}
                              {Number(proj.budget).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs rounded-lg">
                          <Link to="/app/projects/$id" params={{ id: proj.id }}>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={unlinkProject.isPending}
                          onClick={() =>
                            unlinkProject.mutate({ projectId: proj.id, clientId: client.id })
                          }
                          className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" /> Desvincular
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20 font-medium">
                  Nenhum projeto vinculado a este cliente ainda. Clique em "Vincular Projeto" para
                  associar.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Access & Portal Info */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Status do Acesso ao Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Estado Atual:</span>
                <div>
                  {client.status === "ativo" && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Acesso Ativo
                    </Badge>
                  )}
                  {client.status === "convidado" && (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-xs">
                      <Clock className="h-3.5 w-3.5" /> Convite Enviado (Pendente)
                    </Badge>
                  )}
                  {client.status === "bloqueado" && (
                    <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-xs">
                      <Ban className="h-3.5 w-3.5" /> Acesso Bloqueado
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {client.status === "convidado"
                  ? "O cliente recebeu o convite por e-mail e precisa acessar a plataforma para confirmar sua senha e liberar a visualização dos projetos."
                  : client.status === "ativo"
                    ? "O cliente possui acesso completo liberado ao Portal do Cliente para visualizar seus projetos vinculados."
                    : "A conta está temporariamente bloqueada pelo Gestor. O cliente não conseguirá realizar login."}
              </p>

              <div className="pt-2 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resendInvite.isPending}
                  onClick={() =>
                    resendInvite.mutate({
                      name: client.full_name,
                      email: client.email,
                      companyName: client.company_name || undefined,
                    })
                  }
                  className="w-full text-xs font-semibold gap-1.5 rounded-xl border-border cursor-pointer hover:bg-muted"
                >
                  <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Reenviar E-mail de Convite
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const portalUrl =
                      typeof window !== "undefined"
                        ? `${window.location.origin}/portal/definir-senha?email=${encodeURIComponent(client.email)}`
                        : `/portal/definir-senha?email=${encodeURIComponent(client.email)}`;
                    navigator.clipboard.writeText(portalUrl);
                    toast.success("Link de acesso direto ao Portal do Cliente copiado!");
                  }}
                  className="w-full text-xs font-semibold gap-1.5 rounded-xl border-border cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Copiar Link Direto do Portal
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleStatus}
                  className={
                    client.status === "bloqueado"
                      ? "w-full text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-xl border-border cursor-pointer"
                      : "w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-xl border-border cursor-pointer"
                  }
                >
                  {client.status === "bloqueado" ? "Ativar Acesso" : "Bloquear Acesso"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
