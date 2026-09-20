// Amandemen A-1, butir 2 — KELENGKAPAN dihitung terpisah dari KETEPATAN.
//
// Metrik lama mencampur keduanya: setiap angka yang tidak ada di kunci
// dihitung salah, sehingga lengan yang menulis lebih rinci terhukum lebih
// berat justru karena rinci (§10 F-1). Amandemen memisahkannya:
//   - ketepatan  -> eval/ketepatan.ts, diadu ke data mentah;
//   - kelengkapan -> berkas ini, diadu ke kunci A1–A14.
//
// Kelengkapan adalah "berapa dari 14 baris fakta kunci yang berhasil disebut
// lengan di bagian yang dilihat pemain". Makin besar makin baik — arah yang
// BERLAWANAN dengan semua kolom lain, dan itu disebut jelas di laporan.
//
// Kunci yang dipakai adalah kunci yang sudah dikoreksi pemilik pada 20 Sep
// malam (A6 rasio 2,2x dan 17,7x; A12 tiga RUPS). Baris A6 dan A12 yang dulu
// masuk BARIS_TIDAK_DINILAI kini dinilai kembali di kolom kelengkapan ini,
// karena sebab pengecualiannya — kunci bertentangan dengan data — sudah
// hilang.
//
// Aturan pencocokan sengaja dibuat KETAT PER BUTIR: seluruh syarat sebuah
// baris kunci harus terpenuhi di dalam SATU fakta atau SATU soal, bukan
// tersebar di seluruh keluaran. Kalau dilonggarkan ke seluruh teks, kata
// "tidak" di kalimat mana pun sudah cukup membuat "tidak ada suspensi"
// dianggap tersebut.

import { adaYangSama, angkaDalam, tanggalDalam } from './angka.ts';
import { ambilBaris, type Kunci } from './kunci.ts';
import type { KeluaranLengan } from './skema-keluaran.ts';

type Mode = 'angka' | 'angka+tanggal' | 'teks' | 'teks+tanggal';

export interface AturanKelengkapan {
  baris: string;
  mode: Mode;
  /** Untuk mode teks: SEMUA pola harus cocok di butir yang sama. */
  teks?: RegExp[];
  keterangan: string;
}

/**
 * Empat belas baris fakta kunci dan cara mengenalinya di keluaran lengan.
 * Baris yang punya angka dikenali dari angkanya (plus tanggalnya kalau baris
 * kunci memuat tanggal). Tiga baris yang isinya "tidak ada" tidak punya angka
 * sama sekali, jadi dikenali dari kata-katanya.
 */
export const ATURAN_KELENGKAPAN: AturanKelengkapan[] = [
  { baris: 'A1', mode: 'angka+tanggal', keterangan: 'harga penutupan 15 Jul 2025' },
  { baris: 'A2', mode: 'angka+tanggal', keterangan: 'harga penutupan 15 Sep 2025' },
  { baris: 'A3', mode: 'angka+tanggal', keterangan: 'harga penutupan 6 Okt 2025' },
  { baris: 'A4', mode: 'angka+tanggal', keterangan: 'harga penutupan pada T' },
  { baris: 'A5', mode: 'angka', keterangan: 'kenaikan satu hari bursa ke T' },
  { baris: 'A6', mode: 'angka+tanggal', keterangan: 'volume pada T dan rasionya' },
  { baris: 'A7', mode: 'angka', keterangan: 'kinerja tahun buku 2024' },
  { baris: 'A8', mode: 'angka', keterangan: 'kinerja tahun buku 2023' },
  { baris: 'A9', mode: 'angka', keterangan: 'kinerja tahun buku 2022' },
  { baris: 'A10', mode: 'angka+tanggal', keterangan: 'nilai pasar pada T' },
  {
    baris: 'A11',
    mode: 'teks',
    teks: [/dividen/i, /tidak pernah|belum pernah|tidak ada|belum ada|nihil|tanpa dividen|kosong/i],
    keterangan: 'dividen tidak pernah ada',
  },
  {
    baris: 'A12',
    mode: 'teks+tanggal',
    teks: [/rups|rapat umum pemegang saham/i],
    keterangan: 'RUPS yang sudah terjadi sampai T',
  },
  {
    baris: 'A13',
    mode: 'teks',
    teks: [
      /laporan (transaksi|kepemilikan)|kepemilikan pemegang saham|pemegang saham besar|filing/i,
      /belum ada|belum pernah|belum terbit|belum satu pun|tidak ada satu pun|tidak satu pun|nol laporan/i,
    ],
    keterangan: 'belum ada laporan kepemilikan sampai T',
  },
  {
    baris: 'A14',
    mode: 'teks',
    teks: [/suspensi|penghentian sementara|dihentikan/i, /belum ada|belum pernah|tidak ada|tidak pernah/i],
    keterangan: 'belum ada suspensi sampai T',
  },
];

export interface HasilKelengkapan {
  jumlah: number;
  dari: number;
  disebut: string[];
  tidakDisebut: string[];
}

/** Butir yang dilihat pemain: tiap fakta dan tiap soal dinilai sendiri-sendiri. */
export function butirTerlihat(k: KeluaranLengan): string[] {
  const butir: string[] = k.fakta_terlihat.map((f) => `${f.klaim} ${String(f.nilai ?? '')} ${f.satuan ?? ''}`);
  for (const s of k.soal) {
    butir.push([s.batang, s.penjelasan, ...s.pilihan.map((p) => p.teks)].join(' '));
  }
  return butir;
}

export function nilaiKelengkapan(k: KeluaranLengan, kunci: Kunci): HasilKelengkapan {
  const butir = butirTerlihat(k);
  const angkaButir = butir.map((b) => angkaDalam(b));
  const tanggalButir = butir.map((b) => tanggalDalam(b));
  const disebut: string[] = [];
  const tidakDisebut: string[] = [];

  for (const aturan of ATURAN_KELENGKAPAN) {
    const baris = ambilBaris(kunci, aturan.baris);
    const angkaKunci = baris.angka.length > 0 ? baris.angka : baris.angka_semua;
    let ketemu = false;
    for (let i = 0; i < butir.length && !ketemu; i++) {
      const teks = butir[i] ?? '';
      const angka = angkaButir[i] ?? [];
      const tanggal = tanggalButir[i] ?? [];
      if (aturan.mode === 'angka' || aturan.mode === 'angka+tanggal') {
        if (!adaYangSama(angka, angkaKunci)) continue;
      }
      if (aturan.mode === 'teks' || aturan.mode === 'teks+tanggal') {
        if (!(aturan.teks ?? []).every((p) => p.test(teks))) continue;
      }
      if (aturan.mode === 'angka+tanggal' || aturan.mode === 'teks+tanggal') {
        if (baris.tanggal.length > 0 && !baris.tanggal.some((t) => tanggal.includes(t))) continue;
      }
      ketemu = true;
    }
    (ketemu ? disebut : tidakDisebut).push(aturan.baris);
  }

  return { jumlah: disebut.length, dari: ATURAN_KELENGKAPAN.length, disebut, tidakDisebut };
}
