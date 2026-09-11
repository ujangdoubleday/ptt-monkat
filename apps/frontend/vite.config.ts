import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // the browser stays same-origin, so no CORS on the Go side
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
  // `vite preview` serves the built bundle and does NOT inherit server.proxy.
  // Without this block every /api call from the built app 404s.
  preview: {
    port: 4173,
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
})
