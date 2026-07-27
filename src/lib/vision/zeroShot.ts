/**
 * Zero-shot classification with CLIP, via Transformers.js.
 *
 * "Zero-shot" means we never train anything: CLIP was trained to score how well
 * an image matches a caption, so we hand it a set of competing captions ("a
 * photo of a person with curly hair", "…with straight hair") and take the best
 * match. That gets us the semantic fields — hair type, age band, teeth — with
 * no training data and no per-attribute model.
 *
 * Model: Xenova/clip-vit-base-patch32, Apache-2.0, free from the Hugging Face
 * CDN. Quantised to int8 it's roughly 40MB, downloaded once and then cached by
 * the browser. Everything runs locally; nothing is uploaded.
 *
 * Accuracy caveat: CLIP is good at coarse visual categories and mediocre at
 * fine-grained ones. Confidences below are scaled to reflect that, and the UI
 * always lets the user correct the result.
 */

import type {
  AgeBand,
  Detected,
  DetectionProgress,
  Gender,
  HairType,
  Teeth,
} from "../../types";

const MODEL_ID = "Xenova/clip-vit-base-patch32";

type Classifier = (
  image: string,
  labels: string[],
) => Promise<{ label: string; score: number }[]>;

let classifierPromise: Promise<Classifier> | null = null;

/** Load the model once, reporting download progress to the caller. */
export function getClassifier(onProgress?: (p: DetectionProgress) => void): Promise<Classifier> {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { env, pipeline } = await import("@huggingface/transformers");

      // Serve the runtime from our own origin as static files. Bundling it
      // instead forces the largest (asyncify, ~22MB) build on every visitor;
      // pointing at the directory lets ONNX Runtime pick the smallest binary
      // the browser can actually run.
      if (env.backends.onnx.wasm) {
        env.backends.onnx.wasm.wasmPaths = `${import.meta.env.BASE_URL}ort/`;
      }

      // WebGPU is dramatically faster where it exists; wasm is the fallback.
      const device = "gpu" in navigator ? "webgpu" : "wasm";

      const pipe = await pipeline("zero-shot-image-classification", MODEL_ID, {
        dtype: "q8",
        device: device as "webgpu" | "wasm",
        progress_callback: (p: { status: string; progress?: number }) => {
          if (p.status === "progress" && typeof p.progress === "number") {
            onProgress?.({ stage: "Downloading the vision model", ratio: p.progress / 100 });
          }
        },
      });
      return pipe as unknown as Classifier;
    })().catch((e) => {
      classifierPromise = null;
      throw e;
    });
  }
  return classifierPromise;
}

/** Is the model already cached, so we can run it without a visible download? */
export function isClassifierReady(): boolean {
  return classifierPromise !== null;
}

interface LabelSet<T> {
  /** Caption → value. Captions are full sentences; CLIP prefers them that way. */
  options: { caption: string; value: T }[];
  /** Scale applied to the raw margin, reflecting how well CLIP does here. */
  reliability: number;
}

/**
 * Run one label set and convert CLIP's softmax into a calibrated confidence.
 *
 * The raw top score is not a useful confidence — with four captions a coin flip
 * already scores 0.25. We use the margin between first and second place, which
 * tracks "did the model actually distinguish these" far better.
 */
async function classify<T>(
  classifier: Classifier,
  image: string,
  set: LabelSet<T>,
): Promise<{ value: T; confidence: number; runnerUp: string }> {
  const captions = set.options.map((o) => o.caption);
  const scored = await classifier(image, captions);

  const best = scored[0];
  const second = scored[1];
  const match = set.options.find((o) => o.caption === best.label) ?? set.options[0];
  const margin = second ? best.score - second.score : best.score;

  // Margin of 0 → chance; margin of 0.4+ → about as sure as CLIP gets.
  const confidence = Math.max(0.3, Math.min(0.85, (0.4 + margin * 1.4) * set.reliability));
  return { value: match.value, confidence, runnerUp: second?.label ?? "" };
}

const HAIR_TYPE: LabelSet<HairType> = {
  reliability: 1,
  options: [
    { caption: "a photo of a person with straight hair", value: "straight" },
    { caption: "a photo of a person with wavy hair", value: "wavy" },
    { caption: "a photo of a person with curly hair", value: "curly" },
    { caption: "a photo of a person with tightly coiled afro hair", value: "coily" },
  ],
};

const AGE: LabelSet<AgeBand> = {
  reliability: 0.85,
  options: [
    { caption: "a photo of a teenager", value: "teen" },
    { caption: "a photo of a person in their twenties", value: "twenties" },
    { caption: "a photo of a person in their thirties", value: "thirties" },
    { caption: "a photo of a middle aged person over forty", value: "forties+" },
  ],
};

const GENDER: LabelSet<Gender> = {
  reliability: 0.8,
  options: [
    { caption: "a photo of a man", value: "masc" },
    { caption: "a photo of a woman", value: "fem" },
    { caption: "a photo of an androgynous person", value: "neutral" },
  ],
};

const TEETH: LabelSet<Teeth> = {
  reliability: 0.7,
  options: [
    { caption: "a close up of a smile with straight white teeth", value: "straight-white" },
    { caption: "a close up of a smile with straight but yellowed teeth", value: "straight-stained" },
    { caption: "a close up of a smile with crooked crowded teeth", value: "crooked" },
    { caption: "a close up of a smile with a gap between the front teeth", value: "gapped" },
  ],
};

/** Are the teeth even visible? Asked first, so we don't guess from a closed mouth. */
const SHOWING_TEETH: LabelSet<boolean> = {
  reliability: 1,
  options: [
    { caption: "a photo of a person smiling with their teeth showing", value: true },
    { caption: "a photo of a person with their mouth closed", value: false },
  ],
};

export interface ZeroShotReading {
  hair: Detected<HairType>;
  age: Detected<AgeBand>;
  gender: Detected<Gender>;
  teeth: Detected<Teeth>;
}

export async function analyzeSemantics(
  imageDataUrl: string,
  onProgress?: (p: DetectionProgress) => void,
): Promise<ZeroShotReading> {
  const classifier = await getClassifier(onProgress);

  onProgress?.({ stage: "Reading hair and features", ratio: null });
  const [hair, age, gender, visible] = await Promise.all([
    classify(classifier, imageDataUrl, HAIR_TYPE),
    classify(classifier, imageDataUrl, AGE),
    classify(classifier, imageDataUrl, GENDER),
    classify(classifier, imageDataUrl, SHOWING_TEETH),
  ]);

  // Only ask about teeth when there are teeth in frame; otherwise say so.
  let teeth: Detected<Teeth>;
  if (visible.value) {
    const t = await classify(classifier, imageDataUrl, TEETH);
    teeth = {
      value: t.value,
      confidence: t.confidence,
      source: "zero-shot",
      basis: "Read from your smile in the photo.",
    };
  } else {
    teeth = {
      value: "unsure",
      confidence: 0.9,
      source: "zero-shot",
      basis: "Your teeth aren't visible in this photo, so this one is left for you to answer.",
    };
  }

  return {
    hair: {
      value: hair.value,
      confidence: hair.confidence,
      source: "zero-shot",
      basis: "Matched against reference descriptions of hair texture.",
    },
    age: {
      value: age.value,
      confidence: age.confidence,
      source: "zero-shot",
      basis: "Estimated age band — this only changes which advice gets emphasised.",
    },
    gender: {
      value: gender.value,
      confidence: gender.confidence,
      source: "zero-shot",
      basis: "A guess at which grooming track to show you. Change it freely — it's just a filter.",
    },
    teeth,
  };
}
