/**
 * Membaca bundel hasil build sebagai **teks**, bukan sebagai niat.
 *
 * INV-2 ("build tanpa pengumpul tidak punya satu pun alamat untuk dihubungi")
 * dijaga dengan menghapus cabang kodenya saat bundling. Satu-satunya cara
 * membuktikan itu benar-benar terjadi adalah membaca berkas yang dihasilkan.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Alamat mutlak apa pun di dalam bundel. Tanda kutip, backtick, dan spasi
 * menjadi batas: yang dicari adalah alamat yang utuh, bukan potongan kode.
 */
const POLA_ALAMAT = /https?:\/\/[^"'`\s\\)]{3,90}/g;

export interface IsiBundel {
  nama: string;
  bita: number;
  teks: string;
  alamat: string[];
  host: string[];
}

/** Semua berkas `.js` di `assets/` sebuah direktori hasil build. */
export function bacaBundel(dirDist: string): IsiBundel[] {
  const dir = join(dirDist, 'assets');
  return readdirSync(dir)
    .filter((n) => n.endsWith('.js'))
    .map((nama) => {
      const teks = readFileSync(join(dir, nama), 'utf8');
      const alamat = teks.match(POLA_ALAMAT) ?? [];
      const host = [
        ...new Set(
          alamat.map((u) => {
            try {
              return new URL(u).host;
            } catch {
              return `tidak-terurai:${u.slice(0, 40)}`;
            }
          }),
        ),
      ].sort();
      return { nama, bita: teks.length, teks, alamat, host };
    });
}

/**
 * Host yang boleh ada **sebagai teks** di dalam bundel, beserta alasannya.
 *
 * Data kasus tidak memuat satu pun alamat (diukur: nol), jadi tanpa daftar ini
 * jumlah host yang sah adalah nol. Kedua host di bawah datang dari React, bukan
 * dari kode proyek ini, dan **tidak satu pun dari keduanya pernah dihubungi** —
 * itu yang dibuktikan bagian jaringan E-08, bukan daftar ini.
 *
 * Daftar ini sengaja ditulis lengkap dan dicocokkan **persis**: host baru yang
 * menyelinap masuk lewat dependensi harus membuat tes merah, bukan lolos karena
 * "kan cuma teks".
 */
export const HOST_BOLEH_SEBAGAI_TEKS: Record<string, string> = {
  'reactjs.org':
    'pesan galat React di mode produksi memuat tautan penerjemah kode galat; hanya dicetak ke konsol',
  'www.w3.org':
    'ruang nama XML/SVG untuk createElementNS; sebuah pengenal, bukan alamat yang diambil',
};
