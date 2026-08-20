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
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#09090B]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 mx-auto relative">
            <div className="absolute inset-0 rounded-full border border-zinc-200 dark:border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-t border-blue-600 dark:border-blue-500 animate-spin" />
          </div>
          <p className="micro-label">Carregando DELSKI CLOUD</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (!isGestor && (isPendingApproval || isRejected))) return null;

  const displayName = clientData?.company_name || clientData?.full_name || profile?.full_name || user?.email?.split("@")[0] || "Cliente";
  const contactName = clientData?.contact_name || clientData?.full_name || profile?.full_name || "Representante";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">

      {/* ── Architectural Navbar — Swiss Monochrome Precision ─────── */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
        {/* Royal blue laser top accent — 1px */}
        <div className="h-px bg-blue-600 dark:bg-blue-500 opacity-60" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between gap-4">

            {/* LEFT: Brand + Context */}
            <div className="flex items-center gap-5 min-w-0">
              <button
                type="button"
                onClick={() => navigate({ to: "/cliente" })}
                className="flex items-center gap-2 shrink-0 group"
              >
                <img
                  src="/logo.png"
                  alt="Delski"
                  className="h-6 w-6 object-contain dark:brightness-0 dark:invert transition-opacity group-hover:opacity-70"
                />
                <span
                  className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  DELSKI{" "}
                  <span
                    style={{
                      fontFamily: "var(--font-mono, 'Geist Mono', ui-monospace, monospace)",
                      color: "#2563eb",
                      letterSpacing: "-0.01em",
                      fontWeight: 900,
                    }}
                  >
                    CLOUD
                  </span>
                </span>
              </button>

              <div className="hidden sm:block w-px h-4 bg-zinc-200 dark:bg-zinc-800" />

              <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">
                  {displayName}
                </span>
              </div>
            </div>

            {/* RIGHT: Status + Controls */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="laser-dot" style={{ width: "6px", height: "6px" }} />
                <span className="micro-label">SLA Ativo</span>
              </div>

              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <Avatar className="h-7 w-7 rounded-md border border-zinc-200 dark:border-zinc-700">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback
                        className="rounded-md text-white"
                        style={{ background: "#09090b", fontSize: "10px", fontWeight: 700 }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-none truncate max-w-[120px]">
                        {contactName}
                      </p>
                      <p
                        className="text-zinc-500 leading-none truncate max-w-[120px] mt-0.5"
                        style={{
                          fontFamily: "var(--font-mono, ui-monospace, monospace)",
                          fontSize: "0.625rem",
                        }}
                      >
                        {user?.email}
                      </p>
                    </div>
                    <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl"
                >
                  <DropdownMenuLabel className="px-2 py-1.5">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</p>
                    <p
                      className="text-zinc-500 truncate mt-0.5"
                      style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: "0.625rem" }}
                    >
                      {user?.email}
                    </p>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />

                  <DropdownMenuItem
                    onClick={() => {
                      const event = new CustomEvent("delski_switch_client_tab", { detail: "configuracoes" });
                      window.dispatchEvent(event);
                    }}
                    className="rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-2 px-2 py-1.5"
                  >
                    <User className="h-3.5 w-3.5 text-zinc-400" />
                    Configurações da Conta
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      const event = new CustomEvent("delski_switch_client_tab", { detail: "ocorrencias" });
                      window.dispatchEvent(event);
                    }}
                    className="rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-2 px-2 py-1.5"
                  >
                    <LifeBuoy className="h-3.5 w-3.5 text-zinc-400" />
                    SAC / Central de Suporte
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />

                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer flex items-center gap-2 px-2 py-1.5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Encerrar Sessão
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* ── Footer — Hairline Precision ──────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500" />
            <span className="micro-label">
              DELSKI CLOUD &copy; {new Date().getFullYear()} — Plataforma Corporativa PJ
            </span>
          </div>
          <span className="micro-label">
            Suporte:{" "}
            <a href="mailto:contato@delski.co" className="accent-laser-text hover:underline">
              contato@delski.co
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
