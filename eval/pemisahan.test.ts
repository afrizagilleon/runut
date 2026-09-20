// Mitigasi (b) di 6 — pembangun tidak boleh mengimpor modul kunci jawaban.
//
// Cara termurah membuat lengan C menang adalah membocorkan kunci ke jalur
// pembangun. Tes ini menelusuri seluruh graf impor dari tiap lengan dan gagal
// kalau ada jalur yang sampai ke eval/kunci.ts atau ke .cache/kunci/.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { EVAL, AKAR } from './berkas.ts';

function grafImpor(mulai: string): string[] {
  const terlihat = new Set<string>();
  const antrean = [resolve(mulai)];
  while (antrean.length > 0) {
    const jalur = antrean.pop();
    if (jalur === undefined || terlihat.has(jalur) || !existsSync(jalur)) continue;
    terlihat.add(jalur);
    const isi = readFileSync(jalur, 'utf8');
    for (const cocok of isi.matchAll(/from\s+'([^']+)'/g)) {
      const rujukan = cocok[1];
      if (rujukan === undefined || !rujukan.startsWith('.')) continue;
      antrean.push(resolve(join(dirname(jalur), rujukan)));
    }
  }
  return [...terlihat];
}

const PEMBANGUN = ['lengan-a.ts', 'lengan-s.ts', 'lengan-c.ts', 'lengan-mcp.ts', 'muat-folk.ts', 'prompt.ts'];

describe('pemisahan kunci jawaban dari jalur pembangun', () => {
  for (const berkas of PEMBANGUN) {
    it(`${berkas} tidak pernah sampai ke modul kunci`, () => {
      const graf = grafImpor(join(EVAL, berkas));
      const tercemar = graf.filter((j) => /kunci/i.test(j));
      expect(tercemar, `jalur pembangun mengimpor modul kunci: ${tercemar.join(', ')}`).toEqual([]);
    });

    it(`${berkas} dan seluruh impornya tidak membaca .cache/kunci`, () => {
      const graf = grafImpor(join(EVAL, berkas));
      const menyebut = graf.filter((j) => /kunci\//.test(readFileSync(j, 'utf8').replace(/^\s*\/\/.*$/gm, '')));
      expect(menyebut, `ada kode aktif yang menyebut .cache/kunci: ${menyebut.join(', ')}`).toEqual([]);
    });
  }

  it('prompt yang ditulis ke berkas tidak memuat satu pun angka khas kunci jawaban', () => {
    const jalurKunci = join(AKAR, '.cache', 'kunci', 'folk-2025-10-07.md');
    if (!existsSync(jalurKunci)) {
      throw new Error('.cache/kunci/folk-2025-10-07.md tidak ada; tes kebocoran tidak bisa dijalankan.');
    }
    const kunci = readFileSync(jalurKunci, 'utf8');
    // Angka panjang (>= 6 digit) yang muncul di kunci; kalau salah satunya
    // muncul di prompt lengan, kunci sudah bocor ke prompt.
    const angkaKunci = new Set(
      [...kunci.matchAll(/\b\d[\d.]{5,}\b/g)].map((m) => m[0]).filter((a): a is string => a !== undefined),
    );
    const prompt: string[] = [];
    for (const nama of ['prompt-a.txt', 'prompt-s.txt']) {
      const jalur = join(EVAL, nama);
      if (existsSync(jalur)) prompt.push(readFileSync(jalur, 'utf8'));
    }
    expect(prompt.length, 'jalankan `npm run eval:jalan -- --tulis-prompt` lebih dulu').toBeGreaterThan(0);
    const bocor: string[] = [];
    for (const p of prompt) for (const a of angkaKunci) if (p.includes(a)) bocor.push(a);
    expect(bocor, `angka kunci muncul di prompt lengan: ${bocor.join(', ')}`).toEqual([]);
  });
});
