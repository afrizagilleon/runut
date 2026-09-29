/**
 * M2d-6 T-06: bahan uji luar TIRT (D-7 = prosedur M2d-5 D-10). Dijaga: bahan
 * tebak buta tanpa kartu/kunci/penjelasan; bahan kartu tanpa kunci dengan
 * pertanyaan penilaian M2d-5; label kealamian tidak membocorkan sumber;
 * kelompok TIRT memuat M2d-6, M2d-5, M2d-4; bahan yang dikirim ke subagent
 * bisa dibangun ulang identik; prosedur M2d-5 tetap byte-sama.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bacaPaketDi } from './gaya-penguji.ts';
import { FOLDER_PENGUJI_M2D6, bangunBahanM2d6, folderJalan } from './penalar-penguji.ts';
import { PERTANYAAN_PENILAIAN, lolosM2d5 } from './tirt-penguji.ts';

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const KUNCI = `${FOLDER_PENGUJI_M2D6}/kunci.json`;
const JALAN = existsSync(KUNCI) ? (JSON.parse(readFileSync(KUNCI, 'utf8')) as { jalan: number }).jalan : null;

describe.skipIf(JALAN === null)('bahan penguji luar M2d-6 (D-7)', () => {
  const bahan = bangunBahanM2d6(JALAN ?? 1);
  const lolos = lolosM2d5('tirt', folderJalan(JALAN ?? 1));
  const fakta = bacaPaketDi(folderJalan(JALAN ?? 1), 'tirt').fakta;

  it('tebak buta: satu soal per omongan TIRT yang dikunci; tanpa kartu, fact_id, kunci, atau penjelasan', () => {
    expect(bahan.kunci.tebak).toHaveLength(lolos.length);
    expect(bahan.tebak).not.toMatch(/Salah-kaprah|Kartu \d|kunci|penjelas|\[\[/i);
    for (const f of fakta) expect(bahan.tebak).not.toContain(f.fact_id);
    for (const l of lolos) expect(bahan.tebak).toContain(l.omongan.nama);
  });

  it('kartu: memuat kalimat kartu dan pertanyaan penilaian, tanpa kunci, penjelasan, atau tanda penentu', () => {
    expect(bahan.kartu).not.toMatch(/Salah-kaprah|kunci:|PENENTU|\[\[/);
    expect(bahan.kartu).toContain(PERTANYAAN_PENILAIAN);
  });

  it('kealamian: label huruf saja; kelompok TIRT = M2d-6, M2d-5, M2d-4; jangkar ULTJ memuat manusia', () => {
    expect(bahan.alami).not.toMatch(/agen-m2d|deepseek|manusia|GLM|bank/i);
    expect(Object.values(bahan.kunci.alami.find((x) => x.paket === 'tirt')?.label ?? {}).sort()).toEqual(['agen-m2d4', 'agen-m2d5', 'agen-m2d6']);
    expect(Object.values(bahan.kunci.alami.find((x) => x.paket === 'ultj')?.label ?? {})).toContain('manusia');
  });

  it('dibangun ulang identik dengan berkas yang dikirim ke subagent', () => {
    for (const n of ['tebak', 'kartu', 'alami'] as const) expect(sha(bahan[n]), n).toBe(sha(readFileSync(`${FOLDER_PENGUJI_M2D6}/${n}.md`, 'utf8')));
  });
});
