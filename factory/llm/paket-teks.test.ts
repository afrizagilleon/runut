/**
 * M2d-5 T-06 (D-8): teks kartu paket diperjelas. Frasa yang ditandai
 * membingungkan oleh penguji luar M2d-3/M2d-4 tidak lagi sampai ke lingkar
 * LLM; maknanya sama (angka dan tanggal tidak berubah). `cases/*.json`
 * (kasus tayang) tidak diubah — frasa yang juga ada di sana dicatat.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { angkaDalam } from './angka.ts';
import { AKAR } from './env.ts';
import { DEFINISI_PAKET, PERJELAS_KLAIM, bangunPaket, perjelasKlaim, type PaketFakta } from './paket.ts';

const PAKET: PaketFakta[] = (['tirt', 'ultj', 'dada'] as const).map((id) => bangunPaket(DEFINISI_PAKET[id]));
const semuaKlaim = PAKET.flatMap((p) => p.fakta.map((f) => ({ paket: p.paket_id, fact_id: f.fact_id, klaim: f.klaim })));

/** Frasa yang ditandai penguji luar (jawaban mentah di eval/keluaran-m2d3|m2d4/penguji/jawaban/) atau istilah sistem sejenis. */
const FRASA_BINGUNG = [
  'tidak bisa dibuktikan habis',
  'lolos seluruh pemeriksaan',
  'Jarak antara',
  'tidak ada di data',
  'kasus ini',
  'sudah dirapikan jadi',
];

describe('teks kartu paket diperjelas (M2d-5 D-8)', () => {
  it('frasa yang ditandai penguji benar-benar ada di jawaban mentah penguji M2d-3/M2d-4', () => {
    const jawaban = ['m2d3', 'm2d4']
      .flatMap((m) => [1, 2, 3].map((p) => readFileSync(`${AKAR}eval/keluaran-${m}/penguji/jawaban/kartu-p${String(p)}.txt`, 'utf8')))
      .join('\n');
    for (const f of ['tidak bisa dibuktikan habis', 'lolos seluruh pemeriksaan', 'Jarak antara', 'tidak ada di data']) expect(jawaban, f).toContain(f);
    const alami = readFileSync(`${AKAR}eval/keluaran-m2d4/penguji/jawaban/alami-p1.txt`, 'utf8') + readFileSync(`${AKAR}eval/keluaran-m2d3/penguji/jawaban/alami-p1.txt`, 'utf8');
    expect(alami).toContain('dirapikan jadi');
  });

  it('tidak satu pun kalimat fakta di paket TIRT/ULTJ/DADA memuat frasa itu', () => {
    for (const k of semuaKlaim) for (const f of FRASA_BINGUNG) expect(k.klaim, `${k.paket}/${k.fact_id}`).not.toContain(f);
  });

  it('kalimat pengganti terpakai: dividen ULTJ, suspensi TIRT/DADA, RUPS, jumlah & laporan penjualan DADA, turun ULTJ', () => {
    const cari = (id: string): string => semuaKlaim.find((k) => k.fact_id === id)?.klaim ?? '';
    expect(cari('dividen-tercatat')).toContain('Daftar ini belum tentu lengkap: bisa saja ada pembagian yang terjadi tetapi tidak tercatat di sini.');
    expect(cari('susp-2025-12-10')).toContain('Kapan perdagangannya dibuka lagi tidak tercatat, jadi lama penghentiannya tidak bisa dipastikan.');
    expect(cari('susp-2025-06-30')).toContain('Kapan perdagangannya dibuka lagi tidak tercatat');
    expect(cari('rups-2025-09-25')).toContain('Isi keputusan rapatnya tidak tercatat di sini.');
    expect(cari('laporan-jual-terverifikasi')).toBe('Laporan penjualan pemilik terbesar, tidak termasuk laporan yang angkanya bertentangan dengan data lain: 3 laporan.');
    expect(cari('jumlah-jual-terverifikasi')).toMatch(/^Penjualan pemilik terbesar, tidak termasuk laporan yang angkanya bertentangan dengan data lain: /);
    expect(cari('turun-2026-05-04')).toBe('Turunnya harga dari penutupan terakhir sebelum tanggal ex ke pembukaan hari ini: Rp1.690 dikurangi Rp1.545 sama dengan Rp145.');
    for (const p of PERJELAS_KLAIM) expect(semuaKlaim.some((k) => k.klaim.includes(p.baru)), p.baru).toBe(true);
  });

  it('makna sama: angka dan tanggal tiap kalimat tidak berubah oleh penggantian', () => {
    for (const p of PERJELAS_KLAIM) {
      expect(angkaDalam(p.baru).map((a) => a.teks)).toEqual(angkaDalam(p.lama).map((a) => a.teks));
      expect(perjelasKlaim(`Rp130 per lembar. ${p.lama}`)).toBe(`Rp130 per lembar. ${p.baru}`);
    }
  });

  it('cases/*.json (kasus tayang) TIDAK diubah di sini — frasa yang masih ada di sana dicatat untuk milestone produk', () => {
    const ada = (f: string, berkas: string): boolean => readFileSync(`${AKAR}cases/${berkas}.json`, 'utf8').includes(f);
    expect(ada('tidak bisa dibuktikan habis', 'ultj-2026-05-04')).toBe(false); // M3.13 D-2: kalimat diperjelas di kasus tayang
    expect(ada('Jarak antara penutupan terakhir sebelum tanggal ex', 'ultj-2026-05-04')).toBe(true);
    expect(ada('tidak ada di data', 'dada-2025-10-08')).toBe(true);
    expect(ada('tidak ada di data', 'ultj-2026-05-04')).toBe(true);
    expect(ada('kasus ini', 'dada-2025-10-08')).toBe(true);
    expect(ada('lolos seluruh pemeriksaan', 'dada-2025-10-08')).toBe(false);
  });
});
