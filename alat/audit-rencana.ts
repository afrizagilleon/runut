/**
 * Aturan tetap pemilihan emiten dan paket panggilan audit gudang (M4a D-3).
 *
 * Semua fungsi di sini murni: masukannya data yang **sudah** ada (cache
 * suspensi, daftar perusahaan, respons emiten itu sendiri), keluarannya
 * daftar emiten dan daftar panggilan. Tidak ada jam dinding, acak, maupun
 * jaringan — dua orang yang menjalankan aturan ini atas masukan yang sama
 * mendapat emiten dan panggilan yang sama.
 *
 * Aturannya ditulis dan di-commit (`docs/bukti/audit-rencana.md`) SEBELUM data
 * emiten diambil. Emiten tidak boleh ditambah atau dibuang sesudah melihat
 * hasil; emiten yang gagal diambil dicatat alasannya, tidak diganti.
 */
import { createHash } from 'node:crypto';

/** Parameter tetap audit. Diubah = rencana baru, bukan penyesuaian diam-diam. */
export const PARAMETER_AUDIT = {
  /** Rentang peristiwa yang diaudit. `akhir` = sehari sebelum rencana ditulis (end di masa depan → 400). */
  awal: '2025-01-01',
  akhir: '2026-09-28',
  /** Tahun suspensi yang membuat emiten masuk kelompok suspensi. */
  suspensi_awal: '2025-01-01',
  suspensi_akhir: '2026-12-31',
  jumlah_suspensi: 28,
  jumlah_pembanding: 14,
  /** Pagu kredit per emiten; paket tetap 5–6, sisanya harga harian. */
  pagu_emiten: 10,
  maks_jendela_harian: 4,
  /** Jendela harian maksimum endpoint `/v2/daily/` = 90 hari (start..start+89). */
  lebar_jendela_hari: 90,
  /** Jendela dimulai 14 hari sebelum tanggal penting, supaya ada hari "sebelum". */
  hari_sebelum: 14,
  batas_filings: 30,
  /** Satu panggilan daftar perusahaan (1 kredit, 200 baris terurut simbol). */
  path_daftar: '/v2/companies/?limit=200',
  berkas_daftar: 'daftar/companies-limit200-offset0.json',
} as const;

// --- tanggal -------------------------------------------------------------------

const HARI_MS = 86_400_000;

export function tambahHari(tanggal: string, hari: number): string {
  const t = Date.parse(`${tanggal}T00:00:00Z`);
  return new Date(t + hari * HARI_MS).toISOString().slice(0, 10);
}

function tanggalSah(nilai: unknown): string | null {
  if (typeof nilai !== 'string') return null;
  const t = nilai.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

// --- simbol --------------------------------------------------------------------

export function normalkan(simbol: string): string {
  return simbol.trim().toUpperCase().replace(/\.JK$/, '');
}

export function sidikSimbol(simbol: string): string {
  return createHash('sha256').update(normalkan(simbol)).digest('hex');
}

/** Berkas bersama yang memuat banyak emiten; emiten yang hanya muncul di sini belum "ada di gudang". */
export function berkasBersama(nama: string): boolean {
  return nama === 'suspensions-all.json' || nama === 'dada-suspensions.json' || nama.startsWith('kalender-');
}

/**
 * Emiten yang sudah ada di gudang sebelum M4a: yang punya sedikitnya satu
 * berkas miliknya sendiri (bukan hanya baris di daftar suspensi atau kalender).
 */
export function simbolGudangLama(emiten: Iterable<{ simbol: string; berkas: string[] }>): string[] {
  const keluar: string[] = [];
  for (const e of emiten) if (e.berkas.some((b) => !berkasBersama(b))) keluar.push(normalkan(e.simbol));
  return [...new Set(keluar)].sort();
}

export interface BarisSuspensi {
  symbol: string;
  suspension_date: string;
}

/** Semua simbol yang pernah muncul di daftar suspensi, tahun berapa pun. */
export function simbolPernahSuspensi(baris: readonly BarisSuspensi[]): Set<string> {
  return new Set(baris.map((b) => normalkan(b.symbol)));
}

/**
 * (a) Kelompok suspensi: emiten yang punya suspensi bertanggal 2025–2026 dan
 * belum ada di gudang, urut simbol, diambil dari atas.
 */
export function pilihKelompokSuspensi(
  baris: readonly BarisSuspensi[],
  gudangLama: readonly string[],
  jumlah: number = PARAMETER_AUDIT.jumlah_suspensi,
): string[] {
  const lama = new Set(gudangLama.map(normalkan));
  const kandidat = new Set<string>();
  for (const b of baris) {
    const t = tanggalSah(b.suspension_date);
    if (t === null || t < PARAMETER_AUDIT.suspensi_awal || t > PARAMETER_AUDIT.suspensi_akhir) continue;
    const s = normalkan(b.symbol);
    if (!lama.has(s)) kandidat.add(s);
  }
  return [...kandidat].sort().slice(0, jumlah);
}

/**
 * (b) Kelompok pembanding: dari daftar perusahaan Sectors (satu panggilan),
 * buang yang pernah muncul di daftar suspensi dan yang sudah ada di gudang,
 * urutkan menurut sha256(simbol) menaik, ambil dari atas.
 */
export function pilihKelompokPembanding(
  daftar: ReadonlyArray<{ symbol: string }>,
  pernahSuspensi: ReadonlySet<string>,
  gudangLama: readonly string[],
  jumlah: number = PARAMETER_AUDIT.jumlah_pembanding,
): string[] {
  const lama = new Set(gudangLama.map(normalkan));
  const kandidat = [...new Set(daftar.map((d) => normalkan(d.symbol)))].filter(
    (s) => s !== '' && !pernahSuspensi.has(s) && !lama.has(s),
  );
  return kandidat
    .map((s) => ({ s, h: sidikSimbol(s) }))
    .sort((a, b) => (a.h < b.h ? -1 : a.h > b.h ? 1 : 0))
    .slice(0, jumlah)
    .map((x) => x.s);
}

/**
 * Urutan ambil 2:1 berselang: a1, a2, b1, a3, a4, b2, … Kalau pagu habis di
 * tengah jalan, kedua kelompok terpotong dengan perbandingan yang sama —
 * bukan satu kelompok utuh dan yang lain kosong.
 */
export function urutanAmbil(
  suspensi: readonly string[],
  pembanding: readonly string[],
): Array<{ simbol: string; kelompok: 'suspensi' | 'pembanding' }> {
  const keluar: Array<{ simbol: string; kelompok: 'suspensi' | 'pembanding' }> = [];
  let i = 0;
  let j = 0;
  while (i < suspensi.length || j < pembanding.length) {
    for (let k = 0; k < 2 && i < suspensi.length; k += 1) keluar.push({ simbol: suspensi[i++]!, kelompok: 'suspensi' });
    if (j < pembanding.length) keluar.push({ simbol: pembanding[j++]!, kelompok: 'pembanding' });
  }
  return keluar;
}

// --- paket panggilan -----------------------------------------------------------

export type Peran =
  | 'aksi-korporasi'
  | 'filings-p0'
  | 'filings-p1'
  | 'kepemilikan'
  | 'ringkasan-keuangan'
  | 'harian';

export interface RencanaPanggilan {
  peran: Peran;
  path: string;
  berkas: string;
}

/**
 * Paket tetap tiap emiten, dalam urutan dijalankan. Aksi korporasi paling
 * depan: panggilan 1 kredit itu sekaligus memeriksa apakah simbolnya dikenal
 * Sectors — kalau 404, sisa paket tidak dikirim.
 */
export function paketTetap(simbol: string): RencanaPanggilan[] {
  const s = normalkan(simbol);
  const { awal, akhir, batas_filings } = PARAMETER_AUDIT;
  return [
    { peran: 'aksi-korporasi', path: `/v2/company/corporate-actions/${s}/`, berkas: `${s}-m4a-corpactions.json` },
    {
      peran: 'filings-p0',
      path: `/v2/filings/?symbol=${s}&start=${awal}&end=${akhir}&limit=${batas_filings}`,
      berkas: `${s}-m4a-filings-p0.json`,
    },
    { peran: 'kepemilikan', path: `/v2/company/report/${s}/?sections=ownership`, berkas: `${s}-m4a-ownership.json` },
    {
      peran: 'ringkasan-keuangan',
      path: `/v2/company/report/${s}/?sections=overview,financials`,
      berkas: `${s}-m4a-overview-financials.json`,
    },
  ];
}

/** Halaman kedua filings, hanya bila halaman pertama `has_next`. */
export function panggilanFilingsLanjut(simbol: string): RencanaPanggilan {
  const s = normalkan(simbol);
  const { awal, akhir, batas_filings } = PARAMETER_AUDIT;
  return {
    peran: 'filings-p1',
    path: `/v2/filings/?symbol=${s}&start=${awal}&end=${akhir}&limit=${batas_filings}&offset=${batas_filings}`,
    berkas: `${s}-m4a-filings-p1.json`,
  };
}

export function panggilanHarian(simbol: string, jendela: Jendela): RencanaPanggilan {
  const s = normalkan(simbol);
  return {
    peran: 'harian',
    path: `/v2/daily/${s}/?start=${jendela.mulai}&end=${jendela.akhir}`,
    berkas: `${s}-m4a-daily-${jendela.mulai}.json`,
  };
}

// --- tanggal penting dan jendela harga harian --------------------------------

function obyek(n: unknown): Record<string, unknown> | null {
  return typeof n === 'object' && n !== null && !Array.isArray(n) ? (n as Record<string, unknown>) : null;
}

function larik(n: unknown): unknown[] {
  return Array.isArray(n) ? n : [];
}

export interface TanggalPenting {
  /** Tingkat 1: tanggal suspensi emiten itu. */
  suspensi: string[];
  /** Tingkat 2: tanggal terbit laporan kepemilikan dan tanggal tiap butir transaksinya. */
  laporan: string[];
  /** Tingkat 3: tanggal ex dividen, pemecahan saham, right issue, saham bonus. */
  aksi: string[];
}

function dalamRentang(t: string | null): t is string {
  return t !== null && t >= PARAMETER_AUDIT.awal && t <= PARAMETER_AUDIT.akhir;
}

function unikUrut(daftar: Array<string | null>): string[] {
  return [...new Set(daftar.filter(dalamRentang))].sort();
}

/** Kumpulkan tanggal penting dari respons yang sudah diambil. Data yang cacat dilewati. */
export function tanggalPenting(masukan: {
  simbol: string;
  suspensi: readonly BarisSuspensi[];
  halamanFilings: readonly unknown[];
  aksiKorporasi: unknown;
}): TanggalPenting {
  const s = normalkan(masukan.simbol);
  const suspensi = unikUrut(
    masukan.suspensi.filter((b) => normalkan(b.symbol) === s).map((b) => tanggalSah(b.suspension_date)),
  );

  const laporan: Array<string | null> = [];
  for (const halaman of masukan.halamanFilings) {
    for (const r of larik(obyek(halaman)?.['results'])) {
      const baris = obyek(r);
      if (baris === null) continue;
      laporan.push(tanggalSah(baris['timestamp']));
      for (const t of larik(baris['price_transaction'])) laporan.push(tanggalSah(obyek(t)?.['date']));
    }
  }

  const aksi: Array<string | null> = [];
  const ca = obyek(obyek(masukan.aksiKorporasi)?.['corporate_actions']);
  for (const d of larik(ca?.['dividend'])) aksi.push(tanggalSah(obyek(d)?.['ex_date']));
  for (const d of larik(ca?.['stock_split'])) aksi.push(tanggalSah(obyek(d)?.['date']));
  for (const d of larik(ca?.['right_issue'])) aksi.push(tanggalSah(obyek(d)?.['ex_date']));
  for (const d of larik(ca?.['bonus'])) {
    const b = obyek(d);
    aksi.push(tanggalSah(b?.['ex_date']) ?? tanggalSah(b?.['date']) ?? tanggalSah(b?.['payment_date']));
  }
  return { suspensi, laporan: unikUrut(laporan), aksi: unikUrut(aksi) };
}

export interface Jendela {
  mulai: string;
  akhir: string;
}

function jendelaUntuk(t: string): Jendela {
  const { awal, akhir, hari_sebelum, lebar_jendela_hari } = PARAMETER_AUDIT;
  let mulai = tambahHari(t, -hari_sebelum);
  if (mulai < awal) mulai = awal;
  let selesai = tambahHari(mulai, lebar_jendela_hari - 1);
  if (selesai > akhir) {
    selesai = akhir;
    const geser = tambahHari(akhir, -(lebar_jendela_hari - 1));
    mulai = geser < awal ? awal : geser;
  }
  return { mulai, akhir: selesai };
}

/**
 * Pilih paling banyak `maks` jendela 90 hari: tutup tanggal suspensi dulu,
 * lalu tanggal laporan, lalu tanggal aksi korporasi; di tiap tingkat
 * tanggal terawal yang belum tertutup membuka jendela baru. Tanpa satu pun
 * tanggal penting: satu jendela 90 hari terakhir rentang audit.
 */
export function pilihJendela(tp: TanggalPenting, maks: number = PARAMETER_AUDIT.maks_jendela_harian): Jendela[] {
  const jendela: Jendela[] = [];
  const tertutup = (t: string) => jendela.some((j) => j.mulai <= t && t <= j.akhir);
  for (const tingkat of [tp.suspensi, tp.laporan, tp.aksi]) {
    for (const t of tingkat) {
      if (jendela.length >= maks) break;
      if (!tertutup(t)) jendela.push(jendelaUntuk(t));
    }
  }
  if (jendela.length === 0 && maks > 0) jendela.push(jendelaUntuk(PARAMETER_AUDIT.akhir));
  return jendela.sort((a, b) => (a.mulai < b.mulai ? -1 : a.mulai > b.mulai ? 1 : 0));
}

/** Perkiraan kredit terburuk seluruh rencana: satu panggilan daftar + pagu tiap emiten. */
export function kreditTerburuk(jumlahEmiten: number): number {
  return 1 + jumlahEmiten * PARAMETER_AUDIT.pagu_emiten;
}
