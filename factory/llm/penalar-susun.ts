/**
 * `npm run penalar:susun [-- --jalan <1|2>]` — lingkar agen berperan
 * generasi M2d-6 (penalar sungguhan), HANYA untuk TIRT (kontrak M2d-6 D-6),
 * dan konfigurasi bersama semua skrip M2d-6 (probe, kalibrasi, kritikus).
 *
 * Sama dengan `tirt:susun` (M2d-5), dengan:
 * - generasi `GENERASI_M2D6` (penalar GLM dengan `reasoning.effort` + penjaga
 *   penalaran, G-pilihan-kembar, susunan penebak hasil kalibrasi);
 * - pagar `pagarM2d6`: pagar M2d-5 persis + `provider.ignore` dari bukti
 *   (`penyedia-bukti.ts`) + penyedia yang dilewati untuk ulangan;
 * - pagu milestone US$3,50 DITETAPKAN di sini atas SEMUA tag `m2d6/` (biaya
 *   nyata), di atas pagu kumulatif `LLM_PAGU_USD`; nilai lain ditolak;
 * - ledger M2d-5 berlanjut (tidak diarsipkan): ledger kini hanya boleh
 *   memuat tag `m2d5/` dan `m2d6/`;
 * - paling banyak dua jalan penuh (`--jalan 1`, `--jalan 2`), masing-masing
 *   di `eval/keluaran-m2d6/jalan-<n>/` dengan tag `m2d6/jalan-<n>/`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { GENERASI_M2D6 } from './agen-peran.ts';
import { AKAR, bacaKonfigLlm } from './env.ts';
import type { KonfigKlien } from './klien.ts';
import { MODEL_M2D5 } from './model.ts';
import { BASE_URL_OPENROUTER } from './openrouter.ts';
import { JALUR_LEDGER, PencatatBiaya, type EntriLedger, type PaguMilestone } from './pagu.ts';
import { pagarM2d6 } from './penyedia-bukti.ts';
import { jalankanSusun, type KonfigSusun } from './peran-susun.ts';

export const FOLDER_M2D6 = `${AKAR}eval/keluaran-m2d6`;
export const AWALAN_TAG_M2D6 = 'm2d6/';
/** Pagu milestone M2d-6 (kontrak §0): US$3,50, biaya nyata, ditegakkan kode. */
export const PAGU_MILESTONE_M2D6 = 3.5;
/** Pagu bagian M2d-6 (kontrak D-3, D-5) + probe (ditetapkan eksekutor, sama dengan M2d-5). */
export const PAGU_BAGIAN_M2D6 = {
  probe: { usd: 0.4, awalanTag: 'm2d6/probe/' },
  kalibrasi: { usd: 0.8, awalanTag: 'm2d6/kalibrasi/' },
  kritikus: { usd: 0.3, awalanTag: 'm2d6/kritikus/' },
} as const satisfies Record<string, PaguMilestone>;
/** Jalan penuh TIRT paling banyak (kontrak D-6). */
export const MAKS_JALAN_M2D6 = 2;

/** Ledger kini hanya boleh memuat panggilan OpenRouter M2d-5/M2d-6 (ledger Featherless sudah diarsipkan di M2d-5). */
export function siapM2d6(jalurLedger: string = JALUR_LEDGER): string | null {
  if (!existsSync(jalurLedger)) return 'Ledger OpenRouter (M2d-5) tidak ada; M2d-6 melanjutkan ledger itu.';
  const lain = readFileSync(jalurLedger, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .map((b) => (JSON.parse(b) as EntriLedger).tag)
    .filter((t) => !t.startsWith('m2d5/') && !t.startsWith(AWALAN_TAG_M2D6));
  return lain.length > 0 ? `Ledger kini memuat ${String(lain.length)} panggilan di luar m2d5/ dan m2d6/; berhenti.` : null;
}

/** Klien OpenRouter M2d-6 (pagar + ignore) dan pencatat dengan pagu milestone + pagu bagian. Melempar bila belum siap. */
export function siapkanM2d6(): { klien: KonfigKlien; biaya: PencatatBiaya } {
  const belum = siapM2d6();
  if (belum !== null) throw new Error(belum);
  const konfig = bacaKonfigLlm();
  if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak); M2d-6 hanya memanggil OpenRouter.');
  const biaya = new PencatatBiaya({
    paguUsd: konfig.paguUsd,
    jalurLedger: JALUR_LEDGER,
    biayaNyata: true,
    paguMilestone: { usd: PAGU_MILESTONE_M2D6, awalanTag: AWALAN_TAG_M2D6 },
    paguBagian: Object.values(PAGU_BAGIAN_M2D6),
  });
  return { klien: { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000, pagar: pagarM2d6 }, biaya };
}

export function konfigJalan(n: number): KonfigSusun {
  return {
    skrip: 'penalar:susun',
    milestone: 'M2d-6',
    folder: `${FOLDER_M2D6}/jalan-${String(n)}`,
    awalanTag: `${AWALAN_TAG_M2D6}jalan-${String(n)}/`,
    awalanMilestone: AWALAN_TAG_M2D6,
    generasi: GENERASI_M2D6,
    izinModel: MODEL_M2D5,
    urutan: ['tirt'],
    sisaMinimum: null,
    ringkasanPrompt:
      'Prompt penulis = aturan M2d-1 (factory/llm/prompt-susun.md) + gaya & makna (factory/llm/prompt-penulis-gaya.md) + M2d-5 ' +
      '(factory/llm/prompt-penulis-m2d5.md); kritikus: factory/llm/prompt-kritikus-makna.md; penebak: GENERASI_M2D6 (factory/llm/agen-peran.ts); ' +
      'pembaca kartu: factory/llm/gerbang-kartu.ts; peran: factory/llm/peran.md. Di sini hanya hash.',
    openRouter: { baseUrl: BASE_URL_OPENROUTER, pagar: pagarM2d6 },
  };
}

/** Argumen `penalar:susun`: nomor jalan 1–2 dan pagu milestone tetap US$3,50; nilai lain ditolak. */
export function argumenPenalar(argumen: readonly string[]): { jalan: number; argumen: string[] } | string {
  const i = argumen.indexOf('--jalan');
  const jalan = i >= 0 ? Number(argumen[i + 1]) : 1;
  if (!Number.isInteger(jalan) || jalan < 1 || jalan > MAKS_JALAN_M2D6) return `M2d-6 paling banyak ${String(MAKS_JALAN_M2D6)} jalan penuh (--jalan 1 atau 2).`;
  const p = argumen.indexOf('--pagu-milestone');
  if (p >= 0 && Number(argumen[p + 1]) !== PAGU_MILESTONE_M2D6) return `Pagu milestone M2d-6 ditetapkan US$${PAGU_MILESTONE_M2D6.toFixed(2)}; nilai lain tidak diterima.`;
  const bebas = argumen.filter((a, j) => !a.startsWith('--') && argumen[j - 1] !== '--jalan' && argumen[j - 1] !== '--pagu-milestone');
  if (bebas.some((x) => x !== 'tirt')) return 'M2d-6 hanya menjalankan TIRT (kontrak D-6).';
  return { jalan, argumen: ['tirt', '--pagu-milestone', PAGU_MILESTONE_M2D6.toFixed(2), ...(argumen.includes('--ulang') ? ['--ulang'] : [])] };
}

async function utama(argumen: string[]): Promise<number> {
  const belum = siapM2d6();
  if (belum !== null) {
    console.error(belum);
    return 1;
  }
  const a = argumenPenalar(argumen);
  if (typeof a === 'string') {
    console.error(a);
    return 1;
  }
  return jalankanSusun(konfigJalan(a.jalan), a.argumen);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penalar-susun.ts') === true) {
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
