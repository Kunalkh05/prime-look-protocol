/**
 * Server-side vision analysis.
 *
 * This exists so the API credential never reaches a browser. A frontend cannot
 * hold a secret — anything shipped to the client is readable by the client —
 * so the token lives here and the browser only ever talks to our own endpoint.
 *
 * Two providers are supported. Gemini is the better model for this task and
 * returns every field in one call; Hugging Face is there because it was asked
 * for and because having a second option means a rate limit on one isn't fatal.
 *
 * Nothing here writes the image anywhere. It arrives in a request body, gets
 * forwarded, and is dropped. It is never logged, cached, or persisted.
 */

import type { Config } from "./config.ts";
import type { ValidatedImage } from "./validation.ts";

export class VisionError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "VisionError";
    this.status = status;
  }
}

/** The fields a photo can plausibly answer. Height and style are excluded by design. */
const ALLOWED = {
  gender: ["masc", "fem", "neutral"],
  age: ["teen", "twenties", "thirties", "forties+"],
  hair: ["straight", "wavy", "curly", "coily"],
  density: ["thick", "medium", "thin", "receding"],
  hairline: ["full", "mature", "receding", "thinning-crown", "diffuse", "shaved"],
  beard: ["full", "medium", "patchy", "light", "cleanshave"],
  brows: ["thick", "average", "sparse", "unibrow", "overplucked"],
  skinType: ["oily", "dry", "combo", "normal", "sensitive"],
  concern: ["acne", "texture", "pigment", "aging", "redness", "none"],
  teeth: ["straight-white", "straight-stained", "crooked", "gapped", "unsure"],
} as const;

type Field = keyof typeof ALLOWED;

const PROMPT = `You are assisting a grooming and style tool. Look at the face in this photo and fill in each field with the option that best matches what you can actually see.

Rules:
- Return ONLY a JSON object. No prose, no code fences.
- Every value must be exactly one of the listed options.
- Include a "confidence" object with a 0-1 number for each field.
- If something is not visible in the photo (for example teeth in a closed-mouth shot), pick the closest "unsure"/"none" option and give it a low confidence.
- Describe only visible grooming-relevant characteristics. Do not speculate about health, medical conditions, ethnicity, or attractiveness.

Fields and their allowed options:
${Object.entries(ALLOWED)
  .map(([k, v]) => `- ${k}: ${v.join(" | ")}`)
  .join("\n")}

Respond with: {"values": {field: option, ...}, "confidence": {field: number, ...}}`;

export interface DetectedField {
  value: string;
  confidence: number;
  source: "cloud";
  basis: string;
}

export type VisionResult = Partial<Record<Field, DetectedField>>;

/**
 * Validate the model's JSON against the allowed options.
 *
 * A value outside the enum would flow into the frontend's lookup tables, which
 * index straight into `Record<Enum, …>` objects — so an invented option becomes
 * an undefined read and a crash. Everything unrecognised is dropped.
 */
export function parseVisionJson(text: string): VisionResult {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: { values?: Record<string, unknown>; confidence?: Record<string, unknown> };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new VisionError("The vision model returned something that wasn't valid JSON.");
  }

  const out: VisionResult = {};
  for (const field of Object.keys(ALLOWED) as Field[]) {
    const value = parsed.values?.[field];
    if (typeof value !== "string") continue;
    if (!(ALLOWED[field] as readonly string[]).includes(value)) continue;

    const raw = parsed.confidence?.[field];
    const confidence = typeof raw === "number" && raw >= 0 && raw <= 1 ? raw : 0.6;

    out[field] = {
      value,
      confidence,
      source: "cloud",
      basis: "Read by the vision model on the server.",
    };
  }
  return out;
}

async function callGemini(image: ValidatedImage, config: Config, signal: AbortSignal): Promise<string> {
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  const response = await fetch(`${endpoint}?key=${encodeURIComponent(config.geminiApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [
        { parts: [{ text: PROMPT }, { inline_data: { mime_type: image.mimeType, data: image.base64 } }] },
      ],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    // Deliberately vague to the caller: upstream error bodies can echo the key
    // or other request details, and none of that belongs in a client response.
    if (response.status === 429) throw new VisionError("The vision API is rate limited right now. Try again shortly.", 429);
    if (response.status === 400 || response.status === 403) {
      console.error(`[vision] Gemini rejected the request (${response.status})`);
      throw new VisionError("The server's vision credentials were rejected.", 502);
    }
    throw new VisionError(`The vision service returned an error (${response.status}).`);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text) throw new VisionError("The vision model returned an empty response.");
  return text;
}

async function callHuggingFace(image: ValidatedImage, config: Config, signal: AbortSignal): Promise<string> {
  // Chat-completions shape, which HF's router exposes for vision-language models.
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.hfToken}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      model: process.env.HF_MODEL?.trim() || "Qwen/Qwen2.5-VL-7B-Instruct",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new VisionError("The vision API is rate limited right now. Try again shortly.", 429);
    if (response.status === 401 || response.status === 403) {
      console.error(`[vision] Hugging Face rejected the token (${response.status})`);
      throw new VisionError("The server's vision credentials were rejected.", 502);
    }
    throw new VisionError(`The vision service returned an error (${response.status}).`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text) throw new VisionError("The vision model returned an empty response.");
  return text;
}

/** Run the configured provider against one image. */
export async function analyzeImage(image: ValidatedImage, config: Config): Promise<VisionResult> {
  if (config.provider === "none") {
    throw new VisionError("Server-side analysis isn't configured on this deployment.", 503);
  }

  // Don't let a hung upstream hold a connection — and our own socket — open.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const text =
      config.provider === "gemini"
        ? await callGemini(image, config, controller.signal)
        : await callHuggingFace(image, config, controller.signal);
    return parseVisionJson(text);
  } catch (err) {
    if (err instanceof VisionError) throw err;
    if ((err as Error)?.name === "AbortError") {
      throw new VisionError("The vision service took too long to respond.", 504);
    }
    console.error("[vision] Unexpected failure:", (err as Error)?.message);
    throw new VisionError("Analysis failed.");
  } finally {
    clearTimeout(timeout);
  }
}
