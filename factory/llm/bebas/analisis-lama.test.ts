/**
 * D-A M2d-13 (pra-registrasi §9): atribusi penulis, ukuran rotasi, dan
 * keluaran tersimpan = hasil skrip.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import type { JawabanRotasi } from '../rotasi/rotasi.ts';
import { analisis, atribusi, konsistenIsiKunci, lajuKunci, modelPenulisJejak, muatButir, priorHuruf, ringkasan, selisihDalamSelisih, wilson } from './analisis-lama.ts';

function j(isi: number | null, huruf: 'a' | 'b' | 'c' | 'd' | null = 'a', isiKunci = 0): JawabanRotasi {
  return { model: 'm', kondisi: 'pesan-pilihan', r: 0, huruf: isi === null ? null : huruf, isi, isi_kunci: isiKunci, terbaca: isi !== null, salinan: null, skor: null, alasan: '', biaya_usd: 0, panggilan: 1 };
}

describe('atribusi penulis (pra-registrasi §9)', () => {
  it('soal tayang = Opus + pemilik (Anthropic)', () => {
    expect(atribusi('tayang-dada-s1-kata-bursa', null)).toMatchObject({ kelompok: 'opus-pemilik', keluarga: 'anthropic' });
  });
  it('M2d-3…M2d-8 = DeepSeek hanya bila semua langkah menulis di jejak DeepSeek', () => {
    expect(atribusi('m2d3-tirt-o1', ['deepseek-ai/DeepSeek-V4.1-Flash'])).toMatchObject({ kelompok: 'deepseek', keluarga: 'deepseek' });
    expect(atribusi('m2d8-tirt-o1', ['deepseek/deepseek-v4.1-flash'])).toMatchObject({ kelompok: 'deepseek' });
    expect(atribusi('m2d5-tirt-o1', ['deepseek/deepseek-v4.1-flash', 'z-ai/glm-5.3'])).toMatchObject({ kelompok: 'tak-diketahui' });
    expect(atribusi('m2d4-ultj-o1', null)).toMatchObject({ kelompok: 'tak-diketahui' });
  });
  it('M2d-10 dan M2d-11 = templat (campuran), bukan satu keluarga', () => {
    expect(atribusi('m2d10a1-tirt-o2', null)).toMatchObject({ kelompok: 'templat-m2d10', keluarga: 'campuran' });
    expect(atribusi('m2d10-pemanasan', null)).toMatchObject({ kelompok: 'templat-m2d10' });
    expect(atribusi('m2d11-tirt-7-o1-p3', null)).toMatchObject({ kelompok: 'templat-m2d11', keluarga: 'campuran' });
    expect(atribusi('aneh', null)).toMatchObject({ kelompok: 'tak-diketahui' });
  });
  it('model penulis dibaca dari langkah menulis saja', () => {
    const jejak = { langkah: [{ jenis: 'susun', model: 'x/ds' }, { jenis: 'gerbang-tebak', model: 'z/glm' }, { jenis: 'tulis-ulang', model: 'x/ds' }, { jenis: 'validator', model: null }] };
    expect(modelPenulisJejak(jejak)).toEqual(['x/ds']);
  });
});

describe('ukuran', () => {
  it('laju utama hanya jawaban terbaca; kepekaan menghitung tak terbaca sebagai kunci', () => {
    const l = lajuKunci([j(0), j(1), j(null), j(null)]);
    expect(l).toMatchObject({ kunci: 1, n: 2, tak_terbaca: 2, laju: 0.5, laju_kepekaan: 0.75 });
    expect(lajuKunci([]).laju).toBeNull();
  });
  it('konsistensi isi kunci = ≥ 3 dari 4 rotasi terbaca', () => {
    expect(konsistenIsiKunci([j(0), j(0), j(0), j(1)])).toBe(true);
    expect(konsistenIsiKunci([j(0), j(0), j(null), j(1)])).toBe(false);
  });
  it('bias huruf: satu huruf ≥ 0,32 dengan n ≥ 200', () => {
    const banyak = (h: 'a' | 'b' | 'c' | 'd', n: number): JawabanRotasi[] => Array.from({ length: n }, () => j(1, h));
    expect(priorHuruf([...banyak('a', 50), ...banyak('b', 65), ...banyak('c', 50), ...banyak('d', 35)])).toMatchObject({ huruf_maks: 'b', bias: true, n: 200 });
    expect(priorHuruf([...banyak('a', 50), ...banyak('b', 63), ...banyak('c', 50), ...banyak('d', 37)]).bias).toBe(false);
    expect(priorHuruf([...banyak('b', 100)]).bias).toBe(false);
  });
  it('selisih-dalam-selisih menghapus efek utama penebak dan butir', () => {
    expect(selisihDalamSelisih({ sendiri: 0.2, lain: 0.5 }, { sendiri: 0.4, lain: 0.4 })).toBeCloseTo(-0.3);
    expect(selisihDalamSelisih({ sendiri: 0.6, lain: 0.3 }, { sendiri: 0.6, lain: 0.3 })).toBeCloseTo(0);
    expect(selisihDalamSelisih({ sendiri: null, lain: 0.3 }, { sendiri: 0.6, lain: 0.3 })).toBeNull();
  });
  it('interval Wilson memuat porsi', () => {
    const w = wilson(3, 12);
    expect(w).not.toBeNull();
    expect((w as [number, number])[0]).toBeLessThan(0.25);
    expect((w as [number, number])[1]).toBeGreaterThan(0.25);
    expect(wilson(0, 0)).toBeNull();
  });
});

const ADA = existsSync(`${AKAR}eval/keluaran-m2d11/uji-ulang/mentah.json`) && existsSync(`${AKAR}eval/keluaran-m2d13/analisis-lama/hasil.json`);

describe.skipIf(!ADA)('keluaran tersimpan D-A', () => {
  it('hasil.json dan ringkasan.md = hasil skrip dari data M2d-11', () => {
    const butir = muatButir();
    const audit = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d11/audit-opus/satu-soal/nilai.json`, 'utf8')) as Parameters<typeof analisis>[1];
    const luar = (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d11/uji-ulang/mentah.json`, 'utf8')) as { hasil: Array<{ id: string; luar: string | null }> }).hasil.map((h) => ({ id: h.id, luar: h.luar }));
    const h = analisis(butir, audit, luar);
    expect(JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d13/analisis-lama/hasil.json`, 'utf8'))).toEqual(JSON.parse(JSON.stringify(h)));
    expect(readFileSync(`${AKAR}eval/keluaran-m2d13/analisis-lama/ringkasan.md`, 'utf8').replace(/\r\n/g, '\n')).toBe(ringkasan(h));
  });
  it('33 soal bank teratribusi; tidak ada "tak diketahui" di bank', () => {
    const butir = muatButir();
    const bank = butir.filter((b) => !/^m2d11-tirt-\d+-o\d+-p\d+$/.test(b.id));
    expect(bank).toHaveLength(33);
    expect(bank.filter((b) => b.atribusi.kelompok === 'tak-diketahui')).toEqual([]);
    expect(bank.filter((b) => b.atribusi.kelompok === 'deepseek')).toHaveLength(21);
  });
});
