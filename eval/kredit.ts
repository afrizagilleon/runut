// T-02 — Pencatat kredit Sectors.
//
// Pagu milestone ini 150 kredit (D-7). Setiap panggilan alat MCP Sectors
// dihitung satu kredit; itu ASUMSI yang dicatat terbuka di sini karena
// penyedia tidak mengembalikan sisa kuota di responsnya. Kalau asumsinya
// salah, angka OQ-3 harus dikalikan, bukan diabaikan.
//
// Pencatat ini juga dipakai untuk penarikan data biasa (REST), satu
// panggilan = satu kredit.

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVAL } from './berkas.ts';

export const PAGU_KREDIT = 150;

export interface CatatanKredit {
  waktu: string;
  lengan: string;
  keterangan: string;
  alat: string[];
  kredit: number;
}

export interface IsiLedger {
  pagu: number;
  asumsi: string;
  catatan: CatatanKredit[];
}

const JALUR = join(EVAL, 'kredit.json');

export function muatLedger(): IsiLedger {
  if (!existsSync(JALUR)) {
    return {
      pagu: PAGU_KREDIT,
      asumsi: 'satu panggilan alat MCP Sectors = satu kredit (tidak dikonfirmasi penyedia)',
      catatan: [],
    };
  }
  return JSON.parse(readFileSync(JALUR, 'utf8')) as IsiLedger;
}

function simpanLedger(isi: IsiLedger): void {
  writeFileSync(JALUR, JSON.stringify(isi, null, 2) + '\n', 'utf8');
}

export function totalKredit(isi: IsiLedger = muatLedger()): number {
  return isi.catatan.reduce((a, c) => a + c.kredit, 0);
}

export function sisaKredit(isi: IsiLedger = muatLedger()): number {
  return isi.pagu - totalKredit(isi);
}

/** Catat pemakaian kredit. Mengembalikan total setelah dicatat. */
export function catatKredit(entri: Omit<CatatanKredit, 'waktu'>): number {
  const isi = muatLedger();
  isi.catatan.push({ waktu: new Date().toISOString(), ...entri });
  simpanLedger(isi);
  return totalKredit(isi);
}

/**
 * Benar kalau masih ada ruang untuk satu percobaan lagi dengan perkiraan
 * biaya `perkiraan`. Pemanggil WAJIB berhenti kalau ini salah, dan melaporkan
 * berapa percobaan yang sudah selesai (RQ-05).
 */
export function masihMuat(perkiraan: number): boolean {
  return sisaKredit() >= perkiraan;
}

export function ringkasanKredit(): string {
  const isi = muatLedger();
  const perLengan = new Map<string, number>();
  for (const c of isi.catatan) perLengan.set(c.lengan, (perLengan.get(c.lengan) ?? 0) + c.kredit);
  const baris = [...perLengan.entries()].map(([l, k]) => `  ${l}: ${k}`).join('\n');
  return `kredit terpakai ${totalKredit(isi)} / pagu ${isi.pagu} (sisa ${sisaKredit(isi)})\n${baris}`;
}
