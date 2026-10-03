/**
 * Agregasi tebak rotasi v2 (M2d-16 D-1) — BERDAMPINGAN dengan `agregasiRotasi`
 * (M2d-11), yang tidak diubah (riwayat, pra-registrasi lama).
 *
 * Kenapa v2 (audit 3 Okt, `docs/bukti/gerbang-tebak-v2.md`): aturan lama
 * "satu model memilih isi kunci ≥ 3/4 rotasi" menolak ±44 % pilihan APA PUN
 * (uji plasebo), jawaban tak terbaca dihitung "memilih kunci", dan pencocok
 * salinan gagal pada pilihan yang mirip.
 *
 * Aturan v2 ("saringan murah"):
 * - jawaban tak terbaca DIBUANG dari hitungan dan dilaporkan jumlahnya;
 * - tak terbaca > 1/3 jawaban kondisi pesan+pilihan → "tak-terukur" (bukan
 *   lulus, bukan tolak);
 * - uji binomial satu sisi atas jawaban pesan+pilihan (semua model digabung)
 *   terhadap peluang acak 0,25: tolak bila p < 0,01 (n = 12 → kunci ≥ 8);
 * - TIDAK ada aturan "satu model ≥ 3/4" dan tidak ada model yang diabaikan;
 * - kondisi pilihan-saja = diagnosis yang dicatat, bukan penolak.
 *
 * Pencocok salinan v2: cocok persis sesudah normalisasi (rujukan
 * `[[id|teks]]` → teks, huruf kecil, tanda baca → spasi) didahulukan; baru
 * Dice (aturan lama) bila tidak ada yang persis.
 */
import type { KunciOpsi } from '../draf.ts';
import { HURUF_ROTASI, KONDISI, normalTeks, petakanSalinan, type JawabanRotasi, type Kondisi } from './rotasi.ts';

export const PELUANG_ACAK = 0.25;
/** Tolak bila p (binomial satu sisi) < ambang ini. */
export const AMBANG_P_SARINGAN = 0.01;
/** Tak terbaca > bagian ini dari jawaban suatu kondisi → tak-terukur. */
export const BATAS_TAK_TERBACA = 1 / 3;

/** P(X ≥ k) untuk X ~ Binomial(n, p). Murni. */
export function binomEkor(k: number, n: number, p: number = PELUANG_ACAK): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let total = 0;
  for (let i = k; i <= n; i++) {
    let c = 1;
    for (let j = 0; j < i; j++) c = (c * (n - j)) / (j + 1);
    total += c * p ** i * (1 - p) ** (n - i);
  }
  return Math.min(1, total);
}

/** Jumlah kunci terkecil yang ditolak untuk n jawaban terbaca (n = 12 → 8). `null` = tidak ada. Murni. */
export function ambangTolak(n: number, ambang: number = AMBANG_P_SARINGAN): number | null {
  for (let k = 0; k <= n; k++) if (binomEkor(k, n) < ambang) return k;
  return null;
}

/**
 * Peta salinan → huruf opsi. Cocok persis (sesudah normalisasi) ke TEPAT satu
 * opsi menang, berapa pun miripnya opsi lain; dua opsi yang normalisasinya
 * sama persis tidak bisa dibedakan → `null`. Tanpa cocok persis: Dice lama.
 * Murni.
 */
export function petakanSalinanV2(salinan: string, pilihan: Record<KunciOpsi, string>): { huruf: KunciOpsi | null; skor: number | null; cara: 'persis' | 'dice' | null } {
  const s = normalTeks(salinan);
  if (s !== '') {
    const persis = HURUF_ROTASI.filter((h) => normalTeks(pilihan[h]) === s);
    if (persis.length === 1) return { huruf: persis[0] as KunciOpsi, skor: 1, cara: 'persis' };
    if (persis.length > 1) return { huruf: null, skor: 1, cara: null };
  }
  const d = petakanSalinan(salinan, pilihan);
  return { ...d, cara: d.huruf === null ? null : 'dice' };
}

export type PutusanSaringan = 'lulus' | 'tolak' | 'tak-terukur';

export interface RingkasKondisiV2 {
  /** Semua jawaban kondisi ini (terbaca + tak terbaca). */
  total: number;
  /** Jawaban terbaca (yang dihitung). */
  n: number;
  /** Jawaban terbaca yang memilih isi kunci. */
  kunci: number;
  tak_terbaca: number;
  /** P(X ≥ kunci | n; 0,25); `null` bila n = 0. */
  p: number | null;
  tak_terukur: boolean;
  /** Kunci per model (terbaca saja) — catatan, tidak dipakai aturan. */
  per_model: Array<{ model: string; kunci: number; n: number; tak_terbaca: number }>;
}

export interface PutusanRotasiV2 {
  aturan: 'v2-binomial-pesan-pilihan';
  putusan: PutusanSaringan;
  alasan: string[];
  kondisi: Record<Kondisi, RingkasKondisiV2>;
  /** Diagnosis kondisi pilihan-saja (dicatat, tidak menolak). */
  diagnosis: string;
}

const koma = (x: number, d: number): string => x.toFixed(d).replace('.', ',');

function ringkasKondisi(j: readonly JawabanRotasi[]): RingkasKondisiV2 {
  const terbaca = j.filter((x) => x.isi !== null);
  const kunci = terbaca.filter((x) => x.isi === x.isi_kunci).length;
  const model = [...new Set(j.map((x) => x.model))];
  return {
    total: j.length,
    n: terbaca.length,
    kunci,
    tak_terbaca: j.length - terbaca.length,
    p: terbaca.length === 0 ? null : binomEkor(kunci, terbaca.length),
    tak_terukur: j.length === 0 || terbaca.length === 0 || (j.length - terbaca.length) > j.length * BATAS_TAK_TERBACA + 1e-9,
    per_model: model.map((m) => {
      const x = j.filter((y) => y.model === m);
      const t = x.filter((y) => y.isi !== null);
      return { model: m, kunci: t.filter((y) => y.isi === y.isi_kunci).length, n: t.length, tak_terbaca: x.length - t.length };
    }),
  };
}

/** Agregasi jawaban rotasi satu soal → putusan saringan murah v2. Murni. */
export function agregasiRotasiV2(jawaban: readonly JawabanRotasi[]): PutusanRotasiV2 {
  const kondisi = {} as Record<Kondisi, RingkasKondisiV2>;
  for (const k of KONDISI) kondisi[k] = ringkasKondisi(jawaban.filter((x) => x.kondisi === k));
  const pp = kondisi['pesan-pilihan'];
  const ps = kondisi['pilihan-saja'];
  const alasan: string[] = [];
  let putusan: PutusanSaringan;
  if (pp.tak_terukur || pp.p === null) {
    putusan = 'tak-terukur';
    alasan.push(`pesan+pilihan: ${String(pp.tak_terbaca)} dari ${String(pp.total)} jawaban tak terbaca (lebih dari sepertiga) — tak terukur`);
  } else {
    putusan = pp.p < AMBANG_P_SARINGAN ? 'tolak' : 'lulus';
    alasan.push(`pesan+pilihan: tanpa kartu, penebak memilih isi kunci ${String(pp.kunci)} dari ${String(pp.n)} jawaban terbaca (peluang kebetulan ${koma(pp.p, 4)}; batas ${koma(AMBANG_P_SARINGAN, 2)})${pp.tak_terbaca > 0 ? `; ${String(pp.tak_terbaca)} tak terbaca dibuang` : ''}`);
  }
  const diagnosis = ps.tak_terukur || ps.p === null
    ? `pilihan-saja (diagnosis): ${String(ps.tak_terbaca)} dari ${String(ps.total)} tak terbaca — tak terukur`
    : `pilihan-saja (diagnosis): kunci ${String(ps.kunci)} dari ${String(ps.n)} terbaca (peluang kebetulan ${koma(ps.p, 4)})${ps.tak_terbaca > 0 ? `; ${String(ps.tak_terbaca)} tak terbaca dibuang` : ''}`;
  return { aturan: 'v2-binomial-pesan-pilihan', putusan, alasan, kondisi, diagnosis };
}
