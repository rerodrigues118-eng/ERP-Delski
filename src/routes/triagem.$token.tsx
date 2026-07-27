import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApplicationByToken, useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SERVICE_LABEL } from "@/mocks/types";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/triagem/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Triagem de projeto — Delski" },
      { name: "description", content: "Responda a triagem para o projeto proposto pela Delski." },
      { property: "og:title", content: "Triagem de projeto — Delski" },
      { property: "og:description", content: "Formulário de triagem para freelancers Delski." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TriagePage,
});

function TriagePage() {
  const { token } = Route.useParams();
  const application = useApplicationByToken(token);
  const project = useStore((s) => (application ? s.projects.find((p) => p.id === application.projectId) : undefined));
  const freelancer = useStore((s) => (application ? s.freelancers.find((f) => f.id === application.freelancerId) : undefined));
  const submit = useStore((s) => s.submitApplication);

  const initial = useMemo(
    () => ({
      capacity: application?.capacity ?? "",
      availability: application?.availability ?? "",
      proposedDeadline: application?.proposedDeadline?.slice(0, 10) ?? "",
      proposedValue: application?.proposedValue?.toString() ?? "",
      notes: application?.notes ?? "",
    }),
    [application?.id],
  );

  const [form, setForm] = useState(initial);

  if (!application || !project) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30 px-4">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Convite inválido</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Este link de triagem não é válido ou expirou. Entre em contato com o gestor.
          </CardContent>
        </Card>
      </div>
    );
  }

  const alreadyAnswered = application.status !== "Pendente";

  const onSubmit = () => {
    if (!form.capacity || !form.availability || !form.proposedDeadline || !form.proposedValue) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    submit(token, {
      capacity: form.capacity,
      availability: form.availability,
      proposedDeadline: new Date(form.proposedDeadline).toISOString(),
      proposedValue: Number(form.proposedValue),
      notes: form.notes,
    });
    toast.success("Resposta enviada. O gestor foi notificado.");
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-brand text-brand-foreground font-bold">D</div>
          <h1 className="text-2xl font-semibold tracking-tight mt-3">Triagem de projeto</h1>
          <p className="text-sm text-muted-foreground">Delski · convite para {freelancer?.name || "freelancer"}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{project.client}</CardTitle>
              <Badge variant="outline">{project.type}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Tipo</div>
              <div>{SERVICE_LABEL[project.type]}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Escopo</div>
              <p className="whitespace-pre-wrap">{project.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Prazo alvo</div>
                <div>{new Date(project.deadline).toLocaleDateString("pt-BR")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Orçamento</div>
                <div>R$ {project.budget.toLocaleString("pt-BR")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {alreadyAnswered ? (
          <Card>
            <CardContent className="py-8 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-brand mx-auto" />
              <div className="font-medium">Sua resposta foi registrada</div>
              <div className="text-sm text-muted-foreground">
                Status atual: <Badge variant="secondary">{application.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Suas respostas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Capacidade disponível *</Label>
                <Input placeholder="ex.: 20h por semana" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Disponibilidade para iniciar *</Label>
                  <Input type="date" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
                </div>
                <div>
                  <Label>Prazo proposto de entrega *</Label>
                  <Input type="date" value={form.proposedDeadline} onChange={(e) => setForm({ ...form, proposedDeadline: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Valor proposto (R$) *</Label>
                <Input type="number" min={0} value={form.proposedValue} onChange={(e) => setForm({ ...form, proposedValue: e.target.value })} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={4} placeholder="Experiências relevantes, ressalvas, dúvidas..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button className="w-full" onClick={onSubmit}>Enviar resposta</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
