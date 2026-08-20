import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  LogOut,
  ChevronDown,
  Sparkles,
  Briefcase,
  FileText,
  LifeBuoy,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentClientProfile } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useClientDocuments } from "@/hooks/useClientDocuments";
import { useClientSupportTickets } from "@/hooks/useSupportTickets";
import { useEmittedServiceInvoices } from "@/hooks/useServiceInvoices";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/cliente")({
  component: ClienteLayout,
});

function ClienteLayout() {
  const {
    user,
    profile,
    isAuthenticated,
    isLoading,
    isGestor,
    isPendingApproval,
    isRejected,
    onboardingCompleted,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const { data: clientData } = useCurrentClientProfile(user?.id, user?.email || undefined);
  const clientId = clientData?.id || user?.id || "";

  // Queries for badge counts
  const { data: allProjects = [] } = useProjects();
  const clientProjects = useMemo(() => {
    if (!clientData && !user) return [];
    const cId = clientData?.id;
    const aId = clientData?.auth_user_id || user?.id;
    const emailLower = user?.email?.toLowerCase().trim();

    return allProjects.filter((p) => {
      if (cId && p.client_id === cId) return true;
      if (aId && p.client_id === aId) return true;
      if (emailLower && p.client?.email?.toLowerCase().trim() === emailLower) return true;
      return false;
    });
  }, [allProjects, clientData, user]);

  const { data: clientDocs = [] } = useClientDocuments(clientId);
  const { data: emittedNfses = [] } = useEmittedServiceInvoices(clientId);
  const { data: tickets = [] } = useClientSupportTickets(clientId, user?.email || undefined);

  const availableDocsCount = clientDocs.length + emittedNfses.length;

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate({ to: "/auth", replace: true });
      } else if (!isGestor && isPendingApproval) {
        navigate({ to: "/aguardando-aprovacao" as any, replace: true });
      } else if (!isGestor && isRejected) {
        navigate({ to: "/acesso-negado" as any, replace: true });
      } else if (isGestor) {
        navigate({ to: "/app", replace: true });
      } else if (
        !onboardingCompleted &&
        profile?.role === "cliente" &&
        typeof window !== "undefined" &&
        localStorage.getItem(`delski_onboarding_completed_${user?.id}`) !== "true"
      ) {
        navigate({ to: "/onboarding" as any, replace: true });
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    isGestor,
    isPendingApproval,
    isRejected,
    onboardingCompleted,
    profile,
    navigate,
    user?.id,
  ]);

  // Synchronize activeTab via CustomEvent
  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      if (e.detail && typeof e.detail === "string") {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("delski_switch_client_tab", handleTabSwitch);
    return () => window.removeEventListener("delski_switch_client_tab", handleTabSwitch);
  }, []);

  const switchTab = (tabName: string) => {
    setActiveTab(tabName);
    window.dispatchEvent(new CustomEvent("delski_switch_client_tab", { detail: tabName }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECECEE] dark:bg-[#090A0F]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-2 border-t-blue-600 dark:border-t-blue-500 animate-spin" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 font-hud">
            Carregando DELSKI CLOUD
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (!isGestor && (isPendingApproval || isRejected))) return null;

  const displayName = clientData?.company_name || clientData?.full_name || profile?.full_name || user?.email?.split("@")[0] || "Cliente";
  const initials = displayName.slice(0, 2).toUpperCase();

  // Navigation Items
  const NAV_ITEMS = [
    { value: "dashboard", label: "Dashboard", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { value: "projetos", label: "Projetos", count: clientProjects.length, icon: <Briefcase className="h-3.5 w-3.5" /> },
    { value: "documentos", label: "Documentos & Faturas", count: availableDocsCount, icon: <FileText className="h-3.5 w-3.5" /> },
    { value: "sac", label: "SAC", count: tickets.length, icon: <LifeBuoy className="h-3.5 w-3.5" /> },
    { value: "configuracoes", label: "Configurações", icon: <User className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#ECECEE] dark:bg-[#090A0F] text-slate-900 dark:text-zinc-100 flex flex-col font-hud antialiased selection:bg-blue-600 selection:text-white transition-colors">
      {/* ── Single Unified Navbar (Topo Integrado com Navegação) ────────── */}
      <div className="sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8 pointer-events-none">
        <header className="max-w-7xl mx-auto h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 px-6 rounded-full shadow-sm flex items-center justify-between gap-4 pointer-events-auto transition-all">
          {/* LADO ESQUERDO: Branding DELSKI CLOUD */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => switchTab("dashboard")}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <img
                src="/logo.png"
                alt="DELSKI"
                className="h-7 w-7 object-contain dark:brightness-0 dark:invert transition-transform group-hover:scale-105"
              />
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white font-hud">
                DELSKI{" "}
                <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                  CLOUD
                </span>
              </span>
            </button>
          </div>

          {/* CENTRO: Navegação Principal Integrada */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => switchTab(item.value)}
                  className={
                    isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full px-4 py-1.5 text-sm font-bold font-hud transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 text-sm font-medium font-hud transition-colors flex items-center gap-1.5 cursor-pointer"
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full font-hud ${
                        isActive
                          ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* LADO DIREITO: Tema & Avatar Dropdown */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile Nav Trigger (para telas menores que lg) */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200 font-hud flex items-center gap-1 cursor-pointer"
                  >
                    <span>Menu</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 p-2 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                  {NAV_ITEMS.map((item) => (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={() => switchTab(item.value)}
                      className={`rounded-xl text-xs font-bold px-3 py-2 cursor-pointer flex items-center justify-between ${
                        activeTab === item.value ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/50 dark:bg-zinc-800">
                          {item.count}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ThemeToggle />

            {/* Profile Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 p-1 rounded-full bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800 shadow-sm transition-all cursor-pointer"
                  title="Menu do Perfil"
                >
                  <Avatar className="h-8 w-8 rounded-full border border-slate-200 dark:border-zinc-700">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-tr from-blue-700 to-indigo-600 text-white text-xs font-black rounded-full">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 mr-1" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 p-2 rounded-[24px] border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl space-y-1"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate font-hud">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate font-medium mt-0.5">{user?.email}</p>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-zinc-800" />

                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer flex items-center gap-2.5 px-3 py-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </div>

      {/* ── Main Content Container ────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
