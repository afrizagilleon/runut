/**
 * Protokol tebak rotasi (M2d-11 D-2, pra-registrasi `docs/bukti/m2d11-praregistrasi.md` §3).
 * Bagian murni: rotasi siklik, pesan penebak, salin teks → opsi, agregasi.
 *
 * Dasar riset: bias posisi/seleksi LLM besar dan berbeda per keluarga (Zheng
 * dkk. ICLR 2024; Pezeshkpour & Hruschka; Tang dkk. 2026) — satu urutan opsi
 * tidak cukup untuk menilai "tertebak". Model diminta MENYALIN teks opsi
 * (bukan huruf) supaya token label tidak ikut menentukan pilihan; kode
 * memetakan salinan ke opsi.
 */
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi } from '../draf.ts';
import type { PesanChat } from '../klien.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM, MODEL_OR_HAIKU, type ModelOpenRouter } from '../model.ts';
import type { SetelanPanggil } from '../susun.ts';
import { uraiKeluaran } from '../susun.ts';

export const HURUF_ROTASI: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];
export const ROTASI: readonly number[] = [0, 1, 2, 3];
/** Rotasi pembaca kartu (kunci di dua huruf berbeda). */
export const ROTASI_KARTU: readonly number[] = [0, 2];

export type Kondisi = 'pilihan-saja' | 'pesan-pilihan';
export const KONDISI: readonly Kondisi[] = ['pilihan-saja', 'pesan-pilihan'];

export interface ModelRotasi {
  model: ModelOpenRouter;
  nama: string;
  setelan: SetelanPanggil;
}

/**
 * Tiga keluarga, tanpa penalaran panjang, suhu 0 (pra-registrasi §3.2).
 *
 * **Amandemen teknis A-1 (2 Okt, sebelum data rotasi apa pun):** GLM-5.3 di
 * OpenRouter menolak `reasoning.enabled: false` ("Reasoning is mandatory for
 * this endpoint and cannot be disabled", HTTP 400, panggilan pertama uji
 * ulang, 0 biaya). Setelan GLM diganti ke penalaran sependek yang diizinkan:
 * `reasoning.effort: "minimal"` (±10 % `max_tokens`), `max_tokens` 3.000.
 * Pra-registrasi tidak diubah; amandemen dicatat di laporan.
 */
export const MODEL_ROTASI: readonly ModelRotasi[] = [
  { model: MODEL_OR_HAIKU, nama: 'haiku', setelan: { suhu: 0, maxTokens: 300 } },
  { model: MODEL_OR_DEEPSEEK, nama: 'deepseek', setelan: { suhu: 0, maxTokens: 600, tambahanBadan: { reasoning: { enabled: false } } } },
  { model: MODEL_OR_GLM, nama: 'glm', setelan: { suhu: 0, maxTokens: 3_000, tambahanBadan: { reasoning: { effort: 'minimal' } } } },
];

/* ---------------------------------------------------------------------- */
/* rotasi                                                                  */
/* ---------------------------------------------------------------------- */

export interface Terputar {
  pilihan: Record<KunciOpsi, string>;
  kunci: KunciOpsi;
  /** Huruf baru → indeks opsi ASAL (0 = a asal … 3 = d asal). */
  asal: Record<KunciOpsi, number>;
}

/** Rotasi siklik r: opsi di huruf ke-i = opsi asal ke-((i − r) mod 4). Murni. */
export function putar(o: { pilihan: Record<KunciOpsi, string>; kunci: KunciOpsi }, r: number): Terputar {
  const geser = ((r % 4) + 4) % 4;
  const pilihan = {} as Record<KunciOpsi, string>;
  const asal = {} as Record<KunciOpsi, number>;
  HURUF_ROTASI.forEach((h, i) => {
    const j = (i - geser + 4) % 4;
    asal[h] = j;
    pilihan[h] = o.pilihan[HURUF_ROTASI[j] as KunciOpsi];
  });
  const k = HURUF_ROTASI.indexOf(o.kunci);
  return { pilihan, kunci: HURUF_ROTASI[(k + geser) % 4] as KunciOpsi, asal };
}

/* ---------------------------------------------------------------------- */
/* pesan penebak                                                           */
/* ---------------------------------------------------------------------- */

export const PETUNJUK_ROTASI = [
  'Kamu ikut menguji soal latihan tentang saham. Seorang teman mengirim pesan di grup obrolan, lalu ada',
  'pertanyaan dan empat pilihan. Kamu TIDAK diberi dokumen apa pun. Pilih SATU pilihan yang menurutmu',
  'paling mungkin benar, dari yang tertulis saja.',
  'SALIN teks pilihan itu persis seperti tertulis, tanpa huruf di depannya.',
  'Balas HANYA dengan JSON berbentuk: {"teks": "<salinan persis teks pilihan>", "alasan": "<paling banyak 12 kata>"}',
].join('\n');

export interface SoalRotasi {
  nama: string;
  jam: string;
  pesan: string;
  pilihan: Record<KunciOpsi, string>;
}

/** Percakapan baru untuk satu panggilan rotasi. Teks polos (tanpa fact_id). Murni. */
export function pesanRotasi(k: Kondisi, s: SoalRotasi): PesanChat[] {
  const opsi = HURUF_ROTASI.map((h) => `${h}) ${teksPolos(s.pilihan[h])}`);
  const isi =
    k === 'pesan-pilihan'
      ? [`Pesan dari ${s.nama} (${s.jam}): "${teksPolos(s.pesan)}"`, `Pertanyaan: Omongan ${s.nama} cocok dengan dokumennya?`, ...opsi]
      : ['Pertanyaan: Omongan teman di grup obrolan cocok dengan dokumennya? (Pesan temannya tidak ditampilkan.)', ...opsi];
  return [
    { role: 'system', content: PETUNJUK_ROTASI },
    { role: 'user', content: isi.join('\n') },
  ];
}

/* ---------------------------------------------------------------------- */
/* salin teks → opsi                                                       */
/* ---------------------------------------------------------------------- */

export const AMBANG_DICE = { min: 0.7, unggul: 0.05 } as const;

export function uraiSalinan(teks: string): { teks: string; alasan: string } | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || typeof u.nilai !== 'object' || u.nilai === null) return null;
  const n = u.nilai as Record<string, unknown>;
  const t = n['teks'];
  if (typeof t !== 'string' || t.trim() === '') return null;
  return { teks: t, alasan: typeof n['alasan'] === 'string' ? n['alasan'] : '' };
}

/** Huruf kecil; awalan huruf opsi dibuang; tanda baca → spasi; spasi dirapatkan. Murni. */
export function normalTeks(t: string): string {
  return teksPolos(t)
    .toLowerCase()
    .replace(/^\s*["'“”]?\s*\(?[a-d][).:]\s*/u, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigram(t: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i + 1 < t.length; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Koefisien Dice bigram karakter (multihimpunan). Murni. */
export function dice(a: string, b: string): number {
  if (a === b) return a.length === 0 ? 0 : 1;
  const A = bigram(a);
  const B = bigram(b);
  let sama = 0;
  let nA = 0;
  let nB = 0;
  for (const v of A.values()) nA += v;
  for (const v of B.values()) nB += v;
  for (const [g, v] of A) sama += Math.min(v, B.get(g) ?? 0);
  return nA + nB === 0 ? 0 : (2 * sama) / (nA + nB);
}

/** Peta salinan → huruf opsi; `null` bila < 0,70 atau tidak unggul ≥ 0,05 dari opsi kedua. Murni. */
export function petakanSalinan(salinan: string, pilihan: Record<KunciOpsi, string>): { huruf: KunciOpsi | null; skor: number | null } {
  const s = normalTeks(salinan);
  const skor = HURUF_ROTASI.map((h) => ({ h, d: dice(s, normalTeks(pilihan[h])) })).sort((x, y) => y.d - x.d);
  const satu = skor[0] as { h: KunciOpsi; d: number };
  const dua = skor[1] as { h: KunciOpsi; d: number };
  if (satu.d < AMBANG_DICE.min || satu.d - dua.d < AMBANG_DICE.unggul) return { huruf: null, skor: satu.d };
  return { huruf: satu.h, skor: satu.d };
}

/* ---------------------------------------------------------------------- */
/* agregasi (pra-registrasi §3.4)                                          */
/* ---------------------------------------------------------------------- */

export interface JawabanRotasi {
  model: string;
  kondisi: Kondisi;
  r: number;
  /** Huruf yang dipilih di rotasi ini (null = tak terbaca/tak terpetakan). */
  huruf: KunciOpsi | null;
  /** Indeks opsi ASAL yang dipilih (null = tak terbaca). */
  isi: number | null;
  /** Indeks opsi asal yang menjadi kunci. */
  isi_kunci: number;
  terbaca: boolean;
  salinan: string | null;
  skor: number | null;
  alasan: string;
  biaya_usd: number;
  panggilan: number;
}

export interface RingkasModel {
  model: string;
  /** Huruf yang dipilih ≥ 3/4 rotasi (bias posisi) — model diabaikan. */
  huruf_konsisten: KunciOpsi | null;
  /** Isi yang dipilih ≥ 3/4 rotasi (indeks asal; tak terbaca dihitung isi kunci). */
  isi_konsisten: number | null;
  isi_kunci_konsisten: boolean;
  diabaikan: boolean;
  kunci: number;
  n: number;
  tak_terbaca: number;
}

export interface RingkasKondisi {
  per_model: RingkasModel[];
  /** Jawaban kunci (termasuk tak terbaca) dari model yang tidak diabaikan. */
  kunci: number;
  n: number;
  proporsi: number | null;
  tak_terbaca: number;
}

export type PutusanTebakRotasi = 'lulus' | 'abu-abu' | 'gagal' | 'tak-terukur';

export interface PutusanRotasi {
  putusan: PutusanTebakRotasi;
  alasan: string[];
  kondisi: Record<Kondisi, RingkasKondisi>;
}

function ringkasModel(model: string, j: readonly JawabanRotasi[]): RingkasModel {
  const hitHuruf = new Map<KunciOpsi, number>();
  const hitIsi = new Map<number, number>();
  let kunci = 0;
  let tak = 0;
  for (const x of j) {
    if (x.huruf !== null) hitHuruf.set(x.huruf, (hitHuruf.get(x.huruf) ?? 0) + 1);
    const isi = x.isi ?? x.isi_kunci;
    if (x.isi === null) tak += 1;
    hitIsi.set(isi, (hitIsi.get(isi) ?? 0) + 1);
    if (isi === x.isi_kunci) kunci += 1;
  }
  const hurufK = [...hitHuruf].find(([, n]) => n >= 3)?.[0] ?? null;
  const isiK = [...hitIsi].find(([, n]) => n >= 3)?.[0] ?? null;
  const isiKunci = j[0]?.isi_kunci ?? -1;
  return { model, huruf_konsisten: hurufK, isi_konsisten: isiK, isi_kunci_konsisten: isiK !== null && isiK === isiKunci, diabaikan: hurufK !== null, kunci, n: j.length, tak_terbaca: tak };
}

/** Agregasi 24 jawaban satu soal → putusan syarat 3. Murni. */
export function agregasiRotasi(jawaban: readonly JawabanRotasi[]): PutusanRotasi {
  const kondisi = {} as Record<Kondisi, RingkasKondisi>;
  const alasan: string[] = [];
  for (const k of KONDISI) {
    const model = [...new Set(jawaban.filter((x) => x.kondisi === k).map((x) => x.model))];
    const per = model.map((m) => ringkasModel(m, jawaban.filter((x) => x.kondisi === k && x.model === m)));
    const dipakai = per.filter((p) => !p.diabaikan);
    const kunci = dipakai.reduce((a, p) => a + p.kunci, 0);
    const n = dipakai.reduce((a, p) => a + p.n, 0);
    kondisi[k] = { per_model: per, kunci, n, proporsi: n === 0 ? null : kunci / n, tak_terbaca: per.reduce((a, p) => a + p.tak_terbaca, 0) };
    for (const p of per) {
      if (p.diabaikan) alasan.push(`${k}: ${p.model} diabaikan (huruf "${String(p.huruf_konsisten)}" di ≥ 3/4 rotasi)`);
      else if (p.isi_kunci_konsisten) alasan.push(`${k}: ${p.model} memilih isi kunci di ≥ 3/4 rotasi`);
    }
  }
  const konsistenKunci = KONDISI.some((k) => kondisi[k].per_model.some((p) => !p.diabaikan && p.isi_kunci_konsisten));
  const pp = kondisi['pesan-pilihan'];
  let putusan: PutusanTebakRotasi;
  if (konsistenKunci) putusan = 'gagal';
  else if (pp.proporsi === null) {
    putusan = 'tak-terukur';
    alasan.push('pesan-pilihan: semua model diabaikan (bias posisi) — tak terukur');
  } else if (pp.proporsi * 12 <= 5 + 1e-9) putusan = 'lulus';
  else if (pp.proporsi * 12 <= 6 + 1e-9) putusan = 'abu-abu';
  else putusan = 'gagal';
  if (pp.proporsi !== null) alasan.unshift(`pesan-pilihan: kunci ${String(pp.kunci)}/${String(pp.n)} (${(pp.proporsi * 12).toFixed(1).replace('.', ',')}/12)`);
  return { putusan, alasan, kondisi };
}

/** Sebaran huruf per model (jawaban terpetakan) + tak terbaca. Murni. */
export function priorHuruf(jawaban: readonly JawabanRotasi[]): Record<string, Record<KunciOpsi | 'tak_terbaca', number>> {
  const h: Record<string, Record<KunciOpsi | 'tak_terbaca', number>> = {};
  for (const x of jawaban) {
    const p = (h[x.model] ??= { a: 0, b: 0, c: 0, d: 0, tak_terbaca: 0 });
    if (x.huruf === null) p.tak_terbaca += 1;
    else p[x.huruf] += 1;
  }
  return h;
}
