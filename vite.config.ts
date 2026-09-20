import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const akar = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'web',
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@cases': fileURLToPath(new URL('./cases', import.meta.url)),
    },
  },
  server: { fs: { allow: [akar] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Tidak ada aset dari jaringan: semua di-inline atau disalin lokal.
    assetsInlineLimit: 0,
  },
});
