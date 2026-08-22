/**
 * ============================================================================
 * Serviço Cliente de Automações Google (Delski ERP Front-End)
 * ============================================================================
 */

import { supabase } from "@/integrations/supabase/client";

export interface GoogleTestResult {
  ok: boolean;
  message: string;
  details?: any;
}

export interface GoogleTestResponse {
  success: boolean;
  results: {
    drive?: GoogleTestResult;
    calendar?: GoogleTestResult;
    sheets?: GoogleTestResult;
  };
  error?: string;
}

export interface AutomationLogItem {
  id: string;
  event_type: "drive_folder_creation" | "calendar_event_upsert" | "sheets_append" | "drive_permission_update" | "crm_meeting_calendar";
  entity_id: string;
  status: "pending" | "processing" | "retrying" | "success" | "error";
  attempts: number;
  last_error?: string | null;
  payload: any;
  created_at: string;
  updated_at: string;
}

/**
 * Invoca a Edge Function 'google-automation'
 */
async function invokeGoogleFunction<T>(action: string, payload?: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke("google-automation", {
    body: { action, payload },
  });

  if (error) {
    throw new Error(error.message || "Falha na comunicação com a Edge Function Google.");
  }

  if (data?.success === false && data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export const googleAutomationService = {
  /**
   * Testa o status de conexão com Google Drive, Calendar e Sheets
   */
  async testConnection(): Promise<GoogleTestResponse> {
    return await invokeGoogleFunction<GoogleTestResponse>("test_connection");
  },

  /**
   * Cria estrutura de pastas no Google Drive para Cliente e Projeto
   */
  async createDriveFolders(params: {
    clientId?: string;
    clientName: string;
    projectId?: string;
    projectName?: string;
    rootFolderId?: string;
  }) {
    return await invokeGoogleFunction("drive_create_client_project_folders", params);
  },

  /**
   * Cria ou atualiza evento no Google Calendar
   */
  async upsertCalendarEvent(params: {
    eventId?: string;
    summary: string;
    description?: string;
    startIso: string;
    endIso?: string;
    attendees?: string[];
    meetingLink?: string;
    projectId?: string;
    leadId?: string;
  }) {
    return await invokeGoogleFunction("calendar_upsert_event", params);
  },

  /**
   * Insere linha na Planilha Mestra do Google Sheets
   */
  async appendSheetsData(params: {
    sheetName: "Fluxo de Caixa" | "Projetos Ativos" | string;
    rowValues: (string | number)[];
    customSpreadsheetId?: string;
  }) {
    return await invokeGoogleFunction("sheets_append_data", params);
  },

  /**
   * Altera permissão no Google Drive para Leitor (conclusão)
   */
  async updateDrivePermission(params: {
    fileId: string;
    emailAddress: string;
    role?: "reader" | "commenter" | "writer";
  }) {
    return await invokeGoogleFunction("drive_update_permission", params);
  },

  /**
   * Busca histórico de logs da tabela automation_logs
   */
  async getLogs(limit = 20): Promise<AutomationLogItem[]> {
    const { data, error } = await supabase
      .from("automation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Erro ao buscar automation_logs:", error);
      return [];
    }

    return (data || []) as AutomationLogItem[];
  },

  /**
   * Reprocessa um log de automação com falha
   */
  async retryLog(log: AutomationLogItem) {
    if (log.event_type === "drive_folder_creation") {
      return await this.createDriveFolders(log.payload);
    } else if (log.event_type === "calendar_event_upsert" || log.event_type === "crm_meeting_calendar") {
      return await this.upsertCalendarEvent(log.payload);
    } else if (log.event_type === "sheets_append") {
      return await this.appendSheetsData(log.payload);
    } else if (log.event_type === "drive_permission_update") {
      return await this.updateDrivePermission(log.payload);
    }
  },
};
