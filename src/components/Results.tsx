import { useMemo, useState } from "react";
import type { FaceAnalysis, Profile, Tone } from "../types";
import {
  FACE,
  HAIR,
  DENSITY,
  HAIRLINE,
  BEARD,
  BROWS,
  SKINCARE,
  CONCERN,
  TEETH,
  POSTURE,
  BODY,
  HEIGHT,
  STYLE_NOTE,
  AGE_NOTE,
  bodyFatNote,
  palette,
  protocol,
  summaryLine,
  styleNames,
} from "../lib/recommendations";
import { buildPlan } from "../lib/priority";
import { exportJson } from "../lib/storage";
import { RichList, RichItem } from "./RichText";
import { Metrics } from "./Metrics";
import { Priorities } from "./Priorities";
import { ToneToggle, VerdictBlock } from "./Verdict";
import { BarberCard } from "./BarberCard";
import { CutIcon, FaceOutline, FrameIcon } from "./Visuals";
import { cutKindFor, frameKindsFor } from "../lib/styleMap";

function Phase({ name, items }: { name: string; items: string[] }) {
  return (
    <div className="phase">
      <h4>
        <span className="dot" />
        {name}
      </h4>
      <ul>
        <RichList items={items} />
      </ul>
    </div>
  );
}

function plainText(profile: Profile): string {
  const f = FACE[profile.face];
  const strip = (s: string) => s.replace(/<\/?b>/g, "");
  const pr = protocol(profile);
  return [
    "MY LOOK PROTOCOL",
    "",
    strip(summaryLine(profile)),
    "",
    `HAIR — ${f.cut.title}`,
    ...f.cut.good.map((s) => `  + ${strip(s)}`),
    ...f.cut.avoid.map((s) => `  - ${strip(s)}`),
    `  Named cuts: ${styleNames(profile.face, profile.gender).join(", ")}`,
    "",
    "DAILY",
    ...pr.morning.map((s) => `  AM  ${strip(s)}`),
    ...pr.evening.map((s) => `  PM  ${strip(s)}`),
    "",
    "WEEKLY",
    ...pr.weekly.map((s) => `  • ${strip(s)}`),
  ].join("\n");
}

export function Results({
  profile,
  analysis,
  onRestart,
  tone,
  onToneChange,
}: {
  profile: Profile;
  analysis: FaceAnalysis | null;
  onRestart: () => void;
  tone: Tone;
  onToneChange: (t: Tone) => void;
}) {
  const [copied, setCopied] = useState(false);

  const f = FACE[profile.face];
  const b = BEARD[profile.beard];
  const bod = BODY[profile.body];
  const h = HEIGHT[profile.height];
  const skin = SKINCARE[profile.skinType];
  const concernNote = CONCERN[profile.concern];
  const teeth = TEETH[profile.teeth];
  const posture = POSTURE[profile.posture];
  const brows = BROWS[profile.brows];
  const hairline = HAIRLINE[profile.hairline];
  const pal = palette(profile.depth, profile.undertone);
  const pr = protocol(profile);
  const names = styleNames(profile.face, profile.gender);
  const frames = frameKindsFor(profile.face);
  const showBeard = profile.gender !== "fem";

  const plan = useMemo(
    () => buildPlan(profile, analysis?.metrics ?? []),
    [profile, analysis],
  );

  const toneLabel =
    profile.undertone === "neutral"
      ? "Neutral"
      : profile.undertone.charAt(0).toUpperCase() + profile.undertone.slice(1);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText(profile));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="results">
      <div className="dossier-head">
        <div className="eyebrow">Your Protocol</div>
        <h2>Tailored for you</h2>
        <p>{summaryLine(profile)}</p>
        <div className="dossier-actions no-print">
          <button type="button" className="btn btn-accent" onClick={onCopy}>
            {copied ? "✓ Copied" : "📋 Copy as text"}
          </button>
          <button
            type="button"
            className="btn btn-ghost cam-ghost"
            onClick={() => exportJson(profile, analysis ?? undefined)}
          >
            ⬇ Export JSON
          </button>
          <button type="button" className="btn btn-ghost cam-ghost" onClick={() => window.print()}>
            🖨 Print everything
          </button>
        </div>
      </div>

      <ToneToggle tone={tone} onChange={onToneChange} />

      {/* The verdict leads — it's the part that answers "what's actually wrong". */}
      <VerdictBlock profile={profile} metrics={analysis?.metrics ?? []} tone={tone} />

      {/* Then the ranked plan. */}
      <Priorities plan={plan} />

      {analysis && (
        <Metrics metrics={analysis.metrics} thirds={analysis.thirds} fifths={analysis.fifths} />
      )}

      <BarberCard profile={profile} />

      <div className="cards">
        {/* Haircut */}
        <div className="card">
          <div className="ref">REF 01 · Hair</div>
          <h3>Your Haircut</h3>
          <div className="sub">
            {profile.face} face · {profile.hair} hair
          </div>
          <div className="card-figure">
            <FaceOutline shape={profile.face} size={72} />
            <span>{f.cut.title}</span>
          </div>
          <ul>
            <RichList items={f.cut.good} />
            <RichList items={f.cut.avoid} avoid />
          </ul>
          <div className="icon-row small">
            {names.slice(0, 4).map((n) => (
              <CutIcon key={n} kind={cutKindFor(n)} label={n} />
            ))}
          </div>
          <ul>
            <RichItem text={HAIR[profile.hair]} />
            <RichItem text={DENSITY[profile.density]} />
          </ul>
        </div>

        {/* Hairline */}
        <div className="card">
          <div className="ref">REF 02 · Hairline</div>
          <h3>Your Hairline</h3>
          <div className="sub">{hairline.title}</div>
          <ul>
            <RichList items={hairline.notes} />
          </ul>
        </div>

        {/* Brows */}
        <div className="card">
          <div className="ref">REF 03 · Brows</div>
          <h3>Your Brows</h3>
          <div className="sub">{brows.title}</div>
          <ul>
            <RichList items={brows.notes} />
          </ul>
          <ul>
            <RichItem text={f.browShape} />
          </ul>
        </div>

        {/* Beard */}
        {showBeard && (
          <div className="card">
            <div className="ref">REF 04 · Beard</div>
            <h3>Your Beard</h3>
            <div className="sub">{b.title}</div>
            <ul>
              <RichList items={b.good} />
              {b.avoid && <RichList items={b.avoid} avoid />}
            </ul>
            <ul>
              <RichItem text={f.beardShape} />
            </ul>
          </div>
        )}

        {/* Skin */}
        <div className="card">
          <div className="ref">REF 05 · Skin</div>
          <h3>Your Skin</h3>
          <div className="sub">{skin.title}</div>
          <ul>
            <RichItem text={`<b>Cleanse</b> with ${skin.cleanser}`} />
            <RichItem text={`<b>Moisturise</b> with ${skin.moisturiser}`} />
            <RichList items={skin.notes} />
          </ul>
          {concernNote && (
            <ul>
              <RichItem text={concernNote} />
            </ul>
          )}
        </div>

        {/* Colour */}
        <div className="card">
          <div className="ref">REF 06 · Colour</div>
          <h3>Your Colours</h3>
          <div className="sub">
            {toneLabel} undertone · {profile.depth} skin
          </div>
          <ul>
            <RichItem text={pal.contrast} />
          </ul>
          <div className="palette">
            {pal.hex.map((hx, i) => (
              <div key={hx} className="swatch" style={{ background: hx }} title={pal.colors[i]} />
            ))}
          </div>
          <ul>
            <li>{pal.colors.join(", ")}</li>
            <RichItem text={`<b>Metals:</b> ${pal.metal}`} />
          </ul>
        </div>

        {/* Eyewear */}
        <div className="card">
          <div className="ref">REF 07 · Eyewear</div>
          <h3>Your Frames</h3>
          <div className="sub">Glasses and sunglasses for a {profile.face} face</div>
          <div className="icon-row small">
            {frames.map((fr) => (
              <FrameIcon key={fr.label} kind={fr.kind} label={fr.label} />
            ))}
          </div>
          <ul>
            <RichList items={f.frames.good} />
            <RichList items={f.frames.avoid} avoid />
          </ul>
        </div>

        {/* Teeth */}
        <div className="card">
          <div className="ref">REF 08 · Teeth</div>
          <h3>Your Smile</h3>
          <div className="sub">{teeth.title}</div>
          <ul>
            <RichList items={teeth.notes} />
          </ul>
        </div>

        {/* Posture */}
        <div className="card">
          <div className="ref">REF 09 · Posture</div>
          <h3>Your Posture</h3>
          <div className="sub">{posture.title}</div>
          <ul>
            <RichList items={posture.notes} />
          </ul>
        </div>

        {/* Fit */}
        <div className="card">
          <div className="ref">REF 10 · Fit</div>
          <h3>Your Fit &amp; Silhouette</h3>
          <div className="sub">{bod.title} · dressing for your height</div>
          <ul>
            <RichList items={bod.good} />
            <RichList items={bod.avoid} avoid />
          </ul>
          <ul>
            <RichList items={h.good} />
            <RichList items={h.avoid} avoid />
          </ul>
          <ul>
            <RichItem text={STYLE_NOTE[profile.style]} />
          </ul>
        </div>

        {/* Body & age */}
        <div className="card">
          <div className="ref">REF 11 · Body</div>
          <h3>Your Frame</h3>
          <div className="sub">Composition &amp; stage of life</div>
          <ul>
            <RichItem text={bodyFatNote(profile.body)} />
            <RichItem text={AGE_NOTE[profile.age]} />
          </ul>
        </div>

        {/* Protocol */}
        <div className="protocol">
          <div className="ref">REF 12 · Daily Protocol</div>
          <h3>Your Routine</h3>
          <div className="timeline">
            <Phase name="Morning" items={pr.morning} />
            <Phase name="Evening" items={pr.evening} />
            <Phase name="Weekly" items={pr.weekly} />
          </div>
        </div>
      </div>

      <p className="note">
        <b>These are guidelines, not rules.</b> The best look is one you wear with confidence.
        Consistency — sleep, skincare, fit — beats any single trick. The measurements here describe
        proportions, not worth, and none of this is medical or dental advice: for anything to do with
        hair loss, persistent skin conditions or your teeth, a professional will give you better
        information than any app.
      </p>
      <div className="restart no-print">
        <button type="button" className="btn btn-accent" onClick={onRestart}>
          Start over
        </button>
      </div>
    </section>
  );
}
