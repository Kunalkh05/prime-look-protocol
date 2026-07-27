/**
 * Turns the profile and measurements into a ranked action plan.
 *
 * The cards elsewhere in the app present every recommendation at equal weight,
 * which is not how any of this actually works: tidying your brows takes ten
 * minutes and changes your face, while a dental plan takes eighteen months.
 * Ranking by impact-per-unit-effort is what makes the advice usable.
 */

import type { Action, Metric, Profile } from "../types";

/** Higher sorts first. Impact dominates; effort breaks ties against itself. */
function score(a: Action): number {
  return a.impact * 2 - a.effort;
}

export interface Plan {
  today: Action[];
  weeks: Action[];
  months: Action[];
  /** The three highest-scoring actions overall, surfaced up front. */
  headline: Action[];
}

export function buildPlan(p: Profile, metrics: Metric[]): Plan {
  const actions: Action[] = [];
  const add = (a: Action) => actions.push(a);
  const metric = (key: string) => metrics.find((m) => m.key === key);

  // — Universally high return, low cost ——————————————————
  add({
    title: "Wear SPF every single day",
    why: "Photoageing is the single largest driver of how old skin looks, and it is almost entirely preventable. Nothing else in this list has a better long-run return.",
    effort: 1,
    impact: 3,
    horizon: "today",
    pillar: "Skin",
  });

  if (p.brows === "unibrow" || p.brows === "average" || p.brows === "thick") {
    add({
      title: "Tidy your brows",
      why: "Brows frame the eyes and set the expression of the whole upper face. Ten minutes of removing strays below and between the brows is the highest visible return per minute available to you.",
      effort: 1,
      impact: 3,
      horizon: "today",
      pillar: "Brows",
    });
  } else {
    add({
      title: "Stop plucking and let your brows recover",
      why: "Sparse brows weaken the frame of the entire upper face, and most sparseness is reversible. Doing nothing for three months is the whole intervention.",
      effort: 1,
      impact: 3,
      horizon: "months",
      pillar: "Brows",
    });
  }

  add({
    title: "Protect your sleep",
    why: "Under-eye darkness and facial puffiness are the two things people read as 'tired' before they read anything else, and both respond to sleep faster than to any product.",
    effort: 2,
    impact: 3,
    horizon: "today",
    pillar: "Recovery",
  });

  // — Posture ————————————————————————————————————
  if (p.posture === "forward-head") {
    add({
      title: "Chin tucks, three times a day",
      why: "Forward head posture flattens the angle between jaw and neck — it costs you jawline definition you already have. It reverses with a few minutes of daily work and shows up in photos within weeks.",
      effort: 1,
      impact: 3,
      horizon: "weeks",
      pillar: "Posture",
    });
  } else if (p.posture === "rounded-shoulders") {
    add({
      title: "Open your chest, strengthen your upper back",
      why: "Rounded shoulders make every shirt hang badly. Fixing it improves how your clothes fit without buying a single new item.",
      effort: 2,
      impact: 2,
      horizon: "weeks",
      pillar: "Posture",
    });
  } else if (p.posture === "unsure") {
    add({
      title: "Take a relaxed side-on photo against a wall",
      why: "You cannot assess your own posture from the front in a mirror. One unposed side profile tells you in five seconds whether this matters for you.",
      effort: 1,
      impact: 2,
      horizon: "today",
      pillar: "Posture",
    });
  }

  // — Teeth ————————————————————————————————————
  if (p.teeth === "straight-stained" || p.teeth === "unsure") {
    add({
      title: "Book a hygienist appointment",
      why: "A professional clean removes surface staining in one visit. Teeth read as a health signal at conversational distance, and this is the cheapest visible upgrade in the whole plan.",
      effort: 1,
      impact: 3,
      horizon: "weeks",
      pillar: "Teeth",
    });
  }
  if (p.teeth === "crooked" || p.teeth === "gapped") {
    add({
      title: "Get an aligner consultation",
      why: "It is the longest project on this list, which is exactly why it should start now rather than later. Consultations are usually free and commit you to nothing.",
      effort: 3,
      impact: 3,
      horizon: "months",
      pillar: "Teeth",
    });
  }

  // — Hair & hairline ————————————————————————————————
  if (p.hairline === "receding" || p.hairline === "thinning-crown" || p.hairline === "diffuse") {
    add({
      title: "Cut shorter and go matte",
      why: "Length and shine both advertise thinning. A short, textured, matte cut reads as a deliberate style choice, which is the entire difference between looking like you're managing it and looking like you're hiding it.",
      effort: 1,
      impact: 3,
      horizon: "weeks",
      pillar: "Hair",
    });
    add({
      title: "See a dermatologist while your options are widest",
      why: "Whatever you decide to do or not do about it, the set of choices is broadest early and narrows steadily. Getting real information now costs one appointment.",
      effort: 2,
      impact: 2,
      horizon: "months",
      pillar: "Hair",
    });
  } else {
    add({
      title: "Get on a barber cycle",
      why: "A sharp cut two weeks old beats a better cut two months old. Regularity matters more here than the specific style you pick.",
      effort: 2,
      impact: 3,
      horizon: "weeks",
      pillar: "Hair",
    });
  }

  // — Skin ————————————————————————————————————
  if (p.concern === "acne") {
    add({
      title: "Run one consistent acne treatment for 12 weeks",
      why: "Nearly everyone switches products before anything has had time to work. Consistency with one active beats rotating through five.",
      effort: 2,
      impact: 3,
      horizon: "months",
      pillar: "Skin",
    });
  }
  if (p.skinType === "oily") {
    add({
      title: "Stop over-washing",
      why: "Stripping oil triggers more oil production. Cutting back to twice a day usually improves oily skin more than adding any product does.",
      effort: 1,
      impact: 2,
      horizon: "today",
      pillar: "Skin",
    });
  }
  if (p.skinType === "dry" || p.skinType === "sensitive") {
    add({
      title: "Moisturise onto damp skin",
      why: "The same product does substantially more when it seals water in rather than sitting on dry skin. It is a change in timing, not in spending.",
      effort: 1,
      impact: 2,
      horizon: "today",
      pillar: "Skin",
    });
  }

  // — Body composition ————————————————————————————
  add({
    title: p.body === "slim" ? "Start resistance training to add mass" : "Train for composition, not weight",
    why:
      p.body === "slim"
        ? "Shoulder and upper-back mass creates the taper that makes clothes hang correctly. It is the main structural lever available to a lean frame."
        : "Facial definition — cheekbones and jaw angle — shows up as body fat comes down, usually before anywhere else does. Training also fixes posture as a side effect.",
    effort: 3,
    impact: 3,
    horizon: "months",
    pillar: "Body",
  });

  // — Wardrobe ————————————————————————————————
  add({
    title: "Get three things tailored",
    why: "Fit outranks price, brand and quantity. Taking in the shirts and trousers you already own changes your silhouette for less than the cost of one new item.",
    effort: 2,
    impact: 3,
    horizon: "weeks",
    pillar: "Fit",
  });
  add({
    title: "Build outfits from your palette",
    why: "Colours that fight your undertone make you look tired regardless of the garment. Narrowing to a working palette also makes getting dressed faster.",
    effort: 1,
    impact: 2,
    horizon: "today",
    pillar: "Colour",
  });

  // — Measurement-driven ——————————————————————————
  const thirds = metric("thirds");
  if (thirds && thirds.status !== "in-range" && thirds.action) {
    add({
      title: "Rebalance your facial thirds with hair or beard length",
      why: `${thirds.note} ${thirds.action}`,
      effort: 1,
      impact: 2,
      horizon: "weeks",
      pillar: "Proportion",
    });
  }

  const jaw = metric("gonial-angle");
  if (jaw && jaw.status === "above") {
    add({
      title: "Sharpen how your jaw reads",
      why: "Your jaw angle measures on the softer side. Body composition moves it most, and a defined beard neckline plus corrected head position do the rest without changing anything structural.",
      effort: 2,
      impact: 2,
      horizon: "months",
      pillar: "Proportion",
    });
  }

  const sym = metric("symmetry");
  if (sym && sym.status === "below") {
    add({
      title: "Learn your better side for photos",
      why: "Camera angle and lens distortion exaggerate asymmetry far more than your actual face does. Knowing which way to turn is free and changes every photo of you.",
      effort: 1,
      impact: 2,
      horizon: "today",
      pillar: "Proportion",
    });
  }

  const tilt = metric("canthal-tilt");
  if (tilt && tilt.status === "below") {
    add({
      title: "Reduce under-eye puffiness",
      why: "Eye-corner geometry is structural and not something to chase, but puffiness exaggerates how it reads. Sleep, lower evening salt and a cold rinse are the levers that actually exist.",
      effort: 1,
      impact: 1,
      horizon: "today",
      pillar: "Proportion",
    });
  }

  // Age-specific framing.
  if (p.age === "teen") {
    add({
      title: "Give it time before you change anything drastic",
      why: "Facial structure is still developing, so today's proportions are not final. Building habits now compounds; chasing fixes at this stage mostly wastes money and attention.",
      effort: 1,
      impact: 2,
      horizon: "months",
      pillar: "Perspective",
    });
  }

  const sorted = [...actions].sort((a, b) => score(b) - score(a));
  return {
    headline: sorted.slice(0, 3),
    today: sorted.filter((a) => a.horizon === "today"),
    weeks: sorted.filter((a) => a.horizon === "weeks"),
    months: sorted.filter((a) => a.horizon === "months"),
  };
}
