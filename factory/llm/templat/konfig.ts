/**
 * Konfigurasi skrip berbayar M2d-10 (pra-registrasi §7): folder keluaran,
 * awalan tag ledger, pagu, klien OpenRouter.
 *
 * - Pagu milestone **US$1,20** (biaya nyata) atas tag `m2d10/` DAN tag jalan
 *   TIRT lewat pintu penyusun (`penyusun/m2d10-…`), di atas `LLM_PAGU_USD`.
 *   Pagu bagian: kalibrasi ≤ US$0,35, pemanasan ≤ US$0,25; jalan TIRT = sisa
 *   (`sisaPaguJalan`).
 * - Ledger M2d-5…M2d-9 berlanjut; hanya tag yang dikenal yang boleh ada.
 */
import { existsSync, readFileSync } from 'node:fs';
import { AKAR, bacaKonfigLlm } from '../env.ts';
import type { KonfigKlien } from '../klien.ts';
import { BASE_URL_OPENROUTER } from '../openrouter.ts';
import { JALUR_LEDGER, PencatatBiaya, type EntriLedger, type PaguMilestone } from '../pagu.ts';
import { pagarM2d7 } from '../penyedia-urutan.ts';

export const FOLDER_M2D10 = `${AKAR}eval/keluaran-m2d10`;
export const AWALAN_TAG_M2D10 = 'm2d10/';
export const PAGU_MILESTONE_M2D10 = 1.2;
export const PAGU_BAGIAN_M2D10 = {
  kalibrasi: { usd: 0.35, awalanTag: 'm2d10/kalibrasi/' },
  pemanasan: { usd: 0.25, awalanTag: 'm2d10/pemanasan/' },
} as const satisfies Record<string, PaguMilestone>;
/** Id jalan TIRT lewat pintu penyusun (tag `penyusun/<id>/…`) berawalan ini ikut pagu milestone. */
export const AWALAN_ID_JALAN_M2D10 = 'm2d10-';

// M2d-11: entri `m2d11/` juga sah (tidak dihitung biaya M2d-10).
const AWALAN_BOLEH = ['m2d5/', 'm2d6/', 'm2d7/', 'm2d8/', 'penyusun/', AWALAN_TAG_M2D10, 'm2d11/', 'm2d13/', 'm2d15/'] as const; // M2d-13: penilai mutu D-D; M2d-15 A3: penilai mutu D-5

function entri(jalur: string): EntriLedger[] {
  if (!existsSync(jalur)) return [];
  return readFileSync(jalur, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .map((b) => JSON.parse(b) as EntriLedger);
}

export function siapM2d10(jalurLedger: string = JALUR_LEDGER): string | null {
  if (!existsSync(jalurLedger)) return 'Ledger OpenRouter tidak ada; M2d-10 melanjutkan ledger M2d-5…M2d-9.';
  const lain = entri(jalurLedger).filter((e) => !AWALAN_BOLEH.some((a) => e.tag.startsWith(a)));
  return lain.length > 0 ? `Ledger memuat ${String(lain.length)} panggilan di luar ${AWALAN_BOLEH.join(', ')}; berhenti.` : null;
}

/** Biaya milestone M2d-10 dari ledger: tag `m2d10/` + `penyusun/m2d10-…`. */
export function biayaMilestoneM2d10(jalurLedger: string = JALUR_LEDGER): number {
  return entri(jalurLedger)
    .filter((e) => e.tag.startsWith(AWALAN_TAG_M2D10) || e.tag.startsWith(`penyusun/${AWALAN_ID_JALAN_M2D10}`))
    .reduce((a, e) => a + e.biaya_usd, 0);
}

/** Sisa pagu milestone untuk jalan TIRT (dibulatkan turun ke sen). */
export function sisaPaguJalan(jalurLedger: string = JALUR_LEDGER): number {
  return Math.max(0, Math.floor((PAGU_MILESTONE_M2D10 - biayaMilestoneM2d10(jalurLedger)) * 100 + 1e-9) / 100);
}

export function pencatatM2d10(paguUsd: number, jalurLedger: string | null = JALUR_LEDGER): PencatatBiaya {
  return new PencatatBiaya({
    paguUsd,
    jalurLedger,
    biayaNyata: true,
    paguMilestone: { usd: PAGU_MILESTONE_M2D10 - (jalurLedger === null ? 0 : biayaMilestoneM2d10(jalurLedger) - biayaTag(jalurLedger, AWALAN_TAG_M2D10)), awalanTag: AWALAN_TAG_M2D10 },
    paguBagian: Object.values(PAGU_BAGIAN_M2D10),
  });
}

function biayaTag(jalur: string, awalan: string): number {
  return entri(jalur).filter((e) => e.tag.startsWith(awalan)).reduce((a, e) => a + e.biaya_usd, 0);
}

export function siapkanM2d10(): { klien: KonfigKlien; biaya: PencatatBiaya } {
  const belum = siapM2d10();
  if (belum !== null) throw new Error(belum);
  const konfig = bacaKonfigLlm();
  if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak); M2d-10 hanya memanggil OpenRouter.');
  return {
    klien: { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000, pagar: pagarM2d7 },
    biaya: pencatatM2d10(konfig.paguUsd),
  };
}
