import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// MediaPipe is loaded with dynamic imports, so it splits into its own chunk and
// is only fetched once someone actually uploads a photo.
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the frontend and API run on separate ports. Proxying keeps
    // them same-origin from the browser's point of view, so the SameSite=Strict
    // session cookie behaves exactly as it will in production.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT ?? 8787}`,
        changeOrigin: false,
      },
    },
  },
})
