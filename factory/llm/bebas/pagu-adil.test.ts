/**
 * Pagu adil M2d-13 (pra-registrasi §6): urutan bergiliran, pagu per jalan,
 * putaran hanya dimulai bila muat untuk KETIGA penulis. Tes merah dulu + sabotase.
 */
import { describe, expect, it } from 'vitest';
import { keputusanPutaran, PAGU_DB, PAGU_JALAN, rencanaJalanBerikut, urutanJalan } from './pagu-adil.ts';

describe('urutan jalan bergiliran', () => {
  it('Opus-1, Haiku-1, DeepSeek-1, Opus-2, Haiku-2, DeepSeek-2', () => {
    expect(urutanJalan().map((s) => s.id)).toEqual(['m2d13-opus-1', 'm2d13-haiku-1', 'm2d13-deepseek-1', 'm2d13-opus-2', 'm2d13-haiku-2', 'm2d13-deepseek-2']);
    expect(urutanJalan().map((s) => s.putaran)).toEqual([1, 1, 1, 2, 2, 2]);
  });
});

describe('keputusan putaran', () => {
  it('pagu tertulis: D-B US$2,10; per jalan 0,60/0,30/0,22', () => {
    expect(PAGU_DB).toBe(2.1);
    expect(PAGU_JALAN).toEqual({ opus: 0.6, haiku: 0.3, deepseek: 0.22 });
  });
  it('putaran 1 dimulai hanya bila sisa ≥ Σ pagu jalan (1,12)', () => {
    expect(keputusanPutaran(1, 2.1, null)).toMatchObject({ mulai: true, pagu: { opus: 0.6, haiku: 0.3, deepseek: 0.22 } });
    expect(keputusanPutaran(1, 1.11, null).mulai).toBe(false);
  });
  it('putaran 2 penuh bila sisa ≥ 1,12', () => {
    expect(keputusanPutaran(2, 1.12, 0.98)).toMatchObject({ mulai: true, pagu: { opus: 0.6, haiku: 0.3, deepseek: 0.22 } });
  });
  it('putaran 2 diskalakan SAMA untuk semua bila 1,25 × biaya putaran 1 ≤ sisa < 1,12', () => {
    const k = keputusanPutaran(2, 1.0, 0.8);
    expect(k.mulai).toBe(true);
    expect(k.pagu.opus).toBeCloseTo((0.6 * 1.0) / 1.12, 6);
    expect(k.pagu.haiku).toBeCloseTo((0.3 * 1.0) / 1.12, 6);
    expect(k.pagu.deepseek).toBeCloseTo((0.22 * 1.0) / 1.12, 6);
    expect(k.pagu.opus + k.pagu.haiku + k.pagu.deepseek).toBeLessThanOrEqual(1.0 + 1e-9);
  });
  it('putaran 2 tidak dijalankan untuk SIAPA PUN bila sisa < 1,25 × biaya putaran 1', () => {
    const k = keputusanPutaran(2, 1.0, 0.9);
    expect(k.mulai).toBe(false);
    expect(k.alasan).toMatch(/penulis mana pun/);
  });
});

describe('jalan berikutnya dari biaya nyata yang tercatat', () => {
  it('jalan pertama Opus-1 berpagu 0,60; sesudahnya Haiku-1 0,30, DeepSeek-1 0,22', () => {
    expect(rencanaJalanBerikut({})).toMatchObject({ slot: { id: 'm2d13-opus-1' }, pagu: 0.6 });
    expect(rencanaJalanBerikut({ 'm2d13-opus-1': 0.5 })).toMatchObject({ slot: { id: 'm2d13-haiku-1' }, pagu: 0.3 });
    expect(rencanaJalanBerikut({ 'm2d13-opus-1': 0.5, 'm2d13-haiku-1': 0.2 })).toMatchObject({ slot: { id: 'm2d13-deepseek-1' }, pagu: 0.22 });
  });
  it('putaran 2 memakai sisa pada AWAL putaran (biaya putaran 1), tidak berubah di tengah putaran', () => {
    const p1 = { 'm2d13-opus-1': 0.5, 'm2d13-haiku-1': 0.2, 'm2d13-deepseek-1': 0.15 }; // 0,85 → sisa 1,25 ≥ 1,12
    expect(rencanaJalanBerikut(p1)).toMatchObject({ slot: { id: 'm2d13-opus-2' }, pagu: 0.6 });
    expect(rencanaJalanBerikut({ ...p1, 'm2d13-opus-2': 0.59 })).toMatchObject({ slot: { id: 'm2d13-haiku-2' }, pagu: 0.3 });
    expect(rencanaJalanBerikut({ ...p1, 'm2d13-opus-2': 0.59, 'm2d13-haiku-2': 0.29 })).toMatchObject({ slot: { id: 'm2d13-deepseek-2' }, pagu: 0.22 });
  });
  it('biaya putaran 1 terlalu besar → berhenti sebelum Opus-2; tidak ada penulis yang mendapat jalan ke-2', () => {
    const r = rencanaJalanBerikut({ 'm2d13-opus-1': 0.6, 'm2d13-haiku-1': 0.3, 'm2d13-deepseek-1': 0.15 }); // 1,05 → sisa 1,05 < 1,3125
    expect('berhenti' in r).toBe(true);
  });
  it('putaran 2 diskalakan dari sisa awal putaran', () => {
    const r = rencanaJalanBerikut({ 'm2d13-opus-1': 0.45, 'm2d13-haiku-1': 0.3, 'm2d13-deepseek-1': 0.12 }); // 0,87 → sisa 1,23 ≥ 1,12 → penuh
    expect(r).toMatchObject({ pagu: 0.6 });
    const s = rencanaJalanBerikut({ 'm2d13-opus-1': 0.55, 'm2d13-haiku-1': 0.25, 'm2d13-deepseek-1': 0.2 }); // 1,00 → sisa 1,10; 1,25 × 1,00 = 1,25 > 1,10 → berhenti
    expect('berhenti' in s).toBe(true);
    const t = rencanaJalanBerikut({ 'm2d13-opus-1': 0.5, 'm2d13-haiku-1': 0.2, 'm2d13-deepseek-1': 0.12 }); // 0,82 → sisa 1,28 → penuh
    expect(t).toMatchObject({ pagu: 0.6 });
  });
  it('semua slot selesai → berhenti', () => {
    const semua = Object.fromEntries(urutanJalan().map((s) => [s.id, 0.1]));
    expect('berhenti' in rencanaJalanBerikut(semua)).toBe(true);
  });
});
