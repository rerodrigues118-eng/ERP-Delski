import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, STATUS_LABEL, SERVICE_LABEL, type ProjectStatus } from "@/mocks/types";
import { ArrowLeft, Copy, Download, Link2, Mail, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { sendDelegationEmail, sendStatusChangeEmail } from "@/integrations/brevo";

export const Route = createFileRoute("/app/projects/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do projeto — Delski" },
      { name: "description", content: "Detalhes, delegação, arquivos e histórico do projeto." },
      { property: "og:title", content: "Detalhe do projeto — Delski" },
      { property: "og:description", content: "Ficha completa do projeto Delski." },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const freelancers = useStore((s) => s.freelancers);
  const user = useStore((s) => s.user);
  const updateStatus = useStore((s) => s.updateProjectStatus);
  const assign = useStore((s) => s.assignFreelancer);
  const setDrive = useStore((s) => s.setDriveLink);
  const addFile = useStore((s) => s.addFile);
  const removeFile = useStore((s) => s.removeFile);
  const genToken = useStore((s) => s.generatePublicToken);
  const genClientToken = useStore((s) => s.generateClientToken);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button asChild className="mt-4"><Link to="/app/projects">Voltar</Link></Button>
      </div>
    );
  }

  const isGestor = user?.role === "gestor";
  const canEdit = isGestor || project.freelancerId === user?.freelancerId;
  const freelancer = freelancers.find((f) => f.id === project.freelancerId);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((f) => {
      addFile(project.id, { name: f.name, size: f.size, url: URL.createObjectURL(f), uploadedBy: user?.name || "Usuário" });
    });
    toast.success("Arquivo(s) enviado(s) (mock local)");
    if (fileRef.current) fileRef.current.value = "";
  };

  const publicUrl = project.publicToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${project.publicToken}` : "";
  const clientUrl = project.clientToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${project.clientToken}` : "";


  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Button asChild variant="ghost" size="sm"><Link to="/app/projects"><ArrowLeft className="h-4 w-4" /> Voltar</Link></Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.client}</h1>
            <Badge variant="outline">{project.type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{SERVICE_LABEL[project.type]} · criado em {new Date(project.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={project.status} onValueChange={(v) => {
            updateStatus(project.id, v as ProjectStatus);
            if (freelancer) sendStatusChangeEmail({ to: { name: freelancer.name, email: freelancer.email }, projectClient: project.client, status: v });
          }} disabled={!canEdit}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          {isGestor && <TabsTrigger value="delegation">Delegação</TabsTrigger>}
          <TabsTrigger value="files">Arquivos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Escopo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm whitespace-pre-wrap">{project.description}</p>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Prazo</div><div className="font-medium">{new Date(project.deadline).toLocaleDateString("pt-BR")}</div></div>
                <div><div className="text-xs text-muted-foreground">Orçamento</div><div className="font-medium">R$ {project.budget.toLocaleString("pt-BR")}</div></div>
                <div><div className="text-xs text-muted-foreground">Freelancer</div><div className="font-medium">{freelancer?.name || "—"}</div></div>
              </div>
              {project.referenceLink && (
                <div className="text-sm">
                  <div className="text-xs text-muted-foreground">Referência</div>
                  <a href={project.referenceLink} target="_blank" rel="noreferrer" className="text-brand hover:underline break-all">{project.referenceLink}</a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isGestor && (
          <TabsContent value="delegation" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Delegar freelancer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Freelancer responsável</Label>
                  <Select value={project.freelancerId || ""} onValueChange={(v) => {
                    assign(project.id, v || undefined);
                    const f = freelancers.find((x) => x.id === v);
                    if (f) sendDelegationEmail({ to: { name: f.name, email: f.email }, projectClient: project.client, projectId: project.id, publicLink: publicUrl });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {freelancers.filter((f) => f.active).map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name} — {f.skills.join(", ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 border-t">
                  <Label className="mb-2 block">Link público do projeto</Label>
                  {project.publicToken ? (
                    <div className="flex items-center gap-2">
                      <Input readOnly value={publicUrl} />
                      <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado!"); }}><Copy className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => { genToken(project.id); toast.success("Link gerado!"); }}><Link2 className="h-4 w-4" /> Gerar link compartilhável</Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Permite que o freelancer visualize as especificações sem precisar de login.</p>
                </div>

                {freelancer && (
                  <div className="pt-2 border-t flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Reenviar notificação por e-mail</div>
                    <Button variant="ghost" size="sm" onClick={() => sendDelegationEmail({ to: { name: freelancer.name, email: freelancer.email }, projectClient: project.client, projectId: project.id, publicLink: publicUrl })}>
                      <Mail className="h-4 w-4" /> Reenviar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Google Drive</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label>Link da pasta do projeto</Label>
              <div className="flex gap-2">
                <Input value={project.driveLink || ""} onChange={(e) => setDrive(project.id, e.target.value)} placeholder="https://drive.google.com/..." disabled={!canEdit} />
                {project.driveLink && (
                  <Button variant="outline" asChild><a href={project.driveLink} target="_blank" rel="noreferrer">Abrir</a></Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Arquivos do projeto</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {canEdit && (
                <div>
                  <input ref={fileRef} type="file" multiple hidden onChange={onUpload} />
                  <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Enviar arquivos</Button>
                  <p className="text-xs text-muted-foreground mt-2">Upload local (mock). Na Fase 2 será integrado ao Supabase Storage.</p>
                </div>
              )}
              <div className="divide-y">
                {project.files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-sm">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB · {f.uploadedBy} · {new Date(f.uploadedAt).toLocaleDateString("pt-BR")}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" asChild><a href={f.url} download={f.name}><Download className="h-4 w-4" /></a></Button>
                      {canEdit && <Button size="icon" variant="ghost" onClick={() => removeFile(project.id, f.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                ))}
                {project.files.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum arquivo ainda.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative border-l border-border ml-2 space-y-4">
                {project.history.slice().reverse().map((h) => (
                  <li key={h.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-brand" />
                    <div className="text-sm font-medium">{h.message}</div>
                    <div className="text-xs text-muted-foreground">{h.actor} · {new Date(h.at).toLocaleString("pt-BR")}</div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isGestor && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => { navigate({ to: "/app/projects" }); }}>Fechar</Button>
        </div>
      )}
    </div>
  );
}
