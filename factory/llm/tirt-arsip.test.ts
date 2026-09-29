/**
 * M2d-5 D-0: arsip ledger Featherless sebelum panggilan OpenRouter pertama —
 * dipindah utuh (tidak dihapus, tidak ditimpa); laporan tetap membaca seluruh
 * riwayat urut waktu; lingkar M2d-5 menolak jalan bila ledger kini masih
 * memuat panggilan Featherless.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JALUR_ARSIP_FEATHERLESS, arsipkanLedger, bacaLedgerSemua, berkasArsip } from './pagu.ts';
import { AWALAN_ARSIP_FEATHERLESS } from './tirt-arsip.ts';
import { siapOpenRouter } from './tirt-susun.ts';

const baris = (tag: string, waktu: string, biaya: number): string =>
  JSON.stringify({ waktu, model: 'm', tag, percobaan_http: 1, status: 200, token_masuk: 1, token_keluar: 1, biaya_usd: biaya, dasar_biaya: 'usage', perkiraan_maks_usd: biaya, latensi_ms: 1, galat: null });

describe('arsip ledger Featherless (M2d-5 D-0)', () => {
  it('nama arsip = ledger-featherless-sampai-<tanggal entri terakhir>.jsonl; byte-sama; ledger kini hilang (mulai dari nol)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm2d5-arsip-'));
    const jalur = join(dir, 'ledger.jsonl');
    const folder = join(dir, 'arsip');
    const isi = [baris('m2d4/tirt/p1/susun/o1', '2026-09-28T17:53:42.809Z', 0.5), baris('m2d4/dada/p11/gerbang-kartu/o3', '2026-09-29T00:21:43.115Z', 0.25)].join('\n') + '\n';
    writeFileSync(jalur, isi);
    const h = arsipkanLedger(jalur, folder, AWALAN_ARSIP_FEATHERLESS);
    expect(h.jalur).toBe(`${folder}/ledger-featherless-sampai-2026-09-29.jsonl`);
    expect(h).toMatchObject({ entri: 2, total_usd: 0.75 });
    expect(createHash('sha256').update(readFileSync(h.jalur)).digest('hex')).toBe(createHash('sha256').update(isi).digest('hex'));
    expect(existsSync(jalur)).toBe(false);
    // Tidak pernah menimpa.
    writeFileSync(jalur, isi);
    expect(() => arsipkanLedger(jalur, folder, AWALAN_ARSIP_FEATHERLESS)).toThrow(/tidak pernah ditimpa/);
    expect(() => arsipkanLedger(jalur, folder, 'ledger-../../x-sampai-')).toThrow(/tidak dikenal/);
    expect(JALUR_ARSIP_FEATHERLESS).toMatch(/\/arsip\/ledger-featherless-sampai-2026-09-29\.jsonl$/);
  });

  it('laporan membaca SELURUH riwayat urut waktu: arsip 28 Sep, lalu arsip Featherless 29 Sep, lalu ledger kini', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm2d5-baca-'));
    const folder = join(dir, 'arsip');
    mkdirSync(folder);
    writeFileSync(join(folder, 'ledger-featherless-sampai-2026-09-29.jsonl'), baris('m2d4', '2026-09-29T00:00:00Z', 1) + '\n');
    writeFileSync(join(folder, 'ledger-sampai-2026-09-28.jsonl'), baris('m2d3', '2026-09-28T00:00:00Z', 1) + '\n');
    writeFileSync(join(folder, 'catatan.txt'), 'bukan ledger');
    writeFileSync(join(dir, 'ledger.jsonl'), baris('m2d5/tirt', '2026-09-30T00:00:00Z', 1) + '\n');
    expect(berkasArsip(folder)).toEqual(['ledger-sampai-2026-09-28.jsonl', 'ledger-featherless-sampai-2026-09-29.jsonl']);
    expect(bacaLedgerSemua(join(dir, 'ledger.jsonl'), folder).map((e) => e.tag)).toEqual(['m2d3', 'm2d4', 'm2d5/tirt']);
  });

  it('lingkar M2d-5 menolak jalan sebelum arsip Featherless ada, atau bila ledger kini memuat tag di luar m2d5/', () => {
    const dir = mkdtempSync(join(tmpdir(), 'm2d5-siap-'));
    const jalur = join(dir, 'ledger.jsonl');
    const arsip = join(dir, 'arsip.jsonl');
    expect(siapOpenRouter(jalur, arsip)).toMatch(/belum diarsipkan/);
    writeFileSync(arsip, '');
    expect(siapOpenRouter(jalur, arsip)).toBeNull();
    writeFileSync(jalur, baris('m2d5/tirt/p1/susun/o1', 'x', 0.1) + '\n');
    expect(siapOpenRouter(jalur, arsip)).toBeNull();
    writeFileSync(jalur, baris('m2d4/tirt/p1/susun/o1', 'x', 0.1) + '\n');
    expect(siapOpenRouter(jalur, arsip)).toMatch(/di luar m2d5/);
  });
});
