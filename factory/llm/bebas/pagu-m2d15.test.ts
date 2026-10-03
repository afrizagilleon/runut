/** Pagu & urutan jalan M2d-15 (pra-registrasi §2, §6): angka sama dengan pra-registrasi, aturan jalan 2. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { auditJalan, MAKS_JALAN_M2D15, PAGU_D4_M2D15, PAGU_JALAN_M2D15, PAGU_MILESTONE_M2D15, PAGU_PENILAI_MIN_M2D15, paguPenilaiM2d15, rencanaJalanM2d15 } from './pagu-m2d15.ts';

describe('angka pagu = pra-registrasi §6 + amandemen A2 (pagu jalan 2,00)', () => {
  it('3,00 / 2,70 / 2,00 / 0,30 / 2 jalan', () => {
    expect([PAGU_MILESTONE_M2D15, PAGU_D4_M2D15, PAGU_JALAN_M2D15, PAGU_PENILAI_MIN_M2D15, MAKS_JALAN_M2D15]).toEqual([3, 2.7, 2, 0.3, 2]);
    expect(readFileSync(`${AKAR}docs/bukti/m2d15-amandemen-A1.md`, 'utf8')).toContain('Pagu jalan = min(**US$2,00**; US$2,70 − biaya nyata jalan M2d-15 sebelumnya)');
    const pra = readFileSync(`${AKAR}docs/bukti/m2d15-praregistrasi.md`, 'utf8');
    for (const s of ['**Pagu milestone US$3,00**', '**D-4 (jalan) ≤ US$2,70.**', 'min(US$1,40; US$2,70 − biaya nyata jalan M2d-15 sebelumnya)', 'US$3,00 − biaya nyata D-4 (paling sedikit US$0,30)', 'Paling banyak 2 jalan']) expect(pra).toContain(s);
  });
  it('D-4 maksimum + penilai minimum = pagu milestone', () => expect(PAGU_D4_M2D15 + PAGU_PENILAI_MIN_M2D15).toBeCloseTo(PAGU_MILESTONE_M2D15, 9));
});

describe('rencana jalan', () => {
  it('jalan 1 selalu, pagu 2,00', () => expect(rencanaJalanM2d15([], null)).toMatchObject({ id: 'm2d15-opus-1', pagu: 2 }));
  it('jalan 1 tidak terbit → jalan 2 dengan pagu min(2,00; 2,70 − biaya)', () => {
    expect(rencanaJalanM2d15([{ id: 'm2d15-opus-1', biaya_usd: 1.39, terbit: false }], null)).toMatchObject({ id: 'm2d15-opus-2', pagu: 1.31 });
    expect(rencanaJalanM2d15([{ id: 'm2d15-opus-1', biaya_usd: 0.5, terbit: false }], null)).toMatchObject({ id: 'm2d15-opus-2', pagu: 2 });
  });
  it('jalan 1 terbit: menunggu audit; audit lulus → berhenti; audit gagal → jalan 2', () => {
    const s = [{ id: 'm2d15-opus-1', biaya_usd: 1.2, terbit: true }];
    expect(rencanaJalanM2d15(s, null)).toMatchObject({ berhenti: expect.stringMatching(/menunggu audit/) as unknown as string });
    expect(rencanaJalanM2d15(s, 'lulus')).toMatchObject({ berhenti: expect.stringMatching(/layak tayang/) as unknown as string });
    expect(rencanaJalanM2d15(s, 'gagal')).toMatchObject({ id: 'm2d15-opus-2', pagu: 1.5 });
  });
  it('tidak ada jalan ke-3', () => {
    expect(rencanaJalanM2d15([{ id: 'm2d15-opus-1', biaya_usd: 1, terbit: false }, { id: 'm2d15-opus-2', biaya_usd: 1, terbit: false }], 'gagal')).toHaveProperty('berhenti');
  });
  it('pagu D-4 habis → berhenti', () => expect(rencanaJalanM2d15([{ id: 'm2d15-opus-1', biaya_usd: 2.7, terbit: false }], null)).toHaveProperty('berhenti'));
  it('penilai = 3,00 − D-4 (amandemen T2: tanpa minimum)', () => {
    expect(paguPenilaiM2d15(1.25)).toBe(1.75);
    expect(paguPenilaiM2d15(2.7)).toBe(0.3);
    expect(paguPenilaiM2d15(3.2)).toBe(0); // amandemen T2: tanpa minimum
  });
});

describe('audit (b): ≤ 2/4 tanpa kartu untuk tiap omongan versi lulus', () => {
  const b = (no: number, lulus: boolean, k: number) => ({ jalan: 'm2d15-opus-1', no, lulus, tanpa_kartu_benar: k, n: 4 });
  it('semua ≤ 2 → lulus; satu 3/4 → gagal; versi tidak lulus diabaikan; belum ada → null', () => {
    expect(auditJalan({ per_butir: [b(1, true, 2), b(2, true, 0), b(3, true, 1)] }, 'm2d15-opus-1')).toBe('lulus');
    expect(auditJalan({ per_butir: [b(1, true, 2), b(2, true, 3), b(3, true, 1)] }, 'm2d15-opus-1')).toBe('gagal');
    expect(auditJalan({ per_butir: [b(1, true, 2), b(2, false, 4)] }, 'm2d15-opus-1')).toBe('lulus');
    expect(auditJalan(null, 'm2d15-opus-1')).toBeNull();
    expect(auditJalan({ per_butir: [b(1, true, 2)] }, 'm2d15-opus-2')).toBeNull();
  });
});
