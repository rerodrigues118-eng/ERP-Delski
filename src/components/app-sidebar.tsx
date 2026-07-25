import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Kanban, Users, Settings, LogOut, PlusCircle } from "lucide-react";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "@/mocks/types";

const items = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, gestor: true },
  { title: "Projetos", url: "/app/projects", icon: Kanban, gestor: false },
  { title: "Freelancers", url: "/app/freelancers", icon: Users, gestor: true },
  { title: "Configurações", url: "/app/settings", icon: Settings, gestor: false },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const user = useStore((s) => s.user);
  const setRole = useStore((s) => s.setRole);
  const logout = useStore((s) => s.logout);
  const isGestor = user?.role === "gestor";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground font-bold">D</div>
          <div className="font-semibold group-data-[collapsible=icon]:hidden">Delski</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.filter((i) => isGestor || !i.gestor).map((i) => {
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
