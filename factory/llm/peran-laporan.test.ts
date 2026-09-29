/**
 * M2d-3 T-07: laporan lingkar berperan dari keluaran mentah (D-8).
 * Dijaga: biaya per peran dihitung dari tag ledger; ledger dipotong di akhir
 * milestone (laporan tidak berubah oleh panggilan sesudahnya) dan hanya tag
 * `m2d3/` yang masuk biaya milestone.
 */
import { describe, expect, it } from 'vitest';
import { bacaLedger } from './agen-laporan.ts';
import { bacaLedgerSemua, type EntriLedger } from './pagu.ts';
import { biayaPerPeran, bangunLaporanPeran, peranDariTag } from './peran-laporan.ts';
import { bacaRiwayatPeran } from './peran-penguji.ts';

const e = (tag: string, biaya: number, waktu = '2026-09-28T10:00:00.000Z'): EntriLedger => ({
  waktu, model: 'm', tag, percobaan_http: 1, status: 200, token_masuk: 1, token_keluar: 1, biaya_usd: biaya,
  dasar_biaya: 'usage', perkiraan_maks_usd: biaya, latensi_ms: 1, galat: null,
});

describe('biaya per peran dari tag ledger', () => {
  it('tag → peran', () => {
    expect(peranDariTag('m2d3/tirt/p1/susun/o1')).toBe('penulis');
    expect(peranDariTag('m2d3/tirt/p3/tulis-ulang/o2/u1')).toBe('penulis');
    expect(peranDariTag('m2d3/dada/p2/gerbang-kartu/o1')).toBe('pembaca-kartu');
    expect(peranDariTag('m2d3/dada/p2/gerbang-tebak/o1/t3')).toBe('penebak');
    expect(peranDariTag('m2d3/ultj/p9/kritikus/o3/u1')).toBe('kritikus');
    expect(peranDariTag('m2d3/tirt/KOREKSI/jalan1/p1/gerbang-tebak/o3/t1')).toBe('lain');
  });

  it('jumlah per peran dan jumlah panggilan', () => {
    const b = biayaPerPeran([e('m2d3/t/p1/susun/o1', 0.01), e('m2d3/t/p1/kritikus/o1', 0.03), e('m2d3/t/p1/kritikus/o2', 0.02), e('m2d3/t/p1/gerbang-tebak/o1/t1', 0.001)]);
    expect(b.penulis).toBeCloseTo(0.01, 10);
    expect(b.kritikus).toBeCloseTo(0.05, 10);
    expect(b.penebak).toBeCloseTo(0.001, 10);
    expect(b.panggilan).toEqual({ penulis: 1, kritikus: 2, penebak: 1 });
  });
});

// Riwayat biaya = arsip (M2d-4) + ledger kini.
const ADA = bacaLedgerSemua().length > 0 && bacaRiwayatPeran('tirt') !== null;

describe.skipIf(!ADA)('laporan dari keluaran sungguhan (butuh ledger .cache/)', () => {
  it('panggilan sesudah milestone dan tag di luar m2d3/ tidak mengubah laporan', () => {
    const ledger = bacaLedger();
    const a = bangunLaporanPeran(ledger);
    const sesudah = bangunLaporanPeran([...ledger, e('m2d3/tirt/p1/kritikus/o1', 9, '2099-01-01T00:00:00.000Z'), e('agen/x/p1/susun/o1', 9, '2099-01-01T00:00:00.000Z')]);
    expect(sesudah.md).toBe(a.md);
    const milestone = (l: typeof a): number => (l.ringkasan as { biaya: { milestone_ledger_usd: number } }).biaya.milestone_ledger_usd;
    const lain = bangunLaporanPeran([...ledger, e('m2d4/x/p1/susun/o1', 9, '2026-09-28T09:00:00.000Z')]);
    expect(milestone(lain)).toBeCloseTo(milestone(a), 10);
  });

  it('biaya milestone = jumlah entri m2d3/ di ledger; per peran menjumlah ke total', () => {
    const l = bangunLaporanPeran(bacaLedger()).ringkasan as { biaya: { milestone_ledger_usd: number; per_peran: Record<string, number> } };
    const p = l.biaya.per_peran;
    expect((p['penulis'] ?? 0) + (p['pembaca-kartu'] ?? 0) + (p['penebak'] ?? 0) + (p['kritikus'] ?? 0) + (p['lain'] ?? 0)).toBeCloseTo(l.biaya.milestone_ledger_usd, 10);
  });
});
