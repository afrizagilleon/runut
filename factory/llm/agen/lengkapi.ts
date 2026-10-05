/**
 * Tahap 2 AI agent penulis soal: "lengkapi kasus" (mode `--lengkapi`, M2d-29).
 *
 * Sesudah tiga omongan terkunci di bank, agent yang SAMA menulis sendiri isi
 * lampiran yang selama ini ditulis penyetuju (`LampiranPenyetuju`): judul,
 * urutan soal, `tanya`, istilah, teks kartu sehari-hari, layar `pembukaan`
 * (apa yang terjadi SESUDAH hari simulasi), `penutup`, dan `kartu_konsep`.
 *
 * Yang dijaga kode di sini, bukan diputuskan model:
 *
 * - **Kuncian.** Data sesudah hari simulasi hanya keluar lewat
 *   `lihatSesudahnya`, dan alat itu hanya bisa dibuat dari `SiapanLengkapi`.
 *   `siapkanLengkapi` MELEMPAR (`LengkapiDitolak`) bila bank paket itu belum
 *   bisa dirakit menjadi simulasi — sebelum satu berkas gudang pun dibaca.
 * - **Teks soal terkunci.** Draft lampiran hanya boleh memuat bagian yang
 *   ditulis agent; medan teks soal di dalam draft ditolak (`uraiDrafLampiran`),
 *   isi omongan dicocokkan dengan sidiknya saat dibaca, dan kasus yang sudah
 *   dibangun dibandingkan lagi huruf demi huruf (`periksaSetia`).
 * - **Bagian yang bukan tulisan dilengkapi kode**: penunjuk paket dan bank,
 *   daftar berkas gudang emiten beserta sidiknya, papan dan sektor dari
 *   ringkasan emiten di gudang.
 * - **Pembangun dan validator yang sama dengan produk**: `dariAgen` →
 *   `bangunKasusUmum` → `periksaKasus` + `periksaSetia`; masalahnya
 *   dikembalikan apa adanya.
 * - **Satu critic berbayar** (`kritik-kasus.ts`) sebelum berkas ditulis; berkas
 *   hanya ditulis ke folder percobaan (`eval/penyusun/<id>/`), tidak pernah ke
 *   `cases/`.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { samarkanNama } from '../../../alat/agen/alat-sectors.ts';
import { pilihDefinisi } from '../../../alat/penyusun/paket-otomatis.ts';
import { asalKosongDariManifest } from '../../bangun-kasus.ts';
import { tanggalId } from '../../format.ts';
import { KasusTidakSah, bangunKasusUmum } from '../../kasus/bangun.ts';
import {
  HasilAgenTidakSah,
  dariAgen,
  idOmonganAgen,
  periksaSetia,
  type EntriOmongan,
  type LampiranPenyetuju,
  type LampiranSoal,
  type OmonganAgen,
} from '../../kasus/dari-agen.ts';
import { keJson } from '../../kasus/json.ts';
import { muatGudang, type AsalGudang } from '../../muat/gudang.ts';
import { pustakaGudang, type SumberGudang } from '../../muat/pustaka-gudang.ts';
import { sha256, type BerkasBeku } from '../../muat/sidik.ts';
import { PENANDA_BUKAN_FAKTA, ambilRujukan } from '../../skema/rujukan.ts';
import type { Fakta, Istilah, KartuKonsep, Kasus, Pembukaan, Penutup, TeksAwam } from '../../skema/tipe.ts';
import { bacaAturanBeku, periksaJejakBeku, type AturanBeku } from '../../verifikasi/aturan-beku.ts';
import { konteksEmiten } from '../../verifikasi/konteks.ts';
import type { DataEmiten } from '../../verifikasi/tipe.ts';
import { verifikasiV2 } from '../../verifikasi/v2.ts';
import { bacaBank, jsonKanonik, shaPaketBank, type EntriBank } from '../bebas/bank.ts';
import { PaguTercapai } from '../pagu.ts';
import { kaitkanTemuanV2, type PaketFakta } from '../paket.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { PenyediaTidakTersedia } from '../templat/penyedia.ts';
import { peningkatanDari, rakitSimulasi } from './alat.ts';
import { kritikKasus, type PutusanKritikKasus } from './kritik-kasus.ts';

/* ------------------------------------------------------------------ */
/* Tetapan                                                             */
/* ------------------------------------------------------------------ */

/**
 * Sisa anggaran minimum (USD) supaya satu `ajukan_kasus` boleh dijalankan.
 * Pemanggil berpagu menolak panggilan critic bila sisa pagu di bawah perkiraan
 * maksimum satu panggilan (40.000 token keluaran × US$4,4 per juta ≈ US$0,18),
 * jadi cadangannya sedikit di atas itu. Critic satu omongan terukur
 * US$0,025–0,079 (`eval/penyusun/m2d26-amag-1/mentah-panggilan.jsonl`).
 */
export const CADANGAN_KRITIK_KASUS_USD = 0.2;

/** Hari bursa pertama sesudah tanggal simulasi yang ditampilkan satu per satu. */
export const MAKS_HARI_PERTAMA = 5;
const MAKS_HARI_SERI = 3;
const MAKS_DIVIDEN = 5;
const MAKS_RAPAT = 3;
const MAKS_LAPORAN = 8;
const MAKS_SUSPENSI = 5;
const MAKS_TIDAK_LOLOS = 10;
const MAKS_TEMUAN = 8;
const MAKS_KALIMAT = 420;

/**
 * Kartu konsep yang sudah ada (`docs/kasus-dada.md`, "Kartu konsep yang
 * dipakai"); judulnya seperti ditulis ketiga kasus tayang. Lampiran AMAG
 * tulisan penyetuju mencatat aturannya: "tidak ada kode baru".
 */
export const KARTU_KONSEP_ADA: readonly KartuKonsep[] = [
  { kode: 'A2', judul: 'Lot dan lembar' },
  { kode: 'A4', judul: 'Kapitalisasi pasar' },
  { kode: 'B1', judul: 'Dividen dan tanggal cum/ex' },
  { kode: 'C1', judul: 'Pengendali' },
  { kode: 'C3', judul: 'Tanggal transaksi dan tanggal laporan' },
  { kode: 'D1', judul: 'Suspensi' },
  { kode: 'D2', judul: 'Cooling down dan suspensi sampai pengumuman lebih lanjut' },
  { kode: 'D4', judul: 'Suspensi karena terlambat menyampaikan laporan' },
  { kode: 'E1', judul: 'Pendapatan dan laba' },
];

/** Papan pencatatan di ringkasan emiten Sectors → sebutan di kasus. */
export const PAPAN: Readonly<Record<string, string>> = {
  Main: 'Utama',
  Development: 'Pengembangan',
  Acceleration: 'Akselerasi',
  Watchlist: 'Pemantauan Khusus',
};

/**
 * Sub-sektor di ringkasan emiten Sectors → sebutan di kasus. Hanya tiga yang
 * sudah dipakai kasus tayang (DADA, ULTJ, AMAG); sub-sektor lain dipakai apa
 * adanya dan dicatat supaya penyetuju menerjemahkannya, bukan dikarang di sini.
 */
export const SEKTOR: Readonly<Record<string, string>> = {
  'Properties & Real Estate': 'properti dan real estat',
  'Food & Beverage': 'makanan dan minuman',
  Insurance: 'asuransi',
};

/* ------------------------------------------------------------------ */
/* Bentuk                                                              */
/* ------------------------------------------------------------------ */

/** Bagian lampiran yang ditulis agent; sisanya (`kasus_id`, `sumber`, `emiten`) dilengkapi kode. */
export interface DrafLampiran {
  judul: string;
  soal: LampiranSoal[];
  awam: Record<string, TeksAwam>;
  pembukaan: Pembukaan;
  penutup: Penutup;
  kartu_konsep: KartuKonsep[];
}

/** Mode lengkapi tidak bisa dijalankan; pesannya menyebut butirnya. Tidak ada panggilan berbayar yang dikirim. */
export class LengkapiDitolak extends Error {
  readonly butir: string[];

  constructor(pesan: string, butir: string[] = []) {
    super(butir.length === 0 ? pesan : `${pesan}\n${butir.map((b) => `  - ${b}`).join('\n')}`);
    this.name = 'LengkapiDitolak';
    this.butir = butir;
  }
}

export interface FaktaSesudah {
  fact_id: string;
  kalimat: string;
  nilai: number | string | null;
  satuan: string | null;
  tanggal: string;
  /** Kenapa fakta ini ditampilkan (dihitung kode, mis. "penutupan tertinggi sesudah tanggal simulasi"). */
  peran?: string[];
}

export interface KelompokSesudah {
  ada: boolean;
  /** Berapa yang ada di data (bukan berapa yang ditampilkan), atau penjelasan bahwa jenis data ini kosong. */
  keterangan: string;
  fakta: FaktaSesudah[];
}

export interface RingkasanSesudah {
  tanggal_simulasi: string;
  /** Tanggal baris harga terakhir di data; `null` bila tidak ada baris sesudah tanggal simulasi. */
  data_harga_sampai: string | null;
  harga: KelompokSesudah;
  dividen: KelompokSesudah;
  rapat: KelompokSesudah;
  laporan_kepemilikan: KelompokSesudah;
  penghentian_perdagangan: KelompokSesudah;
  /** Fakta sesudah tanggal simulasi yang TIDAK lolos aturan verifikasi; tidak boleh ditautkan. */
  tidak_lolos_verifikasi: { jumlah: number; contoh: Array<{ fact_id: string; alasan: string }> };
  /** Bahan bagian "disingkirkan": yang tidak dijadikan kartu pada hari simulasi, dan temuan pemeriksaannya. */
  pada_hari_simulasi: {
    aturan_dijalankan: number;
    aturan_dilewati: number;
    calon_kartu_disingkirkan: Array<{ fact_id: string; alasan: string }>;
    temuan_pemeriksaan: Array<{ aturan: string; keparahan: string; ringkasan: string }>;
  };
  catatan: string[];
}

/* ------------------------------------------------------------------ */
/* Kecil-kecil                                                         */
/* ------------------------------------------------------------------ */

const bulat = (x: number): number => Math.round(x * 1e4) / 1e4;
const obyek = (x: unknown): Record<string, unknown> | null => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : null);
const larikTeks = (x: unknown): string[] | null => (Array.isArray(x) && x.every((y) => typeof y === 'string') ? (x as string[]) : null);
const potong = (t: string, n: number): string => (t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`);

function endpointEmiten(simbol: string): SumberGudang['endpoint'] {
  // Bentuk alamat yang sama dengan pembangun paket (`bangunPaket`) dan `dariAgen`.
  return { harga: `/v2/daily/${simbol}/`, laporan: '/v2/filings/', aksi: `/v2/company/corporate-actions/${simbol}/`, suspensi: '/v2/suspensions/' };
}

const asalKosong = (): AsalGudang => ({ harga: new Map(), suspensi: new Map(), aksi: new Map(), ringkasan: new Map(), kepemilikan: new Map() });

/** Id kasus dari emiten dan tanggal simulasi, bentuk yang sama dengan kasus tayang (`amag-2026-06-15`). */
export const idKasus = (paket: Pick<PaketFakta, 'simbol' | 'tanggal_t'>): string => `${paket.simbol.toLowerCase()}-${paket.tanggal_t}`;

/** Kode saham, nama emiten, dan nama orang yang disamarkan di keluaran alat: daftar paket + nama di data gudang penuh. */
export function kataDisamarkan(paket: Pick<PaketFakta, 'kata_terlarang'>, data: DataEmiten): string[] {
  const nama = [...data.laporan.map((l) => l.pemegang), ...data.pemegang.map((p) => p.nama), ...(typeof data.nama_perusahaan === 'string' ? [data.nama_perusahaan] : [])];
  return [...new Set([...paket.kata_terlarang, ...nama.filter((n) => !/^public$/i.test(n))])];
}

/* ------------------------------------------------------------------ */
/* Fakta sesudah tanggal simulasi                                      */
/* ------------------------------------------------------------------ */

export interface HasilSesudah {
  ringkasan: RingkasanSesudah;
  /** fact_id sesudah tanggal simulasi yang lolos verifikasi (yang boleh ditautkan lampiran). */
  lolos: Set<string>;
  /** fact_id sesudah tanggal simulasi yang tidak lolos, dengan alasannya. */
  tidakLolos: Map<string, string>;
}

/**
 * Fakta SESUDAH tanggal simulasi dari data gudang penuh satu emiten, diringkas
 * supaya tidak membanjiri konteks. Murni.
 *
 * - Pustaka fakta = pustaka yang sama dengan kasus (`pustakaGudang`).
 * - Verifikasi = `verifikasiV2` atas data PENUH; temuannya dikaitkan ke fakta
 *   dengan aturan yang sama dengan pembangun paket (`kaitkanTemuanV2`). Hanya
 *   fakta TERVERIFIKASI yang ditampilkan.
 * - Tidak satu pun fakta bertanggal ≤ tanggal simulasi keluar dari sini.
 * - Tiap kalimat dan nilai teks disamarkan (`samarkanNama`).
 */
export function faktaSesudah(
  data: DataEmiten,
  paket: Pick<PaketFakta, 'simbol' | 'tanggal_t' | 'kata_terlarang' | 'disingkirkan' | 'pemeriksaan'>,
  opsi: { kosong?: string[]; asal_kosong?: Readonly<Record<string, string | null>>; peran?: Record<string, string> } = {},
): HasilSesudah {
  const T = paket.tanggal_t;
  const kata = kataDisamarkan(paket, data);
  const samar = (t: string): string => samarkanNama(t, paket.simbol, kata);
  const pustaka = pustakaGudang(data, { endpoint: endpointEmiten(paket.simbol), asal: asalKosong(), ...(opsi.peran === undefined ? {} : { peran: opsi.peran }) }).fakta;
  const hasil = verifikasiV2({ ...konteksEmiten(data, opsi.kosong ?? []), asal_kosong: opsi.asal_kosong ?? {} });
  const { status } = kaitkanTemuanV2(hasil.pemeriksaan.flatMap((p) => p.temuan), data);

  const sesudah = pustaka.filter((f) => f.tersedia_sejak !== null && f.tersedia_sejak > T);
  const lolos = new Set<string>();
  const tidakLolos = new Map<string, string>();
  for (const f of sesudah) {
    const s = status.get(f.fact_id);
    if (f.status === 'TERVERIFIKASI' && (s === undefined || s.status === 'TERVERIFIKASI')) lolos.add(f.fact_id);
    else tidakLolos.set(f.fact_id, samar(`${s?.status ?? f.status}: ${s?.alasan ?? 'tidak terverifikasi'}`));
  }
  const perId = new Map(sesudah.map((f) => [f.fact_id, f]));
  const tampil = (id: string, peran?: string): FaktaSesudah | null => {
    const f = perId.get(id);
    if (f === undefined || !lolos.has(id) || f.tersedia_sejak === null) return null;
    return { fact_id: f.fact_id, kalimat: samar(potong(f.klaim, MAKS_KALIMAT)), nilai: typeof f.nilai === 'string' ? samar(f.nilai) : f.nilai, satuan: f.satuan, tanggal: f.tersedia_sejak, ...(peran === undefined ? {} : { peran: [peran] }) };
  };
  /** Gabungkan menurut fact_id; peran dikumpulkan. */
  const kumpul = (daftar: Array<FaktaSesudah | null>): FaktaSesudah[] => {
    const peta = new Map<string, FaktaSesudah>();
    for (const f of daftar) {
      if (f === null) continue;
      const lama = peta.get(f.fact_id);
      if (lama === undefined) peta.set(f.fact_id, f);
      else if (f.peran !== undefined) lama.peran = [...new Set([...(lama.peran ?? []), ...f.peran])];
    }
    return [...peta.values()];
  };

  // --- harga dan volume -------------------------------------------------
  const hari = data.harga.filter((h) => h.tanggal > T).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const hariLolos = hari.filter((h) => lolos.has(`harga-${h.tanggal}`));
  const butirHarga: Array<FaktaSesudah | null> = [];
  hari.slice(0, MAKS_HARI_PERTAMA).forEach((h, i) => {
    const p = `hari bursa ke-${String(i + 1)} sesudah tanggal simulasi`;
    butirHarga.push(tampil(`harga-${h.tanggal}`, p), tampil(`volume-${h.tanggal}`, p));
  });
  const seri = (nilai: number, apa: string): void => {
    const sama = hariLolos.filter((h) => h.tutup === nilai);
    const p = `${apa} sesudah tanggal simulasi, sejauh data yang ada${sama.length === 1 ? ' (hanya hari ini)' : ` (angka yang sama tercatat di ${String(sama.length)} hari bursa)`}`;
    for (const h of sama.slice(0, MAKS_HARI_SERI)) butirHarga.push(tampil(`harga-${h.tanggal}`, p));
  };
  if (hariLolos.length > 0) {
    seri(Math.max(...hariLolos.map((h) => h.tutup)), 'penutupan tertinggi');
    seri(Math.min(...hariLolos.map((h) => h.tutup)), 'penutupan terendah');
  }
  const volLolos = hari.filter((h) => lolos.has(`volume-${h.tanggal}`));
  const volMaks = volLolos.length === 0 ? null : Math.max(...volLolos.map((h) => h.volume));
  const hariVolMaks = volLolos.filter((h) => h.volume === volMaks);
  if (hariVolMaks.length === 1 && hariVolMaks[0] !== undefined) butirHarga.push(tampil(`volume-${hariVolMaks[0].tanggal}`, 'volume terbesar sesudah tanggal simulasi, sejauh data yang ada (hanya hari ini)'));
  const akhir = hari.at(-1);
  if (akhir !== undefined) {
    const p = 'baris harga terakhir di data';
    butirHarga.push(tampil(`harga-${akhir.tanggal}`, p), tampil(`volume-${akhir.tanggal}`, p));
  }
  const pertama = hari[0];
  const harga: KelompokSesudah = pertama === undefined || akhir === undefined
    ? { ada: false, keterangan: 'Kosong: tidak ada baris harga sesudah tanggal simulasi di data.', fakta: [] }
    : {
        ada: true,
        keterangan: `${String(hari.length)} hari bursa sesudah tanggal simulasi di data, dari ${tanggalId(pertama.tanggal)} sampai ${tanggalId(akhir.tanggal)}. Yang ditampilkan: penutupan dan volume ${String(Math.min(MAKS_HARI_PERTAMA, hari.length))} hari bursa pertama, penutupan tertinggi dan terendah, volume terbesar, dan baris terakhir.${hari.length === hariLolos.length ? '' : ` Harga ${String(hari.length - hariLolos.length)} hari bursa tidak lolos aturan verifikasi dan tidak ikut dihitung.`}`,
        fakta: kumpul(butirHarga).sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.fact_id.localeCompare(b.fact_id)),
      };

  // --- peristiwa non-harga ----------------------------------------------
  const kelompok = (awalan: RegExp, maks: number, kosong: string, satuan: string): KelompokSesudah => {
    const semua = sesudah.filter((f) => awalan.test(f.fact_id) && lolos.has(f.fact_id)).sort((a, b) => (a.tersedia_sejak ?? '').localeCompare(b.tersedia_sejak ?? '') || a.fact_id.localeCompare(b.fact_id));
    // Yang ada di data tetapi tidak lolos verifikasi tidak ditampilkan — dan tidak disebut "kosong".
    const gagal = sesudah.filter((f) => awalan.test(f.fact_id) && tidakLolos.has(f.fact_id)).length;
    const catatanGagal = gagal === 0 ? '' : ` ${String(gagal)} ${satuan} lain ada di data tetapi tidak lolos aturan verifikasi, jadi tidak ditampilkan dan tidak boleh ditautkan.`;
    if (semua.length === 0) return { ada: false, keterangan: gagal === 0 ? kosong : `Tidak ada yang bisa dipakai.${catatanGagal}`, fakta: [] };
    return {
      ada: true,
      keterangan: `${String(semua.length)} ${satuan} sesudah tanggal simulasi di data${semua.length > maks ? `; ${String(maks)} yang paling awal ditampilkan` : ''}.${catatanGagal}`,
      fakta: kumpul(semua.slice(0, maks).map((f) => tampil(f.fact_id))),
    };
  };
  const dividen = kelompok(/^div-\d{4}-\d{2}-\d{2}(-bayar)?$/, MAKS_DIVIDEN * 2, 'Kosong: tidak ada pembagian dividen bertanggal ex sesudah tanggal simulasi di data.', 'fakta dividen (jumlah per lembar dan tanggal bayar)');
  const rapat = kelompok(/^rups-/, MAKS_RAPAT, 'Kosong: tidak ada rapat umum pemegang saham bertanggal sesudah tanggal simulasi di data.', 'rapat umum pemegang saham');
  const laporan = kelompok(
    /^fil-/,
    MAKS_LAPORAN,
    data.laporan.length === 0
      ? 'Kosong: tidak satu pun laporan kepemilikan terbaca untuk perusahaan ini di data, sebelum maupun sesudah tanggal simulasi. Kosongnya data belum tentu berarti tidak ada laporan.'
      : 'Kosong: tidak ada laporan kepemilikan yang terbit sesudah tanggal simulasi di data.',
    'laporan kepemilikan',
  );
  const suspensi = kelompok(/^susp-/, MAKS_SUSPENSI, 'Kosong: tidak ada penghentian sementara perdagangan sesudah tanggal simulasi di data.', 'penghentian sementara perdagangan');

  const ringkasan: RingkasanSesudah = {
    tanggal_simulasi: T,
    data_harga_sampai: akhir?.tanggal ?? null,
    harga,
    dividen,
    rapat,
    laporan_kepemilikan: laporan,
    penghentian_perdagangan: suspensi,
    tidak_lolos_verifikasi: { jumlah: tidakLolos.size, contoh: [...tidakLolos.entries()].slice(0, MAKS_TIDAK_LOLOS).map(([fact_id, alasan]) => ({ fact_id, alasan })) },
    pada_hari_simulasi: {
      aturan_dijalankan: paket.pemeriksaan.aturan_dijalankan,
      aturan_dilewati: paket.pemeriksaan.aturan_dilewati,
      calon_kartu_disingkirkan: paket.disingkirkan.map((d) => ({ fact_id: d.fact_id, alasan: samar(d.alasan) })),
      temuan_pemeriksaan: paket.pemeriksaan.temuan.slice(0, MAKS_TEMUAN).map((t) => ({ aturan: t.aturan, keparahan: t.keparahan, ringkasan: samar(potong(t.ringkasan, MAKS_KALIMAT)) })),
    },
    catatan: [
      'Semua fakta di sini bertanggal sesudah tanggal simulasi dan lolos aturan verifikasi. Hanya layar pembukaan yang boleh menautkannya; kartu tidak.',
      '"Tertinggi", "terendah", "terbesar", dan "terakhir" dihitung program atas data yang ada, bukan atas seluruh sejarah harga.',
      'Jenis data yang bertanda kosong memang kosong di data; jangan diisi cerita.',
    ],
  };
  return { ringkasan, lolos, tidakLolos };
}

/* ------------------------------------------------------------------ */
/* Siapan: semua pemeriksaan gratis sebelum mode boleh jalan            */
/* ------------------------------------------------------------------ */

export interface OpsiSiapan {
  /** Jalur `paket.json` (absolut, atau relatif terhadap proses). */
  jalurPaket: string;
  /** Yang ditulis ke `lampiran.sumber.paket` (jalur relatif terhadap akar repo). */
  sumberPaket: string;
  /** Folder bank omongan (absolut). */
  folderBank: string;
  /** Yang ditulis ke `lampiran.sumber.bank` (jalur relatif terhadap akar repo). */
  sumberBank: string;
  /** Folder gudang (`.cache/sectors`). */
  folderGudang: string;
  /** Tiga id omongan yang dipakai; bawaan = tiga omongan simulasi dasar (`rakitSimulasi`). */
  omongan?: readonly string[] | null;
  /** Manifest gudang (asal respons kosong); bawaan `docs/bukti/gudang-manifest.json`. */
  berkasManifest?: string;
  /** Daftar aturan beku; bawaan `docs/bukti/aturan-beku-kasus.json`. */
  aturanBeku?: AturanBeku;
}

export interface SiapanLengkapi {
  paket: PaketFakta;
  kasus_id: string;
  /** Tiga omongan terkunci, urutan simulasi dasar. */
  omongan: EntriOmongan[];
  /** Id omongan simulasi dasar yang digantikan tiap omongan (sama dengan id-nya bila versi asal). */
  asal: Record<string, string>;
  sumber: LampiranPenyetuju['sumber'];
  emiten: LampiranPenyetuju['emiten'];
  /** Catatan untuk penyetuju (mis. sektor yang belum punya sebutan Indonesia). */
  catatan_penyetuju: string[];
  data: DataEmiten;
  asal_gudang: AsalGudang;
  kosong: string[];
  asal_kosong: Record<string, string | null>;
  beku: AturanBeku['kasus'][string] | undefined;
  sesudah: HasilSesudah;
  /** Kalimat tiap fakta yang bisa ditautkan (paket lebih dulu, lalu pustaka gudang penuh). */
  klaim: Map<string, string>;
  kata_disamarkan: string[];
}

/** Berkas gudang milik satu emiten: yang menyumbang barisnya, ditambah respons kosong yang menurut manifest memang untuk emiten itu. */
export function berkasGudangEmiten(folderGudang: string, simbol: string, berkasManifest?: string): BerkasBeku[] {
  const penuh = muatGudang(folderGudang);
  const data = penuh.emiten.get(simbol);
  if (data === undefined) throw new LengkapiDitolak(`Emiten paket ini tidak ada di gudang ${folderGudang}; lampiran tidak bisa dilengkapi.`);
  const kosong = penuh.berkas.filter((b) => b.jenis === 'paginasi-kosong').map((b) => b.berkas);
  const asal = berkasManifest === undefined ? asalKosongDariManifest(kosong) : asalKosongDariManifest(kosong, berkasManifest);
  const milik = new RegExp(`(/|=)${simbol}(\\.JK)?(/|&|\\?|$)`, 'i');
  const nama = [...new Set([...data.berkas, ...kosong.filter((b) => milik.test(asal[b] ?? ''))])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return nama.map((n) => ({ nama: n, sha256: sha256(readFileSync(`${folderGudang}/${n}`)) }));
}

/** Papan dan sektor dari ringkasan emiten di gudang (pemuat tidak membawa kedua medan itu). */
export function papanSektor(folderGudang: string, berkasRingkasan: string | undefined): { emiten: LampiranPenyetuju['emiten']; catatan: string[] } {
  if (berkasRingkasan === undefined) throw new LengkapiDitolak('Ringkasan emiten tidak ada di gudang; papan dan sektor tidak bisa dilengkapi.');
  const o = obyek(obyek(JSON.parse(readFileSync(`${folderGudang}/${berkasRingkasan}`, 'utf8')) as unknown)?.['overview']);
  const papanMentah = typeof o?.['listing_board'] === 'string' ? o['listing_board'] : null;
  const sektorMentah = typeof o?.['sub_sector'] === 'string' ? o['sub_sector'] : null;
  if (papanMentah === null || sektorMentah === null) throw new LengkapiDitolak(`Ringkasan emiten (${berkasRingkasan}) tidak memuat listing_board atau sub_sector; papan dan sektor tidak bisa dilengkapi.`);
  const catatan: string[] = [];
  const papan = PAPAN[papanMentah];
  const sektor = SEKTOR[sektorMentah];
  if (papan === undefined) catatan.push(`Papan "${papanMentah}" belum punya sebutan Indonesia di PAPAN (factory/llm/agen/lengkapi.ts); dipakai apa adanya.`);
  if (sektor === undefined) catatan.push(`Sub-sektor "${sektorMentah}" belum punya sebutan Indonesia di SEKTOR (factory/llm/agen/lengkapi.ts); dipakai apa adanya.`);
  return { emiten: { papan: papan ?? papanMentah, sektor: sektor ?? sektorMentah }, catatan };
}

/**
 * Semua pemeriksaan GRATIS sebelum mode lengkapi boleh jalan. Melempar
 * `LengkapiDitolak` bila ada yang tidak terpenuhi; urutannya menaruh kuncian
 * paling depan: simulasi yang belum terakit ditolak sebelum gudang dibaca.
 */
export function siapkanLengkapi(o: OpsiSiapan): SiapanLengkapi {
  const mentahPaket = readFileSync(o.jalurPaket);
  const paket = JSON.parse(mentahPaket.toString('utf8')) as PaketFakta;
  const sidik = sha256(mentahPaket);
  if (sidik !== shaPaketBank(paket)) {
    throw new LengkapiDitolak(`Sidik berkas paket (${sidik.slice(0, 12)}…) tidak sama dengan sidik paket di bank (${shaPaketBank(paket).slice(0, 12)}…); berkas paket bukan yang ditulis pelari.`);
  }

  // --- kuncian: simulasi untuk paket ini harus sudah terakit ---------------
  const bank = bacaBank(o.folderBank, sidik);
  const dasar = rakitSimulasi(bank.filter((e) => peningkatanDari(e) === null), paket);
  if (dasar.draf === null) {
    throw new LengkapiDitolak('--lengkapi: bank untuk paket ini belum bisa dirakit menjadi simulasi, jadi data sesudah hari simulasi tetap terkunci. Tidak ada panggilan berbayar yang dikirim.', dasar.alasan.slice(0, 5));
  }

  // --- tiga omongan yang dipakai -------------------------------------------
  const perId = new Map(bank.map((e) => [e.id, e]));
  const diminta = o.omongan === undefined || o.omongan === null ? dasar.dipilih : [...o.omongan];
  const butir: string[] = [];
  if (diminta.length !== dasar.dipilih.length || new Set(diminta).size !== diminta.length) butir.push(`--omongan harus menyebut tepat ${String(dasar.dipilih.length)} id berbeda; diterima ${String(diminta.length)}.`);
  const asal: Record<string, string> = {};
  const terpilih: EntriBank[] = [];
  for (const id of diminta) {
    const e = perId.get(id);
    if (e === undefined) {
      butir.push(`omongan "${id}" tidak ada di bank paket ini.`);
      continue;
    }
    const induk = peningkatanDari(e) ?? e.id;
    if (!dasar.dipilih.includes(induk)) {
      butir.push(`omongan "${id}" bukan omongan simulasi dasar (${dasar.dipilih.join(', ')}) dan bukan versi lebih sulit dari salah satunya.`);
      continue;
    }
    if (Object.values(asal).includes(induk)) butir.push(`omongan "${id}" memakai tempat yang sama dengan omongan lain (keduanya versi dari ${induk}).`);
    asal[id] = induk;
    terpilih.push(e);
    const hitung = idOmonganAgen(e.omongan as unknown as OmonganAgen);
    if (hitung !== e.id) butir.push(`isi omongan ${id} sudah berubah sejak disimpan bank (sidik isinya ${hitung}); teks soal terkunci.`);
    if (e.paket_sha !== sidik) butir.push(`omongan ${id} lahir dari paket lain.`);
  }
  if (butir.length > 0) throw new LengkapiDitolak('--lengkapi: omongan yang diminta tidak bisa dipakai. Tidak ada panggilan berbayar yang dikirim.', butir);
  // Urutan simulasi dasar; urutan MAIN ditentukan agent di lampirannya.
  terpilih.sort((a, b) => dasar.dipilih.indexOf(asal[a.id] ?? '') - dasar.dipilih.indexOf(asal[b.id] ?? ''));
  const omongan: EntriOmongan[] = terpilih.map((e) => ({ id: e.id, paket_sha: e.paket_sha, omongan: e.omongan as unknown as OmonganAgen }));

  // --- gudang: hanya berkas emiten ini, dengan sidiknya --------------------
  if (!existsSync(o.folderGudang)) throw new LengkapiDitolak(`Folder gudang ${o.folderGudang} tidak ada; data emiten tidak bisa dibaca.`);
  const izin = berkasGudangEmiten(o.folderGudang, paket.simbol, o.berkasManifest);
  const gudang = muatGudang(o.folderGudang, { izin });
  const data = gudang.emiten.get(paket.simbol);
  if (data === undefined) throw new LengkapiDitolak('Emiten paket ini tidak terbaca dari berkas gudangnya sendiri.');
  const kosong = gudang.berkas.filter((b) => b.jenis === 'paginasi-kosong').map((b) => b.berkas);
  const asal_kosong = o.berkasManifest === undefined ? asalKosongDariManifest(kosong) : asalKosongDariManifest(kosong, o.berkasManifest);
  const { emiten, catatan } = papanSektor(o.folderGudang, gudang.asal.ringkasan.get(paket.simbol));
  const sumber: LampiranPenyetuju['sumber'] = { paket: o.sumberPaket, paket_sha256: sidik, bank: o.sumberBank, gudang: izin };
  const kasus_id = idKasus(paket);

  // --- hasil agent harus bisa diubah menjadi kasus (pemeriksaan data `dariAgen`, tanpa tulisan apa pun) ---
  const kartu = [...new Set(omongan.flatMap((e) => e.omongan.kartu))];
  const rangka: LampiranPenyetuju = {
    kasus_id, sumber, judul: 'x', emiten,
    soal: omongan.map((e, i) => ({ id_omongan: e.id, soal_id: `soal-${String(i + 1)}`, tanya: 'x', istilah: [] })),
    awam: Object.fromEntries(kartu.map((id) => [id, { kepala: 'x', isi: 'x' }])),
    pembukaan: { fact_ids: [], paragraf: [], bisa_dibaca: [], tidak_bisa_dibaca: [], disingkirkan: [] },
    penutup: { kepala: 'x', isi: 'x' },
    kartu_konsep: [],
  };
  try {
    dariAgen({ paket, omongan, lampiran: rangka, data });
  } catch (g) {
    if (g instanceof HasilAgenTidakSah) throw new LengkapiDitolak('--lengkapi: omongan terkunci dan data gudang tidak bisa diubah menjadi kasus, apa pun isi lampirannya. Tidak ada panggilan berbayar yang dikirim.', g.butir);
    throw g;
  }

  // --- kalimat tiap fakta yang bisa ditautkan ------------------------------
  const def = pilihDefinisi(paket.simbol, paket.tanggal_t, data).def;
  const pustaka: Fakta[] = [...pustakaGudang(data, { endpoint: endpointEmiten(paket.simbol), asal: asalKosong(), peran: def.peran }).fakta];
  for (const f of def.turunan(pustaka, data, () => 'TERVERIFIKASI')) pustaka.push(f);
  const klaim = new Map(pustaka.map((f) => [f.fact_id, f.klaim]));
  for (const f of paket.fakta) klaim.set(f.fact_id, f.klaim);

  return {
    paket, kasus_id, omongan, asal, sumber, emiten, catatan_penyetuju: catatan, data, asal_gudang: gudang.asal, kosong, asal_kosong,
    beku: (o.aturanBeku ?? bacaAturanBeku()).kasus[kasus_id],
    sesudah: faktaSesudah(data, paket, { kosong, asal_kosong, peran: def.peran }),
    klaim,
    kata_disamarkan: kataDisamarkan(paket, data),
  };
}

/* ------------------------------------------------------------------ */
/* Draft lampiran: hanya bagian yang ditulis agent                      */
/* ------------------------------------------------------------------ */

const MEDAN_DRAF = ['judul', 'soal', 'awam', 'pembukaan', 'penutup', 'kartu_konsep'] as const;
const MEDAN_SOAL = ['id_omongan', 'soal_id', 'tanya', 'istilah'] as const;
const MEDAN_KODE = ['kasus_id', 'sumber', 'emiten'];
const MEDAN_TEKS_SOAL = ['nama', 'jam', 'pesan', 'pilihan', 'kunci', 'jawaban', 'penjelasan', 'kartu', 'kartu_penentu', 'angka_pesan', 'pengecoh', 'pertanyaan_cek', 'fact_ids', 'petunjuk'];
const POLA_SOAL_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BAGIAN_PEMBUKAAN = ['paragraf', 'bisa_dibaca', 'tidak_bisa_dibaca', 'disingkirkan'] as const;

/**
 * Urai draft lampiran dari agent. Ketat: medan di luar bagian yang ditulis
 * agent ditolak — termasuk teks soal (terkunci) dan bagian yang dilengkapi
 * kode. Murni; tidak pernah melempar.
 */
export function uraiDrafLampiran(x: unknown): { draf: DrafLampiran | null; masalah: string[] } {
  const masalah: string[] = [];
  const akar = obyek(x);
  if (akar === null) return { draf: null, masalah: ['lampiran bukan objek JSON.'] };
  for (const k of Object.keys(akar)) {
    if ((MEDAN_DRAF as readonly string[]).includes(k)) continue;
    if (MEDAN_KODE.includes(k)) masalah.push(`medan "${k}" dilengkapi program, bukan ditulis di lampiran; hapus dari draft.`);
    else if (MEDAN_TEKS_SOAL.includes(k)) masalah.push(`medan "${k}" adalah teks soal yang sudah terkunci; lampiran tidak boleh memuatnya.`);
    else masalah.push(`medan "${k}" tidak dikenal; lampiran hanya memuat ${MEDAN_DRAF.join(', ')}.`);
  }
  for (const k of MEDAN_DRAF) if (!(k in akar)) masalah.push(`medan "${k}" tidak ada.`);

  const judul = typeof akar['judul'] === 'string' ? akar['judul'] : '';
  if ('judul' in akar && judul.trim() === '') masalah.push('judul harus teks yang tidak kosong.');

  const soal: LampiranSoal[] = [];
  if ('soal' in akar && !Array.isArray(akar['soal'])) masalah.push('soal harus larik.');
  for (const [i, s] of (Array.isArray(akar['soal']) ? (akar['soal'] as unknown[]) : []).entries()) {
    const di = `soal ke-${String(i + 1)}`;
    const b = obyek(s);
    if (b === null) {
      masalah.push(`${di} bukan objek.`);
      continue;
    }
    for (const k of Object.keys(b)) {
      if ((MEDAN_SOAL as readonly string[]).includes(k)) continue;
      if (MEDAN_TEKS_SOAL.includes(k)) masalah.push(`${di}: medan "${k}" adalah teks soal yang sudah terkunci; lampiran soal hanya memuat ${MEDAN_SOAL.join(', ')}.`);
      else masalah.push(`${di}: medan "${k}" tidak dikenal; lampiran soal hanya memuat ${MEDAN_SOAL.join(', ')}.`);
    }
    const id_omongan = typeof b['id_omongan'] === 'string' ? b['id_omongan'] : '';
    const soal_id = typeof b['soal_id'] === 'string' ? b['soal_id'] : '';
    const tanya = typeof b['tanya'] === 'string' ? b['tanya'] : '';
    if (id_omongan === '') masalah.push(`${di}: id_omongan harus id dari lihat_soal_terkunci.`);
    if (!POLA_SOAL_ID.test(soal_id) || soal_id.length < 3 || soal_id.length > 40) masalah.push(`${di}: soal_id "${soal_id}" harus 3–40 karakter huruf kecil, angka, dan tanda hubung.`);
    if (typeof b['tanya'] !== 'string') masalah.push(`${di}: tanya harus teks.`);
    const istilah: Istilah[] = [];
    if (!Array.isArray(b['istilah'])) masalah.push(`${di}: istilah harus larik (boleh kosong).`);
    for (const [j, t] of (Array.isArray(b['istilah']) ? (b['istilah'] as unknown[]) : []).entries()) {
      const u = obyek(t);
      if (u === null || typeof u['kata'] !== 'string' || typeof u['arti'] !== 'string') masalah.push(`${di}: istilah ke-${String(j + 1)} harus berbentuk {"kata": "...", "arti": "..."}.`);
      else istilah.push({ kata: u['kata'], arti: u['arti'] });
    }
    soal.push({ id_omongan, soal_id, tanya, istilah });
  }

  const awam: Record<string, TeksAwam> = {};
  const a = obyek(akar['awam']);
  if ('awam' in akar && a === null) masalah.push('awam harus objek: fact_id kartu → {"kepala": "...", "isi": "..."}.');
  for (const [id, t] of Object.entries(a ?? {})) {
    const u = obyek(t);
    if (u === null || typeof u['kepala'] !== 'string' || typeof u['isi'] !== 'string') masalah.push(`awam "${id}" harus berbentuk {"kepala": "...", "isi": "..."}.`);
    else {
      for (const k of Object.keys(u)) if (k !== 'kepala' && k !== 'isi') masalah.push(`awam "${id}": medan "${k}" tidak dikenal.`);
      awam[id] = { kepala: u['kepala'], isi: u['isi'] };
    }
  }

  const p = obyek(akar['pembukaan']);
  if ('pembukaan' in akar && p === null) masalah.push('pembukaan harus objek.');
  const pembukaan: Pembukaan = { fact_ids: [], paragraf: [], bisa_dibaca: [], tidak_bisa_dibaca: [], disingkirkan: [] };
  if (p !== null) {
    for (const k of Object.keys(p)) if (k !== 'fact_ids' && !(BAGIAN_PEMBUKAAN as readonly string[]).includes(k)) masalah.push(`pembukaan: medan "${k}" tidak dikenal.`);
    for (const k of ['fact_ids', ...BAGIAN_PEMBUKAAN] as const) {
      const v = larikTeks(p[k]);
      if (v === null) masalah.push(`pembukaan.${k} harus larik teks.`);
      else pembukaan[k] = v;
    }
  }

  const n = obyek(akar['penutup']);
  if ('penutup' in akar && (n === null || typeof n['kepala'] !== 'string' || typeof n['isi'] !== 'string')) masalah.push('penutup harus berbentuk {"kepala": "...", "isi": "..."}.');
  const penutup: Penutup = { kepala: typeof n?.['kepala'] === 'string' ? n['kepala'] : '', isi: typeof n?.['isi'] === 'string' ? n['isi'] : '' };

  const kartu_konsep: KartuKonsep[] = [];
  if ('kartu_konsep' in akar && !Array.isArray(akar['kartu_konsep'])) masalah.push('kartu_konsep harus larik kode kartu konsep.');
  for (const k of Array.isArray(akar['kartu_konsep']) ? (akar['kartu_konsep'] as unknown[]) : []) {
    const kode = typeof k === 'string' ? k : typeof obyek(k)?.['kode'] === 'string' ? (obyek(k)?.['kode'] as string) : null;
    const ada = KARTU_KONSEP_ADA.find((c) => c.kode === kode);
    if (ada === undefined) masalah.push(`kartu_konsep ${JSON.stringify(k)} bukan kode dari daftar yang ada (${KARTU_KONSEP_ADA.map((c) => c.kode).join(', ')}).`);
    else if (kartu_konsep.some((c) => c.kode === ada.kode)) masalah.push(`kartu_konsep "${ada.kode}" ditulis dua kali.`);
    else kartu_konsep.push({ ...ada });
  }

  // Validator kasus menuntut minimal satu butir di tiga bagian lain; garis waktu sesudahnya dituntut di sini.
  if (p !== null && Array.isArray(p['paragraf']) && pembukaan.paragraf.length === 0) masalah.push('pembukaan.paragraf kosong; tulis minimal satu butir tentang apa yang terjadi (atau tidak tercatat) sesudah tanggal simulasi.');

  // Medan yang dirender polos: tautan di sana akan terbaca pemain apa adanya (penutup dijaga validator kasus).
  const polos: Array<[string, string]> = [
    ['judul', judul],
    ...soal.flatMap((s, i): Array<[string, string]> => [[`soal ke-${String(i + 1)} (tanya)`, s.tanya], ...s.istilah.map((t): [string, string] => [`soal ke-${String(i + 1)} (istilah ${t.kata})`, `${t.kata} ${t.arti}`])]),
    ...Object.entries(awam).map(([id, t]): [string, string] => [`kepala kartu "${id}"`, t.kepala]),
  ];
  for (const [tempat, teks] of polos) if (teks.includes('[[')) masalah.push(`${tempat} memuat tautan [[…]]; bagian ini tampil sebagai teks biasa, jadi tautan tidak boleh ada di sana.`);

  if (masalah.length > 0) return { draf: null, masalah };
  return { draf: { judul, soal, awam, pembukaan, penutup, kartu_konsep }, masalah: [] };
}

/** Seluruh teks berujukan yang ditulis agent, dengan nama tempatnya. */
function teksBerujukanDraf(d: DrafLampiran): Array<[string, string]> {
  return [
    ...Object.entries(d.awam).map(([id, t]): [string, string] => [`kartu "${id}"`, t.isi]),
    ...BAGIAN_PEMBUKAAN.flatMap((k) => d.pembukaan[k].map((t, i): [string, string] => [`pembukaan (${k} ke-${String(i + 1)})`, t])),
  ];
}

const POLA_ANGKA = /\d[\d.,]*\d|\d/g;

/**
 * Tiap angka di label `[[fact_id|teks]]` tulisan agent harus sungguh tertulis
 * di kalimat fakta yang ditautkannya (pemeriksaan yang sama dengan
 * `amag.test.ts` atas lampiran penyetuju). Validator kasus tidak memeriksanya:
 * ia hanya memastikan fact_id-nya ada. Murni.
 */
export function angkaLabelMeleset(d: DrafLampiran, klaim: ReadonlyMap<string, string>, samar: (t: string) => string = (t) => t): string[] {
  const meleset: string[] = [];
  for (const [tempat, teks] of teksBerujukanDraf(d)) {
    for (const r of ambilRujukan(teks)) {
      if (PENANDA_BUKAN_FAKTA.includes(r.fact_id)) continue;
      const kalimat = klaim.get(r.fact_id);
      if (kalimat === undefined) continue; // fact_id yang tidak ada dilaporkan pembangun kasus
      for (const angka of r.teks.match(POLA_ANGKA) ?? []) {
        if (new RegExp(`(?<![\\d.,])${angka.replace(/[.]/g, '\\.')}(?![\\d])`).test(kalimat)) continue;
        meleset.push(`${tempat}: label "${r.teks}" menautkan "${r.fact_id}", tetapi angka "${angka}" tidak tertulis di kalimat fakta itu ("${samar(potong(kalimat, 260))}").`);
      }
    }
  }
  return meleset;
}

/* ------------------------------------------------------------------ */
/* Alat                                                                */
/* ------------------------------------------------------------------ */

export interface MasalahLampiran {
  /** Siapa yang menolak: bentuk draft, kuncian, pengubah (`dariAgen`), pembangun, validator kasus, atau pembanding kesetiaan. */
  sumber: 'bentuk' | 'kuncian' | 'label' | 'pengubah' | 'pembangun' | 'validator' | 'setia';
  /** Kode masalah validator kasus, bila ada. */
  kode?: string;
  pesan: string;
}

export interface HasilPeriksaKasus {
  lolos: boolean;
  masalah: MasalahLampiran[];
  /** Nomor lampiran bila lolos: pakai di `ajukan_kasus`. */
  id_lampiran?: string;
}

export interface HasilAjukanKasus {
  lolos: boolean;
  /** 'lolos' | 'critic' | 'tak-terukur' | 'anggaran' | 'bentuk' | 'sudah-diajukan' | 'sudah-terbit' | 'galat-critic'. */
  berhenti: string;
  keberatan: string[];
  arahan: string;
  catatan: string[];
  biaya_pengajuan_usd: number;
  sisa_anggaran_usd: number;
  /** Berkas yang ditulis bila lolos. */
  berkas?: string[];
}

export interface PeristiwaLengkapi {
  alat: 'lihat_soal_terkunci' | 'lihat_sesudahnya' | 'periksa_kasus_dengan_aturan' | 'ajukan_kasus';
  ke: number;
  ringkas: string;
  hasil: unknown;
}

export interface OpsiAlatLengkapi {
  /** Folder percobaan (`eval/penyusun/<id>`): satu-satunya tempat berkas ditulis. */
  folderKeluaran: string;
  /** Pemanggil berbayar (berpagu, penyedia terkunci, mentah tersimpan). */
  panggil: PanggilTemplat;
  /** Pagu seluruh percobaan ini (agent + critic), USD. */
  paguUsd: number;
  /** Biaya panggilan model AGENT sejauh ini (USD); biaya critic dihitung di sini. */
  biayaAgen: () => number;
  catat?: (p: PeristiwaLengkapi) => void;
  /** Disuntik tes. */
  kritik?: typeof kritikKasus;
}

interface LampiranLolos {
  lampiran: LampiranPenyetuju;
  kasus: Kasus;
}

/**
 * Alat mode lengkapi. Hanya bisa dibuat dari `SiapanLengkapi` — artinya hanya
 * sesudah `siapkanLengkapi` memastikan simulasinya sudah terakit.
 */
export function buatAlatLengkapi(s: SiapanLengkapi, o: OpsiAlatLengkapi) {
  const kritik = o.kritik ?? kritikKasus;
  const samar = (t: string): string => samarkanNama(t, s.paket.simbol, s.kata_disamarkan);
  const lolosAturan = new Map<string, LampiranLolos>();
  const diajukan = new Map<string, HasilAjukanKasus>();
  let biayaKritik = 0;
  let ke = 0;
  let pengajuan = 0;
  let ditolak = 0;
  let terbit: { id_lampiran: string; berkas: string[] } | null = null;
  let rusak: string | null = null;
  let antre: Promise<unknown> = Promise.resolve();
  const putusan: Array<{ id_lampiran: string; putusan: PutusanKritikKasus }> = [];

  const sisa = (): number => bulat(Math.max(0, o.paguUsd - o.biayaAgen() - biayaKritik));
  const lapor = <T>(alat: PeristiwaLengkapi['alat'], ringkas: string, hasil: T): T => {
    ke += 1;
    o.catat?.({ alat, ke, ringkas, hasil });
    return hasil;
  };

  const lihatSoalTerkunci = () =>
    lapor('lihat_soal_terkunci', `${String(s.omongan.length)} omongan terkunci`, {
      tanggal_simulasi: s.paket.tanggal_t,
      nama_samaran: s.paket.nama_samaran,
      omongan: s.omongan.map((e) => ({
        id_omongan: e.id,
        versi: s.asal[e.id] === e.id ? 'asal' : 'lebih sulit',
        nama: e.omongan.nama,
        jam: e.omongan.jam,
        pesan: e.omongan.pesan,
        pilihan: e.omongan.pilihan,
        kunci: e.omongan.kunci,
        penjelasan: e.omongan.penjelasan,
        kartu: [...e.omongan.kartu],
        kartu_penentu: [...e.omongan.kartu_penentu],
      })),
      kartu_yang_butuh_teks: [...new Set(s.omongan.flatMap((e) => e.omongan.kartu))],
      catatan: 'Teks soal terkunci: lampiran hanya menyebut id_omongan. Urutan soal di lampiran = urutan main.',
    });

  const lihatSesudahnya = (): RingkasanSesudah => lapor('lihat_sesudahnya', `${String(s.sesudah.lolos.size)} fakta sesudah ${s.paket.tanggal_t} lolos verifikasi; ${String(s.sesudah.tidakLolos.size)} tidak lolos`, s.sesudah.ringkasan);

  /** Bangun kasus dari draft; `null` + masalah bila ada yang menolak. Gratis. */
  const bangun = (x: unknown): { masalah: MasalahLampiran[]; jadi: (LampiranLolos & { id: string }) | null } => {
    const u = uraiDrafLampiran(x);
    if (u.draf === null) return { masalah: u.masalah.map((pesan) => ({ sumber: 'bentuk', pesan })), jadi: null };
    const d = u.draf;
    const masalah: MasalahLampiran[] = [];

    // Kuncian: fakta sesudah tanggal simulasi yang tidak lolos verifikasi tidak boleh ditautkan.
    const disebut = new Map<string, string>(d.pembukaan.fact_ids.map((id) => [id, 'pembukaan.fact_ids']));
    for (const [tempat, teks] of teksBerujukanDraf(d)) for (const r of ambilRujukan(teks)) if (!disebut.has(r.fact_id)) disebut.set(r.fact_id, tempat);
    for (const [id, tempat] of disebut) {
      const alasan = s.sesudah.tidakLolos.get(id);
      if (alasan !== undefined) masalah.push({ sumber: 'kuncian', pesan: `${tempat} menautkan "${id}", fakta sesudah tanggal simulasi yang tidak lolos aturan verifikasi (${alasan}).` });
    }
    for (const pesan of angkaLabelMeleset(d, s.klaim, samar)) masalah.push({ sumber: 'label', pesan });

    const lampiran: LampiranPenyetuju = { kasus_id: s.kasus_id, sumber: s.sumber, judul: d.judul, emiten: s.emiten, soal: d.soal, awam: d.awam, pembukaan: d.pembukaan, penutup: d.penutup, kartu_konsep: d.kartu_konsep };
    let kasus: Kasus | null = null;
    try {
      const def = dariAgen({ paket: s.paket, omongan: s.omongan, lampiran, data: s.data });
      const data = s.beku === undefined ? s.data : { ...s.data, aturan_beku: [...s.beku.aturan] };
      kasus = bangunKasusUmum(def, data, s.asal_gudang, s.kosong, s.asal_kosong).kasus;
      for (const pesan of periksaSetia(kasus, s.paket, s.omongan)) masalah.push({ sumber: 'setia', pesan });
      if (s.beku !== undefined) periksaJejakBeku(s.kasus_id, kasus.pemeriksaan.map((p) => p.aturan), s.beku.aturan);
    } catch (g) {
      if (g instanceof HasilAgenTidakSah) for (const pesan of g.butir) masalah.push({ sumber: 'pengubah', pesan });
      else if (g instanceof KasusTidakSah) for (const m of g.masalah) masalah.push({ sumber: 'validator', kode: m.kode, pesan: m.pesan });
      else masalah.push({ sumber: 'pembangun', pesan: g instanceof Error ? g.message : String(g) });
    }
    if (masalah.length > 0 || kasus === null) return { masalah, jadi: null };
    const id = createHash('sha256').update(jsonKanonik(d), 'utf8').digest('hex').slice(0, 16);
    return { masalah: [], jadi: { id, lampiran, kasus } };
  };

  const periksaKasus = (x: unknown): HasilPeriksaKasus => {
    const b = bangun(x);
    if (b.jadi === null) return lapor('periksa_kasus_dengan_aturan', `${String(b.masalah.length)} masalah`, { lolos: false, masalah: b.masalah });
    lolosAturan.set(b.jadi.id, { lampiran: b.jadi.lampiran, kasus: b.jadi.kasus });
    return lapor('periksa_kasus_dengan_aturan', `lolos (lampiran ${b.jadi.id})`, { lolos: true, masalah: [], id_lampiran: b.jadi.id });
  };

  const ajukanSatu = async (id: string): Promise<HasilAjukanKasus> => {
    const dasar = (berhenti: string, isi: Partial<Pick<HasilAjukanKasus, 'keberatan' | 'arahan' | 'catatan' | 'berkas'>> = {}, biaya = 0): HasilAjukanKasus => ({
      lolos: berhenti === 'lolos', berhenti, keberatan: isi.keberatan ?? [], arahan: isi.arahan ?? '', catatan: isi.catatan ?? [], biaya_pengajuan_usd: bulat(biaya), sisa_anggaran_usd: sisa(), ...(isi.berkas === undefined ? {} : { berkas: isi.berkas }),
    });
    if (terbit !== null) return lapor('ajukan_kasus', 'kasus sudah terbit (gratis)', dasar('sudah-terbit', { catatan: [`Kasus sudah terbit dari lampiran ${terbit.id_lampiran}. Berhenti.`], berkas: terbit.berkas }));
    const l = lolosAturan.get(id);
    if (l === undefined) return lapor('ajukan_kasus', 'nomor lampiran tak dikenal (gratis)', dasar('bentuk', { catatan: [`Nomor lampiran "${id}" tidak dikenal. Pakai id_lampiran dari periksa_kasus_dengan_aturan yang lolos.`] }));
    const lama = diajukan.get(id);
    if (lama !== undefined) return lapor('ajukan_kasus', 'lampiran sama sudah diajukan (gratis)', dasar('sudah-diajukan', { keberatan: lama.keberatan, arahan: lama.arahan, catatan: ['Lampiran yang persis sama sudah pernah diajukan; hasilnya tidak berubah. Ubah lampirannya dulu.'] }));
    if (sisa() < CADANGAN_KRITIK_KASUS_USD) return lapor('ajukan_kasus', 'anggaran tidak cukup (gratis)', dasar('anggaran', { catatan: [`Sisa anggaran US$${String(sisa())} di bawah cadangan satu pengajuan (US$${String(CADANGAN_KRITIK_KASUS_USD)}). Berhenti.`] }));
    pengajuan += 1;
    let p: PutusanKritikKasus;
    try {
      p = await kritik({ kasus: l.kasus, paket: s.paket, sesudah: s.sesudah.ringkasan, samar }, o.panggil, pengajuan);
    } catch (g) {
      // Penyedia hilang adalah turunan `PaguTercapai` (supaya menembus penangkap gerbang); ia bukan soal anggaran.
      if (g instanceof PaguTercapai && !(g instanceof PenyediaTidakTersedia)) return lapor('ajukan_kasus', 'terpotong pagu', dasar('anggaran', { catatan: ['Pagu tercapai sebelum critic dijalankan. Berhenti.'] }));
      rusak = g instanceof Error ? `${g.name}: ${g.message}`.slice(0, 400) : 'galat tak dikenal';
      return lapor('ajukan_kasus', 'CRITIC RUSAK — percobaan dihentikan', dasar('galat-critic', { catatan: ['Critic tidak bisa dijalankan (gangguan teknis, bukan penolakan). Lampiran ini tetap tersimpan. Berhenti; jangan menulis lampiran lain.'] }));
    }
    biayaKritik += p.biaya_usd;
    putusan.push({ id_lampiran: id, putusan: p });
    if (!p.menjawab) return lapor('ajukan_kasus', 'critic tidak menjawab', dasar('tak-terukur', { catatan: ['Critic tidak memberi jawaban yang terbaca (bukan penolakan). Lampiran yang sama boleh diajukan lagi.', ...p.catatan] }, p.biaya_usd));
    if (p.keberatan.length > 0) {
      ditolak += 1;
      const h = dasar('critic', { keberatan: p.keberatan.map((k) => `[${k.bagian}] ${k.alasan}`), arahan: p.arahan }, p.biaya_usd);
      diajukan.set(id, h);
      return lapor('ajukan_kasus', `critic keberatan (${String(p.keberatan.length)})`, h);
    }
    // Lolos: dua berkas, hanya di folder percobaan. Pemasangan ke produk (`cases/`) pekerjaan penyetuju.
    mkdirSync(o.folderKeluaran, { recursive: true });
    const berkas = [`${o.folderKeluaran}/lampiran-agen.json`, `${o.folderKeluaran}/kasus.json`];
    writeFileSync(berkas[0] as string, keJson(l.lampiran), 'utf8');
    writeFileSync(berkas[1] as string, keJson(l.kasus), 'utf8');
    terbit = { id_lampiran: id, berkas };
    const h = dasar('lolos', { berkas, catatan: ['Kasus terbit. Berhenti.'] }, p.biaya_usd);
    diajukan.set(id, h);
    return lapor('ajukan_kasus', 'lolos → lampiran-agen.json + kasus.json ditulis', h);
  };

  /** Satu pengajuan pada satu waktu (hitungan anggaran tetap benar walau model memanggil beberapa alat sekaligus). */
  const ajukanKasus = (id: string): Promise<HasilAjukanKasus> => {
    const p = antre.then(() => ajukanSatu(id));
    antre = p.catch(() => undefined);
    return p;
  };

  return {
    lihatSoalTerkunci, lihatSesudahnya, periksaKasus, ajukanKasus,
    /** Ada lampiran lolos-aturan yang belum pernah dikirim ke critic (dipakai mode hemat pelari). */
    adaLampiranSiap: (): boolean => terbit === null && [...lolosAturan.keys()].some((id) => !diajukan.has(id)),
    terbit: (): { id_lampiran: string; berkas: string[] } | null => terbit,
    /** Pesan galat critic (bukan penolakan); `null` = sehat. */
    rusak: (): string | null => rusak,
    keadaan: () => ({ ditolak, pengajuan, biaya_kritik_usd: bulat(biayaKritik), sisa_anggaran_usd: sisa(), terbit: terbit !== null, putusan_critic: putusan, lampiran_lolos_aturan: [...lolosAturan.entries()].map(([id, l]) => ({ id_lampiran: id, lampiran: l.lampiran })) }),
  };
}

export type AlatLengkapi = ReturnType<typeof buatAlatLengkapi>;
