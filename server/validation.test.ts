import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, ValidationError, validateImageDataUrl } from "./validation.ts";

/** Build a data URL from raw bytes and a claimed MIME type. */
function dataUrl(bytes: number[], mime = "image/jpeg"): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0, 0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0, 0];
const WEBP = [
  0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
];

describe("validateImageDataUrl", () => {
  it("accepts a real JPEG", () => {
    const result = validateImageDataUrl(dataUrl(JPEG));
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.buffer.length).toBe(JPEG.length);
  });

  it("accepts a real PNG", () => {
    expect(validateImageDataUrl(dataUrl(PNG, "image/png")).mimeType).toBe("image/png");
  });

  it("accepts a real WebP", () => {
    expect(validateImageDataUrl(dataUrl(WEBP, "image/webp")).mimeType).toBe("image/webp");
  });

  it("rejects a file whose bytes aren't an image, whatever it claims", () => {
    // The whole point: a declared content type proves nothing. This is a shell
    // script wearing an image/jpeg label.
    const script = [...Buffer.from("#!/bin/sh\nrm -rf /\n")];
    expect(() => validateImageDataUrl(dataUrl(script))).toThrow(ValidationError);
  });

  it("rejects a mismatch between the declared type and the actual bytes", () => {
    expect(() => validateImageDataUrl(dataUrl(PNG, "image/jpeg"))).toThrow(/says it's/);
  });

  it("rejects an SVG, which can carry script", () => {
    const svg = [...Buffer.from('<svg onload="alert(1)"></svg>')];
    expect(() => validateImageDataUrl(dataUrl(svg, "image/svg+xml"))).toThrow(ValidationError);
  });

  it("rejects anything that isn't a data URL", () => {
    for (const bad of ["", "https://example.com/x.jpg", "not a url", "data:image/jpeg,raw"]) {
      expect(() => validateImageDataUrl(bad)).toThrow(ValidationError);
    }
  });

  it("rejects non-string input", () => {
    for (const bad of [null, undefined, 42, {}, []]) {
      expect(() => validateImageDataUrl(bad)).toThrow(ValidationError);
    }
  });

  it("rejects oversized images before decoding them", () => {
    const huge = `data:image/jpeg;base64,${"A".repeat(MAX_IMAGE_BYTES * 2)}`;
    expect(() => validateImageDataUrl(huge)).toThrow(/too large/);
  });

  it("rejects a file too short to have a signature", () => {
    expect(() => validateImageDataUrl(dataUrl([0xff, 0xd8]))).toThrow(ValidationError);
  });

  it("rejects an empty payload", () => {
    expect(() => validateImageDataUrl("data:image/jpeg;base64,")).toThrow(ValidationError);
  });
});
