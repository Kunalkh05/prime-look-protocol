import { describe, expect, it } from "vitest";
import {
  BEARD,
  BODY,
  BROWS,
  FACE,
  HAIRLINE,
  HEIGHT,
  POSTURE,
  SKINCARE,
  TEETH,
  palette,
  protocol,
  styleNames,
  summaryLine,
} from "./recommendations";
import { classifyFaceShape } from "./faceAnalysis";
import { makeFace } from "./testFace";
import type { FaceShape, Profile, Undertone } from "../types";

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

const SHAPES: FaceShape[] = [
  "oval",
  "round",
  "square",
  "rectangle",
  "heart",
  "diamond",
  "triangle",
];

describe("content completeness", () => {
  it("covers every face shape with cut, beard, frame and brow guidance", () => {
    for (const shape of SHAPES) {
      const e = FACE[shape];
      expect(e.cut.good.length).toBeGreaterThan(0);
      expect(e.cut.avoid.length).toBeGreaterThan(0);
      expect(e.stylesMasc.length).toBeGreaterThan(0);
      expect(e.stylesFem.length).toBeGreaterThan(0);
      expect(e.frames.good.length).toBeGreaterThan(0);
      expect(e.frames.avoid.length).toBeGreaterThan(0);
      expect(e.beardShape).toBeTruthy();
      expect(e.browShape).toBeTruthy();
    }
  });

  it("covers every option in the newer pillars", () => {
    expect(Object.keys(HAIRLINE)).toHaveLength(6);
    expect(Object.keys(BROWS)).toHaveLength(5);
    expect(Object.keys(SKINCARE)).toHaveLength(5);
    expect(Object.keys(TEETH)).toHaveLength(5);
    expect(Object.keys(POSTURE)).toHaveLength(4);
    expect(Object.keys(BEARD)).toHaveLength(5);
    expect(Object.keys(BODY)).toHaveLength(4);
    expect(Object.keys(HEIGHT)).toHaveLength(3);
  });

  it("leaves no unclosed bold markers in the copy", () => {
    const strings: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") strings.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(FACE);
    walk(HAIRLINE);
    walk(BROWS);
    walk(SKINCARE);
    walk(TEETH);
    walk(POSTURE);

    for (const s of strings) {
      const open = (s.match(/<b>/g) ?? []).length;
      const close = (s.match(/<\/b>/g) ?? []).length;
      expect(open, s).toBe(close);
    }
  });
});

describe("palette", () => {
  it("returns a swatch for every colour name", () => {
    for (const tone of ["warm", "cool", "neutral"] as Undertone[]) {
      const p = palette("medium", tone);
      expect(p.hex).toHaveLength(p.colors.length);
      for (const hex of p.hex) expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("varies the contrast advice by skin depth", () => {
    const fair = palette("fair", "warm").contrast;
    const deep = palette("deep", "warm").contrast;
    expect(fair).not.toBe(deep);
  });
});

describe("protocol", () => {
  it("always includes SPF in the morning", () => {
    expect(protocol(base).morning.some((s) => s.includes("SPF"))).toBe(true);
  });

  it("skips the beard step for a clean-shaven profile", () => {
    const shaved = protocol({ ...base, beard: "cleanshave" });
    expect(shaved.evening.some((s) => s.includes("beard oil"))).toBe(false);
  });

  it("skips the beard step entirely on the feminine track", () => {
    const fem = protocol({ ...base, gender: "fem" });
    expect(fem.evening.some((s) => s.toLowerCase().includes("beard"))).toBe(false);
  });

  it("adapts cleanser advice to skin type", () => {
    const oily = protocol({ ...base, skinType: "oily" }).morning[0];
    const dry = protocol({ ...base, skinType: "dry" }).morning[0];
    expect(oily).not.toBe(dry);
  });

  it("softens exfoliation for sensitive skin", () => {
    const sensitive = protocol({ ...base, skinType: "sensitive" }).weekly.join(" ");
    expect(sensitive).toContain("once");
  });

  it("tells over-plucked brows to be left alone", () => {
    const weekly = protocol({ ...base, brows: "overplucked" }).weekly.join(" ");
    expect(weekly).toContain("Leave the brows alone");
  });

  it("adds scalp care when the head is shaved", () => {
    const evening = protocol({ ...base, hairline: "shaved" }).evening.join(" ");
    expect(evening).toContain("scalp");
  });

  it("adds retinol to the evening for an ageing concern", () => {
    const evening = protocol({ ...base, concern: "aging" }).evening.join(" ");
    expect(evening).toContain("retinol");
  });
});

describe("summaryLine", () => {
  it("mentions the beard on the masculine track", () => {
    expect(summaryLine(base)).toContain("beard");
  });

  it("omits the beard on the feminine track", () => {
    expect(summaryLine({ ...base, gender: "fem" })).not.toContain("beard");
  });

  it("reads a rectangle face as 'long'", () => {
    expect(summaryLine({ ...base, face: "rectangle" })).toContain("long-faced");
  });
});

describe("styleNames", () => {
  it("picks a different vocabulary per track", () => {
    expect(styleNames("oval", "masc")).not.toEqual(styleNames("oval", "fem"));
  });

  it("blends both for the neutral track", () => {
    expect(styleNames("oval", "neutral")).toHaveLength(4);
  });
});

describe("classifyFaceShape", () => {
  it("returns a known shape with a bounded confidence", () => {
    const { shape, confidence } = classifyFaceShape(makeFace());
    expect(SHAPES).toContain(shape);
    expect(confidence).toBeGreaterThanOrEqual(0.45);
    expect(confidence).toBeLessThanOrEqual(0.9);
  });

  it("calls a long face with a full forehead and jaw a rectangle", () => {
    const long = makeFace({ jawHalfWidth: 65 });
    long[10] = { x: 200, y: -60 }; // stretch the face upward
    long[21] = { x: 132, y: 80 }; // forehead nearly as wide as the cheeks
    long[251] = { x: 268, y: 80 };
    expect(classifyFaceShape(long).shape).toBe("rectangle");
  });

  it("calls a long face with a narrow forehead and jaw a diamond", () => {
    // Length alone is not enough — the cheekbones being the widest point is
    // what separates a diamond from a rectangle.
    const narrow = makeFace({ jawHalfWidth: 55 });
    narrow[10] = { x: 200, y: -20 };
    expect(classifyFaceShape(narrow).shape).toBe("diamond");
  });

  it("calls a jaw-dominant face a triangle", () => {
    const wideJaw = makeFace({ jawHalfWidth: 90 });
    wideJaw[21] = { x: 165, y: 80 }; // narrow the temples
    wideJaw[251] = { x: 235, y: 80 };
    expect(classifyFaceShape(wideJaw).shape).toBe("triangle");
  });
});
