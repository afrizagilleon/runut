/**
 * M2d-16 D-2: uji plasebo gerbang tebak atas data tersimpan (gratis).
 * Angka acuan reviewer (`.cache/tmp/aturan.py`): aturan lama 72 % / 44 %
 * (51/70, 94/210); binomial p < 0,01 pesan+pilihan 22 % / 8 % (16/70, 18/210);
 * soal tayang 6/6 tidak ditolak.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { bacaButirRotasi, JALUR_LAPORAN_PLASEBO, laporanPlasebo, petakanUlangTersimpan, ujiPlasebo } from './plasebo.ts';

const butir = bacaButirRotasi(AKAR);
const h = ujiPlasebo(butir);

describe('uji plasebo gerbang tebak (data tersimpan)', () => {
  it('70 butir berdata rotasi (33 uji ulang + versi jalan M2d-11/13/15), 210 kunci palsu', () => {
    expect(butir).toHaveLength(70);
    expect(butir.filter((b) => b.nama.startsWith('uji-ulang:'))).toHaveLength(33);
    expect(h.n).toBe(70);
    expect(h.n_plasebo).toBe(210);
  });

  it('aturan LAMA: kunci asli ditolak 51/70, kunci palsu ditolak 94/210, soal tayang lolos 3/6', () => {
    expect(h.lama).toMatchObject({ asli_ditolak: 51, plasebo_ditolak: 94, tayang_tidak_ditolak: 3, tayang: 6 });
  });

  it('aturan v2: kunci asli ditolak 16/70, kunci palsu ditolak 18/210, tak-terukur 1 dan 3', () => {
    expect(h.v2).toMatchObject({ asli_ditolak: 16, asli_tak_terukur: 1, plasebo_ditolak: 18, plasebo_tak_terukur: 3 });
  });

  it('SYARAT kontrak: v2 menolak ≤ 12 % kunci palsu dan tidak menolak satu pun dari 6 soal tayang', () => {
    expect(h.v2.plasebo_ditolak / h.n_plasebo).toBeLessThanOrEqual(0.12);
    expect(h.v2.tayang).toBe(6);
    expect(h.v2.tayang_tidak_ditolak).toBe(6);
    expect(h.v2.tayang_tak_terukur).toBe(0);
  });

  it('pencocok v2 atas salinan tersimpan: m2d15-opus-3 o2 v2 — 23 jawaban tak terbaca menjadi terbaca', () => {
    const u = petakanUlangTersimpan(AKAR);
    const b = u.per_butir.find((x) => x.nama === 'm2d15-opus-3:o2v2');
    expect(b).toMatchObject({ tak_terbaca_lama: 23, terbaca_v2: 23 });
    expect(u.tak_terbaca_lama).toBeGreaterThanOrEqual(u.terbaca_v2);
  });

  it('laporan docs/bukti/gerbang-tebak-v2.md = keluaran skrip (npm run rotasi:plasebo -- --tulis)', () => {
    const jalur = `${AKAR}${JALUR_LAPORAN_PLASEBO}`;
    expect(existsSync(jalur)).toBe(true);
    expect(readFileSync(jalur, 'utf8').replace(/\r\n/g, '\n')).toBe(laporanPlasebo(AKAR));
  });
});
