/**
 * Gerbang gaya (M2d-4 D-1–D-3): tiga pemeriksaan deterministik milik
 * PEMERIKSA (kode), dijalankan bersama gerbang G sebelum peran model mana pun
 * dipanggil. Tanpa jaringan, tanpa jam, tanpa acak.
 *
 * Kenapa: di M2d-3 soal agen terasa kaku bagi pemilik dan penguji — pilihan
 * jawaban lebih panjang dari soal manusia dan berpola `Betul/Keliru, [jawaban],
 * [tambahan]` ("…, jadi naiknya nyata"), sedangkan soal manusia yang hidup
 * pendek dan satu klausa.
 *
 * **G-panjang (D-1).** Pilihan jawaban ≤ batas kata pilihan; omongan teman ≤
 * batas kata pesan. Kata dihitung dari TEKS TAMPIL: rujukan `[[id|teks]]`
 * diganti teksnya (`teksPolos`), lalu dipecah di spasi; potongan tanpa huruf
 * atau angka (mis. "—" yang berdiri sendiri) bukan kata. Batasnya BUKAN angka
 * tulisan tangan: `batasPanjang()` menghitung maksimum dari soal manusia di
 * `cases/*.json` (hari ini 11 dan 26). Bila kasus manusia berubah, batas
 * mengikuti maksimum baru — semua soal manusia selalu lolos.
 *
 * **G-satu-klausa (D-2).** Pilihan berbentuk `Betul|Keliru, <satu klausa>`.
 * Sesudah koma label, tolak bila ada:
 * - koma yang diikuti penghubung ekor (`jadi`, `karena`, `sehingga`,
 *   `makanya`, `soalnya`, dan kerabatnya di `PENGHUBUNG_EKOR`);
 * - tanda pisah (`—`, `–`, ` - `) atau titik koma;
 * - koma kedua yang memulai klausa baru. Tafsiran (ditulis supaya reviewer
 *   bisa menolaknya): koma kedua hanya sah bila membuka KONTRAS yang
 *   membetulkan klaim yang sama — `tetapi`, `tapi`, `bukan`, `melainkan`.
 *   Ini diturunkan dari soal manusia: "Keliru, dividennya Rp130, bukan Rp45."
 *   dan "Keliru, tiap tahun memang ada, tetapi jumlahnya pernah turun jauh."
 *   Koma ketiga selalu ditolak.
 *   Koma di dalam angka ("2,21") bukan koma klausa: yang dihitung hanya koma
 *   yang diikuti spasi.
 *   "karena" TANPA koma ("Betul, malah ia tidak kebagian karena tanggal
 *   ex-nya.") dipakai soal manusia, jadi tidak ditolak.
 *
 * **G-register (D-3).** Pemilik: "gue" terasa usang — pakai "gw" atau "aku";
 * "lo" diganti "lu" atau "kamu" sesuai bank gaya v2. Omongan teman yang
 * memuat "gue", "gua", "lo", atau "elo" (utuh, termasuk "guenya"/"gue-nya")
 * ditolak. Penanda bahasa resmi tetap ditolak G-kaku (`gerbang-g.ts`).
 */
import { readFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { berkasKasusManusia } from '../kasus/kasus-manusia.ts';

const KUNCI: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

/** Kata di teks tampil: rujukan diganti teksnya, dipecah di spasi, hanya potongan yang memuat huruf/angka. */
export function hitungKata(teks: string): number {
  return teksPolos(teks)
    .trim()
    .split(/\s+/)
    .filter((k) => /[\p{L}\p{N}]/u.test(k)).length;
}

export interface BatasPanjang {
  /** Kata paling banyak di satu pilihan jawaban. */
  pilihan: number;
  /** Kata paling banyak di satu omongan teman. */
  pesan: number;
  /** Dari mana angkanya. */
  sumber: string[];
}

/** Bentuk soal di `cases/*.json` yang dibaca gerbang ini (hanya medan yang dipakai). */
export interface SoalKasusGaya {
  pesan: { isi: string };
  pilihan: Array<{ teks: string }>;
}

/** Maksimum kata pilihan dan pesan dari soal manusia. Murni. */
export function batasPanjangDari(kasus: ReadonlyArray<{ berkas: string; soal: readonly SoalKasusGaya[] }>): BatasPanjang {
  let pilihan = 0;
  let pesan = 0;
  for (const k of kasus) {
    for (const s of k.soal) {
      pesan = Math.max(pesan, hitungKata(s.pesan.isi));
      for (const p of s.pilihan) pilihan = Math.max(pilihan, hitungKata(p.teks));
    }
  }
  if (pilihan === 0 || pesan === 0) throw new Error('Tidak ada soal manusia untuk menurunkan batas panjang.');
  return { pilihan, pesan, sumber: kasus.map((k) => k.berkas) };
}

let batasTersimpan: BatasPanjang | null = null;

/** Batas panjang dari semua `cases/*.json` (dibaca sekali per proses). */
export function batasPanjang(): BatasPanjang {
  if (batasTersimpan !== null) return batasTersimpan;
  const folder = `${AKAR}cases`;
  // Hanya soal tulisan manusia: kasus dari agent tidak ikut menyetel batasnya (`kasus-manusia.ts`).
  const kasus = berkasKasusManusia(folder)
    .map((f) => ({ berkas: `cases/${f}`, soal: (JSON.parse(readFileSync(`${folder}/${f}`, 'utf8')) as { soal: SoalKasusGaya[] }).soal }));
  batasTersimpan = batasPanjangDari(kasus);
  return batasTersimpan;
}

export interface PutusanPanjang {
  tolak: boolean;
  kata_pesan: number;
  kata_pilihan: Record<KunciOpsi, number>;
  batas: { pilihan: number; pesan: number };
  alasan: string[];
}

/** G-panjang: pesan ≤ batas kata pesan; tiap pilihan ≤ batas kata pilihan. */
export function gPanjang(o: OmonganDraf, batas: BatasPanjang = batasPanjang()): PutusanPanjang {
  const kata_pesan = hitungKata(o.pesan);
  const kata_pilihan = Object.fromEntries(KUNCI.map((k) => [k, hitungKata(o.pilihan[k])])) as Record<KunciOpsi, number>;
  const alasan: string[] = [];
  if (kata_pesan > batas.pesan) {
    alasan.push(`Pesan ${String(kata_pesan)} kata; paling banyak ${String(batas.pesan)} (omongan manusia terpanjang di kasus yang hidup).`);
  }
  const panjang = KUNCI.filter((k) => kata_pilihan[k] > batas.pilihan);
  if (panjang.length > 0) {
    alasan.push(
      `Pilihan ${panjang.map((k) => `${k} ${String(kata_pilihan[k])} kata`).join(', ')}; paling banyak ${String(batas.pilihan)} kata ` +
        '(pilihan manusia terpanjang di kasus yang hidup). Satu label + satu klausa pendek.',
    );
  }
  return { tolak: alasan.length > 0, kata_pesan, kata_pilihan, batas: { pilihan: batas.pilihan, pesan: batas.pesan }, alasan };
}

/** Penghubung ekor yang menempelkan klausa tambahan sesudah koma. Lima pertama dari kontrak. */
export const PENGHUBUNG_EKOR = [
  'jadi', 'karena', 'sehingga', 'makanya', 'soalnya',
  'sebab', 'maka', 'jadinya', 'akibatnya', 'artinya', 'berarti', 'padahal', 'dan', 'terus', 'lalu', 'yang',
] as const;
/** Pembuka koma kedua yang sah: kontras yang membetulkan klaim yang sama (dari soal manusia). */
export const PEMBUKA_KONTRAS = ['tetapi', 'tapi', 'bukan', 'melainkan'] as const;

export interface MasalahKlausa {
  pilihan: KunciOpsi;
  alasan: string;
}

function kataAwal(teks: string): string {
  return (/^[\p{L}-]+/u.exec(teks)?.[0] ?? '').toLowerCase();
}

/** Masalah satu-klausa di satu pilihan; `null` bila lolos (atau bila label tidak ada — itu urusan validator). */
export function masalahKlausa(teks: string): string | null {
  const polos = teksPolos(teks).trim();
  const label = /^(Betul|Keliru),\s+/.exec(polos);
  if (label === null) return null;
  const sisa = polos.slice(label[0].length);
  if (/[—–]|\s-\s/.test(sisa)) return 'memakai tanda pisah untuk menempelkan klausa kedua';
  if (sisa.includes(';')) return 'memakai titik koma untuk menempelkan klausa kedua';
  const koma = [...sisa.matchAll(/,\s+/g)];
  for (const [i, m] of koma.entries()) {
    const kata = kataAwal(sisa.slice((m.index ?? 0) + m[0].length));
    if ((PENGHUBUNG_EKOR as readonly string[]).includes(kata)) return `menempelkan ekor ", ${kata} …" sesudah jawabannya`;
    if (i >= 1) return 'memuat lebih dari dua koma: tiga klausa';
    if (!(PEMBUKA_KONTRAS as readonly string[]).includes(kata)) return `koma kedua memulai klausa baru (", ${kata} …")`;
  }
  return null;
}

export interface PutusanKlausa {
  tolak: boolean;
  masalah: MasalahKlausa[];
  alasan: string[];
}

/** G-satu-klausa: keempat pilihan berbentuk `Betul|Keliru, <satu klausa>`. */
export function gSatuKlausa(o: OmonganDraf): PutusanKlausa {
  const masalah = KUNCI.map((k) => ({ pilihan: k, alasan: masalahKlausa(o.pilihan[k]) })).filter(
    (x): x is MasalahKlausa => x.alasan !== null,
  );
  return {
    tolak: masalah.length > 0,
    masalah,
    alasan: masalah.map(
      (m) =>
        `Pilihan ${m.pilihan} ${m.alasan}. Bentuknya "Betul, <satu klausa>" atau "Keliru, <satu klausa>" — ` +
        'tanpa ", jadi …", ", karena …", ", soalnya …", atau tambahan sesudah jawabannya.',
    ),
  };
}

/** Kata ganti yang ditolak di omongan teman (keputusan pemilik 29 Sep: pakai "gw"/"aku", "lu"/"kamu"). */
export const KATA_GANTI_USANG = ['gue', 'gua', 'lo', 'elo'] as const;
const POLA_USANG = new RegExp(`(?<![\\p{L}\\p{N}])(${KATA_GANTI_USANG.join('|')})(?:-?nya)?(?![\\p{L}\\p{N}])`, 'giu');

export interface PutusanRegister {
  tolak: boolean;
  kata: string[];
  alasan: string[];
}

/** G-register: omongan teman tanpa "gue"/"gua"/"lo"/"elo". */
export function gRegister(pesan: string): PutusanRegister {
  const kata = [...new Set([...teksPolos(pesan).matchAll(POLA_USANG)].map((m) => m[0].toLowerCase()))];
  return {
    tolak: kata.length > 0,
    kata,
    alasan:
      kata.length > 0
        ? [`Pesan memakai ${kata.map((k) => `"${k}"`).join(', ')}; pakai "gw" atau "aku" (dan "lu" atau "kamu") seperti contoh gaya.`]
        : [],
  };
}

export interface PutusanGaya {
  tolak: boolean;
  panjang: PutusanPanjang;
  klausa: PutusanKlausa;
  register: PutusanRegister;
  /** Butir umpan balik untuk penulis, bertanda sumbernya. */
  umpan: string[];
}

/** Ketiga gerbang gaya untuk satu omongan. */
export function gerbangGaya(o: OmonganDraf, batas: BatasPanjang = batasPanjang()): PutusanGaya {
  const panjang = gPanjang(o, batas);
  const klausa = gSatuKlausa(o);
  const register = gRegister(o.pesan);
  return {
    tolak: panjang.tolak || klausa.tolak || register.tolak,
    panjang,
    klausa,
    register,
    umpan: [
      ...panjang.alasan.map((a) => `[pemeriksa: G-panjang] ${a}`),
      ...klausa.alasan.map((a) => `[pemeriksa: G-satu-klausa] ${a}`),
      ...register.alasan.map((a) => `[pemeriksa: G-register] ${a}`),
    ],
  };
}
