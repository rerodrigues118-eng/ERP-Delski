import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Mail } from "lucide-react";
import { SERVICE_TYPES, SERVICE_LABEL, type ServiceType } from "@/mocks/types";
import { sendWelcomeEmail } from "@/integrations/brevo";
import { toast } from "sonner";

export const Route = createFileRoute("/app/freelancers")({
  head: () => ({
    meta: [
      { title: "Freelancers — Delski" },
      { name: "description", content: "Cadastre e gerencie freelancers da agência Delski." },
      { property: "og:title", content: "Freelancers — Delski" },
      { property: "og:description", content: "Gestão de freelancers Delski." },
    ],
  }),
  component: FreelancersPage,
});

function FreelancersPage() {
  const freelancers = useStore((s) => s.freelancers);
  const projects = useStore((s) => s.projects);
  const add = useStore((s) => s.addFreelancer);
  const toggle = useStore((s) => s.toggleFreelancerActive);
  const remove = useStore((s) => s.removeFreelancer);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [skills, setSkills] = useState<ServiceType[]>([]);

  const submit = () => {
    if (!name || !email) return toast.error("Preencha nome e e-mail");
    const f = add({ name, email, skills, active: true });
    sendWelcomeEmail({ name: f.name, email: f.email });
    setOpen(false); setName(""); setEmail(""); setSkills([]);
    toast.success("Freelancer cadastrado");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Freelancers</h1>
          <p className="text-sm text-muted-foreground">{freelancers.length} cadastrado(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Novo freelancer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo freelancer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div>
                <Label>Habilidades</Label>
                <div className="flex flex-col gap-2 mt-1">
                  {SERVICE_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={skills.includes(t)} onCheckedChange={(c) => setSkills(c ? [...skills, t] : skills.filter((s) => s !== t))} />
                      {SERVICE_LABEL[t]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Time</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Nome</th>
                  <th className="text-left px-3 py-2">E-mail</th>
                  <th className="text-left px-3 py-2">Habilidades</th>
                  <th className="text-left px-3 py-2">Projetos</th>
                  <th className="text-left px-3 py-2">Ativo</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {freelancers.map((f) => {
                  const count = projects.filter((p) => p.freelancerId === f.id).length;
                  return (
                    <tr key={f.id}>
                      <td className="px-3 py-3 font-medium">{f.name}</td>
                      <td className="px-3 py-3">{f.email}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {f.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                        </div>
                      </td>
                      <td className="px-3 py-3">{count}</td>
                      <td className="px-3 py-3"><Switch checked={f.active} onCheckedChange={() => toggle(f.id)} /></td>
                      <td className="px-3 py-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => sendWelcomeEmail({ name: f.name, email: f.email })} title="Reenviar boas-vindas"><Mail className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
                {freelancers.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum freelancer.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
