/**
 * Gerbang ARTEFAK murah (M2d-7 D-4), dijalankan SEBELUM kritikus: kebocoran
 * yang terlihat dari bentuk pilihan saja tidak perlu dibayar dengan kritikus
 * GLM dan tiga penebak.
 *
 * Riset (`.research/sota-mcq-finlit-id-2026.md` §2): model bisa menebak kunci
 * dari PILIHAN SAJA, tanpa soal (Balepur dkk., ACL 2024: 11 dari 12
 * kombinasi di atas baseline); artefak yang terukur: panjang/kekhususan kunci
 * dan kunci yang "meresmikan" angka di pesan.
 *
 * (a) **pilihan-saja (choices-only)**: DeepSeek, n = 2, hanya EMPAT pilihan —
 *     tanpa pesan, tanpa pertanyaan, tanpa kartu. Keduanya memilih kunci →
 *     tolak. Jawaban tak terbaca (dua kali) dihitung memilih kunci (kegagalan
 *     penebak tidak pernah meloloskan soal, aturan M2d-2).
 * (b) **meresmikan**: token isi pesan (angka atau kata, `isiPilihan`) yang
 *     muncul lagi HANYA di pilihan kunci. Tolak bila ≥ 1 angka atau ≥ 2 kata.
 * (c) **keseimbangan**: panjang kunci (teks tampil) ≤ 1,3 × median panjang
 *     ketiga pengecoh.
 *
 * Ambang (b) dan (c) diuji pada keenam soal manusia yang hidup (`cases/*.json`):
 * semuanya lolos (dites). Terukur hari ini: kata yang diresmikan paling banyak
 * 1 (DADA soal 2 "dividen"), angka 0; rasio panjang kunci/median pengecoh
 * 0,80–1,06.
 */
import { teksPolos } from '../skema/rujukan.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { isiPilihan } from './gerbang-kembar.ts';
import { panggilTerbaca, uraiTebakan, type InfoPanggil, type OpsiGerbang, type PanggilanGerbang, type PanggilLlm } from './gerbang-tebak.ts';
import type { PesanChat } from './klien.ts';

const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

/** (b) Tolak bila ≥ `MAKS_ANGKA_RESMI` angka atau ≥ `MAKS_KATA_RESMI` kata diresmikan. */
export const MAKS_ANGKA_RESMI = 1;
export const MAKS_KATA_RESMI = 2;
/** (c) Rasio panjang kunci / median pengecoh paling besar. */
export const RASIO_KESEIMBANGAN = 1.3;
/** (a) Jumlah sampel pilihan-saja dan suhu. */
export const SAMPEL_PILIHAN_SAJA = 2;
export const SUHU_PILIHAN_SAJA = 1.0;

/**
 * Ambang gerbang artefak + aturan penebak yang bisa dilonggarkan kalibrasi D-6
 * (`pengecoh-kalibrasi.ts`, `putusanAmbang`).
 */
export interface AmbangArtefak {
  /** (c) rasio panjang kunci / median pengecoh paling besar. */
  rasio: number;
  /** (b) kata diresmikan yang menolak. */
  maksKata: number;
  /** (a) `null` = keduanya memilih kunci sudah menolak; angka = juga rata-rata yakin ≥ nilai itu. */
  pilihanSajaYakin: number | null;
  /** Penebak: K-05 penuh (true) atau hanya ≥ 2/3 benar (false). */
  penebakYakin: boolean;
}

export const AMBANG_ARTEFAK_AWAL: AmbangArtefak = { rasio: RASIO_KESEIMBANGAN, maksKata: MAKS_KATA_RESMI, pilihanSajaYakin: null, penebakYakin: true };

export interface PutusanMeresmikan {
  tolak: boolean;
  angka: string[];
  kata: string[];
  alasan: string[];
}

/** (b) Token isi pesan yang muncul lagi hanya di pilihan kunci. Murni. */
export function gMeresmikan(pesan: string, pilihan: Readonly<Record<KunciOpsi, string>>, kunci: KunciOpsi, maksKata: number = MAKS_KATA_RESMI): PutusanMeresmikan {
  const tp = isiPilihan(pesan);
  const tk = isiPilihan(pilihan[kunci] ?? '');
  const lain = HURUF.filter((h) => h !== kunci).map((h) => isiPilihan(pilihan[h] ?? ''));
  const resmi = [...tp].filter((t) => tk.has(t) && !lain.some((l) => l.has(t)));
  const angka = resmi.filter((t) => /\d/.test(t));
  const kata = resmi.filter((t) => !/\d/.test(t));
  const tolak = angka.length >= MAKS_ANGKA_RESMI || kata.length >= maksKata;
  return {
    tolak,
    angka,
    kata,
    alasan: tolak
      ? [
          `pilihan kunci "${teksPolos(pilihan[kunci] ?? '')}" mengulang ${[...angka.map((x) => `angka ${x}`), ...kata.map((x) => `"${x}"`)].join(', ')} dari pesan ` +
            'yang TIDAK muncul di pengecoh mana pun — pembaca tanpa kartu cukup memilih pilihan yang "meresmikan" omongan teman.',
        ]
      : [],
  };
}

export interface PutusanKeseimbangan {
  tolak: boolean;
  panjang_kunci: number;
  median_pengecoh: number;
  rasio: number;
  alasan: string[];
}

/** (c) Panjang kunci ≤ 1,3 × median panjang pengecoh (teks tampil, termasuk label). Murni. */
export function gKeseimbangan(pilihan: Readonly<Record<KunciOpsi, string>>, kunci: KunciOpsi, batas: number = RASIO_KESEIMBANGAN): PutusanKeseimbangan {
  const pj = (h: KunciOpsi): number => teksPolos(pilihan[h] ?? '').trim().length;
  const lain = HURUF.filter((h) => h !== kunci).map(pj).sort((a, b) => a - b);
  const median = lain[1] ?? 0;
  const k = pj(kunci);
  const rasio = median === 0 ? Infinity : k / median;
  const tolak = rasio > batas;
  return {
    tolak,
    panjang_kunci: k,
    median_pengecoh: median,
    rasio: Math.round(rasio * 1000) / 1000,
    alasan: tolak
      ? [`pilihan kunci ${String(k)} karakter, ${rasio.toFixed(2).replace('.', ',')} × median pengecoh (${String(median)}) > ${String(batas).replace('.', ',')} — kunci yang paling panjang/rinci mudah ditebak.`]
      : [],
  };
}

/* ---------------------------------------------------------------------- */
/* (a) pilihan-saja                                                        */
/* ---------------------------------------------------------------------- */

export const PETUNJUK_PILIHAN_SAJA = [
  'Kamu ikut menguji soal latihan pilihan ganda. Kamu HANYA diberi empat pilihan jawaban —',
  'tanpa soal, tanpa pesan, tanpa dokumen apa pun. Tebak pilihan mana yang paling mungkin benar,',
  'dari bentuk dan isi pilihannya saja. Beri huruf (a/b/c/d), seberapa yakin kamu (0-100), dan satu kalimat alasan.',
  'Balas HANYA dengan JSON berbentuk: {"pilihan": "a", "yakin": 50, "alasan": "..."}',
].join('\n');

/** Pesan untuk satu penebak pilihan-saja: EMPAT pilihan, tidak ada yang lain. Dibangun dari medan pilihan satu per satu. */
export function pesanPilihanSaja(pilihan: Readonly<Record<KunciOpsi, string>>): PesanChat[] {
  return [
    { role: 'system', content: PETUNJUK_PILIHAN_SAJA },
    { role: 'user', content: HURUF.map((h) => `${h}) ${teksPolos(pilihan[h] ?? '')}`).join('\n') },
  ];
}

export interface TebakanPilihanSaja {
  ke: number;
  pilihan: KunciOpsi | null;
  yakin: number | null;
  alasan: string;
  terbaca: boolean;
  /** Memilih kunci (tak terbaca dihitung memilih kunci). */
  kena: boolean;
  panggilan: PanggilanGerbang[];
}

export interface PutusanPilihanSaja {
  tolak: boolean;
  kena: number;
  tebakan: TebakanPilihanSaja[];
  alasan: string[];
}

export interface OpsiPilihanSaja extends Omit<OpsiGerbang, 'petunjuk'> {
  maxTokens: number;
  tambahanBadan?: Readonly<Record<string, unknown>>;
  /** Kalibrasi D-6: bila diisi, tolak hanya bila keduanya memilih kunci DAN rata-rata yakin ≥ nilai ini. */
  yakinMin?: number | null;
}

/**
 * (a) Dua penebak DeepSeek, masing-masing percakapan baru, hanya empat pilihan.
 * Tolak bila KEDUANYA memilih kunci.
 */
export async function gPilihanSaja(o: Pick<OmonganDraf, 'pilihan' | 'kunci'>, opsi: OpsiPilihanSaja): Promise<PutusanPilihanSaja> {
  const tebakan: TebakanPilihanSaja[] = [];
  const pilihan = { a: o.pilihan.a, b: o.pilihan.b, c: o.pilihan.c, d: o.pilihan.d };
  for (let ke = 1; ke <= SAMPEL_PILIHAN_SAJA; ke++) {
    const info: InfoPanggil = { jenis: 'gerbang-pilihan-saja', putaran: opsi.putaran, omongan: opsi.omongan, ke };
    const { hasil, panggilan } = await panggilTerbaca(
      () => pesanPilihanSaja(pilihan),
      { suhu: SUHU_PILIHAN_SAJA, maxTokens: opsi.maxTokens, ...(opsi.tambahanBadan === undefined ? {} : { tambahanBadan: opsi.tambahanBadan }) },
      info,
      opsi as OpsiGerbang,
      uraiTebakan,
    );
    tebakan.push(
      hasil === null
        ? { ke, pilihan: null, yakin: null, alasan: '(tak terbaca)', terbaca: false, kena: true, panggilan }
        : { ke, pilihan: hasil.pilihan, yakin: hasil.yakin, alasan: hasil.alasan, terbaca: true, kena: hasil.pilihan === o.kunci, panggilan },
    );
  }
  const kena = tebakan.filter((t) => t.kena).length;
  const yakinKena = tebakan.filter((t) => t.kena).map((t) => (t.terbaca ? (t.yakin ?? 0) : 100));
  const rataKena = yakinKena.length === 0 ? 0 : yakinKena.reduce((a, b) => a + b, 0) / yakinKena.length;
  const tolak = kena >= SAMPEL_PILIHAN_SAJA && (opsi.yakinMin === undefined || opsi.yakinMin === null || rataKena >= opsi.yakinMin);
  return {
    tolak,
    kena,
    tebakan,
    alasan: tolak
      ? [
          `${String(kena)}/${String(SAMPEL_PILIHAN_SAJA)} penebak yang HANYA melihat empat pilihan (tanpa pesan, tanpa kartu) memilih kunci "${o.kunci}" ` +
            `(${tebakan.map((t) => `${t.pilihan ?? '?'}/${String(t.yakin ?? '-')}`).join(', ')}). Alasan: ${tebakan.map((t) => `"${t.alasan}"`).join(' ')}`,
        ]
      : [],
  };
}

export interface PutusanArtefak {
  tolak: boolean;
  meresmikan: PutusanMeresmikan;
  keseimbangan: PutusanKeseimbangan;
}

/** (b) + (c): gerbang artefak tanpa jaringan. */
export function gArtefak(o: Pick<OmonganDraf, 'pesan' | 'pilihan' | 'kunci'>, ambang: AmbangArtefak = AMBANG_ARTEFAK_AWAL): PutusanArtefak {
  const meresmikan = gMeresmikan(o.pesan, o.pilihan, o.kunci, ambang.maksKata);
  const keseimbangan = gKeseimbangan(o.pilihan, o.kunci, ambang.rasio);
  return { tolak: meresmikan.tolak || keseimbangan.tolak, meresmikan, keseimbangan };
}

export type { PanggilLlm };
