/**
 * Proposisi templat dan penilainya (M2d-10 D-1). Nilai kebenaran setiap
 * klaim teman dan setiap pilihan DIHITUNG di sini dari fakta paket — tidak
 * pernah ditulis model, dan tidak diambil dari niat templat. Penilai melempar
 * bila proposisi menyebut fakta yang tidak ada di paket.
 */
import type { PaketFakta } from '../paket.ts';
import { fakta, kelas, suspensi, type KategoriAlasan } from './fakta.ts';

export type Pembanding = '>' | '>=' | '<' | '<=';

export type Proposisi =
  /** Alasan resmi penghentian `susp` berkategori `kategori`. */
  | { k: 'alasan'; susp: string; kategori: KategoriAlasan }
  /** Dua penghentian beralasan resmi berkategori sama. */
  | { k: 'sama-alasan'; a: string; b: string }
  /** Ada penghentian bertanggal di [dari, sampai] (inklusif). */
  | { k: 'ada-suspensi'; dari: string; sampai: string }
  /** Nilai fakta tepat `nilai`. */
  | { k: 'nilai'; fact_id: string; nilai: number }
  | { k: 'banding'; fact_id: string; op: Pembanding; ambang: number }
  /** min ≤ nilai < maks. */
  | { k: 'rentang'; fact_id: string; min: number; maks: number }
  /** Harga `ke` lebih tinggi (naik) / lebih rendah (turun) dari harga `dari`. */
  | { k: 'arah'; dari: string; ke: string; arah: 'naik' | 'turun' }
  /** Fakta hari-naik-beruntun bernilai `hari` (tiap hari rangkaian lebih tinggi dari sebelumnya). */
  | { k: 'naik-beruntun'; fact_id: string; hari: number }
  /** Nilai fakta = nilai tertinggi di kelasnya (fakta paket sekelas). */
  | { k: 'tertinggi'; fact_id: string }
  | { k: 'dan'; p: Proposisi[] }
  | { k: 'bukan'; p: Proposisi };

function angka(paket: PaketFakta, id: string): number {
  const n = fakta(paket, id).nilai;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`Fakta "${id}" tidak berangka.`);
  return n;
}

const SAMA = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

function kategori(paket: PaketFakta, id: string): KategoriAlasan {
  fakta(paket, id);
  const s = suspensi(paket).find((x) => x.fact_id === id);
  if (s === undefined) throw new Error(`Fakta "${id}" bukan penghentian.`);
  return s.kategori;
}

/** Nilai kebenaran proposisi menurut fakta paket. Murni. */
export function evaluasi(p: Proposisi, paket: PaketFakta): boolean {
  switch (p.k) {
    case 'alasan':
      return kategori(paket, p.susp) === p.kategori;
    case 'sama-alasan':
      return kategori(paket, p.a) === kategori(paket, p.b);
    case 'ada-suspensi':
      return suspensi(paket).some((s) => s.tanggal >= p.dari && s.tanggal <= p.sampai);
    case 'nilai':
      return SAMA(angka(paket, p.fact_id), p.nilai);
    case 'banding': {
      const n = angka(paket, p.fact_id);
      return p.op === '>' ? n > p.ambang : p.op === '>=' ? n >= p.ambang : p.op === '<' ? n < p.ambang : n <= p.ambang;
    }
    case 'rentang': {
      const n = angka(paket, p.fact_id);
      return n >= p.min && n < p.maks;
    }
    case 'arah': {
      const a = angka(paket, p.dari);
      const b = angka(paket, p.ke);
      return p.arah === 'naik' ? b > a : b < a;
    }
    case 'naik-beruntun':
      return SAMA(angka(paket, p.fact_id), p.hari);
    case 'tertinggi': {
      const k = kelas(p.fact_id);
      const n = angka(paket, p.fact_id);
      const sekelas = paket.fakta.filter((f) => kelas(f.fact_id) === k && typeof f.nilai === 'number').map((f) => f.nilai as number);
      return sekelas.every((x) => x <= n);
    }
    case 'dan':
      return p.p.every((x) => evaluasi(x, paket));
    case 'bukan':
      return !evaluasi(p.p, paket);
  }
}

/** fact_id yang disebut proposisi (untuk: fakta klaim & kunci harus ada di kartu). */
export function faktaDisebut(p: Proposisi): string[] {
  switch (p.k) {
    case 'alasan':
      return [p.susp];
    case 'sama-alasan':
      return [p.a, p.b];
    case 'ada-suspensi':
      return [];
    case 'nilai':
    case 'banding':
    case 'rentang':
    case 'naik-beruntun':
    case 'tertinggi':
      return [p.fact_id];
    case 'arah':
      return [p.dari, p.ke];
    case 'dan':
      return [...new Set(p.p.flatMap(faktaDisebut))];
    case 'bukan':
      return faktaDisebut(p.p);
  }
}

/**
 * Bacaan dengan RUJUKAN LAIN yang sejenis: proposisi yang sama, tetapi satu
 * penanda waktunya (fakta sekelas) diganti fakta lain di paket. Bila salah
 * satu bacaan ini benar, teks yang memuat proposisi itu wajib menyebut
 * penanda waktunya — kalau tidak, pembaca bisa membelanya dengan kartu lain
 * (sebab soal M2d-8 punya "pilihan kedua yang benar"). Murni.
 */
export function bacaanLain(p: Proposisi, paket: PaketFakta): Proposisi[] {
  const sekelas = (id: string): string[] => {
    const k = kelas(id);
    if (k === id) return [];
    return paket.fakta.map((f) => f.fact_id).filter((x) => x !== id && kelas(x) === k);
  };
  switch (p.k) {
    case 'alasan':
      return sekelas(p.susp).map((s) => ({ ...p, susp: s }));
    case 'nilai':
    case 'banding':
    case 'rentang':
      return sekelas(p.fact_id).filter((id) => typeof fakta(paket, id).nilai === 'number').map((id) => ({ ...p, fact_id: id }));
    case 'sama-alasan':
    case 'ada-suspensi':
    case 'arah':
    case 'naik-beruntun':
    case 'tertinggi':
      return [];
    case 'dan':
      return p.p.flatMap((x, i) => bacaanLain(x, paket).map((alt) => ({ k: 'dan' as const, p: p.p.map((y, j) => (j === i ? alt : y)) })));
    case 'bukan':
      return bacaanLain(p.p, paket).map((alt) => ({ k: 'bukan' as const, p: alt }));
  }
}

/** Apakah proposisi benar di salah satu bacaan rujukan lain. */
export function benarDiBacaanLain(p: Proposisi, paket: PaketFakta): boolean {
  return bacaanLain(p, paket).some((x) => evaluasi(x, paket));
}
