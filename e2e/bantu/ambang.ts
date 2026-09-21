/**
 * Ambang "opsi pertama terlihat", **dibaca dari kode produk** (D-C3).
 *
 * Kenapa dibaca, bukan disalin: rangkaian ini sempat memakai `AMBANG_OPSI = 0.6`
 * yang ditulis ulang di dalam tes. Angka yang disalin adalah angka yang diam
 * ketika aslinya berubah — tes akan tetap hijau sambil mengukur ambang yang
 * sudah tidak dipakai siapa pun, atau menunggu lima belas detik atas kesepakatan
 * yang tidak mungkin terjadi.
 *
 * Kenapa dibaca dari teks sumber, bukan di-`import`: INV-14 melarang kode e2e
 * meng-impor apa pun dari `web/src/**`. Rangkaian ini menguji apa yang dilukis
 * peramban dari bundel yang sudah dibangun; meng-impor modul produk ke dalam
 * proses tes akan menyelundupkan modul kedua yang belum tentu sama dengan yang
 * berjalan di halaman. Jadi angkanya diambil seperti `bacaKasus()` mengambil
 * kasus: dari berkas, apa adanya.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AKAR } from './jalur.ts';

/** Berkas produk yang memuat ambangnya. */
const BERKAS = join(AKAR, 'web', 'src', 'Aplikasi.tsx');

const POLA = /export const AMBANG_OPSI_TERLIHAT\s*=\s*([0-9.]+)\s*;/;

/**
 * Nilai `AMBANG_OPSI_TERLIHAT` seperti yang tertulis di `web/src/Aplikasi.tsx`.
 *
 * Melempar — bukan mengembalikan nilai cadangan — kalau konstanta itu hilang
 * atau berganti nama. Nilai cadangan akan mengubah "produk berubah tanpa
 * pemberitahuan" menjadi "tes lulus di atas angka karangan".
 */
export function ambangOpsiProduk(): number {
  const sumber = readFileSync(BERKAS, 'utf8');
  const cocok = POLA.exec(sumber);
  if (cocok === null) {
    throw new Error(
      `AMBANG_OPSI_TERLIHAT tidak ditemukan di ${BERKAS}. ` +
        'Rangkaian e2e membaca ambangnya dari kode produk supaya tidak ada dua ' +
        'angka yang bisa berselisih; kalau konstanta itu diganti nama atau ' +
        'dihapus, tes harus berhenti, bukan menebak.',
    );
  }
  const angka = Number(cocok[1]);
  if (!Number.isFinite(angka) || angka <= 0 || angka > 1) {
    throw new Error(`AMBANG_OPSI_TERLIHAT bukan rasio 0–1 yang masuk akal: ${String(cocok[1])}`);
  }
  return angka;
}
