import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SERVICE_LABEL, SERVICE_TYPES, type ServiceType } from "@/mocks/types";
import { Copy, Download, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/proposals")({
  head: () => ({
    meta: [
      { title: "Propostas — Delski" },
      { name: "description", content: "Gerador de propostas comerciais para IA, tráfego e sites." },
      { property: "og:title", content: "Propostas — Delski" },
      { property: "og:description", content: "Crie propostas prontas para envio em poucos cliques." },
    ],
  }),
  component: ProposalsPage,
});

const templates: Record<ServiceType, { scope: string[]; deliverables: string[] }> = {
  IA: {
    scope: ["Diagnóstico do fluxo atual", "Definição do agente e integrações", "Prototipagem e testes", "Deploy e monitoramento"],
    deliverables: ["Agente conversacional treinado", "Integração com WhatsApp/CRM", "Painel de métricas", "Documentação técnica"],
  },
  Trafego: {
    scope: ["Auditoria de contas e público", "Estruturação de campanhas", "Criação de anúncios (3 formatos)", "Otimização semanal"],
    deliverables: ["Campanhas ativas em Meta e Google", "Relatórios semanais", "Criativos aprovados", "Ajustes de público e verba"],
  },
  Sites: {
    scope: ["Descoberta e wireframes", "Design UI de alta fidelidade", "Desenvolvimento responsivo", "Publicação e SEO on-page"],
    deliverables: ["Site publicado (até 5 páginas)", "Painel de conteúdo", "Integração com analytics", "Treinamento de uso"],
  },
};

function ProposalsPage() {
  const leads = useStore((s) => s.leads);

  const [leadId, setLeadId] = useState<string>("__manual");
  const [client, setClient] = useState("Cliente");
  const [service, setService] = useState<ServiceType>("Sites");
  const [value, setValue] = useState(6000);
  const [weeks, setWeeks] = useState(4);
  const [notes, setNotes] = useState("");

  const applyLead = (id: string) => {
    setLeadId(id);
    if (id === "__manual") return;
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    setClient(l.name);
    setService(l.service);
    setValue(l.estimatedValue);
    setNotes(l.notes || "");
  };

  const proposal = useMemo(() => {
    const t = templates[service];
    return [
      `# Proposta comercial — ${client}`,
      ``,
      `**Agência:** Delski  ·  **Serviço:** ${SERVICE_LABEL[service]}  ·  **Prazo estimado:** ${weeks} semana(s)`,
      ``,
      `## Contexto`,
      notes || `${client} busca uma solução de ${SERVICE_LABEL[service].toLowerCase()} para acelerar seus resultados.`,
      ``,
      `## Escopo`,
      ...t.scope.map((s) => `- ${s}`),
      ``,
      `## Entregas`,
      ...t.deliverables.map((s) => `- ${s}`),
      ``,
      `## Investimento`,
      `**R$ ${value.toLocaleString("pt-BR")}**  ·  parcelável em até 3x`,
      ``,
      `## Próximos passos`,
      `1. Aprovação desta proposta`,
      `2. Assinatura do contrato`,
      `3. Kickoff em até 3 dias úteis`,
      ``,
      `_Delski Agência — IA, Tráfego e Sites_`,
    ].join("\n");
  }, [client, service, value, weeks, notes]);

  const copy = () => { navigator.clipboard.writeText(proposal); toast.success("Proposta copiada"); };
  const download = () => {
    const blob = new Blob([proposal], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-${client.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo baixado");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Propostas comerciais</h1>
          <p className="text-sm text-muted-foreground">Gere um documento pronto para envio a partir de um lead ou do zero.</p>
        </div>
        <Badge variant="outline" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> Modelos por vertical</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Preencher a partir de lead</Label>
              <Select value={leadId} onValueChange={applyLead}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual">— Manual —</SelectItem>
                  {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente</Label>
              <Input value={client} onChange={(e) => setClient(e.target.value)} />
            </div>
            <div>
              <Label>Serviço</Label>
              <Select value={service} onValueChange={(v) => setService(v as ServiceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{SERVICE_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
              </div>
              <div>
                <Label>Prazo (semanas)</Label>
                <Input type="number" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Contexto / observações</Label>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Prévia</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copy}><Copy className="h-4 w-4" /> Copiar</Button>
              <Button size="sm" onClick={download}><Download className="h-4 w-4" /> Baixar .md</Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/40 rounded-lg p-4 border">{proposal}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
