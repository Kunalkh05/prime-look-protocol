import type { FaceShape } from "../types";

/**
 * Mapping from the human-readable style names in the recommendation copy onto
 * the diagram set. Kept out of the component file so the SVG module exports
 * nothing but components (which is what React Fast Refresh wants).
 */

export type FrameKind =
  | "rectangle"
  | "round"
  | "square"
  | "aviator"
  | "cateye"
  | "browline"
  | "oval";

export type CutKind =
  | "buzz"
  | "crop"
  | "quiff"
  | "pompadour"
  | "fringe"
  | "sidepart"
  | "fade"
  | "layers"
  | "bob"
  | "bangs"
  | "volume";

/** Pick a silhouette for a named cut like "Textured crop" or "Curtain bangs". */
export function cutKindFor(name: string): CutKind {
  const n = name.toLowerCase();
  if (n.includes("buzz")) return "buzz";
  if (n.includes("pompadour")) return "pompadour";
  if (n.includes("quiff") || n.includes("faux hawk")) return "quiff";
  if (n.includes("bang")) return "bangs";
  if (n.includes("fringe")) return "fringe";
  if (n.includes("bob") || n.includes("lob")) return "bob";
  if (n.includes("layer") || n.includes("shag") || n.includes("wave")) return "layers";
  if (n.includes("part")) return "sidepart";
  if (n.includes("crown") || n.includes("ponytail") || n.includes("pixie")) return "volume";
  if (n.includes("fade") || n.includes("taper")) return "fade";
  return "crop";
}

/** Frame diagrams matching the eyewear copy for a face shape. */
export function frameKindsFor(shape: FaceShape): { kind: FrameKind; label: string }[] {
  switch (shape) {
    case "round":
      return [
        { kind: "rectangle", label: "Rectangular" },
        { kind: "square", label: "Square" },
        { kind: "browline", label: "Browline" },
      ];
    case "square":
      return [
        { kind: "round", label: "Round" },
        { kind: "oval", label: "Oval" },
        { kind: "aviator", label: "Aviator" },
      ];
    case "rectangle":
      return [
        { kind: "round", label: "Round, deep" },
        { kind: "browline", label: "Browline" },
        { kind: "square", label: "Tall square" },
      ];
    case "heart":
      return [
        { kind: "oval", label: "Oval" },
        { kind: "round", label: "Rimless round" },
        { kind: "aviator", label: "Aviator" },
      ];
    case "diamond":
      return [
        { kind: "cateye", label: "Cat-eye" },
        { kind: "oval", label: "Oval" },
        { kind: "browline", label: "Browline" },
      ];
    case "triangle":
      return [
        { kind: "browline", label: "Browline" },
        { kind: "cateye", label: "Cat-eye" },
        { kind: "rectangle", label: "Rectangular" },
      ];
    default:
      return [
        { kind: "rectangle", label: "Rectangular" },
        { kind: "round", label: "Round" },
        { kind: "aviator", label: "Aviator" },
      ];
  }
}
