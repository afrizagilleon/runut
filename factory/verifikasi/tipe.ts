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

export interface HasilAturan {
  aturan: KodeAturan;
  judul: string;
  dijalankan: boolean;
  /** Alasan aturan tidak bisa dijalankan; `null` kalau dijalankan. */
  alasan_lewat: string | null;
  temuan: Temuan[];
}
