import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const berkasPaket = fileURLToPath(new URL('../package.json', import.meta.url));

interface Paket {
  type: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const paket = JSON.parse(readFileSync(berkasPaket, 'utf8')) as Paket;

describe('pondasi proyek', () => {
  it('menyediakan empat skrip yang dijanjikan kontrak M1', () => {
    // M1.5 5 memperbolehkan menambah skrip ke package.json untuk perkakas
    // evaluasi, jadi yang diuji adalah keempat skrip M1 tetap ada, bukan bahwa
    // tidak ada skrip lain. Skrip tambahan wajib berawalan `eval:` supaya
    // penambahan diam-diam di luar lingkup tetap merah.
    const skrip = Object.keys(paket.scripts).sort();
    for (const wajib of ['build', 'build:case', 'test', 'typecheck']) {
      expect(skrip).toContain(wajib);
    }
    const tambahan = skrip.filter((s) => !['build', 'build:case', 'test', 'typecheck'].includes(s));
    expect(tambahan.every((s) => s.startsWith('eval:'))).toBe(true);
  });

  it('memakai ESM', () => {
    expect(paket.type).toBe('module');
  });

  it('tidak memuat dependensi jaringan atau LLM', () => {
    const terlarang = [
      'axios',
      'node-fetch',
      'got',
      'openai',
      '@anthropic-ai/sdk',
      '@google/generative-ai',
      'langchain',
    ];
    const semua = Object.keys({ ...paket.dependencies, ...paket.devDependencies });
    expect(semua.filter((d) => terlarang.includes(d))).toEqual([]);
  });
});
