/**
 * Berkas kasus dibaca oleh tes, bukan disalin ke dalamnya.
 *
 * Jawaban benar, kode saham, nama emiten, dan daftar kartu semuanya diambil dari
 * `cases/dada-2025-10-08.json`. Menuliskannya ulang di dalam tes akan membuat tes
 * tetap hijau ketika datanya berubah — dan E-09 justru bekerja dengan menyandingkan
 * apa yang tampil di layar dengan apa yang ada di data.
 */
import { readFileSync } from 'node:fs';
import { BERKAS_KASUS } from './jalur.ts';

export interface PilihanUji {
  kunci: string;
  teks: string;
}

export interface SoalUji {
  soal_id: string;
  tanya: string;
  jawaban: string;
  /** Teks kunci yang tampil sesudah jawaban dikunci (M3.6 D-1). */
  penjelasan: string;
  pilihan: PilihanUji[];
  kartu: string[];
  kartu_penentu: string[];
  istilah: { kata: string; arti: string }[];
  pesan: { nama: string; jam: string; isi: string };
  petunjuk: string | null;
}

export interface KasusUji {
  kasus_id: string;
  tanggal_t: string;
  emiten: { simbol: string; nama: string; papan: string; sektor: string };
  /** Layar pertama; `menit` opsional (M3.5 D-1). */
  pembuka: { kalimat: string; menit?: number };
  soal: SoalUji[];
  /** Layar pembukaan; paragraf garis waktu dan ketiga daftar ringkasan (M3.6 D-1). */
  pembukaan: {
    paragraf: string[];
    bisa_dibaca: string[];
    tidak_bisa_dibaca: string[];
    disingkirkan: string[];
  };
  /** Aturan verifikasi yang dijalankan atas kasus ini (M3.6 D-5). */
  pemeriksaan: { aturan: string; judul: string; dijalankan: boolean }[];
  temuan: { temuan_id: string }[];
  disclaimer: string[];
}

let tersimpan: KasusUji | null = null;

export function bacaKasus(): KasusUji {
  tersimpan ??= JSON.parse(readFileSync(BERKAS_KASUS, 'utf8')) as KasusUji;
  return tersimpan;
}

/** Kunci jawaban yang **salah** untuk sebuah soal: opsi pertama yang bukan jawaban. */
export function kunciSalah(soal: SoalUji): string {
  const lain = soal.pilihan.find((p) => p.kunci !== soal.jawaban);
  if (lain === undefined) throw new Error(`soal ${soal.soal_id} tidak punya opsi selain jawaban`);
  return lain.kunci;
}
