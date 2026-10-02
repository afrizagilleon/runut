/**
 * Pra-registrasi M2d-13 (kontrak D-0): di-commit sebelum panggilan berbayar
 * pertama dan tidak berubah sesudahnya; pra-registrasi lama (termasuk M2d-11)
 * tidak berubah.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';

const BERKAS = 'docs/bukti/m2d13-praregistrasi.md';
const LAMA = [
  'docs/bukti/m2d7-praregistrasi.md',
  'docs/bukti/m2d8-praregistrasi.md',
  'docs/bukti/m2d10-praregistrasi.md',
  'docs/bukti/m2d10-praregistrasi-a1.md',
  'docs/bukti/m2d10-praregistrasi-a2.md',
  'docs/bukti/m2d11-praregistrasi.md',
];

function commitPertama(berkas: string): string {
  return execFileSync('git', ['log', '--format=%H', '--diff-filter=A', '--', berkas], { cwd: AKAR, encoding: 'utf8' }).trim().split('\n').at(-1) ?? '';
}

function isiDi(commit: string, berkas: string): string {
  return execFileSync('git', ['show', `${commit}:${berkas}`], { cwd: AKAR, encoding: 'utf8' }).replace(/\r\n/g, '\n');
}

/** Tag milik M2d-13 (pra-registrasi §6). Murni. */
const tagM2d13 = (tag: string): boolean => tag.startsWith('m2d13/') || tag.startsWith('penyusun/m2d13-');

const tercommit = commitPertama(BERKAS) !== '';

describe('tag M2d-13', () => {
  it('mengenali m2d13/ dan penyusun/m2d13-, bukan milestone lain', () => {
    expect(tagM2d13('m2d13/mutu/1')).toBe(true);
    expect(tagM2d13('penyusun/m2d13-opus-1/p1/tulis')).toBe(true);
    expect(tagM2d13('m2d11/uji-ulang/x')).toBe(false);
    expect(tagM2d13('penyusun/m2d11-tirt-7/p1')).toBe(false);
  });
});

describe.skipIf(!tercommit)('pra-registrasi M2d-13', () => {
  it('tidak berubah sejak commit yang menambahkannya', () => {
    const t00 = commitPertama(BERKAS);
    expect(readFileSync(`${AKAR}${BERKAS}`, 'utf8').replace(/\r\n/g, '\n')).toBe(isiDi(t00, BERKAS));
  });

  it.each(LAMA)('pra-registrasi lama %s tidak berubah', (b) => {
    expect(readFileSync(`${AKAR}${b}`, 'utf8').replace(/\r\n/g, '\n')).toBe(isiDi(commitPertama(b), b));
  });

  it('paket TIRT-7 yang dirujuk §3 masih sama dengan sha256 tertulis', () => {
    const sha = 'f7cabc6b2c9abca5ceb36d127b279438c9c3586e3c727de76da3a412fb85a45a';
    expect(readFileSync(`${AKAR}${BERKAS}`, 'utf8')).toContain(sha);
    const paket = readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8').replace(/\r\n/g, '\n');
    expect(createHash('sha256').update(paket, 'utf8').digest('hex')).toBe(sha);
  });

  it('entri ledger m2d13/ atau penyusun/m2d13- pertama lebih baru dari commit pra-registrasi', () => {
    const jalur = `${AKAR}.cache/llm/ledger.jsonl`;
    if (!existsSync(jalur)) return;
    const waktuCommit = Date.parse(execFileSync('git', ['show', '-s', '--format=%cI', commitPertama(BERKAS)], { cwd: AKAR, encoding: 'utf8' }).trim());
    const pertama = readFileSync(jalur, 'utf8')
      .split(/\r?\n/)
      .filter((b) => b.trim() !== '')
      .map((b) => JSON.parse(b) as { waktu: string; tag: string })
      .find((e) => tagM2d13(e.tag));
    if (pertama === undefined) return;
    expect(Date.parse(pertama.waktu)).toBeGreaterThan(waktuCommit);
  });
});
