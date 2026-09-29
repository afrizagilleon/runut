/**
 * Sidik berkas gudang beku (M4a Amandemen A-1).
 *
 * Modul kecil tanpa impor dari pemuat, supaya `gudang.ts` (yang memeriksa
 * sidik saat membaca) dan `gudang-beku.ts` (yang memakai `gudang.ts`) tidak
 * saling mengimpor.
 */
import { createHash } from 'node:crypto';

export interface BerkasBeku {
  nama: string;
  sha256: string;
}

/**
 * Gudang beku tidak utuh: satu berkas atau lebih hilang atau isinya berbeda
 * dari sidik yang dibekukan. Pesan selalu menyebut nama berkasnya.
 */
export class GudangBekuRusak extends Error {
  readonly berkas: string[];

  constructor(masalah: Array<{ nama: string; sebab: string }>) {
    super(
      'Gudang beku untuk kasus tayang tidak utuh — kasus tidak dibangun: ' +
        masalah.map((m) => `${m.nama} (${m.sebab})`).join('; ') +
        '. Daftar sidik: docs/bukti/gudang-beku-kasus.json.',
    );
    this.name = 'GudangBekuRusak';
    this.berkas = masalah.map((m) => m.nama);
  }
}

export function sha256(isi: Buffer | string): string {
  return createHash('sha256').update(isi).digest('hex');
}
