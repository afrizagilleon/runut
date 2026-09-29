/**
 * M2d-4 T-06: bahan pembanding eksternal (D-8). Dijaga: bahan tebak buta
 * tanpa kartu/kunci/penjelasan; bahan kartu tanpa kunci; label kealamian
 * tidak membocorkan sumber; kelompok DADA/ULTJ memuat pembanding manusia dan
 * kelompok tiap paket yang terbit memuat draf M2d-4 dan M2d-3; bahan yang
 * dikirim ke subagent bisa dibangun ulang identik.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOLDER_PENGUJI_M2D4, bacaPaketDi, bangunBahanGaya, lolosM2d4 } from './gaya-penguji.ts';
import { FOLDER_M2D4, URUTAN_GAYA } from './gaya-susun.ts';

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const ADA = URUTAN_GAYA.some((p) => lolosM2d4(p).length > 0);

describe.skipIf(!ADA)('bahan penguji eksternal M2d-4 (D-8)', () => {
  const bahan = bangunBahanGaya();
  const lolos = URUTAN_GAYA.flatMap((p) => lolosM2d4(p).map((l) => ({ ...l, fakta: bacaPaketDi(FOLDER_M2D4, p).fakta })));

  it('tebak buta: satu soal per omongan yang dikunci M2d-4; tanpa kartu, fact_id, kunci, atau penjelasan', () => {
    expect(bahan.kunci.tebak).toHaveLength(lolos.length);
    expect(bahan.tebak).not.toMatch(/Salah-kaprah|Kartu \d|kunci|penjelas|\[\[/i);
    for (const l of lolos) {
      for (const f of l.fakta) expect(bahan.tebak).not.toContain(f.fact_id);
      expect(bahan.tebak).toContain(l.omongan.nama);
    }
  });

  it('kartu: memuat kalimat kartu tetapi tanpa kunci, penjelasan, atau tanda penentu', () => {
    expect(bahan.kartu).not.toMatch(/Salah-kaprah|kunci:|PENENTU|\[\[/);
    for (const l of lolos) for (const id of l.omongan.kartu) expect(bahan.kartu).toContain(l.fakta.find((f) => f.fact_id === id)?.klaim ?? '?');
  });

  it('kealamian: label huruf saja; kelompok DADA dan ULTJ memuat manusia; paket yang punya omongan M2d-4 memuat M2d-4 dan M2d-3', () => {
    expect(bahan.alami).not.toMatch(/agen-m2d|m2d1|deepseek|manusia|GLM|bank/i);
    for (const p of ['dada', 'ultj']) {
      expect(Object.values(bahan.kunci.alami.find((x) => x.paket === p)?.label ?? {})).toContain('manusia');
    }
    for (const p of new Set(lolos.map((x) => x.paket))) {
      const label = Object.values(bahan.kunci.alami.find((x) => x.paket === p)?.label ?? {});
      expect(label).toContain('agen-m2d4');
      expect(label).toContain('agen-m2d3');
    }
  });

  it.skipIf(!existsSync(`${FOLDER_PENGUJI_M2D4}/tebak.md`))('dibangun ulang identik dengan berkas yang dikirim ke subagent', () => {
    for (const n of ['tebak', 'kartu', 'alami'] as const) {
      expect(sha(bahan[n]), n).toBe(sha(readFileSync(`${FOLDER_PENGUJI_M2D4}/${n}.md`, 'utf8')));
    }
  });
});
