import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
  Phone,
  Send,
  Trash2,
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

export const Route = createFileRoute("/app/clients/")({
  head: () => ({
    meta: [
      { title: "Diretório de Clientes — DELSKI CLOUD" },
      { name: "description", content: "Gestão da base de clientes ativos, convites e acessos." },
    ],
  }),
  component: ClientsPage,
});

export function ClientsPage() {
  const navigate = useNavigate();
  const { isGestor, loading: authLoading } = useAuth();
  const { data: clients = [], isLoading } = useClientsList();

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const resendInvite = useResendClientInvite();

  const [deletingClient, setDeletingClient] = useState<ClientItem | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Client Modal state
  const [openModal, setOpenModal] = useState(false);

  const [fetchingModalCep, setFetchingModalCep] = useState(false);
  const [modalAddress, setModalAddress] = useState("");
  const [modalCity, setModalCity] = useState("");
  const [modalState, setModalState] = useState("");

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

  const handleModalCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, "");
    if (rawCep.length === 8) {
      setFetchingModalCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const street = [data.logradouro, data.bairro].filter(Boolean).join(", ");
          setModalAddress(street);
          setModalCity(data.localidade || "");
          setModalState(data.uf || "");
          toast.success("Endereço preenchido via CEP!");
        } else {
          toast.error("CEP não encontrado.");
        }
      } catch (err) {
        toast.error("Erro ao buscar CEP.");
      } finally {
        setFetchingModalCep(false);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const fullName = fd.get("fullName") as string;
    const companyName = fd.get("companyName") as string;
    const corporateName = fd.get("corporateName") as string;
    const cnpj = fd.get("cnpj") as string;
    const segment = fd.get("segment") as string;
    const cep = fd.get("cep") as string;
    const address = fd.get("address") as string;
    const city = fd.get("city") as string;
    const state = fd.get("state") as string;
    const phone = fd.get("phone") as string;
    const roleTitle = fd.get("roleTitle") as string;

    if (!email || !fullName || !companyName) {
      toast.error("Preencha os campos obrigatórios (Nome, E-mail e Nome Fantasia).");
      return;
    }

    try {
      await createClient.mutateAsync({
        email,
        fullName,
        companyName,
        corporateName,
        cnpj,
        segment,
        cep,
        address,
        city,
        state,
        phone,
        roleTitle,
      });

      toast.success("Cliente cadastrado com sucesso!");
      setOpenModal(false);
      setModalAddress("");
      setModalCity("");
      setModalState("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cadastrar cliente.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Diretório de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Cadastre clientes contratantes, acompanhe o acesso ao Portal e gerencie vinculação de projetos.
          </p>
        </div>

        <Dialog
          open={openModal}
          onOpenChange={(v) => {
            setOpenModal(v);
            if (!v) {
              setModalAddress("");
              setModalCity("");
              setModalState("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs gap-1.5 font-semibold">
              <Plus className="h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Building2 className="h-5 w-5 text-primary" /> Cadastrar Novo Cliente
              </DialogTitle>
              <DialogDescription>
                Preencha os dados corporativos para formalização fiscal e contratual. O cliente receberá o convite de acesso por e-mail.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
              {/* Seção 1: Dados da Empresa */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Dados Corporativos da Empresa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs font-semibold">Nome Fantasia *</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      placeholder="Ex: Studio Lumina Mídia"
                      required
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="corporateName" className="text-xs font-semibold">Razão Social</Label>
                    <Input
                      id="corporateName"
                      name="corporateName"
                      placeholder="Ex: Lumina Mídia e Serviços LTDA"
                      className="rounded-xl text-xs"
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
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Localização & Endereço */}
              <div className="space-y-3 pt-2 border-t border-border/70">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Endereço & Localização
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
                        <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-primary" />
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
                      className="rounded-xl text-xs"
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
                      className="rounded-xl text-xs"
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
                      className="rounded-xl font-mono uppercase text-center text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Responsável Legal & Contato */}
              <div className="space-y-3 pt-2 border-t border-border/70">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Responsável Legal & Contato
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-semibold">Nome Completo do Responsável *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Ex: Carlos Eduardo Silveira"
                      required
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="roleTitle" className="text-xs font-semibold">Cargo na Empresa</Label>
                    <Input
                      id="roleTitle"
                      name="roleTitle"
                      placeholder="Ex: Diretor de Operações / Sócio"
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">E-mail Corporativo (Login) *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="carlos@empresa.com.br"
                      required
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">Telefone / WhatsApp</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="(11) 98888-7777"
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpenModal(false);
                    setModalAddress("");
                    setModalCity("");
                    setModalState("");
                  }}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createClient.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 font-semibold shadow-xs"
                >
                  {createClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Cadastrar & Enviar Convite
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
              <Building2 className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{totalClients}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Clientes cadastrados</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ativos</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeClients}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Com acesso liberado</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Convites Pendentes</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{invitedClients}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Aguardando ativação</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bloqueados</span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500">
              <Ban className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{blockedClients}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Acesso suspenso</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-card rounded-2xl border border-border p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, empresa ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs rounded-xl h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] text-xs rounded-xl h-9">
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

      {/* Clients Table */}
      {isLoading ? (
        <TableSkeleton columns={5} rows={6} />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum cliente encontrado"
          description={
            search || statusFilter !== "all"
              ? "Tente ajustar os filtros de busca para encontrar o que procura."
              : "Cadastre novos clientes contratantes para liberar acesso ao Portal do Cliente."
          }
          actionLabel="Cadastrar Cliente"
          onAction={() => setOpenModal(true)}
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Empresa / Cliente</th>
                  <th className="py-3 px-4">Responsável Legal</th>
                  <th className="py-3 px-4">Projetos Ativos</th>
                  <th className="py-3 px-4">Status de Acesso</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {(c.company_name || c.full_name).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">
                            {c.company_name || "Sem Nome Fantasia"}
                          </div>
                          {c.segment && (
                            <span className="text-[10px] text-muted-foreground">{c.segment}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <div className="font-medium text-foreground">{c.full_name}</div>
                      <div className="text-[11px]">{c.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="font-semibold text-[10px]">
                        {c.active_projects_count ?? 0} projetos
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.status === "ativo" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                          Ativo
                        </Badge>
                      ) : c.status === "convidado" ? (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold">
                          Convidado
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px] font-semibold">
                          Bloqueado
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold hover:text-primary"
                        >
                          <Link to="/app/clients/$id" params={{ id: c.id }}>
                            Ver Perfil <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                          onClick={() => setDeletingClient(c)}
                          title="Excluir Cliente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deletingClient)} onOpenChange={(v) => !v && setDeletingClient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">
              Excluir Cliente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que deseja excluir o cliente{" "}
              <strong>{deletingClient?.company_name || deletingClient?.full_name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setDeletingClient(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteClient.isPending}
              onClick={() => {
                if (deletingClient) {
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
                }
              }}
            >
              {deleteClient.isPending ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
