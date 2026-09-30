/**
 * `npm run templat:penguji -- --bahan` / tanpa argumen — uji luar + putusan
 * mekanis jalan TIRT M2d-10 (mesin templat, lewat pintu penyusun) terhadap
 * pra-registrasi M2d-7 (`docs/bukti/m2d7-praregistrasi.md`, TIDAK diubah),
 * pra-registrasi M2d-10 §6.
 *
 * - `--bahan`: tebak.md (petunjuk tebak M2d-1…), kartu.md (petunjuk kartu
 *   pra-registrasi M2d-7), alami.md, kunci.json — dari ketiga omongan draf yang
 *   terbit, atau (tidak terbit) omongan yang dikunci, hanya untuk laporan.
 *   Urutan diacak benih tetap.
 * - tanpa argumen: jawaban mentah penguji (`penguji/jawaban/`) →
 *   `putusanTayang` (kode M2d-7) → `putusan.json`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tulisSoalKartuLuar } from '../agen-penguji.ts';
import type { OmonganDraf } from '../draf.ts';
import { AKAR } from '../env.ts';
import { kartuOmongan } from '../gerbang-kartu.ts';
import type { PaketFakta } from '../paket.ts';
import { PETUNJUK_KARTU_M2D7, bacaJawaban, putusanTayang, type JawabKartu, type JawabTebak, type OmonganUji } from '../pengecoh-putusan.ts';
import { PETUNJUK_ALAMI, PETUNJUK_TEBAK, acak, kocok, polosDariDraf, polosDariKasus, tulisDrafAlami, tulisSoalTebak, type DrafPolos, type OmonganPolos } from '../penguji.ts';
import { teksPolos } from '../../skema/rujukan.ts';
import { FOLDER_M2D10 } from './konfig.ts';

export const FOLDER_PENGUJI_M2D10 = `${FOLDER_M2D10}/penguji`;
export const FOLDER_JALAN_TIRT_M2D10 = `${AKAR}eval/penyusun/m2d10-tirt`;
export const BENIH_M2D10 = 20261005;

export interface KunciPengujiM2d10 {
  benih: number;
  terbit: boolean;
  tebak: Array<{ id: string; no: number; kunci: string }>;
  kartu: Array<{ id: string; no: number; kunci: string; penentu: number[] }>;
  alami: Array<{ kelompok: number; label: Record<string, string> }>;
}

function polos(o: OmonganDraf): OmonganPolos {
  return {
    nama: o.nama, jam: o.jam, pesan: teksPolos(o.pesan),
    pilihan: { a: teksPolos(o.pilihan.a), b: teksPolos(o.pilihan.b), c: teksPolos(o.pilihan.c), d: teksPolos(o.pilihan.d) },
    kunci: o.kunci, penjelasan: teksPolos(o.penjelasan),
  };
}

/** Omongan yang diuji: draf terbit (ketiganya) atau omongan yang dikunci. Murni. */
export function omonganDiujiTemplat(hasil: { lolos: boolean; draf: { omongan: OmonganDraf[] } | null; kunci: Array<{ no: number; omongan: OmonganDraf }> }): Array<{ no: number; omongan: OmonganDraf }> {
  if (hasil.lolos && hasil.draf !== null) return hasil.draf.omongan.map((o, i) => ({ no: i + 1, omongan: o }));
  return [...hasil.kunci].sort((a, b) => a.no - b.no).map((k) => ({ no: k.no, omongan: k.omongan }));
}

export function bangunBahanM2d10(diuji: ReadonlyArray<{ no: number; omongan: OmonganDraf }>, paket: PaketFakta, terbit: boolean): { tebak: string; kartu: string; alami: string; kunci: KunciPengujiM2d10 } {
  const kunci: KunciPengujiM2d10 = { benih: BENIH_M2D10, terbit, tebak: [], kartu: [], alami: [] };
  const soalTebak = kocok(diuji, acak(BENIH_M2D10)).map((x, i) => {
    const id = `Q${String(i + 1)}`;
    kunci.tebak.push({ id, no: x.no, kunci: x.omongan.kunci });
    return tulisSoalTebak(id, polos(x.omongan)) + '\n';
  });
  const soalKartu = kocok(diuji, acak(BENIH_M2D10 + 1)).map((x, i) => {
    const id = `Q${String(i + 1)}`;
    const kartu = kartuOmongan(x.omongan, paket);
    kunci.kartu.push({ id, no: x.no, kunci: x.omongan.kunci, penentu: kartu.filter((k) => x.omongan.kartu_penentu.includes(k.fact_id)).map((k) => k.no) });
    return tulisSoalKartuLuar(id, polos(x.omongan), kartu) + '\n';
  });
  const calon: DrafPolos[] = [{ ...polosDariDraf('tirt', 'agen-m2d10', { omongan: diuji.map((x) => x.omongan) }, 2), sumber: 'agen-m2d10' }];
  const d8 = `${AKAR}eval/keluaran-m2d8/penguji/draf-terbaik.json`;
  if (existsSync(d8)) {
    const l = (JSON.parse(readFileSync(d8, 'utf8')) as Array<{ status: string; omongan: OmonganDraf }>).filter((x) => x.status === 'lolos').map((x) => x.omongan);
    if (l.length > 0) calon.push({ ...polosDariDraf('tirt', 'agen-m2d8', { omongan: l }, 2), sumber: 'agen-m2d8' });
  }
  calon.push(polosDariKasus('ultj', 'ultj-2026-05-04.json'));
  const bagian: string[] = [PETUNJUK_ALAMI, '', '## Kelompok 1', ''];
  const label: Record<string, string> = {};
  kocok(calon, acak(BENIH_M2D10 + 2)).forEach((d, j) => {
    const h = 'ABCD'[j] ?? `X${String(j)}`;
    label[h] = d.sumber;
    bagian.push(tulisDrafAlami(h, d));
  });
  kunci.alami.push({ kelompok: 1, label });
  return { tebak: [PETUNJUK_TEBAK, '', ...soalTebak].join('\n'), kartu: [PETUNJUK_KARTU_M2D7, '', ...soalKartu].join('\n'), alami: bagian.join('\n'), kunci };
}

export function omonganUjiM2d10(kunci: KunciPengujiM2d10, diuji: ReadonlyArray<{ no: number; omongan: OmonganDraf }>): OmonganUji[] {
  return kunci.tebak
    .map((t) => {
      const k = kunci.kartu.find((x) => x.no === t.no);
      const o = diuji.find((x) => x.no === t.no)?.omongan;
      if (k === undefined || o === undefined) throw new Error(`omongan ${String(t.no)} tidak lengkap`);
      return { no: t.no, kunci: o.kunci, id_tebak: t.id, id_kartu: k.id, penentu: k.penentu, omongan: o };
    })
    .sort((a, b) => a.no - b.no);
}

let FOLDER_JALAN_AKTIF = FOLDER_JALAN_TIRT_M2D10;
let FOLDER_PENGUJI_AKTIF = FOLDER_PENGUJI_M2D10;

function bacaJalan(): { hasil: { lolos: boolean; draf: { omongan: OmonganDraf[] } | null; kunci: Array<{ no: number; omongan: OmonganDraf }> }; paket: PaketFakta } {
  return {
    hasil: JSON.parse(readFileSync(`${FOLDER_JALAN_AKTIF}/hasil.json`, 'utf8')) as never,
    paket: JSON.parse(readFileSync(`${FOLDER_JALAN_AKTIF}/paket.json`, 'utf8')) as PaketFakta,
  };
}

function utama(argumen: string[]): number {
  // A-1: `--jalan <id>` (eval/penyusun/<id>) dan `--keluar <folder>` (eval/keluaran-m2d10/<folder>).
  const iJ = argumen.indexOf('--jalan');
  const iK = argumen.indexOf('--keluar');
  if (iJ >= 0 && /^m2d10-[a-z0-9-]+$/.test(argumen[iJ + 1] ?? '')) FOLDER_JALAN_AKTIF = `${AKAR}eval/penyusun/${String(argumen[iJ + 1])}`;
  if (iK >= 0 && /^penguji-[a-z0-9-]+$/.test(argumen[iK + 1] ?? '')) FOLDER_PENGUJI_AKTIF = `${FOLDER_M2D10}/${String(argumen[iK + 1])}`;
  if (!existsSync(`${FOLDER_JALAN_AKTIF}/hasil.json`)) {
    console.error('Jalan TIRT M2d-10 belum ada.');
    return 1;
  }
  const { hasil, paket } = bacaJalan();
  const diuji = omonganDiujiTemplat(hasil);
  mkdirSync(`${FOLDER_PENGUJI_AKTIF}/jawaban`, { recursive: true });
  if (argumen.includes('--bahan')) {
    if (diuji.length === 0) {
      const p = putusanTayang(hasil.lolos, [], [], []);
      writeFileSync(`${FOLDER_PENGUJI_AKTIF}/putusan.json`, JSON.stringify({ catatan: 'tidak ada omongan yang dikunci: tidak ada bahan uji luar', ...p }, null, 2) + '\n', 'utf8');
      console.log(`Tidak ada omongan yang dikunci. PUTUSAN: ${p.layak_tayang ? 'LAYAK TAYANG' : 'TIDAK layak tayang'}.`);
      return 0;
    }
    const b = bangunBahanM2d10(diuji, paket, hasil.lolos);
    writeFileSync(`${FOLDER_PENGUJI_AKTIF}/tebak.md`, b.tebak, 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_AKTIF}/kartu.md`, b.kartu, 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_AKTIF}/alami.md`, b.alami, 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_AKTIF}/kunci.json`, JSON.stringify(b.kunci, null, 2) + '\n', 'utf8');
    console.log(`${hasil.lolos ? 'terbit' : 'tidak terbit'} — ${String(diuji.length)} omongan diuji.`);
    return 0;
  }
  const kunci = JSON.parse(readFileSync(`${FOLDER_PENGUJI_AKTIF}/kunci.json`, 'utf8')) as KunciPengujiM2d10;
  const folder = `${FOLDER_PENGUJI_AKTIF}/jawaban`;
  const tebak = [1, 2, 3].map((n) => bacaJawaban<JawabTebak>('tebak', n, folder));
  const kartu = [1, 2, 3].map((n) => bacaJawaban<JawabKartu>('kartu', n, folder));
  const p = putusanTayang(kunci.terbit, omonganUjiM2d10(kunci, diuji), tebak, kartu);
  writeFileSync(`${FOLDER_PENGUJI_AKTIF}/putusan.json`, JSON.stringify(p, null, 2) + '\n', 'utf8');
  console.log(`(a) terbit: ${String(p.a_terbit)}; (b) ${String(p.b_tebak.lolos)}/${String(p.b_tebak.total)}: ${String(p.b_tebak.terpenuhi)}; (c) ${String(p.c_kartu.lolos)}/${String(p.c_kartu.total)}: ${String(p.c_kartu.terpenuhi)}; (d) ${String(p.d_makna.masalah)}: ${String(p.d_makna.terpenuhi)}`);
  console.log(`PUTUSAN: ${p.layak_tayang ? 'LAYAK TAYANG' : 'TIDAK layak tayang'}`);
  return 0;
}

if (/(^|[\\/])templat[\\/]uji-luar\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama(process.argv.slice(2));
