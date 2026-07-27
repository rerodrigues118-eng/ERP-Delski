import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Kanban, Users, Settings, LogOut, PlusCircle,
  DollarSign, Target, AlertTriangle, BookOpen, FileSpreadsheet,
} from "lucide-react";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "@/mocks/types";

const operacao = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, gestor: true },
  { title: "Projetos", url: "/app/projects", icon: Kanban, gestor: false },
  { title: "Riscos", url: "/app/risks", icon: AlertTriangle, gestor: true },
  { title: "Freelancers", url: "/app/freelancers", icon: Users, gestor: true },
];

const negocio = [
  { title: "CRM / Funil", url: "/app/crm", icon: Target, gestor: true },
  { title: "Financeiro", url: "/app/finance", icon: DollarSign, gestor: true },
  { title: "Relatórios", url: "/app/reports", icon: FileSpreadsheet, gestor: true },
];

const conhecimento = [
  { title: "Wiki / SOPs", url: "/app/wiki", icon: BookOpen, gestor: false },
  { title: "Configurações", url: "/app/settings", icon: Settings, gestor: false },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const user = useStore((s) => s.user);
  const setRole = useStore((s) => s.setRole);
  const logout = useStore((s) => s.logout);
  const isGestor = user?.role === "gestor";

  const renderGroup = (label: string, items: typeof operacao) => {
    const visible = items.filter((i) => isGestor || !i.gestor);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((i) => {
              const active = i.url === "/app" ? path === "/app" : path.startsWith(i.url);
              return (
                <SidebarMenuItem key={i.title}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link to={i.url}>
                      <i.icon />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground font-bold">D</div>
          <div className="font-semibold group-data-[collapsible=icon]:hidden">Delski ERP</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Operação", operacao)}
        {renderGroup("Negócio", negocio)}
        {renderGroup("Conhecimento", conhecimento)}

        {isGestor && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2">
                <Button asChild size="sm" className="w-full group-data-[collapsible=icon]:hidden">
                  <Link to="/app/projects/new"><PlusCircle className="h-4 w-4" /> Novo projeto</Link>
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-2 space-y-2 group-data-[collapsible=icon]:hidden">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Modo demo</div>
          <Select value={user?.role || "gestor"} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="freelancer">Freelancer</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border p-2">
            <Avatar className="h-8 w-8"><AvatarFallback>{user?.name?.[0]?.toUpperCase() || "?"}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={logout} title="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
