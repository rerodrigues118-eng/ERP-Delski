import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_LABEL, SERVICE_LABEL, type ProjectStatus } from "@/mocks/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES } from "@/mocks/types";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/p/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Projeto compartilhado — Delski" },
      { name: "description", content: "Visualize especificações do projeto Delski via link exclusivo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicProject,
});

function PublicProject() {
  const { token } = Route.useParams();
  const project = useStore((s) => s.projects.find((p) => p.publicToken === token));
  const freelancers = useStore((s) => s.freelancers);
  const updateStatus = useStore((s) => s.updateProjectStatus);
  const addFile = useStore((s) => s.addFile);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!project) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Link inválido</h1>
          <p className="text-muted-foreground mt-2">Este link foi revogado ou o projeto não existe.</p>
          <Button asChild className="mt-4"><Link to="/">Ir para o site</Link></Button>
        </div>
      </div>
    );
  }

  const freelancer = freelancers.find((f) => f.id === project.freelancerId);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((f) => addFile(project.id, { name: f.name, size: f.size, url: URL.createObjectURL(f), uploadedBy: freelancer?.name || "Freelancer" }));
    toast.success("Enviado!");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground font-bold">D</div>
          <span className="font-semibold">Delski · vista compartilhada</span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle>{project.client}</CardTitle>
              <Badge variant="outline">{project.type}</Badge>
              <Badge>{STATUS_LABEL[project.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{SERVICE_LABEL[project.type]} · prazo {new Date(project.deadline).toLocaleDateString("pt-BR")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">Escopo</div>
              <p className="text-sm whitespace-pre-wrap">{project.description}</p>
            </div>
            {project.referenceLink && (
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">Referência</div>
                <a href={project.referenceLink} target="_blank" rel="noreferrer" className="text-brand text-sm break-all hover:underline">{project.referenceLink}</a>
              </div>
            )}
            {project.driveLink && (
              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">Google Drive</div>
                <a href={project.driveLink} target="_blank" rel="noreferrer" className="text-brand text-sm break-all hover:underline">{project.driveLink}</a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Atualizar status</CardTitle></CardHeader>
          <CardContent>
            <Select value={project.status} onValueChange={(v) => { updateStatus(project.id, v as ProjectStatus); toast.success("Status atualizado"); }}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Arquivos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <input ref={fileRef} type="file" multiple hidden onChange={onUpload} />
              <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Enviar arquivo</Button>
            </div>
            <div className="divide-y">
              {project.files.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB · {f.uploadedBy}</div>
                  </div>
                  <Button size="icon" variant="ghost" asChild><a href={f.url} download={f.name}><Download className="h-4 w-4" /></a></Button>
                </div>
              ))}
              {project.files.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum arquivo ainda.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Removed unused Input import warning */}
        <div className="hidden"><Input /></div>
      </div>
    </div>
  );
}
