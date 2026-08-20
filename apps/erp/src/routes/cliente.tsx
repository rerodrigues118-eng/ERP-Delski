import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Building2,
  LogOut,
  LifeBuoy,
  User,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-foreground">
        <div className="text-center space-y-3.5">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mx-auto shadow-sm" />
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Carregando DELSKI CLOUD...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (!isGestor && (isPendingApproval || isRejected))) return null;

  const displayName = clientData?.company_name || clientData?.full_name || profile?.full_name || user?.email?.split("@")[0] || "Cliente";
  const contactName = clientData?.contact_name || clientData?.full_name || profile?.full_name || "Representante";

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-zinc-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors">
      {/* Top Client Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-zinc-800/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Company Badge */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate({ to: "/cliente" })}>
              <img src="/logo.png" alt="Delski" className="h-8 w-8 object-contain transition-all dark:brightness-0 dark:invert" />
              <span className="font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 text-lg">
                DELSKI <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-black">CLOUD</span>
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-zinc-800">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 truncate max-w-[240px]">
                <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{displayName}</span>
              </span>
            </div>
          </div>

          {/* Right: Support button, ThemeToggle, User Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1 rounded-full font-semibold border border-emerald-200/80 dark:border-emerald-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Ambiente Homologado</span>
            </div>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs cursor-pointer"
                >
                  <Avatar className="h-8 w-8 rounded-xl border border-slate-200 dark:border-zinc-700">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-xs font-bold rounded-xl">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 leading-tight truncate max-w-[140px]">
                      {contactName}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 truncate max-w-[140px]">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-2 rounded-2xl shadow-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <DropdownMenuLabel className="font-normal px-2 py-1.5">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">{displayName}</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-zinc-800 my-1" />
                <DropdownMenuItem
                  onClick={() => {
                    const event = new CustomEvent("delski_switch_client_tab", { detail: "configuracoes" });
                    window.dispatchEvent(event);
                  }}
                  className="rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-2.5 py-2 px-2.5"
                >
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Configurações da Conta
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const event = new CustomEvent("delski_switch_client_tab", { detail: "ocorrencias" });
                    window.dispatchEvent(event);
                  }}
                  className="rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-2.5 py-2 px-2.5"
                >
                  <LifeBuoy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Central de SAC / Suporte
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-zinc-800 my-1" />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2.5 py-2 px-2.5"
                >
                  <LogOut className="h-4 w-4" /> Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Client Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 py-6 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-zinc-300">DELSKI CLOUD &copy; {new Date().getFullYear()}</span>
            <span>— Plataforma Corporativa de Gestão de PJ & Demandas.</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Canal Oficial de Atendimento: <a href="mailto:contato@delski.co" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">contato@delski.co</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
