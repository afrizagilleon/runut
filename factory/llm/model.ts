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

/**
 * Model OpenRouter M2d-5 (keputusan pemilik 29–30 Sep: pindah dari Featherless
 * ke OpenRouter). Hanya dua model, TANPA sufiks varian (`:floor`, `:nitro`,
 * dll.) — `pagarPenyedia()` di `openrouter.ts` menolak ID lain.
 * DeepSeek: penulis, pembaca kartu, penebak ke-1 dan ke-2. GLM: kritikus,
 * penebak ke-3.
 */
export const MODEL_OR_DEEPSEEK = 'deepseek/deepseek-v4.1-flash' as const;
export const MODEL_OR_GLM = 'z-ai/glm-5.3' as const;
/**
 * M2d-10 (keputusan pemilik 30 Sep malam): model ketiga Claude Haiku 4.5 —
 * penyempurna struktur pilihan dan salah satu penebak keluarga campur (mesin
 * templat). Harga daftar $1/$5 per juta (`harga.ts`).
 */
export const MODEL_OR_HAIKU = 'anthropic/claude-haiku-4.5' as const;
/**
 * M2d-13 (kontrak, pemilik 2 Okt): Claude Opus 5.5 HANYA sebagai penulis bebas
 * (`factory/llm/bebas/`), tanpa sufiks. Harga daftar $4/$20 per juta (`harga.ts`).
 */
export const MODEL_OR_OPUS = 'anthropic/claude-opus-5.5' as const;
export const MODEL_OPENROUTER = [MODEL_OR_DEEPSEEK, MODEL_OR_GLM, MODEL_OR_HAIKU, MODEL_OR_OPUS] as const;
/** Dua model M2d-5…M2d-9 (lingkar pengecoh); skrip lama tetap hanya boleh memanggil keduanya. */
export const MODEL_DUA: readonly string[] = [MODEL_OR_DEEPSEEK, MODEL_OR_GLM];
export type ModelOpenRouter = (typeof MODEL_OPENROUTER)[number];

/** Model apa pun yang pernah dipanggil lingkar (Featherless M2d-1…M2d-4, OpenRouter M2d-5). */
export type ModelLingkar = ModelTanding | ModelOpenRouter;

/** Pemetaan peran → model M2d-5 (OpenRouter). Satu-satunya tempatnya. */
export const MODEL_PERAN_M2D5: Readonly<Record<PeranModel, ModelOpenRouter>> = {
  penulis: MODEL_OR_DEEPSEEK,
  penebak: MODEL_OR_DEEPSEEK,
  'pembaca-kartu': MODEL_OR_DEEPSEEK,
  kritikus: MODEL_OR_GLM,
};

/** Penebak M2d-5 menurut urutan tebakan ke-1..3: DeepSeek, DeepSeek, GLM (sama dengan M2d-4). */
export const MODEL_PENEBAK_M2D5: readonly ModelOpenRouter[] = [MODEL_OR_DEEPSEEK, MODEL_OR_DEEPSEEK, MODEL_OR_GLM];

/** Model yang boleh dipanggil M2d-5. */
export const MODEL_M2D5: readonly ModelOpenRouter[] = [MODEL_OR_DEEPSEEK, MODEL_OR_GLM];
