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
          <strong>Want a more accurate read?</strong>
          <span className="cloud-sub">
            Optional — sends your photo to the server for a second opinion. Off by default.
          </span>
        </span>
        <span className="cloud-chevron" aria-hidden="true">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="cloud-body">
          <p className="cloud-warning">
            <strong>This one uploads your photo.</strong> Everything else runs on your own device
            and nothing leaves it. Turn this on and your photo is sent to the server, passed to a
            vision model, and discarded — it isn't saved or logged. It mainly helps with the
            subtler fields like skin type and concerns.
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
