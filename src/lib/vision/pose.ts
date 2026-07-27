/**
 * Body type and posture from an optional second photo.
 *
 * Neither of these is knowable from a face selfie, which is why they stayed as
 * questions. Given a full-body or side-on shot, MediaPipe's pose landmarks
 * answer both deterministically: shoulder-to-hip ratio gives the frame, and how
 * far the ear sits in front of the shoulder gives forward head posture — the
 * exact measurement a physio would eyeball.
 *
 * Model: pose_landmarker_lite, Apache-2.0, hosted free by Google.
 */

import type { Body, Detected, Posture } from "../../types";
import type { NormalizedImage } from "../image";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

interface PosePoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

type PoseDetector = {
  detect: (canvas: HTMLCanvasElement) => { landmarks?: PosePoint[][] };
};

// Pose landmark indices (BlazePose 33-point topology).
const P = {
  earL: 7,
  earR: 8,
  shoulderL: 11,
  shoulderR: 12,
  hipL: 23,
  hipR: 24,
  kneeL: 25,
} as const;

let promise: Promise<PoseDetector> | null = null;

function getDetector(): Promise<PoseDetector> {
  if (!promise) {
    promise = (async () => {
      const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const detector = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "IMAGE",
        numPoses: 1,
      });
      return detector as unknown as PoseDetector;
    })().catch((e) => {
      promise = null;
      throw e;
    });
  }
  return promise;
}

export class NoBodyError extends Error {
  constructor() {
    super("No body detected");
    this.name = "NoBodyError";
  }
}

export interface PoseReading {
  body: Detected<Body>;
  posture: Detected<Posture>;
  /** True when the shot reads as side-on, where posture is actually measurable. */
  sideOn: boolean;
}

export async function analyzePose(img: NormalizedImage): Promise<PoseReading> {
  const detector = await getDetector();
  const result = detector.detect(img.canvas);
  const pts = result.landmarks?.[0];
  if (!pts?.length) throw new NoBodyError();

  const px = pts.map((p) => ({ ...p, x: p.x * img.width, y: p.y * img.height }));

  const shoulderWidth = Math.abs(px[P.shoulderL].x - px[P.shoulderR].x);
  const hipWidth = Math.abs(px[P.hipL].x - px[P.hipR].x);
  const torsoHeight = Math.abs(
    (px[P.hipL].y + px[P.hipR].y) / 2 - (px[P.shoulderL].y + px[P.shoulderR].y) / 2,
  );

  // When facing the camera, the shoulders project wide. Side-on, they collapse
  // toward each other — which is exactly the shot where posture is readable.
  const sideOn = shoulderWidth < torsoHeight * 0.62;

  // — Body type ——————————————————————————————————
  // Shoulder-to-hip ratio is the standard frame descriptor; torso height
  // normalises for how far away the person stood.
  const vTaper = shoulderWidth / (hipWidth || 1);
  const build = shoulderWidth / (torsoHeight || 1);

  let body: Body;
  let bodyConf = sideOn ? 0.4 : 0.62;
  let bodyBasis: string;

  if (sideOn) {
    body = "average";
    bodyConf = 0.35;
    bodyBasis = "This looks like a side-on shot — good for posture, but frame width can't be read from it.";
  } else if (vTaper > 1.42 && build < 0.95) {
    body = "athletic";
    bodyBasis = `Shoulders measure ${vTaper.toFixed(2)}× your hip width — a clear V-taper.`;
  } else if (build > 1.05) {
    body = "broad";
    bodyBasis = "Shoulders and torso read broad relative to torso length.";
  } else if (build < 0.72) {
    body = "slim";
    bodyBasis = "A narrow frame relative to your torso length.";
  } else {
    body = "average";
    bodyBasis = `Shoulder-to-hip ratio of ${vTaper.toFixed(2)} sits in the middle of the range.`;
  }

  // — Posture ————————————————————————————————————
  // Ear in front of shoulder = forward head. Only meaningful side-on.
  const earX = (px[P.earL].x + px[P.earR].x) / 2;
  const shoulderX = (px[P.shoulderL].x + px[P.shoulderR].x) / 2;
  const offset = Math.abs(earX - shoulderX) / (torsoHeight || 1);

  // Facing the camera, rolled shoulders show as the shoulders sitting forward
  // in depth (z) relative to the hips.
  const shoulderZ = (px[P.shoulderL].z + px[P.shoulderR].z) / 2;
  const hipZ = (px[P.hipL].z + px[P.hipR].z) / 2;
  const roll = shoulderZ - hipZ;

  let posture: Posture;
  let postureConf: number;
  let postureBasis: string;

  if (sideOn && offset > 0.16) {
    posture = "forward-head";
    postureConf = 0.72;
    postureBasis = `Your ear sits noticeably in front of your shoulder — the classic forward-head signature.`;
  } else if (sideOn) {
    posture = "good";
    postureConf = 0.68;
    postureBasis = "Your ear stacks close to over your shoulder.";
  } else if (roll < -0.12) {
    posture = "rounded-shoulders";
    postureConf = 0.45;
    postureBasis = "Your shoulders sit forward of your hips. A side-on photo would confirm this.";
  } else {
    posture = "unsure";
    postureConf = 0.3;
    postureBasis = "Posture needs a relaxed side-on photo to measure properly.";
  }

  return {
    sideOn,
    body: { value: body, confidence: bodyConf, source: "pose", basis: bodyBasis },
    posture: { value: posture, confidence: postureConf, source: "pose", basis: postureBasis },
  };
}
