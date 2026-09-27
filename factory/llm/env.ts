/**
 * Pemuat konfigurasi LLM dari `.env` (M2d D-1).
 *
 * Salinan kecil `muatEnv()` di `eval/anthropic.ts`, bukan impornya: fungsi itu
 * tidak diekspor, dan `eval/**` di luar batas kerja milestone ini. Bentuk
 * penguraiannya sengaja sama persis (`NAMA=nilai`, tanda kutip di ujung
 * dilepas), supaya satu berkas `.env` dibaca dengan cara yang sama oleh kedua
 * jalur.
 *
 * Yang dijaga di sini: **tidak ada pesan galat yang memuat nilai**. Pesan hanya
 * menyebut NAMA variabel yang hilang atau rusak. Nilai kunci hanya pernah
 * berpindah dari berkas ini ke header `authorization` di `klien.ts`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const AKAR = fileURLToPath(new URL('../../', import.meta.url));

/** Uraikan isi berkas `.env`. Murni; dipakai tes tanpa menyentuh berkas sungguhan. */
export function uraiEnv(isi: string): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const baris of isi.split(/\r?\n/)) {
    const cocok = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(baris);
    if (!cocok) continue;
    const nama = cocok[1];
    const nilai = cocok[2];
    if (nama === undefined || nilai === undefined) continue;
    hasil[nama] = nilai.trim().replace(/^["']|["']$/g, '');
  }
  return hasil;
}

export interface KonfigLlm {
  /** Tanpa garis miring penutup, misalnya `https://host/v1`. */
  baseUrl: string;
  apiKey: string;
  /** Model bawaan (`LLM_MODEL`); uji tanding memanggil ketiga model secara eksplisit. */
  model: string;
  /** Pagu dolar seluruh milestone (`LLM_PAGU_USD`). */
  paguUsd: number;
}

export const NAMA_VARIABEL = ['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_PAGU_USD'] as const;

/**
 * Susun konfigurasi dari peta variabel. Melempar dengan pesan yang hanya
 * menyebut nama variabel — nilai tidak pernah masuk pesan.
 */
export function konfigDari(
  env: Record<string, string>,
  opsi: { perluPagu?: boolean } = {},
): KonfigLlm {
  const perluPagu = opsi.perluPagu ?? true;
  const hilang = NAMA_VARIABEL.filter(
    (n) => (perluPagu || n !== 'LLM_PAGU_USD') && (env[n] ?? '').trim() === '',
  );
  if (hilang.length > 0) {
    throw new Error(`Variabel berikut tidak ada atau kosong di .env: ${hilang.join(', ')}.`);
  }
  const baseUrl = (env['LLM_BASE_URL'] ?? '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(baseUrl)) {
    throw new Error('LLM_BASE_URL harus diawali https:// (nilainya tidak dicetak).');
  }
  const pagu = perluPagu ? Number(env['LLM_PAGU_USD']) : Number.NaN;
  if (perluPagu && (!Number.isFinite(pagu) || pagu <= 0)) {
    throw new Error('LLM_PAGU_USD harus angka positif (nilainya tidak dicetak).');
  }
  return {
    baseUrl,
    apiKey: env['LLM_API_KEY'] ?? '',
    model: env['LLM_MODEL'] ?? '',
    paguUsd: pagu,
  };
}

/**
 * Baca `.env` di akar repo. Hanya kode yang membacanya; isinya tidak pernah dicetak.
 *
 * Variabel yang tidak ada di `.env` boleh datang dari lingkungan proses — nilai
 * `.env` selalu menang. Ini ada karena satu hal yang terukur: pada 27 Sep
 * `.env` pemilik belum memuat `LLM_PAGU_USD`, sementara kontrak M2d menetapkan
 * nilainya (5). Pagu itu diberikan eksplisit di baris perintah
 * (`LLM_PAGU_USD=5 npm run llm:tanding`) alih-alih menyunting berkas rahasia
 * pemilik; tanpa nilai dari mana pun, panggilan berbayar tetap ditolak.
 */
export function bacaKonfigLlm(
  akar: string = AKAR,
  opsi: { perluPagu?: boolean; proses?: Record<string, string | undefined> } = {},
): KonfigLlm {
  const jalur = `${akar}.env`;
  if (!existsSync(jalur)) {
    throw new Error('.env tidak ada di akar repo; kunci API tidak boleh ditulis di repo.');
  }
  const dariBerkas = uraiEnv(readFileSync(jalur, 'utf8'));
  const proses = opsi.proses ?? process.env;
  const gabung: Record<string, string> = { ...dariBerkas };
  for (const nama of NAMA_VARIABEL) {
    const nilai = proses[nama];
    if ((gabung[nama] ?? '').trim() === '' && nilai !== undefined) gabung[nama] = nilai;
  }
  return konfigDari(gabung, { perluPagu: opsi.perluPagu ?? true });
}
