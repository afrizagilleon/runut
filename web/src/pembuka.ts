import type { Kasus } from '../../factory/skema/tipe.ts';

/**
 * Baris meta layar pertama (M3.5 D-1).
 *
 * Kenapa ia ada: pagi 22 Sep pemilik menonton tiga orang bermain tanpa
 * membantu. Tidak satu pun bisa mengatakan aplikasi ini apa, dan alasan
 * berhenti yang diucapkan adalah *"ga tau berapa soalnya; lebih suka soal
 * dikit biar fokus, kalau banyak males"*. Seorang penguji bahkan tidak tahu
 * ada soal 3.
 *
 * Jadi yang ditambahkan bukan kalimat penjelasan — keluhan terberat dari layar
 * akhir justru "terlalu banyak kata yang tidak umum" — melainkan **satu baris
 * keterangan**: berapa soal, kira-kira berapa lama, dan apa yang TIDAK ada.
 *
 * Angka soalnya dibaca dari `kasus.soal.length`, tidak ditulis mati. Kasus
 * berikutnya boleh punya empat soal, dan baris yang berbohong tentang jumlah
 * soal lebih buruk daripada baris yang tidak ada: ia persis janji yang dipakai
 * pemain untuk memutuskan lanjut atau tidak.
 */
export const META_TANPA = 'tanpa akun, tanpa skor';

/** Pemisah antar potongan, sama dengan yang dipakai keping dan baris "Dihitung dari". */
const PEMISAH = ' · ';

export function barisMeta(kasus: Pick<Kasus, 'soal' | 'pembuka'>): string {
  const potongan = [`${String(kasus.soal.length)} soal`];
  const menit = kasus.pembuka.menit;
  // Kasus yang tidak menuliskan lamanya tidak ditebak: potongannya hilang.
  if (menit !== undefined) potongan.push(`sekitar ${String(menit)} menit`);
  potongan.push(META_TANPA);
  return potongan.join(PEMISAH);
}

/**
 * Contoh gelembung layar pertama (M3.9 D-1/D-2, varian A uji K-06).
 *
 * Dibaca dari `soal[0].pesan`, bukan dari medan sendiri: satu contoh omongan
 * menjawab "ini aplikasi apa?" 9/10 di uji K-06, dan omongan itu harus PERSIS
 * omongan yang akan dicek di soal 1. Dua teks yang berjanji sama adalah dua
 * teks yang akan berselisih diam-diam.
 *
 * Hanya nama dan isi — tanpa jam dan tanpa tanggal (D-2): di layar pertama ia
 * contoh, bukan pesan yang masuk. Tanggalnya dibawa kalender besar di atasnya.
 */
export interface ContohPembuka {
  nama: string;
  isi: string;
}

export function contohPembuka(kasus: Pick<Kasus, 'soal'>): ContohPembuka | null {
  const pertama = kasus.soal[0];
  if (pertama === undefined) return null;
  return { nama: pertama.pesan.nama, isi: pertama.pesan.isi };
}
