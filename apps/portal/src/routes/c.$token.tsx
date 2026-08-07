import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useProjectByClientToken, useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES, STATUS_LABEL, SERVICE_LABEL } from "@/mocks/types";
import { CheckCircle2, MessageSquareWarning, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$token")({
  head: () => ({
    meta: [
      { title: "Portal do Cliente — Delski" },
      { name: "description", content: "Acompanhe o progresso do seu projeto na Delski." },
      { property: "og:title", content: "Portal do Cliente — Delski" },
      { property: "og:description", content: "Área do cliente Delski." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientPortal,
});

function ClientPortal() {
  const { token } = Route.useParams();
  const project = useProjectByClientToken(token);
  const addFeedback = useStore((s) => s.addClientFeedback);
  const [msg, setMsg] = useState("");

  if (!project) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Link inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentIdx = STATUSES.indexOf(project.status);
  const progress = Math.round(((currentIdx + 1) / STATUSES.length) * 100);

  const approve = () => {
    addFeedback(project.id, "aprovado");
    toast.success("Aprovação registrada.");
  };
  const requestChange = () => {
    if (!msg.trim()) return toast.error("Descreva o ajuste desejado.");
    addFeedback(project.id, "ajuste", msg);
    setMsg("");
    toast.success("Solicitação enviada à equipe Delski.");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-6 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-brand-foreground font-bold">
            D
          </div>
          <div>
            <div className="font-semibold">Delski</div>
            <div className="text-xs text-muted-foreground">Portal do cliente</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.client}</h1>
            <Badge variant="outline">{project.type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{SERVICE_LABEL[project.type]}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>
                  Etapa atual:{" "}
                  <strong className="text-foreground">{STATUS_LABEL[project.status]}</strong>
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {STATUSES.map((s, i) => (
                <div
                  key={s}
                  className={`text-center text-xs p-2 rounded-md border ${i <= currentIdx ? "bg-brand/10 border-brand/30 text-foreground" : "text-muted-foreground"}`}
                >
                  {STATUS_LABEL[s]}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Escopo do projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{project.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
              <div>
                <div className="text-xs text-muted-foreground">Prazo de entrega</div>
                <div className="font-medium">
                  {new Date(project.deadline).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Valor</div>
                <div className="font-medium">R$ {project.budget.toLocaleString("pt-BR")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {(project.driveLink || project.files.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entregas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.driveLink && (
                <a
                  href={project.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <span className="text-sm">Pasta de arquivos (Google Drive)</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {project.files.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  download={f.name}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors"
                >
                  <span className="text-sm">{f.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {project.status === "Em Producao" && (
          <Card className="border-brand/40">
            <CardHeader>
              <CardTitle className="text-base">Sua avaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                A entrega está pronta para revisão. Aprove ou peça ajustes:
              </p>
              <Textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Descreva o ajuste (se necessário)..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={approve} className="flex-1">
                  <CheckCircle2 className="h-4 w-4" /> Aprovar entrega
                </Button>
                <Button variant="outline" onClick={requestChange} className="flex-1">
                  <MessageSquareWarning className="h-4 w-4" /> Solicitar ajuste
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {project.clientFeedback && project.clientFeedback.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seu histórico de aprovações</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {project.clientFeedback
                .slice()
                .reverse()
                .map((fb) => (
                  <div key={fb.id} className="py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={fb.decision === "aprovado" ? "default" : "secondary"}>
                        {fb.decision === "aprovado" ? "Aprovado" : "Ajuste solicitado"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(fb.at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {fb.message && (
                      <p className="text-sm mt-1 text-muted-foreground">{fb.message}</p>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
