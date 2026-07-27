import type { FaceShape } from "../types";
import type { CutKind, FrameKind } from "../lib/styleMap";

/**
 * Schematic SVG diagrams. The results were entirely text before this, which
 * left the app telling people to "screenshot the styles for your barber"
 * without ever showing a style.
 *
 * These are deliberately diagrammatic rather than illustrative — they show the
 * silhouette and proportion being described, which is the part that has to
 * survive being explained across a barber's chair.
 */

const FACE_PATHS: Record<FaceShape, string> = {
  oval: "M50,8 C72,8 82,28 82,55 C82,90 68,122 50,122 C32,122 18,90 18,55 C18,28 28,8 50,8 Z",
  round: "M50,10 C74,10 86,32 86,62 C86,95 72,120 50,120 C28,120 14,95 14,62 C14,32 26,10 50,10 Z",
  square:
    "M50,8 C74,8 84,20 84,44 L84,80 C84,104 72,120 50,120 C28,120 16,104 16,80 L16,44 C16,20 26,8 50,8 Z",
  rectangle:
    "M50,6 C74,6 84,18 84,42 L84,92 C84,112 70,124 50,124 C30,124 16,112 16,92 L16,42 C16,18 26,6 50,6 Z",
  heart: "M50,8 C78,8 88,26 86,52 C84,80 66,122 50,122 C34,122 16,80 14,52 C12,26 22,8 50,8 Z",
  diamond:
    "M50,6 C62,6 70,20 74,40 C82,50 86,56 82,64 C76,92 62,124 50,124 C38,124 24,92 18,64 C14,56 18,50 26,40 C30,20 38,6 50,6 Z",
  triangle:
    "M50,10 C66,10 74,24 76,44 C80,64 84,88 82,98 C80,112 68,122 50,122 C32,122 20,112 18,98 C16,88 20,64 24,44 C26,24 34,10 50,10 Z",
};

export function FaceOutline({ shape, size = 96 }: { shape: FaceShape; size?: number }) {
  return (
    <svg
      className="dia"
      viewBox="0 0 100 130"
      width={size}
      height={(size * 130) / 100}
      role="img"
      aria-label={`${shape} face shape diagram`}
    >
      <path d={FACE_PATHS[shape]} className="dia-fill" />
      <path d={FACE_PATHS[shape]} className="dia-line" />
    </svg>
  );
}

/** The three vertical thirds drawn over a neutral face outline. */
export function ThirdsDiagram({
  thirds,
  size = 110,
}: {
  thirds: { upper: number; middle: number; lower: number };
  size?: number;
}) {
  const top = 8;
  const bottom = 122;
  const span = bottom - top;
  const y1 = top + (thirds.upper / 100) * span;
  const y2 = y1 + (thirds.middle / 100) * span;
  const pct = (n: number) => `${Math.round(n)}%`;

  return (
    <svg
      className="dia"
      viewBox="0 0 100 130"
      width={size}
      height={(size * 130) / 100}
      role="img"
      aria-label="Facial thirds diagram"
    >
      <path d={FACE_PATHS.oval} className="dia-fill" />
      <path d={FACE_PATHS.oval} className="dia-line" />
      <line x1="14" y1={y1} x2="86" y2={y1} className="dia-rule" />
      <line x1="14" y1={y2} x2="86" y2={y2} className="dia-rule" />
      <text x="90" y={top + (y1 - top) / 2 + 3} className="dia-label">
        {pct(thirds.upper)}
      </text>
      <text x="90" y={y1 + (y2 - y1) / 2 + 3} className="dia-label">
        {pct(thirds.middle)}
      </text>
      <text x="90" y={y2 + (bottom - y2) / 2 + 3} className="dia-label">
        {pct(thirds.lower)}
      </text>
    </svg>
  );
}

function FrameLenses({ kind }: { kind: FrameKind }) {
  const stroke = { className: "dia-line", fill: "none" };
  switch (kind) {
    case "round":
      return (
        <>
          <circle cx="28" cy="30" r="16" {...stroke} />
          <circle cx="72" cy="30" r="16" {...stroke} />
        </>
      );
    case "oval":
      return (
        <>
          <ellipse cx="28" cy="30" rx="17" ry="12" {...stroke} />
          <ellipse cx="72" cy="30" rx="17" ry="12" {...stroke} />
        </>
      );
    case "square":
      return (
        <>
          <rect x="11" y="17" width="34" height="27" rx="3" {...stroke} />
          <rect x="55" y="17" width="34" height="27" rx="3" {...stroke} />
        </>
      );
    case "rectangle":
      return (
        <>
          <rect x="10" y="20" width="36" height="20" rx="4" {...stroke} />
          <rect x="54" y="20" width="36" height="20" rx="4" {...stroke} />
        </>
      );
    case "aviator":
      return (
        <>
          <path d="M11,20 L45,20 C45,38 38,45 28,45 C17,45 11,34 11,20 Z" {...stroke} />
          <path d="M55,20 L89,20 C89,34 83,45 72,45 C62,45 55,38 55,20 Z" {...stroke} />
        </>
      );
    case "cateye":
      return (
        <>
          <path d="M10,26 C16,17 40,15 46,22 C46,36 36,44 26,44 C15,44 10,36 10,26 Z" {...stroke} />
          <path d="M90,26 C84,17 60,15 54,22 C54,36 64,44 74,44 C85,44 90,36 90,26 Z" {...stroke} />
        </>
      );
    case "browline":
      return (
        <>
          <path d="M10,20 L46,20 L46,26 C46,38 38,44 28,44 C17,44 10,36 10,26 Z" {...stroke} />
          <path d="M54,20 L90,20 L90,26 C90,36 83,44 72,44 C62,44 54,38 54,26 Z" {...stroke} />
          <path d="M10,20 L46,20" className="dia-brow" />
          <path d="M54,20 L90,20" className="dia-brow" />
        </>
      );
  }
}

export function FrameIcon({ kind, label }: { kind: FrameKind; label: string }) {
  return (
    <figure className="icon-tile">
      <svg viewBox="0 0 100 60" className="dia" role="img" aria-label={`${label} frame shape`}>
        <FrameLenses kind={kind} />
        <path d="M46,26 C48,23 52,23 54,26" className="dia-line" fill="none" />
        <path d="M10,24 L2,20" className="dia-line" />
        <path d="M90,24 L98,20" className="dia-line" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** Hair mass drawn over a shared head-and-shoulders base. */
const HAIR_PATHS: Record<CutKind, string> = {
  buzz: "M30,44 C30,24 44,15 50,15 C56,15 70,24 70,44 C70,34 62,26 50,26 C38,26 30,34 30,44 Z",
  crop: "M28,46 C28,22 42,12 50,12 C58,12 72,22 72,46 C72,30 64,22 50,22 C36,22 28,30 28,46 Z",
  quiff:
    "M28,44 C28,22 40,8 52,10 C62,12 60,16 66,18 C74,20 72,34 72,44 C72,28 62,20 50,20 C38,20 28,28 28,44 Z",
  pompadour:
    "M27,44 C27,18 38,2 54,6 C68,10 66,14 70,18 C76,24 73,36 73,46 C73,26 62,18 50,18 C37,18 27,26 27,44 Z",
  fringe:
    "M27,48 C27,22 41,12 50,12 C59,12 73,22 73,48 C73,32 68,26 60,30 C52,34 40,30 34,26 C29,23 27,34 27,48 Z",
  sidepart:
    "M28,46 C28,22 42,12 50,12 C60,12 72,20 72,46 C72,30 66,22 56,22 C46,22 38,28 34,24 C31,21 28,32 28,46 Z",
  fade: "M30,44 C30,20 43,12 50,12 C57,12 70,20 70,44 C70,26 62,20 50,20 C38,20 30,26 30,44 Z",
  layers:
    "M26,70 C22,40 38,10 50,10 C62,10 78,40 74,70 C72,50 70,30 50,28 C30,30 28,50 26,70 Z",
  bob: "M26,62 C24,34 38,12 50,12 C62,12 76,34 74,62 C72,44 66,26 50,26 C34,26 28,44 26,62 Z",
  bangs:
    "M26,64 C24,34 38,12 50,12 C62,12 76,34 74,64 C72,44 68,28 50,28 C42,28 34,32 30,30 C26,28 27,48 26,64 Z",
  volume:
    "M26,46 C24,16 38,2 50,2 C62,2 76,16 74,46 C74,26 64,18 50,18 C36,18 26,26 26,46 Z",
};

export function CutIcon({ kind, label }: { kind: CutKind; label: string }) {
  return (
    <figure className="icon-tile">
      <svg viewBox="0 0 100 100" className="dia" role="img" aria-label={`${label} silhouette`}>
        {/* head + shoulders base */}
        <path
          d="M50,16 C63,16 70,27 70,44 C70,60 62,72 50,72 C38,72 30,60 30,44 C30,27 37,16 50,16 Z"
          className="dia-fill"
        />
        <path d="M32,74 C24,80 18,88 16,98 L84,98 C82,88 76,80 68,74" className="dia-fill" />
        <path d={HAIR_PATHS[kind]} className="dia-hair" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

