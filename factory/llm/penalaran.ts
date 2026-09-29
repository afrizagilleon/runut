/**
 * Batas penalaran M2d-5 (kontrak D-3): `reasoning.max_tokens` untuk penulis,
 * kritikus, dan penebak GLM, dengan `max_tokens` total yang menyisakan ruang
 * jawaban.
 *
 * Kenapa: di M2d-4 (Featherless, tanpa batas penalaran) kritikus GLM
 * terpotong 14 dari 44 panggilan di 24.576 token dan memakan 69 % biaya;
 * penulis DeepSeek terpotong di 32.768 token 25 kali; penebak GLM pernah
 * berputar sampai habis 16.000 token. Jawaban yang terpotong atau kosong
 * karena penalaran habis TETAP ditagih — ia dibaca "terpotong" (kritikus:
 * tidak menjawab; penulis: cadangan tanpa berpikir; penebak/pembaca kartu:
 * tak terbaca), biayanya tercatat dari `usage.cost`.
 *
 * Di OpenRouter, `reasoning.max_tokens` dan jawaban berbagi anggaran
 * `max_tokens` yang sama; `max_tokens − reasoning.max_tokens` adalah ruang
 * jawaban. Angkanya ditetapkan dari probe kecil atas bahan TIRT (T-07a,
 * `eval/keluaran-m2d5/probe/`); putusan dan datanya di laporan
 * `docs/bukti/lingkar-agen-tirt.md`.
 */
import type { SetelanPanggil } from './susun.ts';

export interface BatasPenalaran {
  /** `reasoning.max_tokens`. */
  penalaran: number;
  /** `max_tokens` total (penalaran + jawaban). */
  maxTokens: number;
}

/** Ruang jawaban minimum per peran (token): JSON satu omongan ±1.500; kritikus ±600; tebakan ±150. */
export const RUANG_JAWABAN_MIN = { penulis: 4_000, kritikus: 2_000, penebak: 1_000 } as const;

/**
 * Batas M2d-5. Angka sementara T-02; diganti angka dari probe T-07a
 * (lihat riwayat berkas ini dan `eval/keluaran-m2d5/probe/`).
 */
export const PENALARAN_M2D5 = {
  penulis: { penalaran: 16_000, maxTokens: 24_000 },
  kritikus: { penalaran: 12_000, maxTokens: 16_000 },
  penebakGlm: { penalaran: 3_000, maxTokens: 6_000 },
} as const satisfies Record<string, BatasPenalaran>;

/** `max_tokens` cadangan penulis tanpa berpikir (sama dengan M2d-2…M2d-4). */
export const MAX_TOKENS_CADANGAN_M2D5 = 8_000;

/** Medan badan permintaan untuk satu batas penalaran (OpenRouter). */
export function badanPenalaran(b: BatasPenalaran): Readonly<Record<string, unknown>> {
  return { reasoning: { max_tokens: b.penalaran } };
}

/** Setelan panggilan dengan batas penalaran. */
export function setelanPenalaran(suhu: number, b: BatasPenalaran): SetelanPanggil {
  if (b.maxTokens <= b.penalaran) throw new Error('max_tokens harus lebih besar dari reasoning.max_tokens (ruang jawaban).');
  return { suhu, maxTokens: b.maxTokens, tambahanBadan: badanPenalaran(b) };
}

/** Cadangan penulis TANPA berpikir di OpenRouter: `reasoning.enabled: false`. */
export function setelanTanpaPenalaran(suhu: number, maxTokens: number = MAX_TOKENS_CADANGAN_M2D5): SetelanPanggil {
  return { suhu, maxTokens, tambahanBadan: { reasoning: { enabled: false } } };
}
