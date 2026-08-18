import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Search, Folder, Loader2, LayoutGrid, List } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/useAuth";
import {
  useProjects,
  useFreelancerFinanceProjects,
  useUpdateProject,
  type ProjectStatus,
  type Project,
} from "@/hooks/useProjects";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  STATUSES,
  SERVICE_BADGE_COLORS,
  STATUS_BADGE_COLORS,
} from "@/mocks/types";

export const Route = createFileRoute("/app/projects/")({
  head: () => ({
    meta: [{ title: "Projetos — DELSKI CLOUD" }],
  }),
  component: ProjectsListPage,
});

function ProjectsListPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-12 text-center border border-dashed rounded-lg text-stone-500 space-y-3 max-w-7xl mx-auto my-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-900" />
        <p className="font-medium text-sm">Carregando permissões de acesso...</p>
      </div>
    );
  }

  // Strict role check: only render the Freelancer view when profile.role === 'freelancer'
  if (profile?.role === "freelancer") {
    return <FreelancerProjectsView />;
  }

  return <GestorProjectsView />;
}

// ── FREELANCER EXCLUSIVE VIEW (RBAC ISOLATED) ────────────────────────────────
function FreelancerProjectsView() {
  const { user } = useAuth();
  const { data: projects = [], isLoading } = useFreelancerFinanceProjects(user?.id, user?.email);

  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState<string>("all");

  const filteredProjects = projects.filter((p) => {
    if (selectedService !== "all" && p.service_type !== selectedService) {
      return false;
    }
    if (
      search &&
      !p.title.toLowerCase().includes(search.toLowerCase()) &&
      !(p.briefing_content || "").toLowerCase().includes(search.toLowerCase()) &&
      !(p.client?.full_name || "").toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="section-label mb-1">Área do Freelancer</p>
          <h1 className="page-title">Projetos Atribuídos</h1>
          <p className="text-sm text-muted-foreground mt-1">Projetos em que você está alocado(a).</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card rounded-2xl border border-border p-3 shadow-subtle">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, cliente..."
            className="pl-9 bg-muted/50 border-border text-sm rounded-xl h-9 focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "IA", "Trafego", "Sites"].map((service) => (
            <button
              key={service}
              onClick={() => setSelectedService(service)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedService === service
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {service === "all" ? "Todos" : service === "IA" ? "IA" : service === "Trafego" ? "Tráfego" : "Sites"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Carregando projetos...</p>
        </div>
      )}

      {!isLoading && filteredProjects.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <Folder className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">Nenhum projeto atribuído no momento</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Assim que um gestor alocar você a um projeto, ele aparecerá nesta lista.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <FreelancerProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function FreelancerProjectCard({ project }: { project: Project }) {
  let formattedDate = "Sem prazo";
  if (project.deadline) {
    try {
      const d = new Date(project.deadline);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("pt-BR");
      }
    } catch (err) {
      console.warn("Invalid project deadline date:", err);
    }
  }

  return (
    <div className="group bg-card rounded-2xl border border-border p-5 shadow-subtle hover:shadow-lg hover:border-purple-500/30 transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
          SERVICE_BADGE_COLORS[project.service_type] || "bg-muted text-muted-foreground border-border"
        }`}>
          {SERVICE_LABEL[project.service_type] || project.service_type}
        </span>
      </div>
      <Link
        to="/app/projects/$id"
        params={{ id: project.id }}
        className="block text-[14px] font-bold text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors line-clamp-1 mb-1"
      >
        {project.title}
      </Link>
      <p className="text-[12px] text-muted-foreground font-medium truncate mb-3">
        {project.client?.full_name || "—"}
      </p>
      <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed mb-4">
        {project.briefing_content || "Sem briefing ainda."}
      </p>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-[11px] text-muted-foreground">{formattedDate}</span>
        <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
          R$ {Number(project.freelancer_cost || project.budget || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
        </span>
      </div>
      <Link
        to="/app/projects/$id"
        params={{ id: project.id }}
        className="mt-3 flex items-center justify-center w-full py-2 rounded-xl bg-muted/60 hover:bg-accent text-xs font-semibold text-foreground transition-colors border border-border"
      >
        Ver Detalhes →
      </Link>
    </div>
  );
}

// ── GESTOR FULL MANAGEMENT VIEW (KANBAN & LIST) ──────────────────────────────
function GestorProjectsView() {
  const { isGestor } = useAuth();
  const { data: projects = [], isLoading } = useProjects();
  const updateProject = useUpdateProject();

  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  const filteredProjects = projects.filter((p) => {
    if (selectedService !== "all" && p.service_type !== selectedService) {
      return false;
    }
    if (
      search &&
      !p.title.toLowerCase().includes(search.toLowerCase()) &&
      !(p.briefing_content || "").toLowerCase().includes(search.toLowerCase()) &&
      !(p.client?.full_name || "").toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const statuses = STATUSES;

  const projectStatusById = useMemo(
    () =>
      Object.fromEntries(filteredProjects.map((project) => [project.id, project.status] as const)),
    [filteredProjects],
  );

  const projectMap = useMemo(
    () => new Map(filteredProjects.map((project) => [project.id, project])),
    [filteredProjects],
  );

  const groupedProjects = useMemo(
    () =>
      statuses.reduce(
        (acc, status) => {
          acc[status] = filteredProjects.filter((project) => project.status === status);
          return acc;
        },
        {} as Record<ProjectStatus, typeof filteredProjects>,
      ),
    [filteredProjects, statuses],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const projectId = String(event.active.id);
      const overId = event.over?.id ? String(event.over.id) : undefined;
      if (!overId) return;
      const project = projectMap.get(projectId);
      if (!project) return;
      const targetStatus = statuses.includes(overId as ProjectStatus)
        ? (overId as ProjectStatus)
        : (projectStatusById[overId] as ProjectStatus | undefined);
      if (!targetStatus || targetStatus === project.status) return;
      updateProject.mutate({ id: projectId, patch: { status: targetStatus } });
    },
    [projectMap, projectStatusById, statuses, updateProject],
  );

  const Column = ({
    status,
    title,
    items,
  }: {
    status: ProjectStatus;
    title: string;
    items: typeof filteredProjects;
  }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-3 rounded-2xl bg-muted/40 dark:bg-zinc-900/40 border border-border dark:border-zinc-800/80 p-4 w-[320px] min-w-[320px] shrink-0 transition-all ${
          isOver ? "ring-2 ring-primary/40 bg-accent/40" : ""
        }`}
      >
        {/* Column header */}
        <div className="flex items-center justify-between px-1 pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">{title}</span>
            <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary/15 text-[11px] font-bold text-primary">
              {items.length}
            </span>
          </div>
        </div>
        {/* Cards container */}
        <div className="flex flex-col gap-3.5 min-h-[140px]">
          {items.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border/60 bg-card/40 p-6 text-xs text-muted-foreground text-center font-medium">
              Arraste um projeto para esta coluna
            </div>
          ) : (
            items.map((project) => <ProjectCard key={project.id} project={project} />)
          )}
        </div>
      </div>
    );
  };

  const ProjectCard = ({ project }: { project: (typeof filteredProjects)[number] }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: project.id,
    });
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform) }}
        className={`group bg-card rounded-2xl border border-border p-5 transition-all cursor-grab active:cursor-grabbing ${
          isDragging
            ? "opacity-60 shadow-2xl border-primary scale-105"
            : "shadow-subtle hover:shadow-md hover:border-purple-500/30"
        }`}
        {...attributes}
        {...listeners}
      >
        {/* Badge row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
            SERVICE_BADGE_COLORS[project.service_type] || "bg-muted text-muted-foreground border-border"
          }`}>
            {SERVICE_LABEL[project.service_type] || project.service_type}
          </span>
        </div>
        {/* Title */}
        <Link
          to="/app/projects/$id"
          params={{ id: project.id }}
          className="block text-sm sm:text-base font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug mb-1.5"
        >
          {project.title}
        </Link>
        {/* Client */}
        <p className="text-xs text-muted-foreground font-medium truncate mb-4">
          Cliente: <span className="text-foreground font-semibold">{project.client?.full_name || "—"}</span>
        </p>
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-[11px] font-medium text-muted-foreground">
            Prazo: {project.deadline ? new Date(project.deadline).toLocaleDateString("pt-BR") : "Sem prazo"}
          </span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            {project.budget ? `R$ ${Number(project.budget).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : "R$ 0"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="section-label mb-1">Gestão de Projetos</p>
          <h1 className="page-title">Projetos</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral dos projetos de IA, Tráfego e Sites.</p>
        </div>
        {isGestor && (
          <Button
            asChild
            className="btn-gradient text-white rounded-xl shadow-xs gap-1.5 border-0 hover:opacity-95"
          >
            <Link to="/app/projects/new">
              <PlusCircle className="h-4 w-4" /> Novo Projeto
            </Link>
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card rounded-2xl border border-border p-3 shadow-subtle">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, cliente ou palavra-chave..."
            className="pl-9 bg-muted/50 border-border text-sm focus-visible:ring-primary rounded-xl h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "IA", "Trafego", "Sites"].map((service) => (
            <button
              key={service}
              onClick={() => setSelectedService(service)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedService === service
                  ? "btn-gradient text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {service === "all" ? "Todos" : service === "IA" ? "IA" : service === "Trafego" ? "Tráfego" : "Sites"}
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "kanban" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "list" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Lista
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-medium">Carregando projetos...</p>
        </div>
      )}

      {/* Projects Display */}
      {!isLoading && filteredProjects.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <Folder className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">Nenhum projeto encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Cadastre um novo projeto ou altere os filtros.</p>
        </div>
      ) : !isLoading && viewMode === "kanban" ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto pb-6 scrollbar-thin">
            <div className="flex gap-4 min-w-max pb-2">
              {statuses.map((status) => (
                <Column
                  key={status}
                  status={status}
                  title={STATUS_LABEL[status] || status}
                  items={groupedProjects[status] ?? []}
                />
              ))}
            </div>
          </div>
          {activeId && projectMap.has(activeId) && (
            <DragOverlay>
              <div className="w-80 rounded-2xl border border-primary bg-card p-4 shadow-xl">
                <p className="text-sm font-semibold text-foreground">{projectMap.get(activeId)?.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Arraste para outra coluna para atualizar o status
                </p>
              </div>
            </DragOverlay>
          )}
        </DndContext>
      ) : !isLoading && viewMode === "list" ? (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-subtle">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Status</th>
                <th>Prazo</th>
                <th className="text-right">Orçamento</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-accent/40 transition-colors">
                  <td>
                    <Link
                      to="/app/projects/$id"
                      params={{ id: project.id }}
                      className="font-semibold text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      {project.title}
                    </Link>
                  </td>
                  <td className="text-muted-foreground">{project.client?.full_name || "—"}</td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      SERVICE_BADGE_COLORS[project.service_type] || "bg-muted text-muted-foreground border-border"
                    }`}>
                      {SERVICE_LABEL[project.service_type] || project.service_type}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      project.status === "Concluido" ? "badge-green" :
                      project.status === "Pausado" ? "badge-amber" :
                      project.status === "Cancelado" ? "badge-red" : "badge-blue"
                    }`}>
                      {STATUS_LABEL[project.status] || project.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground text-xs">{project.deadline ? new Date(project.deadline).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="text-right font-semibold text-foreground">
                    {project.budget ? `R$ ${Number(project.budget).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : "—"}
                  </td>
                  <td className="text-right">
                    <Link
                      to="/app/projects/$id"
                      params={{ id: project.id }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline transition-colors"
                    >
                      Detalhes →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

