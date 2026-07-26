import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { LEAD_STAGES, LEAD_STAGE_LABEL, SERVICE_TYPES, SERVICE_LABEL, type LeadStage, type ServiceType } from "@/mocks/types";
import { Plus, ArrowRight, Trash2, Rocket } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/crm")({
  head: () => ({
    meta: [
      { title: "CRM & Funil — Delski" },
      { name: "description", content: "Funil comercial da Delski: leads em prospecção até fechamento." },
      { property: "og:title", content: "CRM & Funil — Delski" },
      { property: "og:description", content: "Gestão do pipeline comercial da agência Delski." },
    ],
  }),
  component: CrmPage,
});

const money = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;
const stageColor: Record<LeadStage, string> = {
  Prospeccao: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  Reuniao: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Proposta: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  Fechado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Perdido: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function CrmPage() {
  const leads = useStore((s) => s.leads);
  const addLead = useStore((s) => s.addLead);
  const updateStage = useStore((s) => s.updateLeadStage);
  const removeLead = useStore((s) => s.removeLead);
  const convert = useStore((s) => s.convertLeadToProject);
  const navigate = useNavigate();

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", service: "Sites" as ServiceType, estimatedValue: "", notes: "" });

  const submit = () => {
    if (!form.name || !form.contact || !form.estimatedValue) return toast.error("Preencha nome, contato e valor.");
    addLead({
      name: form.name, contact: form.contact, service: form.service,
      estimatedValue: Number(form.estimatedValue), notes: form.notes,
    });
    toast.success("Lead adicionado.");
    setOpenAdd(false);
    setForm({ name: "", contact: "", service: "Sites", estimatedValue: "", notes: "" });
  };

  const totalPipeline = leads
    .filter((l) => l.stage !== "Perdido" && l.stage !== "Fechado")
    .reduce((a, l) => a + l.estimatedValue, 0);
  const closedValue = leads.filter((l) => l.stage === "Fechado").reduce((a, l) => a + l.estimatedValue, 0);

  const handleConvert = (leadId: string) => {
    const deadline = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const projectId = convert(leadId, deadline);
    if (projectId) {
      toast.success("Lead convertido em projeto.");
      navigate({ to: "/app/projects/$id", params: { id: projectId } });
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM & Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">Pipeline em aberto: <strong>{money(totalPipeline)}</strong> · Fechado: <strong className="text-emerald-600">{money(closedValue)}</strong></p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Novo lead</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome / Empresa</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Contato (e-mail ou telefone)</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Serviço</Label>
                  <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v as ServiceType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{SERVICE_LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Valor estimado (R$)</Label><Input type="number" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} /></div>
              </div>
              <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Adicionar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {LEAD_STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage);
          const total = items.reduce((a, l) => a + l.estimatedValue, 0);
          return (
            <Card key={stage} className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{LEAD_STAGE_LABEL[stage]}</span>
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
                <div className="text-xs text-muted-foreground">{money(total)}</div>
              </CardHeader>
              <CardContent className="space-y-2 min-h-[100px]">
                {items.map((l) => (
                  <div key={l.id} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{l.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{l.contact}</div>
                      </div>
                      <Badge className={stageColor[l.stage]} variant="outline">{l.service}</Badge>
                    </div>
                    <div className="text-sm font-semibold">{money(l.estimatedValue)}</div>
                    {l.notes && <div className="text-xs text-muted-foreground line-clamp-2">{l.notes}</div>}
                    <div className="flex items-center gap-1">
                      <Select value={l.stage} onValueChange={(v) => updateStage(l.id, v as LeadStage)}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{LEAD_STAGES.map((s) => <SelectItem key={s} value={s}>{LEAD_STAGE_LABEL[s]}</SelectItem>)}</SelectContent>
                      </Select>
                      {l.stage !== "Fechado" && l.stage !== "Perdido" && !l.convertedProjectId && (
                        <Button size="icon" variant="ghost" onClick={() => handleConvert(l.id)} title="Converter em projeto"><Rocket className="h-3.5 w-3.5" /></Button>
                      )}
                      {l.convertedProjectId && (
                        <Button size="icon" variant="ghost" onClick={() => navigate({ to: "/app/projects/$id", params: { id: l.convertedProjectId! } })} title="Ver projeto"><ArrowRight className="h-3.5 w-3.5" /></Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => removeLead(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Vazio</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
