/**
 * Jejak lingkar agen (M2d-2 D-4): catatan langkah yang NYATA — diambil dari
 * eksekusi oleh kode saat langkah itu terjadi, bukan ditulis model dan bukan
 * direka ulang sesudahnya. Bahan halaman publik "Bagaimana simulasi ini
 * dibuat", jadi:
 *
 * - **tanpa rahasia**: tidak ada kunci, alamat penyedia, atau header — pencatat
 *   ini tidak pernah menerimanya;
 * - **tanpa isi prompt penuh**: prompt diwakili sha256 dan satu kalimat
 *   ringkasan; isi pesan teman dan tebakan penebak boleh (itu isi soal);
 * - **ditulis ke berkas sesudah SETIAP langkah** (`jalur`), sehingga jalan
 *   yang terputus tetap meninggalkan jejak sampai langkah terakhirnya.
 *
 * Skemanya satu berkas terlacak (`jejak-agen.skema.json`) dan `validasiJejak`
 * menafsirkan berkas itu langsung — tidak ada salinan skema kedua yang bisa
 * menyimpang.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PesanChat } from './klien.ts';
import type { PaketFakta } from './paket.ts';

export const VERSI_JEJAK = 1;
export const JALUR_SKEMA = fileURLToPath(new URL('./jejak-agen.skema.json', import.meta.url));

export type JenisLangkah =
  | 'susun'
  | 'tulis-ulang'
  | 'validator'
  | 'gerbang-kartu'
  | 'gerbang-tebak'
  // M2d-3 (lingkar berperan, `agen-peran.ts`)
  | 'kritikus';
/** Peran pelaku langkah (M2d-3, `factory/llm/peran.md`); jejak M2d-2 tidak memuatnya. */
export type PeranLangkah = 'perencana' | 'penulis' | 'pemeriksa' | 'penebak' | 'pembaca-kartu' | 'kritikus';
export type PembuatJejak = 'factory/llm/agen.ts' | 'factory/llm/agen-peran.ts';
export type Putusan = 'ditulis' | 'lolos' | 'tolak' | 'galat';

export interface LangkahJejak {
  no: number;
  putaran: number;
  jenis: JenisLangkah;
  omongan: number | null;
  waktu_mulai: string;
  waktu_selesai: string;
  model: string | null;
  panggilan: number;
  token_masuk: number;
  token_keluar: number;
  biaya_usd: number;
  putusan: Putusan;
  alasan: string[];
  sha256_prompt: string | null;
  rincian: Record<string, unknown>;
  peran?: PeranLangkah;
}

export interface HasilJejak {
  lolos: boolean;
  putaran: number;
  berhenti: string | null;
  panggilan: number;
  token_masuk: number;
  token_keluar: number;
  biaya_usd: number;
  durasi_ms: number;
}

export interface JejakAgen {
  versi: number;
  dibuat_oleh: PembuatJejak;
  simulasi: { paket_id: string; nama_samaran: string; tanggal_t: string; peristiwa: string };
  model: string;
  /** M2d-3: model per peran (penulis, penebak, pembaca kartu, kritikus). */
  model_peran?: Record<string, string>;
  paket: {
    aturan_dijalankan: number;
    aturan_dilewati: number;
    temuan: number;
    fakta_lolos: number;
    fakta_tersingkir: number;
    tersingkir: Array<{ fact_id: string; alasan: string }>;
  };
  prompt: { sha256_sistem: string; sha256_paket: string; ringkasan: string };
  mulai: string;
  selesai: string | null;
  langkah: LangkahJejak[];
  hasil: HasilJejak | null;
}

export function sha256(teks: string): string {
  return createHash('sha256').update(teks, 'utf8').digest('hex');
}

/** Hash seluruh percakapan yang dikirim (peran + isi), pengganti isi prompt. */
export function hashPesan(pesan: readonly PesanChat[]): string {
  return sha256(JSON.stringify(pesan.map((p) => [p.role, p.content])));
}

export interface OpsiPencatatJejak {
  paket: PaketFakta;
  model: string;
  promptSistem: string;
  pesanPaket: string;
  ringkasanPrompt: string;
  /** `null` = hanya di memori (tes). */
  jalur: string | null;
  jam?: () => Date;
  /** Bawaan M2d-2: versi 1, `factory/llm/agen.ts`. */
  versi?: number;
  dibuatOleh?: PembuatJejak;
  modelPeran?: Record<string, string>;
}

export class PencatatJejak {
  private readonly data: JejakAgen;
  private readonly jalur: string | null;
  private readonly jam: () => Date;
  private readonly mulaiMs: number;

  constructor(o: OpsiPencatatJejak) {
    this.jalur = o.jalur;
    this.jam = o.jam ?? (() => new Date());
    const mulai = this.jam();
    this.mulaiMs = mulai.getTime();
    this.data = {
      versi: o.versi ?? VERSI_JEJAK,
      dibuat_oleh: o.dibuatOleh ?? 'factory/llm/agen.ts',
      simulasi: {
        paket_id: o.paket.paket_id,
        nama_samaran: o.paket.nama_samaran,
        tanggal_t: o.paket.tanggal_t,
        peristiwa: o.paket.peristiwa,
      },
      model: o.model,
      ...(o.modelPeran === undefined ? {} : { model_peran: { ...o.modelPeran } }),
      paket: {
        aturan_dijalankan: o.paket.pemeriksaan.aturan_dijalankan,
        aturan_dilewati: o.paket.pemeriksaan.aturan_dilewati,
        temuan: o.paket.pemeriksaan.temuan.length,
        fakta_lolos: o.paket.fakta.length,
        fakta_tersingkir: o.paket.disingkirkan.length,
        tersingkir: o.paket.disingkirkan.map((x) => ({ fact_id: x.fact_id, alasan: x.alasan })),
      },
      prompt: { sha256_sistem: sha256(o.promptSistem), sha256_paket: sha256(o.pesanPaket), ringkasan: o.ringkasanPrompt },
      mulai: mulai.toISOString(),
      selesai: null,
      langkah: [],
      hasil: null,
    };
    this.tulis();
  }

  /** Catat satu langkah yang BARU terjadi; nomor urut diberikan di sini. */
  catat(l: Omit<LangkahJejak, 'no'>): LangkahJejak {
    const langkah: LangkahJejak = { no: this.data.langkah.length + 1, ...l };
    this.data.langkah.push(langkah);
    this.tulis();
    return langkah;
  }

  /** Tutup jejak; ringkasan dihitung dari langkah yang tercatat, bukan dari laporan siapa pun. */
  selesai(lolos: boolean, putaran: number, berhenti: string | null): JejakAgen {
    const akhir = this.jam();
    const l = this.data.langkah;
    this.data.selesai = akhir.toISOString();
    this.data.hasil = {
      lolos,
      putaran,
      berhenti,
      panggilan: l.reduce((a, x) => a + x.panggilan, 0),
      token_masuk: l.reduce((a, x) => a + x.token_masuk, 0),
      token_keluar: l.reduce((a, x) => a + x.token_keluar, 0),
      biaya_usd: Math.round(l.reduce((a, x) => a + x.biaya_usd, 0) * 1e8) / 1e8,
      durasi_ms: Math.max(0, akhir.getTime() - this.mulaiMs),
    };
    this.tulis();
    return this.jejak();
  }

  jejak(): JejakAgen {
    return JSON.parse(JSON.stringify(this.data)) as JejakAgen;
  }

  private tulis(): void {
    if (this.jalur === null) return;
    mkdirSync(dirname(this.jalur), { recursive: true });
    writeFileSync(this.jalur, JSON.stringify(this.data, null, 2) + '\n', 'utf8');
  }
}

/* ---------------------------------------------------------------------- */
/* validator skema: penafsir kecil untuk bagian JSON Schema yang dipakai    */
/* ---------------------------------------------------------------------- */

interface Skema {
  type?: string | string[];
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, Skema>;
  additionalProperties?: boolean;
  items?: Skema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

function jenisNilai(n: unknown): string {
  if (n === null) return 'null';
  if (Array.isArray(n)) return 'array';
  if (typeof n === 'number') return Number.isInteger(n) ? 'integer' : 'number';
  return typeof n;
}

function cocokJenis(n: unknown, jenis: string): boolean {
  const j = jenisNilai(n);
  return j === jenis || (jenis === 'number' && j === 'integer');
}

const KATA_DIKENAL = new Set([
  '$schema', '$id', 'title', 'description', 'type', 'enum', 'required', 'properties',
  'additionalProperties', 'items', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern',
]);

function periksa(n: unknown, s: Skema, jalur: string, salah: string[]): void {
  for (const kata of Object.keys(s)) {
    // Kata kunci yang tidak ditafsirkan tidak boleh diam-diam dianggap lolos.
    if (!KATA_DIKENAL.has(kata)) salah.push(`${jalur}: kata kunci skema "${kata}" tidak ditafsirkan`);
  }
  if (s.type !== undefined) {
    const jenis = Array.isArray(s.type) ? s.type : [s.type];
    if (!jenis.some((j) => cocokJenis(n, j))) {
      salah.push(`${jalur}: harus ${jenis.join('|')}, ternyata ${jenisNilai(n)}`);
      return;
    }
  }
  if (s.enum !== undefined && !s.enum.some((e) => e === n)) salah.push(`${jalur}: ${JSON.stringify(n)} bukan salah satu ${JSON.stringify(s.enum)}`);
  if (typeof n === 'number') {
    if (s.minimum !== undefined && n < s.minimum) salah.push(`${jalur}: ${String(n)} < ${String(s.minimum)}`);
    if (s.maximum !== undefined && n > s.maximum) salah.push(`${jalur}: ${String(n)} > ${String(s.maximum)}`);
  }
  if (typeof n === 'string') {
    if (s.minLength !== undefined && n.length < s.minLength) salah.push(`${jalur}: lebih pendek dari ${String(s.minLength)}`);
    if (s.maxLength !== undefined && n.length > s.maxLength) salah.push(`${jalur}: lebih panjang dari ${String(s.maxLength)}`);
    if (s.pattern !== undefined && !new RegExp(s.pattern, 'u').test(n)) salah.push(`${jalur}: tidak cocok pola ${s.pattern}`);
  }
  if (Array.isArray(n) && s.items !== undefined) {
    n.forEach((x, i) => periksa(x, s.items as Skema, `${jalur}[${String(i)}]`, salah));
  }
  if (jenisNilai(n) === 'object') {
    const o = n as Record<string, unknown>;
    for (const r of s.required ?? []) if (!(r in o)) salah.push(`${jalur}: medan "${r}" hilang`);
    for (const [k, v] of Object.entries(o)) {
      const sub = s.properties?.[k];
      if (sub !== undefined) periksa(v, sub, `${jalur}.${k}`, salah);
      else if (s.additionalProperties === false) salah.push(`${jalur}: medan "${k}" tidak dikenal skema`);
    }
  }
}

export function bacaSkema(): Skema {
  return JSON.parse(readFileSync(JALUR_SKEMA, 'utf8')) as Skema;
}

/** Daftar pelanggaran skema; kosong = sah. */
export function validasiJejak(nilai: unknown, skema: Skema = bacaSkema()): string[] {
  const salah: string[] = [];
  periksa(nilai, skema, '$', salah);
  return salah;
}
