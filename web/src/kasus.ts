/**
 * Berkas kasus diimpor saat build, bukan diambil lewat jaringan.
 * Itulah cara INV-2 dijaga: aplikasi yang sudah dibangun tidak punya satu pun
 * alamat untuk dihubungi, kecuali pengumpul yang ditentukan saat build (D-7).
 */
import berkas from '@cases/dada-2025-10-08.json';
import type { Fakta, Kasus, Soal } from '../../factory/skema/tipe.ts';

/*
 * JSON tidak membawa tipe persatuan (`status`, `aturan`), jadi bentuknya
 * dikembalikan ke `Kasus` di satu tempat saja. Isinya sudah dijamin:
 * `npm run build:case` menolak menulis berkas yang tidak lolos validator, dan
 * tes `berkas kasus yang ikut repo` menjalankan validator yang sama atas berkas
 * yang benar-benar ikut di repo.
 */
export const KASUS: Kasus = berkas as unknown as Kasus;

export const DAFTAR_KASUS: Kasus[] = [KASUS];

export function indeksFakta(kasus: Kasus): Map<string, Fakta> {
  return new Map(kasus.fakta.map((f) => [f.fact_id, f]));
}

export function faktaTerlihat(kasus: Kasus): Fakta[] {
  const indeks = indeksFakta(kasus);
  return kasus.fakta_terlihat
    .map((id) => indeks.get(id))
    .filter((f): f is Fakta => f !== undefined);
}

export function faktaPembukaan(kasus: Kasus): Fakta[] {
  const indeks = indeksFakta(kasus);
  return kasus.pembukaan.fact_ids
    .map((id) => indeks.get(id))
    .filter((f): f is Fakta => f !== undefined);
}

/** Kartu fakta satu soal, berurutan seperti di berkas kasus. */
export function kartuSoal(kasus: Kasus, soal: Soal): Fakta[] {
  const indeks = indeksFakta(kasus);
  return soal.kartu.map((id) => indeks.get(id)).filter((f): f is Fakta => f !== undefined);
}

export function urutanSoal(kasus: Kasus): string[] {
  return kasus.soal.map((s) => s.soal_id);
}

export function kunciBenar(kasus: Kasus): Record<string, string> {
  const peta: Record<string, string> = {};
  for (const s of kasus.soal) peta[s.soal_id] = s.jawaban;
  return peta;
}

export function petaKartu(kasus: Kasus): Record<string, string[]> {
  const peta: Record<string, string[]> = {};
  for (const s of kasus.soal) peta[s.soal_id] = [...s.kartu];
  return peta;
}
