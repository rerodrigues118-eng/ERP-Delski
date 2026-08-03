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
    meta: [{ title: "Projetos — Delski ERP" }],
  }),
  component: ProjectsListPage,
});

export function ProjectsListPage() {
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
      <div className="border-b border-border pb-5">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
          Projetos Atribuídos
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Lista de projetos em que você está alocado(a).
        </p>
      </div>

      {/* Simplified Controls for Freelancer: Keyword search + Service filters ONLY */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Buscar por título, cliente ou palavra-chave..."
            className="pl-9 bg-white border-stone-200 text-sm focus-visible:ring-blue-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["all", "IA", "Trafego", "Sites"].map((service) => (
            <Button
              key={service}
              variant={selectedService === service ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedService(service)}
              className={
                selectedService === service
                  ? "bg-blue-900 text-white hover:bg-blue-950 rounded-md"
                  : "border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md"
              }
            >
              {service === "all"
                ? "Todos"
                : service === "IA"
                  ? "IA"
                  : service === "Trafego"
                    ? "Tráfego"
                    : "Sites"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center border border-dashed rounded-lg text-stone-500 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-900" />
          <p className="font-medium text-sm">Carregando projetos atribuídos...</p>
        </div>
      )}

      {!isLoading && filteredProjects.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-lg text-stone-500 space-y-3 bg-white border-stone-200/80 rounded-xl">
          <Folder className="h-10 w-10 text-stone-400 mx-auto" />
          <p className="font-semibold text-stone-900">Nenhum projeto atribuído no momento</p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Assim que um gestor alocar você oficialmente a um projeto, ele aparecerá nesta lista.
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
    <Card className="group border border-stone-200/80 shadow-subtle rounded-lg transition-all bg-white hover:border-stone-300">
      <CardHeader className="p-4 pb-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* ONLY Service Label Badge. NO STATUS BADGE (Aguardando Candidaturas, etc.) */}
          <Badge
            className={`${SERVICE_BADGE_COLORS[project.service_type] || "bg-stone-550 text-white"} text-[10px] rounded-md px-2 py-0.5 border-none`}
          >
            {SERVICE_LABEL[project.service_type] || project.service_type}
          </Badge>
        </div>
        <CardTitle className="text-sm font-bold text-stone-900 line-clamp-1">
          <Link
            to="/app/projects/$id"
            params={{ id: project.id }}
            className="hover:text-blue-900 transition-colors"
          >
            {project.title}
          </Link>
        </CardTitle>
        <p className="text-[11px] text-stone-500 font-medium truncate">
          {project.client?.full_name || "Cliente não informado"}
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-1 space-y-3">
        <p className="line-clamp-2 text-xs text-stone-600 leading-relaxed">
          {project.briefing_content || "Sem briefing ainda."}
        </p>
        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
          <span>{formattedDate}</span>
          <span className="font-semibold text-stone-850">
            R$ {Number(project.freelancer_cost || project.budget || 0).toLocaleString("pt-BR")}
          </span>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs text-stone-700 border-stone-200 hover:bg-stone-50 rounded-md font-medium"
        >
          <Link to="/app/projects/$id" params={{ id: project.id }}>
            Ver Detalhes
          </Link>
        </Button>
      </CardContent>
    </Card>
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
        className={`flex flex-col space-y-3 rounded-lg border border-stone-200/70 bg-stone-50/50 p-3 transition ${
          isOver ? "ring-2 ring-blue-900/20 bg-blue-50/20" : ""
        }`}
      >
        <div className="flex items-center justify-between px-1 py-1 border-b border-stone-200/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm text-stone-900">{title}</span>
            <span className="text-xs text-stone-400 font-medium">({items.length})</span>
          </div>
        </div>
        <div className="space-y-3 min-h-[150px]">
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-stone-200 bg-white p-4 text-xs text-stone-400 text-center">
              Nenhum projeto
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
      <Card
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform) }}
        className={`group border border-stone-200/80 shadow-subtle rounded-lg transition-all ${
          isDragging
            ? "opacity-70 shadow-md bg-white border-blue-900"
            : "bg-white hover:border-stone-300"
        }`}
        {...attributes}
        {...listeners}
      >
        <CardHeader className="p-4 pb-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge
              className={`${SERVICE_BADGE_COLORS[project.service_type] || "bg-stone-550 text-white"} text-[10px] rounded-md px-2 py-0.5 border-none`}
            >
              {SERVICE_LABEL[project.service_type] || project.service_type}
            </Badge>
          </div>
          <CardTitle className="text-sm font-bold text-stone-900 line-clamp-1">
            <Link
              to="/app/projects/$id"
              params={{ id: project.id }}
              className="hover:text-blue-900 transition-colors"
            >
              {project.title}
            </Link>
          </CardTitle>
          <p className="text-[11px] text-stone-500 font-medium truncate">
            {project.client?.full_name || "Cliente não vinculado"}
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-3">
          <p className="line-clamp-2 text-xs text-stone-600 leading-relaxed">
            {project.briefing_content || "Sem briefing ainda."}
          </p>
          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
            <span>
              {project.deadline
                ? new Date(project.deadline).toLocaleDateString("pt-BR")
                : "Sem prazo"}
            </span>
            <span className="font-semibold text-stone-850">
              R$ {Number(project.budget || 0).toLocaleString("pt-BR")}
            </span>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs text-stone-700 border-stone-200 hover:bg-stone-50 rounded-md font-medium"
          >
            <Link to="/app/projects/$id" params={{ id: project.id }}>
              Ver Detalhes
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
            Gestão de Projetos
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Visão geral dos projetos de IA, Tráfego Pago e Sites.
          </p>
        </div>

        {isGestor && (
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white font-medium rounded-md shadow-md border-none px-4 h-9 transition-all duration-200"
          >
            <Link to="/app/projects/new">
              <PlusCircle className="h-4 w-4 mr-1.5" /> Novo Projeto
            </Link>
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Buscar por título, cliente ou palavra-chave..."
            className="pl-9 bg-white border-stone-200 text-sm focus-visible:ring-blue-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            {["all", "IA", "Trafego", "Sites"].map((service) => (
              <Button
                key={service}
                variant={selectedService === service ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedService(service)}
                className={
                  selectedService === service
                    ? "bg-blue-900 text-white hover:bg-blue-950 rounded-md"
                    : "border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md"
                }
              >
                {service === "all"
                  ? "Todos"
                  : service === "IA"
                    ? "IA"
                    : service === "Trafego"
                      ? "Tráfego"
                      : "Sites"}
              </Button>
            ))}
          </div>

          <div className="flex items-center border border-stone-200 rounded-lg p-0.5 bg-white shadow-sm shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("kanban")}
              className={`h-8 px-3 rounded-md text-xs gap-1.5 cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-stone-100 text-stone-900 font-semibold"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-8 px-3 rounded-md text-xs gap-1.5 cursor-pointer ${
                viewMode === "list"
                  ? "bg-stone-100 text-stone-900 font-semibold"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Lista
            </Button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center border border-dashed rounded-lg text-stone-500 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-900" />
          <p className="font-medium text-sm">Carregando projetos...</p>
        </div>
      )}

      {/* Projects Display */}
      {!isLoading && filteredProjects.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-lg text-stone-500 space-y-3">
          <Folder className="h-10 w-10 text-stone-400 mx-auto" />
          <p className="font-semibold text-stone-900">Nenhum projeto encontrado</p>
          <p className="text-xs">Cadastre um novo projeto ou altere os filtros de busca.</p>
        </div>
      ) : !isLoading && viewMode === "kanban" ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto pb-4">
            <div className="grid auto-cols-[minmax(300px,1fr)] grid-flow-col gap-4 min-w-[1200px]">
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
              <div className="w-80 rounded-lg border border-blue-900 bg-white p-4 shadow-xl">
                <p className="text-sm font-semibold">{projectMap.get(activeId)?.title}</p>
                <p className="text-xs text-stone-500">
                  Arraste para outra coluna para atualizar o status
                </p>
              </div>
            </DragOverlay>
          )}
        </DndContext>
      ) : !isLoading && viewMode === "list" ? (
        <div className="bg-white border border-stone-200/80 rounded-lg shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3">Projeto</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Serviço</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Prazo</th>
                  <th className="text-left px-4 py-3">Orçamento</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-medium">
                      <Link
                        to="/app/projects/$id"
                        params={{ id: project.id }}
                        className="text-blue-900 hover:underline font-bold"
                      >
                        {project.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-stone-600">
                      {project.client?.full_name || "Cliente não vinculado"}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={`${SERVICE_BADGE_COLORS[project.service_type] || "bg-stone-500 text-white"} text-xs rounded-md px-2 py-0.5 border-none`}
                      >
                        {SERVICE_LABEL[project.service_type] || project.service_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={`${STATUS_BADGE_COLORS[project.status] || "bg-stone-500 text-white"} text-xs rounded-md px-2 py-0.5 border-none`}
                      >
                        {STATUS_LABEL[project.status] || project.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">
                      {project.deadline
                        ? new Date(project.deadline).toLocaleDateString("pt-BR")
                        : "Sem prazo"}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-stone-850">
                      R${" "}
                      {Number(project.budget || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-stone-700 border-stone-200 hover:bg-stone-50 rounded-md font-medium"
                      >
                        <Link to="/app/projects/$id" params={{ id: project.id }}>
                          Ver Detalhes
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
