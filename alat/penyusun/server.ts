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
import { extname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pengambilSungguhan, type Pengambil } from '../sectors.ts';
import { Aliran, sambungSse } from './aliran.ts';
import { ambilJalan, GalatAlur, mulai, potret, setujui, siapkan, sunting, tolak, ujiUlang, type KonteksAlur } from './alur.ts';
import { PAGU_PENYUSUN_BAWAAN, jalurBukuKas, ringkasBiaya } from './biaya.ts';
import { ambilDataEmiten, perkiraanKredit, PemuatGudang } from './emiten.ts';
import { statusKonfig } from './konfig.ts';
import { periksaFolderKeluaran } from './jalan.ts';
import { mesinSungguhan, panggilSungguhan, type MesinPenulis } from './mesin.ts';
import { KRITIKUS_TERKUNCI_A1, mesinTemplatM2d11Palsu, mesinTemplatM2d11Sungguhan, mesinTemplatPalsu, mesinTemplatSungguhan } from './mesin-templat.ts';
import { mesinPalsu, pengambilPalsu } from './palsu.ts';
import { periksaTanggal } from './tanggal.ts';
import { jendelaSah, kodeSah, usulkanHari } from './usulan.ts';
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
  /**
   * M2d-12: mode tayang ulang — putar `aliran.jsonl` satu jalan yang sudah
   * terjadi. Tanpa model, tanpa Sectors, tanpa tulisan ke folder jalan.
   * `jam`: bawaan jam sungguhan; perekam memakai `JamVirtual`.
   */
  tayangUlang?: { folder: string; jam?: JamTayang };
}

export type NamaMesin = 'lingkar' | 'templat' | 'templat-m2d11';

export interface KeadaanTayang {
  rekaman: Rekaman;
  jam: JamTayang;
  /** Ada hanya bila jam virtual (perekam): `POST /api/tayang/maju`. */
  virtual: JamVirtual | null;
  pemutar: PemutarTayang;
  status: Record<string, unknown>;
}

export interface KeadaanServer {
  opsi: OpsiServer;
  aliran: Map<string, Aliran>;
  gudang: PemuatGudang;
  alur: KonteksAlur;
  tayang: KeadaanTayang | null;
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
  if (keadaan.tayang !== null) {
    kirimJson(res, 200, { mode: 'tayang-ulang', hari_ini: o.jam().toISOString().slice(0, 10), rekaman: keadaan.tayang.status });
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

/** M2d-12: perekam bingkai memajukan jam virtual tayang ulang (hanya `--jam-virtual`). */
daftarRute('POST', '/api/tayang/maju', async (_req, res, { keadaan, badan }) => {
  const t = keadaan.tayang;
  if (t === null || t.virtual === null) throw new GalatPermintaan(409, 'Jam virtual hanya ada di mode tayang ulang dengan --jam-virtual.');
  const ms = Number(bacaBadanObyek(badan)['ms']);
  if (!Number.isFinite(ms) || ms < 0 || ms > 60_000) throw new GalatPermintaan(400, 'ms harus 0–60000.');
  const waktu = await t.virtual.maju(ms);
  kirimJson(res, 200, { waktu_ms: waktu, terkirim: t.pemutar.terkirim, selesai: t.pemutar.selesai, jumlah: t.rekaman.peristiwa.length });
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
function catatanRekaman(id: string): { persetujuan: string | null; sesudah: string[]; sumber: string | null } {
  if (!existsSync(JALUR_CATATAN)) return { persetujuan: null, sesudah: [], sumber: null };
  const semua = JSON.parse(readFileSync(JALUR_CATATAN, 'utf8')) as { jalan?: Record<string, { persetujuan?: string; sesudah?: string[]; sumber?: string }> };
  const c = semua.jalan?.[id];
  return { persetujuan: c?.persetujuan ?? null, sesudah: c?.sesudah ?? [], sumber: c?.sumber ?? null };
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
  // Tayang ulang: tanpa jaringan (palsu), folder keluaran = induk folder jalan (hanya dibaca), mesin pengganti.
  const opsi: OpsiServer = rekaman === null ? opsiMentah : { ...opsiMentah, palsu: true, folderKeluaran: rekaman.folderInduk, mesin: mesinRekaman() };
  const aliran = new Map<string, Aliran>();
  const gudang = new PemuatGudang(opsi.folderGudang ?? join(opsi.akar, '.cache', 'sectors'));
  const proses = opsi.proses ?? process.env;
  const siapLlm = (): { siap: boolean; alasan: string | null } => {
    const k = statusKonfig(opsi.akar, proses);
    return k.llm.siap ? { siap: true, alasan: null } : { siap: false, alasan: `Kunci OpenRouter belum siap: ${[...k.llm.hilang.map((n) => `isi ${n} di .env`), ...k.llm.catatan].join('; ')}.` };
  };
  const templat = opsi.namaMesin === 'templat';
  const m2d11 = opsi.namaMesin === 'templat-m2d11';
  const mesin =
    opsi.mesin ??
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
  };
  let tayang: KeadaanTayang | null = null;
  if (rekaman !== null) {
    const jam = opsiMentah.tayangUlang?.jam ?? jamSungguhan();
    tayang = { rekaman, jam, virtual: jam instanceof JamVirtual ? jam : null, pemutar: { terkirim: 0, selesai: false }, status: statusRekaman(rekaman, opsi.akar) };
  }
  const keadaan: KeadaanServer = { opsi, aliran, gudang, alur, tayang };
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
  /** M2d-12: folder jalan yang diputar ulang (`--tayang-ulang <folder>`). */
  tayangUlang: string | null;
  /** M2d-12: jam virtual untuk perekam bingkai (`--jam-virtual`). */
  jamVirtual: boolean;
}

/**
 * `--port <n>`, `--pagu-penyusun <usd>`, `--palsu`, `--keluaran <folder>`, `--mesin lingkar|templat` (M2d-10),
 * `--tayang-ulang <folder jalan>` dan `--jam-virtual` (M2d-12).
 * `--host` sengaja DITOLAK: server ini hanya untuk 127.0.0.1.
 */
export function uraiArgumen(argv: readonly string[], akar: string = AKAR_REPO): ArgumenServer {
  const hasil: ArgumenServer = { port: PORT_BAWAAN, palsu: false, paguPenyusunUsd: PAGU_PENYUSUN_BAWAAN, keluaran: join(akar, 'eval', 'penyusun'), mesin: 'lingkar', tayangUlang: null, jamVirtual: false };
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
      if (nilai !== 'lingkar' && nilai !== 'templat' && nilai !== 'templat-m2d11') throw new Error('--mesin harus "lingkar" (M2d-8), "templat" (M2d-10), atau "templat-m2d11" (M2d-11).');
      hasil.mesin = nilai;
      i++;
    } else if (a === '--keluaran' && nilai !== undefined) {
      hasil.keluaran = nilai;
      i++;
    } else if (a === '--tayang-ulang' && nilai !== undefined) {
      hasil.tayangUlang = nilai;
      i++;
    } else if (a === '--jam-virtual') hasil.jamVirtual = true;
    else throw new Error(`Argumen tidak dikenal: ${String(a)}`);
  }
  if (hasil.jamVirtual && hasil.tayangUlang === null) throw new Error('--jam-virtual hanya berlaku bersama --tayang-ulang <folder jalan>.');
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
    ...(arg.tayangUlang === null ? {} : { tayangUlang: { folder: arg.tayangUlang, ...(arg.jamVirtual ? { jam: new JamVirtual() } : {}) } }),
  });
  const port = await dengarkan(server, arg.port);
  if (arg.tayangUlang !== null) {
    console.log(`Pintu penyusun — TAYANG ULANG ${arg.tayangUlang}${arg.jamVirtual ? ' (jam virtual: maju lewat POST /api/tayang/maju)' : ''}: http://${HOST}:${String(port)}/`);
    console.log('Tanpa panggilan model, tanpa Sectors, tanpa tulisan ke folder jalan. Muat ulang halaman untuk memutar dari awal.');
    return 0;
  }
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
