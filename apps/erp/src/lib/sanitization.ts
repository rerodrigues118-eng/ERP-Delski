/**
 * Delski ERP — Utilitários de Sanitização e Proteção contra XSS / Injection
 */

/**
 * Remove tags HTML, scripts maliciosos e caracteres perigosos de strings.
 */
export function sanitizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);

  return str
    // Remove tags HTML/XML (<script>, <img>, etc)
    .replace(/<[^>]*>?/gm, "")
    // Remove caracteres nulos e de controle perigosos
    .replace(/\0/g, "")
    .trim();
}

/**
 * Normaliza e sanitiza endereços de e-mail.
 */
export function sanitizeEmail(value: unknown): string {
  if (!value) return "";
  return String(value).toLowerCase().trim().replace(/[\r\n\t]/g, "");
}

/**
 * Sanitiza números de telefone, mantendo apenas dígitos e formato seguro.
 */
export function sanitizePhone(value: unknown): string {
  if (!value) return "";
  return String(value).replace(/[^\d+()\-\s]/g, "").trim();
}

/**
 * Converte com segurança entradas numéricas prevenindo NaN e valores infinitos.
 */
export function sanitizeNumeric(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

/**
 * Sanitiza recursivamente todas as chaves de string de um objeto.
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
