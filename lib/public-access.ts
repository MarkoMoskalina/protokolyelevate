import { createHmac, timingSafeEqual } from "crypto";

/**
 * Helpers for the public protocol access flow.
 *
 * Security model (defense-in-depth):
 *   Layer 1: 64-char random `access_token` in URL — un-guessable (256 bits)
 *   Layer 2: 6-digit `access_code` typed by the user — protects if URL leaks
 *   Layer 3: 90-day `access_expires_at` — link stops working after rental cycle
 *   Layer 4: Signed HTTP-only cookie issued after both checks pass — proves the
 *            user already entered the correct code on this device
 */

const COOKIE_PREFIX = "pa_";
// Cookie validity once issued. Short enough that a stolen cookie
// becomes useless after a day, long enough that the customer can come back
// and not have to re-enter the code on every page load.
export const ACCESS_COOKIE_TTL_SECONDS = 24 * 60 * 60;

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for public access cookie signing");
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", getSecret()).update(payload).digest());
}

export function cookieNameForToken(token: string): string {
  // include a short hash of the token so each protocol has its own cookie
  // (avoids one cookie collision blocking all access on the same device)
  const shortHash = base64url(
    createHmac("sha256", getSecret()).update(`cookie:${token}`).digest(),
  ).slice(0, 12);
  return `${COOKIE_PREFIX}${shortHash}`;
}

/**
 * Build a signed cookie value that proves the user passed the verify check
 * for the given token. Format: `<expIso>.<signature>`.
 */
export function buildAccessCookieValue(token: string): {
  name: string;
  value: string;
  maxAge: number;
} {
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_COOKIE_TTL_SECONDS;
  const payload = `${token}.${expiresAt}`;
  const signature = sign(payload);
  return {
    name: cookieNameForToken(token),
    value: `${expiresAt}.${signature}`,
    maxAge: ACCESS_COOKIE_TTL_SECONDS,
  };
}

/**
 * Verify a cookie value matches the given token AND has not expired.
 */
export function verifyAccessCookie(
  token: string,
  cookieValue: string | undefined,
): boolean {
  if (!cookieValue) return false;
  const dot = cookieValue.indexOf(".");
  if (dot < 1) return false;

  const expRaw = cookieValue.slice(0, dot);
  const sigRaw = cookieValue.slice(dot + 1);

  const exp = Number.parseInt(expRaw, 10);
  if (!Number.isFinite(exp)) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;

  const expectedSig = sign(`${token}.${exp}`);

  // constant-time compare to prevent timing leaks
  const a = Buffer.from(sigRaw);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Constant-time 6-digit code comparison.
 * Returns true if the codes are equal in a way that doesn't leak timing info.
 */
export function codesMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Format-check a token: 64 lowercase hex chars (output of encode(bytes, 'hex')).
 */
export function isValidTokenFormat(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

/**
 * Format-check the 6-digit access code.
 */
export function isValidCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Whether a protocol's access has expired.
 */
export function isAccessExpired(expiresAtIso: string | null | undefined): boolean {
  if (!expiresAtIso) return true;
  const exp = new Date(expiresAtIso).getTime();
  if (!Number.isFinite(exp)) return true;
  return exp < Date.now();
}
