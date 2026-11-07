import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
