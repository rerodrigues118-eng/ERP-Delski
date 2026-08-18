import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Search, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

const ROUTE_LABELS: Record<string, string> = {
  "/app": "Dashboard",
  "/app/projects": "Projetos",
  "/app/suporte": "Suporte",
  "/app/notifications": "Notificações",
  "/app/freelancers": "Freelancers",
  "/app/clients": "Clientes",
  "/app/finance": "Financeiro",
  "/app/contract-generator": "Gerador de Contratos",
  "/app/contract-models": "Modelos de Contrato",
  "/app/documents": "Documentos",
  "/app/wiki": "Wiki & SOPs",
  "/app/perfil": "Configurações",
  "/app/risks": "Riscos",
};

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [{ label: "ERP", href: "/app" }];

  // Find exact or partial match
  const sortedRoutes = Object.entries(ROUTE_LABELS)
    .filter(([route]) => route !== "/app" && pathname.startsWith(route))
    .sort((a, b) => b[0].length - a[0].length);

  if (sortedRoutes.length > 0) {
    const [route, label] = sortedRoutes[0];
    // If it has a sub-path deeper than /app/x (e.g., /app/clients/123), add the parent too if parent != "/app"
    if (route.split("/").length > 2) {
      const parentRoute = route.split("/").slice(0, -1).join("/");
      if (parentRoute !== "/app" && ROUTE_LABELS[parentRoute]) {
        crumbs.push({ label: ROUTE_LABELS[parentRoute], href: parentRoute });
      }
    }
    crumbs.push({ label, href: route });
  } else if (pathname !== "/app") {
    // Sub-route without a label — find closest parent
    const segments = pathname.split("/").filter(Boolean);
    let current = "";
    for (const seg of segments) {
      current += "/" + seg;
      if (current !== "/app" && ROUTE_LABELS[current]) {
        crumbs.push({ label: ROUTE_LABELS[current], href: current });
      }
    }
  }

  return crumbs;
}

function AppHeader({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const { profile, user } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const breadcrumbs = useMemo(() => getBreadcrumbs(pathname), [pathname]);
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";
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
    <header
      className="sticky top-0 z-20 flex items-center justify-between bg-card/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border dark:border-zinc-800/80 px-6 transition-colors"
      style={{ height: "var(--header-height, 56px)" }}
    >
      {/* Left: breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, idx) => (
          <span key={`${crumb.href}-${idx}`} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />}
            {idx === breadcrumbs.length - 1 ? (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.href}
                className="text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Center: interactive search trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden md:flex items-center gap-2 bg-muted/60 dark:bg-zinc-900/90 border border-border dark:border-zinc-800 rounded-xl px-3 py-1.5 w-64 xl:w-80 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/80 transition-all text-left group"
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="select-none text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          Buscar no ERP...
        </span>
        <span className="ml-auto text-[10px] bg-background dark:bg-zinc-800 text-muted-foreground border border-border/50 px-1.5 py-0.5 rounded-md font-mono font-medium shadow-2xs">
          ⌘K
        </span>
      </button>

      {/* Right: theme toggle + notifications */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <Link
          to="/app/notifications"
          className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Notificações"
        >
          <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-card dark:ring-zinc-900" />
        </Link>
      </div>
    </header>
  );
}

function AppLayout() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex w-full bg-background dark:bg-zinc-950 text-foreground transition-colors">
        {/* Fixed sidebar */}
        <AppSidebar />

        {/* Command Palette Modal */}
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          <AppHeader onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
