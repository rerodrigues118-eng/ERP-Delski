import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";

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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      return toast.error("Preencha nome e e-mail do cliente.");
    }
    createClient.mutate(
      {
        full_name: fullName.trim(),
        email: email.trim(),
        company_name: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        // pass lead_id optionally (hook will ignore unknown fields safely)
        lead_id: selectedLead?.id,
      } as any,
      {
        onSuccess: () => {
          // If a lead was selected, mark it as converted in the local CRM store
          if (selectedLead?.id) {
            updateStage(selectedLead.id, "Fechado");
          }

          setOpenModal(false);
          setFullName("");
          setEmail("");
          setCompanyName("");
          setPhone("");
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-700" />
            {activeTab === "diretorio" ? "Gestão de Clientes" : "CRM & Funil de Vendas"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTab === "diretorio"
              ? "Cadastre clientes contratantes, acompanhe o acesso ao Portal e gerencie vinculação de projetos."
              : `Pipeline em aberto: ${money(totalPipeline)} · Fechado: ${money(closedValue)}`}
          </p>
        </div>

        {activeTab === "diretorio" ? (
          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white gap-2 shadow-md font-medium border-none px-4 h-9 cursor-pointer">
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
                {/* Lead Import (Autocomplete) */}
                <div className="space-y-1.5">
                  <Label>Importar dados de um Lead do CRM (Opcional)</Label>
                  <div className="relative">
                    <Command>
                      <CommandInput placeholder="Pesquisar lead por nome, empresa ou e-mail..." />
                      <CommandList>
                        {leads.length === 0 ? (
                          <CommandEmpty>Nenhum lead disponível</CommandEmpty>
                        ) : (
                          leads.map((l) => (
                            <CommandItem
                              key={l.id}
                              value={l.id}
                              onSelect={() => {
                                setSelectedLead(l);
                                // Lead shape: { name, contact }
                                const contact = (l.contact || "").trim();
                                const name = (l.name || "").trim();

                                // If contact looks like an email, set email. If it's a phone, set phone.
                                const emailCandidate = contact.includes("@") ? contact : "";
                                const phoneCandidate = /\d{8,}/.test(contact) ? contact : "";

                                // Populate fields: fullName -> contact (person), companyName -> name
                                setFullName(contact || name || "");
                                setEmail(emailCandidate);
                                setCompanyName(name || "");
                                setPhone(phoneCandidate);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{l.contact || l.name}</span>
                                <span className="text-xs text-stone-500">
                                  {l.name} · {l.contact}
                                </span>
                              </div>
                            </CommandItem>
                          ))
                        )}
                      </CommandList>
                    </Command>

                    {selectedLead && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLead(null);
                          setFullName("");
                          setEmail("");
                          setCompanyName("");
                          setPhone("");
                        }}
                        className="absolute right-2 top-2 text-xs text-stone-500 hover:text-stone-700"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  {selectedLead && (
                    <p className="text-xs text-stone-500">
                      Lead selecionado: {selectedLead.name || selectedLead.contact}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Nome Completo / Contato Principal *</Label>
                  <Input
                    placeholder="Ex: Carlos Eduardo Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>E-mail Corporativo *</Label>
                  <Input
                    type="email"
                    placeholder="carlos@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Nome da Empresa / Organização (Opcional)</Label>
                  <Input
                    placeholder="Ex: Studio Lumina Mídia"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Telefone / WhatsApp (Opcional)</Label>
                  <Input
                    placeholder="(11) 98888-7777"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
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
              <Button className="bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white gap-2 shadow-md font-medium border-none px-4 h-9 cursor-pointer">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Total de Clientes</div>
            <div className="text-2xl font-bold mt-1">{totalClients}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-emerald-500/20">
          <CardContent className="p-4">
            <div className="text-xs text-emerald-400 font-medium">Acessos Ativos</div>
            <div className="text-2xl font-bold mt-1 text-emerald-500">{activeClients}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-amber-500/20">
          <CardContent className="p-4">
            <div className="text-xs text-amber-400 font-medium">Convites Pendentes</div>
            <div className="text-2xl font-bold mt-1 text-amber-500">{invitedClients}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-rose-500/20">
          <CardContent className="p-4">
            <div className="text-xs text-rose-400 font-medium">Contas Bloqueadas</div>
            <div className="text-2xl font-bold mt-1 text-rose-500">{blockedClients}</div>
          </CardContent>
        </Card>
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
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-stone-400" />
              <Input
                placeholder="Buscar por nome do cliente, empresa ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-stone-200 text-sm focus-visible:ring-blue-900"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-card border-stone-200 text-sm">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
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
