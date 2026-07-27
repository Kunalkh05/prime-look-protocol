/**
 * Server configuration, read once at startup.
 *
 * Everything here fails fast and loudly. A server that boots with a missing
 * session secret, or a default one, is worse than a server that refuses to
 * start: it looks fine while handing out forgeable sessions. So misconfiguration
 * is a crash, not a warning.
 */

export type VisionProvider = "gemini" | "huggingface" | "none";

export interface InviteCode {
  /** Who this code was issued to, so you can revoke the right one. */
  label: string;
  code: string;
}

export interface Config {
  port: number;
  isProduction: boolean;
  sessionSecret: string;
  sessionTtlSeconds: number;
  inviteCodes: InviteCode[];
  provider: VisionProvider;
  geminiApiKey: string;
  hfToken: string;
  /** Extra origins allowed to call the API. Empty means same-origin only. */
  allowedOrigins: string[];
  serveStatic: boolean;
  staticDir: string;
  /** Trust X-Forwarded-For. Only enable behind a proxy you control. */
  trustProxy: boolean;
}

class ConfigError extends Error {}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConfigError(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function parseBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * Invite codes are given as `label:code` pairs so each person gets their own
 * and you can revoke one without disturbing the others.
 */
function parseInviteCodes(raw: string): InviteCode[] {
  const codes: InviteCode[] = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const separator = trimmed.indexOf(":");
    if (separator < 1) {
      throw new ConfigError(
        `INVITE_CODES entry "${trimmed}" must be in the form label:code (for example alice:some-long-code).`,
      );
    }
    const label = trimmed.slice(0, separator).trim();
    const code = trimmed.slice(separator + 1).trim();

    if (code.length < 12) {
      throw new ConfigError(
        `The invite code for "${label}" is only ${code.length} characters. Use at least 12 — short codes are guessable.`,
      );
    }
    codes.push({ label, code });
  }

  if (codes.length === 0) {
    throw new ConfigError("INVITE_CODES is empty — nobody would be able to sign in.");
  }
  return codes;
}

export function loadConfig(env = process.env): Config {
  const isProduction = (env.NODE_ENV ?? "development") === "production";

  const sessionSecret = required("SESSION_SECRET");
  if (sessionSecret.length < 32) {
    throw new ConfigError(
      `SESSION_SECRET is ${sessionSecret.length} characters; it must be at least 32. Generate one with: openssl rand -base64 48`,
    );
  }
  if (/^(change-?me|secret|test|password)/i.test(sessionSecret)) {
    throw new ConfigError("SESSION_SECRET still looks like a placeholder. Generate a real one.");
  }

  const provider = (optional("VISION_PROVIDER", "none") as VisionProvider) || "none";
  if (!["gemini", "huggingface", "none"].includes(provider)) {
    throw new ConfigError(`VISION_PROVIDER must be gemini, huggingface, or none — got "${provider}".`);
  }

  const geminiApiKey = optional("GEMINI_API_KEY");
  const hfToken = optional("HF_TOKEN");
  if (provider === "gemini" && !geminiApiKey) {
    throw new ConfigError("VISION_PROVIDER is gemini but GEMINI_API_KEY is not set.");
  }
  if (provider === "huggingface" && !hfToken) {
    throw new ConfigError("VISION_PROVIDER is huggingface but HF_TOKEN is not set.");
  }

  return {
    port: Number(optional("PORT", "8787")),
    isProduction,
    sessionSecret,
    sessionTtlSeconds: Number(optional("SESSION_TTL_SECONDS", String(60 * 60 * 24 * 30))),
    inviteCodes: parseInviteCodes(required("INVITE_CODES")),
    provider,
    geminiApiKey,
    hfToken,
    allowedOrigins: optional("ALLOWED_ORIGINS")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    serveStatic: parseBool("SERVE_STATIC", isProduction),
    staticDir: optional("STATIC_DIR", "dist"),
    trustProxy: parseBool("TRUST_PROXY", false),
  };
}
