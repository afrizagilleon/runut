/**
 * Pengecualian penyedia BERDASAR BUKTI (M2d-6 D-2).
 *
 * `provider.ignore` hanya boleh memuat penyedia yang di ledger M2d-5/M2d-6
 * TERBUKTI melanggar — bukan dugaan, bukan nama yang "terasa" buruk. Daftar
 * `PENYEDIA_DIKECUALIKAN` di bawah HARUS sama dengan hasil
 * `turunkanPengecualian()` atas cuplikan ledger yang terlacak di repo
 * (`eval/keluaran-m2d6/bukti-penyedia.json`, ditulis `npm run penalar:bukti`
 * dari `.cache/llm/ledger.jsonl`); tesnya memeriksa keduanya, dan memeriksa
 * bahwa setiap baris cuplikan memang ada di ledger bila ledger tersedia.
 *
 * Dua jenis pelanggaran:
 *
 * - **melewati batas penalaran** (DeepSeek, M2d-5): `reasoning.max_tokens`
 *   diminta, tetapi `token_penalaran` > batas itu (terukur: berpikir sampai
 *   `max_tokens` habis, jawaban kosong, tetap ditagih);
 * - **tidak berpikir** (GLM, M2d-6): `reasoning.effort` diminta, tetapi
 *   `token_penalaran` < ambang peran (`PENALAR_M2D6`), atau tidak dilaporkan.
 *
 * Penyedia dikecualikan untuk satu model bila pelanggarannya ≥
 * `MIN_PELANGGARAN` DAN ≥ `MIN_PORSI` dari panggilan yang bisa melanggar
 * (yang memang meminta batas/effort) — satu kejadian bisa kebetulan.
 *
 * Ledger M2d-5 belum mencatat medan `reasoning` yang diminta; untuk entri itu
 * `dimintaM2d5()` menurunkannya dari tag + setelan M2d-5 yang terlacak
 * (`PENALARAN_M2D5`, `tirt-probe.ts`). Ledger M2d-6 mencatatnya sendiri
 * (`penalaran_diminta`).
 */
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import { pagarPenyediaM2d6, slugPenyedia } from './openrouter.ts';
import type { EntriLedger } from './pagu.ts';
import { PENALARAN_M2D5, PENALAR_M2D6 } from './penalaran.ts';

export const MIN_PELANGGARAN = 2;
export const MIN_PORSI = 1 / 3;

/** Satu baris bukti: medan ledger yang dipakai, tanpa galat atau isi. */
export interface BarisBukti {
  waktu: string;
  tag: string;
  model: string;
  penyedia: string | null;
  status: number | null;
  token_keluar: number | null;
  token_penalaran: number | null;
  /** `reasoning` yang diminta (dari ledger M2d-6, atau diturunkan dari tag untuk M2d-5); `null` = tidak diminta. */
  penalaran_diminta: Readonly<Record<string, unknown>> | null;
  /** Asal medan `penalaran_diminta`. */
  asal_diminta: 'ledger' | 'tag-m2d5';
}

/**
 * `reasoning` yang dikirim untuk satu tag M2d-5, dari setelan M2d-5 yang
 * terlacak. `null` = tanpa medan `reasoning` (penebak DeepSeek, probe
 * "bawaan").
 */
export function dimintaM2d5(tag: string): Readonly<Record<string, unknown>> | null {
  if (tag.startsWith('m2d5/probe/')) {
    if (tag.endsWith('/tanpa-berpikir')) return { enabled: false };
    const r = /\/r(\d+)(?:-[a-z])?$/.exec(tag);
    return r === null ? null : { max_tokens: Number(r[1]) };
  }
  if (/\/(susun|tulis-ulang)\/o\d\/u1$/.test(tag)) return { enabled: false };
  if (/\/(susun|tulis-ulang)\/o\d$/.test(tag)) return { max_tokens: PENALARAN_M2D5.penulis.penalaran };
  if (/\/gerbang-kartu\//.test(tag)) return { max_tokens: PENALARAN_M2D5.kartu.penalaran };
  if (/\/kritikus\//.test(tag)) return { max_tokens: PENALARAN_M2D5.kritikus.penalaran };
  if (/\/gerbang-tebak\/o\d\/t3/.test(tag)) return { max_tokens: PENALARAN_M2D5.penebakGlm.penalaran };
  return null;
}

/** Cuplikan satu entri ledger OpenRouter (M2d-5/M2d-6) sebagai baris bukti; `null` bila bukan panggilan bermodel yang berhasil. */
export function barisBukti(e: EntriLedger): BarisBukti | null {
  if (!e.tag.startsWith('m2d5/') && !e.tag.startsWith('m2d6/')) return null;
  if (e.status !== 200 || e.galat !== null || (e.penyedia ?? null) === null) return null;
  const dariLedger = e.penalaran_diminta !== undefined;
  return {
    waktu: e.waktu,
    tag: e.tag,
    model: e.model,
    penyedia: e.penyedia ?? null,
    status: e.status,
    token_keluar: e.token_keluar,
    token_penalaran: e.token_penalaran ?? null,
    penalaran_diminta: dariLedger ? (e.penalaran_diminta ?? null) : e.tag.startsWith('m2d5/') ? dimintaM2d5(e.tag) : null,
    asal_diminta: dariLedger || e.tag.startsWith('m2d6/') ? 'ledger' : 'tag-m2d5',
  };
}

/** Ambang "berpikir" GLM menurut peran dari tag (M2d-6); `null` = peran itu tidak dijaga. */
export function ambangDariTag(tag: string): number | null {
  if (/\/kritikus(\/|$)/.test(tag)) return PENALAR_M2D6.kritikus.ambang;
  if (/\/(gerbang-tebak\/o\d\/t\d|penebak)(\/|$|-)/.test(tag)) return PENALAR_M2D6.penebakGlm.ambang;
  return null;
}

export type JenisPelanggaran = 'melewati-batas' | 'tidak-berpikir';

/** Pelanggaran satu baris, atau `null`. */
export function pelanggaran(b: BarisBukti): { jenis: JenisPelanggaran; rincian: string } | null {
  const d = b.penalaran_diminta;
  if (d === null) return null;
  const batas = d['max_tokens'];
  if (typeof batas === 'number' && typeof b.token_penalaran === 'number' && b.token_penalaran > batas) {
    return { jenis: 'melewati-batas', rincian: `penalaran ${String(b.token_penalaran)} > batas ${String(batas)}` };
  }
  if (typeof d['effort'] === 'string' && b.model === MODEL_OR_GLM) {
    const ambang = ambangDariTag(b.tag);
    if (ambang !== null && !(typeof b.token_penalaran === 'number' && b.token_penalaran >= ambang)) {
      return { jenis: 'tidak-berpikir', rincian: `effort "${String(d['effort'])}" diminta, penalaran ${String(b.token_penalaran)} < ambang ${String(ambang)}` };
    }
  }
  return null;
}

/** Baris yang BISA melanggar: meminta batas penalaran, atau effort pada peran GLM yang dijaga. */
function bisaMelanggar(b: BarisBukti): boolean {
  const d = b.penalaran_diminta;
  if (d === null) return false;
  if (typeof d['max_tokens'] === 'number') return true;
  return typeof d['effort'] === 'string' && b.model === MODEL_OR_GLM && ambangDariTag(b.tag) !== null;
}

export interface RingkasPenyedia {
  model: string;
  penyedia: string;
  slug: string | null;
  diperiksa: number;
  melanggar: number;
  jenis: JenisPelanggaran[];
  /** Tag + waktu tiap baris pelanggaran (bukti). */
  bukti: Array<{ waktu: string; tag: string; rincian: string }>;
  dikecualikan: boolean;
}

/** Ringkasan per (model, penyedia) atas baris bukti. Murni. */
export function ringkasPenyedia(baris: readonly BarisBukti[]): RingkasPenyedia[] {
  const peta = new Map<string, RingkasPenyedia>();
  for (const b of baris) {
    if (b.penyedia === null || !bisaMelanggar(b)) continue;
    const k = `${b.model}|${b.penyedia}`;
    const r = peta.get(k) ?? { model: b.model, penyedia: b.penyedia, slug: slugPenyedia(b.penyedia), diperiksa: 0, melanggar: 0, jenis: [], bukti: [], dikecualikan: false };
    r.diperiksa++;
    const p = pelanggaran(b);
    if (p !== null) {
      r.melanggar++;
      if (!r.jenis.includes(p.jenis)) r.jenis.push(p.jenis);
      r.bukti.push({ waktu: b.waktu, tag: b.tag, rincian: p.rincian });
    }
    peta.set(k, r);
  }
  const hasil = [...peta.values()];
  for (const r of hasil) r.dikecualikan = r.melanggar >= MIN_PELANGGARAN && r.melanggar / r.diperiksa >= MIN_PORSI && r.slug !== null;
  return hasil.sort((a, b) => a.model.localeCompare(b.model) || b.melanggar - a.melanggar || a.penyedia.localeCompare(b.penyedia));
}

/** Slug yang dikecualikan per model, diturunkan dari bukti. Murni. */
export function turunkanPengecualian(baris: readonly BarisBukti[]): Record<string, string[]> {
  const hasil: Record<string, string[]> = {};
  for (const r of ringkasPenyedia(baris)) {
    if (!r.dikecualikan || r.slug === null) continue;
    (hasil[r.model] ??= []).push(r.slug);
  }
  for (const m of Object.keys(hasil)) hasil[m]?.sort();
  return hasil;
}

/**
 * Penyedia yang dikecualikan M2d-6 (`provider.ignore`), per model. HARUS sama
 * dengan `turunkanPengecualian(bukti-penyedia.json)` — dites.
 */
export const PENYEDIA_DIKECUALIKAN: Readonly<Record<string, readonly string[]>> = {
  [MODEL_OR_DEEPSEEK]: ['atlas-cloud'],
};

/** Pagar M2d-6 untuk klien: pagar M2d-5 + `ignore` (bukti D-2 + ulangan D-1). */
export function pagarM2d6(model: string, abaikan: readonly string[] = []): ReturnType<typeof pagarPenyediaM2d6> {
  return pagarPenyediaM2d6(model, abaikan, PENYEDIA_DIKECUALIKAN);
}
