/**
 * Kalibrasi detektor M2d-11 atas bank sungguhan: ambang beku = keluaran aturan
 * mekanis; ≤ 1/6 soal tayang ditandai; recall dihitung dari himpunan
 * tertebak luar; keluaran tersimpan sama dengan hitungan ulang.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bankUjiUlang } from '../patokan/bank-lama.ts';
import { AMBANG_M2D11 } from './ambang.ts';
import { FOLDER_CACAT_M2D11, kalibrasiBank } from './kalibrasi.ts';

describe('kalibrasi detektor M2d-11', () => {
  const h = kalibrasiBank(bankUjiUlang());
  it('ambang beku = hasil aturan mekanis atas 6 soal tayang', () => {
    expect(AMBANG_M2D11).toEqual(h.ambang_akhir);
  });
  it('soal tayang yang ditandai ≤ 1/6 sesudah kalibrasi', () => {
    expect(h.tayang.ditandai_akhir * 6).toBeLessThanOrEqual(h.tayang.total);
  });
  it('recall dihitung atas 12 omongan tertebak luar', () => {
    expect(h.recall.total).toBe(12);
    expect(h.recall.menolak + h.recall.luput.length).toBe(12);
  });
  it.skipIf(!existsSync(`${FOLDER_CACAT_M2D11}/kalibrasi.json`))('keluaran tersimpan = hitungan ulang', () => {
    const simpan = JSON.parse(readFileSync(`${FOLDER_CACAT_M2D11}/kalibrasi.json`, 'utf8')) as unknown;
    expect(simpan).toEqual(JSON.parse(JSON.stringify(h)));
  });
});
