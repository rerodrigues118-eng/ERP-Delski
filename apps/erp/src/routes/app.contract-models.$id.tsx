import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Plus, Trash2 } from "lucide-react";
import {
  useContractModel,
  useToggleContractModelActive,
  useUpdateContractModel,
  useDeleteContractModel,
} from "@/hooks/useContractModels";
import type { ContractModelVariable, ContractModality } from "@/types/contract-models";

const ORIGIN_LABELS: Record<ContractModelVariable["origin"], string> = {
  company: "Empresa",
  gestor: "Gestor",
  freelancer: "Freelancer",
  project: "Projeto",
  manual: "Manual",
  system: "Sistema",
};

export const Route = createFileRoute("/app/contract-models/$id")({
  head: () => ({
    meta: [{ title: "Editar Modelo de Contrato — Delski ERP" }],
  }),
  component: ContractModelDetailPage,
});

function ContractModelDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: model, isLoading } = useContractModel(id);
  const updateContractModel = useUpdateContractModel();
  const toggleContractModelActive = useToggleContractModelActive();
  const deleteContractModel = useDeleteContractModel();

  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState<"IA" | "Trafego" | "Sites" | "Social Media">("IA");
  const [contractType, setContractType] = useState<ContractModality>("PJ");
  const [editingMap, setEditingMap] = useState<ContractModelVariable[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!model) return;
    setName(model.name);
    setServiceType((model.service_type as "IA" | "Trafego" | "Sites" | "Social Media") ?? "IA");
    setContractType((model.contract_type as ContractModality) || "PJ");
    setEditingMap(Array.isArray(model.variable_map) ? model.variable_map : []);
  }, [model]);

  const handleVariableChange = (
    index: number,
    field: keyof ContractModelVariable,
    value: string,
  ) => {
    setEditingMap((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value } as ContractModelVariable;
      return next;
    });
  };

  const handleAddVariable = () => {
    setEditingMap((current) => [
      ...current,
      {
        name: `nova_variavel_${current.length + 1}`,
        origin: "manual",
        section: "Geral",
        order: current.length + 1,
        label: "Nova Variável",
        defaultValue: "",
      },
    ]);
  };

  const handleSave = async () => {
    if (!model) return;
    try {
      setSaving(true);
      await updateContractModel.mutateAsync({
        id: model.id,
        name: name.trim() || model.name,
        service_type: serviceType,
        contract_type: contractType,
        variable_map: editingMap,
      });
      toast.success("Modelo atualizado com sucesso.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao salvar modelo.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!model) return;
    try {
      await toggleContractModelActive.mutateAsync({ id: model.id, isActive: !model.is_active });
      toast.success(model.is_active ? "Modelo desativado." : "Modelo ativado.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao alterar status do modelo.");
    }
  };

  const handleDelete = async () => {
    if (!model) return;
    if (!confirm(`Tem certeza de que deseja apagar o modelo "${model.name}"?`)) return;

    try {
      await deleteContractModel.mutateAsync(model.id);
      toast.success("Modelo apagado com sucesso.");
      navigate({ to: "/app/contract-models" });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar modelo.");
    }
  };

  if (isLoading || !model) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Modelo</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Ajuste os metadados e o mapeamento de variáveis do template.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/contract-models">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
          </Button>
          <Button
            variant={model.is_active ? "secondary" : "default"}
            size="sm"
            onClick={handleToggleActive}
            className="gap-2"
          >
            {model.is_active ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {model.is_active ? "Desativar" : "Ativar"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            <Check className="h-4 w-4" /> Salvar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteContractModel.isPending}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Dados do Modelo</CardTitle>
            <CardDescription>Nome, tipo de serviço, modalidade e arquivo vinculado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Modelo</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_type">Tipo de Serviço</Label>
                <Select
                  value={serviceType}
                  onValueChange={(value) =>
                    setServiceType(value as "IA" | "Trafego" | "Sites" | "Social Media")
                  }
                >
                  <SelectTrigger id="service_type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IA">IA</SelectItem>
                    <SelectItem value="Trafego">Trafego</SelectItem>
                    <SelectItem value="Sites">Sites</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_type">Modalidade do Contrato</Label>
                <Select
                  value={contractType}
                  onValueChange={(value) => setContractType(value as ContractModality)}
                >
                  <SelectTrigger id="contract_type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">PJ (Pessoa Jurídica)</SelectItem>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="Estágio">Estágio</SelectItem>
                    <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-muted p-4">
              <p className="text-sm text-muted-foreground">Caminho do documento</p>
              <p className="mt-2 text-sm font-medium break-words">
                {model.docx_path || "Nenhum arquivo vinculado"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Variáveis do Modelo</CardTitle>
            <CardDescription>Defina origem e valor padrão para cada variável.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingMap.length === 0 ? (
              <div className="rounded-2xl border border-border bg-muted p-6 text-sm text-muted-foreground">
                Nenhuma variável mapeada no template.
              </div>
            ) : (
              <div className="space-y-4">
                {editingMap.map((variable, index) => (
                  <div
                    key={`${variable.name}-${index}`}
                    className="grid gap-3 rounded-3xl border border-border p-4 sm:grid-cols-[1.25fr_0.75fr_0.9fr]"
                  >
                    <div>
                      <p className="text-sm font-semibold">{variable.label}</p>
                      <p className="text-xs text-muted-foreground">{variable.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`origin-${index}`}>Origem</Label>
                      <Select
                        value={variable.origin}
                        onValueChange={(value) => handleVariableChange(index, "origin", value)}
                      >
                        <SelectTrigger id={`origin-${index}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ORIGIN_LABELS).map(([origin, label]) => (
                            <SelectItem key={origin} value={origin}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`default-${index}`}>Valor padrão</Label>
                      <Input
                        id={`default-${index}`}
                        value={variable.defaultValue ?? ""}
                        onChange={(event) =>
                          handleVariableChange(index, "defaultValue", event.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleAddVariable} className="gap-2">
                <Plus className="h-4 w-4" /> Nova variável
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
