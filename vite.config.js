import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use relative assets so GitHub Pages and subfolder deploys work without extra config.
  base: './',
  plugins: [react()],
})
