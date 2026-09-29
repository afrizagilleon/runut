/**
 * `npm run tirt:arsip` — arsipkan ledger Featherless sebelum panggilan
 * OpenRouter pertama M2d-5 (kontrak D-0a): `.cache/llm/ledger.jsonl` dipindah
 * UTUH ke `.cache/llm/arsip/ledger-featherless-sampai-<tanggal entri
 * terakhir>.jsonl` (tidak dihapus, tidak ditimpa, dicek byte-sama). Ledger
 * baru (OpenRouter) mulai dari nol di bawah `LLM_PAGU_USD`. Ditolak bila ledger
 * kini sudah memuat panggilan `m2d5/` — mengarsipkannya akan menyetel ulang
 * pagu milestone diam-diam. Hanya angka yang dicetak.
 */
import { existsSync } from 'node:fs';
import { adaEntriMilestone } from './gaya-arsip.ts';
import { JALUR_ARSIP_FEATHERLESS, JALUR_LEDGER, arsipkanLedger, bacaLedgerSemua } from './pagu.ts';
import { AWALAN_TAG_M2D5 } from './tirt-susun.ts';

export const AWALAN_ARSIP_FEATHERLESS = 'ledger-featherless-sampai-';

function utama(): number {
  if (adaEntriMilestone(JALUR_LEDGER, AWALAN_TAG_M2D5)) {
    console.error(`Ledger kini sudah memuat panggilan ${AWALAN_TAG_M2D5}*; tidak diarsipkan (pagu milestone tidak boleh disetel ulang).`);
    return 1;
  }
  const h = arsipkanLedger(JALUR_LEDGER, undefined, AWALAN_ARSIP_FEATHERLESS);
  const semua = bacaLedgerSemua();
  console.log(
    `Diarsipkan: ${h.jalur.replace(/^.*\.cache/, '.cache')} — ${String(h.entri)} entri, total US$${h.total_usd.toFixed(6)}, ` +
      `${h.pertama} … ${h.terakhir}, sha256 ${h.sha256.slice(0, 16)}…; sama dengan JALUR_ARSIP_FEATHERLESS: ${String(h.jalur === JALUR_ARSIP_FEATHERLESS)}; ` +
      `ledger kini: ${existsSync(JALUR_LEDGER) ? 'ada' : 'belum ada (mulai dari nol)'}; riwayat seluruh arsip: ${String(semua.length)} entri, ` +
      `US$${semua.reduce((a, e) => a + e.biaya_usd, 0).toFixed(6)}.`,
  );
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tirt-arsip.ts') === true) {
  try {
    process.exitCode = utama();
  } catch (galat) {
    console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
    process.exitCode = 1;
  }
}
