/**
 * M2d-6 D-8: angka di `factory/llm/peran.md` diturunkan dari kode, bukan
 * tulisan tangan — jumlah aturan R aktif = `aturanAktif().length`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aturanAktif } from '../verifikasi/v2.ts';
import { AKAR } from './env.ts';
import { PENALAR_M2D6 } from './penalaran.ts';
import { PENYEDIA_DIKECUALIKAN } from './penyedia-bukti.ts';

const MD = readFileSync(`${AKAR}factory/llm/peran.md`, 'utf8');

describe('peran.md = kode', () => {
  it('jumlah aturan R aktif = aturanAktif().length; tidak ada angka aturan R lain', () => {
    const n = aturanAktif().length;
    expect(n).toBe(33);
    expect(MD).toContain(`${String(n)} aturan R aktif`);
    const semua = [...MD.matchAll(/(\d+) aturan R/g)].map((m) => Number(m[1]));
    expect(semua).toEqual([n]);
  });

  it('bagian M2d-6 menyebut angka penalar dan penyedia yang dikecualikan dari kode', () => {
    expect(MD).toContain(`< ${PENALAR_M2D6.kritikus.ambang.toLocaleString('id-ID')} token penalaran`);
    expect(MD).toContain(`< ${String(PENALAR_M2D6.penebakGlm.ambang)} token`);
    expect(MD).toContain(`\`max_tokens\` ${PENALAR_M2D6.kritikus.maxTokens.toLocaleString('id-ID')}`);
    for (const s of Object.values(PENYEDIA_DIKECUALIKAN).flat()) expect(MD).toContain(`\`${s}\``);
  });
});
