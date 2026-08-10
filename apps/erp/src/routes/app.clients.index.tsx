import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Mail,
  Loader2,
  Building2,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  FolderKanban,
  ExternalLink,
  Phone,
  Send,
  ArrowRight,
  Trash2,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import {
  useClientsList,
  useCreateClient,
  useUpdateClient,
  useResendClientInvite,
  type ClientItem,
} from "@/hooks/useClients";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/mocks/store";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABEL,
  SERVICE_TYPES,
  SERVICE_LABEL,
  type LeadStage,
  type ServiceType,
} from "@/mocks/types";
// Command removed: was causing CPU lockup when rendered inline inside Dialog

export const Route = createFileRoute("/app/clients/")({
  head: () => ({
    meta: [
      { title: "Clientes & CRM — Delski ERP" },
      { name: "description", content: "Gestão de clientes, acessos e funil comercial." },
    ],
  }),
  component: ClientsPage,
});

const money = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;
const stageColor: Record<LeadStage, string> = {
  Prospeccao: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  Reuniao: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Proposta: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  Fechado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Perdido: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function ClientsPage() {
  const navigate = useNavigate();
  const { isGestor, loading: authLoading } = useAuth();
  const { data: clients = [], isLoading } = useClientsList();

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const resendInvite = useResendClientInvite();

  // Search & Filter state (Clientes)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Tabs state
  const [activeTab, setActiveTab] = useState("diretorio");

  // CRM Leads state
  const leads = useStore((s) => s.leads);
  const addLead = useStore((s) => s.addLead);
  const updateStage = useStore((s) => s.updateLeadStage);
  const removeLead = useStore((s) => s.removeLead);
  const convert = useStore((s) => s.convertLeadToProject);

  // CRM Modals/Dialogs state
  const [openAddLead, setOpenAddLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: "",
    contact: "",
    service: "Sites" as ServiceType,
    estimatedValue: "",
    notes: "",
  });

  // Client Modal state
  const [openModal, setOpenModal] = useState(false);
  // selectedLead state for importing CRM lead data into client form
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  useEffect(() => {
    if (!authLoading && !isGestor) {
      navigate({ to: "/app/projects", replace: true });
    }
  }, [isGestor, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!isGestor) return null;

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company_name || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "ativo").length;
  const invitedClients = clients.filter((c) => c.status === "convidado").length;
  const blockedClients = clients.filter((c) => c.status === "bloqueado").length;

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullNameVal = (fd.get("fullName") as string || "").trim();
    const emailVal = (fd.get("email") as string || "").trim();
    const companyNameVal = (fd.get("companyName") as string || "").trim();
    const phoneVal = (fd.get("phone") as string || "").trim();
    if (!fullNameVal || !emailVal) {
      return toast.error("Preencha nome e e-mail do cliente.");
    }
    createClient.mutate(
      {
        full_name: fullNameVal,
        email: emailVal,
        company_name: companyNameVal || undefined,
        phone: phoneVal || undefined,
        lead_id: selectedLead?.id,
      } as any,
      {
        onSuccess: () => {
          if (selectedLead?.id) {
            updateStage(selectedLead.id, "Fechado");
          }
          setOpenModal(false);
          setSelectedLead(null);
        },
      },
    );
  };

  const handleToggleStatus = (client: ClientItem) => {
    const nextStatus = client.status === "bloqueado" ? "ativo" : "bloqueado";
    updateClient.mutate({
      id: client.id,
      patch: { status: nextStatus },
    });
  };

  // CRM action handlers
  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.contact || !leadForm.estimatedValue) {
      return toast.error("Preencha nome, contato e valor estimado do lead.");
    }
    addLead({
      name: leadForm.name,
      contact: leadForm.contact,
      service: leadForm.service,
      estimatedValue: Number(leadForm.estimatedValue),
      notes: leadForm.notes,
    });
    toast.success("Lead adicionado ao funil comercial!");
    setOpenAddLead(false);
    setLeadForm({ name: "", contact: "", service: "Sites", estimatedValue: "", notes: "" });
  };

  const handleConvertLead = (leadId: string) => {
    const deadline = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const projectId = convert(leadId, deadline);
    if (projectId) {
      toast.success("Lead convertido em projeto!");
      navigate({ to: "/app/projects/$id", params: { id: projectId } });
    }
  };

  const totalPipeline = leads
    .filter((l) => l.stage !== "Perdido" && l.stage !== "Fechado")
    .reduce((a, l) => a + l.estimatedValue, 0);
  const closedValue = leads
    .filter((l) => l.stage === "Fechado")
    .reduce((a, l) => a + l.estimatedValue, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="section-label mb-1">Relacionamento</p>
          <h1 className="page-title">
            {activeTab === "diretorio" ? "Clientes" : "CRM & Funil de Vendas"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === "diretorio"
              ? "Cadastre clientes contratantes, acompanhe o acesso ao Portal e gerencie vinculação de projetos."
              : `Pipeline em aberto: ${money(totalPipeline)} · Fechado: ${money(closedValue)}`}
          </p>
        </div>

        {activeTab === "diretorio" ? (
          <Dialog open={openModal} onOpenChange={(v) => { setOpenModal(v); if (!v) setSelectedLead(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-none gap-1.5">
                <Plus className="h-4 w-4" /> Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-serif text-xl font-bold">
                  <Building2 className="h-5 w-5 text-blue-700" /> Cadastrar Novo Cliente
                </DialogTitle>
                <DialogDescription>
                  O cliente receberá um e-mail de convite para acessar a plataforma e definir sua
                  senha de acesso.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                {/* Lead Import (simple native select — Command removed due to CPU lockup) */}
                {leads.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Importar dados de um Lead do CRM (Opcional)</Label>
                    <select
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      value={selectedLead?.id ?? ""}
                      onChange={(e) => {
                        const lead = leads.find((l) => l.id === e.target.value) ?? null;
                        setSelectedLead(lead);
                      }}
                    >
                      <option value="">— Nenhum lead selecionado —</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} · {l.contact}
                        </option>
                      ))}
                    </select>
                    {selectedLead && (
                      <p className="text-xs text-stone-500">
                        Lead selecionado: {selectedLead.name || selectedLead.contact}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Nome Completo / Contato Principal *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Ex: Carlos Eduardo Silva"
                    defaultValue={selectedLead ? (selectedLead.contact || selectedLead.name || "") : ""}
                    key={selectedLead?.id ?? "none"}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail Corporativo *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="carlos@empresa.com.br"
                    defaultValue={selectedLead?.contact?.includes("@") ? selectedLead.contact : ""}
                    key={(selectedLead?.id ?? "none") + "-email"}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Nome da Empresa / Organização (Opcional)</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    placeholder="Ex: Studio Lumina Mídia"
                    defaultValue={selectedLead?.name ?? ""}
                    key={(selectedLead?.id ?? "none") + "-company"}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone / WhatsApp (Opcional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="(11) 98888-7777"
                    defaultValue={selectedLead?.contact && /\d{8,}/.test(selectedLead.contact) ? selectedLead.contact : ""}
                    key={(selectedLead?.id ?? "none") + "-phone"}
                  />
                </div>

                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => { setOpenModal(false); setSelectedLead(null); }}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createClient.isPending}
                    className="bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white gap-2 border-none shadow-sm cursor-pointer"
                  >
                    {createClient.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cadastrar & Enviar Convite
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={openAddLead} onOpenChange={setOpenAddLead}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-none gap-1.5">
                <Plus className="h-4 w-4" /> Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl font-bold">Novo lead</DialogTitle>
                <DialogDescription>
                  Adicione um novo lead ao funil de vendas para acompanhamento comercial.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleLeadSubmit} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Nome / Empresa *</Label>
                  <Input
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    placeholder="Ex: Studio Lumina Mídia"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contato (e-mail ou telefone) *</Label>
                  <Input
                    value={leadForm.contact}
                    onChange={(e) => setLeadForm({ ...leadForm, contact: e.target.value })}
                    placeholder="Ex: comercial@lumina.com"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Serviço *</Label>
                    <Select
                      value={leadForm.service}
                      onValueChange={(v) => setLeadForm({ ...leadForm, service: v as ServiceType })}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SERVICE_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor estimado (R$) *</Label>
                    <Input
                      type="number"
                      value={leadForm.estimatedValue}
                      onChange={(e) => setLeadForm({ ...leadForm, estimatedValue: e.target.value })}
                      placeholder="5000"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notas</Label>
                  <Textarea
                    value={leadForm.notes}
                    onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                    placeholder="Observações sobre o fechamento..."
                    rows={3}
                  />
                </div>
                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => setOpenAddLead(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white gap-2 border-none shadow-sm cursor-pointer"
                  >
                    Adicionar ao Funil
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Total</span>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50">
              <Building2 className="h-4 w-4 text-gray-500" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value">{totalClients}</div>
          <p className="text-xs text-gray-400 mt-1.5">Clientes cadastrados</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Ativos</span>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-green-700">{activeClients}</div>
          <p className="text-xs text-gray-400 mt-1.5">Com acesso liberado</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Convites Pendentes</span>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-amber-600">{invitedClients}</div>
          <p className="text-xs text-gray-400 mt-1.5">Aguardando ativação</p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Bloqueados</span>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50">
              <Ban className="h-4 w-4 text-red-500" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-red-600">{blockedClients}</div>
          <p className="text-xs text-gray-400 mt-1.5">Acesso suspenso</p>
        </div>
      </div>

      {/* Unified Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-stone-150 p-1 rounded-lg border border-stone-200">
          <TabsTrigger value="diretorio" className="cursor-pointer font-bold">
            Diretório de Clientes
          </TabsTrigger>
          <TabsTrigger value="funil" className="cursor-pointer font-bold">
            Funil de Vendas (CRM)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diretorio" className="space-y-6 mt-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white rounded-2xl border border-gray-100 p-3 shadow-card">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por cliente, empresa ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-100 text-sm rounded-xl h-9 focus-visible:ring-blue-500"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-gray-50 border-gray-100 text-xs rounded-xl h-9">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="convidado">Convidados</SelectItem>
                <SelectItem value="bloqueado">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table / List */}
          <Card className="border border-stone-200/80 rounded-lg shadow-subtle overflow-hidden">
            <CardHeader className="pb-3 p-4">
              <CardTitle className="text-base font-bold text-stone-900">
                Lista de Clientes ({filteredClients.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 text-center text-sm text-stone-500 flex justify-center items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-900" /> Carregando clientes...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-16 text-center text-stone-500 space-y-2 border-t">
                  <Building2 className="h-8 w-8 mx-auto text-stone-400" />
                  <p className="text-sm font-semibold">Nenhum cliente encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 border-t">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors"
                    >
                      {/* Left: Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/app/clients/$id"
                            params={{ id: client.id }}
                            className="font-bold text-blue-900 hover:underline flex items-center gap-1.5 text-base"
                          >
                            {client.full_name}
                          </Link>

                          {client.company_name && (
                            <Badge
                              variant="outline"
                              className="bg-stone-100 text-stone-600 text-xs font-semibold border-stone-200"
                            >
                              {client.company_name}
                            </Badge>
                          )}

                          {/* Status Badge */}
                          {client.status === "ativo" && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold gap-1 text-xs px-2 py-0.5"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Ativo
                            </Badge>
                          )}
                          {client.status === "convidado" && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-200 font-semibold gap-1 text-xs px-2 py-0.5"
                            >
                              <Clock className="h-3 w-3" /> Convidado
                            </Badge>
                          )}
                          {client.status === "bloqueado" && (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-800 border-rose-200 font-semibold gap-1 text-xs px-2 py-0.5"
                            >
                              <Ban className="h-3 w-3" /> Bloqueado
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" /> {client.email}
                          </span>
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" /> {client.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3.5 w-3.5 text-blue-600" />
                            {client.projects?.length || 0}{" "}
                            {client.projects?.length === 1
                              ? "projeto vinculado"
                              : "projetos vinculados"}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {client.status === "convidado" && (
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
                            className="gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" /> Reenviar Convite
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(client)}
                          className={
                            client.status === "bloqueado"
                              ? "text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer"
                              : "text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
                          }
                        >
                          {client.status === "bloqueado" ? "Desbloquear" : "Bloquear"}
                        </Button>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs cursor-pointer border-stone-200 text-stone-700 hover:bg-stone-50"
                        >
                          <Link to="/app/clients/$id" params={{ id: client.id }}>
                            Ver Detalhes <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funil" className="space-y-6 mt-6">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {LEAD_STAGES.map((stage) => {
              const items = leads.filter((l) => l.stage === stage);
              const total = items.reduce((a, l) => a + l.estimatedValue, 0);
              return (
                <Card
                  key={stage}
                  className="bg-muted/30 border border-stone-200/80 shadow-subtle rounded-lg"
                >
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="text-sm flex items-center justify-between font-serif font-bold text-stone-900">
                      <span>{LEAD_STAGE_LABEL[stage]}</span>
                      <Badge
                        variant="secondary"
                        className="bg-stone-200 text-stone-700 font-semibold"
                      >
                        {items.length}
                      </Badge>
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-0.5">{money(total)}</div>
                  </CardHeader>
                  <CardContent className="space-y-3 min-h-[200px] p-4 pt-1">
                    {items.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-lg border border-stone-200 bg-white p-3 space-y-2 shadow-sm hover:border-stone-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-stone-900 text-sm truncate">
                              {l.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {l.contact}
                            </div>
                          </div>
                          <Badge
                            className="bg-stone-100 text-stone-855 border border-stone-200 text-[10px] font-semibold"
                            variant="outline"
                          >
                            {l.service}
                          </Badge>
                        </div>
                        <div className="text-sm font-bold text-stone-850">
                          {money(l.estimatedValue)}
                        </div>
                        {l.notes && (
                          <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-stone-55 p-1.5 rounded">
                            {l.notes}
                          </div>
                        )}
                        <div className="flex items-center gap-1 pt-1.5 border-t border-stone-100">
                          <Select
                            value={l.stage}
                            onValueChange={(v) => updateStage(l.id, v as LeadStage)}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1 bg-white border-stone-200 text-stone-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_STAGES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {LEAD_STAGE_LABEL[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {l.stage !== "Fechado" &&
                            l.stage !== "Perdido" &&
                            !l.convertedProjectId && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-stone-500 hover:text-stone-900 cursor-pointer"
                                onClick={() => handleConvertLead(l.id)}
                                title="Converter em projeto"
                              >
                                <Rocket className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          {l.convertedProjectId && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-blue-700 hover:text-blue-900 cursor-pointer"
                              onClick={() =>
                                navigate({
                                  to: "/app/projects/$id",
                                  params: { id: l.convertedProjectId! },
                                })
                              }
                              title="Ver projeto"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 cursor-pointer"
                            onClick={() => removeLead(l.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-xs text-stone-400 text-center py-8 border border-dashed border-stone-200 rounded-md bg-stone-50/30">
                        Vazio
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
