
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Removed explicit 'process.env' define to avoid conflicts with import.meta
  // If polyfills are needed for legacy libs, they should be handled via a plugin or shim
})
