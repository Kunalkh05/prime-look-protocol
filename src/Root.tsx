import { useCallback, useEffect, useState } from "react";
import App from "./App";
import { Gate } from "./components/Gate";
import { getSession, signOut } from "./lib/api";

/**
 * Session gate.
 *
 * The app doesn't render until the server confirms a session. That's a real
 * boundary rather than a cosmetic one — the API rejects every request without a
 * valid cookie, so hiding the UI isn't what's protecting anything; it just
 * matches what the server will actually allow.
 */

type State =
  | { status: "checking" }
  | { status: "locked" }
  | { status: "open"; label: string; serverAnalysis: boolean }
  | { status: "offline" };

export function Root() {
  const [state, setState] = useState<State>({ status: "checking" });

  const check = useCallback(async () => {
    try {
      const session = await getSession();
      setState(
        session.signedIn
          ? {
              status: "open",
              label: session.label ?? "friend",
              serverAnalysis: session.serverAnalysis ?? false,
            }
          : { status: "locked" },
      );
    } catch {
      // The API is unreachable — running `vite dev` without the server, or the
      // backend is down. Say so plainly instead of showing a sign-in form that
      // cannot possibly succeed.
      setState({ status: "offline" });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const onSignedIn = useCallback((label: string, serverAnalysis: boolean) => {
    setState({ status: "open", label, serverAnalysis });
  }, []);

  const onSignOut = useCallback(async () => {
    try {
      await signOut();
    } finally {
      setState({ status: "locked" });
    }
  }, []);

  if (state.status === "checking") {
    return (
      <div className="gate">
        <div className="spinner" />
      </div>
    );
  }

  if (state.status === "offline") {
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="brand gate-brand">
            PRIME <span>/ Look Protocol</span>
          </div>
          <h1>Server unreachable</h1>
          <p>
            The app can't reach its backend. If you're developing, start it with{" "}
            <code>npm run dev:server</code> in another terminal.
          </p>
          <button type="button" className="btn btn-accent gate-submit" onClick={() => void check()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state.status === "locked") return <Gate onSignedIn={onSignedIn} />;

  return (
    <>
      <div className="session-bar no-print">
        <span>
          Signed in as <strong>{state.label}</strong>
        </span>
        <button type="button" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </div>
      <App serverAnalysis={state.serverAnalysis} />
    </>
  );
}
