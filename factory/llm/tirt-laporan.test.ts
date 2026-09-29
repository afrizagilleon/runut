/**
 * M2d-5 T-09: laporan `docs/bukti/lingkar-agen-tirt.md` dari keluaran mentah
 * (D-11). Dijaga: biaya per peran dan per penyedia dari ledger NYATA (tag
 * `m2d5/`, dipotong di akhir jalan), menjumlah ke total; probe terpisah;
 * penebak GLM dipisah dari DeepSeek; panggilan sesudah milestone dan tag lain
 * tidak mengubah laporan; berkas terlacak = hasil skrip.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import type { EntriLedger } from './pagu.ts';
import { bacaJalan, bangunLaporanTirt, kelompokkan, ledgerUntukLaporan, peranM2d5 } from './tirt-laporan.ts';
import { FOLDER_M2D5 } from './tirt-susun.ts';

const e = (tag: string, biaya: number, penyedia: string | null = 'DeepInfra', waktu = '2026-09-29T05:00:00.000Z'): EntriLedger => ({
  waktu, model: 'deepseek/deepseek-v4.1-flash', tag, percobaan_http: 1, status: 200, token_masuk: 1, token_keluar: 10, biaya_usd: biaya,
  dasar_biaya: 'usage-cost', perkiraan_maks_usd: biaya, latensi_ms: 1, galat: null, penyedia, token_penalaran: 5, tanpa_cost: false,
});

describe('biaya nyata per peran dan per penyedia (murni)', () => {
  it('peran dari tag; penebak ke-3 = GLM; probe terpisah', () => {
    expect(peranM2d5('m2d5/tirt/p1/susun/o1')).toBe('penulis');
    expect(peranM2d5('m2d5/tirt/p2/tulis-ulang/o2/u1')).toBe('penulis');
    expect(peranM2d5('m2d5/tirt/p1/gerbang-kartu/o1')).toBe('pembaca-kartu');
    expect(peranM2d5('m2d5/tirt/p1/gerbang-tebak/o1/t1')).toBe('penebak DeepSeek');
    expect(peranM2d5('m2d5/tirt/p1/gerbang-tebak/o1/t3/u1')).toBe('penebak GLM');
    expect(peranM2d5('m2d5/tirt/p1/kritikus/o3')).toBe('kritikus');
    expect(peranM2d5('m2d5/probe/kritikus/r8000')).toBe('probe');
  });

  it('kelompokkan menjumlah panggilan, biaya, token keluar per kunci', () => {
    const k = kelompokkan([e('a', 0.1, 'X'), e('b', 0.2, 'X'), e('c', 0.3, null)], (x) => x.penyedia ?? '(tidak disebut)');
    expect(k).toEqual({ X: { panggilan: 2, usd: expect.closeTo(0.3, 10) as number, token_keluar: 20 }, '(tidak disebut)': { panggilan: 1, usd: 0.3, token_keluar: 10 } });
  });
});

const ADA = bacaJalan().length > 0;

describe.skipIf(!ADA)('laporan dari keluaran sungguhan (butuh ledger .cache/)', () => {
  const { kini, featherless, lama } = ledgerUntukLaporan();
  const l = bangunLaporanTirt(kini, featherless, lama);
  type R = { biaya: { milestone_nyata_usd: number; per_peran: Record<string, { usd: number }>; per_penyedia: Record<string, { usd: number }> }; per_jalan: Array<{ biaya_ledger: number }>; featherless: { ledger_usd: number; entri: number } };
  const r = l.ringkasan as unknown as R;

  it.skipIf(!existsSync(`${AKAR}docs/bukti/lingkar-agen-tirt.md`))('docs/bukti/lingkar-agen-tirt.md dan ringkasan terlacak = hasil skrip atas keluaran mentah', () => {
    expect(l.md).toBe(readFileSync(`${AKAR}docs/bukti/lingkar-agen-tirt.md`, 'utf8'));
    expect(l.ringkasan).toEqual(JSON.parse(readFileSync(`${FOLDER_M2D5}/ringkasan.json`, 'utf8')));
  });

  it('per peran dan per penyedia menjumlah ke total milestone; total ≤ pagu US$4,00', () => {
    const jumlah = (o: Record<string, { usd: number }>): number => Object.values(o).reduce((a, x) => a + x.usd, 0);
    expect(jumlah(r.biaya.per_peran)).toBeCloseTo(r.biaya.milestone_nyata_usd, 10);
    expect(jumlah(r.biaya.per_penyedia)).toBeCloseTo(r.biaya.milestone_nyata_usd, 10);
    expect(r.biaya.milestone_nyata_usd).toBeLessThanOrEqual(4.0);
    expect(r.featherless.entri).toBe(886);
    expect(r.featherless.ledger_usd).toBeCloseTo(7.715018, 5);
  });

  it('panggilan sesudah milestone dan tag di luar m2d5/ tidak mengubah laporan', () => {
    const sesudah = bangunLaporanTirt([...kini, e('m2d5/tirt/p1/kritikus/o1', 9, 'X', '2099-01-01T00:00:00.000Z'), e('lain/x', 9)], featherless, lama);
    expect(sesudah.md).toBe(l.md);
  });
});
