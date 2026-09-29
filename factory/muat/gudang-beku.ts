/**
 * Gudang beku untuk kasus tayang (M4a Amandemen A-1).
 *
 * Kasus yang sedang dimainkan dibangun dari `.cache/sectors/`. Kalau
 * pembangunnya membaca "semua yang ada di folder", menambah data untuk audit
 * menggeser kasus tayang tanpa ada yang menyentuh kasusnya — itu yang terjadi
 * sesudah M4a menambah 261 berkas: temuan R25 ULTJ menghitung respons kosong
 * seluruh gudang, 3 → 21.
 *
 * Karena itu kasus tayang, dan tes yang mengunci angka dari gudang sungguhan,
 * hanya membaca 111 berkas yang dibekukan di `docs/bukti/gudang-beku-kasus.json`
 * (nama + sha256, dari manifest commit `aec0105`). Satu berkas hilang atau
 * berbeda satu byte → `GudangBekuRusak` yang menyebut nama berkasnya.
 *
 * `npm run verifikasi:gudang` dan audit tetap membaca gudang penuh.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOLDER_GUDANG, muatGudang, type Gudang } from './gudang.ts';
import { GudangBekuRusak, sha256, type BerkasBeku } from './sidik.ts';

export { GudangBekuRusak, type BerkasBeku } from './sidik.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

export const JALUR_DAFTAR_BEKU = join(AKAR, 'docs', 'bukti', 'gudang-beku-kasus.json');

export interface DaftarBeku {
  keterangan: string;
  sumber: { commit: string; berkas: string };
  jumlah_berkas: number;
  berkas: BerkasBeku[];
}

export function bacaDaftarBeku(jalur: string = JALUR_DAFTAR_BEKU): DaftarBeku {
  const d = JSON.parse(readFileSync(jalur, 'utf8')) as DaftarBeku;
  if (!Array.isArray(d.berkas) || d.berkas.length !== d.jumlah_berkas) {
    throw new Error(`Daftar gudang beku rusak: ${jalur} (jumlah_berkas tidak sama dengan panjang daftar).`);
  }
  return d;
}

/**
 * Periksa seluruh daftar sekaligus dan laporkan SEMUA berkas yang bermasalah,
 * bukan hanya yang pertama. Tidak mengembalikan apa pun; lempar bila rusak.
 */
export function periksaGudangBeku(folder: string = FOLDER_GUDANG, daftar: DaftarBeku = bacaDaftarBeku()): void {
  const masalah: Array<{ nama: string; sebab: string }> = [];
  for (const b of daftar.berkas) {
    const jalur = join(folder, b.nama);
    if (!existsSync(jalur)) {
      masalah.push({ nama: b.nama, sebab: 'berkas hilang' });
      continue;
    }
    const sidik = sha256(readFileSync(jalur));
    if (sidik !== b.sha256) {
      masalah.push({ nama: b.nama, sebab: `sha256 ${sidik.slice(0, 12)}… ≠ beku ${b.sha256.slice(0, 12)}…` });
    }
  }
  if (masalah.length > 0) throw new GudangBekuRusak(masalah);
}

/** Muat gudang dari 111 berkas beku saja, dengan sidik diperiksa saat membaca. */
export function muatGudangBeku(folder: string = FOLDER_GUDANG, daftar: DaftarBeku = bacaDaftarBeku()): Gudang {
  return muatGudang(folder, { izin: daftar.berkas });
}

/**
 * Salin berkas beku yang sudah terverifikasi ke `tujuan` dan kembalikan
 * foldernya. Untuk kode yang hanya menerima folder (mis. `susunLaporanGudang`)
 * dan tidak boleh diubah; tes memakainya supaya angka yang dikunci tetap
 * dihitung atas gudang beku.
 */
export function salinGudangBeku(
  tujuan: string,
  folder: string = FOLDER_GUDANG,
  daftar: DaftarBeku = bacaDaftarBeku(),
): string {
  periksaGudangBeku(folder, daftar);
  mkdirSync(tujuan, { recursive: true });
  for (const b of daftar.berkas) copyFileSync(join(folder, b.nama), join(tujuan, b.nama));
  periksaGudangBeku(tujuan, daftar);
  return tujuan;
}
