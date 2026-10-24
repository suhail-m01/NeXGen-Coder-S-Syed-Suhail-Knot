import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { 'react-vendor': ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,
  },
});
