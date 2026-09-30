/**
 * Pintu penyusun lokal (M2d-9): `npm run penyusun`.
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
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pengambilSungguhan, type Pengambil } from '../sectors.ts';
import { Aliran, sambungSse } from './aliran.ts';
import { ambilJalan, GalatAlur, mulai, potret, setujui, siapkan, sunting, tolak, ujiUlang, type KonteksAlur } from './alur.ts';
import { PAGU_PENYUSUN_BAWAAN, jalurBukuKas, ringkasBiaya } from './biaya.ts';
import { ambilDataEmiten, perkiraanKredit, PemuatGudang } from './emiten.ts';
import { statusKonfig } from './konfig.ts';
import { periksaFolderKeluaran } from './jalan.ts';
import { mesinSungguhan, panggilSungguhan, type MesinPenulis } from './mesin.ts';
import { mesinTemplatPalsu, mesinTemplatSungguhan } from './mesin-templat.ts';
import { mesinPalsu, pengambilPalsu } from './palsu.ts';
import { periksaTanggal } from './tanggal.ts';
import { jendelaSah, kodeSah, usulkanHari } from './usulan.ts';

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
}

export type NamaMesin = 'lingkar' | 'templat';

export interface KeadaanServer {
  opsi: OpsiServer;
  aliran: Map<string, Aliran>;
  gudang: PemuatGudang;
  alur: KonteksAlur;
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
  if (j === null) throw new GalatPermintaan(400, 'Jendela "sesudahnya" harus bilangan bulat 5–20 hari bursa.');
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
  const j = ambilJalan(keadaan.alur, bagian[0] ?? '');
  kirimJson(res, 200, potret(keadaan.alur, j));
});

/** D-4: persetujuan klik atas perkiraan biaya → agen berjalan (berbayar). */
daftarRute('POST', '/api/jalan/:id/mulai', (_req, res, { keadaan, bagian, badan }) => {
  const b = bacaBadanObyek(badan);
  const j = ambilJalan(keadaan.alur, bagian[0] ?? '');
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

daftarRute('GET', '/api/jalan/:id/aliran', (req, res, { keadaan, bagian }) => {
  const id = bagian[0] ?? '';
  let a = keadaan.aliran.get(id);
  if (a === undefined) {
    try {
      a = ambilJalan(keadaan.alur, id).aliran;
    } catch {
      a = undefined;
    }
  }
  if (a === undefined) throw new GalatPermintaan(404, 'Jalan tidak dikenal.');
  const dari = Number(req.headers['last-event-id'] ?? new URL(req.url ?? '/', 'http://x').searchParams.get('sesudah') ?? 0);
  sambungSse(res, a, Number.isFinite(dari) && dari > 0 ? dari : 0);
});

/* ---------------------------------------------------------------------- */
/* aplikasi                                                                */
/* ---------------------------------------------------------------------- */

export function buatAplikasi(opsi: OpsiServer): { server: Server; keadaan: KeadaanServer } {
  const aliran = new Map<string, Aliran>();
  const gudang = new PemuatGudang(opsi.folderGudang ?? join(opsi.akar, '.cache', 'sectors'));
  const proses = opsi.proses ?? process.env;
  const siapLlm = (): { siap: boolean; alasan: string | null } => {
    const k = statusKonfig(opsi.akar, proses);
    return k.llm.siap ? { siap: true, alasan: null } : { siap: false, alasan: `Kunci OpenRouter belum siap: ${[...k.llm.hilang.map((n) => `isi ${n} di .env`), ...k.llm.catatan].join('; ')}.` };
  };
  const templat = opsi.namaMesin === 'templat';
  const mesin =
    opsi.mesin ??
    (opsi.palsu
      ? templat
        ? mesinTemplatPalsu()
        : mesinPalsu()
      : templat
        ? mesinTemplatSungguhan(panggilSungguhan(opsi.akar, opsi.paguPenyusunUsd, opsi.log), siapLlm)
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
  };
  const keadaan: KeadaanServer = { opsi, aliran, gudang, alur };
  const server = createServer((req, res) => {
    void layani(req, res, keadaan);
  });
  return { server, keadaan };
}

async function layani(req: IncomingMessage, res: ServerResponse, keadaan: KeadaanServer): Promise<void> {
  const metode = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  try {
    if (!hostSah(req.headers.host)) throw new GalatPermintaan(403, 'Host tidak dikenal; pintu penyusun hanya melayani 127.0.0.1.');
    if (metode === 'GET') {
      const berkas = BERKAS_HALAMAN[url.pathname];
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
    if (galat instanceof GalatPermintaan || galat instanceof GalatAlur) {
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
}

/**
 * `--port <n>`, `--pagu-penyusun <usd>`, `--palsu`, `--keluaran <folder>`, `--mesin lingkar|templat` (M2d-10).
 * `--host` sengaja DITOLAK: server ini hanya untuk 127.0.0.1.
 */
export function uraiArgumen(argv: readonly string[], akar: string = AKAR_REPO): ArgumenServer {
  const hasil: ArgumenServer = { port: PORT_BAWAAN, palsu: false, paguPenyusunUsd: PAGU_PENYUSUN_BAWAAN, keluaran: join(akar, 'eval', 'penyusun'), mesin: 'lingkar' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const nilai = argv[i + 1];
    if (a === '--host' || a?.startsWith('--host=') === true) throw new Error('--host tidak didukung: pintu penyusun hanya mendengar di 127.0.0.1.');
    if (a === '--palsu') hasil.palsu = true;
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
      if (nilai !== 'lingkar' && nilai !== 'templat') throw new Error('--mesin harus "lingkar" (M2d-8) atau "templat" (M2d-10).');
      hasil.mesin = nilai;
      i++;
    } else if (a === '--keluaran' && nilai !== undefined) {
      hasil.keluaran = nilai;
      i++;
    } else throw new Error(`Argumen tidak dikenal: ${String(a)}`);
  }
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
  });
  const port = await dengarkan(server, arg.port);
  console.log(`Pintu penyusun${arg.palsu ? ' (MODE PALSU: agen & Sectors palsu, tanpa jaringan)' : ''}, mesin ${arg.mesin}: http://${HOST}:${String(port)}/`);
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
