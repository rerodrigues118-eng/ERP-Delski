import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — Delski" },
      { name: "description", content: "Preferências e integrações da conta Delski." },
      { property: "og:title", content: "Configurações — Delski" },
      { property: "og:description", content: "Configurações da plataforma Delski." },
    ],
  }),
  component: Settings,
});

function Settings() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Integrações e preferências da conta.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Brevo — E-mails transacionais</CardTitle>
          <Badge variant="outline">Pendente</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Envio de e-mails de boas-vindas, delegação e mudanças de status. Atualmente em modo simulado (aparece como toast).</p>
          <p>Na Fase 2, conectaremos via <code className="bg-muted px-1 rounded">@connector:brevo</code> e trocaremos os stubs pelo envio real.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Supabase — Banco & Armazenamento</CardTitle>
          <Badge variant="outline">Pendente</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Autenticação, tabelas (projects, freelancers, project_files), RLS e Storage. Hoje os dados vivem em <code className="bg-muted px-1 rounded">localStorage</code>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
