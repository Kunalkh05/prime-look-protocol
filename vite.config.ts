import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serve the ONNX Runtime binaries from public/ort/ instead of bundling them.
 *
 * ONNX Runtime locates its WebAssembly with `new URL("…​.wasm", import.meta.url)`.
 * Vite resolves that at build time, which pulls one specific variant — the
 * asyncify build, ~22MB — into the output as a hashed asset, and every visitor
 * gets that one no matter what their browser supports.
 *
 * Rewriting the expression to a plain runtime URL removes the static reference,
 * so the asset is never emitted, and lets the runtime pick the right binary
 * from the directory that scripts/copy-ort.mjs populates.
 *
 * If the pattern ever stops matching (a minifier change upstream), this becomes
 * a no-op and the build falls back to bundling — slower to load, still correct.
 */
function ortWasmFromPublic(base: string): Plugin {
  return {
    name: 'ort-wasm-from-public',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('onnxruntime-web') || !code.includes('.wasm')) return null

      const rewritten = code.replace(
        /new URL\((["'])(ort-wasm[^"']*\.wasm)\1\s*,\s*import\.meta\.url\)/g,
        (_match, _quote, file) =>
          `new URL(${JSON.stringify(`${base}ort/${file}`)}, globalThis.location.href)`,
      )
      return rewritten === code ? null : { code: rewritten, map: null }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const base = '/'
  return {
    base,
    // The analyzer and the vision model are both loaded with dynamic imports,
    // so they split into their own chunks and are only fetched on demand.
    plugins: [react(), ortWasmFromPublic(base)],
    build: {
      // The Transformers.js chunk is legitimately large and lazily loaded;
      // warning about it on every build is noise.
      chunkSizeWarningLimit: 700,
    },
    // Pre-bundling the runtime in dev fights the transform above.
    optimizeDeps: {
      exclude: command === 'serve' ? ['onnxruntime-web'] : [],
    },
    server: {
      // In development the frontend and API run on separate ports. Proxying
      // keeps them same-origin from the browser's point of view, so the
      // SameSite=Strict session cookie behaves exactly as it will in production.
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.PORT ?? 8787}`,
          changeOrigin: false,
        },
      },
    },
  }
})
