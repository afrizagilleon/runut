/**
 * Bentuk keluaran penyusun LLM: satu simulasi, tiga omongan (M2d D-3).
 *
 * Sengaja lebih sempit dari `Kasus`: LLM tidak menulis fakta, kartu, maupun
 * layar pembukaan. Ia hanya memilih kartu dari paket (daftar `fact_id`) dan
 * menulis kata-kata di sekitarnya. Angka yang dibaca pemain tetap datang dari
 * paket lewat rujukan `[[fact_id|teks]]`, dan validator memeriksa tiap angka
 * itu kembali ke faktanya (D-4).
 */

export type KunciOpsi = 'a' | 'b' | 'c' | 'd';

/** Satu angka di pesan teman, dan dari mana ia datang. */
export interface AngkaPesan {
  /** Potongan teks persis seperti tertulis di pesan, misalnya "Rp145". */
  teks: string;
  /** Fakta paket yang nilainya sama. Tidak ada kalau `andaian`. */
  fact_id?: string;
  /** Angka keliru yang sengaja diucapkan teman; hanya sah di omongan yang KELIRU. */
  andaian?: boolean;
}

export interface OmonganDraf {
  /** Nama pendek pengirim. */
  nama: string;
  /** Jam kirim `HH.MM`, sesudah bursa tutup pada tanggal T. */
  jam: string;
  /** Isi pesan obrolan, polos, ≤ 220 karakter. */
  pesan: string;
  angka_pesan: AngkaPesan[];
  /** 2–4 fact_id dari paket. */
  kartu: string[];
  /** 1–2 kartu yang menentukan jawabannya, himpunan bagian `kartu`. */
  kartu_penentu: string[];
  pilihan: Record<KunciOpsi, string>;
  kunci: KunciOpsi;
  penjelasan: string;
}

export interface DrafSimulasi {
  omongan: OmonganDraf[];
}

/** Satu masalah validator. `omongan` 1–3, atau `null` untuk masalah seluruh draf. */
export interface MasalahDraf {
  kode: string;
  omongan: number | null;
  pesan: string;
}
