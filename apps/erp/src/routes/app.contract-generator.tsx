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
import { FileText, AlertCircle, CheckCircle2, Users, Briefcase } from "lucide-react";
import {
  useContractModels,
  useGenerateContract,
} from "@/hooks/useContractModels";
import { useProjects } from "@/hooks/useProjects";
import { useFreelancers } from "@/hooks/useProfiles";
import { useClientsList } from "@/hooks/useClients";
import {
  resolveAllContractFields,
  DEFAULT_COMPANY_SETTINGS,
} from "@/hooks/useContractFieldResolver";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { ContractValuesForm } from "@/components/ContractValuesForm";
import type { ContractTargetType } from "@/types/contract-models";

export const Route = createFileRoute("/app/contract-generator")({
  head: () => ({
    meta: [{ title: "Gerador de Contratos — Delski ERP" }],
  }),
  component: ContractGeneratorPage,
});

function ContractGeneratorPage() {
  const navigate = useNavigate();
  const { profile, isGestor, loading: authLoading } = useAuth();
  const { data: models = [] } = useContractModels();
  const { data: projects = [] } = useProjects();
  const { data: freelancers = [] } = useFreelancers();
  const { data: clients = [] } = useClientsList();
  const { data: companySettings = DEFAULT_COMPANY_SETTINGS } = useCompanySettings();
  const generateContract = useGenerateContract();

  // ── "Emitir contrato para" toggle ─────────────────────────────────────────
  const [contractParty, setContractParty] = useState<ContractTargetType>("freelancer");

  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedFreelancerId, setSelectedFreelancerId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [autoFields, setAutoFields] = useState<Record<string, boolean>>({});
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  // ── ALL hooks must be declared before any conditional return ──────────────

  /** Only active models matching the selected contract party */
  const activeModels = useMemo(
    () => models.filter((m) => m.is_active && (m.target_type ?? "freelancer") === contractParty),
    [models, contractParty],
  );

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId),
    [models, selectedModelId],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  const selectedFreelancer = useMemo(
    () => freelancers.find((f) => f.id === selectedFreelancerId),
    [freelancers, selectedFreelancerId],
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  const variableMap = selectedModel?.variable_map ?? [];

  const missingFieldsCount = useMemo(() => {
    if (!variableMap || variableMap.length === 0) return 0;
    return variableMap.filter((v) => !(values[v.name] ?? "").trim()).length;
  }, [variableMap, values]);

  // Reset model selection when party changes to avoid cross-type model selection
  useEffect(() => {
    setSelectedModelId("");
    setValues({});
    setTouched({});
    setAutoFields({});
    setGeneratedUrl(null);
  }, [contractParty]);

  // When model changes, reset and resolve initial values
  useEffect(() => {
    if (!selectedModel || !selectedModel.variable_map) {
      setValues({});
      setTouched({});
      setAutoFields({});
      setGeneratedUrl(null);
      return;
    }

    setTouched({});
    const resolved = resolveAllContractFields(
      selectedModel.variable_map,
      selectedProject,
      selectedFreelancer,
      companySettings,
      profile,
      selectedModel,
      selectedClient,
    );

    setValues(resolved.values);
    setAutoFields(resolved.autoFields);
    setGeneratedUrl(null);
  }, [selectedModelId, companySettings, profile]);

  // When project/freelancer/client changes, update unresolved/untouched fields
  useEffect(() => {
    if (!selectedModel || !selectedModel.variable_map) return;

    const resolved = resolveAllContractFields(
      selectedModel.variable_map,
      selectedProject,
      selectedFreelancer,
      companySettings,
      profile,
      selectedModel,
      selectedClient,
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
  }, [selectedProjectId, selectedFreelancerId, selectedClientId, companySettings]);

  // Auth redirect effect
  useEffect(() => {
    if (!authLoading && !isGestor) {
      navigate({ to: "/app/projects", replace: true });
    }
  }, [isGestor, authLoading, navigate]);

  // ── Conditional returns ───────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!isGestor) return null;

  // ── Derived values & handlers (safe after returns) ────────────────────────

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
        freelancer_id: contractParty === "freelancer" ? selectedFreelancerId || undefined : undefined,
        client_id: contractParty === "client" ? selectedClientId || undefined : undefined,
      });

      if (result.docx_url) {
        const response = await fetch(result.docx_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = generatedFilename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      setGeneratedUrl(result.docx_url);
      toast.success("Contrato gerado e baixado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar contrato.");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Gerador de Contratos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Selecione um modelo, preencha os campos automáticos e manuais e gere um contrato em
            formato .docx para revisão e envio manual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col sm:items-end">
            <Button
              onClick={handleGenerate}
              className="gap-2 bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-medium rounded-md shadow-xs text-xs h-9 px-4 border-0"
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

      {/* Party Selector */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-muted/40">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          Emitir contrato para:
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setContractParty("freelancer")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
              contractParty === "freelancer"
                ? "bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] text-white border-blue-900 shadow-xs"
                : "bg-background text-foreground border-border hover:border-indigo-400"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Freelancer
          </button>
          <button
            type="button"
            onClick={() => setContractParty("client")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
              contractParty === "client"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-background text-foreground border-border hover:border-emerald-400"
            }`}
          >
            <Users className="h-4 w-4" />
            Cliente
          </button>
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          {contractParty === "freelancer"
            ? "Mostrando modelos do tipo Freelancer"
            : "Mostrando modelos do tipo Cliente"}
        </span>
      </div>

      {/* Top Configuration & Dynamic Form Section */}
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="space-y-4 shadow-sm">
          <CardHeader>
            <CardTitle>Configuração do Contrato</CardTitle>
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
                    {activeModels.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Nenhum modelo{" "}
                        {contractParty === "client" ? "de Cliente" : "de Freelancer"} ativo
                        cadastrado.
                      </div>
                    ) : (
                      activeModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))
                    )}
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

            {/* Freelancer or Client selector — switches based on contractParty */}
            {contractParty === "freelancer" ? (
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
            ) : (
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={(val) => setSelectedClientId(val === "none" ? "" : val)}
                >
                  <SelectTrigger id="client" className="w-full">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (não vinculado)</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                        {client.company_name ? ` — ${client.company_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
          </CardHeader>
          <CardContent className="space-y-6">
            <ContractValuesForm
              variableMap={variableMap}
              values={values}
              autoFields={autoFields}
              onChange={handleChangeValue}
              missingCount={missingFieldsCount}
            />

            {variableMap && variableMap.length > 0 && (
              <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  {!selectedModel ? (
                    <span className="text-xs text-muted-foreground">Selecione um modelo</span>
                  ) : !selectedProjectId ? (
                    <span className="text-xs text-muted-foreground">Selecione um projeto</span>
                  ) : missingFieldsCount > 0 ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 inline" /> {missingFieldsCount}{" "}
                      {missingFieldsCount === 1 ? "campo pendente" : "campos pendentes"}
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 inline" /> Todos os campos preenchidos
                    </span>
                  )}
                </div>

                <Button
                  onClick={handleGenerate}
                  className="w-full sm:w-auto gap-2 bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] hover:from-[#1e3269] hover:via-[#1a44c2] hover:to-[#1d4ed8] text-white font-semibold text-xs h-10 px-6 shadow-xs border-0"
                  disabled={!canGenerate}
                >
                  <FileText className="h-4 w-4" /> Gerar Contrato
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Result Section */}
      <Card className="space-y-4 shadow-sm">
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
          <CardDescription>Link e status do contrato gerado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            {contractParty === "freelancer" && selectedFreelancer && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Freelancer
                </p>
                <p className="mt-1 text-sm font-semibold">{selectedFreelancer.full_name}</p>
              </div>
            )}
            {contractParty === "client" && selectedClient && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Cliente
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {selectedClient.full_name}
                  {selectedClient.company_name ? ` — ${selectedClient.company_name}` : ""}
                </p>
              </div>
            )}
          </div>

          {generatedUrl ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 font-semibold">
                  URL Gerada
                </p>
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Abrir contrato gerado (.docx)
                </a>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(generatedUrl, "_blank")}
                className="text-xs border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
              >
                Baixar Novamente
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
              O contrato gerado será exibido aqui com link direto para download.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}