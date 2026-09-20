/**
 * Pemuat data DADA dari `.cache/sectors/`.
 *
 * Yang dihasilkan bukan salinan respons API, melainkan bentuk yang sudah
 * dinormalkan: rantai laporan, harga harian, suspensi, dividen, dan hasil RUPS,
 * masing-masing membawa jejak sumbernya (endpoint, parameter, nama berkas).
 *
 * Aturan tanggal ketersediaan (R4): laporan memakai tanggal laporan, harga
 * memakai tanggalnya sendiri, suspensi memakai tanggal suspensi karena data
 * tidak memuat tanggal pengumuman terpisah.
 */
import { angka, hasilCache, larikCache, obyekCache, teks, teksAtauKosong } from './cache.ts';
import type { BarisHarga, Laporan, Suspensi, Transaksi } from '../verifikasi/tipe.ts';

export interface AsalBerkas {
  berkas: string;
  endpoint: string;
  parameter: Record<string, string>;
}

export const BERKAS = {
  filings2025: {
    berkas: 'dada-filings-2025.json',
    endpoint: '/v2/filings/',
    parameter: { symbol: 'DADA', 'sub_sector': 'properties-real-estate', offset: '0' },
  },
  filings2025p20: {
    berkas: 'dada-filings-2025-p20.json',
    endpoint: '/v2/filings/',
    parameter: { symbol: 'DADA', offset: '20' },
  },
  filings2026: {
    berkas: 'dada-filings-2026.json',
    endpoint: '/v2/filings/',
    parameter: { symbol: 'DADA', 'start_date': '2026-01-01' },
  },
  harga: {
    berkas: 'dada-daily-2025q3.json',
    endpoint: '/v2/daily/DADA/',
    parameter: { start: '2025-08-01', end: '2025-10-29' },
  },
  suspensi: {
    berkas: 'dada-suspensions.json',
    endpoint: '/v2/suspensions/',
    parameter: { symbol: 'DADA' },
  },
  aksiKorporasi: {
    berkas: 'dada-corpactions.json',
    endpoint: '/v2/company/corporate-actions/DADA/',
    parameter: {},
  },
} as const satisfies Record<string, AsalBerkas>;

export interface Dividen {
  ex_date: string;
  tanggal_bayar: string | null;
  nilai_per_lembar: number;
}

export interface HasilRups {
  tanggal: string;
  ringkasan: string;
  kuorum_persen: number | null;
}

export interface SahamBeredar {
  /** Lembar beredar = nilai pasar dibagi harga penutupan. */
  lembar: number;
  /** Berapa hari bursa yang menghasilkan angka yang sama. */
  hari_sepakat: number;
  /** Angka lain yang muncul, kalau data tidak bulat sepakat. */
  angka_lain: number[];
}

export interface DataDada {
  simbol: string;
  laporan2025: Laporan[];
  laporan2026: Laporan[];
  harga: BarisHarga[];
  suspensi: Suspensi[];
  dividen: Dividen[];
  rups: HasilRups[];
  saham_beredar: SahamBeredar;
  /** Berkas cache asal tiap laporan, supaya jejak sumbernya tidak ditebak. */
  asal_laporan: Map<string, AsalBerkas>;
}

function urutWaktu<T extends { dilaporkan_pada: string }>(daftar: T[]): T[] {
  return [...daftar].sort((a, b) => a.dilaporkan_pada.localeCompare(b.dilaporkan_pada));
}

function namaBerkasSumber(url: string): string {
  const potongan = url.split('/');
  return potongan[potongan.length - 1] ?? url;
}

function muatLaporan(asal: AsalBerkas): Laporan[] {
  const baris = hasilCache(asal.berkas);
  return baris.map((r, nomor): Laporan => {
    const tempat = `results[${String(nomor)}]`;
    const berkasSumber = namaBerkasSumber(teks(r, 'source', asal.berkas, tempat));
    const jenis = teks(r, 'transaction_type', asal.berkas, tempat) === 'buy' ? 'beli' : 'jual';
    const mentahTransaksi = r['price_transaction'];
    const transaksi: Transaksi[] = Array.isArray(mentahTransaksi)
      ? mentahTransaksi.map((t, i): Transaksi => {
          const baris = t as Record<string, unknown>;
          const tempatT = `${tempat}.price_transaction[${String(i)}]`;
          return {
            tanggal: teks(baris, 'date', asal.berkas, tempatT),
            jenis: teks(baris, 'type', asal.berkas, tempatT) === 'buy' ? 'beli' : 'jual',
            harga: angka(baris, 'price', asal.berkas, tempatT),
            jumlah: angka(baris, 'amount_transacted', asal.berkas, tempatT),
          };
        })
      : [];
    return {
      laporan_id: berkasSumber.replace(/\.pdf.*$/, ''),
      simbol: teks(r, 'symbol', asal.berkas, tempat),
      pemegang: teks(r, 'holder_name', asal.berkas, tempat),
      dilaporkan_pada: teks(r, 'timestamp', asal.berkas, tempat),
      jenis,
      jumlah: angka(r, 'amount_transaction', asal.berkas, tempat),
      harga: angka(r, 'price', asal.berkas, tempat),
      sebelum: angka(r, 'holding_before', asal.berkas, tempat),
      sesudah: angka(r, 'holding_after', asal.berkas, tempat),
      persen_sebelum: angka(r, 'share_percentage_before', asal.berkas, tempat),
      persen_sesudah: angka(r, 'share_percentage_after', asal.berkas, tempat),
      transaksi,
      teks: teksAtauKosong(r, 'body'),
      berkas: berkasSumber,
    };
  });
}

function muatHarga(): BarisHarga[] {
  const asal = BERKAS.harga;
  const baris = larikCache(asal.berkas);
  const harga = baris.map((h, nomor): BarisHarga => {
    const tempat = `[${String(nomor)}]`;
    return {
      tanggal: teks(h, 'date', asal.berkas, tempat),
      buka: angka(h, 'open', asal.berkas, tempat),
      tertinggi: angka(h, 'high', asal.berkas, tempat),
      terendah: angka(h, 'low', asal.berkas, tempat),
      tutup: angka(h, 'close', asal.berkas, tempat),
      volume: angka(h, 'volume', asal.berkas, tempat),
      nilai_pasar: angka(h, 'market_cap', asal.berkas, tempat),
    };
  });
  return harga.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

function muatSuspensi(): Suspensi[] {
  const asal = BERKAS.suspensi;
  return hasilCache(asal.berkas)
    .map((s, nomor): Suspensi => {
      const tempat = `results[${String(nomor)}]`;
      return {
        tanggal: teks(s, 'suspension_date', asal.berkas, tempat),
        alasan: teks(s, 'reason', asal.berkas, tempat),
      };
    })
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

const POLA_KUORUM = /attendance was only ([\d.]+)% of shares/;

function muatAksiKorporasi(): { dividen: Dividen[]; rups: HasilRups[] } {
  const asal = BERKAS.aksiKorporasi;
  const akar = obyekCache(asal.berkas);
  const aksi = akar['corporate_actions'];
  if (typeof aksi !== 'object' || aksi === null) {
    throw new Error(`${asal.berkas} tidak memuat "corporate_actions".`);
  }
  const isi = aksi as Record<string, unknown>;

  const mentahDividen = isi['dividend'];
  const dividen: Dividen[] = Array.isArray(mentahDividen)
    ? mentahDividen.map((d, nomor): Dividen => {
        const baris = d as Record<string, unknown>;
        const tempat = `corporate_actions.dividend[${String(nomor)}]`;
        const bayar = baris['payment_date'];
        return {
          ex_date: teks(baris, 'ex_date', asal.berkas, tempat),
          tanggal_bayar: typeof bayar === 'string' ? bayar : null,
          nilai_per_lembar: angka(baris, 'dividend_amount', asal.berkas, tempat),
        };
      })
    : [];

  const mentahRups = isi['agm'];
  const rups: HasilRups[] = Array.isArray(mentahRups)
    ? mentahRups
        .map((a, nomor): HasilRups | null => {
          const baris = a as Record<string, unknown>;
          const tempat = `corporate_actions.agm[${String(nomor)}]`;
          const ringkasan = baris['agm_result'];
          if (typeof ringkasan !== 'string' || ringkasan === '') return null;
          const kuorum = POLA_KUORUM.exec(ringkasan);
          return {
            tanggal: teks(baris, 'agm_date', asal.berkas, tempat),
            ringkasan,
            kuorum_persen: kuorum === null ? null : Number(kuorum[1]),
          };
        })
        .filter((r): r is HasilRups => r !== null)
    : [];

  return { dividen, rups };
}

/**
 * Saham beredar dihitung dari data, tidak ditulis tangan: nilai pasar dibagi
 * harga penutupan, untuk setiap hari bursa. Kalau hasilnya tidak sama di semua
 * hari, angka yang dipakai adalah yang paling sering muncul dan sisanya dicatat.
 */
export function hitungSahamBeredar(harga: BarisHarga[]): SahamBeredar {
  if (harga.length === 0) {
    throw new Error('Tidak ada data harga; saham beredar tidak bisa dihitung.');
  }
  const hitungan = new Map<number, number>();
  for (const h of harga) {
    if (h.tutup === 0) continue;
    const lembar = Math.round(h.nilai_pasar / h.tutup);
    hitungan.set(lembar, (hitungan.get(lembar) ?? 0) + 1);
  }
  const terurut = [...hitungan.entries()].sort((a, b) => b[1] - a[1]);
  const teratas = terurut[0];
  if (teratas === undefined) {
    throw new Error('Semua harga penutupan bernilai nol; saham beredar tidak bisa dihitung.');
  }
  return {
    lembar: teratas[0],
    hari_sepakat: teratas[1],
    angka_lain: terurut.slice(1).map(([lembar]) => lembar),
  };
}

/** Baca seluruh data DADA yang dipakai M1. Gagal keras kalau satu berkas hilang. */
export function muatDada(): DataDada {
  const asal_laporan = new Map<string, AsalBerkas>();
  const catat = (asal: AsalBerkas): Laporan[] => {
    const daftar = muatLaporan(asal);
    for (const l of daftar) asal_laporan.set(l.laporan_id, asal);
    return daftar;
  };

  const laporan2025 = urutWaktu([...catat(BERKAS.filings2025), ...catat(BERKAS.filings2025p20)]);
  const laporan2026 = urutWaktu(catat(BERKAS.filings2026));
  const harga = muatHarga();
  const { dividen, rups } = muatAksiKorporasi();
  return {
    simbol: 'DADA.JK',
    laporan2025,
    laporan2026,
    harga,
    suspensi: muatSuspensi(),
    dividen,
    rups,
    saham_beredar: hitungSahamBeredar(harga),
    asal_laporan,
  };
}
