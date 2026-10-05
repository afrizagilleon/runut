/**
 * Biaya dan kredit untuk layar penyusun (M2d-9 D-4, D-6): ringkasan ledger
 * OpenRouter dan buku kas Sectors yang SUDAH ada. Modul ini hanya membaca
 * berkas; pagu ditegakkan `factory/llm/pagu.ts` (dolar) dan `alat/sectors.ts`
 * (kredit), bukan di sini.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EntriLedger } from '../../factory/llm/pagu.ts';
import { bacaBukuKas, kreditTerpakai, SALDO_PEMBUKA } from '../sectors.ts';

/** Semua panggilan berbayar pintu penyusun bertag awalan ini (satu awalan per jalan di bawahnya). */
export const AWALAN_TAG_PENYUSUN = 'penyusun/';
/**
 * Pagu seluruh panggilan berbayar pintu penyusun (tag `penyusun/`), di atas
 * pagu kumulatif `LLM_PAGU_USD`. Bawaan US$1,20 = pagu milestone M2d-9;
 * bisa diubah dengan `npm run penyusun -- --mesin-lama --pagu-penyusun <usd>`.
 */
export const PAGU_PENYUSUN_BAWAAN = 1.2;

export function jalurLedger(akar: string): string {
  return join(akar, '.cache', 'llm', 'ledger.jsonl');
}

export function jalurBukuKas(akar: string): string {
  return join(akar, '.cache', 'sectors', 'kredit.csv');
}

export function bacaLedger(jalur: string): EntriLedger[] {
  if (!existsSync(jalur)) return [];
  return readFileSync(jalur, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .map((b) => JSON.parse(b) as EntriLedger);
}

export interface RingkasBiaya {
  /** Jumlah seluruh ledger kini (yang dihitung pagu `LLM_PAGU_USD`). */
  terpakai_ledger_usd: number;
  /** Jumlah entri bertag `penyusun/`. */
  terpakai_penyusun_usd: number;
  pagu_penyusun_usd: number;
  /** Kredit Sectors terpakai menurut buku kas (termasuk saldo pembuka). */
  kredit_terpakai: number;
}

export function ringkasBiaya(akar: string, paguPenyusun: number): RingkasBiaya {
  const ledger = bacaLedger(jalurLedger(akar));
  const jumlah = (xs: readonly EntriLedger[]): number => Math.round(xs.reduce((a, e) => a + e.biaya_usd, 0) * 1e6) / 1e6;
  const buku = bacaBukuKas(jalurBukuKas(akar));
  return {
    terpakai_ledger_usd: jumlah(ledger),
    terpakai_penyusun_usd: jumlah(ledger.filter((e) => e.tag.startsWith(AWALAN_TAG_PENYUSUN))),
    pagu_penyusun_usd: paguPenyusun,
    kredit_terpakai: buku.length === 0 ? SALDO_PEMBUKA : kreditTerpakai(buku),
  };
}

/** Biaya nyata yang tercatat untuk satu awalan tag (mis. satu jalan). */
export function biayaAwalan(akar: string, awalan: string): number {
  const xs = bacaLedger(jalurLedger(akar)).filter((e) => e.tag.startsWith(awalan));
  return Math.round(xs.reduce((a, e) => a + e.biaya_usd, 0) * 1e6) / 1e6;
}
