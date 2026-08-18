import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Building2,
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

  const { data: freelancerData } = useCurrentFreelancerProfile(
    user?.id,
    user?.email || undefined
  );

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
      } else if (isCliente) {
        navigate({ to: "/cliente" as any, replace: true });
      } else if (!onboardingCompleted && profile?.role === "freelancer") {
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
    navigate,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-sm text-gray-500 font-medium">
            Carregando painel do prestador...
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Provider Badge */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Delski"
                className="h-8 w-8 object-contain"
              />
              <span className="font-bold tracking-tight text-gray-900 text-lg">
                DELSKI <span className="text-blue-600 font-extrabold">CLOUD</span>
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-gray-200">
              <Briefcase className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-700 truncate max-w-[220px]">
                {displayName}
              </span>
            </div>
          </div>

          {/* Right: User Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full font-medium border border-blue-100">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Prestador Homologado</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200/60"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-gray-200">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-indigo-600 text-white text-xs font-bold rounded-lg">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[140px]">
                      {contactName}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate max-w-[140px]">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lg">
                <DropdownMenuLabel className="font-normal px-2 py-1.5">
                  <div className="text-xs font-semibold text-gray-900 truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" /> Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Freelancer Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>DELSKI &copy; {new Date().getFullYear()} — Portal do Prestador de Serviços.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Suporte Financeiro: financeiro@delski.co</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
