import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FilePlus,
  UploadCloud,
  ChevronRight,
  Trash2,
  Loader2,
  CheckCircle2,
  Files,
  Sparkles,
} from "lucide-react";
import {
  useContractModels,
  useUploadContractTemplate,
  useExtractContractVariables,
  useCreateContractModel,
  useDeleteContractModel,
} from "@/hooks/useContractModels";
import type { ContractModelVariable, ContractModality } from "@/types/contract-models";

const variableOriginSuggestions: Record<string, ContractModelVariable["origin"]> = {
  nome_representante_contratante: "company",
  razao_social_nome_contratado: "freelancer",
  data_inicio: "project",
  valor_contrato: "project",
  descricao_servico: "project",
  nome_assinatura: "manual",
};

const ORIGIN_LABELS: Record<ContractModelVariable["origin"], string> = {
  company: "Empresa",
  gestor: "Gestor",
  freelancer: "Freelancer",
  client: "Cliente",
  project: "Projeto",
  manual: "Manual",
  system: "Sistema",
};

const TARGET_TYPE_LABELS: Record<"freelancer" | "client", string> = {
  freelancer: "Freelancer",
  client: "Cliente",
};

const TARGET_TYPE_BADGE_CLASSES: Record<"freelancer" | "client", string> = {
  freelancer: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30",
  client: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

const defaultVariableMap: ContractModelVariable[] = [
  {
    name: "nome_representante_contratante",
    origin: "company",
    section: "Partes",
    order: 1,
    label: "Nome do Representante Contratante",
    defaultValue: "",
  },
  {
    name: "razao_social_nome_contratado",
    origin: "freelancer",
    section: "Partes",
    order: 2,
    label: "Razão Social ou Nome do Contratado",
    defaultValue: "",
  },
];

export const Route = createFileRoute("/app/contract-models/")({
  head: () => ({
    meta: [{ title: "Modelos de Contrato — Delski ERP" }],
  }),
  component: ContractModelsPage,
});

function buildVariableMap(variableNames: string[]) {
  return variableNames.map((name, index) => ({
    name,
    origin: variableOriginSuggestions[name] ?? "manual",
    section: "Geral",
    order: index + 1,
    label: name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    defaultValue: "",
  }));
}

interface PendingFile {
  id: string;
  file: File;
  name: string;
  service_type: "IA" | "Trafego" | "Sites" | "Social Media";
  contract_type: ContractModality;
  target_type: "freelancer" | "client";
  variables: string[];
  isExtracting: boolean;
  error?: string;
}

function ContractModelsPage() {
  const navigate = useNavigate();
  const { data: models = [], isLoading } = useContractModels();
  const uploadTemplate = useUploadContractTemplate();
  const extractVariables = useExtractContractVariables();
  const createContractModel = useCreateContractModel();
  const deleteContractModel = useDeleteContractModel();

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Estado do Modal de Novo Modelo em Branco
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [newServiceType, setNewServiceType] = useState<"IA" | "Trafego" | "Sites" | "Social Media">("IA");
  const [newContractType, setNewContractType] = useState<ContractModality>("PJ");
  const [newTargetType, setNewTargetType] = useState<"freelancer" | "client">("freelancer");
  const [isCreating, setIsCreating] = useState(false);

  const handleDeleteModel = async (id: string, name: string) => {
    if (!confirm(`Tem certeza de que deseja apagar o modelo "${name}"?`)) return;
    try {
      await deleteContractModel.mutateAsync(id);
      toast.success("Modelo apagado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar modelo.");
    }
  };

  const handleOpenNewModal = () => {
    setNewModelName(`Modelo ${models.length + 1}`);
    setNewServiceType("IA");
    setNewContractType("PJ");
    setNewTargetType("freelancer");
    setIsNewModalOpen(true);
  };

  const handleConfirmCreateEmptyModel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newModelName.trim()) {
      toast.error("Informe um nome para o modelo de contrato.");
      return;
    }

    try {
      setIsCreating(true);
      const created = await createContractModel.mutateAsync({
        name: newModelName.trim(),
        service_type: newServiceType,
        contract_type: newContractType,
        target_type: newTargetType,
        docx_path: "",
        variable_map: defaultVariableMap,
        is_active: false,
      });

      toast.success("Modelo criado com sucesso! Abrindo editor...");
      setIsNewModalOpen(false);
      navigate({ to: "/app/contract-models/$id", params: { id: created.id } });
    } catch (error: any) {
      console.error("Erro ao criar modelo em branco:", error);
      toast.error(`Erro ao criar modelo: ${error?.message || "Tente novamente."}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(event.target.files ?? []);
    if (rawFiles.length === 0) return;

    // Build initial list of pending files
    const newItems: PendingFile[] = rawFiles.map((file, index) => ({
      id: `${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name
        .replace(/\.docx$/i, "")
        .replace(/[-_]+/g, " ")
        .trim(),
      service_type: "IA",
      contract_type: "PJ",
      target_type: "freelancer",
      variables: [],
      isExtracting: true,
    }));

    setPendingFiles(newItems);

    // Extract variables asynchronously for each file
    for (const item of newItems) {
      try {
        const vars = await extractVariables.mutateAsync(item.file);
        setPendingFiles((current) =>
          current.map((p) =>
            p.id === item.id ? { ...p, variables: vars, isExtracting: false } : p,
          ),
        );
      } catch (error) {
        console.error(`Erro ao extrair variáveis do arquivo ${item.file.name}:`, error);
        setPendingFiles((current) =>
          current.map((p) =>
            p.id === item.id
              ? { ...p, isExtracting: false, error: "Erro ao extrair variáveis" }
              : p,
          ),
        );
      }
    }
  };

  const handleUpdatePendingField = (
    id: string,
    field: "name" | "service_type" | "contract_type" | "target_type",
    value: string,
  ) => {
    setPendingFiles((current) => current.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleRemovePending = (id: string) => {
    setPendingFiles((current) => current.filter((p) => p.id !== id));
  };

  const handleApplyGlobalServiceType = (
    serviceType: "IA" | "Trafego" | "Sites" | "Social Media",
  ) => {
    setPendingFiles((current) => current.map((p) => ({ ...p, service_type: serviceType })));
  };

  const handleSubmitBatch = async () => {
    if (pendingFiles.length === 0) {
      toast.error("Selecione ao menos um arquivo .docx.");
      return;
    }

    const invalid = pendingFiles.find((p) => !p.name.trim());
    if (invalid) {
      toast.error(`Informe um nome para o arquivo "${invalid.file.name}".`);
      return;
    }

    try {
      setIsSubmittingBatch(true);
      let count = 0;

      for (const item of pendingFiles) {
        const upload = await uploadTemplate.mutateAsync(item.file);
        const variableMap = buildVariableMap(item.variables);

        await createContractModel.mutateAsync({
          name: item.name.trim(),
          service_type: item.service_type,
          contract_type: item.contract_type,
          target_type: item.target_type,
          docx_path: upload.path,
          variable_map: variableMap,
          is_active: false,
        });

        count++;
      }

      toast.success(
        count === 1 ? "Modelo criado com sucesso!" : `${count} modelos criados com sucesso!`,
      );
      setPendingFiles([]);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao importar modelos.");
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const anyExtracting = pendingFiles.some((p) => p.isExtracting);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Modelos de Contrato
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie modelos de contrato para automatizar a geração de documentos para freelancers e clientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleOpenNewModal}
            className="gap-2 bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-medium rounded-md shadow-xs text-xs h-9 px-4 border-0 cursor-pointer"
          >
            <FilePlus className="h-4 w-4" /> Novo Modelo em Branco
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Upload Card */}
        <Card className="space-y-4 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upload de Templates</span>
              <Badge variant="outline" className="text-xs font-normal">
                Suporta múltiplos arquivos .docx
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contract-files">Arquivos .docx</Label>
              <input
                id="contract-files"
                type="file"
                accept=".docx"
                multiple
                onChange={handleFileChange}
                className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer border border-border rounded-xl p-1 bg-muted/30"
              />
              <p className="text-[11px] text-muted-foreground">
                Dica: Você pode selecionar vários arquivos mantendo a tecla{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl</kbd> ou{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded border">Shift</kbd> pressionada.
              </p>
            </div>

            {/* Pending Files List */}
            {pendingFiles.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Files className="h-3.5 w-3.5 text-indigo-500" />
                    {pendingFiles.length}{" "}
                    {pendingFiles.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}
                  </span>

                  {pendingFiles.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Tipo global:</span>
                      <Select onValueChange={(val) => handleApplyGlobalServiceType(val as any)}>
                        <SelectTrigger className="h-7 text-xs w-[110px]">
                          <SelectValue placeholder="Aplicar a todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IA">IA</SelectItem>
                          <SelectItem value="Trafego">Trafego</SelectItem>
                          <SelectItem value="Sites">Sites</SelectItem>
                          <SelectItem value="Social Media">Social Media</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {pendingFiles.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-border/80 bg-card p-3 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-xs font-medium text-muted-foreground truncate max-w-[240px]"
                          title={item.file.name}
                        >
                          #{index + 1} — {item.file.name}
                        </span>

                        <div className="flex items-center gap-2">
                          {item.isExtracting ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Extraindo
                              variáveis...
                            </span>
                          ) : item.error ? (
                            <span className="text-[10px] font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                              {item.error}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-2.5 w-2.5" /> {item.variables.length}{" "}
                              variáveis
                            </span>
                          )}

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-red-500"
                            onClick={() => handleRemovePending(item.id)}
                            title="Remover este arquivo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Nome do Modelo
                          </Label>
                          <Input
                            size={1}
                            className="h-8 text-xs"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdatePendingField(item.id, "name", e.target.value)
                            }
                            placeholder="Nome do modelo"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Tipo de Serviço
                          </Label>
                          <Select
                            value={item.service_type}
                            onValueChange={(val) =>
                              handleUpdatePendingField(item.id, "service_type", val as any)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
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

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Modalidade
                          </Label>
                          <Select
                            value={item.contract_type}
                            onValueChange={(val) =>
                              handleUpdatePendingField(item.id, "contract_type", val as any)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PJ">PJ</SelectItem>
                              <SelectItem value="CLT">CLT</SelectItem>
                              <SelectItem value="Estágio">Estágio</SelectItem>
                              <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Tipo de Contrato
                          </Label>
                          <Select
                            value={item.target_type}
                            onValueChange={(val) =>
                              handleUpdatePendingField(item.id, "target_type", val as any)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="freelancer">Freelancer</SelectItem>
                              <SelectItem value="client">Cliente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full gap-2 mt-2"
                  onClick={handleSubmitBatch}
                  disabled={pendingFiles.length === 0 || isSubmittingBatch || anyExtracting}
                >
                  {isSubmittingBatch ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Importando modelos...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      {pendingFiles.length === 1
                        ? "Importar 1 Modelo"
                        : `Importar Todos os ${pendingFiles.length} Modelos`}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Models List */}
        <Card className="space-y-4 shadow-sm">
          <CardHeader>
            <CardTitle>Modelos Cadastrados ({models.length})</CardTitle>
            <CardDescription>
              Selecione um modelo para editar o mapeamento de variáveis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="rounded-2xl border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
                Carregando modelos...
              </div>
            ) : models.length === 0 ? (
              <div className="rounded-2xl border border-border bg-muted p-6 text-sm text-muted-foreground">
                Nenhum modelo encontrado.
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-border/80"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{model.name}</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {model.contract_type || "PJ"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 border ${
                              TARGET_TYPE_BADGE_CLASSES[(model as any).target_type as "freelancer" | "client"] ??
                              TARGET_TYPE_BADGE_CLASSES.freelancer
                            }`}
                          >
                            {TARGET_TYPE_LABELS[(model as any).target_type as "freelancer" | "client"] ??
                              "Freelancer"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {model.service_type} • {model.is_active ? "Ativo" : "Inativo"} •{" "}
                          {Array.isArray(model.variable_map) ? model.variable_map.length : 0}{" "}
                          variáveis
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/app/contract-models/$id" params={{ id: model.id }}>
                            <span className="flex items-center gap-2">
                              <ChevronRight className="h-4 w-4" /> Abrir
                            </span>
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDeleteModel(model.id, model.name)}
                          title="Apagar modelo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Criação de Novo Modelo em Branco */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border rounded-2xl p-6 space-y-4">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <FilePlus className="h-5 w-5 text-blue-600" />
              Novo Modelo de Contrato em Branco
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crie a estrutura inicial do modelo para configurar o mapeamento de variáveis e vincular o arquivo .docx.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmCreateEmptyModel} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-model-name" className="text-xs font-semibold">
                Nome do Modelo <span className="text-blue-600">*</span>
              </Label>
              <Input
                id="new-model-name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Ex: Contrato de Prestação de Serviços PJ"
                className="h-10 text-xs"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-target-type" className="text-xs font-semibold">
                  Destinatário
                </Label>
                <Select
                  value={newTargetType}
                  onValueChange={(val: "freelancer" | "client") => setNewTargetType(val)}
                >
                  <SelectTrigger id="new-target-type" className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-contract-type" className="text-xs font-semibold">
                  Modalidade
                </Label>
                <Select
                  value={newContractType}
                  onValueChange={(val: ContractModality) => setNewContractType(val)}
                >
                  <SelectTrigger id="new-contract-type" className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="Avulso">Avulso</SelectItem>
                    <SelectItem value="Recorrente">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-service-type" className="text-xs font-semibold">
                Área de Serviço
              </Label>
              <Select
                value={newServiceType}
                onValueChange={(val: "IA" | "Trafego" | "Sites" | "Social Media") => setNewServiceType(val)}
              >
                <SelectTrigger id="new-service-type" className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IA">Inteligência Artificial (IA)</SelectItem>
                  <SelectItem value="Trafego">Tráfego Pago</SelectItem>
                  <SelectItem value="Sites">Desenvolvimento de Sites</SelectItem>
                  <SelectItem value="Social Media">Social Media & Conteúdo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewModalOpen(false)}
                disabled={isCreating}
                className="h-9 px-4 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Criar e Abrir Editor
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
