/** Label pengecoh, umpan balik, sudut, anti-salin (pra-registrasi M2d-13 §4–§5). */
import { describe, expect, it } from 'vitest';
import { beriLabel, drafTirt7 } from './palsu.ts';
import { uraiKeluaranBebas } from './prompt.ts';
import type { OmonganBebas } from './skema.ts';
import { periksaLabel, periksaSalin, periksaSudut, periksaUmpanBalik } from './struktur.ts';

const [o1, o2, o3] = drafTirt7();
const b2 = beriLabel(o2); // kunci d

describe('label pengecoh', () => {
  it('label sah: tiga huruf bukan kunci, jenis dari daftar, rujukan kartu', () => {
    expect(periksaLabel(b2)).toEqual([]);
  });
  it('label kurang, label di kunci, jenis asing, rujukan bukan kartu → ditolak', () => {
    const { a: _a, ...tanpaA } = b2.pengecoh;
    expect(periksaLabel({ ...b2, pengecoh: tanpaA }).some((x) => x.startsWith('pengecoh a'))).toBe(true);
    expect(periksaLabel({ ...b2, pengecoh: { ...b2.pengecoh, d: { jenis: 'salah-periode', rujukan: b2.kartu[0] ?? '', umpan_balik: 'x' } } }).some((x) => x.includes('huruf kunci'))).toBe(true);
    expect(periksaLabel({ ...b2, pengecoh: { ...b2.pengecoh, a: { jenis: 'asal' as never, rujukan: b2.kartu[0] ?? '', umpan_balik: 'x' } } }).some((x) => x.includes('bukan salah satu'))).toBe(true);
    expect(periksaLabel({ ...b2, pengecoh: { ...b2.pengecoh, a: { jenis: 'salah-periode', rujukan: 'harga-2025-12-05', umpan_balik: 'x' } } }).some((x) => x.includes('bukan kartu'))).toBe(true);
  });
  it('percaya-otoritas hanya untuk pengecoh "Betul" bila kunci "Keliru"', () => {
    // o2: kunci d "Keliru, …"; a "Betul, …" boleh, b "Keliru, …" tidak
    expect(periksaLabel({ ...b2, pengecoh: { ...b2.pengecoh, a: { jenis: 'percaya-otoritas', rujukan: b2.kartu[0] ?? '', umpan_balik: '' } } })).toEqual([]);
    expect(periksaLabel({ ...b2, pengecoh: { ...b2.pengecoh, b: { jenis: 'percaya-otoritas', rujukan: b2.kartu[0] ?? '', umpan_balik: '' } } }).some((x) => x.includes('percaya-otoritas'))).toBe(true);
  });
});

describe('umpan balik', () => {
  it('sah: nama jenis + "kartu N" sesuai rujukan', () => {
    expect(periksaUmpanBalik(b2)).toEqual([]);
  });
  it('tanpa nama jenis / nomor kartu salah / terlalu panjang → ditolak', () => {
    const e = b2.pengecoh.a;
    if (e === undefined) throw new Error('a');
    const u = (t: string): OmonganBebas => ({ ...b2, pengecoh: { ...b2.pengecoh, a: { ...e, umpan_balik: t } } });
    expect(periksaUmpanBalik(u('cek lagi kartu 1.')).some((x) => x.includes('nama jenis'))).toBe(true);
    const n = b2.kartu.indexOf(e.rujukan) + 1;
    expect(periksaUmpanBalik(u(`salah periode: cek kartu ${String(n === 1 ? 2 : 1)}.`)).some((x) => x.includes(`kartu ${String(n)}`))).toBe(true);
    expect(periksaUmpanBalik(u(`salah periode: cek kartu ${String(n)}. ${'x'.repeat(200)}`)).some((x) => x.includes('karakter'))).toBe(true);
  });
  it('penjelasan wajib merujuk kartu penentu; pertanyaan cek "?" dan ≤ 20 kata', () => {
    expect(periksaUmpanBalik({ ...b2, penjelasan: 'Lihat kartunya. Salah-kaprah yang umum: x.' }).some((x) => x.includes('kartu penentu'))).toBe(true);
    expect(periksaUmpanBalik({ ...b2, pertanyaan_cek: 'Cek kartunya.' }).some((x) => x.includes('"?"'))).toBe(true);
    expect(periksaUmpanBalik({ ...b2, pertanyaan_cek: `${'kata '.repeat(21)}?` }).some((x) => x.includes('kata'))).toBe(true);
  });
});

describe('sudut dan salinan', () => {
  it('kartu penentu sama dengan omongan bernomor lebih kecil → omongan yang lebih besar ditolak', () => {
    const semua = [beriLabel(o1), beriLabel({ ...o2, kartu: [...o2.kartu, 'harga-2025-12-09'], kartu_penentu: ['harga-2025-12-09'] }), beriLabel(o3)];
    expect(periksaSudut(2, semua).length).toBe(1);
    expect(periksaSudut(1, semua)).toEqual([]);
    expect(periksaSudut(3, semua)).toEqual([]);
  });
  it('potongan 5 kata soal tayang → ditolak', () => {
    expect(periksaSalin({ ...b2, pesan: 'Saham D naik 22 kali! Pasti mau dibeli investor asing, bursa udah umumin.' }).length).toBeGreaterThan(0);
    expect(periksaSalin(b2)).toEqual([]);
  });
});

describe('urai keluaran penulis', () => {
  it('nomor dari "no"; tanpa "no" → urutan permintaan; yang hilang dilaporkan', () => {
    const j = JSON.stringify({ omongan: [{ no: 3, ...b2 }, { ...b2 }] });
    const u = uraiKeluaranBebas(j, [1, 3]);
    expect([...u.omongan.keys()].sort()).toEqual([1, 3]);
    expect(uraiKeluaranBebas('bukan json', [1]).masalah.length).toBeGreaterThan(0);
    expect(uraiKeluaranBebas(JSON.stringify({ omongan: [{ no: 1, ...b2 }] }), [1, 2]).masalah).toEqual(['omongan 2 tidak ada di keluaran']);
  });
});
