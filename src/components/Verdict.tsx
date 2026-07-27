import type { Metric, Profile, Tone } from "../types";
import { buildVerdict, immutableNote } from "../lib/verdict";

/**
 * The verdict block. Leads the results, because the ranked truth is the part
 * worth reading and everything after it is reference material.
 *
 * Every score is paired with its fix in the same row. A number on its own is
 * just a judgement; a number next to "here's what moves it, here's how long"
 * is a plan.
 */

function scoreClass(score: number): string {
  if (score <= 3) return "bad";
  if (score <= 5) return "weak";
  if (score <= 7) return "ok";
  return "good";
}

export function VerdictBlock({
  profile,
  metrics,
  tone,
}: {
  profile: Profile;
  metrics: Metric[];
  tone: Tone;
}) {
  const verdict = buildVerdict(profile, metrics, tone);
  const immutable = immutableNote(metrics, tone);

  return (
    <section className="verdict">
      <div className="ref">REF 00 · Verdict</div>
      <h3>{verdict.headline}</h3>
      <p className="verdict-detail">{verdict.detail}</p>

      <ul className="score-list">
        {verdict.scores.map((s) => (
          <li key={s.key} className={`score-row ${scoreClass(s.score)}`}>
            <div className="score-head">
              <span className="score-num">{s.score}</span>
              <div>
                <span className="score-label">{s.label}</span>
                <span className="score-horizon">{s.horizon}</span>
              </div>
              <div className="score-bar" aria-hidden="true">
                <div style={{ width: `${s.score * 10}%` }} />
              </div>
            </div>
            <p className="score-verdict">{s.verdict}</p>
            <p className="score-fix">{s.fix}</p>
          </li>
        ))}
      </ul>

      {immutable && (
        <p className="verdict-immutable">
          <strong>On the parts you can't change:</strong> {immutable}
        </p>
      )}

      <p className="verdict-closing">{verdict.closing}</p>
    </section>
  );
}

export function ToneToggle({ tone, onChange }: { tone: Tone; onChange: (t: Tone) => void }) {
  return (
    <div className="tone-toggle no-print">
      <span>Assessment tone</span>
      <div className="chips">
        <button
          type="button"
          className={`chip${tone === "direct" ? " on" : ""}`}
          onClick={() => onChange("direct")}
        >
          Direct
        </button>
        <button
          type="button"
          className={`chip${tone === "measured" ? " on" : ""}`}
          onClick={() => onChange("measured")}
        >
          Measured
        </button>
      </div>
    </div>
  );
}
