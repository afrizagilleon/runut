/**
 * M2d-8 T-05: laporan `docs/bukti/lingkar-agen-kalibrasi.md` = keluaran
 * `npm run kalibrasi:laporan` (dihitung ulang dari keluaran mentah + ledger).
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JALUR_LAPORAN_M2D8, bacaLedgerM2d8, bangunLaporan, peranM2d8 } from './kalibrasi-laporan.ts';
import { JALUR_LEDGER } from './pagu.ts';

describe('laporan M2d-8', () => {
  it.runIf(existsSync(JALUR_LEDGER))('docs/bukti/lingkar-agen-kalibrasi.md = keluaran `npm run kalibrasi:laporan`', () => {
    expect(readFileSync(JALUR_LAPORAN_M2D8, 'utf8')).toBe(bangunLaporan(bacaLedgerM2d8()));
  });

  it('laporan hanya menghitung tag m2d8/ (biaya milestone) dan m2d5/–m2d8/ (kumulatif)', () => {
    const e = (tag: string, biaya: number): Parameters<typeof bangunLaporan>[0][number] =>
      ({ waktu: '2026-09-30T00:00:00Z', model: 'z-ai/glm-5.3', tag, biaya_usd: biaya, token_keluar: 1, penyedia: 'Wafer' }) as Parameters<typeof bangunLaporan>[0][number];
    const md = bangunLaporan([e('m2d8/probe/kritikus/x', 0.1), e('m2d9/x', 5), e('m2d7/x', 1)]);
    expect(md).toContain('**US$0.1000 dalam 1 panggilan**');
    expect(md).toContain('Kumulatif ledger OpenRouter M2d-5…M2d-8: US$1.1000');
  });

  it('peran dari tag', () => {
    expect(peranM2d8('m2d8/jalan/tirt/p3/gerbang-tebak/o2/t1')).toBe('jalan TIRT · penebak');
    expect(peranM2d8('m2d8/kalibrasi/dada-s1/kritikus/t1')).toBe('kalibrasi · kritikus');
    expect(peranM2d8('m2d8/pemanasan/c1/susun/t1')).toBe('pemanasan · penulis (pemanasan)');
    expect(peranM2d8('m2d8/jalan/tirt/p1/tulis-pilihan/o1')).toBe('jalan TIRT · penulis (pilihan)');
  });
});
