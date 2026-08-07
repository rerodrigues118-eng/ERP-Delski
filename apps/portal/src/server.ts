import "./lib/error-capture";

import "@tanstack/react-start/server-only";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://jrcyhfjubqtiwbttjeiv.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceSupabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey ?? "", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const CONTRACT_TEMPLATES_BUCKET = "contract-templates";
const CONTRACT_GENERATED_BUCKET = "contract-generated";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function extractVariablesFromDocx(buffer: ArrayBuffer | Uint8Array | Buffer) {
  const { default: PizZip } = await import("pizzip");

  const zip = new PizZip(buffer);
  const xmlFileNames = Object.keys(zip.files).filter((name) => name.endsWith(".xml"));
  const regex = /\{\{(.+?)\}\}/g;
  const variables = new Set<string>();

  for (const fileName of xmlFileNames) {
    const file = zip.file(fileName);
    if (!file) continue;
    const content = file.asText();
    for (const match of content.matchAll(regex)) {
      const raw = match[1]?.trim();
      if (raw) variables.add(raw);
    }
  }

  return Array.from(variables);
}

function escapeXmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

class DocxTemplateParseError extends Error {
  public errors?: unknown[];

  constructor(message: string, errors?: unknown[]) {
    super(message);
    this.name = "DocxTemplateParseError";
    this.errors = errors;
  }
}

async function replaceDocxPlaceholdersWithValues(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  values: Record<string, unknown>,
) {
  const { default: PizZip } = await import("pizzip");
  const zip = new PizZip(buffer);
  const xmlFiles = Object.keys(zip.files).filter(
    (name) => name.startsWith("word/") && name.endsWith(".xml"),
  );

  const keys = Object.keys(values).sort((a, b) => b.length - a.length);
  let modified = false;

  for (const fileName of xmlFiles) {
    const file = zip.file(fileName);
    if (!file) continue;

    let content = file.asText();
    let changed = false;
    for (const key of keys) {
      const placeholder = `{{${key}}}`;
      if (!content.includes(placeholder)) continue;
      const replacement = escapeXmlText(String(values[key] ?? ""));
      content = content.split(placeholder).join(replacement);
      changed = true;
    }

    if (changed) {
      zip.file(fileName, content);
      modified = true;
    }
  }

  if (!modified) return null;
  return zip.generate({ type: "nodebuffer" });
}

async function generateDocxFromTemplate(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  values: Record<string, unknown>,
) {
  const [{ default: PizZip }, { default: Docxtemplater }] = await Promise.all([
    import("pizzip"),
    import("docxtemplater"),
  ]);

  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  try {
    doc.setData(values);
    doc.render();
    return doc.getZip().generate({ type: "nodebuffer" });
  } catch (error) {
    const errors = (error as any)?.properties?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const malformedTags = errors
        .map((err: any) => {
          if (!err || typeof err !== "object") return undefined;
          return (
            err.properties?.name || err.properties?.tag || err.message || undefined
          ) as string | undefined;
        })
        .filter(Boolean) as string[];

      const detail = malformedTags.length
        ? `Tags com erro: ${malformedTags.join(", ")}`
        : JSON.stringify(errors);

      throw new DocxTemplateParseError(
        "A tag {{...}} no arquivo .docx contém chaves duplicadas ou inválidas.",
        errors,
      );
    }

    const replaced = await replaceDocxPlaceholdersWithValues(buffer, values);
    if (replaced) return replaced;
    throw error;
  }
}

async function generatePdfFromDocxBuffer(
  buffer: ArrayBuffer | Uint8Array | Buffer,
) {
  const [{ default: mammoth }, { jsPDF }] = await Promise.all([
    import("mammoth"),
    import("jspdf"),
  ]);

  const { value: rawText } = await mammoth.extractRawText({ buffer });
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxLineWidth = pageWidth - margin * 2;
  const lines = doc.splitTextToSize((rawText || "").trim() || " ", maxLineWidth);
  let currentY = margin;
  const lineHeight = 14;

  for (const line of lines) {
    if (currentY + lineHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
    doc.text(line, margin, currentY);
    currentY += lineHeight;
  }

  return Buffer.from(doc.output("arraybuffer"));
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const detail = error.message;
    const extra = (error as any).properties
      ? ` | ${JSON.stringify((error as any).properties)}`
      : "";
    return `${detail}${extra}`;
  }
  return String(error);
}

async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/api/contract-models/extract-variables") {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ message: "Arquivo .docx é obrigatório." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const buffer = await file.arrayBuffer();
    const variables = await extractVariablesFromDocx(buffer);
    return new Response(JSON.stringify({ variables }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (pathname === "/api/contract-models/preview") {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const body = await request.json();
    const { docx_path } = body as { docx_path?: string };
    if (!docx_path) {
      return new Response(JSON.stringify({ message: "docx_path é obrigatório." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const downloadResult = await serviceSupabase.storage
      .from(CONTRACT_TEMPLATES_BUCKET)
      .download(docx_path);
    if (downloadResult.error || !downloadResult.data) {
      return new Response(
        JSON.stringify({
          message: "Erro ao baixar modelo .docx para preview",
          detail: downloadResult.error?.message,
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const responseBuffer = await downloadResult.data.arrayBuffer();
    let html: string;
    try {
      const { default: mammoth } = await import("mammoth");
      const result = await mammoth.convertToHtml({ arrayBuffer: responseBuffer });
      html = result.value;
    } catch (error) {
      return new Response(
        JSON.stringify({
          message: "Erro ao converter template .docx para preview",
          detail: String(error),
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ html }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (pathname === "/api/contract-models/generate") {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    if (!supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ message: "Service role key não configurada." }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const body = await request.json();
    const { docx_path, values, filename, model_id, project_id, freelancer_id } = body as {
      docx_path: string;
      values: Record<string, unknown>;
      filename?: string;
      model_id?: string;
      project_id?: string;
      freelancer_id?: string;
    };

    if (!docx_path || !values || typeof values !== "object") {
      return new Response(JSON.stringify({ message: "docx_path e values são obrigatórios." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const downloadResult = await serviceSupabase.storage
      .from(CONTRACT_TEMPLATES_BUCKET)
      .download(docx_path);
    if (downloadResult.error || !downloadResult.data) {
      return new Response(
        JSON.stringify({
          message: "Erro ao baixar modelo .docx",
          detail: downloadResult.error?.message,
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const responseBuffer = await downloadResult.data.arrayBuffer();
    let outputBuffer: Buffer;
    try {
      outputBuffer = await generateDocxFromTemplate(responseBuffer, values);
    } catch (error) {
      if (error instanceof DocxTemplateParseError) {
        return new Response(
          JSON.stringify({
            message:
              error.message ||
              "A tag {{...}} no arquivo .docx contém chaves duplicadas ou inválidas.",
            detail: Array.isArray(error.errors) ? error.errors : undefined,
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          message: "Erro ao processar template .docx",
          detail: serializeError(error),
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const fileName = filename || docx_path.split("/").pop() || "generated-contract.docx";
    const normalizedBaseName = fileName.replace(/\.docx$/i, "").replace(/\.pdf$/i, "");
    const docxFileName = `${normalizedBaseName}.docx`;
    const outputDocxPath = `generated/${Date.now()}_${docxFileName}`;

    const uploadDocxResult = await serviceSupabase.storage
      .from(CONTRACT_GENERATED_BUCKET)
      .upload(outputDocxPath, outputBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });

    if (uploadDocxResult.error || !uploadDocxResult.data) {
      return new Response(
        JSON.stringify({
          message: "Erro ao salvar contrato gerado",
          detail: uploadDocxResult.error?.message,
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const publicUrlResult = serviceSupabase.storage
      .from(CONTRACT_GENERATED_BUCKET)
      .getPublicUrl(outputDocxPath);
    const publicUrl = publicUrlResult.data?.publicUrl ?? null;

    let generatedRecord = null;
    if (model_id && project_id) {
      const insertResult = await (serviceSupabase.from("generated_contracts") as any)
        .insert({
          model_id,
          project_id,
          freelancer_id: freelancer_id ?? null,
          values,
          docx_path: outputDocxPath,
          pdf_path: null,
          status: "rascunho",
        })
        .select()
        .single();

      if (insertResult.error) {
        return new Response(
          JSON.stringify({
            message: "Contrato gerado mas falha ao salvar histórico",
            detail: insertResult.error.message,
          }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
      generatedRecord = insertResult.data;
    }

    return new Response(
      JSON.stringify({
        docx_path: outputDocxPath,
        docx_url: publicUrl,
        pdf_path: null,
        public_url: publicUrl,
        generated_record: generatedRecord,
        status: "rascunho",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  return null;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await handleApiRequest(request);
      if (apiResponse) return apiResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
