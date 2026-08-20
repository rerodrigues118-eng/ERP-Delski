import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Building2,
  LogOut,
  LifeBuoy,
  User,
  ChevronDown,
  Zap,
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

  const { data: clientData } = useCurrentClientProfile(user?.id, user?.email || undefined);

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
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECECEE] dark:bg-[#090A0F]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-2 border-t-blue-600 dark:border-t-blue-500 animate-spin" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 font-hud">
            Iniciando DELSKI HUD
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (!isGestor && (isPendingApproval || isRejected))) return null;

  const displayName = clientData?.company_name || clientData?.full_name || profile?.full_name || user?.email?.split("@")[0] || "Cliente";
  const contactName = clientData?.contact_name || clientData?.full_name || profile?.full_name || "Representante";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#ECECEE] dark:bg-[#090A0F] text-slate-900 dark:text-zinc-100 flex flex-col font-hud antialiased selection:bg-blue-600 selection:text-white transition-colors">
      {/* ── Floating Top-Pill Navigation HUD (Glassmorphism) ───────────── */}
      <div className="sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8 pointer-events-none">
        <header className="max-w-7xl mx-auto hud-top-pill px-4 sm:px-6 py-2 flex items-center justify-between gap-4 pointer-events-auto transition-all">
          {/* LEFT: Brand Logotype & Company Pill */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate({ to: "/cliente" })}
              className="flex items-center gap-2.5 shrink-0 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white font-hud">
                DELSKI{" "}
                <span className="text-blue-600 dark:text-blue-400 font-black">
                  HUD
                </span>
              </span>
            </button>

            <div className="hidden md:block w-px h-4 bg-slate-200 dark:bg-zinc-800" />

            {/* Context Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200/60 dark:border-zinc-700/60 max-w-[240px]">
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 truncate">
                {displayName}
              </span>
            </div>
          </div>

          {/* RIGHT: SLA Status + Theme + Profile Dropdown */}
          <div className="flex items-center gap-2.5">
            {/* Realtime SLA active pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold font-hud">SLA 100% Homologado</span>
            </div>

            <ThemeToggle />

            {/* User Dropdown Pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 p-1 pl-1.5 pr-2.5 rounded-full bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800 shadow-sm transition-all cursor-pointer"
                >
                  <Avatar className="h-7 w-7 rounded-full border border-slate-200 dark:border-zinc-700">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-tr from-blue-700 to-indigo-600 text-white text-[10px] font-extrabold rounded-full">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px] font-hud leading-none">
                      {contactName}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-60 p-2 rounded-[24px] border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl space-y-1"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate font-hud">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate font-medium mt-0.5">{user?.email}</p>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-zinc-800" />

                <DropdownMenuItem
                  onClick={() => {
                    const event = new CustomEvent("delski_switch_client_tab", { detail: "configuracoes" });
                    window.dispatchEvent(event);
                  }}
                  className="rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-2.5 px-3 py-2"
                >
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  Configurações da Conta
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    const event = new CustomEvent("delski_switch_client_tab", { detail: "ocorrencias" });
                    window.dispatchEvent(event);
                  }}
                  className="rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-2.5 px-3 py-2"
                >
                  <LifeBuoy className="h-3.5 w-3.5 text-indigo-600" />
                  Central SAC & Suporte
                </DropdownMenuItem>

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
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        <Outlet />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-slate-200/70 dark:border-white/5 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-zinc-500 font-hud">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="font-bold text-slate-700 dark:text-zinc-300">DELSKI HUD &copy; {new Date().getFullYear()}</span>
            <span>— Plataforma Corporativa de Alta Performance PJ</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-zinc-400">
            <span>SLA 2h:</span>
            <a href="mailto:contato@delski.co" className="text-blue-600 dark:text-blue-400 hover:underline">
              contato@delski.co
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
