
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env to prevent crashes in 3rd party libraries (like Firebase)
    // that assumes they are running in a Node-like environment.
    'process.env': {}
  }
})
