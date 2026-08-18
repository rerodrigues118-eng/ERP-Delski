import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  UserCheck,
  UserX,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Mail,
  ShieldCheck,
  Phone,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  useAccessRequests,
  useApproveUser,
  useRejectUser,
  type AccessRequestProfile,
} from "@/hooks/useApprovals";

export const Route = createFileRoute("/app/approvals")({
  head: () => ({
    meta: [
      { title: "Solicitações de Acesso — DELSKI CLOUD" },
      {
        name: "description",
        content: "Gerencie e aprove novos cadastros de usuários e prestadores de serviço.",
      },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { isGestor, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: requests = [], isLoading } = useAccessRequests();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();

  useEffect(() => {
    if (!authLoading && !isGestor) {
      navigate({ to: "/app/projects", replace: true });
    }
  }, [authLoading, isGestor, navigate]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Modais de ação
  const [approvingUser, setApprovingUser] = useState<AccessRequestProfile | null>(null);
  const [rejectingUser, setRejectingUser] = useState<AccessRequestProfile | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.approval_status === "pending").length;
    const approved = requests.filter((r) => r.approval_status === "approved").length;
    const rejected = requests.filter((r) => r.approval_status === "rejected").length;
    return {
      pending,
      approved,
      rejected,
      total: requests.length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterStatus !== "all" && r.approval_status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (r.full_name || "").toLowerCase();
        const email = (r.email || "").toLowerCase();
        const role = (r.role || "").toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q);
      }
      return true;
    });
  }, [requests, filterStatus, search]);

  const handleConfirmApprove = async () => {
    if (!approvingUser) return;
    await approveUser.mutateAsync({
      id: approvingUser.id,
      email: approvingUser.email,
      fullName: approvingUser.full_name,
      role: approvingUser.role,
    });
    setApprovingUser(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectingUser) return;
    await rejectUser.mutateAsync({
      id: rejectingUser.id,
      email: rejectingUser.email,
      fullName: rejectingUser.full_name,
      role: rejectingUser.role,
      reason: rejectReason.trim() || undefined,
    });
    setRejectingUser(null);
    setRejectReason("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-2.5 py-0.5 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pendente
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-0.5 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Aprovado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs px-2.5 py-0.5 font-medium flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Recusado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "gestor":
      case "admin":
        return { label: "Gestor", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
      case "cliente":
        return { label: "Cliente", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
      default:
        return { label: "Freelancer / Prestador", color: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20" };
    }
  };

  if (authLoading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Verificando permissões de acesso...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-primary" />
            Solicitações de Acesso
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Moderação de novos cadastros: aprove ou recuse permissões para acesso ao DELSKI CLOUD.
          </p>
        </div>

        {stats.pending > 0 && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {stats.pending} {stats.pending === 1 ? "usuário aguarda aprovação" : "usuários aguardam aprovação"}
          </div>
        )}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-card border-amber-500/20 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Pendentes de Análise
                </span>
                <div className="mt-1.5 text-2xl font-bold text-amber-600">{stats.pending}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-emerald-500/20 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Acessos Aprovados
                </span>
                <div className="mt-1.5 text-2xl font-bold text-emerald-600">{stats.approved}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-rose-500/20 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Acessos Recusados
                </span>
                <div className="mt-1.5 text-2xl font-bold text-rose-600">{stats.rejected}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-500/10 text-rose-600">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-blue-500/20 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Total de Cadastros
                </span>
                <div className="mt-1.5 text-2xl font-bold text-foreground">{stats.total}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Solicitações */}
      <Card className="bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Usuários e Solicitações de Cadastro ({filteredRequests.length})
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-8 w-52 text-xs"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-40 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendentes de Aprovação</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="rejected">Recusados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Carregando solicitações...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center border-t border-dashed space-y-2">
              <UserCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-semibold text-sm text-foreground">
                Nenhuma solicitação encontrada
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search || filterStatus !== "all"
                  ? "Nenhum usuário corresponde aos filtros selecionados."
                  : "Não há solicitações de acesso pendentes no momento."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-y text-muted-foreground font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Contato</th>
                    <th className="py-3 px-4">Papel / Perfil</th>
                    <th className="py-3 px-4">Data de Cadastro</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRequests.map((req) => {
                    const roleInfo = getRoleLabel(req.role);
                    const isPending = req.approval_status === "pending";

                    return (
                      <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border">
                              <AvatarImage src={req.avatar_url || ""} />
                              <AvatarFallback className="text-xs font-bold bg-blue-50 text-blue-700">
                                {req.full_name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-foreground">{req.full_name}</p>
                              {req.cargo && (
                                <p className="text-[11px] text-muted-foreground">{req.cargo}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{req.email}</span>
                          </div>
                          {req.phone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{req.phone}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            className={`text-xs px-2.5 py-0.5 font-medium ${roleInfo.color}`}
                          >
                            {roleInfo.label}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                          {req.created_at
                            ? new Date(req.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(req.approval_status)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                          {isPending ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => setApprovingUser(req)}
                                className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar Acesso
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectingUser(req)}
                                className="h-7 text-xs px-2.5 text-rose-700 border-rose-200 hover:bg-rose-50 font-semibold gap-1"
                              >
                                <UserX className="h-3.5 w-3.5" /> Recusar
                              </Button>
                            </>
                          ) : req.approval_status === "rejected" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setApprovingUser(req)}
                              className="h-7 text-xs px-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-semibold gap-1"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Reaprovar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRejectingUser(req)}
                              className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50"
                              title="Revogar / Bloquear Acesso"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL: Confirmar Aprovação ────────────────────────────────────── */}
      <Dialog open={!!approvingUser} onOpenChange={(o) => !o && setApprovingUser(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Confirmar Aprovação de Acesso
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              O usuário receberá um e-mail com as instruções de boas-vindas e terá acesso liberado ao DELSKI CLOUD.
            </DialogDescription>
          </DialogHeader>

          {approvingUser && (
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-1.5">
              <p className="font-bold text-stone-900 text-sm">{approvingUser.full_name}</p>
              <div className="flex items-center gap-1.5 text-stone-600">
                <Mail className="h-3.5 w-3.5" />
                <span>{approvingUser.email}</span>
              </div>
              <div className="pt-1">
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                  Papel: {getRoleLabel(approvingUser.role).label}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApprovingUser(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmApprove}
              disabled={approveUser.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {approveUser.isPending ? "Aprovando & Enviando E-mail..." : "Confirmar & Liberar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Recusar Acesso ─────────────────────────────────────────── */}
      <Dialog open={!!rejectingUser} onOpenChange={(o) => !o && setRejectingUser(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <UserX className="h-5 w-5" /> Recusar Solicitação de Acesso
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              O usuário não terá acesso aos painéis corporativos e receberá uma notificação informando a decisão.
            </DialogDescription>
          </DialogHeader>

          {rejectingUser && (
            <div className="space-y-3 py-1">
              <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 text-xs">
                <p className="font-bold text-stone-900">{rejectingUser.full_name}</p>
                <p className="text-stone-500 text-[11px]">{rejectingUser.email}</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <Label className="text-xs font-semibold text-stone-700">
                  Motivo da Recusa (Opcional)
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Ex: Dados incompletos / Vaga preenchida / Perfil incompatível..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectingUser(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectUser.isPending}
              className="text-xs font-semibold"
            >
              {rejectUser.isPending ? "Processando..." : "Confirmar Recusa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
