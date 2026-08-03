import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { FreelancerOnboardingSection } from "@/components/FreelancerOnboardingSection";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/app/documents")({
  head: () => ({
    meta: [
      { title: "Documentos e Contratos — Delski ERP" },
      {
        name: "description",
        content: "Gestão de dados para contrato, envio de documentos e assinatura digital.",
      },
    ],
  }),
  component: FreelancerDocumentsPage,
});

function FreelancerDocumentsPage() {
  const { isGestor, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isGestor) {
      navigate({ to: "/app/freelancers", replace: true });
    }
  }, [isGestor, loading, navigate]);

  if (loading || isGestor) return null;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-indigo-600" /> Documentos & Contratos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Preencha seus dados de contrato, envie os comprovantes pessoais solicitados e assine
            seus contratos.
          </p>
        </div>
      </div>

      <FreelancerOnboardingSection />
    </div>
  );
}
