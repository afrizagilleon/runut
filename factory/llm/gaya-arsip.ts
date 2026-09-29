/**
 * `npm run gaya:arsip` — arsipkan ledger biaya sebelum panggilan berbayar
 * pertama M2d-4 (kontrak §0; keputusan pemilik 29 Sep: pagu "reset lagi
 * menjadi $5"). Ledger dipindah UTUH ke `.cache/llm/arsip/` (tidak dihapus,
 * tidak ditimpa); ledger baru mulai dari nol. Ditolak bila ledger kini sudah
 * memuat panggilan M2d-4 — mengarsipkannya akan menyetel ulang pagu
 * milestone diam-diam. Hanya angka yang dicetak.
 */
import { existsSync, readFileSync } from 'node:fs';
import { AWALAN_TAG_M2D4 } from './gaya-susun.ts';
import { JALUR_LEDGER, arsipkanLedger, type EntriLedger } from './pagu.ts';

export function adaEntriMilestone(jalur: string, awalan: string): boolean {
  if (!existsSync(jalur)) return false;
  return readFileSync(jalur, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .some((b) => (JSON.parse(b) as EntriLedger).tag.startsWith(awalan));
}

function utama(): number {
  if (adaEntriMilestone(JALUR_LEDGER, AWALAN_TAG_M2D4)) {
    console.error(`Ledger kini sudah memuat panggilan ${AWALAN_TAG_M2D4}*; tidak diarsipkan (pagu milestone tidak boleh disetel ulang).`);
    return 1;
  }
  const h = arsipkanLedger();
  console.log(
    `Diarsipkan: ${h.jalur.replace(/^.*\.cache/, '.cache')} — ${String(h.entri)} entri, total US$${h.total_usd.toFixed(6)}, ` +
      `${h.pertama} … ${h.terakhir}, sha256 ${h.sha256.slice(0, 16)}…; ledger kini: ${existsSync(JALUR_LEDGER) ? 'ada' : 'belum ada (mulai dari nol)'}.`,
  );
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/gaya-arsip.ts') === true) {
  try {
    process.exitCode = utama();
  } catch (galat) {
    console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
    process.exitCode = 1;
  }
}
