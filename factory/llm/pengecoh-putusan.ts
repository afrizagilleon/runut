/**
 * Uji luar + putusan MEKANIS M2d-7 (kontrak D-8) terhadap pra-registrasi
 * `docs/bukti/m2d7-praregistrasi.md` (di-commit sebelum panggilan berbayar
 * pertama; dites sama dengan kode ini).
 *
 * `npm run pengecoh:putusan -- --bahan` menulis bahan uji luar
 * (`eval/keluaran-m2d7/penguji/`: tebak.md, kartu.md, alami.md, kunci.json)
 * dari draf yang diuji (aturan pra-registrasi): draf terbit jalan PERTAMA
 * yang terbit, atau — bila tidak ada yang terbit — omongan yang dikunci di
 * jalan TERAKHIR yang dijalankan. Prosedurnya sama dengan M2d-6
 * (`bangunBahanTirt`: benih tetap, label acak); hanya petunjuk kartu yang
 * ditambah daftar periksa makna (pra-registrasi).
 *
 * `npm run pengecoh:putusan` (tanpa jaringan) membaca jawaban mentah penguji
 * (`penguji/jawaban/`) dan menurunkan putusan LAYAK TAYANG / TIDAK dari empat
 * syarat pra-registrasi. Jawaban pengganti (`<berkas>-ganti.txt`) dipakai bila
 * ada (pra-registrasi: penguji yang jawabannya tidak terbaca diganti sekali).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { lolosKartuLuar, lolosTebakLuar } from './agen-laporan.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { gKembar } from './gerbang-kembar.ts';
import { gPenilaian } from './gerbang-penilaian.ts';
import { jsonDari } from './laporan.ts';
import { FOLDER_M2D7, MAKS_JALAN_M2D7 } from './pengecoh-konfig.ts';
import { folderJalanM2d7 } from './pengecoh-susun.ts';
import { FOLDER_M2D6 } from './penalar-susun.ts';
import { PETUNJUK_KARTU_M2D5, bangunBahanTirt, type KunciPengujiM2d5, type OpsiBahanTirt } from './tirt-penguji.ts';
import { FOLDER_M2D5 } from './tirt-susun.ts';

export const FOLDER_PENGUJI_M2D7 = `${FOLDER_M2D7}/penguji`;
export const JALUR_PRAREGISTRASI = `${AKAR}docs/bukti/m2d7-praregistrasi.md`;
export const BENIH_M2D7 = 20261003;

/** Proporsi soal manusia yang lolos tebak buta luar (kalibrasi penguji bundel BM, `docs/bukti/uji-tanding-model.md`). */
export const MANUSIA_LOLOS = { lolos: 2, total: 6 } as const;
/** Mayoritas penguji kartu untuk satu butir masalah makna. */
export const MAYORITAS_MAKNA = 2;
/** Jawaban yang dihitung "kosong" (pra-registrasi). */
export const KOSONG: readonly string[] = ['', '-', '—', 'tidak ada', 'tidak', 'none', 'n/a'];

/** Petunjuk penguji kartu M2d-7 = petunjuk M2d-5/M2d-6 (tanpa dua baris bentuk JSON) + daftar periksa makna. */
export const PETUNJUK_KARTU_M2D7 = [
  ...PETUNJUK_KARTU_M2D5.split('\n').slice(0, -2),
  'Daftar periksa untuk tiap soal, dijawab dari kartu saja:',
  '- "kunci_lain": menurut kartu, adakah pilihan LAIN selain pilihanmu yang juga benar? Tulis hurufnya; kosongkan kalau tidak ada.',
  '- "tak_tercek": adakah bagian klaim teman yang tidak bisa dicek (dibenarkan atau dibantah) dari kartu? Kutip bagian itu; kosongkan kalau tidak ada.',
  '- "kembar": adakah dua pilihan yang isinya sama walau kata-katanya berbeda? Tulis kedua hurufnya, misalnya "a,c"; kosongkan kalau tidak ada.',
  'Balas HANYA dengan JSON berbentuk:',
  '{"jawaban": [{"id": "Q1", "pilihan": "a", "kartu": [1], "bingung": "...", "penilaian": "...", "kunci_lain": "", "tak_tercek": "", "kembar": ""}, ...]}',
].join('\n');

export function tidakKosong(x: unknown): boolean {
  if (x === null || x === undefined) return false;
  const t = (Array.isArray(x) ? x.join(',') : String(x)).trim().toLowerCase();
  return !KOSONG.includes(t);
}

/* ---------------------------------------------------------------------- */
/* draf yang diuji (aturan pra-registrasi)                                 */
/* ---------------------------------------------------------------------- */

export interface DrafDiuji {
  jalan: number;
  terbit: boolean;
  /** Folder `eval/keluaran-m2d7/jalan-<n>` (untuk `bangunBahanTirt`). */
  folder: string;
}

/** Jalan PERTAMA yang terbit; bila tidak ada, jalan TERAKHIR yang dijalankan; `null` bila belum ada jalan. */
export function drafDiuji(folder: (n: number) => string = folderJalanM2d7): DrafDiuji | null {
  const jalan: Array<{ n: number; terbit: boolean }> = [];
  for (let n = 1; n <= MAKS_JALAN_M2D7; n++) {
    const d = `${folder(n)}/draf-akhir.json`;
    if (existsSync(d)) jalan.push({ n, terbit: (JSON.parse(readFileSync(d, 'utf8')) as { terbit: boolean }).terbit });
  }
  const pilih = jalan.find((j) => j.terbit) ?? jalan.at(-1);
  return pilih === undefined ? null : { jalan: pilih.n, terbit: pilih.terbit, folder: folder(pilih.n).replace(/\/tirt$/, '') };
}

export const opsiBahanM2d7 = (): OpsiBahanTirt => ({
  benih: BENIH_M2D7,
  label: 'agen-m2d7',
  pembanding: [[`${FOLDER_M2D6}/jalan-1`, 'agen-m2d6'], [FOLDER_M2D5, 'agen-m2d5']],
});

/** Bahan uji luar M2d-7: prosedur M2d-6 persis, petunjuk kartu = pra-registrasi. */
export function bangunBahanM2d7(d: DrafDiuji): { tebak: string; kartu: string; alami: string; kunci: KunciPengujiM2d5 & { jalan: number; terbit: boolean } } {
  const b = bangunBahanTirt(d.folder, opsiBahanM2d7());
  if (!b.kartu.startsWith(PETUNJUK_KARTU_M2D5)) throw new Error('bahan kartu tidak diawali petunjuk M2d-5');
  return { tebak: b.tebak, kartu: PETUNJUK_KARTU_M2D7 + b.kartu.slice(PETUNJUK_KARTU_M2D5.length), alami: b.alami, kunci: { ...b.kunci, jalan: d.jalan, terbit: d.terbit } };
}

/* ---------------------------------------------------------------------- */
/* putusan mekanis                                                         */
/* ---------------------------------------------------------------------- */

export interface JawabTebak {
  id: string;
  pilihan: string;
  yakin: number;
}

export interface JawabKartu {
  id: string;
  pilihan: string;
  kartu: number[];
  bingung?: string;
  penilaian?: string;
  kunci_lain?: string;
  tak_tercek?: string;
  kembar?: string;
}

export interface OmonganUji {
  no: number;
  kunci: KunciOpsi;
  id_tebak: string;
  id_kartu: string;
  penentu: number[];
  omongan: OmonganDraf;
}

export type ButirMakna = 'M1 kunci tunggal' | 'M2 setiap bagian klaim tercek kartu' | 'M3 tanpa penilaian investasi' | 'M4 tanpa pengecoh kembar';

export interface HasilOmonganUji {
  no: number;
  kunci: KunciOpsi;
  tebak: JawabTebak[];
  lolos_tebak: boolean;
  kartu: JawabKartu[];
  lolos_kartu: boolean;
  masalah: Array<{ butir: ButirMakna; sumber: string }>;
}

export interface PutusanTayang {
  a_terbit: boolean;
  b_tebak: { lolos: number; total: number; syarat: string; terpenuhi: boolean };
  c_kartu: { lolos: number; total: number; terpenuhi: boolean };
  d_makna: { masalah: number; terpenuhi: boolean };
  layak_tayang: boolean;
  omongan: HasilOmonganUji[];
}

function hitungMayoritas(k: readonly JawabKartu[], medan: keyof JawabKartu): number {
  return k.filter((x) => tidakKosong(x[medan])).length;
}

/**
 * Putusan dari empat syarat pra-registrasi. Murni.
 * (b) proporsi lolos tebak ≥ 2/6 (manusia); (c) semua omongan lolos K-05
 * kartu; (d) nol masalah makna (≥ 2/3 penguji kartu pada butir yang sama,
 * atau kode: gPenilaian, gKembar).
 */
export function putusanTayang(terbit: boolean, uji: readonly OmonganUji[], tebak: readonly JawabTebak[][], kartu: readonly JawabKartu[][]): PutusanTayang {
  const omongan: HasilOmonganUji[] = uji.map((u) => {
    const jt = tebak.map((p) => p.find((x) => x.id === u.id_tebak)).filter((x): x is JawabTebak => x !== undefined);
    const jk = kartu.map((p) => p.find((x) => x.id === u.id_kartu)).filter((x): x is JawabKartu => x !== undefined);
    const masalah: HasilOmonganUji['masalah'] = [];
    const penguji = (b: ButirMakna, medan: keyof JawabKartu): void => {
      const n = hitungMayoritas(jk, medan);
      if (n >= MAYORITAS_MAKNA) masalah.push({ butir: b, sumber: `${String(n)}/3 penguji kartu ("${medan}")` });
    };
    penguji('M1 kunci tunggal', 'kunci_lain');
    penguji('M2 setiap bagian klaim tercek kartu', 'tak_tercek');
    penguji('M3 tanpa penilaian investasi', 'penilaian');
    if (gPenilaian(u.omongan.pesan).tolak) masalah.push({ butir: 'M3 tanpa penilaian investasi', sumber: 'kode: gPenilaian' });
    penguji('M4 tanpa pengecoh kembar', 'kembar');
    if (gKembar(u.omongan.pilihan).tolak) masalah.push({ butir: 'M4 tanpa pengecoh kembar', sumber: 'kode: gKembar' });
    return {
      no: u.no,
      kunci: u.kunci,
      tebak: jt,
      lolos_tebak: lolosTebakLuar(jt, u.kunci),
      kartu: jk,
      lolos_kartu: lolosKartuLuar(jk.map((x) => ({ pilihan: x.pilihan, kartu: Array.isArray(x.kartu) ? x.kartu : [] })), u.kunci, u.penentu),
      masalah,
    };
  });
  const lolosTebak = omongan.filter((o) => o.lolos_tebak).length;
  const total = omongan.length;
  const bTerpenuhi = total > 0 && lolosTebak * MANUSIA_LOLOS.total >= MANUSIA_LOLOS.lolos * total;
  const lolosKartu = omongan.filter((o) => o.lolos_kartu).length;
  const cTerpenuhi = total > 0 && lolosKartu === total;
  const masalah = omongan.reduce((a, o) => a + o.masalah.length, 0);
  const dTerpenuhi = total > 0 && masalah === 0;
  return {
    a_terbit: terbit,
    b_tebak: { lolos: lolosTebak, total, syarat: `≥ ${String(MANUSIA_LOLOS.lolos)}/${String(MANUSIA_LOLOS.total)} (proporsi soal manusia)`, terpenuhi: bTerpenuhi },
    c_kartu: { lolos: lolosKartu, total, terpenuhi: cTerpenuhi },
    d_makna: { masalah, terpenuhi: dTerpenuhi },
    layak_tayang: terbit && bTerpenuhi && cTerpenuhi && dTerpenuhi,
    omongan,
  };
}

/* ---------------------------------------------------------------------- */
/* berkas                                                                  */
/* ---------------------------------------------------------------------- */

/** Jawaban mentah satu penguji: pengganti (`-ganti`) dipakai bila ada. */
export function bacaJawaban<T>(awalan: string, n: number, folder: string = `${FOLDER_PENGUJI_M2D7}/jawaban`): T[] {
  const ganti = `${folder}/${awalan}-p${String(n)}-ganti.txt`;
  const jalur = existsSync(ganti) ? ganti : `${folder}/${awalan}-p${String(n)}.txt`;
  const j = jsonDari(readFileSync(jalur, 'utf8')) as { jawaban?: T[] };
  return j.jawaban ?? [];
}

export function omonganUji(kunci: KunciPengujiM2d5 & { jalan: number }): OmonganUji[] {
  const h = JSON.parse(readFileSync(`${folderJalanM2d7(kunci.jalan)}/riwayat.json`, 'utf8')) as { riwayat: Array<{ putaran: number; draf: Array<OmonganDraf | null> }> };
  return kunci.tebak
    .map((t) => {
      const k = kunci.kartu.find((x) => x.no === t.no);
      const o = h.riwayat.find((r) => r.putaran === t.putaran)?.draf[t.no - 1];
      if (k === undefined || o === null || o === undefined) throw new Error(`omongan ${String(t.no)} tidak lengkap`);
      return { no: t.no, kunci: t.kunci, id_tebak: t.id, id_kartu: k.id, penentu: k.penentu, omongan: o };
    })
    .sort((a, b) => a.no - b.no);
}

function utama(argumen: string[]): number {
  if (argumen.includes('--bahan')) {
    const d = drafDiuji();
    if (d === null) {
      console.error('Belum ada jalan TIRT M2d-7.');
      return 1;
    }
    const b = bangunBahanM2d7(d);
    if (b.kunci.tebak.length === 0) {
      // Pra-registrasi: tidak terbit → (a) gagal; omongan yang dikunci jalan terakhir diuji hanya untuk laporan —
      // bila tidak ada satu pun, tidak ada bahan dan tidak ada penguji. Putusan tetap diturunkan mekanis.
      mkdirSync(FOLDER_PENGUJI_M2D7, { recursive: true });
      const p = putusanTayang(d.terbit, [], [], []);
      writeFileSync(
        `${FOLDER_PENGUJI_M2D7}/putusan.json`,
        JSON.stringify({ jalan: d.jalan, catatan: `jalan ${String(d.jalan)} tidak terbit dan tidak mengunci satu omongan pun: tidak ada bahan uji luar`, ...p }, null, 2) + '\n',
        'utf8',
      );
      console.log(`Jalan ${String(d.jalan)}: tidak ada omongan yang dikunci — bahan uji luar tidak ditulis. PUTUSAN: ${p.layak_tayang ? 'LAYAK TAYANG' : 'TIDAK layak tayang'} ((a) terbit: ${String(p.a_terbit)}).`);
      return 0;
    }
    mkdirSync(`${FOLDER_PENGUJI_M2D7}/jawaban`, { recursive: true });
    writeFileSync(`${FOLDER_PENGUJI_M2D7}/tebak.md`, b.tebak, 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_M2D7}/kartu.md`, b.kartu, 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_M2D7}/alami.md`, b.alami, 'utf8');
    writeFileSync(`${FOLDER_PENGUJI_M2D7}/kunci.json`, JSON.stringify(b.kunci, null, 2) + '\n', 'utf8');
    console.log(`jalan ${String(d.jalan)} (${d.terbit ? 'terbit' : 'tidak terbit'}) — ${String(b.kunci.tebak.length)} omongan; ${String(b.kunci.alami.length)} kelompok kealamian.`);
    return 0;
  }
  const kunci = JSON.parse(readFileSync(`${FOLDER_PENGUJI_M2D7}/kunci.json`, 'utf8')) as KunciPengujiM2d5 & { jalan: number; terbit: boolean };
  const uji = omonganUji(kunci);
  const tebak = [1, 2, 3].map((n) => bacaJawaban<JawabTebak>('tebak', n));
  const kartu = [1, 2, 3].map((n) => bacaJawaban<JawabKartu>('kartu', n));
  const p = putusanTayang(kunci.terbit, uji, tebak, kartu);
  writeFileSync(`${FOLDER_PENGUJI_M2D7}/putusan.json`, JSON.stringify({ jalan: kunci.jalan, ...p }, null, 2) + '\n', 'utf8');
  console.log(`(a) terbit: ${String(p.a_terbit)}`);
  console.log(`(b) tebak buta luar lolos ${String(p.b_tebak.lolos)}/${String(p.b_tebak.total)} ${p.b_tebak.syarat}: ${String(p.b_tebak.terpenuhi)}`);
  console.log(`(c) kartu K-05 ${String(p.c_kartu.lolos)}/${String(p.c_kartu.total)}: ${String(p.c_kartu.terpenuhi)}`);
  console.log(`(d) masalah makna ${String(p.d_makna.masalah)}: ${String(p.d_makna.terpenuhi)}`);
  for (const o of p.omongan) {
    console.log(`  omongan ${String(o.no)} (kunci ${o.kunci}): tebak ${o.tebak.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(' ')} → ${o.lolos_tebak ? 'lolos' : 'tidak'}; kartu ${o.kartu.map((k) => `${k.pilihan}/${k.kartu.join('+')}`).join(' ')} → ${o.lolos_kartu ? 'lolos' : 'tidak'}; masalah ${o.masalah.map((m) => `${m.butir} (${m.sumber})`).join('; ') || '-'}`);
  }
  console.log(`PUTUSAN: ${p.layak_tayang ? 'LAYAK TAYANG' : 'TIDAK layak tayang'}`);
  return 0;
}

if (/(^|[\\/])pengecoh-putusan\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama(process.argv.slice(2));
