import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Set to the repository name for GitHub Pages deployment.
  base: '/Amitim-Augim/',
  plugins: [react()],
  build: {
    // Output to 'docs' folder for GitHub Pages.
    outDir: 'docs',
    emptyOutDir: true,
  }
})
