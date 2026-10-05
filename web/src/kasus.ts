/**
 * Berkas kasus diimpor saat build, bukan diambil lewat jaringan.
 * Itulah cara INV-2 dijaga: aplikasi yang sudah dibangun tidak punya satu pun
 * alamat untuk dihubungi, kecuali pengumpul yang ditentukan saat build (D-7).
 *
 * **Impornya eksplisit, satu baris per kasus** (M4 D-4) — bukan glob dinamis.
 * Glob akan membuat "kasus mana yang ikut ke dalam bundel" bergantung pada isi
 * folder saat build, dan kasus setengah jadi yang tertinggal di `cases/` akan
 * sampai ke pemain tanpa satu baris pun yang menyebutnya.
 */
import dada from '@cases/dada-2025-10-08.json';
import ultj from '@cases/ultj-2026-05-04.json';
import amag from '@cases/amag-2026-06-15.json';
import type { Kasus } from '../../factory/skema/tipe.ts';

export * from './isi-kasus.ts';

/*
 * JSON tidak membawa tipe persatuan (`status`, `aturan`), jadi bentuknya
 * dikembalikan ke `Kasus` di satu tempat saja. Isinya sudah dijamin:
 * `npm run build:case` menolak menulis berkas yang tidak lolos validator, dan
 * tes `berkas kasus yang ikut repo` menjalankan validator yang sama atas berkas
 * yang benar-benar ikut di repo.
 */
export const KASUS: Kasus = dada as unknown as Kasus;
export const KASUS_ULTJ: Kasus = ultj as unknown as Kasus;
/**
 * Kasus ketiga: soalnya ditulis AI agent, dilengkapi lampiran penyetuju
 * (`factory/kasus/dari-agen.ts`, `factory/kasus/lampiran/amag-2026-06-15.ts`).
 */
export const KASUS_AMAG: Kasus = amag as unknown as Kasus;

/**
 * Seluruh kasus yang bisa dimainkan, dalam urutan tetap.
 *
 * Urutannya menentukan dua hal yang dilihat pemain: kasus mana yang dibuka
 * "Coba simulasi lain" lebih dulu (`kasusBerikut`), dan pemetaan angka acak ke
 * kasus pada kunjungan pertama. Karena itu ia ditulis di sini sekali, bukan
 * dihasilkan dari urutan berkas di cakram.
 */
export const DAFTAR_KASUS: readonly Kasus[] = [KASUS, KASUS_ULTJ, KASUS_AMAG];
