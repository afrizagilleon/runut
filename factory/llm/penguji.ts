/**
 * `npm run llm:penguji` — bahan uji tebak buta dan penilaian kealamian
 * (M2d D-5), dibangun dari draf yang LOLOS validator.
 *
 * Penguji dan penilai adalah subagent baru tanpa konteks eksekutor; mereka
 * hanya menerima teks yang ditulis berkas ini. Yang dijaga:
 *
 * - **buta model**: tidak ada nama model di bahan; label draf acak (A/B/C/D)
 *   dan kuncinya disimpan terpisah (`kunci.json`), tidak pernah ikut dikirim;
 * - **tebak buta tanpa kartu**: penguji hanya melihat pesan teman, judul
 *   pertanyaan, dan empat pilihan — persis prosedur K-05;
 * - **tidak ada kontaminasi antar-draf sepaket**: tiap bundel tebak buta memuat
 *   paling banyak SATU draf per paket fakta (bujur sangkar latin: bundel i
 *   mengambil model (i + j) mod 3 untuk paket j). Tiga penguji per bundel →
 *   tiap omongan dijawab tiga penguji, dan tidak ada penguji yang melihat dua
 *   versi omongan tentang fakta yang sama;
 * - **pembanding manusia**: omongan DADA dan ULTJ yang sekarang hidup ikut
 *   dinilai kealamiannya, berlabel acak di antara draf model.
 *
 * Acak memakai benih tetap, jadi bahan yang sama dibangun ulang identik.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import type { Kasus } from '../skema/tipe.ts';
import type { DrafSimulasi, KunciOpsi } from './draf.ts';
import { AKAR } from './env.ts';
import { MODEL_TANDING } from './model.ts';
import type { HasilSusun } from './susun.ts';
import { FOLDER, URUTAN_PAKET, folderPutaran, namaSel } from './tanding.ts';

export const FOLDER_PENGUJI = `${FOLDER}/penguji`;
export const BENIH = 20260927;

/** mulberry32 — acak berbenih, supaya bahan bisa dibangun ulang identik. */
export function acak(benih: number): () => number {
  let a = benih >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function kocok<T>(larik: readonly T[], r: () => number): T[] {
  const hasil = [...larik];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j] as T, hasil[i] as T];
  }
  return hasil;
}

/** Satu omongan dalam bentuk polos, siap dibaca penguji. */
/** Bujur sangkar latin: bundel i mengambil model (i + j) mod 3 untuk paket ke-j. */
export function modelBundel(bundel: number, paket: number): string {
  const model = MODEL_TANDING[(bundel + paket) % MODEL_TANDING.length];
  if (model === undefined) throw new Error('indeks model di luar jangkauan');
  return model;
}

export interface OmonganPolos {
  nama: string;
  jam: string;
  pesan: string;
  pilihan: Record<KunciOpsi, string>;
  kunci: KunciOpsi;
  penjelasan: string;
}

export interface DrafPolos {
  sumber: string; // model, atau 'manusia'
  paket: string;
  /** Putaran uji tanding asal draf; `null` untuk omongan manusia. */
  putaran: 1 | 2 | null;
  omongan: OmonganPolos[];
}

function polosDariDraf(paket: string, model: string, d: DrafSimulasi, putaran: 1 | 2): DrafPolos {
  return {
    sumber: model,
    paket,
    putaran,
    omongan: d.omongan.map((o) => ({
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
    })),
  };
}

function polosDariKasus(paket: string, berkas: string): DrafPolos {
  const k = JSON.parse(readFileSync(`${AKAR}cases/${berkas}`, 'utf8')) as Kasus;
  return {
    sumber: 'manusia',
    paket,
    putaran: null,
    omongan: k.soal.map((s) => {
      const p = Object.fromEntries(s.pilihan.map((x) => [x.kunci, teksPolos(x.teks)])) as Record<KunciOpsi, string>;
      return {
        nama: s.pesan.nama,
        jam: s.pesan.jam,
        pesan: teksPolos(s.pesan.isi),
        pilihan: p,
        kunci: s.jawaban as KunciOpsi,
        penjelasan: teksPolos(s.penjelasan),
      };
    }),
  };
}

/**
 * Satu draf lolos per (paket, model): dari putaran 2 (batas token sama untuk
 * ketiga model dan cukup untuk penalaran GLM), atau — kalau putaran 2 tidak
 * menghasilkan draf lolos untuk sel itu — dari putaran 1. Putaran asalnya
 * dicatat di kunci.
 */
export function drafLolos(): Map<string, DrafPolos> {
  const hasil = new Map<string, DrafPolos>();
  for (const paket of URUTAN_PAKET) {
    for (const model of MODEL_TANDING) {
      for (const putaran of [2, 1] as const) {
        const jalur = `${FOLDER}/${folderPutaran(putaran)}/${namaSel(paket, model)}.json`;
        if (!existsSync(jalur)) continue;
        const sel = JSON.parse(readFileSync(jalur, 'utf8')) as HasilSusun;
        if (!sel.lolos || sel.draf === null) continue;
        hasil.set(`${paket}|${model}`, polosDariDraf(paket, model, sel.draf, putaran));
        break;
      }
    }
  }
  return hasil;
}

export const PETUNJUK_TEBAK = [
  'Kamu ikut menguji soal latihan. Di bawah ada beberapa soal pilihan ganda. Tiap soal: seorang teman',
  'mengirim pesan di grup obrolan tentang sebuah saham, lalu ada pertanyaan dan empat pilihan.',
  'Kamu TIDAK diberi dokumen apa pun. Jawab dengan tebakan terbaikmu dari pesan dan pilihannya saja.',
  'Tiap soal berdiri sendiri. Untuk tiap soal beri: huruf pilihanmu (a/b/c/d) dan seberapa yakin kamu',
  'bahwa pilihanmu benar (0-100). Jangan memakai alat apa pun dan jangan mencari informasi.',
  'Balas HANYA dengan JSON berbentuk:',
  '{"jawaban": [{"id": "Q1", "pilihan": "a", "yakin": 50}, ...]}',
].join('\n');

export const PETUNJUK_ALAMI = [
  'Kamu penilai bahasa Indonesia. Di bawah ada beberapa draf soal latihan, dikelompokkan; tiap draf',
  'diberi label huruf. Satu draf berisi tiga soal: pesan teman di grup obrolan, empat pilihan jawaban,',
  'dan penjelasan.',
  '',
  'Nilai KEALAMIAN BAHASA INDONESIA tiap draf, skala 1-5:',
  '1 = kaku, janggal, atau terasa terjemahan mesin;',
  '3 = bisa dipahami, tetapi ada frasa yang tidak lazim bagi penutur asli;',
  '5 = terdengar ditulis penutur asli dengan wajar: pesan seperti obrolan grup sungguhan, pilihan dan',
  '    penjelasan seperti teman yang menjelaskan.',
  'Jangan menilai benar-salah isinya atau kelengkapan faktanya — hanya bahasanya. Beri satu kalimat',
  'alasan per draf. Jangan memakai alat apa pun.',
  'Balas HANYA dengan JSON berbentuk:',
  '{"nilai": [{"kelompok": 1, "label": "A", "skor": 4, "alasan": "..."}, ...]}',
].join('\n');

function tulisSoalTebak(id: string, o: OmonganPolos): string {
  return [
    `### ${id}`,
    `Pesan dari ${o.nama} (${o.jam}): "${o.pesan}"`,
    `Pertanyaan: Omongan ${o.nama} cocok dengan dokumennya?`,
    `a) ${o.pilihan.a}`,
    `b) ${o.pilihan.b}`,
    `c) ${o.pilihan.c}`,
    `d) ${o.pilihan.d}`,
  ].join('\n');
}

function tulisDrafAlami(label: string, d: DrafPolos): string {
  const baris = [`#### Draf ${label}`];
  d.omongan.forEach((o, i) => {
    baris.push(
      `Soal ${String(i + 1)}`,
      `Pesan dari ${o.nama} (${o.jam}): "${o.pesan}"`,
      `Pilihan: a) ${o.pilihan.a} | b) ${o.pilihan.b} | c) ${o.pilihan.c} | d) ${o.pilihan.d}`,
      `Penjelasan: ${o.penjelasan}`,
      '',
    );
  });
  return baris.join('\n');
}

export interface ButirTebak {
  id: string;
  paket: string;
  sumber: string;
  putaran: 1 | 2 | null;
  omongan: number;
  kunci: KunciOpsi;
}

export interface KunciPenguji {
  benih: number;
  tebak: Array<{ bundel: string; butir: ButirTebak[] }>;
  alami: Array<{ kelompok: number; paket: string; label: Record<string, string>; putaran: Record<string, 1 | 2 | null> }>;
}

function utama(): number {
  const lolos = drafLolos();
  mkdirSync(FOLDER_PENGUJI, { recursive: true });
  const r = acak(BENIH);
  const kunci: KunciPenguji = { benih: BENIH, tebak: [], alami: [] };

  // --- tebak buta: bujur sangkar latin, satu draf per paket per bundel
  for (let i = 0; i < MODEL_TANDING.length; i++) {
    const butir: Array<{ b: ButirTebak; o: OmonganPolos }> = [];
    URUTAN_PAKET.forEach((paket, j) => {
      const model = modelBundel(i, j);
      const d = lolos.get(`${paket}|${model}`);
      if (d === undefined) return;
      d.omongan.forEach((o, n) => {
        butir.push({ b: { id: '', paket, sumber: model, putaran: d.putaran, omongan: n + 1, kunci: o.kunci }, o });
      });
    });
    const urut = kocok(butir, r);
    urut.forEach((x, k) => (x.b.id = `Q${String(k + 1)}`));
    const bundel = `B${String(i + 1)}`;
    kunci.tebak.push({ bundel, butir: urut.map((x) => x.b) });
    const teks = [PETUNJUK_TEBAK, '', ...urut.map((x) => tulisSoalTebak(x.b.id, x.o) + '\n')].join('\n');
    writeFileSync(`${FOLDER_PENGUJI}/tebak-${bundel}.md`, teks, 'utf8');
    console.log(`tebak-${bundel}.md: ${String(urut.length)} soal`);
  }

  // --- kealamian: per paket, draf lolos + pembanding manusia, label acak
  const manusia: Partial<Record<string, DrafPolos>> = {
    dada: polosDariKasus('dada', 'dada-2025-10-08.json'),
    ultj: polosDariKasus('ultj', 'ultj-2026-05-04.json'),
  };
  const bagian: string[] = [PETUNJUK_ALAMI, ''];
  URUTAN_PAKET.forEach((paket, j) => {
    const calon: DrafPolos[] = [];
    for (const model of MODEL_TANDING) {
      const d = lolos.get(`${paket}|${model}`);
      if (d !== undefined) calon.push(d);
    }
    const m = manusia[paket];
    if (m !== undefined) calon.push(m);
    if (calon.length === 0) return;
    const urut = kocok(calon, r);
    const label: Record<string, string> = {};
    const putaranLabel: Record<string, 1 | 2 | null> = {};
    const kelompok = j + 1;
    bagian.push(`## Kelompok ${String(kelompok)}`, '');
    urut.forEach((d, k) => {
      const huruf = 'ABCD'[k] ?? `X${String(k)}`;
      label[huruf] = d.sumber;
      putaranLabel[huruf] = d.putaran;
      bagian.push(tulisDrafAlami(huruf, d));
    });
    kunci.alami.push({ kelompok, paket, label, putaran: putaranLabel });
  });
  writeFileSync(`${FOLDER_PENGUJI}/alami.md`, bagian.join('\n'), 'utf8');

  // --- kalibrasi: omongan manusia yang hidup, prosedur tebak buta yang sama.
  // Acak tersendiri (benih + 1) dan dibangun paling akhir, supaya bundel dan
  // label di atas tidak bergeser satu byte pun karena bagian ini ditambahkan.
  const rm = acak(BENIH + 1);
  const butirManusia: Array<{ b: ButirTebak; o: OmonganPolos }> = [];
  for (const paket of ['dada', 'ultj'] as const) {
    const m = manusia[paket];
    if (m === undefined) continue;
    m.omongan.forEach((o, n) => {
      butirManusia.push({ b: { id: '', paket, sumber: 'manusia', putaran: null, omongan: n + 1, kunci: o.kunci }, o });
    });
  }
  const urutManusia = kocok(butirManusia, rm);
  urutManusia.forEach((x, k) => (x.b.id = `Q${String(k + 1)}`));
  kunci.tebak.push({ bundel: 'BM', butir: urutManusia.map((x) => x.b) });
  writeFileSync(
    `${FOLDER_PENGUJI}/tebak-BM.md`,
    [PETUNJUK_TEBAK, '', ...urutManusia.map((x) => tulisSoalTebak(x.b.id, x.o) + '\n')].join('\n'),
    'utf8',
  );
  console.log(`tebak-BM.md (kalibrasi manusia): ${String(urutManusia.length)} soal`);
  writeFileSync(`${FOLDER_PENGUJI}/kunci.json`, JSON.stringify(kunci, null, 2) + '\n', 'utf8');
  console.log(`alami.md: ${String(kunci.alami.reduce((a, k) => a + Object.keys(k.label).length, 0))} draf`);
  return 0;
}

if (process.argv[1]?.endsWith('penguji.ts') === true) process.exitCode = utama();
