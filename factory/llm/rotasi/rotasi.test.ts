/**
 * Protokol tebak rotasi M2d-11 D-2 (pra-registrasi §3): rotasi siklik benar-
 * benar menaruh kunci SEKALI di tiap huruf, pemetaan salinan teks → opsi
 * (kesamaan Dice, ambang 0,70, unggul 0,05), dan agregasi (konsistensi huruf =
 * model diabaikan; konsistensi isi kunci = gagal; proporsi ≤ 5/12 lulus,
 * ≤ 6/12 abu-abu, > 6/12 gagal; tak terbaca = kunci).
 */
import { describe, expect, it } from 'vitest';
import type { KunciOpsi } from '../draf.ts';
import {
  AMBANG_DICE,
  KONDISI,
  MODEL_ROTASI,
  agregasiRotasi,
  dice,
  normalTeks,
  pesanRotasi,
  petakanSalinan,
  priorHuruf,
  putar,
  uraiSalinan,
  type JawabanRotasi,
} from './rotasi.ts';

const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];
const PIL: Record<KunciOpsi, string> = {
  a: 'Betul, penutupan 9 Desember memang Rp97.',
  b: 'Keliru, penutupan 9 Desember Rp211, bukan Rp97.',
  c: 'Betul, Rp97 itu penutupan tertinggi sebelum hari ini.',
  d: 'Keliru, penutupan 9 Desember Rp150, bukan Rp97.',
};

describe('rotasi siklik', () => {
  it.each(HURUF)('kunci asal di %s: empat rotasi menaruh kunci tepat sekali di a, b, c, d', (k) => {
    const posisi = [0, 1, 2, 3].map((r) => putar({ pilihan: PIL, kunci: k }, r).kunci);
    expect([...posisi].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
  it('r0 = urutan asal; tiap rotasi permutasi isi yang sama; isi kunci ikut pindah', () => {
    expect(putar({ pilihan: PIL, kunci: 'b' }, 0)).toEqual({ pilihan: PIL, kunci: 'b', asal: { a: 0, b: 1, c: 2, d: 3 } });
    for (const r of [1, 2, 3]) {
      const p = putar({ pilihan: PIL, kunci: 'b' }, r);
      expect(Object.values(p.pilihan).sort()).toEqual(Object.values(PIL).sort());
      expect(p.pilihan[p.kunci]).toBe(PIL.b);
      for (const h of HURUF) expect(p.pilihan[h]).toBe(PIL[HURUF[p.asal[h]] as KunciOpsi]);
    }
  });
  it('r1 menggeser satu huruf: opsi a asal pindah ke b', () => {
    expect(putar({ pilihan: PIL, kunci: 'a' }, 1).pilihan.b).toBe(PIL.a);
    expect(putar({ pilihan: PIL, kunci: 'a' }, 1).pilihan.a).toBe(PIL.d);
  });
});

describe('pesan penebak rotasi', () => {
  const soal = { nama: 'Bima', jam: '20.15', pesan: 'Kemarin tutup Rp97, gw yakin.', pilihan: PIL };
  it('pilihan-saja tidak memuat pesan teman; pesan+pilihan memuatnya; keduanya meminta salinan teks', () => {
    const ps = pesanRotasi('pilihan-saja', soal).map((m) => m.content).join('\n');
    const pp = pesanRotasi('pesan-pilihan', soal).map((m) => m.content).join('\n');
    expect(ps).not.toContain('Kemarin tutup');
    expect(pp).toContain('Kemarin tutup Rp97');
    for (const x of [ps, pp]) {
      expect(x).toContain('a) Betul, penutupan 9 Desember memang Rp97.');
      expect(x).toContain('"teks"');
      expect(x).toMatch(/salin/i);
    }
  });
  it('tiga keluarga model, dua kondisi', () => {
    expect(MODEL_ROTASI.map((m) => m.model)).toEqual(['anthropic/claude-haiku-4.5', 'deepseek/deepseek-v4.1-flash', 'z-ai/glm-5.3']);
    expect(KONDISI).toEqual(['pilihan-saja', 'pesan-pilihan']);
  });
});

describe('salin teks → opsi', () => {
  it('urai JSON salinan; bentuk lain → null', () => {
    expect(uraiSalinan('{"teks": "Keliru, x.", "alasan": "y"}')).toEqual({ teks: 'Keliru, x.', alasan: 'y' });
    expect(uraiSalinan('```json\n{"teks":"a","alasan":""}\n```')?.teks).toBe('a');
    expect(uraiSalinan('b')).toBeNull();
    expect(uraiSalinan('{"pilihan": "b"}')).toBeNull();
  });
  it('salinan persis, berawalan huruf, berkutip, atau salah ketik kecil → opsi yang benar', () => {
    expect(petakanSalinan(PIL.b, PIL).huruf).toBe('b');
    expect(petakanSalinan(`b) ${PIL.b}`, PIL).huruf).toBe('b');
    expect(petakanSalinan(`"${PIL.d}"`, PIL).huruf).toBe('d');
    expect(petakanSalinan('Keliru, penutupan 9 desember Rp150 bukan Rp97', PIL).huruf).toBe('d');
    expect(petakanSalinan('Betul, Rp97 itu penutupan tertingi sebelum hari ini', PIL).huruf).toBe('c');
  });
  it('huruf saja, teks lain, atau terlalu mirip dua opsi → tak terpetakan', () => {
    expect(petakanSalinan('b', PIL).huruf).toBeNull();
    expect(petakanSalinan('Harganya naik terus karena ada yang memborong.', PIL).huruf).toBeNull();
    const kembar = { ...PIL, d: 'Keliru, penutupan 9 Desember Rp211, bukan Rp98.' };
    expect(petakanSalinan('Keliru, penutupan 9 Desember Rp211, bukan Rp9', kembar).huruf).toBeNull();
  });
  it('ambang Dice 0,70 dan normalisasi', () => {
    expect(AMBANG_DICE).toEqual({ min: 0.7, unggul: 0.05 });
    expect(normalTeks('(B) "Keliru,  Rp1.690!"')).toBe('keliru rp1 690');
    expect(dice('abc', 'abc')).toBe(1);
    expect(dice('abcd', 'wxyz')).toBe(0);
  });
});

/** Jawaban sintetis: model m, kondisi k, rotasi r memilih isi `isi` (indeks opsi asal; null = tak terbaca). */
function jawab(m: number, k: 'pilihan-saja' | 'pesan-pilihan', r: number, isi: number | null, kunciAsal = 1): JawabanRotasi {
  const huruf = isi === null ? null : (HURUF[(isi + r) % 4] as KunciOpsi);
  return { model: MODEL_ROTASI[m]?.model ?? 'x', kondisi: k, r, huruf, isi, isi_kunci: kunciAsal, terbaca: isi !== null, salinan: null, skor: null, alasan: '', biaya_usd: 0, panggilan: 1 };
}

function lengkap(f: (m: number, k: 'pilihan-saja' | 'pesan-pilihan', r: number) => number | null): JawabanRotasi[] {
  const h: JawabanRotasi[] = [];
  for (const k of KONDISI) for (const m of [0, 1, 2]) for (const r of [0, 1, 2, 3]) h.push(jawab(m, k, r, f(m, k, r)));
  return h;
}

describe('agregasi rotasi (syarat 3)', () => {
  it('tidak ada yang memilih kunci → lulus', () => {
    const p = agregasiRotasi(lengkap((m, _k, r) => [0, 2, 3][(m + r) % 3] as number));
    expect(p.putusan).toBe('lulus');
    expect(p.kondisi['pesan-pilihan'].kunci).toBe(0);
  });
  it('satu model memilih ISI kunci di 3/4 rotasi → gagal walau proporsi rendah', () => {
    const p = agregasiRotasi(lengkap((m, k, r) => (m === 0 && k === 'pilihan-saja' && r < 3 ? 1 : r === 0 ? 0 : r === 1 ? 2 : r === 2 ? 3 : 0)));
    expect(p.putusan).toBe('gagal');
    expect(p.alasan.join(' ')).toMatch(/isi kunci/);
  });
  it('model berhuruf konsisten (≥ 3/4 huruf sama) diabaikan', () => {
    // model 0 selalu memilih huruf "a" → isi berganti tiap rotasi
    const p = agregasiRotasi(lengkap((m, _k, r) => (m === 0 ? (4 - r) % 4 : r % 2 === 0 ? 0 : 2)));
    expect(p.kondisi['pesan-pilihan'].per_model[0]?.diabaikan).toBe(true);
    expect(p.kondisi['pesan-pilihan'].per_model[0]?.huruf_konsisten).toBe('a');
    expect(p.kondisi['pesan-pilihan'].n).toBe(8);
  });
  it('proporsi 5/12 lulus, 6/12 abu-abu (≤ 2/4 kunci per model), 7/12 gagal (pesan+pilihan)', () => {
    // kunci hanya di rotasi tertentu; isi lain bergantian supaya tidak berhuruf konsisten
    const pola = (jumlah: number) => (m: number, k: 'pilihan-saja' | 'pesan-pilihan', r: number): number => {
      if (k === 'pilihan-saja') return [0, 2, 3, 0][r] as number;
      const urut = m * 4 + r;
      const daftar = [0, 4, 8, 1, 5, 9, 2].slice(0, jumlah);
      return daftar.includes(urut) ? 1 : ([0, 2, 3, 0][r] as number);
    };
    expect(agregasiRotasi(lengkap(pola(5))).putusan).toBe('lulus');
    expect(agregasiRotasi(lengkap(pola(6))).putusan).toBe('abu-abu');
    expect(agregasiRotasi(lengkap(pola(7))).putusan).toBe('gagal');
  });
  it('tak terbaca dihitung kunci (konservatif)', () => {
    const p = agregasiRotasi(lengkap((m, k, r) => (k === 'pesan-pilihan' && m === 1 ? null : ([0, 2, 3, 0][r] as number))));
    expect(p.kondisi['pesan-pilihan'].kunci).toBe(4);
    expect(p.kondisi['pesan-pilihan'].tak_terbaca).toBe(4);
    expect(p.putusan).toBe('gagal');
  });
  it('semua model diabaikan → tak terukur, tidak lulus', () => {
    const p = agregasiRotasi(lengkap((_m, _k, r) => (4 - r) % 4));
    expect(p.putusan).toBe('tak-terukur');
  });
});

describe('prior huruf', () => {
  it('sebaran huruf per model dari jawaban terpetakan', () => {
    const j = lengkap((m, _k, r) => (m === 0 ? (6 - r) % 4 : 0));
    const p = priorHuruf(j);
    expect(p['anthropic/claude-haiku-4.5']).toEqual({ a: 0, b: 0, c: 8, d: 0, tak_terbaca: 0 });
    expect(p['deepseek/deepseek-v4.1-flash']).toEqual({ a: 2, b: 2, c: 2, d: 2, tak_terbaca: 0 });
  });
});
