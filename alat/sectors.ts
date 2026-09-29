/**
 * Pengambil data Sectors (M4a D-1): `npm run sectors:ambil`.
 *
 * Sebelum milestone ini data gudang diambil dengan skrip pribadi di luar repo,
 * jadi juri tidak bisa mengulang pengambilannya. Modul ini memindahkan
 * perilaku skrip itu ke repo, dengan Node bawaan saja:
 *
 * - Kunci dibaca **oleh kode** dari `.env` (`SECTORS_API_KEY`) dan hanya pernah
 *   berpindah ke header `Authorization`. Tidak ada pesan, baris buku kas, atau
 *   berkas yang memuat nilainya.
 * - **Biaya dihitung sebelum memanggil** (`biayaPanggilan`), dan panggilan yang
 *   akan melewati pagu (`SECTORS_KREDIT_PAGU`, bawaan 613 = saldo pembuka 113 +
 *   anggaran M4a 500) **tidak dikirim**.
 * - Buku kas `.cache/sectors/kredit.csv` ditulis *sebelum* panggilan (baris
 *   `cadang`) dan dikoreksi sesudahnya (baris `hasil`). Kalau proses mati di
 *   tengah panggilan, kredit tetap tercatat terpakai — salah ke arah aman.
 * - Berkas cache yang sudah ada **tidak pernah ditimpa**: panggilannya dilewati
 *   dengan biaya 0. Berkas ditulis dengan bendera `wx`, jadi penimpaan gagal
 *   keras walaupun pemeriksaan di depan terlewat.
 * - Status 400/401/403/429/≥500 tidak memakan kredit (changelog Sectors);
 *   404 memakan kredit (sumber yang dicari memang dicek, lalu tidak ada).
 * - 429 → tunggu, satu kali coba lagi. Selain 2xx dan 404, pengambil berhenti.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const AKAR = fileURLToPath(new URL('../', import.meta.url));
export const BASIS_URL = 'https://api.sectors.app';
export const FOLDER_SECTORS = join(AKAR, '.cache', 'sectors');
export const JALUR_BUKU_KAS = join(FOLDER_SECTORS, 'kredit.csv');

/** Kredit yang sudah terpakai sebelum M4a (lampiran pola panggilan: 113 dari 129 panggilan). */
export const SALDO_PEMBUKA = 113;
/** 113 terpakai + 500 anggaran M4a. */
export const PAGU_BAWAAN = 613;
/**
 * Jeda antarpanggilan jaringan; kontrak menuntut ≥ 300 ms. Jalan pertama
 * M4a memakai 350 ms dan kena 429 dua kali berturut-turut sesudah ±150
 * panggilan dalam ±100 detik (tunggu 10 detik tidak cukup), jadi jedanya
 * dilebarkan dan tunggu sesudah 429 menutup satu menit penuh.
 */
export const JEDA_MS = 800;
/** Tunggu sebelum mencoba lagi sesudah 429 bila server tidak menyebut `Retry-After`. */
export const TUNGGU_429_MS = 65_000;

// --- path dan biaya ----------------------------------------------------------

/**
 * Git Bash di Windows (MSYS) menulis ulang argumen yang diawali `/` menjadi
 * path Windows: `/v2/company/...` sampai ke program sebagai
 * `C:/Program Files/Git/v2/company/...`. Buku kas pribadi mencatat tiga
 * panggilan gagal karena ini. Kembalikan ke bentuk `/v2/...`.
 */
export function perbaikiPathMsys(path: string): string {
  const p = path.replace(/\\/g, '/');
  const cocok = /^[A-Za-z]:\/.*?(\/v\d+\/.*)$/.exec(p);
  return cocok?.[1] ?? p;
}

function bagiKoma(nilai: string | null): string[] {
  return (nilai ?? '').split(',').filter((s) => s.trim() !== '');
}

/**
 * Biaya kredit satu panggilan, dihitung dari path saja sebelum memanggil
 * (port `cost_of` skrip pribadi, lampiran `sget-docstring.txt`):
 *
 * - company report: satu kredit per section; tanpa `sections` = 8 section;
 * - quarterly financials: `n_quarters` (bawaan 1);
 * - kalender `/v2/corporate-actions/`: satu per `type`; tanpa `type` = 7;
 * - selain itu 1.
 */
export function biayaPanggilan(path: string): number {
  const url = new URL(perbaikiPathMsys(path), BASIS_URL);
  const jalur = url.pathname;
  if (jalur.includes('/company/report/')) {
    return bagiKoma(url.searchParams.get('sections')).length || 8;
  }
  if (jalur.includes('/financials/quarterly/')) {
    const n = Number.parseInt(url.searchParams.get('n_quarters') ?? '1', 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  if (jalur.replace(/\/+$/, '').endsWith('/v2/corporate-actions')) {
    return bagiKoma(url.searchParams.get('type')).length || 7;
  }
  return 1;
}

/** Status yang tidak memakan kredit menurut changelog Sectors. */
export function statusGratis(status: number): boolean {
  return status === 400 || status === 401 || status === 403 || status === 429 || status >= 500;
}

// --- buku kas ----------------------------------------------------------------

export type JenisBaris = 'saldo-pembuka' | 'cadang' | 'hasil' | 'lewat-sudah-ada' | 'ditolak-pagu';

export interface BarisBuku {
  waktu: string;
  jenis: JenisBaris;
  path: string;
  status: string;
  /** Kredit baris ini. Baris `hasil` mengoreksi `cadang` (0 atau negatif). */
  biaya: number;
  berkas: string;
}

const KEPALA_BUKU = 'waktu,jenis,path,status,biaya,berkas';

/** CSV satu sel: dikutip bila perlu. Path Sectors memuat koma (`sections=a,b`). */
function sel(nilai: string): string {
  return /[",\n\r]/.test(nilai) ? `"${nilai.replace(/"/g, '""')}"` : nilai;
}

function uraiBarisCsv(baris: string): string[] {
  const keluar: string[] = [];
  let kini = '';
  let dalamKutip = false;
  for (let i = 0; i < baris.length; i += 1) {
    const c = baris[i];
    if (dalamKutip) {
      if (c === '"' && baris[i + 1] === '"') {
        kini += '"';
        i += 1;
      } else if (c === '"') {
        dalamKutip = false;
      } else {
        kini += c;
      }
    } else if (c === '"') {
      dalamKutip = true;
    } else if (c === ',') {
      keluar.push(kini);
      kini = '';
    } else {
      kini += c;
    }
  }
  keluar.push(kini);
  return keluar;
}

export function bacaBukuKas(jalur: string): BarisBuku[] {
  if (!existsSync(jalur)) return [];
  const baris = readFileSync(jalur, 'utf8').split(/\r?\n/).filter((b) => b !== '');
  const keluar: BarisBuku[] = [];
  for (const b of baris.slice(1)) {
    const [waktu = '', jenis = '', path = '', status = '', biaya = '0', berkas = ''] = uraiBarisCsv(b);
    keluar.push({ waktu, jenis: jenis as JenisBaris, path, status, biaya: Number(biaya), berkas });
  }
  return keluar;
}

/** Kredit terpakai menurut buku kas, termasuk saldo pembuka. */
export function kreditTerpakai(baris: BarisBuku[]): number {
  return baris.reduce((jumlah, b) => jumlah + (Number.isFinite(b.biaya) ? b.biaya : 0), 0);
}

/** Buat buku kas dengan saldo pembuka bila belum ada. Buku yang ada tidak disentuh. */
export function siapkanBukuKas(jalur: string, waktu: string): void {
  if (existsSync(jalur)) return;
  mkdirSync(dirname(jalur), { recursive: true });
  const pembuka: BarisBuku = {
    waktu,
    jenis: 'saldo-pembuka',
    path: 'kredit terpakai sebelum M4a',
    status: '-',
    biaya: SALDO_PEMBUKA,
    berkas: '-',
  };
  writeFileSync(jalur, `${KEPALA_BUKU}\n${barisCsv(pembuka)}\n`, { encoding: 'utf8', flag: 'wx' });
}

function barisCsv(b: BarisBuku): string {
  return [b.waktu, b.jenis, b.path, b.status, String(b.biaya), b.berkas].map(sel).join(',');
}

function catat(jalur: string, b: BarisBuku): void {
  appendFileSync(jalur, `${barisCsv(b)}\n`, 'utf8');
}

// --- kunci -------------------------------------------------------------------

/** Uraikan isi `.env` (bentuk `NAMA=nilai`, kutip di ujung dilepas). Murni. */
export function uraiEnv(isi: string): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const baris of isi.split(/\r?\n/)) {
    const cocok = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(baris);
    if (!cocok?.[1] || cocok[2] === undefined) continue;
    hasil[cocok[1]] = cocok[2].trim().replace(/^["']|["']$/g, '');
  }
  return hasil;
}

/**
 * Baca konfigurasi dari `.env` di akar repo (nilai `.env` menang atas
 * lingkungan proses). Pesan galat hanya menyebut NAMA variabel.
 */
export function bacaKonfig(akar: string = AKAR): { kunci: string; pagu: number } {
  const jalur = join(akar, '.env');
  const env = existsSync(jalur) ? uraiEnv(readFileSync(jalur, 'utf8')) : {};
  const kunci = env['SECTORS_API_KEY'] ?? process.env['SECTORS_API_KEY'] ?? '';
  if (kunci === '') {
    throw new Error('SECTORS_API_KEY tidak ada di .env maupun lingkungan proses.');
  }
  const paguMentah = env['SECTORS_KREDIT_PAGU'] ?? process.env['SECTORS_KREDIT_PAGU'];
  const pagu = paguMentah === undefined ? PAGU_BAWAAN : Number(paguMentah);
  if (!Number.isFinite(pagu) || pagu < 0) {
    throw new Error('SECTORS_KREDIT_PAGU bukan bilangan yang sah.');
  }
  return { kunci, pagu };
}

// --- pengambil ---------------------------------------------------------------

export interface Pengambil {
  kunci: string;
  pagu: number;
  /** Folder tujuan berkas respons. */
  folder: string;
  bukuKas: string;
  fetch: (url: string, init: { headers: Record<string, string> }) => Promise<{
    status: number;
    text(): Promise<string>;
    headers: { get(nama: string): string | null };
  }>;
  jam: () => Date;
  tidur: (ms: number) => Promise<void>;
  jedaMs: number;
}

export type Akhir = 'diambil' | 'sudah-ada' | 'ditolak-pagu' | 'tidak-ada' | 'berhenti';

export interface HasilAmbil {
  akhir: Akhir;
  status: number | null;
  /** Kredit bersih yang dipakai panggilan ini. */
  biaya: number;
  berkas: string;
  path: string;
  /** Isi respons yang sudah diurai (hanya untuk `diambil` dan `sudah-ada`). */
  isi?: unknown;
  alasan?: string;
}

/** Nama berkas relatif ke folder tujuan; tidak boleh keluar dari folder. */
function jalurTujuan(folder: string, berkas: string): string {
  if (isAbsolute(berkas) || normalize(berkas).split(/[\\/]/).includes('..')) {
    throw new Error(`Nama berkas harus relatif di dalam folder cache: ${berkas}`);
  }
  if (!berkas.endsWith('.json')) throw new Error(`Nama berkas harus berakhiran .json: ${berkas}`);
  return join(folder, berkas);
}

function bacaJsonAman(teks: string): unknown {
  try {
    return JSON.parse(teks);
  } catch {
    return undefined;
  }
}

/**
 * Satu panggilan Sectors. Urutannya:
 * 1. berkas tujuan sudah ada → lewati, biaya 0;
 * 2. hitung biaya; kalau terpakai + biaya > pagu → tidak dikirim;
 * 3. catat `cadang` di buku kas, baru memanggil;
 * 4. catat `hasil` (koreksi ke 0 untuk status gratis);
 * 5. 2xx → tulis berkas (`wx`), 404 → `tidak-ada`, 429 → tunggu & sekali lagi,
 *    selebihnya → `berhenti`.
 */
export async function ambil(p: Pengambil, pathMentah: string, berkas: string): Promise<HasilAmbil> {
  const path = perbaikiPathMsys(pathMentah);
  if (!path.startsWith('/v2/')) {
    throw new Error(`Path Sectors harus diawali /v2/: ${path}`);
  }
  const tujuan = jalurTujuan(p.folder, berkas);
  siapkanBukuKas(p.bukuKas, p.jam().toISOString());

  if (existsSync(tujuan)) {
    catat(p.bukuKas, {
      waktu: p.jam().toISOString(),
      jenis: 'lewat-sudah-ada',
      path,
      status: '-',
      biaya: 0,
      berkas,
    });
    return {
      akhir: 'sudah-ada',
      status: null,
      biaya: 0,
      berkas,
      path,
      isi: bacaJsonAman(readFileSync(tujuan, 'utf8')),
    };
  }

  const biaya = biayaPanggilan(path);
  for (let percobaan = 1; percobaan <= 2; percobaan += 1) {
    const terpakai = kreditTerpakai(bacaBukuKas(p.bukuKas));
    if (terpakai + biaya > p.pagu) {
      catat(p.bukuKas, {
        waktu: p.jam().toISOString(),
        jenis: 'ditolak-pagu',
        path,
        status: '-',
        biaya: 0,
        berkas,
      });
      return {
        akhir: 'ditolak-pagu',
        status: null,
        biaya: 0,
        berkas,
        path,
        alasan: `terpakai ${terpakai} + biaya ${biaya} > pagu ${p.pagu}; panggilan tidak dikirim`,
      };
    }

    catat(p.bukuKas, { waktu: p.jam().toISOString(), jenis: 'cadang', path, status: '-', biaya, berkas });
    let status: number;
    let teks = '';
    let tunggu: string | null = null;
    try {
      const respons = await p.fetch(BASIS_URL + path, {
        headers: { Authorization: p.kunci, 'User-Agent': 'runut-sectors-hackathon/alat-sectors' },
      });
      status = respons.status;
      teks = await respons.text();
      tunggu = respons.headers.get('retry-after');
    } catch (galat) {
      // Gagal jaringan: tidak ada respons, jadi tidak ada kredit yang ditagih.
      catat(p.bukuKas, {
        waktu: p.jam().toISOString(),
        jenis: 'hasil',
        path,
        status: 'galat-jaringan',
        biaya: -biaya,
        berkas,
      });
      return {
        akhir: 'berhenti',
        status: null,
        biaya: 0,
        berkas,
        path,
        alasan: `galat jaringan: ${galat instanceof Error ? galat.name : 'tak dikenal'}`,
      };
    }
    const gratis = statusGratis(status);
    catat(p.bukuKas, {
      waktu: p.jam().toISOString(),
      jenis: 'hasil',
      path,
      status: String(status),
      biaya: gratis ? -biaya : 0,
      berkas,
    });
    await p.tidur(p.jedaMs);

    if (status >= 200 && status < 300) {
      mkdirSync(dirname(tujuan), { recursive: true });
      writeFileSync(tujuan, teks, { encoding: 'utf8', flag: 'wx' });
      return { akhir: 'diambil', status, biaya, berkas, path, isi: bacaJsonAman(teks) };
    }
    if (status === 404) {
      return { akhir: 'tidak-ada', status, biaya, berkas, path, alasan: 'Sectors menjawab 404 (sumber tidak ada)' };
    }
    if (status === 429 && percobaan === 1) {
      const detik = Number(tunggu);
      await p.tidur(Number.isFinite(detik) && detik > 0 ? Math.min(detik, 120) * 1000 : TUNGGU_429_MS);
      continue;
    }
    return {
      akhir: 'berhenti',
      status,
      biaya: 0,
      berkas,
      path,
      alasan:
        status === 401 || status === 403
          ? `Sectors menjawab ${status}: kunci tidak sah atau kuota/kredit habis`
          : status === 429
            ? 'Sectors menjawab 429 dua kali berturut-turut'
            : `Sectors menjawab ${status}`,
    };
  }
  /* c8 ignore next */
  throw new Error('tidak terjangkau');
}

/** Pengambil sungguhan: `fetch` global, jam dinding, `setTimeout`. */
export function pengambilSungguhan(akar: string = AKAR): Pengambil {
  const { kunci, pagu } = bacaKonfig(akar);
  return {
    kunci,
    pagu,
    folder: join(akar, '.cache', 'sectors'),
    bukuKas: join(akar, '.cache', 'sectors', 'kredit.csv'),
    fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(60_000) }),
    jam: () => new Date(),
    tidur: (ms) => new Promise((selesai) => setTimeout(selesai, ms)),
    jedaMs: JEDA_MS,
  };
}

/** Pengambil untuk langkah tanpa jaringan: memanggil `fetch` darinya adalah galat. */
export function pengambilTanpaKunci(akar: string = AKAR): Pengambil {
  return {
    kunci: '',
    pagu: 0,
    folder: join(akar, '.cache', 'sectors'),
    bukuKas: join(akar, '.cache', 'sectors', 'kredit.csv'),
    fetch: () => Promise.reject(new Error('langkah ini tidak boleh memanggil jaringan')),
    jam: () => new Date(),
    tidur: (ms) => new Promise((selesai) => setTimeout(selesai, ms)),
    jedaMs: JEDA_MS,
  };
}

// --- perintah ----------------------------------------------------------------

const PETUNJUK = [
  'Pemakaian:',
  '  npm run sectors:ambil -- "<path+query>" <berkas.json>',
  '      satu panggilan; berkas ditulis ke .cache/sectors/<berkas.json>',
  '  npm run sectors:ambil -- --audit <rencana|daftar|data|ringkas>',
  '      rencana audit gudang M4a (docs/bukti/audit-rencana.md)',
  '  npm run sectors:ambil -- --saldo',
  '      cetak kredit terpakai menurut .cache/sectors/kredit.csv',
  '',
  'Kunci dibaca dari .env (SECTORS_API_KEY). Pagu: SECTORS_KREDIT_PAGU (bawaan 613).',
].join('\n');

async function utama(argumen: string[]): Promise<number> {
  const [pertama, kedua] = argumen;
  if (pertama === '--saldo') {
    const baris = bacaBukuKas(JALUR_BUKU_KAS);
    const terpakai = baris.length === 0 ? SALDO_PEMBUKA : kreditTerpakai(baris);
    console.log(`kredit terpakai (termasuk saldo pembuka ${SALDO_PEMBUKA}): ${terpakai}`);
    console.log(`terpakai sejak saldo pembuka: ${terpakai - SALDO_PEMBUKA}`);
    return 0;
  }
  if (pertama === '--audit') {
    const { jalankanAudit } = await import('./audit-ambil.ts');
    // `rencana` dan `ringkas` tidak memanggil jaringan, jadi tidak membaca kunci.
    const tanpaJaringan = kedua === 'rencana' || kedua === 'ringkas';
    return jalankanAudit(tanpaJaringan ? pengambilTanpaKunci() : pengambilSungguhan(), argumen.slice(1));
  }
  if (pertama === undefined || kedua === undefined) {
    console.error(PETUNJUK);
    return 1;
  }
  const p = pengambilSungguhan();
  const hasil = await ambil(p, pertama, kedua);
  console.log(
    `${hasil.akhir} | status ${hasil.status ?? '-'} | biaya ${hasil.biaya} | ${hasil.path} -> ${hasil.berkas}` +
      (hasil.alasan ? ` | ${hasil.alasan}` : ''),
  );
  console.log(`kredit terpakai: ${kreditTerpakai(bacaBukuKas(p.bukuKas))} dari pagu ${p.pagu}`);
  return hasil.akhir === 'diambil' || hasil.akhir === 'sudah-ada' ? 0 : 1;
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dijalankanLangsung) {
  utama(process.argv.slice(2)).then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? galat.message : String(galat));
      process.exitCode = 1;
    },
  );
}
