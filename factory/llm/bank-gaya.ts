/**
 * Bank gaya (M2d-3 D-3) dan pemilih heuristiknya.
 *
 * M2d-2 memberi penulis dua bentuk pesan tetap (isi dikosongkan `<…>`) dan
 * kealamian naik dari 2,67 ke 3,83 — masih di bawah omongan manusia (4,33).
 * Di sini penulis menerima 2–3 kalimat CONTOH yang dipilih menurut topik
 * peristiwa/sudut dan nada yang diminta perencana, dari bank kecil terlacak
 * (`bank-gaya.json`): pesan teman di kasus yang hidup + kalimat yang ditulis
 * baru khusus sebagai contoh gaya.
 *
 * Aturan pemilih (deterministik; tanpa acak):
 * - kalimat MANUSIA dari kasus yang sedang ditulis tidak pernah dipilih —
 *   penulis DADA tidak boleh melihat pesan Dimas/Rara/Bayu (ia akan
 *   menyalinnya, dan pembanding kealamian M2d-3 memakai pesan itu);
 * - skor: nada sama +2; topik utama +2, topik lain peristiwa +1; kalimat
 *   manusia +0,5 (paling hidup); seri diputus urutan di bank;
 * - paling banyak dua contoh bernada sama, supaya contoh tidak seragam.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Nada bank v1 (M2d-3). */
export const NADA_V1 = ['yakin', 'ragu', 'sok tahu', 'panik', 'pamer'] as const;
/** Semua nada yang dikenal; "ikut-ikutan" baru di bank v2 (M2d-4 D-4, K-07). */
export const NADA = [...NADA_V1, 'ikut-ikutan'] as const;
export const TOPIK = ['dividen', 'harga', 'suspensi', 'pemilik', 'laporan'] as const;
export const REGISTER = ['santai', 'sangat santai'] as const;
export type Nada = (typeof NADA)[number];
export type Topik = (typeof TOPIK)[number];

export interface KalimatGaya {
  id: string;
  teks: string;
  register: (typeof REGISTER)[number];
  nada: Nada;
  topik: Topik;
  /** `tulis-baru`, `manusia-<paket>` (v1), atau `tulis-baru-v2` (v2). */
  sumber: string;
  /** v2: asal gaya (statistik korpus; bukan kutipan). */
  asal?: string;
  /** v2: jumlah kata (informatif). */
  n_kata?: number;
}

const JALUR_BANK = fileURLToPath(new URL('./bank-gaya.json', import.meta.url));
/**
 * Bank gaya v2 (M2d-4 D-4): 90 kalimat dari K-07, semuanya ditulis baru
 * mengikuti statistik gaya korpus santai berlisensi MIT (STIF-Indonesia;
 * IndoNLU EmoT/SmSA) — tidak ada kalimat korpus yang disalin. Tanpa "gue";
 * "gw"/"aku", "ga/gak", partikel penutup, "!" jarang. Salinan byte-sama dari
 * lampiran kontrak M2d-4; atribusi di `docs/bukti/lingkar-agen-gaya.md`.
 */
const JALUR_BANK_V2 = fileURLToPath(new URL('./bank-gaya-v2.json', import.meta.url));

export type VersiBank = 1 | 2;

/** Bank gaya v1 (M2d-3, bawaan) atau v2 (M2d-4). v1 tetap ada untuk pembanding. */
export function bacaBank(versi: VersiBank = 1): KalimatGaya[] {
  return (JSON.parse(readFileSync(versi === 2 ? JALUR_BANK_V2 : JALUR_BANK, 'utf8')) as { kalimat: KalimatGaya[] }).kalimat;
}

/** Topik yang disebut kalimat peristiwa paket, dalam urutan kemunculan. */
export function topikDariTeks(teks: string): Topik[] {
  const t = teks.toLowerCase();
  const pola: Array<[Topik, RegExp]> = [
    ['suspensi', /menghentikan sementara|dihentikan sementara|suspensi|cooling down|setop/],
    ['dividen', /dividen/],
    ['pemilik', /pemilik terbesar|orang dalam|kepemilikan/],
    ['laporan', /laporan keuangan|rapat umum|laporan/],
    ['harga', /harga|volume/],
  ];
  return pola
    .map(([topik, p]): [Topik, number] => [topik, t.search(p)])
    .filter(([, i]) => i >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([topik]) => topik);
}

/**
 * Nada untuk posisi omongan `no` pada sudut ke-`sudut` (perencana): berputar
 * di lima nada supaya tiga omongan satu simulasi tidak bernada sama, dan sudut
 * baru mendapat nada baru.
 */
export const URUT_NADA_V1: readonly Nada[] = ['yakin', 'sok tahu', 'ragu', 'panik', 'pamer'];
/** Urutan nada M2d-4: enam nada bank v2; sudut ke-2 mendapat panik, pamer, ikut-ikutan. */
export const URUT_NADA_V2: readonly Nada[] = ['yakin', 'sok tahu', 'ragu', 'panik', 'pamer', 'ikut-ikutan'];

export function nadaUntuk(no: number, sudut = 1, urut: readonly Nada[] = URUT_NADA_V1): Nada {
  return urut[(no - 1 + 3 * (sudut - 1)) % urut.length] ?? 'yakin';
}

export interface PermintaanContoh {
  /** Topik dalam urutan kepentingan: [topik sudut, …topik peristiwa]. */
  topik: readonly Topik[];
  nada: Nada;
  paket_id: string;
  jumlah?: number;
}

export function pilihContoh(p: PermintaanContoh, bank: readonly KalimatGaya[] = bacaBank()): KalimatGaya[] {
  const jumlah = p.jumlah ?? 3;
  const utama = p.topik[0];
  const skor = (k: KalimatGaya): number =>
    (k.nada === p.nada ? 2 : 0) +
    (k.topik === utama ? 2 : p.topik.includes(k.topik) ? 1 : 0) +
    (k.sumber.startsWith('manusia-') ? 0.5 : 0);
  const calon = bank
    .map((k, i) => ({ k, i, s: skor(k) }))
    .filter((x) => x.k.sumber !== `manusia-${p.paket_id}`)
    .sort((a, b) => b.s - a.s || a.i - b.i);
  const hasil: KalimatGaya[] = [];
  for (const { k } of calon) {
    if (hasil.length >= jumlah) break;
    if (hasil.filter((x) => x.nada === k.nada).length >= 2) continue;
    hasil.push(k);
  }
  return hasil;
}

/** Bagian pesan penulis yang memuat nada dan contoh gaya. */
export function tulisContoh(nada: Nada, contoh: readonly KalimatGaya[]): string {
  return [
    `NADA YANG DIMINTA untuk pesan omongan ini: ${nada}.`,
    'Contoh gaya dari bank gaya — tiru GAYANYA saja (pilihan kata, panjang, cara bicara); jangan menyalin kalimat, nama emiten, maupun angkanya:',
    ...contoh.map((c) => `- "${c.teks}" (nada ${c.nada}, ${c.register})`),
  ].join('\n');
}
