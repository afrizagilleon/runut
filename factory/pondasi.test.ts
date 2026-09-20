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
  it('menyediakan empat skrip yang dijanjikan kontrak', () => {
    expect(Object.keys(paket.scripts).sort()).toEqual(
      ['build', 'build:case', 'test', 'typecheck'].sort(),
    );
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
