import { describe, expect, it } from "vitest";
import {
  canthalTilt,
  computeMetrics,
  deroll,
  facialFifths,
  facialThirds,
  gonialAngle,
  symmetryScore,
  toPixelSpace,
} from "./metrics";
import { makeFace, rotate, toNormalized } from "./testFace";

describe("toPixelSpace", () => {
  it("corrects the aspect-ratio skew in normalised coordinates", () => {
    // A face 240px wide and 480px tall on a 600x800 portrait image: the true
    // length-to-width ratio is 2.0. Measuring in normalised units instead
    // gives 0.6/0.4 = 1.5, which is the bug this fixes.
    const normalized = [
      { x: 0.3, y: 0.2 },
      { x: 0.7, y: 0.2 },
      { x: 0.5, y: 0.8 },
    ];
    const px = toPixelSpace(normalized, 600, 800);

    const width = px[1].x - px[0].x;
    const height = px[2].y - px[0].y;

    expect(width).toBe(240);
    expect(height).toBe(480);
    expect(height / width).toBe(2);

    const naive = (normalized[2].y - normalized[0].y) / (normalized[1].x - normalized[0].x);
    expect(naive).toBeCloseTo(1.5, 5);
  });
});

describe("deroll", () => {
  it("leaves an already-level face untouched", () => {
    const face = makeFace();
    const out = deroll(face);
    expect(out[152].x).toBeCloseTo(face[152].x, 6);
    expect(out[152].y).toBeCloseTo(face[152].y, 6);
  });

  it("recovers the same proportions from a tilted head", () => {
    const level = computeMetrics(deroll(makeFace()));
    const tilted = computeMetrics(deroll(rotate(makeFace(), 18)));

    for (const key of ["facial-index", "fifths", "thirds", "eye-spacing", "nose-mouth"]) {
      const a = level.metrics.find((m) => m.key === key)!;
      const b = tilted.metrics.find((m) => m.key === key)!;
      expect(b.value).toBeCloseTo(a.value, 1);
    }
  });

  it("restores a tilted face's thirds to even", () => {
    const t = facialThirds(deroll(rotate(makeFace(), 25)));
    expect(t.upper).toBeCloseTo(33.33, 0);
    expect(t.middle).toBeCloseTo(33.33, 0);
    expect(t.lower).toBeCloseTo(33.33, 0);
  });
});

describe("facialThirds", () => {
  it("splits the constructed face into three even thirds", () => {
    const t = facialThirds(makeFace());
    expect(t.upper).toBeCloseTo(33.33, 1);
    expect(t.middle).toBeCloseTo(33.33, 1);
    expect(t.lower).toBeCloseTo(33.33, 1);
  });

  it("always sums to 100", () => {
    const t = facialThirds(rotate(makeFace(), 7));
    expect(t.upper + t.middle + t.lower).toBeCloseTo(100, 6);
  });
});

describe("facialFifths", () => {
  it("splits the constructed face into five even fifths", () => {
    const f = facialFifths(makeFace());
    for (const v of Object.values(f)) expect(v).toBeCloseTo(20, 1);
  });
});

describe("symmetryScore", () => {
  it("scores a perfectly mirrored face at 100", () => {
    expect(symmetryScore(makeFace())).toBeCloseTo(100, 6);
  });

  it("drops as one side is pushed outward", () => {
    const mild = symmetryScore(makeFace({ asymmetry: 4 }));
    const strong = symmetryScore(makeFace({ asymmetry: 14 }));
    expect(mild).toBeLessThan(100);
    expect(strong).toBeLessThan(mild);
  });
});

describe("canthalTilt", () => {
  it("reads zero when the eye corners are level", () => {
    expect(canthalTilt(makeFace())).toBeCloseTo(0, 6);
  });

  it("reads positive when the outer corners sit higher", () => {
    expect(canthalTilt(makeFace({ tilt: 4 }))).toBeGreaterThan(0);
  });

  it("reads negative when the outer corners sit lower", () => {
    expect(canthalTilt(makeFace({ tilt: -4 }))).toBeLessThan(0);
  });
});

describe("gonialAngle", () => {
  it("returns a plausible angle", () => {
    const a = gonialAngle(makeFace());
    expect(a).toBeGreaterThan(60);
    expect(a).toBeLessThan(180);
  });

  it("closes as the jaw widens toward the cheekbones", () => {
    // A wide jaw puts the gonion almost directly below the cheekbone, which
    // makes the corner more of a right angle. A narrow, tapered jaw leaves an
    // obtuse one. Lower angle therefore means a sharper-reading jaw.
    const narrow = gonialAngle(makeFace({ jawHalfWidth: 45 }));
    const wide = gonialAngle(makeFace({ jawHalfWidth: 68 }));
    expect(wide).toBeLessThan(narrow);
  });
});

describe("computeMetrics", () => {
  const { metrics } = computeMetrics(makeFace());
  const byKey = (k: string) => metrics.find((m) => m.key === k)!;

  it("produces every expected metric exactly once", () => {
    const keys = metrics.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of [
      "thirds",
      "fifths",
      "eye-spacing",
      "canthal-tilt",
      "gonial-angle",
      "jaw-width",
      "fwhr",
      "facial-index",
      "nose-mouth",
      "lip-ratio",
      "symmetry",
    ]) {
      expect(keys).toContain(k);
    }
  });

  it("measures eye spacing at exactly one eye-width", () => {
    expect(byKey("eye-spacing").value).toBeCloseTo(1, 2);
    expect(byKey("eye-spacing").status).toBe("in-range");
  });

  it("measures the constructed nose-to-mouth ratio", () => {
    expect(byKey("nose-mouth").value).toBeCloseTo(30 / 44, 2);
  });

  it("measures the constructed length-to-width ratio", () => {
    expect(byKey("facial-index").value).toBeCloseTo(195 / 140, 2);
  });

  it("assigns status consistently with the target band", () => {
    for (const m of metrics) {
      const [lo, hi] = m.target;
      const expected = m.value < lo ? "below" : m.value > hi ? "above" : "in-range";
      expect(m.status).toBe(expected);
    }
  });

  it("gives every metric a non-empty note", () => {
    for (const m of metrics) expect(m.note.length).toBeGreaterThan(10);
  });
});

describe("end-to-end coordinate handling", () => {
  it("measures the same face identically at different image aspect ratios", () => {
    const face = makeFace();
    // The same face, described against a square image and a portrait one.
    const square = computeMetrics(deroll(toPixelSpace(toNormalized(face, 400, 400), 400, 400)));
    const portrait = computeMetrics(deroll(toPixelSpace(toNormalized(face, 400, 800), 400, 800)));

    for (const m of square.metrics) {
      const other = portrait.metrics.find((x) => x.key === m.key)!;
      expect(other.value).toBeCloseTo(m.value, 2);
    }
  });
});
