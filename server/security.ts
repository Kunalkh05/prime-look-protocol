/**
 * Security headers and origin checks.
 *
 * The frontend is served from the same origin as the API, which is the single
 * biggest simplification available here: cookies can be SameSite=Strict, CORS
 * isn't needed at all, and there's no cross-origin surface to get wrong.
 */

import type { MiddlewareHandler } from "hono";
import type { Config } from "./config.ts";

/**
 * Content Security Policy.
 *
 * The analyser fetches its models from Google and jsDelivr, and decodes photos
 * from blob/data URLs, so those have to be allowed explicitly — but everything
 * else is locked to our own origin. `object-src 'none'` and `frame-ancestors
 * 'none'` remove plugin embedding and clickjacking respectively.
 *
 * 'wasm-unsafe-eval' is required: MediaPipe and ONNX Runtime both compile
 * WebAssembly, and without it neither runs. It permits WASM compilation only,
 * not arbitrary JavaScript eval.
 */
function buildCsp(config: Config): string {
  const modelHosts = [
    "https://cdn.jsdelivr.net",
    "https://storage.googleapis.com",
    "https://huggingface.co",
    "https://cdn-lfs.huggingface.co",
    "https://cdn-lfs-us-1.huggingface.co",
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval'`,
    // Vite injects styles inline; without this the app renders unstyled.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    `connect-src 'self' ${modelHosts}`,
    "worker-src 'self' blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (config.isProduction) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function securityHeaders(config: Config): MiddlewareHandler {
  const csp = buildCsp(config);

  return async (c, next) => {
    await next();

    c.header("Content-Security-Policy", csp);
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");
    c.header("X-Frame-Options", "DENY");
    // The app needs the camera; nothing else is permitted.
    c.header("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), interest-cohort=()");
    c.header("Cross-Origin-Opener-Policy", "same-origin");
    c.header("Cross-Origin-Resource-Policy", "same-origin");

    if (config.isProduction) {
      c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    // Never let a proxy or browser cache an authenticated API response.
    if (c.req.path.startsWith("/api/")) {
      c.header("Cache-Control", "no-store, private");
    }
  };
}

/**
 * Reject state-changing requests whose Origin isn't ours.
 *
 * SameSite=Strict already blocks cross-site cookie attachment, so this is
 * defence in depth rather than the primary control — but it costs nothing and
 * closes the gap if the cookie policy is ever loosened.
 */
export function originCheck(config: Config): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

    const origin = c.req.header("Origin");
    if (!origin) return next(); // same-origin fetches may omit it

    const host = c.req.header("Host");
    const allowed = [...config.allowedOrigins];
    if (host) {
      allowed.push(`https://${host}`);
      if (!config.isProduction) allowed.push(`http://${host}`);
    }

    if (!allowed.includes(origin)) {
      return c.json({ error: "Request origin not allowed." }, 403);
    }
    return next();
  };
}

/** Client IP, trusting proxy headers only when explicitly configured to. */
export function clientIp(
  header: (name: string) => string | undefined,
  remote: string | undefined,
  config: Config,
): string {
  if (config.trustProxy) {
    const forwarded = header("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
  }
  return remote ?? "unknown";
}
