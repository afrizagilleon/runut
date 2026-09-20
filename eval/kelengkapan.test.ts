// Amandemen A-1, butir 2 — kelengkapan adalah kolom tersendiri.
//
// Dua arah dibuktikan di sini, seperti diminta amandemen:
//   - keluaran yang tidak menyebut satu pun fakta kunci mendapat 0;
//   - keluaran yang menyebut semuanya mendapat 14.
// Tanpa yang pertama, metrik bisa saja selalu memberi angka penuh; tanpa yang
// kedua, ia bisa saja selalu memberi nol.

import { describe, it, expect } from 'vitest';
import { adaKunci, muatKunci, type BarisKunci } from './kunci.ts';
import { nilaiKelengkapan, ATURAN_KELENGKAPAN } from './kelengkapan.ts';
import { KASUS } from './prompt.ts';
import type { FaktaKeluaran, KeluaranLengan } from './skema-keluaran.ts';

const SUMBER = '/v2/daily/FOLK/ (.cache/sectors/FOLK-daily-2025q4.json)';

function keFakta(b: BarisKunci): FaktaKeluaran {
  return {
    fact_id: b.id.toLowerCase(),
    klaim: `${b.deskripsi}: ${b.nilai.replace(/\*\*/g, '')}`,
    nilai: b.angka[0] ?? null,
    satuan: null,
    sumber: SUMBER,
    tersedia_sejak: null,
  };
}

function kerangka(fakta: FaktaKeluaran[]): KeluaranLengan {
  return {
    skema_versi: 1,
    kasus_id: KASUS.kasus_id,
    emiten: KASUS.kode,
    tanggal_t: KASUS.tanggal_t,
    fakta_terlihat: fakta,
    soal: [1, 2, 3].map((n) => ({
      soal_id: `s${n}`,
      batang: `Pertanyaan contoh nomor ${n} tanpa angka.`,
      pilihan: [
        { kunci: 'a', teks: 'pilihan pertama' },
        { kunci: 'b', teks: 'pilihan kedua' },
      ],
      jawaban: 'a',
      penjelasan: 'Penjelasan contoh tanpa angka.',
      fact_ids: [],
    })),
    pembukaan: { paragraf: ['Paragraf pembukaan contoh.'], fakta_sesudah_t: [] },
    temuan: [],
  };
}

if (!adaKunci()) console.warn('LEWAT: .cache/kunci/ tidak ada; tes kelengkapan tidak dijalankan.');

describe.skipIf(!adaKunci())('kelengkapan A1–A14 sebagai kolom terpisah', () => {
  it('keluaran yang tidak menyebut satu pun fakta kunci mendapat 0', () => {
    const kosong = kerangka([
      {
        fact_id: 'kosong',
        klaim: 'Emiten ini bergerak di bidang usaha yang dijelaskan pada dokumen pencatatannya.',
        nilai: null,
        satuan: null,
        sumber: SUMBER,
        tersedia_sejak: null,
      },
    ]);
    const n = nilaiKelengkapan(kosong, muatKunci());
    expect(n.jumlah).toBe(0);
    expect(n.dari).toBe(14);
    expect(n.tidakDisebut).toHaveLength(14);
  });

  it('keluaran yang menyebut semua fakta kunci mendapat 14', () => {
    const kunci = muatKunci();
    const fakta = [...kunci.baris.values()].filter((b) => b.id.startsWith('A')).map(keFakta);
    const n = nilaiKelengkapan(kerangka(fakta), kunci);
    expect(n.tidakDisebut, `baris kunci yang tidak terdeteksi: ${n.tidakDisebut.join(', ')}`).toEqual([]);
    expect(n.jumlah).toBe(14);
  });

  it('menghilangkan satu baris kunci menurunkan kelengkapan, kecuali baris yang isinya diulang baris lain', () => {
    // A4 (harga penutupan pada T) tetap terdeteksi walau faktanya dibuang,
    // karena baris A10 kunci itu sendiri menulis "Rp155 x 3.948.141.464" pada
    // tanggal yang sama. Itu sifat kunci, bukan kebocoran metrik; daftar
    // pengecualiannya ditulis di sini supaya berubahnya ketahuan.
    const TERTUTUPI_BARIS_LAIN = ['A4'];
    const kunci = muatKunci();
    const semua = [...kunci.baris.values()].filter((b) => b.id.startsWith('A'));
    const penuh = nilaiKelengkapan(kerangka(semua.map(keFakta)), kunci);
    const tertutupi: string[] = [];
    for (const id of ATURAN_KELENGKAPAN.map((a) => a.baris)) {
      const kurang = nilaiKelengkapan(kerangka(semua.filter((b) => b.id !== id).map(keFakta)), kunci);
      expect(kurang.jumlah, `membuang ${id} tidak boleh menaikkan kelengkapan`).toBeLessThanOrEqual(penuh.jumlah);
      if (kurang.tidakDisebut.includes(id)) {
        expect(kurang.jumlah, `membuang ${id} seharusnya menurunkan kelengkapan tepat satu`).toBe(penuh.jumlah - 1);
      } else {
        tertutupi.push(id);
      }
    }
    expect(tertutupi).toEqual(TERTUTUPI_BARIS_LAIN);
  });

  it('kunci yang dipakai adalah kunci yang sudah dikoreksi (A6 17,7x dan A12 tiga RUPS)', () => {
    const kunci = muatKunci();
    const a6 = kunci.baris.get('A6');
    const a12 = kunci.baris.get('A12');
    expect(a6?.angka).toContain(17.7);
    expect(a6?.angka).toContain(2.2);
    for (const t of ['2024-05-31', '2024-08-22', '2025-06-11']) expect(a12?.tanggal).toContain(t);
  });
});
