import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { KasusTidakSah, bangunKasus } from './bangun.ts';
import { DADA_2025_10_08 } from './dada-2025-10-08.ts';
import { keJson } from './json.ts';
import { muatDada } from '../muat/dada.ts';
import { periksaKasus } from '../skema/validator.ts';
import type { Kasus } from '../skema/tipe.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const adaCache = existsSync(AKAR + '.cache/sectors/dada-filings-2025.json');
const BERKAS_KASUS = AKAR + 'cases/dada-2025-10-08.json';

describe('berkas kasus yang ikut repo', () => {
  it('ada dan lolos validator yang sama dengan yang dipakai build', () => {
    const kasus = JSON.parse(readFileSync(BERKAS_KASUS, 'utf8')) as Kasus;
    expect(periksaKasus(kasus)).toEqual([]);
    expect(kasus.tanggal_t).toBe('2025-10-08');
    expect(kasus.soal).toHaveLength(3);
    expect(kasus.disclaimer).toHaveLength(3);
  });

  it('tidak memuat satu pun fakta sesudah tanggal T di bagian yang dilihat pemain', () => {
    const kasus = JSON.parse(readFileSync(BERKAS_KASUS, 'utf8')) as Kasus;
    const indeks = new Map(kasus.fakta.map((f) => [f.fact_id, f]));
    for (const id of kasus.fakta_terlihat) {
      const fakta = indeks.get(id);
      expect(fakta, `fakta ${id}`).toBeDefined();
      expect(fakta?.tersedia_sejak).not.toBeNull();
      expect(String(fakta?.tersedia_sejak) <= kasus.tanggal_t).toBe(true);
    }
    for (const id of kasus.pembukaan.fact_ids) {
      expect(kasus.fakta_terlihat).not.toContain(id);
    }
  });

  it('memuat tiga temuan yang diminta kontrak, beserta angkanya', () => {
    const kasus = JSON.parse(readFileSync(BERKAS_KASUS, 'utf8')) as Kasus;
    const nilai = (aturan: string, label: string): number[] =>
      kasus.temuan
        .filter((t) => t.aturan === aturan)
        .flatMap((t) => t.angka.filter((a) => a.label === label).map((a) => a.nilai));
    expect(nilai('R3', 'lembar pada set ulangan')).toEqual([586_000_000]);
    expect(nilai('R3', 'transaksi yang berulang')).toEqual([6]);
    expect(nilai('R2', 'lompatan')).toContain(79_272_900);
    expect(nilai('R2', 'lompatan')).toContain(-1_660_008_900);
  });

  it('mencatat kesepuluh aturan, termasuk yang tidak bisa dijalankan', () => {
    const kasus = JSON.parse(readFileSync(BERKAS_KASUS, 'utf8')) as Kasus;
    expect(kasus.pemeriksaan).toHaveLength(10);
    for (const p of kasus.pemeriksaan) {
      if (!p.dijalankan) expect(p.alasan_lewat).toBeTruthy();
    }
  });
});

describe.skipIf(!adaCache)('membangun ulang kasus dari cache', () => {
  const data = muatDada();

  it('menghasilkan berkas yang sama persis dengan yang ikut repo', () => {
    const { kasus } = bangunKasus(DADA_2025_10_08, data);
    expect(keJson(kasus)).toBe(readFileSync(BERKAS_KASUS, 'utf8').replace(/\r\n/g, '\n'));
  });

  it('gagal menyebut fact_id kalau fakta sesudah T ditaruh di bagian pemain', () => {
    const bocor = {
      ...DADA_2025_10_08,
      fakta_terlihat: [...DADA_2025_10_08.fakta_terlihat, 'harga-2025-10-22'],
    };
    try {
      bangunKasus(bocor, data);
      throw new Error('seharusnya gagal');
    } catch (galat) {
      expect(galat).toBeInstanceOf(KasusTidakSah);
      const masalah = (galat as KasusTidakSah).masalah;
      expect(masalah.map((m) => m.kode)).toContain('FAKTA_SESUDAH_T');
      expect(masalah.map((m) => m.pesan).join(' ')).toContain('harga-2025-10-22');
    }
  });

  it('gagal menyebut fact_id yang menggantung', () => {
    const menggantung = {
      ...DADA_2025_10_08,
      fakta_terlihat: [...DADA_2025_10_08.fakta_terlihat, 'harga-2030-01-01'],
    };
    expect(() => bangunKasus(menggantung, data)).toThrowError(/harga-2030-01-01/);
  });

  it('menandai fakta yang tersangkut temuan sebagai KONFLIK, termasuk gabungannya', () => {
    const { kasus } = bangunKasus(DADA_2025_10_08, data);
    const status = (id: string): string | undefined =>
      kasus.fakta.find((f) => f.fact_id === id)?.status;
    // Lompatan 25 Agu menyangkut kedua laporan hari itu, jadi fakta gabungannya ikut.
    expect(status('fil-2025-08-25-01')).toBe('KONFLIK');
    expect(status('fil-2025-08-25')).toBe('KONFLIK');
    // Laporan 1 Sep tidak tersangkut temuan mana pun.
    expect(status('fil-2025-09-01')).toBe('TERVERIFIKASI');
    expect(status('harga-2025-10-08')).toBe('TERVERIFIKASI');
  });

  it('tidak memakai fakta KONFLIK sebagai dasar jawaban soal mana pun', () => {
    const { kasus } = bangunKasus(DADA_2025_10_08, data);
    const konflik = new Set(
      kasus.fakta.filter((f) => f.status === 'KONFLIK').map((f) => f.fact_id),
    );
    for (const soal of kasus.soal) {
      for (const id of soal.fact_ids) expect(konflik.has(id)).toBe(false);
    }
  });
});
