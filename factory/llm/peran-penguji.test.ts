/**
 * M2d-3 T-06: bahan pembanding eksternal (D-7). Dijaga: bahan tebak buta
 * tanpa kartu/kunci/penjelasan; bahan kartu tanpa kunci; label kealamian
 * tidak membocorkan sumber; kelompok DADA/ULTJ selalu memuat pembanding
 * manusia; bahan yang dikirim ke subagent bisa dibangun ulang identik.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOLDER_PENGUJI_M2D3, bacaPaketM2d3, bacaRiwayatPeran, bangunBahanPeran, omonganLolosPeran } from './peran-penguji.ts';
import { URUTAN_PERAN } from './peran-susun.ts';

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const ADA = URUTAN_PERAN.some((p) => bacaRiwayatPeran(p) !== null);

describe.skipIf(!ADA)('bahan penguji eksternal M2d-3 (D-7)', () => {
  const bahan = bangunBahanPeran();
  const lolos = URUTAN_PERAN.flatMap((p) => {
    const h = bacaRiwayatPeran(p);
    return h === null ? [] : omonganLolosPeran(p, h).map((l) => ({ ...l, fakta: bacaPaketM2d3(p).fakta }));
  });

  it('tebak buta: satu soal per omongan yang dikunci; tanpa kartu, fact_id, kunci, atau penjelasan', () => {
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

  it('kealamian: label huruf saja; sumber hanya di kunci; kelompok DADA dan ULTJ memuat omongan manusia', () => {
    expect(bahan.alami).not.toMatch(/agen-m2d|m2d1|deepseek|manusia|GLM/i);
    for (const p of ['dada', 'ultj']) {
      const k = bahan.kunci.alami.find((x) => x.paket === p);
      expect(Object.values(k?.label ?? {})).toContain('manusia');
    }
    for (const l of new Set(lolos.map((x) => x.paket))) {
      expect(Object.values(bahan.kunci.alami.find((x) => x.paket === l)?.label ?? {})).toContain('agen-m2d3');
    }
  });

  it.skipIf(!existsSync(`${FOLDER_PENGUJI_M2D3}/tebak.md`))('dibangun ulang identik dengan berkas yang dikirim ke subagent', () => {
    for (const n of ['tebak', 'kartu', 'alami'] as const) {
      expect(sha(bahan[n]), n).toBe(sha(readFileSync(`${FOLDER_PENGUJI_M2D3}/${n}.md`, 'utf8')));
    }
  });
});
