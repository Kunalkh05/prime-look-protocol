import type { FaceShape, Depth, Undertone, FaceAnalysis } from "../types";
import type { NormalizedImage } from "./image";
import { computeMetrics, deroll, toPixelSpace, type Pt } from "./metrics";

// MediaPipe assets load from a CDN on first use (needs internet once).
const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Deliberately typed loosely so the import below can stay dynamic — pulling the
// package in statically put its ~300KB into the main bundle for every visitor,
// including the ones who never upload a photo.
type Landmarker = { detect: (src: HTMLCanvasElement) => { faceLandmarks?: Pt[][] } };

let landmarkerPromise: Promise<Landmarker> | null = null;

/** Lazily fetch the library and create a single shared FaceLandmarker. */
function getLandmarker(): Promise<Landmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const instance = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "IMAGE",
        numFaces: 1,
      });
      return instance as unknown as Landmarker;
    })().catch((e) => {
      // Let the next attempt retry rather than caching the failure forever.
      landmarkerPromise = null;
      throw e;
    });
  }
  return landmarkerPromise;
}

/** Warm the model up in the background so the first upload feels instant. */
export function prefetchAnalyzer(): void {
  getLandmarker().catch(() => {});
}

export class NoFaceError extends Error {
  constructor() {
    super("No face detected");
    this.name = "NoFaceError";
  }
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Classify face shape from width/length ratios.
 * Expects landmarks already in pixel space and de-rotated.
 */
export function classifyFaceShape(lm: Pt[]): { shape: FaceShape; confidence: number } {
  const faceLength = dist(lm[10], lm[152]);
  const cheekWidth = dist(lm[234], lm[454]);
  const jawWidth = dist(lm[172], lm[397]);
  const foreheadWidth = dist(lm[21], lm[251]);

  const lengthRatio = faceLength / cheekWidth;
  const jawRatio = jawWidth / cheekWidth;
  const foreheadRatio = foreheadWidth / cheekWidth;

  let shape: FaceShape;
  if (jawRatio > 1.02 && foreheadRatio < 0.95) {
    shape = "triangle"; // jaw is the widest part
  } else if (foreheadRatio > 1.0 && jawRatio < 0.82) {
    shape = "heart"; // wide forehead, narrow chin
  } else if (foreheadRatio < 0.9 && jawRatio < 0.9 && lengthRatio >= 1.3) {
    shape = "diamond"; // cheekbones widest
  } else if (lengthRatio >= 1.5) {
    shape = "rectangle";
  } else if (lengthRatio <= 1.22 && jawRatio >= 0.9) {
    shape = "square";
  } else if (lengthRatio <= 1.28) {
    shape = "round";
  } else {
    shape = "oval";
  }

  const spread =
    Math.abs(lengthRatio - 1.35) + Math.abs(jawRatio - 0.9) + Math.abs(foreheadRatio - 0.95);
  const confidence = Math.max(0.45, Math.min(0.9, 0.5 + spread));
  return { shape, confidence };
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Average a small patch of pixels around a pixel-space landmark. */
function samplePatch(data: Uint8ClampedArray, w: number, h: number, pt: Pt, radius = 3): RGB {
  const cx = Math.round(pt.x);
  const cy = Math.round(pt.y);
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  return n ? { r: r / n, g: g / n, b: b / n } : { r: 0, g: 0, b: 0 };
}

function classifySkin(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  lm: Pt[],
): { depth: Depth; undertone: Undertone; skinColor: string } {
  // Cheeks + forehead — the areas least affected by shadow or beard.
  const points = [lm[50], lm[280], lm[10], lm[151], lm[425], lm[205]].filter(Boolean);
  let r = 0,
    g = 0,
    b = 0;
  for (const p of points) {
    const c = samplePatch(data, w, h, p);
    r += c.r;
    g += c.g;
    b += c.b;
  }
  const n = points.length || 1;
  r /= n;
  g /= n;
  b /= n;

  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  let depth: Depth;
  if (lum >= 170) depth = "fair";
  else if (lum >= 105) depth = "medium";
  else depth = "deep";

  // Warm skin skews yellow/golden (G lifted, B low);
  // cool skin skews pink/red (B relatively higher vs. G).
  const warmth = g - b;
  const pinkness = r - g;
  let undertone: Undertone;
  if (warmth > 28 && warmth - pinkness > 4) undertone = "warm";
  else if (pinkness > 45 && warmth < 30) undertone = "cool";
  else undertone = "neutral";

  const skinColor = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  return { depth, undertone, skinColor };
}

export interface DetailedAnalysis {
  analysis: FaceAnalysis;
  /** Landmarks in image-aligned pixel space — safe for reading pixels back. */
  pixels: Pt[];
  /** The image pixel data, so callers don't re-run getImageData. */
  data: Uint8ClampedArray;
}

/**
 * Run the analysis and hand back the intermediates other detectors need.
 *
 * The landmark pass and the getImageData call are the two most expensive parts
 * of the pipeline, and every downstream detector wants both — so they're done
 * once here rather than repeated per detector.
 */
export async function analyzeImageDetailed(img: NormalizedImage): Promise<DetailedAnalysis> {
  const landmarker = await getLandmarker();
  const result = landmarker.detect(img.canvas);

  if (!result.faceLandmarks?.length) throw new NoFaceError();

  const { width: w, height: h } = img;
  const ctx = img.canvas.getContext("2d", { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, w, h);

  // Pixel space fixes ratios that normalised coords skew on non-square images.
  // Skin sampling uses these, because they still line up with the canvas.
  const px = toPixelSpace(result.faceLandmarks[0], w, h);
  // Geometry additionally removes head roll, so a tilted photo still measures
  // correctly. These no longer index the image — don't read pixels with them.
  const geo = deroll(px);

  const { shape, confidence } = classifyFaceShape(geo);
  const { depth, undertone, skinColor } = classifySkin(data, w, h, px);
  const { metrics, thirds, fifths } = computeMetrics(geo);

  return {
    analysis: { face: shape, depth, undertone, skinColor, confidence, metrics, thirds, fifths },
    pixels: px,
    data,
  };
}

/**
 * Run the full analysis on an already-normalised (upright, downscaled) image.
 * Throws NoFaceError if no face is found.
 */
export async function analyzeImage(img: NormalizedImage): Promise<FaceAnalysis> {
  return (await analyzeImageDetailed(img)).analysis;
}
