export type FaceShape =
  | "oval"
  | "round"
  | "square"
  | "rectangle"
  | "heart"
  | "diamond"
  | "triangle";

export type HairType = "straight" | "wavy" | "curly" | "coily";
export type Density = "thick" | "medium" | "thin" | "receding";
export type Beard = "full" | "medium" | "patchy" | "light" | "cleanshave";
export type Depth = "fair" | "medium" | "deep";
export type Undertone = "warm" | "cool" | "neutral";
export type Body = "slim" | "athletic" | "average" | "broad";
export type Height = "short" | "mid" | "tall";
export type Style = "clean" | "street" | "smart" | "rugged";

/** Presentation, not identity — it only selects which grooming tracks apply. */
export type Gender = "masc" | "fem" | "neutral";
export type AgeBand = "teen" | "twenties" | "thirties" | "forties+";
export type SkinType = "oily" | "dry" | "combo" | "normal" | "sensitive";
export type SkinConcern = "acne" | "texture" | "pigment" | "aging" | "redness" | "none";
/** Loosely tracks the Norwood scale without medicalising it. */
export type Hairline = "full" | "mature" | "receding" | "thinning-crown" | "diffuse" | "shaved";
export type Brows = "thick" | "average" | "sparse" | "unibrow" | "overplucked";
export type Teeth = "straight-white" | "straight-stained" | "crooked" | "gapped" | "unsure";
export type Posture = "good" | "forward-head" | "rounded-shoulders" | "unsure";

/** Everything the recommendation engine needs. */
export interface Profile {
  gender: Gender;
  age: AgeBand;
  face: FaceShape;
  hair: HairType;
  density: Density;
  hairline: Hairline;
  beard: Beard;
  brows: Brows;
  depth: Depth;
  undertone: Undertone;
  skinType: SkinType;
  concern: SkinConcern;
  teeth: Teeth;
  posture: Posture;
  body: Body;
  height: Height;
  style: Style;
}

/** A single measured facial proportion. */
export interface Metric {
  key: string;
  label: string;
  /** The measured value, already normalised into whatever `unit` says. */
  value: number;
  unit: "ratio" | "percent" | "degrees" | "score";
  /** The commonly-cited reference range for this proportion. */
  target: [number, number];
  /** Where the value sits relative to target, for display only. */
  status: "in-range" | "below" | "above";
  /** Plain-English reading of the number. */
  note: string;
  /** What (if anything) is worth doing about it. */
  action?: string;
}

/** The three vertical facial thirds, as percentages of total face height. */
export interface Thirds {
  upper: number;
  middle: number;
  lower: number;
}

/** The five vertical fifths, as percentages of total face width. */
export interface Fifths {
  outerLeft: number;
  eyeLeft: number;
  inner: number;
  eyeRight: number;
  outerRight: number;
}

/** What the photo analyzer can estimate. Everything is a best-guess. */
export interface FaceAnalysis {
  face: FaceShape;
  depth: Depth;
  undertone: Undertone;
  /** average skin color as CSS rgb() for display */
  skinColor: string;
  /** 0..1 rough confidence the caller may surface */
  confidence: number;
  /** Proportion measurements derived from the landmark mesh. */
  metrics: Metric[];
  thirds: Thirds;
  fifths: Fifths;
}

/** One ranked recommendation in the action plan. */
export interface Action {
  title: string;
  why: string;
  /** 1 = trivial, 3 = a real project */
  effort: 1 | 2 | 3;
  /** 1 = subtle, 3 = changes how you read at a glance */
  impact: 1 | 2 | 3;
  horizon: "today" | "weeks" | "months";
  /** Grouping label shown as a chip. */
  pillar: string;
}

/** Where a detected value came from, so the UI can be honest about it. */
export type DetectionSource =
  | "geometry" // landmark maths — deterministic
  | "pixels" // colour/texture statistics — deterministic
  | "segmentation" // MediaPipe hair mask
  | "pose" // MediaPipe body landmarks
  | "zero-shot" // CLIP text-image matching
  | "cloud"; // opt-in remote vision model

/** One auto-filled field, with enough context for the user to judge it. */
export interface Detected<T> {
  value: T;
  /** 0..1. Anything under ~0.55 is surfaced as "please check this". */
  confidence: number;
  source: DetectionSource;
  /** Short plain-English reason, shown on request. */
  basis?: string;
}

/** Everything the photo pipeline managed to work out. */
export type DetectionMap = {
  [K in keyof Profile]?: Detected<Profile[K]>;
};

/** Progress reporting while models download and run. */
export interface DetectionProgress {
  stage: string;
  /** 0..1 overall, or null when indeterminate. */
  ratio: number | null;
}

/** What we persist to localStorage between visits. */
export interface StoredSession {
  version: 2;
  savedAt: string;
  profile: Profile;
  /** Downscaled JPEG data URL of the analysed photo, if the user allowed it. */
  photo?: string;
  analysis?: FaceAnalysis;
}
