import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Kanban, Users, Settings, LogOut, PlusCircle,
  DollarSign, Target, AlertTriangle, BookOpen, FileSpreadsheet,
  Bell, FileSignature, Shield, User, UserCheck
} from "lucide-react";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "@/mocks/types";

import { useAuth } from "@/hooks/useAuth";

const operacao = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, gestor: false, freelancer: true, cliente: true },
  { title: "Projetos", url: "/app/projects", icon: Kanban, gestor: false, freelancer: true, cliente: true },
  { title: "Notificações", url: "/app/notifications", icon: Bell, gestor: true, freelancer: true, cliente: false },
  { title: "Riscos", url: "/app/risks", icon: AlertTriangle, gestor: true, freelancer: false, cliente: false },
  { title: "Freelancers", url: "/app/freelancers", icon: Users, gestor: true, freelancer: false, cliente: false },
];

const negocio = [
  { title: "CRM / Funil", url: "/app/crm", icon: Target, gestor: true, freelancer: false, cliente: false },
  { title: "Propostas", url: "/app/proposals", icon: FileSignature, gestor: true, freelancer: false, cliente: false },
  { title: "Financeiro", url: "/app/finance", icon: DollarSign, gestor: true, freelancer: false, cliente: false },
  { title: "Relatórios & CSV", url: "/app/reports", icon: FileSpreadsheet, gestor: true, freelancer: false, cliente: false },
];

const conhecimento = [
  { title: "Wiki / SOPs", url: "/app/wiki", icon: BookOpen, gestor: false, freelancer: true, cliente: false },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, profile, role, logout, isGestor } = useAuth();
  
  const currentRole = role || "gestor";

  const renderGroup = (label: string, items: typeof operacao) => {
    const visible = items.filter((i) => {
      if (isGestor) return true;
      if (currentRole === "freelancer") return i.freelancer;
      if (currentRole === "cliente") return i.cliente;
      return false;
    });

    if (visible.length === 0) return null;

    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((i) => {
              const active = i.url === "/app" ? path === "/app" : path.startsWith(i.url);
              return (
                <SidebarMenuItem key={i.title}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link to={i.url}>
                      <i.icon className="h-4 w-4" />
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
        <div className="flex items-center gap-2.5 px-3 py-3 border-b border-sidebar-border">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 font-bold text-white shadow-md">
            D
          </div>
          <div className="font-bold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
            DELSKI ERP
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Operação", operacao)}
        {renderGroup("Negócio", negocio)}
        {renderGroup("Conhecimento", conhecimento)}

        {isGestor && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2 pt-2">
                <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white group-data-[collapsible=icon]:hidden">
                  <Link to="/app/projects/new"><PlusCircle className="h-4 w-4 mr-1.5" /> Novo Projeto</Link>
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-3 space-y-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 rounded-xl border border-sidebar-border bg-card p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-indigo-600/20 text-indigo-400 font-bold">
                {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "D"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-foreground">{profile?.full_name || user?.email}</div>
              <div className="truncate text-[10px] text-muted-foreground uppercase tracking-wider">{currentRole}</div>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={logout} title="Sair">
              <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
