/**
 * `npm run tirt:penguji` — bahan pembanding EKSTERNAL untuk TIRT M2d-5
 * (kontrak D-10; prosedur sama dengan M2d-4 D-8). Penguji dan penilai adalah
 * subagent Claude baru tanpa konteks eksekutor; masing-masing hanya menerima
 * isi SATU berkas bahan dari sini, dengan label acak.
 *
 * - `tebak.md` — tebak buta K-05, petunjuk PERSIS sama dengan M2d-1…M2d-4
 *   (`PETUNJUK_TEBAK`): omongan yang dikunci lingkar M2d-5 (TIRT).
 * - `kartu.md` — jawab-dengan-kartu K-05 (`PETUNJUK_KARTU` M2d-2), ditambah
 *   SATU pertanyaan baru (D-10): "Adakah bagian pesan teman yang berupa
 *   penilaian (aman/bagus/pasti) yang tak bisa dicek dari kartu?".
 * - `alami.md` — kealamian buta (`PETUNJUK_ALAMI` M2d-1). Kelompok TIRT:
 *   draf M2d-5, M2d-4, M2d-3 (omongan yang dikunci). Kelompok ULTJ sebagai
 *   jangkar: omongan manusia yang hidup + draf M2d-4 yang terbit — supaya skor
 *   penilai M2d-5 bisa dibandingkan dengan skor manusia yang sama.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { PETUNJUK_KARTU, tulisSoalKartuLuar } from './agen-penguji.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { bacaPaketDi, bacaRiwayatDi } from './gaya-penguji.ts';
import { FOLDER_M2D4 } from './gaya-susun.ts';
import { kartuOmongan, type KartuTampil } from './gerbang-kartu.ts';
import { omonganLolosPeran, type OmonganLolosPeran } from './peran-penguji.ts';
import { FOLDER_M2D3 } from './peran-susun.ts';
import { PETUNJUK_ALAMI, PETUNJUK_TEBAK, acak, kocok, polosDariDraf, polosDariKasus, tulisDrafAlami, tulisSoalTebak, type DrafPolos, type OmonganPolos } from './penguji.ts';
import { FOLDER_M2D5 } from './tirt-susun.ts';
import { teksPolos } from '../skema/rujukan.ts';

export const FOLDER_PENGUJI_M2D5 = `${FOLDER_M2D5}/penguji`;
export const BENIH_M2D5 = 20261001;

/** Pertanyaan baru D-10 untuk penguji kartu, persis kalimat kontrak. */
export const PERTANYAAN_PENILAIAN = 'Adakah bagian pesan teman yang berupa penilaian (aman/bagus/pasti) yang tak bisa dicek dari kartu?';

/** Petunjuk penguji kartu M2d-5 = petunjuk M2d-2 + pertanyaan penilaian; bentuk JSON memuat medan "penilaian". */
export const PETUNJUK_KARTU_M2D5 = [
  ...PETUNJUK_KARTU.split('\n').slice(0, -2),
  `Satu pertanyaan tambahan untuk tiap soal: ${PERTANYAAN_PENILAIAN} Tulis bagian itu di "penilaian" — kosongkan kalau tidak ada.`,
  'Balas HANYA dengan JSON berbentuk:',
  '{"jawaban": [{"id": "Q1", "pilihan": "a", "kartu": [1], "bingung": "...", "penilaian": "..."}, ...]}',
].join('\n');

/** Omongan yang dikunci lingkar M2d-5 per paket (urut nomor). */
export function lolosM2d5(paket: string, folder: string = FOLDER_M2D5): OmonganLolosPeran[] {
  const h = bacaRiwayatDi(folder, paket);
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

export interface KunciPengujiM2d5 {
  benih: number;
  tebak: Array<{ id: string; paket: string; no: number; kunci: KunciOpsi; putaran: number }>;
  kartu: Array<{ id: string; paket: string; no: number; kunci: KunciOpsi; penentu: number[] }>;
  alami: Array<{ kelompok: number; paket: string; label: Record<string, string> }>;
}

export interface BahanPengujiM2d5 {
  tebak: string;
  kartu: string;
  alami: string;
  kunci: KunciPengujiM2d5;
}

/** Pilihan bahan (M2d-6 memakai prosedur yang sama dengan benih dan pembanding lain). */
export interface OpsiBahanTirt {
  benih: number;
  /** Label sumber draf yang diuji di kelompok kealamian TIRT. */
  label: string;
  /** Draf TIRT pembanding di kelompok kealamian: [folder keluaran, label]. */
  pembanding: ReadonlyArray<readonly [string, string]>;
}

export const OPSI_BAHAN_M2D5: OpsiBahanTirt = { benih: BENIH_M2D5, label: 'agen-m2d5', pembanding: [[FOLDER_M2D4, 'agen-m2d4'], [FOLDER_M2D3, 'agen-m2d3']] };

/** Bangun ketiga bahan dan kuncinya dari keluaran yang tersimpan. Murni; tidak menulis apa pun. */
export function bangunBahanTirt(folder: string = FOLDER_M2D5, opsi: OpsiBahanTirt = OPSI_BAHAN_M2D5): BahanPengujiM2d5 {
  const BENIH = opsi.benih;
  const kunci: KunciPengujiM2d5 = { benih: BENIH, tebak: [], kartu: [], alami: [] };
  const lolos = lolosM2d5('tirt', folder);
  const p = lolos.length === 0 ? null : bacaPaketDi(folder, 'tirt');
  const semua: Array<{ l: OmonganLolosPeran; kartu: KartuTampil[] }> = p === null ? [] : lolos.map((l) => ({ l, kartu: kartuOmongan(l.omongan, p) }));

  const soalTebak = kocok(semua, acak(BENIH)).map((x, i) => {
    const id = `Q${String(i + 1)}`;
    kunci.tebak.push({ id, paket: x.l.paket, no: x.l.no, kunci: x.l.omongan.kunci, putaran: x.l.putaran });
    return tulisSoalTebak(id, polos(x.l.omongan)) + '\n';
  });
  const tebak = [PETUNJUK_TEBAK, '', ...soalTebak].join('\n');

  const soalKartu = kocok(semua, acak(BENIH + 1)).map((x, i) => {
    const id = `Q${String(i + 1)}`;
    const penentu = x.kartu.filter((k) => x.l.omongan.kartu_penentu.includes(k.fact_id)).map((k) => k.no);
    kunci.kartu.push({ id, paket: x.l.paket, no: x.l.no, kunci: x.l.omongan.kunci, penentu });
    return tulisSoalKartuLuar(id, polos(x.l.omongan), x.kartu) + '\n';
  });
  const kartu = [PETUNJUK_KARTU_M2D5, '', ...soalKartu].join('\n');

  const r = acak(BENIH + 2);
  const bagian: string[] = [PETUNJUK_ALAMI, ''];
  const kelompok: Array<{ paket: string; calon: DrafPolos[] }> = [];
  const tirt: DrafPolos[] = [];
  if (lolos.length > 0) tirt.push({ ...polosDariDraf('tirt', opsi.label, { omongan: lolos.map((l) => l.omongan) } satisfies DrafSimulasi, 2), sumber: opsi.label });
  for (const [f, sumber] of opsi.pembanding) {
    const h = bacaRiwayatDi(f, 'tirt');
    const l = h === null ? [] : omonganLolosPeran('tirt', h);
    if (l.length > 0) tirt.push({ ...polosDariDraf('tirt', sumber, { omongan: l.map((x) => x.omongan) }, 2), sumber });
  }
  if (tirt.length > 0) kelompok.push({ paket: 'tirt', calon: tirt });
  const ultj4 = bacaRiwayatDi(FOLDER_M2D4, 'ultj');
  const lu = ultj4 === null ? [] : omonganLolosPeran('ultj', ultj4);
  kelompok.push({
    paket: 'ultj',
    calon: [
      polosDariKasus('ultj', 'ultj-2026-05-04.json'),
      ...(lu.length > 0 ? [{ ...polosDariDraf('ultj', 'agen-m2d4', { omongan: lu.map((x) => x.omongan) }, 2), sumber: 'agen-m2d4' }] : []),
    ],
  });
  kelompok.forEach((k, i) => {
    const label: Record<string, string> = {};
    bagian.push(`## Kelompok ${String(i + 1)}`, '');
    kocok(k.calon, r).forEach((d, j) => {
      const huruf = 'ABCD'[j] ?? `X${String(j)}`;
      label[huruf] = d.sumber;
      bagian.push(tulisDrafAlami(huruf, d));
    });
    kunci.alami.push({ kelompok: i + 1, paket: k.paket, label });
  });
  return { tebak, kartu, alami: bagian.join('\n'), kunci };
}

function utama(): number {
  mkdirSync(`${FOLDER_PENGUJI_M2D5}/jawaban`, { recursive: true });
  const { tebak, kartu, alami, kunci } = bangunBahanTirt();
  if (kunci.tebak.length === 0) {
    console.error('Tidak ada omongan TIRT M2d-5 yang dikunci; bahan tidak ditulis.');
    return 1;
  }
  writeFileSync(`${FOLDER_PENGUJI_M2D5}/tebak.md`, tebak, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D5}/kartu.md`, kartu, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D5}/alami.md`, alami, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D5}/kunci.json`, JSON.stringify(kunci, null, 2) + '\n', 'utf8');
  console.log(
    `tebak.md: ${String(kunci.tebak.length)} soal · kartu.md: ${String(kunci.kartu.length)} soal · ` +
      `alami.md: ${String(kunci.alami.length)} kelompok, ${String(kunci.alami.reduce((a, k) => a + Object.keys(k.label).length, 0))} draf`,
  );
  return 0;
}

if (/(^|[\\/])tirt-penguji\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
