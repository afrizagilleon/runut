import type { KodeAturan, Temuan } from '../skema/tipe.ts';

export type JenisTransaksi = 'beli' | 'jual';

export interface Transaksi {
  tanggal: string;
  jenis: JenisTransaksi;
  harga: number;
  jumlah: number;
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
}

export interface BarisHarga {
  tanggal: string;
  buka: number;
  tertinggi: number;
  terendah: number;
  tutup: number;
  volume: number;
  nilai_pasar: number;
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

export interface KonteksVerifikasi {
  simbol: string;
  laporan: Laporan[];
  harga: BarisHarga[];
  suspensi: Suspensi[];
  saham_beredar: number | null;
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
