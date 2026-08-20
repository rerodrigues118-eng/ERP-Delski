/**
 * Delski ERP — Client-side Rate Limiter & Proteção contra Brute Force
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptTime: number;
  blockedUntil?: number;
}

const memoryStore: Record<string, RateLimitRecord> = {};

function getStorageKey(key: string): string {
  return `delski_rl_${key}`;
}

function getRecord(key: string): RateLimitRecord {
  if (memoryStore[key]) return memoryStore[key];

  try {
    const raw = sessionStorage.getItem(getStorageKey(key));
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryStore[key] = parsed;
      return parsed;
    }
  } catch {}

  const defaultRecord: RateLimitRecord = {
    attempts: 0,
    firstAttemptTime: Date.now(),
  };
  memoryStore[key] = defaultRecord;
  return defaultRecord;
}

function saveRecord(key: string, record: RateLimitRecord): void {
  memoryStore[key] = record;
  try {
    sessionStorage.setItem(getStorageKey(key), JSON.stringify(record));
  } catch {}
}

/**
 * Verifica se a ação atual é permitida pelo Rate Limiter.
 *
 * @param actionKey Identificador único da ação (ex: 'login_user@email.com')
 * @param maxAttempts Limite de tentativas antes do bloqueio (default: 5)
 * @param windowMs Janela de tempo em ms (default: 2 minutos)
 * @param cooldownMs Tempo de espera após estourar o limite (default: 60s)
 */
export function checkRateLimit(
  actionKey: string,
  maxAttempts: number = 5,
  windowMs: number = 120_000,
  cooldownMs: number = 60_000
): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const record = getRecord(actionKey);

  // Se já está bloqueado
  if (record.blockedUntil && now < record.blockedUntil) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: retryAfter,
    };
  }

  // Se a janela de tempo expirou, reseta contagem
  if (now - record.firstAttemptTime > windowMs) {
    record.attempts = 0;
    record.firstAttemptTime = now;
    delete record.blockedUntil;
    saveRecord(actionKey, record);
  }

  const remaining = Math.max(0, maxAttempts - record.attempts);
  return {
    allowed: record.attempts < maxAttempts,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
  };
}

/**
 * Registra uma tentativa falha para a ação especificada.
 */
export function recordFailedAttempt(
  actionKey: string,
  maxAttempts: number = 5,
  cooldownMs: number = 60_000
): {
  isBlocked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const record = getRecord(actionKey);

  record.attempts += 1;

  if (record.attempts >= maxAttempts) {
    record.blockedUntil = now + cooldownMs;
    saveRecord(actionKey, record);
    return {
      isBlocked: true,
      retryAfterSeconds: Math.ceil(cooldownMs / 1000),
    };
  }

  saveRecord(actionKey, record);
  return {
    isBlocked: false,
    retryAfterSeconds: 0,
  };
}

/**
 * Reseta o histórico de tentativas após sucesso.
 */
export function resetRateLimit(actionKey: string): void {
  delete memoryStore[actionKey];
  try {
    sessionStorage.removeItem(getStorageKey(actionKey));
  } catch {}
}
