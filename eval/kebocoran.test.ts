// Amandemen A-1, butir 3 — kebocoran dipisah dari klaim ketersediaan.
//
// Tiga arah dibuktikan, seperti diminta amandemen:
//   - keluaran C yang tersimpan HARUS terdeteksi bocor 24 Okt (kalimat
//     "laporan pertama baru terbit pada 24 Oktober 2025");
//   - keluaran A/S dengan suspensi 8 Okt HARUS masuk kolom klaim ketersediaan
//     tanpa bukti, BUKAN kolom kebocoran;
//   - fixture bersih HARUS nol di kedua kolom, dan fixture yang sengaja
//     dibocorkan HARUS lebih dari nol.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KELUARAN } from './berkas.ts';
import { adaDataMentah, muatDataMentah } from './data-mentah.ts';
import { nilaiKebocoranBaru } from './kebocoran.ts';
import { KASUS } from './prompt.ts';
import type { FaktaKeluaran, KeluaranLengan } from './skema-keluaran.ts';

const T = KASUS.tanggal_t;
const bisa = adaDataMentah();
if (!bisa) console.warn('LEWAT: .cache/sectors/ tidak ada; tes kebocoran baru tidak dijalankan.');

function baca(nama: string): KeluaranLengan {
  return (JSON.parse(readFileSync(join(KELUARAN, `${nama}.json`), 'utf8')) as { keluaran: KeluaranLengan }).keluaran;
}

function nilai(k: KeluaranLengan): ReturnType<typeof nilaiKebocoranBaru> {
  return nilaiKebocoranBaru(k, muatDataMentah(), T);
}

function kerangka(fakta: FaktaKeluaran[]): KeluaranLengan {
  return {
    skema_versi: 1,
    kasus_id: KASUS.kasus_id,
    emiten: KASUS.kode,
    tanggal_t: T,
    fakta_terlihat: fakta,
    soal: [1, 2, 3].map((n) => ({
      soal_id: `s${n}`,
      batang: `Pertanyaan contoh nomor ${n}.`,
      pilihan: [
        { kunci: 'a', teks: 'pilihan pertama' },
        { kunci: 'b', teks: 'pilihan kedua' },
      ],
      jawaban: 'a',
      penjelasan: 'Penjelasan contoh.',
      fact_ids: [],
    })),
    pembukaan: { paragraf: ['Paragraf pembukaan contoh.'], fakta_sesudah_t: [] },
    temuan: [],
  };
}

function fakta(klaim: string, tersedia: string | null): FaktaKeluaran {
  return { fact_id: 'f', klaim, nilai: null, satuan: null, sumber: '/v2/daily/FOLK/', tersedia_sejak: tersedia };
}

describe.skipIf(!bisa)('kebocoran dan klaim ketersediaan dipisah', () => {
  it('keluaran C yang tersimpan terdeteksi bocor 24 Okt', () => {
    for (const nama of ['C-1', 'C-2', 'C-3']) {
      const n = nilai(baca(nama));
      expect(n.kebocoran, `${nama} harus terdeteksi bocor`).toBeGreaterThan(0);
      expect(
        n.catatan.some((c) => c.jenis === 'kebocoran' && c.keterangan.includes('2025-10-24')),
        `${nama} harus menyebut kebocoran 2025-10-24: ${n.catatan.map((c) => c.keterangan).join(' | ')}`,
      ).toBe(true);
    }
  });

  it('suspensi 8 Okt di lengan A dan S masuk klaim ketersediaan, bukan kebocoran', () => {
    for (const nama of ['A-2', 'A-3', 'S-1', 'S-2', 'S-3']) {
      const n = nilai(baca(nama));
      expect(n.klaimKetersediaan, `${nama} harus punya klaim ketersediaan tanpa bukti`).toBeGreaterThan(0);
      expect(
        n.catatan.some((c) => c.jenis === 'klaim-ketersediaan-tanpa-bukti' && c.keterangan.includes('2025-10-08')),
        `${nama} harus menandai suspensi 2025-10-08 sebagai klaim ketersediaan`,
      ).toBe(true);
      expect(
        n.catatan.filter((c) => c.jenis === 'kebocoran' && c.keterangan.includes('2025-10-08')),
        `${nama}: suspensi 8 Okt tidak boleh dihitung kebocoran`,
      ).toEqual([]);
    }
  });

  it('fixture bersih mendapat nol di kedua kolom', () => {
    const bersih = kerangka([
      fakta('Harga penutupan saham FOLK pada 6 Oktober 2025 adalah Rp115 per lembar.', '2025-10-06'),
      fakta('Sampai 7 Oktober 2025 belum ada satu pun laporan transaksi pemegang saham besar untuk FOLK.', T),
    ]);
    const n = nilai(bersih);
    expect(n.kebocoran, n.catatan.map((c) => c.keterangan).join(' | ')).toBe(0);
    expect(n.klaimKetersediaan).toBe(0);
    expect(n.catatan).toEqual([]);
  });

  it('BUKTI MERAH: fixture yang dibocorkan lebih dari nol di kolom kebocoran', () => {
    const bocor = kerangka([
      fakta('Harga penutupan saham FOLK pada 9 Oktober 2025 adalah Rp208 per lembar.', '2025-10-09'),
    ]);
    const n = nilai(bocor);
    expect(n.kebocoran).toBeGreaterThan(0);
    expect(n.klaimKetersediaan).toBe(0);
  });

  it('BUKTI MERAH: menyebut nama pemegang saham di bagian terlihat dihitung kebocoran', () => {
    const data = muatDataMentah();
    const nama = data.namaPemegang[0];
    expect(nama, 'data filings harus memuat nama pemegang saham').toBeDefined();
    if (nama === undefined) return;
    const n = nilai(kerangka([fakta(`Pemegang saham utama FOLK adalah ${nama}.`, T)]));
    expect(n.kebocoran).toBeGreaterThan(0);
  });

  it('peristiwa sesudah T yang BUKAN pengumuman bursa tetap kebocoran walau diklaim tersedia pada T', () => {
    // Penjaga arah sebaliknya: kolom klaim ketersediaan tidak boleh jadi pintu
    // keluar untuk kebocoran apa pun asal ditandai "tersedia sejak T".
    const n = nilai(kerangka([fakta('Laporan pertama pemegang saham besar terbit pada 24 Oktober 2025.', T)]));
    expect(n.kebocoran).toBe(1);
    expect(n.klaimKetersediaan).toBe(0);
  });
});
