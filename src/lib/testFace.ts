import type { Pt } from "./metrics";

/**
 * A synthetic landmark mesh with geometry we control exactly, so tests can
 * assert real numbers instead of "it returned something".
 *
 * Laid out around a midline at x=200, with thirds and fifths deliberately made
 * perfectly even.
 */

const MESH_SIZE = 478;

export interface FaceSpec {
  /** Raise the outer eye corners by this many px (positive canthal tilt). */
  tilt?: number;
  /** Shift every left-side landmark outward by this many px. */
  asymmetry?: number;
  /** Half-width of the jaw at the gonion. */
  jawHalfWidth?: number;
}

export function makeFace(spec: FaceSpec = {}): Pt[] {
  const { tilt = 0, asymmetry = 0, jawHalfWidth = 60 } = spec;
  const lm: Pt[] = Array.from({ length: MESH_SIZE }, () => ({ x: 0, y: 0 }));
  const put = (i: number, x: number, y: number) => {
    lm[i] = { x, y };
  };

  const mid = 200;
  // Vertical: 25 → 90 → 155 → 220 gives three exactly equal thirds of 65px.
  put(10, mid, 25); // trichion
  put(9, mid, 90); // glabella
  put(168, mid, 105); // nasion
  put(2, mid, 155); // subnasale
  put(152, mid, 220); // menton

  // Horizontal: five exactly equal fifths of 28px across a 140px face.
  put(234, 130 - asymmetry, 130); // cheek, image-left
  put(454, 270, 130);
  put(33, 158 - asymmetry, 110 - tilt); // outer canthus
  put(133, 186 - asymmetry, 110); // inner canthus
  put(362, 214, 110);
  put(263, 242, 110 - tilt);

  put(21, 145 - asymmetry, 80); // temples
  put(251, 255, 80);
  put(172, mid - jawHalfWidth - asymmetry, 180); // gonion
  put(397, mid + jawHalfWidth, 180);

  put(48, 185, 155); // alar wings — 30px nose
  put(278, 215, 155);
  put(61, 178, 175); // mouth corners — 44px mouth
  put(291, 222, 175);

  put(0, mid, 166); // cupid's bow
  put(13, mid, 172);
  put(14, mid, 176);
  put(17, mid, 184);

  // Region landmarks used by the appearance detector. These need real, spatially
  // distinct positions: if brows, cheeks and beard collapse onto one point, every
  // region samples the same pixels and the readings become meaningless.

  // Forehead band.
  put(151, mid, 55);
  put(109, 175, 50);
  put(338, 225, 50);
  put(67, 165, 60);
  put(297, 235, 60);

  // Brows, sitting just above the eye line at y=110.
  const browL: [number, number][] = [
    [158, 94], [166, 91], [174, 90], [182, 91], [190, 93], // upper edge
    [158, 99], [166, 97], [174, 96], [182, 97], [190, 98], // lower edge
  ];
  const browLIdx = [70, 63, 105, 66, 107, 46, 53, 52, 65, 55];
  browL.forEach(([x, y], i) => put(browLIdx[i], x - asymmetry, y));

  const browRIdx = [300, 293, 334, 296, 336, 276, 283, 282, 295, 285];
  browL.forEach(([x, y], i) => put(browRIdx[i], 2 * mid - x, y));

  // Glabella — between the brow heads at x=190 and x=210.
  put(8, mid, 96);

  // Cheeks, clear of both the brow band and the beard region.
  put(50, 168, 140);
  put(280, 232, 140);
  put(205, 172, 150);
  put(425, 228, 150);
  put(118, 165, 132);
  put(347, 235, 132);

  // T-zone down the midline of the nose.
  put(6, mid, 115);
  put(197, mid, 122);
  put(195, mid, 130);
  put(5, mid, 138);
  put(4, mid, 145);
  put(1, mid, 150);

  // Beard footprint: chin, jawline and moustache.
  put(175, mid, 210);
  put(199, mid, 205);
  put(200, mid, 200);
  put(18, mid, 192);
  put(83, 190, 196);
  put(313, 210, 196);
  put(136, 150, 195);
  put(150, 160, 205);
  put(149, 170, 212);
  put(176, 180, 216);
  put(365, 250, 195);
  put(379, 240, 205);
  put(378, 230, 212);
  put(400, 220, 216);
  put(164, mid, 182);
  put(165, 190, 180);
  put(391, 210, 180);
  put(92, 184, 184);
  put(322, 216, 184);

  return lm;
}

/** Rotate a mesh about the image centre, simulating a tilted head. */
export function rotate(lm: Pt[], degrees: number, cx = 200, cy = 130): Pt[] {
  const r = (degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return lm.map((p) => ({
    x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
    y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
  }));
}

/** Convert a pixel mesh back to MediaPipe's 0–1 normalised space. */
export function toNormalized(lm: Pt[], width: number, height: number): Pt[] {
  return lm.map((p) => ({ x: p.x / width, y: p.y / height }));
}
