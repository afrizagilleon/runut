/**
 * Pengurai PNG sekecil-kecilnya untuk membaca piksel tangkapan layar Playwright
 * (M3.10 D-7). Nol dependensi: `node:zlib` saja.
 *
 * Kenapa perlu piksel: yang diuji E-38 adalah apa yang TERLUKIS di pita di
 * belakang tepi balon, dan pita itu `pointer-events: none` (wadahnya harus
 * tembus sentuhan), jadi `elementFromPoint` tidak bisa melihatnya. Satu-satunya
 * saksi yang jujur adalah gambar layarnya.
 *
 * Hanya bentuk yang dihasilkan Chromium: kedalaman 8 bit, RGB atau RGBA, tanpa
 * interlace. Bentuk lain dilempar, bukan ditebak.
 */
import { inflateSync } from 'node:zlib';

export interface Gambar {
  lebar: number;
  tinggi: number;
  /** RGBA per piksel, baris demi baris. */
  data: Uint8Array;
}

export function uraiPng(berkas: Buffer): Gambar {
  if (berkas.subarray(1, 4).toString('ascii') !== 'PNG') throw new Error('bukan PNG');
  let pos = 8;
  let lebar = 0;
  let tinggi = 0;
  let jenisWarna = 0;
  const potongan: Buffer[] = [];
  while (pos < berkas.length) {
    const panjang = berkas.readUInt32BE(pos);
    const jenis = berkas.subarray(pos + 4, pos + 8).toString('ascii');
    const isi = berkas.subarray(pos + 8, pos + 8 + panjang);
    if (jenis === 'IHDR') {
      lebar = isi.readUInt32BE(0);
      tinggi = isi.readUInt32BE(4);
      const kedalaman = isi[8];
      jenisWarna = isi[9] ?? 0;
      const interlace = isi[12];
      if (kedalaman !== 8 || (jenisWarna !== 2 && jenisWarna !== 6) || interlace !== 0) {
        throw new Error(`PNG tidak didukung: kedalaman ${String(kedalaman)} warna ${String(jenisWarna)}`);
      }
    } else if (jenis === 'IDAT') {
      potongan.push(isi);
    } else if (jenis === 'IEND') {
      break;
    }
    pos += 12 + panjang;
  }
  const bpp = jenisWarna === 6 ? 4 : 3;
  const mentah = inflateSync(Buffer.concat(potongan));
  const baris = lebar * bpp;
  const hasil = new Uint8Array(lebar * tinggi * 4);
  let sebelum = new Uint8Array(baris);
  for (let y = 0; y < tinggi; y += 1) {
    const filter = mentah[y * (baris + 1)] ?? 0;
    const kini = new Uint8Array(mentah.subarray(y * (baris + 1) + 1, (y + 1) * (baris + 1)));
    for (let i = 0; i < baris; i += 1) {
      const a = i >= bpp ? (kini[i - bpp] ?? 0) : 0;
      const b = sebelum[i] ?? 0;
      const c = i >= bpp ? (sebelum[i - bpp] ?? 0) : 0;
      let tambah = 0;
      if (filter === 1) tambah = a;
      else if (filter === 2) tambah = b;
      else if (filter === 3) tambah = Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        tambah = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      kini[i] = ((kini[i] ?? 0) + tambah) & 0xff;
    }
    for (let x = 0; x < lebar; x += 1) {
      const o = (y * lebar + x) * 4;
      hasil[o] = kini[x * bpp] ?? 0;
      hasil[o + 1] = kini[x * bpp + 1] ?? 0;
      hasil[o + 2] = kini[x * bpp + 2] ?? 0;
      hasil[o + 3] = bpp === 4 ? (kini[x * bpp + 3] ?? 255) : 255;
    }
    sebelum = kini;
  }
  return { lebar, tinggi, data: hasil };
}
