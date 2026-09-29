/**
 * M2d-4 T-07: laporan lingkar gaya & makna dari keluaran mentah (D-9).
 * Dijaga: biaya per peran dari tag ledger dengan tambahan GLM penebak
 * terpisah; ledger dipotong di akhir milestone dan hanya tag `m2d4/`; ledger
 * arsip dilaporkan totalnya, tidak masuk milestone; panjang & bentuk pilihan
 * dihitung dengan fungsi gerbang; berkas laporan terlacak = hasil skrip.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import { bangunLaporanGaya, bentukOmongan, biayaGaya, ringkasBentuk } from './gaya-laporan.ts';
import { FOLDER_M2D4 } from './gaya-susun.ts';
import { MODEL_AGEN, MODEL_KRITIKUS } from './model.ts';
import { FOLDER_ARSIP_LEDGER, JALUR_ARSIP_FEATHERLESS, JALUR_LEDGER, type EntriLedger } from './pagu.ts';

const e = (tag: string, biaya: number, model: string = MODEL_AGEN, waktu = '2026-09-28T20:00:00.000Z'): EntriLedger => ({
  waktu, model, tag, percobaan_http: 1, status: 200, token_masuk: 1, token_keluar: 1, biaya_usd: biaya,
  dasar_biaya: 'usage', perkiraan_maks_usd: biaya, latensi_ms: 1, galat: null,
});
const baca = (jalur: string): EntriLedger[] =>
  existsSync(jalur) ? readFileSync(jalur, 'utf8').split(/\r?\n/).filter((b) => b.trim() !== '').map((b) => JSON.parse(b) as EntriLedger) : [];

describe('biaya dan bentuk (murni)', () => {
  it('biaya per peran; penebak dipisah DeepSeek vs GLM (tambahan GLM, D-5)', () => {
    const b = biayaGaya([
      e('m2d4/t/p1/susun/o1', 0.01), e('m2d4/t/p1/kritikus/o1', 0.05, MODEL_KRITIKUS),
      e('m2d4/t/p1/gerbang-tebak/o1/t1', 0.002), e('m2d4/t/p1/gerbang-tebak/o1/t3', 0.02, MODEL_KRITIKUS),
    ]);
    expect(b.penebak).toBeCloseTo(0.022, 10);
    expect(b.penebak_glm).toBeCloseTo(0.02, 10);
    expect(b.penebak_deepseek).toBeCloseTo(0.002, 10);
    expect(b.kritikus).toBeCloseTo(0.05, 10);
  });

  it('bentuk: kata dihitung seperti G-panjang, pilihan berekor seperti G-satu-klausa, "gue" seperti G-register', () => {
    const o = {
      pesan: 'Gue yakin [[x|22 kali]] naiknya.',
      pilihan: { a: 'Betul, naiknya [[x|22 kali]].', b: 'Keliru, naiknya pelan, jadi aman.', c: 'Betul, dividennya Rp130, bukan Rp45.', d: 'Keliru, turun.' },
    };
    expect(bentukOmongan(o)).toEqual({ kata_pesan: 5, kata_pilihan: [4, 5, 5, 2], pilihan_berekor: 1, pakai_gue: true });
    expect(ringkasBentuk([bentukOmongan(o)], 4)).toMatchObject({ omongan: 1, pilihan_maks: 5, pilihan_lewat_batas: 2, pilihan_berekor: 1, pesan_gue: 1 });
  });
});

const ADA = existsSync(`${FOLDER_M2D4}/ultj/riwayat.json`) && (existsSync(JALUR_LEDGER) || existsSync(JALUR_ARSIP_FEATHERLESS));

describe.skipIf(!ADA)('laporan dari keluaran sungguhan (butuh ledger .cache/)', () => {
  // M2d-5 D-0: ledger yang memuat M2d-4 dipindah ke arsip Featherless; laporan M2d-4 membacanya dari sana.
  const kini = baca(existsSync(JALUR_ARSIP_FEATHERLESS) ? JALUR_ARSIP_FEATHERLESS : JALUR_LEDGER);
  const arsip = existsSync(FOLDER_ARSIP_LEDGER)
    ? readdirSync(FOLDER_ARSIP_LEDGER).filter((x) => /^ledger-sampai-.*\.jsonl$/.test(x)).sort().flatMap((x) => baca(`${FOLDER_ARSIP_LEDGER}/${x}`))
    : [];
  const l = bangunLaporanGaya(kini, arsip);
  type R = { biaya: { milestone_ledger_usd: number; ledger_arsip_usd: number; per_peran: Record<string, number>; di_luar_jalan: Record<string, { usd: number }> }; per_simulasi: Array<{ biaya_ledger: number }> };
  const r = l.ringkasan as R;

  it('docs/bukti/lingkar-agen-gaya.md dan ringkasan terlacak = hasil skrip atas keluaran mentah', () => {
    expect(l.md).toBe(readFileSync(`${AKAR}docs/bukti/lingkar-agen-gaya.md`, 'utf8'));
    expect(l.ringkasan).toEqual(JSON.parse(readFileSync(`${FOLDER_M2D4}/ringkasan.json`, 'utf8')));
  });

  it('panggilan sesudah milestone dan tag di luar m2d4/ tidak mengubah laporan; arsip tidak masuk biaya milestone', () => {
    const sesudah = bangunLaporanGaya([...kini, e('m2d4/tirt/p1/kritikus/o1', 9, MODEL_KRITIKUS, '2099-01-01T00:00:00.000Z'), e('lain/x', 9, MODEL_AGEN, '2099-01-01T00:00:00.000Z')], arsip);
    expect(sesudah.md).toBe(l.md);
    // Tag di luar m2d4/ di dalam jendela milestone tidak masuk biaya milestone.
    const tagLain = bangunLaporanGaya([...kini, e('lain/x', 9)], arsip).ringkasan as R;
    expect(tagLain.biaya.milestone_ledger_usd).toBeCloseTo(r.biaya.milestone_ledger_usd, 10);
    expect(r.biaya.milestone_ledger_usd).toBeLessThanOrEqual(4.0);
    expect(r.biaya.ledger_arsip_usd).toBeCloseTo(arsip.reduce((a, x) => a + x.biaya_usd, 0), 10);
    const tanpaArsip = bangunLaporanGaya(kini, []).ringkasan as R;
    expect(tanpaArsip.biaya.milestone_ledger_usd).toBeCloseTo(r.biaya.milestone_ledger_usd, 10);
  });

  it('per peran menjumlah ke total milestone; tiga jalan + di luar jalan = total', () => {
    const p = r.biaya.per_peran;
    expect((p['penulis'] ?? 0) + (p['pembaca-kartu'] ?? 0) + (p['penebak'] ?? 0) + (p['kritikus'] ?? 0) + (p['lain'] ?? 0)).toBeCloseTo(r.biaya.milestone_ledger_usd, 10);
    const jalan = r.per_simulasi.reduce((a, s) => a + s.biaya_ledger, 0);
    const luar = Object.values(r.biaya.di_luar_jalan).reduce((a, x) => a + x.usd, 0);
    expect(jalan + luar).toBeCloseTo(r.biaya.milestone_ledger_usd, 10);
  });
});
