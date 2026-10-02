/**
 * Konfigurasi skrip berbayar M2d-11 (pra-registrasi §9): pagu milestone
 * **US$5,00** (biaya nyata) atas tag `m2d11/` + jalan TIRT lewat pintu
 * penyusun (`penyusun/m2d11-…`), di atas `LLM_PAGU_USD`. Pagu bagian: uji
 * ulang ≤ US$0,80, pemanasan ≤ US$0,30; jalan TIRT = sisa (min US$0,60 per
 * jalan). US$6 sisanya (rekaman demo + cadangan) tidak tersentuh.
 */
import { existsSync, readFileSync } from 'node:fs';
import { AKAR, bacaKonfigLlm } from '../env.ts';
import type { KonfigKlien } from '../klien.ts';
import { BASE_URL_OPENROUTER } from '../openrouter.ts';
import { JALUR_LEDGER, PencatatBiaya, type EntriLedger, type PaguMilestone } from '../pagu.ts';
import { pagarM2d7 } from '../penyedia-urutan.ts';

export const FOLDER_M2D11 = `${AKAR}eval/keluaran-m2d11`;
export const AWALAN_TAG_M2D11 = 'm2d11/';
export const AWALAN_ID_JALAN_M2D11 = 'm2d11-';
export const PAGU_MILESTONE_M2D11 = 5.0;
export const PAGU_JALAN_MAKS_M2D11 = 0.6;
/** Sisa pagu milestone di bawah ini = jalan TIRT berhenti (pra-registrasi §6). */
export const SISA_MIN_JALAN_M2D11 = 0.3;
export const PAGU_BAGIAN_M2D11 = {
  ujiUlang: { usd: 0.8, awalanTag: 'm2d11/uji-ulang/' },
  pemanasan: { usd: 0.3, awalanTag: 'm2d11/pemanasan/' },
} as const satisfies Record<string, PaguMilestone>;

const AWALAN_BOLEH = ['m2d5/', 'm2d6/', 'm2d7/', 'm2d8/', 'm2d10/', 'penyusun/', AWALAN_TAG_M2D11, 'm2d13/'] as const; // M2d-13: penilai mutu D-D

function entri(jalur: string): EntriLedger[] {
  if (!existsSync(jalur)) return [];
  return readFileSync(jalur, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .map((b) => JSON.parse(b) as EntriLedger);
}

export function siapM2d11(jalurLedger: string = JALUR_LEDGER): string | null {
  if (!existsSync(jalurLedger)) return 'Ledger OpenRouter tidak ada; M2d-11 melanjutkan ledger M2d-5…M2d-10.';
  const lain = entri(jalurLedger).filter((e) => !AWALAN_BOLEH.some((a) => e.tag.startsWith(a)));
  return lain.length > 0 ? `Ledger memuat ${String(lain.length)} panggilan di luar ${AWALAN_BOLEH.join(', ')}; berhenti.` : null;
}

export const tagMilestoneM2d11 = (tag: string): boolean => tag.startsWith(AWALAN_TAG_M2D11) || tag.startsWith(`penyusun/${AWALAN_ID_JALAN_M2D11}`);

/** Biaya milestone M2d-11 dari ledger: tag `m2d11/` + `penyusun/m2d11-…`. */
export function biayaMilestoneM2d11(jalurLedger: string = JALUR_LEDGER): number {
  return entri(jalurLedger)
    .filter((e) => tagMilestoneM2d11(e.tag))
    .reduce((a, e) => a + e.biaya_usd, 0);
}

/** Sisa pagu milestone (dibulatkan turun ke sen). */
export function sisaPaguM2d11(jalurLedger: string = JALUR_LEDGER): number {
  return Math.max(0, Math.floor((PAGU_MILESTONE_M2D11 - biayaMilestoneM2d11(jalurLedger)) * 100 + 1e-9) / 100);
}

/** Pagu satu jalan TIRT = min(US$0,60, sisa); `null` bila sisa < US$0,30 (berhenti). */
export function paguJalanM2d11(jalurLedger: string = JALUR_LEDGER): number | null {
  const sisa = sisaPaguM2d11(jalurLedger);
  return sisa < SISA_MIN_JALAN_M2D11 ? null : Math.min(PAGU_JALAN_MAKS_M2D11, sisa);
}

function biayaAwalan(jalur: string, awalan: string): number {
  return entri(jalur).filter((e) => e.tag.startsWith(awalan)).reduce((a, e) => a + e.biaya_usd, 0);
}

/**
 * Pencatat untuk skrip bertag `m2d11/`: pagu milestone untuk tag ini =
 * US$5,00 − biaya jalan penyusun M2d-11 (supaya gabungannya ≤ US$5,00).
 */
export function pencatatM2d11(paguUsd: number, jalurLedger: string | null = JALUR_LEDGER): PencatatBiaya {
  const penyusun = jalurLedger === null ? 0 : biayaAwalan(jalurLedger, `penyusun/${AWALAN_ID_JALAN_M2D11}`);
  return new PencatatBiaya({
    paguUsd,
    jalurLedger,
    biayaNyata: true,
    paguMilestone: { usd: PAGU_MILESTONE_M2D11 - penyusun, awalanTag: AWALAN_TAG_M2D11 },
    paguBagian: Object.values(PAGU_BAGIAN_M2D11),
  });
}

export function siapkanM2d11(): { klien: KonfigKlien; biaya: PencatatBiaya } {
  const belum = siapM2d11();
  if (belum !== null) throw new Error(belum);
  const konfig = bacaKonfigLlm();
  if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak); M2d-11 hanya memanggil OpenRouter.');
  return {
    klien: { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 600_000, pagar: pagarM2d7 },
    biaya: pencatatM2d11(konfig.paguUsd),
  };
}
