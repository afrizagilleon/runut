/**
 * Pemuat gudang umum (M2a D-2).
 *
 * Nama berkas di `.cache/sectors/` **tidak seragam** (`dada-*` huruf kecil,
 * `FOLK-*`, `<KODE>-daily-2025q3.json`, `suspensions-all.json`, berkas
 * kalender). Karena itu pemuat ini mengenali jenis berkas dari **bentuk
 * isinya**, bukan dari pola namanya, dan nama berkas tidak pernah dipakai
 * sebagai data — hanya sebagai alamat.
 *
 * Tiga aturan yang dipegang supaya angkanya bisa dibangun ulang (INV-C):
 *
 * 1. **Urutan tetap.** Berkas disapu menurut nama berkas menaik (perbandingan
 *    kode karakter), baris menurut urutannya di dalam berkas.
 * 2. **Rangkap dibuang dengan kunci isi**, bukan kunci nama berkas. Untuk baris
 *    harga kuncinya `simbol|tanggal`, dan **baris pertama menang**; baris
 *    berikutnya dihitung rangkap, dan kalau angkanya berbeda, bentrokannya
 *    dicatat. Uji lawan 8.7 menunjuk tepat ke sini: hitungan R33 tidak bisa
 *    dibangun ulang kalau aturan ini tidak tertulis.
 * 3. **Berkas yang tidak dikenali dilaporkan**, tidak dibuang diam-diam.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type {
  BarisHarga,
  BerkasLaporan,
  DataEmiten,
  Dividen,
  EpsTahunan,
  HasilRups,
  KeuanganTahunan,
  Laporan,
  NilaiEkstrem,
  Paginasi,
  PotretPemegang,
  RasioSiapPakai,
  RightIssue,
  SahamBonus,
  StockSplit,
  Suspensi,
  Transaksi,
} from '../verifikasi/tipe.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

export const FOLDER_GUDANG = AKAR + '.cache/sectors';

/**
 * Jenis berkas yang dikenali dari bentuk isinya.
 *
 * `paginasi-kosong` bukan kegagalan: ia respons berpaginasi yang `results`-nya
 * kosong, sehingga **jenis dan simbolnya tidak ada di dalam isinya** —
 * `/v2/filings/` yang kosong dan `/v2/news/` yang kosong identik byte per byte.
 */
export type JenisBerkas =
  | 'harga-harian'
  | 'laporan-kepemilikan'
  | 'berita'
  | 'suspensi'
  | 'aksi-korporasi'
  | 'ringkasan'
  | 'keuangan'
  | 'kepemilikan'
  | 'kalender'
  | 'paginasi-kosong'
  | 'tak-dikenal';

export interface BerkasGudang {
  berkas: string;
  jenis: JenisBerkas;
  /** Kenapa jenisnya begitu — satu kalimat, untuk laporan berkas tak dikenal. */
  alasan: string;
  /** Simbol yang terbaca dari ISI berkas, bukan dari namanya. */
  simbol: string | null;
  baris: number;
}

export interface BentrokHarga {
  simbol: string;
  tanggal: string;
  dipakai: string;
  diabaikan: string;
  medan: string;
}

export interface Gudang {
  folder: string;
  emiten: Map<string, DataEmiten>;
  berkas: BerkasGudang[];
  /** Berkas yang jenisnya tidak bisa ditentukan dari isinya. */
  tak_dikenal: BerkasGudang[];
  /** Baris harga rangkap yang dibuang, dan yang angkanya bertentangan. */
  bentrok_harga: BentrokHarga[];
  ringkasan: {
    berkas: number;
    emiten: number;
    laporan_unik: number;
    laporan_rangkap: number;
    baris_harga_unik: number;
    baris_harga_rangkap: number;
    suspensi_unik: number;
  };
}

// --- pembaca kecil yang tidak pernah melempar --------------------------------

function obyek(nilai: unknown): Record<string, unknown> | null {
  return typeof nilai === 'object' && nilai !== null && !Array.isArray(nilai)
    ? (nilai as Record<string, unknown>)
    : null;
}

function larik(nilai: unknown): unknown[] | null {
  return Array.isArray(nilai) ? nilai : null;
}

function teks(nilai: unknown): string | null {
  return typeof nilai === 'string' && nilai !== '' ? nilai : null;
}

function angka(nilai: unknown): number | null {
  return typeof nilai === 'number' && Number.isFinite(nilai) ? nilai : null;
}

function punya(o: Record<string, unknown>, ...kunci: string[]): boolean {
  return kunci.every((k) => k in o);
}

/** `ARNA.JK` dan `ARNA` adalah emiten yang sama. */
export function normalkanSimbol(simbol: string): string {
  return simbol.trim().toUpperCase().replace(/\.JK$/, '');
}

// --- pengenal jenis berkas ---------------------------------------------------

/**
 * Tentukan jenis satu berkas dari bentuk isinya saja.
 * Nama berkas tidak pernah ikut dipertimbangkan.
 */
export function kenaliBerkas(isi: unknown): { jenis: JenisBerkas; alasan: string } {
  const daftar = larik(isi);
  if (daftar !== null) {
    const baris = obyek(daftar[0]);
    if (baris === null) {
      return daftar.length === 0
        ? { jenis: 'tak-dikenal', alasan: 'larik kosong di akar berkas; tidak ada bentuk yang bisa dibaca' }
        : { jenis: 'tak-dikenal', alasan: 'larik yang isinya bukan obyek' };
    }
    if (punya(baris, 'date', 'close', 'high', 'low', 'volume')) {
      return { jenis: 'harga-harian', alasan: 'larik baris ber-date/close/high/low/volume' };
    }
    if (punya(baris, 'suspension_date')) {
      return { jenis: 'suspensi', alasan: 'larik baris ber-suspension_date' };
    }
    return { jenis: 'tak-dikenal', alasan: 'larik obyek tanpa medan yang dikenali' };
  }

  const akar = obyek(isi);
  if (akar === null) return { jenis: 'tak-dikenal', alasan: 'akar berkas bukan obyek maupun larik' };

  const hasil = larik(akar['results']);
  if (hasil !== null && obyek(akar['pagination']) !== null) {
    if (hasil.length === 0) {
      return {
        jenis: 'paginasi-kosong',
        alasan: 'respons berpaginasi tanpa satu baris pun: jenis dan simbolnya tidak ada di dalam isinya',
      };
    }
    const baris = obyek(hasil[0]);
    if (baris === null) return { jenis: 'tak-dikenal', alasan: 'results berisi yang bukan obyek' };
    if (punya(baris, 'holder_name', 'holding_before', 'holding_after')) {
      return { jenis: 'laporan-kepemilikan', alasan: 'results ber-holder_name/holding_before/holding_after' };
    }
    if (punya(baris, 'suspension_date')) {
      return { jenis: 'suspensi', alasan: 'results ber-suspension_date' };
    }
    if (punya(baris, 'symbols', 'dimension')) {
      return { jenis: 'berita', alasan: 'results ber-symbols/dimension' };
    }
    return { jenis: 'tak-dikenal', alasan: 'results dengan bentuk baris yang tidak dikenali' };
  }

  if (obyek(akar['corporate_actions']) !== null) {
    return { jenis: 'aksi-korporasi', alasan: 'obyek ber-corporate_actions' };
  }
  const punyaRingkasan = obyek(akar['overview']) !== null;
  const punyaKeuangan = obyek(akar['financials']) !== null;
  if (punyaRingkasan && punyaKeuangan) {
    return { jenis: 'ringkasan', alasan: 'obyek ber-overview dan financials sekaligus' };
  }
  if (punyaRingkasan) return { jenis: 'ringkasan', alasan: 'obyek ber-overview' };
  if (punyaKeuangan) return { jenis: 'keuangan', alasan: 'obyek ber-financials' };
  if (obyek(akar['ownership']) !== null) {
    return { jenis: 'kepemilikan', alasan: 'obyek ber-ownership' };
  }
  for (const kunci of ['stock_split', 'right_issue', 'bonus']) {
    if (punya(akar, 'start', 'end') && larik(akar[kunci]) !== null) {
      return { jenis: 'kalender', alasan: `obyek ber-start/end dan larik ${kunci}` };
    }
  }
  return { jenis: 'tak-dikenal', alasan: 'obyek tanpa medan yang dikenali' };
}

// --- penormal per jenis ------------------------------------------------------

function bacaTransaksi(nilai: unknown): Transaksi[] {
  const daftar = larik(nilai);
  if (daftar === null) return [];
  const keluar: Transaksi[] = [];
  for (const butir of daftar) {
    const b = obyek(butir);
    if (b === null) continue;
    const tanggal = teks(b['date']);
    if (tanggal === null) continue;
    const harga = angka(b['price']);
    const transaksi: Transaksi = {
      tanggal,
      jenis: b['type'] === 'buy' ? 'beli' : 'jual',
      harga: harga ?? 0,
      jumlah: angka(b['amount_transacted']) ?? 0,
    };
    if (harga === null) transaksi.harga_kosong = true;
    keluar.push(transaksi);
  }
  return keluar;
}

function namaBerkasSumber(url: string): string {
  const potongan = url.split('/');
  return potongan[potongan.length - 1] ?? url;
}

/** Kunci isi satu laporan: dua baris dengan kunci sama adalah baris yang sama. */
function kunciLaporan(r: Record<string, unknown>): string {
  return [
    teks(r['symbol']) ?? '',
    teks(r['timestamp']) ?? '',
    teks(r['holder_name']) ?? '',
    String(angka(r['holding_before']) ?? ''),
    String(angka(r['holding_after']) ?? ''),
    String(angka(r['amount_transaction']) ?? ''),
    teks(r['source']) ?? '',
  ].join('|');
}

function bacaPaginasi(nilai: unknown): Paginasi {
  const p = obyek(nilai) ?? {};
  return {
    total_count: angka(p['total_count']) ?? 0,
    showing: angka(p['showing']) ?? 0,
    limit: angka(p['limit']) ?? 0,
    offset: angka(p['offset']) ?? 0,
    has_next: p['has_next'] === true,
    has_previous: p['has_previous'] === true,
  };
}

// --- pengumpul ---------------------------------------------------------------

function emitenKosong(simbol: string): DataEmiten {
  return {
    simbol,
    laporan: [],
    harga: [],
    suspensi: [],
    berkas_laporan: [],
    stock_split: [],
    right_issue: [],
    bonus: [],
    dividen: [],
    rups: [],
    all_time_price: [],
    pemegang: [],
    saham_tahunan: [],
    keuangan_tahunan: [],
    eps_tahunan: [],
    rasio: [],
    ringkasan_pasar: null,
    berkas: [],
  };
}

interface Pengumpul {
  emiten: Map<string, DataEmiten>;
  kunciLaporanTerpakai: Set<string>;
  kunciHargaTerpakai: Map<string, BarisHarga>;
  kunciSuspensiTerpakai: Set<string>;
  bentrok: BentrokHarga[];
  rangkapLaporan: number;
  rangkapHarga: number;
}

function ambil(kumpul: Pengumpul, simbol: string, berkas: string): DataEmiten {
  const kunci = normalkanSimbol(simbol);
  let data = kumpul.emiten.get(kunci);
  if (data === undefined) {
    data = emitenKosong(kunci);
    kumpul.emiten.set(kunci, data);
  }
  if (!data.berkas.includes(berkas)) data.berkas.push(berkas);
  return data;
}

function serapLaporan(kumpul: Pengumpul, berkas: string, akar: Record<string, unknown>): string | null {
  const hasil = larik(akar['results']) ?? [];
  const paginasi = bacaPaginasi(akar['pagination']);
  let simbolBerkas: string | null = null;

  for (const baris of hasil) {
    const r = obyek(baris);
    if (r === null) continue;
    const simbol = teks(r['symbol']);
    const waktu = teks(r['timestamp']);
    const pemegang = teks(r['holder_name']);
    if (simbol === null || waktu === null || pemegang === null) continue;
    if (simbolBerkas === null) simbolBerkas = normalkanSimbol(simbol);

    const kunci = kunciLaporan(r);
    if (kumpul.kunciLaporanTerpakai.has(kunci)) {
      kumpul.rangkapLaporan += 1;
      continue;
    }
    kumpul.kunciLaporanTerpakai.add(kunci);

    const sumber = teks(r['source']) ?? '';
    const jenisMentah = teks(r['transaction_type']) ?? '';
    const laporan: Laporan = {
      laporan_id: `${normalkanSimbol(simbol)}|${waktu}|${namaBerkasSumber(sumber)}`,
      simbol: normalkanSimbol(simbol),
      pemegang,
      dilaporkan_pada: waktu,
      jenis: jenisMentah === 'buy' ? 'beli' : 'jual',
      jumlah: angka(r['amount_transaction']) ?? 0,
      harga: angka(r['price']) ?? 0,
      sebelum: angka(r['holding_before']) ?? 0,
      sesudah: angka(r['holding_after']) ?? 0,
      persen_sebelum: angka(r['share_percentage_before']) ?? 0,
      persen_sesudah: angka(r['share_percentage_after']) ?? 0,
      transaksi: bacaTransaksi(r['price_transaction']),
      teks: typeof r['body'] === 'string' ? r['body'] : '',
      berkas: namaBerkasSumber(sumber),
      sumber_dokumen: sumber,
      jenis_mentah: jenisMentah,
      berkas_cache: berkas,
    };
    ambil(kumpul, simbol, berkas).laporan.push(laporan);
  }

  const catatan: BerkasLaporan = {
    berkas,
    simbol: simbolBerkas,
    paginasi,
    baris: hasil.length,
  };
  if (simbolBerkas !== null) {
    ambil(kumpul, simbolBerkas, berkas).berkas_laporan.push(catatan);
  }
  return simbolBerkas;
}

function serapHarga(kumpul: Pengumpul, berkas: string, daftar: unknown[]): string | null {
  let simbolBerkas: string | null = null;
  for (const baris of daftar) {
    const h = obyek(baris);
    if (h === null) continue;
    const simbol = teks(h['symbol']);
    const tanggal = teks(h['date']);
    if (simbol === null || tanggal === null) continue;
    const kode = normalkanSimbol(simbol);
    if (simbolBerkas === null) simbolBerkas = kode;

    const buka = angka(h['open']);
    const bar: BarisHarga = {
      tanggal,
      buka: buka ?? 0,
      tertinggi: angka(h['high']) ?? 0,
      terendah: angka(h['low']) ?? 0,
      tutup: angka(h['close']) ?? 0,
      volume: angka(h['volume']) ?? 0,
      nilai_pasar: angka(h['market_cap']) ?? 0,
    };
    if (buka === null) bar.buka_kosong = true;

    const kunci = `${kode}|${tanggal}`;
    const sudahAda = kumpul.kunciHargaTerpakai.get(kunci);
    if (sudahAda !== undefined) {
      kumpul.rangkapHarga += 1;
      for (const medan of ['tertinggi', 'terendah', 'tutup', 'volume', 'nilai_pasar'] as const) {
        if (sudahAda[medan] !== bar[medan]) {
          kumpul.bentrok.push({
            simbol: kode,
            tanggal,
            medan,
            dipakai: String(sudahAda[medan]),
            diabaikan: String(bar[medan]),
          });
        }
      }
      continue;
    }
    kumpul.kunciHargaTerpakai.set(kunci, bar);
    ambil(kumpul, kode, berkas).harga.push(bar);
  }
  return simbolBerkas;
}

function serapSuspensi(kumpul: Pengumpul, berkas: string, daftar: unknown[]): string | null {
  let simbolBerkas: string | null = null;
  for (const baris of daftar) {
    const s = obyek(baris);
    if (s === null) continue;
    const simbol = teks(s['symbol']);
    const tanggal = teks(s['suspension_date']);
    if (simbol === null || tanggal === null) continue;
    const kode = normalkanSimbol(simbol);
    if (simbolBerkas === null) simbolBerkas = kode;
    const alasan = teks(s['reason']) ?? '';
    const kunci = `${kode}|${tanggal}|${alasan}`;
    if (kumpul.kunciSuspensiTerpakai.has(kunci)) continue;
    kumpul.kunciSuspensiTerpakai.add(kunci);
    const suspensi: Suspensi = { tanggal, alasan };
    ambil(kumpul, kode, berkas).suspensi.push(suspensi);
  }
  return simbolBerkas;
}

function serapAksiKorporasi(
  kumpul: Pengumpul,
  berkas: string,
  akar: Record<string, unknown>,
): string | null {
  const simbol = teks(akar['symbol']);
  if (simbol === null) return null;
  const data = ambil(kumpul, simbol, berkas);
  const aksi = obyek(akar['corporate_actions']);
  if (aksi === null) return normalkanSimbol(simbol);

  for (const butir of larik(aksi['stock_split']) ?? []) {
    const b = obyek(butir);
    const tanggal = b === null ? null : teks(b['date']);
    const rasio = b === null ? null : angka(b['split_ratio']);
    if (tanggal === null || rasio === null) continue;
    const split: StockSplit = { tanggal, rasio, sumber: berkas };
    data.stock_split.push(split);
  }
  for (const butir of larik(aksi['right_issue']) ?? []) {
    const b = obyek(butir);
    const ex = b === null ? null : teks(b['ex_date']);
    if (b === null || ex === null) continue;
    const ri: RightIssue = {
      ex_date: ex,
      rasio_lama: angka(b['old_ratio']),
      rasio_baru: angka(b['new_ratio']),
      sumber: berkas,
      harga: angka(b['price']),
    };
    data.right_issue.push(ri);
  }
  for (const butir of larik(aksi['bonus']) ?? []) {
    const b = obyek(butir);
    // Saham bonus kadang hanya punya `payment_date`: satu-satunya saham bonus
    // di gudang (MTLA 2015) begitu. Tanggal itu dipakai sebagai tanggal aksi
    // dan disebut apa adanya, bukan disamarkan sebagai ex_date yang tidak ada.
    const ex = b === null ? null : (teks(b['ex_date']) ?? teks(b['date']) ?? teks(b['payment_date']));
    if (b === null || ex === null) continue;
    const bonus: SahamBonus = {
      ex_date: ex,
      sumber: berkas,
      rasio_lama: angka(b['old_ratio']),
      rasio_baru: angka(b['new_ratio']),
    };
    data.bonus.push(bonus);
  }
  for (const butir of larik(aksi['dividend']) ?? []) {
    const b = obyek(butir);
    const ex = b === null ? null : teks(b['ex_date']);
    const nilai = b === null ? null : angka(b['dividend_amount']);
    if (b === null || ex === null || nilai === null) continue;
    const dividen: Dividen = {
      ex_date: ex,
      tanggal_bayar: teks(b['payment_date']),
      nilai_per_lembar: nilai,
      imbal_hasil: angka(b['dividend_yield']),
    };
    data.dividen.push(dividen);
  }
  for (const butir of larik(aksi['agm']) ?? []) {
    const b = obyek(butir);
    const tanggal = b === null ? null : teks(b['agm_date']);
    if (tanggal === null) continue;
    // RUPS tanpa `agm_result` tetap dimuat: tanpa itu tidak ada aturan yang
    // bisa melaporkan berapa RUPS yang teks keputusannya memang kosong.
    const rups: HasilRups = { tanggal, ringkasan: b === null ? null : teks(b['agm_result']) };
    data.rups.push(rups);
  }
  return normalkanSimbol(simbol);
}

function serapRingkasan(
  kumpul: Pengumpul,
  berkas: string,
  akar: Record<string, unknown>,
): string | null {
  const simbol = teks(akar['symbol']);
  if (simbol === null) return null;
  const data = ambil(kumpul, simbol, berkas);
  const ringkasan = obyek(akar['overview']);
  if (ringkasan !== null) {
    const nilaiPasar = angka(ringkasan['market_cap']);
    const tutup = angka(ringkasan['last_close_price']);
    const pada = teks(ringkasan['latest_close_date']);
    if (nilaiPasar !== null && tutup !== null && tutup !== 0 && pada !== null) {
      data.ringkasan_pasar = { nilai_pasar: nilaiPasar, harga_tutup: tutup, pada };
    }
    const ekstrem = obyek(ringkasan['all_time_price']);
    if (ekstrem !== null) {
      for (const label of Object.keys(ekstrem).sort()) {
        const isi = obyek(ekstrem[label]);
        if (isi === null) continue;
        for (const tanggal of Object.keys(isi).sort()) {
          const nilai = angka(isi[tanggal]);
          if (nilai === null) continue;
          const butir: NilaiEkstrem = { label, tanggal, nilai };
          data.all_time_price.push(butir);
        }
      }
    }
  }
  serapKeuanganKe(data, akar);
  return normalkanSimbol(simbol);
}

/**
 * Tahun buku bisa ditulis sebagai angka (`historical_financials[].year`) atau
 * sebagai teks (kunci `historical_eps`, `historical_financial_ratio[].year`).
 * Keduanya dibaca sebagai bilangan bulat, dan yang bukan tahun dibuang.
 */
function tahunBuku(nilai: unknown): number | null {
  const langsung = angka(nilai);
  if (langsung !== null) return Number.isInteger(langsung) ? langsung : null;
  const sebagaiTeks = teks(nilai);
  if (sebagaiTeks === null || !/^\d{4}$/.test(sebagaiTeks)) return null;
  return Number.parseInt(sebagaiTeks, 10);
}

function serapKeuanganKe(data: DataEmiten, akar: Record<string, unknown>): void {
  const keuangan = obyek(akar['financials']);
  if (keuangan === null) return;

  for (const butir of larik(keuangan['historical_financials']) ?? []) {
    const b = obyek(butir);
    if (b === null) continue;
    const tahun = tahunBuku(b['year']);
    if (tahun === null) continue;

    const lembar = angka(b['outstanding_shares']);
    // `saham_tahunan` sengaja membuang lembar nol: ia dipakai sebagai penyebut.
    if (lembar !== null && lembar !== 0 && !data.saham_tahunan.some((s) => s.tahun === tahun)) {
      data.saham_tahunan.push({ tahun, lembar });
    }

    if (data.keuangan_tahunan.some((k) => k.tahun === tahun)) continue;
    const baris: KeuanganTahunan = {
      tahun,
      laba: angka(b['earnings']),
      pendapatan: angka(b['revenue']),
      ekuitas: angka(b['total_equity']),
      aset: angka(b['total_assets']),
      laba_kotor: angka(b['gross_profit']),
      lembar,
    };
    data.keuangan_tahunan.push(baris);
  }

  const eps = obyek(keuangan['historical_eps']);
  if (eps !== null) {
    for (const kunci of Object.keys(eps).sort()) {
      const tahun = tahunBuku(kunci);
      const isi = obyek(eps[kunci]);
      const nilai = isi === null ? null : angka(isi['eps']);
      if (tahun === null || nilai === null) continue;
      if (data.eps_tahunan.some((e) => e.tahun === tahun)) continue;
      const butir: EpsTahunan = { tahun, eps: nilai };
      data.eps_tahunan.push(butir);
    }
  }

  for (const butir of larik(keuangan['historical_financial_ratio']) ?? []) {
    const b = obyek(butir);
    if (b === null) continue;
    const tahun = tahunBuku(b['year']);
    if (tahun === null) continue;
    for (const kelompok of Object.keys(b).sort()) {
      const isi = obyek(b[kelompok]);
      if (isi === null) continue;
      for (const nama of Object.keys(isi).sort()) {
        const nilai = angka(isi[nama]);
        if (nilai === null) continue;
        if (data.rasio.some((r) => r.tahun === tahun && r.kelompok === kelompok && r.nama === nama)) {
          continue;
        }
        const rasio: RasioSiapPakai = { tahun, kelompok, nama, nilai };
        data.rasio.push(rasio);
      }
    }
  }
}

function serapKeuangan(
  kumpul: Pengumpul,
  berkas: string,
  akar: Record<string, unknown>,
): string | null {
  const simbol = teks(akar['symbol']);
  if (simbol === null) return null;
  serapKeuanganKe(ambil(kumpul, simbol, berkas), akar);
  return normalkanSimbol(simbol);
}

function serapKepemilikan(
  kumpul: Pengumpul,
  berkas: string,
  akar: Record<string, unknown>,
): string | null {
  const simbol = teks(akar['symbol']);
  if (simbol === null) return null;
  const data = ambil(kumpul, simbol, berkas);
  const kepemilikan = obyek(akar['ownership']);
  for (const butir of larik(kepemilikan?.['major_shareholders']) ?? []) {
    const b = obyek(butir);
    const nama = b === null ? null : teks(b['name']);
    const lembar = b === null ? null : angka(b['share_amount']);
    if (nama === null || lembar === null) continue;
    const pemegang: PotretPemegang = { nama, lembar };
    data.pemegang.push(pemegang);
  }
  return normalkanSimbol(simbol);
}

function serapKalender(kumpul: Pengumpul, berkas: string, akar: Record<string, unknown>): void {
  for (const butir of larik(akar['stock_split']) ?? []) {
    const b = obyek(butir);
    const simbol = b === null ? null : teks(b['symbol']);
    const tanggal = b === null ? null : teks(b['date']);
    const rasio = b === null ? null : angka(b['split_ratio']);
    if (simbol === null || tanggal === null || rasio === null) continue;
    const data = ambil(kumpul, simbol, berkas);
    if (data.stock_split.some((s) => s.tanggal === tanggal && s.rasio === rasio)) continue;
    data.stock_split.push({ tanggal, rasio, sumber: berkas });
  }
  for (const butir of larik(akar['right_issue']) ?? []) {
    const b = obyek(butir);
    const simbol = b === null ? null : teks(b['symbol']);
    const ex = b === null ? null : teks(b['ex_date']);
    if (b === null || simbol === null || ex === null) continue;
    const data = ambil(kumpul, simbol, berkas);
    if (data.right_issue.some((r) => r.ex_date === ex)) continue;
    data.right_issue.push({
      ex_date: ex,
      rasio_lama: angka(b['old_ratio']),
      rasio_baru: angka(b['new_ratio']),
      sumber: berkas,
    });
  }
  for (const butir of larik(akar['bonus']) ?? []) {
    const b = obyek(butir);
    const simbol = b === null ? null : teks(b['symbol']);
    const ex = b === null ? null : (teks(b['ex_date']) ?? teks(b['date']));
    if (simbol === null || ex === null) continue;
    const data = ambil(kumpul, simbol, berkas);
    if (data.bonus.some((x) => x.ex_date === ex)) continue;
    data.bonus.push({ ex_date: ex, sumber: berkas });
  }
}

// --- pintu utama -------------------------------------------------------------

export function muatGudang(folder: string = FOLDER_GUDANG): Gudang {
  const namaBerkas = readdirSync(folder)
    .filter((n) => n.endsWith('.json'))
    .sort();

  const kumpul: Pengumpul = {
    emiten: new Map(),
    kunciLaporanTerpakai: new Set(),
    kunciHargaTerpakai: new Map(),
    kunciSuspensiTerpakai: new Set(),
    bentrok: [],
    rangkapLaporan: 0,
    rangkapHarga: 0,
  };
  const catatanBerkas: BerkasGudang[] = [];

  for (const nama of namaBerkas) {
    let isi: unknown;
    try {
      isi = JSON.parse(readFileSync(`${folder}/${nama}`, 'utf8'));
    } catch (galat) {
      catatanBerkas.push({
        berkas: nama,
        jenis: 'tak-dikenal',
        alasan: `tidak bisa diurai sebagai JSON: ${galat instanceof Error ? galat.message : String(galat)}`,
        simbol: null,
        baris: 0,
      });
      continue;
    }
    const { jenis, alasan } = kenaliBerkas(isi);
    let simbol: string | null = null;
    let baris = 0;
    const akar = obyek(isi);
    const daftar = larik(isi);

    switch (jenis) {
      case 'laporan-kepemilikan':
        if (akar !== null) {
          baris = (larik(akar['results']) ?? []).length;
          simbol = serapLaporan(kumpul, nama, akar);
        }
        break;
      case 'harga-harian':
        if (daftar !== null) {
          baris = daftar.length;
          simbol = serapHarga(kumpul, nama, daftar);
        }
        break;
      case 'suspensi': {
        const isiSuspensi = daftar ?? larik(akar?.['results']) ?? [];
        baris = isiSuspensi.length;
        simbol = serapSuspensi(kumpul, nama, isiSuspensi);
        break;
      }
      case 'aksi-korporasi':
        if (akar !== null) simbol = serapAksiKorporasi(kumpul, nama, akar);
        break;
      case 'ringkasan':
        if (akar !== null) simbol = serapRingkasan(kumpul, nama, akar);
        break;
      case 'keuangan':
        if (akar !== null) simbol = serapKeuangan(kumpul, nama, akar);
        break;
      case 'kepemilikan':
        if (akar !== null) simbol = serapKepemilikan(kumpul, nama, akar);
        break;
      case 'kalender':
        if (akar !== null) serapKalender(kumpul, nama, akar);
        break;
      case 'berita':
        baris = (larik(akar?.['results']) ?? []).length;
        break;
      case 'paginasi-kosong':
      case 'tak-dikenal':
        break;
    }
    catatanBerkas.push({ berkas: nama, jenis, alasan, simbol, baris });
  }

  // Urutan di dalam tiap emiten ditetapkan di sini, sekali, supaya aturan tidak
  // perlu mengurutkan sendiri dan hasilnya tidak bergantung urutan berkas.
  for (const data of kumpul.emiten.values()) {
    data.harga.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    data.suspensi.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    data.laporan.sort((a, b) => {
      const selisih = a.dilaporkan_pada.localeCompare(b.dilaporkan_pada);
      return selisih !== 0 ? selisih : a.laporan_id.localeCompare(b.laporan_id);
    });
    data.berkas_laporan.sort((a, b) => a.berkas.localeCompare(b.berkas));
    data.stock_split.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    data.right_issue.sort((a, b) => a.ex_date.localeCompare(b.ex_date));
    data.bonus.sort((a, b) => a.ex_date.localeCompare(b.ex_date));
    data.dividen.sort((a, b) => a.ex_date.localeCompare(b.ex_date));
    data.rups.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    data.all_time_price.sort(
      (a, b) => a.label.localeCompare(b.label) || a.tanggal.localeCompare(b.tanggal),
    );
    data.pemegang.sort((a, b) => a.nama.localeCompare(b.nama));
    data.saham_tahunan.sort((a, b) => a.tahun - b.tahun);
    data.keuangan_tahunan.sort((a, b) => a.tahun - b.tahun);
    data.eps_tahunan.sort((a, b) => a.tahun - b.tahun);
    data.rasio.sort(
      (a, b) => a.tahun - b.tahun || a.kelompok.localeCompare(b.kelompok) || a.nama.localeCompare(b.nama),
    );
    data.berkas.sort();
  }

  const emiten = new Map([...kumpul.emiten.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  const tak_dikenal = catatanBerkas.filter((b) => b.jenis === 'tak-dikenal');

  let laporanUnik = 0;
  let hargaUnik = 0;
  let suspensiUnik = 0;
  for (const data of emiten.values()) {
    laporanUnik += data.laporan.length;
    hargaUnik += data.harga.length;
    suspensiUnik += data.suspensi.length;
  }

  return {
    folder,
    emiten,
    berkas: catatanBerkas,
    tak_dikenal,
    bentrok_harga: kumpul.bentrok,
    ringkasan: {
      berkas: catatanBerkas.length,
      emiten: emiten.size,
      laporan_unik: laporanUnik,
      laporan_rangkap: kumpul.rangkapLaporan,
      baris_harga_unik: hargaUnik,
      baris_harga_rangkap: kumpul.rangkapHarga,
      suspensi_unik: suspensiUnik,
    },
  };
}
