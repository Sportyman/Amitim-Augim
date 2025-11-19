import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Define process.env variables so they can be used in the client-side code
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY),
      'process.env.ADMIN_EMAIL': JSON.stringify(process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || 'shaykashay@gmail.com'),
    },
  }
})