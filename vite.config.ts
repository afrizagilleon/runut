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
  /*
   * Di produksi, Caddy menyajikan aplikasi dan meneruskan `/e` serta `/sehat`
   * ke pengumpul di loopback — satu asal, tanpa CORS. Proxy di bawah menirukan
   * susunan itu untuk `npm run dev` dan `npm run preview`, supaya uji lokal
   * melewati jalur yang sama dengan pemain sungguhan.
   *
   * Ini bukan sekadar kenyamanan: `navigator.sendBeacon` dengan badan
   * `application/json` memicu preflight CORS kalau lintas asal, dan sendBeacon
   * tidak bisa melakukan preflight. Menguji lintas port akan kehilangan
   * peristiwa diam-diam dan memberi kesan pengiriman rusak.
   *
   * Proxy hanya hidup saat dev dan preview; ia tidak ikut ke `dist/`.
   */
  server: {
    fs: { allow: [akar] },
    proxy: {
      '/e': 'http://127.0.0.1:8787',
      '/sehat': 'http://127.0.0.1:8787',
    },
  },
  preview: {
    proxy: {
      '/e': 'http://127.0.0.1:8787',
      '/sehat': 'http://127.0.0.1:8787',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Tidak ada aset dari jaringan: semua di-inline atau disalin lokal.
    assetsInlineLimit: 0,
  },
});
