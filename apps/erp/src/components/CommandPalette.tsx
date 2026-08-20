import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Building2,
  DollarSign,
  FileText,
  FileSignature,
  Headphones,
  Bell,
  BookOpen,
  Settings,
  Plus,
  Moon,
  Sun,
  ShieldAlert,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useClientsList } from "@/hooks/useClients";
import { useProfiles } from "@/hooks/useProfiles";
import { useTheme } from "@/contexts/ThemeContext";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Queries for dynamic search
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClientsList();
  const { data: profiles = [] } = useProfiles();

  const freelancers = React.useMemo(
    () => profiles.filter((p) => p.role === "freelancer"),
    [profiles]
  );

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Digite um comando, cliente, projeto ou ação..." />
      <CommandList className="max-h-[380px] p-2">
        <CommandEmpty className="py-8 text-center text-xs text-muted-foreground">
          Nenhum resultado encontrado para a sua busca.
        </CommandEmpty>

        {/* 1. Ações Rápidas de Criação */}
        <CommandGroup heading="Ações Rápidas">
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/projects/new" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Plus className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">Novo Projeto</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/clients" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">Cadastrar Novo Cliente</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/freelancers" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">Convidar Freelancer</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/suporte" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Headphones className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">Abrir Chamado de Suporte</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => toggleTheme())}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
            </div>
            <span className="font-semibold text-foreground">
              Alternar para Modo {theme === "dark" ? "Claro" : "Escuro"}
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1.5" />

        {/* 2. Projetos Dinâmicos */}
        {projects.length > 0 && (
          <CommandGroup heading={`Projetos (${projects.length})`}>
            {projects.slice(0, 5).map((project) => (
              <CommandItem
                key={project.id}
                value={`projeto ${project.title} ${project.service_type || ""}`}
                onSelect={() => runCommand(() => navigate({ to: "/app/projects/$id", params: { id: project.id } }))}
                className="flex items-center justify-between px-3 py-2 text-xs rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <FolderKanban className="h-3.5 w-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-foreground block truncate">{project.title}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      {project.service_type || "Projeto"} • {project.status}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-mono shrink-0">
                  Ver ↵
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* 3. Clientes Dinâmicos */}
        {clients.length > 0 && (
          <CommandGroup heading={`Clientes (${clients.length})`}>
            {clients.slice(0, 5).map((client) => (
              <CommandItem
                key={client.id}
                value={`cliente ${client.full_name} ${client.company_name || ""} ${client.email}`}
                onSelect={() => runCommand(() => navigate({ to: "/app/clients/$id", params: { id: client.id } }))}
                className="flex items-center justify-between px-3 py-2 text-xs rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-foreground block truncate">{client.full_name}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      {client.company_name || client.email}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-mono shrink-0">
                  Ficha ↵
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* 4. Freelancers Dinâmicos */}
        {freelancers.length > 0 && (
          <CommandGroup heading={`Freelancers (${freelancers.length})`}>
            {freelancers.slice(0, 5).map((fl) => (
              <CommandItem
                key={fl.id}
                value={`freelancer ${fl.full_name} ${fl.email}`}
                onSelect={() => runCommand(() => navigate({ to: "/app/freelancers/$id", params: { id: fl.id } }))}
                className="flex items-center justify-between px-3 py-2 text-xs rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-foreground block truncate">{fl.full_name || fl.email}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">{fl.email}</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-mono shrink-0">
                  Perfil ↵
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator className="my-1.5" />

        {/* 5. Navegação Direta */}
        <CommandGroup heading="Navegação Direta">
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Dashboard Geral</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/projects" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Projetos & Tarefas</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/clients" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Clientes & CRM</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/freelancers" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Time de Freelancers</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/finance" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Financeiro & NFS-e</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/contract-generator" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <FileSignature className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Gerador de Contratos</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/contract-models" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Modelos de Contrato</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/suporte" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <Headphones className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Central de Suporte</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/notifications" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Notificações</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: "/app/perfil" }))}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Configurações da Empresa & Perfil</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
