import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set by the Docker Compose services. Bind-mounted sources on Docker Desktop
// do not reliably deliver inotify events, so the containerised dev server has to
// poll for changes; a normal local `npm run dev` keeps the default behaviour.
const inContainer = process.env.LPMS_IN_DOCKER === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: inContainer ? { usePolling: true } : undefined,
  },
})
