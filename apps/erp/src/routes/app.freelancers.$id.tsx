import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  ShieldCheck,
  FileSignature,
  MoreVertical,
  CheckCheck,
  XOctagon,
  Save,
  Info,
  Eye,
  Download,
  Upload,
  Ban,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useToggleFreelancerBlock, useDeleteFreelancer } from "@/hooks/useProfiles";
import {
  useFreelancerContractInfo,
  useFreelancerDocuments,
  useReviewFreelancerDocument,
  useBatchReviewFreelancerDocuments,
  useFreelancerGeneratedContracts,
  useSaveFreelancerContractFields,
  useFreelancerContractVariables,
  useUploadManagerContractPdf,
  type FreelancerDocument,
} from "@/hooks/useFreelancerContractFields";

export const Route = createFileRoute("/app/freelancers/$id")({
  head: () => ({
    meta: [{ title: "Perfil do Freelancer — DELSKI CLOUD" }],
  }),
  component: FreelancerDetailPage,
});

const DOC_TYPE_LABELS: Record<string, string> = {
  foto_rosto_3x4: "Foto do Rosto (tipo 3x4)",
  documento_identidade_1: "Documento de Identidade (RG/CNH)",
  documento_identidade_2: "Documento de Identidade — Verso",
  rg_frente: "RG — Frente",
  rg_verso: "RG — Verso",
  cnh: "CNH (Carteira Nacional de Habilitação)",
  comprovante_residencia: "Comprovante de Residência",
  situacao_cadastral_cpf: "Comprovante de Situação Cadastral do CPF",
  certidao_antecedentes_criminais: "Certidão de Antecedentes Criminais",
};

function humanizeFieldName(key: string, variables: any[] = []): string {
  const matched = variables.find((v) => v.name === key);
  if (matched?.label && matched.label.trim().length > 0) {
    return matched.label;
  }

  const map: Record<string, string> = {
    valor_inteiro: "Valor Inteiro",
    email_contratado: "E-mail",
    cnpj_cpf_contratado: "CNPJ / CPF do Contratado",
    telefone_contratado: "Telefone do Contratado",
    nome_responsavel_contratado: "Nome do Responsável",
    endereco_completo_contratado: "Endereço Completo",
    razao_social_nome_contratado: "Razão Social / Nome do Contratado",
    area_atuacao_funcao_contratado: "Área de Atuação / Função",
    dados_bancarios_pix_contratado: "Dados Bancários PIX",
  };

  if (map[key.toLowerCase()]) {
    return map[key.toLowerCase()];
  }

  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/\bCpf\b/g, "CPF")
    .replace(/\bCnpj\b/g, "CNPJ")
    .replace(/\bPix\b/g, "PIX")
    .replace(/\bEmail\b/g, "E-mail");
}

function FreelancerDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [profile, setProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const handleDownloadContractFile = (url?: string | null, filename?: string) => {
    if (!url) {
      toast.error("O arquivo do contrato não está disponível para download.");
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.download = filename || `Contrato_${profile?.full_name || "freelancer"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeFreelancerId = profile?.id || id;

  const contractVariables = useFreelancerContractVariables();
  const { data: contractInfo } = useFreelancerContractInfo(activeFreelancerId);
  const { data: documents = [], isLoading: loadingDocs } =
    useFreelancerDocuments(activeFreelancerId);
  const { data: contracts = [], isLoading: loadingContracts } =
    useFreelancerGeneratedContracts(activeFreelancerId);
  const reviewDoc = useReviewFreelancerDocument();
  const batchReviewDoc = useBatchReviewFreelancerDocuments();
  const saveContractFields = useSaveFreelancerContractFields();
  const uploadManagerContractPdf = useUploadManagerContractPdf();
  const toggleBlock = useToggleFreelancerBlock();
  const deleteFreelancer = useDeleteFreelancer();

  const [openDeleteFreelancerModal, setOpenDeleteFreelancerModal] = useState(false);

  // Rejection modal state
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [rejectingDoc, setRejectingDoc] = useState<FreelancerDocument | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [uploadingContractPdfId, setUploadingContractPdfId] = useState<string | null>(null);

  // Editable contract field values state
  const [editableFieldValues, setEditableFieldValues] = useState<Record<string, string>>({});
  const [isSavingContractFields, setIsSavingContractFields] = useState(false);
  const [finalizingContractId, setFinalizingContractId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingProfile(true);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (isMounted && p) {
        setProfile(p);
        setLoadingProfile(false);
        return;
      }

      const { data: pAuth } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_user_id", id)
        .maybeSingle();
      if (isMounted && pAuth) {
        setProfile(pAuth);
        setLoadingProfile(false);
        return;
      }

      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "freelancer")
        .limit(1);
      if (isMounted) {
        setProfile(allProfiles?.[0] ?? null);
        setLoadingProfile(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (contractInfo?.contract_field_values) {
      setEditableFieldValues(contractInfo.contract_field_values);
    }
  }, [contractInfo]);

  if (loadingProfile) {
    return (
      <div className="p-16 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-sm text-muted-foreground">Carregando ficha do freelancer...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-16 text-center space-y-4 max-w-md mx-auto">
        <p className="text-base font-semibold text-muted-foreground">
          Perfil de freelancer não encontrado ou atualizado.
        </p>
        <Button asChild variant="outline" className="bg-indigo-600 text-white hover:bg-indigo-700">
          <Link to="/app/freelancers">Voltar para lista de freelancers</Link>
        </Button>
      </div>
    );
  }

  const isContractComplete = contractInfo?.contract_fields_status === "completo";
  const docStatus = contractInfo?.documents_status ?? "pendente";

  // ── Handlers de Ações em Lote de Documentos ──────────────────────────────────
  const handleApproveAllDocuments = async () => {
    const pendingDocs = documents.filter((d) => d.status !== "aprovado");
    if (pendingDocs.length === 0) {
      return toast.info("Todos os documentos já estão aprovados!");
    }

    setIsBatchProcessing(true);
    try {
      await batchReviewDoc.mutateAsync({
        freelancerId: activeFreelancerId,
        status: "aprovado",
      });
      toast.success("Todos os documentos foram aprovados com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao aprovar documentos em lote.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectReason.trim()) {
      return toast.error("Informe o motivo da solicitação de adequação.");
    }

    const reason = rejectReason.trim();
    const targetDoc = rejectingDoc;

    // Immediately close modal and reset state to prevent modal loop
    setOpenRejectModal(false);
    setRejectingDoc(null);
    setRejectReason("");

    setIsBatchProcessing(true);
    try {
      if (targetDoc) {
        // Rejecting only one specific document
        await reviewDoc.mutateAsync({
          documentId: targetDoc.id,
          freelancerId: activeFreelancerId,
          status: "rejeitado",
          reviewNotes: reason,
        });
        toast.success(
          `Solicitada adequação para "${DOC_TYPE_LABELS[targetDoc.document_type] || targetDoc.document_type}".`,
        );
      } else {
        // Bulk rejecting ALL documents in ONE SINGLE SQL query
        await batchReviewDoc.mutateAsync({
          freelancerId: activeFreelancerId,
          status: "rejeitado",
          reviewNotes: reason,
        });
        toast.success("Solicitada adequação para todos os documentos do freelancer.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao solicitar adequação.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // ── Handlers de Edição de Dados de Contrato pelo Gestor ────────────────────────
  const handleContractFieldChange = (key: string, value: string) => {
    setEditableFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveContractFields = async () => {
    setIsSavingContractFields(true);
    try {
      await saveContractFields.mutateAsync({
        freelancerId: activeFreelancerId,
        values: editableFieldValues,
        requiredVariables: contractVariables,
      });
      toast.success("Dados cadastrais do contrato salvos e atualizados com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar dados cadastrais.");
    } finally {
      setIsSavingContractFields(false);
    }
  };

  const handleUploadManagerPdf = async (contractId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingContractPdfId(contractId);
    try {
      await uploadManagerContractPdf.mutateAsync({
        contractId,
        freelancerId: activeFreelancerId,
        file,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Falha ao enviar o contrato em PDF.");
    } finally {
      setUploadingContractPdfId(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleFinalizeContract = async (contractId: string) => {
    setFinalizingContractId(contractId);
    try {
      const { error } = await (supabase.from("generated_contracts") as any)
        .update({ status: "concluido", updated_at: new Date().toISOString() })
        .eq("id", contractId);

      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["freelancer_generated_contracts", activeFreelancerId] });
      toast.success("Contrato finalizado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao finalizar contrato.");
    } finally {
      setFinalizingContractId(null);
    }
  };

  // Build field keys list from contractVariables + existing editableFieldValues
  const allFieldKeys = Array.from(
    new Set([...contractVariables.map((v) => v.name), ...Object.keys(editableFieldValues)]),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
              {profile.full_name}
            </h1>
            <Badge
              variant="outline"
              className="border-stone-200 bg-stone-50 text-stone-700 capitalize text-xs"
            >
              {profile.role || "Freelancer"}
            </Badge>
          </div>
          <p className="text-sm text-stone-500 mt-1">{profile.email}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">
              Status Geral
            </p>
            {docStatus === "aprovado" ? (
              <Badge className="bg-green-100 text-green-900 border-green-300 font-bold gap-1 shadow-sm hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3" /> APROVADO
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-500/15 text-amber-700 border-amber-500/30 font-semibold gap-1"
              >
                <AlertCircle className="h-3 w-3" /> Pendente
              </Badge>
            )}
          </div>

          <div className="text-right">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">
              Dados de Contrato
            </p>
            <Badge
              variant="outline"
              className={
                isContractComplete
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-semibold"
                  : "bg-amber-500/15 text-amber-700 border-amber-500/30 font-semibold"
              }
            >
              {isContractComplete ? "Completo" : "Pendente"}
            </Badge>
          </div>

          <div className="text-right">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">Documentos</p>
            <Badge
              variant="outline"
              className={
                docStatus === "aprovado"
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-semibold"
                  : docStatus === "em_analise"
                    ? "bg-blue-500/15 text-blue-700 border-blue-500/30 font-semibold"
                    : docStatus === "rejeitado"
                      ? "bg-rose-500/15 text-rose-700 border-rose-500/30 font-semibold"
                      : "bg-amber-500/15 text-amber-700 border-amber-500/30 font-semibold"
              }
            >
              {docStatus === "aprovado"
                ? "Aprovado"
                : docStatus === "em_analise"
                  ? "Em Análise"
                  : docStatus === "rejeitado"
                    ? "Adequação Solicitada"
                    : "Pendente"}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toggleBlock.mutate({
                id: activeFreelancerId,
                newStatus: profile.status === "bloqueado" ? "ativo" : "bloqueado",
              })
            }
            className={
              profile.status === "bloqueado"
                ? "text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 gap-1.5"
                : "text-xs border-amber-500/30 text-amber-600 hover:bg-amber-50 gap-1.5"
            }
          >
            <Ban className="h-3.5 w-3.5" />
            {profile.status === "bloqueado" ? "Ativar Acesso" : "Bloquear Acesso"}
          </Button>

          <Dialog open={openDeleteFreelancerModal} onOpenChange={setOpenDeleteFreelancerModal}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" /> Excluir Freelancer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-600">
                  <Trash2 className="h-5 w-5" /> Excluir Perfil do Freelancer
                </DialogTitle>
                <DialogDescription>
                  Tem certeza de que deseja excluir o freelancer{" "}
                  <strong>"{profile.full_name}"</strong>? O cadastro, documentos e permissões
                  serão excluídos do banco de dados.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                <Button variant="outline" onClick={() => setOpenDeleteFreelancerModal(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteFreelancer.isPending}
                  onClick={() => {
                    deleteFreelancer.mutate(activeFreelancerId, {
                      onSuccess: () => {
                        setOpenDeleteFreelancerModal(false);
                        navigate({ to: "/app/freelancers" });
                      },
                    });
                  }}
                >
                  {deleteFreelancer.isPending ? "Excluindo..." : "Sim, Excluir Freelancer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" asChild>
            <Link to="/app/freelancers">Voltar</Link>
          </Button>
        </div>
      </div>

      {/* 1. BLOCO: Documentos Pessoais & Validação Cadastral */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" /> Documentos Pessoais & Validação
                Cadastral
              </CardTitle>
              <CardDescription className="text-xs">
                Análise e validação dos documentos comprobatórios do freelancer ({documents.length}{" "}
                enviado(s)).
              </CardDescription>
            </div>

            {/* Ações em Lote no Topo */}
            {documents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-sm"
                  disabled={isBatchProcessing || reviewDoc.isPending}
                  onClick={handleApproveAllDocuments}
                >
                  {isBatchProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )}
                  Aprovar Todos os Documentos
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 font-medium gap-1.5 shadow-sm"
                  disabled={isBatchProcessing || reviewDoc.isPending}
                  onClick={() => {
                    setRejectingDoc(null);
                    setRejectReason("");
                    setOpenRejectModal(true);
                  }}
                >
                  <XOctagon className="h-3.5 w-3.5" /> Solicitar Adequação
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.some((d) => d.status === "rejeitado" && d.review_notes) && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Motivo da Adequação Registrado:</span>{" "}
                {documents.find((d) => d.status === "rejeitado" && d.review_notes)?.review_notes}
              </div>
            </div>
          )}

          {loadingDocs ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Buscando documentos...
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum documento comprobatório foi enviado por este freelancer até o momento.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Enviado em: {new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      {doc.status === "aprovado" && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs font-medium"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Aprovado
                        </Badge>
                      )}
                      {doc.status === "pendente" && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1 text-xs font-medium"
                        >
                          <Clock className="h-3 w-3" /> Em Análise
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    {doc.public_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="gap-1.5 text-xs h-8 text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        <a href={doc.public_url} target="_blank" rel="noreferrer">
                          <Eye className="h-3.5 w-3.5" /> Visualizar Arquivo
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem URL</span>
                    )}

                    {/* Ação secundária discreta por documento */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950 cursor-pointer gap-2"
                          onClick={() => {
                            setRejectingDoc(doc);
                            setRejectReason(doc.review_notes || "");
                            setOpenRejectModal(true);
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Rejeitar apenas este
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. BLOCO: Dados Cadastrais para Minutas de Contrato */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" /> Dados Cadastrais para Minutas de
            Contrato
          </CardTitle>
          <CardDescription className="text-xs">
            Valores cadastrais reutilizados nas minutas de contrato da agência Delski.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Aviso Discreto de Edição Administrativa */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              Estes dados foram preenchidos pelo freelancer. Edite apenas se necessário — alterações
              aqui também atualizam o cadastro dele.
            </span>
          </div>

          {allFieldKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-2">
              Nenhum dado cadastral para contrato foi configurado ou preenchido ainda por este
              profissional.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allFieldKeys.map((key) => {
                const labelText = humanizeFieldName(key, contractVariables);
                const val = editableFieldValues[key] ?? "";
                return (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">{labelText}</Label>
                    <Input
                      value={val}
                      onChange={(e) => handleContractFieldChange(key, e.target.value)}
                      placeholder={`Informe ${labelText}`}
                      className="text-xs h-9"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {allFieldKeys.length > 0 && (
            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                onClick={handleSaveContractFields}
                disabled={isSavingContractFields}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-2"
              >
                {isSavingContractFields ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar Alterações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. BLOCO: Contratos Gerados & Assinados */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-indigo-600" /> Contratos Gerados & Assinados
          </CardTitle>
          <CardDescription className="text-xs">
            Acompanhe o envio do contrato assinado pelo freelancer e finalize o processo contratual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingContracts ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" /> Buscando contratos...
            </div>
          ) : contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nenhum contrato gerado para este freelancer ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract: any) => {
                const isSigned = contract.status === "assinado_freelancer";
                const isConcluido = contract.status === "concluido";

                return (
                  <div
                    key={contract.id}
                    className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm">
                          Projeto: {contract.project?.title || "Contrato Geral"}
                        </h4>
                        {isConcluido && (
                          <Badge className="bg-emerald-600 text-white text-xs">Concluído</Badge>
                        )}
                        {isSigned && (
                          <Badge className="bg-blue-600 text-white text-xs">
                            Assinado pelo Freelancer
                          </Badge>
                        )}
                        {!isSigned && !isConcluido && (
                          <Badge variant="outline" className="text-xs">
                            Pendente Assinatura
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Modelo: {contract.model?.name || "Padrão"} • Emitido em{" "}
                        {new Date(contract.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {contract.pdf_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() =>
                            handleDownloadContractFile(
                              supabase
                                .storage
                                .from("contract-generated")
                                .getPublicUrl(contract.pdf_path).data.publicUrl,
                              `Contrato_${profile?.full_name || "freelancer"}.pdf`,
                            )
                          }
                        >
                          <Download className="h-3.5 w-3.5" /> Baixar Contrato (PDF)
                        </Button>
                      )}

                      {!contract.pdf_path && (
                        <Label className="cursor-pointer">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 h-8 px-3 rounded-md transition-colors shadow-sm">
                            {uploadingContractPdfId === contract.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
                              </>
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5" /> Enviar PDF ao Freelancer
                              </>
                            )}
                          </span>
                          <Input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            disabled={uploadingContractPdfId === contract.id}
                            onChange={(e) => handleUploadManagerPdf(contract.id, e)}
                          />
                        </Label>
                      )}

                      {contract.signed_docx_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 text-xs gap-1 text-emerald-600"
                        >
                          <a href={contract.signed_docx_path} target="_blank" rel="noreferrer">
                            <Download className="h-3.5 w-3.5" /> Contrato Assinado
                          </a>
                        </Button>
                      )}

                      {isSigned && !isConcluido && (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          disabled={finalizingContractId === contract.id}
                          onClick={() => handleFinalizeContract(contract.id)}
                        >
                          {finalizingContractId === contract.id && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                          Finalizar Contrato
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Solicitar Adequação de Documento (Geral ou Específico) */}
      <Dialog
        open={openRejectModal}
        onOpenChange={(open) => {
          setOpenRejectModal(open);
          if (!open) {
            setRejectingDoc(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-rose-600">
              <XOctagon className="h-5 w-5" />
              {rejectingDoc
                ? "Solicitar Adequação do Documento"
                : "Solicitar Adequação dos Documentos"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {rejectingDoc ? (
                <>
                  Informe o motivo pelo qual o documento{" "}
                  <strong className="text-foreground">
                    {DOC_TYPE_LABELS[rejectingDoc.document_type] || rejectingDoc.document_type}
                  </strong>{" "}
                  precisa ser reenviado pelo freelancer.
                </>
              ) : (
                <>
                  Informe a orientação para o freelancer. Todos os documentos não aprovados serão
                  marcados com este motivo para readequação.
                </>
              )}
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo / Orientação (Obrigatório)</Label>
              <Textarea
                placeholder="Ex: Imagem cortada ou documento ilegível. Por favor, reenvie a foto nítida do documento original."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" size="sm" onClick={() => setOpenRejectModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRejection}
              disabled={isBatchProcessing || !rejectReason.trim()}
            >
              {isBatchProcessing ? "Salvando..." : "Confirmar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
