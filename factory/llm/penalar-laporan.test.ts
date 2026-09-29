/**
 * M2d-6 T-07: laporan `docs/bukti/lingkar-agen-penalar.md` dari keluaran
 * mentah (D-8). Dijaga: biaya per peran dari ledger NYATA bertag `m2d6/`
 * (probe, kalibrasi, kritikus, jalan) menjumlah ke total; penebak GLM dipisah;
 * temuan M2d-5 dihitung dari ledger, bukan ditulis tangan; berkas terlacak =
 * hasil skrip.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import { JALUR_LEDGER } from './pagu.ts';
import { bacaJalanM2d6, bangunLaporanPenalar, ledgerUntukLaporanPenalar, peranM2d6 } from './penalar-laporan.ts';

describe('peran dari tag M2d-6 (murni)', () => {
  it('probe, kalibrasi, kritikus, dan peran lingkar per jalan; penebak ke-3 = GLM', () => {
    expect(peranM2d6('m2d6/probe/p1/kritikus/high-1')).toBe('probe');
    expect(peranM2d6('m2d6/kalibrasi/K3/s1/m2d5-tirt-o2/penebak/t1')).toBe('kalibrasi penebak');
    expect(peranM2d6('m2d6/kritikus/m2d5-tirt-o3/s1/kritikus')).toBe('kalibrasi kritikus');
    expect(peranM2d6('m2d6/jalan-1/tirt/p1/susun/o1')).toBe('penulis');
    expect(peranM2d6('m2d6/jalan-2/tirt/p3/tulis-ulang/o2/u1')).toBe('penulis');
    expect(peranM2d6('m2d6/jalan-1/tirt/p1/gerbang-kartu/o1')).toBe('pembaca-kartu');
    expect(peranM2d6('m2d6/jalan-1/tirt/p1/kritikus/o1/u1')).toBe('kritikus');
    expect(peranM2d6('m2d6/jalan-1/tirt/p1/gerbang-tebak/o1/t3')).toBe('penebak GLM');
    expect(peranM2d6('m2d6/jalan-1/tirt/p1/gerbang-tebak/o1/t1')).toBe('penebak DeepSeek');
    // M2d-6: ketiga penebak GLM — model entri yang menentukan.
    expect(peranM2d6('m2d6/jalan-1/tirt/p1/gerbang-tebak/o1/t1', 'z-ai/glm-5.3')).toBe('penebak GLM');
    expect(peranM2d6('m2d6/jalan-1/tirt/p1/gerbang-tebak/o1/t3', 'deepseek/deepseek-v4.1-flash')).toBe('penebak DeepSeek');
  });
});

describe.skipIf(!existsSync(JALUR_LEDGER) || bacaJalanM2d6().length === 0)('laporan dari keluaran sungguhan (butuh ledger .cache/)', () => {
  const { kini, featherless } = ledgerUntukLaporanPenalar();
  const l = bangunLaporanPenalar(kini, featherless);
  const r = l.ringkasan as {
    biaya: { milestone_nyata_usd: number; panggilan: number; per_peran: Record<string, { usd: number; panggilan: number }> };
    temuan_m2d5: { kritikus_keberatan: number; penalaran: Record<string, { maks: number | null }> };
  };

  it('biaya per peran menjumlah ke total M2d-6; total = jumlah entri ledger m2d6/ sampai jalan terakhir selesai', () => {
    const jumlah = Object.values(r.biaya.per_peran).reduce((a, x) => a + x.usd, 0);
    expect(jumlah).toBeCloseTo(r.biaya.milestone_nyata_usd, 9);
    expect(Object.values(r.biaya.per_peran).reduce((a, x) => a + x.panggilan, 0)).toBe(r.biaya.panggilan);
    expect(r.biaya.milestone_nyata_usd).toBeLessThanOrEqual(3.5);
    expect(Object.keys(r.biaya.per_peran)).not.toContain('lain');
  });

  it('temuan M2d-5 dari ledger: kritikus 0 keberatan, penalaran kritikus maks 260, penebak GLM maks 123', () => {
    expect(r.temuan_m2d5.kritikus_keberatan).toBe(0);
    expect(r.temuan_m2d5.penalaran['kritikus']?.maks).toBe(260);
    expect(r.temuan_m2d5.penalaran['penebak GLM']?.maks).toBe(123);
  });

  it.runIf(existsSync(`${AKAR}docs/bukti/lingkar-agen-penalar.md`))('berkas terlacak = hasil skrip', () => {
    expect(readFileSync(`${AKAR}docs/bukti/lingkar-agen-penalar.md`, 'utf8')).toBe(l.md);
  });
});
