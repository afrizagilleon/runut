/**
 * Gerbang G (M2d-3 D-2): dua pemeriksaan deterministik milik PEMERIKSA (kode),
 * dijalankan sebelum peran model mana pun dipanggil. Tanpa jaringan, tanpa
 * jam, tanpa acak.
 *
 * **G-angka-cukup.** Di M2d-2 satu omongan lolos gerbang tebak di dalam
 * lingkar padahal kuncinya bisa DIHITUNG dari angka di pesan dan pilihan:
 * "harga cuma naik 2,21 persen dari 48 ke 106" dengan kunci "106 itu 2,21 kali
 * 48" — 106 ÷ 48 = 2,21, dan ketiga penguji luar menghitungnya. Aturannya:
 * setiap angka di pilihan KUNCI dicocokkan dengan hubungan antar-DUA angka
 * lain di teks yang dilihat penebak (pesan + keempat pilihan). Bila ada yang
 * cocok, penebak tanpa kartu bisa sampai ke kunci dengan berhitung → tolak.
 *
 *   hubungan yang dicoba, menurut satuan angka di pilihan kunci:
 *   - "kali" / "lipat" / "x":   x ÷ y                        (kelipatan, rasio)
 *   - "persen" / "%":           x ÷ y × 100, (x − y) ÷ y × 100 (persen),
 *                               |x − y| bila x dan y sendiri persen (poin)
 *   - rupiah / lembar:          |x − y|                      (selisih)
 *   - tanpa satuan:             tidak dicoba (bilangan cacah seperti "7 tahun",
 *                               "6 laporan" terlalu sering kebetulan cocok)
 *   x dan y harus bersatuan sama (atau salah satunya tanpa satuan), nilainya
 *   berbeda, dan bukan angka itu sendiri. Tanggal dan tahun tidak dihitung.
 *
 *   Toleransi: |angka − hasil hitung| ≤ max(setengah satuan terakhir yang
 *   tertulis, 1 % dari hasil hitung). "2,21" mewakili 2,205–2,215; 106 ÷ 48 =
 *   2,2083 → cocok.
 *
 *   Yang TIDAK ditangkap (keterbatasan, dilaporkan): klaim di PESAN yang bisa
 *   dibantah dengan berhitung (menunjuk "Keliru" tanpa menunjuk alasannya),
 *   pengecoh yang bisa disingkirkan dengan berhitung, dan hitungan tiga angka
 *   atau lebih.
 *
 * **G-kaku.** Omongan teman ditulis seperti obrolan grup, bukan dokumen:
 * tolak bila pesan memuat penanda bahasa resmi (`penanda-kaku.json`,
 * terlacak), lebih dari 220 karakter, atau lebih dari dua kalimat panjang
 * (≥ 12 kata).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { teksPolos } from '../skema/rujukan.ts';
import { angkaDalam, type AngkaDiTeks } from './angka.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';

export const TOLERANSI_RELATIF = 0.01;
const KUNCI: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

export type Satuan = 'kali' | 'persen' | 'rupiah' | 'lembar' | 'lain';

export interface AngkaG extends AngkaDiTeks {
  satuan: Satuan;
  /** Dari mana angka ini: pesan teman atau pilihan a–d. */
  asal: 'pesan' | KunciOpsi;
}

function satuanDi(teks: string, a: AngkaDiTeks): Satuan {
  const ekor = teks.slice(a.akhir, a.akhir + 24).toLowerCase();
  const kepala = teks.slice(Math.max(0, a.mulai - 4), a.mulai).toLowerCase();
  const sesudahPengali = ekor.replace(/^\s*(triliun|miliar|milyar|juta|ribu)\b/, '');
  if (/^\s*(kali\b|x\b|×|lipat\b)/.test(ekor)) return 'kali';
  if (/^\s*(%|persen\b)/.test(ekor)) return 'persen';
  if (/rp\.?\s*$/.test(kepala) || /^\s*rupiah\b/.test(sesudahPengali)) return 'rupiah';
  if (/^\s*(lembar|lot|saham)\b/.test(sesudahPengali)) return 'lembar';
  return 'lain';
}

/** Semua angka di teks yang dilihat penebak (pesan + empat pilihan), dengan satuan dan asalnya. */
export function angkaTerlihat(o: OmonganDraf): AngkaG[] {
  const hasil: AngkaG[] = [];
  const bagian: Array<[AngkaG['asal'], string]> = [['pesan', teksPolos(o.pesan)], ...KUNCI.map((k): [KunciOpsi, string] => [k, teksPolos(o.pilihan[k])])];
  for (const [asal, teks] of bagian) {
    for (const a of angkaDalam(teks)) hasil.push({ ...a, satuan: satuanDi(teks, a), asal });
  }
  return hasil;
}

export interface BuktiHitung {
  /** Angka di pilihan kunci yang bisa dihitung. */
  angka: string;
  satuan: Satuan;
  rumus: string;
  hasil: number;
}

/**
 * `persis` (M2d-27): untuk SELISIH rupiah/lembar kelonggaran relatif 1 % tidak dipakai. Kelonggaran itu dibuat untuk
 * kelipatan dan persen yang ditulis dibulatkan ("2,21 kali"); pada selisih ia membuat 392 "cocok" dengan 398 − 5 = 393
 * (m2d26-amag-1, penolakan keliru yang memakan satu panggilan model).
 */
function cocokHitung(z: AngkaDiTeks, hasil: number, persis: boolean = false): boolean {
  if (!Number.isFinite(hasil)) return false;
  return Math.abs(z.nilai - hasil) <= (persis ? z.presisi : Math.max(z.presisi, TOLERANSI_RELATIF * Math.abs(hasil))) + 1e-9;
}

function sejenis(x: AngkaG, y: AngkaG): boolean {
  return x.satuan === y.satuan || x.satuan === 'lain' || y.satuan === 'lain';
}

function tulisAngka(n: number): string {
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

/** Hubungan antar-dua angka yang cocok dengan satu angka di pilihan kunci. */
function hitungUntuk(z: AngkaG, semua: readonly AngkaG[]): BuktiHitung | null {
  if (z.satuan === 'lain') return null;
  const lain = semua.filter((x) => x !== z && x.nilai !== 0);
  for (const x of lain) {
    for (const y of lain) {
      if (x === y || x.nilai === y.nilai || !sejenis(x, y)) continue;
      const calon: Array<[string, number]> = [];
      if (z.satuan === 'kali') {
        if (x.satuan !== 'persen' && y.satuan !== 'persen' && x.satuan !== 'kali' && y.satuan !== 'kali') {
          calon.push([`${x.teks} ÷ ${y.teks}`, x.nilai / y.nilai]);
        }
      } else if (z.satuan === 'persen') {
        if (x.satuan === 'persen' && y.satuan === 'persen') {
          calon.push([`${x.teks} − ${y.teks} (poin persen)`, Math.abs(x.nilai - y.nilai)]);
        } else if (x.satuan !== 'persen' && y.satuan !== 'persen' && x.satuan !== 'kali' && y.satuan !== 'kali') {
          calon.push([`${x.teks} ÷ ${y.teks} × 100`, (x.nilai / y.nilai) * 100]);
          calon.push([`(${x.teks} − ${y.teks}) ÷ ${y.teks} × 100`, Math.abs(((x.nilai - y.nilai) / y.nilai) * 100)]);
        }
      } else if ((z.satuan === 'rupiah' || z.satuan === 'lembar') && x.satuan !== 'persen' && x.satuan !== 'kali' && y.satuan !== 'persen' && y.satuan !== 'kali') {
        if ((x.satuan === z.satuan || x.satuan === 'lain') && (y.satuan === z.satuan || y.satuan === 'lain') && x.nilai > y.nilai) {
          calon.push([`${x.teks} − ${y.teks}`, x.nilai - y.nilai]);
        }
      }
      for (const [rumus, hasil] of calon) {
        if (cocokHitung(z, hasil, z.satuan === 'rupiah' || z.satuan === 'lembar')) return { angka: z.teks, satuan: z.satuan, rumus: `${rumus} = ${tulisAngka(hasil)}`, hasil };
      }
    }
  }
  return null;
}

export interface PutusanAngkaCukup {
  tolak: boolean;
  bukti: BuktiHitung[];
  alasan: string;
}

/** G-angka-cukup: apakah angka di pesan + pilihan saja cukup untuk sampai ke pilihan kunci. */
export function gAngkaCukup(o: OmonganDraf): PutusanAngkaCukup {
  const semua = angkaTerlihat(o);
  const bukti = semua.filter((z) => z.asal === o.kunci).map((z) => hitungUntuk(z, semua)).filter((b): b is BuktiHitung => b !== null);
  const tolak = bukti.length > 0;
  return {
    tolak,
    bukti,
    alasan: tolak
      ? `Pilihan kunci ${o.kunci} bisa dihitung dari angka yang sudah ada di pesan dan pilihan, tanpa kartu: ` +
        `${bukti.map((b) => `"${b.angka}" = ${b.rumus}`).join('; ')}. Penebak akan menghitungnya. Jangan taruh di pesan ` +
        'dan pilihan semua angka yang dibutuhkan untuk menghitung klaim kunci — biarkan angka penentunya hanya ada di kartu.'
      : '',
  };
}

interface AturanKaku {
  penanda: string[];
  batas_karakter: number;
  kata_kalimat_panjang: number;
  maks_kalimat_panjang: number;
}

const JALUR_PENANDA = fileURLToPath(new URL('./penanda-kaku.json', import.meta.url));

export function aturanKaku(): AturanKaku {
  return JSON.parse(readFileSync(JALUR_PENANDA, 'utf8')) as AturanKaku;
}

/** Kalimat di pesan: dipotong di . ! ? yang diikuti spasi atau akhir teks (titik ribuan "1.461.200" tidak memotong). */
export function kalimatDalam(teks: string): string[] {
  return teks
    .split(/(?<=[.!?…])\s+/)
    .map((k) => k.trim())
    .filter((k) => k !== '');
}

export interface PutusanKaku {
  tolak: boolean;
  penanda: string[];
  panjang: number;
  kalimat_panjang: number;
  alasan: string[];
}

/** G-kaku: omongan teman harus terdengar seperti obrolan, bukan dokumen. */
export function gKaku(pesan: string, aturan: AturanKaku = aturanKaku()): PutusanKaku {
  const polos = teksPolos(pesan);
  const penanda = aturan.penanda.filter((p) => {
    const pola = new RegExp(`(?<![\\p{L}\\p{N}])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'iu');
    return pola.test(polos);
  });
  const panjangKalimat = kalimatDalam(polos).filter((k) => k.split(/\s+/).length >= aturan.kata_kalimat_panjang).length;
  const alasan: string[] = [];
  if (penanda.length > 0) {
    alasan.push(`Pesan memuat penanda bahasa resmi ${penanda.map((p) => `"${p}"`).join(', ')}; teman di grup obrolan tidak bicara begitu.`);
  }
  if (polos.length > aturan.batas_karakter) alasan.push(`Pesan ${String(polos.length)} karakter, lebih dari ${String(aturan.batas_karakter)}.`);
  if (panjangKalimat > aturan.maks_kalimat_panjang) {
    alasan.push(
      `Pesan memuat ${String(panjangKalimat)} kalimat panjang (≥ ${String(aturan.kata_kalimat_panjang)} kata); ` +
        `paling banyak ${String(aturan.maks_kalimat_panjang)} — pesan grup itu pendek-pendek.`,
    );
  }
  return { tolak: alasan.length > 0, penanda, panjang: polos.length, kalimat_panjang: panjangKalimat, alasan };
}

export interface PutusanG {
  tolak: boolean;
  angka_cukup: PutusanAngkaCukup;
  kaku: PutusanKaku;
  /** Butir umpan balik untuk penulis. */
  umpan: string[];
}

export function gerbangG(o: OmonganDraf): PutusanG {
  const angka_cukup = gAngkaCukup(o);
  const kaku = gKaku(o.pesan);
  return {
    tolak: angka_cukup.tolak || kaku.tolak,
    angka_cukup,
    kaku,
    umpan: [
      ...(angka_cukup.tolak ? [`[pemeriksa: G-angka-cukup] ${angka_cukup.alasan}`] : []),
      ...kaku.alasan.map((a) => `[pemeriksa: G-kaku] ${a}`),
    ],
  };
}
