/**
 * ============================================================================
 * Supabase Edge Function: google-automation
 * ============================================================================
 * 
 * Dispatcher e Worker das automações Google (Drive, Calendar, Sheets).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getGoogleOAuth2Client,
  GoogleDriveService,
  GoogleCalendarService,
  GoogleSheetsService,
} from "../_shared/googleService.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  action:
    | "test_connection"
    | "drive_create_client_project_folders"
    | "calendar_upsert_event"
    | "sheets_append_data"
    | "drive_update_permission"
    | "process_queue";
  entityId?: string;
  payload?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestPayload = await req.json();
    const { action, entityId, payload = {} } = body;

    // Inicializa o cliente autenticado do Google
    const authClient = getGoogleOAuth2Client();
    const driveService = new GoogleDriveService(authClient);
    const calendarService = new GoogleCalendarService(authClient);
    const sheetsService = new GoogleSheetsService(authClient);

    // ── 1. TESTE DE CONEXÃO E DIAGNÓSTICO ────────────────────────────────────
    if (action === "test_connection") {
      const results: Record<string, { ok: boolean; message: string; details?: any }> = {};

      // Teste Drive
      try {
        const rootFolderId = Deno.env.get("GOOGLE_ROOT_FOLDER_ID") || undefined;
        const testFolder = await driveService.createFolder(`[TESTE DELSKI ERP] - ${new Date().toISOString()}`, rootFolderId);
        results.drive = { ok: true, message: "Conexão com Google Drive ativa e validada.", details: testFolder };
      } catch (err: any) {
        results.drive = { ok: false, message: `Falha no Google Drive: ${err.message}` };
      }

      // Teste Calendar
      try {
        const testEvent = await calendarService.createOrUpdateEvent({
          summary: "Teste de Integração — Delski ERP",
          description: "Evento automático de validação do Google Calendar.",
          startIso: new Date(Date.now() + 600000).toISOString(),
        });
        results.calendar = { ok: true, message: "Conexão com Google Calendar ativa e validada.", details: testEvent };
      } catch (err: any) {
        results.calendar = { ok: false, message: `Falha no Google Calendar: ${err.message}` };
      }

      // Teste Sheets
      try {
        const spreadsheetId = Deno.env.get("GOOGLE_SHEETS_SPREADSHEET_ID") || "";
        if (!spreadsheetId) {
          results.sheets = { ok: false, message: "GOOGLE_SHEETS_SPREADSHEET_ID não configurado." };
        } else {
          await sheetsService.ensureSheetHeaders(spreadsheetId, "Projetos Ativos", [
            "ID", "Data Criação", "Projeto", "Cliente", "Vertical", "Orçamento (R$)", "Custo Freela (R$)", "Status"
          ]);
          results.sheets = { ok: true, message: "Conexão com Google Sheets ativa e validada." };
        }
      } catch (err: any) {
        results.sheets = { ok: false, message: `Falha no Google Sheets: ${err.message}` };
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. CRIAÇÃO DE ESTRUTURA DE PASTAS (DRIVE) ────────────────────────────
    if (action === "drive_create_client_project_folders") {
      const { clientId, clientName, projectId, projectName, rootFolderId } = payload;
      const effectiveRoot = rootFolderId || Deno.env.get("GOOGLE_ROOT_FOLDER_ID") || undefined;

      const folderResult = await driveService.createClientAndProjectStructure({
        clientName: clientName || "Cliente",
        projectName: projectName || undefined,
        rootFolderId: effectiveRoot,
      });

      // Atualiza banco de dados com os IDs das pastas
      if (clientId && folderResult.clientFolder?.id) {
        await supabase
          .from("clients")
          .update({ drive_folder_id: folderResult.clientFolder.id })
          .eq("id", clientId);
      }

      if (projectId && folderResult.projectFolder?.id) {
        await supabase
          .from("projects")
          .update({
            drive_folder_id: folderResult.projectFolder.id,
            google_drive_link: folderResult.mainLink,
          })
          .eq("id", projectId);
      }

      // Registra log com sucesso
      await supabase.from("automation_logs").insert({
        event_type: "drive_folder_creation",
        entity_id: projectId || clientId || entityId || "unknown",
        status: "success",
        payload: { folderResult, clientId, projectId },
      });

      return new Response(JSON.stringify({ success: true, data: folderResult }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. AGENDAMENTO NO GOOGLE CALENDAR ────────────────────────────────────
    if (action === "calendar_upsert_event") {
      const { eventId, summary, description, startIso, endIso, attendees, meetingLink, projectId, leadId } = payload;

      const eventResult = await calendarService.createOrUpdateEvent({
        eventId,
        summary,
        description,
        startIso,
        endIso,
        attendees,
        meetingLink,
      });

      const calendarEventId = eventResult.id;

      if (projectId && calendarEventId) {
        await supabase.from("projects").update({ calendar_event_id: calendarEventId }).eq("id", projectId);
      }

      if (leadId && calendarEventId) {
        await supabase.from("crm_leads").update({ calendar_event_id: calendarEventId }).eq("id", leadId);
      }

      // Registra log
      await supabase.from("automation_logs").insert({
        event_type: leadId ? "crm_meeting_calendar" : "calendar_event_upsert",
        entity_id: projectId || leadId || entityId || "unknown",
        status: "success",
        payload: { eventResult, projectId, leadId },
      });

      return new Response(JSON.stringify({ success: true, data: eventResult }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. CONSOLIDAÇÃO NO GOOGLE SHEETS ─────────────────────────────────────
    if (action === "sheets_append_data") {
      const { sheetName = "Fluxo de Caixa", rowValues = [], customSpreadsheetId } = payload;
      const spreadsheetId = customSpreadsheetId || Deno.env.get("GOOGLE_SHEETS_SPREADSHEET_ID") || "";

      if (!spreadsheetId) {
        throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID não configurado.");
      }

      // Garante cabeçalhos padrão se necessário
      if (sheetName === "Fluxo de Caixa") {
        await sheetsService.ensureSheetHeaders(spreadsheetId, "Fluxo de Caixa", [
          "Data", "Tipo", "Projeto Vinculado", "Categoria / Descrição", "Valor (R$)", "Status"
        ]);
      } else if (sheetName === "Projetos Ativos") {
        await sheetsService.ensureSheetHeaders(spreadsheetId, "Projetos Ativos", [
          "ID", "Data Criação", "Projeto", "Cliente", "Vertical", "Orçamento (R$)", "Custo Freela (R$)", "Status"
        ]);
      }

      const appendResult = await sheetsService.appendRow(spreadsheetId, sheetName, rowValues);

      await supabase.from("automation_logs").insert({
        event_type: "sheets_append",
        entity_id: entityId || "sheets_append",
        status: "success",
        payload: { sheetName, rowValues, appendResult },
      });

      return new Response(JSON.stringify({ success: true, data: appendResult }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. ATUALIZAÇÃO DE PERMISSÃO NO DRIVE (LEITOR) ────────────────────────
    if (action === "drive_update_permission") {
      const { fileId, emailAddress, role = "reader" } = payload;

      if (!fileId || !emailAddress) {
        throw new Error("Parâmetros fileId e emailAddress são obrigatórios.");
      }

      const permResult = await driveService.updateFilePermission(fileId, emailAddress, role);

      await supabase.from("automation_logs").insert({
        event_type: "drive_permission_update",
        entity_id: fileId,
        status: "success",
        payload: { fileId, emailAddress, role, permResult },
      });

      return new Response(JSON.stringify({ success: true, data: permResult }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Ação '${action}' desconhecida.` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[google-automation Error]:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
