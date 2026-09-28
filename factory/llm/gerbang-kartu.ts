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

export function pesanPenjawab(s: SoalTebak, kartu: readonly KartuTampil[]): PesanChat[] {
  return [
    { role: 'system', content: PETUNJUK_PENJAWAB },
    { role: 'user', content: tulisSoalKartu(s, kartu) },
  ];
}

export interface JawabanKartu {
  pilihan: KunciOpsi;
  kartu: number[];
  alasan: string;
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
}

export async function gerbangKartu(o: OmonganDraf, paket: PaketFakta, opsi: OpsiGerbang): Promise<PutusanKartu> {
  const soal = soalTebak(o);
  const kartu = kartuOmongan(o, paket);
  const { hasil, panggilan } = await panggilTerbaca(
    () => pesanPenjawab(soal, kartu),
    { suhu: SUHU_KARTU, maxTokens: MAX_TOKENS_GERBANG },
    { jenis: 'gerbang-kartu', putaran: opsi.putaran, omongan: opsi.omongan, ke: 1 },
    opsi,
    uraiJawabanKartu,
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
    };
  }
  const ditunjuk = hasil.kartu
    .map((no) => kartu.find((k) => k.no === no)?.fact_id)
    .filter((x): x is string => x !== undefined);
  const lolos = hasil.pilihan === o.kunci;
  return {
    lolos,
    pilihan: hasil.pilihan,
    kunci: o.kunci,
    kartu_ditunjuk: ditunjuk,
    menunjuk_penentu: ditunjuk.some((id) => o.kartu_penentu.includes(id)),
    alasan_penjawab: hasil.alasan,
    alasan: lolos
      ? ''
      : `Pembaca yang MEMEGANG kartu memilih "${hasil.pilihan}", padahal kunci "${o.kunci}" ` +
        `(alasannya: "${hasil.alasan}"). Soal ambigu atau kartunya tidak cukup: buat kartu penentu ` +
        'membuktikan kunci tanpa tafsir, dan pengecoh yang ia pilih jelas terbantah kartu.',
    panggilan,
  };
}
