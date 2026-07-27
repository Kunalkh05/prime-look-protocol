import { describe, expect, it } from "vitest";
import { analyzeAppearance } from "./appearance";
import { makeFace } from "../testFace";
import type { Pt } from "../metrics";

/**
 * These build synthetic images rather than using photos: we paint a known skin
 * tone, then darken or brighten specific landmark regions and assert the
 * detector reads back what we painted.
 */

const W = 400;
const H = 300;

interface Paint {
  skin?: [number, number, number];
  /** Darken the brow bands by this much. */
  brow?: number;
  /** Darken the space between the brows. */
  glabella?: number;
  /** Darken the beard region. */
  beard?: number;
  /** Add specular highlight to the T-zone. */
  shine?: boolean;
}

const REGIONS = {
  brow: [70, 63, 105, 66, 107, 46, 53, 52, 65, 55, 300, 293, 334, 296, 336, 276, 283, 282, 295, 285],
  glabella: [8, 9, 168],
  beard: [152, 175, 199, 200, 18, 83, 313, 172, 136, 150, 149, 176, 397, 365, 379, 378, 400, 164, 165, 391, 92, 322],
  tzone: [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1],
};

function paint(lm: Pt[], opts: Paint): Uint8ClampedArray {
  const [sr, sg, sb] = opts.skin ?? [190, 155, 135];
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = sr;
    data[i * 4 + 1] = sg;
    data[i * 4 + 2] = sb;
    data[i * 4 + 3] = 255;
  }

  const stamp = (indices: number[], fn: (i: number) => void, radius = 6) => {
    for (const idx of indices) {
      const p = lm[idx];
      if (!p) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = Math.round(p.x) + dx;
          const y = Math.round(p.y) + dy;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          fn((y * W + x) * 4);
        }
      }
    }
  };

  const darken = (amount: number) => (i: number) => {
    data[i] = Math.max(0, data[i] - amount);
    data[i + 1] = Math.max(0, data[i + 1] - amount);
    data[i + 2] = Math.max(0, data[i + 2] - amount);
  };

  if (opts.brow) stamp(REGIONS.brow, darken(opts.brow));
  if (opts.glabella) stamp(REGIONS.glabella, darken(opts.glabella));
  if (opts.beard) stamp(REGIONS.beard, darken(opts.beard));
  if (opts.shine) {
    stamp(REGIONS.tzone, (i) => {
      data[i] = 250;
      data[i + 1] = 250;
      data[i + 2] = 250;
    });
  }
  return data;
}

const lm = makeFace();
const run = (opts: Paint) => analyzeAppearance(paint(lm, opts), W, H, lm);

describe("brow detection", () => {
  it("reads heavily darkened brows as thick", () => {
    expect(run({ brow: 110 }).brows.value).toBe("thick");
  });

  it("reads barely-there brows as sparse", () => {
    expect(run({ brow: 4 }).brows.value).toBe("sparse");
  });

  it("reads a dark bridge between the brows as a unibrow", () => {
    expect(run({ brow: 110, glabella: 110 }).brows.value).toBe("unibrow");
  });

  it("lowers confidence for fair skin, where the method is weakest", () => {
    const fair = run({ brow: 4, skin: [235, 220, 210] });
    expect(fair.brows.value).toBe("sparse");
    expect(fair.brows.confidence).toBeLessThan(0.5);
  });
});

describe("beard detection", () => {
  it("reads a clean lower face as clean-shaven", () => {
    expect(run({}).beard.value).toBe("cleanshave");
  });

  it("reads a strongly darkened jaw as growth", () => {
    const beard = run({ beard: 80 }).beard.value;
    expect(["full", "medium"]).toContain(beard);
  });

  it("never reports growth without darkening", () => {
    expect(run({ brow: 110 }).beard.value).toBe("cleanshave");
  });
});

describe("skin type detection", () => {
  it("reads a blown-out T-zone as oily or combination", () => {
    expect(["oily", "combo"]).toContain(run({ shine: true }).skinType.value);
  });

  it("reads flat matte skin as balanced or dry", () => {
    expect(["normal", "dry"]).toContain(run({}).skinType.value);
  });
});

describe("confidence discipline", () => {
  it("never claims certainty, since lighting moves all of these", () => {
    const r = run({ brow: 110, beard: 80, shine: true });
    for (const d of [r.brows, r.beard, r.skinType, r.concern]) {
      expect(d.confidence).toBeLessThanOrEqual(0.75);
      expect(d.confidence).toBeGreaterThan(0);
    }
  });

  it("labels every reading with its source and a reason", () => {
    const r = run({ beard: 80 });
    for (const d of [r.brows, r.beard, r.skinType, r.concern]) {
      expect(d.source).toBe("pixels");
      expect(d.basis?.length ?? 0).toBeGreaterThan(10);
    }
  });
});
