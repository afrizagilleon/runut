/**
 * M2d-16 D-1: agregasi tebak rotasi v2 + pencocok salinan v2.
 */
import { describe, expect, it } from 'vitest';
import type { KunciOpsi } from '../draf.ts';
import { agregasiRotasi, petakanSalinan, type JawabanRotasi, type Kondisi } from './rotasi.ts';
import { agregasiRotasiV2, ambangTolak, binomEkor, petakanSalinanV2 } from './rotasi-v2.ts';

const MODEL = ['haiku', 'deepseek', 'glm'];

/** `isi[model][r]` = indeks isi yang dipilih (null = tak terbaca); kunci = isi 0. */
function jawab(kondisi: Kondisi, isi: Array<Array<number | null>>): JawabanRotasi[] {
  return isi.flatMap((baris, m) =>
    baris.map((x, r) => ({
      model: MODEL[m] as string, kondisi, r, huruf: x === null ? null : (['a', 'b', 'c', 'd'][(x + r) % 4] as KunciOpsi), isi: x, isi_kunci: 0, terbaca: x !== null,
      salinan: null, skor: null, alasan: '', biaya_usd: 0, panggilan: 1,
    })),
  );
}
const acak = [[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 1, 1]];

describe('binomEkor', () => {
  it('nilai acuan n = 12, p = 0,25', () => {
    expect(binomEkor(0, 12)).toBe(1);
    expect(binomEkor(7, 12)).toBeCloseTo(0.01425, 4);
    expect(binomEkor(8, 12)).toBeCloseTo(0.00278, 4);
    expect(binomEkor(13, 12)).toBe(0);
  });
  it('n = 12 → tolak mulai 8 kunci (kontrak D-1)', () => {
    expect(ambangTolak(12)).toBe(8);
    expect(ambangTolak(3)).toBeNull(); // 0,25³ = 0,0156 ≥ 0,01
    expect(ambangTolak(4)).toBe(4);
  });
});

describe('agregasiRotasiV2', () => {
  it('SATU model memilih isi kunci 4/4, total 5/12 → lulus (aturan lama: gagal)', () => {
    const j = [...jawab('pilihan-saja', acak), ...jawab('pesan-pilihan', [[0, 0, 0, 0], [1, 2, 3, 0], [2, 3, 1, 1]])];
    expect(agregasiRotasi(j).putusan).toBe('gagal');
    const v2 = agregasiRotasiV2(j);
    expect(v2.putusan).toBe('lulus');
    expect(v2.kondisi['pesan-pilihan']).toMatchObject({ kunci: 5, n: 12, tak_terbaca: 0 });
  });

  it('kunci 8/12 di pesan+pilihan → tolak; 7/12 → lulus', () => {
    const d = jawab('pilihan-saja', acak);
    expect(agregasiRotasiV2([...d, ...jawab('pesan-pilihan', [[0, 0, 0, 0], [0, 0, 0, 1], [0, 2, 3, 1]])]).putusan).toBe('tolak');
    expect(agregasiRotasiV2([...d, ...jawab('pesan-pilihan', [[0, 0, 0, 0], [0, 0, 2, 1], [0, 2, 3, 1]])]).putusan).toBe('lulus');
  });

  it('tak terbaca DIBUANG, bukan dihitung kunci: 4 tak terbaca + 0 kunci → lulus 0/8 (aturan lama menghitung 4 kunci dan gagal)', () => {
    const j = [...jawab('pilihan-saja', acak), ...jawab('pesan-pilihan', [[null, null, null, null], [1, 2, 3, 1], [2, 3, 1, 1]])];
    expect(agregasiRotasi(j).putusan).toBe('gagal');
    const v2 = agregasiRotasiV2(j);
    expect(v2.putusan).toBe('lulus');
    expect(v2.kondisi['pesan-pilihan']).toMatchObject({ kunci: 0, n: 8, tak_terbaca: 4, tak_terukur: false });
    expect(v2.alasan[0]).toContain('4 tak terbaca dibuang');
  });

  it('tak terbaca > 1/3 di pesan+pilihan → tak-terukur (5 dari 12), walau sisanya semua kunci', () => {
    const j = [...jawab('pilihan-saja', acak), ...jawab('pesan-pilihan', [[null, null, null, null], [null, 0, 0, 0], [0, 0, 0, 0]])];
    const v2 = agregasiRotasiV2(j);
    expect(v2.putusan).toBe('tak-terukur');
    expect(v2.alasan[0]).toContain('5 dari 12');
  });

  it('pilihan-saja hanya diagnosis: 12/12 kunci atau semua tak terbaca di pilihan-saja tidak mengubah putusan', () => {
    const pp = jawab('pesan-pilihan', acak);
    const a = agregasiRotasiV2([...jawab('pilihan-saja', [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), ...pp]);
    expect(a.putusan).toBe('lulus');
    expect(a.diagnosis).toContain('kunci 12 dari 12');
    const b = agregasiRotasiV2([...jawab('pilihan-saja', [[null, null, null, null], [null, null, null, null], [null, null, null, null]]), ...pp]);
    expect(b.putusan).toBe('lulus');
    expect(b.diagnosis).toContain('tak terukur');
  });

  it('tanpa jawaban pesan+pilihan → tak-terukur', () => {
    expect(agregasiRotasiV2(jawab('pilihan-saja', acak)).putusan).toBe('tak-terukur');
  });
});

describe('petakanSalinanV2', () => {
  // Pilihan m2d15-opus-3 omongan 2 versi 2 (audit Temuan 11): 23 salinan persis ditandai tak terbaca.
  const mirip: Record<KunciOpsi, string> = {
    a: 'Betul, tutupnya [[harga-2025-11-28|Rp57]] lebih tinggi dari [[harga-2025-11-27|Rp52]] sehari sebelumnya.',
    b: 'Keliru, tutupnya [[harga-2025-11-27|Rp52]] lebih rendah dari [[harga-2025-11-28|Rp57]] sehari sebelumnya.',
    c: 'Betul, tutupnya [[harga-2025-12-01|Rp62]] lebih tinggi dari [[harga-2025-11-28|Rp57]] sehari sebelumnya.',
    d: 'Keliru, tutupnya [[harga-2025-11-26|Rp48]] lebih rendah dari [[harga-2025-11-27|Rp52]] sehari sebelumnya.',
  };
  it('salinan PERSIS pada pilihan mirip: lama → tak terpetakan, v2 → opsi itu', () => {
    const salinan = 'Betul, tutupnya Rp57 lebih tinggi dari Rp52 sehari sebelumnya.';
    expect(petakanSalinan(salinan, mirip).huruf).toBeNull();
    expect(petakanSalinanV2(salinan, mirip)).toEqual({ huruf: 'a', skor: 1, cara: 'persis' });
  });
  it('normalisasi: rujukan [[id|teks]], huruf opsi di depan, huruf besar, tanda baca', () => {
    const p = { ...mirip, a: 'Betul, dividennya [[div-1|Rp140]] per lembar.', b: 'Betul, dividennya [[div-2|Rp14]] per lembar.' };
    expect(petakanSalinanV2('a) betul dividennya Rp140 per lembar', p)).toMatchObject({ huruf: 'a', cara: 'persis' });
    expect(petakanSalinanV2('[[div-2|Rp14]] per lembar. Betul, dividennya', p).cara).not.toBe('persis');
  });
  it('tanpa cocok persis → Dice lama (hasil sama dengan petakanSalinan)', () => {
    const p: Record<KunciOpsi, string> = { a: 'Betul, dividennya naik tahun ini.', b: 'Keliru, bursa menyetop perdagangan.', c: 'Betul, direktur membeli saham.', d: 'Keliru, laporan keuangan terlambat.' };
    const s = 'Keliru, bursa menyetop perdagangannya';
    expect(petakanSalinanV2(s, p).huruf).toBe(petakanSalinan(s, p).huruf);
    expect(petakanSalinanV2(s, p)).toMatchObject({ huruf: 'b', cara: 'dice' });
    expect(petakanSalinanV2('saya tidak dapat menjawab', p).huruf).toBeNull();
  });
  it('dua opsi yang normalisasinya sama persis → tak terpetakan', () => {
    expect(petakanSalinanV2('Betul.', { a: 'Betul.', b: 'betul', c: 'x y z', d: 'p q r' }).huruf).toBeNull();
  });
});
