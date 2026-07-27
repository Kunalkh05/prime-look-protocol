/**
 * Invite-code sign-in and signed session tokens.
 *
 * No user accounts and no password database — for a tool shared with a handful
 * of people, a per-person invite code is the right amount of authentication.
 * What it still has to get right:
 *
 *   - **Constant-time comparison.** A plain `===` on a secret leaks its prefix
 *     through timing, which turns guessing from infeasible into merely tedious.
 *   - **Signed, not stored, sessions.** The token carries its own label and
 *     expiry, authenticated by HMAC. Nothing to keep in memory, and a restart
 *     doesn't sign everyone out.
 *   - **Tamper-evidence.** Changing any byte of the payload invalidates the
 *     signature, so a user can't edit their own expiry or label.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Config, InviteCode } from "./config.ts";

export interface SessionPayload {
  /** Which invite code this session came from. */
  label: string;
  /** Unix seconds. */
  exp: number;
  /** Random, so two sessions for one label are still distinct tokens. */
  jti: string;
}

const encode = (data: string) => Buffer.from(data, "utf8").toString("base64url");
const decode = (data: string) => Buffer.from(data, "base64url").toString("utf8");

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Compare two strings without leaking their contents through timing. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, which would itself be a leak —
  // so hash both to a fixed width first and compare that.
  const hashA = createHmac("sha256", "length-normaliser").update(bufA).digest();
  const hashB = createHmac("sha256", "length-normaliser").update(bufB).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Find the invite code matching `candidate`.
 *
 * Every code is checked even after a match, so the time taken doesn't reveal
 * how far down the list the correct one sat.
 */
export function verifyInviteCode(candidate: string, codes: InviteCode[]): InviteCode | null {
  let found: InviteCode | null = null;
  for (const entry of codes) {
    if (safeEqual(candidate, entry.code)) found = entry;
  }
  return found;
}

export function createSessionToken(label: string, config: Config): string {
  const payload: SessionPayload = {
    label,
    exp: Math.floor(Date.now() / 1000) + config.sessionTtlSeconds,
    jti: randomBytes(9).toString("base64url"),
  };
  const body = encode(JSON.stringify(payload));
  return `${body}.${sign(body, config.sessionSecret)}`;
}

/** Verify a token's signature and expiry. Returns null for anything suspect. */
export function verifySessionToken(token: string, config: Config): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  if (!safeEqual(signature, sign(body, config.sessionSecret))) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(decode(body)) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload?.label !== "string" || typeof payload?.exp !== "number") return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export const SESSION_COOKIE = "prime_session";

/**
 * Build the Set-Cookie header.
 *
 * HttpOnly keeps the token away from any script on the page, so an XSS bug
 * can't exfiltrate it. SameSite=Strict means it isn't attached to cross-site
 * requests at all, which removes CSRF from the state-changing endpoints.
 */
export function sessionCookie(token: string, config: Config): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${config.sessionTtlSeconds}`,
  ];
  if (config.isProduction) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie(config: Config): string {
  const parts = [`${SESSION_COOKIE}=`, "HttpOnly", "SameSite=Strict", "Path=/", "Max-Age=0"];
  if (config.isProduction) parts.push("Secure");
  return parts.join("; ");
}
