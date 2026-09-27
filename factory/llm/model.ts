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
