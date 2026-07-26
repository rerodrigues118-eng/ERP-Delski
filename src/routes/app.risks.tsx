import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_LABEL, STATUS_LABEL } from "@/mocks/types";

export const Route = createFileRoute("/app/risks")({
  head: () => ({
    meta: [
      { title: "Riscos e alertas — Delski" },
      { name: "description", content: "Projetos parados, prazos estourados e gargalos automáticos." },
      { property: "og:title", content: "Riscos e alertas — Delski" },
      { property: "og:description", content: "Aba de riscos automáticos da operação Delski." },
    ],
  }),
  component: RisksPage,
});

function RisksPage() {
  const projects = useStore((s) => s.projects);
  const freelancers = useStore((s) => s.freelancers);

  const analysis = useMemo(() => {
    const now = Date.now();
    const overdue: typeof projects = [];
    const dueSoon: typeof projects = [];
    const stuck: { p: typeof projects[number]; days: number }[] = [];
    const unassigned: typeof projects = [];

    for (const p of projects) {
      if (p.status === "Concluido") continue;
      const deadlineTs = new Date(p.deadline).getTime();
      const daysToDeadline = Math.floor((deadlineTs - now) / 864e5);
      if (daysToDeadline < 0) overdue.push(p);
      else if (daysToDeadline <= 3) dueSoon.push(p);

      const last = p.lastStatusChangeAt ? new Date(p.lastStatusChangeAt).getTime() : new Date(p.createdAt).getTime();
      const stuckDays = Math.floor((now - last) / 864e5);
      if (stuckDays >= 5 && p.status !== "Solicitado") stuck.push({ p, days: stuckDays });

      if (!p.freelancerId && p.status !== "Solicitado") unassigned.push(p);
    }
    return { overdue, dueSoon, stuck, unassigned };
  }, [projects]);

  const totalRisks = analysis.overdue.length + analysis.dueSoon.length + analysis.stuck.length + analysis.unassigned.length;

  const rowLink = (id: string) => (
    <Button asChild variant="ghost" size="sm">
      <Link to="/app/projects/$id" params={{ id }}>Abrir <ArrowRight className="h-3.5 w-3.5" /></Link>
    </Button>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" /> Riscos & Gargalos
        </h1>
        <p className="text-sm text-muted-foreground">Detecção automática de projetos que precisam de atenção agora.</p>
      </div>

      {totalRisks === 0 && (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum risco detectado. Operação saudável.</CardContent></Card>
      )}

      {analysis.overdue.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-destructive"><Calendar className="h-4 w-4" /> Prazo estourado ({analysis.overdue.length})</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {analysis.overdue.map((p) => {
              const days = Math.floor((Date.now() - new Date(p.deadline).getTime()) / 864e5);
              return (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{p.client}</div>
                    <div className="text-xs text-muted-foreground">{SERVICE_LABEL[p.type]} · {STATUS_LABEL[p.status]}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive">{days}d atrasado</Badge>
                    {rowLink(p.id)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {analysis.dueSoon.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-amber-600"><Calendar className="h-4 w-4" /> Prazo próximo ≤ 3 dias ({analysis.dueSoon.length})</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {analysis.dueSoon.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{p.client}</div>
                  <div className="text-xs text-muted-foreground">Entrega em {new Date(p.deadline).toLocaleDateString("pt-BR")} · {STATUS_LABEL[p.status]}</div>
                </div>
                {rowLink(p.id)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis.stuck.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> Parados no mesmo status há 5+ dias ({analysis.stuck.length})</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {analysis.stuck.map(({ p, days }) => {
              const f = freelancers.find((x) => x.id === p.freelancerId);
              return (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{p.client}</div>
                    <div className="text-xs text-muted-foreground">{STATUS_LABEL[p.status]} · {f?.name || "sem freela"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{days}d parado</Badge>
                    {rowLink(p.id)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {analysis.unassigned.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Sem freelancer atribuído ({analysis.unassigned.length})</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {analysis.unassigned.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{p.client}</div>
                  <div className="text-xs text-muted-foreground">{STATUS_LABEL[p.status]}</div>
                </div>
                {rowLink(p.id)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
