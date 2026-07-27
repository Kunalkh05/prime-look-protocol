import { describe, expect, it } from "vitest";
import { buildVerdict, immutableNote } from "./verdict";
import { computeMetrics } from "./metrics";
import { makeFace } from "./testFace";
import type { Profile } from "../types";

const base: Profile = {
  gender: "masc",
  age: "twenties",
  face: "oval",
  hair: "straight",
  density: "medium",
  hairline: "full",
  beard: "medium",
  brows: "average",
  depth: "medium",
  undertone: "neutral",
  skinType: "normal",
  concern: "none",
  teeth: "straight-white",
  posture: "good",
  body: "athletic",
  height: "mid",
  style: "clean",
};

const { metrics } = computeMetrics(makeFace());

describe("buildVerdict", () => {
  it("scores every domain within range", () => {
    for (const s of buildVerdict(base, metrics).scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(10);
    }
  });

  it("always pairs a verdict with a fix", () => {
    // A judgement with no action attached is just an insult — this is the
    // invariant that keeps the blunt mode useful rather than merely harsh.
    for (const s of buildVerdict(base, metrics).scores) {
      expect(s.verdict.length).toBeGreaterThan(20);
      expect(s.fix.length).toBeGreaterThan(20);
      expect(s.horizon.length).toBeGreaterThan(0);
    }
  });

  it("names body composition as the headline when it's the worst", () => {
    const v = buildVerdict({ ...base, body: "broad" }, metrics);
    expect(v.headline.toLowerCase()).toContain("body composition");
  });

  it("names grooming when a unibrow is the standout issue", () => {
    const v = buildVerdict({ ...base, brows: "unibrow" }, metrics);
    expect(v.headline.toLowerCase()).toContain("grooming");
    expect(v.detail.toLowerCase()).toContain("unibrow");
  });

  it("weights impact, not just the raw low score", () => {
    // Fit scores mediocre for everyone. It must not outrank a genuinely bad
    // score in a high-impact domain.
    const v = buildVerdict({ ...base, concern: "acne", skinType: "oily" }, metrics);
    expect(v.headline.toLowerCase()).toContain("skin");
  });

  it("doesn't manufacture problems for someone in good shape", () => {
    const strong: Profile = { ...base, posture: "good", teeth: "straight-white" };
    const v = buildVerdict(strong, metrics);
    expect(v.headline.toLowerCase()).toContain("nothing here is broken");
  });

  it("sorts scores worst-first", () => {
    const scores = buildVerdict({ ...base, body: "broad", concern: "acne" }, metrics).scores;
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i].score).toBeGreaterThanOrEqual(scores[i - 1].score);
    }
  });

  it("scores only modifiable domains — never bone structure", () => {
    // Face shape, canthal tilt and symmetry must never appear as something
    // scored, because a score implies it can be moved.
    const keys = buildVerdict(base, metrics).scores.map((s) => s.key);
    for (const forbidden of ["face", "canthal-tilt", "symmetry", "fwhr", "overall"]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("produces no single overall rating", () => {
    const v = buildVerdict(base, metrics);
    expect(v).not.toHaveProperty("overall");
    expect(v).not.toHaveProperty("rating");
  });

  it("softens phrasing in measured tone without dropping content", () => {
    const direct = buildVerdict({ ...base, body: "broad" }, metrics, "direct");
    const soft = buildVerdict({ ...base, body: "broad" }, metrics, "measured");
    expect(soft.detail).not.toBe(direct.detail);
    // Same subject either way — the tone changes, the diagnosis doesn't.
    expect(soft.headline).toBe(direct.headline);
  });
});

describe("immutableNote", () => {
  it("says nothing when every fixed proportion is typical", () => {
    // The default fixture has perfectly level eyes, which reads as a neutral
    // canthal tilt and therefore below range — so give it a positive tilt.
    const typical = computeMetrics(makeFace({ tilt: 3 }));
    expect(immutableNote(typical.metrics)).toBeNull();
  });

  it("uses singular phrasing for a single flagged proportion", () => {
    const note = immutableNote(computeMetrics(makeFace({ tilt: -6 })).metrics);
    expect(note).toContain("sits outside");
    expect(note).not.toContain("sit outside");
  });

  it("tells the user to stop dwelling when one is out of range", () => {
    const skewed = computeMetrics(makeFace({ tilt: -6, asymmetry: 25 }));
    const note = immutableNote(skewed.metrics);
    expect(note).toBeTruthy();
    expect(note!.toLowerCase()).toContain("bone");
  });
});
