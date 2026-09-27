/**
 * M2d T-06: kriteria uji tebak buta K-05 di laporan — "paling banyak 1 dari 3
 * benar DAN rata-rata keyakinan pada jawaban benar < 40%".
 */
import { describe, expect, it } from 'vitest';
import { jsonDari, lolosTebak } from './laporan.ts';

const j = (pilihan: string, yakin: number): { pilihan: string; yakin: number } => ({ pilihan, yakin });

describe('lolosTebak (K-05)', () => {
  it('0 dari 3 benar → lolos', () => {
    expect(lolosTebak([j('a', 90), j('b', 80), j('c', 70)], 'd')).toEqual({ benar: 0, yakinBenar: null, lolos: true });
  });
  it('1 dari 3 benar dengan keyakinan 35 → lolos; 40 → tidak', () => {
    expect(lolosTebak([j('d', 35), j('b', 80), j('c', 70)], 'd').lolos).toBe(true);
    expect(lolosTebak([j('d', 40), j('b', 80), j('c', 70)], 'd').lolos).toBe(false);
  });
  it('2 dari 3 benar → tidak lolos, walau yakinnya rendah', () => {
    expect(lolosTebak([j('d', 10), j('d', 10), j('c', 70)], 'd')).toMatchObject({ benar: 2, lolos: false });
  });
});

describe('jsonDari — jawaban mentah subagent', () => {
  it('membaca JSON di dalam pagar atau teks bebas', () => {
    expect(jsonDari('Ini jawabanku:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(jsonDari('{"b":2} selesai')).toEqual({ b: 2 });
    expect(() => jsonDari('tanpa json')).toThrow();
  });
});
