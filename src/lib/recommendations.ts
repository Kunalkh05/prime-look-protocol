import type {
  Profile,
  FaceShape,
  HairType,
  Density,
  Beard,
  Depth,
  Undertone,
  Body,
  Height,
  Style,
  Gender,
  AgeBand,
  SkinType,
  SkinConcern,
  Hairline,
  Brows,
  Teeth,
  Posture,
} from "../types";

export interface CutBlock {
  title: string;
  good: string[];
  avoid: string[];
}

export interface FrameBlock {
  good: string[];
  avoid: string[];
}

interface FaceEntry {
  cut: CutBlock;
  /** Named cuts, split only because barbershop vocabulary differs. */
  stylesMasc: string[];
  stylesFem: string[];
  beardShape: string;
  /** Eyewear works off the same shape logic as the haircut. */
  frames: FrameBlock;
  browShape: string;
}

export const FACE: Record<FaceShape, FaceEntry> = {
  oval: {
    cut: {
      title: "The most versatile shape",
      good: [
        "Almost anything works — <b>textured crop</b>, <b>side part</b>, <b>quiff</b> or <b>pompadour</b>",
        "Keep the sides tighter than the top for a clean, modern balance",
      ],
      avoid: ["Heavy full fringes that hide your balanced proportions"],
    },
    stylesMasc: ["Textured crop", "Classic side part", "Quiff", "Mid fade"],
    stylesFem: ["Long layers", "Blunt lob", "Curtain bangs", "Shoulder shag"],
    beardShape: "Most beard styles suit you — match the length to how full your growth is.",
    frames: {
      good: ["<b>Almost any frame works</b> — square, round, aviator or wayfarer", "Match the frame width to your cheekbone width and you're done"],
      avoid: ["Frames so oversized they cover your balanced proportions"],
    },
    browShape: "A soft, gently angled arch — you don't need to correct for anything.",
  },
  round: {
    cut: {
      title: "Add height and angles",
      good: [
        "<b>Short sides, longer top</b> — pompadour, quiff or faux hawk stretch the face vertically",
        "Angular fringes and defined edges add structure",
      ],
      avoid: [
        "Rounded bowl cuts or heavy volume on the sides",
        "Equal length all around — it makes the face look fuller",
      ],
    },
    stylesMasc: ["Pompadour", "High fade + textured top", "Faux hawk", "Angular fringe"],
    stylesFem: ["High ponytail", "Long layers with height at the crown", "Side-swept bangs", "Asymmetric lob"],
    beardShape:
      "Keep the cheeks tight and let the <b>chin grow slightly longer</b> — it lengthens a round face.",
    frames: {
      good: ["<b>Rectangular and square frames</b> add the angles your face doesn't have", "Angular browlines draw the eye upward"],
      avoid: ["Round or small circular frames — they echo the face shape", "Rimless ovals that add no structure"],
    },
    browShape: "A defined, higher arch with a clean angle — it lifts and lengthens a round face.",
  },
  square: {
    cut: {
      title: "Lean into that strong jaw",
      good: [
        "<b>Buzz, crew cut, textured crop</b> or a short quiff all frame a square face well",
        "Texture on top softens the angles if you want a less severe look",
      ],
      avoid: ["Not much to avoid — you can go bold"],
    },
    stylesMasc: ["Buzz cut", "Crew cut", "Textured crop", "Short quiff"],
    stylesFem: ["Soft waves", "Side part with movement", "Textured bob", "Long layered cut"],
    beardShape: "A <b>defined, boxed beard</b> follows your jaw beautifully — keep the lines sharp.",
    frames: {
      good: ["<b>Round and oval frames</b> soften a strong jaw", "Thin metal frames and aviators balance the angles"],
      avoid: ["Sharp rectangular frames that double down on the squareness", "Heavy, boxy acetate"],
    },
    browShape: "A softly rounded brow — a hard angular arch competes with your jaw.",
  },
  rectangle: {
    cut: {
      title: "Add width, not height",
      good: [
        "<b>Medium length with a side-swept or forward fringe</b> to shorten the face",
        "Fuller sides help balance the length",
      ],
      avoid: [
        "Tall pompadours or spikes — they make a long face look longer",
        "Very short sides with big top volume",
      ],
    },
    stylesMasc: ["Textured fringe", "Medium side part", "Caesar cut", "Low fade with fuller sides"],
    stylesFem: ["Blunt bangs", "Chin-length bob", "Waves with side volume", "Curtain bangs"],
    beardShape:
      "Grow the <b>sides fuller and keep the chin shorter</b> — width balances a long face.",
    frames: {
      good: ["<b>Tall, deep frames</b> break up facial length", "Oversized and round styles add width", "A strong browline bar shortens the face"],
      avoid: ["Small, narrow or shallow frames — they exaggerate the length"],
    },
    browShape: "A flatter, more horizontal brow — it visually widens and shortens a long face.",
  },
  heart: {
    cut: {
      title: "Balance a wider forehead",
      good: [
        "<b>Medium length with a side-swept fringe</b> to soften the forehead",
        "A little length falling forward works in your favour",
      ],
      avoid: [
        "Slicked-back styles that expose the full forehead",
        "Very short sides with tall top volume",
      ],
    },
    stylesMasc: ["Side-swept fringe", "Textured medium length", "Messy crop", "Low fade"],
    stylesFem: ["Side-swept bangs", "Chin-length layers", "Deep side part", "Textured lob"],
    beardShape: "A <b>fuller beard at the chin/jaw</b> adds welcome width to a narrower chin.",
    frames: {
      good: ["<b>Bottom-heavy or rimless frames</b> shift weight down toward the chin", "Light colours and thin rims up top"],
      avoid: ["Heavy top bars and decorated temples — they widen an already wide forehead", "Oversized cat-eye shapes"],
    },
    browShape: "A soft, rounded brow that isn't too long — a heavy arch widens the forehead further.",
  },
  diamond: {
    cut: {
      title: "Add width at the forehead",
      good: [
        "<b>Fringes and textured tops</b> that add volume up top",
        "A little length at the sides softens prominent cheekbones",
      ],
      avoid: [
        "Tight high fades that draw attention to wide cheekbones",
        "Slicked-flat styles with no top volume",
      ],
    },
    stylesMasc: ["Textured fringe", "Medium crop with volume", "Side part", "Low taper"],
    stylesFem: ["Chin-length bob", "Curtain bangs", "Side-swept fringe", "Volume at the crown"],
    beardShape: "A <b>fuller beard</b> broadens the jaw and balances the cheekbones.",
    frames: {
      good: ["<b>Cat-eye, oval and rimless frames</b> soften prominent cheekbones", "Detail on the browline widens the forehead"],
      avoid: ["Narrow frames that make cheekbones look wider still", "Boxy, sharp-cornered styles"],
    },
    browShape: "A curved brow with a soft arch — it widens the upper face against sharp cheekbones.",
  },
  triangle: {
    cut: {
      title: "Build volume up top",
      good: [
        "<b>Volume and length on top</b> — quiff, pompadour or a fuller textured crop",
        "Balances a wider jaw by adding weight above",
      ],
      avoid: ["Very tight sides with a flat top — it emphasises the jaw"],
    },
    stylesMasc: ["Quiff", "Pompadour", "Full textured crop", "Volume with a low fade"],
    stylesFem: ["Volume at the crown", "Layered pixie", "Shoulder-length with top volume", "Side-swept fringe"],
    beardShape: "Keep the beard <b>short and neat</b> so it doesn't add more width to the jaw.",
    frames: {
      good: ["<b>Top-heavy frames</b> with a strong browline balance a wide jaw", "Cat-eye and browline (clubmaster) shapes work well"],
      avoid: ["Bottom-heavy or very wide frames that add weight low on the face"],
    },
    browShape: "A fuller, slightly extended brow — it adds visual width up top to offset the jaw.",
  },
};

export const HAIR: Record<HairType, string> = {
  straight:
    "Straight hair holds sharp, defined shapes — use a matte clay or pomade. Great for side parts and slick styles.",
  wavy: "Work with the wave — sea-salt spray plus a light cream gives easy texture. Medium lengths look effortless on you.",
  curly:
    "Embrace the curl — a curl cream keeps it defined and frizz-free. Tight sides with curly volume on top is a strong look.",
  coily:
    "Coily hair is made for sharp lineups — <b>high-top, twists, or a fade with defined edges</b>. Moisturise daily to keep it healthy.",
};

export const DENSITY: Record<Density, string> = {
  thick: "With thick hair, ask for it to be <b>thinned / texturised</b> so styling isn't a fight.",
  medium: "Medium density gives you the most options — style freely.",
  thin: "Fine hair looks fullest <b>shorter and matte</b> — skip shiny products that clump strands and reveal scalp.",
  receding:
    "Own it early: a <b>short crop, buzz or clean shave</b> looks far sharper than a comb-over. A tidy beard also draws the eye downward.",
};

interface HairlineEntry {
  title: string;
  notes: string[];
}

/**
 * Hairline staging changes the advice more than almost any other input, and the
 * decisions are time-sensitive. Kept strictly to styling and to "go ask a
 * professional" — nothing here is medical guidance.
 */
export const HAIRLINE: Record<Hairline, HairlineEntry> = {
  full: {
    title: "Full hairline",
    notes: [
      "Nothing to work around — pick the cut that suits your face shape and keep it fresh",
      "Avoid constant tight styles that pull at the hairline over years",
    ],
  },
  mature: {
    title: "Mature hairline",
    notes: [
      "A slightly higher, straighter hairline is <b>normal adult development</b>, not loss — most men settle here and stop",
      "<b>Textured fringes forward</b> soften the corners if they bother you",
      "Worth photographing every 6 months so you can tell a settled hairline from a moving one",
    ],
  },
  receding: {
    title: "Receding at the temples",
    notes: [
      "<b>Shorter is stronger.</b> A crop, buzz or textured French crop reads as a deliberate choice; a comb-over never does",
      "A <b>forward-styled fringe</b> is the one long style that still works",
      "This is the stage where options are widest — if you're considering doing something about it, a dermatologist visit now beats one in five years",
      "A defined beard shifts the visual centre of gravity downward",
    ],
  },
  "thinning-crown": {
    title: "Thinning at the crown",
    notes: [
      "Keep <b>overall length short and even</b> — long hair around a thin crown highlights the contrast",
      "Matte products only; anything shiny reveals scalp instantly",
      "Overhead light is the enemy — it's usually less visible than your bathroom mirror suggests",
    ],
  },
  diffuse: {
    title: "Diffuse thinning",
    notes: [
      "<b>Short, matte and textured</b> creates the most density illusion",
      "Volumising shampoo and blow-drying at the root genuinely adds apparent thickness",
      "Avoid heavy conditioners on the scalp — they weigh fine hair flat",
    ],
  },
  shaved: {
    title: "Shaved / bald",
    notes: [
      "<b>Commit fully</b> — a clean shave or a zero guard reads far better than clinging to a fringe",
      "Scalp needs the same care as your face: moisturiser and <b>SPF every single day</b>",
      "A <b>beard is your biggest lever</b> now — it restores the frame the hair used to give",
      "Strong brows matter more than ever; they're the main line left on the upper face",
    ],
  },
};

interface BeardEntry {
  title: string;
  good: string[];
  avoid?: string[];
}

export const BEARD: Record<Beard, BeardEntry> = {
  full: {
    title: "Full beard territory",
    good: [
      "A <b>full or boxed beard</b> is on the table — keep the neckline (two fingers above the Adam's apple) and cheek lines crisp",
      "Oil it daily so it reads intentional, not wild",
    ],
  },
  medium: {
    title: "Short beard is your sweet spot",
    good: [
      "A <b>short boxed beard or heavy stubble</b> reads as full and deliberate",
      "Let it grow ~2–3 weeks, then define the edges",
    ],
  },
  patchy: {
    title: "Play to your density",
    good: [
      "<b>Short stubble</b> is the great equaliser — patches disappear at 3–5mm",
      "A <b>goatee or chin strap</b> concentrates the hair you do have",
    ],
    avoid: ["Trying to grow it long — patches only get more obvious"],
  },
  light: {
    title: "Clean is king",
    good: [
      "<b>Clean-shaven or very light stubble</b> looks intentional and sharp",
      "Groom your eyebrows and edges instead — that's where a light-beard face gets definition",
    ],
    avoid: ["Forcing a full beard it isn't ready for — it usually fills in through your 20s"],
  },
  cleanshave: {
    title: "The clean-shaven playbook",
    good: [
      "Shave <b>with the grain first</b>, then across — never dry",
      "Moisturise after every shave and add a light SPF — a clean face shows sun damage fastest",
    ],
  },
};

interface BrowEntry {
  title: string;
  notes: string[];
}

/**
 * Highest return per minute spent of anything in this app, and the most
 * commonly skipped.
 */
export const BROWS: Record<Brows, BrowEntry> = {
  thick: {
    title: "Full brows — just tidy them",
    notes: [
      "<b>Do not thin them.</b> Full brows frame the eyes and read as youthful; trim length, don't reduce density",
      "Brush upward and <b>trim only the hairs that stick out past the brow line</b>",
      "Clean the strays between and below — never above the natural line",
    ],
  },
  average: {
    title: "A clean-up is all you need",
    notes: [
      "Remove strays <b>between the brows and below the natural line</b> — that's 90% of the effect",
      "Find the start, arch and end: inner corner of the eye, two-thirds out, and the far corner",
      "Ten minutes every two weeks keeps it invisible-but-obvious",
    ],
  },
  sparse: {
    title: "Build them up",
    notes: [
      "<b>Stop plucking entirely for 8–12 weeks</b> — most sparseness is recoverable overplucking",
      "A <b>brow pencil or tinted gel</b> in short, hair-like strokes fills gaps convincingly if it's applied lightly",
      "Brush them into shape daily with a spoolie and a little clear gel",
    ],
  },
  unibrow: {
    title: "Clear the middle",
    notes: [
      "<b>Clear the space between the brows</b> — the gap should be roughly the width of one eye's inner corner to the other",
      "Don't overshoot into the heads of the brows; a hard gap looks worse than the unibrow did",
      "Trimming scissors or careful tweezing beats waxing for control",
    ],
  },
  overplucked: {
    title: "Grow them back",
    notes: [
      "<b>Put the tweezers away for three months.</b> Nothing else fixes this",
      "Fill lightly in the meantime — powder reads more natural than pencil on sparse brows",
      "When they're back, shape from below only, and go to a professional for the first shape",
    ],
  },
};

export interface PaletteResult {
  colors: string[];
  hex: string[];
  metal: string;
  contrast: string;
}

const PALETTE_BASE: Record<Undertone, Omit<PaletteResult, "contrast">> = {
  warm: {
    colors: ["Olive", "Mustard", "Warm brown", "Cream", "Rust", "Terracotta", "Khaki"],
    hex: ["#6B6B3A", "#C99A2E", "#6E4B32", "#EFE6D2", "#A6512E", "#C56A45", "#8A7A50"],
    metal: "Gold / brass jewellery and warm-toned watches",
  },
  cool: {
    colors: ["Navy", "Emerald", "Cool grey", "True white", "Burgundy", "Ice blue", "Charcoal"],
    hex: ["#1F3355", "#1E6F54", "#8A8F96", "#F7F7F5", "#5E2233", "#A9C4D6", "#2B2F33"],
    metal: "Silver / platinum jewellery and cool-toned watches",
  },
  neutral: {
    colors: ["Navy", "Olive", "White", "Grey", "Burgundy", "Camel", "Forest green"],
    hex: ["#25324A", "#6B6B3A", "#F5F3EE", "#8C8C8C", "#5E2233", "#B08D57", "#2E4636"],
    metal: "Both gold and silver work — pick by outfit",
  },
};

export function palette(depth: Depth, tone: Undertone): PaletteResult {
  const base = PALETTE_BASE[tone] ?? PALETTE_BASE.neutral;
  let contrast: string;
  if (depth === "fair")
    contrast =
      "Fair skin washes out in very pale colours — reach for <b>mid and deep tones</b> to create contrast. A little colour near the face lifts you.";
  else if (depth === "deep")
    contrast =
      "Deep skin makes <b>bright and light colours pop</b> — white, jewel tones and pastels look excellent against you. Don't shy from bold.";
  else
    contrast =
      "Medium skin is versatile — you carry both bright and muted colours. Earthy mid-tones are a reliable anchor.";
  return { ...base, contrast };
}

interface SkinEntry {
  title: string;
  cleanser: string;
  moisturiser: string;
  notes: string[];
}

/**
 * Skin type drives a routine far more than undertone does — undertone is a
 * wardrobe input, this is the skincare one.
 */
export const SKINCARE: Record<SkinType, SkinEntry> = {
  oily: {
    title: "Oily skin",
    cleanser: "a <b>gel or foaming cleanser</b>, morning and night",
    moisturiser: "a <b>light gel moisturiser</b> — skipping it makes oil worse, not better",
    notes: [
      "<b>Do not over-wash.</b> Stripping oil makes your skin produce more of it — twice a day is the ceiling",
      "Look for <b>niacinamide</b> or <b>salicylic acid</b>; both regulate oil without stripping",
      "Choose <b>oil-free, non-comedogenic</b> SPF — the wrong sunscreen is the usual cause of 'sunscreen breaks me out'",
    ],
  },
  dry: {
    title: "Dry skin",
    cleanser: "a <b>cream or milk cleanser</b> — at night only, water in the morning",
    moisturiser: "a <b>rich cream</b>, applied to slightly damp skin so it seals water in",
    notes: [
      "<b>Hyaluronic acid on damp skin, cream on top</b> — the order matters more than the products do",
      "Avoid alcohol-heavy toners and long hot showers; both strip the barrier",
      "Flaking under a beard is common — beard oil doubles as skin oil here",
    ],
  },
  combo: {
    title: "Combination skin",
    cleanser: "a <b>gentle gel cleanser</b>, morning and night",
    moisturiser: "a <b>light lotion</b> all over, with extra on the dry patches only",
    notes: [
      "Treat the zones differently: <b>oil control on the T-zone, richer care on the cheeks</b>",
      "One product for the whole face rarely works — that's normal, not a failure",
      "Exfoliate the T-zone more often than the cheeks",
    ],
  },
  normal: {
    title: "Balanced skin",
    cleanser: "a <b>gentle cleanser</b>, morning and night",
    moisturiser: "a <b>standard lotion</b> — keep it simple",
    notes: [
      "You have the easiest starting point — <b>consistency beats complexity</b>",
      "Cleanse, moisturise, SPF. Add nothing else until you have a specific reason to",
      "Don't fix what isn't broken by piling on actives",
    ],
  },
  sensitive: {
    title: "Sensitive skin",
    cleanser: "a <b>fragrance-free, non-foaming cleanser</b>",
    moisturiser: "a <b>barrier cream</b> with ceramides",
    notes: [
      "<b>Fragrance-free everything.</b> It's the single most common irritant in skincare",
      "<b>Patch test</b> on your jaw for three days before anything goes on your whole face",
      "Introduce one new product at a time, two weeks apart, or you'll never know what reacted",
      "<b>Mineral (zinc) SPF</b> usually sits better than chemical filters",
    ],
  },
};

export const CONCERN: Record<SkinConcern, string | null> = {
  acne: "For breakouts: <b>salicylic acid</b> or <b>benzoyl peroxide</b>, used consistently and only on affected areas. Change your pillowcase twice a week, and stop touching your face — that alone moves the needle. Persistent or scarring acne is worth a dermatologist rather than another product.",
  texture:
    "For texture and pores: a <b>gentle chemical exfoliant</b> (AHA/BHA) 2–3× a week does more than any scrub. Physical scrubs with grit cause micro-damage — skip them.",
  pigment:
    "For dark spots and uneven tone: <b>vitamin C in the morning, SPF religiously</b>. Pigmentation without daily sunscreen is a losing battle — the SPF matters more than the serum.",
  aging:
    "For fine lines: <b>retinol at night</b>, starting twice a week and building up slowly. Expect 12 weeks before you see anything. SPF in the morning is non-negotiable alongside it.",
  redness:
    "For redness: <b>azelaic acid</b> or <b>centella</b>, and cut the obvious triggers (very hot water, harsh scrubs, alcohol-based products). Persistent flushing is worth getting looked at.",
  none: null,
};

interface TeethEntry {
  title: string;
  notes: string[];
}

export const TEETH: Record<Teeth, TeethEntry> = {
  "straight-white": {
    title: "Maintain what you've got",
    notes: [
      "Protect it: <b>rinse after coffee, tea, red wine and cola</b> rather than brushing straight after (enamel is soft for ~30 min)",
      "Cleaning every 6 months keeps the baseline",
    ],
  },
  "straight-stained": {
    title: "Whitening is your highest-return move",
    notes: [
      "A <b>professional clean removes surface stain</b> first — many people need nothing more than this",
      "<b>Whitening strips</b> are the cost-effective at-home option; results take 2–3 weeks",
      "Rinse with water after staining drinks, and use a straw for iced coffee",
      "Whiter teeth read as healthier at a glance more reliably than almost any grooming change",
    ],
  },
  crooked: {
    title: "Worth a real conversation",
    notes: [
      "<b>Clear aligners</b> have made this far more accessible than it was — a consultation costs nothing at most clinics",
      "It's a 6–18 month project, which is exactly why it's worth starting rather than deferring",
      "In the meantime: <b>learn your smile</b>. A relaxed, closed-lip smile is genuinely attractive and entirely within your control",
    ],
  },
  gapped: {
    title: "Several routes, all real",
    notes: [
      "<b>Bonding</b> can close a small gap in a single appointment; aligners handle larger ones",
      "A midline gap is a feature on plenty of people — decide whether it actually bothers *you*",
    ],
  },
  unsure: {
    title: "Start with a clean",
    notes: [
      "<b>Book a hygienist appointment</b> — it's the cheapest, fastest visible upgrade in this entire app",
      "Ask them directly what, if anything, they'd change; you'll get an honest answer for free",
    ],
  },
};

interface PostureEntry {
  title: string;
  notes: string[];
}

/**
 * Posture is the only item here that changes how the jaw and neck read from
 * across a room, and it costs nothing.
 */
export const POSTURE: Record<Posture, PostureEntry> = {
  good: {
    title: "Keep it",
    notes: [
      "Hold it under load too — posture collapses when you're tired, on your phone, or carrying a bag on one side",
      "Alternate which shoulder carries weight",
    ],
  },
  "forward-head": {
    title: "Chin tucks, daily",
    notes: [
      "Forward head posture is the <b>single biggest destroyer of a jawline</b> — it flattens the angle between jaw and neck",
      "<b>Chin tucks:</b> 10 reps, 5 seconds each, 3× a day. Pull the head straight back, don't tilt it down",
      "Raise your monitor to eye level and stop looking down at your phone — that's the actual cause",
      "This one shows up in photos within weeks",
    ],
  },
  "rounded-shoulders": {
    title: "Open the chest",
    notes: [
      "<b>Doorway pec stretch</b>, 30 seconds each side, twice a day",
      "<b>Face pulls or band pull-aparts</b> 3× a week rebuild the back of the shoulder",
      "Rounded shoulders make every shirt hang badly — fixing it improves fit without buying anything",
    ],
  },
  unsure: {
    title: "Find out first",
    notes: [
      "<b>Take a relaxed side-on photo</b> against a wall — don't pose. Your ear should sit over your shoulder, not in front of it",
      "Most people are surprised. It's the cheapest diagnostic here",
    ],
  },
};

interface BodyEntry {
  title: string;
  good: string[];
  avoid: string[];
}

export const BODY: Record<Body, BodyEntry> = {
  slim: {
    title: "Build presence",
    good: [
      "<b>Slim but not skinny</b> fits — clothes should skim, not cling",
      "Layer (overshirt, jacket, henley under a tee) to add visual mass",
      "Horizontal stripes and heavier fabrics broaden you",
    ],
    avoid: [
      "Oversized / baggy everything — it makes a lean frame look smaller",
      "Deep V-necks that stretch the torso further",
    ],
  },
  athletic: {
    title: "Show the shape you've built",
    good: [
      "<b>Tailored / athletic-cut</b> shirts and tees that follow your torso",
      "Structured shoulders and mid-weight fabrics",
      "Fitted knitwear and slim trousers come easy to you",
    ],
    avoid: ["Boxy oversized fits that hide the taper", "Anything so tight it looks painted on"],
  },
  average: {
    title: "You've got range",
    good: [
      "<b>Regular to slim</b> fits both work — pick by the vibe you want",
      "Nail the shoulders and length; the rest follows",
      "A well-fitted layer instantly upgrades any outfit",
    ],
    avoid: ["Buying purely by size label and ignoring fit"],
  },
  broad: {
    title: "Sharp, structured, dark",
    good: [
      "<b>Structured fits</b> in darker, matte colours slim and elongate",
      "Vertical lines — plackets, open jackets, subtle stripes — draw the eye up and down",
      "Single-breasted jackets and a defined shoulder do a lot of work",
    ],
    avoid: [
      "Tight clothes that pull at buttons — aim for clean drape",
      "Baggy top with baggy bottom — one relaxed piece at a time",
      "Big horizontal patterns and shiny fabrics",
    ],
  },
};

interface HeightEntry {
  good: string[];
  avoid: string[];
}

export const HEIGHT: Record<Height, HeightEntry> = {
  short: {
    good: [
      "<b>Tonal / monochrome outfits</b> (top and bottom in one colour family) create an unbroken vertical line",
      "Keep proportions tidy — slightly cropped trousers, higher waist, no pooling fabric",
      "Vertical details and V-necklines add height",
    ],
    avoid: [
      "Strong contrast between top and bottom (it cuts you in half)",
      "Oversized fits and long coats past the knee",
    ],
  },
  mid: {
    good: [
      "You've got flexibility — <b>colour-blocking and layering</b> both work",
      "Just keep hems and sleeves at the right length; good tailoring reads as height",
    ],
    avoid: ["Letting garments run too long — puddling trousers shrink anyone"],
  },
  tall: {
    good: [
      "<b>Break up your outfit</b> with contrasting top and bottom colours and layers",
      "Patterns, horizontal details and cuffed trousers balance the length",
      "You can wear longer coats and oversized pieces most people can't",
    ],
    avoid: [
      "Trousers or sleeves that ride up — length is your #1 fit issue",
      "Head-to-toe tight monochrome — it exaggerates height",
    ],
  },
};

export const STYLE_NOTE: Record<Style, string> = {
  clean: "For clean & minimal: a tight palette (navy, white, grey, olive), fit over logos, 2–3 colours per outfit max.",
  street:
    "For streetwear: play with proportion (one oversized piece, one fitted), good sneakers, and disciplined colour so it reads intentional not loud.",
  smart:
    "For smart / formal: fit is everything — tailor the shoulders and trousers, learn to iron, let quality basics (white shirt, navy blazer, leather shoes) carry you.",
  rugged:
    "For rugged / casual: lean into texture — denim, flannel, boots, earth tones. A kept beard and worn-in leather do the heavy lifting.",
};

/** Age changes emphasis, not fundamentals. */
export const AGE_NOTE: Record<AgeBand, string> = {
  teen: "At your age most of this is <b>habit-building, not correction</b>. Sleep, sunscreen, brows and posture compound for decades. Your face is still changing — don't over-diagnose it, and be extremely wary of anyone online selling you a fix.",
  twenties:
    "This is the <b>highest-leverage decade</b>: habits set now (SPF, sleep, training) show up for the next thirty years, and anything hairline-related has the widest set of options right now.",
  thirties:
    "Focus shifts to <b>maintenance and quality</b>: skin barrier, sleep debt, body composition, and better-fitting clothes over more clothes. Retinol earns its place around now.",
  "forties+":
    "Play to <b>grooming precision and fit</b> — a sharp cut, tidy brows, well-tailored clothes and good skin read far stronger than chasing a younger look. Grey worn confidently beats grey badly dyed, every time.",
};

/** Body composition, framed as the facial-definition lever it actually is. */
export function bodyFatNote(body: Body): string {
  if (body === "broad")
    return "<b>Body composition is your biggest facial lever.</b> Facial definition — cheekbones, jaw angle — appears with lower body fat before it appears anywhere else. A modest, sustainable deficit plus resistance training changes your face, not just your body.";
  if (body === "slim")
    return "<b>Adding muscle, not losing fat, is your lever.</b> Shoulders and upper back build the V-taper that makes clothes hang well. Progressive resistance training 3× a week and eating in a slight surplus.";
  if (body === "athletic")
    return "You're already getting the benefit here — <b>hold the composition</b> and put the effort into recovery and sleep, which is where the facial payoff lives.";
  return "<b>Resistance training 3× a week</b> is the highest-return habit here: it improves posture, how clothes hang, and facial definition all at once.";
}

export interface ProtocolPlan {
  morning: string[];
  evening: string[];
  weekly: string[];
}

export function protocol(p: Profile): ProtocolPlan {
  const product: Record<HairType, string> = {
    straight: "matte clay or pomade",
    wavy: "sea-salt spray + light cream",
    curly: "curl cream",
    coily: "moisturiser + a pick for volume",
  };
  const skin = SKINCARE[p.skinType];
  const hasBeard = p.gender !== "fem" && p.beard !== "cleanshave";

  const morning = [
    `<b>Cleanse</b> with ${skin.cleanser}`,
    `<b>Moisturise</b> — ${skin.moisturiser}`,
    "Finish with <b>SPF 30+</b> — every day, even indoors near windows",
    `Style hair with ${product[p.hair]}`,
    "<b>Brush your brows</b> up and into shape — five seconds, disproportionate payoff",
  ];
  if (p.posture === "forward-head") {
    morning.push("<b>10 chin tucks</b> — 5 seconds each, before you leave");
  } else if (p.posture === "rounded-shoulders") {
    morning.push("<b>Doorway pec stretch</b>, 30 seconds each side");
  } else {
    morning.push("Posture reset: shoulders back, chin level before you head out");
  }

  const evening = [
    "Cleanse again to clear the day's oil, sunscreen and grime",
    `Moisturise${p.concern === "aging" ? "; <b>retinol</b> on alternate nights" : ""}`,
  ];
  if (p.concern !== "none" && p.concern !== "aging") {
    evening.push("Apply your target treatment on affected areas only");
  }
  if (hasBeard) {
    evening.push(
      p.beard === "light"
        ? "Groom edges; light stubble upkeep"
        : "Comb in <b>beard oil</b> to soften and shape",
    );
  }
  if (p.hairline === "shaved") {
    evening.push("Moisturise the scalp — it's facial skin and behaves like it");
  }
  evening.push("<b>Lip balm</b> — dehydrated lips read thinner than they are");
  evening.push(
    "Aim for <b>7–8 hrs sleep</b> — the cheapest skin upgrade there is, and the one that shows in your under-eyes first",
  );

  const weekly: string[] = [];
  weekly.push(
    p.skinType === "sensitive"
      ? "<b>Exfoliate gently, once</b> a week at most — more will set off redness"
      : "<b>Exfoliate</b> 2× a week for smoother, brighter skin",
  );
  weekly.push(
    p.brows === "overplucked" || p.brows === "sparse"
      ? "<b>Leave the brows alone</b> — brush and fill only while they grow back in"
      : "<b>Tidy brows</b>: strays between and below the natural line only, never above",
  );
  weekly.push(
    p.density === "receding" || p.hairline === "receding" || p.hairline === "shaved"
      ? "Keep the cut short and fresh — every <b>2–3 weeks</b>"
      : "Barber visit every <b>3–4 weeks</b> to keep the shape sharp",
  );
  weekly.push("Trim nails and tidy your hands — people notice these far more than you'd think");
  weekly.push(
    "<b>Resistance training 3×</b> — posture, facial definition and how clothes hang all improve together",
  );
  weekly.push("Ease off salt and alcohol before big days to cut facial puffiness");
  if (p.teeth !== "straight-white") {
    weekly.push("<b>Floss daily, whiten on a routine</b> — teeth are a first-impression feature");
  }
  weekly.push("<b>Progress photo</b>, same light and angle — you can't see slow change in a mirror");

  return { morning, evening, weekly };
}

export function summaryLine(p: Profile): string {
  const faceWord = p.face === "rectangle" ? "long" : p.face;
  const heightWord = p.height === "mid" ? "average-height" : `${p.height}er`;
  const beardClause =
    p.gender === "fem"
      ? ""
      : p.beard === "cleanshave"
        ? " a clean-shaven approach,"
        : ` a ${p.beard} beard approach,`;
  return `A ${faceWord}-faced plan with ${p.hair} hair,${beardClause} a ${p.undertone}-toned palette, and fits built for a ${p.body}, ${heightWord} frame.`;
}

/** Named cuts to show the barber, picked by presentation. */
export function styleNames(face: FaceShape, gender: Gender): string[] {
  const entry = FACE[face];
  if (gender === "fem") return entry.stylesFem;
  if (gender === "neutral") return [...entry.stylesMasc.slice(0, 2), ...entry.stylesFem.slice(0, 2)];
  return entry.stylesMasc;
}
