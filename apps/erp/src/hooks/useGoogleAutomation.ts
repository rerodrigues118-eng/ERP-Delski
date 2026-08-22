/**
 * ============================================================================
 * Hooks TanStack Query para Automações Google no Delski ERP
 * ============================================================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { googleAutomationService, type AutomationLogItem } from "@/services/googleAutomation";
import { toast } from "sonner";

export function useGoogleAutomationLogs() {
  return useQuery({
    queryKey: ["google-automation-logs"],
    queryFn: () => googleAutomationService.getLogs(30),
    refetchInterval: 15000, // Atualiza a cada 15s
  });
}

export function useTestGoogleConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => googleAutomationService.testConnection(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["google-automation-logs"] });

      const driveOk = data.results?.drive?.ok;
      const calOk = data.results?.calendar?.ok;
      const sheetsOk = data.results?.sheets?.ok;

      if (driveOk && calOk) {
        toast.success("Conexão com Google APIs validada com sucesso!");
      } else {
        toast.info("Diagnóstico Google executado. Verifique os resultados no painel.");
      }
    },
    onError: (err: any) => {
      toast.error(`Falha no teste de conexão: ${err.message || "Erro desconhecido"}`);
    },
  });
}

export function useCreateDriveFolders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof googleAutomationService.createDriveFolders>[0]) =>
      googleAutomationService.createDriveFolders(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-automation-logs"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Estrutura de pastas criada no Google Drive!");
    },
    onError: (err: any) => {
      console.warn("Aviso na criação de pastas no Drive:", err);
      toast.error("Não foi possível sincronizar pastas com o Google Drive.");
    },
  });
}

export function useUpsertCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof googleAutomationService.upsertCalendarEvent>[0]) =>
      googleAutomationService.upsertCalendarEvent(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-automation-logs"] });
      toast.success("Evento agendado no Google Calendar!");
    },
    onError: (err: any) => {
      console.warn("Aviso no agendamento do Calendar:", err);
    },
  });
}

export function useAppendSheetsData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof googleAutomationService.appendSheetsData>[0]) =>
      googleAutomationService.appendSheetsData(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-automation-logs"] });
    },
    onError: (err: any) => {
      console.warn("Aviso no registro do Sheets:", err);
    },
  });
}

export function useRetryAutomationLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (log: AutomationLogItem) => googleAutomationService.retryLog(log),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-automation-logs"] });
      toast.success("Automação reexecutada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Falha ao reexecutar: ${err.message}`);
    },
  });
}
