/**
 * Detektor cacat penulisan soal (M2d-11 D-1, pra-registrasi
 * `docs/bukti/m2d11-praregistrasi.md` §2). Kode murni, gratis, dihitung pada
 * teks POLOS alasan sesudah awalan "Betul,/Keliru," (rujukan `[[id|teks]]` →
 * teks). Dasar riset: item-writing flaws klasik (Haladyna dkk. 2002; rubrik
 * 19-IWF; Schmucker & Moore) — detektor aturan lebih akurat dari LLM untuk
 * cacat permukaan (Moore dkk. 2023).
 *
 * | kode | detektor | ambang awal → tangga pelonggaran |
 * |---|---|---|
 * | D1 | panjang | 1,25× median / rasio 1,6 → (1,35 / 1,8) → (1,5 / –) → dicatat |
 * | D2 | spesifisitas unik | "0 atau ≥ 2" → hanya bila opsi tunggal = kunci → dicatat |
 * | D3 | Jaccard dengan pesan | 0,15 → 0,20 → 0,25 → dicatat |
 * | D4 | restatement n-gram pesan | 4 → 5 → 6 → dicatat |
 * | D5 | konvergensi | m = 1 → 2 → 3 → dicatat |
 * | D6 | kata absolut | kunci saja / pengecoh ≥ 1 → … ≥ 2 → kunci saja → dicatat |
 * | D7 | kata pelunak | sama dengan D6 |
 * | D8 | keseimbangan label 2 + 2 | pelindung (tidak pernah dilonggarkan) |
 * | D9 | urutan numerik | menyala → dicatat |
 *
 * Detektor di anak tangga terakhir ("dicatat") tetap dijalankan dengan ambang
 * AWAL dan benderanya berstatus `dicatat` (tidak menolak).
 */
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi } from '../draf.ts';

export type KodeDetektor = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8' | 'D9';
export const KODE_DETEKTOR: readonly KodeDetektor[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'];

export const NAMA_DETEKTOR: Readonly<Record<KodeDetektor, string>> = {
  D1: 'panjang',
  D2: 'spesifisitas unik',
  D3: 'tumpang-tindih leksikal dengan pesan',
  D4: 'restatement',
  D5: 'konvergensi',
  D6: 'kata absolut',
  D7: 'kata pelunak',
  D8: 'keseimbangan label',
  D9: 'urutan numerik',
};

export interface SoalCacat {
  pesan: string;
  pilihan: Record<KunciOpsi, string>;
  kunci: KunciOpsi;
}

export interface Bendera {
  kode: KodeDetektor;
  nama: string;
  status: 'menolak' | 'dicatat';
  /** Opsi yang menjadi sasaran bendera. */
  opsi: KunciOpsi[];
  alasan: string;
}

/** Anak tangga tiap detektor (0 = ambang awal riset). */
export type AmbangCacat = Record<KodeDetektor, number>;

export const AMBANG_AWAL: AmbangCacat = { D1: 0, D2: 0, D3: 0, D4: 0, D5: 0, D6: 0, D7: 0, D8: 0, D9: 0 };
/** Indeks anak tangga TERAKHIR (= dicatat) per detektor; 0 untuk pelindung. */
export const ANAK_TANGGA: Readonly<Record<KodeDetektor, number>> = { D1: 3, D2: 2, D3: 3, D4: 3, D5: 3, D6: 3, D7: 3, D8: 0, D9: 1 };
export const PELINDUNG: readonly KodeDetektor[] = ['D8'];

const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

/* ---------------------------------------------------------------------- */
/* praolah                                                                 */
/* ---------------------------------------------------------------------- */

export function pisahLabel(teks: string): { label: 'Betul' | 'Keliru' | null; alasan: string } {
  const m = /^\s*(Betul|Keliru)\b\s*,?\s*/.exec(teks);
  if (m === null) return { label: null, alasan: teks.trim() };
  return { label: m[1] as 'Betul' | 'Keliru', alasan: teks.slice(m[0].length).trim() };
}

export const KATA_HENTI: ReadonlySet<string> = new Set(
  'yang dan di ke dari itu ini untuk dengan pada karena tapi tetapi juga sudah udah ada akan atau oleh sebagai dalam saja aja lagi pun nya lah kah kan sih dong deh nih tuh ya yg gue gw gua aku saya kamu lo lu dia ia mereka kita kami jadi bukan tidak nggak gak enggak tak belum memang masih'.split(' '),
);

export function kata(teks: string): string[] {
  return teks.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x !== '');
}

export function kataIsi(teks: string): Set<string> {
  return new Set(kata(teks).filter((x) => x.length > 1 && !KATA_HENTI.has(x)));
}

const BULAN = 'januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember';
const RE_TANGGAL = new RegExp(`\\b\\d{1,2}\\s+(?:${BULAN})\\b(?:\\s+\\d{4}\\b)?|\\b(?:${BULAN})\\s+\\d{4}\\b`, 'giu');
const RE_DOKUMEN = /(?<![\p{L}\p{N}])(?:pengumuman|laporan|keterbukaan|prospektus|rups|dokumen|kartu|surat)\p{L}*/iu;

const tanpaTanggal = (t: string): string => t.replace(RE_TANGGAL, ' ');

export type JenisToken = 'tanggal' | 'angka' | 'persen' | 'kode saham' | 'dokumen';

export function jenisToken(alasan: string): Set<JenisToken> {
  const j = new Set<JenisToken>();
  if (new RegExp(RE_TANGGAL.source, 'iu').test(alasan)) j.add('tanggal');
  if (/\d/.test(tanpaTanggal(alasan))) j.add('angka');
  if (/%|(?<![\p{L}])persen(?![\p{L}])/iu.test(alasan)) j.add('persen');
  if (/\b[A-Z]{4}\b/.test(alasan)) j.add('kode saham');
  if (RE_DOKUMEN.test(alasan)) j.add('dokumen');
  return j;
}

/** Nilai angka format Indonesia ("1.690" = 1690; "2,21" = 2,21), angka tanggal tidak dihitung. */
export function nilaiAngka(alasan: string): number[] {
  return [...tanpaTanggal(alasan).matchAll(/\d+(?:\.\d{3})*(?:,\d+)?/g)].map((m) => Number(m[0].replace(/\./g, '').replace(',', '.')));
}

const lolos = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function memuatFrasa(teks: string, frasa: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${lolos(frasa)}(?![\\p{L}\\p{N}])`, 'iu').test(teks);
}

export const KATA_ABSOLUT: readonly string[] = [
  'selalu', 'pasti', 'tidak pernah', 'belum pernah', 'tak pernah', 'semua', 'semuanya', 'seluruh', 'seluruhnya', 'hanya', 'cuma',
  'satu-satunya', 'mustahil', '100%', '100 persen', 'jelas', 'tentu', 'sama sekali', 'sekali pun', 'sekalipun',
];
export const KATA_PELUNAK: readonly string[] = ['mungkin', 'bisa jadi', 'belum tentu', 'kemungkinan', 'sepertinya', 'barangkali', 'kira-kira', 'sekitar', 'agaknya', 'cenderung', 'tampaknya'];

function frasaDi(teks: string, daftar: readonly string[]): string[] {
  return daftar.filter((f) => memuatFrasa(teks, f));
}

function ngram(k: readonly string[], n: number): Set<string> {
  const h = new Set<string>();
  for (let i = 0; i + n <= k.length; i++) h.add(k.slice(i, i + n).join(' '));
  return h;
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let irisan = 0;
  for (const x of a) if (b.has(x)) irisan += 1;
  return irisan / (a.size + b.size - irisan);
}

function median(x: readonly number[]): number {
  const s = [...x].sort((p, q) => p - q);
  const n = s.length;
  if (n === 0) return 0;
  return n % 2 === 1 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
}

const bulat = (x: number): string => x.toFixed(2).replace('.', ',');

/* ---------------------------------------------------------------------- */
/* detektor                                                                */
/* ---------------------------------------------------------------------- */

interface Konteks {
  kunci: KunciOpsi;
  pengecoh: KunciOpsi[];
  label: Record<KunciOpsi, 'Betul' | 'Keliru' | null>;
  alasan: Record<KunciOpsi, string>;
  pesan: string;
}

type Detektor = (k: Konteks, tangga: number) => { opsi: KunciOpsi[]; alasan: string } | null;

const PARAM_D1 = [
  { a: 1.25, b: 1.6 },
  { a: 1.35, b: 1.8 },
  { a: 1.5, b: Infinity },
] as const;

const d1: Detektor = (k, t) => {
  const p = PARAM_D1[Math.min(t, PARAM_D1.length - 1)] ?? PARAM_D1[0];
  const L = Object.fromEntries(HURUF.map((h) => [h, k.alasan[h].length])) as Record<KunciOpsi, number>;
  const lp = k.pengecoh.map((h) => L[h]);
  const kunciTerpanjang = lp.every((x) => L[k.kunci] > x);
  const med = median(lp);
  if (kunciTerpanjang && L[k.kunci] > p.a * med) return { opsi: [k.kunci], alasan: `alasan kunci ${String(L[k.kunci])} karakter, terpanjang dan > ${bulat(p.a)} × median pengecoh (${bulat(med)})` };
  const semua = HURUF.map((h) => L[h]);
  const maks = Math.max(...semua);
  const min = Math.min(...semua);
  if (min > 0 && maks / min > p.b) {
    const hMaks = HURUF.filter((h) => L[h] === maks);
    const hMin = HURUF.filter((h) => L[h] === min);
    return { opsi: [...hMaks, ...hMin], alasan: `panjang alasan tidak seragam: terpanjang/terpendek ${bulat(maks / min)} > ${bulat(p.b)} (${hMaks.join('/')} ${String(maks)} vs ${hMin.join('/')} ${String(min)} karakter)` };
  }
  return null;
};

const d2: Detektor = (k, t) => {
  const jenis = Object.fromEntries(HURUF.map((h) => [h, jenisToken(k.alasan[h])])) as Record<KunciOpsi, Set<JenisToken>>;
  const semua: JenisToken[] = ['tanggal', 'angka', 'persen', 'kode saham', 'dokumen'];
  for (const j of semua) {
    const punya = HURUF.filter((h) => jenis[h].has(j));
    if (punya.length !== 1) continue;
    const tunggal = punya[0] as KunciOpsi;
    if (t >= 1 && tunggal !== k.kunci) continue;
    return { opsi: [tunggal], alasan: `token ${j} hanya ada di satu opsi (${tunggal}${tunggal === k.kunci ? ' = kunci' : ''}); harus di 0 atau ≥ 2 opsi` };
  }
  return null;
};

const PARAM_D3 = [0.15, 0.2, 0.25] as const;
const d3: Detektor = (k, t) => {
  const ambang = PARAM_D3[Math.min(t, PARAM_D3.length - 1)] ?? 0.15;
  const p = kataIsi(k.pesan);
  const J = Object.fromEntries(HURUF.map((h) => [h, jaccard(kataIsi(k.alasan[h]), p)])) as Record<KunciOpsi, number>;
  const jp = k.pengecoh.map((h) => J[h]);
  const tinggi = Math.max(...jp);
  const rendah = Math.min(...jp);
  if (J[k.kunci] > tinggi && J[k.kunci] - tinggi > ambang) return { opsi: [k.kunci], alasan: `Jaccard kunci dengan pesan ${bulat(J[k.kunci])}, tertinggi; selisih ${bulat(J[k.kunci] - tinggi)} > ${bulat(ambang)}` };
  if (J[k.kunci] < rendah && rendah - J[k.kunci] > ambang) return { opsi: [k.kunci], alasan: `Jaccard kunci dengan pesan ${bulat(J[k.kunci])}, terendah; selisih ${bulat(rendah - J[k.kunci])} > ${bulat(ambang)}` };
  return null;
};

const PARAM_D4 = [4, 5, 6] as const;
const d4: Detektor = (k, t) => {
  const n = PARAM_D4[Math.min(t, PARAM_D4.length - 1)] ?? 4;
  const dariPesan = ngram(kata(k.pesan), n);
  const diKunci = ngram(kata(k.alasan[k.kunci]), n);
  const diPengecoh = new Set(k.pengecoh.flatMap((h) => [...ngram(kata(k.alasan[h]), n)]));
  const sama = [...diKunci].filter((g) => dariPesan.has(g) && !diPengecoh.has(g));
  return sama.length > 0 ? { opsi: [k.kunci], alasan: `${String(n)}-gram pesan hanya diulang di kunci: "${sama[0] ?? ''}"` } : null;
};

const PARAM_D5 = [1, 2, 3] as const;
const d5: Detektor = (k, t) => {
  const m = PARAM_D5[Math.min(t, PARAM_D5.length - 1)] ?? 1;
  const U = Object.fromEntries(HURUF.map((h) => [h, kataIsi(k.alasan[h])])) as Record<KunciOpsi, Set<string>>;
  const skor = (h: KunciOpsi): number => HURUF.filter((x) => x !== h).reduce((a, x) => a + [...U[h]].filter((w) => U[x].has(w)).length, 0);
  const sk = skor(k.kunci);
  const maksP = Math.max(...k.pengecoh.map(skor));
  return sk - maksP >= m ? { opsi: [k.kunci], alasan: `kunci "pusat": berbagi ${String(sk)} unsur dengan opsi lain, pengecoh tertinggi ${String(maksP)} (selisih ≥ ${String(m)})` } : null;
};

function dKata(daftar: readonly string[], jenis: string): Detektor {
  return (k, t) => {
    const diKunci = frasaDi(k.alasan[k.kunci], daftar);
    const perPengecoh = k.pengecoh.map((h) => ({ h, f: frasaDi(k.alasan[h], daftar) })).filter((x) => x.f.length > 0);
    if (diKunci.length > 0 && perPengecoh.length === 0) return { opsi: [k.kunci], alasan: `kata ${jenis} hanya di kunci: ${diKunci.join(', ')}` };
    const minPengecoh = t === 0 ? 1 : t === 1 ? 2 : Infinity;
    if (diKunci.length === 0 && perPengecoh.length >= minPengecoh) {
      return { opsi: perPengecoh.map((x) => x.h), alasan: `kata ${jenis} hanya di pengecoh (${perPengecoh.map((x) => `${x.h}: ${x.f.join(', ')}`).join('; ')})` };
    }
    return null;
  };
}

const d8: Detektor = (k) => {
  const tanpa = HURUF.filter((h) => k.label[h] === null);
  const betul = HURUF.filter((h) => k.label[h] === 'Betul').length;
  const keliru = HURUF.filter((h) => k.label[h] === 'Keliru').length;
  if (tanpa.length > 0) return { opsi: tanpa, alasan: `opsi tanpa awalan Betul/Keliru: ${tanpa.join(', ')}` };
  if (betul !== 2 || keliru !== 2) return { opsi: [...HURUF], alasan: `label ${String(betul)} Betul + ${String(keliru)} Keliru; harus 2 + 2` };
  return null;
};

const d9: Detektor = (k) => {
  const tunggal = HURUF.map((h) => ({ h, n: nilaiAngka(k.alasan[h]) })).filter((x) => x.n.length === 1);
  if (tunggal.length < 3) return null;
  const v = tunggal.map((x) => x.n[0] as number);
  const naik = v.every((x, i) => i === 0 || x >= (v[i - 1] as number));
  const turun = v.every((x, i) => i === 0 || x <= (v[i - 1] as number));
  return naik || turun ? null : { opsi: tunggal.map((x) => x.h), alasan: `nilai angka opsi ${tunggal.map((x) => `${x.h}=${String(x.n[0])}`).join(', ')} tidak urut` };
};

const DETEKTOR: Readonly<Record<KodeDetektor, Detektor>> = {
  D1: d1,
  D2: d2,
  D3: d3,
  D4: d4,
  D5: d5,
  D6: dKata(KATA_ABSOLUT, 'absolut'),
  D7: dKata(KATA_PELUNAK, 'pelunak'),
  D8: d8,
  D9: d9,
};

/** Semua bendera satu soal di bawah ambang `a`. Murni. */
export function deteksi(s: SoalCacat, a: AmbangCacat = AMBANG_AWAL): Bendera[] {
  const label = {} as Record<KunciOpsi, 'Betul' | 'Keliru' | null>;
  const alasan = {} as Record<KunciOpsi, string>;
  for (const h of HURUF) {
    const p = pisahLabel(teksPolos(s.pilihan[h]));
    label[h] = p.label;
    alasan[h] = p.alasan;
  }
  const k: Konteks = { kunci: s.kunci, pengecoh: HURUF.filter((h) => h !== s.kunci), label, alasan, pesan: teksPolos(s.pesan) };
  const hasil: Bendera[] = [];
  for (const kode of KODE_DETEKTOR) {
    const pelindung = PELINDUNG.includes(kode);
    const tangga = pelindung ? 0 : Math.max(0, Math.min(a[kode], ANAK_TANGGA[kode]));
    const dicatat = !pelindung && tangga >= ANAK_TANGGA[kode];
    const r = DETEKTOR[kode](k, dicatat ? 0 : tangga);
    if (r !== null) hasil.push({ kode, nama: NAMA_DETEKTOR[kode], status: dicatat ? 'dicatat' : 'menolak', opsi: r.opsi, alasan: r.alasan });
  }
  return hasil;
}

export function menolak(b: readonly Bendera[]): Bendera[] {
  return b.filter((x) => x.status === 'menolak');
}

/* ---------------------------------------------------------------------- */
/* kalibrasi (pra-registrasi §2)                                           */
/* ---------------------------------------------------------------------- */

export interface LangkahKalibrasi {
  ambang: AmbangCacat;
  /** Soal tayang yang punya ≥ 1 bendera menolak di ambang ini. */
  ditandai: string[];
  /** Jumlah soal tayang yang ditandai per detektor. */
  per_detektor: Partial<Record<KodeDetektor, number>>;
  /** Detektor yang diturunkan sesudah langkah ini (null = selesai). */
  turun: KodeDetektor | null;
}

/**
 * Selama > 1/6 soal tayang ditandai: detektor bukan-pelindung yang belum di
 * anak tangga terakhir dan menandai soal tayang terbanyak (seri → D1…D9)
 * turun satu anak tangga. Murni.
 */
export function kalibrasiAmbang(tayang: ReadonlyArray<{ id: string; soal: SoalCacat }>): { ambang: AmbangCacat; langkah: LangkahKalibrasi[] } {
  let ambang: AmbangCacat = { ...AMBANG_AWAL };
  const langkah: LangkahKalibrasi[] = [];
  for (let i = 0; i < 100; i++) {
    const per: Partial<Record<KodeDetektor, number>> = {};
    const ditandai: string[] = [];
    for (const t of tayang) {
      const b = menolak(deteksi(t.soal, ambang));
      if (b.length > 0) ditandai.push(t.id);
      for (const kd of new Set(b.map((x) => x.kode))) per[kd] = (per[kd] ?? 0) + 1;
    }
    const lebih = ditandai.length * 6 > tayang.length;
    let turun: KodeDetektor | null = null;
    if (lebih) {
      let terbaik = 0;
      for (const kd of KODE_DETEKTOR) {
        if (PELINDUNG.includes(kd) || ambang[kd] >= ANAK_TANGGA[kd]) continue;
        const n = per[kd] ?? 0;
        if (n > terbaik) {
          terbaik = n;
          turun = kd;
        }
      }
    }
    langkah.push({ ambang: { ...ambang }, ditandai, per_detektor: per, turun });
    if (turun === null) break;
    ambang = { ...ambang, [turun]: ambang[turun] + 1 };
  }
  return { ambang, langkah };
}
