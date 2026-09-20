/**
 * Setiap angka di teks soal dan pembukaan ditulis sebagai rujukan `[[fact_id|teks]]`.
 * Itulah cara INV-4 ditegakkan: teks yang masih memuat angka telanjang ditolak.
 */

export const RUJUKAN_ANDAIAN = 'misal';

const POLA_RUJUKAN = /\[\[([^\]|]+)\|([^\]]*)\]\]/g;

export interface Rujukan {
  fact_id: string;
  teks: string;
}

/** Ambil semua rujukan `[[fact_id|teks]]` dari sebuah teks. */
export function ambilRujukan(teks: string): Rujukan[] {
  const hasil: Rujukan[] = [];
  for (const cocok of teks.matchAll(POLA_RUJUKAN)) {
    hasil.push({ fact_id: (cocok[1] ?? '').trim(), teks: cocok[2] ?? '' });
  }
  return hasil;
}

/** Teks tanpa penanda rujukan, untuk ditampilkan apa adanya. */
export function teksPolos(teks: string): string {
  return teks.replace(POLA_RUJUKAN, (_seluruh, _id: string, isi: string) => isi);
}

/** Teks di luar rujukan; kalau masih ada digit di sini, INV-4 dilanggar. */
export function teksTanpaRujukan(teks: string): string {
  return teks.replace(POLA_RUJUKAN, ' ');
}

/** Potongan teks yang memuat angka telanjang, kosong kalau bersih. */
export function angkaTelanjang(teks: string): string[] {
  const sisa = teksTanpaRujukan(teks);
  return [...sisa.matchAll(/[\d][\d.,]*/g)].map((m) => m[0]);
}

export type BagianTeks =
  | { jenis: 'utuh'; teks: string }
  | { jenis: 'rujukan'; teks: string; fact_id: string };

/** Pecah teks menjadi bagian biasa dan bagian rujukan, untuk dirender. */
export function pecahTeks(teks: string): BagianTeks[] {
  const bagian: BagianTeks[] = [];
  let posisi = 0;
  for (const cocok of teks.matchAll(POLA_RUJUKAN)) {
    const mulai = cocok.index;
    if (mulai > posisi) {
      bagian.push({ jenis: 'utuh', teks: teks.slice(posisi, mulai) });
    }
    bagian.push({
      jenis: 'rujukan',
      teks: cocok[2] ?? '',
      fact_id: (cocok[1] ?? '').trim(),
    });
    posisi = mulai + cocok[0].length;
  }
  if (posisi < teks.length) {
    bagian.push({ jenis: 'utuh', teks: teks.slice(posisi) });
  }
  return bagian;
}
