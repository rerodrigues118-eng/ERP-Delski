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
  DollarSign,
  AlertCircle,
  FileText,
  UploadCloud,
  Copy,
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

  // Form edit state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

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

  useEffect(() => {
    if (client) {
      setFullName(client.full_name || "");
      setEmail(client.email || "");
      setCompanyName(client.company_name || "");
      setPhone(client.phone || "");
      setContractModel((client as any).contract_model || "Mensal");
      setContractValue(String((client as any).contract_value || "0"));
      setSetupValue(String((client as any).setup_value || "0"));
      setContractDuration((client as any).contract_duration || "12 meses");
      setPaymentDate((client as any).payment_date || "");
      setDueDate((client as any).due_date || "");
      setFinancialStatus((client as any).financial_status || "Pendente");
    }
  }, [client]);

  const resolvedClientId = client?.resolved_id || client?.auth_user_id || client?.id;
  const { data: clientDocs = [] } = useClientDocuments(resolvedClientId);
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
    if (!fullName.trim() || !email.trim()) {
      return toast.error("Nome e e-mail são obrigatórios");
    }

    updateClient.mutate({
      id: client.id,
      patch: {
        full_name: fullName.trim(),
        email: email.trim(),
        company_name: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
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
              <h1 className="text-2xl font-bold tracking-tight">{client.full_name}</h1>
              {client.company_name && (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  {client.company_name}
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
                    <strong>"{client.full_name}"</strong>? Esta ação removerá a conta do banco de
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
          {/* Card 1: Dados Cadastrais */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Dados Cadastrais do Cliente
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Atualize as informações corporativas e dados de contato principal.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Nome Completo *</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-muted/40 border-border rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">E-mail Corporativo *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-muted/40 border-border rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Nome da Empresa / Razão Social</Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Studio Lumina Mídia"
                      className="bg-muted/40 border-border rounded-xl"
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

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={updateClient.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 rounded-xl cursor-pointer"
                  >
                    {updateClient.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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

          {/* Card 1c: Anexar Documentos / Notas Fiscais pelo Gestor */}
          <Card className="bg-card border-border shadow-subtle rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/70">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <FileText className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                Documentos & Notas Fiscais do Cliente
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Anexe o Contrato Oficial de Prestação ou Notas Fiscais emitidas para que o cliente visualize no portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-2xl bg-muted/20 dark:bg-zinc-900/90 space-y-2.5 shadow-xs">
                  <p className="text-xs font-bold text-foreground">Anexar Contrato Oficial</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Substitui ou disponibiliza o contrato oficial assinado no portal do cliente.
                  </p>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs">
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

                <div className="p-4 border border-border rounded-2xl bg-muted/20 dark:bg-zinc-900/90 space-y-2.5 shadow-xs">
                  <p className="text-xs font-bold text-foreground">Anexar Nota Fiscal</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Disponibiliza a NF emitida para download pelo cliente na aba financeira.
                  </p>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs">
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

              {clientDocs.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2.5">
                  <p className="text-xs font-semibold text-foreground">
                    Documentos no Repositório ({clientDocs.length}):
                  </p>
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card dark:bg-zinc-900/60">
                    {clientDocs.map((doc) => (
                      <div key={doc.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="font-semibold text-foreground uppercase text-[11px] truncate">
                            {doc.document_type}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatDate(doc.uploaded_at || (doc as any).created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={doc.file_url || doc.public_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1 text-[11px] font-medium"
                          >
                            <ExternalLink className="h-3 w-3" /> Ver
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDoc.mutate({ documentId: doc.id, filePath: doc.file_path })}
                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer rounded-lg"
                            title="Excluir documento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                        ? `${window.location.origin}/portal/auth?email=${encodeURIComponent(client.email)}`
                        : `/portal/auth?email=${encodeURIComponent(client.email)}`;
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
