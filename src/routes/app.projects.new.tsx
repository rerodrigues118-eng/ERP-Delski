import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/projects/new")({
  head: () => ({
    meta: [
      { title: "Novo projeto — Delski" },
      { name: "description", content: "Solicitar um novo projeto na Delski." },
      { property: "og:title", content: "Novo projeto — Delski" },
      { property: "og:description", content: "Formulário para criar um projeto." },
    ],
  }),
  component: NewProject,
});

const schema = z.object({
  client: z.string().min(2, "Nome do cliente é obrigatório"),
  type: z.enum(["IA", "Trafego", "Sites"]),
  description: z.string().min(10, "Descreva o escopo (mínimo 10 caracteres)"),
  deadline: z.string().min(1, "Informe o prazo"),
  budget: z.number().min(0),
  referenceLink: z.string().url("URL inválida").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

function NewProject() {
  const addProject = useStore((s) => s.addProject);
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { client: "", type: "IA", description: "", deadline: "", budget: 0, referenceLink: "" },
  });

  const onSubmit = (v: FormValues) => {
    const p = addProject({
      client: v.client, type: v.type, description: v.description,
      deadline: v.deadline, budget: Number(v.budget), referenceLink: v.referenceLink || undefined,
    });
    toast.success("Projeto criado no backlog!");
    navigate({ to: "/app/projects/$id", params: { id: p.id } });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button asChild variant="ghost" size="sm"><Link to="/app/projects"><ArrowLeft className="h-4 w-4" /> Voltar</Link></Button>
      <Card>
        <CardHeader>
          <CardTitle>Solicitar novo projeto</CardTitle>
          <p className="text-sm text-muted-foreground">O projeto entra no status "Solicitado" e pode ser delegado a um freelancer.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Nome do cliente</Label>
                <Input {...form.register("client")} />
                {form.formState.errors.client && <p className="text-xs text-destructive mt-1">{form.formState.errors.client.message}</p>}
              </div>
              <div>
                <Label>Tipo de serviço</Label>
                <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v as "IA" | "Trafego" | "Sites")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IA">Automação com IA</SelectItem>
                    <SelectItem value="Trafego">Tráfego Pago / Social Media</SelectItem>
                    <SelectItem value="Sites">Desenvolvimento de Sites</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição / Escopo</Label>
              <Textarea rows={5} {...form.register("description")} placeholder="Detalhe entregáveis, integrações, referências..." />
              {form.formState.errors.description && <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Prazo desejado</Label>
                <Input type="date" {...form.register("deadline")} />
                {form.formState.errors.deadline && <p className="text-xs text-destructive mt-1">{form.formState.errors.deadline.message}</p>}
              </div>
              <div>
                <Label>Orçamento (R$)</Label>
                <Input type="number" step="100" {...form.register("budget")} />
              </div>
            </div>
            <div>
              <Label>Link de referência (opcional)</Label>
              <Input {...form.register("referenceLink")} placeholder="https://..." />
              {form.formState.errors.referenceLink && <p className="text-xs text-destructive mt-1">{form.formState.errors.referenceLink.message}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link to="/app/projects">Cancelar</Link></Button>
              <Button type="submit">Criar projeto</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
