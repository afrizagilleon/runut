/**
 * `npm run agen:penguji` — bahan pembanding EKSTERNAL untuk draf lingkar agen
 * (M2d-2 D-6). Penguji dan penilai adalah subagent Claude baru tanpa konteks
 * eksekutor; masing-masing hanya menerima isi SATU berkas bahan dari sini.
 *
 * Tiga bahan:
 *
 * - `tebak.md` — uji tebak buta K-05, petunjuk PERSIS sama dengan M2d-1
 *   (`PETUNJUK_TEBAK` di `penguji.ts`), supaya angkanya bisa dibandingkan
 *   dengan 3/24 M2d-1. Isinya omongan yang lolos gerbang di dalam lingkar,
 *   diacak berbenih, tanpa kartu. Seperti bundel M2d-1, satu penguji melihat
 *   paling banyak satu draf per paket.
 * - `kartu.md` — uji jawab-dengan-kartu K-05: pesan + kartu (bernomor) +
 *   pertanyaan + pilihan; peran "orang 20-an yang belum pernah beli saham,
 *   membaca di ponsel, tidak mau berhitung"; wajib menunjuk kartu penentu dan
 *   menyebut kalimat yang membingungkan.
 * - `alami.md` — penilaian kealamian buta, petunjuk sama dengan M2d-1
 *   (`PETUNJUK_ALAMI`). Per paket: draf agen M2d-2 (omongan yang dikunci
 *   lingkar — satu sampai tiga, karena simulasi yang tidak lolos penuh tetap
 *   punya omongan terkunci yang layak dinilai), draf DeepSeek M2d-1
 *   (putaran 2, model dan paket yang sama, tanpa lingkar), dan — untuk DADA
 *   dan ULTJ — omongan manusia yang hidup. Label acak; kuncinya hanya di
 *   `kunci.json`, tidak pernah dikirim.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { HasilAgen } from './agen.ts';
import { FOLDER_M2D2, URUTAN_AGEN } from './agen-susun.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { kartuOmongan, type KartuTampil } from './gerbang-kartu.ts';
import { MODEL_AGEN } from './model.ts';
import type { PaketFakta } from './paket.ts';
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
import type { HasilSusun } from './susun.ts';
import { FOLDER, namaSel } from './tanding.ts';
import { teksPolos } from '../skema/rujukan.ts';

export const FOLDER_PENGUJI_M2D2 = `${FOLDER_M2D2}/penguji`;
export const BENIH_M2D2 = 20260928;

export const PETUNJUK_KARTU = [
  'Bayangkan kamu orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung.',
  'Di bawah ada beberapa soal latihan. Tiap soal: seorang teman mengirim pesan di grup obrolan tentang',
  'sebuah saham, lalu ada beberapa kartu (potongan dokumen resmi), pertanyaan, dan empat pilihan.',
  'Tiap soal berdiri sendiri. Untuk tiap soal: cocokkan omongan teman dengan kartunya, pilih satu huruf,',
  'sebutkan nomor kartu yang menentukan jawabanmu, dan tulis kalimat (dari soal) yang membingungkanmu —',
  'kosongkan kalau tidak ada. Jangan memakai alat apa pun dan jangan mencari informasi.',
  'Balas HANYA dengan JSON berbentuk:',
  '{"jawaban": [{"id": "Q1", "pilihan": "a", "kartu": [1], "bingung": "..."}, ...]}',
].join('\n');

/** Satu omongan yang lolos semua gerbang di dalam lingkar, dengan putusan gerbangnya. */
export interface OmonganLolos {
  paket: string;
  no: number;
  putaran: number;
  omongan: OmonganDraf;
  kartu_dalam: { pilihan: KunciOpsi | null; menunjuk_penentu: boolean } | null;
  tebak_dalam: { benar: number; yakin_benar: number | null; tebakan: Array<{ pilihan: KunciOpsi; yakin: number }> } | null;
}

export function bacaRiwayat(paket: string): HasilAgen | null {
  const jalur = `${FOLDER_M2D2}/${paket}/riwayat.json`;
  return existsSync(jalur) ? (JSON.parse(readFileSync(jalur, 'utf8')) as HasilAgen) : null;
}

export function bacaPaketM2d2(paket: string): PaketFakta {
  return JSON.parse(readFileSync(`${FOLDER_M2D2}/${paket}/paket.json`, 'utf8')) as PaketFakta;
}

/** Omongan yang dikunci lingkar (lolos validator + kedua gerbang), versi yang dikunci. */
export function omonganLolos(paket: string, h: HasilAgen): OmonganLolos[] {
  const hasil: OmonganLolos[] = [];
  for (const r of h.riwayat) {
    for (const p of r.omongan) {
      const o = r.draf[p.no - 1];
      if (p.status !== 'lolos' || o === null || o === undefined) continue;
      hasil.push({
        paket,
        no: p.no,
        putaran: r.putaran,
        omongan: o,
        kartu_dalam: p.kartu === null ? null : { pilihan: p.kartu.pilihan, menunjuk_penentu: p.kartu.menunjuk_penentu },
        tebak_dalam:
          p.tebak === null
            ? null
            : {
                benar: p.tebak.benar,
                yakin_benar: p.tebak.yakin_benar,
                tebakan: p.tebak.tebakan.map((t) => ({ pilihan: t.pilihan, yakin: t.yakin })),
              },
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
    pilihan: {
      a: teksPolos(o.pilihan.a),
      b: teksPolos(o.pilihan.b),
      c: teksPolos(o.pilihan.c),
      d: teksPolos(o.pilihan.d),
    },
    kunci: o.kunci,
    penjelasan: teksPolos(o.penjelasan),
  };
}

export function tulisSoalKartuLuar(id: string, o: OmonganPolos, kartu: readonly KartuTampil[]): string {
  return [
    `### ${id}`,
    `Pesan dari ${o.nama} (${o.jam}): "${o.pesan}"`,
    'Kartu:',
    ...kartu.map((k) => `- Kartu ${String(k.no)} — ${k.kepala}: ${k.isi}`),
    `Pertanyaan: Omongan ${o.nama} cocok dengan dokumennya?`,
    `a) ${o.pilihan.a}`,
    `b) ${o.pilihan.b}`,
    `c) ${o.pilihan.c}`,
    `d) ${o.pilihan.d}`,
  ].join('\n');
}

export interface ButirLuar {
  id: string;
  paket: string;
  no: number;
  kunci: KunciOpsi;
}

export interface KunciPengujiM2d2 {
  benih: number;
  tebak: Array<ButirLuar & { putaran: number }>;
  kartu: Array<ButirLuar & { penentu: number[] }>;
  alami: Array<{ kelompok: number; paket: string; label: Record<string, string> }>;
}

/** Draf DeepSeek M2d-1 putaran 2 untuk paket ini (model sama, tanpa lingkar), bila lolos validator. */
export function drafM2d1(paket: string): DrafSimulasi | null {
  const jalur = `${FOLDER}/sel-putaran2/${namaSel(paket, MODEL_AGEN)}.json`;
  if (!existsSync(jalur)) return null;
  const sel = JSON.parse(readFileSync(jalur, 'utf8')) as HasilSusun;
  return sel.lolos ? sel.draf : null;
}

const BERKAS_MANUSIA: Partial<Record<string, string>> = {
  dada: 'dada-2025-10-08.json',
  ultj: 'ultj-2026-05-04.json',
};

export interface BahanPenguji {
  tebak: string;
  kartu: string;
  alami: string;
  kunci: KunciPengujiM2d2;
}

/** Bangun ketiga bahan dan kuncinya dari keluaran lingkar yang tersimpan. Murni; tidak menulis apa pun. */
export function bangunBahan(): BahanPenguji {
  const kunci: KunciPengujiM2d2 = { benih: BENIH_M2D2, tebak: [], kartu: [], alami: [] };
  const semua: Array<{ l: OmonganLolos; kartu: KartuTampil[] }> = [];
  /** Per paket: omongan yang dikunci lingkar (1–3), sebagai draf untuk penilaian kealamian. */
  const lengkap: Array<{ paket: string; draf: DrafSimulasi }> = [];
  for (const paket of URUTAN_AGEN) {
    const h = bacaRiwayat(paket);
    if (h === null) continue;
    const p = bacaPaketM2d2(paket);
    const lolos = omonganLolos(paket, h);
    for (const l of lolos) semua.push({ l, kartu: kartuOmongan(l.omongan, p) });
    if (lolos.length > 0) lengkap.push({ paket, draf: { omongan: lolos.map((l) => l.omongan) } });
  }

  // --- tebak buta (tanpa kartu)
  const r1 = acak(BENIH_M2D2);
  const urutTebak = kocok(semua, r1);
  const soalTebak = urutTebak.map((x, i) => {
    const id = `Q${String(i + 1)}`;
    kunci.tebak.push({ id, paket: x.l.paket, no: x.l.no, kunci: x.l.omongan.kunci, putaran: x.l.putaran });
    return tulisSoalTebak(id, polos(x.l.omongan)) + '\n';
  });
  const tebak = [PETUNJUK_TEBAK, '', ...soalTebak].join('\n');

  // --- jawab dengan kartu
  const r2 = acak(BENIH_M2D2 + 1);
  const urutKartu = kocok(semua, r2);
  const soalKartu = urutKartu.map((x, i) => {
    const id = `Q${String(i + 1)}`;
    const penentu = x.kartu.filter((k) => x.l.omongan.kartu_penentu.includes(k.fact_id)).map((k) => k.no);
    kunci.kartu.push({ id, paket: x.l.paket, no: x.l.no, kunci: x.l.omongan.kunci, penentu });
    return tulisSoalKartuLuar(id, polos(x.l.omongan), x.kartu) + '\n';
  });
  const kartu = [PETUNJUK_KARTU, '', ...soalKartu].join('\n');

  // --- kealamian: per paket, draf agen + draf M2d-1 (model sama) + manusia
  const r3 = acak(BENIH_M2D2 + 2);
  const bagian: string[] = [PETUNJUK_ALAMI, ''];
  lengkap.forEach(({ paket, draf }, j) => {
    const calon: DrafPolos[] = [{ ...polosDariDraf(paket, 'agen-m2d2', draf, 2), sumber: 'agen-m2d2' }];
    const lama = drafM2d1(paket);
    if (lama !== null) calon.push({ ...polosDariDraf(paket, 'm2d1', lama, 2), sumber: 'm2d1-deepseek' });
    const berkas = BERKAS_MANUSIA[paket];
    if (berkas !== undefined) calon.push(polosDariKasus(paket, berkas));
    const urut = kocok(calon, r3);
    const label: Record<string, string> = {};
    bagian.push(`## Kelompok ${String(j + 1)}`, '');
    urut.forEach((d, k) => {
      const huruf = 'ABCD'[k] ?? `X${String(k)}`;
      label[huruf] = d.sumber;
      bagian.push(tulisDrafAlami(huruf, d));
    });
    kunci.alami.push({ kelompok: j + 1, paket, label });
  });
  return { tebak, kartu, alami: bagian.join('\n'), kunci };
}

function utama(): number {
  mkdirSync(`${FOLDER_PENGUJI_M2D2}/jawaban`, { recursive: true });
  const { tebak, kartu, alami, kunci } = bangunBahan();
  writeFileSync(`${FOLDER_PENGUJI_M2D2}/tebak.md`, tebak, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D2}/kartu.md`, kartu, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D2}/alami.md`, alami, 'utf8');
  writeFileSync(`${FOLDER_PENGUJI_M2D2}/kunci.json`, JSON.stringify(kunci, null, 2) + '\n', 'utf8');
  console.log(
    `tebak.md: ${String(kunci.tebak.length)} soal · kartu.md: ${String(kunci.kartu.length)} soal · ` +
      `alami.md: ${String(kunci.alami.length)} kelompok, ${String(kunci.alami.reduce((a, k) => a + Object.keys(k.label).length, 0))} draf`,
  );
  return 0;
}

if (/(^|[\\/])agen-penguji\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
