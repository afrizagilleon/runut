/**
 * Kelas fakta yang dibaca templat (M2d-10 D-1). Semuanya murni: dibaca dari
 * `PaketFakta` saja (fact_id, nilai, kalimat fakta), tanpa jaringan dan tanpa
 * model. Templat hanya memakai fakta yang lolos paket (terverifikasi, ≤ T).
 *
 * - penghentian sementara (`susp-<tanggal>`) + kategori alasan resminya;
 * - harga penutupan harian (`harga-<tanggal>`), volume harian (`volume-<tanggal>`);
 * - hitungan: selisih (`naik-<dari>-<sampai>`), kelipatan (`kelipatan-…`),
 *   hari naik beruntun (`hari-naik-beruntun`);
 * - dividen tunai per lembar (`div-<tanggal>`).
 */
import type { FaktaPaket, PaketFakta } from '../paket.ts';

export type KategoriAlasan = 'kenaikan-harga' | 'penurunan-harga' | 'kelangsungan-usaha' | 'laporan-keuangan' | 'aksi-korporasi' | 'lain';

/** Kategori yang punya frasa di templat (semua kecuali `lain`). */
export const KATEGORI_BERFRASA: readonly Exclude<KategoriAlasan, 'lain'>[] = [
  'laporan-keuangan',
  'kelangsungan-usaha',
  'aksi-korporasi',
  'kenaikan-harga',
  'penurunan-harga',
];

/**
 * Kategori alasan resmi dari kalimat fakta penghentian. Urutan pola penting:
 * "peningkatan harga kumulatif" dan "cooling down" = kenaikan harga.
 */
export function kategoriAlasan(teks: string): KategoriAlasan {
  const t = teks.toLowerCase();
  if (/peningkatan harga|kenaikan harga|cooling down/.test(t)) return 'kenaikan-harga';
  if (/penurunan harga/.test(t)) return 'penurunan-harga';
  if (/kelangsungan usaha|going concern/.test(t)) return 'kelangsungan-usaha';
  if (/laporan keuangan|penyampaian laporan/.test(t)) return 'laporan-keuangan';
  if (/akuisisi|pengambilalihan|penggabungan|aksi korporasi/.test(t)) return 'aksi-korporasi';
  return 'lain';
}

export interface Suspensi {
  fact_id: string;
  tanggal: string;
  kategori: KategoriAlasan;
}

export interface NilaiHarian {
  fact_id: string;
  tanggal: string;
  nilai: number;
}

export interface Rentang {
  fact_id: string;
  dari: string;
  sampai: string;
  nilai: number;
}

export interface HariNaik {
  fact_id: string;
  nilai: number;
  /** fact_id harga pertama dan terakhir rangkaian. */
  dari: string;
  sampai: string;
}

const POLA_TANGGAL = '(\\d{4}-\\d{2}-\\d{2})';

function nilaiAngka(f: FaktaPaket): number | null {
  return typeof f.nilai === 'number' && Number.isFinite(f.nilai) ? f.nilai : null;
}

function alasanResmi(klaim: string): string {
  const m = /Alasan resmi:\s*(.+?)(?:\.\s|$)/.exec(klaim);
  return m?.[1] ?? klaim;
}

export function suspensi(paket: PaketFakta): Suspensi[] {
  const pola = new RegExp(`^susp-${POLA_TANGGAL}$`);
  return paket.fakta
    .map((f) => ({ f, m: pola.exec(f.fact_id) }))
    .filter((x): x is { f: FaktaPaket; m: RegExpExecArray } => x.m !== null)
    .map(({ f, m }) => ({ fact_id: f.fact_id, tanggal: m[1] as string, kategori: kategoriAlasan(alasanResmi(f.klaim)) }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

function harian(paket: PaketFakta, awalan: string): NilaiHarian[] {
  const pola = new RegExp(`^${awalan}-${POLA_TANGGAL}$`);
  const hasil: NilaiHarian[] = [];
  for (const f of paket.fakta) {
    const m = pola.exec(f.fact_id);
    const n = nilaiAngka(f);
    if (m === null || n === null) continue;
    hasil.push({ fact_id: f.fact_id, tanggal: m[1] as string, nilai: n });
  }
  return hasil.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export const hargaHarian = (paket: PaketFakta): NilaiHarian[] => harian(paket, 'harga');
export const volumeHarian = (paket: PaketFakta): NilaiHarian[] => harian(paket, 'volume');
export const dividen = (paket: PaketFakta): NilaiHarian[] => harian(paket, 'div');

function rentang(paket: PaketFakta, awalan: string): Rentang[] {
  const pola = new RegExp(`^${awalan}-${POLA_TANGGAL}-${POLA_TANGGAL}$`);
  const hasil: Rentang[] = [];
  for (const f of paket.fakta) {
    const m = pola.exec(f.fact_id);
    const n = nilaiAngka(f);
    if (m === null || n === null) continue;
    hasil.push({ fact_id: f.fact_id, dari: m[1] as string, sampai: m[2] as string, nilai: n });
  }
  return hasil;
}

export const selisihHarga = (paket: PaketFakta): Rentang[] => rentang(paket, 'naik');
export const kelipatanHarga = (paket: PaketFakta): Rentang[] => rentang(paket, 'kelipatan');

export function hariNaik(paket: PaketFakta): HariNaik | null {
  const f = paket.fakta.find((x) => x.fact_id === 'hari-naik-beruntun');
  const n = f === undefined ? null : nilaiAngka(f);
  if (f === undefined || n === null || f.turunan_dari.length < 2) return null;
  const dari = f.turunan_dari[0] as string;
  const sampai = f.turunan_dari[f.turunan_dari.length - 1] as string;
  return { fact_id: f.fact_id, nilai: n, dari, sampai };
}

export function fakta(paket: PaketFakta, id: string): FaktaPaket {
  const f = paket.fakta.find((x) => x.fact_id === id);
  if (f === undefined) throw new Error(`Fakta "${id}" tidak ada di paket.`);
  return f;
}

/** Kelas fakta: `harga`, `volume`, `div`, `susp`, atau fact_id itu sendiri. */
export function kelas(id: string): string {
  const m = /^(harga|volume|div|susp)-\d{4}-\d{2}-\d{2}$/.exec(id);
  return m?.[1] ?? id;
}

/** Hari kerja (Senin–Jumat) sebelum tanggal ISO. */
export function hariKerjaSebelum(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  do d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}
