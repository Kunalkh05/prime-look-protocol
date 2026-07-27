import { useState, type FormEvent } from "react";
import { ApiError, signIn } from "../lib/api";

/**
 * The invite-code sign-in screen.
 *
 * Nothing renders behind this until the server confirms a session, and the
 * server rejects every API call without one — so this is a real gate, not a
 * cosmetic one. The error message is identical for every kind of failure,
 * because "that code has expired" or "close, but no" is free help to anyone
 * guessing.
 */
export function Gate({ onSignedIn }: { onSignedIn: (label: string, serverAnalysis: boolean) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;

    setBusy(true);
    setError("");
    try {
      const session = await signIn(code.trim());
      onSignedIn(session.label ?? "friend", session.serverAnalysis ?? false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Try again.",
      );
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="brand gate-brand">
          PRIME <span>/ Look Protocol</span>
        </div>
        <h1>Private tool</h1>
        <p>
          This one's invite-only. Enter the code you were given to continue.
        </p>

        <form onSubmit={submit}>
          <label className="gate-field">
            <span>Invite code</span>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoFocus
              spellCheck={false}
              disabled={busy}
              placeholder="••••••••••••"
            />
          </label>

          <button type="submit" className="btn btn-accent gate-submit" disabled={busy || !code.trim()}>
            {busy ? "Checking…" : "Continue"}
          </button>

          <p className="gate-error" role="alert">
            {error}
          </p>
        </form>

        <p className="gate-note">
          Your photos are analysed on your own device and aren't stored anywhere.
        </p>
      </div>
    </div>
  );
}
