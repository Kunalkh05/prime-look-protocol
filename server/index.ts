/**
 * The API server.
 *
 * Serves the built frontend and a small API from one origin. Everything that
 * needs a secret happens here; the browser only ever sees results.
 */

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type { Context, Next } from "hono";

import { loadConfig, type Config } from "./config.ts";
import {
  SESSION_COOKIE,
  clearCookie,
  createSessionToken,
  sessionCookie,
  verifyInviteCode,
  verifySessionToken,
  type SessionPayload,
} from "./auth.ts";
import { analyzeLimiter, authLimiter, ipLimiter } from "./rateLimit.ts";
import { clientIp, originCheck, securityHeaders } from "./security.ts";
import { ValidationError, assertJsonRequest, validateImageDataUrl } from "./validation.ts";
import { VisionError, analyzeImage } from "./vision.ts";

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`\n  Configuration error: ${(err as Error).message}\n`);
  process.exit(1);
}

type Vars = { session: SessionPayload };
const app = new Hono<{ Variables: Vars }>();

app.use("*", securityHeaders(config));
app.use("/api/*", originCheck(config));

const ipOf = (c: Context) =>
  clientIp((n) => c.req.header(n), c.env?.incoming?.socket?.remoteAddress, config);

/** Read the session from the cookie, or null. */
function readSession(c: Context): SessionPayload | null {
  const cookies = c.req.header("Cookie") ?? "";
  const match = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(cookies);
  return match ? verifySessionToken(match[1], config) : null;
}

/** Gate everything behind a valid session. */
const requireSession = async (c: Context<{ Variables: Vars }>, next: Next) => {
  const session = readSession(c);
  if (!session) return c.json({ error: "Not signed in." }, 401);
  c.set("session", session);
  return next();
};

// ── Public endpoints ────────────────────────────────────────────

app.get("/api/health", (c) =>
  c.json({ ok: true, provider: config.provider, serverAnalysis: config.provider !== "none" }),
);

app.get("/api/session", (c) => {
  const session = readSession(c);
  return c.json(
    session
      ? { signedIn: true, label: session.label, serverAnalysis: config.provider !== "none" }
      : { signedIn: false },
  );
});

app.post("/api/auth", async (c) => {
  const ip = ipOf(c);
  const limit = authLimiter.check(`auth:${ip}`);
  if (!limit.allowed) {
    // Rate limiting the door is what makes short-ish invite codes viable.
    c.header("Retry-After", String(limit.retryAfter));
    return c.json({ error: "Too many attempts. Wait a few minutes and try again." }, 429);
  }

  let body: { code?: unknown };
  try {
    assertJsonRequest(c.req.header("Content-Type"), c.req.header("Content-Length"));
    body = await c.req.json();
  } catch (err) {
    return c.json({ error: err instanceof ValidationError ? err.message : "Bad request." }, 400);
  }

  const candidate = typeof body.code === "string" ? body.code.trim() : "";
  if (!candidate) return c.json({ error: "Enter your invite code." }, 400);

  const match = verifyInviteCode(candidate, config.inviteCodes);
  if (!match) {
    console.warn(`[auth] Failed sign-in attempt from ${ip}`);
    // One message for every failure — telling them the code exists but is
    // expired, or nearly right, would just help someone guessing.
    return c.json({ error: "That code isn't valid." }, 401);
  }

  console.info(`[auth] ${match.label} signed in`);
  c.header("Set-Cookie", sessionCookie(createSessionToken(match.label, config), config));
  return c.json({ signedIn: true, label: match.label, serverAnalysis: config.provider !== "none" });
});

app.post("/api/logout", (c) => {
  c.header("Set-Cookie", clearCookie(config));
  return c.json({ signedIn: false });
});

// ── Authenticated endpoints ─────────────────────────────────────

app.post("/api/analyze", requireSession, async (c) => {
  const session = c.get("session");
  const ip = ipOf(c);

  const perSession = analyzeLimiter.check(`analyze:${session.label}:${session.jti}`);
  const perIp = ipLimiter.check(`analyze-ip:${ip}`);
  if (!perSession.allowed || !perIp.allowed) {
    const retryAfter = Math.max(perSession.retryAfter, perIp.retryAfter);
    c.header("Retry-After", String(retryAfter));
    return c.json({ error: "You've hit the analysis limit. Try again later." }, 429);
  }

  let body: { image?: unknown };
  try {
    assertJsonRequest(c.req.header("Content-Type"), c.req.header("Content-Length"));
    body = await c.req.json();
  } catch (err) {
    return c.json({ error: err instanceof ValidationError ? err.message : "Bad request." }, 400);
  }

  try {
    // Validated by signature, not by what the client claimed it was sending.
    const image = validateImageDataUrl(body.image);
    const detected = await analyzeImage(image, config);
    // Note what happened, never what was in the photo.
    console.info(`[analyze] ${session.label} — ${Object.keys(detected).length} fields`);
    return c.json({ detected, remaining: perSession.remaining });
  } catch (err) {
    if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
    if (err instanceof VisionError) {
      return c.json({ error: err.message }, err.status as 400 | 429 | 502 | 503 | 504);
    }
    console.error("[analyze] Unexpected error:", (err as Error)?.message);
    return c.json({ error: "Analysis failed." }, 500);
  }
});

// ── Static frontend ─────────────────────────────────────────────

if (config.serveStatic) {
  app.use("/*", serveStatic({ root: `./${config.staticDir}` }));
  // Client-side app: anything not matched falls back to the shell.
  app.get("*", serveStatic({ path: `./${config.staticDir}/index.html` }));
}

app.notFound((c) => c.json({ error: "Not found." }, 404));

app.onError((err, c) => {
  // Log the detail server-side; return nothing that describes our internals.
  console.error("[error]", err);
  return c.json({ error: "Something went wrong." }, 500);
});

// Keep the limiter maps from growing unbounded on a long-running process.
const pruneTimer = setInterval(
  () => {
    authLimiter.prune();
    analyzeLimiter.prune();
    ipLimiter.prune();
  },
  10 * 60 * 1000,
);
pruneTimer.unref();

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.info(`\n  PRIME server on http://localhost:${info.port}`);
  console.info(`  Mode:            ${config.isProduction ? "production" : "development"}`);
  console.info(`  Invite codes:    ${config.inviteCodes.map((c) => c.label).join(", ")}`);
  console.info(`  Vision provider: ${config.provider}`);
  console.info(`  Static files:    ${config.serveStatic ? config.staticDir : "disabled (use vite dev)"}\n`);
});

export { app, config };
