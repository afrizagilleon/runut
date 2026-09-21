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
    // tidak ada skrip lain. Skrip tambahan wajib berawalan `eval:` — atau
    // disebut namanya di daftar di bawah — supaya penambahan diam-diam di luar
    // lingkup tetap merah.
    //
    // M3.1 D-12 menambahkan `dev`, `preview`, dan `kolektor`; D-10 menambahkan
    // `alpha:ringkas`. Keempatnya disebut satu per satu, bukan diloloskan lewat
    // awalan baru, supaya penjaga ini tetap menangkap skrip yang tidak
    // disahkan kontrak mana pun.
    const M1 = ['build', 'build:case', 'test', 'typecheck'];
    const M31 = ['dev', 'preview', 'kolektor', 'alpha:ringkas'];
    const skrip = Object.keys(paket.scripts).sort();
    for (const wajib of M1) {
      expect(skrip).toContain(wajib);
    }
    const tambahan = skrip.filter((s) => !M1.includes(s));
    const takDikenal = tambahan.filter((s) => !s.startsWith('eval:') && !M31.includes(s));
    expect(takDikenal).toEqual([]);
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
