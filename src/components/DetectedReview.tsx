import { useState } from "react";
import type { DetectionMap, Profile } from "../types";

/**
 * The auto-filled fields, shown as a review list instead of a form.
 *
 * The point of the detection pipeline is that the user answers two questions
 * instead of seventeen — but "the computer decided things about your face" is
 * only acceptable if every decision is visible, explained, and one click from
 * being overridden. So each row shows what was read, how sure the detector was,
 * and why; low-confidence rows are pulled to the top and marked for checking.
 */

export interface FieldSpec<T extends string = string> {
  key: keyof Profile;
  label: string;
  options: { value: T; label: string }[];
}

function confidenceLabel(c: number): { text: string; className: string } {
  if (c >= 0.7) return { text: "Confident", className: "high" };
  if (c >= 0.55) return { text: "Fairly sure", className: "mid" };
  return { text: "Please check", className: "low" };
}

function Row({
  spec,
  detection,
  value,
  onChange,
}: {
  spec: FieldSpec;
  detection?: DetectionMap[keyof Profile];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const conf = detection ? confidenceLabel(detection.confidence) : null;
  const edited = detection && value !== detection.value;
  const current = spec.options.find((o) => o.value === value);

  return (
    <li className={`review-row${conf?.className === "low" && !edited ? " needs-check" : ""}`}>
      <div className="review-main">
        <span className="review-label">{spec.label}</span>
        <span className="review-value">{current?.label ?? "Not set"}</span>
        {conf && !edited && <span className={`conf ${conf.className}`}>{conf.text}</span>}
        {edited && <span className="conf edited">Your answer</span>}
        <button
          type="button"
          className="review-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Done" : "Change"}
        </button>
      </div>

      {detection?.basis && !open && <p className="review-basis">{detection.basis}</p>}

      {open && (
        <div className="chips review-chips" role="radiogroup" aria-label={spec.label}>
          {spec.options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={value === o.value}
              className={`chip${value === o.value ? " on" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

export function DetectedReview({
  specs,
  detected,
  draft,
  onChange,
}: {
  specs: FieldSpec[];
  detected: DetectionMap;
  draft: Partial<Profile>;
  onChange: (key: keyof Profile, value: string) => void;
}) {
  // Anything the detectors were unsure about goes first — it's the only part
  // that actually needs the user's attention.
  const sorted = [...specs].sort((a, b) => {
    const ca = detected[a.key]?.confidence ?? 0;
    const cb = detected[b.key]?.confidence ?? 0;
    return ca - cb;
  });
  const uncertain = sorted.filter((s) => (detected[s.key]?.confidence ?? 0) < 0.55);

  return (
    <div className="review">
      <div className="review-head">
        <h3>What the photo told us</h3>
        <p>
          {uncertain.length > 0
            ? `${uncertain.length} of these need a quick look — they're at the top. Everything else you can leave alone.`
            : "All read with reasonable confidence. Change anything that looks wrong."}
        </p>
      </div>
      <ul className="review-list">
        {sorted.map((spec) => (
          <Row
            key={spec.key}
            spec={spec}
            detection={detected[spec.key]}
            value={draft[spec.key] as string | undefined}
            onChange={(v) => onChange(spec.key, v)}
          />
        ))}
      </ul>
    </div>
  );
}
