/**
 * M2d-4 T-05: arsip ledger + skrip jalan sungguhan (D-0, D-7).
 *
 * Dijaga: ledger lama DIPINDAH utuh ke arsip (byte-sama, tidak dihapus, tidak
 * ditimpa), pagu mulai dari nol sesudahnya, laporan lama tetap membaca
 * riwayat lengkap; pagu milestone M2d-4 US$4,00 ditetapkan kode; saldo
 * penyedia habis menghentikan lingkar; tag `m2d4/`, generasi M2d-4, dua model.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GENERASI_M2D4, jalankanPeran, type PanggilPeran } from './agen-peran.ts';
import type { DrafSimulasi } from './draf.ts';
import { AKAR } from './env.ts';
import { adaEntriMilestone } from './gaya-arsip.ts';
import { AWALAN_TAG_M2D4, KONFIG_M2D4, PAGU_MILESTONE_M2D4, URUTAN_GAYA, argumenGaya, ledgerSudahDiarsipkan } from './gaya-susun.ts';
import { MODEL_AGEN, MODEL_KRITIKUS } from './model.ts';
import { PaguMilestoneTercapai, PaguTercapai, PencatatBiaya, SaldoPenyediaHabis, arsipkanLedger, bacaLedgerSemua, galatSaldo, type EntriLedger } from './pagu.ts';
// Tes mekanisme pagu era Featherless (token × tabel): tabel usang diberikan eksplisit; pagu M2d-5 memakai HARGA (max_price).
import { HARGA_FEATHERLESS_USANG as FL } from './harga.ts';
import type { PaketFakta } from './paket.ts';
import { KONFIG_M2D3, tagPeran, ubahGalatSaldo } from './peran-susun.ts';
import { GalatLlm } from './klien.ts';
import { validasiDraf } from './validasi.ts';

const e = (tag: string, biaya: number, waktu: string): EntriLedger => ({
  waktu, model: MODEL_AGEN, tag, percobaan_http: 1, status: 200, token_masuk: 1, token_keluar: 1, biaya_usd: biaya,
  dasar_biaya: 'usage', perkiraan_maks_usd: biaya, latensi_ms: 1, galat: null,
});
const tulisLedger = (jalur: string, entri: EntriLedger[]): void => {
  mkdirSync(join(jalur, '..'), { recursive: true });
  writeFileSync(jalur, entri.map((x) => JSON.stringify(x)).join('\n') + '\n', 'utf8');
};
const sha = (jalur: string): string => createHash('sha256').update(readFileSync(jalur)).digest('hex');

function ruang(): { jalur: string; arsip: string } {
  const d = mkdtempSync(join(tmpdir(), 'm2d4-arsip-'));
  return { jalur: join(d, 'llm', 'ledger.jsonl'), arsip: join(d, 'llm', 'arsip') };
}

describe('arsip ledger (D-0: pagu "reset lagi menjadi $5", riwayat tidak dihapus)', () => {
  it('ledger dipindah UTUH ke arsip/ledger-sampai-<tanggal entri terakhir>.jsonl; byte-sama; pagu sesudahnya mulai dari nol', () => {
    const { jalur, arsip } = ruang();
    tulisLedger(jalur, [e('tanding/x', 1.25, '2026-09-27T10:00:00.000Z'), e('m2d3/tirt/p1/susun/o1', 2.5, '2026-09-28T16:29:33.945Z')]);
    const asli = sha(jalur);
    const h = arsipkanLedger(jalur, arsip);
    expect(h).toMatchObject({ entri: 2, sha256: asli, pertama: '2026-09-27T10:00:00.000Z', terakhir: '2026-09-28T16:29:33.945Z' });
    expect(h.total_usd).toBeCloseTo(3.75, 10);
    expect(h.jalur).toBe(`${arsip}/ledger-sampai-2026-09-28.jsonl`);
    expect(sha(h.jalur)).toBe(asli);
    expect(existsSync(jalur)).toBe(false);
    const p = new PencatatBiaya({ paguUsd: 5, jalurLedger: jalur, harga: FL });
    expect(p.total()).toBe(0);
  });

  it('arsip tidak pernah ditimpa; ledger kosong atau tidak ada tidak diarsipkan', () => {
    const { jalur, arsip } = ruang();
    tulisLedger(jalur, [e('a', 1, '2026-09-28T01:00:00.000Z')]);
    arsipkanLedger(jalur, arsip);
    tulisLedger(jalur, [e('b', 2, '2026-09-28T02:00:00.000Z')]);
    expect(() => arsipkanLedger(jalur, arsip)).toThrow(/sudah ada; arsip tidak pernah ditimpa/);
    expect(bacaLedgerSemua(jalur, arsip).map((x) => x.tag)).toEqual(['a', 'b']);
    const kosong = ruang();
    expect(() => arsipkanLedger(kosong.jalur, kosong.arsip)).toThrow(/Tidak ada ledger/);
    tulisLedger(kosong.jalur, []);
    expect(() => arsipkanLedger(kosong.jalur, kosong.arsip)).toThrow(/kosong/);
  });

  it('laporan membaca riwayat lengkap (arsip, urut nama, lalu ledger kini); pagu hanya ledger kini', () => {
    const { jalur, arsip } = ruang();
    tulisLedger(join(arsip, 'ledger-sampai-2026-09-20.jsonl'), [e('lama1', 1, '2026-09-20T00:00:00.000Z')]);
    tulisLedger(join(arsip, 'ledger-sampai-2026-09-28.jsonl'), [e('lama2', 2, '2026-09-28T00:00:00.000Z')]);
    writeFileSync(join(arsip, 'catatan.txt'), 'bukan ledger', 'utf8');
    tulisLedger(jalur, [e('m2d4/tirt/p1/susun/o1', 0.5, '2026-09-29T01:00:00.000Z')]);
    expect(bacaLedgerSemua(jalur, arsip).map((x) => x.tag)).toEqual(['lama1', 'lama2', 'm2d4/tirt/p1/susun/o1']);
    expect(new PencatatBiaya({ paguUsd: 5, jalurLedger: jalur, harga: FL }).total()).toBeCloseTo(0.5, 10);
    expect(ledgerSudahDiarsipkan(arsip)).toBe(true);
    expect(ledgerSudahDiarsipkan(join(arsip, 'tidak-ada'))).toBe(false);
  });

  it('gaya:arsip menolak ledger yang sudah memuat panggilan m2d4/ (pagu milestone tidak boleh disetel ulang)', () => {
    const { jalur } = ruang();
    tulisLedger(jalur, [e('m2d3/x', 1, '2026-09-28T00:00:00.000Z')]);
    expect(adaEntriMilestone(jalur, AWALAN_TAG_M2D4)).toBe(false);
    tulisLedger(jalur, [e('m2d3/x', 1, '2026-09-28T00:00:00.000Z'), e('m2d4/tirt/p1/susun/o1', 1, '2026-09-29T00:00:00.000Z')]);
    expect(adaEntriMilestone(jalur, AWALAN_TAG_M2D4)).toBe(true);
  });
});

describe('gaya:susun — konfigurasi M2d-4', () => {
  it('pagu milestone US$4,00 ditetapkan: bawaan 4,00; nilai lain ditolak', () => {
    expect(PAGU_MILESTONE_M2D4).toBe(4);
    expect(argumenGaya(['tirt'])).toEqual(['tirt', '--pagu-milestone', '4.00']);
    expect(argumenGaya(['ultj', '--pagu-milestone', '4.00', '--ulang'])).toEqual(['ultj', '--pagu-milestone', '4.00', '--ulang']);
    expect(argumenGaya(['dada', '--pagu-milestone', '5'])).toMatch(/ditetapkan US\$4\.00/);
  });

  it('pagu milestone dihitung dari entri m2d4/ saja dan dicek sebelum kirim', () => {
    const { jalur } = ruang();
    tulisLedger(jalur, [e('m2d3/lama', 3.9, '2026-09-28T00:00:00.000Z'), e('m2d4/tirt/p1/susun/o1', 3.99, '2026-09-29T00:00:00.000Z')]);
    const p = new PencatatBiaya({ paguUsd: 100, jalurLedger: jalur, harga: FL, paguMilestone: { usd: PAGU_MILESTONE_M2D4, awalanTag: AWALAN_TAG_M2D4 } });
    expect(p.totalMilestone()).toBeCloseTo(3.99, 10);
    expect(() => p.periksa(MODEL_KRITIKUS, [{ role: 'user', content: 'x'.repeat(100) }], 16_384, 'm2d4/tirt/p2/kritikus/o1')).toThrow(PaguMilestoneTercapai);
    expect(() => p.periksa(MODEL_AGEN, [{ role: 'user', content: 'x' }], 10, 'm2d3/tirt/p2/susun/o1')).toThrow(/di luar awalan milestone/);
  });

  it('tag m2d4/, generasi M2d-4, dua model, urutan TIRT → ULTJ → DADA, keluaran eval/keluaran-m2d4/; M2d-3 tidak berubah', () => {
    expect(KONFIG_M2D4).toMatchObject({ awalanTag: 'm2d4/', generasi: GENERASI_M2D4, folder: `${AKAR}eval/keluaran-m2d4`, sisaMinimum: null });
    expect([...KONFIG_M2D4.izinModel].sort()).toEqual([MODEL_AGEN, MODEL_KRITIKUS].sort());
    expect(URUTAN_GAYA).toEqual(['tirt', 'ultj', 'dada']);
    expect(KONFIG_M2D3).toMatchObject({ awalanTag: 'm2d3/', folder: `${AKAR}eval/keluaran-m2d3` });
    const info = { jenis: 'gerbang-tebak' as const, putaran: 3, omongan: 2, ke: 3, ulang: 1, peran: 'penebak' as const, model: MODEL_KRITIKUS };
    expect(tagPeran('ultj', info, AWALAN_TAG_M2D4)).toBe('m2d4/ultj/p3/gerbang-tebak/o2/t3/u1');
    expect(tagPeran('ultj', info)).toBe('m2d3/ultj/p3/gerbang-tebak/o2/t3/u1');
  });
});

describe('saldo penyedia habis (§0: berhenti dan laporkan)', () => {
  it('HTTP 402/403 atau pesan saldo = saldo habis; 5xx bukan', () => {
    expect(galatSaldo(402, 'x')).toBe(true);
    expect(galatSaldo(403, 'x')).toBe(true);
    expect(galatSaldo(400, 'Insufficient balance for this request')).toBe(true);
    expect(galatSaldo(500, 'internal error')).toBe(false);
    expect(galatSaldo(null, 'timeout')).toBe(false);
    expect(ubahGalatSaldo(new GalatLlm('Panggilan gagal: HTTP 402 — payment required', 402), MODEL_AGEN)).toBeInstanceOf(SaldoPenyediaHabis);
    const lain = new GalatLlm('HTTP 503', 503);
    expect(ubahGalatSaldo(lain, MODEL_AGEN)).toBe(lain);
    const s = new SaldoPenyediaHabis('HTTP 402 — payment required', 402, MODEL_AGEN);
    expect(s).toBeInstanceOf(PaguTercapai);
    expect(s.message).toMatch(/^Saldo penyedia habis \(HTTP 402\)/);
  });

  it('saldo habis di panggilan penulis menghentikan lingkar seketika — tidak ada panggilan sesudahnya', async () => {
    const paket = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/tirt.json`, 'utf8')) as PaketFakta;
    const draf = (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/sel-putaran2/tirt--deepseek_ai_DeepSeek_V4.1_Flash.json`, 'utf8')) as { draf: DrafSimulasi }).draf;
    let n = 0;
    const panggil: PanggilPeran = async (_p, _s, info) => {
      n += 1;
      if (info.peran === 'penulis' && info.omongan === 2) throw new SaldoPenyediaHabis('HTTP 402', 402, info.model);
      return { teks: JSON.stringify({ omongan: [{ no: info.omongan, ...draf.omongan[(info.omongan ?? 1) - 1] }] }), token_masuk: 1, token_keluar: 1, latensi_ms: 1, finish_reason: 'stop', biaya_usd: 0 };
    };
    const hasil = await jalankanPeran({ paket, panggil, validasi: validasiDraf, generasi: GENERASI_M2D4, jam: () => new Date('2026-09-29T00:00:00Z') });
    expect(hasil.lolos).toBe(false);
    expect(hasil.berhenti).toMatch(/^pagu tercapai: Saldo penyedia habis \(HTTP 402\)/);
    expect(n).toBe(2);
  });
});
