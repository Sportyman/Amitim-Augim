import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // IMPORTANT: Replace 'MY_REPOSITORY_NAME' with the name of your GitHub repository.
  // This is crucial for GitHub Pages deployment.
  base: '/MY_REPOSITORY_NAME/',
  plugins: [react()],
})
