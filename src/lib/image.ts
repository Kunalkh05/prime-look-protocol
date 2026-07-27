/**
 * Photo intake. Phone cameras hand us images that are rotated via an EXIF tag
 * rather than in the pixel data, and at resolutions (12MP+) that make a full
 * getImageData() allocate tens of megabytes. Everything downstream — landmark
 * detection, skin sampling, the preview — wants an upright, modest-sized bitmap,
 * so we normalise once here and pass a plain canvas around after that.
 */

/** Longest edge we keep. Landmark detection gains nothing above this. */
const MAX_EDGE = 1024;

export interface NormalizedImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** Upright, downscaled JPEG — safe to put in an <img> or localStorage. */
  dataUrl: string;
}

/**
 * Read the EXIF orientation flag (1–8) from a JPEG.
 * Only used as a fallback where createImageBitmap can't do it for us.
 */
function readExifOrientation(buf: ArrayBuffer): number {
  const view = new DataView(buf);
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xffd8) return 1; // not a JPEG

  let offset = 2;
  while (offset < view.byteLength - 1) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    // APP1 — the EXIF payload.
    if (marker === 0xffe1) {
      const exifStart = offset + 2;
      if (view.getUint32(exifStart, false) !== 0x45786966) return 1; // "Exif"

      const tiff = exifStart + 6;
      const little = view.getUint16(tiff, false) === 0x4949;
      const dirStart = tiff + view.getUint32(tiff + 4, little);
      const entries = view.getUint16(dirStart, little);

      for (let i = 0; i < entries; i++) {
        const entry = dirStart + 2 + i * 12;
        if (view.getUint16(entry, little) === 0x0112) {
          return view.getUint16(entry + 8, little);
        }
      }
      return 1;
    }

    // Not a segment we care about — skip its declared length.
    if ((marker & 0xff00) !== 0xff00) break;
    offset += view.getUint16(offset, false);
  }
  return 1;
}

/** Orientations 5–8 swap the image's width and height. */
function swapsAxes(orientation: number): boolean {
  return orientation >= 5 && orientation <= 8;
}

/** Apply the EXIF transform to a context already sized to the *output* box. */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number,
): void {
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, w, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, w, h);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, h);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, w, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, w, h);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, h);
      break;
    default:
      break; // 1 — already upright
  }
}

/** Fit (w, h) inside a MAX_EDGE box, never scaling up. */
function fit(w: number, h: number): { w: number; h: number } {
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function toNormalized(canvas: HTMLCanvasElement): NormalizedImage {
  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    dataUrl: canvas.toDataURL("image/jpeg", 0.9),
  };
}

/** Decode via createImageBitmap, which honours EXIF for us where supported. */
async function viaImageBitmap(file: Blob): Promise<NormalizedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { w, h } = fit(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return toNormalized(canvas);
}

/** Decode through an <img>, rotating by the EXIF tag we parse ourselves. */
function viaImageElement(file: Blob): Promise<NormalizedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      const orientation = readExifOrientation(buf);
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        // Size the output box in post-rotation space.
        const rotated = swapsAxes(orientation);
        const srcW = rotated ? img.naturalHeight : img.naturalWidth;
        const srcH = rotated ? img.naturalWidth : img.naturalHeight;
        const { w, h } = fit(srcW, srcH);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        applyOrientation(ctx, orientation, w, h);
        // After the transform the drawing space is back in source orientation.
        ctx.drawImage(img, 0, 0, rotated ? h : w, rotated ? w : h);

        URL.revokeObjectURL(blobUrl);
        resolve(toNormalized(canvas));
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("Could not decode the image"));
      };
      img.src = blobUrl;
    };
    reader.readAsArrayBuffer(file);
  });
}

/** Load a user-selected file as an upright, downscaled canvas. */
export async function loadImageFile(file: Blob): Promise<NormalizedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      return await viaImageBitmap(file);
    } catch {
      // Safari < 15 ignores imageOrientation; fall through to manual EXIF.
    }
  }
  return viaImageElement(file);
}

/**
 * Load an already-upright source (our own camera capture, or a restored
 * session) — no EXIF to worry about, but still worth downscaling.
 */
export function loadImageUrl(url: string): Promise<NormalizedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { w, h } = fit(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(toNormalized(canvas));
    };
    img.onerror = () => reject(new Error("Could not decode the image"));
    img.src = url;
  });
}
