import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BookOpen, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { WikiArticle } from "@/mocks/types";

export const Route = createFileRoute("/app/wiki")({
  head: () => ({
    meta: [
      { title: "Wiki & SOPs — Delski" },
      { name: "description", content: "Base de conhecimento interna da Delski: prompts, padrões e boas práticas." },
      { property: "og:title", content: "Wiki & SOPs — Delski" },
      { property: "og:description", content: "Manual interno da agência Delski." },
    ],
  }),
  component: WikiPage,
});

const CATEGORIES: WikiArticle["category"][] = ["Geral", "IA", "Trafego", "Sites"];

const catColor: Record<WikiArticle["category"], string> = {
  Geral: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  IA: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  Trafego: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Sites: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

function WikiPage() {
  const wiki = useStore((s) => s.wiki);
  const saveWiki = useStore((s) => s.saveWiki);
  const removeWiki = useStore((s) => s.removeWiki);
  const user = useStore((s) => s.user);
  const isGestor = user?.role === "gestor";

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | WikiArticle["category"]>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<WikiArticle> | null>(null);

  const filtered = useMemo(() => wiki.filter((a) => {
    const okCat = cat === "all" || a.category === cat;
    const okQ = !q || a.title.toLowerCase().includes(q.toLowerCase()) || a.content.toLowerCase().includes(q.toLowerCase());
    return okCat && okQ;
  }), [wiki, q, cat]);

  const current = wiki.find((a) => a.id === selected) || filtered[0];

  const submit = () => {
    if (!editing?.title || !editing.content || !editing.category) return toast.error("Preencha título, categoria e conteúdo.");
    saveWiki({ id: editing.id, title: editing.title, category: editing.category, content: editing.content });
    toast.success("Artigo salvo.");
    setEditing(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><BookOpen className="h-6 w-6" /> Wiki & SOPs</h1>
          <p className="text-sm text-muted-foreground">Padrões, prompts validados e guias operacionais da Delski.</p>
        </div>
        {isGestor && (
          <Button onClick={() => setEditing({ title: "", category: "Geral", content: "" })}><Plus className="h-4 w-4" /> Novo artigo</Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-8" />
            </div>
            <Select value={cat} onValueChange={(v) => setCat(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filtered.map((a) => (
                <button key={a.id} onClick={() => setSelected(a.id)} className={`w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors ${current?.id === a.id ? "bg-accent" : ""}`}>
                  <div className="font-medium truncate">{a.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={catColor[a.category]}>{a.category}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(a.updatedAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">Nenhum artigo.</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          {current ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>{current.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={catColor[current.category]}>{current.category}</Badge>
                    <span className="text-xs text-muted-foreground">Atualizado em {new Date(current.updatedAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                {isGestor && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(current)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { removeWiki(current.id); setSelected(null); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{current.content}</div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-16 text-center text-sm text-muted-foreground">Selecione um artigo à esquerda.</CardContent>
          )}
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar artigo" : "Novo artigo"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Título</Label><Input value={editing?.title || ""} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={editing?.category || "Geral"} onValueChange={(v) => setEditing({ ...editing!, category: v as WikiArticle["category"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Conteúdo</Label><Textarea rows={12} value={editing?.content || ""} onChange={(e) => setEditing({ ...editing!, content: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={submit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
