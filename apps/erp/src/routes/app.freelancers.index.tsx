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
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label mb-1">Equipe</p>
          <h1 className="page-title">Freelancers</h1>
          <p className="text-sm text-gray-400 mt-1">{freelancers.length} cadastrado(s) na plataforma</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-none gap-1.5">
              <Plus className="h-4 w-4" /> Novo Freelancer
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Cadastrar Novo Freelancer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">Nome Completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ana Ribeiro"
                  className="rounded-xl h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">E-mail Corporativo</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ana@delski.co"
                  className="rounded-xl h-10"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-[14px] font-bold text-gray-900">Time de Freelancers</h2>
          <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
            {freelancers.length} registros
          </span>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm text-gray-400">Buscando freelancers...</span>
          </div>
        )}

        {!isLoading && (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Freelancer</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Projetos</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
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

                const docStatus = f.documents_status ?? "pendente";

                const { label: statusLabel, cls: statusCls } =
                  docStatus === "aprovado"
                    ? { label: "Aprovado", cls: "badge-green" }
                    : docStatus === "rejeitado"
                      ? { label: "Adequação Solicitada", cls: "badge-red" }
                      : docStatus === "em_analise"
                        ? { label: "Em Análise", cls: "badge-purple" }
                        : { label: "Incompleto", cls: "badge-gray" };

                return (
                  <tr key={f.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-600">
                            {(f.full_name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <Link
                          to="/app/freelancers/$id"
                          params={{ id: f.id }}
                          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {f.full_name}
                        </Link>
                      </div>
                    </td>
                    <td className="text-gray-500">{f.email}</td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusCls}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm font-semibold text-gray-800">{count}</span>
                      <span className="text-xs text-gray-400 ml-1">projeto(s)</span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to="/app/freelancers/$id"
                          params={{ id: f.id }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Ver Ficha →
                        </Link>
                        <button
                          onClick={() => {
                            sendWelcomeEmail({ name: f.full_name, email: f.email });
                            toast.success(`E-mail de boas-vindas enviado para ${f.email}`);
                          }}
                          title="Reenviar boas-vindas"
                          className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {freelancers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-300">
                    Nenhum freelancer cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
