// Bentuk satu percobaan dan cara menyimpannya. Dipakai ketiga lengan.
//
// Keluaran model disimpan APA ADANYA di field `teks_mentah` dan `respons_mentah`.
// Tidak ada pembersihan, tidak ada perbaikan. Percobaan yang tidak bisa diurai
// atau tidak lolos skema tetap disimpan dan ditandai gagal (aturan pelaporan 3).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { KELUARAN } from './berkas.ts';
import type { MasalahSkema } from './skema-keluaran.ts';

export interface Percobaan {
  lengan: 'A' | 'S' | 'C';
  ulangan: number;
  waktu_mulai: string;
  waktu_selesai: string;
  model: string;
  prompt_sha256: string;
  /** Panjang prompt dalam karakter; promptnya sendiri ada di eval/prompt-*.txt. */
  prompt_panjang: number;
  token_masuk: number;
  token_keluar: number;
  alat_mcp: { nama: string; server: string; gagal: boolean }[];
  kredit_sectors: number;
  stop_reason: string | null;
  teks_mentah: string;
  respons_mentah: unknown;
  urai_ok: boolean;
  alasan_gagal_urai: string | null;
  keluaran: unknown;
  lolos_skema: boolean;
  masalah_skema: MasalahSkema[];
  /** Diisi kalau lengan gagal total (error API, pagu kredit). */
  galat: string | null;
}

export function simpanPercobaan(p: Percobaan): string {
  mkdirSync(KELUARAN, { recursive: true });
  const jalur = join(KELUARAN, `${p.lengan}-${p.ulangan}.json`);
  writeFileSync(jalur, JSON.stringify(p, null, 2) + '\n', 'utf8');
  return jalur;
}
