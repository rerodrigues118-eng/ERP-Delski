import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Layers, Calendar, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClienteFinanceProjects } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";
import { SERVICE_LABEL, STATUS_LABEL } from "@/mocks/types";

export const Route = createFileRoute("/portal/projetos")({
  head: () => ({
    meta: [
      { title: "Meus Projetos — Portal do Cliente" },
      { name: "description", content: "Acompanhe os projetos contratados pela sua empresa." },
    ],
  }),
  component: PortalProjetosPage,
});

export function PortalProjetosPage() {
  const { user, loading } = useAuth();
  const { data: clientProjects = [], isLoading } = useClienteFinanceProjects(user?.id, user?.email);

  if (loading || !user) {
    return (
      <div className="space-y-8 pb-12">
        <Skeleton className="h-36 w-full bg-stone-200 rounded-2xl" />
        <Skeleton className="h-48 w-full bg-stone-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">
                Meus projetos
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Projetos vinculados à sua conta
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-3xl">
                Visualize todos os projetos contratados, o status atual e o prazo de entrega
                utilizando o portal.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to="/portal/documentos">Ver Contratos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Carregando seus projetos...
          </CardContent>
        </Card>
      ) : clientProjects.length === 0 ? (
        <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
          <CardContent className="p-6 text-center text-sm text-muted-foreground space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">Nenhum projeto vinculado ainda.</p>
            <p className="text-xs max-w-sm mx-auto">
              Assim que um gestor registrar seu projeto em seu contrato, ele aparecerá
              automaticamente aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clientProjects.map((project) => {
            let formattedDate = "A definir com a equipe";
            if (project.deadline) {
              try {
                const d = new Date(project.deadline);
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
              <Card
                key={project.id}
                className="bg-white border border-stone-200 shadow-sm rounded-2xl"
              >
                <CardHeader className="border-b border-stone-200 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-semibold text-foreground">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {SERVICE_LABEL[project.service_type] || project.service_type}
                      </CardDescription>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                      {STATUS_LABEL[project.status] || project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Prazo
                      </p>
                      <p className="mt-2 text-sm text-foreground font-medium">{formattedDate}</p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Cliente
                      </p>
                      <p className="mt-2 text-sm text-foreground font-medium">
                        {project.client?.full_name || "Empresa não informada"}
                      </p>
                    </div>
                  </div>
                  {project.briefing_content && (
                    <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-2">Escopo resumido</p>
                      <p>{project.briefing_content}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="text-xs">
                      <Link to="/portal/documentos">Ver documentos</Link>
                    </Button>
                    <Button asChild size="sm" className="text-xs">
                      <Link to="/portal/financeiro">Ver financeiro</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
