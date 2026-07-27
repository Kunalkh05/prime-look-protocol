/**
 * Copy the ONNX Runtime WebAssembly binaries into public/ort/.
 *
 * Left to itself, the bundler pulls one specific variant into the module graph
 * — the asyncify build, which is the largest at ~22MB — and every visitor gets
 * that one regardless of what their browser can actually use. Serving the whole
 * directory as static files instead lets ONNX Runtime pick at runtime: the
 * smaller SIMD/threaded build where that's supported, and the WebGPU (jsep)
 * build where that is.
 *
 * Generated at build time rather than committed, so 20MB+ of binaries stay out
 * of the repository.
 */

import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "onnxruntime-web", "dist");
const to = join(root, "public", "ort");

try {
  const files = await readdir(from);
  const wanted = files.filter((f) => f.endsWith(".wasm") || f.endsWith(".mjs"));

  if (wanted.length === 0) {
    console.warn("[copy-ort] No runtime files found — skipping.");
    process.exit(0);
  }

  await mkdir(to, { recursive: true });
  await Promise.all(wanted.map((f) => cp(join(from, f), join(to, f))));
  console.log(`[copy-ort] Copied ${wanted.length} runtime files to public/ort/`);
} catch (err) {
  if (err.code === "ENOENT") {
    // Transformers.js not installed — the app still runs, just without the
    // zero-shot stage, so this must not fail the build.
    console.warn("[copy-ort] onnxruntime-web not present — skipping.");
    process.exit(0);
  }
  throw err;
}
