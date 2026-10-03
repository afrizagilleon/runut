/**
 * Amandemen teknis T1 M2d-15 (pra-registrasi §9, butir kedua; dicatat di
 * `docs/bukti/m2d15-amandemen-teknis-T1.md`): dua panggilan penulis pertama jalan 1
 * berhenti di max_tokens 16.000 tanpa JSON terbaca → sisa milestone memakai
 * `reasoning: { max_tokens: 8.000 }`, hal lain sama. Pra-registrasi tidak diubah.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { PROFIL_M2D15, SETELAN_PENULIS_M2D15, SETELAN_PENULIS_M2D15_T1 } from './mesin.ts';

describe('amandemen teknis T1', () => {
  it('setelan pra-registrasi tetap tercatat; profil M2d-15 memakai setelan T1 (reasoning.max_tokens 8.000, max_tokens 16.000, suhu 1)', () => {
    expect(SETELAN_PENULIS_M2D15).toEqual({ suhu: 1, maxTokens: 16_000, tambahanBadan: { reasoning: { effort: 'medium' } } });
    expect(SETELAN_PENULIS_M2D15_T1).toEqual({ suhu: 1, maxTokens: 16_000, tambahanBadan: { reasoning: { max_tokens: 8_000 } } });
    // sesudah amandemen T2 profil memakai effort "low" (amandemen-t2.test.ts); setelan T1 tetap tercatat
    expect(PROFIL_M2D15.setelan).not.toBe(SETELAN_PENULIS_M2D15_T1);
  });

  it('pra-registrasi §9 memuat aturan amandemen yang dipakai (tidak diubah)', () => {
    const pra = readFileSync(`${AKAR}docs/bukti/m2d15-praregistrasi.md`, 'utf8');
    expect(pra).toContain('setelan diganti `reasoning: { max_tokens: 8.000 }`');
    expect(pra).toContain('dua panggilan penulis pertama jalan 1 sama-sama berhenti di `max_tokens` tanpa JSON terbaca');
  });

  it('bukti di ledger: dua panggilan penulis pertama jalan 1 = 16.000 token keluar, effort "medium"', () => {
    const jalur = `${AKAR}.cache/llm/ledger.jsonl`;
    if (!existsSync(jalur)) return;
    const e = readFileSync(jalur, 'utf8')
      .split(/\r?\n/)
      .filter((b) => b.trim() !== '')
      .map((b) => JSON.parse(b) as { tag: string; token_keluar: number | null; penalaran_diminta?: Record<string, unknown> })
      .filter((x) => x.tag.startsWith('penyusun/m2d15-opus-1/p1/tulis-bebas'));
    if (e.length === 0) return;
    expect(e.slice(0, 2).map((x) => [x.token_keluar, x.penalaran_diminta])).toEqual([
      [16_000, { effort: 'medium' }],
      [16_000, { effort: 'medium' }],
    ]);
  });

  it('berkas amandemen memuat bukti, keputusan jalan 1, dan entri ledger konservatif', () => {
    const isi = readFileSync(`${AKAR}docs/bukti/m2d15-amandemen-teknis-T1.md`, 'utf8');
    for (const s of ['§9', '16.000', '14.372', 'US$0,366752', 'PID 10544', 'perkiraan maksimum', 'US$0,414208', '`reasoning: { max_tokens: 8.000 }`', 'jalan 1']) expect(isi).toContain(s);
  });
});
