/**
 * Penjaga penalaran (M2d-6 D-1): panggilan GLM berperan PENALAR (kritikus,
 * penebak GLM) hanya sah bila penyedianya MEMBUKTIKAN bahwa model berpikir.
 *
 * Kenapa: di M2d-5 medan `reasoning` dikirim, tetapi GLM-5.3 di OpenRouter
 * hampir tidak berpikir — kritikus 33–260 token penalaran (di Featherless
 * median ±15.700), penebak GLM 0–123. Kritikus tidak mengajukan satu
 * keberatan pun di 9 putusan. Gerbang yang tampak ada tetapi tidak bekerja
 * lebih berbahaya daripada tidak ada gerbang.
 *
 * Buktinya dibaca dari RESPONS (`usage.completion_tokens_details.
 * reasoning_tokens`), bukan dari badan permintaan: permintaan `effort: "high"`
 * tidak membuktikan apa-apa. Aturannya:
 *
 * - `token_penalaran` < ambang peran, ATAU tidak dilaporkan (`null`) =
 *   **tidak sah** — tidak ada bukti berpikir;
 * - panggilan tidak sah diulang SEKALI, dengan penyedia yang baru saja
 *   melayani dimasukkan ke `provider.ignore` (penyedia lain bila bisa);
 * - bila ulangan juga tidak sah → diperlakukan seperti peran itu tidak
 *   menjawab (aturan M2d-3): kritikus → "tidak menjawab" (menolak, versi
 *   dibawa ke putaran berikutnya); penebak → tebakan tak terbaca, dihitung
 *   BENAR/100 (menolak).
 *
 * Jawaban yang tidak sah tetap dibayar dan tercatat di ledger (dengan
 * `penalaran_sah: false`) dan di jejak; isinya tidak pernah dibaca.
 */
import type { SetelanPanggil } from './susun.ts';

/** Jawaban minimum yang diperiksa penjaga. */
export interface BuktiPenalaran {
  token_penalaran?: number | null;
  penyedia?: string | null;
}

/** Sah bila penyedia melaporkan token penalaran ≥ ambang. `null`/tidak ada = tidak terbukti. */
export function penalaranSah(j: BuktiPenalaran, ambang: number): boolean {
  const t = j.token_penalaran;
  return typeof t === 'number' && Number.isFinite(t) && t >= ambang;
}

/** Kalimat alasan untuk jejak/umpan (tanpa isi jawaban). */
export function alasanTidakSah(j: BuktiPenalaran, ambang: number): string {
  const t = j.token_penalaran;
  return (
    `penalaran tidak terbukti: ${typeof t === 'number' ? `${String(t)} token` : 'token penalaran tidak dilaporkan'} ` +
    `< ambang ${String(ambang)} (penyedia ${j.penyedia ?? '?'})`
  );
}

/**
 * Setelan untuk ulangan sesudah jawaban tidak sah: penyedia yang baru saja
 * melayani ditambahkan ke `abaikanPenyedia` (menjadi `provider.ignore`).
 */
export function setelanUlang(setelan: SetelanPanggil, j: BuktiPenalaran): SetelanPanggil {
  const p = j.penyedia;
  if (p === null || p === undefined || p === '') return setelan;
  const lama = setelan.abaikanPenyedia ?? [];
  return lama.includes(p) ? setelan : { ...setelan, abaikanPenyedia: [...lama, p] };
}
