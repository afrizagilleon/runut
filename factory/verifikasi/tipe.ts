import type { KodeAturan, Temuan } from '../skema/tipe.ts';

export type JenisTransaksi = 'beli' | 'jual';

export interface Transaksi {
  tanggal: string;
  jenis: JenisTransaksi;
  harga: number;
  jumlah: number;
  /**
   * Medan `price` butir ini kosong di data mentah, dan `harga` di atas adalah
   * penggantinya (0), bukan harga sungguhan.
   *
   * Bedanya penting: medan agregat `price` satu laporan adalah rata-rata
   * tertimbang yang menghitung harga kosong **sebagai Rp0** (terbukti pada 184
   * dari 184 laporan), sehingga satu harga hilang mengempeskan seluruh
   * laporan. Butir bertanda ini tidak boleh dihitung merah; ia `TIDAK_LENGKAP`.
   */
  harga_kosong?: boolean;
}

/** Satu laporan keterbukaan informasi pemegang saham tertentu, sudah dinormalkan. */
export interface Laporan {
  laporan_id: string;
  simbol: string;
  pemegang: string;
  /** Tanggal dan waktu laporan terbit (ISO). Inilah penentu ketersediaan (R4). */
  dilaporkan_pada: string;
  jenis: JenisTransaksi;
  jumlah: number;
  harga: number;
  sebelum: number;
  sesudah: number;
  persen_sebelum: number;
  persen_sesudah: number;
  transaksi: Transaksi[];
  /** Teks ringkas laporan, dipakai R9 untuk mengadu teks dengan field. */
  teks: string;
  berkas: string;
  /**
   * Nilai `source` apa adanya (alamat PDF). R12 membaca tanggal terbit dari
   * pola `LK-DDMMYYYY-` di dalamnya. Opsional: pemuat lama tidak mengisinya,
   * dan aturan yang membutuhkannya melaporkan `TIDAK_LENGKAP`, bukan merah.
   */
  sumber_dokumen?: string;
  /**
   * `transaction_type` apa adanya: `buy`, `sell`, atau `others`. `jenis` sudah
   * memetakan apa pun yang bukan `buy` menjadi `jual`, sehingga `others` tidak
   * bisa dibedakan lagi dari `sell` - R15 membutuhkan bedanya.
   */
  jenis_mentah?: string;
  /** Berkas cache asal laporan ini. */
  berkas_cache?: string;
}

export interface BarisHarga {
  tanggal: string;
  buka: number;
  tertinggi: number;
  terendah: number;
  tutup: number;
  volume: number;
  nilai_pasar: number;
  /**
   * Medan `open` kosong di data mentah. 16 baris harga di gudang begini, 7 di
   * antaranya juga `high` = 0 dan `low` = 0; satu baris seperti itu di dalam
   * sebuah jendela membuat `min(low)` = 0 dan aturan harga tidak bisa berbunyi
   * lagi. Baris bertanda ini dibuang lebih dulu oleh aturan rentang harga.
   */
  buka_kosong?: boolean;
}

export interface Suspensi {
  tanggal: string;
  alasan: string;
}

/** Saldo kepemilikan dari sumber kedua, untuk R5. */
export interface Potret {
  sumber: string;
  pada: string;
  lembar: number;
}

/**
 * Satu titik jumlah saham beredar **beserta tanggal berlakunya** (M2a D-3).
 *
 * Jumlah saham beredar bukan tetapan: ia berubah karena rights issue, private
 * placement, saham bonus, dan pembelian kembali. Memakai satu angka tanpa
 * tanggal adalah cara R7 menolak 22 dari 22 sisi laporan COCO.
 */
export interface TitikSahamBeredar {
  lembar: number;
  /** Tanggal berlakunya titik ini (ISO). */
  pada: string;
  /** Dari mana angkanya, misalnya "nilai pasar / harga tutup 2025-09-30". */
  sumber: string;
}

export interface KonteksVerifikasi {
  simbol: string;
  laporan: Laporan[];
  harga: BarisHarga[];
  suspensi: Suspensi[];
  /** Satu angka tanpa tanggal; dipakai jalur V1 (R3, R7 lama) apa adanya. */
  saham_beredar: number | null;
  /**
   * D-3: jumlah saham beredar pada satu tanggal, atau `null` kalau tidak ada
   * titik yang cukup dekat. Aturan V2 yang butuh penyebut memakai ini, dan
   * `null` berarti `TIDAK_LENGKAP` — bukan merah.
   */
  sahamBeredarPada?: (tanggal: string) => TitikSahamBeredar | null;
  potret: Potret | null;
  /** Tanda repo per laporan_id; hanya ada kalau PDF-nya sudah diurai. */
  tanda_repo: Record<string, boolean>;
}

/**
 * Hitungan wajib tiap aturan (INV-B).
 *
 * "Nol merah" tanpa "diperiksa" tidak sah: pernah ditulis "0 merah dari 296"
 * untuk aturan yang sebenarnya hanya memeriksa 18 baris. Karena tiap aturan
 * memeriksa benda yang berbeda, `satuan` menyebut benda apa yang dihitung —
 * "laporan", "sisi laporan", "baris harga", "sambungan", dan seterusnya.
 *
 * Invarian: `diperiksa = hijau + merah + tidak_lengkap`. `dilewati` dihitung
 * di luar `diperiksa` karena unit yang dilewati memang tidak diperiksa.
 */
export interface HitunganAturan {
  /** Benda yang dihitung, tunggal, huruf kecil. */
  satuan: string;
  diperiksa: number;
  hijau: number;
  merah: number;
  tidak_lengkap: number;
  dilewati: number;
  /** Alasan unit dilewati, unik dan terurut supaya keluaran deterministik (INV-C). */
  alasan_dilewati: string[];
}

export function hitunganKosong(satuan: string): HitunganAturan {
  return {
    satuan,
    diperiksa: 0,
    hijau: 0,
    merah: 0,
    tidak_lengkap: 0,
    dilewati: 0,
    alasan_dilewati: [],
  };
}

export interface HasilAturan {
  aturan: KodeAturan;
  judul: string;
  dijalankan: boolean;
  /** Alasan aturan tidak bisa dijalankan; `null` kalau dijalankan. */
  alasan_lewat: string | null;
  temuan: Temuan[];
  /** INV-B: berapa yang sungguh diperiksa, bukan hanya berapa yang merah. */
  hitungan: HitunganAturan;
}

// --- bentuk data gudang (M2a D-2) -------------------------------------------

/** Blok `pagination` satu respons berpaginasi, apa adanya. */
export interface Paginasi {
  total_count: number;
  showing: number;
  limit: number;
  offset: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * Satu berkas respons laporan kepemilikan beserta paginasinya.
 *
 * `simbol` bisa `null`: respons `/v2/filings/` yang kosong berbentuk
 * `{"results": [], "pagination": {…}}` dan **tidak memuat simbolnya sama
 * sekali** — dua berkas kosong dari emiten berbeda identik byte per byte.
 * Itulah sebab R25 melaporkan `TIDAK_LENGKAP` alih-alih menebak dari nama
 * berkas, yang bukan data.
 */
export interface BerkasLaporan {
  berkas: string;
  simbol: string | null;
  paginasi: Paginasi;
  /** Jumlah baris di `results` berkas ini, sebelum rangkap dibuang. */
  baris: number;
}

export interface StockSplit {
  tanggal: string;
  rasio: number;
  sumber: string;
}

export interface RightIssue {
  ex_date: string;
  rasio_lama: number | null;
  rasio_baru: number | null;
  sumber: string;
  /** Harga pelaksanaan penerbitan saham baru; `null` kalau medannya kosong. */
  harga?: number | null;
}

export interface SahamBonus {
  ex_date: string;
  sumber: string;
  rasio_lama?: number | null;
  rasio_baru?: number | null;
}

export interface Dividen {
  ex_date: string;
  tanggal_bayar: string | null;
  nilai_per_lembar: number;
  /** `dividend_yield` apa adanya; `null` kalau medannya kosong. */
  imbal_hasil?: number | null;
}

/**
 * Satu rapat umum pemegang saham.
 *
 * `ringkasan` boleh `null`: `agm_result` hampir selalu kosong (uji lawan §R23:
 * 115 RUPS, 17 terisi). RUPS tanpa hasil **tetap dimuat**, karena aturan yang
 * membaca teks keputusan harus bisa melaporkan berapa RUPS yang tidak punya
 * teks sama sekali — kalau tidak, "2 merah dari 2" terbaca seperti seluruh
 * RUPS sudah diperiksa.
 */
export interface HasilRups {
  tanggal: string;
  ringkasan: string | null;
}

/**
 * Satu tahun buku dari `financials.historical_financials`.
 *
 * Tiap medan boleh `null`: sebagian besar medan kosong untuk sebagian besar
 * tahun, dan aturan yang membutuhkannya menjawab `TIDAK_LENGKAP`, bukan merah.
 */
export interface KeuanganTahunan {
  tahun: number;
  laba: number | null;
  pendapatan: number | null;
  ekuitas: number | null;
  aset: number | null;
  laba_kotor: number | null;
  lembar: number | null;
}

/** `financials.historical_eps[tahun].eps` — laba per lembar satu tahun buku. */
export interface EpsTahunan {
  tahun: number;
  eps: number;
}

/**
 * Satu medan rasio siap pakai di `financials.historical_financial_ratio`,
 * apa adanya: `kelompok` adalah nama obyek pembungkusnya (`profitability`,
 * `leverage`, …), `nama` adalah nama medannya (`roe`, `current_ratio`, …).
 */
export interface RasioSiapPakai {
  tahun: number;
  kelompok: string;
  nama: string;
  nilai: number;
}

/** Satu nilai `overview.all_time_price`, misalnya `52_w_low` pada satu tanggal. */
export interface NilaiEkstrem {
  label: string;
  tanggal: string;
  nilai: number;
}

export interface PotretPemegang {
  nama: string;
  lembar: number;
}

/**
 * Konteks verifikasi untuk satu emiten di gudang: konteks biasa ditambah data
 * mentah yang hanya dibutuhkan aturan M2a (paginasi, aksi korporasi, ringkasan
 * pasar, potret pemegang).
 */
export interface KonteksGudang extends KonteksVerifikasi {
  data: DataEmiten;
  /**
   * Berkas respons berpaginasi kosong di seluruh gudang. Berkas seperti itu
   * tidak memuat simbolnya, jadi ia tidak bisa dialamatkan ke emiten mana pun
   * - dan itulah yang membuat bukti negatif ("emiten ini tidak punya laporan")
   * tidak sah tanpa parameter permintaan.
   */
  berkas_kosong: string[];
}

/** Semua data satu emiten yang terbaca dari gudang. */
export interface DataEmiten {
  simbol: string;
  laporan: Laporan[];
  harga: BarisHarga[];
  suspensi: Suspensi[];
  berkas_laporan: BerkasLaporan[];
  stock_split: StockSplit[];
  right_issue: RightIssue[];
  bonus: SahamBonus[];
  dividen: Dividen[];
  rups: HasilRups[];
  all_time_price: NilaiEkstrem[];
  pemegang: PotretPemegang[];
  /** `outstanding_shares` per tahun buku dari `financials`. */
  saham_tahunan: Array<{ tahun: number; lembar: number }>;
  /** Seluruh baris `historical_financials`, bukan hanya jumlah sahamnya (M2b D-3). */
  keuangan_tahunan: KeuanganTahunan[];
  /** `historical_eps` per tahun buku (M2b D-3). */
  eps_tahunan: EpsTahunan[];
  /** Medan rasio siap pakai per tahun buku (M2b D-3), untuk R27. */
  rasio: RasioSiapPakai[];
  /** Nilai pasar dan harga tutup terakhir dari `overview`, dengan tanggalnya. */
  ringkasan_pasar: { nilai_pasar: number; harga_tutup: number; pada: string } | null;
  /** Nama berkas cache yang menyumbang data emiten ini, terurut. */
  berkas: string[];
  /**
   * Bukan data Sectors: daftar aturan beku kasus tayang (M4b D-1). Hanya diisi
   * pembangun kasus tayang (`factory/bangun-kasus.ts`) dari
   * `docs/bukti/aturan-beku-kasus.json`. Ditaruh di data, bukan di argumen,
   * karena `bangunKasusUmum` meneruskan data ini ke `verifikasiV2` tanpa
   * argumen lain; `dataSampai` menyalinnya apa adanya. Tidak ada → seluruh
   * `ATURAN_V2` dijalankan (kasus baru, `verifikasi:gudang`, audit).
   */
  aturan_beku?: readonly KodeAturan[];
}
