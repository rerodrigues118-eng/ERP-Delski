import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, CheckCircle2, Clock, Users } from "lucide-react";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — Delski" },
      { name: "description", content: "Central de alertas e atividade recente da operação Delski." },
      { property: "og:title", content: "Notificações — Delski" },
      { property: "og:description", content: "Alertas, prazos e feed de atividades da Delski." },
    ],
  }),
  component: NotificationsPage,
});

type Event = {
  id: string;
  at: string;
  kind: "alerta" | "atividade" | "prazo" | "cliente" | "triagem";
  title: string;
  description?: string;
  href?: { to: "/app/projects/$id"; params: { id: string } };
};

function NotificationsPage() {
  const projects = useStore((s) => s.projects);
  const applications = useStore((s) => s.applications);
  const tasks = useStore((s) => s.tasks);

  const events = useMemo<Event[]>(() => {
    const list: Event[] = [];
    const now = Date.now();
    for (const p of projects) {
      // Prazo próximo / vencido
      const days = Math.round((new Date(p.deadline).getTime() - now) / 864e5);
      if (p.status !== "Concluido" && days <= 5) {
        list.push({
          id: `dl-${p.id}`, at: p.deadline,
          kind: days < 0 ? "alerta" : "prazo",
          title: days < 0 ? `${p.client} — prazo vencido há ${-days}d` : `${p.client} — vence em ${days}d`,
          description: `Projeto de ${p.type} · status ${p.status}`,
          href: { to: "/app/projects/$id", params: { id: p.id } },
        });
      }
      // Feedback do cliente
      for (const fb of p.clientFeedback || []) {
        list.push({
          id: `fb-${fb.id}`, at: fb.at, kind: "cliente",
          title: `${p.client} ${fb.decision === "aprovado" ? "aprovou a entrega" : "solicitou ajuste"}`,
          description: fb.message,
          href: { to: "/app/projects/$id", params: { id: p.id } },
        });
      }
      // Histórico recente (top 3)
      p.history.slice(-3).forEach((h) => {
        list.push({
          id: `h-${p.id}-${h.id}`, at: h.at, kind: "atividade",
          title: `${p.client} — ${h.message}`,
          description: `por ${h.actor}`,
          href: { to: "/app/projects/$id", params: { id: p.id } },
        });
      });
    }
    // Triagem respondida
    for (const app of applications) {
      if (app.status !== "Respondida") continue;
      const project = projects.find((x) => x.id === app.projectId);
      list.push({
        id: `app-${app.id}`, at: app.respondedAt || app.invitedAt, kind: "triagem",
        title: `${project?.client || "Projeto"} — freelancer respondeu triagem`,
        description: app.proposedValue ? `Propôs R$ ${app.proposedValue.toLocaleString("pt-BR")}` : undefined,
        href: project ? { to: "/app/projects/$id", params: { id: project.id } } : undefined,
      });
    }
    // Tarefas atrasadas
    for (const t of tasks) {
      if (t.status === "Concluida") continue;
      if (t.baselineDue && new Date(t.dueDate).getTime() > new Date(t.baselineDue).getTime()) {
        const days = Math.round((new Date(t.dueDate).getTime() - new Date(t.baselineDue).getTime()) / 864e5);
        const project = projects.find((x) => x.id === t.projectId);
        list.push({
          id: `task-${t.id}`, at: t.dueDate, kind: "alerta",
          title: `${project?.client || "Projeto"} — "${t.title}" atrasada +${days}d`,
          description: "Baseline superado no cronograma",
          href: project ? { to: "/app/projects/$id", params: { id: project.id } } : undefined,
        });
      }
    }
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [projects, applications, tasks]);

  const counts = {
    alerta: events.filter((e) => e.kind === "alerta").length,
    prazo: events.filter((e) => e.kind === "prazo").length,
    cliente: events.filter((e) => e.kind === "cliente").length,
    triagem: events.filter((e) => e.kind === "triagem").length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">Alertas, prazos e atividade recente em um só lugar.</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MiniStat label="Alertas críticos" value={counts.alerta} icon={AlertTriangle} tone="destructive" />
        <MiniStat label="Prazos próximos" value={counts.prazo} icon={Clock} tone="brand" />
        <MiniStat label="Do cliente" value={counts.cliente} icon={CheckCircle2} tone="emerald" />
        <MiniStat label="Triagens" value={counts.triagem} icon={Users} tone="chart2" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Feed</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação. Está tudo em dia.</p>
          )}
          {events.slice(0, 40).map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Bell; tone: "destructive" | "brand" | "emerald" | "chart2" }) {
  const toneClass = {
    destructive: "bg-destructive/10 text-destructive",
    brand: "bg-brand/10 text-brand",
    emerald: "bg-emerald-500/10 text-emerald-600",
    chart2: "bg-[var(--chart-2)]/10 text-[var(--chart-2)]",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground truncate">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: Event }) {
  const kindBadge = {
    alerta: <Badge variant="destructive">Alerta</Badge>,
    prazo: <Badge className="bg-brand/15 text-brand" variant="outline">Prazo</Badge>,
    cliente: <Badge className="bg-emerald-500/15 text-emerald-700" variant="outline">Cliente</Badge>,
    triagem: <Badge variant="secondary">Triagem</Badge>,
    atividade: <Badge variant="outline">Atividade</Badge>,
  }[event.kind];

  const inner = (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{event.title}</div>
        {event.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{event.description}</div>}
        <div className="text-[11px] text-muted-foreground mt-1">{new Date(event.at).toLocaleString("pt-BR")}</div>
      </div>
      <div className="shrink-0">{kindBadge}</div>
    </div>
  );

  return event.href ? (
    <Link to={event.href.to} params={event.href.params} className="block -mx-2 px-2 rounded-md hover:bg-accent/40 transition-colors">{inner}</Link>
  ) : (
    <div className="-mx-2 px-2">{inner}</div>
  );
}
