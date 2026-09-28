/**
 * Tiga model uji tanding, dipilih pemilik (M2d §0). Tidak ada model lain yang
 * boleh dipanggil milestone ini; `tanding.ts` dan `cek-model.ts` hanya membaca
 * daftar ini, dan `pagu.ts` menolak model yang tidak punya baris harga.
 */
export const MODEL_TANDING = [
  'deepseek-ai/DeepSeek-V4.1-Flash',
  'zai-org/GLM-5.3-Flash',
  'zai-org/GLM-5.3',
] as const;

export type ModelTanding = (typeof MODEL_TANDING)[number];

/**
 * Model lingkar agen M2d-2 — penyusun DAN penebak. Pemenang uji tanding M2d-1
 * (`docs/bukti/uji-tanding-model.md`: lolos validator 6/6, ±US$0,007 per
 * simulasi, ±25 detik per panggilan). Kontrak M2d-2 melarang model lain.
 */
export const MODEL_AGEN: ModelTanding = 'deepseek-ai/DeepSeek-V4.1-Flash';
