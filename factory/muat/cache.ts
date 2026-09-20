/**
 * Pintu satu-satunya ke `.cache/`. Data mentah tidak ikut repo (D-4), jadi
 * kegagalan membacanya harus keras dan menyebut nama berkasnya (INV-6).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

export const FOLDER_CACHE = '.cache/sectors';

export class CacheHilang extends Error {
  readonly berkas: string;

  constructor(berkas: string, penyebab: string) {
    super(
      `Berkas cache tidak ditemukan atau tidak terbaca: ${FOLDER_CACHE}/${berkas} (${penyebab}). ` +
        'Data mentah sengaja tidak ikut repo; minta pemilik menaruhnya kembali di .cache/. ' +
        'Jangan menariknya sendiri dari API.',
    );
    this.name = 'CacheHilang';
    this.berkas = berkas;
  }
}

export class CacheTakSesuai extends Error {
  constructor(berkas: string, keterangan: string) {
    super(`Isi ${FOLDER_CACHE}/${berkas} tidak sesuai dugaan: ${keterangan}.`);
    this.name = 'CacheTakSesuai';
  }
}

/** Baca satu berkas JSON dari cache. Melempar, tidak pernah mengembalikan nilai kosong diam-diam. */
export function bacaCache(berkas: string): unknown {
  let isi: string;
  try {
    isi = readFileSync(AKAR + FOLDER_CACHE + '/' + berkas, 'utf8');
  } catch (galat) {
    throw new CacheHilang(berkas, galat instanceof Error ? galat.message : String(galat));
  }
  try {
    return JSON.parse(isi);
  } catch (galat) {
    throw new CacheTakSesuai(berkas, galat instanceof Error ? galat.message : String(galat));
  }
}

function obyek(nilai: unknown, berkas: string, tempat: string): Record<string, unknown> {
  if (typeof nilai !== 'object' || nilai === null || Array.isArray(nilai)) {
    throw new CacheTakSesuai(berkas, `${tempat} bukan obyek`);
  }
  return nilai as Record<string, unknown>;
}

/** Ambil `results` dari respons berpaginasi. */
export function hasilCache(berkas: string): Record<string, unknown>[] {
  const akar = obyek(bacaCache(berkas), berkas, 'akar berkas');
  const hasil = akar['results'];
  if (!Array.isArray(hasil)) {
    throw new CacheTakSesuai(berkas, 'tidak memuat larik "results"');
  }
  return hasil.map((baris, nomor) => obyek(baris, berkas, `results[${String(nomor)}]`));
}

/** Ambil larik di akar berkas. */
export function larikCache(berkas: string): Record<string, unknown>[] {
  const akar = bacaCache(berkas);
  if (!Array.isArray(akar)) {
    throw new CacheTakSesuai(berkas, 'akar berkas bukan larik');
  }
  return akar.map((baris, nomor) => obyek(baris, berkas, `[${String(nomor)}]`));
}

export function obyekCache(berkas: string): Record<string, unknown> {
  return obyek(bacaCache(berkas), berkas, 'akar berkas');
}

export function angka(
  baris: Record<string, unknown>,
  kunci: string,
  berkas: string,
  tempat: string,
): number {
  const nilai = baris[kunci];
  if (typeof nilai !== 'number' || !Number.isFinite(nilai)) {
    throw new CacheTakSesuai(berkas, `${tempat}.${kunci} bukan angka (${String(nilai)})`);
  }
  return nilai;
}

export function teks(
  baris: Record<string, unknown>,
  kunci: string,
  berkas: string,
  tempat: string,
): string {
  const nilai = baris[kunci];
  if (typeof nilai !== 'string' || nilai === '') {
    throw new CacheTakSesuai(berkas, `${tempat}.${kunci} bukan teks berisi (${String(nilai)})`);
  }
  return nilai;
}

export function teksAtauKosong(baris: Record<string, unknown>, kunci: string): string {
  const nilai = baris[kunci];
  return typeof nilai === 'string' ? nilai : '';
}
