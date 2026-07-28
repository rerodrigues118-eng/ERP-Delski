import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  STATUSES, STATUS_LABEL, SERVICE_LABEL, TASK_STATUSES,
  type ProjectStatus, type TaskStatus,
} from "@/mocks/types";
import {
  ArrowLeft, Check, Copy, Download, Link2, Mail, Plus, Send, Trash2, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useRef, useState } from "react";
import { sendDelegationEmail, sendStatusChangeEmail, sendTriageInviteEmail } from "@/integrations/brevo";

export const Route = createFileRoute("/app/projects/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do projeto — Delski" },
      { name: "description", content: "Detalhes, briefing, triagem, cronograma e arquivos do projeto." },
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
  const updateBriefing = useStore((s) => s.updateProjectBriefing);
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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
          {isGestor && <TabsTrigger value="triagem">Triagem</TabsTrigger>}
          {isGestor && <TabsTrigger value="delegation">Delegação</TabsTrigger>}
          <TabsTrigger value="gantt">Cronograma</TabsTrigger>
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

        <TabsContent value="briefing" className="space-y-4">
          <BriefingBlock
            value={project.briefing || ""}
            canEdit={canEdit}
            onSave={(v) => { updateBriefing(project.id, v); toast.success("Briefing atualizado"); }}
          />
        </TabsContent>

        {isGestor && (
          <TabsContent value="triagem" className="space-y-4">
            <TriageBlock projectId={project.id} />
          </TabsContent>
        )}

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

                <div className="pt-2 border-t">
                  <Label className="mb-2 block">Portal do cliente (link white-label)</Label>
                  {project.clientToken ? (
                    <div className="flex items-center gap-2">
                      <Input readOnly value={clientUrl} />
                      <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(clientUrl); toast.success("Link copiado!"); }}><Copy className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => { genClientToken(project.id); toast.success("Portal do cliente ativado!"); }}><Link2 className="h-4 w-4" /> Gerar portal do cliente</Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">O cliente vê progresso e entregas, sem acesso aos dados internos ou freelancers.</p>
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

        <TabsContent value="gantt" className="space-y-4">
          <GanttBlock projectId={project.id} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Google Drive</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label>Link da pasta oficial do projeto</Label>
              <div className="flex gap-2">
                <Input value={project.driveLink || ""} onChange={(e) => setDrive(project.id, e.target.value)} placeholder="https://drive.google.com/..." disabled={!canEdit} />
                {project.driveLink && (
                  <Button variant="outline" asChild><a href={project.driveLink} target="_blank" rel="noreferrer">Abrir</a></Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Documentos grandes ficam no Drive. Uploads rápidos abaixo (armazenados no Storage).</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Arquivos rápidos</CardTitle></CardHeader>
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

/* -------------------------------- Briefing -------------------------------- */

function BriefingBlock({ value, canEdit, onSave }: { value: string; canEdit: boolean; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Briefing centralizado</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Markdown suportado (#, **, listas). Fica visível para o freelancer responsável.</p>
        </div>
        {canEdit && !editing && (
          <Button size="sm" variant="outline" onClick={() => { setDraft(value); setEditing(true); }}>Editar</Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Textarea rows={14} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-sm" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}>Salvar briefing</Button>
            </div>
          </div>
        ) : value ? (
          <MarkdownView content={value} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum briefing ainda. {canEdit && "Clique em Editar para adicionar."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MarkdownView({ content }: { content: string }) {
  // Renderização leve de markdown (# ## ###, **negrito**, - listas).
  const lines = content.split("\n");
  const html: string[] = [];
  let inList = false;
  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>');
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^-\s+/.test(line)) {
      if (!inList) { html.push("<ul class='list-disc pl-5 space-y-1'>"); inList = true; }
      html.push(`<li>${inline(line.replace(/^-\s+/, ""))}</li>`);
      continue;
    }
    if (inList) { html.push("</ul>"); inList = false; }
    if (/^###\s+/.test(line)) html.push(`<h4 class='text-sm font-semibold mt-3'>${inline(line.slice(4))}</h4>`);
    else if (/^##\s+/.test(line)) html.push(`<h3 class='text-base font-semibold mt-4'>${inline(line.slice(3))}</h3>`);
    else if (/^#\s+/.test(line)) html.push(`<h2 class='text-lg font-semibold mt-4'>${inline(line.slice(2))}</h2>`);
    else if (line.trim() === "") html.push("<div class='h-2'></div>");
    else html.push(`<p class='text-sm'>${inline(line)}</p>`);
  }
  if (inList) html.push("</ul>");
  return <div className="space-y-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: html.join("") }} />;
}

/* --------------------------------- Triage --------------------------------- */

function TriageBlock({ projectId }: { projectId: string }) {
  const freelancers = useStore((s) => s.freelancers);
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const applications = useStore((s) => s.applications.filter((a) => a.projectId === projectId));
  const invite = useStore((s) => s.inviteFreelancerToProject);
  const select = useStore((s) => s.selectApplication);
  const remove = useStore((s) => s.removeApplication);
  const [open, setOpen] = useState(false);
  const [freelancerId, setFreelancerId] = useState<string>("");

  const invitableFreelancers = freelancers.filter(
    (f) => f.active && !applications.some((a) => a.freelancerId === f.id),
  );

  const doInvite = () => {
    if (!freelancerId) return toast.error("Escolha um freelancer");
    const app = invite(projectId, freelancerId);
    const f = freelancers.find((x) => x.id === freelancerId);
    if (app && f) {
      const link = `${typeof window !== "undefined" ? window.location.origin : ""}/triagem/${app.token}`;
      navigator.clipboard.writeText(link).catch(() => {});
      sendTriageInviteEmail({ to: { name: f.name, email: f.email }, projectClient: project?.client || "", triageLink: link });
      toast.success("Convite enviado — link copiado");
    }
    setOpen(false); setFreelancerId("");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Triagem de freelancers</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Convide candidatos, receba respostas de capacidade, prazo e valor e escolha com 1 clique.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Convidar freelancer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Convidar para triagem</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Freelancer</Label>
              <Select value={freelancerId} onValueChange={setFreelancerId}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {invitableFreelancers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name} — {f.skills.join(", ")}</SelectItem>
                  ))}
                  {invitableFreelancers.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">Todos já foram convidados.</div>}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Um link exclusivo será gerado e copiado para você compartilhar.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={doInvite}><Send className="h-4 w-4" /> Enviar convite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {applications.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum candidato convidado ainda.</p>
        )}
        {applications.map((app) => {
          const f = freelancers.find((x) => x.id === app.freelancerId);
          const link = `${typeof window !== "undefined" ? window.location.origin : ""}/triagem/${app.token}`;
          return (
            <div key={app.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm">{f?.name || "Freelancer"}</div>
                  <Badge variant={
                    app.status === "Selecionada" ? "default" :
                    app.status === "Respondida" ? "secondary" :
                    app.status === "Recusada" ? "outline" : "outline"
                  }>{app.status}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}>
                    <Copy className="h-3.5 w-3.5" /> Link
                  </Button>
                  {app.status === "Respondida" && (
                    <Button size="sm" onClick={() => { select(app.id); toast.success(`${f?.name} selecionado`); }}>
                      <Check className="h-3.5 w-3.5" /> Selecionar
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(app.id)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {app.status !== "Pendente" ? (
                <div className="grid gap-2 sm:grid-cols-4 text-xs">
                  <Field label="Capacidade" value={app.capacity} />
                  <Field label="Disponível em" value={app.availability ? new Date(app.availability).toLocaleDateString("pt-BR") : "—"} />
                  <Field label="Prazo proposto" value={app.proposedDeadline ? new Date(app.proposedDeadline).toLocaleDateString("pt-BR") : "—"} />
                  <Field label="Valor proposto" value={app.proposedValue ? `R$ ${app.proposedValue.toLocaleString("pt-BR")}` : "—"} />
                  {app.notes && (
                    <div className="sm:col-span-4">
                      <div className="text-muted-foreground">Notas</div>
                      <div className="whitespace-pre-wrap">{app.notes}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Aguardando resposta · convidado em {new Date(app.invitedAt).toLocaleDateString("pt-BR")}</div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}

/* ---------------------------------- Gantt --------------------------------- */

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
};
const diffDays = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5);

function GanttBlock({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const tasks = useStore((s) => s.tasks.filter((t) => t.projectId === projectId));
  const addTask = useStore((s) => s.addTask);
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const shiftCascade = useStore((s) => s.shiftTaskCascade);
  const rebaseline = useStore((s) => s.rebaselineTasks);
  const removeTask = useStore((s) => s.removeTask);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", startDate: todayIso(), dueDate: addDays(todayIso(), 5), predecessorId: "" });
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "resize"; startX: number; startIso: string; dueIso: string; deltaDays: number } | null>(null);

  const { rangeStart, totalDays } = useMemo(() => {
    if (tasks.length === 0) return { rangeStart: todayIso(), totalDays: 21 };
    const starts = tasks.map((t) => new Date(t.startDate).getTime());
    const ends = tasks.map((t) => new Date(t.dueDate).getTime());
    const baselineEnds = tasks.map((t) => new Date(t.baselineDue || t.dueDate).getTime());
    const min = Math.min(...starts, new Date(todayIso()).getTime());
    const max = Math.max(...ends, ...baselineEnds);
    const startIso = new Date(min).toISOString().slice(0, 10);
    const days = Math.max(diffDays(startIso, new Date(max).toISOString().slice(0, 10)) + 3, 21);
    return { rangeStart: startIso, totalDays: days };
  }, [tasks]);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [tasks],
  );

  const blocked = (t: (typeof tasks)[number]) => {
    if (!t.predecessorId) return false;
    const pred = tasksById.get(t.predecessorId);
    return !!pred && pred.status !== "Concluida";
  };

  const todayOffset = Math.max(0, diffDays(rangeStart, todayIso()));

  // ---------- Drag & drop ----------
  const pxPerDay = () => {
    const w = trackRef.current?.getBoundingClientRect().width || 0;
    return w > 0 ? w / totalDays : 0;
  };

  const onPointerDown = (e: React.PointerEvent, task: (typeof tasks)[number], mode: "move" | "resize") => {
    if (!canEdit) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: task.id, mode, startX: e.clientX, startIso: task.startDate, dueIso: task.dueDate, deltaDays: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const px = pxPerDay();
    if (px === 0) return;
    const delta = Math.round((e.clientX - drag.startX) / px);
    if (delta !== drag.deltaDays) setDrag({ ...drag, deltaDays: delta });
  };

  const onPointerUp = () => {
    if (!drag) return;
    const { id, mode, startIso, dueIso, deltaDays } = drag;
    setDrag(null);
    if (deltaDays === 0) return;
    let newStart = startIso;
    let newDue = dueIso;
    if (mode === "move") {
      newStart = addDays(startIso, deltaDays);
      newDue = addDays(dueIso, deltaDays);
    } else {
      // resize: nunca menor que a data de início
      const proposed = addDays(dueIso, deltaDays);
      newDue = new Date(proposed).getTime() < new Date(startIso).getTime() ? startIso : proposed;
    }
    shiftCascade(id, newStart, newDue);
    const t = tasks.find((x) => x.id === id);
    const baselineDue = t?.baselineDue;
    if (baselineDue) {
      const delay = diffDays(baselineDue, newDue);
      if (delay > 0) toast.warning(`Cronograma deslocado · ${delay} dia(s) de atraso propagado`);
      else toast.success("Cronograma atualizado");
    } else {
      toast.success("Cronograma atualizado");
    }
  };

  const doAdd = () => {
    if (!form.title) return toast.error("Título obrigatório");
    addTask({
      projectId, title: form.title, status: "Pendente",
      startDate: form.startDate, dueDate: form.dueDate,
      predecessorId: form.predecessorId || undefined,
    });
    setOpen(false);
    setForm({ title: "", startDate: todayIso(), dueDate: addDays(todayIso(), 5), predecessorId: "" });
    toast.success("Tarefa criada");
  };

  const statusColor: Record<TaskStatus, string> = {
    Pendente: "bg-muted-foreground/50",
    "Em andamento": "bg-brand",
    Concluida: "bg-emerald-500",
    Bloqueada: "bg-destructive",
  };

  const hasDelay = sorted.some((t) => t.baselineDue && diffDays(t.baselineDue, t.dueDate) > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <CardTitle className="text-base">Cronograma (Gantt)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste a barra para mover ou a alça direita para redimensionar. Dependências recalculam em cascata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && hasDelay && (
            <Button size="sm" variant="ghost" onClick={() => { rebaseline(projectId); toast.success("Baseline redefinido"); }}>
              Redefinir baseline
            </Button>
          )}
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nova tarefa</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Início</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                    <div><Label>Prazo</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label>Depende de</Label>
                    <Select value={form.predecessorId} onValueChange={(v) => setForm({ ...form, predecessorId: v === "__none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Nenhuma</SelectItem>
                        {tasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={doAdd}>Criar tarefa</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa. Crie a primeira para montar o cronograma.</p>
        ) : (
          <div className="overflow-x-auto" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            <div className="min-w-[760px] space-y-2 select-none">
              <div className="grid grid-cols-[240px_1fr_140px_40px] items-center gap-2 text-xs text-muted-foreground uppercase">
                <div>Tarefa</div>
                <div className="relative h-5">
                  <div className="absolute inset-0 flex justify-between text-[10px] items-center">
                    <span>{new Date(rangeStart).toLocaleDateString("pt-BR")}</span>
                    <span>{new Date(addDays(rangeStart, totalDays - 1)).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <div>Status</div>
                <div></div>
              </div>

              {sorted.map((t) => {
                const isDragged = drag?.id === t.id;
                const dragDelta = isDragged ? drag!.deltaDays : 0;
                const dragMode = drag?.mode;
                const previewStart = isDragged && dragMode === "move" ? addDays(t.startDate, dragDelta) : t.startDate;
                const previewDue = isDragged
                  ? dragMode === "move"
                    ? addDays(t.dueDate, dragDelta)
                    : (new Date(addDays(t.dueDate, dragDelta)).getTime() < new Date(t.startDate).getTime() ? t.startDate : addDays(t.dueDate, dragDelta))
                  : t.dueDate;
                const startOffset = Math.max(0, diffDays(rangeStart, previewStart));
                const duration = Math.max(1, diffDays(previewStart, previewDue) + 1);
                const leftPct = (startOffset / totalDays) * 100;
                const widthPct = (duration / totalDays) * 100;
                const isBlocked = blocked(t);
                const pred = t.predecessorId ? tasksById.get(t.predecessorId) : undefined;
                const delayDays = t.baselineDue ? diffDays(t.baselineDue, previewDue) : 0;
                const baselineStartOffset = t.baselineStart ? Math.max(0, diffDays(rangeStart, t.baselineStart)) : startOffset;
                const baselineDur = t.baselineStart && t.baselineDue ? Math.max(1, diffDays(t.baselineStart, t.baselineDue) + 1) : duration;
                return (
                  <div key={t.id} className="grid grid-cols-[240px_1fr_140px_40px] items-center gap-2">
                    <div className="min-w-0 pr-2">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        <span className="truncate">{t.title}</span>
                        {delayDays > 0 && (
                          <span className="shrink-0 rounded-full bg-destructive/15 text-destructive text-[10px] px-1.5 py-0.5 font-semibold">
                            +{delayDays}d
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {new Date(previewStart).toLocaleDateString("pt-BR")} → {new Date(previewDue).toLocaleDateString("pt-BR")}
                        {pred && ` · ← "${pred.title}"`}
                      </div>
                    </div>
                    <div ref={trackRef} className="relative h-8 rounded bg-muted/40 overflow-hidden">
                      {/* linha de hoje */}
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-brand/50 pointer-events-none z-10"
                        style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                        title="Hoje"
                      />
                      {/* baseline (referência) */}
                      {t.baselineStart && t.baselineDue && delayDays !== 0 && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full border border-dashed border-muted-foreground/50 pointer-events-none"
                          style={{ left: `${(baselineStartOffset / totalDays) * 100}%`, width: `${(baselineDur / totalDays) * 100}%` }}
                          title={`Baseline: ${new Date(t.baselineStart).toLocaleDateString("pt-BR")} → ${new Date(t.baselineDue).toLocaleDateString("pt-BR")}`}
                        />
                      )}
                      {/* barra */}
                      <div
                        onPointerDown={(e) => onPointerDown(e, t, "move")}
                        className={`absolute top-1 bottom-1 rounded-md shadow-sm ${isBlocked ? "bg-destructive/80" : statusColor[t.status]} ${canEdit ? "cursor-grab active:cursor-grabbing" : ""} ${isDragged ? "ring-2 ring-brand/60 opacity-90" : ""}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`${t.title} · ${t.status}${isBlocked ? " (bloqueada)" : ""}${delayDays > 0 ? ` · +${delayDays}d atrasado` : ""}`}
                      >
                        {canEdit && (
                          <div
                            onPointerDown={(e) => onPointerDown(e, t, "resize")}
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/40 rounded-r-md"
                            title="Redimensionar"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      {canEdit ? (
                        <Select value={t.status} onValueChange={(v) => updateTaskStatus(t.id, v as TaskStatus)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{t.status}</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      {canEdit && <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-brand" /> Em andamento</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-emerald-500" /> Concluída</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-destructive/80" /> Bloqueada / atrasada</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 border-t border-dashed border-muted-foreground/70" /> Baseline</span>
          <span className="flex items-center gap-1"><span className="h-3 w-0.5 bg-brand/60" /> Hoje</span>
        </div>

        {sorted.some((t) => blocked(t)) && (
          <p className="text-xs text-destructive mt-3">
            Existem tarefas travadas por dependências não concluídas. Priorize os predecessores para destravar o cronograma.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
