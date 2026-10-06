/**
 * "Jalankan Runut Agent" di pintu penyusun (M-PN1): server menjalankan pelari
 * agent yang SAMA dengan `npm run agen` dan membaca `jejak-agen.jsonl` yang
 * sedang ditulisnya.
 *
 * Satu jalur kebenaran (D-1): pelari tidak ditulis ulang. Yang dilakukan di sini
 * hanya (a) menyalakan `alat/agen/jalan-agen.ts` sebagai proses anak dengan
 * argumen yang sama seperti di terminal, dan (b) membaca jejak yang tumbuh
 * lewat `PerakitLangkah` (`rekaman-agen.ts`) dan `langkahTampil` /
 * `kepalaTampil` (`replay-agen.ts`) — fungsi yang juga dipakai replay. Modul
 * ini TIDAK mengimpor rekaman mana pun: tidak ada `dataJejak`, `siapkanReplay`,
 * atau `KONFIG_JEJAK` di sini.
 *
 * Sebuah langkah dikirim ke peramban saat langkah itu TERTUTUP: pelari sudah
 * menulis baris model langkah berikutnya, atau pelari sudah berhenti. Baru saat
 * itu semua tool result langkah itu ada, dan baru saat itu diketahui apakah
 * agent menulis ulang sesudahnya — sama persis dengan yang dihitung replay.
 *
 * Yang dijaga:
 * - medan `penalaran` dibuang saat tiap baris diurai (`uraiTanpaPenalaran`);
 * - kode saham dan nama perusahaan disamarkan seperti di replay;
 * - tidak ada mode uji di permukaan publik (A-1): pengganti proses agent untuk
 *   tes hanya bisa disuntikkan dari kode (`OpsiServer.agenLangsung.pelari`),
 *   tidak dari baris perintah dan tidak dari variabel lingkungan.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { isAbsolute, join, relative, sep } from 'node:path';
import { TOLERANSI_PAGU } from '../../factory/llm/agen/anggaran.ts';
import { PerakitLangkah, samarkan, samarkanDalam, uraiTanpaPenalaran } from './rekaman-agen.ts';
import { bukaSse, kepalaTampil, langkahTampil, menulisDraf, periksaBersih, toolDiagram, type KepalaTampil, type LangkahTampil } from './replay-agen.ts';

/* --- uang --------------------------------------------------------------------- */

/**
 * Budget bawaan tahap susun di halaman: angka yang sama dengan contoh README
 * bagian Menjalankan (c) dan dengan rekaman `eval/penyusun/m2d26-amag-1/hasil.json`
 * (`pagu_usd: 1.5`).
 */
export const BUDGET_SUSUN_BAWAAN_USD = 1.5;
/**
 * Batas atas budget yang bisa disetujui dari halaman. Asal angka: kontrak
 * M-PN1 D-2 ("2 dolar untuk tahap susun") — kode tidak punya konstanta batas
 * budget agent selain ini. Budget lebih besar hanya lewat terminal (`npm run agen`).
 */
export const BUDGET_SUSUN_MAKS_USD = 2;
/**
 * Batas keras pelari = budget × (1 + toleransi) (`factory/llm/agen/anggaran.ts`):
 * satu panggilan yang sudah berjalan boleh melewati budget sedikit. Halaman
 * menyebut angka ini di pernyataan biaya.
 */
export const TOLERANSI_BUDGET = TOLERANSI_PAGU;

/** Budget dari halaman: angka > 0 dan ≤ batas atas; selain itu `null`. */
export function budgetSah(nilai: unknown): number | null {
  if (typeof nilai !== 'number' || !Number.isFinite(nilai)) return null;
  if (nilai <= 0 || nilai > BUDGET_SUSUN_MAKS_USD) return null;
  return Math.round(nilai * 100) / 100;
}

/* --- pelari ------------------------------------------------------------------- */

export interface PermintaanPelari {
  /** Nama folder baru di folder keluaran pelari. */
  id: string;
  kode: string;
  budgetUsd: number;
  /** Folder yang akan ditulis pelari (`<folderDasar>/<id>`). */
  folder: string;
  /** Penyusun menyetujui pengambilan data Sectors yang belum ada di cache (memakai kredit). */
  kreditSectors: boolean;
  log: (baris: string) => void;
}

export interface ProsesPelari {
  pid: number | null;
  /** Matikan pelari ini (hanya proses milik server ini). */
  hentikan(): void;
  /** Selesai saat pelari berhenti; `kodeKeluar` null bila dimatikan. */
  selesai: Promise<{ kodeKeluar: number | null }>;
}

export interface PelariAgen {
  /** Folder tempat pelari membuat `<id>/jejak-agen.jsonl`. */
  folderDasar: string;
  mulai(p: PermintaanPelari): ProsesPelari;
}

/** Berkas pelari, relatif terhadap akar repo. */
export const SKRIP_PELARI = 'alat/agen/jalan-agen.ts';

/**
 * Argumen proses anak: persis `npm run agen -- --id <id> --kode XXXX --pagu <usd> --setuju-berbayar`
 * (tahap susun dari kode saham). `--setuju-berbayar` hanya pernah dirakit di
 * sini, dan fungsi ini hanya dipanggil sesudah klik setuju di halaman.
 */
export function argumenPelari(p: Pick<PermintaanPelari, 'id' | 'kode' | 'budgetUsd' | 'kreditSectors'>): string[] {
  return [
    '--experimental-strip-types',
    SKRIP_PELARI,
    '--id', p.id,
    '--kode', p.kode,
    '--pagu', String(p.budgetUsd),
    '--setuju-berbayar',
    ...(p.kreditSectors ? ['--setuju-kredit-sectors'] : []),
  ];
}

/** Jalankan satu proses anak; keluarannya diteruskan ke log server baris demi baris. */
export function jalankanProses(perintah: string, argumen: readonly string[], cwd: string, log: (baris: string) => void): ProsesPelari {
  const anak = spawn(perintah, [...argumen], { cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  const terus = (aliran: NodeJS.ReadableStream | null): void => {
    let sisa = '';
    aliran?.setEncoding('utf8');
    aliran?.on('data', (potongan: string) => {
      const baris = (sisa + potongan).split(/\r?\n/);
      sisa = baris.pop() ?? '';
      for (const b of baris) if (b.trim() !== '') log(`agent | ${b}`);
    });
    aliran?.on('end', () => {
      if (sisa.trim() !== '') log(`agent | ${sisa}`);
    });
  };
  terus(anak.stdout);
  terus(anak.stderr);
  // Server berhenti → pelari miliknya ikut berhenti (tidak ada pelari yatim yang terus membayar).
  const saatKeluar = (): void => {
    anak.kill();
  };
  process.once('exit', saatKeluar);
  const selesai = new Promise<{ kodeKeluar: number | null }>((beres) => {
    let sudah = false;
    const tutup = (kodeKeluar: number | null): void => {
      if (sudah) return;
      sudah = true;
      process.removeListener('exit', saatKeluar);
      beres({ kodeKeluar });
    };
    anak.once('close', (kode) => tutup(kode));
    anak.once('error', (galat) => {
      log(`agent | proses agent tidak bisa dinyalakan: ${galat.name}`);
      tutup(null);
    });
  });
  return { pid: anak.pid ?? null, hentikan: () => void anak.kill(), selesai };
}

/** Pelari sungguhan: `node --experimental-strip-types alat/agen/jalan-agen.ts …` di akar repo. */
export function pelariSungguhan(akarRepo: string): PelariAgen {
  return {
    // `jalan-agen.ts` menulis ke `<akar repo>/eval/penyusun/<id>/` (tidak bisa diubah lewat argumen).
    folderDasar: join(akarRepo, 'eval', 'penyusun'),
    mulai: (p) => jalankanProses(process.execPath, argumenPelari(p), akarRepo, p.log),
  };
}

/* --- satu kerja agent yang sedang dibaca ---------------------------------------- */

export type KeadaanLangsung = 'bekerja' | 'selesai' | 'dihentikan';

/**
 * Keadaan akhir, dibaca dari `hasil.json` yang ditulis pelari:
 * - `terakit`: `simulasi.terbit` benar — tiga soal terakit;
 * - `budget`: pelari berhenti karena budget tidak cukup untuk satu langkah lagi;
 * - `berhenti`: pelari berhenti karena sebab lain (rinciannya di `hasil.json` dan terminal);
 * - `dihentikan`: penyusun menekan Hentikan;
 * - `tanpa-hasil`: pelari berhenti sebelum menulis `hasil.json`.
 */
export type HasilAkhir = 'terakit' | 'budget' | 'berhenti' | 'dihentikan' | 'tanpa-hasil';

export interface AkhirLangsung {
  hasil: HasilAkhir;
  /** Folder keluaran pelari. */
  folder: string;
  /** `hasil.json` → `biaya_usd`, bila ada. */
  biaya_usd: number | null;
  jumlah_langkah: number;
}

export interface OpsiLangsung {
  pelari: PelariAgen;
  id: string;
  kode: string;
  budgetUsd: number;
  kreditSectors: boolean;
  /** Nama perusahaan dari cache lokal, bila ada: disamarkan sejak baris pertama. */
  namaPerusahaan: string | null;
  /** Akar repo: folder keluaran di dalamnya ditampilkan sebagai jalur relatif. */
  akar: string;
  /** Selang pembacaan jejak. */
  selangMs: number;
  log: (baris: string) => void;
}

/** Selang bawaan pembacaan `jejak-agen.jsonl` yang sedang tumbuh. */
export const SELANG_BACA_MS = 400;

function tanpaTbk(nama: string): string {
  return nama.replace(/\s+Tbk\.?$/i, '');
}

export class JalanLangsung {
  readonly id: string;
  readonly kode: string;
  readonly budgetUsd: number;
  readonly folder: string;
  /** Folder untuk ditampilkan: relatif terhadap akar repo bila di dalamnya. */
  readonly folderTampil: string;
  readonly kepala: KepalaTampil;
  keadaan: KeadaanLangsung = 'bekerja';
  akhir: AkhirLangsung | null = null;

  private readonly o: OpsiLangsung;
  private readonly proses: ProsesPelari;
  private readonly tool = toolDiagram([]);
  private readonly terlarang: string[];
  private readonly perakit: PerakitLangkah;
  private readonly peristiwa: Array<{ jenis: string; data: unknown }> = [];
  private readonly pelanggan = new Set<ServerResponse>();
  private readonly timer: ReturnType<typeof setInterval>;
  /** Jumlah huruf `jejak-agen.jsonl` yang sudah diolah (selalu di batas baris). */
  private dibaca = 0;
  /** Jumlah langkah yang sudah dikirim. */
  private terkirim = 0;
  private paketDibaca = false;
  private dimintaBerhenti = false;

  constructor(o: OpsiLangsung) {
    this.o = o;
    this.id = o.id;
    this.kode = o.kode;
    this.budgetUsd = o.budgetUsd;
    this.folder = join(o.pelari.folderDasar, o.id);
    const rel = relative(o.akar, this.folder);
    this.folderTampil = `${rel.startsWith('..') || isAbsolute(rel) ? this.folder.split(sep).join('/') : rel.split(sep).join('/')}/`;
    this.terlarang = [o.kode, ...(o.namaPerusahaan === null || o.namaPerusahaan.trim() === '' ? [] : [o.namaPerusahaan, tanpaTbk(o.namaPerusahaan)])];
    this.perakit = new PerakitLangkah({ percobaan: 0, mode: 'dari-kode', awal: 0, terlarang: this.terlarang, label: o.id, longgar: true });
    this.kepala = kepalaTampil('langsung', this.tool, {
      model: null,
      nama_samaran: null,
      tanggal_simulasi: null,
      budget_usd: o.budgetUsd,
      jumlah_rekaman: 1,
      jumlah_langkah: null,
      sumber: [`${this.folderTampil}jejak-agen.jsonl (teks berpikir model tidak ikut)`],
    });
    this.catat('kepala', this.kepala);
    this.proses = o.pelari.mulai({ id: o.id, kode: o.kode, budgetUsd: o.budgetUsd, folder: this.folder, kreditSectors: o.kreditSectors, log: o.log });
    this.timer = setInterval(() => this.baca(), o.selangMs);
    this.timer.unref();
    void this.proses.selesai.then((h) => this.tutup(h.kodeKeluar));
  }

  get pid(): number | null {
    return this.proses.pid;
  }

  get jumlahLangkah(): number {
    return this.terkirim;
  }

  /** Tombol Hentikan: matikan pelari milik server ini. */
  hentikan(): void {
    if (this.keadaan !== 'bekerja') return;
    this.dimintaBerhenti = true;
    this.proses.hentikan();
  }

  /** Sambungkan satu peramban: semua peristiwa sejauh ini, lalu yang baru saat terjadi. */
  sambung(res: ServerResponse): void {
    bukaSse(res);
    for (const [i, p] of this.peristiwa.entries()) this.tulis(res, i + 1, p);
    if (this.keadaan !== 'bekerja') {
      res.write('event: selesai\ndata: {}\n\n');
      res.end();
      return;
    }
    this.pelanggan.add(res);
    res.on('close', () => this.pelanggan.delete(res));
  }

  private tulis(res: ServerResponse, no: number, p: { jenis: string; data: unknown }): void {
    res.write(`id: ${String(no)}\nevent: ${p.jenis}\ndata: ${JSON.stringify(p.data)}\n\n`);
  }

  private catat(jenis: string, data: unknown): void {
    const p = { jenis, data };
    this.peristiwa.push(p);
    for (const res of this.pelanggan) this.tulis(res, this.peristiwa.length, p);
  }

  /** Begitu pelari menulis `paket.json`: nama perusahaan dan kode saham di dalamnya ikut disamarkan. */
  private bacaPaket(): void {
    if (this.paketDibaca) return;
    const jalur = join(this.folder, 'paket.json');
    if (!existsSync(jalur)) return;
    try {
      const p = JSON.parse(readFileSync(jalur, 'utf8')) as { simbol?: unknown; nama_emiten?: unknown };
      for (const kata of [p.simbol, p.nama_emiten, typeof p.nama_emiten === 'string' ? tanpaTbk(p.nama_emiten) : null]) {
        if (typeof kata === 'string' && kata.trim() !== '' && !this.terlarang.includes(kata)) this.terlarang.push(kata);
      }
      this.paketDibaca = true;
    } catch {
      // Berkas masih ditulis; dibaca lagi di putaran berikutnya.
    }
  }

  /** Baca baris baru di `jejak-agen.jsonl`; kirim tiap langkah yang baru saja tertutup. */
  private baca(): void {
    this.bacaPaket();
    const jalur = join(this.folder, 'jejak-agen.jsonl');
    if (!existsSync(jalur)) return;
    const teks = readFileSync(jalur, 'utf8');
    const batas = teks.lastIndexOf('\n');
    if (batas < this.dibaca) return;
    const baru = teks.slice(this.dibaca, batas);
    this.dibaca = batas + 1;
    for (const b of baru.split('\n')) {
      if (b.trim() === '') continue;
      try {
        const membuka = this.perakit.terima(uraiTanpaPenalaran(b) as { jenis?: string });
        // Langkah sebelumnya tertutup begitu baris model berikutnya ada.
        if (membuka) this.kirimSampai(this.perakit.langkah.length - 1);
      } catch (galat) {
        this.o.log(`agent langsung ${this.id}: satu baris jejak dilewati (${galat instanceof Error ? galat.name : 'galat'})`);
      }
    }
  }

  /** Kirim langkah yang belum terkirim, sampai (tidak termasuk) indeks `batas`. */
  private kirimSampai(batas: number): void {
    while (this.terkirim < batas) {
      const l = this.perakit.langkah[this.terkirim];
      const berikut = this.perakit.langkah[this.terkirim + 1];
      this.terkirim += 1;
      if (l === undefined) continue;
      const tampil: LangkahTampil = langkahTampil(l, this.tool, berikut !== undefined && menulisDraf(berikut));
      // Baris yang dibaca sebelum `paket.json` ada disamarkan sekali lagi dengan daftar kata yang sekarang.
      tampil.ucapan = tampil.ucapan === null ? null : samarkan(tampil.ucapan, this.terlarang);
      for (const h of tampil.hasil) h.asli = samarkanDalam(h.asli, this.terlarang) as typeof h.asli;
      try {
        // Tanpa medan teks berpikir, di kedalaman mana pun (D-6).
        periksaBersih(tampil, []);
      } catch {
        this.o.log(`agent langsung ${this.id}: langkah ${String(l.no)} tidak dikirim (memuat medan teks berpikir)`);
        continue;
      }
      this.catat('langkah', tampil);
    }
  }

  private bacaAkhir(): AkhirLangsung {
    const dasar = { folder: this.folderTampil, jumlah_langkah: this.terkirim };
    const jalur = join(this.folder, 'hasil.json');
    type Hasil = { berhenti?: unknown; biaya_usd?: unknown; simulasi?: { terbit?: unknown } };
    const bacaHasil = (): Hasil | null => {
      if (!existsSync(jalur)) return null;
      try {
        const h = uraiTanpaPenalaran(readFileSync(jalur, 'utf8'));
        return h !== null && typeof h === 'object' ? (h as Hasil) : null;
      } catch {
        return null;
      }
    };
    const hasil = bacaHasil();
    const biaya = typeof hasil?.biaya_usd === 'number' ? hasil.biaya_usd : null;
    if (this.dimintaBerhenti) return { ...dasar, hasil: 'dihentikan', biaya_usd: biaya };
    if (hasil === null) return { ...dasar, hasil: 'tanpa-hasil', biaya_usd: null };
    if (hasil.simulasi?.terbit === true) return { ...dasar, hasil: 'terakit', biaya_usd: biaya };
    // `jalan-agen.ts`: "anggaran tidak cukup untuk satu langkah lagi".
    if (typeof hasil.berhenti === 'string' && /^anggaran\b/.test(hasil.berhenti)) return { ...dasar, hasil: 'budget', biaya_usd: biaya };
    return { ...dasar, hasil: 'berhenti', biaya_usd: biaya };
  }

  private tutup(kodeKeluar: number | null): void {
    clearInterval(this.timer);
    this.baca();
    this.kirimSampai(this.perakit.langkah.length);
    this.akhir = this.bacaAkhir();
    this.keadaan = this.dimintaBerhenti ? 'dihentikan' : 'selesai';
    this.catat('akhir', this.akhir);
    this.o.log(`agent langsung ${this.id}: ${this.akhir.hasil}; ${String(this.terkirim)} langkah; kode keluar ${kodeKeluar === null ? '-' : String(kodeKeluar)}; folder ${this.folderTampil}`);
    for (const res of this.pelanggan) {
      res.write('event: selesai\ndata: {}\n\n');
      res.end();
    }
    this.pelanggan.clear();
  }
}
