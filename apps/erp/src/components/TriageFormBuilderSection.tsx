import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Settings2,
  Save,
} from "lucide-react";
import {
  DEFAULT_TRIAGE_FORM_CONFIG,
  type TriageFormFieldConfig,
} from "@/hooks/useTriage";

interface TriageFormBuilderSectionProps {
  initialConfig?: TriageFormFieldConfig[] | null;
  onSave: (newConfig: TriageFormFieldConfig[]) => void;
  saving?: boolean;
}

export function TriageFormBuilderSection({
  initialConfig,
  onSave,
  saving = false,
}: TriageFormBuilderSectionProps) {
  const [fields, setFields] = useState<TriageFormFieldConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Custom Field state
  const [newLabel, setNewLabel] = useState("");
  const [newInputType, setNewInputType] = useState<"text" | "textarea">("text");

  useEffect(() => {
    if (Array.isArray(initialConfig) && initialConfig.length > 0) {
      setFields(
        [...initialConfig].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      );
    } else {
      setFields([...DEFAULT_TRIAGE_FORM_CONFIG]);
    }
  }, [initialConfig]);

  const handleToggleEnabled = (key: string) => {
    setFields((prev) =>
      prev.map((f) => (f.field_key === key ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFields((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next.map((f, i) => ({ ...f, order: i + 1 }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    setFields((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next.map((f, i) => ({ ...f, order: i + 1 }));
    });
  };

  const handleDeleteCustomField = (key: string) => {
    setFields((prev) => prev.filter((f) => f.field_key !== key).map((f, i) => ({ ...f, order: i + 1 })));
  };

  const handleAddCustomField = () => {
    if (!newLabel.trim()) {
      toast.error("Informe a pergunta/rótulo do campo.");
      return;
    }

    const customKey = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newField: TriageFormFieldConfig = {
      field_key: customKey,
      label: newLabel.trim(),
      type: "customizado",
      input_type: newInputType,
      enabled: true,
      order: fields.length + 1,
    };

    setFields((prev) => [...prev, newField]);
    setNewLabel("");
    setNewInputType("text");
    setShowAddModal(false);
    toast.success("Campo customizado adicionado ao formulário.");
  };

  const handleSaveConfig = () => {
    const updated = fields.map((f, i) => ({ ...f, order: i + 1 }));
    onSave(updated);
  };

  return (
    <Card className="shadow-xs border border-border bg-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Settings2 className="h-4.5 w-4.5 text-indigo-600" />
            Configurar Formulário de Candidatura
          </CardTitle>
          <CardDescription className="text-xs">
            Escolha quais campos aparecem na página pública e adicione perguntas personalizadas para esta vaga.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Adicionar Campo Customizado
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Campo Customizado</DialogTitle>
                <DialogDescription>
                  Crie uma pergunta personalizada para os freelancers que se candidatarem a este projeto.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-label">Pergunta / Rótulo do Campo</Label>
                  <Input
                    id="custom-label"
                    placeholder="Ex: Você possui experiência prévia com Meta Ads?"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-type">Tipo de Resposta</Label>
                  <Select
                    value={newInputType}
                    onValueChange={(val) => setNewInputType(val as "text" | "textarea")}
                  >
                    <SelectTrigger id="custom-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto Curto (Input)</SelectItem>
                      <SelectItem value="textarea">Texto Longo (Textarea)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleAddCustomField} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Adicionar ao Formulário
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            onClick={handleSaveConfig}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Salvando..." : "Salvar Estrutura"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y border border-border rounded-xl bg-muted/20">
          {fields.map((field, index) => (
            <div
              key={field.field_key}
              className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                !field.enabled ? "opacity-50 bg-muted/40" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Reorder controls */}
                <div className="flex flex-col gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    title="Mover para cima"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    disabled={index === fields.length - 1}
                    onClick={() => handleMoveDown(index)}
                    title="Mover para baixo"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground truncate max-w-sm">
                      {field.label}
                    </span>
                    {field.type === "padrao" ? (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Padrão
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-indigo-200 text-indigo-700 bg-indigo-50"
                      >
                        Customizado ({field.input_type === "textarea" ? "Longo" : "Curto"})
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Ordem #{index + 1} • {field.enabled ? "Visível no formulário" : "Oculto"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.enabled}
                    onCheckedChange={() => handleToggleEnabled(field.field_key)}
                    id={`switch-${field.field_key}`}
                  />
                  <Label
                    htmlFor={`switch-${field.field_key}`}
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    {field.enabled ? "Ativo" : "Inativo"}
                  </Label>
                </div>

                {field.type === "customizado" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                    onClick={() => handleDeleteCustomField(field.field_key)}
                    title="Remover este campo customizado"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
