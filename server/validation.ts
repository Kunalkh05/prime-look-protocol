/**
 * Input validation for uploaded images.
 *
 * The client says what it's sending; the server has to check. A declared
 * `image/jpeg` proves nothing, so this reads the actual file signature and
 * rejects anything that isn't a real image — which stops a payload being
 * relayed to the upstream vision API under a friendly-looking MIME type.
 *
 * Size is capped before decoding, not after, so a hostile request can't make us
 * allocate a large buffer just to find out it was too big.
 */

export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Roughly 5MB of image, which is far more than a 1024px JPEG ever needs. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** base64 inflates by 4/3, plus the data-URL prefix. */
export const MAX_DATA_URL_LENGTH = Math.ceil(MAX_IMAGE_BYTES * 1.37) + 128;

const SIGNATURES: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: "image/webp",
    test: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

export interface ValidatedImage {
  buffer: Buffer;
  /** The MIME type proven by the file's own bytes, not the one claimed. */
  mimeType: string;
  base64: string;
}

/**
 * Parse and validate a `data:` URL into a real image.
 * Throws ValidationError with a message safe to show the user.
 */
export function validateImageDataUrl(input: unknown): ValidatedImage {
  if (typeof input !== "string" || input.length === 0) {
    throw new ValidationError("No image was provided.");
  }
  if (input.length > MAX_DATA_URL_LENGTH) {
    throw new ValidationError("That image is too large. Please use one under 5MB.");
  }

  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(input);
  if (!match) {
    throw new ValidationError("Expected a base64 image data URL.");
  }

  const [, declaredMime, base64] = match;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    throw new ValidationError("That image couldn't be decoded.");
  }

  if (buffer.length === 0) throw new ValidationError("That image is empty.");
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ValidationError("That image is too large. Please use one under 5MB.");
  }
  if (buffer.length < 12) throw new ValidationError("That file is too small to be an image.");

  // The signature is what counts — the declared type is only a cross-check.
  const signature = SIGNATURES.find((s) => s.test(buffer));
  if (!signature) {
    throw new ValidationError("That file isn't a JPEG, PNG or WebP image.");
  }
  if (declaredMime.toLowerCase() !== signature.mime) {
    throw new ValidationError(
      `That file says it's ${declaredMime} but its contents are ${signature.mime}.`,
    );
  }

  return { buffer, mimeType: signature.mime, base64 };
}

/** Reject an oversized or non-JSON body before parsing it. */
export function assertJsonRequest(contentType: string | undefined, contentLength: string | undefined): void {
  if (!contentType?.toLowerCase().includes("application/json")) {
    throw new ValidationError("Expected a JSON request body.");
  }
  const declared = Number(contentLength);
  if (Number.isFinite(declared) && declared > MAX_DATA_URL_LENGTH + 1024) {
    throw new ValidationError("That request is too large.");
  }
}
