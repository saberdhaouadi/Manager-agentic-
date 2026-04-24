import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    host: true,
    port: parseInt(process.env.PORT) || 4173,
    allowedHosts: 'all',
  },
  server: {
    host: true,
    port: parseInt(process.env.PORT) || 5173,
    allowedHosts: 'all',
  }
})
