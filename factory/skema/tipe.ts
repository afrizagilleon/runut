/**
 * Tipe data untuk fakta, temuan verifikasi, soal, dan berkas kasus.
 * Keterangan tiap field ada di `docs/format-kasus.md`.
 */

export const VERSI_SKEMA = 1;

export type StatusFakta = 'TERVERIFIKASI' | 'KONFLIK' | 'BELUM';

export type KodeAturan =
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'R5'
  | 'R6'
  | 'R7'
  | 'R8'
  | 'R9'
  | 'R10';

export type JenisSumber = 'api' | 'berkas' | 'turunan';

/** Jejak asal satu fakta. Isi berkasnya tidak disalin, hanya alamatnya. */
export interface Sumber {
  jenis: JenisSumber;
  /** Endpoint API asal, tanpa host rahasia. `null` untuk sumber non-API. */
  endpoint: string | null;
  /** Nama berkas (PDF keterbukaan informasi atau berkas cache). */
  berkas: string | null;
  /** Parameter permintaan atau penunjuk baris di dalam berkas. */
  parameter: Record<string, string>;
  /** Waktu data ditarik dari penyedia; `null` kalau tidak tercatat di data. */
  diambil_pada: string | null;
  /** Rumus atau penjelasan singkat untuk sumber `turunan`. */
  keterangan: string | null;
}

export interface Fakta {
  fact_id: string;
  klaim: string;
  nilai: number | string | null;
  satuan: string | null;
  sumber: Sumber;
  /** fact_id lain yang dipakai menghitung fakta ini (untuk `turunan`). */
  turunan_dari: string[];
  /** Tanggal fakta bisa diketahui publik (ISO). `null` = tidak bisa ditentukan. */
  tersedia_sejak: string | null;
  status: StatusFakta;
}

export interface AngkaTemuan {
  label: string;
  nilai: number;
  satuan: string;
}

export interface Temuan {
  temuan_id: string;
  aturan: KodeAturan;
  ringkasan: string;
  angka: AngkaTemuan[];
  fakta_terkait: string[];
  /** Penunjuk ke laporan yang terlibat, misalnya waktu laporan dan nama berkas. */
  rujukan: string[];
}

export interface PilihanSoal {
  kunci: string;
  teks: string;
}

export interface Soal {
  soal_id: string;
  batang: string;
  pilihan: PilihanSoal[];
  jawaban: string;
  penjelasan: string;
  fact_ids: string[];
}

export interface KartuKonsep {
  kode: string;
  judul: string;
}

export interface Pembukaan {
  fact_ids: string[];
  paragraf: string[];
}

export interface Emiten {
  simbol: string;
  nama: string;
  papan: string;
  sektor: string;
}

export interface Kasus {
  skema_versi: number;
  kasus_id: string;
  judul: string;
  emiten: Emiten;
  nama_samaran: string;
  /** Tanggal beku kasus (ISO). Fakta sesudah tanggal ini tidak terlihat pemain. */
  tanggal_t: string;
  fakta: Fakta[];
  /** fact_id yang boleh dilihat pemain sebelum menjawab. */
  fakta_terlihat: string[];
  soal: Soal[];
  pembukaan: Pembukaan;
  temuan: Temuan[];
  kartu_konsep: KartuKonsep[];
  /** Tiga kalimat tetap RQ-08. */
  disclaimer: string[];
}

export interface MasalahValidasi {
  kode: string;
  pesan: string;
}
