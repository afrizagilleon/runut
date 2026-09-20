// Amandemen A-1 — semesta angka yang benar-benar ada di data mentah FOLK.
//
// Modul ini TIDAK membaca kunci jawaban. Ia hanya membaca .cache/sectors/FOLK-*.json
// dan .cache/sectors/suspensions-all.json, lalu menyusun:
//   1. NILAI LANGSUNG  — setiap angka yang benar-benar tersimpan di berkas itu,
//      beserta asalnya (berkas + medan + tanggal/tahun), supaya bisa diaudit.
//   2. Peta hari bursa  — dipakai pemeriksa ketepatan untuk menentukan nilai
//      yang benar pada sebuah tanggal, dan untuk membangun turunan lokal.
//   3. Daftar suspensi FOLK dan nama pemegang saham di laporan — dipakai
//      pemeriksa kebocoran.
//
// Kenapa ini ada: sebelum amandemen A-1, "angka salah" berarti "tidak ada di
// kunci jawaban". Itu mengukur kerincian, bukan ketepatan (lihat §10 F-1).
// Sesudah amandemen, acuannya data mentah, bukan keanggotaan di kunci.

import { adaBerkas, bacaJson, berkasCache } from './berkas.ts';
import type { BerkasFilings, HariHarga } from './berkas.ts';
import { angkaSama } from './angka.ts';

export interface NilaiMentah {
  nilai: number;
  /** Dari mana angka ini diambil. Harus cukup untuk ditelusuri tangan. */
  asal: string;
  /** Benar kalau angka ini memang sebuah persentase/rasio di data, bukan harga atau lembar. */
  persen: boolean;
}

/**
 * Medan keuangan tahunan yang dipakai sebagai basis turunan. Daftarnya
 * ditulis terbuka di sini supaya turunan yang diterima bisa diaudit dan tidak
 * berubah diam-diam.
 */
export const MEDAN_KEUANGAN = [
  'revenue',
  'earnings',
  'total_equity',
  'total_assets',
  'total_liabilities',
  'current_assets',
  'current_liabilities',
  'total_debt',
  'outstanding_shares',
  'gross_profit',
  'operating_expense',
  'cash_and_equivalents',
  'ebitda',
  'ebit',
] as const;

export interface TahunKeuangan {
  tahun: number;
  medan: NilaiMentah[];
  /** Nilai yang dipakai memeriksa klaim "tahun buku X": pendapatan, laba/rugi, ekuitas. */
  pokok: NilaiMentah[];
}

export interface DataMentah {
  ada: boolean;
  hari: Map<string, HariHarga>;
  /** Tanggal hari bursa, terurut naik. */
  tanggal: string[];
  langsung: NilaiMentah[];
  keuangan: Map<number, TahunKeuangan>;
  sahamBeredar: NilaiMentah[];
  /** tanggal suspensi FOLK -> alasan resmi. */
  suspensi: Map<string, string>;
  namaPemegang: string[];
}

function angkaSah(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Medan yang isinya memang persentase atau rasio, bukan harga/lembar/rupiah. */
const MEDAN_PERSEN = /share_percentage|eps_growth|daily_close_change|_rank$/;

function dorong(ke: NilaiMentah[], nilai: unknown, asal: string): void {
  if (!angkaSah(nilai)) return;
  const abs = Math.abs(nilai);
  if (abs === 0) return;
  const persen = MEDAN_PERSEN.test(asal);
  ke.push({ nilai: abs, asal, persen });
  // Rasio yang di data disimpan sebagai pecahan (0,5652) lazim ditulis sebagai
  // persen (56,52%) di kalimat. Bentuk persennya ikut dianggap ada di data.
  if (abs <= 10) ke.push({ nilai: abs * 100, asal: `${asal} (dinyatakan sebagai persen)`, persen: true });
}

interface BarisSuspensiMentah {
  symbol?: string;
  suspension_date?: string;
  reason?: string | null;
}

interface MedanKeuanganMentah {
  year?: number;
  [k: string]: unknown;
}

interface BerkasFinancials {
  financials?: {
    eps?: number | null;
    historical_eps?: Record<string, { eps?: number | null; eps_growth?: number | null }>;
    historical_financials?: MedanKeuanganMentah[];
  };
}

interface BerkasOverview {
  overview?: Record<string, unknown> & {
    all_time_price?: Record<string, Record<string, number>>;
  };
}

/** Berkas mentah yang dibaca. Dicetak di laporan supaya bisa ditelusuri. */
export const BERKAS_MENTAH = [
  'FOLK-daily-2025q3.json',
  'FOLK-daily-2025q4.json',
  'FOLK-financials.json',
  'FOLK-overview.json',
  'FOLK-filings.json',
  'suspensions-all.json',
] as const;

export function muatDataMentah(): DataMentah {
  const langsung: NilaiMentah[] = [];
  const hari = new Map<string, HariHarga>();
  const keuangan = new Map<number, TahunKeuangan>();
  const sahamBeredar: NilaiMentah[] = [];
  const suspensi = new Map<string, string>();
  const namaPemegang: string[] = [];
  let ada = false;

  // ---- harga harian ----
  for (const nama of ['FOLK-daily-2025q3.json', 'FOLK-daily-2025q4.json']) {
    const jalur = berkasCache(nama);
    if (!adaBerkas(jalur)) continue;
    ada = true;
    for (const h of bacaJson<HariHarga[]>(jalur)) {
      hari.set(h.date, h);
      for (const medan of ['open', 'high', 'low', 'close', 'volume', 'market_cap'] as const) {
        dorong(langsung, h[medan], `${nama} ${h.date} ${medan}`);
      }
      if (angkaSah(h.market_cap) && angkaSah(h.close) && h.close !== 0) {
        dorong(sahamBeredar, h.market_cap / h.close, `${nama} ${h.date} market_cap/close (saham beredar)`);
      }
    }
  }
  for (const s of sahamBeredar) langsung.push(s);

  // ---- laporan keuangan tahunan ----
  const jalurFin = berkasCache('FOLK-financials.json');
  if (adaBerkas(jalurFin)) {
    ada = true;
    const fin = bacaJson<BerkasFinancials>(jalurFin).financials ?? {};
    dorong(langsung, fin.eps, 'FOLK-financials.json eps');
    for (const [tahun, e] of Object.entries(fin.historical_eps ?? {})) {
      dorong(langsung, e.eps, `FOLK-financials.json historical_eps ${tahun} eps`);
      dorong(langsung, e.eps_growth, `FOLK-financials.json historical_eps ${tahun} eps_growth`);
    }
    for (const baris of fin.historical_financials ?? []) {
      const tahun = baris.year;
      if (!angkaSah(tahun)) continue;
      const medan: NilaiMentah[] = [];
      for (const [k, v] of Object.entries(baris)) {
        if (k === 'year') continue;
        dorong(langsung, v, `FOLK-financials.json historical_financials ${tahun} ${k}`);
        if ((MEDAN_KEUANGAN as readonly string[]).includes(k)) {
          dorong(medan, v, `FOLK-financials.json historical_financials ${tahun} ${k}`);
        }
      }
      const pokok: NilaiMentah[] = [];
      for (const k of ['revenue', 'earnings', 'total_equity'] as const) {
        dorong(pokok, baris[k], `FOLK-financials.json historical_financials ${tahun} ${k}`);
      }
      keuangan.set(tahun, { tahun, medan, pokok });
    }
  }

  // ---- overview ----
  const jalurOv = berkasCache('FOLK-overview.json');
  if (adaBerkas(jalurOv)) {
    ada = true;
    const ov = bacaJson<BerkasOverview>(jalurOv).overview ?? {};
    for (const [k, v] of Object.entries(ov)) {
      if (k === 'all_time_price') continue;
      dorong(langsung, v, `FOLK-overview.json overview.${k}`);
    }
    for (const [k, isi] of Object.entries(ov.all_time_price ?? {})) {
      for (const [tgl, v] of Object.entries(isi)) {
        dorong(langsung, v, `FOLK-overview.json all_time_price.${k} (${tgl})`);
      }
    }
  }

  // ---- laporan kepemilikan ----
  const jalurFil = berkasCache('FOLK-filings.json');
  if (adaBerkas(jalurFil)) {
    ada = true;
    for (const f of bacaJson<BerkasFilings>(jalurFil).results) {
      const tanda = `FOLK-filings.json ${f.timestamp.slice(0, 10)}`;
      for (const medan of [
        'holding_before',
        'holding_after',
        'amount_transaction',
        'price',
        'transaction_value',
        'share_percentage_before',
        'share_percentage_after',
        'share_percentage_transaction',
      ] as const) {
        dorong(langsung, f[medan], `${tanda} ${medan}`);
      }
      for (const t of f.price_transaction ?? []) {
        dorong(langsung, t.price, `${tanda} price_transaction(${t.date}).price`);
        dorong(langsung, t.amount_transacted, `${tanda} price_transaction(${t.date}).amount_transacted`);
      }
      if (typeof f.holder_name === 'string' && f.holder_name.length > 0) namaPemegang.push(f.holder_name);
    }
  }

  // ---- suspensi ----
  const jalurSus = berkasCache('suspensions-all.json');
  if (adaBerkas(jalurSus)) {
    ada = true;
    for (const b of bacaJson<BarisSuspensiMentah[]>(jalurSus)) {
      if (typeof b.symbol !== 'string' || !b.symbol.startsWith('FOLK')) continue;
      if (typeof b.suspension_date !== 'string') continue;
      suspensi.set(b.suspension_date, b.reason ?? '');
    }
  }

  return {
    ada,
    hari,
    tanggal: [...hari.keys()].sort(),
    langsung,
    keuangan,
    sahamBeredar,
    suspensi,
    namaPemegang: [...new Set(namaPemegang)],
  };
}

export function adaDataMentah(): boolean {
  return adaBerkas(berkasCache('FOLK-daily-2025q3.json')) && adaBerkas(berkasCache('FOLK-financials.json'));
}

/** Hari bursa terakhir sebelum `tanggal`, atau null kalau tidak ada. */
export function hariSebelum(data: DataMentah, tanggal: string): HariHarga | null {
  let hasil: HariHarga | null = null;
  for (const t of data.tanggal) {
    if (t >= tanggal) break;
    const h = data.hari.get(t);
    if (h !== undefined) hasil = h;
  }
  return hasil;
}

/** Selisih relatif antara dua angka; 0 berarti persis sama. */
export function selisihRelatif(a: number, b: number): number {
  const besar = Math.max(Math.abs(a), Math.abs(b));
  if (besar === 0) return 0;
  return Math.abs(a - b) / besar;
}

/**
 * Nilai di `daftar` yang PALING DEKAT dengan `a` dalam toleransi 1 %, atau null.
 * Sengaja "paling dekat", bukan "yang pertama ketemu": dengan toleransi 1 % dan
 * semesta seribuan angka, yang pertama ketemu sering medan yang tidak ada
 * hubungannya, dan alasan yang ditulis ke laporan jadi menyesatkan.
 */
export function cariDi(daftar: NilaiMentah[], a: number): NilaiMentah | null {
  let terbaik: NilaiMentah | null = null;
  let jarak = Number.POSITIVE_INFINITY;
  for (const n of daftar) {
    if (!angkaSama(a, n.nilai)) continue;
    const d = selisihRelatif(a, n.nilai);
    if (d < jarak) {
      jarak = d;
      terbaik = n;
    }
  }
  return terbaik;
}

/** Nilai langsung yang paling dekat dengan `a`, atau null. */
export function cariLangsung(data: DataMentah, a: number, hanyaPersen = false): NilaiMentah | null {
  return cariDi(hanyaPersen ? data.langsung.filter((n) => n.persen) : data.langsung, a);
}
