import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Kanban,
  Users,
  LogOut,
  PlusCircle,
  DollarSign,
  Target,
  BookOpen,
  FileSpreadsheet,
  FilePlus,
  Bell,
  FileSignature,
  ShieldCheck,
  Building2,
  LifeBuoy,
} from "lucide-react";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_COMPANY_SETTINGS } from "@/hooks/useContractFieldResolver";
import { useCompanySettings, useUpsertCompanySettings } from "@/hooks/useCompanySettings";

const operacao = [
  {
    title: "Dashboard",
    url: "/app",
    icon: LayoutDashboard,
    gestor: true,
    freelancer: true,
    cliente: false,
  },
  {
    title: "Projetos",
    url: "/app/projects",
    icon: Kanban,
    gestor: true,
    freelancer: true,
    cliente: true,
  },
  {
    title: "Suporte",
    url: "/app/suporte",
    icon: LifeBuoy,
    gestor: true,
    freelancer: false,
    cliente: false,
  },
  {
    title: "Notificações",
    url: "/app/notifications",
    icon: Bell,
    gestor: true,
    freelancer: true,
    cliente: false,
  },
  {
    title: "Documentos",
    url: "/app/documents",
    icon: ShieldCheck,
    gestor: false,
    freelancer: true,
    cliente: false,
  },
  {
    title: "Freelancers",
    url: "/app/freelancers",
    icon: Users,
    gestor: true,
    freelancer: false,
    cliente: false,
  },
  {
    title: "Clientes",
    url: "/app/clients",
    icon: Building2,
    gestor: true,
    freelancer: false,
    cliente: false,
  },
];
const negocio = [
  {
    title: "Financeiro",
    url: "/app/finance",
    icon: DollarSign,
    gestor: true,
    freelancer: true,
    cliente: true,
  },
  {
    title: "Gerador de Contratos",
    url: "/app/contract-generator",
    icon: FileSignature,
    gestor: true,
    freelancer: false,
    cliente: false,
  },
  {
    title: "Modelos de Contrato",
    url: "/app/contract-models",
    icon: FilePlus,
    gestor: true,
    freelancer: false,
    cliente: false,
  },
];

const conhecimento = [
  {
    title: "Wiki & SOPs",
    url: "/app/wiki",
    icon: BookOpen,
    gestor: true,
    freelancer: true,
    cliente: false,
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, profile, role, logout, isGestor } = useAuth();
  const { data: companySettings = DEFAULT_COMPANY_SETTINGS } = useCompanySettings();
  const upsertCompanySettings = useUpsertCompanySettings();
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState(companySettings);

  useEffect(() => {
    setCompanyForm(companySettings);
  }, [companySettings]);

  const currentRole = role || "gestor";

  const renderGroup = (label: string, items: typeof operacao) => {
    const visible = items.filter((i) => {
      if (isGestor) return i.gestor !== false;
      if (currentRole === "freelancer") return i.freelancer;
      if (currentRole === "cliente") return i.cliente;
      return false;
    });

    if (visible.length === 0) return null;

    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((i) => {
              const active = i.url === "/app" ? path === "/app" : path.startsWith(i.url);
              return (
                <SidebarMenuItem key={i.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    className={
                      active
                        ? "!bg-blue-50/70 !text-blue-700 font-semibold shadow-none hover:bg-blue-100/50 hover:text-blue-800 [&>svg]:!text-blue-700"
                        : ""
                    }
                  >
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

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Gestor Delski";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-3 py-3 border-b border-sidebar-border">
          <div className="font-serif font-bold tracking-tight text-foreground text-base group-data-[collapsible=icon]:hidden">
            DELSKI ERP
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Operação", operacao)}
        {renderGroup("Negócio", negocio)}
        {renderGroup("Conhecimento", conhecimento)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:hidden text-left"
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-stone-100 text-stone-700 font-bold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate text-foreground">
                    {displayName}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider truncate">
                    {role === "gestor"
                      ? "Gestor"
                      : role === "freelancer"
                        ? "Freelancer"
                        : "Cliente"}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {isGestor && (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setCompanyDialogOpen(true);
                  }}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Dados da Empresa
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>

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
                  setCompanyForm((prev) => ({ ...prev, telefone_contratante: e.target.value }))
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
                  setCompanyForm((prev) => ({ ...prev, cidade_padrao_assinatura: e.target.value }))
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
              {upsertCompanySettings.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
