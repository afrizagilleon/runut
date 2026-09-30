/**
 * Satu jalan penyusun (M2d-9 D-4, D-5): keadaan, berkas keluaran, dan urutan
 * tahapnya.
 *
 * Folder jalan = `<folderKeluaran>/<id>/` (bawaan `eval/penyusun/<id>/`):
 * `aliran.jsonl` (log SSE), `paket.json`, `jejak-agen.json`, `hasil.json`,
 * `keadaan.json`, dan — sesudah penyetuju memutuskan — `draf-disetujui.json`
 * atau `penolakan-penyetuju.json` + `catatan-suntingan.json`. TIDAK PERNAH ke
 * `cases/`: setiap jalur tulis lewat `jalurKeluaran()`, yang menolak apa pun
 * di luar folder keluaran dan apa pun di dalam folder `cases`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { KeadaanOmongan } from '../../factory/llm/agen-pengecoh.ts';
import type { DrafSimulasi, OmonganDraf } from '../../factory/llm/draf.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { Aliran } from './aliran.ts';
import type { HasilMesin, PerkiraanBiaya } from './mesin.ts';

export const POLA_ID = /^[a-z0-9][a-z0-9-]{2,59}$/;
export const PAGU_JALAN_BAWAAN = 0.6;
export const PAGU_JALAN_MIN = 0.05;

export type TahapJalan = 'menyiapkan' | 'menunggu-persetujuan' | 'berjalan' | 'selesai' | 'galat';

export interface Suntingan {
  ke: number;
  penyunting: 'manusia';
  waktu: string;
  omongan: number;
  lokasi: string;
  dari: string;
  ke_teks: string;
}

export interface UjiUlang {
  ke: number;
  waktu_mulai: string;
  waktu_selesai: string | null;
  /** Nomor suntingan terakhir yang ikut diuji. */
  sampai_suntingan: number;
  diuji: number[];
  lolos: boolean | null;
  berhenti: string | null;
  masalah: string[];
  per_omongan: Array<{ no: number; lolos: boolean; status: string; alasan: string[]; dicatat: string[] }>;
  pagu_usd: number;
  biaya_usd: number;
}

export interface PutusanPenyetuju {
  putusan: 'setujui' | 'tolak';
  waktu: string;
  alasan: string | null;
  berkas: string[];
}

export interface HasilJalan {
  terbit: boolean;
  berhenti: string | null;
  putaran: number;
  biaya_usd: number;
  /** Biaya nyata menurut ledger untuk awalan tag jalan ini (bukan jumlah jejak). */
  biaya_ledger_usd: number | null;
  penolakan: string[];
}

export interface DataJalan {
  id: string;
  kode: string;
  tanggal: string;
  jendela: number;
  dibuat: string;
  tahap: TahapJalan;
  sumber_paket: { sumber: string; keterangan: string } | null;
  sesudahnya: number | null;
  perkiraan: PerkiraanBiaya | null;
  pagu_jalan_usd: number | null;
  mesin: { nama: string; keterangan: string; palsu: boolean } | null;
  hasil: HasilJalan | null;
  /** Draf yang terbit (versi terkini, sudah memuat suntingan). */
  draf: DrafSimulasi | null;
  draf_terakhir: Array<OmonganDraf | null>;
  keadaan: KeadaanOmongan[];
  suntingan: Suntingan[];
  uji_ulang: UjiUlang[];
  putusan: PutusanPenyetuju | null;
  galat: string | null;
}

export class Jalan {
  readonly data: DataJalan;
  readonly folder: string;
  readonly aliran: Aliran;
  paket: PaketFakta | null = null;
  sibuk = false;

  constructor(data: DataJalan, folder: string, aliran: Aliran) {
    this.data = data;
    this.folder = folder;
    this.aliran = aliran;
  }

  tulis(nama: string, isi: unknown): string {
    const jalur = jalurKeluaran(this.folder, nama);
    mkdirSync(this.folder, { recursive: true });
    writeFileSync(jalur, `${JSON.stringify(isi, null, 2)}\n`, 'utf8');
    return jalur;
  }

  simpan(): void {
    this.tulis('keadaan.json', this.data);
  }
}

/* ---------------------------------------------------------------------- */
/* jalur keluaran (tidak pernah cases/)                                    */
/* ---------------------------------------------------------------------- */

export class GalatJalur extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = 'GalatJalur';
  }
}

function adaSegmenCases(jalur: string): boolean {
  return resolve(jalur).split(/[\\/]/).some((s) => s.toLowerCase() === 'cases');
}

/** Folder keluaran yang boleh dipakai: bukan di dalam folder `cases` mana pun. */
export function periksaFolderKeluaran(folder: string): string {
  const r = resolve(folder);
  if (adaSegmenCases(r)) throw new GalatJalur(`Folder keluaran ${folder} berada di dalam cases/; draf penyusun tidak pernah ditulis ke sana.`);
  return r;
}

/** Folder satu jalan di bawah folder keluaran; id wajib berpola aman. */
export function folderJalan(folderKeluaran: string, id: string): string {
  if (!POLA_ID.test(id)) throw new GalatJalur(`Nama jalan "${id}" tidak sah (huruf kecil, angka, tanda hubung; 3–60).`);
  const akar = periksaFolderKeluaran(folderKeluaran);
  return join(akar, id);
}

/** Jalur satu berkas keluaran: harus tepat di dalam folder jalan, bukan di `cases/`. */
export function jalurKeluaran(folder: string, nama: string): string {
  const jalur = resolve(folder, nama);
  const rel = relative(resolve(folder), jalur);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel) || rel.includes(sep) || rel.includes('/')) {
    throw new GalatJalur(`Berkas keluaran "${nama}" harus berada langsung di folder jalan.`);
  }
  if (adaSegmenCases(jalur)) throw new GalatJalur('Draf penyusun tidak pernah ditulis ke cases/.');
  return jalur;
}

/* ---------------------------------------------------------------------- */
/* pembuatan dan pemuatan                                                  */
/* ---------------------------------------------------------------------- */

export function idJalan(kode: string, tanggal: string, jam: Date): string {
  const w = jam.toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '-');
  return `${kode.toLowerCase()}-${tanggal}-${w}`;
}

export function buatJalan(folderKeluaran: string, id: string, kode: string, tanggal: string, jendela: number, jam: () => Date): Jalan {
  const folder = folderJalan(folderKeluaran, id);
  if (existsSync(folder)) throw new GalatJalur(`Jalan "${id}" sudah ada; pilih nama lain.`);
  mkdirSync(folder, { recursive: true });
  const data: DataJalan = {
    id,
    kode,
    tanggal,
    jendela,
    dibuat: jam().toISOString(),
    tahap: 'menyiapkan',
    sumber_paket: null,
    sesudahnya: null,
    perkiraan: null,
    pagu_jalan_usd: null,
    mesin: null,
    hasil: null,
    draf: null,
    draf_terakhir: [null, null, null],
    keadaan: [],
    suntingan: [],
    uji_ulang: [],
    putusan: null,
    galat: null,
  };
  const j = new Jalan(data, folder, new Aliran(id, jalurKeluaran(folder, 'aliran.jsonl'), jam));
  j.simpan();
  return j;
}

/** Muat jalan dari folder (sesudah server dijalankan ulang). Jalan yang tadinya berjalan ditandai galat. */
export function muatJalan(folderKeluaran: string, id: string): Jalan | null {
  const folder = folderJalan(folderKeluaran, id);
  const jalur = join(folder, 'keadaan.json');
  if (!existsSync(jalur)) return null;
  const data = JSON.parse(readFileSync(jalur, 'utf8')) as DataJalan;
  const aliran = Aliran.dariLog(id, join(folder, 'aliran.jsonl'));
  const j = new Jalan(data, folder, aliran);
  const jp = join(folder, 'paket.json');
  if (existsSync(jp)) j.paket = JSON.parse(readFileSync(jp, 'utf8')) as PaketFakta;
  if (data.tahap === 'berjalan' || data.tahap === 'menyiapkan') {
    data.tahap = 'galat';
    data.galat = 'server berhenti saat jalan ini berlangsung';
  }
  return j;
}

/* ---------------------------------------------------------------------- */
/* hasil mesin → keadaan jalan                                             */
/* ---------------------------------------------------------------------- */

/** Alasan penolakan per omongan dari putaran terakhir lingkar (untuk "penolakan beralasan"). */
export function alasanPenolakan(riwayat: unknown): string[] {
  const r = riwayat as { riwayat?: Array<{ putaran: number; omongan?: Array<{ no: number; status: string; umpan?: string[] }> }> } | null;
  const akhir = r?.riwayat?.at(-1);
  if (akhir === undefined) return [];
  return (akhir.omongan ?? [])
    .filter((o) => o.status !== 'lolos' && o.status !== 'terkunci-sebelumnya')
    .map((o) => {
      const umpan = (o.umpan ?? []).slice(0, 2).map((u) => (u.length > 300 ? `${u.slice(0, 299)}…` : u));
      return `omongan ${String(o.no)} (${o.status}, putaran ${String(akhir.putaran)}): ${umpan.join(' | ') || 'tanpa umpan'}`;
    });
}

/** Kalimat awam untuk alasan berhenti lingkar. */
export function alasanAwam(berhenti: string | null, paguJalan: number | null): string {
  if (berhenti === null) return 'Draf lolos semua gerbang.';
  if (berhenti.startsWith('pagu tercapai')) {
    return `Berhenti karena pagu: panggilan berikutnya akan melewati pagu${paguJalan === null ? '' : ` jalan (US$${paguJalan.toFixed(2)})`} atau pagu penyusun/LLM, jadi tidak dikirim. Draf belum lolos semua gerbang.`;
  }
  if (/^omongan \d+ gagal di/.test(berhenti)) return `Satu posisi omongan gagal di semua sudut yang dicoba: ${berhenti}.`;
  if (berhenti.startsWith('batas')) return `Batas putaran tercapai sebelum ketiga omongan lolos: ${berhenti}.`;
  if (berhenti.startsWith('paket hanya memberi')) return `Paket fakta terlalu tipis: ${berhenti}.`;
  if (berhenti.includes('Saldo penyedia habis')) return `Saldo OpenRouter habis: ${berhenti}`;
  return berhenti;
}

export function terapkanHasil(j: Jalan, h: HasilMesin, biayaLedger: number | null): void {
  j.data.hasil = {
    terbit: h.terbit,
    berhenti: h.berhenti,
    putaran: h.putaran,
    biaya_usd: h.biaya_usd,
    biaya_ledger_usd: biayaLedger,
    penolakan: h.terbit ? [] : alasanPenolakan(h.riwayat),
  };
  j.data.draf = h.draf;
  j.data.draf_terakhir = h.draf_terakhir;
  j.data.keadaan = h.keadaan;
  j.data.tahap = 'selesai';
  j.tulis('hasil.json', h.riwayat);
}
