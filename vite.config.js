import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In Docker on Windows the bind mount doesn't deliver file-change events,
    // so Vite would keep serving stale modules. docker-compose.override.yml
    // sets VITE_USE_POLLING=true; running on the host keeps native watching.
    watch: process.env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
  },
})
