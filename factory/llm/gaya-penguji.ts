/**
 * `npm run gaya:penguji` — bahan pembanding EKSTERNAL untuk lingkar gaya &
 * makna (M2d-4 D-8; prosedur sama dengan M2d-3 D-7). Penguji dan penilai
 * adalah subagent Claude baru tanpa konteks eksekutor; masing-masing hanya
 * menerima isi SATU berkas bahan dari sini, dengan label acak.
 *
 * - `tebak.md` — tebak buta K-05, petunjuk PERSIS sama dengan M2d-1…M2d-3
 *   (`PETUNJUK_TEBAK`): omongan yang dikunci lingkar M2d-4, tanpa kartu.
 * - `kartu.md` — jawab-dengan-kartu K-05 (`PETUNJUK_KARTU` M2d-2).
 * - `alami.md` — kealamian buta (`PETUNJUK_ALAMI` M2d-1). Per paket: draf
 *   M2d-4 (bank v2), draf M2d-3 (bank v1) — keduanya omongan yang dikunci —
 *   dan omongan manusia yang hidup untuk DADA/ULTJ, supaya penilai yang SAMA
 *   menilai kedua generasi dan pembanding manusia.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { HasilPeran } from './agen-peran.ts';
import { PETUNJUK_KARTU, tulisSoalKartuLuar } from './agen-penguji.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { FOLDER_M2D4, URUTAN_GAYA } from './gaya-susun.ts';
import { kartuOmongan, type KartuTampil } from './gerbang-kartu.ts';
import type { PaketFakta } from './paket.ts';
import { omonganLolosPeran, type OmonganLolosPeran } from './peran-penguji.ts';
import { FOLDER_M2D3 } from './peran-susun.ts';
import {
  PETUNJUK_ALAMI,
  PETUNJUK_TEBAK,
  acak,
  kocok,
  polosDariDraf,
  polosDariKasus,
  tulisDrafAlami,
  tulisSoalTebak,
  type DrafPolos,
  type OmonganPolos,
} from './penguji.ts';
import { teksPolos } from '../skema/rujukan.ts';

export const FOLDER_PENGUJI_M2D4 = `${FOLDER_M2D4}/penguji`;
export const BENIH_M2D4 = 20260930;

/** Riwayat lingkar di folder keluaran milestone mana pun; `null` bila paket itu belum dijalankan. */
export function bacaRiwayatDi(folder: string, paket: string): HasilPeran | null {
  const jalur = `${folder}/${paket}/riwayat.json`;
  return existsSync(jalur) ? (JSON.parse(readFileSync(jalur, 'utf8')) as HasilPeran) : null;
}

export function bacaPaketDi(folder: string, paket: string): PaketFakta {
  return JSON.parse(readFileSync(`${folder}/${paket}/paket.json`, 'utf8')) as PaketFakta;
}

/** Omongan yang dikunci lingkar M2d-4 per paket (urut nomor). */
export function lolosM2d4(paket: string): OmonganLolosPeran[] {
  const h = bacaRiwayatDi(FOLDER_M2D4, paket);
  return h === null ? [] : omonganLolosPeran(paket, h);
}

function polos(o: OmonganDraf): OmonganPolos {
  return {
    nama: o.nama,
    jam: o.jam,
    pesan: teksPolos(o.pesan),
    pilihan: { a: teksPolos(o.pilihan.a), b: teksPolos(o.pilihan.b), c: teksPolos(o.pilihan.c), d: teksPolos(o.pilihan.d) },
    kunci: o.kunci,
    penjelasan: teksPolos(o.penjelasan),
  };
}

const BERKAS_MANUSIA: Partial<Record<string, string>> = { dada: 'dada-2025-10-08.json', ultj: 'ultj-2026-05-04.json' };

export interface KunciPengujiM2d4 {
  benih: number;
  tebak: Array<{ id: string; paket: string; no: number; kunci: KunciOpsi; putaran: number }>;
  kartu: Array<{ id: string; paket: string; no: number; kunci: KunciOpsi; penentu: number[] }>;
  alami: Array<{ kelompok: number; paket: string; label: Record<string, string> }>;
}

export interface BahanPengujiM2d4 {
  tebak: string;
  kartu: string;
  alami: string;
  kunci: KunciPengujiM2d4;
}

/** Bangun ketiga bahan dan kuncinya dari keluaran yang tersimpan. Murni; tidak menulis apa pun. */
export function bangunBahanGaya(): BahanPengujiM2d4 {
  const kunci: KunciPengujiM2d4 = { benih: BENIH_M2D4, tebak: [], kartu: [], alami: [] };
  const semua: Array<{ l: OmonganLolosPeran; kartu: KartuTampil[] }> = [];
  const draf4 = new Map<string, DrafSimulasi>();
  for (const paket of URUTAN_GAYA) {
    const lolos = lolosM2d4(paket);
    if (lolos.length === 0) continue;
    const p = bacaPaketDi(FOLDER_M2D4, paket);
    for (const l of lolos) semua.push({ l, kartu: kartuOmongan(l.omongan, p) });
    draf4.set(paket, { omongan: lolos.map((l) => l.omongan) });
  }

  const urutTebak = kocok(semua, acak(BENIH_M2D4));
  const soalTebak = urutTebak.map((x, i) => {
    const id = `Q${String(i + 1)}`;
    kunci.tebak.push({ id, paket: x.l.paket, no: x.l.no, kunci: x.l.omongan.kunci, putaran: x.l.putaran });
    return tulisSoalTebak(id, polos(x.l.omongan)) + '\n';
  });
  const tebak = [PETUNJUK_TEBAK, '', ...soalTebak].join('\n');

  const urutKartu = kocok(semua, acak(BENIH_M2D4 + 1));
  const soalKartu = urutKartu.map((x, i) => {
    const id = `Q${String(i + 1)}`;
    const penentu = x.kartu.filter((k) => x.l.omongan.kartu_penentu.includes(k.fact_id)).map((k) => k.no);
    kunci.kartu.push({ id, paket: x.l.paket, no: x.l.no, kunci: x.l.omongan.kunci, penentu });
    return tulisSoalKartuLuar(id, polos(x.l.omongan), x.kartu) + '\n';
  });
  const kartu = [PETUNJUK_KARTU, '', ...soalKartu].join('\n');

  const r = acak(BENIH_M2D4 + 2);
  const bagian: string[] = [PETUNJUK_ALAMI, ''];
  let kelompok = 0;
  for (const paket of URUTAN_GAYA) {
    const calon: DrafPolos[] = [];
    const d4 = draf4.get(paket);
    if (d4 !== undefined) calon.push({ ...polosDariDraf(paket, 'agen-m2d4', d4, 2), sumber: 'agen-m2d4' });
    const h3 = bacaRiwayatDi(FOLDER_M2D3, paket);
    const l3 = h3 === null ? [] : omonganLolosPeran(paket, h3);
    if (l3.length > 0) calon.push({ ...polosDariDraf(paket, 'agen-m2d3', { omongan: l3.map((l) => l.omongan) }, 2), sumber: 'agen-m2d3' });
    const berkas = BERKAS_MANUSIA[paket];
    if (berkas !== undefined) calon.push(polosDariKasus(paket, berkas));
    // Kelompok hanya bila ada draf M2d-4 atau pembanding manusia.
    if (d4 === undefined && berkas === undefined) continue;
    kelompok += 1;
    const urut = kocok(calon, r);
    const label: Record<string, string> = {};
    bagian.push(`## Kelompok ${String(kelompok)}`, '');
    urut.forEach((d, k) => {
      const huruf = 'ABCD'[k] ?? `X${String(k)}`;
      label[huruf] = d.sumber;
      bagian.push(tulisDrafAlami(huruf, d));
    });
    kunci.alami.push({ kelompok, paket, label });
  }
  return { tebak, kartu, alami: bagian.join('\n'), kunci };
}

function utama(): number {
  mkdirSync(`${FOLDER_PENGUJI_M2D4}/jawaban`, { recursive: true });
  const { tebak, kartu, alami, kunci } = bangunBahanGaya();
  writeFileSync(`${FOLDER_PENGUJI_M2D4}/tebak.md`, tebak, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D4}/kartu.md`, kartu, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D4}/alami.md`, alami, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D4}/kunci.json`, JSON.stringify(kunci, null, 2) + '\n', 'utf8');
  console.log(
    `tebak.md: ${String(kunci.tebak.length)} soal · kartu.md: ${String(kunci.kartu.length)} soal · ` +
      `alami.md: ${String(kunci.alami.length)} kelompok, ${String(kunci.alami.reduce((a, k) => a + Object.keys(k.label).length, 0))} draf`,
  );
  return 0;
}

if (/(^|[\\/])gaya-penguji\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
