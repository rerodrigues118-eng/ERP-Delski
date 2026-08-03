import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Mail, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { sendWelcomeEmail } from "@/integrations/brevo";
import { toast } from "sonner";
import { useFreelancers } from "@/hooks/useProfiles";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/app/freelancers/")({
  head: () => ({
    meta: [
      { title: "Freelancers — Delski" },
      { name: "description", content: "Time de especialistas parceiros da agência Delski." },
    ],
  }),
  component: FreelancersPage,
});

function FreelancersPage() {
  const navigate = useNavigate();
  const { isGestor, loading: authLoading } = useAuth();
  const { data: freelancers = [], isLoading } = useFreelancers();
  const { data: projects = [] } = useProjects();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Only redirect AFTER auth has finished loading and confirmed user is not Gestor
    if (!authLoading && !isGestor) {
      navigate({ to: "/app/projects", replace: true });
    }
  }, [isGestor, authLoading, navigate]);

  // Show loading while auth is resolving the role
  if (authLoading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!isGestor) return null;

  const submit = async () => {
    if (!name || !email) return toast.error("Preencha nome e e-mail");
    setSaving(true);

    try {
      const { data: existingProfile, error: existingError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", email)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingProfile) {
        if ((existingProfile as any).role !== "freelancer") {
          toast.error(
            "Já existe um perfil com este e-mail, mas ele não está cadastrado como freelancer.",
          );
          return;
        }

        sendWelcomeEmail({ name, email });
        queryClient.invalidateQueries({ queryKey: ["freelancers"] });
        setOpen(false);
        setName("");
        setEmail("");
        toast.success("Freelancer já cadastrado. E-mail de convite reenviado.");
        return;
      }

      const { error } = await (supabase.from("profiles") as any).insert({
        id: crypto.randomUUID(),
        full_name: name,
        email,
        role: "freelancer",
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("duplicate") ||
          error.message.toLowerCase().includes("unique")
        ) {
          toast.error("Já existe um freelancer com este e-mail. Verifique o cadastro.");
        } else if (
          error.message.includes("profiles_id_fkey") ||
          error.message.includes("foreign key")
        ) {
          toast.error(
            "Restrição no Supabase: A tabela profiles exige o comando SQL 'ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;' no Supabase Editor para permitir cadastros manuais.",
            { duration: 8000 },
          );
        } else {
          toast.error(`Erro ao salvar no banco: ${error.message}`);
        }
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
            Freelancers
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {freelancers.length} cadastrado(s) na tabela public.profiles
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-950 text-white font-medium rounded-md shadow-none gap-1.5 h-9 px-4 text-xs">
              <Plus className="h-4 w-4" /> Novo Freelancer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl font-bold">
                Cadastrar Novo Freelancer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ana Ribeiro"
                />
              </div>
              <div>
                <Label>E-mail Corporativo</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ana@delski.co"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={saving}
                className="bg-blue-900 hover:bg-blue-950 text-white font-medium rounded-md gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Cadastrar no Banco
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-stone-200/80 bg-white rounded-lg shadow-subtle">
        <CardHeader>
          <CardTitle className="text-base font-serif font-bold flex items-center justify-between">
            <span>Time de Freelancers Cadastrados</span>
            <Badge
              variant="outline"
              className="text-xs border-stone-200 bg-stone-50 text-stone-600"
            >
              <ShieldCheck className="h-3 w-3 mr-1" /> RLS Supabase Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-900" />
              <span>Buscando freelancers do Supabase...</span>
            </div>
          )}

          {!isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2.5">Nome</th>
                    <th className="text-left px-3 py-2.5">E-mail</th>
                    <th className="text-left px-3 py-2.5">Status</th>
                    <th className="text-left px-3 py-2.5">Projetos</th>
                    <th className="text-right px-3 py-2.5">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {freelancers.map((f) => {
                    const count = projects.filter((p) =>
                      p.freelancers?.some((pf: any) => {
                        const pfId = pf?.id || pf?.profile?.id;
                        const pfEmail = pf?.email || pf?.profile?.email;
                        return (
                          (f.id && pfId === f.id) ||
                          (f.email && pfEmail?.toLowerCase() === f.email?.toLowerCase())
                        );
                      }),
                    ).length;

                    const isContractComplete = f.contract_fields_status === "completo";
                    const docStatus = f.documents_status ?? "pendente";

                    let statusLabel = "Cadastro Incompleto";
                    let statusBadgeClass =
                      "bg-stone-100 text-stone-700 border-stone-200 font-medium text-xs";

                    if (docStatus === "aprovado") {
                      statusLabel = "APROVADO";
                      statusBadgeClass =
                        "bg-green-100 text-green-900 border-green-300 font-bold text-xs shadow-sm hover:bg-green-100";
                    } else if (docStatus === "rejeitado") {
                      statusLabel = "Adequação Solicitada";
                      statusBadgeClass =
                        "bg-rose-50 text-rose-800 border-rose-200 font-medium text-xs";
                    } else if (docStatus === "em_analise") {
                      statusLabel = "Em Análise";
                      statusBadgeClass =
                        "bg-amber-50 text-amber-800 border-amber-200 font-medium text-xs";
                    } else {
                      statusLabel = "Cadastro Incompleto";
                      statusBadgeClass =
                        "bg-stone-100 text-stone-700 border-stone-200 font-medium text-xs";
                    }

                    return (
                      <tr key={f.id}>
                        <td className="px-3 py-3 font-medium">
                          <Link
                            to="/app/freelancers/$id"
                            params={{ id: f.id }}
                            className="hover:underline text-blue-900 font-medium"
                          >
                            {f.full_name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{f.email}</td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className={statusBadgeClass}>
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 font-semibold">{count} projeto(s)</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                              <Link to="/app/freelancers/$id" params={{ id: f.id }}>
                                Ver Ficha
                              </Link>
                            </Button>
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
                          </div>
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
