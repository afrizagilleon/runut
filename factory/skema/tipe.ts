/**
 * Tipe data untuk fakta, temuan verifikasi, soal, dan berkas kasus.
 * Keterangan tiap field ada di `docs/format-kasus.md`.
 */

export const VERSI_SKEMA = 3;

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

/**
 * Teks kartu dalam bahasa sehari-hari (D-1). `kepala` adalah baris mesin tik
 * "jenis sumber · tanggal terbit"; `isi` satu-dua kalimat yang setiap angkanya
 * ditulis sebagai rujukan `[[fact_id|teks]]` supaya INV-4 tetap berlaku di kartu.
 */
export interface TeksAwam {
  kepala: string;
  isi: string;
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
  /** Teks kartu untuk pemain; `null` kalau fakta ini tidak pernah menjadi kartu. */
  awam: TeksAwam | null;
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

/**
 * Catatan satu aturan verifikasi: dijalankan atau tidak, dan kalau tidak, kenapa.
 * Ada supaya aturan yang tidak bisa dijalankan tidak hilang diam-diam (INV-6).
 */
export interface PemeriksaanAturan {
  aturan: KodeAturan;
  judul: string;
  dijalankan: boolean;
  alasan_lewat: string | null;
  jumlah_temuan: number;
}

export const SEMUA_ATURAN: readonly KodeAturan[] = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
];

export interface PilihanSoal {
  kunci: string;
  teks: string;
}

/** Satu istilah berpenjelasan satu baris, tampil di bawah kartu (D-1). */
export interface Istilah {
  kata: string;
  arti: string;
}

export interface Soal {
  soal_id: string;
  /** 2–4 fact_id yang tampil sebagai kartu tepat di atas soal (D-1). */
  kartu: string[];
  /**
   * 1–2 kartu yang benar-benar menentukan jawabannya, himpunan bagian `kartu`.
   * Salinan ringkasnya tampil tepat di atas teks kunci, supaya mata tidak perlu
   * menggulir balik satu setengah layar untuk mencocokkan (A1-T1).
   */
  kartu_penentu: string[];
  /** 0–2 istilah; lebih dari dua ditolak validator. */
  istilah: Istilah[];
  /**
   * Pesan yang masuk ke grup obrolan (v3). Ia dibaca lebih dulu, sebelum
   * dokumennya: "orang kasih kabar, kita verify" (pemilik, 22 Sep).
   *
   * Menggantikan `batang` v2, yang mencampur konteks, tanggal, dan pertanyaan
   * dalam satu paragraf — pemilik membacanya sebagai informasi, bukan kabar.
   */
  pesan: PesanTeman;
  /**
   * Judul pertanyaan, satu baris: "Omongan {nama} cocok dengan dokumennya?".
   * Isi jawabannya ada di opsi, bukan di sini.
   */
  tanya: string;
  /**
   * Satu kalimat cara main, hanya di soal pertama. `null` di soal lain —
   * validator menolak kalau bukan begitu. Pemilik tidak membaca tiga aturan di
   * layar pertama, jadi petunjuknya dipindah ke tempat ia sedang melihat.
   */
  petunjuk: string | null;
  pilihan: PilihanSoal[];
  jawaban: string;
  penjelasan: string;
  fact_ids: string[];
}

export interface KartuKonsep {
  kode: string;
  judul: string;
}

/**
 * Pesan obrolan dari seorang teman (v3).
 *
 * Angka di dalamnya adalah **ucapan, bukan fakta**: ia tidak ditebalkan, tidak
 * diwarnai, dan tidak ditautkan (INV-4). Tanda `[[fact_id|teks]]` boleh ada di
 * data sebagai jejak, tetapi dirender polos.
 */
export interface PesanTeman {
  /** Nama pendek pengirim, 2–12 huruf. Tiap soal pengirim berbeda. */
  nama: string;
  /** Jam kirim `HH.MM`, sesudah bursa tutup pada tanggal T. */
  jam: string;
  /** Isi pesan, paling banyak 220 karakter polos. */
  isi: string;
}

/**
 * Layar pertama (v3): satu kalimat saja.
 *
 * Tiga baris aturan main v2 dihapus — pemilik tidak membacanya, ia langsung
 * mengetuk dan menggulir. Cara mainnya pindah ke `Soal.petunjuk` di soal 1.
 */
export interface Pembuka {
  kalimat: string;
}

export interface Pembukaan {
  fact_ids: string[];
  paragraf: string[];
  /** "Apa yang bisa dibaca pada 8 Oktober". */
  bisa_dibaca: string[];
  /** "…dan apa yang tidak bisa dibaca." */
  tidak_bisa_dibaca: string[];
  /**
   * "Yang kami singkirkan dari kartu" (D-13e): laporan resmi yang tidak lolos
   * pemeriksaan sendiri. Satu-satunya tempat fakta KONFLIK boleh ditautkan.
   */
  disingkirkan: string[];
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
  /** Layar pertama. */
  pembuka: Pembuka;
  fakta: Fakta[];
  /** fact_id yang boleh dilihat pemain sebelum menjawab. */
  fakta_terlihat: string[];
  soal: Soal[];
  pembukaan: Pembukaan;
  temuan: Temuan[];
  /** Catatan seluruh aturan R1–R10: yang jalan, yang dilewati, beserta alasannya. */
  pemeriksaan: PemeriksaanAturan[];
  kartu_konsep: KartuKonsep[];
  /** Tiga kalimat tetap RQ-08. */
  disclaimer: string[];
}

export interface MasalahValidasi {
  kode: string;
  pesan: string;
}
