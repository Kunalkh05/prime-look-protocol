/**
 * The blunt assessment.
 *
 * Everything else in this app describes. This judges — and the design rule that
 * makes that useful rather than merely unpleasant is:
 *
 *   **Harsh about what you can change. Flat about what you can't.**
 *
 * Bluntness aimed at body fat, grooming, skin, teeth or posture is worth
 * something, because it ends in an action. The same tone aimed at bone
 * structure has nowhere to go: it can't be acted on, so all it does is land.
 * So immutable traits here get a dismissal rather than a dressing-down — the
 * useful brutal note about canthal tilt is "that's bone, stop reading about it".
 *
 * Scores rate a *domain*, never the person. There is no overall number,
 * deliberately: "you are a 5" is a verdict with no action attached, and it is
 * the single output in this space that most reliably makes people worse. A
 * domain score says where the work is.
 */

import type { DomainScore, Metric, Profile, Tone, Verdict } from "../types";

const metricOf = (metrics: Metric[], key: string) => metrics.find((m) => m.key === key);

/** Soften the phrasing without softening the content. */
function measured(text: string): string {
  return text
    .replace(/\bYou're carrying\b/g, "You're currently carrying")
    .replace(/\bis costing you\b/g, "is working against you")
    .replace(/\bNobody\b/g, "Not many people")
    .replace(/\bIt's lazy\b/g, "It's an easy miss")
    .replace(/\bstop\b/gi, "consider stopping")
    .replace(/\bawful\b/g, "poor")
    .replace(/\bbad\b/g, "weak");
}

const phrase = (tone: Tone, text: string) => (tone === "direct" ? text : measured(text));

// ── Domain scoring ────────────────────────────────────────────────

function scoreSkin(p: Profile): DomainScore {
  let score = 7;
  if (p.concern === "acne") score = 3;
  else if (p.concern === "texture" || p.concern === "redness") score = 5;
  else if (p.concern === "pigment") score = 5;
  else if (p.concern === "aging") score = 6;
  if (p.skinType === "oily" && p.concern === "acne") score = 2;

  const verdict =
    score <= 3
      ? "Your skin is the first thing anyone reads and right now it's the loudest thing about your face. Breakouts read as untreated, not unlucky."
      : score <= 5
        ? "Your skin is holding you back more than your bone structure is. It's uneven and it's visible at conversational distance."
        : "Your skin is fine. Not remarkable, not a problem.";

  const fix =
    score <= 5
      ? "One active, used consistently for twelve weeks. Not five products rotated every fortnight — that's why it hasn't worked before. SPF daily, non-negotiable."
      : "Cleanse, moisturise, SPF. Don't add anything else without a reason.";

  return { key: "skin", label: "Skin", score, weight: 3, verdict, fix, horizon: "8–12 weeks" };
}

function scoreGrooming(p: Profile): DomainScore {
  let score = 8;
  if (p.brows === "unibrow") score = 2;
  else if (p.brows === "overplucked") score = 4;
  else if (p.brows === "sparse") score = 5;
  else if (p.brows === "thick") score = 7;

  if (p.beard === "patchy") score = Math.min(score, 4);

  const verdict =
    p.brows === "unibrow"
      ? "You have a unibrow. That's it — that's the note. It's the single laziest miss available and it's costing you every time someone looks at your face."
      : p.brows === "overplucked"
        ? "Your brows have been over-plucked into something that reads as permanently surprised. They frame everything and right now they're framing it badly."
        : p.beard === "patchy"
          ? "You're growing a beard your face can't currently support. The patches are more obvious to everyone else than they are to you in the mirror."
          : score <= 5
            ? "Your brows are doing nothing for you. They're the cheapest fix on this entire page and you're leaving it on the table."
            : "Grooming is handled. Keep it on a schedule rather than doing it when you notice.";

  const fix =
    p.brows === "unibrow"
      ? "Tweezers. Clear the middle. Ten minutes, tonight, done forever with a fortnightly touch-up."
      : p.brows === "overplucked"
        ? "Put the tweezers down for three months. Nothing else fixes this — you cannot shape your way out of it."
        : p.beard === "patchy"
          ? "Take it to 3–5mm stubble. Patches vanish at that length. Stop trying to grow it long."
          : "Strays below and between the brows, never above. Fortnightly.";

  return { key: "grooming", label: "Grooming", score, weight: 3, verdict, fix, horizon: "tonight" };
}

function scoreHair(p: Profile): DomainScore {
  let score = 8;
  const thinning = ["receding", "thinning-crown", "diffuse"].includes(p.hairline);
  if (thinning) score = 4;
  if (p.hairline === "shaved") score = 7;
  if (thinning && p.density !== "receding") score = 3;

  const verdict = thinning
    ? "You're losing hair and the way you're wearing it is drawing attention to exactly that. Length doesn't hide a hairline — it frames it. Everyone can tell, and the hiding reads worse than the loss does."
    : p.hairline === "shaved"
      ? "Shaved is a decision and it reads as one. That's the correct call — half-measures here are what look bad."
      : "Your hair is an asset. The only thing costing you is letting the cut go stale.";

  const fix = thinning
    ? "Cut it short and matte — a crop or a buzz. It reads as a choice instead of a cover-up, immediately. And see a dermatologist now rather than in five years, while you still have the full set of options."
    : p.hairline === "shaved"
      ? "Keep the scalp moisturised and under SPF, and let the beard carry the frame your hair used to."
      : "Every three weeks. A sharp cut two weeks old beats a better cut two months old.";

  return { key: "hair", label: "Hair", score, weight: 3, verdict, fix, horizon: "this week" };
}

function scoreBody(p: Profile, metrics: Metric[]): DomainScore {
  const jaw = metricOf(metrics, "gonial-angle");
  const softJaw = jaw?.status === "above";

  let score = 6;
  if (p.body === "athletic") score = 9;
  else if (p.body === "slim") score = 6;
  else if (p.body === "average") score = 6;
  else if (p.body === "broad") score = 3;
  if (softJaw && p.body === "broad") score = 2;

  const verdict =
    p.body === "broad"
      ? `You're carrying enough body fat that your jawline is buried${softJaw ? " — the measurement confirms it, your jaw angle is soft" : ""}. No haircut fixes this. No beard fixes this. No shirt fixes this. It is the single biggest thing standing between you and how you want to look, and everything else on this page is decoration until it moves.`
      : p.body === "slim"
        ? "You're thin, not lean — there's a difference and it shows in how clothes hang. You have no shoulders to speak of, so everything drapes off you instead of sitting on you."
        : p.body === "athletic"
          ? "Your frame is doing real work for you. This is the part you've already got right."
          : "Your body is average, which means it's neither helping nor hurting. That's the biggest available upgrade you're not taking.";

  const fix =
    p.body === "broad"
      ? "A sustainable deficit and resistance training three times a week. Facial definition shows up before almost anything else does — you will see your own face change. This takes months. Start now."
      : p.body === "slim"
        ? "Eat more and lift. Shoulders and upper back specifically — that's what builds the taper that makes clothes work."
        : "Resistance training three times a week. It fixes posture, facial definition and how clothes fit at the same time.";

  return { key: "body", label: "Body composition", score, weight: 3, verdict, fix, horizon: "3–6 months" };
}

function scoreTeeth(p: Profile): DomainScore {
  const score =
    p.teeth === "straight-white" ? 9 : p.teeth === "straight-stained" ? 5 : p.teeth === "unsure" ? 6 : 4;

  const verdict =
    p.teeth === "straight-stained"
      ? "Your teeth are visibly stained. People clock it and nobody mentions it. It reads as neglect even when it's just coffee."
      : p.teeth === "crooked" || p.teeth === "gapped"
        ? "Your teeth are the thing you're self-conscious about, and that shows more than the teeth do — it's why your smile looks held back in photos."
        : p.teeth === "unsure"
          ? "You don't know where your teeth stand, which usually means nobody's looked in a while."
          : "Teeth are good. That's a real asset — most people's aren't.";

  const fix =
    p.teeth === "straight-stained"
      ? "A hygienist appointment. One visit, removes surface stain, cheapest visible upgrade on this entire page."
      : p.teeth === "crooked" || p.teeth === "gapped"
        ? "Get an aligner consultation — they're free and commit you to nothing. It's 6–18 months, which is precisely why deferring it is the wrong call."
        : "Book a clean and ask them directly what they'd change.";

  return { key: "teeth", label: "Teeth", score, weight: 2, verdict, fix, horizon: "1 appointment" };
}

function scorePosture(p: Profile): DomainScore {
  const score =
    p.posture === "good" ? 9 : p.posture === "unsure" ? 6 : p.posture === "forward-head" ? 3 : 4;

  const verdict =
    p.posture === "forward-head"
      ? "Your head sits forward of your shoulders, which flattens the angle between your jaw and your neck and erases whatever jawline you have. You look tired before you've said anything."
      : p.posture === "rounded-shoulders"
        ? "Your shoulders roll forward, so every shirt you own hangs badly and you read as smaller than you are."
        : p.posture === "unsure"
          ? "You don't know what your posture looks like. Almost everyone who says that is wrong about it in the same direction."
          : "Posture is good. It's doing quiet work for you that most people never get.";

  const fix =
    p.posture === "forward-head"
      ? "Chin tucks — ten reps, five seconds, three times a day. Raise your monitor. Stop looking down at your phone, which is the actual cause. This shows up in photos within weeks."
      : p.posture === "rounded-shoulders"
        ? "Doorway pec stretch twice a day, face pulls three times a week. It improves how your clothes fit without buying anything."
        : "Take a relaxed side-on photo against a wall. Your ear should stack over your shoulder. Five seconds to find out.";

  return { key: "posture", label: "Posture", score, weight: 2, verdict, fix, horizon: "4–8 weeks" };
}

function scoreStyle(p: Profile): DomainScore {
  const score = p.height === "mid" ? 6 : 5;
  return {
    key: "fit",
    label: "Fit & clothing",
    score,
    weight: 2,
    verdict:
      "Almost nobody's clothes fit properly, and it's the difference people read as 'put together' without being able to say why. Odds are strong yours don't either.",
    fix: "Take three things you already own to a tailor. Shoulders and trouser length. It costs less than one new item and changes your silhouette more.",
    horizon: "1 week",
  };
}

// ── Assembly ──────────────────────────────────────────────────────

export function buildVerdict(p: Profile, metrics: Metric[], tone: Tone = "direct"): Verdict {
  const scores = [
    scoreBody(p, metrics),
    scoreSkin(p),
    scoreGrooming(p),
    scoreHair(p),
    scoreTeeth(p),
    scorePosture(p),
    scoreStyle(p),
  ];

  // The biggest liability is the worst score weighted by how much the area
  // actually matters — a 4 in something that barely registers is not the
  // headline, and a 3 in body composition always is.
  const ranked = [...scores].sort(
    (a, b) => (a.score - a.weight * 2) - (b.score - b.weight * 2),
  );
  const worst = ranked[0];

  const headline =
    worst.score <= 3
      ? `Your biggest problem is ${worst.label.toLowerCase()}.`
      : worst.score <= 5
        ? `Start with ${worst.label.toLowerCase()}.`
        : `Nothing here is broken. ${worst.label} is the weakest link.`;

  const detail = phrase(tone, `${worst.verdict} ${worst.fix}`);

  // Where the real ceiling sits, which is usually not the face.
  const strongAreas = scores.filter((s) => s.score >= 7).length;
  const closing =
    strongAreas >= 5
      ? phrase(
          tone,
          "Honestly? The physical side is largely handled. If you still feel like something's missing, it isn't your face — it's how you carry it, and no app measures that.",
        )
      : phrase(
          tone,
          "None of this is bone structure. Every item above is something you control, which is the point — the fixable stuff is where all the actual movement is, and most people never touch it because they're busy reading about the parts they can't change.",
        );

  return {
    headline,
    detail,
    scores: scores.sort((a, b) => a.score - b.score),
    closing,
  };
}

/** Immutable traits, addressed flatly so nobody spirals over them. */
export function immutableNote(metrics: Metric[], tone: Tone = "direct"): string | null {
  const flagged = metrics.filter(
    (m) => ["canthal-tilt", "fwhr", "facial-index", "symmetry", "eye-spacing"].includes(m.key) && m.status !== "in-range",
  );
  if (flagged.length === 0) return null;

  const names = flagged.map((m) => m.label.toLowerCase());
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const verb = names.length === 1 ? "sits" : "sit";

  return phrase(
    tone,
    `Your ${list} ${verb} outside the typical range. That's bone and cartilage — it doesn't respond to effort, and it matters far less than the internet has convinced you it does. Read it once, then stop. The measurements you can actually move are worth a hundred times more of your attention.`,
  );
}
