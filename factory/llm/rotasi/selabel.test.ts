/** M2d-21: ukuran tebak selabel (kunci lawan kembaran selabelnya) dan kalibrasinya pada data tersimpan. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { KunciOpsi } from '../draf.ts';
import { AKAR } from '../env.ts';
import { omonganLama, soalTayang } from '../patokan/bank-lama.ts';
import type { JawabanRotasi } from './rotasi.ts';
import { agregasiSelabel, AMBANG_P_SELABEL, labelBetul, MIN_SELABEL } from './selabel.ts';

const PILIHAN: Record<KunciOpsi, string> = { a: 'Betul, alasan satu.', b: 'Betul, alasan dua.', c: 'Keliru, alasan tiga.', d: 'Keliru, alasan empat.' };

/** `isi` tiap jawaban kondisi pesan+pilihan (`null` = tak terbaca); kunci = isi `kunci`. */
function jawab(isi: Array<number | null>, kunci: number): JawabanRotasi[] {
  return isi.map((x, i) => ({ model: `m${String(i % 3)}`, kondisi: 'pesan-pilihan', r: i % 4, huruf: x === null ? null : 'a', isi: x, isi_kunci: kunci, terbaca: x !== null, salinan: '', skor: x === null ? null : 1, alasan: '', biaya_usd: 0, panggilan: 1 }) as JawabanRotasi);
}

describe('ukuran selabel', () => {
  it('label dibaca dari awalan pilihan, juga bila berujukan', () => {
    expect(labelBetul(PILIHAN)).toEqual([true, true, false, false]);
    expect(labelBetul({ ...PILIHAN, c: 'Betul, tercatat [[x|Rp48]].' })).toEqual([true, true, true, false]);
  });
  it('kunci "Keliru" dan semua penebak memilih "Betul": tak ada bukti kunci terbedakan → lulus (dicatat)', () => {
    const s = agregasiSelabel(jawab(Array<number>(12).fill(0), 2), PILIHAN);
    expect(s).toMatchObject({ putusan: 'lulus', n: 12, n_selabel: 0, kunci: 0, p: null, bagian_betul: 1 });
    expect(s.alasan[0]).toMatch(/terlalu sedikit/);
  });
  it('kunci "Betul", penebak memilih kunci 9 dan kembarannya 0 → tolak, alasan menyebut kembaran', () => {
    const s = agregasiSelabel(jawab([...Array<number>(9).fill(0), 2, 2, 3], 0), PILIHAN);
    expect(s).toMatchObject({ putusan: 'tolak', n_selabel: 9, kunci: 9 });
    expect(s.p as number).toBeLessThan(AMBANG_P_SELABEL);
    expect(s.alasan[0]).toMatch(/9 memilih kunci dan 0 memilih kembarannya/);
  });
  it('kunci "Betul", penebak terbelah antara kunci dan kembarannya → lulus walau semuanya memilih "Betul"', () => {
    const s = agregasiSelabel(jawab([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0], 0), PILIHAN);
    expect(s).toMatchObject({ putusan: 'lulus', n_selabel: 12, kunci: 7, bagian_betul: 1 });
  });
  it(`jawaban selabel di bawah ${String(MIN_SELABEL)} tidak cukup untuk menolak`, () => {
    expect(agregasiSelabel(jawab([0, 0, 0, 0, 2, 2, 2, 2, 3, 3, 3, 3], 0), PILIHAN)).toMatchObject({ putusan: 'lulus', n_selabel: 4, kunci: 4 });
  });
  it('tak terbaca dibuang; lebih dari sepertiga tak terbaca → tak-terukur', () => {
    expect(agregasiSelabel(jawab([0, 0, 0, 0, 0, 0, 0, null, null, null, null, null], 0), PILIHAN).putusan).toBe('tak-terukur');
    expect(agregasiSelabel(jawab([0, 0, 0, 0, 0, 0, 0, 0, null, null, null, null], 0), PILIHAN)).toMatchObject({ putusan: 'tolak', n: 8, tak_terbaca: 4 });
  });
});

describe('kalibrasi pada jawaban penebak tersimpan (uji ulang M2d-11, 33 butir)', () => {
  const bank = new Map([...soalTayang(), ...omonganLama()].map((b) => [b.id, b]));
  const mentah = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d11/uji-ulang/mentah.json`, 'utf8')) as { hasil: Array<{ id: string; kelompok: string; rotasi: { jawaban: JawabanRotasi[] } }> };
  const putusan = mentah.hasil.map((e) => ({ id: e.id, kelompok: e.kelompok, s: agregasiSelabel(e.rotasi.jawaban, (bank.get(e.id) as NonNullable<ReturnType<typeof bank.get>>).omongan.pilihan) }));

  it('enam soal tayang (patokan "setara") tidak ada yang ditolak', () => {
    const tayang = putusan.filter((x) => x.kelompok === 'tayang');
    expect(tayang).toHaveLength(6);
    expect(tayang.filter((x) => x.s.putusan !== 'lulus').map((x) => x.id)).toEqual([]);
  });
  it('soal tayang DADA s2 ("Betul"): 7 dari 8 memilih kunci — lulus di ambang 0,02, akan ditolak di 0,05', () => {
    const s = putusan.find((x) => x.id === 'tayang-dada-s2-dividen-pemilik-kecil')?.s;
    expect(s).toMatchObject({ n_selabel: 8, kunci: 7, putusan: 'lulus' });
    expect(s?.p as number).toBeGreaterThan(AMBANG_P_SELABEL);
    expect(s?.p as number).toBeLessThan(0.05);
  });
  it('omongan lama yang bocor tetap tertangkap (7 dari 27)', () => {
    const lama = putusan.filter((x) => x.kelompok !== 'tayang');
    expect(lama).toHaveLength(27);
    expect(lama.filter((x) => x.s.putusan === 'tolak').map((x) => x.id).sort()).toEqual(['m2d10-tirt-v2', 'm2d3-tirt-o3', 'm2d4-dada-o2', 'm2d4-tirt-o1', 'm2d4-tirt-o3', 'm2d4-ultj-o1', 'm2d4-ultj-o2']);
  });
});
