/**
 * Amandemen pra-data A1–A3 M2d-15 (`docs/bukti/m2d15-amandemen-A1.md`, reviewer 3 Okt,
 * sebelum panggilan berbayar pertama; pra-registrasi tidak diubah):
 * A1 label "terbukti" juga mensyaratkan tertebak penebak ≤ 50 % dari yang sampai rotasi;
 * A2 pagu per jalan US$2,00 (D-4 ≤ 2,70 dan milestone 3,00 tetap);
 * A3 tag `m2d15/` diizinkan di daftar awalan ledger.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { siapM2d8 } from '../kalibrasi-konfig.ts';
import type { PaketFakta } from '../paket.ts';
import { siapM2d11 } from '../patokan/konfig.ts';
import { siapM2d10 } from '../templat/konfig.ts';
import { AMBANG_LABEL, bankSudut, labelSudut, type HitunganSudut } from './bank-sudut.ts';
import { PAGU_D4_M2D15, PAGU_JALAN_M2D15, PAGU_MILESTONE_M2D15, rencanaJalanM2d15 } from './pagu-m2d15.ts';

const BERKAS = 'docs/bukti/m2d15-amandemen-A1.md';
const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const h = (x: Partial<HitunganSudut>): HitunganSudut => ({ dicoba: 1, sampai_rotasi: 0, tertebak_penebak: 0, ditolak_kode: 0, ditolak_kartu: 0, ditolak_kritikus: 0, tulis_gagal: 0, lulus: 0, ...x });

describe('A1: terbukti juga butuh tertebak penebak ≤ 50 % dari yang sampai rotasi', () => {
  it('ambang 0,5', () => expect(AMBANG_LABEL.terbuktiTertebak).toBe(0.5));
  it('lulus 1, Opus 1/4, tertebak 16/18 → campuran (dulu terbukti)', () => expect(labelSudut(h({ lulus: 1, sampai_rotasi: 18, tertebak_penebak: 16 }), { k: 1, n: 4 })).toBe('campuran'));
  it('batas: 1/2 tertebak → terbukti; 2/3 → campuran', () => {
    expect(labelSudut(h({ lulus: 1, sampai_rotasi: 2, tertebak_penebak: 1 }), { k: 1, n: 4 })).toBe('terbukti');
    expect(labelSudut(h({ lulus: 1, sampai_rotasi: 3, tertebak_penebak: 2 }), { k: 1, n: 4 })).toBe('campuran');
  });
  it('bank dihitung ulang: harga-2025-12-09 campuran; volume-2025-12-10 tetap terbukti (satu-satunya)', () => {
    const b = bankSudut(paket);
    expect(b.find((s) => s.fact_id === 'harga-2025-12-09')?.label).toBe('campuran');
    expect(b.filter((s) => s.label === 'terbukti').map((s) => s.fact_id)).toEqual(['volume-2025-12-10']);
  });
});

describe('A2: pagu per jalan US$2,00; D-4 dan milestone tetap', () => {
  it('angka', () => expect([PAGU_JALAN_M2D15, PAGU_D4_M2D15, PAGU_MILESTONE_M2D15]).toEqual([2, 2.7, 3]));
  it('jalan 1 = 2,00; jalan 2 hanya mendapat sisa D-4', () => {
    expect(rencanaJalanM2d15([], null)).toMatchObject({ id: 'm2d15-opus-1', pagu: 2 });
    expect(rencanaJalanM2d15([{ id: 'm2d15-opus-1', biaya_usd: 1.5, terbit: false }], null)).toMatchObject({ id: 'm2d15-opus-2', pagu: 1.2 });
  });
});

describe('A3: tag m2d15/ diizinkan di daftar awalan ledger', () => {
  it.each([
    ['siapM2d8', siapM2d8],
    ['siapM2d11', siapM2d11],
    ['siapM2d10', siapM2d10],
  ])('%s menerima m2d15/mutu/…', (_n, siap) => {
    const d = mkdtempSync(join(tmpdir(), 'a3-'));
    const jalur = join(d, 'ledger.jsonl');
    writeFileSync(jalur, `${JSON.stringify({ waktu: '2026-10-04T00:00:00Z', model: 'z-ai/glm-5.3', tag: 'm2d15/mutu/m01', biaya_usd: 0.01 })}\n`);
    expect(siap(jalur)).toBeNull();
  });
});

describe('berkas amandemen', () => {
  const isi = readFileSync(`${AKAR}${BERKAS}`, 'utf8');
  it('merujuk pra-registrasi dan memuat ketiga amandemen dengan angkanya', () => {
    for (const s of ['docs/bukti/m2d15-praregistrasi.md', 'A1', 'A2', 'A3', '≤ 0,5', 'US$2,00', 'US$2,70', 'US$3,00', '`m2d15/`']) expect(isi).toContain(s);
  });
  const commit = execFileSync('git', ['log', '--format=%H', '--diff-filter=A', '--', BERKAS], { cwd: AKAR, encoding: 'utf8' }).trim().split('\n').at(-1) ?? '';
  it.skipIf(commit === '')('tidak berubah sejak commit-nya; entri ledger m2d15 pertama lebih baru', () => {
    expect(isi.replace(/\r\n/g, '\n')).toBe(execFileSync('git', ['show', `${commit}:${BERKAS}`], { cwd: AKAR, encoding: 'utf8' }).replace(/\r\n/g, '\n'));
    const waktu = Date.parse(execFileSync('git', ['show', '-s', '--format=%cI', commit], { cwd: AKAR, encoding: 'utf8' }).trim());
    let ledger = '';
    try {
      ledger = readFileSync(`${AKAR}.cache/llm/ledger.jsonl`, 'utf8');
    } catch {
      return;
    }
    const pertama = ledger
      .split(/\r?\n/)
      .filter((b) => b.trim() !== '')
      .map((b) => JSON.parse(b) as { waktu: string; tag: string })
      .find((e) => e.tag.startsWith('m2d15/') || e.tag.startsWith('penyusun/m2d15-'));
    if (pertama !== undefined) expect(Date.parse(pertama.waktu)).toBeGreaterThan(waktu);
  });
});
