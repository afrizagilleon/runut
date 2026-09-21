import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplikasi } from './Aplikasi.tsx';
import { BatasGalat } from './BatasGalat.tsx';
import './gaya.css';

const akar = document.getElementById('akar');
if (akar === null) {
  throw new Error('Elemen #akar tidak ditemukan di index.html');
}

/*
 * Batas galat membungkus seluruh aplikasi (A3-T2): kalau render jatuh, pemain
 * melihat satu kalimat dan satu tombol — bukan layar putih tanpa sepatah kata
 * pun, seperti yang dialami pemilik di ponselnya.
 */
createRoot(akar).render(
  <StrictMode>
    <BatasGalat>
      <Aplikasi />
    </BatasGalat>
  </StrictMode>,
);
