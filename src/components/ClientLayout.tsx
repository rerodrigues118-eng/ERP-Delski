import { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { user, profile, isGestor, loading, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const rawName =
    profile?.full_name &&
    !profile.full_name.includes("@") &&
    profile.full_name !== user?.email?.split("@")[0]
      ? profile.full_name
      : (user?.user_metadata as any)?.full_name?.trim() ||
        (user?.user_metadata as any)?.name?.trim() ||
        user?.email?.split("@")[0] ||
        "Cliente";

  const clientName = rawName.split("(")[0].trim();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando Portal do Cliente...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("delski_last_portal", "client");
      }
      queryClient.clear();
      await logout();
    } catch {
      // Ignore
    } finally {
      navigate({ to: "/portal/auth", replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-950 text-white font-bold shadow-sm">
                D
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Portal do Cliente
                </p>
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  Bem-vindo(a), {clientName}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isGestor && (
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link to="/app">Voltar ao ERP</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-destructive gap-2"
              >
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </div>
          </div>

          <nav className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-md text-xs font-medium">
              <Link to="/portal/dashboard" activeProps={{ className: "bg-slate-950 text-white" }}>
                Dashboard
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-md text-xs font-medium">
              <Link to="/portal/projetos" activeProps={{ className: "bg-slate-950 text-white" }}>
                Meus Projetos
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-md text-xs font-medium">
              <Link to="/portal/financeiro" activeProps={{ className: "bg-slate-950 text-white" }}>
                Financeiro
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-md text-xs font-medium">
              <Link to="/portal/documentos" activeProps={{ className: "bg-slate-950 text-white" }}>
                Contratos
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-md text-xs font-medium">
              <Link to="/portal/suporte" activeProps={{ className: "bg-slate-950 text-white" }}>
                Suporte
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}
