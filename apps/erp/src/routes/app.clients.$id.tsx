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
} from "lucide-react";
import { toast } from "sonner";
import {
  useClientDetail,
  useUpdateClient,
  useLinkProjectClient,
  useUnlinkProjectClient,
  useResendClientInvite,
} from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/app/clients/$id")({
  head: () => ({
    meta: [{ title: "Detalhes do Cliente — Delski ERP" }],
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
  const linkProject = useLinkProjectClient();
  const unlinkProject = useUnlinkProjectClient();
  const resendInvite = useResendClientInvite();

  // Form edit state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  // Modal link project state
  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    if (client) {
      setFullName(client.full_name || "");
      setEmail(client.email || "");
      setCompanyName(client.company_name || "");
      setPhone(client.phone || "");
    }
  }, [client]);

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

  if (!isGestor || !client) return null;

  const resolvedClientId = client?.resolved_id || client?.auth_user_id || client?.id;

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
              <span>• Cadastrado em {new Date(client.created_at).toLocaleDateString("pt-BR")}</span>
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
                  : "text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
              }
            >
              {client.status === "bloqueado" ? "Ativar Acesso" : "Bloquear Acesso"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form & Projects */}
        <div className="md:col-span-2 space-y-6">
          {/* Card 1: Dados Cadastrais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" />
                Dados Cadastrais do Cliente
              </CardTitle>
              <CardDescription className="text-xs">
                Atualize as informações corporativas e dados de contato principal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome Completo *</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">E-mail Corporativo *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome da Empresa / Razão Social</Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Studio Lumina Mídia"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98888-7777"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={updateClient.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium gap-1.5"
                  >
                    {updateClient.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Salvar Dados Cadastrais
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card 2: Projetos Vinculados */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-indigo-500" />
                  Projetos Vinculados ({client.projects?.length || 0})
                </CardTitle>
                <CardDescription className="text-xs">
                  Projetos que este cliente pode visualizar exclusivamente no Portal do Cliente.
                </CardDescription>
              </div>

              <Dialog open={openLinkModal} onOpenChange={setOpenLinkModal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Vincular Projeto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FolderKanban className="h-5 w-5 text-indigo-500" /> Vincular Projeto ao
                      Cliente
                    </DialogTitle>
                    <DialogDescription>
                      Selecione um projeto cadastrado para associar à conta deste cliente.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleLinkSubmit} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label>Projeto Existente</Label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um projeto..." />
                        </SelectTrigger>
                        <SelectContent>
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
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={linkProject.isPending || !selectedProjectId}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                      >
                        {linkProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirmar Vinculação
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="space-y-3">
              {client.projects && client.projects.length > 0 ? (
                <div className="divide-y divide-border border border-border rounded-lg">
                  {client.projects.map((proj: any) => (
                    <div
                      key={proj.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/30"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <Link
                            to="/app/projects/$id"
                            params={{ id: proj.id }}
                            className="hover:underline hover:text-indigo-400"
                          >
                            {proj.title}
                          </Link>
                          <Badge variant="outline" className="text-[10px]">
                            {proj.service_type || "Geral"}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-3">
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
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
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
                          className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3 w-3" /> Desvincular
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  Nenhum projeto vinculado a este cliente ainda. Clique em "Vincular Projeto" para
                  associar.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Access & Portal Info */}
        <div className="space-y-6">
          <Card className="border-indigo-500/20 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                Status do Acesso ao Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Estado Atual:</span>
                <div>
                  {client.status === "ativo" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Acesso Ativo
                    </Badge>
                  )}
                  {client.status === "convidado" && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1 text-xs">
                      <Clock className="h-3.5 w-3.5" /> Convite Enviado (Pendente)
                    </Badge>
                  )}
                  {client.status === "bloqueado" && (
                    <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 gap-1 text-xs">
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

              <div className="pt-2 border-t space-y-2">
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
                  className="w-full text-xs font-medium gap-1.5"
                >
                  <Send className="h-3.5 w-3.5 text-indigo-400" /> Reenviar E-mail de Convite
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleStatus}
                  className={
                    client.status === "bloqueado"
                      ? "w-full text-xs text-emerald-400 hover:text-emerald-300"
                      : "w-full text-xs text-rose-400 hover:text-rose-300"
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
