/**
 * Pra-registrasi M2d-10 (kontrak D-0): di-commit sebelum panggilan berbayar
 * pertama dan tidak berubah sesudahnya; pra-registrasi M2d-7 (patokan tayang)
 * juga tidak berubah.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';

const BERKAS = 'docs/bukti/m2d10-praregistrasi.md';

function commitPertama(berkas: string): string {
  return execFileSync('git', ['log', '--format=%H', '--diff-filter=A', '--', berkas], { cwd: AKAR, encoding: 'utf8' }).trim().split('\n').at(-1) ?? '';
}

function isiDi(commit: string, berkas: string): string {
  return execFileSync('git', ['show', `${commit}:${berkas}`], { cwd: AKAR, encoding: 'utf8' }).replace(/\r\n/g, '\n');
}

describe('pra-registrasi M2d-10', () => {
  it('tidak berubah sejak commit yang menambahkannya', () => {
    const t00 = commitPertama(BERKAS);
    expect(t00).not.toBe('');
    expect(readFileSync(`${AKAR}${BERKAS}`, 'utf8').replace(/\r\n/g, '\n')).toBe(isiDi(t00, BERKAS));
  });

  it('pra-registrasi M2d-7 (patokan tayang) tidak berubah', () => {
    const b = 'docs/bukti/m2d7-praregistrasi.md';
    expect(readFileSync(`${AKAR}${b}`, 'utf8').replace(/\r\n/g, '\n')).toBe(isiDi(commitPertama(b), b));
  });

  it('entri ledger m2d10/ pertama lebih baru dari commit pra-registrasi', () => {
    const jalur = `${AKAR}.cache/llm/ledger.jsonl`;
    if (!existsSync(jalur)) return;
    const waktuCommit = Date.parse(execFileSync('git', ['show', '-s', '--format=%cI', commitPertama(BERKAS)], { cwd: AKAR, encoding: 'utf8' }).trim());
    const pertama = readFileSync(jalur, 'utf8')
      .split(/\r?\n/)
      .filter((b) => b.trim() !== '')
      .map((b) => JSON.parse(b) as { waktu: string; tag: string })
      .find((e) => e.tag.startsWith('m2d10/'));
    if (pertama === undefined) return;
    expect(Date.parse(pertama.waktu)).toBeGreaterThan(waktuCommit);
  });
});

describe('pra-registrasi M2d-10 Amandemen A-1', () => {
  const B = 'docs/bukti/m2d10-praregistrasi-a1.md';
  it('tidak berubah sejak commit yang menambahkannya', () => {
    const t = commitPertama(B);
    expect(t).not.toBe('');
    expect(readFileSync(`${AKAR}${B}`, 'utf8').replace(/\r\n/g, '\n')).toBe(isiDi(t, B));
  });
  it('entri ledger penyusun/m2d10-tirt-a1/ pertama lebih baru dari commit A-1', () => {
    const jalur = `${AKAR}.cache/llm/ledger.jsonl`;
    if (!existsSync(jalur)) return;
    const waktu = Date.parse(execFileSync('git', ['show', '-s', '--format=%cI', commitPertama(B)], { cwd: AKAR, encoding: 'utf8' }).trim());
    const pertama = readFileSync(jalur, 'utf8').split(/\r?\n/).filter((b) => b.trim() !== '').map((b) => JSON.parse(b) as { waktu: string; tag: string }).find((e) => e.tag.startsWith('penyusun/m2d10-tirt-a1/'));
    if (pertama === undefined) return;
    expect(Date.parse(pertama.waktu)).toBeGreaterThan(waktu);
  });
});
