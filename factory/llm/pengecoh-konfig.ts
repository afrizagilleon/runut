/**
 * Konfigurasi bersama semua skrip M2d-7 (pengecoh dari data): folder
 * keluaran, awalan tag ledger, pagu, dan klien OpenRouter.
 *
 * - Pagu milestone **US$3,00** (kontrak §0) DITETAPKAN di sini atas SEMUA tag
 *   `m2d7/` (biaya nyata, `usage.cost`), di atas pagu kumulatif
 *   `LLM_PAGU_USD`. Pagu bagian: probe ≤ US$0,30 (D-1), kalibrasi ≤ US$0,60
 *   (D-6), jalan 1 ≤ US$1,10 (supaya jalan 2 tetap mungkin bila jalan 1 tidak
 *   terbit; jalan 2 dibatasi sisa pagu milestone).
 * - Ledger M2d-5/M2d-6 berlanjut: ledger hanya boleh memuat tag `m2d5/`,
 *   `m2d6/`, dan `m2d7/`.
 * - Pagar penyedia M2d-7 (`penyedia-urutan.ts`): pagar M2d-6 + `order` GLM.
 */
import { existsSync, readFileSync } from 'node:fs';
import { AKAR, bacaKonfigLlm } from './env.ts';
import type { KonfigKlien } from './klien.ts';
import { BASE_URL_OPENROUTER } from './openrouter.ts';
import { JALUR_LEDGER, PencatatBiaya, type EntriLedger, type PaguMilestone } from './pagu.ts';
import { pagarM2d7 } from './penyedia-urutan.ts';

export const FOLDER_M2D7 = `${AKAR}eval/keluaran-m2d7`;
export const AWALAN_TAG_M2D7 = 'm2d7/';
/** Pagu milestone M2d-7 (kontrak §0): US$3,00, biaya nyata, ditegakkan kode. */
export const PAGU_MILESTONE_M2D7 = 3.0;
export const PAGU_BAGIAN_M2D7 = {
  probe: { usd: 0.3, awalanTag: 'm2d7/probe/' },
  kalibrasi: { usd: 0.6, awalanTag: 'm2d7/kalibrasi/' },
  jalan1: { usd: 1.1, awalanTag: 'm2d7/jalan-1/' },
} as const satisfies Record<string, PaguMilestone>;
/** Jalan penuh TIRT paling banyak (kontrak D-7). */
export const MAKS_JALAN_M2D7 = 2;

const AWALAN_BOLEH = ['m2d5/', 'm2d6/', AWALAN_TAG_M2D7] as const;

/** Ledger hanya boleh memuat panggilan OpenRouter M2d-5/M2d-6/M2d-7. `null` = siap. */
export function siapM2d7(jalurLedger: string = JALUR_LEDGER): string | null {
  if (!existsSync(jalurLedger)) return 'Ledger OpenRouter (M2d-5/M2d-6) tidak ada; M2d-7 melanjutkan ledger itu.';
  const lain = readFileSync(jalurLedger, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .map((b) => (JSON.parse(b) as EntriLedger).tag)
    .filter((t) => !AWALAN_BOLEH.some((a) => t.startsWith(a)));
  return lain.length > 0 ? `Ledger memuat ${String(lain.length)} panggilan di luar ${AWALAN_BOLEH.join(', ')}; berhenti.` : null;
}

/** Pencatat biaya M2d-7: pagu kumulatif + pagu milestone + pagu bagian. */
export function pencatatM2d7(paguUsd: number, jalurLedger: string | null = JALUR_LEDGER): PencatatBiaya {
  return new PencatatBiaya({
    paguUsd,
    jalurLedger,
    biayaNyata: true,
    paguMilestone: { usd: PAGU_MILESTONE_M2D7, awalanTag: AWALAN_TAG_M2D7 },
    paguBagian: Object.values(PAGU_BAGIAN_M2D7),
  });
}

/** Klien OpenRouter M2d-7 (pagar M2d-7) dan pencatat berpagu. Melempar bila belum siap. */
export function siapkanM2d7(): { klien: KonfigKlien; biaya: PencatatBiaya } {
  const belum = siapM2d7();
  if (belum !== null) throw new Error(belum);
  const konfig = bacaKonfigLlm();
  if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak); M2d-7 hanya memanggil OpenRouter.');
  return {
    klien: { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000, pagar: pagarM2d7 },
    biaya: pencatatM2d7(konfig.paguUsd),
  };
}
