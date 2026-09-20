import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CacheHilang, bacaCache } from './cache.ts';
import { hitungSahamBeredar, muatDada } from './dada.ts';
import { ambilFakta, faktaKenaikan, pustakaDada } from './fakta.ts';
import { laporanDada2026, rantaiDada2025 } from '../verifikasi/rantai-dada.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const adaCache = existsSync(AKAR + '.cache/sectors/dada-filings-2025.json');

describe('pintu cache', () => {
  it('gagal menyebut nama berkas kalau berkasnya tidak ada', () => {
    expect(() => bacaCache('berkas-yang-tidak-pernah-ada.json')).toThrowError(CacheHilang);
    expect(() => bacaCache('berkas-yang-tidak-pernah-ada.json')).toThrowError(
      /berkas-yang-tidak-pernah-ada\.json/,
    );
  });
});

describe('saham beredar', () => {
  it('memakai angka yang paling sering muncul dan mencatat angka lain', () => {
    const hasil = hitungSahamBeredar([
      { tanggal: '2025-08-01', buka: 8, tertinggi: 9, terendah: 8, tutup: 8, volume: 1, nilai_pasar: 80 },
      { tanggal: '2025-08-04', buka: 9, tertinggi: 9, terendah: 9, tutup: 9, volume: 1, nilai_pasar: 90 },
      { tanggal: '2025-08-05', buka: 10, tertinggi: 10, terendah: 10, tutup: 10, volume: 1, nilai_pasar: 110 },
    ]);
    expect(hasil.lembar).toBe(10);
    expect(hasil.hari_sepakat).toBe(2);
    expect(hasil.angka_lain).toEqual([11]);
  });

  it('menolak menghitung tanpa data harga', () => {
    expect(() => hitungSahamBeredar([])).toThrowError(/tidak bisa dihitung/);
  });
});

// Tes di bawah butuh data mentah yang sengaja tidak ikut repo (D-4).
describe.skipIf(!adaCache)('pemuat data DADA dari .cache', () => {
  const data = muatDada();

  it('memuat 44 laporan 2025, 1 laporan 2026, 62 hari bursa, 2 suspensi, 1 dividen', () => {
    expect(data.laporan2025).toHaveLength(44);
    expect(data.laporan2026).toHaveLength(1);
    expect(data.harga).toHaveLength(62);
    expect(data.suspensi.map((s) => s.tanggal)).toEqual(['2025-06-30', '2025-10-09']);
    expect(data.dividen).toEqual([
      { ex_date: '2025-09-16', tanggal_bayar: '2025-10-09', nilai_per_lembar: 0.14 },
    ]);
  });

  it('menghasilkan rantai yang sama persis dengan fixture yang ikut repo', () => {
    // Pengikat: kalau fixture disunting tangan atau cache berubah, tes ini merah.
    const tanpaTeks = data.laporan2025.map((l) => ({ ...l, teks: '' }));
    expect(tanpaTeks).toEqual(rantaiDada2025());
    expect(data.laporan2026.map((l) => ({ ...l, teks: '' }))).toEqual(laporanDada2026());
  });

  it('menghitung saham beredar dari data, bukan dari angka yang ditulis tangan', () => {
    expect(data.saham_beredar.lembar).toBe(7_431_530_800);
    expect(data.saham_beredar.hari_sepakat).toBe(62);
    expect(data.saham_beredar.angka_lain).toEqual([]);
  });

  it('memakai tanggal laporan, bukan tanggal transaksi, sebagai tanggal ketersediaan', () => {
    const { fakta } = pustakaDada(data);
    const gabungan = ambilFakta(fakta, 'fil-2025-10-19');
    expect(gabungan.tersedia_sejak).toBe('2025-10-19');
    const satuan = ambilFakta(fakta, 'fil-2025-10-19-01');
    expect(satuan.tersedia_sejak).toBe('2025-10-19');
    expect(satuan.klaim).toContain('transaksi 14 Oktober 2025');
  });

  it('memberi tiap fakta harga tanggal ketersediaannya sendiri', () => {
    const { fakta } = pustakaDada(data);
    expect(ambilFakta(fakta, 'harga-2025-10-08').nilai).toBe(178);
    expect(ambilFakta(fakta, 'harga-2025-10-08').tersedia_sejak).toBe('2025-10-08');
    expect(ambilFakta(fakta, 'harga-2025-08-01').nilai).toBe(8);
    expect(ambilFakta(fakta, 'harga-2025-10-10-tertinggi').nilai).toBe(240);
    expect(ambilFakta(fakta, 'volume-2025-10-10').nilai).toBe(5_112_760_000);
    expect(ambilFakta(fakta, 'harga-2025-10-22').nilai).toBe(50);
  });

  it('menurunkan fakta dividen, suspensi, dan RUPS beserta angkanya', () => {
    const { fakta } = pustakaDada(data);
    expect(ambilFakta(fakta, 'div-2025-09-16').nilai).toBe(0.14);
    expect(ambilFakta(fakta, 'susp-2025-06-30').klaim).toContain('laporan keuangan');
    expect(ambilFakta(fakta, 'susp-2025-10-09').tersedia_sejak).toBe('2025-10-09');
    expect(ambilFakta(fakta, 'rups-2026-07-16-kuorum').nilai).toBe(22.32);
  });

  it('memberi setiap fakta jejak sumber yang terisi', () => {
    const { fakta } = pustakaDada(data);
    for (const f of fakta) {
      if (f.sumber.jenis === 'api') {
        expect(f.sumber.endpoint).not.toBeNull();
        expect(f.sumber.parameter['berkas_cache']).toBeTruthy();
      } else {
        expect(f.sumber.keterangan).not.toBeNull();
      }
    }
  });

  it('mencatat berkas cache yang benar untuk laporan di halaman kedua', () => {
    const { fakta } = pustakaDada(data);
    const halamanDua = ambilFakta(fakta, 'fil-2026-01-12-01');
    expect(halamanDua.sumber.parameter['berkas_cache']).toBe('dada-filings-2026.json');
    // Halaman pertama cache memuat laporan terbaru (19 Okt 23:45 ke atas),
    // halaman kedua memuat yang lebih tua. Jejak sumber harus mengikuti itu.
    expect(ambilFakta(fakta, 'fil-2025-10-26-01').sumber.parameter['berkas_cache']).toBe(
      'dada-filings-2025.json',
    );
    expect(ambilFakta(fakta, 'fil-2025-08-25-01').sumber.parameter['berkas_cache']).toBe(
      'dada-filings-2025-p20.json',
    );
    const sembilanBelas = fakta.filter((f) => /^fil-2025-10-19-\d\d$/.test(f.fact_id));
    const berkasCache = new Set(sembilanBelas.map((f) => f.sumber.parameter['berkas_cache']));
    // Laporan 19 Okt terpotong di antara dua halaman; keduanya harus tercatat.
    expect([...berkasCache].sort()).toEqual([
      'dada-filings-2025-p20.json',
      'dada-filings-2025.json',
    ]);
  });

  it('menghitung hari bursa dan kelipatan harga dari data, bukan dari dokumen', () => {
    const turunan = faktaKenaikan(data, '2025-08-01', '2025-10-08');
    expect(turunan[0]?.nilai).toBe(47);
    expect(turunan[1]?.nilai).toBe(22.25);
  });
});
