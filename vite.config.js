import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/detour/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    env: {
      VITE_GEMINI_API_KEY: 'test-key-gemini',
      VITE_MAPS_API_KEY: 'test-key-maps',
      VITE_YOUTUBE_API_KEY: 'test-key-youtube',
    },
  },
})
