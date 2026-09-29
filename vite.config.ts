import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The app uses hash-based routing (/#/rsvp), so a relative base path works for
// both a project page (https://user.github.io/repo/) and a custom domain.
// Override with VITE_BASE_PATH if you ever need an absolute base.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          motion: ['framer-motion'],
          charts: ['recharts'],
        },
      },
    },
  },
})
