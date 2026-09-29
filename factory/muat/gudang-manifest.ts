/**
 * Gudang audit terkunci manifest (M4b): hanya berkas yang tercatat di
 * `docs/bukti/gudang-manifest.json`, dengan sha256 yang sama persis.
 *
 * Untuk tes yang mengunci angka atas gudang audit (372 berkas M4a) — pelajaran
 * A-1: tes yang membaca "apa pun yang ada di folder" bergeser diam-diam ketika
 * data bertambah. Berkas di subfolder (`daftar/…`) tidak dibaca pemuat gudang
 * dan dilewati di sini juga.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOLDER_GUDANG, muatGudang, type Gudang } from './gudang.ts';
import type { BerkasBeku } from './sidik.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

export const JALUR_MANIFEST = join(AKAR, 'docs', 'bukti', 'gudang-manifest.json');

/** Berkas manifest yang dibaca pemuat gudang (bukan di subfolder), nama + sha256. */
export function berkasManifest(jalur: string = JALUR_MANIFEST): BerkasBeku[] {
  const m = JSON.parse(readFileSync(jalur, 'utf8')) as { berkas: Array<{ nama: string; sha256: string }> };
  return m.berkas.filter((b) => !b.nama.includes('/')).map((b) => ({ nama: b.nama, sha256: b.sha256 }));
}

export function muatGudangManifest(folder: string = FOLDER_GUDANG, jalur: string = JALUR_MANIFEST): Gudang {
  return muatGudang(folder, { izin: berkasManifest(jalur) });
}
