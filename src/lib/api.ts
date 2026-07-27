/**
 * Client for our own backend.
 *
 * Note what isn't here: any API key. The session lives in an HttpOnly cookie
 * that JavaScript cannot read, and the vision credential never leaves the
 * server. `credentials: "same-origin"` is what attaches the cookie; there is no
 * token for this module to hold or leak.
 */

import type { DetectionMap } from "../types";

export interface SessionState {
  signedIn: boolean;
  label?: string;
  /** Whether the server has a vision provider configured. */
  serverAnalysis?: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection.", 0);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string } | null)?.error ?? `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export function getSession(): Promise<SessionState> {
  return request<SessionState>("/api/session");
}

export function signIn(code: string): Promise<SessionState> {
  return request<SessionState>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function signOut(): Promise<SessionState> {
  return request<SessionState>("/api/logout", { method: "POST" });
}

/** Ask the server to analyse a photo with its own credentials. */
export async function analyzeOnServer(imageDataUrl: string): Promise<DetectionMap> {
  const { detected } = await request<{ detected: DetectionMap }>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ image: imageDataUrl }),
  });
  return detected;
}
