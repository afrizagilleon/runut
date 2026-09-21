/**
 * `globalSetup` rangkaian e2e (M3.3 D-2).
 *
 * Satu tugas: membuang jejak putaran sebelumnya. Tanpa ini,
 * `bacaPeristiwa()` bisa menemukan sesi dari putaran lama dan sebuah tes menjadi
 * hijau karena sejarah, bukan karena yang baru saja terjadi di browser.
 *
 * Yang dihapus hanya **isi** direktori data, bukan direktorinya: pengumpul sudah
 * berjalan pada titik ini (Playwright menyalakan `webServer` lebih dulu) dan
 * `appendFileSync` ke direktori yang lenyap akan menjatuhkan setiap kiriman
 * dengan 500 — kegagalan yang terlihat seperti cacat produk padahal cacat uji.
 *
 * Dua bundel produksinya dibangun di `e2e/bantu/bangun.ts`, sebagai bagian dari
 * perintah `vite preview` masing-masing, karena alasan yang sama: server sudah
 * dinyalakan sebelum berkas ini dipanggil.
 */
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DIR_DATA, DIR_LAYAR } from './jalur.ts';

function kosongkanIsi(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const nama of readdirSync(dir)) {
    rmSync(join(dir, nama), { recursive: true, force: true });
  }
}

export default function siapkan(): void {
  kosongkanIsi(DIR_DATA);
  kosongkanIsi(DIR_LAYAR);
}
