# PRIME — Look Protocol

A private grooming and style tool. Upload a photo, get a ranked, personalised
protocol for hair, brows, beard, skin, colour and fit.

Invite-only: everything sits behind a per-person code, and there is no public
sign-up.

---

## Quick start

```bash
npm install
cp .env.example .env
```

Fill in `.env` — the two required values:

```bash
# 32+ characters
openssl rand -base64 48    # → SESSION_SECRET

# one per person, 12+ characters
openssl rand -hex 12       # → INVITE_CODES=you:<code>
```

Then run **both** processes, in separate terminals:

```bash
npm run dev:server   # API on :8787
npm run dev          # UI on :5173, proxies /api to the server
```

Open the UI, enter a code, and you're in.

## Production

```bash
npm run build        # builds the frontend and compiles the server
npm start            # serves both from one origin on $PORT
```

Set `NODE_ENV=production` so cookies are marked `Secure` and HSTS is sent.
**Terminate TLS in front of this** — a reverse proxy (Caddy, nginx) or a
platform that does it for you (Fly, Railway, Render). Secure cookies over plain
HTTP won't be stored by the browser.

If you're behind a proxy, set `TRUST_PROXY=true` so rate limiting sees real
client IPs. Don't set it otherwise: without a proxy in front, clients can spoof
`X-Forwarded-For` and dodge the limits entirely.

---

## Where the AI runs

Two paths, and the difference matters.

The split is drawn along what is actually **measurable**.

**On-device (always on, never optional).** Everything that produces a real
number. Ask a vision API for your gonial angle and it will invent a plausible
one — it has no way to measure. So this stays local, and your photo never
leaves your machine for any of it.

| What | How |
|---|---|
| Face shape, 11 proportions | Landmark geometry — no model |
| Brows, beard, oiliness, redness | Pixel statistics — no model |
| Hairline stage, hair density | MediaPipe hair segmentation |
| Body type, posture | MediaPipe pose (optional 2nd photo) |

**Server-side (opt-in, off by default).** The judgement calls — hair type, age,
teeth, skin concerns — which need a model too large to run in a browser. Set
`VISION_PROVIDER` to `gemini` or `huggingface` and add the matching key. Users
get a checkbox saying plainly that their photo will be uploaded. The key stays
on the server and never reaches the browser.

Leave it off and those four become questions. That is a better outcome than a
confident wrong guess, which is what the previous in-browser CLIP model gave —
it cost a 40MB download and roughly 95MB of deployed assets to be worse at
these fields than one API call.

Height and style goal are never inferred — a photo can't tell you someone's
height, and style is a preference, not a feature.

---

## Security

What's in place, and why.

**Authentication.** Per-person invite codes, compared in constant time so a
`===` can't leak a code's prefix through timing. Sessions are HMAC-signed tokens
carrying their own label and expiry — nothing stored server-side, so a restart
doesn't sign everyone out, and a user can't edit their own cookie without
invalidating the signature.

**Cookies.** `HttpOnly` (script can't read the session even through an XSS bug),
`SameSite=Strict` (removes CSRF on the API), `Secure` in production.

**Rate limiting.** Ten sign-in attempts per IP per 15 minutes, which is what
makes invite codes viable against guessing. Thirty analyses per session per
hour, plus a wider per-IP ceiling, so nobody drains the upstream quota.

**Upload validation.** Images are checked by **file signature, not declared MIME
type** — a shell script labelled `image/jpeg` is rejected. SVG is refused
outright because it can carry script. Size is capped before decoding.

**Photos are never persisted.** They arrive in a request, get forwarded to the
model, and are dropped. Not written to disk, not cached, never logged. Logs
record that an analysis happened and how many fields came back — never content.

**Headers.** CSP restricting scripts to same-origin (plus `wasm-unsafe-eval`,
which MediaPipe and ONNX Runtime both require to compile WebAssembly),
`frame-ancestors 'none'`, `nosniff`, `no-referrer`, and a Permissions-Policy
granting camera only. API responses are `no-store`.

**Errors.** Upstream failures are logged in full server-side and returned to the
client as generic messages — provider error bodies can echo request details.

### Your responsibilities

- **Never commit `.env`.** It's gitignored; keep it that way.
- **Serve over HTTPS.** Several controls assume it.
- **Rotate a code** by editing `INVITE_CODES` and restarting. Each person having
  their own is what makes this possible without disturbing anyone else.
- **Rotating `SESSION_SECRET` signs everyone out**, which is the emergency lever
  if you think a session was stolen.

### Known limitations

- Rate-limit buckets are in memory, so they reset on restart and don't work
  across multiple instances. Fine for this scale; needs shared storage if it
  ever grows.
- Invite codes are shared secrets. Anyone who passes one on gets access — there
  is no device binding or second factor.

---

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Frontend dev server |
| `npm run dev:server` | API, watching for changes |
| `npm run build` | Build frontend + compile server |
| `npm start` | Run production server |
| `npm test` | Full test suite |
| `npm run typecheck` | Typecheck both frontend and server |
| `npm run lint` | Lint |

## Layout

```
server/            API — auth, rate limiting, validation, vision proxy
src/lib/           Detection pipeline, metrics, recommendations
src/lib/vision/    Per-detector modules
src/components/    UI
scripts/           Build helpers
```
