/**
 * Bank sudut M2d-15 D-2: angka dihitung dari berkas tersimpan beku (dicocokkan
 * dengan laporan M2d-11/M2d-13), label menurut aturan pra-registrasi §5, dan
 * teks prompt tidak membawa teks soal (anti-salin).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { teksPolos } from '../../skema/rujukan.ts';
import { AKAR } from '../env.ts';
import type { PaketFakta } from '../paket.ts';
import { bacaSumberBank, bankSudut, hitungBank, labelSudut, teksBank, type HitunganSudut, type StatSudut } from './bank-sudut.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const bank = bankSudut(paket);
const sudut = (id: string): StatSudut => {
  const s = bank.find((x) => x.fact_id === id);
  if (s === undefined) throw new Error(id);
  return s;
};
const h = (x: Partial<HitunganSudut>): HitunganSudut => ({ dicoba: 1, sampai_rotasi: 0, tertebak_penebak: 0, ditolak_kode: 0, ditolak_kartu: 0, ditolak_kritikus: 0, tulis_gagal: 0, lulus: 0, ...x });

describe('bank sudut: angka dari berkas tersimpan', () => {
  it('sumber lengkap: 29 versi M2d-11 (laporan: 29 versi), 30 versi terbaca M2d-13 Opus+Haiku, 2 uji ulang M2d-14', () => {
    const s = bacaSumberBank();
    expect(s.versi.filter((v) => v.sumber === 'm2d11')).toHaveLength(29);
    expect(s.versi.filter((v) => v.sumber === 'm2d13')).toHaveLength(30);
    expect(s.versi.filter((v) => v.sumber === 'm2d14')).toHaveLength(2);
    expect(s.audit.filter((a) => a.sumber === 'm2d11')).toHaveLength(3);
    expect(s.audit.filter((a) => a.sumber === 'm2d13')).toHaveLength(12);
  });

  it('satu baris per fakta paket (20)', () => {
    expect(bank.map((s) => s.fact_id)).toEqual(paket.fakta.map((f) => f.fact_id));
  });

  it('volume hari dihentikan: 4 versi Opus M2d-13, lulus 1 (opus-2 o3), Opus tanpa kartu 1/8 (0/4 + 1/4) → terbukti', () => {
    const s = sudut('volume-2025-12-10');
    expect(s.total).toMatchObject({ dicoba: 4, ditolak_kode: 3, sampai_rotasi: 1, lulus: 1 });
    expect(s.opus).toEqual({ k: 1, n: 8, butir: 2 });
    expect(s.label).toBe('terbukti');
  });

  it('harga kemarin (angka-lain-waktu M2d-11): 24 versi di 7 jalan, lulus 1 (TIRT-7 o1 v3), Opus satu soal 1/4 → terbukti', () => {
    const s = sudut('harga-2025-12-09');
    expect(s.per_sumber.m2d11).toMatchObject({ dicoba: 24, lulus: 1 });
    expect(s.total.tertebak_penebak).toBe(16);
    expect(s.opus).toEqual({ k: 1, n: 4, butir: 1 });
    expect(s.label).toBe('terbukti');
  });

  it('alasan penghentian awal tahun: Opus 9/12 (opus-2 o1 4/4, haiku 4/4 + 1/4) → gagal walau pernah lulus gerbang', () => {
    const s = sudut('susp-2025-01-21');
    expect(s.total.lulus).toBe(1);
    expect(s.opus).toEqual({ k: 9, n: 12, butir: 3 });
    expect(s.label).toBe('gagal');
  });

  it('kelipatan: M2d-14 dua suntingan tertebak penebak; Opus 10/12 → gagal', () => {
    const s = sudut('kelipatan-2025-11-26-2025-12-09');
    expect(s.per_sumber.m2d14).toMatchObject({ dicoba: 2, tertebak_penebak: 2 });
    expect(s.opus).toEqual({ k: 10, n: 12, butir: 3 });
    expect(s.label).toBe('gagal');
  });

  it('hari naik beruntun (Opus 4/4) dan selisih (7/8) gagal; alasan hari ini campuran (12/20)', () => {
    expect(sudut('hari-naik-beruntun').label).toBe('gagal');
    expect(sudut('naik-2025-11-26-2025-12-09').opus).toEqual({ k: 7, n: 8, butir: 2 });
    expect(sudut('naik-2025-11-26-2025-12-09').label).toBe('gagal');
    expect(sudut('susp-2025-12-10').opus).toEqual({ k: 12, n: 20, butir: 5 });
    expect(sudut('susp-2025-12-10').label).toBe('campuran');
  });

  it('13 fakta belum pernah jadi kartu penentu', () => {
    expect(bank.filter((s) => s.label === 'belum dicoba').map((s) => s.fact_id)).toEqual([
      'harga-2025-11-26', 'harga-2025-11-27', 'harga-2025-11-28', 'harga-2025-12-01', 'harga-2025-12-02', 'harga-2025-12-03', 'harga-2025-12-04',
      'harga-2025-12-05', 'harga-2025-12-08', 'volume-2025-11-25', 'volume-2025-11-26', 'volume-2025-12-09', 'rups-2025-09-25',
    ]);
  });
});

describe('label sudut (pra-registrasi §5)', () => {
  it('belum dicoba', () => expect(labelSudut(h({ dicoba: 0 }), { k: 0, n: 0 })).toBe('belum dicoba'));
  it('gagal: Opus ≥ 0,75 dengan n ≥ 4, walau lulus', () => expect(labelSudut(h({ lulus: 1, sampai_rotasi: 1 }), { k: 3, n: 4 })).toBe('gagal'));
  it('n < 4 tidak cukup untuk gagal-Opus', () => expect(labelSudut(h({ lulus: 1, sampai_rotasi: 1 }), { k: 3, n: 3 })).toBe('campuran'));
  it('gagal: sampai rotasi ≥ 2 dan semuanya tertebak', () => expect(labelSudut(h({ sampai_rotasi: 2, tertebak_penebak: 2 }), { k: 0, n: 0 })).toBe('gagal'));
  it('sekali sampai rotasi lalu tertebak belum gagal', () => expect(labelSudut(h({ sampai_rotasi: 1, tertebak_penebak: 1 }), { k: 0, n: 0 })).toBe('campuran'));
  it('terbukti: lulus dan Opus ≤ 0,5 (batas)', () => expect(labelSudut(h({ lulus: 1, sampai_rotasi: 1 }), { k: 2, n: 4 })).toBe('terbukti'));
  it('lulus tanpa audit = campuran', () => expect(labelSudut(h({ lulus: 1, sampai_rotasi: 1 }), { k: 0, n: 0 })).toBe('campuran'));
  it('lulus dengan Opus di antara 0,5 dan 0,75 = campuran', () => expect(labelSudut(h({ lulus: 1, sampai_rotasi: 1 }), { k: 5, n: 8 })).toBe('campuran'));
});

describe('teks bank untuk prompt: tanpa teks soal (anti-salin)', () => {
  const teks = teksBank(bank).toLowerCase();
  const lima = (s: string): string[] => {
    const k = teksPolos(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x !== '');
    const g: string[] = [];
    for (let i = 0; i + 5 <= k.length; i++) g.push(k.slice(i, i + 5).join(' '));
    return g;
  };
  const kataTeks = teks.split(/[^\p{L}\p{N}]+/u).filter((x) => x !== '').join(' ');
  /** Semua teks soal yang pernah ditulis di jalan sumber (bukan hanya yang lulus). */
  const soal: string[] = [];
  for (const j of ['m2d11-tirt-1', 'm2d11-tirt-2', 'm2d11-tirt-3', 'm2d11-tirt-4', 'm2d11-tirt-5', 'm2d11-tirt-6', 'm2d11-tirt-7', 'm2d13-opus-1', 'm2d13-opus-2', 'm2d13-haiku-1', 'm2d13-haiku-2']) {
    const hasil = JSON.parse(readFileSync(`${AKAR}eval/penyusun/${j}/hasil.json`, 'utf8')) as { versi: Array<{ omongan: { pesan: string; pilihan: Record<string, string>; penjelasan: string; pengecoh?: Record<string, { umpan_balik: string }> } | null }> };
    for (const v of hasil.versi) {
      if (v.omongan === null) continue;
      soal.push(v.omongan.pesan, ...Object.values(v.omongan.pilihan), v.omongan.penjelasan, ...Object.values(v.omongan.pengecoh ?? {}).map((p) => p.umpan_balik));
    }
  }

  it('ada teks soal untuk dibandingkan', () => expect(soal.length).toBeGreaterThan(300));

  it('tidak ada potongan 5 kata dari pesan, pilihan, penjelasan, atau umpan balik mana pun', () => {
    const bocor = soal.flatMap(lima).filter((g) => kataTeks.includes(g));
    expect(bocor).toEqual([]);
  });

  it('hanya nama, deskripsi, statistik, label', () => {
    expect(teks).toContain('volume-2025-12-10 [terbukti]');
    expect(teks).toContain('auditor kuat tanpa kartu memilih kunci: 1/8 rotasi');
    expect(teks).not.toMatch(/haiku|deepseek|glm|opus/);
  });

  it('hitungBank murni: tanpa versi → semua belum dicoba', () => {
    expect(hitungBank(paket, [], []).every((s) => s.label === 'belum dicoba')).toBe(true);
  });
});
