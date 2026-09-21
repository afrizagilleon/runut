import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const akar = fileURLToPath(new URL('.', import.meta.url));

/*
 * Dua variabel lingkungan, keduanya hanya untuk uji ujung-ke-ujung (M3.3 D-3,
 * D-4). Tanpa keduanya, konfigurasi ini berperilaku persis seperti sebelumnya
 * (INV-15): alamat proxy tetap `http://127.0.0.1:8787` dan daftar host yang
 * diizinkan tidak disetel sama sekali — bukan disetel ke nilai bawaannya.
 *
 * `KOLEKTOR_PROXY` ada karena rangkaian e2e menjalankan pengumpulnya sendiri di
 * port lain (8797), supaya ia tidak pernah menulis ke berkas data pemilik.
 *
 * `E2E_HOST` ada karena satu cacat hanya muncul di asal yang tidak aman —
 * `http://` yang bukan localhost. Vite 5.4.12 ke atas menolak `Host` yang tidak
 * dikenal, jadi nama host tiruan itu harus diizinkan; ia diizinkan **hanya**
 * ketika variabelnya diset, sehingga `npm run dev` biasa tidak melonggar.
 */
const kolektorProxy: string = process.env.KOLEKTOR_PROXY ?? 'http://127.0.0.1:8787';
const hostUji: string = process.env.E2E_HOST ?? '';
const izinHost: { allowedHosts?: string[] } = hostUji === '' ? {} : { allowedHosts: [hostUji] };

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
    ...izinHost,
    proxy: {
      '/e': kolektorProxy,
      '/sehat': kolektorProxy,
    },
  },
  preview: {
    ...izinHost,
    proxy: {
      '/e': kolektorProxy,
      '/sehat': kolektorProxy,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Tidak ada aset dari jaringan: semua di-inline atau disalin lokal.
    assetsInlineLimit: 0,
  },
});
