import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Upload,
  ExternalLink,
  CheckCircle2,
  FileCheck,
  Clock,
  Loader2,
  ShieldCheck,
  Plus,
  Building2,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClienteFinanceProjects } from "@/hooks/useProjects";
import { useClientDocuments, useUploadClientDocument } from "@/hooks/useClientDocuments";
import { Skeleton } from "@/components/ui/skeleton";
import { SERVICE_LABEL } from "@/mocks/types";
import type { ClientDocumentType } from "@/types/database";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos & Contratos — Portal do Cliente" },
      { name: "description", content: "Contratos dos projetos e gestão de documentos da empresa." },
    ],
  }),
  component: PortalDocumentosPage,
});

const DOC_TYPE_LABELS: Record<ClientDocumentType, string> = {
  contrato_assinado: "Contrato Assinado",
  comprovante_pagamento: "Comprovante de Pagamento",
  cartao_cnpj: "Cartão CNPJ / Contrato Social",
  outro: "Outros Documentos da Empresa",
};

export function PortalDocumentosPage() {
  const { user, loading } = useAuth();
  const clientId = user?.id;

  const { data: projects = [], isLoading: loadingProjects } = useClienteFinanceProjects(
    user?.id,
    user?.email,
  );
  const { data: extraDocuments = [], isLoading: loadingExtraDocs } = useClientDocuments(clientId);
  const uploadDoc = useUploadClientDocument();

  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null);
  const [selectedExtraType, setSelectedExtraType] =
    useState<ClientDocumentType>("comprovante_pagamento");
  const [isUploadingExtra, setIsUploadingExtra] = useState(false);

  if (loading || !user) {
    return (
      <div className="space-y-8 pb-12">
        <Skeleton className="h-40 w-full bg-stone-200 rounded-2xl" />
        <Skeleton className="h-64 w-full bg-stone-200 rounded-2xl" />
      </div>
    );
  }

  // Projects belonging to this client
  const clientProjects = projects.filter(
    (p) =>
      (user?.id && p.client_id === user.id) ||
      (user?.email && p.client?.email?.toLowerCase() === user.email.toLowerCase()),
  );

  const handleUploadProjectContract = async (
    projectId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;

    setUploadingProjectId(projectId);
    try {
      await uploadDoc.mutateAsync({
        clientId,
        projectId,
        documentType: "contrato_assinado",
        file,
      });
      toast.success("Contrato assinado enviado com sucesso para a Gestão!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao enviar contrato assinado.");
    } finally {
      setUploadingProjectId(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleUploadExtraDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;

    setIsUploadingExtra(true);
    try {
      await uploadDoc.mutateAsync({
        clientId,
        documentType: selectedExtraType,
        file,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao enviar documento.");
    } finally {
      setIsUploadingExtra(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">
                Documentos & contratos
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Documentos do seu projeto
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-3xl">
                Envie contratos assinados, comprovantes e documentos da sua empresa em um ambiente
                seguro.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4 text-sm text-foreground">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Próxima ação
              </p>
              <p className="mt-2 font-semibold text-foreground">Envie ou confira seus documentos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-stone-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" /> Contratos dos projetos
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Contratos vinculados aos projetos da sua conta.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {loadingProjects && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Carregando contratos vinculados...
            </div>
          )}

          {!loadingProjects && clientProjects.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground space-y-2">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                <FileText className="h-6 w-6" />
              </div>
              <p className="font-semibold text-foreground">Nenhum projeto vinculado no momento.</p>
              <p className="text-xs max-w-sm mx-auto">
                Assim que seus projetos forem iniciados pelo gestor, você poderá enviar e baixar
                contratos aqui.
              </p>
            </div>
          )}

          {!loadingProjects &&
            clientProjects.map((p) => {
              const hasContractFile = !!p.client_contract_url;
              const isUploadingThis = uploadingProjectId === p.id;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-stone-200 bg-slate-50 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-foreground flex flex-wrap gap-2 items-center">
                        {p.title}
                        <Badge
                          variant="outline"
                          className="text-[11px] bg-slate-100 text-indigo-600 border-indigo-200"
                        >
                          {SERVICE_LABEL[p.service_type] || p.service_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasContractFile
                          ? "Contrato disponível para download"
                          : "Aguardando emissão do contrato pelo gestor"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {hasContractFile && (
                      <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
                        <a href={p.client_contract_url!} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 text-indigo-500" /> Visualizar
                          contrato
                        </a>
                      </Button>
                    )}
                    <Label className="cursor-pointer">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 h-9 px-4 rounded-md transition-colors shadow-sm">
                        {isUploadingThis ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" /> Enviar contrato assinado
                          </>
                        )}
                      </span>
                      <Input
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        disabled={isUploadingThis}
                        onChange={(e) => handleUploadProjectContract(p.id, e)}
                      />
                    </Label>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      <Card className="bg-white border border-stone-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-stone-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" /> Documentos da Empresa &
                Comprovantes
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Envie comprovantes, contrato social e documentos da empresa.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-slate-50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <Plus className="h-3.5 w-3.5 text-indigo-600" /> Anexar novo documento
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-full sm:w-[280px]">
                <Select
                  value={selectedExtraType}
                  onValueChange={(val) => setSelectedExtraType(val as ClientDocumentType)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprovante_pagamento" className="text-xs">
                      Comprovante de Pagamento
                    </SelectItem>
                    <SelectItem value="cartao_cnpj" className="text-xs">
                      Cartão CNPJ / Contrato Social
                    </SelectItem>
                    <SelectItem value="outro" className="text-xs">
                      Outros Documentos
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 h-9 px-4 rounded-md transition-colors shadow-sm">
                  {isUploadingExtra ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" /> Selecionar arquivo
                    </>
                  )}
                </span>
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  disabled={isUploadingExtra}
                  onChange={handleUploadExtraDocument}
                />
              </Label>
            </div>
          </div>

          {loadingExtraDocs ? (
            <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
              Carregando documentos enviados...
            </div>
          ) : extraDocuments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-xs text-muted-foreground">
              Nenhum documento adicional enviado ainda.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {extraDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-semibold text-sm flex items-center gap-2">
                        {doc.document_type === "comprovante_pagamento" && (
                          <Receipt className="h-4 w-4 text-emerald-500" />
                        )}
                        {doc.document_type === "cartao_cnpj" && (
                          <Building2 className="h-4 w-4 text-indigo-500" />
                        )}
                        {doc.document_type === "outro" && (
                          <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                        )}
                        {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </h5>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Enviado em: {new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    {doc.status === "aprovado" && (
                      <Badge
                        variant="outline"
                        className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]"
                      >
                        Aprovado
                      </Badge>
                    )}
                    {doc.status === "pendente" && (
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]"
                      >
                        Em Análise
                      </Badge>
                    )}
                    {doc.status === "rejeitado" && (
                      <Badge
                        variant="outline"
                        className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]"
                      >
                        Rejeitado
                      </Badge>
                    )}
                  </div>

                  {doc.public_url && (
                    <div className="pt-3 border-t border-slate-200 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="gap-1 text-xs h-7 text-indigo-600"
                      >
                        <a href={doc.public_url} target="_blank" rel="noreferrer">
                          <Download className="h-3 w-3" /> Visualizar Arquivo
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
