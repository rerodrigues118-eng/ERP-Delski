import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Kanban,
  Users,
  LogOut,
  DollarSign,
  BookOpen,
  FilePlus,
  Bell,
  FileSignature,
  ShieldCheck,
  Building2,
  LifeBuoy,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_COMPANY_SETTINGS } from "@/hooks/useContractFieldResolver";
import { useCompanySettings, useUpsertCompanySettings } from "@/hooks/useCompanySettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* ── Navigation config ─────────────────────────────────── */
const NAV_OPERACAO = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, gestor: true, freelancer: true, cliente: false },
  { title: "Projetos", url: "/app/projects", icon: Kanban, gestor: true, freelancer: true, cliente: true },
  { title: "Suporte", url: "/app/suporte", icon: LifeBuoy, gestor: true, freelancer: false, cliente: false },
  { title: "Notificações", url: "/app/notifications", icon: Bell, gestor: true, freelancer: true, cliente: false },
  { title: "Documentos", url: "/app/documents", icon: ShieldCheck, gestor: false, freelancer: true, cliente: false },
];

const NAV_EQUIPE = [
  { title: "Freelancers", url: "/app/freelancers", icon: Users, gestor: true, freelancer: false, cliente: false },
  { title: "Clientes", url: "/app/clients", icon: Building2, gestor: true, freelancer: false, cliente: false },
];

const NAV_NEGOCIO = [
  { title: "Financeiro", url: "/app/finance", icon: DollarSign, gestor: true, freelancer: true, cliente: true },
  { title: "Gerador de Contratos", url: "/app/contract-generator", icon: FileSignature, gestor: true, freelancer: false, cliente: false },
  { title: "Modelos de Contrato", url: "/app/contract-models", icon: FilePlus, gestor: true, freelancer: false, cliente: false },
];

const NAV_SISTEMA = [
  { title: "Wiki & SOPs", url: "/app/wiki", icon: BookOpen, gestor: true, freelancer: true, cliente: false },
  { title: "Configurações", url: "/app/perfil", icon: Settings, gestor: true, freelancer: false, cliente: false },
];

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  gestor: boolean;
  freelancer: boolean;
  cliente: boolean;
};

/* ── NavItem component ─────────────────────────────────── */
function NavLink({ item, isActive, isCollapsed }: { item: NavItem; isActive: boolean; isCollapsed: boolean }) {
  return (
    <Link
      to={item.url}
      title={isCollapsed ? item.title : undefined}
      className={[
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium select-none",
        isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "",
        isActive
          ? isCollapsed
            ? "bg-blue-50 text-blue-700 font-semibold ring-2 ring-blue-600/30"
            : "bg-blue-50 text-blue-700 font-semibold border-l-[3px] border-blue-600 rounded-l-none pl-[calc(0.75rem-3px)]"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
      ].join(" ")}
    >
      <item.icon
        className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`}
        strokeWidth={isActive ? 2 : 1.75}
      />
      {!isCollapsed && <span className="truncate">{item.title}</span>}
    </Link>
  );
}

/* ── NavGroup component ────────────────────────────────── */
function NavGroup({
  label,
  items,
  path,
  roleFilter,
  isCollapsed,
}: {
  label: string;
  items: NavItem[];
  path: string;
  roleFilter: (item: NavItem) => boolean;
  isCollapsed: boolean;
}) {
  const visible = items.filter(roleFilter);
  if (visible.length === 0) return null;

  return (
    <div className="mb-4">
      {!isCollapsed ? (
        <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 select-none">
          {label}
        </p>
      ) : (
        <div className="my-2 border-t border-gray-100 mx-2" />
      )}
      <div className="space-y-0.5">
        {visible.map((item) => {
          const isActive = item.url === "/app" ? path === "/app" : path.startsWith(item.url);
          return <NavLink key={item.url} item={item} isActive={isActive} isCollapsed={isCollapsed} />;
        })}
      </div>
    </div>
  );
}

/* ── AppSidebar ────────────────────────────────────────── */
export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, profile, role, logout, isGestor } = useAuth();
  const { data: companySettings = DEFAULT_COMPANY_SETTINGS } = useCompanySettings();
  const upsertCompanySettings = useUpsertCompanySettings();
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState(companySettings);

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("delski_sidebar_collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    setCompanyForm(companySettings);
  }, [companySettings]);

  useEffect(() => {
    // Update CSS variable --sidebar-width on document element
    const width = isCollapsed ? "68px" : "220px";
    document.documentElement.style.setProperty("--sidebar-width", width);
    if (typeof window !== "undefined") {
      localStorage.setItem("delski_sidebar_collapsed", String(isCollapsed));
    }
  }, [isCollapsed]);

  const currentRole = role || "gestor";

  const roleFilter = (item: NavItem) => {
    if (isGestor) return item.gestor !== false;
    if (currentRole === "freelancer") return item.freelancer;
    if (currentRole === "cliente") return item.cliente;
    return false;
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Gestor Delski";
  const displayRole =
    role === "gestor" ? "Gestor" : role === "freelancer" ? "Freelancer" : "Cliente";
  const avatarUrl =
    (profile as any)?.avatar_url ||
    (user?.user_metadata as any)?.avatar_url ||
    (typeof window !== "undefined" && user?.id
      ? (() => {
          try {
            return (
              localStorage.getItem(`delski_avatar_${user.id}`) ||
              JSON.parse(localStorage.getItem(`delski_profile_${user.id}`) || "{}").avatar_url ||
              ""
            );
          } catch (e) {
            return "";
          }
        })()
      : "");

  return (
    <>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-100"
        style={{ width: "var(--sidebar-width, 220px)" }}
      >
        {/* Logo & Toggle Header */}
        <div
          className={`flex items-center h-14 border-b border-gray-100 flex-shrink-0 ${
            isCollapsed ? "justify-center px-0" : "justify-between px-3"
          }`}
        >
          {/* Logo */}
          <div
            className={`flex items-center gap-2.5 ${
              isCollapsed ? "" : "overflow-hidden pl-1"
            }`}
          >
            <div className="flex items-center justify-center w-9 h-9 flex-shrink-0">
              <img src="/logo.png" alt="Delski Logo" className="h-9 w-9 object-contain" />
            </div>
            {!isCollapsed && (
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-[15px] font-bold text-gray-900 tracking-tight">Delski</span>
                <span className="text-[10px] font-bold text-gray-900 tracking-wider">
                  ERP
                </span>
              </div>
            )}
          </div>

          {/* Toggle button — only visible when expanded */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="flex items-center justify-center h-7 w-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              title="Minimizar menu lateral"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button — centered below logo when collapsed */}
        {isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex items-center justify-center mx-auto mt-2 h-7 w-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            title="Expandir menu lateral"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pt-4 pb-2 space-y-0 scrollbar-none">
          <NavGroup label="Operação" items={NAV_OPERACAO} path={path} roleFilter={roleFilter} isCollapsed={isCollapsed} />
          {isGestor && (
            <NavGroup label="Equipe" items={NAV_EQUIPE} path={path} roleFilter={roleFilter} isCollapsed={isCollapsed} />
          )}
          <NavGroup label="Negócio" items={NAV_NEGOCIO} path={path} roleFilter={roleFilter} isCollapsed={isCollapsed} />
          <NavGroup label="Sistema" items={NAV_SISTEMA} path={path} roleFilter={roleFilter} isCollapsed={isCollapsed} />
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-2.5 w-full p-2 rounded-xl hover:bg-gray-50 group ${
                  isCollapsed ? "justify-center" : ""
                }`}
                title={isCollapsed ? displayName : undefined}
              >
                <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-indigo-100">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />}
                  <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-[12px] font-semibold text-gray-800 truncate w-full text-left">
                        {displayName}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        {displayRole}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isCollapsed ? "start" : "end"}
              side="top"
              className="w-56 mb-1 shadow-lg border-gray-100"
            >
              <div className="px-3 py-2 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-800 truncate">{displayName}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
              </div>
              {isGestor && (
                <DropdownMenuItem asChild>
                  <Link to="/app/perfil" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-3.5 w-3.5 text-gray-500" />
                    Configurações do Gestor
                  </Link>
                </DropdownMenuItem>
              )}
              {isGestor && (
                <DropdownMenuItem onSelect={() => setCompanyDialogOpen(true)}>
                  <Building2 className="mr-2 h-3.5 w-3.5 text-gray-500" />
                  Dados da Empresa
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={logout}
                className="text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Company Settings Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dados da Empresa</DialogTitle>
            <DialogDescription>
              Configure os dados usados nos contratos e no texto de contrato da Delski.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="razao_social">Razão Social</Label>
              <Input
                id="razao_social"
                value={companyForm.razao_social || ""}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, razao_social: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={companyForm.cnpj || ""}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, cnpj: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_representante">Nome do Representante</Label>
              <Input
                id="nome_representante"
                value={companyForm.nome_representante || ""}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, nome_representante: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo_representante">Cargo do Representante</Label>
              <Input
                id="cargo_representante"
                value={companyForm.cargo_representante || ""}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, cargo_representante: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_contratante">E-mail do Contratante</Label>
              <Input
                id="email_contratante"
                value={companyForm.email_contratante || ""}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, email_contratante: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_contratante">Telefone do Contratante</Label>
              <Input
                id="telefone_contratante"
                value={companyForm.telefone_contratante || ""}
                onChange={(e) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    telefone_contratante: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                value={companyForm.endereco || ""}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, endereco: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cidade_padrao_assinatura">Cidade padrão da assinatura</Label>
              <Input
                id="cidade_padrao_assinatura"
                value={companyForm.cidade_padrao_assinatura || ""}
                onChange={(e) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    cidade_padrao_assinatura: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyDialogOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                upsertCompanySettings.mutate(companyForm);
                setCompanyDialogOpen(false);
              }}
              disabled={upsertCompanySettings.isPending}
            >
              {upsertCompanySettings.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
