/**
 * Appearance readings taken straight from pixel statistics inside
 * landmark-defined regions.
 *
 * Everything here is deterministic image processing rather than a learned
 * model: brow density is literally "how much darker than the surrounding
 * forehead is this band", and oiliness is "how much of the T-zone is blown out
 * to a specular highlight". That makes these readings cheap, explainable, and
 * available with no extra download — which matters more than squeezing out the
 * last few points of accuracy a classifier might add.
 *
 * The trade-off is honest confidence: lighting moves these numbers around, so
 * nothing here is reported above ~0.75.
 */

import type { Beard, Brows, Detected, SkinConcern, SkinType } from "../../types";
import type { Pt } from "../metrics";

// FaceMesh index groups for the regions we care about.
const R = {
  browL: [70, 63, 105, 66, 107, 46, 53, 52, 65, 55],
  browR: [300, 293, 334, 296, 336, 276, 283, 282, 295, 285],
  /** Between the brow heads — where a unibrow would show. */
  glabella: [8, 9, 168],
  forehead: [10, 151, 109, 338, 67, 297],
  cheeks: [50, 280, 205, 425, 118, 347],
  /** Chin, jawline and moustache — the beard footprint. */
  beard: [152, 175, 199, 200, 18, 83, 313, 172, 136, 150, 149, 176, 397, 365, 379, 378, 400, 164, 165, 391, 92, 322],
  /** T-zone, where sebum shows first. */
  tzone: [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1],
  nose: [1, 4, 5, 195],
} as const;

interface RegionStats {
  meanLum: number;
  meanR: number;
  meanG: number;
  meanB: number;
  /** Standard deviation of luminance — a proxy for texture. */
  variance: number;
  /** Fraction of pixels blown out to a near-white specular highlight. */
  specular: number;
  samples: number;
}

/** Average pixel statistics across small patches around each landmark. */
function regionStats(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  lm: Pt[],
  indices: readonly number[],
  radius: number,
): RegionStats {
  let r = 0,
    g = 0,
    b = 0,
    lumSum = 0,
    lumSqSum = 0,
    specular = 0,
    n = 0;

  for (const idx of indices) {
    const p = lm[idx];
    if (!p) continue;
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = (y * w + x) * 4;
        const pr = data[i];
        const pg = data[i + 1];
        const pb = data[i + 2];
        const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;

        r += pr;
        g += pg;
        b += pb;
        lumSum += lum;
        lumSqSum += lum * lum;
        // Specular highlights are bright *and* desaturated.
        if (lum > 225 && Math.max(pr, pg, pb) - Math.min(pr, pg, pb) < 26) specular++;
        n++;
      }
    }
  }

  if (!n) return { meanLum: 0, meanR: 0, meanG: 0, meanB: 0, variance: 0, specular: 0, samples: 0 };
  const meanLum = lumSum / n;
  return {
    meanLum,
    meanR: r / n,
    meanG: g / n,
    meanB: b / n,
    variance: Math.sqrt(Math.max(0, lumSqSum / n - meanLum * meanLum)),
    specular: specular / n,
    samples: n,
  };
}

export interface AppearanceReading {
  brows: Detected<Brows>;
  beard: Detected<Beard>;
  skinType: Detected<SkinType>;
  concern: Detected<SkinConcern>;
}

export function analyzeAppearance(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  lm: Pt[],
): AppearanceReading {
  // Scale sampling patches with image size so results don't depend on upload
  // resolution — the pipeline caps the long edge at 1024, but portraits vary.
  const unit = Math.max(2, Math.round(Math.min(w, h) / 220));

  const forehead = regionStats(data, w, h, lm, R.forehead, unit * 2);
  const cheeks = regionStats(data, w, h, lm, R.cheeks, unit * 2);
  const browL = regionStats(data, w, h, lm, R.browL, unit);
  const browR = regionStats(data, w, h, lm, R.browR, unit);
  const glabella = regionStats(data, w, h, lm, R.glabella, unit);
  const beardRegion = regionStats(data, w, h, lm, R.beard, unit);
  const tzone = regionStats(data, w, h, lm, R.tzone, unit * 2);

  const skinLum = (forehead.meanLum + cheeks.meanLum) / 2 || 1;

  // — Brows —————————————————————————————————————
  // How much darker the brow band is than the forehead around it.
  const browContrast = 1 - (browL.meanLum + browR.meanLum) / 2 / skinLum;
  const glabellaContrast = 1 - glabella.meanLum / skinLum;

  let brows: Brows;
  let browConf = 0.6;
  let browBasis: string;

  if (glabellaContrast > browContrast * 0.62 && glabellaContrast > 0.1) {
    brows = "unibrow";
    browConf = 0.6;
    browBasis = "The area between your brows is nearly as dark as the brows themselves.";
  } else if (browContrast > 0.26) {
    brows = "thick";
    browConf = 0.68;
    browBasis = "Your brows read as a strong, dense band against your forehead.";
  } else if (browContrast < 0.09) {
    brows = "sparse";
    browConf = 0.55;
    browBasis = "Your brows are low-contrast against your skin — either fine, fair or sparse.";
  } else {
    brows = "average";
    browConf = 0.62;
    browBasis = "Your brows read as a normal density against your forehead.";
  }
  // Fair brows on fair skin genuinely look sparse to this method.
  if (brows === "sparse" && skinLum > 175) browConf = 0.42;

  // — Beard —————————————————————————————————————
  // Beard shadow makes the lower face darker than the cheeks, and much more
  // textured. Using both avoids reading a shadow under the chin as stubble.
  const beardContrast = 1 - beardRegion.meanLum / skinLum;
  const beardTexture = beardRegion.variance / (cheeks.variance || 1);

  let beard: Beard;
  let beardConf = 0.55;
  let beardBasis: string;

  if (beardContrast > 0.3 && beardTexture > 1.25) {
    beard = "full";
    beardConf = 0.7;
    beardBasis = "Dense, even growth across your jaw and chin.";
  } else if (beardContrast > 0.17) {
    beard = "medium";
    beardConf = 0.6;
    beardBasis = "Clear growth across the lower face, without full coverage.";
  } else if (beardContrast > 0.08) {
    beard = beardTexture > 1.4 ? "patchy" : "light";
    beardConf = 0.5;
    beardBasis =
      beardTexture > 1.4
        ? "Uneven growth — some areas noticeably denser than others."
        : "Light growth only.";
  } else {
    beard = "cleanshave";
    beardConf = 0.66;
    beardBasis = "No meaningful growth detected — currently clean-shaven.";
  }

  // — Skin type ——————————————————————————————————
  // Sebum shows as specular highlight across the T-zone.
  const shine = tzone.specular;
  const cheekShine = cheeks.specular;

  let skinType: SkinType;
  let skinConf = 0.5;
  let skinBasis: string;

  if (shine > 0.06 && cheekShine > 0.03) {
    skinType = "oily";
    skinConf = 0.6;
    skinBasis = "Strong specular highlight across both the T-zone and the cheeks.";
  } else if (shine > 0.035) {
    skinType = "combo";
    skinConf = 0.58;
    skinBasis = "The T-zone is shiny while your cheeks are matte — the classic combination pattern.";
  } else if (forehead.variance > 26 && shine < 0.012) {
    skinType = "dry";
    skinConf = 0.45;
    skinBasis = "Matte throughout with visible surface texture.";
  } else {
    skinType = "normal";
    skinConf = 0.45;
    skinBasis = "No strong oil or dryness signal — reads as balanced.";
  }

  // — Concern ——————————————————————————————————
  // Redness: red channel lifted relative to green across the cheeks.
  const redness = (cheeks.meanR - cheeks.meanG) / (skinLum || 1);
  const texture = (cheeks.variance + forehead.variance) / 2;

  let concern: SkinConcern;
  let concernConf = 0.42;
  let concernBasis: string;

  if (redness > 0.22) {
    concern = "redness";
    concernConf = 0.55;
    concernBasis = "Your cheeks read noticeably red relative to the rest of your skin.";
  } else if (texture > 30 && shine > 0.03) {
    concern = "acne";
    concernConf = 0.4;
    concernBasis = "Raised surface variation combined with oiliness.";
  } else if (texture > 30) {
    concern = "texture";
    concernConf = 0.45;
    concernBasis = "Noticeable variation in surface tone and texture.";
  } else {
    concern = "none";
    concernConf = 0.4;
    concernBasis = "Nothing specific stood out.";
  }

  return {
    brows: { value: brows, confidence: browConf, source: "pixels", basis: browBasis },
    beard: { value: beard, confidence: beardConf, source: "pixels", basis: beardBasis },
    skinType: { value: skinType, confidence: skinConf, source: "pixels", basis: skinBasis },
    concern: { value: concern, confidence: concernConf, source: "pixels", basis: concernBasis },
  };
}
