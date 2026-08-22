#!/usr/bin/env node

/**
 * ============================================================================
 * Script Local de Obtenção de Google OAuth2 Refresh Token (Uso Manual / Único)
 * ============================================================================
 * 
 * Escopos solicitados:
 * - Google Drive (https://www.googleapis.com/auth/drive)
 * - Google Calendar (https://www.googleapis.com/auth/calendar)
 * - Google Spreadsheets (https://www.googleapis.com/auth/spreadsheets)
 * 
 * Uso:
 *   node scripts/get-google-refresh-token.mjs
 *   node scripts/get-google-refresh-token.mjs <caminho-do-client-secret.json>
 *   node scripts/get-google-refresh-token.mjs --code="<codigo_ou_url>"
 * ============================================================================
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { URL, URLSearchParams } from "node:url";
import { exec } from "node:child_process";

// 1. Identificar o caminho do arquivo client_secret_*.json e argumentos
let manualCodeOrUrl = "";

function resolveSecretFilePath() {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--code=") || arg.startsWith("--url=")) {
      manualCodeOrUrl = arg.split("=").slice(1).join("=");
      continue;
    }
    if (arg.startsWith("--file=") || arg.startsWith("--secret=") || arg.startsWith("--path=")) {
      return path.resolve(arg.split("=")[1]);
    }
    if (!arg.startsWith("-") && fs.existsSync(path.resolve(arg))) {
      return path.resolve(arg);
    }
  }

  if (process.env.GOOGLE_CLIENT_SECRET_PATH) {
    return path.resolve(process.env.GOOGLE_CLIENT_SECRET_PATH);
  }

  const searchDirs = [process.cwd(), path.join(process.cwd(), "scripts")];
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const matched = files.find(
        (f) => (f.startsWith("client_secret_") || f.startsWith("client_secret")) && f.endsWith(".json")
      );
      if (matched) {
        return path.join(dir, matched);
      }
    }
  }

  return null;
}

const secretPath = resolveSecretFilePath();

if (!secretPath || !fs.existsSync(secretPath)) {
  console.error("\n❌ Erro: Nenhum arquivo de credenciais 'client_secret_*.json' foi informado ou encontrado.");
  console.error("\nComo usar:");
  console.error("  node scripts/get-google-refresh-token.mjs caminho/para/client_secret_xxx.json\n");
  process.exit(1);
}

// 2. Leitura e parsing do JSON do Google Cloud
let credentials;
try {
  const fileContent = fs.readFileSync(secretPath, "utf-8");
  credentials = JSON.parse(fileContent);
} catch (err) {
  console.error(`\n❌ Falha ao ler ou interpretar o arquivo JSON em: ${secretPath}`);
  console.error(err.message);
  process.exit(1);
}

const config = credentials.installed || credentials.web || credentials;
const clientId = config.client_id;
const clientSecret = config.client_secret;

if (!clientId || !clientSecret) {
  console.error("\n❌ Erro: Formato inválido do arquivo de credenciais (requer client_id e client_secret).\n");
  process.exit(1);
}

// 3. Determinação de Porta e URI de Redirecionamento
const redirectUris = config.redirect_uris || [];
let redirectUri = redirectUris.find((uri) => uri.includes("localhost") || uri.includes("127.0.0.1")) || "http://localhost";

let parsedRedirect;
try {
  parsedRedirect = new URL(redirectUri);
} catch {
  parsedRedirect = new URL("http://localhost");
  redirectUri = "http://localhost";
}

// Se o redirectUri for "http://localhost", a porta padrão HTTP é 80
const port = parsedRedirect.port ? parseInt(parsedRedirect.port, 10) : (parsedRedirect.protocol === "https:" ? 443 : 80);
const pathname = parsedRedirect.pathname || "/";

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
];

// 4. Carrega googleapis ou fallback
let oauth2Client = null;
let authUrl = "";

try {
  const googleapis = await import("googleapis");
  const google = googleapis.google;
  oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
} catch {
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES.join(" "),
  });
  authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
}

// Função utilitária para trocar o código por refresh_token
async function exchangeCodeForToken(code) {
  let cleanCode = code.trim();
  if (cleanCode.includes("code=")) {
    try {
      const u = new URL(cleanCode.startsWith("http") ? cleanCode : `http://localhost/${cleanCode}`);
      cleanCode = u.searchParams.get("code") || cleanCode;
    } catch {
      const match = cleanCode.match(/code=([^&]+)/);
      if (match) cleanCode = decodeURIComponent(match[1]);
    }
  }

  if (oauth2Client) {
    const { tokens } = await oauth2Client.getToken(cleanCode);
    return tokens.refresh_token;
  } else {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: cleanCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      throw new Error(errJson.error_description || errJson.error || `HTTP ${tokenRes.status}`);
    }

    const tokens = await tokenRes.json();
    return tokens.refresh_token;
  }
}

// Se já foi passado o código ou URL via CLI
if (manualCodeOrUrl) {
  try {
    const refreshToken = await exchangeCodeForToken(manualCodeOrUrl);
    if (refreshToken) {
      console.log(refreshToken);
      process.exit(0);
    } else {
      console.error("\n⚠️ Nenhum refresh_token retornado. Revogue a permissão em https://myaccount.google.com/permissions e repita.");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ Erro ao trocar código:", err.message);
    process.exit(1);
  }
}

// 5. Interface de Terminal para Colar URL/Código Manualmente
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", async (line) => {
  const text = line.trim();
  if (!text) return;
  try {
    const refreshToken = await exchangeCodeForToken(text);
    if (refreshToken) {
      console.log(refreshToken);
      process.exit(0);
    } else {
      console.error("\n⚠️ Nenhum refresh_token retornado. Revogue em https://myaccount.google.com/permissions e repita.");
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ Falha ao processar código: ${err.message}`);
    console.error("Cole novamente a URL completa da barra de endereços do navegador:");
  }
});

// 6. Iniciar Servidor HTTP Local
const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || "/", `http://localhost:${port}`);

    if (reqUrl.pathname === "/favicon.ico") {
      res.writeHead(404);
      res.end();
      return;
    }

    const code = reqUrl.searchParams.get("code");
    const errorParam = reqUrl.searchParams.get("error");

    if (errorParam) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h2>Autorização Cancelada</h2><p>${errorParam}</p>`);
      server.close();
      console.error(`\n❌ Autorização cancelada: ${errorParam}\n`);
      process.exit(1);
    }

    if (!code) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h2>Aguardando autorização...</h2>");
      return;
    }

    const refreshToken = await exchangeCodeForToken(code);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Autorização Concluída!</title></head>
        <body style="font-family: system-ui, sans-serif; display: grid; place-content: center; height: 90vh; text-align: center; background: #0f172a; color: #f8fafc;">
          <div style="background: #1e293b; padding: 40px; border-radius: 16px; border: 1px solid #334155; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h2 style="margin: 0 0 8px 0; color: #38bdf8;">Autorização Concluída com Sucesso!</h2>
            <p style="color: #94a3b8; font-size: 14px;">O refresh token foi capturado com sucesso.<br>Você já pode fechar esta janela.</p>
          </div>
        </body>
      </html>
    `);

    server.close();
    if (refreshToken) {
      console.log(refreshToken);
      process.exit(0);
    } else {
      console.error("\n⚠️ Aviso: O Google não retornou um novo 'refresh_token'.");
      process.exit(1);
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h2>Erro:</h2><pre>${err.message}</pre>`);
    server.close();
    console.error("\n❌ Erro:", err.message);
    process.exit(1);
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE" || err.code === "EACCES") {
    // Se a porta 80 estiver ocupada ou restrita, informa para colar no terminal
    console.error(`\nℹ️ Servidor HTTP local não pôde usar a porta ${port} (${err.code}).`);
    console.error("👉 Sem problemas! Basta COPIAR a URL da barra de endereços do navegador e COLAR aqui neste terminal:");
  } else {
    console.error("\n❌ Erro no servidor local:", err.message);
  }
});

server.listen(port, () => {
  console.error("\n=======================================================");
  console.error("  Google OAuth2 - Gerador de Refresh Token (Manual)   ");
  console.error("=======================================================");
  console.error(`📁 Credenciais: ${path.basename(secretPath)}`);
  console.error(`🌐 Callback configurado para: ${redirectUri}`);
  console.error("\n📋 Caso o navegador não abra automaticamente, acesse:\n");
  console.error(authUrl);
  console.error("\n=======================================================");
  console.error("💡 DICA: Quando o Google redirecionar, você também pode simplesmente");
  console.error("COPIAR a URL inteira do seu navegador e COLAR aqui abaixo no terminal:\n");

  const startCmd =
    process.platform === "win32"
      ? `start "" "${authUrl}"`
      : process.platform === "darwin"
      ? `open "${authUrl}"`
      : `xdg-open "${authUrl}"`;

  exec(startCmd, () => {});
});
