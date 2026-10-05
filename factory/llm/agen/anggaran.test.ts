/** M2d-28: guardrail budget diuji dengan angka tiga percobaan nyata yang dulu dihentikan terlalu cepat. */
import { describe, expect, it } from 'vitest';
import { median, paguKeras, putusanAnggaran } from './anggaran.ts';

const UJI = 0.12;

describe('guardrail budget', () => {
  it('median, batas keras', () => {
    expect(median([0.03, 0.26])).toBeCloseTo(0.145, 6);
    expect(median([0.0317, 0.2876, 0.147, 0.029, 0.0118])).toBeCloseTo(0.0317, 6);
    expect(paguKeras(1)).toBe(1.15);
  });
  it('m2d27-amag-naik-3 (budget 0,6; terpakai 0,2888; dua panggilan; tanpa draft siap): DULU berhenti, SEKARANG lanjut menulis', () => {
    const p = putusanAnggaran({ pagu: 0.6, terpakai: 0.2888, biayaPanggilan: [0.0325, 0.2563], cadanganUji: UJI, adaDrafSiap: false });
    expect(p).toMatchObject({ hemat: false, habis: false, tolak_panggilan: false });
  });
  it('m2d27-amag-naik-2 (budget 1; terpakai 0,6255; tanpa draft siap): SEKARANG lanjut', () => {
    const p = putusanAnggaran({ pagu: 1, terpakai: 0.6255, biayaPanggilan: [0.0331, 0.2571, 0.1026, 0.0185], cadanganUji: UJI, adaDrafSiap: false });
    expect(p.cadangan_menulis_usd).toBe(0.1);
    expect(p).toMatchObject({ hemat: false, habis: false });
  });
  it('m2d26-amag-naik-1 (budget 1; terpakai 0,6813; satu draft siap): SEKARANG lanjut', () => {
    const p = putusanAnggaran({ pagu: 1, terpakai: 0.6813, biayaPanggilan: [0.0317, 0.2876, 0.147, 0.029, 0.0118], cadanganUji: UJI, adaDrafSiap: true });
    expect(p).toMatchObject({ hemat: false, habis: false });
  });
  it('sisa sasaran tidak cukup untuk menulis + uji: mode hemat; ada draft siap → masih boleh mengajukan; tanpa draft siap → habis', () => {
    const dasar = { pagu: 1, terpakai: 0.85, biayaPanggilan: [0.03, 0.26, 0.1], cadanganUji: UJI };
    expect(putusanAnggaran({ ...dasar, adaDrafSiap: true })).toMatchObject({ hemat: true, habis: false, tolak_panggilan: false });
    expect(putusanAnggaran({ ...dasar, adaDrafSiap: false })).toMatchObject({ hemat: true, habis: true });
  });
  it('batas keras: budget + 15 %; di atasnya semua panggilan ditolak', () => {
    expect(putusanAnggaran({ pagu: 1, terpakai: 1.04, biayaPanggilan: [0.1], cadanganUji: UJI, adaDrafSiap: true })).toMatchObject({ tolak_panggilan: false });
    expect(putusanAnggaran({ pagu: 1, terpakai: 1.06, biayaPanggilan: [0.1], cadanganUji: UJI, adaDrafSiap: true })).toMatchObject({ tolak_panggilan: true, habis: true });
  });
});
