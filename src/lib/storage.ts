/**
 * Session persistence. A user fills in seventeen fields and gets a protocol —
 * losing all of it to a page refresh is the worst thing the app can do to them.
 *
 * Everything stays in localStorage on their own device; nothing is uploaded.
 */

import type { FaceAnalysis, Profile, StoredSession } from "../types";

const KEY = "prime.session.v2";
const DRAFT_KEY = "prime.draft.v2";

/** Rough ceiling for the stored photo so we don't blow the ~5MB quota. */
const MAX_PHOTO_BYTES = 900_000;

export function saveSession(
  profile: Profile,
  analysis?: FaceAnalysis,
  photo?: string,
): void {
  try {
    const session: StoredSession = {
      version: 2,
      savedAt: new Date().toISOString(),
      profile,
      analysis,
      // Drop the photo rather than the whole session if it's oversized.
      photo: photo && photo.length <= MAX_PHOTO_BYTES ? photo : undefined,
    };
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Private browsing, quota exhausted, storage disabled — all non-fatal.
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed?.version !== 2 || !parsed.profile) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to do */
  }
}

/**
 * Partially-filled answers, saved as the user goes.
 *
 * The form is seventeen questions long — losing it to an accidental refresh
 * halfway through is enough to make someone abandon the app entirely.
 */
export function saveDraft(draft: Partial<Profile>): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* non-fatal */
  }
}

export function loadDraft(): Partial<Profile> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<Profile>) : null;
  } catch {
    return null;
  }
}

/** Human-readable "saved 3 days ago" for the resume banner. */
export function savedAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "earlier";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Download the profile and analysis as a JSON file. */
export function exportJson(profile: Profile, analysis?: FaceAnalysis): void {
  const payload = { exportedAt: new Date().toISOString(), profile, analysis };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `look-protocol-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
