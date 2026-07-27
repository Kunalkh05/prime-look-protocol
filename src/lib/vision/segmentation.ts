/**
 * Hair segmentation via MediaPipe's selfie multiclass model.
 *
 * The hair mask is what makes hairline staging possible without asking. We
 * measure how far the hair boundary sits above the brow line at the midline
 * versus at the temples: a temple that has retreated further than the centre is
 * the signature of recession, and a mature hairline moves uniformly instead.
 *
 * Model: selfie_multiclass_256x256, Apache-2.0, hosted free by Google.
 */

import type { Density, Detected, Hairline } from "../../types";
import type { Pt } from "../metrics";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";

/** Class indices produced by the multiclass selfie model. */
const CLASS_HAIR = 1;

type Segmenter = {
  segment: (canvas: HTMLCanvasElement) => { categoryMask?: { getAsUint8Array(): Uint8Array; width: number; height: number; close(): void } };
};

let promise: Promise<Segmenter> | null = null;

function getSegmenter(): Promise<Segmenter> {
  if (!promise) {
    promise = (async () => {
      const { ImageSegmenter, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const seg = await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
      return seg as unknown as Segmenter;
    })().catch((e) => {
      promise = null;
      throw e;
    });
  }
  return promise;
}

export interface HairReading {
  hairline: Detected<Hairline>;
  density: Detected<Density>;
  /** Fraction of the head bounding box covered by hair, for debugging. */
  coverage: number;
}

/**
 * Walk up a column of the mask and return the y at which hair starts.
 * Returns null when the column never hits hair.
 */
function hairTopAt(
  mask: Uint8Array,
  mw: number,
  mh: number,
  xNorm: number,
  fromYNorm: number,
): number | null {
  const x = Math.round(xNorm * (mw - 1));
  if (x < 0 || x >= mw) return null;
  const startY = Math.round(fromYNorm * (mh - 1));

  // Scan upward from the brow line looking for the first sustained hair run,
  // so a stray dark pixel doesn't read as a hairline.
  let run = 0;
  for (let y = Math.min(startY, mh - 1); y >= 0; y--) {
    if (mask[y * mw + x] === CLASS_HAIR) {
      run++;
      if (run >= 3) return (y + run) / mh;
    } else {
      run = 0;
    }
  }
  return null;
}

export async function analyzeHair(
  canvas: HTMLCanvasElement,
  lm: Pt[],
  width: number,
  height: number,
): Promise<HairReading> {
  const segmenter = await getSegmenter();
  const result = segmenter.segment(canvas);
  const mask = result.categoryMask;
  if (!mask) throw new Error("Segmentation produced no mask");

  const mw = mask.width;
  const mh = mask.height;
  const data = mask.getAsUint8Array();

  // Reference points, normalised so they index the mask rather than the image.
  const browY = lm[9].y / height; // glabella, just above the brows
  const midX = lm[9].x / width;
  const templeLX = lm[21].x / width;
  const templeRX = lm[251].x / width;
  const faceHeight = Math.abs(lm[152].y - lm[9].y) / height;

  const mid = hairTopAt(data, mw, mh, midX, browY);
  const left = hairTopAt(data, mw, mh, templeLX, browY);
  const right = hairTopAt(data, mw, mh, templeRX, browY);

  // Total hair coverage over the upper half of the head box.
  let hairPixels = 0;
  let boxPixels = 0;
  const x0 = Math.round(Math.max(0, (lm[234].x / width) * mw));
  const x1 = Math.round(Math.min(mw, (lm[454].x / width) * mw));
  const y1 = Math.round(Math.min(mh, browY * mh));
  for (let y = 0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      boxPixels++;
      if (data[y * mw + x] === CLASS_HAIR) hairPixels++;
    }
  }
  const coverage = boxPixels ? hairPixels / boxPixels : 0;
  mask.close();

  // Forehead height at the midline and at the temples, as a fraction of face
  // height. Bigger number = hair starts further from the brows.
  const midGap = mid === null ? 1 : Math.max(0, (browY - mid) / (faceHeight || 1));
  const templeGaps = [left, right]
    .filter((v): v is number => v !== null)
    .map((v) => Math.max(0, (browY - v) / (faceHeight || 1)));
  const templeGap = templeGaps.length
    ? templeGaps.reduce((a, b) => a + b, 0) / templeGaps.length
    : midGap;

  // A temple that has moved back further than the midline is recession; the
  // two moving together is a mature hairline.
  const recession = templeGap - midGap;

  let hairline: Hairline;
  let confidence = 0.7;
  let basis: string;

  if (coverage < 0.06) {
    hairline = "shaved";
    confidence = 0.88;
    basis = "Almost no hair detected above the brow line.";
  } else if (coverage < 0.3) {
    hairline = "diffuse";
    confidence = 0.6;
    basis = `Hair covers only ${Math.round(coverage * 100)}% of the upper head area.`;
  } else if (recession > 0.12) {
    hairline = "receding";
    confidence = 0.72;
    basis = "The hairline sits noticeably further back at the temples than at the centre.";
  } else if (midGap > 0.42) {
    hairline = "mature";
    confidence = 0.62;
    basis = "The hairline has moved back evenly rather than at the temples.";
  } else {
    hairline = "full";
    confidence = 0.75;
    basis = "The hairline sits low and even across the forehead.";
  }

  // Density from how solidly the hair region fills in.
  let density: Density;
  let densityConf = 0.55;
  if (hairline === "receding" || hairline === "diffuse" || hairline === "shaved") {
    density = "receding";
    densityConf = 0.7;
  } else if (coverage > 0.62) {
    density = "thick";
    densityConf = 0.62;
  } else if (coverage > 0.42) {
    density = "medium";
  } else {
    density = "thin";
  }

  return {
    coverage,
    hairline: { value: hairline, confidence, source: "segmentation", basis },
    density: {
      value: density,
      confidence: densityConf,
      source: "segmentation",
      basis: `Hair fills ${Math.round(coverage * 100)}% of the area above your brow line.`,
    },
  };
}
