/**
 * `npm run penalar:bukti` — cuplikan bukti penyedia (M2d-6 D-2), TANPA
 * jaringan: membaca `.cache/llm/ledger.jsonl` (ledger OpenRouter M2d-5 +
 * M2d-6), menyalin medan yang dipakai ke `eval/keluaran-m2d6/bukti-penyedia.json`
 * (terlacak), dan mencetak ringkasan per penyedia serta pengecualian yang
 * diturunkan. `PENYEDIA_DIKECUALIKAN` di `penyedia-bukti.ts` harus sama
 * dengan pengecualian itu (dites).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AKAR } from './env.ts';
import { JALUR_LEDGER, type EntriLedger } from './pagu.ts';
import { MIN_PELANGGARAN, MIN_PORSI, PENYEDIA_DIKECUALIKAN, barisBukti, ringkasPenyedia, turunkanPengecualian, type BarisBukti } from './penyedia-bukti.ts';

export const JALUR_BUKTI = `${AKAR}eval/keluaran-m2d6/bukti-penyedia.json`;

export interface BerkasBukti {
  sumber: string;
  aturan: { min_pelanggaran: number; min_porsi: number };
  baris: BarisBukti[];
  pengecualian: Record<string, string[]>;
}

export function bacaBukti(jalur: string = JALUR_BUKTI): BerkasBukti {
  return JSON.parse(readFileSync(jalur, 'utf8')) as BerkasBukti;
}

export function bangunBukti(entri: readonly EntriLedger[]): BerkasBukti {
  const baris = entri.map(barisBukti).filter((x): x is BarisBukti => x !== null);
  return {
    sumber: '.cache/llm/ledger.jsonl (entri m2d5/ dan m2d6/ yang berhasil, bernama penyedia)',
    aturan: { min_pelanggaran: MIN_PELANGGARAN, min_porsi: MIN_PORSI },
    baris,
    pengecualian: turunkanPengecualian(baris),
  };
}

function utama(): number {
  if (!existsSync(JALUR_LEDGER)) {
    console.error('Ledger belum ada.');
    return 1;
  }
  const entri = readFileSync(JALUR_LEDGER, 'utf8').split(/\r?\n/).filter((b) => b.trim() !== '').map((b) => JSON.parse(b) as EntriLedger);
  const b = bangunBukti(entri);
  mkdirSync(`${AKAR}eval/keluaran-m2d6`, { recursive: true });
  writeFileSync(JALUR_BUKTI, JSON.stringify(b, null, 2) + '\n', 'utf8');
  console.log(`${String(b.baris.length)} baris bukti dari ${String(entri.length)} entri ledger → ${JALUR_BUKTI.replace(AKAR, '')}`);
  for (const r of ringkasPenyedia(b.baris)) {
    console.log(`  ${r.dikecualikan ? 'KECUALI' : '       '} ${r.model} · ${r.penyedia}: melanggar ${String(r.melanggar)}/${String(r.diperiksa)} ${r.jenis.join(',')}`);
  }
  console.log(`Pengecualian turunan: ${JSON.stringify(b.pengecualian)}; di kode: ${JSON.stringify(PENYEDIA_DIKECUALIKAN)}`);
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penalar-bukti.ts') === true) {
  process.exitCode = utama();
}
