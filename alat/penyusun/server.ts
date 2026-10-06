/**
 * Pintu penyusun lokal (M2d-9): `npm run penyusun -- --mesin-lama`. Tanpa bendera, `npm run penyusun`
 * membuka tampilan AI agent (M2d-32 D-8) dengan dua pilihan (M-PN1): "Jalankan Runut Agent"
 * (`langsung-agen.ts`: pelari `npm run agen` sungguhan, berbayar, hanya sesudah klik setuju) dan
 * "Putar ulang rekaman" (`replay-agen.ts`: tanpa panggilan apa pun).
 *
 * Satu server `node:http` yang HANYA mendengar di 127.0.0.1 (D-1, D-6). Ia
 * menyajikan satu halaman HTML/JS polos (`halaman/`) dan API JSON kecil; tahap
 * yang panjang dialirkan lewat Server-Sent Events (`aliran.ts`).
 *
 * Pagar yang dipasang di sini, sebelum rute apa pun:
 * - `Host` harus 127.0.0.1/localhost (menolak DNS rebinding dari situs lain);
 * - POST wajib `Content-Type: application/json` dan, bila ada `Origin`, asal
 *   yang sama — halaman situs lain tidak bisa memicu tindakan berbayar;
 * - badan permintaan ≤ 64 KB.
 * Kunci tidak pernah masuk respons: status hanya memuat nama variabel dan
 * boolean (`konfig.ts`).
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pengambilSungguhan, type Pengambil } from '../sectors.ts';
import { Aliran, sambungSse } from './aliran.ts';
import { ambilJalan, GalatAlur, mulai, potret, setujui, siapkan, sunting, tolak, ujiUlang, type KonteksAlur } from './alur.ts';
import { alasanAwam } from './jalan.ts';
import { PAGU_PENYUSUN_BAWAAN, jalurBukuKas, ringkasBiaya } from './biaya.ts';
import { ambilDataEmiten, perkiraanKredit, PemuatGudang } from './emiten.ts';
import { statusKonfig } from './konfig.ts';
import { periksaFolderKeluaran } from './jalan.ts';
import { mesinSungguhan, panggilSungguhan, type MesinPenulis } from './mesin.ts';
import { mesinBebasPalsu, mesinBebasSungguhan, shaPaket } from './mesin-bebas.ts';
import { AWALAN_TAG_DEMO, Demo, GalatDemo, LOKASI_DEMO, mesinDemo, PAGU_UJI_ULANG_MAKS_USD, RUMUS_JEDA_DEMO, type LokasiDemo, type Ubah } from './demo.ts';
import type { KunciOpsi } from '../../factory/llm/draf.ts';
import type { NamaPenulis } from '../../factory/llm/bebas/pagu-adil.ts';
import type { VersiPrompt } from '../../factory/llm/bebas/prompt.ts';
import { KRITIKUS_TERKUNCI_A1, mesinTemplatM2d11Palsu, mesinTemplatM2d11Sungguhan, mesinTemplatPalsu, mesinTemplatSungguhan } from './mesin-templat.ts';
import { mesinPalsu, pengambilPalsu } from './palsu.ts';
import { periksaTanggal } from './tanggal.ts';
import { jendelaSah, kodeSah, usulkanHari } from './usulan.ts';
import { kirimReplay, siapkanReplay, type ReplayAgen } from './replay-agen.ts';
import { BUDGET_SUSUN_BAWAAN_USD, BUDGET_SUSUN_MAKS_USD, JalanLangsung, SELANG_BACA_MS, TOLERANSI_BUDGET, budgetSah, pelariSungguhan, pelariTiruan, type PelariAgen } from './langsung-agen.ts';
import { bacaRekaman, jamSungguhan, JamVirtual, putarRekaman, RUMUS_JEDA, type JamTayang, type PemutarTayang, type Rekaman } from './tayang-ulang.ts';

/** Satu-satunya alamat yang boleh didengar. Tidak bisa diubah lewat argumen. */
export const HOST = '127.0.0.1';
export const PORT_BAWAAN = 8790;
export const AKAR_REPO = fileURLToPath(new URL('../../', import.meta.url));
const FOLDER_HALAMAN = fileURLToPath(new URL('./halaman/', import.meta.url));
const BATAS_BADAN = 64 * 1024;

const JENIS_BERKAS: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};
/** Berkas halaman yang boleh disajikan (daftar tetap, bukan sistem berkas). */
const BERKAS_HALAMAN: Readonly<Record<string, string>> = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/app.js': 'app.js',
  '/gaya.css': 'gaya.css',
  '/ringkas.js': 'ringkas.js',
  '/agen.html': 'agen.html',
  '/agen.js': 'agen.js',
  '/agen-murni.js': 'agen-murni.js',
  '/agen.css': 'agen.css',
};

export interface OpsiServer {
  /** Akar repo: `.env`, `.cache/` dibaca dari sini. */
  akar: string;
  /** Folder keluaran jalan (`eval/penyusun`). */
  folderKeluaran: string;
  jam: () => Date;
  log: (baris: string) => void;
  paguPenyusunUsd: number;
  /** Mode palsu: agen & Sectors palsu (e2e asap), tanpa jaringan. */
  palsu: boolean;
  /** Lingkungan proses untuk status konfigurasi (tes mengganti). */
  proses?: Record<string, string | undefined>;
  /** Folder gudang (cache Sectors); bawaan `<akar>/.cache/sectors`. */
  folderGudang?: string;
  /** Pengambil Sectors; bawaan `pengambilSungguhan(akar)` (mode palsu: 404 tanpa jaringan). */
  buatPengambil?: () => Pengambil;
  /** Mesin penulis soal; bawaan lingkar M2d-8 sungguhan (mode palsu: model palsu). */
  mesin?: MesinPenulis;
  /** M2d-10: mesin yang dipilih di baris perintah (`--mesin`); bawaan `lingkar`. */
  namaMesin?: NamaMesin;
  /** M2d-13: model penulis mesin `bebas` (`--penulis opus|haiku|deepseek`). */
  penulisBebas?: NamaPenulis;
  /** M2d-15: `--prompt v2` (hanya penulis opus) = profil M2d-15: prompt v2, effort "medium", pra-periksa kode. */
  promptBebas?: VersiPrompt;
  /**
   * M2d-12: mode tayang ulang — putar `aliran.jsonl` satu jalan yang sudah
   * terjadi. Tanpa model, tanpa Sectors, tanpa tulisan ke folder jalan.
   * `jam`: bawaan jam sungguhan; perekam memakai `JamVirtual`.
   */
  tayangUlang?: { folder: string; jam?: JamTayang };
  /**
   * M2d-14: mode demo — tahap 1–4 hidup (tanpa biaya model), tahap agen =
   * tayang ulang log jalan `folder`, panel penyetuju hidup atas draf terpilih.
   */
  demo?: { folder: string; draf: string; suntingan: string; paguUjiUlangUsd: number | null; jam?: JamTayang; folderSimpan?: string };
  /**
   * Mode replay agent (`--replay-agent`): halaman utama = tampilan AI agent,
   * diputar dari rekaman percobaan di repo. Tanpa model, tanpa Sectors, tanpa
   * API key, tanpa tulisan apa pun. `akar`: akar rekaman (tes mengganti).
   */
  replayAgen?: { akar?: string };
  /**
   * M-PN1 "Jalankan Runut Agent" (hanya di tampilan AI agent). `pelari`: bawaan
   * pelari sungguhan (`alat/agen/jalan-agen.ts` sebagai proses anak); tes dan
   * `--pelari-tiruan` menggantinya. `selangMs`: selang pembacaan jejak.
   */
  agenLangsung?: { pelari?: PelariAgen; selangMs?: number };
}

export type NamaMesin = 'lingkar' | 'templat' | 'templat-m2d11' | 'bebas';
export const NAMA_PENULIS_BEBAS: readonly NamaPenulis[] = ['opus', 'haiku', 'deepseek'];

export interface KeadaanTayang {
  rekaman: Rekaman;
  jam: JamTayang;
  /** Ada hanya bila jam virtual (perekam): `POST /api/tayang/maju`. */
  virtual: JamVirtual | null;
  pemutar: PemutarTayang;
  status: Record<string, unknown>;
}

export interface KeadaanDemo {
  demo: Demo;
  jam: JamTayang;
  virtual: JamVirtual | null;
  status: Record<string, unknown>;
  /** Jalan hidup yang sudah disetujui: tahap agennya diputar dari log rekaman. */
  jalanHidup: string | null;
  /** Nomor peristiwa `perkiraan` di log rekaman (= di jalan hidup). */
  noPerkiraan: number;
  pemutar: PemutarTayang;
  pemutarUji: PemutarTayang;
}

export interface KeadaanServer {
  opsi: OpsiServer;
  aliran: Map<string, Aliran>;
  gudang: PemuatGudang;
  alur: KonteksAlur;
  tayang: KeadaanTayang | null;
  demo: KeadaanDemo | null;
  /** Rekaman AI agent yang sudah disiapkan (mode replay agent). */
  agen: ReplayAgen | null;
  /** Pelari "Jalankan Runut Agent"; `null` di luar tampilan AI agent. */
  pelari: PelariAgen | null;
  /** Kerja agent terakhir yang dijalankan dari halaman (paling banyak SATU yang sedang bekerja). */
  langsung: JalanLangsung | null;
}

export class GalatPermintaan extends Error {
  readonly status: number;
  constructor(status: number, pesan: string) {
    super(pesan);
    this.name = 'GalatPermintaan';
    this.status = status;
  }
}

export type Penangan = (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: { keadaan: KeadaanServer; url: URL; badan: unknown; bagian: string[] },
) => Promise<void> | void;

export function kirimJson(res: ServerResponse, status: number, isi: unknown): void {
  const teks = JSON.stringify(isi);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(teks);
}

function namaHost(host: string | undefined): string | null {
  if (host === undefined) return null;
  const m = /^(\[[^\]]+\]|[^:]+)(?::\d+)?$/.exec(host.trim().toLowerCase());
  return m?.[1] ?? null;
}

/** Host yang sah untuk server loopback ini. */
export function hostSah(host: string | undefined): boolean {
  const n = namaHost(host);
  return n === '127.0.0.1' || n === 'localhost' || n === '[::1]';
}

async function bacaBadan(req: IncomingMessage): Promise<unknown> {
  const potongan: Buffer[] = [];
  let panjang = 0;
  for await (const p of req) {
    const b = p as Buffer;
    panjang += b.length;
    if (panjang > BATAS_BADAN) throw new GalatPermintaan(413, 'Badan permintaan terlalu besar.');
    potongan.push(b);
  }
  const teks = Buffer.concat(potongan).toString('utf8');
  if (teks.trim() === '') return {};
  try {
    return JSON.parse(teks) as unknown;
  } catch {
    throw new GalatPermintaan(400, 'Badan permintaan bukan JSON.');
  }
}

function sajikanHalaman(res: ServerResponse, nama: string): void {
  const jalur = join(FOLDER_HALAMAN, nama);
  if (!existsSync(jalur)) {
    kirimJson(res, 404, { galat: 'tidak ada' });
    return;
  }
  res.writeHead(200, {
    'Content-Type': JENIS_BERKAS[extname(nama)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  });
  res.end(readFileSync(jalur));
}

/* ---------------------------------------------------------------------- */
/* rute                                                                    */
/* ---------------------------------------------------------------------- */

const ruteGet = new Map<string, Penangan>();
const rutePost = new Map<string, Penangan>();

/** Daftarkan rute. `:x` di pola = satu segmen apa pun (diteruskan lewat `bagian`). */
export function daftarRute(metode: 'GET' | 'POST', pola: string, f: Penangan): void {
  (metode === 'GET' ? ruteGet : rutePost).set(pola, f);
}

function cocokkan(peta: Map<string, Penangan>, jalur: string): { f: Penangan; bagian: string[] } | null {
  const seg = jalur.split('/').filter((s) => s !== '');
  for (const [pola, f] of peta) {
    const p = pola.split('/').filter((s) => s !== '');
    if (p.length !== seg.length) continue;
    const bagian: string[] = [];
    let cocok = true;
    for (let i = 0; i < p.length; i++) {
      if (p[i]?.startsWith(':') === true) bagian.push(decodeURIComponent(seg[i] ?? ''));
      else if (p[i] !== seg[i]) {
        cocok = false;
        break;
      }
    }
    if (cocok) return { f, bagian };
  }
  return null;
}

daftarRute('GET', '/api/status', (_req, res, { keadaan }) => {
  const o = keadaan.opsi;
  if (keadaan.agen !== null) {
    const a = keadaan.agen;
    // Kode saham yang punya rekaman: untuk petunjuk di kolom isian saja. Nama perusahaan tidak pernah dikirim.
    kirimJson(res, 200, {
      mode: 'replay-agent',
      hari_ini: o.jam().toISOString().slice(0, 10),
      agen: { kode_rekaman: [a.kode], jumlah_langkah: a.langkah.length, budget_usd: a.kepala.budget_usd },
      jalankan: statusJalankan(keadaan),
    });
    return;
  }
  if (keadaan.tayang !== null) {
    kirimJson(res, 200, { mode: 'tayang-ulang', hari_ini: o.jam().toISOString().slice(0, 10), rekaman: keadaan.tayang.status });
    return;
  }
  if (keadaan.demo !== null) {
    kirimJson(res, 200, { mode: 'demo', hari_ini: o.jam().toISOString().slice(0, 10), demo: keadaan.demo.status });
    return;
  }
  const k = statusKonfig(o.akar, o.proses ?? process.env);
  kirimJson(res, 200, {
    mode: o.palsu ? 'palsu' : 'sungguhan',
    hari_ini: o.jam().toISOString().slice(0, 10),
    konfig: k,
    biaya: ringkasBiaya(o.akar, o.paguPenyusunUsd),
    pagu_kredit: k.pagu_kredit,
  });
});

function bacaBadanObyek(badan: unknown): Record<string, unknown> {
  return typeof badan === 'object' && badan !== null && !Array.isArray(badan) ? (badan as Record<string, unknown>) : {};
}

function wajibKode(nilai: unknown): string {
  const k = kodeSah(nilai);
  if (k === null) throw new GalatPermintaan(400, 'Kode saham harus empat huruf, mis. TIRT.');
  return k;
}

function wajibJendela(nilai: unknown): number {
  const j = jendelaSah(nilai);
  if (j === null) throw new GalatPermintaan(400, 'Jumlah hari bursa sesudah hari simulasi harus bilangan bulat 5–20.');
  return j;
}

/** D-2: usulan hari dari cache, atau perkiraan kredit bila data emiten belum ada. */
daftarRute('GET', '/api/emiten', (_req, res, { keadaan, url }) => {
  const kode = wajibKode(url.searchParams.get('kode'));
  const jendela = wajibJendela(url.searchParams.get('jendela') ?? undefined);
  const o = keadaan.opsi;
  const data = keadaan.gudang.emiten(kode);
  if (data === null) {
    const k = statusKonfig(o.akar, o.proses ?? process.env);
    kirimJson(res, 200, {
      kode,
      ada_data: false,
      sectors_siap: o.palsu || k.sectors.siap,
      perkiraan_kredit: perkiraanKredit(kode, jalurBukuKas(o.akar), k.pagu_kredit),
    });
    return;
  }
  const hasil = usulkanHari(kode, data, { jendela, hariIni: o.jam().toISOString().slice(0, 10) });
  const hari = data.harga.map((h) => h.tanggal).sort();
  kirimJson(res, 200, {
    ada_data: true,
    nama: data.nama_perusahaan ?? null,
    data: {
      harga: { hari: hari.length, dari: hari[0] ?? null, sampai: hari.at(-1) ?? null },
      suspensi: data.suspensi.length,
      laporan: data.laporan.length,
      dividen: data.dividen.length,
      rups: data.rups.length,
    },
    ...hasil,
  });
});

/** D-2: ambil data emiten dari Sectors — HANYA dengan persetujuan kredit di layar (`setuju: true`). */
daftarRute('POST', '/api/ambil-data', async (_req, res, { keadaan, badan }) => {
  const b = bacaBadanObyek(badan);
  const kode = wajibKode(b['kode']);
  if (b['setuju'] !== true) throw new GalatPermintaan(400, 'Pengambilan data memakai kredit Sectors; setujui perkiraan kreditnya di layar dulu.');
  const o = keadaan.opsi;
  if (keadaan.gudang.emiten(kode) !== null) throw new GalatPermintaan(409, `Data ${kode} sudah ada di cache; tidak diambil ulang.`);
  if (!o.palsu && o.buatPengambil === undefined) {
    const k = statusKonfig(o.akar, o.proses ?? process.env);
    if (!k.sectors.siap) throw new GalatPermintaan(400, `Isi dulu di .env: ${k.sectors.hilang.join(', ')}.`);
  }
  const p = o.buatPengambil?.() ?? (o.palsu ? pengambilPalsu() : pengambilSungguhan(o.akar));
  const hasil = await ambilDataEmiten(p, kode);
  keadaan.gudang.lupakan();
  o.log(`ambil data ${kode}: ${String(hasil.kredit_dipakai)} kredit; ${hasil.berhenti ?? 'selesai'}`);
  kirimJson(res, 200, { kode, ...hasil, ada_data: keadaan.gudang.emiten(kode) !== null });
});

/** D-3: validasi tanggal ketikan (alasan awam + tawaran hari bursa terdekat). */
daftarRute('POST', '/api/periksa-tanggal', (_req, res, { keadaan, badan }) => {
  const b = bacaBadanObyek(badan);
  const kode = wajibKode(b['kode']);
  const jendela = wajibJendela(b['jendela']);
  const data = keadaan.gudang.emiten(kode);
  if (data === null) throw new GalatPermintaan(404, `Data ${kode} belum ada di cache.`);
  const hasil = periksaTanggal(typeof b['tanggal'] === 'string' ? b['tanggal'] : '', data, keadaan.gudang.kalender(), {
    jendela,
    hariIni: keadaan.opsi.jam().toISOString().slice(0, 10),
  });
  kirimJson(res, 200, { emiten: kode, jendela, ...hasil });
});

/** D-4: buat jalan dan jalankan tahap gratis; tahapannya dialirkan lewat SSE. */
daftarRute('POST', '/api/siapkan', (_req, res, { keadaan, badan }) => {
  const b = bacaBadanObyek(badan);
  const kode = wajibKode(b['kode']);
  const jendela = wajibJendela(b['jendela']);
  if (typeof b['tanggal'] !== 'string') throw new GalatPermintaan(400, 'Tanggal wajib diisi (TTTT-BB-HH).');
  const id = b['id'] === undefined || b['id'] === null || b['id'] === '' ? undefined : String(b['id']);
  const j = siapkan(keadaan.alur, { kode, tanggal: b['tanggal'], jendela, ...(id === undefined ? {} : { id }) });
  kirimJson(res, 202, { id: j.data.id });
});

daftarRute('GET', '/api/jalan/:id', (_req, res, { keadaan, bagian }) => {
  const d = keadaan.demo;
  if (d !== null && d.jalanHidup !== null && bagian[0] === d.jalanHidup) {
    kirimJson(res, 200, potretDemo(d));
    return;
  }
  const j = ambilJalan(keadaan.alur, bagian[0] ?? '');
  kirimJson(res, 200, potret(keadaan.alur, j));
});

/** D-4: persetujuan klik atas perkiraan biaya → agen berjalan (berbayar). */
daftarRute('POST', '/api/jalan/:id/mulai', (_req, res, { keadaan, bagian, badan }) => {
  const b = bacaBadanObyek(badan);
  const j = ambilJalan(keadaan.alur, bagian[0] ?? '');
  if (keadaan.demo !== null) {
    kirimJson(res, 202, mulaiDemo(keadaan, keadaan.demo, j, b));
    return;
  }
  const pagu = mulai(keadaan.alur, j, b['setuju'], b['pagu_usd']);
  kirimJson(res, 202, { id: j.data.id, pagu_usd: pagu });
});

/** D-5: perbaiki kata (dikunci: angka, rujukan fakta, label pilihan). */
daftarRute('POST', '/api/jalan/:id/sunting', (_req, res, { keadaan, bagian, badan }) => {
  const b = bacaBadanObyek(badan);
  const j = ambilJalan(keadaan.alur, bagian[0] ?? '');
  sunting(keadaan.alur, j, b['omongan'], b['lokasi'], b['teks']);
  kirimJson(res, 200, potret(keadaan.alur, j));
});

/** D-5: uji ulang oleh gerbang yang sama (berbayar; wajib setuju: true). */
daftarRute('POST', '/api/jalan/:id/uji-ulang', (_req, res, { keadaan, bagian, badan }) => {
  const b = bacaBadanObyek(badan);
  const j = ambilJalan(keadaan.alur, bagian[0] ?? '');
  kirimJson(res, 202, ujiUlang(keadaan.alur, j, b['setuju']));
});

/** D-5: setujui — hanya sesudah semua suntingan lolos uji ulang; keluaran ke eval/penyusun/<id>/. */
daftarRute('POST', '/api/jalan/:id/setujui', (_req, res, { keadaan, bagian }) => {
  const j = ambilJalan(keadaan.alur, bagian[0] ?? '');
  kirimJson(res, 200, { berkas: setujui(keadaan.alur, j) });
});

/** D-5: tolak dengan alasan. */
daftarRute('POST', '/api/jalan/:id/tolak', (_req, res, { keadaan, bagian, badan }) => {
  const b = bacaBadanObyek(badan);
  const j = ambilJalan(keadaan.alur, bagian[0] ?? '');
  kirimJson(res, 200, { berkas: tolak(keadaan.alur, j, b['alasan']) });
});

function nomorSesudah(req: IncomingMessage): number {
  const dari = Number(req.headers['last-event-id'] ?? new URL(req.url ?? '/', 'http://x').searchParams.get('sesudah') ?? 0);
  return Number.isFinite(dari) && dari > 0 ? dari : 0;
}

daftarRute('GET', '/api/jalan/:id/aliran', (req, res, { keadaan, bagian }) => {
  const id = bagian[0] ?? '';
  if (keadaan.tayang !== null) {
    // Tayang ulang: setiap sambungan memutar rekaman dari nomor yang diminta.
    putarRekaman(res, keadaan.tayang.rekaman, keadaan.tayang.jam, nomorSesudah(req), keadaan.tayang.pemutar);
    return;
  }
  const d = keadaan.demo;
  if (d !== null && d.jalanHidup !== null && id === d.jalanHidup) {
    // Demo: sesudah persetujuan, tahap agen = log jalan rekaman apa adanya (mulai sesudah peristiwa perkiraan).
    putarRekaman(res, d.demo.rekaman, d.jam, Math.max(nomorSesudah(req), d.noPerkiraan), d.pemutar);
    return;
  }
  let a = keadaan.aliran.get(id);
  if (a === undefined) {
    try {
      a = ambilJalan(keadaan.alur, id).aliran;
    } catch {
      a = undefined;
    }
  }
  if (a === undefined) throw new GalatPermintaan(404, 'Jalan tidak dikenal.');
  sambungSse(res, a, nomorSesudah(req));
});

/**
 * Tampilan AI agent: seluruh langkah rekaman untuk satu kode saham, lewat SSE
 * (`event: kepala` → `langkah` × n → `simulasi` → `selesai`). Jeda diatur halaman.
 */
daftarRute('GET', '/api/agen/aliran', (_req, res, { keadaan, url }) => {
  const a = keadaan.agen;
  if (a === null) throw new GalatPermintaan(404, 'Hanya ada di tampilan AI agent (npm run penyusun tanpa --mesin-lama).');
  const kode = wajibKode(url.searchParams.get('kode'));
  if (kode !== a.kode) throw new GalatPermintaan(404, `Belum ada rekaman AI agent untuk ${kode}. Rekaman yang ada: ${a.kode}.`);
  kirimReplay(res, a);
});

/* ---------------------------------------------------------------------- */
/* Jalankan Runut Agent (M-PN1)                                            */
/* ---------------------------------------------------------------------- */

function wajibPelari(keadaan: KeadaanServer): PelariAgen {
  if (keadaan.agen === null || keadaan.pelari === null) throw new GalatPermintaan(404, 'Hanya ada di tampilan AI agent (npm run penyusun tanpa --mesin-lama).');
  return keadaan.pelari;
}

/** Kunci untuk memanggil model: hanya nama variabel yang kosong, tidak pernah nilainya. Pelari tiruan tidak butuh kunci. */
function kunciJalankan(keadaan: KeadaanServer, pelari: PelariAgen): { siap: boolean; alasan: string | null } {
  if (pelari.tiruan) return { siap: true, alasan: null };
  const k = statusKonfig(keadaan.opsi.akar, keadaan.opsi.proses ?? process.env).llm;
  if (k.siap) return { siap: true, alasan: null };
  const isi = k.hilang.length === 0 ? '' : `Isi ${k.hilang.join(', ')} di berkas .env (salin dari .env.example), lalu muat ulang halaman ini. `;
  return { siap: false, alasan: `${isi}${k.catatan.join(' ')}`.trim() };
}

/** Bagian `jalankan` di `/api/status`: boleh tidaknya tombol "Jalankan Runut Agent", batas budget, dan kerja yang sedang berlangsung. */
function statusJalankan(keadaan: KeadaanServer): Record<string, unknown> | null {
  const pelari = keadaan.pelari;
  if (pelari === null) return null;
  const l = keadaan.langsung;
  return {
    ...kunciJalankan(keadaan, pelari),
    tiruan: pelari.tiruan,
    budget_bawaan_usd: BUDGET_SUSUN_BAWAAN_USD,
    budget_maks_usd: BUDGET_SUSUN_MAKS_USD,
    toleransi: TOLERANSI_BUDGET,
    kerja: l === null ? null : { id: l.id, kode: l.kode, keadaan: l.keadaan, budget_usd: l.budgetUsd, folder: l.folderTampil, tiruan: l.tiruan },
  };
}

/**
 * Data saham di cache lokal, atau `null`. Cache yang belum ada sama sekali (repo
 * yang baru di-clone tidak punya `.cache/sectors`) berarti "belum ada data",
 * bukan galat. Pelari (proses lain) bisa baru saja mengisi cache, jadi bila
 * belum ada, cache dibaca ulang sekali.
 */
function dataCache(keadaan: KeadaanServer, kode: string): ReturnType<PemuatGudang['emiten']> {
  const baca = (): ReturnType<PemuatGudang['emiten']> => {
    try {
      return keadaan.gudang.emiten(kode);
    } catch {
      return null;
    }
  };
  const ada = baca();
  if (ada !== null) return ada;
  keadaan.gudang.lupakan();
  return baca();
}

/** Apakah data saham ini sudah ada di cache lokal (kalau belum, pelari perlu izin memakai kredit Sectors). */
daftarRute('GET', '/api/agen/siap', (_req, res, { keadaan, url }) => {
  const pelari = wajibPelari(keadaan);
  const kode = wajibKode(url.searchParams.get('kode'));
  const adaData = dataCache(keadaan, kode) !== null;
  const o = keadaan.opsi;
  kirimJson(res, 200, {
    kode,
    ada_data: adaData,
    perlu_kredit: !pelari.tiruan && !adaData,
    sectors_siap: statusKonfig(o.akar, o.proses ?? process.env).sectors.siap,
  });
});

/**
 * D-2: SATU-SATUNYA pintu yang menyalakan pelari. Urutan pagar: kode sah →
 * klik setuju (`setuju: true` di badan POST sama-asal) → budget dalam batas →
 * kunci ada → izin kredit Sectors bila datanya belum ada → tidak ada kerja lain
 * yang sedang berlangsung. Baru sesudah semuanya, pelari dipanggil.
 */
daftarRute('POST', '/api/agen/jalankan', (_req, res, { keadaan, badan }) => {
  const pelari = wajibPelari(keadaan);
  const o = keadaan.opsi;
  const b = bacaBadanObyek(badan);
  const kode = wajibKode(b['kode']);
  if (b['setuju'] !== true) throw new GalatPermintaan(400, 'Menjalankan AI agent memanggil model berbayar. Setujui budget-nya di halaman dulu.');
  const budget = budgetSah(b['budget_usd']);
  if (budget === null) throw new GalatPermintaan(400, `Budget harus angka dolar di atas 0 dan paling banyak ${String(BUDGET_SUSUN_MAKS_USD)}.`);
  const kunci = kunciJalankan(keadaan, pelari);
  if (!kunci.siap) throw new GalatPermintaan(400, kunci.alasan ?? 'Kunci API belum diisi.');
  const data = dataCache(keadaan, kode);
  const perluKredit = !pelari.tiruan && data === null;
  if (perluKredit) {
    if (b['setuju_kredit'] !== true) throw new GalatPermintaan(400, `Data ${kode} belum ada di cache lokal. Centang izin mengambilnya dari Sectors API (memakai kredit Sectors) dulu.`);
    const s = statusKonfig(o.akar, o.proses ?? process.env).sectors;
    if (!s.siap) throw new GalatPermintaan(400, `Data ${kode} belum ada di cache lokal dan kunci Sectors belum diisi. Isi ${s.hilang.join(', ')} di berkas .env dulu.`);
  }
  if (keadaan.langsung !== null && keadaan.langsung.keadaan === 'bekerja') {
    throw new GalatPermintaan(409, 'Masih ada AI agent yang bekerja dari halaman ini. Tunggu sampai selesai atau tekan Hentikan; hanya satu yang boleh bekerja pada satu waktu.');
  }
  const cap = o.jam().toISOString().replace(/\D/g, '').slice(0, 14);
  let id = `pn-${cap.slice(0, 8)}-${cap.slice(8)}`;
  for (let n = 2; existsSync(join(pelari.folderDasar, id)); n++) id = `pn-${cap.slice(0, 8)}-${cap.slice(8)}-${String(n)}`;
  const l = new JalanLangsung({
    pelari,
    id,
    kode,
    budgetUsd: budget,
    kreditSectors: perluKredit,
    namaPerusahaan: data?.nama_perusahaan ?? null,
    akar: o.akar,
    selangMs: o.agenLangsung?.selangMs ?? SELANG_BACA_MS,
    log: o.log,
  });
  keadaan.langsung = l;
  o.log(`agent langsung ${id}: dinyalakan sesudah klik setuju; kode ${kode}; budget US$${budget.toFixed(2)}; ${pelari.tiruan ? 'PELARI TIRUAN (bukan agent sungguhan)' : `pelari sungguhan PID ${String(l.pid ?? '-')}`}`);
  kirimJson(res, 202, { id, kode, budget_usd: budget, folder: l.folderTampil, tiruan: l.tiruan });
});

/** D-2: tombol Hentikan — mematikan pelari milik server ini. */
daftarRute('POST', '/api/agen/hentikan', (_req, res, { keadaan }) => {
  wajibPelari(keadaan);
  const l = keadaan.langsung;
  if (l === null || l.keadaan !== 'bekerja') throw new GalatPermintaan(409, 'Tidak ada AI agent yang sedang bekerja dari halaman ini.');
  l.hentikan();
  keadaan.opsi.log(`agent langsung ${l.id}: Hentikan ditekan`);
  kirimJson(res, 202, { id: l.id });
});

/**
 * Langkah kerja agent yang dijalankan dari halaman, lewat SSE: `kepala` →
 * `langkah` (tiap kali pelari menutup satu langkah di `jejak-agen.jsonl`) →
 * `akhir` → `selesai`. Bentuk `kepala` dan `langkah` sama dengan replay.
 */
daftarRute('GET', '/api/agen/langsung/aliran', (_req, res, { keadaan }) => {
  wajibPelari(keadaan);
  if (keadaan.langsung === null) throw new GalatPermintaan(404, 'Belum ada AI agent yang dijalankan dari halaman ini.');
  keadaan.langsung.sambung(res);
});

/** M2d-12: perekam bingkai memajukan jam virtual tayang ulang (hanya `--jam-virtual`). */
daftarRute('POST', '/api/tayang/maju', async (_req, res, { keadaan, badan }) => {
  const t = keadaan.tayang;
  const d = keadaan.demo;
  const ms = Number(bacaBadanObyek(badan)['ms']);
  if (d !== null && d.virtual !== null) {
    if (!Number.isFinite(ms) || ms < 0 || ms > 60_000) throw new GalatPermintaan(400, 'ms harus 0–60000.');
    const waktu = await d.virtual.maju(ms);
    kirimJson(res, 200, { waktu_ms: waktu, terkirim: d.pemutar.terkirim, selesai: d.pemutar.selesai, jumlah: d.demo.rekaman.peristiwa.length, uji: { terkirim: d.pemutarUji.terkirim, selesai: d.pemutarUji.selesai } });
    return;
  }
  if (t === null || t.virtual === null) throw new GalatPermintaan(409, 'Jam virtual hanya ada di mode tayang ulang atau demo dengan --jam-virtual.');
  if (!Number.isFinite(ms) || ms < 0 || ms > 60_000) throw new GalatPermintaan(400, 'ms harus 0–60000.');
  const waktu = await t.virtual.maju(ms);
  kirimJson(res, 200, { waktu_ms: waktu, terkirim: t.pemutar.terkirim, selesai: t.pemutar.selesai, jumlah: t.rekaman.peristiwa.length });
});

/* ---------------------------------------------------------------------- */
/* mode demo (M2d-14)                                                      */
/* ---------------------------------------------------------------------- */

function wajibDemo(keadaan: KeadaanServer): KeadaanDemo {
  if (keadaan.demo === null) throw new GalatPermintaan(404, 'Hanya ada di mode demo (--demo).');
  return keadaan.demo;
}

/** Status demo untuk halaman: penanda rekaman bagian agen + kalimat transisi (semua dari log & berkas). */
export function statusDemo(d: Demo, akar: string, paguUjiUlangUsd: number | null): Record<string, unknown> {
  const st = statusRekaman(d.rekaman, akar);
  const p = d.rekaman.peristiwa;
  const iPerk = p.findIndex((x) => x.tahap === 'perkiraan');
  if (iPerk < 0) throw new GalatDemo(400, `Log jalan ${d.id} tidak memuat peristiwa perkiraan.`);
  const perk = p[iPerk] as (typeof p)[number];
  const hasil = [...p].reverse().find((x) => x.tahap === 'hasil');
  const biaya = typeof hasil?.isi['biaya_ledger_usd'] === 'number' ? hasil.isi['biaya_ledger_usd'] : typeof hasil?.isi['biaya_usd'] === 'number' ? hasil.isi['biaya_usd'] : null;
  const jadwal = d.rekaman.jadwal;
  const awal = jadwal[iPerk]?.pada_ms ?? 0;
  const akhir = jadwal.at(-1)?.pada_ms ?? awal;
  const terakhir = p.at(-1);
  return {
    ...st,
    rumus: RUMUS_JEDA_DEMO,
    no_perkiraan: perk.no,
    waktu_perkiraan_asli: perk.waktu,
    jumlah_peristiwa_agen: p.length - iPerk - 1,
    asli_agen_ms: terakhir === undefined ? 0 : Math.max(0, Date.parse(terakhir.waktu) - Date.parse(perk.waktu)),
    putar_agen_ms: akhir - awal,
    biaya_asli_usd: biaya,
    berkas_suntingan: d.potret()['berkas_suntingan'],
    penyetuju: d.berkas.penyetuju,
    pagu_uji_ulang_usd: paguUjiUlangUsd,
    pagu_uji_ulang_maks_usd: PAGU_UJI_ULANG_MAKS_USD,
    awalan_tag_uji_ulang: AWALAN_TAG_DEMO,
  };
}

/** Persetujuan klik di mode demo: tidak memanggil model; tahap agen sesudahnya = log jalan rekaman. */
function mulaiDemo(keadaan: KeadaanServer, d: KeadaanDemo, j: { data: { id: string; tahap: string }; paket: unknown; aliran: Aliran }, b: Record<string, unknown>): Record<string, unknown> {
  if (j.data.tahap !== 'menunggu-persetujuan') throw new GalatPermintaan(409, `Jalan ini tidak sedang menunggu persetujuan (tahap: ${j.data.tahap}).`);
  if (b['setuju'] !== true) throw new GalatPermintaan(400, 'Setujui perkiraan biayanya di layar dulu.');
  if (j.paket === null || shaPaket(j.paket as Parameters<typeof shaPaket>[0]) !== shaPaket(d.demo.paket)) {
    throw new GalatPermintaan(409, `Paket jalan ini tidak sama dengan paket jalan rekaman ${d.demo.id}; mode demo hanya bisa memutar jalan itu.`);
  }
  const terakhir = j.aliran.semua().at(-1);
  if (terakhir?.tahap !== 'perkiraan' || terakhir.no !== d.noPerkiraan) throw new GalatPermintaan(409, 'Urutan tahap jalan hidup tidak cocok dengan log rekaman.');
  j.data.tahap = 'diputar-dari-rekaman';
  d.jalanHidup = j.data.id;
  j.aliran.tutup();
  keadaan.opsi.log(`demo: persetujuan diklik untuk ${j.data.id}; tahap agen diputar dari log ${d.demo.id} (tanpa panggilan model)`);
  return { id: j.data.id, demo: d.status };
}

/** Potret jalan sesudah tahap agen: isi keadaan.json jalan rekaman + status per omongan + keadaan demo. */
function potretDemo(d: KeadaanDemo): Record<string, unknown> {
  const k = d.demo.keadaanRekaman as Record<string, unknown> & { hasil?: { berhenti: string | null } | null; pagu_jalan_usd?: number | null; draf_terakhir?: Array<{ kartu: string[] } | null>; kode?: string; tanggal?: string };
  const dirujuk = new Set([...(k.draf_terakhir ?? []).flatMap((o) => o?.kartu ?? []), ...d.demo.terpilih.flatMap((t) => t.omongan.kartu)]);
  return {
    ...k,
    judul: `${String(k.kode)} · ${String(k.tanggal)}`,
    nama_samaran: d.demo.paket.nama_samaran ?? null,
    kartu: Object.fromEntries(d.demo.paket.fakta.filter((f) => dirujuk.has(f.fact_id)).map((f) => [f.fact_id, { klaim: f.klaim, asal: f.asal, jenis: f.jenis, terbit: f.terbit }])),
    alasan_awam: k.hasil === null || k.hasil === undefined ? null : alasanAwam(k.hasil.berhenti, k.pagu_jalan_usd ?? null),
    status_omongan_jalan: d.demo.terpilih.map((t) => ({ no: t.no, versi: t.versi, lulus: t.lulus_jalan, berhenti: t.berhenti })),
    demo: d.demo.potret(),
  };
}

daftarRute('GET', '/api/demo', (_req, res, { keadaan }) => {
  kirimJson(res, 200, wajibDemo(keadaan).demo.potret());
});

/** Suntingan penyetuju (demo): diterapkan, dicatat, dan gerbang KODE diuji ulang langsung. */
daftarRute('POST', '/api/demo/sunting', (_req, res, { keadaan, badan }) => {
  const d = wajibDemo(keadaan);
  if (d.jalanHidup === null) throw new GalatPermintaan(409, 'Panel penyetuju terbuka sesudah tahap agen.');
  const b = bacaBadanObyek(badan);
  const no = Number(b['omongan']);
  const u: Ubah = Array.isArray(b['tukar'])
    ? { omongan: no, tukar: [String(b['tukar'][0]), String(b['tukar'][1])] as [KunciOpsi, KunciOpsi] }
    : { omongan: no, lokasi: String(b['lokasi']) as LokasiDemo, teks: typeof b['teks'] === 'string' ? b['teks'] : '' };
  if (!Number.isInteger(no) || no < 1 || no > 3) throw new GalatPermintaan(400, 'Nomor omongan harus 1–3.');
  if ('lokasi' in u && !(LOKASI_DEMO as readonly string[]).includes(u.lokasi)) throw new GalatPermintaan(400, `Lokasi harus salah satu dari: ${LOKASI_DEMO.join(', ')}.`);
  if ('tukar' in u && (!u.tukar.every((h) => ['a', 'b', 'c', 'd'].includes(h)) || u.tukar[0] === u.tukar[1])) throw new GalatPermintaan(400, 'Tukar harus dua huruf a–d yang berbeda.');
  const h = d.demo.sunting(u);
  kirimJson(res, 200, { ...h, demo: d.demo.potret() });
});

/** Uji ulang gerbang AI (demo): hasil tersimpan → diputar; selain itu hanya dengan --pagu-uji-ulang. */
daftarRute('POST', '/api/demo/uji-ulang', (_req, res, { keadaan, badan }) => {
  const d = wajibDemo(keadaan);
  const u = d.demo.mulaiUjiAi(bacaBadanObyek(badan)['setuju']);
  kirimJson(res, 202, { uji: u, demo: d.demo.potret() });
});

daftarRute('GET', '/api/demo/uji-ulang/aliran', (req, res, { keadaan }) => {
  const d = wajibDemo(keadaan);
  const a = d.demo.aliranUji;
  if (a === null) throw new GalatPermintaan(404, 'Belum ada uji ulang.');
  if (a.jenis === 'langsung') sambungSse(res, a.aliran, nomorSesudah(req));
  else putarRekaman(res, a.rekaman, d.jam, nomorSesudah(req), d.pemutarUji);
});

/** Tolak (demo): putusan "ditolak" dengan alasan; berkas yang sama (persetujuan-demo.json). */
daftarRute('POST', '/api/demo/tolak', (_req, res, { keadaan, badan }) => {
  const d = wajibDemo(keadaan);
  const berkas = d.demo.tolak(bacaBadanObyek(badan)['alasan']);
  kirimJson(res, 200, { berkas, demo: d.demo.potret() });
});

/** Setujui (demo): hanya bila semua lolos; menulis eval/penyusun/<jalan>/persetujuan-demo.json saja. */
daftarRute('POST', '/api/demo/setujui', (_req, res, { keadaan }) => {
  const d = wajibDemo(keadaan);
  const berkas = d.demo.setujui();
  kirimJson(res, 200, { berkas, demo: d.demo.potret() });
});

/* ---------------------------------------------------------------------- */
/* aplikasi                                                                */
/* ---------------------------------------------------------------------- */

const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Tanggal & jam WIB (UTC+7) dari stempel ISO: { tanggal: "2 Okt 2026", jam: "18.44" }. */
export function waktuWib(iso: string): { tanggal: string; jam: string } {
  const t = new Date(Date.parse(iso) + 7 * 3_600_000);
  if (Number.isNaN(t.getTime())) return { tanggal: iso, jam: '' };
  const dua = (n: number): string => String(n).padStart(2, '0');
  return { tanggal: `${String(t.getUTCDate())} ${BULAN_PENDEK[t.getUTCMonth()] ?? ''} ${String(t.getUTCFullYear())}`, jam: `${dua(t.getUTCHours())}.${dua(t.getUTCMinutes())}` };
}

const JALUR_CATATAN = fileURLToPath(new URL('./rekaman/catatan.json', import.meta.url));

/** Catatan sesudah jalan (bukan bagian log) untuk satu id, bila ada. */
interface CatatanRekaman {
  konteks: string | null;
  batas_gerbang: string | null;
  konteks_singkat: string | null;
  persetujuan: string | null;
  sesudah: string[];
  sumber: string | null;
}

function catatanRekaman(id: string): CatatanRekaman {
  if (!existsSync(JALUR_CATATAN)) return { konteks: null, batas_gerbang: null, konteks_singkat: null, persetujuan: null, sesudah: [], sumber: null };
  const semua = JSON.parse(readFileSync(JALUR_CATATAN, 'utf8')) as { jalan?: Record<string, Partial<CatatanRekaman>> };
  const c = semua.jalan?.[id];
  return { konteks: c?.konteks ?? null, batas_gerbang: c?.batas_gerbang ?? null, konteks_singkat: c?.konteks_singkat ?? null, persetujuan: c?.persetujuan ?? null, sesudah: c?.sesudah ?? [], sumber: c?.sumber ?? null };
}

/** Status rekaman untuk halaman (semua dari log + keadaan.json jalan; catatan terpisah). */
export function statusRekaman(r: Rekaman, akar: string): Record<string, unknown> {
  const jalurKeadaan = join(r.folder, 'keadaan.json');
  const k = r.berkas.keadaan ? (JSON.parse(readFileSync(jalurKeadaan, 'utf8')) as { kode?: string; tanggal?: string; dibuat?: string }) : {};
  const pertama = r.peristiwa[0];
  const terakhir = r.peristiwa.at(-1);
  const dibuat = k.dibuat ?? pertama?.waktu ?? '';
  const w = waktuWib(dibuat);
  const pagu = r.peristiwa.find((p) => p.tahap === 'agen' && typeof p.isi['pagu_usd'] === 'number')?.isi['pagu_usd'] ?? null;
  const rel = relative(akar, r.folder);
  return {
    id: r.id,
    label: `Rekaman jalan ${r.id}, ${w.tanggal}`,
    tanggal_jalan: w.tanggal,
    jam_jalan_wib: w.jam,
    kode: k.kode ?? null,
    tanggal_t: k.tanggal ?? null,
    jumlah_peristiwa: r.peristiwa.length,
    asli_ms: pertama !== undefined && terakhir !== undefined ? Math.max(0, Date.parse(terakhir.waktu) - Date.parse(pertama.waktu)) : 0,
    putar_ms: r.jadwal.at(-1)?.pada_ms ?? 0,
    rumus: RUMUS_JEDA,
    pagu_usd: pagu,
    sumber_log: rel.startsWith('..') || isAbsolute(rel) ? `${r.id}/aliran.jsonl` : `${rel.split(sep).join('/')}/aliran.jsonl`,
    berkas: r.berkas,
    catatan: catatanRekaman(r.id),
  };
}

/** Mesin pengganti di mode tayang ulang: tidak pernah menjalankan apa pun. */
function mesinRekaman(): MesinPenulis {
  const tolak = (): Promise<never> => Promise.reject(new Error('mode tayang ulang: tidak ada panggilan'));
  return {
    nama: 'tayang-ulang',
    keterangan: 'rekaman jalan; tidak memanggil model',
    palsu: true,
    siap: () => ({ siap: false, alasan: 'Mode tayang ulang: ini rekaman, tidak ada panggilan.' }),
    perkiraan: () => ({ per_panggilan: [], per_omongan_usd: 0, per_putaran_usd: 0, maks_putaran: 0, catatan: [] }),
    jalankan: tolak,
    perkiraanUjiUlang: () => 0,
    ujiUlang: tolak,
  };
}

export function buatAplikasi(opsiMentah: OpsiServer): { server: Server; keadaan: KeadaanServer } {
  const rekaman = opsiMentah.tayangUlang === undefined ? null : bacaRekaman(opsiMentah.tayangUlang.folder);
  const od = opsiMentah.demo;
  if (od !== undefined && rekaman !== null) throw new Error('--demo dan --tayang-ulang tidak bisa dipakai bersama.');
  const ora = opsiMentah.replayAgen;
  if (ora !== undefined && (od !== undefined || rekaman !== null)) throw new Error('--replay-agent tidak bisa digabung dengan --demo atau --tayang-ulang.');
  const agen = ora === undefined ? null : ora.akar === undefined ? siapkanReplay() : siapkanReplay(ora.akar);
  const demo =
    od === undefined
      ? null
      : new Demo({
          akar: opsiMentah.akar,
          folderJalan: od.folder,
          pilihDraf: od.draf,
          jalurSuntingan: od.suntingan,
          paguUjiUlangUsd: od.paguUjiUlangUsd,
          jam: opsiMentah.jam,
          log: opsiMentah.log,
          ...(od.folderSimpan === undefined ? {} : { folderSimpan: od.folderSimpan }),
          ...(od.paguUjiUlangUsd === null ? {} : { buatPanggil: (tag: string, pagu: number) => panggilSungguhan(opsiMentah.akar, pagu, opsiMentah.log, KRITIKUS_TERKUNCI_A1, AWALAN_TAG_DEMO)(tag, pagu) }),
        });
  // Tayang ulang: tanpa jaringan (palsu), folder keluaran = induk folder jalan (hanya dibaca), mesin pengganti.
  // Demo: tahap 1–4 hidup dari gudang; folder keluaran sementara (bukan eval/); mesin demo tidak pernah menjalankan agen.
  const opsi: OpsiServer =
    rekaman !== null
      ? { ...opsiMentah, palsu: true, folderKeluaran: rekaman.folderInduk, mesin: mesinRekaman() }
      : demo !== null
        ? { ...opsiMentah, palsu: false, folderKeluaran: mkdtempSync(join(tmpdir(), 'penyusun-demo-')), mesin: mesinDemo(demo.keadaanRekaman, shaPaket(demo.paket), shaPaket, demo.id) }
        : agen !== null
          ? // Replay agent: tanpa jaringan (palsu), mesin pengganti yang tidak pernah menjalankan apa pun.
            { ...opsiMentah, palsu: true, mesin: mesinRekaman() }
          : opsiMentah;
  const aliran = new Map<string, Aliran>();
  const gudang = new PemuatGudang(opsi.folderGudang ?? join(opsi.akar, '.cache', 'sectors'));
  const proses = opsi.proses ?? process.env;
  const siapLlm = (): { siap: boolean; alasan: string | null } => {
    const k = statusKonfig(opsi.akar, proses);
    return k.llm.siap ? { siap: true, alasan: null } : { siap: false, alasan: `Kunci OpenRouter belum siap: ${[...k.llm.hilang.map((n) => `isi ${n} di .env`), ...k.llm.catatan].join('; ')}.` };
  };
  const templat = opsi.namaMesin === 'templat';
  const m2d11 = opsi.namaMesin === 'templat-m2d11';
  const bebas = opsi.namaMesin === 'bebas';
  if (bebas && opsi.penulisBebas === undefined) throw new Error('--mesin bebas butuh --penulis opus|haiku|deepseek.');
  if (opsi.promptBebas === 'v2' && (!bebas || opsi.penulisBebas !== 'opus')) throw new Error('--prompt v2 (M2d-15) hanya untuk --mesin bebas --penulis opus.');
  const mesin =
    opsi.mesin ??
    (bebas
      ? opsi.palsu
        ? mesinBebasPalsu(opsi.penulisBebas as NamaPenulis, opsi.promptBebas)
        : mesinBebasSungguhan(opsi.penulisBebas as NamaPenulis, panggilSungguhan(opsi.akar, opsi.paguPenyusunUsd, opsi.log, KRITIKUS_TERKUNCI_A1), siapLlm, opsi.promptBebas)
      : undefined) ??
    (opsi.palsu
      ? m2d11
        ? mesinTemplatM2d11Palsu()
        : templat
          ? mesinTemplatPalsu()
          : mesinPalsu()
      : m2d11
        ? mesinTemplatM2d11Sungguhan(panggilSungguhan(opsi.akar, opsi.paguPenyusunUsd, opsi.log, KRITIKUS_TERKUNCI_A1), siapLlm)
        : templat
          ? mesinTemplatSungguhan(panggilSungguhan(opsi.akar, opsi.paguPenyusunUsd, opsi.log, KRITIKUS_TERKUNCI_A1), siapLlm)
          : mesinSungguhan(opsi.akar, opsi.paguPenyusunUsd, siapLlm, opsi.log));
  const alur: KonteksAlur = {
    akar: opsi.akar,
    folderKeluaran: periksaFolderKeluaran(opsi.folderKeluaran),
    jam: opsi.jam,
    log: opsi.log,
    paguPenyusunUsd: opsi.paguPenyusunUsd,
    proses,
    gudang,
    mesin,
    jalan: new Map(),
    daftarAliran: (j) => aliran.set(j.data.id, j.aliran),
    ...(demo === null ? {} : { demo: { id: demo.id, pagu_usd: typeof demo.keadaanRekaman['pagu_jalan_usd'] === 'number' ? demo.keadaanRekaman['pagu_jalan_usd'] : 0.6 } }),
  };
  let tayang: KeadaanTayang | null = null;
  if (rekaman !== null) {
    const jam = opsiMentah.tayangUlang?.jam ?? jamSungguhan();
    tayang = { rekaman, jam, virtual: jam instanceof JamVirtual ? jam : null, pemutar: { terkirim: 0, selesai: false }, status: statusRekaman(rekaman, opsi.akar) };
  }
  let keadaanDemo: KeadaanDemo | null = null;
  if (demo !== null && od !== undefined) {
    const jam = od.jam ?? jamSungguhan();
    keadaanDemo = {
      demo,
      jam,
      virtual: jam instanceof JamVirtual ? jam : null,
      status: statusDemo(demo, opsi.akar, od.paguUjiUlangUsd),
      jalanHidup: null,
      noPerkiraan: demo.rekaman.peristiwa.find((p) => p.tahap === 'perkiraan')?.no ?? 0,
      pemutar: { terkirim: 0, selesai: false },
      pemutarUji: { terkirim: 0, selesai: false },
    };
  }
  // Pelari hanya ada di tampilan AI agent; ia baru dinyalakan oleh POST /api/agen/jalankan.
  const pelari = agen === null ? null : (opsiMentah.agenLangsung?.pelari ?? pelariSungguhan(opsiMentah.akar));
  const keadaan: KeadaanServer = { opsi, aliran, gudang, alur, tayang, demo: keadaanDemo, agen, pelari, langsung: null };
  const server = createServer((req, res) => {
    void layani(req, res, keadaan);
  });
  return { server, keadaan };
}

/**
 * Mode tayang ulang hanya melayani: halaman, status, potret & aliran jalan yang
 * direkam, dan (bila jam virtual) `POST /api/tayang/maju`. Tindakan lain —
 * siapkan, mulai, sunting, uji ulang, setujui, tolak, ambil data — ditolak 409.
 */
/**
 * Mode demo: tanpa ambil data Sectors (kredit), tanpa agen sungguhan, tanpa
 * penyetuju lama; tahap 1–4, persetujuan klik (memutar log), panel penyetuju
 * demo, dan jam virtual (perekam) saja.
 */
const POST_DEMO = new Set(['/api/periksa-tanggal', '/api/siapkan', '/api/demo/sunting', '/api/demo/uji-ulang', '/api/demo/setujui', '/api/demo/tolak']);
function jagaDemo(metode: string, jalur: string, d: KeadaanDemo): void {
  if (metode !== 'POST') return;
  if (jalur === '/api/tayang/maju' && d.virtual !== null) return;
  if (POST_DEMO.has(jalur) || /^\/api\/jalan\/[^/]+\/mulai$/.test(jalur)) return;
  throw new GalatPermintaan(409, 'Mode demo: tindakan ini tidak tersedia (tanpa ambil data Sectors, tanpa agen sungguhan; penyetuju lewat panel demo).');
}

/**
 * Tampilan AI agent hanya melayani: halaman, status, aliran rekaman agent, dan
 * empat rute "Jalankan Runut Agent" (M-PN1). Semua POST dan rute API lain
 * ditolak 409 — halaman penyusun lama tidak bisa dipicu dari sini.
 */
const GET_AGEN = new Set(['/api/status', '/api/agen/aliran', '/api/agen/siap', '/api/agen/langsung/aliran']);
const POST_AGEN = new Set(['/api/agen/jalankan', '/api/agen/hentikan']);
function jagaReplayAgen(metode: string, jalur: string): void {
  const tolak = (): never => {
    throw new GalatPermintaan(409, 'Tampilan AI agent: tindakan ini tidak tersedia di sini; tidak ada yang dijalankan dan tidak ada panggilan model.');
  };
  if (metode === 'POST' && !POST_AGEN.has(jalur)) tolak();
  if (metode === 'GET' && jalur.startsWith('/api/') && !GET_AGEN.has(jalur)) tolak();
}

function jagaTayang(metode: string, jalur: string, t: KeadaanTayang): void {
  const tolak = (): never => {
    throw new GalatPermintaan(409, `Mode tayang ulang: ini rekaman jalan ${t.rekaman.id}; tidak ada tindakan yang dijalankan dan tidak ada panggilan model.`);
  };
  if (metode === 'POST') {
    if (jalur === '/api/tayang/maju' && t.virtual !== null) return;
    tolak();
  }
  if (metode !== 'GET') return;
  const m = /^\/api\/jalan\/([^/]+)(\/aliran)?$/.exec(jalur);
  if (m !== null && decodeURIComponent(m[1] ?? '') !== t.rekaman.id) throw new GalatPermintaan(404, 'Jalan tidak dikenal.');
  if (jalur.startsWith('/api/') && jalur !== '/api/status' && m === null) tolak();
}

async function layani(req: IncomingMessage, res: ServerResponse, keadaan: KeadaanServer): Promise<void> {
  const metode = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  try {
    if (!hostSah(req.headers.host)) throw new GalatPermintaan(403, 'Host tidak dikenal; pintu penyusun hanya melayani 127.0.0.1.');
    if (keadaan.tayang !== null) jagaTayang(metode, url.pathname, keadaan.tayang);
    if (keadaan.demo !== null) jagaDemo(metode, url.pathname, keadaan.demo);
    if (keadaan.agen !== null) jagaReplayAgen(metode, url.pathname);
    if (metode === 'GET') {
      // Mode replay agent: halaman utama = tampilan AI agent.
      const berkas = keadaan.agen !== null && (url.pathname === '/' || url.pathname === '/index.html') ? 'agen.html' : BERKAS_HALAMAN[url.pathname];
      if (berkas !== undefined) {
        sajikanHalaman(res, berkas);
        return;
      }
      const r = cocokkan(ruteGet, url.pathname);
      if (r === null) throw new GalatPermintaan(404, 'Tidak ada.');
      await r.f(req, res, { keadaan, url, badan: null, bagian: r.bagian });
      return;
    }
    if (metode === 'POST') {
      const jenis = String(req.headers['content-type'] ?? '');
      if (!/^application\/json\b/i.test(jenis)) throw new GalatPermintaan(415, 'POST harus berjenis application/json.');
      const asal = req.headers.origin;
      if (asal !== undefined && asal !== `http://${String(req.headers.host)}`) throw new GalatPermintaan(403, 'Asal permintaan bukan halaman ini.');
      const r = cocokkan(rutePost, url.pathname);
      if (r === null) throw new GalatPermintaan(404, 'Tidak ada.');
      const badan = await bacaBadan(req);
      await r.f(req, res, { keadaan, url, badan, bagian: r.bagian });
      return;
    }
    throw new GalatPermintaan(405, 'Metode tidak didukung.');
  } catch (galat) {
    if (res.headersSent) {
      res.end();
      return;
    }
    if (galat instanceof GalatPermintaan || galat instanceof GalatAlur || galat instanceof GalatDemo) {
      kirimJson(res, galat.status, { galat: galat.message });
      return;
    }
    // Pesan galat tak dikenal TIDAK diteruskan (bisa berasal dari pustaka mana pun); hanya namanya.
    const nama = galat instanceof Error ? galat.name : 'galat tak dikenal';
    keadaan.opsi.log(`galat ${metode} ${url.pathname}: ${nama}`);
    kirimJson(res, 500, { galat: `Galat di server (${nama}); lihat terminal.` });
  }
}

/** Dengarkan di 127.0.0.1 saja. `port` 0 = port bebas (tes). */
export function dengarkan(server: Server, port: number): Promise<number> {
  return new Promise((selesai, gagal) => {
    server.once('error', gagal);
    server.listen(port, HOST, () => {
      const a = server.address();
      selesai(typeof a === 'object' && a !== null ? a.port : port);
    });
  });
}

/* ---------------------------------------------------------------------- */
/* baris perintah                                                          */
/* ---------------------------------------------------------------------- */

export interface ArgumenServer {
  port: number;
  palsu: boolean;
  paguPenyusunUsd: number;
  keluaran: string;
  mesin: NamaMesin;
  /** M2d-13: `--penulis` untuk `--mesin bebas`. */
  penulis: NamaPenulis | null;
  /** M2d-15: `--prompt v1|v2` untuk `--mesin bebas` (v2 hanya penulis opus). */
  prompt: VersiPrompt | null;
  /** M2d-12: folder jalan yang diputar ulang (`--tayang-ulang <folder>`). */
  tayangUlang: string | null;
  /** M2d-12: jam virtual untuk perekam bingkai (`--jam-virtual`). */
  jamVirtual: boolean;
  /** M2d-14: `--demo <folder jalan> --draf <pilihan> --suntingan <berkas> [--pagu-uji-ulang <usd>]`. */
  demo: { folder: string; draf: string; suntingan: string | null; paguUjiUlangUsd: number | null } | null;
  /**
   * Tampilan AI agent (replay rekaman) di halaman utama. BAWAAN `npm run penyusun`
   * (M2d-32 D-8): benar kecuali ada `--mesin-lama`, `--demo`, atau `--tayang-ulang`.
   * `--replay-agent` tetap diterima dan berarti sama dengan bawaan.
   */
  replayAgen: boolean;
  /** `--mesin-lama`: halaman penyusun lama (mesin M2d-8…M2d-15), bukan tampilan AI agent. */
  mesinLama: boolean;
  /**
   * `--pelari-tiruan` (M-PN1 D-3): "Jalankan Runut Agent" memakai PELARI TIRUAN — menyalin jejak yang sudah
   * ada dengan jeda, tanpa panggilan model. Halaman memasang pita "PELARI TIRUAN — bukan agent sungguhan"
   * selama bendera ini dipakai. Hanya berlaku di tampilan AI agent.
   */
  pelariTiruan: boolean;
}

/** Jejak yang disalin pelari tiruan (`--pelari-tiruan`): percobaan susun dari kode saham yang sudah ada di repo. */
export const SUMBER_PELARI_TIRUAN = 'eval/penyusun/m2d26-amag-1';
/** Jeda antar-baris pelari tiruan. */
export const JEDA_PELARI_TIRUAN_MS = 700;

/**
 * Tanpa bendera mode: tampilan AI agent (M2d-32 D-8). `--mesin-lama` membuka halaman penyusun lama;
 * `--palsu`, `--mesin`, `--penulis`, `--prompt` hanya berlaku bersamanya.
 * `--port <n>`, `--pagu-penyusun <usd>`, `--palsu`, `--keluaran <folder>`, `--mesin lingkar|templat` (M2d-10),
 * `--tayang-ulang <folder jalan>` dan `--jam-virtual` (M2d-12).
 * `--host` sengaja DITOLAK: server ini hanya untuk 127.0.0.1.
 */
export function uraiArgumen(argv: readonly string[], akar: string = AKAR_REPO): ArgumenServer {
  const hasil: ArgumenServer = { port: PORT_BAWAAN, palsu: false, paguPenyusunUsd: PAGU_PENYUSUN_BAWAAN, keluaran: join(akar, 'eval', 'penyusun'), mesin: 'lingkar', penulis: null, prompt: null, tayangUlang: null, jamVirtual: false, demo: null, replayAgen: false, mesinLama: false, pelariTiruan: false };
  let replayDiminta = false;
  /** Bendera milik halaman lama yang dipakai (untuk pesan galat bila `--mesin-lama` tidak ada). */
  const milikLama: string[] = [];
  let draf: string | null = null;
  let suntingan: string | null = null;
  let paguUji: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const nilai = argv[i + 1];
    if (a === '--host' || a?.startsWith('--host=') === true) throw new Error('--host tidak didukung: pintu penyusun hanya mendengar di 127.0.0.1.');
    if (a === '--palsu' || a === '--mesin' || a === '--penulis' || a === '--prompt') milikLama.push(a);
    if (a === '--palsu') hasil.palsu = true;
    else if (a === '--mesin-lama') hasil.mesinLama = true;
    else if (a === '--port' && nilai !== undefined) {
      const n = Number(nilai);
      if (!Number.isInteger(n) || n < 0 || n > 65535) throw new Error('--port harus bilangan 0–65535.');
      hasil.port = n;
      i++;
    } else if (a === '--pagu-penyusun' && nilai !== undefined) {
      const n = Number(nilai);
      if (!Number.isFinite(n) || n <= 0) throw new Error('--pagu-penyusun harus angka dolar positif.');
      hasil.paguPenyusunUsd = n;
      i++;
    } else if (a === '--mesin' && nilai !== undefined) {
      if (nilai !== 'lingkar' && nilai !== 'templat' && nilai !== 'templat-m2d11' && nilai !== 'bebas') throw new Error('--mesin harus "lingkar" (M2d-8), "templat" (M2d-10), "templat-m2d11" (M2d-11), atau "bebas" (M2d-13).');
      hasil.mesin = nilai;
      i++;
    } else if (a === '--penulis' && nilai !== undefined) {
      if (!(NAMA_PENULIS_BEBAS as readonly string[]).includes(nilai)) throw new Error('--penulis harus "opus", "haiku", atau "deepseek" (M2d-13).');
      hasil.penulis = nilai as NamaPenulis;
      i++;
    } else if (a === '--prompt' && nilai !== undefined) {
      if (nilai !== 'v1' && nilai !== 'v2') throw new Error('--prompt harus "v1" (M2d-13) atau "v2" (M2d-15).');
      hasil.prompt = nilai;
      i++;
    } else if (a === '--keluaran' && nilai !== undefined) {
      hasil.keluaran = nilai;
      i++;
    } else if (a === '--tayang-ulang' && nilai !== undefined) {
      hasil.tayangUlang = nilai;
      i++;
    } else if (a === '--jam-virtual') hasil.jamVirtual = true;
    else if (a === '--replay-agent') replayDiminta = true;
    else if (a === '--pelari-tiruan') hasil.pelariTiruan = true;
    else if (a === '--demo' && nilai !== undefined) {
      hasil.demo = { folder: nilai, draf: 'akhir', suntingan: null, paguUjiUlangUsd: null };
      i++;
    } else if (a === '--draf' && nilai !== undefined) {
      draf = nilai;
      i++;
    } else if (a === '--suntingan' && nilai !== undefined) {
      suntingan = nilai;
      i++;
    } else if (a === '--pagu-uji-ulang' && nilai !== undefined) {
      const n = Number(nilai);
      if (!Number.isFinite(n) || n <= 0 || n > PAGU_UJI_ULANG_MAKS_USD) throw new Error(`--pagu-uji-ulang harus angka dolar > 0 dan ≤ ${String(PAGU_UJI_ULANG_MAKS_USD)}.`);
      paguUji = n;
      i++;
    } else throw new Error(`Argumen tidak dikenal: ${String(a)}`);
  }
  if (hasil.demo === null && (draf !== null || suntingan !== null || paguUji !== null)) throw new Error('--draf, --suntingan, dan --pagu-uji-ulang hanya berlaku bersama --demo <folder jalan>.');
  if (hasil.demo !== null) {
    if (suntingan === null) throw new Error('--demo butuh --suntingan <berkas suntingan penyetuju>.');
    if (hasil.tayangUlang !== null || hasil.palsu) throw new Error('--demo tidak bisa digabung dengan --tayang-ulang atau --palsu.');
    hasil.demo = { ...hasil.demo, draf: draf ?? 'akhir', suntingan, paguUjiUlangUsd: paguUji };
  }
  if (replayDiminta && (hasil.demo !== null || hasil.tayangUlang !== null || hasil.palsu || hasil.mesinLama)) throw new Error('--replay-agent tidak bisa digabung dengan --demo, --tayang-ulang, --palsu, atau --mesin-lama.');
  if (hasil.mesinLama && (hasil.demo !== null || hasil.tayangUlang !== null)) throw new Error('--mesin-lama tidak bisa digabung dengan --demo atau --tayang-ulang.');
  if (!hasil.mesinLama && hasil.demo === null && hasil.tayangUlang === null && milikLama.length > 0) {
    throw new Error(`${milikLama.join(', ')} hanya berlaku bersama --mesin-lama (tanpa bendera itu pintu penyusun membuka tampilan AI agent).`);
  }
  hasil.replayAgen = !hasil.mesinLama && hasil.demo === null && hasil.tayangUlang === null;
  if (hasil.pelariTiruan && !hasil.replayAgen) throw new Error('--pelari-tiruan hanya berlaku di tampilan AI agent (tanpa --mesin-lama, --demo, atau --tayang-ulang).');
  if (hasil.mesin === 'bebas' && hasil.penulis === null) throw new Error('--mesin bebas butuh --penulis opus|haiku|deepseek (M2d-13).');
  if (hasil.penulis !== null && hasil.mesin !== 'bebas') throw new Error('--penulis hanya berlaku bersama --mesin bebas.');
  if (hasil.prompt !== null && hasil.mesin !== 'bebas') throw new Error('--prompt hanya berlaku bersama --mesin bebas.');
  if (hasil.prompt === 'v2' && hasil.penulis !== 'opus') throw new Error('--prompt v2 (M2d-15) hanya untuk --penulis opus.');
  if (hasil.jamVirtual && hasil.tayangUlang === null && hasil.demo === null) throw new Error('--jam-virtual hanya berlaku bersama --tayang-ulang <folder jalan> atau --demo <folder jalan>.');
  return hasil;
}

async function utama(): Promise<number> {
  const arg = uraiArgumen(process.argv.slice(2));
  const { server } = buatAplikasi({
    akar: AKAR_REPO,
    folderKeluaran: arg.keluaran,
    jam: () => new Date(),
    log: (b) => console.log(b),
    paguPenyusunUsd: arg.paguPenyusunUsd,
    palsu: arg.palsu,
    namaMesin: arg.mesin,
    ...(arg.penulis === null ? {} : { penulisBebas: arg.penulis }),
    ...(arg.prompt === null ? {} : { promptBebas: arg.prompt }),
    ...(arg.tayangUlang === null ? {} : { tayangUlang: { folder: arg.tayangUlang, ...(arg.jamVirtual ? { jam: new JamVirtual() } : {}) } }),
    ...(arg.demo === null || arg.demo.suntingan === null
      ? {}
      : { demo: { folder: arg.demo.folder, draf: arg.demo.draf, suntingan: arg.demo.suntingan, paguUjiUlangUsd: arg.demo.paguUjiUlangUsd, ...(arg.jamVirtual ? { jam: new JamVirtual() } : {}) } }),
    ...(arg.replayAgen ? { replayAgen: {} } : {}),
    // Pelari tiruan menulis ke folder sementara, tidak pernah ke eval/.
    ...(arg.pelariTiruan ? { agenLangsung: { pelari: pelariTiruan({ folderDasar: mkdtempSync(join(tmpdir(), 'penyusun-pelari-tiruan-')), sumber: join(AKAR_REPO, SUMBER_PELARI_TIRUAN), jedaMs: JEDA_PELARI_TIRUAN_MS }) } } : {}),
  });
  const port = await dengarkan(server, arg.port);
  if (arg.replayAgen) {
    console.log(`Pintu penyusun — AI AGENT: http://${HOST}:${String(port)}/`);
    if (arg.pelariTiruan) {
      console.log(`PELARI TIRUAN — bukan agent sungguhan: "Jalankan Runut Agent" menyalin jejak ${SUMBER_PELARI_TIRUAN} dengan jeda. Tanpa panggilan model, tanpa biaya.`);
    } else {
      console.log('Jalankan Runut Agent: pelari yang sama dengan `npm run agen` (berbayar; butuh .env; hanya sesudah klik setuju di halaman). Keluarannya tampil di terminal ini.');
    }
    console.log('Putar ulang rekaman: dibaca dari berkas di repo. Tanpa panggilan model, tanpa Sectors, tanpa API key, tanpa biaya.');
    console.log('Halaman penyusun lama: npm run penyusun -- --mesin-lama');
    return 0;
  }
  if (arg.demo !== null) {
    console.log(`Pintu penyusun — MODE DEMO ${arg.demo.folder} (draf ${arg.demo.draf})${arg.jamVirtual ? ' (jam virtual)' : ''}: http://${HOST}:${String(port)}/`);
    console.log(
      `Tahap 1–4 hidup tanpa biaya model; tahap agen diputar dari log; penyetuju hidup. Gerbang AI ${arg.demo.paguUjiUlangUsd === null ? 'TIDAK diuji ulang (tanpa --pagu-uji-ulang; hasil tersimpan tetap diputar)' : `diuji ulang sungguhan, pagu US$${arg.demo.paguUjiUlangUsd.toFixed(2)} (tag ${AWALAN_TAG_DEMO})`}.`,
    );
    return 0;
  }
  if (arg.tayangUlang !== null) {
    console.log(`Pintu penyusun — TAYANG ULANG ${arg.tayangUlang}${arg.jamVirtual ? ' (jam virtual: maju lewat POST /api/tayang/maju)' : ''}: http://${HOST}:${String(port)}/`);
    console.log('Tanpa panggilan model, tanpa Sectors, tanpa tulisan ke folder jalan. Muat ulang halaman untuk memutar dari awal.');
    return 0;
  }
  console.log(`Pintu penyusun${arg.palsu ? ' (MODE PALSU: agen & Sectors palsu, tanpa jaringan)' : ''}, mesin ${arg.mesin}${arg.penulis === null ? '' : ` (penulis ${arg.penulis}${arg.prompt === 'v2' ? ', prompt v2 M2d-15' : ''})`}: http://${HOST}:${String(port)}/`);
  console.log(`Hanya mendengar di ${HOST}. Hentikan dengan Ctrl+C.`);
  return 0;
}

const dijalankanLangsung = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dijalankanLangsung) {
  utama().catch((galat: unknown) => {
    console.error(galat instanceof Error ? galat.message : String(galat));
    process.exitCode = 1;
  });
}
