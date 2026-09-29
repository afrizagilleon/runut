/**
 * Manifest gudang (M4a D-2): `npm run sectors:manifest`.
 *
 * Isi data Sectors tidak ikut repo (tidak didistribusikan ulang). Yang ikut
 * repo adalah **sidik** tiap berkas di `.cache/sectors/`: nama, ukuran,
 * sha256, path endpoint asal bila diketahui, dan tanggal ambil. Dengan itu
 * juri yang mengambil ulang data lewat `npm run sectors:ambil` bisa memeriksa
 * apakah berkasnya sama byte per byte dengan yang kami audit.
 *
 * Deterministik: tidak ada cap waktu pembuatan, urutan menurut nama berkas
 * (perbandingan kode karakter), dan dua kali jalan atas folder yang sama
 * memberi berkas yang sama byte per byte.
 *
 * Asal path dan tanggal:
 * - berkas yang diambil lewat `alat/sectors.ts` punya baris `hasil` 2xx di
 *   buku kas → path endpoint dan tanggal diambil dari sana (`buku-kas`);
 * - berkas lama (diambil skrip pribadi sebelum M4a) tidak punya jejak path di
 *   repo → path `null`, tanggal dari waktu ubah berkas (`waktu-ubah-berkas`).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AKAR, FOLDER_SECTORS, bacaBukuKas } from './sectors.ts';

export const JALUR_MANIFEST = join(AKAR, 'docs', 'bukti', 'gudang-manifest.json');

export interface BarisManifest {
  nama: string;
  ukuran: number;
  sha256: string;
  path_endpoint: string | null;
  tanggal_ambil: string;
  sumber_tanggal: 'buku-kas' | 'waktu-ubah-berkas';
}

export interface Manifest {
  keterangan: string;
  folder: string;
  jumlah_berkas: number;
  jumlah_byte: number;
  berkas: BarisManifest[];
}

/** Semua berkas `.json` di bawah folder, relatif dengan `/`, terurut kode karakter. */
export function daftarJson(folder: string, awalan = ''): string[] {
  const keluar: string[] = [];
  for (const nama of readdirSync(join(folder, awalan))) {
    const relatif = awalan === '' ? nama : `${awalan}/${nama}`;
    const s = statSync(join(folder, relatif));
    if (s.isDirectory()) keluar.push(...daftarJson(folder, relatif));
    else if (nama.endsWith('.json')) keluar.push(relatif);
  }
  return keluar.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function susunManifest(folder: string, bukuKas: string): Manifest {
  // Baris `hasil` 2xx terakhir per berkas. Berkas tidak pernah ditimpa, jadi
  // paling banyak ada satu; "terakhir" hanya supaya aturannya tertulis.
  const asal = new Map<string, { path: string; tanggal: string }>();
  for (const b of bacaBukuKas(bukuKas)) {
    if (b.jenis !== 'hasil' || !/^2\d\d$/.test(b.status)) continue;
    asal.set(b.berkas, { path: b.path, tanggal: b.waktu.slice(0, 10) });
  }
  const berkas: BarisManifest[] = daftarJson(folder).map((nama) => {
    const isi = readFileSync(join(folder, nama));
    const jejak = asal.get(nama);
    return {
      nama,
      ukuran: isi.length,
      sha256: createHash('sha256').update(isi).digest('hex'),
      path_endpoint: jejak?.path ?? null,
      tanggal_ambil: jejak?.tanggal ?? statSync(join(folder, nama)).mtime.toISOString().slice(0, 10),
      sumber_tanggal: jejak === undefined ? 'waktu-ubah-berkas' : 'buku-kas',
    };
  });
  return {
    keterangan:
      'Sidik berkas .cache/sectors/ (isi data tidak ikut repo). Ditulis oleh `npm run sectors:manifest`; ' +
      'jangan disunting tangan. path_endpoint null = diambil sebelum M4a dengan skrip di luar repo.',
    folder: '.cache/sectors',
    jumlah_berkas: berkas.length,
    jumlah_byte: berkas.reduce((n, b) => n + b.ukuran, 0),
    berkas,
  };
}

export function teksManifest(m: Manifest): string {
  return `${JSON.stringify(m, null, 2)}\n`;
}

export function tulisManifest(folder: string, bukuKas: string, tujuan: string): Manifest {
  const m = susunManifest(folder, bukuKas);
  mkdirSync(dirname(tujuan), { recursive: true });
  writeFileSync(tujuan, teksManifest(m), 'utf8');
  return m;
}

function utama(): number {
  if (!existsSync(FOLDER_SECTORS)) {
    console.error(`Folder ${FOLDER_SECTORS} tidak ada; ambil data dulu dengan npm run sectors:ambil.`);
    return 1;
  }
  const m = tulisManifest(FOLDER_SECTORS, join(FOLDER_SECTORS, 'kredit.csv'), JALUR_MANIFEST);
  const dariBuku = m.berkas.filter((b) => b.sumber_tanggal === 'buku-kas').length;
  console.log('sectors:manifest');
  console.log(`  ${m.jumlah_berkas} berkas, ${m.jumlah_byte} byte; ${dariBuku} berjejak di buku kas`);
  console.log('  ditulis: docs/bukti/gudang-manifest.json');
  return 0;
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dijalankanLangsung) {
  process.exitCode = utama();
}
