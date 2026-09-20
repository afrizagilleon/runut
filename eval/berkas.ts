// Jalur berkas dan pembaca JSON bersama untuk seluruh perkakas eval.
// Modul ini TIDAK BOLEH menyentuh .cache/kunci/ — hanya penilai yang boleh,
// lewat eval/kunci.ts. Lihat tes eval/pemisahan.test.ts.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CACHE_SECTORS = join(AKAR, '.cache', 'sectors');
export const EVAL = join(AKAR, 'eval');
export const KELUARAN = join(EVAL, 'keluaran');

export function bacaJson<T>(jalur: string): T {
  if (!existsSync(jalur)) {
    throw new Error(`Berkas tidak ada: ${jalur}`);
  }
  return JSON.parse(readFileSync(jalur, 'utf8')) as T;
}

export function adaBerkas(jalur: string): boolean {
  return existsSync(jalur);
}

export function berkasCache(nama: string): string {
  return join(CACHE_SECTORS, nama);
}

/** Satu baris suspensi IDX seperti disimpan penyedia. */
export interface BarisSuspensi {
  symbol: string;
  suspension_date: string;
  reason: string | null;
  pdf_url: string | null;
}

/** Satu laporan kepemilikan (filing) seperti disimpan penyedia. */
export interface Filing {
  title: string;
  body: string | null;
  source: string | null;
  timestamp: string;
  symbol: string;
  transaction_type: string | null;
  holder_name: string | null;
  holding_before: number | null;
  holding_after: number | null;
  amount_transaction: number | null;
  price: number | null;
  transaction_value: number | null;
  price_transaction: { date: string; type: string; price: number; amount_transacted: number }[] | null;
  share_percentage_before: number | null;
  share_percentage_after: number | null;
  share_percentage_transaction: number | null;
}

export interface BerkasFilings {
  results: Filing[];
}

/** Satu hari bursa. */
export interface HariHarga {
  symbol: string;
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume: number;
  market_cap?: number;
}

export function kodeTanpaSufiks(symbol: string): string {
  return symbol.replace(/\.JK$/i, '');
}

/** Benar kalau modul dengan url ini sedang dijalankan langsung oleh node. */
export function iniEntri(metaUrl: string): boolean {
  const entri = process.argv[1];
  if (entri === undefined) return false;
  return resolve(fileURLToPath(metaUrl)) === resolve(entri);
}
