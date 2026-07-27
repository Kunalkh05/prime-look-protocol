/**
 * Detection orchestrator.
 *
 * Runs every available detector over the photo and merges the results into one
 * map of auto-filled profile fields. Two rules govern the merge:
 *
 *   1. **Every stage is optional.** A CDN blocked, WebGPU missing, the model
 *      download failing — none of these should cost the user the fields that
 *      other detectors already answered. Each stage is caught individually.
 *   2. **Highest confidence wins.** When two detectors answer the same field
 *      (segmentation and CLIP both have opinions on hair density), the more
 *      confident reading is kept, so adding a detector can never make a field
 *      worse.
 *
 * What deliberately isn't here: height and style goal. Neither is a physical
 * fact a photo contains, so they stay as questions rather than being guessed.
 */

import type {
  DetectionMap,
  DetectionProgress,
  FaceAnalysis,
  Profile,
} from "../../types";
import type { NormalizedImage } from "../image";
import { analyzeImageDetailed } from "../faceAnalysis";
import { analyzeHair } from "./segmentation";
import { analyzeAppearance } from "./appearance";
import { analyzeSemantics } from "./zeroShot";

export interface DetectionResult {
  analysis: FaceAnalysis;
  detected: DetectionMap;
  /** Stages that failed, so the UI can say what it couldn't do. */
  failures: string[];
}

/** Keep whichever reading is more confident. */
function merge(into: DetectionMap, from: DetectionMap): void {
  for (const [key, incoming] of Object.entries(from)) {
    if (!incoming) continue;
    const existing = (into as Record<string, { confidence: number } | undefined>)[key];
    if (!existing || incoming.confidence > existing.confidence) {
      (into as Record<string, unknown>)[key] = incoming;
    }
  }
}

export interface DetectOptions {
  onProgress?: (p: DetectionProgress) => void;
  /**
   * Server-side analysis, injected by the caller.
   *
   * Deliberately a callback rather than credentials: there is no API key in the
   * browser to pass in. Supplying this at all means the user opted in, so the
   * decision stays at the UI layer where the consent was given.
   */
  serverAnalyze?: (imageDataUrl: string) => Promise<DetectionMap>;
}

/**
 * Run the full pipeline on a face photo.
 *
 * The landmark analysis is awaited first because everything else needs its
 * landmarks; the remaining stages then run independently.
 */
export async function detectFromPhoto(
  img: NormalizedImage,
  opts: DetectOptions = {},
): Promise<DetectionResult> {
  const { onProgress } = opts;
  const failures: string[] = [];
  const detected: DetectionMap = {};

  onProgress?.({ stage: "Finding your face", ratio: null });
  // One landmark pass and one getImageData, shared by every detector below.
  const { analysis, pixels: px, data } = await analyzeImageDetailed(img);

  // Face shape and colouring come straight from the landmark pass.
  detected.face = {
    value: analysis.face,
    confidence: analysis.confidence,
    source: "geometry",
    basis: "Measured from the width and length ratios of your face.",
  };
  detected.depth = {
    value: analysis.depth,
    confidence: 0.7,
    source: "pixels",
    basis: "Averaged from your cheeks and forehead.",
  };
  detected.undertone = {
    value: analysis.undertone,
    confidence: 0.5,
    source: "pixels",
    basis: "Estimated from colour balance — lighting affects this one a lot.",
  };

  onProgress?.({ stage: "Reading brows, beard and skin", ratio: null });
  try {
    const appearance = analyzeAppearance(data, img.width, img.height, px);
    merge(detected, {
      brows: appearance.brows,
      beard: appearance.beard,
      skinType: appearance.skinType,
      concern: appearance.concern,
    });
  } catch (e) {
    console.error("Appearance analysis failed", e);
    failures.push("brows, beard and skin");
  }

  onProgress?.({ stage: "Mapping your hairline", ratio: null });
  try {
    const hair = await analyzeHair(img.canvas, px, img.width, img.height);
    merge(detected, { hairline: hair.hairline, density: hair.density });
  } catch (e) {
    console.error("Hair segmentation failed", e);
    failures.push("hairline and hair density");
  }

  onProgress?.({ stage: "Loading the vision model", ratio: null });
  try {
    const semantics = await analyzeSemantics(img.dataUrl, onProgress);
    merge(detected, {
      hair: semantics.hair,
      age: semantics.age,
      gender: semantics.gender,
      teeth: semantics.teeth,
    });
  } catch (e) {
    console.error("Zero-shot analysis failed", e);
    failures.push("hair type, age and gender");
  }

  // Server analysis runs last, so its typically higher confidence overrides the
  // local readings rather than the other way round.
  if (opts.serverAnalyze) {
    onProgress?.({ stage: "Running the server analysis you enabled", ratio: null });
    try {
      merge(detected, await opts.serverAnalyze(img.dataUrl));
    } catch (e) {
      console.error("Server analysis failed", e);
      failures.push(e instanceof Error ? e.message : "server analysis");
    }
  }

  onProgress?.({ stage: "Done", ratio: 1 });
  return { analysis, detected, failures };
}

/** Flatten a detection map into the plain values the form holds. */
export function toDraft(detected: DetectionMap): Partial<Profile> {
  const draft: Partial<Profile> = {};
  for (const [key, d] of Object.entries(detected)) {
    if (d) (draft as Record<string, unknown>)[key] = d.value;
  }
  return draft;
}

/** Fields we detected but aren't confident about, worth flagging for review. */
export function lowConfidenceFields(detected: DetectionMap, threshold = 0.55): string[] {
  return Object.entries(detected)
    .filter(([, d]) => d && d.confidence < threshold)
    .map(([k]) => k);
}
