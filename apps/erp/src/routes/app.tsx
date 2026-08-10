import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Search, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";

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

function AppHeader() {
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
      className="sticky top-0 z-20 flex items-center justify-between bg-white border-b border-gray-100 px-6"
      style={{ height: "var(--header-height, 56px)" }}
    >
      {/* Left: breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, idx) => (
          <span key={`${crumb.href}-${idx}`} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />}
            {idx === breadcrumbs.length - 1 ? (
              <span className="font-semibold text-gray-800">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.href}
                className="text-gray-400 hover:text-gray-700 font-medium"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Center: search */}
      <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-64 xl:w-80 text-sm text-gray-400 cursor-text hover:border-gray-300">
        <Search className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="select-none">Buscar no ERP...</span>
        <span className="ml-auto text-[11px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md font-mono">
          ⌘K
        </span>
      </div>

      {/* Right: notifications + avatar */}
      <div className="flex items-center gap-2">
        <Link
          to="/app/notifications"
          className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-700"
        >
          <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </Link>

        <Link to="/app/perfil">
          <Avatar className="h-8 w-8 ring-2 ring-blue-100 cursor-pointer">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />}
            <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}

function AppLayout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex w-full bg-slate-50">
        {/* Fixed sidebar */}
        <AppSidebar />

        {/* Main area shifted right of sidebar */}
        <div
          className="flex-1 flex flex-col min-w-0 min-h-screen"
          style={{ marginLeft: "var(--sidebar-width, 220px)" }}
        >
          <AppHeader />
          <main className="flex-1 p-7 xl:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
