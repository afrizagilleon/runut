/**
 * Bank omongan (M2d-16 D-6).
 *
 * Omongan dinilai SATU per SATU. Yang lolos SEMUA gerbang disimpan di
 * `eval/bank-omongan/<paket-sha>/<id>.json`: draf + jejak gerbang + asal jalan.
 * Omongan yang kartu penentunya sudah ada di bank tetap disimpan (alternatif
 * untuk sudut itu — keputusan reviewer 3 Okt).
 *
 * Penyusun simulasi (`pilihSimulasi`) mengambil satu omongan per kartu penentu
 * — tiga omongan yang kartu penentunya saling lepas — lalu menjalankan
 * validator seluruh draf; kombinasi pertama (urutan masuk bank) yang lolos
 * menjadi draf simulasi.
 *
 * Isi bank awal tidak dibuat di M2d-16 (butuh gerbang berbayar).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { DrafSimulasi } from '../draf.ts';
import { validasiM2d8 } from '../kalibrasi-soal.ts';
import type { PaketFakta } from '../paket.ts';
import { drafDari, type OmonganBebas } from './skema.ts';

/** Folder bank relatif terhadap akar repo. */
export const FOLDER_BANK = 'eval/bank-omongan';
/** Omongan per simulasi. */
export const UKURAN_SIMULASI = 3;
/** Batas kombinasi yang dicoba penyusun (bank besar tidak membuat hitungan meledak). */
export const MAKS_KOMBINASI = 2_000;

export interface AsalBank {
  jalan: string;
  putaran: number;
  /** Urutan omongan di keluaran penulis putaran itu (1, 2, …). */
  urut: number;
  penulis: string;
  sha256_prompt: string;
}

export interface EntriBank {
  id: string;
  paket_sha: string;
  kartu_penentu: string[];
  omongan: OmonganBebas;
  /** Hasil tiap gerbang yang dilewati (bentuknya ditentukan mesin; disimpan apa adanya). */
  jejak_gerbang: Record<string, unknown>;
  asal: AsalBank;
  waktu: string;
}

/** sha256 paket seperti ditulis pintu (`paket.json`): sama dengan `shaPaket` di `alat/penyusun/mesin-bebas.ts`. Murni. */
export const shaPaketBank = (p: PaketFakta): string => createHash('sha256').update(`${JSON.stringify(p, null, 2)}\n`, 'utf8').digest('hex');

/** JSON kanonik: kunci objek diurutkan (urutan medan dari penulis tidak mengubah id). Murni. */
export function jsonKanonik(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(jsonKanonik).join(',')}]`;
  if (typeof x === 'object' && x !== null) {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jsonKanonik(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(x) ?? 'null';
}

/** Id omongan = 16 heksadesimal pertama sha256 JSON kanonik drafnya. Murni. */
export const idOmongan = (o: OmonganBebas): string => createHash('sha256').update(jsonKanonik(o), 'utf8').digest('hex').slice(0, 16);

/** Kunci sudut = kartu penentu terurut. Murni. */
export const kunciSudut = (kartuPenentu: readonly string[]): string => [...kartuPenentu].sort().join('+');

const rapi = (f: string): string => f.replace(/\\/g, '/').replace(/\/+$/, '');

/** Simpan satu omongan yang lolos semua gerbang. Omongan yang sama (id sama) tidak ditulis ulang. */
export function simpanBank(folderBank: string, e: EntriBank): string {
  if (!/^[0-9a-f]{64}$/.test(e.paket_sha)) throw new Error('entri bank: paket_sha bukan sha256');
  if (e.id !== idOmongan(e.omongan)) throw new Error('entri bank: id tidak sama dengan sha draf');
  if (kunciSudut(e.kartu_penentu) !== kunciSudut(e.omongan.kartu_penentu)) throw new Error('entri bank: kartu penentu tidak sama dengan kartu penentu draf');
  const folder = `${rapi(folderBank)}/${e.paket_sha}`;
  const jalur = `${folder}/${e.id}.json`;
  if (existsSync(jalur)) return jalur;
  mkdirSync(folder, { recursive: true });
  writeFileSync(jalur, `${JSON.stringify(e, null, 2)}\n`, 'utf8');
  return jalur;
}

/** Semua entri bank untuk satu paket, urut waktu masuk, lalu jalan/putaran/urutan asal, lalu id. */
export function bacaBank(folderBank: string, paketSha: string): EntriBank[] {
  const folder = `${rapi(folderBank)}/${paketSha}`;
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((f) => /^[0-9a-f]{16}\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(`${folder}/${f}`, 'utf8')) as EntriBank)
    .filter((e) => e.paket_sha === paketSha)
    .sort((a, b) => a.waktu.localeCompare(b.waktu) || a.asal.jalan.localeCompare(b.asal.jalan) || a.asal.putaran - b.asal.putaran || a.asal.urut - b.asal.urut || a.id.localeCompare(b.id));
}

/** Kartu penentu yang sudah ada di bank (unik, urutan masuk) — isi `{SUDUT_TERPAKAI}`. Murni. */
export function sudutBank(entri: readonly EntriBank[]): string[] {
  return [...new Set(entri.flatMap((e) => e.kartu_penentu))];
}

/** Jumlah sudut berbeda (kunci kartu penentu berbeda) di bank. Murni. */
export function jumlahSudut(entri: readonly EntriBank[]): number {
  return new Set(entri.map((e) => kunciSudut(e.kartu_penentu))).size;
}

export interface PilihanSimulasi {
  draf: DrafSimulasi | null;
  /** Id omongan terpilih (urutan draf). */
  dipilih: string[];
  /** Kombinasi yang dicoba (termasuk yang terpilih). */
  dicoba: number;
  alasan: string[];
}

const lepas = (a: EntriBank, b: EntriBank): boolean => !a.kartu_penentu.some((k) => b.kartu_penentu.includes(k));

/**
 * Pilih tiga omongan berkartu-penentu saling lepas (satu per kartu penentu),
 * urutan masuk bank, lalu validator seluruh draf (`validasiM2d8`, masalah
 * tingkat draf). Kombinasi pertama yang lolos menjadi draf. Murni.
 */
export function pilihSimulasi(entri: readonly EntriBank[], paket: PaketFakta): PilihanSimulasi {
  const sudut = jumlahSudut(entri);
  if (sudut < UKURAN_SIMULASI) {
    return { draf: null, dipilih: [], dicoba: 0, alasan: [`bank baru memuat ${String(sudut)} kartu penentu berbeda (${String(entri.length)} omongan); simulasi butuh ${String(UKURAN_SIMULASI)}`] };
  }
  let dicoba = 0;
  const gagal: string[] = [];
  for (let i = 0; i < entri.length; i++) {
    for (let j = i + 1; j < entri.length; j++) {
      const a = entri[i] as EntriBank;
      const b = entri[j] as EntriBank;
      if (!lepas(a, b)) continue;
      for (let k = j + 1; k < entri.length; k++) {
        const c = entri[k] as EntriBank;
        if (!lepas(a, c) || !lepas(b, c)) continue;
        if (dicoba >= MAKS_KOMBINASI) return { draf: null, dipilih: [], dicoba, alasan: [`${String(MAKS_KOMBINASI)} kombinasi dicoba, tidak ada yang lolos validator seluruh draf`, ...gagal.slice(0, 5)] };
        dicoba += 1;
        const draf: DrafSimulasi = { omongan: [a, b, c].map((e) => drafDari(e.omongan)) };
        const masalah = validasiM2d8(draf, paket).filter((m) => m.omongan === null);
        if (masalah.length === 0) return { draf, dipilih: [a.id, b.id, c.id], dicoba, alasan: [] };
        gagal.push(`validator seluruh draf (${[a.id, b.id, c.id].join(', ')}): ${masalah.map((m) => `[${m.kode}] ${m.pesan}`).join('; ')}`);
      }
    }
  }
  return {
    draf: null,
    dipilih: [],
    dicoba,
    alasan: dicoba === 0 ? [`tidak ada tiga omongan yang kartu penentunya saling lepas (${String(entri.length)} omongan, ${String(sudut)} sudut)`] : gagal.slice(0, 10),
  };
}
