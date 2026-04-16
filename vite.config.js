import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ANM-BusLog/', // ✅ Essenziale per GitHub Pages
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})