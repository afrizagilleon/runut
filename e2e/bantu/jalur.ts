/**
 * Tempat dan nomor yang dipakai seluruh rangkaian e2e (M3.3 D-2, D-3).
 *
 * Satu berkas, supaya konfigurasi Playwright dan pembantu di dalam tes tidak
 * bisa menyebut port atau direktori yang berbeda. Semua keluaran mendarat di
 * `.cache/e2e/` — yang sudah di-gitignore — sehingga `.gitignore` tidak perlu
 * disentuh dan tidak ada berkas hasil yang bisa ikut ter-commit.
 */
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/** Akar repo, dihitung dari letak berkas ini (`<akar>/e2e/bantu/`). */
export const AKAR: string = fileURLToPath(new URL('../../', import.meta.url));

export const CACHE: string = join(AKAR, '.cache', 'e2e');

export const DIR_HASIL: string = join(CACHE, 'hasil');
export const DIR_LAPORAN: string = join(CACHE, 'laporan');
export const DIR_LAYAR: string = join(CACHE, 'layar');
export const DIR_DATA: string = join(CACHE, 'data');
export const DIR_DIST_DENGAN: string = join(CACHE, 'dist-dengan');
export const DIR_DIST_TANPA: string = join(CACHE, 'dist-tanpa');

/**
 * Port milik e2e saja. Pemilik memakai 5173, 4173, dan 8787 lewat
 * `.claude/launch.json`; menabraknya akan mematikan servernya di tengah kerja.
 * Semuanya dijalankan dengan `--strictPort`: port terpakai harus gagal terang.
 */
export const PORT_KOLEKTOR = 8797;
export const PORT_DEV = 5183;
export const PORT_DENGAN = 4183;
export const PORT_TANPA = 4184;

export const ASAL_DEV = `http://127.0.0.1:${String(PORT_DEV)}`;
export const ASAL_DENGAN = `http://127.0.0.1:${String(PORT_DENGAN)}`;
export const ASAL_TANPA = `http://127.0.0.1:${String(PORT_TANPA)}`;
export const ASAL_KOLEKTOR = `http://127.0.0.1:${String(PORT_KOLEKTOR)}`;

/**
 * Nama host tiruan untuk asal yang TIDAK aman (D-4).
 *
 * `localhost` dan `127.0.0.1` keduanya konteks aman menurut peramban, jadi
 * keduanya tidak bisa memunculkan cacat halaman putih. Nama ini dipetakan ke
 * loopback lewat argumen Chromium `--host-resolver-rules`, sehingga tidak ada
 * server yang perlu di-bind ke `0.0.0.0` dan tidak ada dialog firewall Windows.
 */
export const HOST_TIDAK_AMAN = 'runut.test';

/** Alamat `vite` yang menjalankan berkas kasus; dipakai `bacaKasus()`. */
export const BERKAS_KASUS: string = join(AKAR, 'cases', 'dada-2025-10-08.json');
