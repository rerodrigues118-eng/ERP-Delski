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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, AlertCircle, CheckCircle2, Users, Briefcase, FileSignature, Files } from "lucide-react";
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
import { ContractTemplatesManager } from "@/components/ContractTemplatesManager";
import type { ContractTargetType } from "@/types/contract-models";

interface ContractGeneratorSearch {
  tab?: string;
}

export const Route = createFileRoute("/app/contract-generator")({
  validateSearch: (search: Record<string, unknown>): ContractGeneratorSearch => {
    return {
      tab: (search?.tab as string) || "gerar",
    };
  },
  head: () => ({
    meta: [{ title: "Gerador de Contratos & Modelos — DELSKI CLOUD" }],
  }),
  component: ContractGeneratorPage,
});

function ContractGeneratorPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const activeTab = search?.tab === "modelos" || search?.tab === "templates" ? "modelos" : "gerar";

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

  // Auto-resolve fields whenever model, project, freelancer, client or companySettings change
  useEffect(() => {
    if (!selectedModel) {
      setValues({});
      setTouched({});
      setAutoFields({});
      return;
    }

    const { resolvedValues, autoResolvedMap } = resolveAllContractFields({
      variableMap,
      project: selectedProject ?? null,
      freelancer: selectedFreelancer ?? null,
      client: selectedClient ?? null,
      companySettings,
      contractParty,
      currentValues: values,
      touchedMap: touched,
    });

    setValues(resolvedValues);
    setAutoFields(autoResolvedMap);
  }, [
    selectedModelId,
    selectedProjectId,
    selectedFreelancerId,
    selectedClientId,
    companySettings,
    contractParty,
  ]);

  // Auto-select project's client when a project is selected (for client contracts)
  useEffect(() => {
    if (contractParty === "client" && selectedProject?.client_id) {
      setSelectedClientId(selectedProject.client_id);
    }
  }, [selectedProjectId, contractParty, selectedProject]);

  const handleTabChange = (val: string) => {
    navigate({
      search: (prev: any) => ({ ...prev, tab: val }),
      replace: true,
    });
  };

  const handleFieldChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    setAutoFields((prev) => ({ ...prev, [name]: false }));
  };

  const handleApplyGlobalDefaults = () => {
    if (!selectedModel) return;

    const { resolvedValues, autoResolvedMap } = resolveAllContractFields({
      variableMap,
      project: selectedProject ?? null,
      freelancer: selectedFreelancer ?? null,
      client: selectedClient ?? null,
      companySettings,
      contractParty,
      currentValues: {},
      touchedMap: {},
    });

    setValues(resolvedValues);
    setAutoFields(autoResolvedMap);
    setTouched({});
    toast.success("Campos redefinidos com os valores padrão do sistema.");
  };

  const handleGenerate = async () => {
    if (!selectedModelId) {
      toast.error("Selecione um modelo de contrato.");
      return;
    }
    if (!selectedProjectId) {
      toast.error("Selecione um projeto.");
      return;
    }
    if (contractParty === "freelancer" && !selectedFreelancerId) {
      toast.error("Selecione o freelancer para o qual o contrato será emitido.");
      return;
    }
    if (contractParty === "client" && !selectedClientId) {
      toast.error("Selecione o cliente para o qual o contrato será emitido.");
      return;
    }

    try {
      const result = await generateContract.mutateAsync({
        modelId: selectedModelId,
        projectId: selectedProjectId,
        freelancerId: contractParty === "freelancer" ? selectedFreelancerId : undefined,
        clientId: contractParty === "client" ? selectedClientId : undefined,
        targetType: contractParty,
        fieldValues: values,
      });

      setGeneratedUrl(result.generated_docx_url ?? null);
      toast.success(
        `Contrato de ${contractParty === "client" ? "Cliente" : "Freelancer"} gerado com sucesso!`,
      );
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Erro ao gerar contrato.");
    }
  };

  const canGenerate =
    Boolean(selectedModelId) &&
    Boolean(selectedProjectId) &&
    (contractParty === "freelancer" ? Boolean(selectedFreelancerId) : Boolean(selectedClientId)) &&
    !generateContract.isPending;

  if (!authLoading && !isGestor && profile?.role !== "admin") {
    return (
      <div className="p-8 text-center border border-dashed rounded-lg text-stone-500 space-y-3">
        <p className="font-semibold text-lg">Acesso Restrito</p>
        <p className="text-sm">Apenas gestores da Delski podem acessar o Gerador de Contratos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Tabs Switcher */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="bg-card p-1.5 rounded-xl border border-border shadow-xs overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 flex gap-1 min-w-max">
            <TabsTrigger
              value="gerar"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <FileSignature className="h-4 w-4" /> Gerar Contrato
            </TabsTrigger>
            <TabsTrigger
              value="modelos"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2"
            >
              <Files className="h-4 w-4" /> Modelos de Contrato
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── ABA 1: GERAR CONTRATO ─────────────────────────────────── */}
        <TabsContent value="gerar" className="space-y-6 focus-visible:outline-none">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Gerador de Contratos
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Selecione um modelo, preencha os campos automáticos e manuais e gere um contrato em formato .docx para revisão e envio manual.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <Button
                  onClick={handleGenerate}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-xs"
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
            <Card className="space-y-4 shadow-sm border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold">Configuração do Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="model" className="text-xs font-semibold">Modelo de Contrato</Label>
                    <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                      <SelectTrigger id="model" className="w-full text-xs">
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
                    <Label htmlFor="project" className="text-xs font-semibold">Projeto</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger id="project" className="w-full text-xs">
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

                {/* Conditional Party Select */}
                {contractParty === "freelancer" ? (
                  <div className="space-y-2">
                    <Label htmlFor="freelancer" className="text-xs font-semibold">Freelancer (opcional)</Label>
                    <Select
                      value={selectedFreelancerId}
                      onValueChange={setSelectedFreelancerId}
                    >
                      <SelectTrigger id="freelancer" className="w-full text-xs">
                        <SelectValue placeholder="Selecione um freelancer" />
                      </SelectTrigger>
                      <SelectContent>
                        {freelancers.map((freelancer) => (
                          <SelectItem key={freelancer.id} value={freelancer.id}>
                            {freelancer.full_name} ({freelancer.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="client" className="text-xs font-semibold">Cliente</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger id="client" className="w-full text-xs">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                            {client.company_name ? ` (${client.company_name})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Arquivo .docx do Modelo
                  </p>
                  <p className="text-xs text-foreground truncate">
                    {selectedModel?.docx_path
                      ? selectedModel.docx_path.split("/").pop()
                      : "Nenhum modelo selecionado ou sem arquivo"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Form for Variables */}
            <Card className="space-y-4 shadow-sm border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-bold">Valores do Contrato</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedModel
                      ? `${variableMap.length} variáveis mapeadas para este modelo.`
                      : "Selecione um modelo para carregar os campos."}
                  </CardDescription>
                </div>

                {selectedModel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyGlobalDefaults}
                    className="text-xs h-8"
                  >
                    Restaurar Padrões
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!selectedModel ? (
                  <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
                    Selecione um modelo para carregar os campos automáticos.
                  </div>
                ) : variableMap.length === 0 ? (
                  <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
                    Este modelo não possui nenhuma variável mapeada.
                  </div>
                ) : (
                  <ContractValuesForm
                    variableMap={variableMap}
                    values={values}
                    touched={touched}
                    autoFields={autoFields}
                    onChange={handleFieldChange}
                  />
                )}

                {selectedModel && variableMap.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border flex justify-end">
                    <Button
                      onClick={handleGenerate}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-xs"
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
          <Card className="space-y-4 shadow-sm border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Resultado</CardTitle>
              <CardDescription className="text-xs">Link e status do contrato gerado.</CardDescription>
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
                <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-xs text-muted-foreground">
                  O contrato gerado será exibido aqui com link direto para download.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA 2: MODELOS DE CONTRATO ───────────────────────────── */}
        <TabsContent value="modelos" className="space-y-6 focus-visible:outline-none">
          <ContractTemplatesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}