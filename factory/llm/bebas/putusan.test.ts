/** Ambang putusan H1–H4 = pra-registrasi M2d-13 §2. */
import { describe, expect, it } from 'vitest';
import { putusanH1a, putusanH1b, putusanH2, putusanH3b, putusanH4, putusanSelisih, type UkuranH4 } from './putusan.ts';

describe('H1', () => {
  it('H1a: ≥ 2 dari 3 berbias mendukung; 0 tidak; 1 tak bisa; n < 200 tak bisa', () => {
    const x = (bias: boolean, n = 250): { bias: boolean; n: number } => ({ bias, n });
    expect(putusanH1a([x(true), x(true), x(false)])).toBe('mendukung');
    expect(putusanH1a([x(false), x(false), x(false)])).toBe('tidak mendukung');
    expect(putusanH1a([x(true), x(false), x(false)])).toBe('tak bisa disimpulkan');
    expect(putusanH1a([x(false, 120), x(false), x(false)])).toBe('tak bisa disimpulkan');
  });
  it('H1b: 0,40 gabungan + 2 penulis ≥ 0,35; ≤ 0,30 tidak; butir < 4 tak bisa', () => {
    expect(putusanH1b(0.4, [0.35, 0.36, 0.2], 6)).toBe('mendukung');
    expect(putusanH1b(0.4, [0.34, 0.36, 0.2], 6)).toBe('tak bisa disimpulkan');
    expect(putusanH1b(0.3, [0.3, 0.3, 0.3], 6)).toBe('tidak mendukung');
    expect(putusanH1b(0.5, [0.5, 0.5, 0.5], 3)).toBe('tak bisa disimpulkan');
  });
});

describe('H2', () => {
  it('keduanya ≤ −0,10 mendukung; keduanya ≥ 0 tidak; campur tak bisa', () => {
    expect(putusanH2(-0.1, -0.12, 6)).toBe('mendukung');
    expect(putusanH2(0, 0.2, 6)).toBe('tidak mendukung');
    expect(putusanH2(-0.2, 0.1, 6)).toBe('tak bisa disimpulkan');
    expect(putusanH2(-0.2, -0.2, 3)).toBe('tak bisa disimpulkan');
  });
});

describe('H3', () => {
  it('H3a ≤ −0,15; H3b S ≥ +1,0', () => {
    expect(putusanSelisih(-0.15, -0.15, 4)).toBe('mendukung');
    expect(putusanSelisih(0, -0.15, 4)).toBe('tidak mendukung');
    expect(putusanSelisih(-0.1, -0.15, 4)).toBe('tak bisa disimpulkan');
    expect(putusanH3b(1, 4)).toBe('mendukung');
    expect(putusanH3b(0, 4)).toBe('tidak mendukung');
    expect(putusanH3b(0.5, 4)).toBe('tak bisa disimpulkan');
  });
});

describe('H4', () => {
  const u = (L: number, vRata: number, glm: number | null, opus: number | null, vpl: number | null = 3): UkuranH4 => ({ L, vRata, q: { glm, opus }, versiPerLulus: vpl });
  it('mendukung hanya bila keempat syarat terpenuhi menurut KEDUA penilai', () => {
    expect(putusanH4(u(4, 2, 8, 8), [u(3, 2.5, 6, 6), u(2, 2.8, 5, 6)], { glm: 6, opus: 6 }).putusan).toBe('mendukung');
  });
  it('satu penilai saja → tak bisa disimpulkan (sementara), walau unggul jauh', () => {
    const r = putusanH4(u(4, 2, 9, null), [u(3, 2.5, 5, null), u(2, 2.8, 5, null)], { glm: 5, opus: null });
    expect(r).toMatchObject({ putusan: 'tak bisa disimpulkan', sementara: true });
  });
  it('L_Opus ≤ max(L lain) − 1 → tidak mendukung', () => {
    expect(putusanH4(u(2, 2, 8, 8), [u(3, 2.5, 6, 6), u(1, 2.8, 5, 6)], { glm: 6, opus: 6 }).putusan).toBe('tidak mendukung');
  });
  it('mutu lebih rendah ≥ 1 menurut kedua penilai → tidak mendukung', () => {
    expect(putusanH4(u(3, 2, 5, 5), [u(3, 2.5, 6, 6), u(2, 2.8, 5, 6)], { glm: 6, opus: 6 }).putusan).toBe('tidak mendukung');
  });
  it('versi per omongan lulus ≥ 9,7 atau L tidak unggul → tak bisa disimpulkan', () => {
    expect(putusanH4(u(4, 2, 8, 8, 9.7), [u(3, 2.5, 6, 6), u(2, 2.8, 5, 6)], { glm: 6, opus: 6 }).putusan).toBe('tak bisa disimpulkan');
    expect(putusanH4(u(3, 2, 8, 8), [u(3, 2.5, 6, 6), u(2, 2.8, 5, 6)], { glm: 6, opus: 6 }).putusan).toBe('tak bisa disimpulkan');
  });
});
