/**
 * Seluruh keadaan permainan, dalam satu reducer murni (D-5).
 *
 * `(keadaan, aksi, waktu) → { keadaan, peristiwa[] }`. Tidak ada `Date.now()` di
 * dalam berkas ini: waktu selalu disuntikkan pemanggil. Tidak ada `useState`
 * untuk keadaan permainan di komponen mana pun — komponen hanya `dispatch` dan
 * merender apa yang dikembalikan reducer ini.
 *
 * Alasannya praktis: proyek ini tidak punya jsdom, jadi reducer murni adalah
 * satu-satunya cara membuktikan lewat tes bahwa peristiwa benar-benar lahir dari
 * interaksi, bukan ditempel belakangan.
 */

import { MAKS_UID } from './pelacak.ts';
import { MEDAN_PERANGKAT, type Perangkat } from './perangkat.ts';

/** Daftar peristiwa tertutup (D-6). Apa pun di luar daftar ini ditolak pengumpul. */
export const NAMA_PERISTIWA = [
  'mulai',
  'layar_masuk',
  'kartu_buka',
  /*
   * A-2: baris istilah dicatat seperti kaki lembar. Keduanya pintu ke
   * penjelasan, dan pemilik ingin tahu pintu mana yang dipakai orang.
   * Seperti `kartu_buka`, ia lahir **hanya saat membuka**.
   */
  'istilah_buka',
  'kembali_ke_kartu',
  'pilih',
  'kunci_jawaban',
  'lihat_balik',
  'pembukaan_masuk',
  /*
   * A4-T5. Layar pembukaan panjang, dan pemilik harus menggulir jauh sebelum
   * sampai ke ringkasan "apa yang bisa dan tidak bisa dibaca" — bagian yang
   * justru menjawab pertanyaan permainannya. Jalan pintasnya dicatat karena
   * seberapa sering ia dipakai adalah ukuran apakah garis waktunya terlalu
   * panjang; menyembunyikan garis waktunya sendiri akan menghapus pertanyaan
   * itu, bukan menjawabnya.
   */
  'loncat_ke_ringkasan',
  'pembukaan_selesai',
  'minat_kasus_lain',
  'akhir_kirim',
  /*
   * Pelacak (D-8, M3.2). Ketiganya lahir di reducer yang sama seperti peristiwa
   * lain: pemilik ingin tahu "apa yang orang ketuk, apa yang mereka kira bisa
   * diketuk, dan sampai mana mereka menggulir", dan jawaban itu tidak boleh
   * datang lewat pipa kedua yang nomor urutnya sendiri.
   */
  'ketuk',
  'ketuk_dibatasi',
  'gulir',
  /*
   * M3.7 D-2 — satu-satunya nama yang ditambahkan milestone ini, dan
   * penambahannya diizinkan kontrak secara tertulis.
   *
   * Uji duduk 22 Sep: orang menggulir bolak-balik jauh antara balon chat dan
   * pilihan (gulir balik ke kartu 2,5x di soal 2). Jawabannya adalah balon
   * melayang yang bisa ditarik — dan pemilik meminta satu hal lagi: "pastikan
   * kita bisa melacak dia membuka, mengintip, atau tidak menggunakan sama
   * sekali". Tanpa peristiwa ini, satu-satunya yang terbaca dari data adalah
   * gulir balik yang turun, tanpa ada yang bisa mengatakan **karena apa**.
   *
   * Ia lahir per **perubahan keadaan**, bukan per gerakan jari, dan berhenti
   * dicatat di `BATAS_BALON`. Pengumpul di server sungguhan memvalidasi daftar
   * tertutup ini: nama ini harus sudah terpasang di sana SEBELUM web M3.7
   * di-deploy, kalau tidak seluruh kelompok kiriman dijawab 400 dan peristiwa
   * lain di kelompok yang sama ikut hilang (lihat `deploy/README.md`).
   */
  'balon',
  'tutup',
] as const;

export type NamaPeristiwa = (typeof NAMA_PERISTIWA)[number];

export type NilaiIsi = string | number | boolean | null;

export interface Peristiwa {
  nama: NamaPeristiwa;
  /** Id sesi acak yang hidup di memori tab saja (INV-9). */
  sesi: string;
  kasus_id: string;
  /** Milidetik sejak aksi `mulai`. */
  t_ms: number;
  /** Nomor urut dalam sesi, mulai dari 1. */
  urut: number;
  isi: Record<string, NilaiIsi>;
}

/** Batas panjang teks bebas di layar akhir (D-6). */
export const MAKS_TEKS_AKHIR = 500;

/**
 * Ketukan paling banyak yang dicatat satu sesi (D-8).
 *
 * Sesudahnya lahir **satu** `ketuk_dibatasi`, lalu diam. Batas ini bukan soal
 * biaya: sesi yang mengirim ribuan ketukan biasanya jari yang tersangkut atau
 * tab yang dibiarkan terbuka semalaman, dan membiarkannya masuk akan menggeser
 * setiap angka "uid teratas" tanpa ada yang menyadarinya.
 */
export const BATAS_KETUK = 300;

/** Balon chat melayang: mengintip di bawah keping, atau turun utuh (M3.7 D-1). */
export type KeadaanBalon = 'intip' | 'turun';

/** Bagaimana keadaan balon berubah: satu ketukan, atau satu tarikan jari. */
export type CaraBalon = 'ketuk' | 'tarik';

/**
 * Peristiwa `balon` paling banyak yang dicatat satu sesi (M3.7 D-2).
 *
 * Sesudahnya **tidak** ada peristiwa "dibatasi" — pencatatannya berhenti, itu
 * saja. Beda dengan `ketuk`, yang batasnya menandai sesi aneh dan karena itu
 * pantas dilaporkan: balon yang digoyang empat puluh kali sudah menjawab
 * pertanyaannya sendiri ("orang ini bermain dengan balonnya"), dan peristiwa
 * ke-41 hanya menghabiskan kuota kiriman tanpa menambah satu pun informasi.
 */
export const BATAS_BALON = 40;

export type Layar =
  | { jenis: 'pembuka' }
  | { jenis: 'soal'; nomor: number }
  | { jenis: 'pembukaan' }
  | { jenis: 'akhir' };

/** Nama layar seperti yang dicatat peristiwa: pembuka, soal-1, soal-2, …, akhir. */
export function namaLayar(layar: Layar): string {
  return layar.jenis === 'soal' ? `soal-${String(layar.nomor + 1)}` : layar.jenis;
}

/**
 * Kebalikan `namaLayar`: nama yang tersimpan di entri riwayat peramban menjadi
 * layar (A-1, cacat C-1).
 *
 * `null` untuk nama yang tidak dikenal **dan** untuk nomor soal di luar
 * jangkauan kasus ini. Entri riwayat bisa datang dari muatan halaman yang lain,
 * dari kasus dengan jumlah soal berbeda, atau dari tangan orang yang
 * mengubahnya; tidak satu pun boleh membuat aplikasi melempar.
 */
export function layarDariNama(nama: string, jumlahSoal: number): Layar | null {
  if (nama === 'pembuka') return { jenis: 'pembuka' };
  if (nama === 'pembukaan') return { jenis: 'pembukaan' };
  if (nama === 'akhir') return { jenis: 'akhir' };
  const cocok = /^soal-(\d+)$/.exec(nama);
  if (cocok === null) return null;
  const nomor = Number(cocok[1]) - 1;
  if (!Number.isInteger(nomor) || nomor < 0 || nomor >= jumlahSoal) return null;
  return { jenis: 'soal', nomor };
}

/** Posisi layar dalam perjalanan maju: pembuka → soal → pembukaan → akhir. */
function urutanLayar(layar: Layar, jumlahSoal: number): number {
  if (layar.jenis === 'pembuka') return 0;
  if (layar.jenis === 'soal') return layar.nomor + 1;
  if (layar.jenis === 'pembukaan') return jumlahSoal + 1;
  return jumlahSoal + 2;
}

export interface KeadaanSoal {
  /** Pilihan sekarang; `null` berarti belum memilih. */
  kunci: string | null;
  dikunci: boolean;
  /** `null` selama belum dikunci. */
  benar: boolean | null;
  /** Berapa kali pemain berpindah pilihan; 0 untuk pilihan pertama. */
  ganti: number;
  /** Jumlah panel sumber kartu yang dibuka di soal ini. */
  kartuDibuka: number;
  /**
   * Sejak kapan tumpukan kartu ≥ 50 % terlihat; `null` kalau sedang tidak
   * terlihat. Diisi pengamat di komponen lewat dispatch, dijumlahkan di sini.
   */
  kartuTerlihatSejak: number | null;
  /** Milidetik tumpukan kartu terlihat, dari kunjungan yang sudah selesai. */
  msKartuTerlihat: number;
  /** Nilai `msKartuTerlihat` yang dibekukan saat soal ini dikunci. */
  msKartuTerlihatSaatKunci: number;
  /** Kartu pernah keluar layar; dipakai membedakan gulir balik dari kemunculan pertama. */
  pernahKeluar: boolean;
  /**
   * Opsi pertama sedang terlihat di layar (D-4).
   *
   * Satu-satunya fakta TAMPILAN di dalam keadaan permainan, dan ia ada di sini
   * karena bilah bawah harus bisa ditentukan fungsi murni: "apa yang pantas
   * ditawarkan sekarang" tidak boleh dihitung di dalam JSX. Pengamatnya di
   * komponen hanya `dispatch`, persis seperti pengamat kartu (A1-T9).
   */
  opsiTerlihat: boolean;
  /** Berapa kali kartu masuk layar lagi sesudah pernah keluar. */
  gulirBalik: number;
  /** Nilai `gulirBalik` yang dibekukan saat soal ini dikunci. */
  gulirBalikSaatKunci: number;
  /** Waktu masuk terakhir ke layar soal ini; `null` kalau sedang tidak di sini. */
  masukPada: number | null;
  /** Milidetik yang sudah terkumpul di layar soal ini dari kunjungan sebelumnya. */
  msTerkumpul: number;
}

export interface JawabanAkhir {
  rating: number | null;
  terasa: string | null;
  sumber_jawaban: string | null;
  teks: string | null;
}

export interface Keadaan {
  sesi: string;
  kasus_id: string;
  /** Daftar soal_id berurutan; menentukan jumlah layar soal. */
  urutanSoal: string[];
  /** Kunci jawaban yang benar per soal_id, untuk menilai `benar`. */
  kunciBenar: Record<string, string>;
  /** fact_id kartu per soal_id; dipakai "Lihat kartu lagi". */
  kartuSoal: Record<string, string[]>;
  /** `null` sebelum aksi `mulai`; sesudahnya menjadi titik nol `t_ms`. */
  mulaiPada: number | null;
  layar: Layar;
  soal: Record<string, KeadaanSoal>;
  /**
   * `fact_id` lembar-lembar yang sumbernya sedang terbuka di layar ini (A-2).
   *
   * **Himpunan, bukan satu nilai.** Versi lama menyimpan satu `fact_id`, jadi
   * membuka lembar kedua diam-diam menutup yang pertama dan menggeser isi di
   * bawah jari pemain. Di `docs/contoh/layar-soal.html` tiap lembar mandiri,
   * dan itulah yang ditiru di sini.
   *
   * Dikosongkan tiap ganti layar: yang dibuka di soal 1 tidak boleh ikut
   * terbuka waktu pemain melihat balik soal itu dari layar lain.
   */
  sumberTerbuka: readonly string[];
  /** Baris "Arti istilah" sedang terbuka di layar ini (A-2). */
  istilahTerbuka: boolean;
  /**
   * Keadaan balon chat melayang **per layar** (M3.7 D-2); yang tidak ada di
   * peta ini berarti masih mengintip, keadaan bawaannya.
   *
   * Ia hidup di sini dan bukan di DOM karena alasan yang sama dengan baris
   * istilah (A-2): keadaan yang tinggal di komponen tidak bisa dibuktikan tes
   * mana pun, dan tidak ada satu pun peristiwanya yang bisa dilahirkan dari
   * tempat yang tidak dilewati reducer.
   *
   * Per layar, bukan satu nilai: pemain yang menurunkan balon di soal 1 tidak
   * sedang mengatakan apa pun tentang soal 2.
   */
  balon: Record<string, KeadaanBalon>;
  /**
   * Salinan melayang sedang aktif di layar ini — yaitu balon aslinya sudah
   * lewat lebih dari separuh ke atas keping (M3.7 D-1).
   *
   * Fakta TAMPILAN, seperti `opsiTerlihat`: pengamatnya di komponen hanya
   * `dispatch`, dan tidak ada satu pun peristiwa yang lahir darinya. Ia ada di
   * keadaan supaya "apakah balon melayang sekarang" bisa dirender dari fungsi
   * yang sama yang dites, bukan dari `classList.toggle` di dalam pendengar.
   */
  balonMelayang: Record<string, boolean>;
  /** Berapa `balon` yang sudah dilahirkan sesi ini; berhenti di `BATAS_BALON`. */
  balonDicatat: number;
  akhir: JawabanAkhir;
  /** Sudah menekan Selesai. */
  akhirTerkirim: boolean;
  /** Sudah menekan "Mau coba kasus lain"; pesan alpha-nya lalu tampil. */
  minatDitekan: boolean;
  /**
   * Gulir terjauh **di layar yang sedang dibuka**, dalam persen.
   *
   * Disetel ulang tiap kali layar berganti (D-8): angka ini menjadi `gulir`
   * yang dikirim saat meninggalkan layar, dan sekaligus tetap menjadi
   * `gulir_maks_persen` di `pembukaan_selesai` — karena layar itulah yang
   * sedang dibuka ketika peristiwa tersebut lahir.
   */
  gulirMaksPersen: number;
  /**
   * Ambang gulir terbesar yang sudah dilaporkan di **kunjungan layar ini**
   * (M3.4a D-1): 0, 50, atau 100.
   *
   * Disetel ulang tiap ganti layar bersama `gulirMaksPersen`, dan hanya boleh
   * naik. Karena `gulirMaksPersen` sendiri tidak pernah turun, "naik–turun–naik"
   * tidak bisa melahirkan peristiwa ambang kedua kali — itu sifat kedua angka
   * ini, bukan sebuah pemeriksaan tambahan yang bisa lupa dipasang.
   *
   * Ini medan KEADAAN, bukan medan peristiwa: bentuk `gulir` tetap
   * `{ layar, maks }` (D-2), karena pengumpul di server sungguhan memvalidasi
   * daftar tertutup dan tidak ikut di-deploy bersama perubahan ini.
   */
  ambangGulirDilapor: number;
  masukPembukaanPada: number | null;
  /** Berapa `ketuk` yang sudah dilahirkan sesi ini; berhenti di `BATAS_KETUK`. */
  ketukan: number;
  /** `ketuk_dibatasi` sudah dilahirkan; ia hanya lahir sekali. */
  ketukDibatasi: boolean;
  /** Nomor urut peristiwa terakhir. */
  urut: number;
  /** Sudah menerima aksi `tutup`; sesudah ini reducer tidak melahirkan apa pun. */
  tertutup: boolean;
}

export type Aksi =
  | {
      jenis: 'mulai';
      lebar_layar: number;
      /** Kode dari `?k=` (D-9); `null` kalau tidak ada atau tidak sah. */
      penanda?: string | null;
      /** Nomor pengunjung dari `localStorage` (D-13); `null` kalau tidak bisa disimpan. */
      pengunjung?: string | null;
      kunjungan_ke?: number | null;
      /**
       * Keterangan kasar perangkat dan asal (M3.8 D-1), sudah berupa kategori.
       * Diturunkan `bacaPerangkat()` di komponen; reducer hanya menyalin
       * kelima belas medannya — dan HANYA itu, lihat `isiPerangkat`.
       */
      perangkat?: Perangkat | null;
    }
  | { jenis: 'ketuk'; uid: string | null; x: number; y: number; mati: boolean }
  | { jenis: 'kartu_masuk_layar'; soal_id: string }
  | { jenis: 'kartu_keluar_layar'; soal_id: string }
  | { jenis: 'kembali_ke_kartu'; soal_id: string }
  | { jenis: 'opsi_terlihat'; soal_id: string; terlihat: boolean }
  /*
   * Sakelar, bukan tombol buka (A-2). Satu `dispatch` per ketukan; yang
   * memutuskan "ini membuka atau menutup" adalah reducer, bukan komponen —
   * kalau komponen yang memutuskan, ia harus menyimpan keadaan sendiri, dan
   * keadaan yang hidup di komponen tidak bisa dibuktikan tes mana pun.
   */
  | { jenis: 'sakelar_sumber'; fact_id: string; soal_id: string | null }
  | { jenis: 'sakelar_istilah'; soal_id: string }
  /*
   * Balon chat melayang (M3.7 D-2). Komponen mengirim keadaan TUJUAN, bukan
   * "balik arah": tarikan jari sudah tahu ke mana ia jatuh (ambang sepertiga
   * tinggi), dan ketukan sudah tahu ia membalik. Kalau reducer yang menebak
   * arahnya, tarikan yang berakhir di tempat semula akan terbaca sebagai
   * perubahan — dan melahirkan peristiwa untuk gerakan yang tidak mengubah apa
   * pun di layar.
   */
  | { jenis: 'sakelar_balon'; layar: string; keadaan: KeadaanBalon; cara: CaraBalon }
  /*
   * Salinan melayang muncul atau menghilang. Fakta tampilan, tanpa peristiwa —
   * persis seperti `opsi_terlihat`. Menghilang mengembalikan keadaannya ke
   * mengintip, seperti patokan v3d: balon yang kembali ke alirannya tidak
   * boleh menyimpan "turun" untuk kemunculan berikutnya.
   */
  | { jenis: 'balon_melayang'; layar: string; melayang: boolean }
  | { jenis: 'pilih'; soal_id: string; kunci: string }
  | { jenis: 'kunci_jawaban'; soal_id: string }
  | { jenis: 'lanjut' }
  | { jenis: 'lihat_balik'; nomor: number }
  | { jenis: 'loncat_ke_ringkasan' }
  /*
   * Perpindahan lewat tombol peramban (A-1, cacat C-1). Namanya datang dari
   * `history.state.layar`, bukan dari tebakan arah: tombol **maju** menyalakan
   * `popstate` yang sama dengan tombol kembali, dan versi lama menganggap
   * keduanya mundur.
   */
  | { jenis: 'riwayat_ke'; nama: string }
  | { jenis: 'catat_gulir'; persen: number }
  | { jenis: 'minat_kasus_lain' }
  | { jenis: 'isi_akhir'; medan: keyof JawabanAkhir; nilai: string | number | null }
  | { jenis: 'kirim_akhir' }
  | { jenis: 'tutup' };

export interface Hasil {
  keadaan: Keadaan;
  peristiwa: Peristiwa[];
}

export interface AwalKeadaan {
  sesi: string;
  kasus_id: string;
  urutanSoal: string[];
  kunciBenar: Record<string, string>;
  kartuSoal: Record<string, string[]>;
}

function soalKosong(): KeadaanSoal {
  return {
    kunci: null,
    dikunci: false,
    benar: null,
    ganti: 0,
    kartuDibuka: 0,
    kartuTerlihatSejak: null,
    msKartuTerlihat: 0,
    msKartuTerlihatSaatKunci: 0,
    pernahKeluar: false,
    opsiTerlihat: false,
    gulirBalik: 0,
    gulirBalikSaatKunci: 0,
    masukPada: null,
    msTerkumpul: 0,
  };
}

export function keadaanAwal({
  sesi,
  kasus_id,
  urutanSoal,
  kunciBenar,
  kartuSoal,
}: AwalKeadaan): Keadaan {
  const soal: Record<string, KeadaanSoal> = {};
  for (const id of urutanSoal) soal[id] = soalKosong();
  return {
    sesi,
    kasus_id,
    urutanSoal: [...urutanSoal],
    kunciBenar: { ...kunciBenar },
    kartuSoal: { ...kartuSoal },
    mulaiPada: null,
    layar: { jenis: 'pembuka' },
    soal,
    sumberTerbuka: [],
    istilahTerbuka: false,
    balon: {},
    balonMelayang: {},
    balonDicatat: 0,
    akhir: { rating: null, terasa: null, sumber_jawaban: null, teks: null },
    akhirTerkirim: false,
    minatDitekan: false,
    gulirMaksPersen: 0,
    ambangGulirDilapor: 0,
    masukPembukaanPada: null,
    ketukan: 0,
    ketukDibatasi: false,
    urut: 0,
    tertutup: false,
  };
}

/**
 * Keadaan balon melayang di sebuah layar (M3.7 D-2).
 *
 * Satu fungsi, dipakai reducer maupun komponen. Menuliskan `?? 'intip'` di dua
 * tempat berarti dua bawaan yang bisa berselisih diam-diam.
 */
export function keadaanBalon(keadaan: Keadaan, layar: string): KeadaanBalon {
  return keadaan.balon[layar] ?? 'intip';
}

/** Salinan melayang sedang aktif di layar ini (M3.7 D-1). */
export function balonMelayang(keadaan: Keadaan, layar: string): boolean {
  return keadaan.balonMelayang[layar] ?? false;
}

/** Soal yang sedang dibuka, atau `null` kalau layarnya bukan layar soal. */
export function soalSekarang(keadaan: Keadaan): string | null {
  if (keadaan.layar.jenis !== 'soal') return null;
  return keadaan.urutanSoal[keadaan.layar.nomor] ?? null;
}

/**
 * Tanda yang didapat satu baris opsi (A1-T4, diperbaiki A4-T4).
 *
 * Fungsi murni, bukan rangkaian tanda tanya di dalam JSX: "opsi mana mendapat
 * tanda apa" adalah aturan, dan aturan harus bisa dites. Sesudah dikunci,
 * penekanan visual terkuat wajib berada di jawaban yang cocok dengan kartu.
 *
 * **Yang salah di A1-T4:** pilihan pemain yang keliru diturunkan menjadi abu-abu
 * **tanpa label apa pun**. Penekanan memang pindah ke jawaban yang cocok, tetapi
 * pemain kehilangan satu-satunya hal yang ia butuhkan untuk belajar dari
 * kesalahannya: *yang mana tadi jawabanku*. Uji ponsel pemilik menemukan persis
 * itu — sesudah salah, ia tidak tahu lagi mana pilihannya.
 *
 * Jadi keempat keadaan tetap, tetapi selektornya sekarang juga menyebut
 * **kata** yang tampil di baris itu. Pilihan pemain selalu berlabel
 * "Pilihanmu"; jawaban yang cocok selalu berlabel "✓ yang cocok dengan kartu".
 * Kalau pemain menjawab benar, satu baris membawa keduanya. Tidak pernah warna
 * saja: selalu ada kata, dan garis 2 px yang bisa dilihat tanpa membedakan warna.
 */
export type KeadaanOpsi = 'polos' | 'dipilih' | 'cocok' | 'keliru';

/** Label kata di dalam baris opsi. Keduanya tampil bersama kalau pemain benar. */
export const LABEL_PILIHAN_PEMAIN = 'Pilihanmu';
export const LABEL_COCOK = '✓ yang cocok dengan kartu';

export interface TandaOpsi {
  /** Menentukan kelas `.opsi-*`, yaitu bentuk dan garisnya. */
  keadaan: KeadaanOpsi;
  /** Kata yang tampil di dalam baris, urut dari atas. Boleh kosong, satu, atau dua. */
  label: readonly string[];
}

export function tandaOpsi(
  soal: KeadaanSoal | undefined,
  kunciOpsi: string,
  jawaban: string,
): TandaOpsi {
  if (soal === undefined) return { keadaan: 'polos', label: [] };

  const dipilihPemain = soal.kunci === kunciOpsi;

  if (!soal.dikunci) {
    return dipilihPemain
      ? { keadaan: 'dipilih', label: [LABEL_PILIHAN_PEMAIN] }
      : { keadaan: 'polos', label: [] };
  }

  if (kunciOpsi === jawaban) {
    // Pemain menjawab benar: satu baris membawa kedua tanda.
    return {
      keadaan: 'cocok',
      label: dipilihPemain ? [LABEL_PILIHAN_PEMAIN, LABEL_COCOK] : [LABEL_COCOK],
    };
  }

  return dipilihPemain
    ? { keadaan: 'keliru', label: [LABEL_PILIHAN_PEMAIN] }
    : { keadaan: 'polos', label: [] };
}

/**
 * Bilah bawah: tiga keadaan, ditentukan fungsi murni (D-4).
 *
 * Aturannya satu kalimat: **bilah bawah selalu membawa satu tindakan yang masuk
 * akal, dan tombol utama tidak pernah tampil mati** (INV-12). Karena itu
 * "tidak ada bilah" adalah jawaban yang sah — bukan tombol kelabu.
 *
 * `turun` ada demi temuan pemilik di ponselnya: di 360 × 640 opsi pertama soal 1
 * tidak terlihat, dan ia tidak tahu harus ke mana. Begitu opsinya terlihat,
 * bilahnya menyingkir supaya tidak menutupi apa pun.
 */
export type BilahBawah =
  | { jenis: 'tidak-ada' }
  | { jenis: 'turun'; label: string }
  | { jenis: 'kunci'; label: string }
  | { jenis: 'lanjut'; label: string };

export const LABEL_TURUN = '\u2193 Jawab di bawah';
export const LABEL_KUNCI = 'Kunci jawaban';

export function bilahBawah(
  soal: KeadaanSoal | undefined,
  nomor: number,
  jumlahSoal: number,
): BilahBawah {
  if (soal === undefined) return { jenis: 'tidak-ada' };

  if (soal.dikunci) {
    const terakhir = nomor + 1 >= jumlahSoal;
    return {
      jenis: 'lanjut',
      label: terakhir ? 'Lihat yang terjadi sesudahnya' : `Lanjut ke soal ${String(nomor + 2)}`,
    };
  }

  if (soal.kunci !== null) return { jenis: 'kunci', label: LABEL_KUNCI };

  return soal.opsiTerlihat
    ? { jenis: 'tidak-ada' }
    : { jenis: 'turun', label: LABEL_TURUN };
}

export function semuaTerkunci(keadaan: Keadaan): boolean {
  return keadaan.urutanSoal.every((id) => keadaan.soal[id]?.dikunci === true);
}

/**
 * Pemain memang pernah sampai di layar ini (A-1, cacat C-1).
 *
 * Dipakai hanya untuk arah **maju**: tombol maju peramban tidak boleh menjadi
 * jalan pintas ke soal yang belum dibuka atau ke pembukaan yang belum diperoleh.
 * Syaratnya dibaca dari keadaan permainan, bukan dari tumpukan riwayat — karena
 * tumpukan riwayat adalah hal yang justru bisa dibuat-buat.
 */
export function pernahSampai(keadaan: Keadaan, layar: Layar): boolean {
  if (layar.jenis === 'pembuka') return true;
  if (layar.jenis === 'soal') {
    // Layar soal ke-n hanya bisa dicapai kalau semua soal sebelumnya terkunci.
    return keadaan.urutanSoal
      .slice(0, layar.nomor)
      .every((id) => keadaan.soal[id]?.dikunci === true);
  }
  // Pembukaan dan layar akhir sama-sama di balik ketiga soal (D-3).
  return semuaTerkunci(keadaan);
}

/**
 * Layar tujuan kalau perpindahan riwayat ini sah, atau `null` kalau tidak.
 *
 * **Satu sumber kebenaran untuk dua pemakai.** Reducer memakainya untuk
 * memutuskan, dan komponen memakainya untuk tahu kapan ia harus memperbaiki
 * entri riwayat sendiri (`replaceState`). Kalau keduanya memutuskan terpisah,
 * mereka akan berselisih — dan layar yang tidak sinkron dengan tumpukan riwayat
 * persis cacat C-1.
 */
export function tujuanRiwayat(keadaan: Keadaan, nama: string): Layar | null {
  const tujuan = layarDariNama(nama, keadaan.urutanSoal.length);
  if (tujuan === null) return null;
  const jumlahSoal = keadaan.urutanSoal.length;
  const ke = urutanLayar(tujuan, jumlahSoal);
  const kini = urutanLayar(keadaan.layar, jumlahSoal);
  // Mundur selalu sah; pemain jelas sudah pernah melewatinya.
  if (ke <= kini) return tujuan;
  return pernahSampai(keadaan, tujuan) ? tujuan : null;
}

/** Pengumpul peristiwa untuk satu pemanggilan reducer: menomori dan memberi cap waktu. */
class Catatan {
  private readonly keluar: Peristiwa[] = [];
  private readonly keadaan: Keadaan;
  private readonly waktu: number;
  private urut: number;

  // Ditulis panjang, bukan sebagai parameter property: `node
  // --experimental-strip-types` — yang dipakai seluruh skrip repo ini —
  // menolak parameter property, dan berkas ini harus bisa diimpor dari sana.
  constructor(keadaan: Keadaan, waktu: number, urut: number) {
    this.keadaan = keadaan;
    this.waktu = waktu;
    this.urut = urut;
  }

  tambah(nama: NamaPeristiwa, isi: Record<string, NilaiIsi> = {}): void {
    this.urut += 1;
    this.keluar.push({
      nama,
      sesi: this.keadaan.sesi,
      kasus_id: this.keadaan.kasus_id,
      t_ms: this.keadaan.mulaiPada === null ? 0 : this.waktu - this.keadaan.mulaiPada,
      urut: this.urut,
      isi,
    });
  }

  get hasil(): { peristiwa: Peristiwa[]; urut: number } {
    return { peristiwa: this.keluar, urut: this.urut };
  }
}

/**
 * Layar sebelum layar sekarang, atau `null` kalau sudah di layar pertama.
 * Urutannya sama dengan urutan maju: pembuka → soal → pembukaan → akhir.
 */
export function layarSebelumnya(keadaan: Keadaan): Layar | null {
  const layar = keadaan.layar;
  if (layar.jenis === 'pembuka') return null;
  if (layar.jenis === 'soal') {
    return layar.nomor === 0 ? { jenis: 'pembuka' } : { jenis: 'soal', nomor: layar.nomor - 1 };
  }
  if (layar.jenis === 'pembukaan') {
    const terakhir = keadaan.urutanSoal.length - 1;
    return terakhir < 0 ? { jenis: 'pembuka' } : { jenis: 'soal', nomor: terakhir };
  }
  return { jenis: 'pembukaan' };
}

/** Tidak terjadi apa-apa: keadaan utuh, nol peristiwa. */
function abaikan(keadaan: Keadaan): Hasil {
  return { keadaan, peristiwa: [] };
}

function ubahSoal(
  keadaan: Keadaan,
  soal_id: string,
  ubah: (s: KeadaanSoal) => KeadaanSoal,
): Keadaan {
  const lama = keadaan.soal[soal_id];
  if (lama === undefined) return keadaan;
  return { ...keadaan, soal: { ...keadaan.soal, [soal_id]: ubah(lama) } };
}

/** Kumpulkan waktu yang terpakai di layar yang sedang ditinggalkan. */
function tutupWaktuLayar(keadaan: Keadaan, waktu: number): Keadaan {
  const id = soalSekarang(keadaan);
  if (id === null) return keadaan;
  return ubahSoal(keadaan, id, (s) => ({
    ...s,
    msTerkumpul: s.masukPada === null ? s.msTerkumpul : s.msTerkumpul + (waktu - s.masukPada),
    masukPada: null,
  }));
}

/**
 * Kedalaman gulir layar yang sedang ditinggalkan (D-8), 0–1 dua desimal.
 *
 * Lahir di sini, bukan di pendengar gulir, supaya ia punya `urut` yang sama
 * deretnya dengan peristiwa lain dan tidak bisa datang dua kali.
 */
function catatGulirLayar(keadaan: Keadaan, catat: Catatan): void {
  catat.tambah('gulir', {
    layar: namaLayar(keadaan.layar),
    maks: Math.round(keadaan.gulirMaksPersen) / 100,
  });
}

/**
 * Ambang gulir yang dilaporkan begitu dilewati (M3.4a D-1), dalam persen.
 *
 * Urut naik; `catatAmbangGulir` bergantung pada urutan itu.
 */
export const AMBANG_GULIR = [50, 100] as const;

/**
 * `gulir` ambang: pertama kali 50 % dan pertama kali 100 % di tiap kunjungan
 * layar (M3.4a D-1).
 *
 * **Kenapa ada.** Sampai sekarang `gulir` hanya lahir saat meninggalkan layar,
 * jadi berkas peristiwa menjawab *seberapa jauh* tetapi tidak *kapan*. Satu sesi
 * ponsel alpha berada 18,6 menit di soal 1 tanpa satu ketukan pun, gulir 100 %,
 * lalu menutup — dan dari data itu "ia membaca semuanya lalu bingung harus apa"
 * tidak bisa dibedakan dari "ponselnya ditinggal". Dua `t_ms` tambahan per
 * kunjungan layar memisahkan keduanya.
 *
 * **Kenapa di reducer.** Supaya `urut`-nya satu deret dengan peristiwa lain dan
 * tidak bisa datang dua kali — alasan yang sama seperti `catatGulirLayar`.
 * Komponen tetap hanya melaporkan fakta gulir (`catat_gulir`), persis seperti
 * sebelumnya; tidak ada satu baris pun yang berubah di `Aplikasi.tsx`.
 *
 * **Layar yang muat satu jendela** tidak perlu perlakuan khusus di sini:
 * pelapor di komponen sudah menghitung `tinggi <= 0` sebagai 100 %, dan ia sudah
 * melapor sekali tiap ganti layar. Jadi kedua ambang lahir sendiri tepat sesudah
 * `layar_masuk`, dan "100 % pada detik 0" terbaca sebagai *tidak perlu
 * menggulir*, bukan sebagai membaca.
 *
 * Paling banyak dua peristiwa per kunjungan layar. Mereka tidak menggeser batas
 * `BATAS_KETUK`, yang hanya menghitung `ketuk`.
 */
function catatAmbangGulir(keadaan: Keadaan, catat: Catatan): Keadaan {
  let dilapor = keadaan.ambangGulirDilapor;
  for (const ambang of AMBANG_GULIR) {
    if (keadaan.gulirMaksPersen < ambang) break;
    if (dilapor >= ambang) continue;
    catat.tambah('gulir', { layar: namaLayar(keadaan.layar), maks: ambang / 100 });
    dilapor = ambang;
  }
  if (dilapor === keadaan.ambangGulirDilapor) return keadaan;
  return { ...keadaan, ambangGulirDilapor: dilapor };
}

/**
 * Catat masuk ke layar baru, termasuk cap waktu masuk kalau itu layar soal.
 *
 * `tinggalkan` hanya `false` pada aksi `mulai`, karena di sana belum ada layar
 * yang ditinggalkan.
 */
function masukLayar(
  keadaan: Keadaan,
  layar: Layar,
  waktu: number,
  catat: Catatan,
  tinggalkan = true,
): Keadaan {
  if (tinggalkan) catatGulirLayar(keadaan, catat);
  // Gulir dihitung per layar: yang sudah dilaporkan tidak ikut ke layar berikut.
  // Begitu juga lembar yang terbuka (A-2): tiap layar mulai dengan semuanya
  // tertutup, supaya pemain yang melihat balik soal lama tidak menemukan
  // halaman yang sudah terlanjur terbentang.
  let berikut: Keadaan = {
    ...keadaan,
    layar,
    gulirMaksPersen: 0,
    // Hitungan ambang mulai dari nol lagi: tiap KUNJUNGAN layar punya
    // "pertama kali 50 %" sendiri, termasuk kunjungan kedua ke soal yang sama.
    ambangGulirDilapor: 0,
    sumberTerbuka: [],
    istilahTerbuka: false,
  };
  if (layar.jenis === 'soal') {
    const id = berikut.urutanSoal[layar.nomor];
    if (id !== undefined) {
      berikut = ubahSoal(berikut, id, (s) => ({ ...s, masukPada: waktu }));
    }
  }
  if (layar.jenis === 'pembukaan') {
    berikut = { ...berikut, masukPembukaanPada: waktu };
  }
  catat.tambah('layar_masuk', { layar: namaLayar(layar) });
  return berikut;
}

/**
 * Kelima belas medan perangkat untuk peristiwa `mulai` (M3.8 D-1).
 *
 * Dibangun dari **daftar medan**, bukan dengan menyebar objek pemanggil: medan
 * yang tidak dikenal — misalnya `ua` yang terselip dari komponen — tidak punya
 * jalan ke peristiwa, dan medan yang tidak disebut tetap ada sebagai `null`.
 */
function isiPerangkat(perangkat: Perangkat | null): Record<string, NilaiIsi> {
  const isi: Record<string, NilaiIsi> = {};
  for (const medan of MEDAN_PERANGKAT) isi[medan] = perangkat?.[medan] ?? null;
  return isi;
}

/** Jaga-jaga terakhir untuk koordinat relatif: 0–1, tiga desimal (D-8). */
function rasioTiga(nilai: number): number {
  if (!Number.isFinite(nilai)) return 0;
  return Math.round(Math.min(1, Math.max(0, nilai)) * 1000) / 1000;
}

function potong(teks: string | null): string | null {
  if (teks === null) return null;
  return teks.length > MAKS_TEKS_AKHIR ? teks.slice(0, MAKS_TEKS_AKHIR) : teks;
}

/**
 * Satu langkah permainan.
 *
 * Aksi yang tidak sah **tidak** melahirkan peristiwa dan tidak mengubah keadaan:
 * mengunci tanpa memilih, mengubah pilihan sesudah dikunci, dan masuk layar
 * pembukaan sebelum tiga soal terkunci.
 */
export function langkah(keadaan: Keadaan, aksi: Aksi, waktu: number): Hasil {
  if (keadaan.tertutup) return abaikan(keadaan);
  if (aksi.jenis !== 'mulai' && keadaan.mulaiPada === null) return abaikan(keadaan);

  switch (aksi.jenis) {
    case 'mulai': {
      if (keadaan.mulaiPada !== null) return abaikan(keadaan);
      const dimulai: Keadaan = { ...keadaan, mulaiPada: waktu };
      const catat = new Catatan(dimulai, waktu, dimulai.urut);
      catat.tambah('mulai', {
        lebar_layar: aksi.lebar_layar,
        // Ketiganya selalu ada di muatan, walau nilainya null: pengumpul
        // memeriksa bentuk peristiwa, dan medan yang kadang hilang membuat
        // "tidak ada penanda" tidak bisa dibedakan dari "kiriman versi lama".
        penanda: aksi.penanda ?? null,
        pengunjung: aksi.pengunjung ?? null,
        kunjungan_ke: aksi.kunjungan_ke ?? null,
        ...isiPerangkat(aksi.perangkat ?? null),
      });
      const berikut = masukLayar(dimulai, { jenis: 'pembuka' }, waktu, catat, false);
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    /*
     * Pengamat di komponen hanya melaporkan "kartu masuk layar" dan "kartu
     * keluar layar" beserta waktunya. Seluruh penjumlahan terjadi di sini
     * (A1-T2) — komponen tidak boleh menghitung apa pun, karena yang bisa
     * dibuktikan tes hanyalah yang ada di reducer.
     */
    case 'kartu_masuk_layar': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      if (s.kartuTerlihatSejak !== null) return abaikan(keadaan);
      return {
        keadaan: ubahSoal(keadaan, aksi.soal_id, (lama) => ({
          ...lama,
          kartuTerlihatSejak: waktu,
          // Masuk lagi sesudah pernah keluar = pemain menggulir balik ke kartu.
          gulirBalik: lama.pernahKeluar ? lama.gulirBalik + 1 : lama.gulirBalik,
        })),
        peristiwa: [],
      };
    }

    case 'kartu_keluar_layar': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      if (s.kartuTerlihatSejak === null) return abaikan(keadaan);
      const sejak = s.kartuTerlihatSejak;
      return {
        keadaan: ubahSoal(keadaan, aksi.soal_id, (lama) => ({
          ...lama,
          msKartuTerlihat: lama.msKartuTerlihat + Math.max(0, waktu - sejak),
          kartuTerlihatSejak: null,
          pernahKeluar: true,
        })),
        peristiwa: [],
      };
    }

    case 'kembali_ke_kartu': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('kembali_ke_kartu', { soal_id: aksi.soal_id });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, urut }, peristiwa };
    }

    /*
     * Ketuk pertama membuka, ketuk kedua menutup, berapa kali pun (A-2).
     *
     * Peristiwa `kartu_buka` lahir **hanya saat membuka**, jadi hitungannya
     * tetap berarti "berapa kali sumber dibaca" dan bukan "berapa kali kaki
     * lembar disentuh". Ketukan menutup tidak hilang dari data: ia tetap
     * tercatat sebagai `ketuk` biasa lewat pelacak (D-8).
     */
    case 'sakelar_sumber': {
      const sudahTerbuka = keadaan.sumberTerbuka.includes(aksi.fact_id);
      const daftar = sudahTerbuka
        ? keadaan.sumberTerbuka.filter((f) => f !== aksi.fact_id)
        : [...keadaan.sumberTerbuka, aksi.fact_id];
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      let berikut: Keadaan = { ...keadaan, sumberTerbuka: daftar };
      if (!sudahTerbuka && aksi.soal_id !== null && keadaan.soal[aksi.soal_id] !== undefined) {
        catat.tambah('kartu_buka', { soal_id: aksi.soal_id, fact_id: aksi.fact_id });
        berikut = ubahSoal(berikut, aksi.soal_id, (lama) => ({
          ...lama,
          kartuDibuka: lama.kartuDibuka + 1,
        }));
      }
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'sakelar_istilah': {
      if (keadaan.soal[aksi.soal_id] === undefined) return abaikan(keadaan);
      const sudahTerbuka = keadaan.istilahTerbuka;
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      if (!sudahTerbuka) catat.tambah('istilah_buka', { soal_id: aksi.soal_id });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, istilahTerbuka: !sudahTerbuka, urut }, peristiwa };
    }

    /*
     * Balon chat melayang berpindah keadaan (M3.7 D-2).
     *
     * Dua penjaga, dan keduanya soal kejujuran data:
     *
     * - Keadaan yang tidak berubah tidak melahirkan peristiwa. Tarikan jari
     *   yang jatuh kembali ke tempat semula memang terjadi, tetapi ia bukan
     *   "pemain menurunkan balon"; mencatatnya akan membuat setiap goyangan
     *   terbaca sebagai pemakaian.
     * - Sesudah `BATAS_BALON`, keadaannya tetap berubah — balonnya harus tetap
     *   bergerak di bawah jari — tetapi pencatatannya berhenti. Diam, tanpa
     *   peristiwa penanda: daftar nama peristiwa milestone ini hanya boleh
     *   bertambah satu, dan satu-satunya yang boleh lahir adalah `balon`.
     */
    case 'sakelar_balon': {
      if (keadaanBalon(keadaan, aksi.layar) === aksi.keadaan) return abaikan(keadaan);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      let berikut: Keadaan = {
        ...keadaan,
        balon: { ...keadaan.balon, [aksi.layar]: aksi.keadaan },
      };
      if (keadaan.balonDicatat < BATAS_BALON) {
        catat.tambah('balon', {
          layar: aksi.layar,
          keadaan: aksi.keadaan,
          cara: aksi.cara,
        });
        berikut = { ...berikut, balonDicatat: keadaan.balonDicatat + 1 };
      }
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    /*
     * Salinan melayang muncul atau menghilang (M3.7 D-1). Fakta tampilan:
     * tidak ada peristiwa, sama seperti `opsi_terlihat`. Yang menghilang
     * kembali mengintip — patokan v3d melepas kelas `turun` begitu salinannya
     * tidak aktif, dan tanpa itu balon yang pernah diturunkan akan muncul
     * kembali sudah terbentang, menutupi bacaan yang justru sedang dibuka.
     */
    case 'balon_melayang': {
      if (balonMelayang(keadaan, aksi.layar) === aksi.melayang) return abaikan(keadaan);
      const balon = aksi.melayang
        ? keadaan.balon
        : { ...keadaan.balon, [aksi.layar]: 'intip' as KeadaanBalon };
      return {
        keadaan: {
          ...keadaan,
          balon,
          balonMelayang: { ...keadaan.balonMelayang, [aksi.layar]: aksi.melayang },
        },
        peristiwa: [],
      };
    }

    case 'pilih': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      // Sesudah dikunci, pilihan beku (D-3).
      if (s.dikunci) return abaikan(keadaan);
      if (s.kunci === aksi.kunci) return abaikan(keadaan);
      const ganti = s.kunci === null ? 0 : s.ganti + 1;
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('pilih', { soal_id: aksi.soal_id, kunci: aksi.kunci, ganti_ke: ganti });
      const berikut = ubahSoal(keadaan, aksi.soal_id, (lama) => ({
        ...lama,
        kunci: aksi.kunci,
        ganti,
      }));
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'kunci_jawaban': {
      const s = keadaan.soal[aksi.soal_id];
      if (s === undefined) return abaikan(keadaan);
      // Mengunci tanpa memilih ditolak; tombolnya juga nonaktif di UI.
      if (s.kunci === null) return abaikan(keadaan);
      if (s.dikunci) return abaikan(keadaan);
      const benar = keadaan.kunciBenar[aksi.soal_id] === s.kunci;
      const msDiSoal =
        s.msTerkumpul + (s.masukPada === null ? 0 : waktu - s.masukPada);
      /*
       * Lama kartu benar-benar berada di layar sebelum jawaban dikunci — bukan
       * berapa kali kartu "dibuka". Kartu tampil terbuka sejak awal, jadi
       * hitungan buka-ulang tidak pernah mengukur apakah pemain membacanya
       * (F-1, kesalahan D-6 versi pertama).
       */
      const msKartu =
        s.msKartuTerlihat +
        (s.kartuTerlihatSejak === null ? 0 : Math.max(0, waktu - s.kartuTerlihatSejak));
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('kunci_jawaban', {
        soal_id: aksi.soal_id,
        kunci: s.kunci,
        benar,
        ms_di_soal: msDiSoal,
        ms_kartu_terlihat_sebelum: msKartu,
        gulir_balik_ke_kartu: s.gulirBalik,
      });
      const berikut = ubahSoal(keadaan, aksi.soal_id, (lama) => ({
        ...lama,
        dikunci: true,
        benar,
        // Dibekukan: apa pun yang terjadi sesudah penguncian tidak boleh
        // mengubah angka yang sudah dilaporkan.
        msKartuTerlihatSaatKunci: msKartu,
        gulirBalikSaatKunci: lama.gulirBalik,
      }));
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'lanjut': {
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      if (keadaan.layar.jenis === 'pembuka') {
        const berikut = masukLayar(keadaan, { jenis: 'soal', nomor: 0 }, waktu, catat);
        const { peristiwa, urut } = catat.hasil;
        return { keadaan: { ...berikut, urut }, peristiwa };
      }
      if (keadaan.layar.jenis === 'soal') {
        const id = soalSekarang(keadaan);
        if (id === null || keadaan.soal[id]?.dikunci !== true) return abaikan(keadaan);
        const nomorBerikut = keadaan.layar.nomor + 1;
        const ditutup = tutupWaktuLayar(keadaan, waktu);
        if (nomorBerikut < keadaan.urutanSoal.length) {
          const berikut = masukLayar(ditutup, { jenis: 'soal', nomor: nomorBerikut }, waktu, catat);
          const { peristiwa, urut } = catat.hasil;
          return { keadaan: { ...berikut, urut }, peristiwa };
        }
        // Layar pembukaan tidak bisa dicapai sebelum semua soal terkunci (D-3).
        if (!semuaTerkunci(ditutup)) return abaikan(keadaan);
        catat.tambah('pembukaan_masuk');
        const berikut = masukLayar(ditutup, { jenis: 'pembukaan' }, waktu, catat);
        const { peristiwa, urut } = catat.hasil;
        return { keadaan: { ...berikut, urut }, peristiwa };
      }
      if (keadaan.layar.jenis === 'pembukaan') {
        catat.tambah('pembukaan_selesai', {
          ms_di_pembukaan:
            keadaan.masukPembukaanPada === null ? 0 : waktu - keadaan.masukPembukaanPada,
          gulir_maks_persen: keadaan.gulirMaksPersen,
        });
        const berikut = masukLayar(keadaan, { jenis: 'akhir' }, waktu, catat);
        const { peristiwa, urut } = catat.hasil;
        return { keadaan: { ...berikut, urut }, peristiwa };
      }
      return abaikan(keadaan);
    }

    case 'lihat_balik': {
      // Hanya soal yang sudah dikunci yang boleh dilihat lagi, dan hanya dari
      // layar yang bukan soal itu sendiri.
      const tujuanId = keadaan.urutanSoal[aksi.nomor];
      if (tujuanId === undefined) return abaikan(keadaan);
      if (keadaan.soal[tujuanId]?.dikunci !== true) return abaikan(keadaan);
      if (keadaan.layar.jenis === 'soal' && keadaan.layar.nomor === aksi.nomor) {
        return abaikan(keadaan);
      }
      const tujuan: Layar = { jenis: 'soal', nomor: aksi.nomor };
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('lihat_balik', {
        dari_layar: namaLayar(keadaan.layar),
        ke_layar: namaLayar(tujuan),
      });
      const berikut = masukLayar(tutupWaktuLayar(keadaan, waktu), tujuan, waktu, catat);
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    /*
     * Jalan pintas ke ringkasan di layar pembukaan (A4-T5). Guliran itu sendiri
     * dikerjakan komponen — reducer tidak menyentuh DOM — tetapi peristiwanya
     * lahir di sini, seperti semua peristiwa lain. Layarnya tidak berubah:
     * pemain masih di layar yang sama, hanya di bagian lain halamannya.
     */
    case 'loncat_ke_ringkasan': {
      if (keadaan.layar.jenis !== 'pembukaan') return abaikan(keadaan);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('loncat_ke_ringkasan', {
        ms_di_pembukaan:
          keadaan.masukPembukaanPada === null ? 0 : waktu - keadaan.masukPembukaanPada,
        gulir_maks_persen: keadaan.gulirMaksPersen,
      });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, urut }, peristiwa };
    }

    /*
     * Tombol kembali DAN tombol maju peramban/Android (A1-T7, diperbaiki A1-T2).
     *
     * Versi lama menganggap setiap `popstate` sebagai mundur. Tombol maju
     * menyalakan peristiwa yang sama, jadi dari layar pertama aksinya diabaikan
     * diam-diam: penunjuk riwayat peramban maju sementara layarnya diam, dan
     * sejak itu keduanya tidak sinkron — kembali pun berhenti bekerja dan
     * pemain terjebak (cacat C-1).
     *
     * Sekarang yang dibaca adalah **tujuannya**, dari `history.state.layar`.
     * Mundur berperilaku persis seperti dulu dan melahirkan peristiwa yang
     * persis sama (`lihat_balik`, `gulir`, `layar_masuk`). Maju hanya sah ke
     * layar yang memang pernah dicapai, tidak mengubah satu pun jawaban, dan
     * melahirkan **hanya** `layar_masuk` — tidak ada nama peristiwa baru, karena
     * D-6 adalah daftar tertutup dan pengumpul di server sungguhan
     * memvalidasinya.
     */
    case 'riwayat_ke': {
      const tujuan = tujuanRiwayat(keadaan, aksi.nama);
      if (tujuan === null) return abaikan(keadaan);
      const jumlahSoal = keadaan.urutanSoal.length;
      const ke = urutanLayar(tujuan, jumlahSoal);
      const kini = urutanLayar(keadaan.layar, jumlahSoal);
      if (ke === kini) return abaikan(keadaan);

      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      const ditutup = tutupWaktuLayar(keadaan, waktu);
      if (ke < kini) {
        catat.tambah('lihat_balik', {
          dari_layar: namaLayar(keadaan.layar),
          ke_layar: namaLayar(tujuan),
        });
        const berikut = masukLayar(ditutup, tujuan, waktu, catat);
        const { peristiwa, urut } = catat.hasil;
        return { keadaan: { ...berikut, urut }, peristiwa };
      }
      // Maju: `tinggalkan: false`, jadi tidak ada `gulir` — hanya `layar_masuk`.
      const berikut = masukLayar(ditutup, tujuan, waktu, catat, false);
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    /*
     * Fakta tampilan, bukan gerakan pemain: tidak melahirkan peristiwa apa pun
     * (D-6 adalah daftar tertutup dan tidak punya nama untuk ini). Ia hanya
     * mengubah keadaan supaya `bilahBawah()` bisa memutuskannya.
     */
    case 'opsi_terlihat': {
      const lama = keadaan.soal[aksi.soal_id];
      if (lama === undefined || lama.opsiTerlihat === aksi.terlihat) return abaikan(keadaan);
      return {
        keadaan: ubahSoal(keadaan, aksi.soal_id, (s) => ({ ...s, opsiTerlihat: aksi.terlihat })),
        peristiwa: [],
      };
    }

    /*
     * Ketukan (D-8). Ia **tidak mengubah keadaan permainan** — tidak ada
     * pilihan yang berpindah, tidak ada layar yang berganti — tetapi tetap
     * lewat sini supaya `urut`-nya satu deret dengan peristiwa lain dan
     * `kirim.ts` hanya punya satu pintu masuk.
     *
     * Yang dicatat hanya lima hal, dan kelimanya sudah ditentukan bentuknya di
     * sini: layar, nama `uid` yang kita tulis sendiri di markup, posisi relatif
     * terhadap viewport, dan apakah sasarannya bisa diketuk. Tidak ada teks
     * pemain, tidak ada isi elemen, tidak ada koordinat mutlak.
     */
    case 'ketuk': {
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      if (keadaan.ketukan >= BATAS_KETUK) {
        if (keadaan.ketukDibatasi) return abaikan(keadaan);
        catat.tambah('ketuk_dibatasi', {
          layar: namaLayar(keadaan.layar),
          batas: BATAS_KETUK,
        });
        const { peristiwa, urut } = catat.hasil;
        return { keadaan: { ...keadaan, ketukDibatasi: true, urut }, peristiwa };
      }
      catat.tambah('ketuk', {
        layar: namaLayar(keadaan.layar),
        uid: aksi.uid === null ? null : aksi.uid.slice(0, MAKS_UID),
        x: rasioTiga(aksi.x),
        y: rasioTiga(aksi.y),
        mati: aksi.mati,
      });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, ketukan: keadaan.ketukan + 1, urut }, peristiwa };
    }

    case 'catat_gulir': {
      const persen = Math.max(0, Math.min(100, Math.round(aksi.persen)));
      // Gulir yang tidak lebih jauh dari yang sudah tercatat tidak bisa
      // melewati ambang mana pun, jadi ia tetap berhenti di sini.
      if (persen <= keadaan.gulirMaksPersen) return abaikan(keadaan);
      const naik: Keadaan = { ...keadaan, gulirMaksPersen: persen };
      const catat = new Catatan(naik, waktu, naik.urut);
      const berikut = catatAmbangGulir(naik, catat);
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...berikut, urut }, peristiwa };
    }

    case 'minat_kasus_lain': {
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('minat_kasus_lain');
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, minatDitekan: true, urut }, peristiwa };
    }

    case 'isi_akhir': {
      if (keadaan.akhirTerkirim) return abaikan(keadaan);
      const akhir: JawabanAkhir = { ...keadaan.akhir };
      if (aksi.medan === 'rating') {
        akhir.rating = typeof aksi.nilai === 'number' ? aksi.nilai : null;
      } else if (aksi.medan === 'teks') {
        akhir.teks = potong(typeof aksi.nilai === 'string' ? aksi.nilai : null);
      } else {
        akhir[aksi.medan] = typeof aksi.nilai === 'string' ? aksi.nilai : null;
      }
      return { keadaan: { ...keadaan, akhir }, peristiwa: [] };
    }

    case 'kirim_akhir': {
      if (keadaan.akhirTerkirim) return abaikan(keadaan);
      if (keadaan.layar.jenis !== 'akhir') return abaikan(keadaan);
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      catat.tambah('akhir_kirim', {
        rating: keadaan.akhir.rating,
        terasa: keadaan.akhir.terasa,
        sumber_jawaban: keadaan.akhir.sumber_jawaban,
        teks: potong(keadaan.akhir.teks),
      });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, akhirTerkirim: true, urut }, peristiwa };
    }

    case 'tutup': {
      const catat = new Catatan(keadaan, waktu, keadaan.urut);
      // Layar terakhir juga punya kedalaman gulir, dan justru layar tempat
      // orang berhenti yang paling ingin diketahui pemilik.
      catatGulirLayar(keadaan, catat);
      catat.tambah('tutup', { layar_terakhir: namaLayar(keadaan.layar) });
      const { peristiwa, urut } = catat.hasil;
      return { keadaan: { ...keadaan, tertutup: true, urut }, peristiwa };
    }

    default:
      return abaikan(keadaan);
  }
}

