import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Search, Calendar, Folder, ArrowUpRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { SERVICE_LABEL, STATUS_LABEL } from "@/mocks/types";

export const Route = createFileRoute("/app/projects/")({
  head: () => ({
    meta: [
      { title: "Projetos — Delski ERP" },
    ],
  }),
  component: ProjectsListPage,
});

function ProjectsListPage() {
  const { isGestor, isCliente, isFreelancer } = useAuth();
  const { data: projects = [], isLoading } = useProjects();

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isCliente ? "Meus Projetos Contratados" : isFreelancer ? "Projetos Atribuídos" : "Gestão de Projetos"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isCliente
              ? "Acompanhe a evolução das entregas e marcos da sua agência."
              : isFreelancer
              ? "Lista de projetos em que você está alocado(a)."
              : "Visão geral dos projetos de IA, Tráfego Pago e Sites."}
          </p>
        </div>

        {isGestor && (
          <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link to="/app/projects/new">
              <PlusCircle className="h-4 w-4 mr-2" /> Novo Projeto
            </Link>
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, cliente ou palavra-chave..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["all", "IA", "Trafego", "Sites"].map((service) => (
            <Button
              key={service}
              variant={selectedService === service ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedService(service)}
              className={selectedService === service ? "bg-indigo-600 text-white" : ""}
            >
              {service === "all" ? "Todos" : service === "IA" ? "IA" : service === "Trafego" ? "Tráfego" : "Sites"}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center border border-dashed rounded-2xl text-muted-foreground space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
          <p className="font-medium">Carregando projetos diretamente do Supabase...</p>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && filteredProjects.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-2xl text-muted-foreground space-y-3">
          <Folder className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-semibold text-foreground">Nenhum projeto encontrado</p>
          <p className="text-xs">Cadastre um novo projeto ou altere os filtros de busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="bg-card hover:border-indigo-500/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    {SERVICE_LABEL[project.service_type] || project.service_type}
                  </Badge>
                  <Badge className="bg-zinc-800 text-zinc-300 text-xs">
                    {STATUS_LABEL[project.status] || project.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold">{project.title}</CardTitle>
                {project.client?.full_name && (
                  <p className="text-xs text-muted-foreground font-medium">Cliente: {project.client.full_name}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.briefing_content || "Sem briefing preenchido ainda."}
                </p>

                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Prazo: {project.deadline ? new Date(project.deadline).toLocaleDateString("pt-BR") : "N/A"}
                    </span>
                    {isGestor && (
                      <span className="font-semibold text-emerald-400">
                        R$ {Number(project.budget || 0).toLocaleString("pt-BR")}
                      </span>
                    )}
                    {isFreelancer && (
                      <span className="font-semibold text-indigo-400" title="Sua remuneração alocada">
                        Repasse: R$ {Number(project.freelancer_cost || 0).toLocaleString("pt-BR")}
                      </span>
                    )}
                    {isCliente && (
                      <span className="font-semibold text-emerald-400" title="Valor do seu contrato">
                        Contrato: R$ {Number(project.budget || 0).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>

                  <Button asChild className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100">
                    <Link to="/app/projects/$id" params={{ id: project.id }}>
                      Ver Detalhes & Briefing <ArrowUpRight className="h-4 w-4 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
