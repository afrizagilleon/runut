/**
 * Bank uji ulang M2d-11: teks omongan lama = bahan yang dulu dikirim ke penguji
 * luar (dicek di pemuat), hasil luar dari jawaban mentah, himpunan recall.
 */
import { describe, expect, it } from 'vitest';
import { bankUjiUlang, cocokBahan, uraiBahanTebak, urutUjiUlang } from './bank-lama.ts';

describe('bank uji ulang', () => {
  const bank = bankUjiUlang();
  it('6 soal tayang + 27 omongan lama, id unik', () => {
    expect(bank.filter((b) => b.kelompok === 'tayang')).toHaveLength(6);
    expect(bank.filter((b) => b.kelompok === 'lama')).toHaveLength(27);
    expect(new Set(bank.map((b) => b.id)).size).toBe(33);
  });
  it('himpunan recall = tertebak ≥ 2/3 penguji luar (12 omongan), dihitung dari jawaban mentah', () => {
    const r = bank.filter((b) => b.tertebak_luar);
    expect(r).toHaveLength(12);
    for (const b of r) expect(b.luar?.tebak_benar ?? 0).toBeGreaterThanOrEqual(2);
    for (const b of bank.filter((x) => x.kelompok === 'lama' && !x.tertebak_luar)) expect(b.luar?.tebak_benar ?? 9).toBeLessThan(2);
  });
  it('urutan uji ulang: tayang → recall → sisanya', () => {
    const u = urutUjiUlang(bank);
    expect(u.slice(0, 6).every((b) => b.kelompok === 'tayang')).toBe(true);
    expect(u.slice(6, 18).every((b) => b.tertebak_luar)).toBe(true);
    expect(u.slice(18).every((b) => !b.tertebak_luar && b.kelompok === 'lama')).toBe(true);
  });
  it('pencocok bahan menolak teks yang berbeda (sabotase)', () => {
    const md = '### Q1\nPesan dari A (20.00): "halo"\nPertanyaan: x\na) Betul, satu.\nb) Keliru, dua.\nc) Betul, tiga.\nd) Keliru, empat.\n';
    const b = uraiBahanTebak(md).get('Q1');
    expect(b).toBeDefined();
    const o = { nama: 'A', jam: '20.00', pesan: 'halo', angka_pesan: [], kartu: [], kartu_penentu: [], pilihan: { a: 'Betul, satu.', b: 'Keliru, dua.', c: 'Betul, tiga.', d: 'Keliru, empat.' }, kunci: 'a' as const, penjelasan: '' };
    expect(cocokBahan(o, b as never)).toEqual([]);
    expect(cocokBahan({ ...o, pilihan: { ...o.pilihan, c: 'Betul, tiga!' } }, b as never)).toEqual(['pilihan c berbeda']);
  });
});
