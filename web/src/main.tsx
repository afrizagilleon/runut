import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplikasi } from './Aplikasi.tsx';
import { BatasGalat } from './BatasGalat.tsx';
import { mintaDapur } from './dapur.ts';
import './gaya.css';

const akar = document.getElementById('akar');
if (akar === null) {
  throw new Error('Elemen #akar tidak ditemukan di index.html');
}

/*
 * Halaman "Dapur agen" (M3.13 D-4) dimuat terpisah: datanya jejak lingkar agen
 * (±36 KB) dan tidak boleh ikut dimuat setiap pemain yang hanya bermain. Ia
 * dirender MENGGANTIKAN permainan — tanpa sesi, tanpa peristiwa.
 */
const Dapur = lazy(() => import('./Dapur.tsx'));

/*
 * Batas galat membungkus seluruh aplikasi (A3-T2): kalau render jatuh, pemain
 * melihat satu kalimat dan satu tombol — bukan layar putih tanpa sepatah kata
 * pun, seperti yang dialami pemilik di ponselnya.
 */
createRoot(akar).render(
  <StrictMode>
    <BatasGalat>
      {mintaDapur(window.location.search) ? (
        <Suspense fallback={null}>
          <Dapur />
        </Suspense>
      ) : (
        <Aplikasi />
      )}
    </BatasGalat>
  </StrictMode>,
);
