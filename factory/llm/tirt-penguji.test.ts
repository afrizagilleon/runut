/**
 * M2d-5 T-08: bahan pembanding eksternal TIRT (D-10). Dijaga: bahan tebak
 * buta tanpa kartu/kunci/penjelasan; bahan kartu tanpa kunci dan memuat
 * pertanyaan penilaian baru persis kalimat kontrak; label kealamian tidak
 * membocorkan sumber; kelompok TIRT memuat M2d-5, M2d-4, M2d-3 dan kelompok
 * jangkar ULTJ memuat manusia; bahan yang dikirim ke subagent bisa dibangun
 * ulang identik.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PETUNJUK_KARTU } from './agen-penguji.ts';
import { bacaPaketDi } from './gaya-penguji.ts';
import { FOLDER_PENGUJI_M2D5, PERTANYAAN_PENILAIAN, PETUNJUK_KARTU_M2D5, bangunBahanTirt, lolosM2d5 } from './tirt-penguji.ts';
import { FOLDER_M2D5 } from './tirt-susun.ts';

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const ADA = lolosM2d5('tirt').length > 0;

describe('petunjuk penguji kartu M2d-5 (D-10)', () => {
  it('= petunjuk M2d-2 + satu pertanyaan penilaian persis kalimat kontrak; JSON memuat "penilaian"', () => {
    expect(PERTANYAAN_PENILAIAN).toBe('Adakah bagian pesan teman yang berupa penilaian (aman/bagus/pasti) yang tak bisa dicek dari kartu?');
    for (const b of PETUNJUK_KARTU.split('\n').slice(0, -2)) expect(PETUNJUK_KARTU_M2D5).toContain(b);
    expect(PETUNJUK_KARTU_M2D5).toContain(PERTANYAAN_PENILAIAN);
    expect(PETUNJUK_KARTU_M2D5.split('\n').at(-1)).toContain('"penilaian": "..."');
  });
});

describe.skipIf(!ADA)('bahan penguji eksternal M2d-5 (D-10)', () => {
  const bahan = bangunBahanTirt();
  const lolos = lolosM2d5('tirt');
  const fakta = bacaPaketDi(FOLDER_M2D5, 'tirt').fakta;

  it('tebak buta: satu soal per omongan TIRT yang dikunci M2d-5; tanpa kartu, fact_id, kunci, atau penjelasan', () => {
    expect(bahan.kunci.tebak).toHaveLength(lolos.length);
    expect(bahan.tebak).not.toMatch(/Salah-kaprah|Kartu \d|kunci|penjelas|\[\[/i);
    for (const f of fakta) expect(bahan.tebak).not.toContain(f.fact_id);
    for (const l of lolos) expect(bahan.tebak).toContain(l.omongan.nama);
  });

  it('kartu: memuat kalimat kartu dan pertanyaan penilaian, tanpa kunci, penjelasan, atau tanda penentu', () => {
    expect(bahan.kartu).not.toMatch(/Salah-kaprah|kunci:|PENENTU|\[\[/);
    expect(bahan.kartu).toContain(PERTANYAAN_PENILAIAN);
    for (const l of lolos) for (const id of l.omongan.kartu) expect(bahan.kartu).toContain(fakta.find((f) => f.fact_id === id)?.klaim ?? '?');
  });

  it('kealamian: label huruf saja; kelompok TIRT memuat M2d-5, M2d-4, M2d-3; jangkar ULTJ memuat manusia', () => {
    expect(bahan.alami).not.toMatch(/agen-m2d|deepseek|manusia|GLM|bank/i);
    const tirt = Object.values(bahan.kunci.alami.find((x) => x.paket === 'tirt')?.label ?? {});
    expect(tirt.sort()).toEqual(['agen-m2d3', 'agen-m2d4', 'agen-m2d5']);
    expect(Object.values(bahan.kunci.alami.find((x) => x.paket === 'ultj')?.label ?? {})).toContain('manusia');
  });

  it.skipIf(!existsSync(`${FOLDER_PENGUJI_M2D5}/tebak.md`))('dibangun ulang identik dengan berkas yang dikirim ke subagent', () => {
    for (const n of ['tebak', 'kartu', 'alami'] as const) {
      expect(sha(bahan[n]), n).toBe(sha(readFileSync(`${FOLDER_PENGUJI_M2D5}/${n}.md`, 'utf8')));
    }
  });
});
