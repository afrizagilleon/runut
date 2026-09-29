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
 * jawaban. Tidak semua penyedia mematuhi `reasoning.max_tokens` (terukur:
 * AtlasCloud untuk DeepSeek), jadi `max_tokens` adalah batas keras yang
 * sesungguhnya. Angkanya ditetapkan dari probe kecil atas bahan TIRT (T-07a,
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

/** Ruang jawaban minimum per peran (token): JSON satu omongan ±1.500; kritikus ±600; tebakan/jawaban kartu ±150. */
export const RUANG_JAWABAN_MIN = { penulis: 4_000, kritikus: 2_000, penebak: 1_000, kartu: 1_000 } as const;

/**
 * Batas M2d-5, dari probe T-07a (16 panggilan, US$0,0636 — data mentah
 * `eval/keluaran-m2d5/probe/probe-penalaran*.json`, putusan
 * `eval/keluaran-m2d5/probe/putusan.md`):
 *
 * - penulis (DeepSeek): penalaran yang selesai 10.866–10.978 token; penyedia
 *   AtlasCloud TIDAK mematuhi `reasoning.max_tokens` (8.000 → berpikir 14.000
 *   sampai habis; 16.000 → berpikir 24.000 sampai habis), penyedia lain
 *   mematuhi. 12.000 menampung penalaran yang terukur; `max_tokens` 20.000
 *   menampung penyedia yang tidak patuh bila ia selesai (±11.400) dan
 *   membatasi ongkos putaran macet (≤ US$0,024 pada harga batas). Terpotong →
 *   cadangan tanpa berpikir.
 * - kritikus (GLM): penalaran terukur 183–608 token (5 panggilan, semua
 *   selesai); 8.000 / 12.000 memberi ruang lebar tanpa membuat perkiraan
 *   maksimum per panggilan melampaui ±US$0,06.
 * - penebak GLM: pada 1.500 GLM hampir tidak berpikir (1 token) — penebak
 *   lemah; pada 3.000 berpikir 425 token dan menjawab. 3.000 / 5.000.
 * - pembaca kartu (DeepSeek, di luar tiga peran D-3 tetapi terukur): tanpa
 *   medan `reasoning` ia berpikir 5.293 token dari batas 8.000 — nyaris
 *   terpotong. Dengan 6.000: 1.037–2.901 token. 6.000 / 12.000.
 */
export const PENALARAN_M2D5 = {
  penulis: { penalaran: 12_000, maxTokens: 20_000 },
  kritikus: { penalaran: 8_000, maxTokens: 12_000 },
  penebakGlm: { penalaran: 3_000, maxTokens: 5_000 },
  kartu: { penalaran: 6_000, maxTokens: 12_000 },
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

/**
 * M2d-6 D-1: GLM WAJIB berpikir. Di M2d-5 `reasoning.max_tokens` hanya BATAS
 * atas, dan penyedia GLM di OpenRouter berpikir 0–260 token. M2d-6 meminta
 * `reasoning.effort` untuk peran penalar GLM (kritikus, penebak GLM) dan
 * MEMBUKTIKANNYA dari respons: `token_penalaran` < `ambang` = tidak sah
 * (`penjaga-penalaran.ts`).
 */
/** M2d-7 D-1: `"max"` (keputusan pemilik; OpenRouter: ±95 % `max_tokens`, tidak boleh digabung dengan `reasoning.max_tokens`). */
export type UpayaPenalaran = 'max' | 'high' | 'medium';

export interface PenalarBerpikir {
  /** `reasoning.effort`. */
  effort: UpayaPenalaran;
  /** `max_tokens` total (penalaran + jawaban). */
  maxTokens: number;
  /** Token penalaran minimum yang membuktikan model berpikir (dari respons). */
  ambang: number;
}

/** Ambang minimum kritikus menurut kontrak M2d-6 D-1 (≥ 500). */
export const AMBANG_MIN_KRITIKUS = 500;

/**
 * Setelan penalar M2d-6, dari probe T-04 (23 panggilan GLM, data mentah
 * `eval/keluaran-m2d6/probe/probe-*.json`, putusan
 * `eval/keluaran-m2d6/probe/putusan.md`):
 *
 * - `effort: "medium"` hampir tidak berpikir (kritikus 20–238 token, penebak
 *   0–175) — sama dengan M2d-5. `"high"` berpikir: kritikus 1.731–11.880
 *   token (7 panggilan, Wafer & PrimeIntellect), penebak 60–685.
 * - kritikus: `max_tokens` 24.000 (penalaran terpanjang 11.880 dari batas
 *   16.000 di probe — terlalu dekat); ambang 1.000 — di atas semua kritikus
 *   yang tidak berpikir (M2d-5 ≤ 260, "medium" ≤ 238) dan di bawah semua
 *   kritikus "high" (≥ 1.731). Kontrak: ≥ 500.
 * - penebak GLM: `max_tokens` 8.000 (keluaran terpanjang 738); ambang 300 —
 *   di atas penebak GLM M2d-5 yang tidak berpikir (0–123) dan di bawah
 *   keluaran penebak GLM Featherless M2d-4 yang berpikir (439–1.463).
 */
export const PENALAR_M2D6 = {
  kritikus: { effort: 'high', maxTokens: 24_000, ambang: 1_000 },
  penebakGlm: { effort: 'high', maxTokens: 8_000, ambang: 300 },
} as const satisfies Record<string, PenalarBerpikir>;

/** Medan badan permintaan untuk satu penalar berpikir (OpenRouter): hanya `effort`. */
export function badanUpaya(p: PenalarBerpikir): Readonly<Record<string, unknown>> {
  return { reasoning: { effort: p.effort } };
}

/**
 * Setelan penalar M2d-7 (kontrak D-1, keputusan pemilik: GLM `effort: "max"`),
 * dari probe T-01 (`eval/keluaran-m2d7/probe/probe-1.json`, 11 panggilan GLM,
 * US$0,257 nyata; putusan `eval/keluaran-m2d7/probe/putusan.md`). Angkanya
 * HASIL aturan `putusanProbe()` (`pengecoh-probe.ts`) atas data itu — dites
 * sama; aturan ditulis sebelum probe dijalankan:
 *
 * - `"max"` diterima penyedia (0 ditolak) dan kritikus berpikir 6.550–10.334
 *   token (3/3 ≥ 1.000) → `"max"`;
 * - kritikus: keluaran terpanjang 10.563 → `max_tokens` 16.000; ambang 1.000
 *   (kontrak: tetap ≥ 1.000);
 * - penebak GLM: penalaran tebakan terbaca 946–7.188, kuartil bawah 1.044 →
 *   ambang 520; dua tebakan habis di 8.000 token tanpa jawaban →
 *   `max_tokens` 12.000.
 */
export const PENALAR_M2D7 = {
  // Jalan 1 TIRT: kedua panggilan kritikus habis di 16.000 (penalaran 16.000/16.002, `length`) — aturan yang sama
  // atas probe + jalan 1 (`kritikusDariJejak`) → 24.000 sebelum jalan 2.
  kritikus: { effort: 'max', maxTokens: 24_000, ambang: 1_000 },
  penebakGlm: { effort: 'max', maxTokens: 12_000, ambang: 520 },
} as const satisfies Record<string, PenalarBerpikir>;
