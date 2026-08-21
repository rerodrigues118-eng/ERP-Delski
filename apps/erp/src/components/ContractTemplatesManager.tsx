import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  // Qualificação - Empresa (Contratante)
  nome_representante_contratante: "company",
  cargo_representante_contratante: "company",
  email_contratante: "company",
  telefone_contratante: "company",
  observacoes_contratante: "company",

  // Qualificação - Contratado (Freelancer)
  nome_fantasia_contratado: "freelancer",
  razao_social_nome_contratado: "freelancer",
  cnpj_cpf_contratado: "freelancer",
  segmento_atuacao_contratado: "freelancer",
  email_contratado: "freelancer",
  endereco_contratado: "freelancer",
  cep_contratado: "freelancer",
  cargo_responsavel_contratado: "freelancer",
  telefone_contratado: "freelancer",
  dados_bancarios_pix_contratado: "freelancer",
  observacoes_contratado: "freelancer",

  // Condições Comerciais / Projeto
  vigencia_meses: "project",
  data_inicio_prevista: "project",
  periodicidade_relatorio: "project",
  valor_inteiro: "project",
  mensalidade_acordada: "project",
  data_pagamento: "system",
  metodo_pagamento: "system",
  pasta_relatorios_compartilhada: "project",
  prazo_minimo_contratacao: "project",

  // Sistema / Assinaturas
  cidade_assinatura: "system",
  data_assinatura: "system",

  // Testemunhas
  nome_testemunha_1: "manual",
  cpf_testemunha_1: "manual",
  nome_testemunha_2: "manual",
  cpf_testemunha_2: "manual",

  // Especialidades / Escopo Técnico
  canal_comunicacao: "project",
  plataforma_automacao_utilizada: "project",
  destino_leads: "project",
  fluxos_jornadas_desenvolvidos: "project",
  integracoes_especificas_necessarias: "project",
  perguntas_qualificatorias_briefing: "project",
  notificacao_time_vendas: "project",
  data_entrega_primeira_entrega: "project",
  prazo_suporte_tecnico_pos_entrega: "project",
  acesso_plataforma_automacao: "project",
  crm_destino_leads: "project",
  acesso_whatsapp_business_api: "project",
  outros_acessos_necessarios: "project",

  tipo_projeto: "project",
  objetivo_principal: "project",
  paginas_funcionalidades_desenvolvidas: "project",
  plataforma_desenvolvimento: "project",
  integracoes_necessarias: "project",
  responsavel_textos_imagens: "project",
  numero_rodadas_revisao: "project",
  responsavel_dominio: "project",
  responsavel_hospedagem: "project",
  sites_referencia_estilo_visual: "project",
  identidade_visual_definida: "project",
  ambiente_staging_necessario: "project",
  prazo_layout_dias_uteis: "project",
  prazo_desenvolvimento_completo: "project",
  prazo_suporte_pos_golive: "project",
  acesso_dominio_registradora: "project",
  acesso_hospedagem: "project",
  repositorio_codigo: "project",

  redes_sociais_gerenciadas: "project",
  qtd_posts_feed_mes: "project",
  qtd_carrosseis_mes: "project",
  qtd_stories_mes: "project",
  outros_formatos_conteudo: "project",
  criacao_legendas_incluida: "project",
  numero_rodadas_revisao_lote: "project",
  ferramenta_design: "project",
  referencias_estilo_visual: "project",
  persona_publico: "project",
  prazo_entrega_primeiro_lote: "project",
  manual_marca_disponivel: "project",
  fonte_imagens: "project",
  ferramenta_aprovacao: "project",
  temas_elementos_proibidos: "project",

  plataformas_veiculacao: "project",
  produto_servico_anunciado: "project",
  publico_alvo: "project",
  meta_cac_cpl: "project",
  responsavel_criativos: "project",
  id_business_manager: "project",
  id_conta_google_ads: "project",
  acesso_tiktok_ads: "project",
  url_site_landing_page: "project",

  tipo_site: "project",
  cms_utilizado: "project",
  responsavel_conteudo: "project",
  componentes_padroes_criar: "project",
  manual_marca_guideline_disponivel: "project",
  cores_fontes_tokens_design: "project",
  referencias_visuais: "project",
  estilo_visual_desejado: "project",
  ferramenta_design_acordada: "project",
  prazo_primeiros_layouts: "project",
  prazo_wireframes: "project",
  prazo_layouts_finais: "project",
  prazo_handoff_assets: "project",
  acesso_figma_ferramenta_design: "project",
  acesso_ferramentas_gestao: "project",

  pesquisa_usuarios_necessaria: "project",
  perfil_participantes_pesquisa: "project",
  escopo_ui_assistente_navegacao: "project",
  escopo_ui_dashboard_inteligencia: "project",
  prazo_design_system_completo: "project",
  prazo_prototipo_navegavel: "project",
};

const variableSectionSuggestions: Record<string, string> = {
  nome_representante_contratante: "Qualificação (Cláusula 1ª)",
  cargo_representante_contratante: "Qualificação (Cláusula 1ª)",
  email_contratante: "Qualificação (Cláusula 1ª)",
  telefone_contratante: "Qualificação (Cláusula 1ª)",
  nome_fantasia_contratado: "Qualificação (Cláusula 1ª)",
  razao_social_nome_contratado: "Qualificação (Cláusula 1ª)",
  cnpj_cpf_contratado: "Qualificação (Cláusula 1ª)",
  segmento_atuacao_contratado: "Qualificação (Cláusula 1ª)",
  email_contratado: "Qualificação (Cláusula 1ª)",
  endereco_contratado: "Qualificação (Cláusula 1ª)",
  cep_contratado: "Qualificação (Cláusula 1ª)",
  cargo_responsavel_contratado: "Qualificação (Cláusula 1ª)",
  telefone_contratado: "Qualificação (Cláusula 1ª)",

  vigencia_meses: "Condições Comerciais",
  data_inicio_prevista: "Condições Comerciais",
  periodicidade_relatorio: "Condições Comerciais",
  valor_inteiro: "Condições Comerciais",
  mensalidade_acordada: "Condições Comerciais",
  data_pagamento: "Condições Comerciais",
  metodo_pagamento: "Condições Comerciais",
  dados_bancarios_pix_contratado: "Condições Comerciais",
  pasta_relatorios_compartilhada: "Condições Comerciais",
  observacoes_contratado: "Condições Comerciais",
  observacoes_contratante: "Condições Comerciais",
  prazo_minimo_contratacao: "Condições Comerciais",

  cidade_assinatura: "Assinaturas & Testemunhas",
  data_assinatura: "Assinaturas & Testemunhas",
  nome_testemunha_1: "Assinaturas & Testemunhas",
  cpf_testemunha_1: "Assinaturas & Testemunhas",
  nome_testemunha_2: "Assinaturas & Testemunhas",
  cpf_testemunha_2: "Assinaturas & Testemunhas",

  data_entrega_primeira_entrega: "Prazos & Entregas",
  prazo_suporte_tecnico_pos_entrega: "Prazos & Entregas",
  prazo_layout_dias_uteis: "Prazos & Entregas",
  prazo_desenvolvimento_completo: "Prazos & Entregas",
  prazo_suporte_pos_golive: "Prazos & Entregas",
  prazo_entrega_primeiro_lote: "Prazos & Entregas",
  prazo_primeiros_layouts: "Prazos & Entregas",
  prazo_wireframes: "Prazos & Entregas",
  prazo_layouts_finais: "Prazos & Entregas",
  prazo_handoff_assets: "Prazos & Entregas",
  prazo_design_system_completo: "Prazos & Entregas",
  prazo_prototipo_navegavel: "Prazos & Entregas",

  acesso_plataforma_automacao: "Acessos & Ferramentas",
  crm_destino_leads: "Acessos & Ferramentas",
  acesso_whatsapp_business_api: "Acessos & Ferramentas",
  outros_acessos_necessarios: "Acessos & Ferramentas",
  acesso_dominio_registradora: "Acessos & Ferramentas",
  acesso_hospedagem: "Acessos & Ferramentas",
  repositorio_codigo: "Acessos & Ferramentas",
  ferramenta_design: "Acessos & Ferramentas",
  ferramenta_aprovacao: "Acessos & Ferramentas",
  id_business_manager: "Acessos & Ferramentas",
  id_conta_google_ads: "Acessos & Ferramentas",
  acesso_tiktok_ads: "Acessos & Ferramentas",
  acesso_figma_ferramenta_design: "Acessos & Ferramentas",
  acesso_ferramentas_gestao: "Acessos & Ferramentas",
  ferramenta_design_acordada: "Acessos & Ferramentas",
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

const defaultVariableMap: ContractModelVariable[] = [
  {
    name: "nome_representante_contratante",
    origin: "company",
    section: "Qualificação (Cláusula 1ª)",
    order: 1,
    label: "Nome do Representante Contratante",
    defaultValue: "",
  },
  {
    name: "razao_social_nome_contratado",
    origin: "freelancer",
    section: "Qualificação (Cláusula 1ª)",
    order: 2,
    label: "Razão Social ou Nome do Contratado",
    defaultValue: "",
  },
  {
    name: "cnpj_cpf_contratado",
    origin: "freelancer",
    section: "Qualificação (Cláusula 1ª)",
    order: 3,
    label: "CNPJ / CPF do Contratado",
    defaultValue: "",
  },
  {
    name: "mensalidade_acordada",
    origin: "project",
    section: "Condições Comerciais",
    order: 4,
    label: "Mensalidade Acordada",
    defaultValue: "",
  },
];

function formatVariableLabel(name: string): string {
  const acronyms: Record<string, string> = {
    cpf: "CPF",
    cnpj: "CNPJ",
    pix: "PIX",
    crm: "CRM",
    api: "API",
    id: "ID",
    url: "URL",
    cac: "CAC",
    cpl: "CPL",
    cms: "CMS",
    ui: "UI",
    ux: "UX",
    pj: "PJ",
    clt: "CLT",
    nfs: "NFs",
    qtd: "Qtd.",
  };

  return name
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (acronyms[lower]) return acronyms[lower];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function buildVariableMap(variableNames: string[]) {
  return variableNames.map((name, index) => {
    const cleanName = name.trim();
    const origin = variableOriginSuggestions[cleanName] ?? "manual";
    const section = variableSectionSuggestions[cleanName] ?? "Escopo & Detalhes Técnicos";
    const label = formatVariableLabel(cleanName);

    return {
      name: cleanName,
      origin,
      section,
      order: index + 1,
      label,
      defaultValue: "",
    };
  });
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

export function ContractTemplatesManager() {
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

    for (const item of newItems) {
      try {
        const vars = await extractVariables.mutateAsync(item.file);
        setPendingFiles((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, variables: vars, isExtracting: false } : p
          )
        );
      } catch (err: any) {
        setPendingFiles((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  isExtracting: false,
                  error: err?.message || "Erro ao ler variáveis do arquivo.",
                }
              : p
          )
        );
      }
    }
  };

  const handleUpdatePendingField = (
    id: string,
    field: keyof PendingFile,
    value: any
  ) => {
    setPendingFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemovePending = (id: string) => {
    setPendingFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplyGlobalServiceType = (
    service_type: "IA" | "Trafego" | "Sites" | "Social Media"
  ) => {
    setPendingFiles((prev) => prev.map((item) => ({ ...item, service_type })));
    toast.success(`Tipo "${service_type}" aplicado a todos os arquivos selecionados.`);
  };

  const handleSubmitBatch = async () => {
    if (pendingFiles.length === 0) return;

    setIsSubmittingBatch(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of pendingFiles) {
      try {
        const uploadedPath = await uploadTemplate.mutateAsync(item.file);
        const map = buildVariableMap(item.variables);

        await createContractModel.mutateAsync({
          name: item.name,
          service_type: item.service_type,
          contract_type: item.contract_type,
          target_type: item.target_type,
          docx_path: uploadedPath,
          variable_map: map,
          is_active: true,
        });

        successCount++;
      } catch (error) {
        console.error(`Erro ao importar ${item.name}:`, error);
        failCount++;
      }
    }

    setIsSubmittingBatch(false);

    if (successCount > 0) {
      toast.success(
        `${successCount} ${successCount === 1 ? "modelo importado" : "modelos importados"} com sucesso!`
      );
      setPendingFiles([]);
    }
    if (failCount > 0) {
      toast.error(`Falha ao importar ${failCount} arquivo(s).`);
    }
  };

  const anyExtracting = pendingFiles.some((f) => f.isExtracting);

  return (
    <div className="space-y-6">
      {/* Top Header of Models */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Modelos de Contrato
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie modelos de contrato para automatizar a geração de documentos para freelancers e clientes.
          </p>
        </div>

        <Button
          onClick={handleOpenNewModal}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
        >
          <FilePlus className="h-4 w-4" /> Novo Modelo em Branco
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Upload Card */}
        <Card className="space-y-4 shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-bold">
              <span>Upload de Templates</span>
              <Badge variant="outline" className="text-xs font-normal">
                Suporta múltiplos arquivos .docx
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contract-files" className="text-xs font-semibold">Arquivos .docx</Label>
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
                      Salvar e Importar {pendingFiles.length} Modelo(s)
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modelos Cadastrados List */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Modelos Cadastrados ({models.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Selecione um modelo para editar o mapeamento de variáveis.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando modelos...
              </div>
            ) : models.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
                Nenhum modelo cadastrado ainda. Faça o upload acima ou crie um novo modelo.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{model.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {model.contract_type || "PJ"}
                        </Badge>
                        <Badge
                          className={`text-[10px] font-semibold ${
                            model.target_type === "client"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30"
                          }`}
                        >
                          {model.target_type === "client" ? "Cliente" : "Freelancer"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{model.service_type}</span>
                        <span>•</span>
                        <span>{model.is_active ? "Ativo" : "Inativo"}</span>
                        <span>•</span>
                        <span>{model.variable_map?.length ?? 0} variáveis</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                        <Link to="/app/contract-models/$id" params={{ id: model.id }}>
                          <ChevronRight className="h-3.5 w-3.5" /> Abrir
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDeleteModel(model.id, model.name)}
                        title="Apagar modelo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Novo Modelo em Branco */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="h-4 w-4 text-primary" />
              Criar Novo Modelo em Branco
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina as configurações iniciais para estruturar um novo modelo de contrato.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmCreateEmptyModel} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="model-name" className="text-xs font-semibold">Nome do Modelo *</Label>
              <Input
                id="model-name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Ex: Contrato de Prestação de Serviços Web"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Serviço</Label>
                <Select
                  value={newServiceType}
                  onValueChange={(val: any) => setNewServiceType(val)}
                >
                  <SelectTrigger className="text-xs">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Modalidade</Label>
                <Select
                  value={newContractType}
                  onValueChange={(val: any) => setNewContractType(val)}
                >
                  <SelectTrigger className="text-xs">
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contrato Destinado a</Label>
              <Select
                value={newTargetType}
                onValueChange={(val: any) => setNewTargetType(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freelancer">Freelancer (Prestador)</SelectItem>
                  <SelectItem value="client">Cliente (Contratante)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewModalOpen(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Criando...
                  </>
                ) : (
                  "Criar Modelo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
