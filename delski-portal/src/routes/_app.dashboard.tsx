import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  Activity,
  Layers,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  FileText,
  Bot,
  TrendingUp,
  Globe,
  Share2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClienteFinanceProjects } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";
import { SERVICE_LABEL, STATUS_LABEL, type ServiceType } from "@/mocks/types";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard do Cliente — Delski ERP" },
      {
        name: "description",
        content: "Portal exclusivo para acompanhamento de projetos e métricas da agência Delski.",
      },
    ],
  }),
  component: PortalDashboardPage,
});

const serviceIcon: Record<string, any> = {
  IA: Bot,
  Trafego: TrendingUp,
  Sites: Globe,
  "Social Media": Share2,
};

export function PortalDashboardPage() {
  const { user, profile, loading } = useAuth();
  const { data: clientProjects = [], isLoading } = useClienteFinanceProjects(user?.id, user?.email);

  if (loading || !user) {
    return (
      <div className="space-y-8 pb-12">
        <Skeleton className="h-40 w-full bg-stone-200 rounded-2xl" />
        <div className="grid gap-5 sm:grid-cols-3">
          <Skeleton className="h-28 w-full bg-stone-200 rounded-2xl" />
          <Skeleton className="h-28 w-full bg-stone-200 rounded-2xl" />
          <Skeleton className="h-28 w-full bg-stone-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const activeProjects = clientProjects.filter((p) => p.status !== "Concluido");
  const completedProjects = clientProjects.filter((p) => p.status === "Concluido");
  const progressRate = clientProjects.length
    ? Math.round((completedProjects.length / clientProjects.length) * 100)
    : 0;

  const rawName =
    profile?.full_name &&
    !profile.full_name.includes("@") &&
    profile.full_name !== user?.email?.split("@")[0]
      ? profile.full_name
      : (user?.user_metadata as any)?.full_name ||
        (user?.user_metadata as any)?.name ||
        user?.email?.split("@")[0] ||
        "Cliente";

  const clientName = rawName.split("(")[0].trim();

  return (
    <div className="space-y-8 pb-12">
      <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">
                Portal do Cliente
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Olá, {clientName}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-3xl">
                Acompanhe o desenvolvimento, cronograma e entrega dos seus projetos com
                transparência e controle.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4 text-sm text-foreground">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Status da conta
              </p>
              <p className="mt-2 font-semibold text-foreground">Ativa & Regular</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white border border-stone-200 shadow-sm hover:border-indigo-500/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Projetos Contratados
                </div>
                <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                  {clientProjects.length}
                </div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-stone-200 shadow-sm hover:border-amber-500/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Demandas em Execução
                </div>
                <div className="mt-2 text-3xl font-bold tracking-tight text-amber-600">
                  {activeProjects.length}
                </div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-stone-200 shadow-sm hover:border-emerald-500/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Entregas Finalizadas
                </div>
                <div className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">
                  {completedProjects.length}
                </div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-stone-200 shadow-sm hover:border-indigo-500/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Progresso Global</div>
                <div className="mt-2 text-3xl font-bold tracking-tight text-indigo-600">
                  {progressRate}%
                </div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/15 text-indigo-500">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <Progress value={progressRate} className="h-1.5 mt-3 bg-indigo-200" />
          </CardContent>
        </Card>
      </div>

      {/* Lista de Projetos com Timeline Visual de Status */}
      <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Seus Projetos em Andamento</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Acompanhamento de fase, escopo e prazos de entrega.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="text-xs gap-1">
            <Link to="/contrato">
              Ver Contratos <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6 divide-y divide-border">
          {isLoading && (
            <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <span>Buscando informações atualizadas dos seus projetos...</span>
            </div>
          )}

          {!isLoading &&
            clientProjects.map((p) => {
              const IconComp = serviceIcon[p.service_type] || Layers;
              let formattedDate = "A definir com a equipe";
              if (p.deadline) {
                try {
                  const d = new Date(p.deadline);
                  if (!isNaN(d.getTime())) {
                    formattedDate = d.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    });
                  }
                } catch {
                  // Fallback
                }
              }

              return (
                <div key={p.id} className="py-6 first:pt-0 last:pb-0 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 shadow-sm">
                        <IconComp className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-base font-bold text-foreground flex items-center gap-2">
                          {p.title}
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          >
                            {SERVICE_LABEL[p.service_type] || p.service_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            Previsão de Entrega:{" "}
                            <strong className="text-foreground font-medium">{formattedDate}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge className="bg-indigo-600/20 text-indigo-300 border-indigo-500/30 px-3 py-1 text-xs">
                      {STATUS_LABEL[p.status] || p.status}
                    </Badge>
                  </div>

                  {/* Briefing Resumido */}
                  {p.briefing_content && (
                    <div className="bg-muted/40 p-4 rounded-xl text-xs text-muted-foreground border border-border/50 leading-relaxed">
                      <strong className="text-foreground block mb-1">Escopo & Objetivo:</strong>
                      {p.briefing_content}
                    </div>
                  )}

                  {/* Timeline de Fase Visual */}
                  <div className="pt-2">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Fase Atual da Operação
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { step: 1, label: "Planejamento" },
                        { step: 2, label: "Em Execução" },
                        { step: 3, label: "Revisão / QA" },
                        { step: 4, label: "Entregue" },
                      ].map((st, idx) => {
                        const statusStr = (p.status || "").toString();
                        const isCurrent =
                          (statusStr.includes("Criado") && idx === 0) ||
                          ((statusStr.includes("Andamento") ||
                            statusStr.includes("Triagem") ||
                            statusStr.includes("Producao")) &&
                            idx === 1) ||
                          (statusStr.includes("Revis") && idx === 2) ||
                          (statusStr.includes("Concluid") && idx === 3);

                        const isPast =
                          statusStr.includes("Concluid") ||
                          (statusStr.includes("Revis") && idx <= 1) ||
                          ((statusStr.includes("Andamento") ||
                            statusStr.includes("Triagem") ||
                            statusStr.includes("Producao")) &&
                            idx === 0);

                        return (
                          <div
                            key={st.label}
                            className={`p-2.5 rounded-lg border text-center transition-all ${
                              isCurrent
                                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-bold shadow-sm"
                                : isPast
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                  : "bg-muted/30 border-border/40 text-muted-foreground"
                            }`}
                          >
                            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                              Etapa 0{st.step}
                            </div>
                            <div className="text-xs mt-0.5 truncate">{st.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

          {!isLoading && clientProjects.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground space-y-2">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted mx-auto text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <p className="font-semibold text-foreground text-base">
                Nenhum projeto vinculado no momento.
              </p>
              <p className="text-xs max-w-sm mx-auto">
                Assim que seu Gestor de conta registrar seu projeto no ERP, todas as atualizações e
                cronograma aparecerão aqui automaticamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
