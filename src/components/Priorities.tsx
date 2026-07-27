import type { Action } from "../types";
import type { Plan } from "../lib/priority";

/**
 * The ranked plan. Everything else in the results is reference material; this
 * is the part that answers "so what do I actually do first".
 */

function EffortDots({ n, label }: { n: number; label: string }) {
  return (
    <span className="dots" aria-label={`${label}: ${n} of 3`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? "on" : undefined} aria-hidden="true" />
      ))}
    </span>
  );
}

function ActionRow({ action, rank }: { action: Action; rank?: number }) {
  return (
    <li className="action">
      {rank !== undefined && <span className="action-rank">{rank}</span>}
      <div className="action-body">
        <div className="action-head">
          <h4>{action.title}</h4>
          <span className="pillar">{action.pillar}</span>
        </div>
        <p>{action.why}</p>
        <div className="action-meta">
          <span>
            Impact <EffortDots n={action.impact} label="Impact" />
          </span>
          <span>
            Effort <EffortDots n={action.effort} label="Effort" />
          </span>
        </div>
      </div>
    </li>
  );
}

export function Priorities({ plan }: { plan: Plan }) {
  const groups: { key: keyof Plan; title: string; blurb: string }[] = [
    { key: "today", title: "Start today", blurb: "Costs nothing and takes minutes." },
    { key: "weeks", title: "Over the next few weeks", blurb: "One appointment or a new habit." },
    { key: "months", title: "The long game", blurb: "Slow, compounding, worth starting now." },
  ];

  return (
    <section className="priorities">
      <div className="ref">REF 06 · Priority</div>
      <h3>What to do first</h3>
      <p className="metrics-intro">
        Ranked by how much each one changes, weighed against what it costs you. If you only do three
        things, do these.
      </p>

      <ol className="headline-actions">
        {plan.headline.map((a, i) => (
          <ActionRow key={a.title} action={a} rank={i + 1} />
        ))}
      </ol>

      <div className="plan-groups">
        {groups.map(({ key, title, blurb }) => {
          const items = plan[key] as Action[];
          if (!items.length) return null;
          return (
            <div key={key} className="plan-group">
              <h4>
                {title}
                <span>{blurb}</span>
              </h4>
              <ul className="action-list">
                {items.map((a) => (
                  <ActionRow key={a.title} action={a} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
