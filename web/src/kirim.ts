import type { Peristiwa } from './alur.ts';

/**
 * Pengiriman peristiwa (D-7).
 *
 * Tanpa `VITE_KOLEKTOR_URL` saat build, `ALAMAT` menjadi string kosong dan
 * seluruh isi cabang di bawahnya dibuang Vite ketika mem-bundle — sehingga
 * berkas hasil build **tidak memuat alamat mana pun dan tidak memuat
 * `sendBeacon`**. Itulah cara INV-2 tetap berlaku untuk build biasa.
 */
const ALAMAT: string = import.meta.env['VITE_KOLEKTOR_URL'] ?? '';

/** Benar kalau build ini memang punya pengumpul. */
export const MENGIRIM: boolean = ALAMAT !== '';

export function catatPeristiwa(_peristiwa: Peristiwa[]): void {
  if (!MENGIRIM) return;
}

export function siramPeristiwa(): void {
  if (!MENGIRIM) return;
}
