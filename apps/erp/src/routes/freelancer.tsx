import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Building2,
  FileText,
  CreditCard,
  Receipt,
  Sparkles,
  FolderKanban,
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
import { useCurrentFreelancerProfile } from "@/hooks/useFreelancerPortal";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/freelancer")({
  component: FreelancerLayout,
});

function FreelancerLayout() {
  const {
    user,
    profile,
    isAuthenticated,
    isLoading,
    isGestor,
    isCliente,
    isPendingApproval,
    isRejected,
    onboardingCompleted,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const { data: freelancerData } = useCurrentFreelancerProfile(
    user?.id,
    user?.email || undefined
  );

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate({ to: "/auth", replace: true });
      } else if (!isGestor && (profile?.status === "bloqueado" || freelancerData?.status === "bloqueado" || profile?.status === "inativo")) {
        navigate({ to: "/acesso-negado" as any, replace: true });
      } else if (!isGestor && isPendingApproval) {
        navigate({ to: "/aguardando-aprovacao" as any, replace: true });
      } else if (!isGestor && isRejected) {
        navigate({ to: "/acesso-negado" as any, replace: true });
      } else if (isGestor) {
        navigate({ to: "/app", replace: true });
      } else if (isCliente) {
        navigate({ to: "/cliente" as any, replace: true });
      } else if (
        !onboardingCompleted &&
        profile?.role === "freelancer" &&
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
    isCliente,
    isPendingApproval,
    isRejected,
    onboardingCompleted,
    profile,
    freelancerData,
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
    window.addEventListener("delski_switch_freelancer_tab", handleTabSwitch);
    return () => window.removeEventListener("delski_switch_freelancer_tab", handleTabSwitch);
  }, []);

  const switchTab = (tabName: string) => {
    setActiveTab(tabName);
    window.dispatchEvent(new CustomEvent("delski_switch_freelancer_tab", { detail: tabName }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECECEE] dark:bg-[#090A0F]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-2 border-t-blue-600 dark:border-t-blue-500 animate-spin" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 font-sans">
            Carregando DELSKI CLOUD
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (!isGestor && (isPendingApproval || isRejected))) return null;

  const displayName =
    freelancerData?.company_name ||
    freelancerData?.full_name ||
    profile?.full_name ||
    user?.email?.split("@")[0] ||
    "Prestador";

  const contactName =
    freelancerData?.full_name ||
    profile?.full_name ||
    "Profissional";

  const NAV_ITEMS = [
    { value: "dashboard", label: "Dashboard", icon: <Sparkles className="h-4 w-4" /> },
    { value: "projetos", label: "Projetos", icon: <FolderKanban className="h-4 w-4" /> },
    { value: "cadastrais", label: "Dados Cadastrais", icon: <Building2 className="h-4 w-4" /> },
    { value: "documentacao", label: "Documentação", icon: <FileText className="h-4 w-4" /> },
    { value: "financeiro", label: "Dados Financeiros", icon: <CreditCard className="h-4 w-4" /> },
    { value: "notas", label: "Comprovantes Fiscais", icon: <Receipt className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#ECECEE] dark:bg-[#090A0F] text-slate-900 dark:text-zinc-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white transition-colors">
      {/* ── Single Unified Navbar (Topo Integrado com Navegação Flutuante) ────────── */}
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
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                DELSKI{" "}
                <span className="text-[#2563EB] dark:text-blue-400 font-extrabold">
                  CLOUD
                </span>
              </span>
            </button>
          </div>

          {/* CENTRO: Navegação Principal Integrada (Pills) */}
          <nav className="hidden xl:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => switchTab(item.value)}
                  className={
                    isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white px-3.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* LADO DIREITO: Tema & Avatar Dropdown */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile / Tablet Nav Trigger */}
            <div className="xl:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1 cursor-pointer"
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
                      className={`rounded-xl text-xs font-semibold px-3 py-2 cursor-pointer flex items-center gap-2 ${
                        activeTab === item.value ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Avatar className="h-8 w-8 rounded-full border border-slate-200 dark:border-zinc-700">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-slate-900 text-white text-xs font-bold rounded-full">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block mr-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <DropdownMenuLabel className="font-normal px-3 py-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-2 px-3 py-2"
                >
                  <LogOut className="h-3.5 w-3.5" /> Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </div>

      {/* Main Freelancer Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
