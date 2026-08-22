/**
 * ============================================================================
 * Painel de Automação e Integrações Google (Delski ERP)
 * ============================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useGoogleAutomationLogs,
  useTestGoogleConnection,
  useRetryAutomationLog,
} from "@/hooks/useGoogleAutomation";
import {
  FolderCheck,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export function GoogleAutomationSection() {
  const { data: logs = [], isLoading: isLoadingLogs } = useGoogleAutomationLogs();
  const testConn = useTestGoogleConnection();
  const retryLog = useRetryAutomationLog();

  const [testResult, setTestResult] = useState<any>(null);

  const handleRunTest = async () => {
    try {
      const res = await testConn.mutateAsync();
      setTestResult(res);
    } catch (_err) {
      // toast já disparado pelo hook
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "drive_folder_creation":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px]">
            <FolderCheck className="h-3 w-3" /> Drive: Pastas
          </Badge>
        );
      case "calendar_event_upsert":
      case "crm_meeting_calendar":
        return (
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 gap-1 text-[11px]">
            <Calendar className="h-3 w-3" /> Calendar: Evento
          </Badge>
        );
      case "sheets_append":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
            <FileSpreadsheet className="h-3 w-3" /> Sheets: Linha
          </Badge>
        );
      case "drive_permission_update":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px]">
            <ShieldCheck className="h-3 w-3" /> Permissão Drive
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1">
            <CheckCircle2 className="h-3 w-3" /> Sucesso
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[11px] gap-1">
            <AlertCircle className="h-3 w-3" /> Erro
          </Badge>
        );
      case "processing":
      case "retrying":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1">
            <Clock className="h-3 w-3 animate-spin" /> Em Fila
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── CARD PRINCIPAL: STATUS DAS INTEGRAÇÕES ────────────────────────── */}
      <Card className="bg-card border border-border shadow-subtle rounded-2xl">
        <CardHeader className="border-b border-border/70 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-500" />
                Automações Google (Drive, Calendar & Sheets)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Conexão automatizada via OAuth 2.0 com a conta dedicada da Delski para geração de pastas, eventos e relatórios.
              </CardDescription>
            </div>

            <Button
              onClick={handleRunTest}
              disabled={testConn.isPending}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shrink-0"
            >
              <RotateCw className={`h-3.5 w-3.5 ${testConn.isPending ? "animate-spin" : ""}`} />
              {testConn.isPending ? "Testando Conexão..." : "Testar Conexão Google"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Status dos 3 Serviços */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Google Drive */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderCheck className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-bold text-foreground">Google Drive</span>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  Ativo
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Criação de pastas padronizadas para Clientes e Projetos (Briefing, Assets, Entregáveis).
              </p>
            </div>

            {/* Google Calendar */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-bold text-foreground">Google Calendar</span>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  Ativo
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Agendamento de prazos finais de projetos e sincronização de reuniões agendadas no CRM.
              </p>
            </div>

            {/* Google Sheets */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-foreground">Google Sheets</span>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  Ativo
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Consolidação contínua do Fluxo de Caixa e Projetos Ativos na Planilha Mestra.
              </p>
            </div>
          </div>

          {/* Resultado do Teste de Diagnóstico */}
          {testResult && testResult.results && (
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Diagnóstico de Conexão Recente
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  {testResult.results.drive?.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  )}
                  <span className="truncate">{testResult.results.drive?.message}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {testResult.results.calendar?.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  )}
                  <span className="truncate">{testResult.results.calendar?.message}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {testResult.results.sheets?.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  )}
                  <span className="truncate">{testResult.results.sheets?.message}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CARD: LOGS DE SINCRONIZAÇÃO EM TEMPO REAL ────────────────────── */}
      <Card className="bg-card border border-border shadow-subtle rounded-2xl">
        <CardHeader className="border-b border-border/70 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Histórico de Automações & Auditoria
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Logs de execução das chamadas para Google Drive, Calendar e Sheets com idempotência.
              </CardDescription>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {logs.length} {logs.length === 1 ? "registro" : "registros"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingLogs ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <RotateCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
              Carregando histórico de sincronização...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <FolderCheck className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Nenhum evento registrado até o momento. As automações serão registradas automaticamente conforme novas ações forem realizadas no ERP.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="px-5 py-3">Tipo de Evento</th>
                    <th className="px-5 py-3">Referência / Entidade</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Data / Hora</th>
                    <th className="px-5 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getEventBadge(log.event_type)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground truncate max-w-[160px]">
                        {log.entity_id}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                        {log.last_error && (
                          <span className="block text-[10px] text-rose-500 mt-0.5 truncate max-w-[200px]" title={log.last_error}>
                            {log.last_error}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground text-[11px]">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {log.status === "error" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryLog.mutate(log)}
                            disabled={retryLog.isPending}
                            className="h-7 text-[11px] gap-1 px-2.5"
                          >
                            <RotateCw className="h-3 w-3" /> Reexecutar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
