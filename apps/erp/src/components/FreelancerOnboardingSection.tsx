import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
  XCircle,
  Lock,
  Download,
  Send,
  ShieldCheck,
  Info,
  FileSignature,
  FileCheck,
  Eye,
  Camera,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useFreelancerContractVariables,
  useFreelancerContractInfo,
  useSaveFreelancerContractFields,
  useFreelancerDocuments,
  useUploadFreelancerDocument,
  useSubmitDocumentsForAnalysis,
  useFreelancerGeneratedContracts,
  type FreelancerDocumentType,
  type FreelancerDocument,
} from "@/hooks/useFreelancerContractFields";
import { useAuth } from "@/hooks/useAuth";

interface FreelancerOnboardingSectionProps {
  hideBanner?: boolean;
  hideSection1?: boolean;
}

export function FreelancerOnboardingSection({ hideBanner = false, hideSection1 = false }: FreelancerOnboardingSectionProps = {}) {
  const { user, profile } = useAuth();
  const freelancerId = profile?.id || user?.id;

  const variables = useFreelancerContractVariables();
  const { data: contractInfo, isLoading: loadingInfo } = useFreelancerContractInfo(freelancerId);
  const saveFields = useSaveFreelancerContractFields();

  const { data: documents = [], isLoading: loadingDocs } = useFreelancerDocuments(freelancerId);
  const uploadDocument = useUploadFreelancerDocument();
  const submitDocs = useSubmitDocumentsForAnalysis();

  const { data: generatedContracts = [], isLoading: loadingContracts } =
    useFreelancerGeneratedContracts(freelancerId);

  // Local form state
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [docChoice, setDocChoice] = useState<"rg" | "cnh">("rg");
  const [uploadingType, setUploadingType] = useState<FreelancerDocumentType | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Partial<Record<FreelancerDocumentType, string>>>(
    {},
  );
  const [openRequestEditModal, setOpenRequestEditModal] = useState(false);

  const clearUploadError = (type: FreelancerDocumentType) =>
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });

  const handleDownloadContractFile = (url?: string | null, filename?: string) => {
    if (!url) {
      toast.error("O arquivo do contrato não está disponível para download.");
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.download = filename || `Contrato_${profile?.full_name || "freelancer"}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load existing contract field values
  useEffect(() => {
    if (contractInfo?.contract_field_values) {
      setFieldValues(contractInfo.contract_field_values);
    }
  }, [contractInfo]);

  if (!freelancerId) return null;

  const handleFieldChange = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveFields = async () => {
    try {
      const result = await saveFields.mutateAsync({
        freelancerId,
        values: fieldValues,
        requiredVariables: variables,
      });

      if (result.contractFieldsStatus === "completo") {
        toast.success("Dados de contrato salvos e bloqueados para edição.");
      } else {
        toast.info("Dados gravados. Preencha todos os campos para concluir a etapa.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao salvar dados de contrato.");
    }
  };

  const handleFileUpload = async (
    documentType: FreelancerDocumentType,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingType(documentType);
    clearUploadError(documentType);

    try {
      await uploadDocument.mutateAsync({
        freelancerId,
        documentType,
        file,
        docSelectionType: docChoice,
      });
      clearUploadError(documentType);
      toast.success("Documento anexado!");
    } catch (err: any) {
      const message = err?.message || "Não foi possível enviar o arquivo. Tente novamente.";
      console.error(err);
      setUploadErrors((prev) => ({ ...prev, [documentType]: message }));
      toast.error(message);
    } finally {
      setUploadingType(null);
      if (e.target) e.target.value = "";
    }
  };


  const getDocStatus = (type: FreelancerDocumentType): FreelancerDocument | undefined => {
    if (type === "documento_identidade_1") {
      return (
        documents.find((d) => d.document_type === "documento_identidade_1") ||
        documents.find((d) => d.document_type === "rg_frente") ||
        documents.find((d) => d.document_type === "cnh")
      );
    }
    if (type === "documento_identidade_2") {
      return (
        documents.find((d) => d.document_type === "documento_identidade_2") ||
        documents.find((d) => d.document_type === "rg_verso")
      );
    }
    return documents.find((d) => d.document_type === type);
  };

  const hasFotoRostoAttached =
    !!getDocStatus("foto_rosto_3x4") &&
    getDocStatus("foto_rosto_3x4")?.status !== "rejeitado";

  const hasIdentityAttached =
    !!getDocStatus("documento_identidade_1") &&
    getDocStatus("documento_identidade_1")?.status !== "rejeitado";

  const hasResidenciaAttached =
    !!getDocStatus("comprovante_residencia") &&
    getDocStatus("comprovante_residencia")?.status !== "rejeitado";

  const hasCpfAttached =
    !!getDocStatus("situacao_cadastral_cpf") &&
    getDocStatus("situacao_cadastral_cpf")?.status !== "rejeitado";

  const hasAntecedentesAttached =
    !!getDocStatus("certidao_antecedentes_criminais") &&
    getDocStatus("certidao_antecedentes_criminais")?.status !== "rejeitado";

  const hasAllRequiredAttached =
    hasFotoRostoAttached &&
    hasIdentityAttached &&
    hasResidenciaAttached &&
    hasCpfAttached &&
    hasAntecedentesAttached;

  const requiredDocTypes: FreelancerDocumentType[] = [
    "foto_rosto_3x4",
    "documento_identidade_1",
    "comprovante_residencia",
    "situacao_cadastral_cpf",
    "certidao_antecedentes_criminais",
  ];

  const documentsStatus = contractInfo?.documents_status || "pendente";
  const hasRejectedDocs = documents.some((d) => d.status === "rejeitado");
  const allRequiredDocsApproved = requiredDocTypes.every(
    (type) => getDocStatus(type)?.status === "aprovado",
  );
  const effectiveDocumentsStatus = allRequiredDocsApproved ? "aprovado" : documentsStatus;
  const showReviewBanner = effectiveDocumentsStatus === "em_analise" && !hasRejectedDocs;
  const showApprovedSummary = effectiveDocumentsStatus === "aprovado" && !hasRejectedDocs;

  const isContractFieldsLocked = contractInfo?.contract_fields_status === "completo";

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      {!hideBanner && (
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-indigo-600" /> Área de Contrato & Documentação
                  do Freelancer
                </h3>
                <p className="text-xs text-muted-foreground">
                  Complete seus dados para elaboração contratual, envie seus documentos pessoais e
                  assine os contratos emitidos pela agência Delski.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BLOCO 1: Dados para Contrato */}
      {!hideSection1 && (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-500" /> 1. Dados para Contrato
                </CardTitle>
                <CardDescription className="text-xs">
                  Informações cadastrais e contratuais reutilizadas em todas as minutas e termos.
                </CardDescription>
              </div>

              {isContractFieldsLocked ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Dados Preenchidos e Travados
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1 text-xs"
                >
                  <Clock className="h-3.5 w-3.5" /> Preenchimento Pendente
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {variables.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-center bg-muted/30">
                <p className="text-xs text-muted-foreground italic">
                  Nenhum campo de contrato de freelancer exigido no momento.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {variables.map((v) => {
                  const val = fieldValues[v.name] ?? "";
                  return (
                    <div key={v.name} className="space-y-1.5">
                      <Label className="text-xs font-semibold">{v.label || v.name}</Label>
                      <Input
                        value={val}
                        disabled={isContractFieldsLocked}
                        onChange={(e) => handleFieldChange(v.name, e.target.value)}
                        placeholder={v.defaultValue || `Informe ${v.label || v.name}`}
                        className="text-xs h-9"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {isContractFieldsLocked ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-indigo-400" /> Dados confirmados. Para efetuar
                  alterações, solicite ao Gestor.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenRequestEditModal(true)}
                  className="text-xs gap-1.5"
                >
                  <Info className="h-3.5 w-3.5" /> Solicitar alteração
                </Button>
              </div>
            ) : (
              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  onClick={handleSaveFields}
                  disabled={saveFields.isPending || variables.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-2"
                >
                  {saveFields.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar Dados de Contrato
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Aviso Solicitar Alteração */}
      <Dialog open={openRequestEditModal} onOpenChange={setOpenRequestEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Info className="h-5 w-5 text-indigo-500" /> Solicitar Alteração de Dados
            </DialogTitle>
            <DialogDescription className="text-xs pt-2 leading-relaxed">
              Os seus dados contratuais já foram validados e salvos no sistema. Para realizar
              qualquer alteração cadastral ou ajuste nos dados de contrato, por favor entre em
              contato com a equipe de Gestão Delski.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              size="sm"
              onClick={() => setOpenRequestEditModal(false)}
              className="bg-indigo-600 text-white"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BLOCO 2: Documentos Pessoais */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-500" /> 2. Documentos Pessoais
              </CardTitle>
              <CardDescription className="text-xs">
                Anexe os comprovantes e documentos de identificação exigidos para aprovação do
                perfil.
              </CardDescription>
            </div>

            {effectiveDocumentsStatus === "aprovado" && (
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" /> Documentação Aprovada
              </Badge>
            )}
            {showReviewBanner && (
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1 text-xs">
                <Clock className="h-3.5 w-3.5" /> Documentos Em Análise
              </Badge>
            )}
            {hasRejectedDocs && (
              <Badge className="bg-sky-500/15 text-sky-700 border-sky-500/30 gap-1 text-xs">
                <AlertCircle className="h-3.5 w-3.5 text-sky-700" /> Readequação Solicitada pelo
                Gestor
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* REGRA DE VISIBILIDADE PÓS-ENVIO: Se está em_analise/aprovado e sem rejeitados, mostra modo SOMENTE STATUS */}
          {showReviewBanner ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 leading-relaxed flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <strong className="font-semibold block text-sm">
                    Documentos em Análise pelo Gestor
                  </strong>
                  Seus documentos foram enviados e estão sendo analisados pela nossa equipe.
                  Enquanto os documentos estiverem em análise, o envio permanece travado. Caso seja
                  solicitada alguma adequação, os campos serão liberados novamente.
                </div>
              </div>

              <div className="divide-y divide-border border border-border rounded-xl">
                {requiredDocTypes.map((type) => {
                  const doc = getDocStatus(type);
                  const titleMap: Record<string, string> = {
                    documento_identidade_1: "Documento de Identidade (RG/CNH)",
                    documento_identidade_2: "Documento de Identidade — Verso",
                    rg_frente: "RG — Frente",
                    rg_verso: "RG — Verso",
                    cnh: "CNH — Carteira de Habilitação",
                    comprovante_residencia: "Comprovante de Residência",
                    situacao_cadastral_cpf: "Comprovante de Situação Cadastral do CPF",
                  };

                  return (
                    <div key={type} className="p-3 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{titleMap[type] || type}</span>
                      {doc?.status === "aprovado" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-[11px]"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Aprovado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1 text-[11px]"
                        >
                          <Clock className="h-3 w-3" /> Em Análise
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : showApprovedSummary ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              <div className="font-semibold text-sm">Documentação Aprovada</div>
              <p className="mt-2">
                Todos os documentos obrigatórios foram aprovados pelo gestor. Nenhum reenvio é
                necessário no momento.
              </p>
            </div>
          ) : (
            /* Modo de Envio & Reenvio de Documentos */
            <div className="space-y-6">
              {hasRejectedDocs && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-sky-700 dark:text-sky-300 leading-relaxed flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 w-full">
                    <strong className="font-semibold block text-sm">
                      Readequação Solicitada pelo Gestor
                    </strong>
                    {documents.find((d) => d.status === "rejeitado" && d.review_notes)
                      ?.review_notes ? (
                      <div className="rounded-lg border border-sky-500/20 bg-sky-500/15 p-3 text-xs font-medium text-sky-800 dark:text-sky-200">
                        <span className="font-bold">Motivo Indicado pelo Gestor:</span>{" "}
                        {
                          documents.find((d) => d.status === "rejeitado" && d.review_notes)
                            ?.review_notes
                        }
                      </div>
                    ) : (
                      <p>
                        O Gestor solicitou o reenvio de um ou mais documentos. Por favor, reenvie os
                        arquivos solicitados.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Lista de Documentos */}
              <div className="space-y-4">
                {/* Foto do Rosto (3x4) - OBRIGATÓRIA */}
                <Card className="border-indigo-200 bg-indigo-50/20 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4 text-indigo-600" /> Foto do Rosto (tipo 3x4) — OBRIGATÓRIA
                      </span>
                      {getDocStatus("foto_rosto_3x4")?.status === "aprovado" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs font-medium"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Aprovado
                        </Badge>
                      ) : getDocStatus("foto_rosto_3x4") ? (
                        <Badge variant="outline" className="bg-indigo-500/15 text-indigo-700 border-indigo-500/30 text-xs">
                          Anexado
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Obrigatório
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Envie uma foto clara e legível do seu rosto estilo 3x4 (fundo neutro/claro). Esta foto será utilizada no seu perfil oficial de parceiro Delski.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Visualizador de Foto 3x4 / Avatar */}
                      <div className="relative group">
                        {getDocStatus("foto_rosto_3x4")?.public_url ? (
                          <img
                            src={getDocStatus("foto_rosto_3x4")?.public_url!}
                            alt="Foto do Rosto (3x4)"
                            className="w-24 h-28 object-cover rounded-xl border-2 border-indigo-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-24 h-28 rounded-xl border-2 border-dashed border-stone-300 bg-stone-100 flex flex-col items-center justify-center text-stone-400">
                            <Camera className="h-6 w-6 mb-1 text-stone-400" />
                            <span className="text-[10px] font-semibold text-stone-500">Foto 3x4</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 flex-1 w-full">
                        <Label className="cursor-pointer block">
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4 rounded-lg w-full sm:w-auto transition-colors shadow-sm">
                            {uploadingType === "foto_rosto_3x4" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {getDocStatus("foto_rosto_3x4") ? "Substituir Foto 3x4" : "Anexar Foto do Rosto (3x4)"}
                          </span>
                          <Input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="hidden"
                            disabled={uploadingType === "foto_rosto_3x4"}
                            onChange={(e) => handleFileUpload("foto_rosto_3x4", e)}
                          />
                        </Label>
                        <p className="text-[11px] text-stone-500">
                          Formatos aceitos: JPG, PNG, WEBP (máx. 10MB).
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Único: Documento de Identidade (RG ou CNH) */}
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span>Documento de Identidade (RG ou CNH)</span>
                      {getDocStatus("documento_identidade_1")?.status === "aprovado" && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs font-medium"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Aprovado
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Anexe a CNH (1 arquivo) ou o RG (2 arquivos: frente e verso).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Slot 1: Arquivo 1 (Frente ou CNH) */}
                      <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">Arquivo 1 (Frente ou CNH)</span>
                          {getDocStatus("documento_identidade_1")?.public_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-7 text-xs gap-1 text-indigo-600 font-medium"
                            >
                              <a
                                href={getDocStatus("documento_identidade_1")?.public_url!}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Eye className="h-3 w-3" /> Ver
                              </a>
                            </Button>
                          )}
                        </div>
                        <Label className="cursor-pointer block">
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 h-8 px-3 rounded-md w-full transition-colors shadow-sm">
                            {uploadingType === "documento_identidade_1" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            {getDocStatus("documento_identidade_1")
                              ? "Substituir Arquivo 1"
                              : "Anexar Arquivo 1"}
                          </span>
                          <Input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            disabled={uploadingType === "documento_identidade_1"}
                            onChange={(e) => handleFileUpload("documento_identidade_1", e)}
                          />
                        </Label>
                      </div>

                      {/* Slot 2: Arquivo 2 (Verso, se RG) */}
                      <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">
                            Arquivo 2 (Verso, se RG — opcional)
                          </span>
                          {getDocStatus("documento_identidade_2")?.public_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-7 text-xs gap-1 text-indigo-600 font-medium"
                            >
                              <a
                                href={getDocStatus("documento_identidade_2")?.public_url!}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Eye className="h-3 w-3" /> Ver
                              </a>
                            </Button>
                          )}
                        </div>
                        <Label className="cursor-pointer block">
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-8 px-3 rounded-md w-full transition-colors border">
                            {uploadingType === "documento_identidade_2" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            {getDocStatus("documento_identidade_2")
                              ? "Substituir Arquivo 2"
                              : "Anexar Arquivo 2"}
                          </span>
                          <Input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            disabled={uploadingType === "documento_identidade_2"}
                            onChange={(e) => handleFileUpload("documento_identidade_2", e)}
                          />
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comprovante de Residência */}
                <DocumentCard
                  type="comprovante_residencia"
                  title="Comprovante de Residência"
                  description="Conta de luz, água ou telefone emitida nos últimos 90 dias em seu nome."
                  doc={getDocStatus("comprovante_residencia")}
                  isUploading={uploadingType === "comprovante_residencia"}
                  onUpload={(e) => handleFileUpload("comprovante_residencia", e)}
                  errorMessage={uploadErrors["comprovante_residencia"]}
                />

                {/* Comprovante de CPF */}
                <DocumentCard
                  type="situacao_cadastral_cpf"
                  title="Comprovante de Situação Cadastral do CPF"
                  description="Comprovante emitido no site oficial da Receita Federal."
                  doc={getDocStatus("situacao_cadastral_cpf")}
                  isUploading={uploadingType === "situacao_cadastral_cpf"}
                  onUpload={(e) => handleFileUpload("situacao_cadastral_cpf", e)}
                  errorMessage={uploadErrors["situacao_cadastral_cpf"]}
                  extraInstruction={
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                      <Info className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>
                        Emita gratuitamente o seu comprovante em:{" "}
                        <a
                          href="https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5"
                        >
                          Consultar Situação Cadastral na Receita Federal{" "}
                          <ExternalLink className="h-3 w-3 ml-0.5" />
                        </a>
                      </span>
                    </div>
                  }
                />

                {/* Certidão de Antecedentes Criminais */}
                <DocumentCard
                  type="certidao_antecedentes_criminais"
                  title="Certidão de Antecedentes Criminais"
                  description="Certidão emitida gratuitamente no portal oficial da Polícia Federal."
                  doc={getDocStatus("certidao_antecedentes_criminais")}
                  isUploading={uploadingType === "certidao_antecedentes_criminais"}
                  onUpload={(e) => handleFileUpload("certidao_antecedentes_criminais", e)}
                  errorMessage={uploadErrors["certidao_antecedentes_criminais"]}
                  extraInstruction={
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                      <Info className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>
                        Emita gratuitamente em:{" "}
                        <a
                          href="https://servicos.pf.gov.br/epol-sinic-publico/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-0.5"
                        >
                          Emitir Certidão de Antecedentes Criminais na Polícia Federal{" "}
                          <ExternalLink className="h-3 w-3 ml-0.5" />
                        </a>
                      </span>
                    </div>
                  }
                />
              </div>

              {/* Botão Único: Enviar Documentos para Análise */}
              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  onClick={() => submitDocs.mutate(freelancerId)}
                  disabled={!hasAllRequiredAttached || submitDocs.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-2"
                >
                  {submitDocs.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Send className="h-3.5 w-3.5" /> Enviar Documentos para Análise
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOCO 3: Contrato para Assinatura */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-indigo-500" /> 3. Contrato para Assinatura
              </CardTitle>
              <CardDescription className="text-xs">
                Contratos emitidos pelo Gestor vinculados aos seus projetos na plataforma Delski.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loadingContracts ? (
            <p className="text-xs text-muted-foreground animate-pulse">
              Carregando contratos atribuídos a você...
            </p>
          ) : generatedContracts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center bg-muted/30 space-y-1">
              <FileSignature className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Nenhum contrato gerado pelo Gestor até o momento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {generatedContracts.map((contract: any) => {
                const isSigned =
                  contract.status === "assinado_freelancer" || contract.status === "concluido";

                return (
                  <div
                    key={contract.id}
                    className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm flex items-center gap-2">
                          Projeto: {contract.project?.title || "Contrato Geral"}
                          {isSigned ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Contrato Assinado Enviado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1 text-xs"
                            >
                              <Clock className="h-3 w-3" /> Aguardando Assinatura
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Modelo: {contract.model?.name || "Modelo Padrão"} • Gerado em{" "}
                          {new Date(contract.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {contract.pdf_path ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => {
                              const url = supabase
                                .storage
                                .from("contract-generated")
                                .getPublicUrl(contract.pdf_path).data.publicUrl;
                              handleDownloadContractFile(url, `Contrato_${profile?.full_name || "freelancer"}.pdf`);
                            }}
                          >
                            <Download className="h-3.5 w-3.5 text-indigo-500" /> Baixar Contrato em PDF
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            O contrato em PDF ainda não foi disponibilizado pelo gestor.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface DocumentCardProps {
  type: FreelancerDocumentType;
  title: string;
  description: string;
  doc?: FreelancerDocument;
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  extraInstruction?: React.ReactNode;
  errorMessage?: string;
}

function DocumentCard({
  type,
  title,
  description,
  doc,
  isUploading,
  onUpload,
  extraInstruction,
  errorMessage,
}: DocumentCardProps) {
  const isApproved = doc?.status === "aprovado";
  const isRejected = doc?.status === "rejeitado";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2">
            {title}
            {isApproved && (
              <Badge
                variant="outline"
                className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs"
              >
                <CheckCircle2 className="h-3 w-3" /> Aprovado
              </Badge>
            )}
            {!doc && (
              <Badge variant="secondary" className="text-xs">
                Pendente de anexo
              </Badge>
            )}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {doc?.public_url && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs gap-1.5 border-border hover:bg-muted text-indigo-600 dark:text-indigo-400 font-medium"
            >
              <a href={doc.public_url} target="_blank" rel="noreferrer">
                <Eye className="h-3.5 w-3.5" /> Visualizar Arquivo
              </a>
            </Button>
          )}

          {!isApproved && (
            <Label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 h-8 px-3 rounded-md transition-colors shadow-sm">
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />{" "}
                    {doc ? "Substituir Arquivo" : "Anexar Arquivo"}
                  </>
                )}
              </span>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                disabled={isUploading}
                onChange={onUpload}
              />
            </Label>
          )}
        </div>
      </div>

      {extraInstruction}
      {errorMessage ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
          <span className="font-semibold">Erro:</span> {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
