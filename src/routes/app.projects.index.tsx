import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, STATUS_LABEL, SERVICE_LABEL, type ProjectStatus } from "@/mocks/types";
import { Kanban, List, Plus, Search } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { Project } from "@/mocks/types";

export const Route = createFileRoute("/app/projects/")({
  head: () => ({
    meta: [
      { title: "Projetos — Delski" },
      { name: "description", content: "Gerencie projetos de IA, tráfego e sites em modo Kanban ou lista." },
      { property: "og:title", content: "Projetos — Delski" },
      { property: "og:description", content: "Kanban e lista de projetos da agência Delski." },
    ],
  }),
  component: Projects,
});

function Projects() {
  const projects = useStore((s) => s.projects);
  const freelancers = useStore((s) => s.freelancers);
  const user = useStore((s) => s.user);
  const updateStatus = useStore((s) => s.updateProjectStatus);

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [flt, setFlt] = useState<string>("all");

  const visible = useMemo(() => {
    let arr = user?.role === "freelancer" ? projects.filter((p) => p.freelancerId === user.freelancerId) : projects;
    if (q) arr = arr.filter((p) => (p.client + p.description).toLowerCase().includes(q.toLowerCase()));
    if (type !== "all") arr = arr.filter((p) => p.type === type);
    if (flt !== "all") arr = arr.filter((p) => p.freelancerId === flt);
    return arr;
  }, [projects, user, q, type, flt]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const status = e.over.id as ProjectStatus;
    const id = String(e.active.id);
    const p = projects.find((x) => x.id === id);
    if (p && p.status !== status) updateStatus(id, status);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">{visible.length} projeto(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <Button size="sm" variant={view === "kanban" ? "default" : "ghost"} onClick={() => setView("kanban")}><Kanban className="h-4 w-4" /> Kanban</Button>
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}><List className="h-4 w-4" /> Lista</Button>
          </div>
          {user?.role === "gestor" && (
            <Button asChild><Link to="/app/projects/new"><Plus className="h-4 w-4" /> Novo</Link></Button>
          )}
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente ou descrição..." className="pl-9" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="IA">Automação com IA</SelectItem>
              <SelectItem value="Trafego">Tráfego / Social</SelectItem>
              <SelectItem value="Sites">Desenvolvimento de Sites</SelectItem>
            </SelectContent>
          </Select>
          {user?.role === "gestor" && (
            <Select value={flt} onValueChange={setFlt}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Freelancer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos freelancers</SelectItem>
                {freelancers.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>

      {view === "kanban" ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {STATUSES.map((s) => (
              <KanbanColumn key={s} status={s} projects={visible.filter((p) => p.status === s)} />
            ))}
          </div>
        </DndContext>
      ) : (
        <ListView projects={visible} />
      )}
    </div>
  );
}

function KanbanColumn({ status, projects }: { status: ProjectStatus; projects: Project[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`rounded-xl border border-border bg-muted/40 p-2 min-h-[400px] transition-colors ${isOver ? "bg-accent/60 border-brand" : ""}`}>
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="text-xs font-semibold uppercase tracking-wide">{STATUS_LABEL[status]}</div>
        <Badge variant="secondary" className="h-5">{projects.length}</Badge>
      </div>
      <div className="space-y-2 mt-1">
        {projects.map((p) => <KanbanCard key={p.id} project={p} />)}
      </div>
    </div>
  );
}

function KanbanCard({ project }: { project: Project }) {
  const freelancers = useStore((s) => s.freelancers);
  const f = freelancers.find((x) => x.id === project.freelancerId);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const navigate = useNavigate();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => navigate({ to: "/app/projects/$id", params: { id: project.id } })}
      className={`rounded-lg border border-border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-brand/60 transition ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-sm truncate">{project.client}</div>
        <Badge variant="outline" className="text-[10px]">{project.type}</Badge>
      </div>
      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</div>
      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
        <span>{new Date(project.deadline).toLocaleDateString("pt-BR")}</span>
        <span className="truncate max-w-[100px]">{f ? f.name : "Sem freelancer"}</span>
      </div>
    </div>
  );
}

function ListView({ projects }: { projects: Project[] }) {
  const freelancers = useStore((s) => s.freelancers);
  const updateStatus = useStore((s) => s.updateProjectStatus);
  const navigate = useNavigate();

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Freelancer</th>
              <th className="text-left px-4 py-3">Prazo</th>
              <th className="text-left px-4 py-3">Orçamento</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {projects.map((p) => {
              const f = freelancers.find((x) => x.id === p.freelancerId);
              return (
                <tr key={p.id} className="hover:bg-accent/40 cursor-pointer" onClick={() => navigate({ to: "/app/projects/$id", params: { id: p.id } })}>
                  <td className="px-4 py-3 font-medium">{p.client}</td>
                  <td className="px-4 py-3">{SERVICE_LABEL[p.type]}</td>
                  <td className="px-4 py-3">{f?.name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">{new Date(p.deadline).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">R$ {p.budget.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v as ProjectStatus)}>
                      <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum projeto encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
