import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Kasus } from '../../factory/skema/tipe.ts';
import {
  TAUTAN_JEJAK_NAIK,
  faktaGugur,
  jumlahPemeriksaan,
  kalimatJejak,
  kalimatJejakNaik,
  ringkasanJejak,
} from './jejak.ts';

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
function kasusUji(pemeriksaan: number, temuan: number, gugur = 1): Kasus {
  return {
    pemeriksaan: Array.from({ length: pemeriksaan }, (_, nomor) => ({
      aturan: `R${String(nomor + 1)}`,
      judul: `aturan ${String(nomor + 1)}`,
      dijalankan: true,
      alasan_lewat: null,
      jumlah_temuan: 0,
    })),
    temuan: Array.from({ length: temuan }, (_, nomor) => ({ temuan_id: `t${String(nomor)}` })),
    fakta: Array.from({ length: gugur }, (_, nomor) => ({
      fact_id: `f${String(nomor)}`,
      status: 'KONFLIK',
    })),
  } as unknown as Kasus;
}

describe('jumlahPemeriksaan', () => {
  it('membaca panjang daftar pemeriksaan, bukan angka yang diketik', () => {
    expect(jumlahPemeriksaan(kasusUji(10, 8))).toBe(10);
    expect(jumlahPemeriksaan(kasusUji(31, 8))).toBe(31);
    expect(jumlahPemeriksaan(kasusUji(0, 0))).toBe(0);
  });

  it('hanya aturan yang DIJALANKAN, bukan yang dilewati (M3.11 A-1 D-9)', () => {
    const kasus = kasusUji(10, 8);
    const pemeriksaan = [...kasus.pemeriksaan];
    pemeriksaan[7] = { ...pemeriksaan[7], dijalankan: false, alasan_lewat: 'data tidak ada' } as never;
    const dengan = { ...kasus, pemeriksaan } as Kasus;
    // Sepuluh aturan terdaftar, sembilan dijalankan: "diperiksa 10
    // pemeriksaan otomatis" mengaku lebih dari yang terjadi. Yang dilewati
    // tetap dieja di kaki lipatan ("1 dari 10"), bukan di angka ini.
    expect(jumlahPemeriksaan(dengan)).toBe(9);
    expect(dengan.pemeriksaan.length).toBe(10);
  });

  it('kasus DADA yang hidup: 9 dijalankan dari 10 aturan V1 (R8 dilewati)', () => {
    expect(jumlahPemeriksaan(kasusAsli)).toBe(9);
    expect(kasusAsli.pemeriksaan.length).toBe(10);
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

/*
 * M4 D-2. Ekor kalimat ikut data sejak kasus keduanya ada: ULTJ tidak
 * menggugurkan satu kartu pun, dan kalimat yang menutup dengan "dua laporan
 * disingkirkan" akan berbohong di sana.
 */
describe('kalimatJejak — ekornya ikut data (M4 D-2)', () => {
  it('menyebut berapa angka yang gugur ketika memang ada yang gugur', () => {
    const teks = kalimatJejak(kasusUji(10, 8, 43));
    expect(teks).toContain('8 hal yang tidak cocok');
    expect(teks).toContain('43 angka');
  });

  it('mengatakan apa adanya ketika tidak satu pun kartu gugur', () => {
    const teks = kalimatJejak(kasusUji(35, 7, 0));
    expect(teks).toContain('7 hal yang tidak cocok');
    expect(teks).toContain('tidak satu pun');
    expect(teks).not.toContain('0 angka');
  });

  it('tidak pernah mengeja "dua laporan" lagi — angka itu dulu diketik tangan', () => {
    for (const kasus of [kasusUji(10, 8, 43), kasusUji(35, 7, 0), kasusAsli]) {
      expect(kalimatJejak(kasus)).not.toContain('dua laporan');
    }
  });

  it('nol temuan tidak menghasilkan kalimat yang menggantung', () => {
    const teks = kalimatJejak(kasusUji(35, 0, 0));
    expect(teks).toContain('Tidak ada satu pun yang tidak cocok.');
    expect(teks).not.toContain('0 hal');
  });
});

describe('faktaGugur', () => {
  it('menghitung fakta yang tidak TERVERIFIKASI, bukan jumlah temuan', () => {
    expect(faktaGugur(kasusUji(10, 8, 43))).toBe(43);
    expect(faktaGugur(kasusUji(10, 8, 0))).toBe(0);
  });

  it('kasus DADA yang hidup memang menggugurkan kartu', () => {
    expect(faktaGugur(kasusAsli)).toBeGreaterThan(0);
  });
});

/*
 * M3.11 D-3 (kritik K-9). Kalimat yang naik ke bawah judul "Waktu berjalan
 * lagi". Kegagalan yang paling mungkin: angkanya diketik tetap ("10 … 43"),
 * benar untuk DADA dan bohong untuk ULTJ. Keduanya dibaca dari berkasnya.
 */
const kasusUltj = JSON.parse(
  readFileSync(`${AKAR}cases/ultj-2026-05-04.json`, 'utf8'),
) as unknown as Kasus;

describe('kalimatJejakNaik (M3.11 D-3)', () => {
  it('kata-kata persis kontrak, angka dari data', () => {
    expect(kalimatJejakNaik(kasusUji(10, 8, 43))).toBe(
      'Sebelum jadi kartu, laporan kasus ini diperiksa 10 pemeriksaan otomatis; 43 angka dibuang.',
    );
  });

  it('m = 0: kalimat kedua jadi "tidak ada angka yang dibuang"', () => {
    const teks = kalimatJejakNaik(kasusUji(35, 7, 0));
    expect(teks).toBe(
      'Sebelum jadi kartu, laporan kasus ini diperiksa 35 pemeriksaan otomatis; tidak ada angka yang dibuang.',
    );
    expect(teks).not.toContain('0 angka');
  });

  it('sumbernya sama dengan bagian jejak di dasar layar: jumlahPemeriksaan dan faktaGugur', () => {
    for (const kasus of [kasusAsli, kasusUltj, kasusUji(31, 2, 5)]) {
      const teks = kalimatJejakNaik(kasus);
      expect(teks).toContain(`diperiksa ${String(jumlahPemeriksaan(kasus))} pemeriksaan otomatis`);
      expect(kalimatJejak(kasus)).toContain(`${String(jumlahPemeriksaan(kasus))} pemeriksaan otomatis`);
      const m = faktaGugur(kasus);
      expect(teks).toContain(m === 0 ? 'tidak ada angka yang dibuang' : `${String(m)} angka dibuang`);
    }
  });

  it('DADA dan ULTJ yang hidup berbeda — angka yang diketik tidak bisa lolos keduanya', () => {
    // Hanya yang dijalankan (M3.11 A-1 D-9): DADA 9 dari 10, ULTJ 28 dari 35.
    expect(kalimatJejakNaik(kasusAsli)).toContain('diperiksa 9 pemeriksaan otomatis; 43 angka dibuang.');
    expect(kalimatJejakNaik(kasusUltj)).toContain('diperiksa 28 pemeriksaan otomatis; tidak ada angka yang dibuang.');
    expect(kalimatJejak(kasusAsli)).toContain('diperiksa dengan 9 pemeriksaan otomatis');
    expect(kalimatJejak(kasusUltj)).toContain('diperiksa dengan 28 pemeriksaan otomatis');
    expect(ringkasanJejak(kasusAsli)).toBe('Lihat 9 pemeriksaan dan hasilnya');
    expect(ringkasanJejak(kasusUltj)).toBe('Lihat 28 pemeriksaan dan hasilnya');
    expect(kalimatJejakNaik(kasusAsli)).not.toBe(kalimatJejakNaik(kasusUltj));
  });

  it('tautannya', () => {
    expect(TAUTAN_JEJAK_NAIK).toBe('Lihat pemeriksaannya');
  });
});
