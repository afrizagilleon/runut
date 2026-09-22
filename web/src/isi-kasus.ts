/**
 * Pembacaan isi satu berkas kasus — fungsi murni, tanpa satu pun berkas kasus.
 *
 * Dipisahkan dari `kasus.ts` di M4 karena alasan yang bisa diukur: `kasus.ts`
 * mengimpor berkas JSON yang sungguhan, sehingga setiap modul yang hanya butuh
 * "ambil urutan soal dari sebuah Kasus" ikut menyeret seluruh isi kasus ke
 * dalam dirinya — termasuk berkas tes yang sebetulnya memakai kasus buatan.
 *
 * `kasus.ts` meneruskan semuanya kembali, jadi tidak ada pemanggil lama yang
 * perlu berubah.
 */
import type { Fakta, Kasus, Soal } from '../../factory/skema/tipe.ts';

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
