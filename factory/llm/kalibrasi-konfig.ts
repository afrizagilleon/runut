/**
 * Konfigurasi bersama semua skrip M2d-8 (kalibrasi terhadap soal manusia):
 * folder keluaran, awalan tag ledger, pagu, dan klien OpenRouter.
 *
 * - Pagu milestone **US$2,30** (kontrak §0, pra-registrasi §9) DITETAPKAN di
 *   sini atas SEMUA tag `m2d8/` (biaya nyata, `usage.cost`), di atas pagu
 *   kumulatif `LLM_PAGU_USD`. Pagu bagian: probe ≤ US$0,25 (D-1), kalibrasi
 *   ≤ US$0,70 (D-2), pemanasan ≤ US$0,25 (D-3); jalan TIRT = sisa milestone.
 * - Ledger M2d-5…M2d-7 berlanjut: ledger hanya boleh memuat tag `m2d5/`,
 *   `m2d6/`, `m2d7/`, dan `m2d8/`.
 * - Pagar penyedia = pagar M2d-7 (`pagarM2d7`: pagar M2d-6 + `order` GLM
 *   `["wafer"]` dari bukti ledger, fallback tetap).
 */
import { existsSync, readFileSync } from 'node:fs';
import { AKAR, bacaKonfigLlm } from './env.ts';
import type { KonfigKlien } from './klien.ts';
import { BASE_URL_OPENROUTER } from './openrouter.ts';
import { JALUR_LEDGER, PencatatBiaya, type EntriLedger, type PaguMilestone } from './pagu.ts';
import { pagarM2d7 } from './penyedia-urutan.ts';

export const FOLDER_M2D8 = `${AKAR}eval/keluaran-m2d8`;
export const AWALAN_TAG_M2D8 = 'm2d8/';
/** Pagu milestone M2d-8 (kontrak §0): US$2,30, biaya nyata, ditegakkan kode. */
export const PAGU_MILESTONE_M2D8 = 2.3;
export const PAGU_BAGIAN_M2D8 = {
  probe: { usd: 0.25, awalanTag: 'm2d8/probe/' },
  kalibrasi: { usd: 0.7, awalanTag: 'm2d8/kalibrasi/' },
  pemanasan: { usd: 0.25, awalanTag: 'm2d8/pemanasan/' },
} as const satisfies Record<string, PaguMilestone>;
/** Awalan tag jalan TIRT M2d-8 (satu jalan, kontrak D-4; dibatasi sisa pagu milestone). */
export const AWALAN_TAG_JALAN_M2D8 = 'm2d8/jalan/';

/**
 * M2d-9: pintu penyusun lokal menulis ke ledger yang sama dengan tag
 * `penyusun/<jalan>/…` (dibatasi pagu penyusun + `LLM_PAGU_USD`); entri itu
 * sah dan tidak dihitung laporan M2d-8 (laporan memfilter `m2d5/`–`m2d8/`).
 */
// M2d-10: entri `m2d10/` (mesin templat) juga sah dan tidak dihitung laporan M2d-8; M2d-11: `m2d11/` juga.
const AWALAN_BOLEH = ['m2d5/', 'm2d6/', 'm2d7/', AWALAN_TAG_M2D8, 'penyusun/', 'm2d10/', 'm2d11/', 'm2d13/', 'm2d14/', 'm2d15/'] as const; // M2d-13: penilai mutu D-D (tag m2d13/); M2d-14: uji ulang suntingan penyetuju (tag m2d14/); M2d-15 A3: penilai mutu D-5 (tag m2d15/)

/** Ledger hanya boleh memuat panggilan OpenRouter M2d-5…M2d-8. `null` = siap. */
export function siapM2d8(jalurLedger: string = JALUR_LEDGER): string | null {
  if (!existsSync(jalurLedger)) return 'Ledger OpenRouter (M2d-5…M2d-7) tidak ada; M2d-8 melanjutkan ledger itu.';
  const lain = readFileSync(jalurLedger, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .map((b) => (JSON.parse(b) as EntriLedger).tag)
    .filter((t) => !AWALAN_BOLEH.some((a) => t.startsWith(a)));
  return lain.length > 0 ? `Ledger memuat ${String(lain.length)} panggilan di luar ${AWALAN_BOLEH.join(', ')}; berhenti.` : null;
}

/** Pencatat biaya M2d-8: pagu kumulatif + pagu milestone + pagu bagian. */
export function pencatatM2d8(paguUsd: number, jalurLedger: string | null = JALUR_LEDGER): PencatatBiaya {
  return new PencatatBiaya({
    paguUsd,
    jalurLedger,
    biayaNyata: true,
    paguMilestone: { usd: PAGU_MILESTONE_M2D8, awalanTag: AWALAN_TAG_M2D8 },
    paguBagian: Object.values(PAGU_BAGIAN_M2D8),
  });
}

/** Klien OpenRouter M2d-8 (pagar M2d-7) dan pencatat berpagu. Melempar bila belum siap. */
export function siapkanM2d8(): { klien: KonfigKlien; biaya: PencatatBiaya } {
  const belum = siapM2d8();
  if (belum !== null) throw new Error(belum);
  const konfig = bacaKonfigLlm();
  if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak); M2d-8 hanya memanggil OpenRouter.');
  return {
    klien: { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000, pagar: pagarM2d7 },
    biaya: pencatatM2d8(konfig.paguUsd),
  };
}
