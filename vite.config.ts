import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Dev-only proxy so the browser talks to one origin and the local
    // file-download endpoint works without CORS configuration.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // react-pdf pulls in pdf.js, which is large; splitting it keeps the
        // dashboard bundle small since the viewer is route-scoped.
        manualChunks: {
          pdf: ['react-pdf'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
