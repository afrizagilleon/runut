/**
 * M3.16 — sorotan pemandu: hitungan lubang dan klip lapisan. Semua fungsi
 * murni; peramban yang melukis mengujinya lagi di `e2e/sorotan.spec.ts`.
 */
import { describe, expect, it } from 'vitest';
import { JARAK_LUBANG, klipSelubung, lubangDari, type Kotak } from './sorotan.ts';

const BATAS = { lebar: 360, tinggi: 2000 };

function kotak(kiri: number, atas: number, kanan: number, bawah: number): Kotak {
  return { kiri, atas, kanan, bawah };
}

describe('lubangDari', () => {
  it('satu sasaran: diperlebar JARAK_LUBANG di keempat sisi', () => {
    expect(lubangDari([kotak(16, 300, 344, 500)], BATAS)).toEqual(
      kotak(16 - JARAK_LUBANG, 300 - JARAK_LUBANG, 344 + JARAK_LUBANG, 500 + JARAK_LUBANG),
    );
  });

  it('beberapa sasaran (judul + pilihan): satu lubang yang memuat semuanya', () => {
    const l = lubangDari([kotak(16, 900, 344, 960), kotak(16, 968, 344, 1300)], BATAS);
    expect(l).toEqual(kotak(8, 892, 352, 1308));
  });

  it('dipotong ke batas dokumen: tidak pernah negatif, tidak pernah lebih lebar dari jendela', () => {
    expect(lubangDari([kotak(-20, 2, 400, 1995)], BATAS)).toEqual(kotak(0, 0, 360, 2000));
  });

  it('piksel pecahan dibulatkan KE LUAR (lubang tidak pernah memotong sasaran)', () => {
    const l = lubangDari([kotak(16.4, 300.6, 343.2, 500.1)], BATAS, 0);
    expect(l).toEqual(kotak(16, 300, 344, 501));
  });

  it('tanpa sasaran, atau sasaran tanpa luas: tidak ada lubang', () => {
    expect(lubangDari([], BATAS)).toBeNull();
    expect(lubangDari([kotak(10, 10, 10, 10)], BATAS)).toBeNull();
  });
});

describe('klipSelubung', () => {
  it('evenodd: kotak luar penuh, lalu lubangnya — lima titik tiap cincin', () => {
    expect(klipSelubung(kotak(8, 292, 352, 508))).toBe(
      'polygon(evenodd, 0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px, ' +
        '8px 292px, 352px 292px, 352px 508px, 8px 508px, 8px 292px)',
    );
  });

  it('jumlah titik selalu sama, supaya peralihan antar-langkah bisa dihaluskan', () => {
    const a = klipSelubung(kotak(8, 100, 352, 200)).split(',').length;
    const b = klipSelubung(kotak(0, 0, 360, 2000)).split(',').length;
    expect(a).toBe(b);
  });
});
