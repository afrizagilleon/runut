/**
 * `npm run peran:penguji` — bahan pembanding EKSTERNAL untuk lingkar agen
 * berperan (M2d-3 D-7; prosedur sama dengan M2d-2 D-6). Penguji dan penilai
 * adalah subagent Claude baru tanpa konteks eksekutor; masing-masing hanya
 * menerima isi SATU berkas bahan dari sini, dengan label acak.
 *
 * - `tebak.md` — tebak buta K-05, petunjuk PERSIS sama dengan M2d-1/M2d-2
 *   (`PETUNJUK_TEBAK`): omongan yang dikunci lingkar M2d-3, tanpa kartu.
 * - `kartu.md` — jawab-dengan-kartu K-05 (`PETUNJUK_KARTU` M2d-2).
 * - `alami.md` — kealamian buta (`PETUNJUK_ALAMI` M2d-1). Per paket: draf
 *   agen M2d-3 (omongan yang dikunci), draf agen M2d-2 (omongan yang dikunci
 *   di M2d-2), draf DeepSeek M2d-1 (tanpa lingkar), dan omongan manusia yang
 *   hidup untuk DADA/ULTJ — supaya penilai yang SAMA menilai ketiga generasi
 *   dan pembanding manusia. Kelompok DADA dan ULTJ selalu disertakan (sebagai
 *   pembanding manusia) walau simulasinya tidak dijalankan di M2d-3.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { HasilPeran } from './agen-peran.ts';
import { PETUNJUK_KARTU, bacaRiwayat as bacaRiwayatM2d2, drafM2d1, omonganLolos as lolosM2d2, tulisSoalKartuLuar } from './agen-penguji.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { kartuOmongan, type KartuTampil } from './gerbang-kartu.ts';
import type { PaketFakta } from './paket.ts';
import { FOLDER_M2D3, URUTAN_PERAN } from './peran-susun.ts';
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

export const FOLDER_PENGUJI_M2D3 = `${FOLDER_M2D3}/penguji`;
export const BENIH_M2D3 = 20260929;

export interface OmonganLolosPeran {
  paket: string;
  no: number;
  putaran: number;
  sudut: string;
  omongan: OmonganDraf;
  tebak_dalam: Array<{ pilihan: KunciOpsi; yakin: number }>;
  kartu_dalam: { pilihan: KunciOpsi | null; menunjuk_penentu: boolean } | null;
  kritik_dalam: { keberatan: number; arahan: string } | null;
}

export function bacaRiwayatPeran(paket: string): HasilPeran | null {
  const jalur = `${FOLDER_M2D3}/${paket}/riwayat.json`;
  return existsSync(jalur) ? (JSON.parse(readFileSync(jalur, 'utf8')) as HasilPeran) : null;
}

export function bacaPaketM2d3(paket: string): PaketFakta {
  return JSON.parse(readFileSync(`${FOLDER_M2D3}/${paket}/paket.json`, 'utf8')) as PaketFakta;
}

/** Omongan yang dikunci lingkar berperan (lolos keempat penilai), versi yang dikunci. */
export function omonganLolosPeran(paket: string, h: HasilPeran): OmonganLolosPeran[] {
  const hasil: OmonganLolosPeran[] = [];
  for (const r of h.riwayat) {
    for (const p of r.omongan) {
      const o = r.draf[p.no - 1];
      if (p.status !== 'lolos' || o === null || o === undefined) continue;
      hasil.push({
        paket,
        no: p.no,
        putaran: r.putaran,
        sudut: r.sudut.find((s) => s.no === p.no)?.fact_id ?? '',
        omongan: o,
        tebak_dalam: p.tebak?.tebakan.map((t) => ({ pilihan: t.pilihan, yakin: t.yakin })) ?? [],
        kartu_dalam: p.kartu === null ? null : { pilihan: p.kartu.pilihan, menunjuk_penentu: p.kartu.menunjuk_penentu },
        kritik_dalam: p.kritik === null ? null : { keberatan: p.kritik.keberatan.length, arahan: p.kritik.arahan },
      });
    }
  }
  return hasil.sort((a, b) => a.no - b.no);
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

export interface KunciPengujiM2d3 {
  benih: number;
  tebak: Array<{ id: string; paket: string; no: number; kunci: KunciOpsi; putaran: number }>;
  kartu: Array<{ id: string; paket: string; no: number; kunci: KunciOpsi; penentu: number[] }>;
  alami: Array<{ kelompok: number; paket: string; label: Record<string, string> }>;
}

export interface BahanPengujiM2d3 {
  tebak: string;
  kartu: string;
  alami: string;
  kunci: KunciPengujiM2d3;
}

/** Bangun ketiga bahan dan kuncinya dari keluaran yang tersimpan. Murni; tidak menulis apa pun. */
export function bangunBahanPeran(): BahanPengujiM2d3 {
  const kunci: KunciPengujiM2d3 = { benih: BENIH_M2D3, tebak: [], kartu: [], alami: [] };
  const semua: Array<{ l: OmonganLolosPeran; kartu: KartuTampil[] }> = [];
  const drafPeran = new Map<string, DrafSimulasi>();
  for (const paket of URUTAN_PERAN) {
    const h = bacaRiwayatPeran(paket);
    if (h === null) continue;
    const p = bacaPaketM2d3(paket);
    const lolos = omonganLolosPeran(paket, h);
    for (const l of lolos) semua.push({ l, kartu: kartuOmongan(l.omongan, p) });
    if (lolos.length > 0) drafPeran.set(paket, { omongan: lolos.map((l) => l.omongan) });
  }

  const urutTebak = kocok(semua, acak(BENIH_M2D3));
  const soalTebak = urutTebak.map((x, i) => {
    const id = `Q${String(i + 1)}`;
    kunci.tebak.push({ id, paket: x.l.paket, no: x.l.no, kunci: x.l.omongan.kunci, putaran: x.l.putaran });
    return tulisSoalTebak(id, polos(x.l.omongan)) + '\n';
  });
  const tebak = [PETUNJUK_TEBAK, '', ...soalTebak].join('\n');

  const urutKartu = kocok(semua, acak(BENIH_M2D3 + 1));
  const soalKartu = urutKartu.map((x, i) => {
    const id = `Q${String(i + 1)}`;
    const penentu = x.kartu.filter((k) => x.l.omongan.kartu_penentu.includes(k.fact_id)).map((k) => k.no);
    kunci.kartu.push({ id, paket: x.l.paket, no: x.l.no, kunci: x.l.omongan.kunci, penentu });
    return tulisSoalKartuLuar(id, polos(x.l.omongan), x.kartu) + '\n';
  });
  const kartu = [PETUNJUK_KARTU, '', ...soalKartu].join('\n');

  const r3 = acak(BENIH_M2D3 + 2);
  const bagian: string[] = [PETUNJUK_ALAMI, ''];
  let kelompok = 0;
  for (const paket of URUTAN_PERAN) {
    const calon: DrafPolos[] = [];
    const d3 = drafPeran.get(paket);
    if (d3 !== undefined) calon.push({ ...polosDariDraf(paket, 'agen-m2d3', d3, 2), sumber: 'agen-m2d3' });
    const h2 = bacaRiwayatM2d2(paket);
    const l2 = h2 === null ? [] : lolosM2d2(paket, h2);
    if (l2.length > 0) calon.push({ ...polosDariDraf(paket, 'agen-m2d2', { omongan: l2.map((l) => l.omongan) }, 2), sumber: 'agen-m2d2' });
    const lama = drafM2d1(paket);
    if (lama !== null) calon.push({ ...polosDariDraf(paket, 'm2d1', lama, 2), sumber: 'm2d1-deepseek' });
    const berkas = BERKAS_MANUSIA[paket];
    if (berkas !== undefined) calon.push(polosDariKasus(paket, berkas));
    // Kelompok hanya bila ada draf M2d-3 atau pembanding manusia.
    if (d3 === undefined && berkas === undefined) continue;
    kelompok += 1;
    const urut = kocok(calon, r3);
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
  mkdirSync(`${FOLDER_PENGUJI_M2D3}/jawaban`, { recursive: true });
  const { tebak, kartu, alami, kunci } = bangunBahanPeran();
  writeFileSync(`${FOLDER_PENGUJI_M2D3}/tebak.md`, tebak, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D3}/kartu.md`, kartu, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D3}/alami.md`, alami, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D3}/kunci.json`, JSON.stringify(kunci, null, 2) + '\n', 'utf8');
  console.log(
    `tebak.md: ${String(kunci.tebak.length)} soal · kartu.md: ${String(kunci.kartu.length)} soal · ` +
      `alami.md: ${String(kunci.alami.length)} kelompok, ${String(kunci.alami.reduce((a, k) => a + Object.keys(k.label).length, 0))} draf`,
  );
  return 0;
}

if (/(^|[\\/])peran-penguji\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
