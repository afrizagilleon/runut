import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Kasus } from '../../factory/skema/tipe.ts';
import { jumlahPemeriksaan, kalimatJejak, ringkasanJejak } from './jejak.ts';

/*
 * M3.6 D-5. Dua kegagalan yang dijaga di sini, keduanya sudah pernah terjadi:
 * angka yang diketik tangan ("sepuluh aturan") dan kata yang salah terdengar
 * ("rantai laporan kepemilikan" -> "rantai komando").
 */

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const kasusAsli = JSON.parse(
  readFileSync(`${AKAR}cases/dada-2025-10-08.json`, 'utf8'),
) as unknown as Kasus;

/** Kasus buatan: hanya medan yang dibaca modul ini yang perlu ada. */
function kasusUji(pemeriksaan: number, temuan: number): Kasus {
  return {
    pemeriksaan: Array.from({ length: pemeriksaan }, (_, nomor) => ({
      aturan: `R${String(nomor + 1)}`,
      judul: `aturan ${String(nomor + 1)}`,
      dijalankan: true,
      alasan_lewat: null,
      jumlah_temuan: 0,
    })),
    temuan: Array.from({ length: temuan }, (_, nomor) => ({ temuan_id: `t${String(nomor)}` })),
  } as unknown as Kasus;
}

describe('jumlahPemeriksaan', () => {
  it('membaca panjang daftar pemeriksaan, bukan angka yang diketik', () => {
    expect(jumlahPemeriksaan(kasusUji(10, 8))).toBe(10);
    expect(jumlahPemeriksaan(kasusUji(31, 8))).toBe(31);
    expect(jumlahPemeriksaan(kasusUji(0, 0))).toBe(0);
  });

  it('memakai penyebut yang sama dengan kaki lipatan: semua aturan, bukan hanya yang jalan', () => {
    const kasus = kasusUji(10, 8);
    const pemeriksaan = [...kasus.pemeriksaan];
    pemeriksaan[7] = { ...pemeriksaan[7], dijalankan: false, alasan_lewat: 'data tidak ada' } as never;
    const dengan = { ...kasus, pemeriksaan } as Kasus;
    // Sembilan yang jalan, tetapi yang disebut tetap sepuluh -- dan kaki
    // lipatan mengeja pengecualiannya ("1 dari 10"), jadi tidak ada yang
    // dibulatkan diam-diam.
    expect(jumlahPemeriksaan(dengan)).toBe(10);
    expect(dengan.pemeriksaan.filter((p) => p.dijalankan).length).toBe(9);
  });

  it('kasus DADA yang hidup: sepuluh aturan V1, bukan tiga puluh satu V2', () => {
    expect(jumlahPemeriksaan(kasusAsli)).toBe(10);
  });
});

describe('kalimatJejak', () => {
  it('menyebut jumlah pemeriksaan dan jumlah temuan dari data', () => {
    const teks = kalimatJejak(kasusUji(10, 8));
    expect(teks).toContain('10 pemeriksaan otomatis');
    expect(teks).toContain('8 hal yang tidak cocok');
  });

  it('ikut berubah ketika mesin verifikasinya berganti', () => {
    expect(kalimatJejak(kasusUji(31, 12))).toContain('31 pemeriksaan otomatis');
    expect(kalimatJejak(kasusUji(31, 12))).toContain('12 hal yang tidak cocok');
  });

  it('tidak memakai kata "rantai" — ia terdengar seperti "rantai komando"', () => {
    expect(kalimatJejak(kasusAsli).toLowerCase()).not.toContain('rantai');
  });

  it('tidak mengeja angkanya sebagai kata: kata tidak ikut berubah bersama data', () => {
    const teks = kalimatJejak(kasusAsli).toLowerCase();
    for (const kata of ['sepuluh', 'sembilan', 'delapan', 'tiga puluh satu']) {
      expect(teks, `angka "${kata}" tidak boleh dieja`).not.toContain(kata);
    }
  });

  it('murni: dua pemanggilan menghasilkan teks yang sama', () => {
    expect(kalimatJejak(kasusAsli)).toBe(kalimatJejak(kasusAsli));
  });
});

describe('ringkasanJejak', () => {
  it('menyebut angka yang sama dengan kalimat pembukanya', () => {
    const kasus = kasusUji(10, 8);
    expect(ringkasanJejak(kasus)).toBe('Lihat 10 pemeriksaan dan hasilnya');
    expect(kalimatJejak(kasus)).toContain('10 pemeriksaan');
  });

  it('ikut berubah bersama datanya', () => {
    expect(ringkasanJejak(kasusUji(31, 0))).toBe('Lihat 31 pemeriksaan dan hasilnya');
  });

  it('tidak memakai kata "rantai" dan tidak mengeja angkanya', () => {
    const teks = ringkasanJejak(kasusAsli).toLowerCase();
    expect(teks).not.toContain('rantai');
    expect(teks).not.toContain('kesepuluh');
  });
});
