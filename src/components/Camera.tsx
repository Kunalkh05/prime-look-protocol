import { useEffect, useRef, useState } from "react";

interface CameraProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

const TIPS = [
  "Face a window or light — light should hit your face, not come from behind you",
  "Hold the camera at eye level, straight on (not looking up or down)",
  "Centre your whole face in the oval, with a little space above your head",
  "Pull hair off your forehead and keep a neutral, relaxed expression",
  "Plain background and no sunglasses, hat, or heavy shadows",
];

export function Camera({ onCapture, onClose }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // A modal that claims aria-modal has to actually hold focus, or a keyboard
  // user tabs straight out of it into the page behind and gets stranded there.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    modalRef.current?.querySelector<HTMLElement>("button")?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        const err = e as DOMException;
        if (err.name === "NotAllowedError" || err.name === "SecurityError") {
          setError(
            "Camera permission was blocked. Allow camera access in your browser, then try again — or use the upload option instead.",
          );
        } else if (err.name === "NotFoundError") {
          setError("No camera was found on this device. Use the upload option instead.");
        } else {
          setError("Couldn't start the camera. Use the upload option instead.");
        }
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const grabFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    // Draw the true (un-mirrored) frame so the saved photo matches reality.
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  };

  const startCountdown = () => {
    if (countdown !== null) return;
    let n = 3;
    setCountdown(n);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setCountdown(null);
        grabFrame();
      } else {
        setCountdown(n);
      }
    }, 800);
  };

  return (
    <div className="cam-backdrop" role="dialog" aria-modal="true" aria-label="Take a photo">
      <div className="cam-modal" ref={modalRef}>
        <div className="cam-head">
          <h3>Take your photo</h3>
          <button type="button" className="cam-x" aria-label="Close camera" onClick={onClose}>
            ✕
          </button>
        </div>

        {error ? (
          <div className="alert" style={{ marginTop: 0 }}>
            {error}
          </div>
        ) : (
          <div className="cam-body">
            <div className="cam-stage">
              <video ref={videoRef} className="cam-video" playsInline muted />
              <div className="cam-guide" aria-hidden="true" />
              {countdown !== null && <div className="cam-count">{countdown}</div>}
            </div>
            <div className="cam-tips">
              <div className="legend">How to take a good shot</div>
              <ul>
                {TIPS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="cam-actions">
          <button type="button" className="btn btn-ghost cam-ghost" onClick={onClose}>
            Cancel
          </button>
          {!error && (
            <button
              type="button"
              className="btn btn-accent"
              disabled={!ready || countdown !== null}
              onClick={startCountdown}
            >
              {countdown !== null ? "Hold still…" : "📸 Capture (3s timer)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
