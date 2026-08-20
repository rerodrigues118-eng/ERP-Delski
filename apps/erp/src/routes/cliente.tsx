import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  LogOut,
  ChevronDown,
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
    user?.id,
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
            Carregando DELSKI CLOUD
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (!isGestor && (isPendingApproval || isRejected))) return null;

  const displayName = clientData?.company_name || clientData?.full_name || profile?.full_name || user?.email?.split("@")[0] || "Cliente";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#ECECEE] dark:bg-[#090A0F] text-slate-900 dark:text-zinc-100 flex flex-col font-hud antialiased selection:bg-blue-600 selection:text-white transition-colors">
      {/* ── Floating Top-Pill Navigation HUD (Glassmorphism) ───────────── */}
      <div className="sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8 pointer-events-none">
        <header className="max-w-7xl mx-auto hud-top-pill px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 pointer-events-auto transition-all">
          {/* LEFT: Official Brand Name — DELSKI CLOUD */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate({ to: "/cliente" })}
              className="flex items-center gap-2.5 shrink-0 group cursor-pointer"
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

          {/* RIGHT: Theme Toggle & Avatar Menu */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            {/* Profile Avatar Dropdown (Icon Only) */}
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
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
