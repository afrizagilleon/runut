/**
 * M2d-9 T-08: paket repo (D-8) — LICENSE MIT, `.env.example` (nama variabel
 * saja, tanpa nilai; sama dengan `VARIABEL_ENV`), engines Node ≥ 22.6, skrip
 * `npm run penyusun`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VARIABEL_ENV } from './konfig.ts';
import { AKAR_REPO } from './server.ts';

const baca = (n: string): string => readFileSync(`${AKAR_REPO}${n}`, 'utf8');

describe('paket repo', () => {
  it('LICENSE: MIT, pemegang hak pemilik repo', () => {
    const l = baca('LICENSE');
    expect(l.split('\n')[0]).toBe('MIT License');
    expect(l).toContain('Copyright (c) 2026 Afriza Gilleon Ginting');
  });

  it('.env.example: nama variabel VARIABEL_ENV berurutan, semuanya tanpa nilai', () => {
    const baris = baca('.env.example').split(/\r?\n/).filter((b) => b.trim() !== '' && !b.trim().startsWith('#'));
    expect(baris.map((b) => b.split('=')[0])).toEqual(VARIABEL_ENV.map((v) => v.nama));
    expect(baris.every((b) => /^[A-Z_]+=$/.test(b))).toBe(true);
  });

  it('package.json: engines node ≥ 22.6 (--experimental-strip-types) dan skrip penyusun', () => {
    const p = JSON.parse(baca('package.json')) as { engines: { node: string }; scripts: Record<string, string> };
    expect(p.engines.node).toBe('>=22.6');
    expect(p.scripts['penyusun']).toBe('node --experimental-strip-types alat/penyusun/server.ts');
  });
});
