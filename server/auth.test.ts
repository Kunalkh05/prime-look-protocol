import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  safeEqual,
  sessionCookie,
  verifyInviteCode,
  verifySessionToken,
} from "./auth.ts";
import type { Config } from "./config.ts";

const config = {
  sessionSecret: "a-test-secret-that-is-definitely-long-enough-12345",
  sessionTtlSeconds: 3600,
  isProduction: true,
  inviteCodes: [
    { label: "alice", code: "alice-code-abcdef" },
    { label: "bob", code: "bob-code-123456789" },
  ],
} as Config;

describe("safeEqual", () => {
  it("matches identical strings", () => {
    expect(safeEqual("hunter2hunter2", "hunter2hunter2")).toBe(true);
  });

  it("rejects different strings", () => {
    expect(safeEqual("hunter2hunter2", "hunter2hunter3")).toBe(false);
  });

  it("handles length mismatches without throwing", () => {
    // A naive timingSafeEqual throws here, and the throw itself leaks length.
    expect(() => safeEqual("short", "much-longer-string")).not.toThrow();
    expect(safeEqual("short", "much-longer-string")).toBe(false);
  });

  it("rejects the empty string against a real code", () => {
    expect(safeEqual("", "alice-code-abcdef")).toBe(false);
  });
});

describe("verifyInviteCode", () => {
  it("finds a valid code and reports who it belongs to", () => {
    expect(verifyInviteCode("bob-code-123456789", config.inviteCodes)?.label).toBe("bob");
  });

  it("rejects an unknown code", () => {
    expect(verifyInviteCode("not-a-real-code-at-all", config.inviteCodes)).toBeNull();
  });

  it("rejects a prefix of a valid code", () => {
    expect(verifyInviteCode("alice-code", config.inviteCodes)).toBeNull();
  });

  it("rejects an empty submission", () => {
    expect(verifyInviteCode("", config.inviteCodes)).toBeNull();
  });
});

describe("session tokens", () => {
  it("round-trips a valid token", () => {
    const token = createSessionToken("alice", config);
    expect(verifySessionToken(token, config)?.label).toBe("alice");
  });

  it("issues a distinct token each time for the same person", () => {
    expect(createSessionToken("alice", config)).not.toBe(createSessionToken("alice", config));
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("alice", config);
    const other = { ...config, sessionSecret: "a-completely-different-secret-value-here" };
    expect(verifySessionToken(token, other)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    // Re-encoding the payload as a different label must invalidate the token,
    // or anyone could promote themselves by editing their own cookie.
    const token = createSessionToken("alice", config);
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ label: "admin", exp: 9e9, jti: "x" })).toString(
      "base64url",
    );
    expect(verifySessionToken(`${forged}.${signature}`, config)).toBeNull();
  });

  it("rejects an expired token", () => {
    const expired = createSessionToken("alice", { ...config, sessionTtlSeconds: -10 });
    expect(verifySessionToken(expired, config)).toBeNull();
  });

  it("rejects structurally invalid tokens", () => {
    for (const bad of ["", "nodot", "a.b.c", "....", "%%%.%%%"]) {
      expect(verifySessionToken(bad, config)).toBeNull();
    }
  });
});

describe("session cookie", () => {
  const cookie = sessionCookie("token-value", config);

  it("is HttpOnly, so script can't read it even through an XSS bug", () => {
    expect(cookie).toContain("HttpOnly");
  });

  it("is SameSite=Strict, which removes CSRF on the API", () => {
    expect(cookie).toContain("SameSite=Strict");
  });

  it("is Secure in production", () => {
    expect(cookie).toContain("Secure");
  });

  it("omits Secure in development, so localhost over http still works", () => {
    expect(sessionCookie("t", { ...config, isProduction: false })).not.toContain("Secure");
  });
});
