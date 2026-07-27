import { describe, expect, it } from "vitest";
import { buildPlan } from "./priority";
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
  body: "average",
  height: "mid",
  style: "clean",
};

const { metrics } = computeMetrics(makeFace());

describe("buildPlan", () => {
  it("returns exactly three headline actions", () => {
    expect(buildPlan(base, metrics).headline).toHaveLength(3);
  });

  it("sorts headline actions by impact-weighted score, descending", () => {
    const { headline } = buildPlan(base, metrics);
    const score = (a: (typeof headline)[number]) => a.impact * 2 - a.effort;
    expect(score(headline[0])).toBeGreaterThanOrEqual(score(headline[1]));
    expect(score(headline[1])).toBeGreaterThanOrEqual(score(headline[2]));
  });

  it("puts every action in exactly one horizon bucket", () => {
    const plan = buildPlan(base, metrics);
    const bucketed = [...plan.today, ...plan.weeks, ...plan.months];
    const titles = bucketed.map((a) => a.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const a of plan.today) expect(a.horizon).toBe("today");
    for (const a of plan.weeks) expect(a.horizon).toBe("weeks");
    for (const a of plan.months) expect(a.horizon).toBe("months");
  });

  it("always recommends daily SPF", () => {
    const plan = buildPlan(base, metrics);
    const all = [...plan.today, ...plan.weeks, ...plan.months];
    expect(all.some((a) => a.title.includes("SPF"))).toBe(true);
  });

  it("adds posture work only when posture needs it", () => {
    const has = (p: Profile) => {
      const plan = buildPlan(p, metrics);
      return [...plan.today, ...plan.weeks, ...plan.months].some((a) => a.pillar === "Posture");
    };
    expect(has({ ...base, posture: "forward-head" })).toBe(true);
    expect(has({ ...base, posture: "rounded-shoulders" })).toBe(true);
    expect(has({ ...base, posture: "good" })).toBe(false);
  });

  it("switches hair advice when the hairline is receding", () => {
    const receding = buildPlan({ ...base, hairline: "receding" }, metrics);
    const all = [...receding.today, ...receding.weeks, ...receding.months];
    expect(all.some((a) => a.title === "Cut shorter and go matte")).toBe(true);
    expect(all.some((a) => a.title === "Get on a barber cycle")).toBe(false);
  });

  it("recommends brow recovery rather than tidying when over-plucked", () => {
    const plan = buildPlan({ ...base, brows: "overplucked" }, metrics);
    const all = [...plan.today, ...plan.weeks, ...plan.months];
    expect(all.some((a) => a.title.includes("recover"))).toBe(true);
    expect(all.some((a) => a.title === "Tidy your brows")).toBe(false);
  });

  it("raises a measurement-driven action when a proportion is out of range", () => {
    const skewed = computeMetrics(makeFace({ asymmetry: 30 }));
    const plan = buildPlan(base, skewed.metrics);
    const all = [...plan.today, ...plan.weeks, ...plan.months];
    expect(all.some((a) => a.pillar === "Proportion")).toBe(true);
  });

  it("works with no photo analysis at all", () => {
    const plan = buildPlan(base, []);
    expect(plan.headline).toHaveLength(3);
    expect(plan.today.length).toBeGreaterThan(0);
  });

  it("gives every action a reason", () => {
    const plan = buildPlan(base, metrics);
    for (const a of [...plan.today, ...plan.weeks, ...plan.months]) {
      expect(a.why.length).toBeGreaterThan(20);
      expect(a.effort).toBeGreaterThanOrEqual(1);
      expect(a.impact).toBeLessThanOrEqual(3);
    }
  });
});
