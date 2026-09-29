/**
 * M3.12 D-2 — kata ringan di isi kedua simulasi, **disalin persis dari kontrak**.
 *
 * Pemilik (25 Sep): "kasus" menjurus ke kecelakaan dan tindak kriminal; satuan
 * permainan disebut "simulasi". Pemilik (22 Sep): "rantai" terasa seperti rantai
 * komando. "folks" adalah satu-satunya kata Inggris di teks pemain.
 *
 * Yang dijaga di sini adalah berkas HASIL BANGUN (`cases/*.json`), bukan
 * definisinya: definisi yang diubah tanpa `build:case` sudah merah di
 * `bangun.test.ts` / `soal1-k06.test.ts`.
 *
 * Dan satu penjaga kedua: teks soal 1–3 kedua simulasi **tidak disentuh**
 * (sudah lolos uji tebak buta). Sidik di bawah dihitung dari `JSON.stringify`
 * seluruh larik `soal` di `7d314e3` (dasar M3.12).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { teksPolos } from '../skema/rujukan.ts';
import type { Kasus } from '../skema/tipe.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

function muat(kasus_id: string): Kasus {
  return JSON.parse(readFileSync(`${AKAR}cases/${kasus_id}.json`, 'utf8')) as unknown as Kasus;
}

const dada = muat('dada-2025-10-08');
const ultj = muat('ultj-2026-05-04');

function ke(larik: readonly string[], i: number): string {
  const nilai = larik[i];
  if (nilai === undefined) throw new Error(`indeks ${String(i)} tidak ada`);
  return teksPolos(nilai);
}

describe('M3.12 D-2 — DADA', () => {
  it('pembukaan.paragraf[1]: "Sehari sesudah tanggal simulasi, …"', () => {
    expect(ke(dada.pembukaan.paragraf, 1)).toMatch(/^Sehari sesudah tanggal simulasi, pada 9 Oktober 2025, /);
  });

  it('pembukaan.paragraf[2]: "… sesudah tanggal simulasi …"', () => {
    expect(ke(dada.pembukaan.paragraf, 2)).toContain(
      'Laporan pemilik terbesar yang terbit sesudah tanggal simulasi memperlihatkan kelanjutannya:',
    );
  });

  it('pembukaan.bisa_dibaca[2]: "… sebelum tanggal simulasi …"', () => {
    expect(ke(dada.pembukaan.bisa_dibaca, 2)).toBe(
      'Satu-satunya pengumuman bursa sebelum tanggal simulasi berbicara tentang laporan keuangan yang terlambat, bukan tentang akuisisi.',
    );
  });

  it('pembukaan.paragraf[3]: "Laporan-laporan itu sendiri tidak bersih." (bukan "Rantai laporan")', () => {
    const p = ke(dada.pembukaan.paragraf, 3);
    expect(p).toMatch(/^Laporan-laporan itu sendiri tidak bersih\. /);
    expect(p.toLowerCase()).not.toContain('rantai');
  });

  it('penutup.isi: "Simulasi berikutnya: … Selamat belajar membaca data." (tanpa "folks")', () => {
    expect(dada.penutup.kepala).toBe('Tidak semua saham seperti ini.');
    expect(dada.penutup.isi).toBe(
      'Simulasi berikutnya: perusahaan yang membagi dividen tiap tahun. Selamat belajar membaca data.',
    );
  });
});

describe('M3.12 D-2 — ULTJ', () => {
  it('penutup: "Ini simulasi yang kedua." / "Simulasi lain: …"', () => {
    expect(ultj.penutup.kepala).toBe('Ini simulasi yang kedua.');
    expect(ultj.penutup.isi).toBe(
      'Simulasi lain: perusahaan yang harganya melonjak sementara pemilik besarnya menjual.',
    );
  });
});

describe('M3.12 — teks soal 1–3 tidak disentuh', () => {
  const sidik = (kasus: Kasus): string =>
    createHash('sha256').update(JSON.stringify(kasus.soal)).digest('hex');

  // M3.13 D-1: satu-satunya perubahan sejak 7d314e3 adalah `tanya` soal 1 DADA
  // (varian V1, eval/m313/soal1/); sidik lama 92b94912…cf71c.
  it('DADA: larik soal identik dengan 7d314e3 kecuali judul pertanyaan soal 1 (M3.13 D-1)', () => {
    expect(sidik(dada)).toBe('4a0075a672529ac0dc11b14f1c5e40a041a7fc3996b7822c2cf1854c1b7ba7c0');
  });

  it('ULTJ: larik soal identik dengan 7d314e3', () => {
    expect(sidik(ultj)).toBe('d266ff12f05a48bcefb971bb309e0ca18c13c8a58696160f4870845fabe83ec0');
  });
});
