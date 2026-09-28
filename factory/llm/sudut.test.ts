/**
 * M2d-3 T-04: perencana sudut (D-4) — daftar sudut dari paket fakta.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import type { PaketFakta } from './paket.ts';
import { MAKS_PUTARAN_SUDUT, MAKS_SUDUT, rencanaSudut, sudutBerikutnya, topikFakta } from './sudut.ts';
import { MAKS_PUTARAN_PERAN } from './agen-peran.ts';

const paket = (id: string): PaketFakta => JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/${id}.json`, 'utf8')) as PaketFakta;

describe('perencana sudut', () => {
  it('batas: 5 putaran per sudut, 3 sudut per posisi, 15 putaran per simulasi', () => {
    expect([MAKS_PUTARAN_SUDUT, MAKS_SUDUT, MAKS_PUTARAN_PERAN]).toEqual([5, 3, 15]);
  });

  it('TIRT: peristiwa hari itu (setop 10 Des) dulu, lalu bergiliran topik; hitungan sebelum harga harian', () => {
    const d = rencanaSudut(paket('tirt')).map((s) => s.fact_id);
    expect(d.slice(0, 6)).toEqual([
      'susp-2025-12-10', 'naik-2025-11-26-2025-12-09', 'susp-2025-01-21', 'kelipatan-2025-11-26-2025-12-09', 'hari-naik-beruntun', 'volume-2025-12-10',
    ]);
  });

  it('DADA dan ULTJ: tiga sudut awal dari tiga topik berbeda', () => {
    for (const id of ['dada', 'ultj']) {
      const d = rencanaSudut(paket(id));
      expect(new Set(d.slice(0, 3).map((s) => s.topik)).size, id).toBe(3);
    }
    expect(rencanaSudut(paket('dada')).slice(0, 3).map((s) => s.fact_id)).toEqual(['kelipatan-2025-08-01-2025-10-08', 'jumlah-jual-terverifikasi', 'susp-2025-06-30']);
  });

  it('fakta yang isinya tidak bisa dikutip (jadwal RUPS tanpa teks keputusan) tidak pernah menjadi sudut; setiap fakta lain muncul tepat sekali', () => {
    for (const id of ['tirt', 'dada', 'ultj']) {
      const p = paket(id);
      const d = rencanaSudut(p).map((s) => s.fact_id);
      expect(d.some((x) => x.startsWith('rups-')), id).toBe(false);
      expect(new Set(d).size).toBe(d.length);
      expect(d.length).toBe(p.fakta.filter((f) => !f.fact_id.startsWith('rups-')).length);
    }
  });

  it('topik fakta dari fact_id lalu asal dokumennya', () => {
    expect(topikFakta({ fact_id: 'susp-2025-06-30', asal: '' })).toBe('suspensi');
    expect(topikFakta({ fact_id: 'andai-10-lot-dividen', asal: '' })).toBe('dividen');
    expect(topikFakta({ fact_id: 'laporan-jan-2026', asal: '' })).toBe('laporan');
    expect(topikFakta({ fact_id: 'fil-jan-orang-dalam-lain-laporan', asal: '' })).toBe('pemilik');
    expect(topikFakta({ fact_id: 'x', asal: 'laporan kepemilikan saham' })).toBe('pemilik');
  });

  it('sudut berikutnya = fakta pertama di daftar yang belum terpakai; habis → null', () => {
    const d = rencanaSudut(paket('tirt')).slice(0, 3);
    expect(sudutBerikutnya(d, new Set(['susp-2025-12-10']))?.fact_id).toBe('naik-2025-11-26-2025-12-09');
    expect(sudutBerikutnya(d, new Set(d.map((s) => s.fact_id)))).toBeNull();
  });
});
