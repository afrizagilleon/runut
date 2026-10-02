/**
 * Pra-registrasi M2d-11 (kontrak D-0): di-commit sebelum panggilan berbayar
 * pertama dan tidak berubah sesudahnya; pra-registrasi lama tidak berubah.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';

const BERKAS = 'docs/bukti/m2d11-praregistrasi.md';
const LAMA = ['docs/bukti/m2d7-praregistrasi.md', 'docs/bukti/m2d8-praregistrasi.md', 'docs/bukti/m2d10-praregistrasi.md', 'docs/bukti/m2d10-praregistrasi-a1.md', 'docs/bukti/m2d10-praregistrasi-a2.md'];

function commitPertama(berkas: string): string {
  return execFileSync('git', ['log', '--format=%H', '--diff-filter=A', '--', berkas], { cwd: AKAR, encoding: 'utf8' }).trim().split('\n').at(-1) ?? '';
}

function isiDi(commit: string, berkas: string): string {
  return execFileSync('git', ['show', `${commit}:${berkas}`], { cwd: AKAR, encoding: 'utf8' }).replace(/\r\n/g, '\n');
}

const tercommit = commitPertama(BERKAS) !== '';

describe.skipIf(!tercommit)('pra-registrasi M2d-11', () => {
  it('tidak berubah sejak commit yang menambahkannya', () => {
    const t00 = commitPertama(BERKAS);
    expect(readFileSync(`${AKAR}${BERKAS}`, 'utf8').replace(/\r\n/g, '\n')).toBe(isiDi(t00, BERKAS));
  });

  it.each(LAMA)('pra-registrasi lama %s tidak berubah', (b) => {
    expect(readFileSync(`${AKAR}${b}`, 'utf8').replace(/\r\n/g, '\n')).toBe(isiDi(commitPertama(b), b));
  });

  it('entri ledger m2d11/ atau penyusun/m2d11- pertama lebih baru dari commit pra-registrasi', () => {
    const jalur = `${AKAR}.cache/llm/ledger.jsonl`;
    if (!existsSync(jalur)) return;
    const waktuCommit = Date.parse(execFileSync('git', ['show', '-s', '--format=%cI', commitPertama(BERKAS)], { cwd: AKAR, encoding: 'utf8' }).trim());
    const pertama = readFileSync(jalur, 'utf8')
      .split(/\r?\n/)
      .filter((b) => b.trim() !== '')
      .map((b) => JSON.parse(b) as { waktu: string; tag: string })
      .find((e) => e.tag.startsWith('m2d11/') || e.tag.startsWith('penyusun/m2d11-'));
    if (pertama === undefined) return;
    expect(Date.parse(pertama.waktu)).toBeGreaterThan(waktuCommit);
  });
});
