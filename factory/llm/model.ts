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

/**
 * Model kritikus M2d-3 (`factory/llm/peran.md`): GLM-5.3, model penalaran
 * yang BERBEDA dari penulis — penulis tidak boleh menilai karyanya sendiri.
 * Kontrak M2d-3 hanya membolehkan dua model ini.
 */
export const MODEL_KRITIKUS: ModelTanding = 'zai-org/GLM-5.3';

/** Peran yang memanggil model di lingkar M2d-3; perencana dan pemeriksa adalah kode. */
export type PeranModel = 'penulis' | 'penebak' | 'pembaca-kartu' | 'kritikus';

/** Satu-satunya tempat pemetaan peran → model M2d-3. */
export const MODEL_PERAN: Readonly<Record<PeranModel, ModelTanding>> = {
  penulis: MODEL_AGEN,
  penebak: MODEL_AGEN,
  'pembaca-kartu': MODEL_AGEN,
  kritikus: MODEL_KRITIKUS,
};

/** Model yang boleh dipanggil M2d-3 (dicek lagi oleh skrip sebelum setiap panggilan). */
export const MODEL_M2D3: readonly ModelTanding[] = [MODEL_AGEN, MODEL_KRITIKUS];

/**
 * Penebak M2d-4 (D-5), menurut urutan tebakan ke-1..3: dua DeepSeek + satu
 * GLM-5.3 (penalaran). Di M2d-3 penebak DeepSeek — model yang sama dengan
 * penulis — jauh lebih lunak dari penguji Opus di luar (5 dari 8 omongan yang
 * lolos di dalam tertebak di luar). Ketiganya tetap TANPA kartu.
 */
export const MODEL_PENEBAK_M2D4: readonly ModelTanding[] = [MODEL_AGEN, MODEL_AGEN, MODEL_KRITIKUS];

/** Model yang boleh dipanggil M2d-4 — sama dengan M2d-3. */
export const MODEL_M2D4: readonly ModelTanding[] = [MODEL_AGEN, MODEL_KRITIKUS];
