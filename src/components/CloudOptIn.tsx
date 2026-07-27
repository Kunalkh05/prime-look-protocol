import { useState } from "react";

/**
 * Server-analysis opt-in.
 *
 * The credential now lives on the server, so this no longer asks for a key —
 * but it still asks for consent, because the thing that actually matters to the
 * user hasn't changed: their photo leaves their device. Moving the secret
 * somewhere safer doesn't make the upload invisible, and the copy shouldn't
 * pretend otherwise.
 *
 * Off by default. On-device analysis already fills in every field.
 */

export interface CloudSettings {
  enabled: boolean;
}

export function CloudOptIn({
  settings,
  onChange,
  available,
}: {
  settings: CloudSettings;
  onChange: (s: CloudSettings) => void;
  /** False when the server has no vision provider configured. */
  available: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!available) return null;

  return (
    <div className="cloud-optin">
      <button
        type="button"
        className="cloud-summary"
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
      >
        <span>
          <strong>Let the server read the rest?</strong>
          <span className="cloud-sub">
            Optional — fills in hair type, age and teeth, and sharpens the skin read. Off by
            default; without it those become questions.
          </span>
        </span>
        <span className="cloud-chevron" aria-hidden="true">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="cloud-body">
          <p className="cloud-warning">
            <strong>This one uploads your photo.</strong> Your face shape, all eleven proportion
            measurements, hairline, brows, beard and colouring are measured on your own device and
            never leave it. What the server adds is the judgement calls — hair type, age, teeth,
            skin concerns — which need a model too large to run in a browser. Your photo is sent,
            read, and discarded: not saved, not logged. Leave this off and those become four
            questions instead.
          </p>

          <label className="cloud-check">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onChange({ enabled: e.target.checked })}
            />
            <span>I understand my photo will be uploaded, and I want the server analysis.</span>
          </label>
        </div>
      )}
    </div>
  );
}
