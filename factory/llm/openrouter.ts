/**
 * OpenRouter (M2d-5 D-0, D-1): pagar penyedia dan pemeriksaan kunci.
 *
 * **Pagar penyedia (D-1).** OpenRouter meneruskan satu model ke banyak
 * penyedia; tanpa pagar ia bisa memilih versi kuantisasi 4-bit atau penyedia
 * yang jauh lebih mahal. Setiap permintaan M2d-5 membawa objek `provider`
 * yang sama bentuknya, dibangun HANYA di sini:
 *
 * - `quantizations`: fp8 ke atas + `unknown` (penyedia yang tidak
 *   menyebutkan kuantisasinya — termasuk penyedia resmi DeepSeek). fp4,
 *   mxfp4, nvfp4, int4, int8, fp6 ditolak.
 * - `max_price`: batas harga per juta token = `HARGA` (`harga.ts`), angka
 *   yang sama dengan perkiraan pagu sebelum kirim.
 * - `require_parameters: true`: hanya penyedia yang mendukung SEMUA parameter
 *   di badan (mis. `reasoning`) — batas penalaran tidak diabaikan diam-diam.
 * - `data_collection: "deny"`, `allow_fallbacks: true`, tanpa `sort`.
 *
 * Klien (`klien.ts`) memasang objek ini SESUDAH `tambahanBadan`, jadi setelan
 * peran tidak bisa menimpa atau menghapusnya.
 *
 * **Pemeriksaan kunci (D-0).** `GET /key` (tanpa biaya) — yang dicetak hanya
 * status dan angka batas/pemakaian, tidak pernah kunci.
 */
import { HARGA } from './harga.ts';
import { GalatLlm, samarkan, type KonfigKlien } from './klien.ts';
import { MODEL_OPENROUTER, type ModelOpenRouter } from './model.ts';

/** `LLM_BASE_URL` yang diharapkan M2d-5. */
export const BASE_URL_OPENROUTER = 'https://openrouter.ai/api/v1';

/** Kuantisasi yang boleh (D-1). Selain ini — fp4, mxfp4, nvfp4, int4, int8, fp6 — ditolak. */
export const KUANTISASI_BOLEH = ['fp8', 'mxfp8', 'fp16', 'bf16', 'fp32', 'unknown'] as const;
/** Kuantisasi yang dikenal OpenRouter tetapi ditolak (untuk tes & laporan). */
export const KUANTISASI_DITOLAK = ['fp4', 'mxfp4', 'nvfp4', 'int4', 'int8', 'fp6'] as const;

export type PagarPenyedia = {
  quantizations: string[];
  max_price: { prompt: number; completion: number };
  require_parameters: true;
  data_collection: 'deny';
  allow_fallbacks: true;
};

export function modelOpenRouter(model: string): model is ModelOpenRouter {
  return (MODEL_OPENROUTER as readonly string[]).includes(model);
}

/**
 * Objek `provider` untuk satu model. Melempar untuk model di luar dua model
 * kontrak — termasuk varian bersufiks (`…:floor`, `…:nitro`, `…:free`).
 */
export function pagarPenyedia(model: string): PagarPenyedia {
  if (model.includes(':')) {
    throw new Error(`Model "${model}" memakai sufiks varian; M2d-5 hanya memakai ID tanpa sufiks (tanpa :floor/:nitro).`);
  }
  if (!modelOpenRouter(model)) {
    throw new Error(`Model "${model}" bukan model OpenRouter M2d-5 (${MODEL_OPENROUTER.join(', ')}).`);
  }
  const h = HARGA[model];
  return {
    quantizations: [...KUANTISASI_BOLEH],
    max_price: { prompt: h.masuk, completion: h.keluar },
    require_parameters: true,
    data_collection: 'deny',
    allow_fallbacks: true,
  };
}

/** Ringkasan kunci yang boleh dicetak: status dan angka, tanpa label atau kunci. */
export interface InfoKunci {
  status: number;
  limit: number | null;
  limit_remaining: number | null;
  usage: number | null;
  usage_daily: number | null;
  is_free_tier: boolean | null;
}

function angkaAtauNull(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

/**
 * `GET ${baseUrl}/key` — tanpa biaya. Melempar `GalatLlm` tersamar bila kunci
 * ditolak (401/403) atau jaringan gagal. Label kunci TIDAK dikembalikan.
 */
export async function periksaKunci(konfig: KonfigKlien): Promise<InfoKunci> {
  const ambil = konfig.fetch ?? fetch;
  const rahasia = [konfig.apiKey];
  let respons: Response;
  try {
    respons = await ambil(`${konfig.baseUrl.replace(/\/+$/, '')}/key`, {
      method: 'GET',
      headers: { authorization: `Bearer ${konfig.apiKey}` },
      signal: AbortSignal.timeout(konfig.batasWaktuMs ?? 60_000),
    });
  } catch (galat) {
    const nama = galat instanceof Error ? galat.name : 'galat';
    throw new GalatLlm(samarkan(`GET /key gagal: galat jaringan (${nama}).`, rahasia), null);
  }
  const teks = await respons.text();
  if (!respons.ok) {
    throw new GalatLlm(samarkan(`GET /key gagal: HTTP ${String(respons.status)} — ${teks.slice(0, 200)}`, rahasia), respons.status);
  }
  let data: Record<string, unknown> = {};
  try {
    const j = JSON.parse(teks) as { data?: Record<string, unknown> };
    data = j.data ?? {};
  } catch {
    throw new GalatLlm('GET /key: respons bukan JSON.', respons.status);
  }
  return {
    status: respons.status,
    limit: angkaAtauNull(data['limit']),
    limit_remaining: angkaAtauNull(data['limit_remaining']),
    usage: angkaAtauNull(data['usage']),
    usage_daily: angkaAtauNull(data['usage_daily']),
    is_free_tier: typeof data['is_free_tier'] === 'boolean' ? data['is_free_tier'] : null,
  };
}

/** Satu penyedia untuk satu model, dari `GET /models/<id>/endpoints` (tanpa biaya). */
export interface EndpointModel {
  provider_name: string;
  tag: string | null;
  quantization: string | null;
  prompt_per_juta: number | null;
  completion_per_juta: number | null;
  supported_parameters: string[];
  max_completion_tokens: number | null;
}

/** Apakah satu penyedia lolos pagar `pagarPenyedia(model)` untuk parameter yang dipakai. */
export function lolosPagar(e: EndpointModel, pagar: PagarPenyedia, parameter: readonly string[]): boolean {
  const q = e.quantization ?? 'unknown';
  if (!pagar.quantizations.includes(q)) return false;
  if (e.prompt_per_juta === null || e.completion_per_juta === null) return false;
  if (e.prompt_per_juta > pagar.max_price.prompt + 1e-9 || e.completion_per_juta > pagar.max_price.completion + 1e-9) return false;
  return parameter.every((p) => e.supported_parameters.includes(p));
}

/** `GET ${baseUrl}/models/<model>/endpoints` — tanpa biaya; hanya medan yang dipakai. */
export async function daftarEndpoint(konfig: KonfigKlien, model: string): Promise<EndpointModel[]> {
  const ambil = konfig.fetch ?? fetch;
  const rahasia = [konfig.apiKey];
  const respons = await ambil(`${konfig.baseUrl.replace(/\/+$/, '')}/models/${model}/endpoints`, {
    method: 'GET',
    headers: { authorization: `Bearer ${konfig.apiKey}` },
    signal: AbortSignal.timeout(konfig.batasWaktuMs ?? 60_000),
  });
  const teks = await respons.text();
  if (!respons.ok) {
    throw new GalatLlm(samarkan(`GET endpoints ${model} gagal: HTTP ${String(respons.status)} — ${teks.slice(0, 200)}`, rahasia), respons.status);
  }
  const j = JSON.parse(teks) as { data?: { endpoints?: Array<Record<string, unknown>> } };
  return (j.data?.endpoints ?? []).map((e) => {
    const harga = (e['pricing'] ?? {}) as Record<string, unknown>;
    const perJuta = (x: unknown): number | null => {
      const n = typeof x === 'string' ? Number(x) : typeof x === 'number' ? x : Number.NaN;
      return Number.isFinite(n) ? Math.round(n * 1_000_000 * 1e6) / 1e6 : null;
    };
    return {
      provider_name: typeof e['provider_name'] === 'string' ? e['provider_name'] : '?',
      tag: typeof e['tag'] === 'string' ? e['tag'] : null,
      quantization: typeof e['quantization'] === 'string' ? e['quantization'] : null,
      prompt_per_juta: perJuta(harga['prompt']),
      completion_per_juta: perJuta(harga['completion']),
      supported_parameters: Array.isArray(e['supported_parameters']) ? (e['supported_parameters'] as unknown[]).filter((x): x is string => typeof x === 'string') : [],
      max_completion_tokens: angkaAtauNull(e['max_completion_tokens']),
    };
  });
}
