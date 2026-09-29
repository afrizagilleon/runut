/**
 * `npm run tirt:susun [-- --ulang] [--jalan <n>]` — lingkar agen berperan
 * generasi M2d-5 (OpenRouter), HANYA untuk TIRT (kontrak M2d-5 D-9).
 *
 * Sama dengan `gaya:susun` (M2d-4), dengan konfigurasi M2d-5:
 * - generasi `GENERASI_M2D5` (model OpenRouter; batas penalaran; posisi kunci
 *   oleh kode; G-penilaian dan G-mirip; pembaca kartu menandai kalimat
 *   membingungkan);
 * - `LLM_BASE_URL` WAJIB `https://openrouter.ai/api/v1`; setiap permintaan
 *   membawa pagar penyedia (`openrouter.ts`);
 * - biaya ledger = tagihan nyata `usage.cost`; tanpa `usage.cost` = perkiraan
 *   maksimum yang ditandai;
 * - pagu milestone US$4,00 DITETAPKAN di sini (kontrak §0), di atas pagu
 *   kumulatif `LLM_PAGU_USD`; nilai lain ditolak;
 * - hanya dijalankan bila ledger Featherless sudah diarsipkan
 *   (`npm run tirt:arsip`), supaya panggilan OpenRouter tidak menumpuk di
 *   ledger Featherless;
 * - saldo/limit habis (HTTP 402/403 atau pesan saldo) → berhenti, kode 4.
 */
import { existsSync, readFileSync } from 'node:fs';
import { GENERASI_M2D5 } from './agen-peran.ts';
import { AKAR } from './env.ts';
import { MODEL_M2D5 } from './model.ts';
import { BASE_URL_OPENROUTER, pagarPenyedia } from './openrouter.ts';
import { JALUR_ARSIP_FEATHERLESS, JALUR_LEDGER, type EntriLedger } from './pagu.ts';
import { jalankanSusun, type KonfigSusun } from './peran-susun.ts';

export const FOLDER_M2D5 = `${AKAR}eval/keluaran-m2d5`;
export const AWALAN_TAG_M2D5 = 'm2d5/';
/** Pagu milestone M2d-5 (kontrak §0 dan D-2): US$4,00, ditegakkan kode dengan biaya nyata. */
export const PAGU_MILESTONE_M2D5 = 4.0;

export const KONFIG_M2D5: KonfigSusun = {
  skrip: 'tirt:susun',
  milestone: 'M2d-5',
  folder: FOLDER_M2D5,
  awalanTag: AWALAN_TAG_M2D5,
  generasi: GENERASI_M2D5,
  izinModel: MODEL_M2D5,
  urutan: ['tirt'],
  sisaMinimum: null,
  ringkasanPrompt:
    'Prompt penulis = aturan M2d-1 (factory/llm/prompt-susun.md) + gaya & makna (factory/llm/prompt-penulis-gaya.md) + M2d-5 ' +
    '(factory/llm/prompt-penulis-m2d5.md); kritikus: factory/llm/prompt-kritikus-makna.md; pembaca kartu: factory/llm/gerbang-kartu.ts; ' +
    'peran: factory/llm/peran.md. Di sini hanya hash.',
  openRouter: { baseUrl: BASE_URL_OPENROUTER, pagar: pagarPenyedia },
};

/** Argumen untuk `jalankanSusun`: paket selalu TIRT, pagu milestone selalu US$4,00; nilai lain ditolak. */
export function argumenTirt(argumen: readonly string[]): string[] | string {
  const i = argumen.indexOf('--pagu-milestone');
  if (i >= 0 && Number(argumen[i + 1]) !== PAGU_MILESTONE_M2D5) {
    return `Pagu milestone M2d-5 ditetapkan US$${PAGU_MILESTONE_M2D5.toFixed(2)}; nilai lain tidak diterima.`;
  }
  const paket = argumen.filter((a, j) => !a.startsWith('--') && argumen[j - 1] !== '--pagu-milestone');
  if (paket.some((p) => p !== 'tirt')) return 'M2d-5 hanya menjalankan TIRT (kontrak D-9).';
  const sisa = argumen.filter((a) => a !== 'tirt');
  return ['tirt', ...(i >= 0 ? sisa : [...sisa, '--pagu-milestone', PAGU_MILESTONE_M2D5.toFixed(2)])];
}

/** Ledger kini tidak boleh memuat panggilan Featherless (M2d-4) — harus sudah diarsipkan (D-0). */
export function siapOpenRouter(jalurLedger: string = JALUR_LEDGER, arsip: string = JALUR_ARSIP_FEATHERLESS): string | null {
  if (!existsSync(arsip)) return 'Ledger Featherless belum diarsipkan: jalankan `npm run tirt:arsip` dulu (kontrak M2d-5 D-0).';
  if (existsSync(jalurLedger)) {
    const lama = readFileSync(jalurLedger, 'utf8')
      .split(/\r?\n/)
      .filter((b) => b.trim() !== '')
      .some((b) => !(JSON.parse(b) as EntriLedger).tag.startsWith(AWALAN_TAG_M2D5));
    if (lama) return 'Ledger kini memuat panggilan di luar m2d5/; pagu M2d-5 hanya berlaku atas ledger OpenRouter yang baru.';
  }
  return null;
}

async function utama(argumen: string[]): Promise<number> {
  const belum = siapOpenRouter();
  if (belum !== null) {
    console.error(belum);
    return 1;
  }
  const a = argumenTirt(argumen);
  if (typeof a === 'string') {
    console.error(a);
    return 1;
  }
  return jalankanSusun(KONFIG_M2D5, a);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tirt-susun.ts') === true) {
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
