/**
 * Urutan penyedia GLM berdasar BUKTI berpikir dalam (M2d-7 D-1).
 *
 * Kontrak M2d-7 D-1: `provider.order` boleh mendahulukan penyedia yang
 * TERBUKTI berpikir dalam di ledger, dengan fallback. "Terbukti" di sini
 * diturunkan kode dari entri ledger M2d-6 (GLM, `reasoning.effort` diminta,
 * berhasil), bukan dari ingatan:
 *
 * - per peran GLM yang dijaga (kritikus, penebak — `aturanDariTag`), penyedia
 *   dihitung hanya bila melayani ≥ `MIN_PANGGILAN_URUTAN` panggilan peran itu;
 * - penyedia masuk urutan bila di SETIAP peran yang memenuhi jumlah itu,
 *   median token penalarannya ≥ ambang M2d-6 peran itu (kritikus 1.000,
 *   penebak 300), dan sedikitnya ada satu peran seperti itu;
 * - urut menurut jumlah panggilan (terbanyak dulu).
 *
 * `allow_fallbacks` tetap `true` (pagar M2d-5): penyedia di urutan hanya
 * didahulukan; bila ia gagal/tidak tersedia, OpenRouter memakai penyedia lain
 * yang lolos pagar. Penyedia yang dilewati untuk ulangan (penjaga penalaran)
 * dibuang dari urutan panggilan itu.
 *
 * `URUTAN_GLM_M2D7` HARUS sama dengan `urutanBerpikirDalam()` atas cuplikan
 * terlacak `eval/keluaran-m2d7/bukti-urutan.json` (dites).
 */
import { MODEL_OR_GLM } from './model.ts';
import { slugPenyedia } from './openrouter.ts';
import { PENALAR_M2D6 } from './penalaran.ts';
import { aturanDariTag, pagarM2d6, type BarisBukti } from './penyedia-bukti.ts';

export const MIN_PANGGILAN_URUTAN = 10;

export interface RingkasUrutan {
  penyedia: string;
  slug: string | null;
  per_peran: Record<string, { n: number; median: number; ambang: number }>;
  masuk: boolean;
}

function median(x: readonly number[]): number {
  const s = [...x].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  return n % 2 === 1 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
}

function peranTag(tag: string): 'kritikus' | 'penebak' | null {
  if (/\/kritikus(\/|$)/.test(tag)) return 'kritikus';
  return aturanDariTag(tag) === null ? null : 'penebak';
}

/** Ringkasan per penyedia GLM dari baris bukti M2d-6 ber-effort. Murni. */
export function ringkasUrutan(baris: readonly BarisBukti[]): RingkasUrutan[] {
  const peta = new Map<string, Map<string, number[]>>();
  for (const b of baris) {
    if (b.model !== MODEL_OR_GLM || !b.tag.startsWith('m2d6/') || b.penyedia === null) continue;
    if (b.penalaran_diminta === null || typeof b.penalaran_diminta['effort'] !== 'string') continue;
    const p = peranTag(b.tag);
    if (p === null) continue;
    const m = peta.get(b.penyedia) ?? new Map<string, number[]>();
    const l = m.get(p) ?? [];
    l.push(typeof b.token_penalaran === 'number' ? b.token_penalaran : 0);
    m.set(p, l);
    peta.set(b.penyedia, m);
  }
  const ambang: Record<string, number> = { kritikus: PENALAR_M2D6.kritikus.ambang, penebak: PENALAR_M2D6.penebakGlm.ambang };
  const hasil: RingkasUrutan[] = [];
  for (const [penyedia, m] of peta) {
    const per_peran: RingkasUrutan['per_peran'] = {};
    for (const [p, l] of m) per_peran[p] = { n: l.length, median: median(l), ambang: ambang[p] ?? Infinity };
    const cukup = Object.values(per_peran).filter((x) => x.n >= MIN_PANGGILAN_URUTAN);
    const slug = slugPenyedia(penyedia);
    hasil.push({ penyedia, slug, per_peran, masuk: slug !== null && cukup.length > 0 && cukup.every((x) => x.median >= x.ambang) });
  }
  const total = (r: RingkasUrutan): number => Object.values(r.per_peran).reduce((a, x) => a + x.n, 0);
  return hasil.sort((a, b) => total(b) - total(a) || a.penyedia.localeCompare(b.penyedia));
}

/** Slug penyedia GLM yang didahulukan, diturunkan dari bukti. Murni. */
export function urutanBerpikirDalam(baris: readonly BarisBukti[]): string[] {
  return ringkasUrutan(baris)
    .filter((r) => r.masuk && r.slug !== null)
    .map((r) => r.slug as string);
}

/** Urutan GLM M2d-7 — HARUS sama dengan `urutanBerpikirDalam(bukti-urutan.json)` (dites). */
export const URUTAN_GLM_M2D7: readonly string[] = ['wafer'];

/**
 * Pagar M2d-7: pagar M2d-6 persis (kuantisasi, `max_price`,
 * `require_parameters`, `data_collection`, `allow_fallbacks`, `ignore` dari
 * bukti + ulangan) + `order` untuk GLM. Penyedia yang dilewati untuk ulangan
 * dibuang dari `order`.
 */
export function pagarM2d7(model: string, abaikan: readonly string[] = []): Readonly<Record<string, unknown>> {
  const dasar = pagarM2d6(model, abaikan);
  if (model !== MODEL_OR_GLM) return dasar;
  const lewati = new Set(abaikan.map((n) => slugPenyedia(n)).filter((x): x is string => x !== null));
  const order = URUTAN_GLM_M2D7.filter((s) => !lewati.has(s));
  return order.length === 0 ? dasar : { ...dasar, order };
}
