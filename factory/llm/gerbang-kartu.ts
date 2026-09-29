/**
 * Gerbang jawab-dengan-kartu di dalam lingkar agen (M2d-2 D-2).
 *
 * Pasangan gerbang tebak buta. Soal yang tidak bisa ditebak tanpa kartu baru
 * berguna kalau DENGAN kartu ia bisa dijawab benar; kalau pembaca kartu pun
 * salah, soalnya ambigu (atau kartunya tidak cukup) dan ditolak.
 *
 * Penjawab melihat persis yang dilihat pemain sebelum memilih: pesan teman,
 * kartu omongan itu (2–4, urutan draf, bernomor — bukan `fact_id`, yang
 * membocorkan isinya), pertanyaan, dan empat pilihan. Kunci, penjelasan, dan
 * tanda kartu penentu TIDAK dikirim. Kontrak menyebut "kartu penentu +
 * pilihan"; yang dikirim adalah seluruh kartu omongan itu, yang memuat kartu
 * penentu — karena itulah yang dilihat pemain, dan kartu yang tidak menentukan
 * juga bisa menyesatkan (yang justru ingin diketahui gerbang ini).
 *
 * Peran penjawab dari K-05: orang 20-an yang belum pernah beli saham, membaca
 * di ponsel, tidak mau berhitung. Satu panggilan, suhu 0. Putusannya hanya
 * "benar atau tidak" (D-2); apakah ia menunjuk kartu penentu dicatat untuk
 * jejak, tidak ikut memutus.
 */
import { tanggalId } from '../format.ts';
import type { PesanChat } from './klien.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import {
  MAX_TOKENS_GERBANG,
  panggilTerbaca,
  soalTebak,
  type OpsiGerbang,
  type PanggilanGerbang,
  type SoalTebak,
} from './gerbang-tebak.ts';
import type { PaketFakta } from './paket.ts';
import { uraiKeluaran } from './susun.ts';

export const SUHU_KARTU = 0;

const KUNCI: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

export interface KartuTampil {
  no: number;
  fact_id: string;
  /** Kepala kartu: dari dokumen apa dan kapan terbit. */
  kepala: string;
  isi: string;
}

/** Kartu omongan dalam urutan draf, dengan kalimat faktanya dari paket. */
export function kartuOmongan(o: OmonganDraf, paket: PaketFakta): KartuTampil[] {
  const peta = new Map(paket.fakta.map((f) => [f.fact_id, f]));
  return o.kartu.map((id, i) => {
    const f = peta.get(id);
    if (f === undefined) throw new Error(`Kartu "${id}" tidak ada di paket; validator seharusnya sudah menolaknya.`);
    const jenis = f.jenis === 'hitungan' ? 'hitungan dari kartu lain' : f.asal;
    return { no: i + 1, fact_id: id, kepala: `${jenis}, terbit ${tanggalId(f.terbit)}`, isi: f.klaim };
  });
}

export const PETUNJUK_PENJAWAB = [
  'Kamu orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung.',
  'Seorang teman mengirim pesan di grup obrolan tentang sebuah saham. Di bawahnya ada kartu: potongan',
  'dokumen resmi. Cocokkan omongan teman dengan kartunya, lalu pilih satu dari empat pilihan. Sebutkan',
  'nomor kartu yang menentukan jawabanmu dan satu kalimat alasan.',
  'Balas HANYA dengan JSON berbentuk: {"pilihan": "a", "kartu": [1], "alasan": "..."}',
].join('\n');

/**
 * Petunjuk pembaca kartu M2d-5 (D-7): sama dengan M2d-2, ditambah daftar
 * kalimat yang membingungkan (kutipan persis). Kalimat tulisan penulis yang
 * ditandai MENOLAK soal (kutipannya dikirim ke penulis); kalimat dari teks
 * kartu paket hanya dicatat (bahan D-8).
 */
export const PETUNJUK_PENJAWAB_BINGUNG = [
  ...PETUNJUK_PENJAWAB.split('\n').slice(0, -1),
  'Kalau ada kalimat yang membuatmu bingung atau bisa kamu baca dua arti (di pesan, kartu, atau pilihan), kutip persis',
  'kalimat itu di "membingungkan". Kosongkan bila semuanya jelas; jangan menandai kalimat hanya karena harus dibaca dua kali.',
  'Balas HANYA dengan JSON berbentuk: {"pilihan": "a", "kartu": [1], "alasan": "...", "membingungkan": ["kalimat persis"]}',
].join('\n');

export function tulisSoalKartu(s: SoalTebak, kartu: readonly KartuTampil[]): string {
  return [
    `Pesan dari ${s.nama} (${s.jam}): "${s.pesan}"`,
    '',
    'Kartu:',
    ...kartu.map((k) => `Kartu ${String(k.no)} — ${k.kepala}: ${k.isi}`),
    '',
    `Pertanyaan: Omongan ${s.nama} cocok dengan dokumennya?`,
    `a) ${s.pilihan.a}`,
    `b) ${s.pilihan.b}`,
    `c) ${s.pilihan.c}`,
    `d) ${s.pilihan.d}`,
  ].join('\n');
}

export function pesanPenjawab(s: SoalTebak, kartu: readonly KartuTampil[], bingung = false): PesanChat[] {
  return [
    { role: 'system', content: bingung ? PETUNJUK_PENJAWAB_BINGUNG : PETUNJUK_PENJAWAB },
    { role: 'user', content: tulisSoalKartu(s, kartu) },
  ];
}

export interface JawabanKartu {
  pilihan: KunciOpsi;
  kartu: number[];
  alasan: string;
  /** M2d-5 D-7: kutipan kalimat yang membingungkan; `undefined` bila tidak diminta. */
  membingungkan?: string[];
}

export function uraiJawabanKartu(teks: string): JawabanKartu | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || typeof u.nilai !== 'object' || u.nilai === null) return null;
  const n = u.nilai as Record<string, unknown>;
  const pilihan = typeof n['pilihan'] === 'string' ? n['pilihan'].trim().toLowerCase().replace(/[^a-d]/g, '') : '';
  if (!KUNCI.includes(pilihan as KunciOpsi)) return null;
  const kartu = Array.isArray(n['kartu']) ? n['kartu'].map(Number).filter((x) => Number.isInteger(x)) : [];
  return { pilihan: pilihan as KunciOpsi, kartu, alasan: typeof n['alasan'] === 'string' ? n['alasan'] : '' };
}

/** Urai jawaban pembaca kartu M2d-5: medan "membingungkan" WAJIB berupa larik (boleh kosong). */
export function uraiJawabanKartuBingung(teks: string): JawabanKartu | null {
  const dasar = uraiJawabanKartu(teks);
  if (dasar === null) return null;
  const u = uraiKeluaran(teks);
  const m = u.ok ? (u.nilai as Record<string, unknown>)['membingungkan'] : undefined;
  if (!Array.isArray(m)) return null;
  const kutipan = [...new Set(m.filter((x): x is string => typeof x === 'string').map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => x !== ''))];
  return { ...dasar, membingungkan: kutipan.slice(0, 6).map((x) => (x.length > 300 ? `${x.slice(0, 299)}…` : x)) };
}

/** Asal kalimat yang ditandai membingungkan. */
export type SumberBingung = 'penulis' | 'kartu' | 'soal' | 'tak-dikenal';

export interface KalimatBingung {
  kutipan: string;
  sumber: SumberBingung;
  /** Bagian yang paling cocok: "pesan", "pilihan b", "kartu 2" (fact_id), "pertanyaan"; `null` bila tak dikenal. */
  bagian: string | null;
  fact_id: string | null;
}

function kataNormal(t: string): string[] {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((k) => k !== '');
}

/** Deret kata bersama terpanjang (kata berurutan). */
function deretBersama(a: readonly string[], b: readonly string[]): number {
  let maks = 0;
  const baris = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let kiriAtas = 0;
    for (let j = 1; j <= b.length; j++) {
      const simpan = baris[j] ?? 0;
      baris[j] = a[i - 1] === b[j - 1] ? kiriAtas + 1 : 0;
      maks = Math.max(maks, baris[j] ?? 0);
      kiriAtas = simpan;
    }
  }
  return maks;
}

/**
 * Golongkan satu kutipan menurut bagian soal yang paling cocok: tulisan
 * penulis (pesan, pilihan), teks kartu paket (isi atau kepala kartu), atau
 * pertanyaan tetap. Cocok = deret kata bersama ≥ 4 dan ≥ separuh bagian yang
 * lebih pendek, atau ≥ 6 kata. Seri → penulis (konservatif: menolak).
 */
export function golongkanBingung(kutipan: string, s: SoalTebak, kartu: readonly KartuTampil[]): KalimatBingung {
  const q = kataNormal(kutipan);
  const bagian: Array<{ sumber: SumberBingung; bagian: string; fact_id: string | null; teks: string }> = [
    { sumber: 'penulis', bagian: 'pesan', fact_id: null, teks: s.pesan },
    ...KUNCI.map((k) => ({ sumber: 'penulis' as const, bagian: `pilihan ${k}`, fact_id: null, teks: s.pilihan[k] })),
    ...kartu.map((k) => ({ sumber: 'kartu' as const, bagian: `kartu ${String(k.no)}`, fact_id: k.fact_id, teks: `${k.isi}` })),
    ...kartu.map((k) => ({ sumber: 'kartu' as const, bagian: `kepala kartu ${String(k.no)}`, fact_id: k.fact_id, teks: k.kepala })),
    { sumber: 'soal', bagian: 'pertanyaan', fact_id: null, teks: `Omongan ${s.nama} cocok dengan dokumennya?` },
  ];
  let terbaik: { skor: number; b: (typeof bagian)[number] } | null = null;
  for (const b of bagian) {
    const w = kataNormal(b.teks);
    const d = deretBersama(q, w);
    const pendek = Math.max(1, Math.min(q.length, w.length));
    const cocok = (d >= 4 && d / pendek >= 0.5) || d >= 6 || (d === q.length && q.length >= 2);
    if (!cocok) continue;
    const skor = d / pendek + d / 1000;
    if (terbaik === null || skor > terbaik.skor + 1e-9 || (Math.abs(skor - terbaik.skor) <= 1e-9 && b.sumber === 'penulis' && terbaik.b.sumber !== 'penulis')) {
      terbaik = { skor, b };
    }
  }
  return terbaik === null
    ? { kutipan, sumber: 'tak-dikenal', bagian: null, fact_id: null }
    : { kutipan, sumber: terbaik.b.sumber, bagian: terbaik.b.bagian, fact_id: terbaik.b.fact_id };
}

export interface PutusanKartu {
  lolos: boolean;
  /** `null` kalau dua panggilan tidak memberi jawaban terbaca (ditolak). */
  pilihan: KunciOpsi | null;
  kunci: KunciOpsi;
  kartu_ditunjuk: string[];
  menunjuk_penentu: boolean;
  alasan_penjawab: string;
  /** Kalimat umpan balik untuk penyusun; kosong kalau lolos. */
  alasan: string;
  panggilan: PanggilanGerbang[];
  /** M2d-5 D-7: kalimat yang ditandai membingungkan, dengan asalnya; `undefined` bila tidak diminta. */
  membingungkan?: KalimatBingung[];
}

/** Opsi pembaca kartu M2d-5. */
export interface OpsiKartu extends OpsiGerbang {
  /** D-7: minta daftar kalimat membingungkan; kalimat tulisan penulis menolak. */
  tandaiBingung?: boolean;
}

export async function gerbangKartu(o: OmonganDraf, paket: PaketFakta, opsi: OpsiKartu): Promise<PutusanKartu> {
  const soal = soalTebak(o);
  const kartu = kartuOmongan(o, paket);
  const bingung = opsi.tandaiBingung === true;
  const { hasil, panggilan } = await panggilTerbaca(
    () => pesanPenjawab(soal, kartu, bingung),
    { suhu: SUHU_KARTU, maxTokens: MAX_TOKENS_GERBANG },
    { jenis: 'gerbang-kartu', putaran: opsi.putaran, omongan: opsi.omongan, ke: 1 },
    opsi,
    bingung ? uraiJawabanKartuBingung : uraiJawabanKartu,
  );
  if (hasil === null) {
    return {
      lolos: false,
      pilihan: null,
      kunci: o.kunci,
      kartu_ditunjuk: [],
      menunjuk_penentu: false,
      alasan_penjawab: '',
      alasan: 'Pembaca kartu tidak memberi jawaban yang terbaca dua kali; soal ditolak (konservatif).',
      panggilan,
      ...(bingung ? { membingungkan: [] } : {}),
    };
  }
  const ditandai = bingung ? (hasil.membingungkan ?? []).map((k) => golongkanBingung(k, soal, kartu)) : [];
  const dariPenulis = ditandai.filter((k) => k.sumber === 'penulis');
  const ditunjuk = hasil.kartu
    .map((no) => kartu.find((k) => k.no === no)?.fact_id)
    .filter((x): x is string => x !== undefined);
  const benar = hasil.pilihan === o.kunci;
  const lolos = benar && dariPenulis.length === 0;
  const alasanBingung =
    dariPenulis.length === 0
      ? ''
      : `Pembaca yang memegang kartu bingung dengan kalimat tulisanmu: ${dariPenulis.map((k) => `"${k.kutipan}" (${String(k.bagian)})`).join('; ')}. ` +
        'Tulis ulang bagian itu dengan bahasa awam yang hanya bisa dibaca satu arti.';
  return {
    lolos,
    pilihan: hasil.pilihan,
    kunci: o.kunci,
    kartu_ditunjuk: ditunjuk,
    menunjuk_penentu: ditunjuk.some((id) => o.kartu_penentu.includes(id)),
    alasan_penjawab: hasil.alasan,
    alasan: lolos
      ? ''
      : benar
        ? alasanBingung
        : `${alasanBingung === '' ? '' : `${alasanBingung} `}Pembaca yang MEMEGANG kartu memilih "${hasil.pilihan}", padahal kunci "${o.kunci}" ` +
        `(alasannya: "${hasil.alasan}"). Periksa dulu apakah kuncimu memang benar menurut kartu — ` +
        'pembaca ini bisa jadi yang benar. Kalau kuncimu benar, soalnya ambigu atau kartunya tidak cukup: buat ' +
        'kartu penentu membuktikan kunci tanpa tafsir, dan pengecoh yang ia pilih jelas terbantah kartu.',
    panggilan,
    ...(bingung ? { membingungkan: ditandai } : {}),
  };
}
