/**
 * Facial proportion measurements derived from the MediaPipe FaceMesh landmarks.
 *
 * Two things matter for these numbers to mean anything:
 *
 * 1. MediaPipe returns coordinates normalised to 0–1 against the image's own
 *    width and height. On a 3:4 portrait that makes one unit of x a different
 *    physical length from one unit of y, which silently skews every width-to-
 *    height ratio. We convert to pixel space before measuring anything.
 * 2. A head tilted in the frame throws off every vertical and horizontal
 *    measurement. We de-rotate by the eye line first.
 *
 * The reference ranges below are the ones conventionally cited in facial
 * aesthetics. They describe averages, not goals — the copy attached to each
 * metric is deliberately about what to *do*, not what to score.
 */

import type { Metric, Thirds, Fifths } from "../types";

export interface Pt {
  x: number;
  y: number;
}

// Canonical FaceMesh indices. These approximate the named anthropometric
// points; they are close enough for proportion work, not for clinical use.
const I = {
  trichion: 10, // top of forehead / hairline estimate
  glabella: 9, // between the brows
  nasion: 168, // top of the nose bridge
  subnasale: 2, // base of the nose
  menton: 152, // bottom of the chin
  cheekL: 234, // widest face contour, image-left
  cheekR: 454,
  templeL: 21,
  templeR: 251,
  gonionL: 172, // jaw corner
  gonionR: 397,
  eyeOuterL: 33,
  eyeInnerL: 133,
  eyeInnerR: 362,
  eyeOuterR: 263,
  alarL: 48, // nostril wings
  alarR: 278,
  mouthL: 61,
  mouthR: 291,
  lipTop: 0, // cupid's bow
  lipInnerTop: 13,
  lipInnerBottom: 14,
  lipBottom: 17,
} as const;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const deg = (rad: number) => (rad * 180) / Math.PI;

/** Interior angle at `vertex`, in degrees. */
function angleAt(vertex: Pt, a: Pt, b: Pt): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (!mag) return 0;
  return deg(Math.acos(Math.max(-1, Math.min(1, dot / mag))));
}

/**
 * Scale normalised (0–1) landmarks into pixel space.
 *
 * These coordinates still index the actual image, so this — not the de-rolled
 * set — is what you sample pixels with.
 */
export function toPixelSpace(lm: Pt[], width: number, height: number): Pt[] {
  return lm.map((p) => ({ x: p.x * width, y: p.y * height }));
}

/**
 * Rotate pixel-space landmarks so the eye line is horizontal.
 *
 * This moves the points out of alignment with the image, so the result is for
 * geometry only — never for reading pixels back out of the canvas.
 */
export function deroll(px: Pt[]): Pt[] {
  const eyeL = mid(px[I.eyeOuterL], px[I.eyeInnerL]);
  const eyeR = mid(px[I.eyeOuterR], px[I.eyeInnerR]);
  const roll = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);

  const pivot = mid(eyeL, eyeR);
  const cos = Math.cos(-roll);
  const sin = Math.sin(-roll);
  return px.map((p) => {
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
  });
}

function statusOf(value: number, [lo, hi]: [number, number]): Metric["status"] {
  if (value < lo) return "below";
  if (value > hi) return "above";
  return "in-range";
}

/** The three vertical thirds, as percentages that sum to 100. */
export function facialThirds(lm: Pt[]): Thirds {
  const upper = Math.abs(lm[I.glabella].y - lm[I.trichion].y);
  const middle = Math.abs(lm[I.subnasale].y - lm[I.glabella].y);
  const lower = Math.abs(lm[I.menton].y - lm[I.subnasale].y);
  const total = upper + middle + lower || 1;
  return {
    upper: (upper / total) * 100,
    middle: (middle / total) * 100,
    lower: (lower / total) * 100,
  };
}

/** The five vertical fifths, as percentages that sum to 100. */
export function facialFifths(lm: Pt[]): Fifths {
  const total = dist(lm[I.cheekL], lm[I.cheekR]) || 1;
  const seg = (a: number, b: number) => (Math.abs(lm[a].x - lm[b].x) / total) * 100;
  return {
    outerLeft: seg(I.cheekL, I.eyeOuterL),
    eyeLeft: seg(I.eyeOuterL, I.eyeInnerL),
    inner: seg(I.eyeInnerL, I.eyeInnerR),
    eyeRight: seg(I.eyeInnerR, I.eyeOuterR),
    outerRight: seg(I.eyeOuterR, I.cheekR),
  };
}

/**
 * How closely paired features mirror each other across the facial midline.
 * Returns 0–100. Nobody scores 100, and cameras exaggerate asymmetry at close
 * range — this is mostly useful for spotting which side to photograph.
 */
export function symmetryScore(lm: Pt[]): number {
  const axis = (lm[I.trichion].x + lm[I.menton].x) / 2;
  const pairs: [number, number][] = [
    [I.eyeOuterL, I.eyeOuterR],
    [I.eyeInnerL, I.eyeInnerR],
    [I.mouthL, I.mouthR],
    [I.alarL, I.alarR],
    [I.cheekL, I.cheekR],
    [I.gonionL, I.gonionR],
    [I.templeL, I.templeR],
  ];

  let sum = 0;
  for (const [a, b] of pairs) {
    const dA = Math.abs(lm[a].x - axis);
    const dB = Math.abs(lm[b].x - axis);
    const mean = (dA + dB) / 2 || 1;
    sum += Math.abs(dA - dB) / mean;
  }
  const meanDeviation = sum / pairs.length;
  return Math.max(0, Math.min(100, (1 - meanDeviation) * 100));
}

/** Average canthal tilt in degrees; positive means outer corners sit higher. */
export function canthalTilt(lm: Pt[]): number {
  const tilt = (inner: number, outer: number) => {
    const run = Math.abs(lm[outer].x - lm[inner].x) || 1;
    const rise = lm[inner].y - lm[outer].y; // y grows downward
    return deg(Math.atan2(rise, run));
  };
  return (tilt(I.eyeInnerL, I.eyeOuterL) + tilt(I.eyeInnerR, I.eyeOuterR)) / 2;
}

/** Average jaw (gonial) angle in degrees. Lower reads as a sharper jaw. */
export function gonialAngle(lm: Pt[]): number {
  const left = angleAt(lm[I.gonionL], lm[I.cheekL], lm[I.menton]);
  const right = angleAt(lm[I.gonionR], lm[I.cheekR], lm[I.menton]);
  return (left + right) / 2;
}

/** Build the full metric set with reference ranges and plain-English notes. */
export function computeMetrics(lm: Pt[]): { metrics: Metric[]; thirds: Thirds; fifths: Fifths } {
  const thirds = facialThirds(lm);
  const fifths = facialFifths(lm);

  const faceWidth = dist(lm[I.cheekL], lm[I.cheekR]);
  const faceHeight = Math.abs(lm[I.menton].y - lm[I.trichion].y);
  const jawWidth = dist(lm[I.gonionL], lm[I.gonionR]);
  const eyeWidth = (dist(lm[I.eyeOuterL], lm[I.eyeInnerL]) + dist(lm[I.eyeInnerR], lm[I.eyeOuterR])) / 2;
  const intercanthal = dist(lm[I.eyeInnerL], lm[I.eyeInnerR]);
  const noseWidth = dist(lm[I.alarL], lm[I.alarR]);
  const mouthWidth = dist(lm[I.mouthL], lm[I.mouthR]);
  const upperLip = Math.abs(lm[I.lipInnerTop].y - lm[I.lipTop].y);
  const lowerLip = Math.abs(lm[I.lipBottom].y - lm[I.lipInnerBottom].y);
  const upperFaceHeight = Math.abs(lm[I.lipTop].y - lm[I.glabella].y);

  const metrics: Metric[] = [];
  const push = (m: Metric) => metrics.push(m);

  // — Vertical balance —————————————————————————————————
  const thirdSpread = Math.max(thirds.upper, thirds.middle, thirds.lower) -
    Math.min(thirds.upper, thirds.middle, thirds.lower);
  push({
    key: "thirds",
    label: "Facial thirds balance",
    value: round(thirdSpread),
    unit: "percent",
    target: [0, 8],
    status: statusOf(thirdSpread, [0, 8]),
    note:
      thirdSpread <= 8
        ? "Your forehead, midface and lower face are close to even — the classic balanced read."
        : `Your thirds differ by ${round(thirdSpread)} points, with the ${dominantThird(thirds)} carrying the most height.`,
    action:
      thirdSpread <= 8
        ? undefined
        : thirds.lower < 30
          ? "A fuller beard along the jaw and chin visually lengthens a short lower third."
          : thirds.upper > 37
            ? "A fringe or forward-styled hair shortens a tall forehead more than any other single change."
            : "Hair volume up top or beard length below is the lever here — add to whichever third reads short.",
  });

  // — Horizontal balance ————————————————————————————————
  const fifthValues = [fifths.outerLeft, fifths.eyeLeft, fifths.inner, fifths.eyeRight, fifths.outerRight];
  const fifthSpread = Math.max(...fifthValues) - Math.min(...fifthValues);
  push({
    key: "fifths",
    label: "Facial fifths balance",
    value: round(fifthSpread),
    unit: "percent",
    target: [0, 6],
    status: statusOf(fifthSpread, [0, 6]),
    note:
      fifthSpread <= 6
        ? "Eye width, spacing and outer margins divide your face close to evenly."
        : "Your face doesn't divide into five even columns — usually eye spacing or temple width driving it.",
    action: fifthSpread <= 6 ? undefined : "Brow shaping is the cheapest way to rebalance apparent eye spacing.",
  });

  // — Eyes ————————————————————————————————————————
  const eyeSpacing = intercanthal / (eyeWidth || 1);
  push({
    key: "eye-spacing",
    label: "Eye spacing",
    value: round(eyeSpacing, 2),
    unit: "ratio",
    target: [0.9, 1.1],
    status: statusOf(eyeSpacing, [0.9, 1.1]),
    note:
      eyeSpacing < 0.9
        ? "Your eyes sit slightly closer together than one eye-width apart."
        : eyeSpacing > 1.1
          ? "Your eyes sit slightly wider apart than one eye-width."
          : "Your eyes are almost exactly one eye-width apart — the canonical spacing.",
    action:
      eyeSpacing < 0.9
        ? "Keep the inner brow ends clean and slightly further apart; it opens up the centre of the face."
        : eyeSpacing > 1.1
          ? "Let the inner brow ends grow in a touch — it draws the eyes visually closer."
          : undefined,
  });

  const tilt = canthalTilt(lm);
  push({
    key: "canthal-tilt",
    label: "Canthal tilt",
    value: round(tilt, 1),
    unit: "degrees",
    target: [1, 8],
    status: statusOf(tilt, [1, 8]),
    note:
      tilt >= 1
        ? "Your outer eye corners sit above the inner ones — a positive tilt."
        : "Your outer eye corners sit level with or below the inner ones — a neutral to negative tilt.",
    action:
      tilt >= 1
        ? undefined
        : "This is bone and ligament. It does not respond to effort, and it is nowhere near as important as the internet has told you. Under-eye puffiness exaggerates how it reads, so sleep and less evening salt are the only levers that exist — take them and then stop thinking about this.",
  });

  // — Jaw & chin —————————————————————————————————————
  const jaw = gonialAngle(lm);
  push({
    key: "gonial-angle",
    label: "Jaw angle",
    value: round(jaw, 1),
    unit: "degrees",
    target: [110, 128],
    status: statusOf(jaw, [110, 128]),
    note:
      jaw <= 128
        ? "Your jaw turns a sharp corner. That's real definition and it's worth keeping visible."
        : "Your jaw angle is soft. Whatever structure is under there, it isn't reading from the outside.",
    action:
      jaw <= 128
        ? "Keep the beard neckline high and tight so the angle stays visible. Don't bury it."
        : "Body fat is what moves this, and nothing else comes close — not a beard, not a haircut, not an angle. Everything else is cosmetics on top.",
  });

  const jawRatio = jawWidth / (faceWidth || 1);
  push({
    key: "jaw-width",
    label: "Jaw-to-cheek width",
    value: round(jawRatio, 2),
    unit: "ratio",
    target: [0.78, 0.95],
    status: statusOf(jawRatio, [0.78, 0.95]),
    note:
      jawRatio > 0.95
        ? "Your jaw is nearly as wide as your cheekbones — a strong, square lower face."
        : jawRatio < 0.78
          ? "Your jaw tapers noticeably in from your cheekbones."
          : "Your jaw tapers gently in from the cheekbones — a balanced taper.",
    action:
      jawRatio < 0.78
        ? "Volume at the chin — a short beard or goatee — adds the width back."
        : undefined,
  });

  const fwhr = faceWidth / (upperFaceHeight || 1);
  push({
    key: "fwhr",
    label: "Facial width-to-height",
    value: round(fwhr, 2),
    unit: "ratio",
    target: [1.7, 2.05],
    status: statusOf(fwhr, [1.7, 2.05]),
    note:
      fwhr > 2.05
        ? "A wide upper face relative to its height — reads as broad and dominant."
        : fwhr < 1.7
          ? "A narrow upper face relative to its height — reads as long and refined."
          : "Your upper face width and height sit in the typical range.",
  });

  // — Overall shape ————————————————————————————————————
  const facialIndex = faceHeight / (faceWidth || 1);
  push({
    key: "facial-index",
    label: "Length-to-width",
    value: round(facialIndex, 2),
    unit: "ratio",
    target: [1.3, 1.5],
    status: statusOf(facialIndex, [1.3, 1.5]),
    note:
      facialIndex > 1.5
        ? "A long face relative to its width."
        : facialIndex < 1.3
          ? "A short, wide face relative to its length."
          : "Length and width sit near the classical 1.4 proportion.",
    action:
      facialIndex > 1.5
        ? "Add width, not height: fuller sides, a forward fringe, no tall volume on top."
        : facialIndex < 1.3
          ? "Add height, not width: volume on top, tighter sides, vertical lines."
          : undefined,
  });

  // — Nose & mouth ——————————————————————————————————
  const noseMouth = noseWidth / (mouthWidth || 1);
  push({
    key: "nose-mouth",
    label: "Nose-to-mouth width",
    value: round(noseMouth, 2),
    unit: "ratio",
    target: [0.6, 0.75],
    status: statusOf(noseMouth, [0.6, 0.75]),
    note:
      noseMouth > 0.75
        ? "Your nose is wide relative to your mouth."
        : noseMouth < 0.6
          ? "Your nose is narrow relative to your mouth."
          : "Your nose sits at about two-thirds your mouth width — the canonical relationship.",
  });

  const lipRatio = lowerLip / (upperLip || 1);
  push({
    key: "lip-ratio",
    label: "Upper-to-lower lip",
    value: round(lipRatio, 2),
    unit: "ratio",
    target: [1.3, 2.0],
    status: statusOf(lipRatio, [1.3, 2.0]),
    note:
      lipRatio >= 1.3 && lipRatio <= 2.0
        ? "Your lower lip is roughly 1.6× your upper — the golden-ratio relationship."
        : lipRatio < 1.3
          ? "Your upper and lower lips are close to equal in height."
          : "Your lower lip is notably fuller than your upper.",
    action: "Lip balm at night is the whole intervention here — dehydrated lips read thinner than they are.",
  });

  // — Symmetry ————————————————————————————————————
  const sym = symmetryScore(lm);
  push({
    key: "symmetry",
    label: "Symmetry",
    value: round(sym),
    unit: "score",
    target: [88, 100],
    status: statusOf(sym, [88, 100]),
    note:
      sym >= 88
        ? "Your paired features mirror each other closely."
        : "There's measurable asymmetry between your left and right sides — which is true of essentially everyone.",
    action:
      "Camera angle exaggerates this more than your face does. Find your better side and learn to turn into it for photos.",
  });

  return { metrics, thirds, fifths };
}

function dominantThird(t: Thirds): string {
  const max = Math.max(t.upper, t.middle, t.lower);
  if (max === t.upper) return "upper third (forehead)";
  if (max === t.middle) return "middle third (brow to nose)";
  return "lower third (nose to chin)";
}

function round(n: number, places = 0): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
