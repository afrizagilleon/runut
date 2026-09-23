/**
 * Galat JavaScript, disamarkan sebelum menjadi peristiwa (M3.8 D-3).
 *
 * Pertanyaan pemilik yang tidak bisa dijawab sampai sekarang: "apakah ada
 * galat JavaScript" di ponsel orang asing yang pergi dalam lima detik. Tetapi
 * pesan galat adalah teks yang TIDAK kita tulis. Ia bisa memuat alamat berkas,
 * alamat permintaan yang gagal lengkap dengan query-nya (di mana kode penanda
 * dan kadang token hidup), jalur di cakram pengembang, nomor panjang, bahkan
 * potongan UA dari skrip pihak ketiga yang menyuntikkan diri ke halaman di
 * dalam aplikasi.
 *
 * Karena itu yang dikirim hanyalah **bentuk** pesannya. Penyamaran dikerjakan
 * di sini, di fungsi murni, dan **reducer yang memanggilnya** — bukan
 * pendengarnya — sehingga tidak ada jalan lain ke peristiwa `galat` yang
 * melewatinya. Pengumpul menolak sisa yang lolos sebagai pertahanan kedua
 * (D-6), dengan pola yang sama persis dengan `POLA_TERLARANG_PESAN`: kalau
 * keduanya berselisih, seluruh kelompok kiriman dijawab 400 dan peristiwa lain
 * di kelompok itu ikut hilang.
 */

/** Panjang pesan paling besar yang dikirim, dan yang diterima pengumpul. */
export const MAKS_PESAN_GALAT = 120;

/**
 * Yang tidak boleh ada di pesan sesudah penyamaran, dalam huruf apa pun.
 *
 * Disalin apa adanya ke `server/kolektor.mjs` (pengumpul tidak mengimpor apa
 * pun dari aplikasi). Tes pengumpul mengadu keduanya lewat keluaran reducer
 * yang sungguhan.
 */
export const POLA_TERLARANG_PESAN = /http|:\/\/|www\.|mozilla|applewebkit/i;

const PENGGANTI_ALAMAT = '‹url›';
const PENGGANTI_ANGKA = '‹n›';
const PENGGANTI_UA = '‹ua›';

/** Batas sebuah alamat atau jalur: spasi, tanda kutip, kurung. */
const BUKAN_BATAS = "[^\\s'\"`()<>\\[\\]{}]";

const POLA_SKEMA_GANDA = new RegExp(`\\b[a-z][a-z0-9+.-]*:\\/\\/${BUKAN_BATAS}*`, 'gi');
const POLA_SKEMA_TUNGGAL = new RegExp(
  `\\b(?:blob|data|file|javascript|about|webpack|chrome|safari-web-extension|moz-extension):${BUKAN_BATAS}+`,
  'gi',
);
const POLA_WWW = new RegExp(`\\bwww\\.${BUKAN_BATAS}*`, 'gi');
const POLA_JALUR_WINDOWS = new RegExp(`\\b[A-Za-z]:\\\\${BUKAN_BATAS}*`, 'g');
/** Jalur relatif (`./a`, `../a`) atau mutlak (`/a`) di awal kata. */
const POLA_JALUR = new RegExp(`(^|[\\s=:@,;])(?:\\.{1,2})?\\/${BUKAN_BATAS}+`, 'g');
const POLA_ANGKA_PANJANG = /\d{6,}/g;
const POLA_UA = /\b(?:mozilla|applewebkit)(?:\/[\d.]+)?/gi;

/**
 * Samarkan satu pesan galat.
 *
 * Urutannya disengaja: alamat berskema lebih dulu (supaya `https://a/b` tidak
 * terbaca sebagai jalur `/b`), lalu `www.`, jalur, angka, UA, lalu **satu
 * sapuan terakhir** yang mengganti sisa apa pun yang cocok dengan
 * `POLA_TERLARANG_PESAN` — termasuk "XMLHttpRequest", yang menjadi
 * "XML‹url›Request". Jelek, tetapi pesan yang ditolak pengumpul menghapus
 * seluruh kelompok kiriman; jelek lebih murah.
 *
 * Pemangkasan terjadi **sesudah** penyamaran, jadi alamat yang terpotong di
 * ekor tidak bisa menyisakan potongan host. Hasilnya stabil: menyamarkan dua
 * kali sama dengan sekali, sehingga "pesan identik" tetap identik.
 */
export function samarkanPesan(mentah: string): string {
  let teks = mentah.replace(/\s+/g, ' ').trim();
  teks = teks.replace(POLA_SKEMA_GANDA, PENGGANTI_ALAMAT);
  teks = teks.replace(POLA_SKEMA_TUNGGAL, PENGGANTI_ALAMAT);
  teks = teks.replace(POLA_WWW, PENGGANTI_ALAMAT);
  teks = teks.replace(POLA_JALUR_WINDOWS, PENGGANTI_ALAMAT);
  teks = teks.replace(POLA_JALUR, (_, awal: string) => `${awal}${PENGGANTI_ALAMAT}`);
  teks = teks.replace(POLA_ANGKA_PANJANG, PENGGANTI_ANGKA);
  teks = teks.replace(POLA_UA, PENGGANTI_UA);
  teks = teks.replace(new RegExp(POLA_TERLARANG_PESAN.source, 'gi'), PENGGANTI_ALAMAT);
  if (teks === '') return '(tanpa pesan)';
  return teks.slice(0, MAKS_PESAN_GALAT);
}

export type SumberGalat = 'aplikasi' | 'luar';
export type JenisGalat = 'error' | 'penolakan';

/**
 * Galat dari skrip kita sendiri, atau dari luar (ekstensi, skrip yang
 * disuntikkan aplikasi pembungkus, "Script error." lintas asal).
 *
 * Tanpa berkas yang bisa ditunjuk, jawabannya `luar`: kita tidak bisa
 * membuktikan ia milik aplikasi, dan menghitungnya sebagai milik aplikasi
 * akan membuat produk terlihat lebih rusak daripada kenyataannya.
 */
export function sumberGalat(berkas: string | null | undefined, asal: string): SumberGalat {
  if (typeof berkas !== 'string' || berkas === '') return 'luar';
  return berkas.startsWith(`${asal}/`) ? 'aplikasi' : 'luar';
}

/** Alamat berkas pertama di tumpukan pemanggilan, untuk penolakan yang tak tertangani. */
export function berkasDariTumpukan(tumpukan: string | undefined): string | null {
  if (typeof tumpukan !== 'string') return null;
  const cocok = /\b[a-z][a-z0-9+.-]*:\/\/[^\s)]+?(?=:\d+(?::\d+)?\)?(?:\s|$))/i.exec(tumpukan);
  return cocok === null ? null : cocok[0];
}

/**
 * Teks pesan dari nilai apa pun yang dilempar.
 *
 * Nilai yang bukan `Error` dan bukan teks (objek, angka) bisa berisi apa saja
 * — termasuk data yang tidak pernah dijanjikan dikirim. Yang dilaporkan dari
 * nilai seperti itu hanyalah jenisnya.
 */
export function pesanDari(nilai: unknown): string {
  if (nilai instanceof Error) return `${nilai.name}: ${nilai.message}`;
  if (typeof nilai === 'string') return nilai;
  return `(bukan Error: ${typeof nilai})`;
}

/* ------------------------------------------------------------------ */
/* Pelapor untuk batas galat di akar                                   */
/* ------------------------------------------------------------------ */

/**
 * Batas galat (`BatasGalat.tsx`) berada DI LUAR `Aplikasi`, jadi ia tidak
 * punya `dispatch` maupun keadaan permainan. Ketika render jatuh, `Aplikasi`
 * sedang dibongkar; yang tersisa adalah fungsi yang ia pasang di sini waktu
 * masih hidup, yang menghitung peristiwanya dari keadaan terakhir — pola yang
 * sama dengan jalur `pagehide`.
 */
let pelaporAkar: ((galat: unknown) => void) | null = null;

export function pasangPelaporAkar(pelapor: ((galat: unknown) => void) | null): void {
  pelaporAkar = pelapor;
}

/** Tidak pernah melempar: batas galat yang ikut jatuh adalah layar putih lagi. */
export function laporGalatAkar(galat: unknown): void {
  try {
    pelaporAkar?.(galat);
  } catch {
    /* Pelaporan adalah bonus; layar "Muat ulang" adalah kewajiban. */
  }
}
