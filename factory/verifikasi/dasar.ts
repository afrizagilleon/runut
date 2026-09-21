/**
 * Perkakas bersama semua aturan verifikasi: pembungkus hasil, hitungan INV-B,
 * pemformat angka, dan pengurut laporan.
 *
 * Dipisahkan supaya aturan generasi pertama (`aturan.ts`) dan aturan M2a
 * (`aturan-v2.ts`) memakai bentuk hitungan yang **sama persis** — kalau tidak,
 * dua himpunan aturan akan melaporkan "diperiksa" dengan arti yang berbeda.
 */
import type { KodeAturan, Temuan } from '../skema/tipe.ts';
import { angkaId } from '../format.ts';
import type { HasilAturan, HitunganAturan, Laporan } from './tipe.ts';
import { hitunganKosong } from './tipe.ts';

/** Pemformat sendiri, bukan `toLocaleString`: keluaran harus sama di setiap mesin. */
export const angka = (nilai: number): string => angkaId(nilai);

export function urut(laporan: Laporan[]): Laporan[] {
  return [...laporan].sort((a, b) => {
    const selisih = a.dilaporkan_pada.localeCompare(b.dilaporkan_pada);
    return selisih !== 0 ? selisih : a.laporan_id.localeCompare(b.laporan_id);
  });
}

export interface BagianHitungan {
  diperiksa: number;
  merah: number;
  tidak_lengkap?: number;
  dilewati?: number;
  alasan_dilewati?: string[];
}

/**
 * Bangun hitungan INV-B dari jumlah unit yang disapu.
 * `hijau` selalu sisa, supaya `diperiksa = hijau + merah + tidak_lengkap`
 * tidak pernah bisa meleset karena salah ketik.
 */
export function hitung(satuan: string, bagian: BagianHitungan): HitunganAturan {
  const tidak_lengkap = bagian.tidak_lengkap ?? 0;
  return {
    satuan,
    diperiksa: bagian.diperiksa,
    hijau: bagian.diperiksa - bagian.merah - tidak_lengkap,
    merah: bagian.merah,
    tidak_lengkap,
    dilewati: bagian.dilewati ?? 0,
    alasan_dilewati: [...new Set(bagian.alasan_dilewati ?? [])].sort(),
  };
}

export function hasil(
  aturan: KodeAturan,
  judul: string,
  temuan: Temuan[],
  hitungan: HitunganAturan,
): HasilAturan {
  return { aturan, judul, dijalankan: true, alasan_lewat: null, temuan, hitungan };
}

export function lewat(
  aturan: KodeAturan,
  judul: string,
  alasan: string,
  satuan: string,
  dilewati = 0,
): HasilAturan {
  const hitungan = hitunganKosong(satuan);
  hitungan.dilewati = dilewati;
  hitungan.alasan_dilewati = [alasan];
  return { aturan, judul, dijalankan: false, alasan_lewat: alasan, temuan: [], hitungan };
}
