// T-01 — pemilihan kasus tersembunyi harus bisa direproduksi persis.
//
// Tes ini membaca .cache/ (data mentah penyedia, tidak ikut repo). Kalau cache
// tidak ada, tes ditandai skip dengan alasan yang tercetak — bukan hijau palsu.

import { describe, it, expect } from 'vitest';
import { adaBerkas, bacaJson, berkasCache, type BarisSuspensi } from './berkas.ts';
import { kandidatTerurut, periksaKelayakan, hitungT, BEKU, SEED, LAPORAN_MINIMAL } from './pilih-kasus.ts';

const adaCache = adaBerkas(berkasCache('suspensions-all.json'));
if (!adaCache) {
  console.warn('LEWAT: .cache/sectors/suspensions-all.json tidak ada; tes pemilihan kasus tidak dijalankan.');
}

describe.skipIf(!adaCache)('pemilihan kasus tersembunyi', () => {
  const baris = () => bacaJson<BarisSuspensi[]>(berkasCache('suspensions-all.json'));

  it('menghasilkan sepuluh teratas yang sama dengan urutan beku pemilik', () => {
    const sepuluh = kandidatTerurut(baris()).slice(0, 10).map((k) => k.kode);
    expect(sepuluh).toEqual(['AGII', 'FOLK', 'LABA', 'LIFE', 'GTSI', 'ASPI', 'SSTM', 'SOTS', 'PACK', 'TIRA']);
  });

  it('menghasilkan urutan identik pada dua pemanggilan (seed tetap)', () => {
    expect(kandidatTerurut(baris()).map((k) => k.kode)).toEqual(kandidatTerurut(baris()).map((k) => k.kode));
  });

  it('memakai seed yang dibekukan', () => {
    expect(SEED).toBe('sectors-hackathon-2026-09-20');
  });

  it('menolak AGII karena laporannya kurang dari delapan', () => {
    const agii = periksaKelayakan('AGII');
    expect(agii.jumlahLaporan).toBe(4);
    expect(agii.layak).toBe(false);
    expect(LAPORAN_MINIMAL).toBe(8);
  });

  it('menerima FOLK dengan delapan laporan', () => {
    const folk = periksaKelayakan('FOLK');
    expect(folk.jumlahLaporan).toBe(8);
    expect(folk.layak).toBe(true);
  });

  it('berhenti di FOLK sebagai kandidat layak pertama', () => {
    const kandidat = kandidatTerurut(baris());
    const pertamaLayak = kandidat.find((k) => periksaKelayakan(k.kode).layak);
    expect(pertamaLayak?.kode).toBe(BEKU.kode);
  });

  it('menghitung T = 7 Oktober 2025 dari hari bursa, bukan dari selera', () => {
    expect(hitungT('FOLK', ['2025-10-08', '2025-10-10'])).toBe(BEKU.tanggalT);
  });
});
