import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplikasi } from './Aplikasi.tsx';
import './gaya.css';

const akar = document.getElementById('akar');
if (akar === null) {
  throw new Error('Elemen #akar tidak ditemukan di index.html');
}

createRoot(akar).render(
  <StrictMode>
    <Aplikasi />
  </StrictMode>,
);
