/**
 * ============================================================================
 * Google Integration Shared Service (Deno / Supabase Edge Functions)
 * ============================================================================
 * 
 * Gerencia autenticação OAuth2 (com auto-refresh via refresh_token)
 * e fornece serviços resilientes para Google Drive, Google Calendar e Google Sheets.
 */

import { google } from "npm:googleapis@^144.0.0";

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export function getGoogleOAuth2Client(creds?: Partial<GoogleCredentials>) {
  const clientId = creds?.clientId || Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = creds?.clientSecret || Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = creds?.refreshToken || Deno.env.get("GOOGLE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Credenciais do Google ausentes no ambiente (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Wrapper de resiliência com Backoff Exponencial + Jitter
 * - Tenta até 3 vezes em caso de Rate Limit (HTTP 429) ou erro 5xx do Google
 * - Fail-fast imediato em erros de credencial/permissão (401, 403, 404)
 */
export async function callGoogleApiWithRetry<T>(
  apiFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      return await apiFn();
    } catch (err: any) {
      const status = err?.status || err?.code || err?.response?.status;
      const isRetryable = status === 429 || (status >= 500 && status <= 599);

      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }

      // Backoff: 1s, 2s, 4s + jitter de até 500ms
      const baseDelay = Math.pow(2, attempt - 1) * 1000;
      const jitter = Math.floor(Math.random() * 500);
      const delay = baseDelay + jitter;

      console.warn(`[Google API Retry] Tentativa ${attempt} falhou (Status: ${status}). Aguardando ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Limite de ${maxRetries} tentativas excedido na chamada da Google API.`);
}

// ── SERVIÇO: GOOGLE DRIVE ───────────────────────────────────────────────────

export class GoogleDriveService {
  private drive;

  constructor(authClient: any) {
    this.drive = google.drive({ version: "v3", auth: authClient });
  }

  async createFolder(name: string, parentFolderId?: string) {
    return await callGoogleApiWithRetry(async () => {
      const fileMetadata: any = {
        name,
        mimeType: "application/vnd.google-apps.folder",
      };
      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const res = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: "id, name, webViewLink, webContentLink",
      });

      return res.data;
    });
  }

  async createClientAndProjectStructure(params: {
    clientName: string;
    projectName?: string;
    rootFolderId?: string;
  }) {
    const { clientName, projectName, rootFolderId } = params;

    // 1. Cria ou obtém a pasta do Cliente
    const clientFolder = await this.createFolder(`Cliente — ${clientName}`, rootFolderId);
    const clientFolderId = clientFolder.id!;

    let targetFolderId = clientFolderId;
    let projectFolder: any = null;

    // 2. Se houver projeto, cria a subpasta do Projeto
    if (projectName) {
      projectFolder = await this.createFolder(`Projeto — ${projectName}`, clientFolderId);
      targetFolderId = projectFolder.id!;
    }

    // 3. Cria subpastas estruturadas
    const subfolders = [
      "01_Briefing_e_Documentos",
      "02_Assets_e_Arquivos_Brutos",
      "03_Entregaveis_Finais",
      "04_Contratos_Assinados",
    ];

    const createdSubfolders: Record<string, any> = {};
    for (const sub of subfolders) {
      const created = await this.createFolder(sub, targetFolderId);
      createdSubfolders[sub] = created;
    }

    return {
      clientFolder,
      projectFolder: projectFolder || clientFolder,
      subfolders: createdSubfolders,
      mainLink: (projectFolder || clientFolder).webViewLink,
    };
  }

  async updateFilePermission(fileId: string, emailAddress: string, role: "reader" | "commenter" | "writer") {
    return await callGoogleApiWithRetry(async () => {
      const res = await this.drive.permissions.create({
        fileId,
        requestBody: {
          type: "user",
          role,
          emailAddress,
        },
        fields: "id, role, emailAddress",
      });
      return res.data;
    });
  }
}

// ── SERVIÇO: GOOGLE CALENDAR ────────────────────────────────────────────────

export class GoogleCalendarService {
  private calendar;

  constructor(authClient: any) {
    this.calendar = google.calendar({ version: "v3", auth: authClient });
  }

  async createOrUpdateEvent(params: {
    eventId?: string;
    calendarId?: string;
    summary: string;
    description?: string;
    startIso: string;
    endIso?: string;
    attendees?: string[];
    meetingLink?: string;
  }) {
    const {
      eventId,
      calendarId = "primary",
      summary,
      description = "",
      startIso,
      endIso,
      attendees = [],
      meetingLink,
    } = params;

    return await callGoogleApiWithRetry(async () => {
      // Se endIso não for fornecido, define 1 hora após o início
      const startDateTime = new Date(startIso);
      const endDateTime = endIso ? new Date(endIso) : new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const eventBody: any = {
        summary,
        description: meetingLink ? `${description}\n\n🔗 Link da Reunião: ${meetingLink}` : description,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "America/Sao_Paulo",
        },
        attendees: attendees.map((email) => ({ email })),
      };

      if (eventId) {
        // Atualiza evento existente
        const res = await this.calendar.events.update({
          calendarId,
          eventId,
          requestBody: eventBody,
        });
        return res.data;
      } else {
        // Cria novo evento
        const res = await this.calendar.events.insert({
          calendarId,
          requestBody: eventBody,
        });
        return res.data;
      }
    });
  }

  async deleteEvent(eventId: string, calendarId = "primary") {
    return await callGoogleApiWithRetry(async () => {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
      return { success: true };
    });
  }
}

// ── SERVIÇO: GOOGLE SHEETS ──────────────────────────────────────────────────

export class GoogleSheetsService {
  private sheets;

  constructor(authClient: any) {
    this.sheets = google.sheets({ version: "v4", auth: authClient });
  }

  async ensureSheetHeaders(spreadsheetId: string, sheetName: string, headers: string[]) {
    return await callGoogleApiWithRetry(async () => {
      try {
        const getRes = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A1:Z1`,
        });

        // Se já existem linhas no cabeçalho, não sobrescreve
        if (getRes.data.values && getRes.data.values.length > 0) {
          return { initialized: true, headersExisted: true };
        }
      } catch (_err) {
        // Aba pode não ter dados ainda
      }

      // Adiciona os cabeçalhos
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers],
        },
      });

      return { initialized: true, headersExisted: false };
    });
  }

  async appendRow(spreadsheetId: string, sheetName: string, rowValues: (string | number)[]) {
    return await callGoogleApiWithRetry(async () => {
      const res = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowValues],
        },
      });

      return res.data;
    });
  }
}
