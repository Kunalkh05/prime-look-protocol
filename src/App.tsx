import { useCallback, useEffect, useRef, useState } from "react";
import { Chips } from "./components/Chips";
import { Camera } from "./components/Camera";
import { Results } from "./components/Results";
import { FaceOutline } from "./components/Visuals";
import { DetectedReview, type FieldSpec } from "./components/DetectedReview";
import { CloudOptIn, type CloudSettings } from "./components/CloudOptIn";
import { prefetchAnalyzer } from "./lib/faceAnalysis";
import { analyzeOnServer } from "./lib/api";
import { detectFromPhoto, toDraft } from "./lib/vision";
import { analyzePose, NoBodyError } from "./lib/vision/pose";
import { loadImageFile, loadImageUrl } from "./lib/image";
import {
  clearSession,
  loadDraft,
  loadSession,
  saveDraft,
  saveSession,
  savedAgo,
} from "./lib/storage";
import type {
  AgeBand,
  Beard,
  Body,
  Brows,
  Density,
  Depth,
  DetectionMap,
  DetectionProgress,
  FaceAnalysis,
  FaceShape,
  Gender,
  HairType,
  Hairline,
  Height,
  Posture,
  Profile,
  SkinConcern,
  SkinType,
  Style,
  Teeth,
  Tone,
  Undertone,
} from "./types";

const GENDER_OPTS = [
  { value: "masc" as Gender, label: "Masculine" },
  { value: "fem" as Gender, label: "Feminine" },
  { value: "neutral" as Gender, label: "Neutral / both" },
];
const AGE_OPTS = [
  { value: "teen" as AgeBand, label: "Under 20" },
  { value: "twenties" as AgeBand, label: "20s" },
  { value: "thirties" as AgeBand, label: "30s" },
  { value: "forties+" as AgeBand, label: "40+" },
];
const FACE_OPTS = [
  { value: "oval" as FaceShape, label: "Oval" },
  { value: "round" as FaceShape, label: "Round" },
  { value: "square" as FaceShape, label: "Square" },
  { value: "rectangle" as FaceShape, label: "Rectangle / Long" },
  { value: "heart" as FaceShape, label: "Heart" },
  { value: "diamond" as FaceShape, label: "Diamond" },
  { value: "triangle" as FaceShape, label: "Triangle (wide jaw)" },
];
const HAIR_OPTS = [
  { value: "straight" as HairType, label: "Straight" },
  { value: "wavy" as HairType, label: "Wavy" },
  { value: "curly" as HairType, label: "Curly" },
  { value: "coily" as HairType, label: "Coily / Kinky" },
];
const DENSITY_OPTS = [
  { value: "thick" as Density, label: "Thick" },
  { value: "medium" as Density, label: "Medium" },
  { value: "thin" as Density, label: "Thin / Fine" },
  { value: "receding" as Density, label: "Thinning / Receding" },
];
const HAIRLINE_OPTS = [
  { value: "full" as Hairline, label: "Full, unchanged" },
  { value: "mature" as Hairline, label: "Slightly higher than it was" },
  { value: "receding" as Hairline, label: "Receding at the temples" },
  { value: "thinning-crown" as Hairline, label: "Thinning at the crown" },
  { value: "diffuse" as Hairline, label: "Thinner all over" },
  { value: "shaved" as Hairline, label: "Shaved / bald" },
];
const BEARD_OPTS = [
  { value: "full" as Beard, label: "Full & even" },
  { value: "medium" as Beard, label: "Decent, some gaps" },
  { value: "patchy" as Beard, label: "Patchy" },
  { value: "light" as Beard, label: "Barely grows" },
  { value: "cleanshave" as Beard, label: "Prefer clean-shaven" },
];
const BROW_OPTS = [
  { value: "thick" as Brows, label: "Thick / bushy" },
  { value: "average" as Brows, label: "Average" },
  { value: "sparse" as Brows, label: "Sparse / patchy" },
  { value: "unibrow" as Brows, label: "They meet in the middle" },
  { value: "overplucked" as Brows, label: "Over-plucked" },
];
const DEPTH_OPTS = [
  { value: "fair" as Depth, label: "Fair / Light" },
  { value: "medium" as Depth, label: "Medium / Tan" },
  { value: "deep" as Depth, label: "Deep / Dark" },
];
const UNDERTONE_OPTS = [
  { value: "warm" as Undertone, label: "Warm" },
  { value: "cool" as Undertone, label: "Cool" },
  { value: "neutral" as Undertone, label: "Neutral / Not sure" },
];
const SKINTYPE_OPTS = [
  { value: "oily" as SkinType, label: "Oily" },
  { value: "dry" as SkinType, label: "Dry" },
  { value: "combo" as SkinType, label: "Combination" },
  { value: "normal" as SkinType, label: "Balanced" },
  { value: "sensitive" as SkinType, label: "Sensitive" },
];
const CONCERN_OPTS = [
  { value: "acne" as SkinConcern, label: "Breakouts" },
  { value: "texture" as SkinConcern, label: "Texture / pores" },
  { value: "pigment" as SkinConcern, label: "Dark spots" },
  { value: "aging" as SkinConcern, label: "Fine lines" },
  { value: "redness" as SkinConcern, label: "Redness" },
  { value: "none" as SkinConcern, label: "Nothing specific" },
];
const TEETH_OPTS = [
  { value: "straight-white" as Teeth, label: "Straight & white" },
  { value: "straight-stained" as Teeth, label: "Straight but stained" },
  { value: "crooked" as Teeth, label: "Crooked / crowded" },
  { value: "gapped" as Teeth, label: "Gapped" },
  { value: "unsure" as Teeth, label: "Not sure" },
];
const POSTURE_OPTS = [
  { value: "good" as Posture, label: "Upright, feels natural" },
  { value: "forward-head" as Posture, label: "Head sits forward" },
  { value: "rounded-shoulders" as Posture, label: "Shoulders roll forward" },
  { value: "unsure" as Posture, label: "No idea" },
];
const BODY_OPTS = [
  { value: "slim" as Body, label: "Slim / Lean" },
  { value: "athletic" as Body, label: "Athletic / V-shape" },
  { value: "average" as Body, label: "Average" },
  { value: "broad" as Body, label: "Broad / Heavier" },
];
const HEIGHT_OPTS = [
  { value: "short" as Height, label: "Shorter" },
  { value: "mid" as Height, label: "Average" },
  { value: "tall" as Height, label: "Taller" },
];
const STYLE_OPTS = [
  { value: "clean" as Style, label: "Clean & minimal" },
  { value: "street" as Style, label: "Streetwear" },
  { value: "smart" as Style, label: "Smart / Formal" },
  { value: "rugged" as Style, label: "Rugged / Casual" },
];

/** Fields the face photo can fill in. Order is the review-panel order. */
const PHOTO_FIELDS: FieldSpec[] = [
  { key: "gender", label: "Grooming track", options: GENDER_OPTS },
  { key: "age", label: "Age range", options: AGE_OPTS },
  { key: "face", label: "Face shape", options: FACE_OPTS },
  { key: "hair", label: "Hair type", options: HAIR_OPTS },
  { key: "density", label: "Hair density", options: DENSITY_OPTS },
  { key: "hairline", label: "Hairline", options: HAIRLINE_OPTS },
  { key: "beard", label: "Beard", options: BEARD_OPTS },
  { key: "brows", label: "Brows", options: BROW_OPTS },
  { key: "depth", label: "Skin depth", options: DEPTH_OPTS },
  { key: "undertone", label: "Undertone", options: UNDERTONE_OPTS },
  { key: "skinType", label: "Skin type", options: SKINTYPE_OPTS },
  { key: "concern", label: "Main concern", options: CONCERN_OPTS },
  { key: "teeth", label: "Teeth", options: TEETH_OPTS },
];

/** Fields the optional body photo can fill in. */
const BODY_FIELDS: FieldSpec[] = [
  { key: "body", label: "Body type", options: BODY_OPTS },
  { key: "posture", label: "Posture", options: POSTURE_OPTS },
];

const FIELD_LABELS: Record<keyof Profile, string> = {
  gender: "grooming track",
  age: "age range",
  face: "face shape",
  hair: "hair type",
  density: "hair density",
  hairline: "hairline",
  beard: "beard",
  brows: "brows",
  depth: "skin depth",
  undertone: "undertone",
  skinType: "skin type",
  concern: "main skin concern",
  teeth: "teeth",
  posture: "posture",
  body: "body type",
  height: "height",
  style: "style goal",
};

export default function App({ serverAnalysis = false }: { serverAnalysis?: boolean }) {
  const faceInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [bodyPhoto, setBodyPhoto] = useState<string | null>(null);
  const [progress, setProgress] = useState<DetectionProgress | null>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [detected, setDetected] = useState<DetectionMap>({});
  const [failures, setFailures] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const [cloud, setCloud] = useState<CloudSettings>({ enabled: false });
  const [draft, setDraft] = useState<Partial<Profile>>({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<Profile | null>(null);
  const [resumable, setResumable] = useState<{ at: string } | null>(null);
  // Direct by default; the toggle is there for anyone who'd rather it wasn't.
  const [tone, setTone] = useState<Tone>(
    () => (localStorage.getItem("prime.tone") as Tone) ?? "direct",
  );

  const changeTone = useCallback((t: Tone) => {
    setTone(t);
    try {
      localStorage.setItem("prime.tone", t);
    } catch {
      /* storage disabled — the setting just won't persist */
    }
  }, []);

  const setField = useCallback((key: keyof Profile, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const setTyped = useCallback(<K extends keyof Profile>(key: K) => {
    return (value: Profile[K]) => setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setResumable({ at: session.savedAt });
      return;
    }
    const saved = loadDraft();
    if (saved) setDraft(saved);
  }, []);

  useEffect(() => {
    if (Object.keys(draft).length) saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    const id = setTimeout(prefetchAnalyzer, 1200);
    return () => clearTimeout(id);
  }, []);

  const runDetection = useCallback(
    async (load: () => Promise<Awaited<ReturnType<typeof loadImageFile>>>) => {
      setProgress({ stage: "Preparing your photo", ratio: null });
      setMsg(null);
      setFailures([]);
      try {
        const img = await load();
        setPhoto(img.dataUrl);

        const res = await detectFromPhoto(img, {
          onProgress: setProgress,
          // Passing this at all is the consent signal — the credential lives on
          // the server, so there's nothing for the browser to hold.
          serverAnalyze: cloud.enabled && serverAnalysis ? analyzeOnServer : undefined,
        });

        setAnalysis(res.analysis);
        setDetected((prev) => ({ ...prev, ...res.detected }));
        setDraft((d) => ({ ...toDraft(res.detected), ...pickManual(d) }));
        setFailures(res.failures);
      } catch (e) {
        const name = (e as Error)?.name;
        if (name === "NoFaceError") {
          setMsg(
            "Couldn't find a clear face in that photo. Try a front-facing, well-lit shot — or fill things in by hand instead.",
          );
        } else {
          setMsg(
            "The analysis couldn't finish. You can still fill everything in by hand below.",
          );
          console.error(e);
        }
        setManualMode(true);
      } finally {
        setProgress(null);
      }
    },
    [cloud, serverAnalysis],
  );

  const runPose = useCallback(async (load: () => Promise<Awaited<ReturnType<typeof loadImageFile>>>) => {
    setProgress({ stage: "Reading your frame and posture", ratio: null });
    try {
      const img = await load();
      setBodyPhoto(img.dataUrl);
      const pose = await analyzePose(img);
      const map: DetectionMap = { body: pose.body, posture: pose.posture };
      setDetected((prev) => ({ ...prev, ...map }));
      setDraft((d) => ({ ...d, body: pose.body.value, posture: pose.posture.value }));
      if (!pose.sideOn) {
        setMsg(
          "Frame read from that photo. For posture specifically, a relaxed side-on shot measures far more reliably.",
        );
      }
    } catch (e) {
      setMsg(
        e instanceof NoBodyError
          ? "Couldn't find a body in that photo — try a full-length or side-on shot."
          : "Couldn't read that photo. You can set body type and posture by hand.",
      );
    } finally {
      setProgress(null);
    }
  }, []);

  const handleFace = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setMsg("That doesn't look like an image file — try a JPG or PNG.");
        return;
      }
      void runDetection(() => loadImageFile(file));
    },
    [runDetection],
  );

  const handleBody = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setMsg("That doesn't look like an image file — try a JPG or PNG.");
        return;
      }
      void runPose(() => loadImageFile(file));
    },
    [runPose],
  );

  const handleCapture = useCallback(
    (dataUrl: string) => {
      setCameraOpen(false);
      void runDetection(() => loadImageUrl(dataUrl));
    },
    [runDetection],
  );

  const onGenerate = () => {
    const working: Partial<Profile> = { ...draft };
    if (working.gender === "fem" && !working.beard) working.beard = "cleanshave";

    const required = (Object.keys(FIELD_LABELS) as (keyof Profile)[]).filter(
      (k) => !(k === "beard" && working.gender === "fem"),
    );
    const missing = required.find((k) => !working[k]);
    if (missing) {
      setErr(`Just pick your ${FIELD_LABELS[missing]} to continue.`);
      document.getElementById("assessment")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const profile = working as Profile;
    setErr("");
    setResult(profile);
    saveSession(profile, analysis ?? undefined, photo ?? undefined);
    setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 30);
  };

  const resume = () => {
    const session = loadSession();
    if (!session) return;
    setDraft(session.profile);
    setAnalysis(session.analysis ?? null);
    setPhoto(session.photo ?? null);
    setResult(session.profile);
    setResumable(null);
    setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 30);
  };

  const restart = () => {
    clearSession();
    setResult(null);
    setPhoto(null);
    setBodyPhoto(null);
    setAnalysis(null);
    setDetected({});
    setDraft({});
    setErr("");
    setMsg(null);
    setFailures([]);
    setManualMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasDetection = Object.keys(detected).length > 0;
  const beardApplies = draft.gender !== "fem";
  const poseDetected = !!detected.body;

  const applicable = PHOTO_FIELDS.filter((f) => !(f.key === "beard" && !beardApplies));
  // Only fields something actually read go in the review panel. Anything no
  // detector answered — the semantic reads, when no server is configured —
  // drops through to the questions below rather than sitting there blank.
  const reviewFields = applicable.filter((f) => detected[f.key]);
  const unreadFields = applicable.filter((f) => !detected[f.key]);

  return (
    <>
      <header className="hero no-print">
        <div className="wrap">
          <div className="nav">
            <div className="brand">
              PRIME <span>/ Look Protocol</span>
            </div>
          </div>
          <div className="hero-inner">
            <div className="eyebrow">Personalized Grooming &amp; Style Protocol</div>
            <h1>
              Reach your maximum<b>looks potential</b>
            </h1>
            <p>
              Upload one photo. On-device AI reads your face shape, proportions, hairline, brows,
              beard, skin and colouring — then you answer two questions a photo can't tell us, and
              get a ranked protocol built around it.
            </p>
          </div>
        </div>
      </header>

      <div className="wrap">
        {resumable && !result && (
          <div className="resume no-print">
            <div>
              <strong>You have a saved protocol</strong>
              <span>Last updated {savedAgo(resumable.at)} — stored only on this device.</span>
            </div>
            <div className="resume-actions">
              <button type="button" className="btn btn-accent" onClick={resume}>
                Open it
              </button>
              <button
                type="button"
                className="btn btn-ghost cam-ghost"
                onClick={() => {
                  clearSession();
                  setResumable(null);
                }}
              >
                Start fresh
              </button>
            </div>
          </div>
        )}

        {!result && (
          <>
            {/* Step 1 — the photo does the work */}
            <div className="section-head" style={{ marginTop: 48 }}>
              <div className="eyebrow">Step 1 · Your photo</div>
              <h2>Upload a front-facing photo</h2>
              <p>Everything runs in your browser. Your photo never leaves your device.</p>
            </div>

            <div className="upload">
              <input
                ref={faceInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleFace(e.target.files[0])}
              />
              {!photo && (
                <>
                  <div
                    className={`dropzone${dragging ? " drag" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => faceInputRef.current?.click()}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") && faceInputRef.current?.click()
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      if (e.dataTransfer.files?.[0]) handleFace(e.dataTransfer.files[0]);
                    }}
                  >
                    <div className="icon">📷</div>
                    <h3>Drop a photo or click to browse</h3>
                    <p>JPG or PNG · a clear, well-lit selfie works best</p>
                  </div>
                  <div className="upload-buttons">
                    <span className="or">or</span>
                    <button
                      type="button"
                      className="btn btn-accent"
                      onClick={() => setCameraOpen(true)}
                    >
                      📸 Take a photo with your camera
                    </button>
                  </div>
                  <CloudOptIn settings={cloud} onChange={setCloud} available={serverAnalysis} />
                  <p className="privacy">
                    Prefer not to upload anything?{" "}
                    <button type="button" className="linkish" onClick={() => setManualMode(true)}>
                      Fill everything in by hand instead
                    </button>
                    .
                  </p>
                </>
              )}

              {photo && (
                <div className="preview-row">
                  <img className="preview-img" src={photo} alt="Your upload" />
                  <div className="analysis-panel">
                    {progress && (
                      <>
                        <div className="spinner" />
                        <p className="status">{progress.stage}…</p>
                        {progress.ratio !== null && (
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                            />
                          </div>
                        )}
                      </>
                    )}
                    {!progress && analysis && (
                      <>
                        <h3>Read from your photo</h3>
                        <div className="detected">
                          <div className="detected-row">
                            <span className="dlabel">Face shape</span>
                            <span className="dval">{analysis.face}</span>
                            <FaceOutline shape={analysis.face} size={34} />
                          </div>
                          <div className="detected-row">
                            <span className="dlabel">Colouring</span>
                            <span className="dval">
                              {analysis.depth} · {analysis.undertone}
                            </span>
                            <span className="skin-dot" style={{ background: analysis.skinColor }} />
                          </div>
                          <div className="detected-row">
                            <span className="dlabel">Measured</span>
                            <span className="dval">{analysis.metrics.length} proportions</span>
                          </div>
                          <div className="detected-row">
                            <span className="dlabel">Filled in</span>
                            <span className="dval">
                              {Object.keys(detected).length} of {PHOTO_FIELDS.length + 2} fields
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    <div
                      className="upload-buttons"
                      style={{ marginTop: 16, justifyContent: "flex-start" }}
                    >
                      <button
                        type="button"
                        className="btn btn-accent"
                        onClick={() => faceInputRef.current?.click()}
                      >
                        Upload another
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost cam-ghost"
                        onClick={() => setCameraOpen(true)}
                      >
                        📸 Retake
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {msg && <div className="alert">{msg}</div>}
              {failures.length > 0 && (
                <div className="alert">
                  Couldn't read: {failures.join("; ")}. Those fields are left for you to set below.
                </div>
              )}
            </div>

            {/* Step 2 — review what was detected */}
            {hasDetection && (
              <>
                <div className="section-head" id="assessment">
                  <div className="eyebrow">Step 2 · Check the reading</div>
                  <h2>Confirm what we found</h2>
                  <p>
                    All of this came from your photo. Anything the detectors weren't sure about is
                    listed first — change whatever looks wrong.
                  </p>
                </div>
                <DetectedReview
                  specs={reviewFields}
                  detected={detected}
                  draft={draft}
                  onChange={setField}
                />
              </>
            )}

            {/* Optional body photo */}
            {hasDetection && (
              <>
                <div className="section-head">
                  <div className="eyebrow">Step 3 · Optional</div>
                  <h2>Add a full-body or side-on photo</h2>
                  <p>
                    A face photo can't show your frame or posture. Add a second shot and we'll
                    measure both — or just answer them below.
                  </p>
                </div>
                <input
                  ref={bodyInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && handleBody(e.target.files[0])}
                />
                <div className="body-upload">
                  {bodyPhoto && <img className="preview-img small" src={bodyPhoto} alt="Body photo" />}
                  <div>
                    <button
                      type="button"
                      className="btn btn-accent"
                      onClick={() => bodyInputRef.current?.click()}
                    >
                      {bodyPhoto ? "Use a different photo" : "📷 Add a body photo"}
                    </button>
                    <p className="hint">
                      Side-on, standing relaxed against a wall is the most useful shot — that's the
                      one that makes posture measurable.
                    </p>
                  </div>
                </div>
                {poseDetected && (
                  <DetectedReview
                    specs={BODY_FIELDS}
                    detected={detected}
                    draft={draft}
                    onChange={setField}
                  />
                )}
              </>
            )}

            {/* Step 4 — what a photo genuinely cannot know */}
            {(hasDetection || manualMode) && (
              <>
                <div className="section-head" id={hasDetection ? undefined : "assessment"}>
                  <div className="eyebrow">
                    {hasDetection ? "Step 4 · Two last questions" : "Your details"}
                  </div>
                  <h2>{hasDetection ? "These a photo can't tell us" : "Fill in your details"}</h2>
                  <p>
                    {hasDetection
                      ? "Your height isn't measurable from a photo, and your style goal is a preference, not a feature."
                      : "No photo, so everything here is yours to set."}
                  </p>
                </div>

                <div className="assessment">
                  {!hasDetection && manualMode && (
                    <>
                      <div className="fieldset">
                        <div className="legend">About you</div>
                        <Chips label="Grooming track" options={GENDER_OPTS} value={draft.gender ?? null} onChange={setTyped("gender")} />
                        <Chips label="Age range" options={AGE_OPTS} value={draft.age ?? null} onChange={setTyped("age")} />
                      </div>
                      <div className="fieldset">
                        <div className="legend">Face &amp; Hair</div>
                        <Chips label="Face shape" options={FACE_OPTS} value={draft.face ?? null} onChange={setTyped("face")} />
                        <Chips label="Hair type" options={HAIR_OPTS} value={draft.hair ?? null} onChange={setTyped("hair")} />
                        <Chips label="Hair density" options={DENSITY_OPTS} value={draft.density ?? null} onChange={setTyped("density")} />
                        <Chips label="Hairline" options={HAIRLINE_OPTS} value={draft.hairline ?? null} onChange={setTyped("hairline")} />
                        <Chips label="Brows" options={BROW_OPTS} value={draft.brows ?? null} onChange={setTyped("brows")} />
                      </div>
                      {beardApplies && (
                        <div className="fieldset">
                          <div className="legend">Beard</div>
                          <Chips label="How does your beard grow?" options={BEARD_OPTS} value={draft.beard ?? null} onChange={setTyped("beard")} />
                        </div>
                      )}
                      <div className="fieldset">
                        <div className="legend">Skin</div>
                        <Chips label="Skin depth" options={DEPTH_OPTS} value={draft.depth ?? null} onChange={setTyped("depth")} />
                        <Chips label="Undertone" options={UNDERTONE_OPTS} value={draft.undertone ?? null} onChange={setTyped("undertone")} />
                        <Chips label="Skin type" options={SKINTYPE_OPTS} value={draft.skinType ?? null} onChange={setTyped("skinType")} />
                        <Chips label="Main concern" options={CONCERN_OPTS} value={draft.concern ?? null} onChange={setTyped("concern")} />
                      </div>
                      <div className="fieldset">
                        <div className="legend">Smile</div>
                        <Chips label="Your teeth" options={TEETH_OPTS} value={draft.teeth ?? null} onChange={setTyped("teeth")} />
                      </div>
                    </>
                  )}

                  {(!poseDetected || manualMode) && (
                    <div className="fieldset">
                      <div className="legend">Frame &amp; Posture</div>
                      <Chips label="Body type" options={BODY_OPTS} value={draft.body ?? null} onChange={setTyped("body")} />
                      <Chips label="Posture" options={POSTURE_OPTS} value={draft.posture ?? null} onChange={setTyped("posture")} />
                    </div>
                  )}

                  {hasDetection && unreadFields.length > 0 && (
                    <div className="fieldset">
                      <div className="legend">Nothing read these</div>
                      <p className="hint" style={{ margin: "0 0 4px" }}>
                        These need a model too large to run in your browser. Turn on server
                        analysis above to have them filled in, or just answer them here.
                      </p>
                      {unreadFields.map((f) => (
                        <Chips
                          key={f.key}
                          label={f.label}
                          options={f.options}
                          value={(draft[f.key] as string) ?? null}
                          onChange={(v) => setField(f.key, v)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="fieldset">
                    <div className="legend">The two we can't read</div>
                    <Chips
                      label="Height"
                      options={HEIGHT_OPTS}
                      value={draft.height ?? null}
                      onChange={setTyped("height")}
                      hint="No photo can give this without a reference object in frame."
                    />
                    <Chips
                      label="Style goal"
                      options={STYLE_OPTS}
                      value={draft.style ?? null}
                      onChange={setTyped("style")}
                      hint="This is about what you want to look like, not what you look like."
                    />
                  </div>

                  <div className="actions">
                    <button type="button" className="btn btn-accent" onClick={onGenerate}>
                      Generate my protocol →
                    </button>
                  </div>
                  <div className="err" role="status">
                    {err}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {result && (
          <Results
            profile={result}
            analysis={analysis}
            onRestart={restart}
            tone={tone}
            onToneChange={changeTone}
          />
        )}
      </div>

      {cameraOpen && <Camera onCapture={handleCapture} onClose={() => setCameraOpen(false)} />}
    </>
  );
}

/** Fields the user set by hand, which a re-analysis shouldn't overwrite. */
function pickManual(d: Partial<Profile>): Partial<Profile> {
  const keep: Partial<Profile> = {};
  if (d.height) keep.height = d.height;
  if (d.style) keep.style = d.style;
  return keep;
}
