import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Dev proxy: the frontend calls /api/* and Vite forwards to Express — no CORS hassle in dev.
    proxy: { '/api': 'http://localhost:5000' },
  },
});
