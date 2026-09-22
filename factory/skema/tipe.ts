/**
 * Tipe data untuk fakta, temuan verifikasi, soal, dan berkas kasus.
 * Keterangan tiap field ada di `docs/format-kasus.md`.
 */

export const VERSI_SKEMA = 3;

/**
 * Status satu fakta.
 *
 * `TIDAK_LENGKAP` (M2a D-1) adalah jawaban untuk "datanya tidak cukup untuk
 * memutuskan", dan sengaja bukan `KONFLIK` maupun `BELUM`: memetakannya ke
 * `KONFLIK` menolak kartu yang benar (203 baris harga R18a, 55 aksi R34),
 * memetakannya ke `BELUM` menyembunyikan temuannya.
 */
export type StatusFakta = 'TERVERIFIKASI' | 'KONFLIK' | 'BELUM' | 'TIDAK_LENGKAP';

/**
 * Berat sebuah temuan (M2a D-1).
 *
 * - `konflik`    - angkanya bertentangan; fakta terkait tidak boleh jadi jawaban.
 * - `peringatan` - datanya janggal tetapi penjelasan yang sah mungkin ada.
 * - `catatan`    - label atau keterbatasan, bukan tuduhan kesalahan.
 *
 * Medan ini **opsional** di `Temuan`. Temuan R1-R10 tidak menulisnya sama
 * sekali supaya berkas kasus lama tetap byte-identik (INV-A); temuan tanpa
 * medan ini dibaca sebagai `konflik`.
 */
export type Keparahan = 'konflik' | 'peringatan' | 'catatan';

export const KEPARAHAN_BAWAAN: Keparahan = 'konflik';

/**
 * Kode aturan verifikasi.
 *
 * R1-R10 adalah himpunan generasi pertama (`ATURAN_V1`), yang membangun berkas
 * kasus. Sisanya lahir di M2a dari uji lawan `.context/aturan-R-uji-lawan.md`
 * dan hanya berjalan di `ATURAN_V2` (`npm run verifikasi:gudang`).
 * Nomor lama tidak pernah dipakai ulang; `R17B` adalah pengganti R17 usulan
 * yang dibuang, jadi ia memakai nama sendiri. Kelompok keuangan dan peristiwa
 * korporasi (R20, R21, R23, R26, R27, R29, R31, R32, R34, dan R11b) lahir di
 * M2b dari putusan uji lawan yang sama.
 */
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
  | 'R10'
  | 'R11a'
  | 'R11b'
  | 'R12'
  | 'R13'
  | 'R14'
  | 'R15'
  | 'R16'
  | 'R17B'
  | 'R18a'
  | 'R19a'
  | 'R19b'
  | 'R20'
  | 'R21'
  | 'R22'
  | 'R23'
  | 'R25'
  | 'R26'
  | 'R27'
  | 'R28'
  | 'R29'
  | 'R31'
  | 'R32'
  | 'R33'
  | 'R34'
  | 'R35';

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
  /**
   * Berat temuan (M2a D-1). Tidak ditulis oleh R1-R10 supaya berkas kasus lama
   * tetap byte-identik; yang tidak menulisnya dibaca sebagai
   * `KEPARAHAN_BAWAAN` (`'konflik'`).
   */
  keparahan?: Keparahan;
}

/** Baca keparahan sebuah temuan, termasuk temuan jalur lama yang tidak menulisnya. */
export function keparahanTemuan(temuan: Temuan): Keparahan {
  return temuan.keparahan ?? KEPARAHAN_BAWAAN;
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

/**
 * Aturan yang **wajib tercatat** di jejak pemeriksaan sebuah berkas kasus.
 *
 * Ini himpunan generasi pertama (`ATURAN_V1`) dan sengaja tidak ikut bertambah
 * bersama `KodeAturan`: berkas kasus dibangun oleh `ATURAN_V1`, jadi menuntut
 * jejak R11+ di dalamnya akan menolak berkas kasus yang sah (INV-A).
 * Daftar lengkap kode yang bisa dikeluarkan mesin ada di `SEMUA_KODE_ATURAN`.
 */
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

/** Semua kode aturan yang dikenal skema, termasuk aturan M2a. */
/**
 * Semua kode aturan yang sungguh dijalankan mesin, yaitu isi `ATURAN_V2`.
 *
 * Daftar ini tumbuh **bersama** himpunan V2, satu task satu aturan: kode yang
 * ada di `KodeAturan` tetapi belum ada di sini adalah aturan yang nomornya
 * sudah dipesan dan kodenya belum ditulis.
 */
export const SEMUA_KODE_ATURAN: readonly KodeAturan[] = [
  ...SEMUA_ATURAN,
  'R11a',
  'R11b',
  'R12',
  'R13',
  'R14',
  'R15',
  'R16',
  'R17B',
  'R18a',
  'R19a',
  'R19b',
  'R20',
  'R21',
  'R22',
  'R23',
  'R25',
  'R26',
  'R27',
  'R28',
  'R29',
  'R31',
  'R32',
  'R33',
  'R34',
  'R35',
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
  /**
   * Kira-kira berapa menit kasus ini dimainkan (M3.5 D-1), dipakai baris meta
   * di bawah tombol "Mulai kasus": *"3 soal · sekitar 5 menit · tanpa akun,
   * tanpa skor"*.
   *
   * Opsional, supaya berkas kasus yang tidak menuliskannya tetap sah — baris
   * metanya lalu menghilangkan potongan itu, bukan menebak angkanya. Kalau
   * ditulis: bilangan bulat 1–30 (validator).
   *
   * Angkanya datang dari data, bukan dari selera: median durasi penyelesai
   * alpha ±5–10 menit, jadi DADA menulis 5.
   */
  menit?: number;
}

/**
 * Pesan penutup kasus ini (M4 D-4): yang tampil sesudah "Mau coba kasus lain"
 * ketika **tidak ada lagi** kasus yang belum dimainkan.
 *
 * Ia per-kasus, bukan satu kalimat tetap di dalam komponen. Sampai M3.7 ia
 * ditulis mati di `Aplikasi.tsx` dan berbunyi "kasus berikutnya adalah
 * perusahaan yang **sehat**" — sebuah penilaian saham, dan sebuah janji yang
 * hanya masuk akal kalau kasus yang baru saja dimainkan adalah DADA. Begitu
 * ada dua kasus, kalimat yang sama muncul di ujung keduanya dan salah di salah
 * satunya.
 *
 * Bentuknya mengikuti `TeksAwam`: `kepala` adalah kalimat pertama yang
 * ditebalkan di layar, `isi` sisanya. Keduanya polos — tanpa rujukan fakta dan
 * tanpa tanda tebal, karena penebalannya ditentukan medannya, bukan penanda di
 * dalam teks.
 */
export interface Penutup {
  kepala: string;
  isi: string;
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
  /** Pesan penutup kasus ini, ketika tidak ada lagi kasus yang belum dimainkan. */
  penutup: Penutup;
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
