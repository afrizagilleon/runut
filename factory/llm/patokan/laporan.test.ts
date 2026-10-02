/**
 * Laporan M2d-11 = hasil skrip (angka dari keluaran tersimpan + ledger).
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { bangunLaporan, JALUR_LAPORAN_M2D11 } from './laporan.ts';

describe.skipIf(!existsSync(`${AKAR}.cache/llm/ledger.jsonl`) || !existsSync(JALUR_LAPORAN_M2D11))('laporan M2d-11', () => {
  it('berkas laporan = hasil skrip', () => {
    expect(readFileSync(JALUR_LAPORAN_M2D11, 'utf8').replace(/\r\n/g, '\n')).toBe(bangunLaporan() + '\n');
  });
});
