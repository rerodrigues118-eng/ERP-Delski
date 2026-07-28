import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Mail, Loader2, ShieldCheck } from "lucide-react";
import { sendWelcomeEmail } from "@/integrations/brevo";
import { toast } from "sonner";
import { useFreelancers } from "@/hooks/useProfiles";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/freelancers")({
  head: () => ({
    meta: [
      { title: "Freelancers — Delski" },
      { name: "description", content: "Cadastre e gerencie freelancers da agência Delski." },
    ],
  }),
  component: FreelancersPage,
});

function FreelancersPage() {
  const { data: freelancers = [], isLoading } = useFreelancers();
  const { data: projects = [] } = useProjects();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name || !email) return toast.error("Preencha nome e e-mail");
    setSaving(true);
    try {
      // Direct insertion into public.profiles for freelancer role
      const { error } = await supabase.from("profiles").insert({
        id: crypto.randomUUID(),
        full_name: name,
        email: email,
        role: "freelancer",
      });

      if (error) {
        toast.error(`Erro ao salvar no banco: ${error.message}`);
        return;
      }

      sendWelcomeEmail({ name, email });
      queryClient.invalidateQueries({ queryKey: ["freelancers"] });
      setOpen(false);
      setName("");
      setEmail("");
      toast.success("Freelancer cadastrado no banco Supabase!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Freelancers</h1>
          <p className="text-sm text-muted-foreground">
            {freelancers.length} cadastrado(s) na tabela public.profiles
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
              <Plus className="h-4 w-4" /> Novo Freelancer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Freelancer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome Completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Ana Ribeiro" />
              </div>
              <div>
                <Label>E-mail Corporativo</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@delski.co" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Cadastrar no Banco
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Time de Freelancers Cadastrados</span>
            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="h-3 w-3 mr-1" /> RLS Supabase Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              <span>Buscando freelancers do Supabase...</span>
            </div>
          )}

          {!isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Nome</th>
                    <th className="text-left px-3 py-2">E-mail</th>
                    <th className="text-left px-3 py-2">Função</th>
                    <th className="text-left px-3 py-2">Projetos Alocados</th>
                    <th className="text-right px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {freelancers.map((f) => {
                    const count = projects.filter((p) =>
                      p.freelancers?.some((pf) => pf.profile?.id === f.id)
                    ).length;
                    return (
                      <tr key={f.id}>
                        <td className="px-3 py-3 font-medium">{f.full_name}</td>
                        <td className="px-3 py-3 text-muted-foreground">{f.email}</td>
                        <td className="px-3 py-3">
                          <Badge variant="secondary" className="capitalize">{f.role}</Badge>
                        </td>
                        <td className="px-3 py-3 font-semibold">{count} projeto(s)</td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              sendWelcomeEmail({ name: f.full_name, email: f.email });
                              toast.success(`E-mail de boas-vindas enviado para ${f.email}`);
                            }}
                            title="Reenviar boas-vindas via Brevo"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {freelancers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum freelancer cadastrado no banco de dados ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
