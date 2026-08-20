import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ClientLayout } from "@/components/ClientLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/_app")({
  component: PortalLayout,
});

function PortalLayout() {
  return (
    <ProtectedRoute>
      <ClientLayout>
        <Outlet />
      </ClientLayout>
    </ProtectedRoute>
  );
}
