import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    target: 'es2022',
    // Keep chunks reasonable for Pi's limited RAM
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ['maplibre-gl'],
          motion: ['motion'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})