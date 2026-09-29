/**
 * G-mirip (M2d-5 D-6): dua omongan dalam SATU simulasi tidak boleh berpola
 * pilihan hampir sama. Milik PEMERIKSA (kode): tanpa jaringan, tanpa acak.
 *
 * Kenapa: di M2d-4 TIRT omongan 1 dan 3 dikunci dengan empat pilihan yang
 * sama kerangkanya ("… disetop karena kenaikan harga kumulatif / keraguan
 * kelangsungan usaha / volume perdagangan nol / harga turun tajam", hanya
 * "hari ini" ↔ "Januari"). Penilai kealamian menyebutnya templat; pemain yang
 * sudah menjawab omongan 1 menjawab omongan 3 tanpa membaca kartu.
 *
 * **Ukuran.** Kerangka pilihan = keempat pilihan tanpa label "Betul,"/
 * "Keliru,", huruf kecil, dengan angka → ‹n›, rupiah → ‹rp›, nama bulan →
 * ‹bln›, nama samaran emiten → ‹emiten›, tanda baca dibuang. Kemiripan dua
 * omongan = indeks Jaccard himpunan kata kerangka keempat pilihannya.
 *
 * **Ambang (diturunkan dari kasus manusia yang lolos).** `ambangMirip()` =
 * 4 × kemiripan terbesar antar-omongan dalam satu kasus manusia di
 * `cases/*.json`. Hari ini: pasangan manusia paling mirip ULTJ 2–3 = 0,100 →
 * ambang 0,40. Pembanding (terukur 30 Sep): TIRT M2d-4 1–3 = 0,706 (ditolak);
 * ULTJ M2d-3 2–3 = 0,481 (dua kali soal "turunnya vs dividen", ditolak);
 * DADA M2d-4 1–3 = 0,294 (dua soal berbeda yang sama-sama menyebut
 * "penutupan", lolos). Bila kasus manusia berubah, ambang mengikuti.
 *
 * **Siapa yang ditolak.** Omongan `no` ditolak bila kemiripannya ≥ ambang
 * dengan omongan yang SUDAH TERKUNCI, atau dengan omongan bernomor lebih kecil
 * yang juga belum terkunci (dari sepasang omongan baru yang mirip, yang
 * bernomor lebih besar ditulis ulang).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import type { KunciOpsi } from './draf.ts';
import { AKAR } from './env.ts';

const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];
const BULAN = /(?<![\p{L}])(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)(?![\p{L}])/giu;
/** Pengali ambang terhadap kemiripan manusia terbesar. */
export const PENGALI_AMBANG = 4;

/** Kata kerangka satu pilihan. */
export function kerangkaPilihan(teks: string): string[] {
  return teksPolos(teks)
    .toLowerCase()
    .replace(/^\s*(betul|keliru),\s*/, '')
    .replace(/perusahaan\s+\p{L}(?![\p{L}])/gu, ' ‹emiten› ')
    .replace(BULAN, ' ‹bln› ')
    .replace(/rp\s?\d[\d.,]*/g, ' ‹rp› ')
    .replace(/\d+(?:[.,]\d+)*/g, ' ‹n› ')
    .replace(/[^\p{L}‹›\s]/gu, ' ')
    .split(/\s+/)
    .filter((k) => k !== '');
}

/** Himpunan kata kerangka keempat pilihan satu omongan. */
export function kerangkaOmongan(pilihan: Readonly<Record<KunciOpsi, string>>): Set<string> {
  return new Set(HURUF.flatMap((h) => kerangkaPilihan(pilihan[h] ?? '')));
}

/** Indeks Jaccard kerangka pilihan dua omongan (0–1). */
export function kemiripan(a: Readonly<Record<KunciOpsi, string>>, b: Readonly<Record<KunciOpsi, string>>): number {
  const x = kerangkaOmongan(a);
  const y = kerangkaOmongan(b);
  const irisan = [...x].filter((k) => y.has(k)).length;
  const gabung = x.size + y.size - irisan;
  return gabung === 0 ? 0 : irisan / gabung;
}

export interface KasusMirip {
  berkas: string;
  soal: ReadonlyArray<{ pilihan: ReadonlyArray<{ teks: string }> }>;
}

/** Kemiripan terbesar antar-omongan di dalam satu kasus manusia, dan ambangnya. Murni. */
export function ambangMiripDari(kasus: readonly KasusMirip[]): { maks_manusia: number; ambang: number; sumber: string[] } {
  let maks = 0;
  for (const k of kasus) {
    const p = k.soal.map((s) => Object.fromEntries(s.pilihan.map((x, i) => [HURUF[i] ?? 'a', x.teks])) as Record<KunciOpsi, string>);
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) maks = Math.max(maks, kemiripan(p[i] as Record<KunciOpsi, string>, p[j] as Record<KunciOpsi, string>));
  }
  if (maks === 0) throw new Error('Tidak ada pasangan omongan manusia untuk menurunkan ambang G-mirip.');
  return { maks_manusia: maks, ambang: Math.round(PENGALI_AMBANG * maks * 1000) / 1000, sumber: kasus.map((k) => k.berkas) };
}

let tersimpan: ReturnType<typeof ambangMiripDari> | null = null;

/** Ambang dari semua `cases/*.json` (dibaca sekali per proses). */
export function ambangMirip(): ReturnType<typeof ambangMiripDari> {
  if (tersimpan !== null) return tersimpan;
  const folder = `${AKAR}cases`;
  const kasus = readdirSync(folder)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ berkas: `cases/${f}`, soal: (JSON.parse(readFileSync(`${folder}/${f}`, 'utf8')) as { soal: KasusMirip['soal'] }).soal }));
  tersimpan = ambangMiripDari(kasus);
  return tersimpan;
}

export interface PutusanMirip {
  tolak: boolean;
  ambang: number;
  /** Kemiripan dengan tiap omongan lain yang ada. */
  pasangan: Array<{ dengan: number; kemiripan: number; terkunci: boolean }>;
  alasan: string[];
}

/** G-mirip untuk omongan `no` terhadap omongan lain di draf gabungan. */
export function gMirip(
  no: number,
  draf: ReadonlyArray<{ pilihan?: unknown } | null | undefined>,
  terkunci: ReadonlySet<number>,
  ambang: number = ambangMirip().ambang,
): PutusanMirip {
  const ini = draf[no - 1]?.pilihan as Record<KunciOpsi, string> | undefined;
  const pasangan: PutusanMirip['pasangan'] = [];
  if (ini !== undefined && ini !== null && typeof ini === 'object') {
    draf.forEach((o, i) => {
      const lain = i + 1;
      const p = o?.pilihan as Record<KunciOpsi, string> | undefined;
      if (lain === no || p === undefined || p === null || typeof p !== 'object') return;
      pasangan.push({ dengan: lain, kemiripan: Math.round(kemiripan(ini, p) * 1000) / 1000, terkunci: terkunci.has(lain) });
    });
  }
  const kena = pasangan.filter((x) => x.kemiripan >= ambang && (x.terkunci || x.dengan < no));
  return {
    tolak: kena.length > 0,
    ambang,
    pasangan,
    alasan: kena.map(
      (x) =>
        `Pola keempat pilihan omongan ini hampir sama dengan omongan ${String(x.dengan)} (kemiripan kerangka ${x.kemiripan.toFixed(2).replace('.', ',')} ≥ ambang ` +
        `${ambang.toFixed(2).replace('.', ',')}): pemain yang sudah menjawab omongan itu bisa menjawab ini tanpa membaca kartu. ` +
        'Tanyakan hal lain dari kartu, dengan bentuk pilihan yang berbeda.',
    ),
  };
}
