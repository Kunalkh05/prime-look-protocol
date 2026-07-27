import type { Metric, Thirds, Fifths } from "../types";
import { ThirdsDiagram } from "./Visuals";

/**
 * Proportion readings.
 *
 * Presented as measurements against a reference range rather than as a score.
 * A single "you rate 6/10" number is the thing this genre of app usually gets
 * wrong: it is the least actionable possible way to present the data, and the
 * most likely to land badly. Every row here says what was measured, what the
 * typical range is, and what — if anything — is worth doing about it.
 */

function formatValue(m: Metric): string {
  switch (m.unit) {
    case "degrees":
      return `${m.value}°`;
    case "percent":
      return `${m.value} pts`;
    case "score":
      return `${m.value}/100`;
    default:
      return m.value.toFixed(2);
  }
}

function Gauge({ metric }: { metric: Metric }) {
  const [lo, hi] = metric.target;
  // Show the target band inside a window padded either side of it.
  const pad = Math.max((hi - lo) * 1.1, Math.abs(hi - lo) || 1);
  const min = lo - pad;
  const max = hi + pad;
  const pos = (v: number) => ((v - min) / (max - min)) * 100;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  return (
    <div className="gauge" aria-hidden="true">
      <div
        className="gauge-band"
        style={{ left: `${clamp(pos(lo))}%`, width: `${clamp(pos(hi)) - clamp(pos(lo))}%` }}
      />
      <div className={`gauge-pin ${metric.status}`} style={{ left: `${clamp(pos(metric.value))}%` }} />
    </div>
  );
}

export function Metrics({
  metrics,
  thirds,
  fifths,
}: {
  metrics: Metric[];
  thirds: Thirds;
  fifths: Fifths;
}) {
  const fifthValues = [
    { label: "Outer", v: fifths.outerLeft },
    { label: "Eye", v: fifths.eyeLeft },
    { label: "Inner", v: fifths.inner },
    { label: "Eye", v: fifths.eyeRight },
    { label: "Outer", v: fifths.outerRight },
  ];

  return (
    <div className="metrics">
      <div className="ref">REF 00 · Measurements</div>
      <h3>Your proportions</h3>
      <p className="metrics-intro">
        Measured from the landmark mesh, corrected for head tilt and image shape. The bands show the
        range these proportions usually fall in — they describe averages, not targets, and plenty of
        striking faces sit well outside them.
      </p>

      <div className="metrics-body">
        <div className="metrics-diagrams">
          <div className="dia-block">
            <ThirdsDiagram thirds={thirds} />
            <span className="dia-caption">Vertical thirds</span>
          </div>
          <div className="dia-block">
            <div className="fifths-bar">
              {fifthValues.map((f, i) => (
                <div key={i} className="fifth" style={{ flexGrow: f.v }} title={`${f.label} ${Math.round(f.v)}%`}>
                  <span>{Math.round(f.v)}</span>
                </div>
              ))}
            </div>
            <span className="dia-caption">Horizontal fifths (%)</span>
          </div>
        </div>

        <ul className="metric-list">
          {metrics.map((m) => (
            <li key={m.key} className="metric-row">
              <div className="metric-head">
                <span className="metric-label">{m.label}</span>
                <span className={`metric-value ${m.status}`}>{formatValue(m)}</span>
              </div>
              <Gauge metric={m} />
              <p className="metric-note">{m.note}</p>
              {m.action && <p className="metric-action">{m.action}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
