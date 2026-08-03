import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ClientLayout } from "@/components/ClientLayout";

export const Route = createFileRoute("/portal")({
  component: PortalLayout,
});

function PortalLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const isAuthPage =
    typeof window !== "undefined" && window.location.pathname.startsWith("/portal/auth");

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      navigate({ to: "/portal/auth", replace: true });
    }
  }, [user, loading, isAuthPage, navigate]);

  if (isAuthPage) {
    return <Outlet />;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando Portal do Cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <ClientLayout>
      <Outlet />
    </ClientLayout>
  );
}
