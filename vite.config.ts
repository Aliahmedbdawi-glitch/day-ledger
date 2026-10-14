import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so the build also loads from file:// inside the desktop app.
  base: './',
  test: {
    environment: 'node',
  },
})
