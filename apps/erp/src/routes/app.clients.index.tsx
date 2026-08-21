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
  MapPin,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useClientsList,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
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
      { title: "Clientes & CRM — DELSKI CLOUD" },
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
  const deleteClient = useDeleteClient();
  const resendInvite = useResendClientInvite();

  const [deletingClient, setDeletingClient] = useState<ClientItem | null>(null);

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

  const [fetchingModalCep, setFetchingModalCep] = useState(false);
  const [modalAddress, setModalAddress] = useState("");
  const [modalCity, setModalCity] = useState("");
  const [modalState, setModalState] = useState("");

  const handleModalCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, "");
    if (rawCep.length === 8) {
      setFetchingModalCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setModalAddress(`${data.logradouro || ""} - ${data.bairro || ""}`.trim().replace(/^-\s*/, ""));
          setModalCity(data.localidade || "");
          setModalState(data.uf || "");
          toast.success("Endereço preenchido automaticamente pelo CEP!");
        }
      } catch (err) {
        console.warn("Erro ao buscar CEP:", err);
      } finally {
        setFetchingModalCep(false);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const companyNameVal = (fd.get("companyName") as string || "").trim();
    const corporateNameVal = (fd.get("corporateName") as string || "").trim();
    const cnpjVal = (fd.get("cnpj") as string || "").trim();
    const segmentVal = (fd.get("segment") as string || "").trim();
    const emailVal = (fd.get("email") as string || "").trim();
    const cepVal = (fd.get("cep") as string || "").trim();
    const addressVal = (fd.get("address") as string || modalAddress || "").trim();
    const cityVal = (fd.get("city") as string || modalCity || "").trim();
    const stateVal = (fd.get("state") as string || modalState || "").trim();
    const fullNameVal = (fd.get("fullName") as string || "").trim();
    const rolePositionVal = (fd.get("rolePosition") as string || "").trim();
    const phoneVal = (fd.get("phone") as string || "").trim();

    if (!companyNameVal) {
      return toast.error("Preencha o Nome Fantasia da empresa.");
    }
    if (!emailVal) {
      return toast.error("Preencha o E-mail Corporativo.");
    }
    if (!fullNameVal) {
      return toast.error("Preencha o Nome do Responsável Legal.");
    }

    createClient.mutate(
      {
        company_name: companyNameVal,
        corporate_name: corporateNameVal || companyNameVal,
        cnpj: cnpjVal || undefined,
        segment: segmentVal || undefined,
        email: emailVal,
        cep: cepVal || undefined,
        address: addressVal || undefined,
        city: cityVal || undefined,
        state: stateVal || undefined,
        full_name: fullNameVal,
        role_position: rolePositionVal || undefined,
        phone: phoneVal || undefined,
        lead_id: selectedLead?.id,
      },
      {
        onSuccess: () => {
          if (selectedLead?.id) {
            updateStage(selectedLead.id, "Fechado");
          }
          setOpenModal(false);
          setSelectedLead(null);
          setModalAddress("");
          setModalCity("");
          setModalState("");
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
          <Dialog open={openModal} onOpenChange={(v) => { setOpenModal(v); if (!v) { setSelectedLead(null); setModalAddress(""); setModalCity(""); setModalState(""); } }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white rounded-xl shadow-xs gap-1.5 border-0">
                <Plus className="h-4 w-4" /> Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-serif text-xl font-bold">
                  <Building2 className="h-5 w-5 text-blue-700" /> Cadastrar Novo Cliente
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados corporativos para formalização fiscal e contratual. O cliente receberá o convite de acesso por e-mail.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                {/* Lead Import (simple native select) */}
                {leads.length > 0 && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border">
                    <Label className="text-xs font-semibold text-foreground">Importar dados de um Lead do CRM (Opcional)</Label>
                    <select
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
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

                {/* Seção 1: Dados da Empresa */}
                <div className="space-y-3 pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" /> Dados Corporativos da Empresa
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyName" className="text-xs font-semibold">Nome Fantasia *</Label>
                      <Input
                        id="companyName"
                        name="companyName"
                        placeholder="Ex: Studio Lumina Mídia"
                        defaultValue={selectedLead?.name ?? ""}
                        key={(selectedLead?.id ?? "none") + "-company"}
                        required
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="corporateName" className="text-xs font-semibold">Razão Social</Label>
                      <Input
                        id="corporateName"
                        name="corporateName"
                        placeholder="Ex: Lumina Mídia e Serviços LTDA"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cnpj" className="text-xs font-semibold">CNPJ</Label>
                      <Input
                        id="cnpj"
                        name="cnpj"
                        placeholder="00.000.000/0000-00"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="segment" className="text-xs font-semibold">Segmento de Atuação</Label>
                      <Input
                        id="segment"
                        name="segment"
                        placeholder="Ex: Tráfego Pago, Design, IA"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 2: Localização & Endereço */}
                <div className="space-y-3 pt-2 border-t border-border/70">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" /> Endereço & Localização
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="cep" className="text-xs font-semibold">CEP</Label>
                      <div className="relative">
                        <Input
                          id="cep"
                          name="cep"
                          placeholder="00000-000"
                          onBlur={handleModalCepBlur}
                          className="rounded-xl font-mono text-xs pr-8"
                        />
                        {fetchingModalCep && (
                          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-blue-600" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="address" className="text-xs font-semibold">Endereço Completo</Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder="Rua, Número, Bairro, Complemento"
                        value={modalAddress}
                        onChange={(e) => setModalAddress(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="city" className="text-xs font-semibold">Cidade</Label>
                      <Input
                        id="city"
                        name="city"
                        placeholder="Cidade"
                        value={modalCity}
                        onChange={(e) => setModalCity(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="state" className="text-xs font-semibold">UF</Label>
                      <Input
                        id="state"
                        name="state"
                        placeholder="UF"
                        maxLength={2}
                        value={modalState}
                        onChange={(e) => setModalState(e.target.value.toUpperCase())}
                        className="rounded-xl font-mono uppercase text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Responsável Legal & Contato */}
                <div className="space-y-3 pt-2 border-t border-border/70">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-600" /> Responsável Legal & Contato
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs font-semibold">Responsável Legal *</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        placeholder="Ex: Carlos Eduardo Silva"
                        defaultValue={selectedLead ? (selectedLead.contact || selectedLead.name || "") : ""}
                        key={selectedLead?.id ?? "none"}
                        required
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="rolePosition" className="text-xs font-semibold">Cargo / Função</Label>
                      <Input
                        id="rolePosition"
                        name="rolePosition"
                        placeholder="Ex: Sócio-Administrador"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold">E-mail Corporativo (Login) *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="carlos@empresa.com.br"
                        defaultValue={selectedLead?.contact?.includes("@") ? selectedLead.contact : ""}
                        key={(selectedLead?.id ?? "none") + "-email"}
                        required
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-semibold">Telefone / WhatsApp</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="(11) 98888-7777"
                        defaultValue={selectedLead?.contact && /\d{8,}/.test(selectedLead.contact) ? selectedLead.contact : ""}
                        key={(selectedLead?.id ?? "none") + "-phone"}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenModal(false);
                      setSelectedLead(null);
                      setModalAddress("");
                      setModalCity("");
                      setModalState("");
                    }}
                    className="rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createClient.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 font-semibold cursor-pointer shadow-xs"
                  >
                    {createClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
        <div className="kpi-card bg-card border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="section-label">Total</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
              <Building2 className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-foreground">{totalClients}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Clientes cadastrados</p>
        </div>

        <div className="kpi-card bg-card border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="section-label">Ativos</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-emerald-600 dark:text-emerald-400">{activeClients}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Com acesso liberado</p>
        </div>

        <div className="kpi-card bg-card border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="section-label">Convites Pendentes</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-amber-600 dark:text-amber-400">{invitedClients}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Aguardando ativação</p>
        </div>

        <div className="kpi-card bg-card border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="section-label">Bloqueados</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500">
              <Ban className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div className="kpi-value text-rose-600 dark:text-rose-400">{blockedClients}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Acesso suspenso</p>
        </div>
      </div>

      {/* Unified Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted p-1 rounded-xl border border-border">
          <TabsTrigger value="diretorio" className="cursor-pointer font-bold">
            Diretório de Clientes
          </TabsTrigger>
          <TabsTrigger value="funil" className="cursor-pointer font-bold">
            Funil de Vendas (CRM)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diretorio" className="space-y-6 mt-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-card rounded-2xl border border-border p-3 shadow-subtle">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, empresa ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/60 dark:bg-zinc-900/90 border-border text-sm rounded-xl h-9 focus-visible:ring-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-muted/60 dark:bg-zinc-900/90 border-border text-xs rounded-xl h-9 text-foreground">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover border-border">
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="convidado">Convidados</SelectItem>
                <SelectItem value="bloqueado">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table / List Container */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-subtle">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/70">
              <h2 className="text-[14px] font-bold text-foreground">Lista de Clientes</h2>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                {filteredClients.length} registros
              </span>
            </div>

            {isLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : filteredClients.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Building2}
                  title="Nenhum cliente encontrado"
                  description={
                    search || statusFilter !== "all"
                      ? "Nenhum cliente corresponde aos filtros aplicados. Tente ajustar os termos da busca."
                      : "Sua empresa ainda não possui clientes cadastrados. Comece cadastrando seu primeiro cliente."
                  }
                  primaryAction={
                    !search && statusFilter === "all"
                      ? {
                          label: "Cadastrar Novo Cliente",
                          icon: Plus,
                          onClick: () => setOpenModal(true),
                        }
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>CLIENTE</th>
                      <th>E-MAIL</th>
                      <th>STATUS</th>
                      <th>PROJETOS</th>
                      <th className="text-right">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => {
                      const projectsCount = client.projects?.length || 0;
                      return (
                        <tr key={client.id} className="hover:bg-accent/40 transition-colors">
                          {/* Coluna CLIENTE */}
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {(client.full_name || client.company_name || "?").charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <Link
                                  to="/app/clients/$id"
                                  params={{ id: client.id }}
                                  className="font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors block"
                                >
                                  {client.full_name}
                                </Link>
                                {client.company_name && (
                                  <span className="text-[11px] text-muted-foreground block">
                                    {client.company_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Coluna E-MAIL */}
                          <td className="text-muted-foreground">{client.email}</td>

                          {/* Coluna STATUS */}
                          <td>
                            {client.status === "ativo" ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold gap-1 text-xs px-2.5 py-0.5 rounded-full"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Ativo
                              </Badge>
                            ) : client.status === "bloqueado" ? (
                              <Badge
                                variant="outline"
                                className="bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold gap-1 text-xs px-2.5 py-0.5 rounded-full"
                              >
                                <Ban className="h-3 w-3" /> Bloqueado
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold gap-1 text-xs px-2.5 py-0.5 rounded-full"
                              >
                                <Clock className="h-3 w-3" /> Pendente
                              </Badge>
                            )}
                          </td>

                          {/* Coluna PROJETOS */}
                          <td>
                            <span className="text-sm font-semibold text-foreground">{projectsCount}</span>
                            <span className="text-xs text-muted-foreground ml-1">projeto(s)</span>
                          </td>

                          {/* Coluna AÇÕES */}
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to="/app/clients/$id"
                                params={{ id: client.id }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors mr-1"
                              >
                                Ver Detalhes →
                              </Link>

                              {/* Reenviar Convite / Enviar E-mail */}
                              <button
                                onClick={() => {
                                  resendInvite.mutate({
                                    name: client.full_name,
                                    email: client.email,
                                    companyName: client.company_name || undefined,
                                  });
                                }}
                                disabled={resendInvite.isPending}
                                title="Reenviar e-mail de acesso"
                                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              >
                                <Mail className="h-4 w-4" />
                              </button>

                              {/* Bloquear / Desbloquear */}
                              <button
                                onClick={() => handleToggleStatus(client)}
                                title={client.status === "bloqueado" ? "Desbloquear Acesso" : "Bloquear Acesso"}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  client.status === "bloqueado"
                                    ? "text-emerald-500 hover:bg-emerald-500/10"
                                    : "text-amber-500 hover:bg-amber-500/10"
                                }`}
                              >
                                <Ban className="h-4 w-4" />
                              </button>

                              {/* Excluir */}
                              <button
                                onClick={() => setDeletingClient(client)}
                                title="Excluir Cliente"
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delete Client Confirmation Modal */}
          <Dialog open={!!deletingClient} onOpenChange={(v) => !v && setDeletingClient(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-600">
                  <Trash2 className="h-5 w-5" /> Confirmar Exclusão de Cliente
                </DialogTitle>
                <DialogDescription>
                  Tem certeza de que deseja excluir permanentemente o cliente{" "}
                  <strong>"{deletingClient?.full_name}"</strong>? O cadastro e acesso serão
                  removidos do banco de dados.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                <Button variant="outline" onClick={() => setDeletingClient(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteClient.isPending}
                  onClick={() => {
                      deleteClient.mutate(
                        {
                          id: deletingClient.id,
                          auth_user_id: deletingClient.auth_user_id,
                          email: deletingClient.email,
                        },
                        {
                          onSuccess: () => setDeletingClient(null),
                        }
                      );
                  }}
                >
                  {deleteClient.isPending ? "Excluindo..." : "Sim, Excluir Cliente"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="funil" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {LEAD_STAGES.map((stage) => {
              const items = leads.filter((l) => l.stage === stage);
              const total = items.reduce((a, l) => a + l.estimatedValue, 0);
              return (
                <Card
                  key={stage}
                  className="bg-card border-border shadow-subtle rounded-2xl overflow-hidden"
                >
                  <CardHeader className="pb-2 p-4 border-b border-border/70">
                    <CardTitle className="text-sm flex items-center justify-between font-bold text-foreground">
                      <span>{LEAD_STAGE_LABEL[stage]}</span>
                      <Badge
                        variant="secondary"
                        className="bg-muted text-muted-foreground font-semibold px-2 py-0.5 rounded-full text-xs"
                      >
                        {items.length}
                      </Badge>
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-0.5">{money(total)}</div>
                  </CardHeader>
                  <CardContent className="space-y-3 min-h-[200px] p-3 pt-3 bg-muted/10">
                    {items.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-xl border border-border bg-card dark:bg-zinc-900/90 p-3.5 space-y-2.5 shadow-xs hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-foreground text-sm truncate">
                              {l.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {l.contact}
                            </div>
                          </div>
                          <Badge
                            className="bg-muted text-muted-foreground border-border text-[10px] font-semibold shrink-0"
                            variant="outline"
                          >
                            {l.service}
                          </Badge>
                        </div>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {money(l.estimatedValue)}
                        </div>
                        {l.notes && (
                          <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/60 dark:bg-zinc-800/60 p-2 rounded-lg">
                            {l.notes}
                          </div>
                        )}
                        <div className="flex items-center gap-1 pt-2 border-t border-border/70">
                          <Select
                            value={l.stage}
                            onValueChange={(v) => updateStage(l.id, v as LeadStage)}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1 bg-muted/60 dark:bg-zinc-800/80 border-border text-foreground rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
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
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
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
                              className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg cursor-pointer"
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
                            className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            onClick={() => removeLead(l.id)}
                            title="Excluir lead"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-10 border border-dashed border-border rounded-xl bg-muted/20 font-medium">
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
