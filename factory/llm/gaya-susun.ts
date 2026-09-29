/**
 * `npm run gaya:susun -- <tirt|ultj|dada> [--ulang]` — jalankan lingkar agen
 * berperan generasi GAYA & MAKNA (M2d-4 D-7) untuk satu paket, sungguhan.
 *
 * Sama dengan `peran:susun` (M2d-3), dengan konfigurasi M2d-4:
 * - generasi `GENERASI_M2D4` (gerbang gaya, bank v2, penebak DeepSeek ×2 +
 *   GLM ×1, kritikus sebelum penebak dengan cek makna);
 * - keluaran di `eval/keluaran-m2d4/<paket>/`, tag ledger `m2d4/`;
 * - pagu milestone US$4,00 DITETAPKAN di sini (kontrak §0), di atas pagu
 *   kumulatif `LLM_PAGU_USD`; nilai lain ditolak;
 * - hanya dijalankan bila ledger lama sudah diarsipkan (`npm run gaya:arsip`)
 *   — panggilan berbayar pertama tidak boleh menumpuk di ledger lama;
 * - saldo penyedia habis (HTTP 402/403 atau pesan saldo) → berhenti, kode 4.
 * Urutan kontrak: TIRT, ULTJ, DADA — berurutan, satu proses per paket.
 */
import { existsSync, readdirSync } from 'node:fs';
import { GENERASI_M2D4 } from './agen-peran.ts';
import { AKAR } from './env.ts';
import { MODEL_M2D4 } from './model.ts';
import { FOLDER_ARSIP_LEDGER } from './pagu.ts';
import type { IdPaket } from './paket.ts';
import { jalankanSusun, type KonfigSusun } from './peran-susun.ts';

export const FOLDER_M2D4 = `${AKAR}eval/keluaran-m2d4`;
export const AWALAN_TAG_M2D4 = 'm2d4/';
export const URUTAN_GAYA: readonly IdPaket[] = ['tirt', 'ultj', 'dada'];
/** Pagu milestone M2d-4 (kontrak §0): US$4,00 dari pagu kumulatif US$5, supaya tersisa cadangan. */
export const PAGU_MILESTONE_M2D4 = 4.0;

export const KONFIG_M2D4: KonfigSusun = {
  skrip: 'gaya:susun',
  milestone: 'M2d-4',
  folder: FOLDER_M2D4,
  awalanTag: AWALAN_TAG_M2D4,
  generasi: GENERASI_M2D4,
  izinModel: MODEL_M2D4,
  urutan: URUTAN_GAYA,
  sisaMinimum: null,
  ringkasanPrompt:
    'Prompt penulis = aturan M2d-1 (factory/llm/prompt-susun.md) + gaya & makna (factory/llm/prompt-penulis-gaya.md); ' +
    'kritikus: factory/llm/prompt-kritikus-makna.md; gerbang gaya: factory/llm/gerbang-gaya.ts; peran: factory/llm/peran.md. Di sini hanya hash.',
};

/** Argumen untuk `jalankanSusun`: pagu milestone selalu US$4,00; nilai lain ditolak. */
export function argumenGaya(argumen: readonly string[]): string[] | string {
  const i = argumen.indexOf('--pagu-milestone');
  if (i >= 0 && Number(argumen[i + 1]) !== PAGU_MILESTONE_M2D4) {
    return `Pagu milestone M2d-4 ditetapkan US$${PAGU_MILESTONE_M2D4.toFixed(2)}; nilai lain tidak diterima.`;
  }
  return i >= 0 ? [...argumen] : [...argumen, '--pagu-milestone', PAGU_MILESTONE_M2D4.toFixed(2)];
}

export function ledgerSudahDiarsipkan(folder: string = FOLDER_ARSIP_LEDGER): boolean {
  return existsSync(folder) && readdirSync(folder).some((f) => /^ledger-sampai-.*\.jsonl$/.test(f));
}

async function utama(argumen: string[]): Promise<number> {
  if (!ledgerSudahDiarsipkan()) {
    console.error('Ledger lama belum diarsipkan: jalankan `npm run gaya:arsip` dulu (kontrak M2d-4 §0).');
    return 1;
  }
  const a = argumenGaya(argumen);
  if (typeof a === 'string') {
    console.error(a);
    return 1;
  }
  return jalankanSusun(KONFIG_M2D4, a);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/gaya-susun.ts') === true) {
  utama(process.argv.slice(2)).then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
