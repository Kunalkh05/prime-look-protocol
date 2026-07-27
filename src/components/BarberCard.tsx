import { useCallback } from "react";
import type { Profile } from "../types";
import { FACE, styleNames } from "../lib/recommendations";
import { CutIcon } from "./Visuals";
import { cutKindFor } from "../lib/styleMap";
import { RichText } from "./RichText";

/**
 * The thing the user actually takes with them.
 *
 * The old results told people to screenshot the styles for their barber, so
 * this is that artefact made real: one page, the vocabulary a barber uses, and
 * a print button that hides the rest of the site.
 */

function printCard() {
  document.documentElement.setAttribute("data-print", "card");
  const cleanup = () => {
    document.documentElement.removeAttribute("data-print");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Safari doesn't always fire afterprint — make sure we don't get stuck.
  setTimeout(cleanup, 1000);
}

export function BarberCard({ profile }: { profile: Profile }) {
  const f = FACE[profile.face];
  const names = styleNames(profile.face, profile.gender);
  const hasBeard = profile.gender !== "fem" && profile.beard !== "cleanshave";

  const onPrint = useCallback(() => printCard(), []);

  return (
    <section className="barber-card" id="barber-card">
      <div className="bc-head">
        <div>
          <div className="ref">Take this to your barber</div>
          <h3>Barber card</h3>
        </div>
        <button type="button" className="btn btn-accent no-print" onClick={onPrint}>
          🖨 Print / save as PDF
        </button>
      </div>

      <div className="bc-grid">
        <div className="bc-spec">
          <dl>
            <div>
              <dt>Face shape</dt>
              <dd>{profile.face}</dd>
            </div>
            <div>
              <dt>Hair type</dt>
              <dd>
                {profile.hair}, {profile.density}
              </dd>
            </div>
            <div>
              <dt>Hairline</dt>
              <dd>{profile.hairline.replace("-", " ")}</dd>
            </div>
            <div>
              <dt>Goal</dt>
              <dd>{f.cut.title.toLowerCase()}</dd>
            </div>
          </dl>

          <div className="bc-block">
            <h4>Ask for</h4>
            <ul>
              {f.cut.good.map((t, i) => (
                <li key={i}>
                  <RichText text={t} />
                </li>
              ))}
            </ul>
          </div>

          <div className="bc-block">
            <h4>Avoid</h4>
            <ul>
              {f.cut.avoid.map((t, i) => (
                <li key={i} className="avoid">
                  <RichText text={t} />
                </li>
              ))}
            </ul>
          </div>

          {hasBeard && (
            <div className="bc-block">
              <h4>Beard</h4>
              <ul>
                <li>
                  <RichText text={f.beardShape} />
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="bc-styles">
          <h4>Named cuts that suit this shape</h4>
          <div className="icon-row">
            {names.map((n) => (
              <CutIcon key={n} kind={cutKindFor(n)} label={n} />
            ))}
          </div>
          <p className="bc-note">
            Diagrams show silhouette and where the volume sits — not an exact cut. Bring a photo too
            if you have one you like.
          </p>
        </div>
      </div>
    </section>
  );
}
