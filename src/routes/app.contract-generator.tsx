import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Sparkles, AlertCircle } from "lucide-react";
import {
  useContractModels,
  useGenerateContract,
  usePreviewContractTemplate,
} from "@/hooks/useContractModels";
import { useProjects } from "@/hooks/useProjects";
import { useFreelancers } from "@/hooks/useProfiles";
import {
  resolveAllContractFields,
  DEFAULT_COMPANY_SETTINGS,
} from "@/hooks/useContractFieldResolver";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { ContractValuesForm } from "@/components/ContractValuesForm";

export const Route = createFileRoute("/app/contract-generator")({
  head: () => ({
    meta: [{ title: "Gerador de Contratos — Delski ERP" }],
  }),
  component: ContractGeneratorPage,
});

function ContractGeneratorPage() {
  const navigate = useNavigate();
  const { isGestor, loading: authLoading } = useAuth();
  const { data: models = [] } = useContractModels();
  // Only active models appear in the generator dropdown; all models are still managed on the Models page
  const activeModels = models.filter((m) => m.is_active);

  const { data: projects = [] } = useProjects();
  const { data: freelancers = [] } = useFreelancers();
  const { data: companySettings = DEFAULT_COMPANY_SETTINGS } = useCompanySettings();
  const previewContract = usePreviewContractTemplate();
  const generateContract = useGenerateContract();

  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedFreelancerId, setSelectedFreelancerId] = useState<string>("");

  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [autoFields, setAutoFields] = useState<Record<string, boolean>>({});

  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  // ── ALL hooks must be declared before any conditional return ──────────────

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId),
    [models, selectedModelId],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  const selectedFreelancer = useMemo(
    () => freelancers.find((freelancer) => freelancer.id === selectedFreelancerId),
    [freelancers, selectedFreelancerId],
  );

  const variableMap = selectedModel?.variable_map ?? [];

  const missingFieldsCount = useMemo(() => {
    if (!variableMap || variableMap.length === 0) return 0;
    return variableMap.filter((v) => !(values[v.name] ?? "").trim()).length;
  }, [variableMap, values]);

  // When model changes, reset and resolve initial values
  useEffect(() => {
    if (!selectedModel || !selectedModel.variable_map) {
      setValues({});
      setTouched({});
      setAutoFields({});
      setPreviewHtml("");
      setGeneratedUrl(null);
      return;
    }

    setTouched({});
    const resolved = resolveAllContractFields(
      selectedModel.variable_map,
      selectedProject,
      selectedFreelancer,
      DEFAULT_COMPANY_SETTINGS,
    );

    setValues(resolved.values);
    setAutoFields(resolved.autoFields);
    setPreviewHtml("");
    setGeneratedUrl(null);
  }, [selectedModelId, companySettings]);

  // When project or freelancer changes, update unresolved/untouched fields
  useEffect(() => {
    if (!selectedModel || !selectedModel.variable_map) return;

    const resolved = resolveAllContractFields(
      selectedModel.variable_map,
      selectedProject,
      selectedFreelancer,
      DEFAULT_COMPANY_SETTINGS,
    );

    setValues((prevValues) => {
      const nextValues: Record<string, string> = { ...prevValues };
      selectedModel.variable_map.forEach((variable) => {
        if (!touched[variable.name]) {
          nextValues[variable.name] = resolved.values[variable.name] ?? "";
        }
      });
      return nextValues;
    });

    setAutoFields((prevAuto) => {
      const nextAuto: Record<string, boolean> = { ...prevAuto };
      selectedModel.variable_map.forEach((variable) => {
        if (!touched[variable.name]) {
          nextAuto[variable.name] = Boolean(resolved.autoFields[variable.name]);
        }
      });
      return nextAuto;
    });
  }, [selectedProjectId, selectedFreelancerId, companySettings]);

  // Auth redirect effect — must also be with other hooks, before any return
  useEffect(() => {
    if (!authLoading && !isGestor) {
      navigate({ to: "/app/projects", replace: true });
    }
  }, [isGestor, authLoading, navigate]);

  // ── Now it is safe to have conditional returns ────────────────────────────

  if (authLoading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!isGestor) return null;

  // ── Derived values & handlers (not hooks, safe after returns) ────────────

  const canGenerate =
    Boolean(selectedModel) &&
    Boolean(selectedProjectId) &&
    missingFieldsCount === 0 &&
    !generateContract.isPending;

  const generatedFilename = selectedModel
    ? `${selectedModel.name.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.docx`
    : "generated-contract.docx";

  const handleChangeValue = (key: string, value: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handlePreview = async () => {
    if (!selectedModel?.docx_path) {
      toast.error("Escolha um modelo com arquivo .docx vinculado para pré-visualizar.");
      return;
    }

    try {
      const result = await previewContract.mutateAsync(selectedModel.docx_path);
      setPreviewHtml(result.html);
      toast.success("Pré-visualização carregada.");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar pré-visualização.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedModel?.docx_path) {
      toast.error("Selecione um modelo com arquivo .docx para gerar o contrato.");
      return;
    }
    if (!selectedProjectId) {
      toast.error("Selecione um projeto para vincular ao contrato.");
      return;
    }
    if (missingFieldsCount > 0) {
      toast.error(
        `Preencha todos os campos do contrato. Existem ${missingFieldsCount} campos vazios.`,
      );
      return;
    }

    try {
      const result = await generateContract.mutateAsync({
        docx_path: selectedModel.docx_path,
        values,
        filename: generatedFilename,
        model_id: selectedModel.id,
        project_id: selectedProjectId,
        freelancer_id: selectedFreelancerId || undefined,
      });
      setGeneratedUrl(result.public_url);
      toast.success("Contrato gerado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar contrato.");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
            Gerador de Contratos
          </h1>
          <p className="text-sm text-stone-500 mt-1 max-w-2xl">
            Selecione um modelo, preencha os campos automáticos e manuais e gere um contrato `.docx`
            com histórico de geração.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handlePreview}
            className="gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-md shadow-none text-xs h-9 px-4"
            disabled={!selectedModel || previewContract.isPending}
          >
            <Sparkles className="h-4 w-4" /> Pré-visualizar Template
          </Button>

          <div className="flex flex-col sm:items-end">
            <Button
              onClick={handleGenerate}
              className="gap-2 bg-blue-900 hover:bg-blue-950 text-white font-medium rounded-md shadow-none text-xs h-9 px-4"
              disabled={!canGenerate}
            >
              <FileText className="h-4 w-4" /> Gerar Contrato
            </Button>
            {!selectedModel ? (
              <span className="text-[11px] text-muted-foreground mt-1">Selecione um modelo</span>
            ) : !selectedProjectId ? (
              <span className="text-[11px] text-muted-foreground mt-1">Selecione um projeto</span>
            ) : missingFieldsCount > 0 ? (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 inline" /> {missingFieldsCount} campos pendentes
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Top Configuration & Dynamic Form Section */}
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="space-y-4 shadow-sm">
          <CardHeader>
            <CardTitle>Configuração do Contrato</CardTitle>
            <CardDescription>
              Selecione o modelo, projeto e freelancer para carregar os dados automáticos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="model">Modelo de Contrato</Label>
                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                  <SelectTrigger id="model" className="w-full">
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Projeto</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="project" className="w-full">
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freelancer">Freelancer (opcional)</Label>
              <Select
                value={selectedFreelancerId}
                onValueChange={(val) => setSelectedFreelancerId(val === "none" ? "" : val)}
              >
                <SelectTrigger id="freelancer" className="w-full">
                  <SelectValue placeholder="Selecione um freelancer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (não vinculado)</SelectItem>
                  {freelancers.map((freelancer) => {
                    const isPending =
                      freelancer.contract_fields_status !== "completo" ||
                      freelancer.documents_status !== "aprovado";
                    return (
                      <SelectItem key={freelancer.id} value={freelancer.id}>
                        {freelancer.full_name} {isPending ? "⚠️ (Pendentes)" : "✅ (Apto)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedFreelancer &&
                (selectedFreelancer.contract_fields_status !== "completo" ||
                  selectedFreelancer.documents_status !== "aprovado") && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      ⚠️ Freelancer com cadastro/documentos pendentes
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Dados de contrato:{" "}
                      {selectedFreelancer.contract_fields_status === "completo"
                        ? "Completo"
                        : "Pendente"}{" "}
                      | Documentos:{" "}
                      {selectedFreelancer.documents_status === "aprovado"
                        ? "Aprovado"
                        : selectedFreelancer.documents_status === "em_analise"
                          ? "Em Análise"
                          : "Pendente"}
                      .
                    </p>
                  </div>
                )}
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Arquivo .docx do modelo
              </p>
              <p className="text-sm font-medium break-words">
                {selectedModel?.docx_path || "Nenhum modelo selecionado ou sem arquivo"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Form Panel */}
        <Card className="space-y-4 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Valores do Contrato</span>
              {selectedModel && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2.5 py-1 rounded-full border">
                  {variableMap.length} variáveis mapeadas
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Preencha ou revise os valores do modelo antes de gerar o contrato final.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContractValuesForm
              variableMap={variableMap}
              values={values}
              autoFields={autoFields}
              onChange={handleChangeValue}
              missingCount={missingFieldsCount}
            />
          </CardContent>
        </Card>
      </div>

      {/* Preview & Result Section */}
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4 shadow-sm">
          <CardHeader>
            <CardTitle>Preview do Modelo</CardTitle>
            <CardDescription>Pré-visualização do `.docx` convertido para HTML.</CardDescription>
          </CardHeader>
          <CardContent>
            {previewHtml ? (
              <div className="rounded-2xl border border-border bg-white p-4">
                <div
                  className="prose prose-slate max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted p-6 text-sm text-muted-foreground">
                Clique em "Pré-visualizar Template" para carregar o HTML do documento.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="space-y-4 shadow-sm">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>Link e status do contrato gerado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Modelo</p>
                <p className="mt-1 text-sm font-semibold">
                  {selectedModel?.name ?? "Nenhum modelo"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Projeto</p>
                <p className="mt-1 text-sm font-semibold">
                  {selectedProject?.title ?? "Nenhum projeto"}
                </p>
              </div>
              {selectedFreelancer && (
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Freelancer
                  </p>
                  <p className="mt-1 text-sm font-semibold">{selectedFreelancer.full_name}</p>
                </div>
              )}
              {generatedUrl ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 font-semibold">
                    URL Gerada
                  </p>
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Abrir contrato gerado (.docx)
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                  O contrato gerado será exibido aqui com link direto para download.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
