/**
 * Pemanggil v2 (M2d-16 D-4) — bagian murni. Jalur lama (`pagarM2d7`,
 * `panggilSungguhan`, profil M2d-13/15) tidak diubah; ini berdiri di sampingnya
 * dan dipakai mesin v3 (`alat/penyusun/pemanggil-v3.ts`).
 *
 * (a) Penyedia dikunci per PERAN lewat SATU tabel (`PENYEDIA_PERAN`):
 *     `provider.order = [slug]` + `allow_fallbacks: false`. Audit 3 Okt
 *     (Temuan 12): penebak DeepSeek tersebar di ±20 penyedia, sebagian
 *     berpikir walau penalaran dimatikan; Opus selalu jatuh ke Azure, yang
 *     mengabaikan effort.
 * (b) Jawaban mentah + teks berpikir tiap panggilan → `mentah-panggilan.jsonl`
 *     di folder jalan. Kunci API tidak pernah ditulis (disamarkan).
 * (c) Profil penulis Opus v3: effort "medium", `max_tokens` 128.000.
 * (d) Penjaga biaya: perkiraan pra-kirim WAJAR (2 × median panggilan penulis
 *     Opus tersimpan), bukan maksimum teoretis.
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { samarkan, type PesanChat } from './klien.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM, MODEL_OR_HAIKU, MODEL_OR_OPUS, type ModelOpenRouter } from './model.ts';
import { pagarPenyedia } from './openrouter.ts';
import type { JawabanModel, SetelanPanggil } from './susun.ts';
import type { InfoTemplat, JenisTemplat, PanggilTemplat } from './templat/penulis.ts';
import { PenyediaTidakTersedia } from './templat/penyedia.ts';

/* ---------------------------------------------------------------------- */
/* (a) penyedia per peran                                                  */
/* ---------------------------------------------------------------------- */

export type PeranV2 = 'penulis' | 'penebak-kuat' | 'penebak-haiku' | 'penebak-deepseek' | 'penebak-glm' | 'pembaca-kartu' | 'kritikus';

export interface KunciPenyedia {
  model: ModelOpenRouter;
  /** Jenis panggilan yang dilayani peran ini. */
  jenis: readonly JenisTemplat[];
  /** Slug OpenRouter untuk `provider.order`. */
  slug: string;
  /** Nama penyedia di medan `provider` respons. */
  nama: string;
  alasan: string;
}

/**
 * SATU tabel konfigurasi penyedia. Bukti ledger: entri berstatus 200 bertag
 * `penyusun/m2d1[135]-…`, `m2d11/`, `m2d13/`, `m2d15/` (dihitung `buktiPenyedia`,
 * 3 Okt 2026, ledger 3.370 baris) kecuali disebut lain; angkanya disalin ke
 * `docs/bukti/alat-ukur-v2.md`. Ledger tidak terlacak git, jadi angka di sini
 * adalah salinan tangan dari keluaran `buktiPenyedia` — bukan hal yang dites.
 */
export const PENYEDIA_PERAN: Readonly<Record<PeranV2, KunciPenyedia>> = {
  penulis: {
    model: MODEL_OR_OPUS, jenis: ['tulis-bebas'], slug: 'anthropic', nama: 'Anthropic',
    alasan: 'Kontrak M2d-16 D-4 (a): penyedia pihak pertama. Azure melayani 10/10 panggilan penulis Opus di ledger dan mengabaikan effort "medium" serta reasoning.max_tokens (16.000 token penalaran, 3 panggilan tanpa jawaban). Anthropic BELUM pernah melayani kita — kepatuhan effort di sana belum terbukti; uji-satu-panggilan mengukurnya dulu.',
  },
  'penebak-kuat': {
    model: MODEL_OR_OPUS, jenis: ['gerbang-tebak-kuat'], slug: 'anthropic', nama: 'Anthropic',
    alasan: 'Keputusan reviewer 3 Okt: sama dengan penulis Opus (pihak pertama). Belum ada satu pun panggilan penebak kuat di ledger; audit Opus satu-soal sebelumnya dijalankan sebagai subagent, bukan lewat API.',
  },
  'penebak-haiku': {
    model: MODEL_OR_HAIKU, jenis: ['gerbang-tebak'], slug: 'amazon-bedrock', nama: 'Amazon Bedrock',
    alasan: 'Ledger: 642 dari 642 panggilan penebak Haiku dilayani Amazon Bedrock, 0 token penalaran di semuanya. Mengunci penyedia yang sudah selalu dipakai.',
  },
  'penebak-deepseek': {
    model: MODEL_OR_DEEPSEEK, jenis: ['gerbang-tebak'], slug: 'wafer', nama: 'Wafer',
    alasan: 'M2d-22 (4 Okt): Relace menaikkan harga keluaran ke US$2,4/juta (di atas batas max_price US$1,2) → semua panggilan penebak DeepSeek 404 dan dua percobaan agen (±US$0,98) berjalan tanpa gerbang. Dipindah ke Wafer (US$0,05/0,6; sudah dipakai pembaca kartu DeepSeek). Riwayat: Ledger: penebak DeepSeek tersebar di 22 penyedia (599 panggilan); Relace terbanyak (219) dan 0 dari 219 memakai token penalaran saat penalaran dimatikan. GMICloud: 7 dari 12 panggilan menghabiskan 600 token untuk berpikir → tak terbaca.',
  },
  'penebak-glm': {
    model: MODEL_OR_GLM, jenis: ['gerbang-tebak'], slug: 'wafer', nama: 'Wafer',
    alasan: 'Ledger: 574 dari 575 panggilan penebak GLM dilayani Wafer (effort "minimal", median 33 token penalaran). Mengunci penyedia yang sudah hampir selalu dipakai.',
  },
  'pembaca-kartu': {
    model: MODEL_OR_DEEPSEEK, jenis: ['gerbang-kartu'], slug: 'wafer', nama: 'Wafer',
    alasan: 'Keputusan reviewer 3 Okt (per peran, bukan per model). Pembaca kartu DeepSeek dengan batas penalaran 6.000 — seluruh ledger kini (semua tag gerbang-kartu): Wafer 0 dari 20 panggilan melewati batas, Relace 4 dari 61, InferenceNet 2 dari 35 (sampai 11.856 dari 12.000 token, terpotong); hanya tag M2d-11/13/15 (`buktiPenyedia`): Wafer 0 dari 8, Relace 3 dari 39, InferenceNet 1 dari 21. Bukti Wafer tipis (8–20 panggilan).',
  },
  kritikus: {
    model: MODEL_OR_GLM, jenis: ['kritikus'], slug: 'wafer', nama: 'Wafer',
    alasan: 'Tetap seperti amandemen A-1 M2d-10: Wafer terbukti berpikir (57/57 panggilan kritikus effort "high" ≥ 1.000 token penalaran; di M2d-11/13/15: 7 panggilan, median 6.164).',
  },
};

/** Peran v2 dari jenis panggilan + model. Melempar bila pasangan itu tidak ada di tabel. Murni. */
export function peranV2(info: Pick<InfoTemplat, 'jenis' | 'model'>): PeranV2 {
  for (const [peran, k] of Object.entries(PENYEDIA_PERAN) as Array<[PeranV2, KunciPenyedia]>) {
    if (k.model === info.model && k.jenis.includes(info.jenis)) return peran;
  }
  throw new Error(`Panggilan "${info.jenis}" dengan model ${info.model} tidak punya penyedia terkunci di PENYEDIA_PERAN; tidak dikirim.`);
}

/**
 * Objek `provider` untuk satu peran: pagar M2d-5 (kuantisasi, `max_price` =
 * harga daftar, `require_parameters`, `data_collection: deny`) + HANYA
 * penyedia terkunci (`order` satu slug, `allow_fallbacks: false`). Tanpa
 * `ignore`: ulangan tetap ke penyedia yang sama. Murni.
 */
export function pagarPeranV2(peran: PeranV2): Readonly<Record<string, unknown>> {
  const k = PENYEDIA_PERAN[peran];
  const { allow_fallbacks: _f, ...dasar } = pagarPenyedia(k.model);
  void _f;
  return { ...dasar, order: [k.slug], allow_fallbacks: false };
}

/** Respons dari penyedia lain walau fallback dimatikan → jalan berhenti (tidak pernah dialihkan). */
export function periksaPenyedia(peran: PeranV2, penyedia: string | null | undefined): void {
  const k = PENYEDIA_PERAN[peran];
  if (penyedia !== undefined && penyedia !== null && penyedia !== k.nama) {
    throw new PenyediaTidakTersedia(`${peran} dilayani "${penyedia}", bukan ${k.nama}, walau fallback dimatikan; jalan berhenti.`, k.model);
  }
}

export interface BarisBuktiV2 {
  tag: string;
  model: string;
  penyedia?: string | null;
  status: number | null;
  token_penalaran?: number | null;
  penalaran_diminta?: Readonly<Record<string, unknown>> | null;
}

export interface BuktiPenyedia {
  peran: PeranV2;
  penyedia: string;
  n: number;
  median_penalaran: number;
  maks_penalaran: number;
  /** Penalaran dimatikan (`enabled: false`) tetapi token penalaran > 0. */
  berpikir_saat_dimatikan: number;
  /** Token penalaran > `reasoning.max_tokens` yang diminta. */
  lewat_batas: number;
}

export function median(x: readonly number[]): number {
  const s = [...x].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  return n % 2 === 1 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
}

export const POLA_TAG_BUKTI = /^(penyusun\/m2d1[135]-|m2d11\/|m2d13\/|m2d15\/)/;

/** Hitungan per peran × penyedia dari entri ledger M2d-11/13/15 (status 200). Murni. */
export function buktiPenyedia(entri: readonly BarisBuktiV2[]): BuktiPenyedia[] {
  const peta = new Map<string, { peran: PeranV2; penyedia: string; tp: number[]; mati: number; lewat: number }>();
  for (const e of entri) {
    if (e.status !== 200 || !POLA_TAG_BUKTI.test(e.tag) || typeof e.penyedia !== 'string') continue;
    const jenis = (['gerbang-tebak-kuat', 'gerbang-tebak', 'gerbang-kartu', 'kritikus', 'tulis-bebas', 'tulis-praperiksa'] as const).find((j) => new RegExp(`/${j}(/|$)`).test(e.tag));
    if (jenis === undefined) continue;
    let peran: PeranV2;
    try {
      peran = peranV2({ jenis: jenis === 'tulis-praperiksa' ? 'tulis-bebas' : jenis, model: e.model as ModelOpenRouter });
    } catch {
      continue;
    }
    const kunci = `${peran}|${e.penyedia}`;
    const x = peta.get(kunci) ?? { peran, penyedia: e.penyedia, tp: [], mati: 0, lewat: 0 };
    const tp = typeof e.token_penalaran === 'number' ? e.token_penalaran : 0;
    x.tp.push(tp);
    if (e.penalaran_diminta?.['enabled'] === false && tp > 0) x.mati += 1;
    const batas = e.penalaran_diminta?.['max_tokens'];
    if (typeof batas === 'number' && tp > batas) x.lewat += 1;
    peta.set(kunci, x);
  }
  return [...peta.values()]
    .map((x) => ({ peran: x.peran, penyedia: x.penyedia, n: x.tp.length, median_penalaran: median(x.tp), maks_penalaran: Math.max(0, ...x.tp), berpikir_saat_dimatikan: x.mati, lewat_batas: x.lewat }))
    .sort((a, b) => a.peran.localeCompare(b.peran) || b.n - a.n || a.penyedia.localeCompare(b.penyedia));
}

/* ---------------------------------------------------------------------- */
/* (c) profil penulis Opus v3                                              */
/* ---------------------------------------------------------------------- */

/**
 * Penulis Opus v3. Panduan resmi Opus 5.5: berpikir selalu aktif dan adaptif,
 * tidak ada `budget_tokens`, `effort` satu-satunya pengatur, berpikir dihitung
 * ke `max_tokens`, teks berpikir kosong kecuali diminta.
 *
 * - effort "medium" (bawaan model);
 * - `max_tokens` 128.000 = maksimum model, BUKAN pembatas praktis (keputusan
 *   pemilik 3 Okt: jangan batasi token Opus). Kemungkinan terburuk bila
 *   seluruh jendela terpakai: 128.000 × US$20/juta ≈ US$2,56 per panggilan;
 * - TANPA `reasoning.max_tokens` (terbukti diabaikan di M2d-15, dan model ini
 *   tidak punya anggaran berpikir);
 * - `exclude: false` = teks berpikir (ringkasan) diminta dan disimpan;
 * - suhu 1 (syarat model saat berpikir).
 */
export const SETELAN_PENULIS_OPUS_V3: SetelanPanggil = { suhu: 1, tanpaSuhu: true, maxTokens: 128_000, tambahanBadan: { reasoning: { effort: 'medium', exclude: false } } };

/* ---------------------------------------------------------------------- */
/* (d) penjaga biaya                                                       */
/* ---------------------------------------------------------------------- */

/**
 * Perkiraan pra-kirim wajar satu panggilan Opus = 2 × median biaya nyata 10
 * panggilan penulis Opus tersimpan (M2d-13: 4, M2d-15: 6; median US$0,18932;
 * termasuk 3 panggilan terpotong US$0,366752). Dites sama dengan
 * `biayaPenulisOpusTersimpan`. Dipakai juga untuk penebak kuat Opus (belum ada
 * data; panggilan satu soal effort "low" seharusnya jauh lebih murah, jadi ini
 * berlebih — aman).
 */
export const BIAYA_WAJAR_OPUS_USD = 0.37864;

/** `OpsiPencatat.perkiraanWajar` untuk mesin v3: Opus → wajar; model lain → maksimum teoretis (kecil). */
export function perkiraanWajarV2(model: string): number | null {
  return model === MODEL_OR_OPUS ? BIAYA_WAJAR_OPUS_USD : null;
}

/** Biaya nyata tiap panggilan penulis Opus tersimpan (`jejak-agen.json` jalan `m2d1[35]-opus-*`). */
export function biayaPenulisOpusTersimpan(akar: string): number[] {
  const folder = `${akar}eval/penyusun`;
  const hasil: number[] = [];
  for (const f of readdirSync(folder).filter((x) => /^m2d1[35]-opus-\d+$/.test(x)).sort()) {
    const jalur = `${folder}/${f}/jejak-agen.json`;
    if (!existsSync(jalur)) continue;
    const j = JSON.parse(readFileSync(jalur, 'utf8')) as { langkah?: Array<{ peran?: string; panggilan?: number; biaya_usd?: number }> };
    for (const l of j.langkah ?? []) if (l.peran === 'penulis' && (l.panggilan ?? 0) > 0 && typeof l.biaya_usd === 'number') hasil.push(l.biaya_usd);
  }
  return hasil;
}

/* ---------------------------------------------------------------------- */
/* (b) jawaban mentah + teks berpikir                                      */
/* ---------------------------------------------------------------------- */

/** Tag ledger/mentah v2. Murni. */
export function tagV2(awalan: string, info: Pick<InfoTemplat, 'jenis' | 'putaran' | 'omongan' | 'ke' | 'ulang'>): string {
  const o = info.omongan === null ? '' : `/o${String(info.omongan)}`;
  const ke = info.jenis === 'gerbang-tebak' ? `/t${String(info.ke)}` : info.jenis === 'gerbang-tebak-kuat' || info.jenis === 'gerbang-kartu' ? `/r${String(info.ke)}` : '';
  const ulang = info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : '';
  return `${awalan}p${String(info.putaran)}/${info.jenis}${o}${ke}${ulang}`;
}

/** Satu baris `mentah-panggilan.jsonl`. Tidak memuat header maupun kunci. */
export interface BarisMentah {
  waktu: string;
  tag: string;
  peran: PeranV2 | null;
  jenis: JenisTemplat;
  model: string;
  penyedia: string | null;
  token_masuk: number;
  token_keluar: number;
  token_penalaran: number | null;
  finish_reason: string | null;
  biaya_usd: number;
  latensi_ms: number;
  /** Medan `reasoning` yang diminta dan `max_tokens` panggilan ini. */
  penalaran_diminta: Readonly<Record<string, unknown>> | null;
  max_tokens: number;
  /** Pesan yang dikirim (prompt), apa adanya — supaya tiap prompt bisa dibaca reviewer. */
  prompt: PesanChat[];
  /** Jawaban mentah model, apa adanya (rahasia disamarkan). */
  isi: string;
  /** Teks berpikir yang dikembalikan penyedia (ringkasan untuk Opus); `null` bila tidak ada. */
  penalaran: string | null;
  ada_penalaran: boolean;
}

export class PencatatMentah {
  readonly jalur: string;
  private readonly rahasia: readonly string[];
  private readonly jam: () => Date;
  constructor(jalur: string, rahasia: readonly string[], jam: () => Date = () => new Date()) {
    this.jalur = jalur;
    this.rahasia = rahasia;
    this.jam = jam;
  }

  catat(tag: string, peran: PeranV2 | null, info: Pick<InfoTemplat, 'jenis' | 'model'>, setelan: SetelanPanggil, j: JawabanModel, pesan: readonly PesanChat[] = []): BarisMentah {
    const pikir = typeof j.penalaran === 'string' && j.penalaran.trim() !== '' ? samarkan(j.penalaran, this.rahasia) : null;
    const r = setelan.tambahanBadan?.['reasoning'];
    const baris: BarisMentah = {
      waktu: this.jam().toISOString(), tag, peran, jenis: info.jenis, model: info.model, penyedia: j.penyedia ?? null,
      token_masuk: j.token_masuk, token_keluar: j.token_keluar, token_penalaran: j.token_penalaran ?? null, finish_reason: j.finish_reason, biaya_usd: j.biaya_usd, latensi_ms: j.latensi_ms,
      penalaran_diminta: typeof r === 'object' && r !== null ? (r as Record<string, unknown>) : null, max_tokens: setelan.maxTokens,
      prompt: pesan.map((x) => ({ role: x.role, content: samarkan(x.content, this.rahasia) })),
      isi: samarkan(j.teks, this.rahasia), penalaran: pikir, ada_penalaran: pikir !== null,
    };
    mkdirSync(dirname(this.jalur), { recursive: true });
    appendFileSync(this.jalur, `${JSON.stringify(baris)}\n`, 'utf8');
    return baris;
  }
}

/** Bungkus pemanggil apa pun (sungguhan atau palsu): tiap jawaban ditulis ke `mentah-panggilan.jsonl`. */
export function denganMentah(panggil: PanggilTemplat, pencatat: PencatatMentah, awalanTag: string): PanggilTemplat {
  return async (pesan: PesanChat[], setelan, info) => {
    const j = await panggil(pesan, setelan, info);
    let peran: PeranV2 | null = null;
    try {
      peran = peranV2(info);
    } catch {
      peran = null;
    }
    pencatat.catat(tagV2(awalanTag, info), peran, info, setelan, j, pesan);
    return j;
  };
}
