/**
 * Laporan M2d-10 (T-08): `docs/bukti/lingkar-agen-templat.md` = keluaran
 * `npm run templat:laporan` (hanya "Catatan penulis" ditulis tangan).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bagianTag, JALUR_LAPORAN_M2D10, peranTag, tulisLaporan } from './tulis-laporan.ts';

describe('laporan M2d-10', () => {
  it('berkas laporan = hasil skrip', () => {
    expect(readFileSync(JALUR_LAPORAN_M2D10, 'utf8')).toBe(tulisLaporan());
  });
  it('peran & bagian dari tag ledger', () => {
    expect(bagianTag('penyusun/m2d10-tirt/p1/kritikus/o1')).toBe('jalan TIRT');
    expect(peranTag('penyusun/m2d10-tirt/p1/kritikus/o1')).toBe('kritikus');
    expect(peranTag('m2d10/kalibrasi/x/gerbang-tebak/t1')).toBe('penebak');
    expect(peranTag('m2d10/pemanasan/c1/sempurnakan-pilihan/t1')).toBe('penyempurna');
  });
});
