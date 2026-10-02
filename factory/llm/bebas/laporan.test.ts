/** Laporan M2d-13 (D-E) = hasil skrip dari keluaran tersimpan; Spearman. */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bangunLaporan, JALUR_LAPORAN, spearman } from './laporan.ts';

describe('laporan M2d-13', () => {
  it.skipIf(!existsSync(JALUR_LAPORAN))('berkas laporan = keluaran `npm run penulis:laporan`', () => {
    expect(readFileSync(JALUR_LAPORAN, 'utf8').replace(/\r\n/g, '\n')).toBe(bangunLaporan());
  });
  it('Spearman: urutan sama 1, terbalik −1, peringkat seri dirata-rata', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 2, 3], [1, 2, 3, 4])).toBeGreaterThan(0.9);
    expect(spearman([1, 2], [1, 2])).toBeNull();
  });
});
