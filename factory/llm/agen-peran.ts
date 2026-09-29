/**
 * Lingkar agen BERPERAN (M2d-3). Pembagian peran dan informasinya tertulis di
 * `factory/llm/peran.md`; di sini orkestrasinya, terbaca, tanpa kerangka agent.
 *
 *   perencana (kode): paket fakta
 *     → penulis (DeepSeek): SATU omongan per panggilan
 *     → pemeriksa (kode): validator deterministik
 *     → pembaca kartu (DeepSeek): harus menjawab benar dengan kartu
 *     → penebak ×3 (DeepSeek): tidak boleh menebak benar tanpa kartu
 *     → kritikus (GLM-5.3): keberatan terstruktur + arahan
 *     → lolos HANYA bila keempat penilai tidak keberatan (`putusanAkhir`)
 *
 * Bedanya dengan M2d-2 (`agen.ts`, tidak diubah supaya jalannya bisa diulang):
 * penilai berbeda dari penulis — kritikus memakai model lain dan melihat kunci;
 * tidak ada peran yang bisa meloloskan sendirian.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { teksPolos } from '../skema/rujukan.ts';
import { SETELAN_CADANGAN, SETELAN_PENYUSUN, ambilOmongan } from './agen.ts';
import { URUT_NADA_V1, URUT_NADA_V2, bacaBank, nadaUntuk, pilihContoh, topikDariTeks, tulisContoh, type KalimatGaya, type Nada } from './bank-gaya.ts';
import type { DrafSimulasi, MasalahDraf, OmonganDraf } from './draf.ts';
import { gerbangG, type PutusanG } from './gerbang-g.ts';
import { batasPanjang, gerbangGaya, type PutusanGaya } from './gerbang-gaya.ts';
import { gerbangKartu, type PutusanKartu } from './gerbang-kartu.ts';
import { PETUNJUK_PENEBAK, gerbangTebak, type InfoPanggil, type PanggilLlm, type PutusanTebak } from './gerbang-tebak.ts';
import { hashPesan, type LangkahJejak, type PencatatJejak, type PeranLangkah } from './jejak.ts';
import type { PesanChat } from './klien.ts';
import { MAX_TOKENS_KRITIKUS, MAX_TOKENS_KRITIKUS_MAKNA, jawabanTerpotong, kritik, umpanKritik, type PutusanKritik } from './kritikus.ts';
import { MODEL_OR_GLM, MODEL_PENEBAK_M2D4, MODEL_PENEBAK_M2D5, MODEL_PERAN, MODEL_PERAN_M2D5, type ModelLingkar, type PeranModel } from './model.ts';
import { PaguTercapai } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { MAKS_PUTARAN_SUDUT, MAKS_SUDUT, rencanaSudut, sudutBerikutnya, type CatatanSudut, type Sudut } from './sudut.ts';
import { gMirip } from './gerbang-mirip.ts';
import { gKembar } from './gerbang-kembar.ts';
import { gPenilaian } from './gerbang-penilaian.ts';
import { aturPosisiKunci, hurufKunciKode, periksaRujukanHuruf } from './posisi-kunci.ts';
import { PENALARAN_M2D5, PENALAR_M2D6, badanPenalaran, badanUpaya, setelanPenalaran, setelanTanpaPenalaran } from './penalaran.ts';
import { SUHU, pesanPaket, promptSistem, uraiKeluaran, type JawabanModel, type SetelanPanggil } from './susun.ts';

/**
 * Batas putaran satu simulasi: 5 putaran per sudut × paling banyak 3 sudut
 * per posisi (D-4). Posisi yang habis ketiga sudutnya menghentikan simulasi
 * lebih awal (tidak terbit).
 */
export const MAKS_PUTARAN_PERAN = MAKS_PUTARAN_SUDUT * MAKS_SUDUT;

/**
 * Petunjuk penebak M2d-3 = petunjuk M2d-2 + satu kalimat eksplisit untuk
 * berhitung (D-2): di M2d-2 penebak DeepSeek tidak menghitung 106 ÷ 48,
 * sedangkan ketiga penguji luar menghitungnya.
 */
export const PETUNJUK_PENEBAK_PERAN = [
  PETUNJUK_PENEBAK.split('\n').slice(0, -1).join('\n'),
  'Sebelum menebak, coba hitung dari angka yang ada di pesan dan pilihan (selisih, kali lipat, persen); kalau hitunganmu menunjuk satu pilihan, pakai itu.',
  PETUNJUK_PENEBAK.split('\n').at(-1) ?? '',
].join('\n');
/**
 * Petunjuk penebak M2d-4 (D-5b) = petunjuk M2d-2 + satu kalimat "pemain
 * pintar" dari kontrak; bentuk jawaban JSON tetap di baris terakhir. Penebak
 * tetap TANPA kartu.
 */
export const PETUNJUK_PENEBAK_KUAT = [
  PETUNJUK_PENEBAK.split('\n').slice(0, -1).join('\n'),
  "Berpikirlah seperti pemain pintar yang tahu kebiasaan pasar: hitung dari angka yang ada, cari pilihan yang paling 'wajar secara umum', curigai pilihan yang terlalu spesifik atau yang mengulang omongan dengan rapi.",
  PETUNJUK_PENEBAK.split('\n').at(-1) ?? '',
].join('\n');
/**
 * Petunjuk "tajam" (M2d-6): penebak sebagai PEMBURU soal bocor. Di M2d-5
 * petunjuk "pemain pintar" menyuruh mencurigai pilihan yang mengulang omongan
 * dengan rapi — padahal di tiga dari empat soal yang bocor di uji luar kuncinya
 * justru pilihan yang membenarkan klaim teman apa adanya, dan satu lagi punya
 * dua pengecoh kembar. Petunjuk ini menyebut kebiasaan umum pembuat soal
 * (bukan isi soal kalibrasi) yang dipakai penguji luar.
 */
export const PETUNJUK_PENEBAK_TAJAM = [
  PETUNJUK_PENEBAK.split('\n').slice(0, -1).join('\n'),
  'Kamu berperan sebagai pemburu soal bocor: soal yang bisa dijawab benar tanpa dokumen. Tebak seperti orang pintar yang paham pasar saham Indonesia dan kebiasaan pembuat soal:',
  '- Pakai pengetahuan umum pasar (misalnya alasan yang lazim bursa menghentikan perdagangan saham, cara harga dan dividen biasa dicatat).',
  '- Dua pilihan yang isinya sama atau hampir sama tidak mungkin keduanya benar; singkirkan keduanya.',
  '- Pilihan yang bilang sesuatu "tidak pernah dihitung", "tidak tercatat di mana pun", atau "tidak ada sama sekali" sering hanya pengisi.',
  '- Jangan menganggap teman pasti keliru: klaim yang wajar dan spesifik sering ternyata betul, dan pilihan yang membenarkannya apa adanya bisa jadi kuncinya.',
  '- Hitung dari angka di pesan dan pilihan bila bisa.',
  'Beri keyakinan yang jujur: rendah bila kamu hanya menebak.',
  PETUNJUK_PENEBAK.split('\n').at(-1) ?? '',
].join('\n');
export const JUMLAH_OMONGAN = 3;
/**
 * `max_tokens` penebak M2d-3. Dengan petunjuk berhitung, DeepSeek menalar
 * lebih panjang: di jalan TIRT ke-1 (dibuang, `eval/keluaran-m2d3/dibuang/
 * tirt-jalan1/`) dua dari empat panggilan penebak habis di 8.000 token tanpa
 * JSON — dan tebakan tak terbaca dihitung BENAR/100 (menolak). 16.000 memberi
 * ruang; perkiraan maksimum per panggilan tetap ±US$0,0065.
 */
export const MAX_TOKENS_PENEBAK_PERAN = 16_000;
/**
 * `max_tokens` penebak GLM-5.3 (M2d-4). Terukur 29 Sep: pada tujuh tebakan GLM
 * (soal TIRT sungguhan dan soal contoh) keluaran 439–1.463 token; satu
 * tebakan di jalan TIRT ke-1 (dibuang, `eval/keluaran-m2d4/dibuang/`) berputar
 * sampai habis 16.000 token (US$0,048, 292 detik) tanpa jawaban. 8.000 = lebih
 * dari lima kali keluaran terpanjang yang terukur, dan memotong ongkos putaran
 * macet menjadi separuh. Tebakan yang tetap tak terbaca dihitung BENAR/100
 * (menolak), seperti sebelumnya. Tombol "tanpa berpikir" tidak tersedia:
 * `chat_template_kwargs.enable_thinking=false` tetap berpikir, `thinking=false`
 * menumpahkan penalaran ke jawaban.
 */
export const MAX_TOKENS_PENEBAK_GLM = 8_000;

const JALUR_PENULIS = fileURLToPath(new URL('./prompt-penulis.md', import.meta.url));
const JALUR_PENULIS_GAYA = fileURLToPath(new URL('./prompt-penulis-gaya.md', import.meta.url));
const JALUR_PENULIS_M2D5 = fileURLToPath(new URL('./prompt-penulis-m2d5.md', import.meta.url));

/** Prompt sistem penulis = aturan M2d-1 (`prompt-susun.md`) + tambahan lingkar berperan (`prompt-penulis.md`). */
export function promptPenulis(): string {
  return `${promptSistem()}\n\n${readFileSync(JALUR_PENULIS, 'utf8').replace(/\r\n/g, '\n').trim()}`;
}

/**
 * Prompt sistem penulis M2d-4 = aturan M2d-1 (`prompt-susun.md`) + tambahan
 * gaya & makna (`prompt-penulis-gaya.md`, menggantikan `prompt-penulis.md`):
 * "gw/aku" bukan "gue", batas panjang dari soal manusia, satu klausa per
 * pilihan. Batas kata diisi dari `batasPanjang()` — angka yang sama dengan
 * yang dipakai pemeriksa.
 */
export function promptPenulisGaya(): string {
  const b = batasPanjang();
  const tambahan = readFileSync(JALUR_PENULIS_GAYA, 'utf8')
    .replace(/\r\n/g, '\n')
    .trim()
    .replaceAll('{BATAS_PESAN}', String(b.pesan))
    .replaceAll('{BATAS_PILIHAN}', String(b.pilihan));
  return `${promptSistem()}\n\n${tambahan}`;
}

/**
 * Prompt sistem penulis M2d-5 = prompt M2d-4 (`promptPenulisGaya`) + tambahan
 * M2d-5 (`prompt-penulis-m2d5.md`): huruf kunci diatur kode, dan aturan
 * gerbang baru M2d-5.
 */
export function promptPenulisM2d5(): string {
  return `${promptPenulisGaya()}\n\n${readFileSync(JALUR_PENULIS_M2D5, 'utf8').replace(/\r\n/g, '\n').trim()}`;
}

/**
 * Generasi lingkar berperan. M2d-3 (bawaan) tidak diubah supaya jalannya bisa
 * diulang dan tesnya tetap berlaku; M2d-4 menambah yang diputus kontraknya.
 * Satu-satunya tempat perbedaan kedua generasi.
 */
export interface Generasi {
  nama: 'm2d3' | 'm2d4' | 'm2d5' | 'm2d6';
  /** Model per peran; bawaan `MODEL_PERAN` (Featherless, M2d-3/M2d-4). M2d-5: OpenRouter. */
  model?: Readonly<Record<PeranModel, ModelLingkar>>;
  promptPenulis: () => string;
  /** Pemeriksa menjalankan gerbang gaya (G-panjang, G-satu-klausa, G-register) selain gerbang G. */
  gerbangGaya: boolean;
  /** Bank gaya yang dipakai pemilih heuristik. */
  bank: () => KalimatGaya[];
  /** Urutan nada per posisi/sudut. */
  urutNada: readonly Nada[];
  /** Penebak tanpa kartu: petunjuk sistem dan model per tebakan ke-1..3. */
  penebak: {
    petunjuk: string;
    model: readonly ModelLingkar[];
    maxTokens: readonly number[];
    /** Medan badan per tebakan ke-1..3 (M2d-5: batas penalaran penebak GLM). */
    tambahanBadan?: ReadonlyArray<Readonly<Record<string, unknown>> | undefined>;
    /** M2d-6 D-1: ambang token penalaran per tebakan ke-1..3 (penebak GLM); `undefined` = tidak dijaga. */
    ambangPenalaran?: ReadonlyArray<number | undefined>;
  };
  /** Kritikus: dipanggil sebelum penebak (M2d-4) atau sesudahnya (M2d-3); dua pertanyaan makna wajib. */
  kritikus: {
    sebelumPenebak: boolean;
    cekMakna: boolean;
    maxTokens: number;
    tambahanBadan?: Readonly<Record<string, unknown>>;
    /** M2d-6 D-1: ambang token penalaran kritikus; jawaban di bawahnya tidak sah. */
    ambangPenalaran?: number;
  };
  /**
   * Setelan penulis: panggilan berpikir lalu cadangan tanpa berpikir. Bawaan
   * M2d-2…M2d-4 (Featherless, `SETELAN_PENYUSUN`/`SETELAN_CADANGAN`); M2d-5:
   * batas penalaran OpenRouter (`penalaran.ts`, D-3).
   */
  penulis?: { berpikir: SetelanPanggil; cadangan: SetelanPanggil };
  /**
   * M2d-5 D-4: huruf kunci tiap omongan ditentukan KODE sesudah penulis
   * menjawab (`posisi-kunci.ts`); penjelasan/pilihan dilarang merujuk huruf.
   */
  posisiKunci?: boolean;
  /** M2d-5 D-5/D-6: pemeriksa menjalankan G-penilaian (pesan) dan G-mirip (antar-omongan). */
  gerbangMakna?: boolean;
  /**
   * M2d-5 D-7: pembaca kartu juga mengutip kalimat yang membingungkan; kalimat
   * tulisan penulis menolak (kutipannya ke penulis), kalimat kartu paket dicatat.
   */
  kartuBingung?: boolean;
  /** M2d-6 D-4: pemeriksa menjalankan G-pilihan-kembar (dua pilihan satu omongan yang isinya sama). */
  gerbangKembar?: boolean;
  /** Setelan pembaca kartu (M2d-5: batas penalaran); bawaan M2d-2. */
  kartu?: { maxTokens: number; tambahanBadan?: Readonly<Record<string, unknown>> };
}

export const GENERASI_M2D3: Generasi = {
  nama: 'm2d3', promptPenulis, gerbangGaya: false, bank: () => bacaBank(1), urutNada: URUT_NADA_V1,
  penebak: {
    petunjuk: PETUNJUK_PENEBAK_PERAN,
    model: [MODEL_PERAN.penebak, MODEL_PERAN.penebak, MODEL_PERAN.penebak],
    maxTokens: [MAX_TOKENS_PENEBAK_PERAN, MAX_TOKENS_PENEBAK_PERAN, MAX_TOKENS_PENEBAK_PERAN],
  },
  kritikus: { sebelumPenebak: false, cekMakna: false, maxTokens: MAX_TOKENS_KRITIKUS },
};

export const GENERASI_M2D4: Generasi = {
  nama: 'm2d4', promptPenulis: promptPenulisGaya, gerbangGaya: true, bank: () => bacaBank(2), urutNada: URUT_NADA_V2,
  penebak: {
    petunjuk: PETUNJUK_PENEBAK_KUAT,
    model: MODEL_PENEBAK_M2D4,
    maxTokens: MODEL_PENEBAK_M2D4.map((m) => (m === MODEL_PERAN.kritikus ? MAX_TOKENS_PENEBAK_GLM : MAX_TOKENS_PENEBAK_PERAN)),
  },
  kritikus: { sebelumPenebak: true, cekMakna: true, maxTokens: MAX_TOKENS_KRITIKUS_MAKNA },
};

/**
 * Generasi M2d-5 (OpenRouter + TIRT): semua keputusan M2d-4, dengan model
 * OpenRouter (`MODEL_PERAN_M2D5`: DeepSeek untuk penulis, pembaca kartu,
 * penebak 1–2; GLM untuk kritikus dan penebak 3).
 */
export const GENERASI_M2D5: Generasi = {
  ...GENERASI_M2D4,
  nama: 'm2d5',
  promptPenulis: promptPenulisM2d5,
  posisiKunci: true,
  gerbangMakna: true,
  kartuBingung: true,
  kartu: { maxTokens: PENALARAN_M2D5.kartu.maxTokens, tambahanBadan: badanPenalaran(PENALARAN_M2D5.kartu) },
  // Contoh gaya yang memuat penilaian ("aman lah", v2-056/v2-061) tidak ditunjukkan ke penulis M2d-5 (G-penilaian).
  bank: () => bacaBank(2).filter((k) => !gPenilaian(k.teks).tolak),
  model: MODEL_PERAN_M2D5,
  penebak: {
    petunjuk: PETUNJUK_PENEBAK_KUAT,
    model: MODEL_PENEBAK_M2D5,
    maxTokens: MODEL_PENEBAK_M2D5.map((m) => (m === MODEL_OR_GLM ? PENALARAN_M2D5.penebakGlm.maxTokens : MAX_TOKENS_PENEBAK_PERAN)),
    tambahanBadan: MODEL_PENEBAK_M2D5.map((m) => (m === MODEL_OR_GLM ? badanPenalaran(PENALARAN_M2D5.penebakGlm) : undefined)),
  },
  kritikus: {
    sebelumPenebak: true,
    cekMakna: true,
    maxTokens: PENALARAN_M2D5.kritikus.maxTokens,
    tambahanBadan: badanPenalaran(PENALARAN_M2D5.kritikus),
  },
  penulis: {
    berpikir: setelanPenalaran(SUHU, PENALARAN_M2D5.penulis),
    cadangan: setelanTanpaPenalaran(SUHU),
  },
};

/**
 * Generasi M2d-6 (penalar sungguhan): semua keputusan M2d-5, ditambah
 * - D-1: kritikus dan penebak GLM memakai `reasoning.effort` dan dijaga
 *   `penjaga-penalaran.ts` (token penalaran < ambang = tidak sah → diulang
 *   sekali dengan penyedia lain → tidak menjawab);
 * - penyedia yang terbukti melanggar dikecualikan di pagar (D-2, skrip);
 * - D-3: penebak = susunan terpilih kalibrasi (K3: GLM ×3 ber-effort, petunjuk "pemburu soal bocor");
 * - D-4: G-pilihan-kembar di pemeriksa.
 */
export const GENERASI_M2D6: Generasi = {
  ...GENERASI_M2D5,
  nama: 'm2d6',
  gerbangKembar: true,
  // D-3: susunan K3 — pilihan aturan kalibrasi (`eval/keluaran-m2d6/kalibrasi/matriks.json`, dites):
  // tiga penebak GLM `effort: "high"` dengan penjaga, petunjuk "pemburu soal bocor". Tetap TANPA kartu.
  penebak: {
    petunjuk: PETUNJUK_PENEBAK_TAJAM,
    model: [MODEL_OR_GLM, MODEL_OR_GLM, MODEL_OR_GLM],
    maxTokens: [1, 2, 3].map(() => PENALAR_M2D6.penebakGlm.maxTokens),
    tambahanBadan: [1, 2, 3].map(() => badanUpaya(PENALAR_M2D6.penebakGlm)),
    ambangPenalaran: [1, 2, 3].map(() => PENALAR_M2D6.penebakGlm.ambang),
  },
  kritikus: {
    sebelumPenebak: true,
    cekMakna: true,
    maxTokens: PENALAR_M2D6.kritikus.maxTokens,
    tambahanBadan: badanUpaya(PENALAR_M2D6.kritikus),
    ambangPenalaran: PENALAR_M2D6.kritikus.ambang,
  },
};

/** Model per peran menurut generasi. */
export function modelPeranGen(gen: Generasi): Readonly<Record<PeranModel, ModelLingkar>> {
  return gen.model ?? MODEL_PERAN;
}

/** Model penebak ke-`ke` (1–3) menurut generasi. */
export function modelPenebak(gen: Generasi, ke: number): ModelLingkar {
  const m = gen.penebak.model[ke - 1];
  if (m === undefined) throw new Error(`Tidak ada model untuk penebak ke-${String(ke)}.`);
  return m;
}

/** Nama model penebak untuk jejak: satu nama, atau "A ×2 + B ×1" bila campuran. */
export function ringkasModelPenebak(gen: Generasi): string {
  const hitung = new Map<string, number>();
  for (const m of gen.penebak.model) hitung.set(m, (hitung.get(m) ?? 0) + 1);
  return hitung.size === 1 ? [...hitung.keys()][0] ?? '' : [...hitung].map(([m, n]) => `${m} ×${String(n)}`).join(' + ');
}

/** Keterangan satu panggilan: peran pemanggil dan model yang ditetapkan kode untuk peran itu. */
export interface InfoPeran extends InfoPanggil {
  peran: PeranModel;
  model: string;
}

export type PanggilPeran = (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoPeran) => Promise<JawabanModel>;

const PERAN_JENIS: Readonly<Record<InfoPanggil['jenis'], PeranModel>> = {
  susun: 'penulis',
  'tulis-ulang': 'penulis',
  'gerbang-kartu': 'pembaca-kartu',
  'gerbang-tebak': 'penebak',
  kritikus: 'kritikus',
};

/**
 * Tempelkan peran + model ke setiap panggilan; gerbang M2d-2 tidak perlu tahu.
 * Model dari `MODEL_PERAN`, kecuali penebak: per tebakan ke-1..3 menurut
 * generasi (M2d-4: dua DeepSeek + satu GLM-5.3).
 */
function lewatPeran(panggil: PanggilPeran, gen: Generasi): PanggilLlm {
  return (pesan, setelan, info) => {
    const peran = PERAN_JENIS[info.jenis];
    const model = peran === 'penebak' ? modelPenebak(gen, info.ke) : modelPeranGen(gen)[peran];
    return panggil(pesan, setelan, { ...info, peran, model });
  };
}

/**
 * Putusan satu omongan dari keempat penilai. `null` = peran itu tidak
 * dijalankan (karena penilai sebelumnya sudah keberatan) — tidak dijalankan
 * TIDAK sama dengan tidak keberatan. Tidak ada peran yang bisa meloloskan
 * sendirian: keempatnya harus `true`.
 */
export interface SuaraPenilai {
  pemeriksa: boolean;
  kartu: boolean | null;
  tebak: boolean | null;
  kritikus: boolean | null;
}

export function putusanAkhir(s: SuaraPenilai): boolean {
  return s.pemeriksa === true && s.kartu === true && s.tebak === true && s.kritikus === true;
}

export type StatusPeran =
  | 'terkunci-sebelumnya'
  | 'tidak-ada'
  | 'ditolak-pemeriksa'
  | 'ditolak-kartu'
  | 'ditolak-tebak'
  | 'ditolak-kritikus'
  | 'kritikus-tidak-menjawab'
  | 'galat-gerbang'
  | 'lolos';

/** Sudut satu posisi pada satu putaran (untuk riwayat). */
export interface SudutPutaran {
  no: number;
  ke: number;
  fact_id: string;
  /** Putaran ke berapa di sudut ini (1–5). */
  putaran_sudut: number;
}

export interface PemeriksaanPeran {
  no: number;
  status: StatusPeran;
  suara: SuaraPenilai;
  umpan: string[];
  kartu: PutusanKartu | null;
  tebak: PutusanTebak | null;
  kritik: PutusanKritik | null;
  /** Gerbang G (pemeriksa); `null` bila omongan tidak ada atau bentuknya rusak. */
  g?: PutusanG | null;
  /** Gerbang gaya (pemeriksa, M2d-4); `null` bila tidak dijalankan. */
  gaya?: PutusanGaya | null;
  /** Versi ini dibawa ke putaran berikutnya tanpa ditulis ulang (kritikus tidak menjawab). */
  dibawa: boolean;
}

export interface PanggilanPenulis {
  omongan: number;
  permintaan: string;
  waktu_mulai: string;
  waktu_selesai: string;
  teks_mentah: string;
  panjang_penalaran: number;
  finish_reason: string | null;
  token_masuk: number;
  token_keluar: number;
  biaya_usd: number;
  latensi_ms: number;
  terurai: boolean;
  mode_berpikir: boolean;
  /** M2d-5: penyedia yang melayani dan token penalaran, bila disebut respons. */
  penyedia?: string | null;
  token_penalaran?: number | null;
}

export interface PutaranPeran {
  putaran: number;
  /** Sudut tiap posisi yang aktif pada putaran ini. */
  sudut: SudutPutaran[];
  /** Sudut yang dibuang di akhir putaran ini (gagal 5 putaran). */
  dibuang: Array<{ no: number; ke: number; fact_id: string; pengganti: string | null }>;
  /** Omongan yang ditulis penulis pada putaran ini. */
  ditulis: number[];
  /** Omongan yang dibawa dari putaran sebelumnya tanpa ditulis ulang. */
  dibawa: number[];
  panggilan: PanggilanPenulis[];
  diabaikan: number[];
  masalah: MasalahDraf[];
  omongan: PemeriksaanPeran[];
  draf: Array<OmonganDraf | null>;
  galat: string | null;
}

export interface HasilPeran {
  paket_id: string;
  model_peran: Readonly<Record<PeranModel, string>>;
  lolos: boolean;
  jumlah_putaran: number;
  berhenti: string | null;
  draf: DrafSimulasi | null;
  /** Daftar sudut dari perencana, dalam urutan pakai. */
  rencana_sudut: Sudut[];
  /** Riwayat sudut per posisi omongan 1–3. */
  sudut: CatatanSudut[][];
  riwayat: PutaranPeran[];
}

export interface OpsiPeran {
  paket: PaketFakta;
  panggil: PanggilPeran;
  validasi: (draf: unknown, paket: PaketFakta) => MasalahDraf[];
  maksPutaran?: number;
  jam?: () => Date;
  jejak?: PencatatJejak;
  /** Pengganti daftar sudut perencana (tes); bawaan `rencanaSudut(paket)`. */
  rencanaSudut?: Sudut[];
  /** Generasi lingkar; bawaan M2d-3. */
  generasi?: Generasi;
}

function adalahObyek(n: unknown): n is Record<string, unknown> {
  return typeof n === 'object' && n !== null && !Array.isArray(n);
}

function labelKunci(o: OmonganDraf): string {
  const teks = adalahObyek(o.pilihan) ? (o.pilihan[o.kunci] ?? '') : '';
  return teks.trimStart().startsWith('Betul,') ? 'Betul' : teks.trimStart().startsWith('Keliru,') ? 'Keliru' : '?';
}

function ringkasOmongan(no: number, o: OmonganDraf | null, terkunci: boolean): string {
  if (o === null) return `- omongan ${String(no)}: belum ada`;
  return `- omongan ${String(no)}${terkunci ? ' (TERKUNCI)' : ''}: ${JSON.stringify(adalahObyek(o) ? { no, ...o } : o)}`;
}

export interface PermintaanPenulis {
  no: number;
  draf: ReadonlyArray<OmonganDraf | null>;
  terkunci: ReadonlySet<number>;
  umpan: readonly string[] | undefined;
  /** Nada yang diminta perencana + contoh bank gaya (D-3). */
  gaya?: { nada: Nada; contoh: readonly KalimatGaya[] };
  /** Sudut omongan ini (D-4): fakta yang harus menjadi kartu penentunya. */
  sudut?: { ke: number; fact_id: string; klaim: string; dibuang: readonly string[] };
  /** M2d-5 D-4: huruf kunci diatur kode — syarat huruf kunci antar-omongan tidak diminta dari penulis. */
  posisiKunciKode?: boolean;
}

/** Pesan pengguna untuk penulis: omongan lain sebagai konteks, versi ditolak + umpan balik, bentuk keluaran. */
export function pesanPenulis(p: PermintaanPenulis): string {
  const { no, draf, terkunci, umpan } = p;
  const lain = [1, 2, 3].filter((x) => x !== no);
  const baris: string[] = [
    `TUGAS PANGGILAN INI: tulis HANYA omongan nomor ${String(no)} dari tiga omongan simulasi ini — satu omongan, bukan tiga.`,
    '',
    'Omongan lain di simulasi ini (jangan ditulis ulang; pakai untuk aturan antar-omongan):',
    ...lain.map((x) => ringkasOmongan(x, draf[x - 1] ?? null, terkunci.has(x))),
    '',
  ];
  const ada = lain.map((x) => draf[x - 1]).filter((x): x is OmonganDraf => adalahObyek(x) && typeof x.nama === 'string');
  const syarat: string[] = [];
  if (ada.length > 0) syarat.push(`nama pengirim berbeda dari ${ada.map((o) => `"${o.nama}"`).join(' dan ')}`);
  if (ada.length === 2 && !ada.some((o) => labelKunci(o) === 'Betul')) {
    syarat.push('omongan ini HARUS ternyata BETUL (kuncinya pilihan "Betul,"), karena kedua omongan lain Keliru');
  } else if (!ada.some((o) => labelKunci(o) === 'Betul')) {
    syarat.push('minimal satu dari tiga omongan harus ternyata BETUL');
  }
  if (p.posisiKunciKode !== true && ada.length === 2 && ada[0]?.kunci === ada[1]?.kunci) {
    syarat.push(`huruf kunci omongan ini tidak boleh "${String(ada[0]?.kunci)}" (kedua omongan lain sudah "${String(ada[0]?.kunci)}")`);
  }
  if (syarat.length > 0) baris.push(`Aturan antar-omongan untuk omongan ${String(no)}: ${syarat.join('; ')}.`, '');
  if (p.sudut !== undefined) {
    baris.push(
      `SUDUT OMONGAN INI (sudut ke-${String(p.sudut.ke)}, dari perencana): kartu_penentu HARUS memuat "${p.sudut.fact_id}" — ` +
        `"${p.sudut.klaim}". Bangun klaim teman di sekitar fakta ini.`,
      ...(p.sudut.dibuang.length > 0
        ? [`Sudut yang sudah dibuang untuk posisi ini (gagal ${String(MAKS_PUTARAN_SUDUT)} putaran; jangan dipakai sebagai penentu): ${p.sudut.dibuang.join(', ')}.`]
        : []),
      '',
    );
  }
  if (p.gaya !== undefined) baris.push(tulisContoh(p.gaya.nada, p.gaya.contoh), '');
  const sebelumnya = draf[no - 1];
  if (umpan !== undefined && umpan.length > 0) {
    baris.push(
      sebelumnya === null || sebelumnya === undefined
        ? `Percobaan sebelumnya untuk omongan ${String(no)} DITOLAK:`
        : `Versi sebelumnya omongan ${String(no)} DITOLAK: ${JSON.stringify(sebelumnya)}`,
      ...umpan.map((u) => `- ${u}`),
      '',
      'Versi baru harus berbeda NYATA dari versi yang ditolak — mengirim ulang versi yang sama akan ditolak lagi ' +
        'dengan alasan yang sama. Kalau ditolak penebak tanpa kartu, ubah klaim teman atau label kuncinya ' +
        '(Betul↔Keliru), bukan hanya kata-katanya. Boleh mengganti pesan, kartu, pilihan, dan penjelasannya ' +
        'sepenuhnya, asal tetap dari paket fakta dan mematuhi semua aturan.',
      '',
    );
  }
  baris.push(
    'Keluarkan JSON saja, tepat satu objek dengan medan "no":',
    `{"omongan": [{"no": ${String(no)}, "nama": "...", "jam": "...", "pesan": "...", "angka_pesan": [], "kartu": [], "kartu_penentu": [], "pilihan": {"a": "...", "b": "...", "c": "...", "d": "..."}, "kunci": "...", "penjelasan": "..."}]}`,
  );
  return baris.join('\n');
}

function teksGalat(galat: unknown): string {
  return galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
}

/** Penyedia tiap panggilan untuk rincian jejak (M2d-5 D-1); kosong bila respons tidak menyebutnya (Featherless). */
function penyediaDari(p: ReadonlyArray<{ penyedia?: string | null }>): { penyedia?: Array<string | null> } {
  return p.some((x) => x.penyedia !== undefined) ? { penyedia: p.map((x) => x.penyedia ?? null) } : {};
}

function jumlah<T>(larik: readonly T[], f: (x: T) => number): number {
  return larik.reduce((a, x) => a + f(x), 0);
}

type CatatLangkah = Omit<LangkahJejak, 'no' | 'peran'> & { peran: PeranLangkah };

export async function jalankanPeran(opsi: OpsiPeran): Promise<HasilPeran> {
  const maks = opsi.maksPutaran ?? MAKS_PUTARAN_PERAN;
  const gen = opsi.generasi ?? GENERASI_M2D3;
  const jam = opsi.jam ?? (() => new Date());
  const jejak = opsi.jejak ?? null;
  const catat = (l: CatatLangkah): void => {
    jejak?.catat(l);
  };
  const panggilGerbang = lewatPeran(opsi.panggil, gen);
  const hasil: HasilPeran = {
    paket_id: opsi.paket.paket_id,
    model_peran: modelPeranGen(gen),
    lolos: false,
    jumlah_putaran: 0,
    berhenti: null,
    draf: null,
    rencana_sudut: [],
    sudut: [[], [], []],
    riwayat: [],
  };
  const akhiri = (): HasilPeran => {
    jejak?.selesai(hasil.lolos, hasil.jumlah_putaran, hasil.berhenti);
    return hasil;
  };
  let draf: Array<OmonganDraf | null> = Array.from({ length: JUMLAH_OMONGAN }, () => null);
  const terkunci = new Set<number>();
  let umpan = new Map<number, string[]>();
  /** Omongan yang versinya dibawa tanpa ditulis ulang (kritikus tidak menjawab). */
  let bawa = new Set<number>();

  // --- 0. PERENCANA (kode): daftar sudut dan sudut awal tiap posisi.
  const daftarSudut = opsi.rencanaSudut ?? rencanaSudut(opsi.paket);
  hasil.rencana_sudut = daftarSudut;
  const klaim = new Map(opsi.paket.fakta.map((f) => [f.fact_id, f.klaim]));
  /** fact_id yang tidak boleh lagi dipakai sebagai sudut baru: sedang dipakai, pernah dibuang, atau penentu omongan terkunci. */
  const terpakai = new Set<string>();
  const sudutKini = new Map<number, CatatanSudut>();
  const mulaiRencana = jam().toISOString();
  for (const no of [1, 2, 3]) {
    const s = sudutBerikutnya(daftarSudut, terpakai);
    if (s === null) break;
    terpakai.add(s.fact_id);
    const c: CatatanSudut = { ke: 1, fact_id: s.fact_id, topik: s.topik, putaran_mulai: 1, putaran_akhir: null, hasil: 'berjalan' };
    sudutKini.set(no, c);
    hasil.sudut[no - 1]?.push(c);
  }
  catat({
    putaran: 1, jenis: 'rencana-sudut', omongan: null, waktu_mulai: mulaiRencana, waktu_selesai: jam().toISOString(),
    model: null, panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0,
    putusan: sudutKini.size === JUMLAH_OMONGAN ? 'lolos' : 'tolak',
    alasan: [
      `${String(daftarSudut.length)} sudut dari paket; sudut awal: ` +
        [1, 2, 3].map((no) => `omongan ${String(no)} = ${sudutKini.get(no)?.fact_id ?? '(tidak ada)'}`).join(', '),
    ],
    sha256_prompt: null,
    rincian: { daftar: daftarSudut, awal: [1, 2, 3].map((no) => sudutKini.get(no)?.fact_id ?? null) },
    peran: 'perencana',
  });
  if (sudutKini.size < JUMLAH_OMONGAN) {
    hasil.berhenti = `paket hanya memberi ${String(sudutKini.size)} sudut; simulasi tidak terbit`;
    return akhiri();
  }
  /** Putaran yang sudah dijalani posisi itu di sudutnya sekarang. */
  const putaranSudut = new Map<number, number>([[1, 0], [2, 0], [3, 0]]);

  for (let putaran = 1; putaran <= maks; putaran++) {
    hasil.jumlah_putaran = putaran;
    const aktif = [1, 2, 3].filter((no) => !terkunci.has(no));
    const ditulis = aktif.filter((no) => !bawa.has(no));
    for (const no of aktif) putaranSudut.set(no, (putaranSudut.get(no) ?? 0) + 1);
    const catatan: PutaranPeran = {
      putaran,
      sudut: aktif.map((no) => ({
        no, ke: sudutKini.get(no)?.ke ?? 0, fact_id: sudutKini.get(no)?.fact_id ?? '', putaran_sudut: putaranSudut.get(no) ?? 0,
      })),
      dibuang: [],
      ditulis,
      dibawa: aktif.filter((no) => bawa.has(no)),
      panggilan: [],
      diabaikan: [],
      masalah: [],
      omongan: [],
      draf: [],
      galat: null,
    };
    hasil.riwayat.push(catatan);
    const jenisTulis = putaran === 1 ? 'susun' : 'tulis-ulang';
    const riwayatDibuang = (no: number): string[] =>
      (hasil.sudut[no - 1] ?? []).filter((c) => c.hasil === 'dibuang').map((c) => c.fact_id);

    // --- 1. PENULIS: satu omongan per panggilan; cadangan tanpa berpikir bila
    // panggilan berpikir tidak menghasilkan omongan terbaca (M2d-2).
    const gabung = [...draf] as unknown[];
    const tidakAda = new Map<number, string>();
    for (const no of ditulis) {
      const sk = sudutKini.get(no) as CatatanSudut;
      const nada = nadaUntuk(no, sk.ke, gen.urutNada);
      const topik = [sk.topik, ...topikDariTeks(opsi.paket.peristiwa).filter((t) => t !== sk.topik)];
      const contoh = pilihContoh({ topik, nada, paket_id: opsi.paket.paket_id }, gen.bank());
      const permintaan = pesanPenulis({
        no, draf: gabung as Array<OmonganDraf | null>, terkunci, umpan: umpan.get(no), gaya: { nada, contoh }, posisiKunciKode: gen.posisiKunci === true,
        sudut: { ke: sk.ke, fact_id: sk.fact_id, klaim: klaim.get(sk.fact_id) ?? '', dibuang: riwayatDibuang(no) },
      });
      const pesan: PesanChat[] = [
        { role: 'system', content: gen.promptPenulis() },
        { role: 'user', content: `${pesanPaket(opsi.paket)}\n\n${permintaan}` },
      ];
      const upaya = [
        { setelan: gen.penulis?.berpikir ?? (SETELAN_PENYUSUN as SetelanPanggil), berpikir: true },
        { setelan: gen.penulis?.cadangan ?? (SETELAN_CADANGAN as SetelanPanggil), berpikir: false },
      ];
      let gagal = '';
      for (const [ulang, u] of upaya.entries()) {
        const info: InfoPeran = {
          jenis: jenisTulis, putaran, omongan: no, ke: 1, ulang, peran: 'penulis', model: modelPeranGen(gen).penulis,
        };
        const label =
          `${jenisTulis === 'susun' ? 'menulis' : 'menulis ulang'} omongan ${String(no)}` +
          (umpan.has(no) ? ` dengan ${String(umpan.get(no)?.length ?? 0)} butir umpan balik` : '') +
          (u.berpikir ? '' : ` — cadangan tanpa berpikir (${gagal})`);
        const mulai = jam().toISOString();
        let jawaban: JawabanModel;
        try {
          jawaban = await opsi.panggil(pesan, { ...u.setelan }, info);
        } catch (galat) {
          catatan.galat = [catatan.galat, teksGalat(galat)].filter((x) => x !== null).join(' | ');
          const pagu = galat instanceof PaguTercapai;
          const alasan = pagu ? `pagu tercapai: ${galat.message}` : `galat penyedia: ${teksGalat(galat)}`;
          catat({
            putaran, jenis: jenisTulis, omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(),
            model: modelPeranGen(gen).penulis, panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: 'galat',
            alasan: [label, alasan], sha256_prompt: hashPesan(pesan), rincian: { mode_berpikir: u.berpikir }, peran: 'penulis',
          });
          if (pagu) {
            hasil.berhenti = alasan;
            catatan.draf = gabung as Array<OmonganDraf | null>;
            return akhiri();
          }
          gagal = 'galat penyedia';
          tidakAda.set(no, `[galat penyedia] panggilan untuk omongan ini gagal (${teksGalat(galat).slice(0, 200)}); tulis omongan ini lagi.`);
          continue;
        }
        const selesai = jam().toISOString();
        const urai = uraiKeluaran(jawaban.teks);
        const ambil = urai.ok ? ambilOmongan(urai.nilai, no) : { omongan: undefined, lain: [] };
        const terurai = ambil.omongan !== undefined;
        // M2d-5 D-4: posisi kunci diatur kode SEBELUM omongan dilihat siapa pun.
        const posisi = terurai && gen.posisiKunci === true ? aturPosisiKunci(ambil.omongan, hurufKunciKode(opsi.paket.paket_id, no)) : null;
        catatan.diabaikan.push(...ambil.lain);
        catatan.panggilan.push({
          omongan: no, permintaan, waktu_mulai: mulai, waktu_selesai: selesai, teks_mentah: jawaban.teks,
          panjang_penalaran: jawaban.penalaran?.length ?? 0, finish_reason: jawaban.finish_reason,
          token_masuk: jawaban.token_masuk, token_keluar: jawaban.token_keluar, biaya_usd: jawaban.biaya_usd,
          latensi_ms: jawaban.latensi_ms, terurai, mode_berpikir: u.berpikir,
          ...(jawaban.penyedia === undefined ? {} : { penyedia: jawaban.penyedia, token_penalaran: jawaban.token_penalaran ?? null }),
        });
        catat({
          putaran, jenis: jenisTulis, omongan: no, waktu_mulai: mulai, waktu_selesai: selesai, model: modelPeranGen(gen).penulis,
          panggilan: 1, token_masuk: jawaban.token_masuk, token_keluar: jawaban.token_keluar, biaya_usd: jawaban.biaya_usd,
          putusan: 'ditulis',
          alasan: [
            label,
            ...(terurai ? [] : ['keluaran tidak memuat omongan yang terbaca']),
            ...(ambil.lain.length > 0 ? [`objek omongan lain (${ambil.lain.join(', ')}) dibuang`] : []),
          ],
          sha256_prompt: hashPesan(pesan),
          rincian: {
            terurai, diabaikan: ambil.lain, finish_reason: jawaban.finish_reason,
            panjang_penalaran: jawaban.penalaran?.length ?? 0, suhu: u.setelan.suhu, max_tokens: u.setelan.maxTokens,
            mode_berpikir: u.berpikir, terpotong: jawabanTerpotong(jawaban), nada, contoh_gaya: contoh.map((c) => c.id),
            ...(u.setelan.tambahanBadan === undefined ? {} : { badan: u.setelan.tambahanBadan }),
            ...(posisi === null ? {} : { posisi_kunci: { catatan: 'posisi kunci diatur kode', dari: posisi.dari, ke: posisi.ke, peta: posisi.peta } }),
            sudut: { ke: sk.ke, fact_id: sk.fact_id, putaran_sudut: putaranSudut.get(no) ?? 0 },
            ...(jawaban.penyedia === undefined ? {} : { penyedia: [jawaban.penyedia], token_penalaran: jawaban.token_penalaran ?? null }),
          },
          peran: 'penulis',
        });
        if (terurai) {
          gabung[no - 1] = posisi === null ? ambil.omongan : posisi.omongan;
          tidakAda.delete(no);
          break;
        }
        gagal =
          jawaban.finish_reason === 'length'
            ? 'panggilan berpikir terpotong batas token'
            : jawaban.teks.trim() === ''
              ? 'jawaban kosong (penalaran menghabiskan anggaran)'
              : 'keluaran tidak terbaca';
        tidakAda.set(
          no,
          urai.ok
            ? `[bentuk] keluaranmu tidak memuat omongan ${String(no)}; kirim tepat satu objek dengan "no": ${String(no)}.`
            : `[bentuk] keluaran bukan JSON yang sah: ${urai.alasan}` +
                (jawaban.finish_reason === 'length' ? ' (terpotong batas token: rencanakan lebih singkat)' : ''),
        );
      }
    }

    // --- 2. PEMERIKSA (kode): validator atas draf gabungan.
    const mulaiValidasi = jam().toISOString();
    const ada = gabung.filter((x) => x !== null && x !== undefined);
    const masalah = (ada.length > 0 ? opsi.validasi({ omongan: ada }, opsi.paket) : []).filter(
      (m) => !(ada.length < JUMLAH_OMONGAN && m.omongan === null && m.kode === 'SKEMA'),
    );
    const posisi = gabung.map((x, i) => (x === null || x === undefined ? null : i + 1)).filter((x): x is number => x !== null);
    const masalahNyata: MasalahDraf[] = masalah.map((m) => ({
      ...m,
      omongan: m.omongan === null ? null : (posisi[m.omongan - 1] ?? m.omongan),
    }));
    catatan.masalah = masalahNyata;
    const global = masalahNyata.filter((m) => m.omongan === null);
    catat({
      putaran, jenis: 'validator', omongan: null, waktu_mulai: mulaiValidasi, waktu_selesai: jam().toISOString(),
      model: null, panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0,
      putusan: masalahNyata.length > 0 || tidakAda.size > 0 ? 'tolak' : 'lolos',
      alasan: [
        ...[...tidakAda.keys()].map((no) => `omongan ${String(no)}: tidak ada omongan terbaca dari penulis`),
        ...masalahNyata.map((m) => `${m.omongan === null ? 'seluruh draf' : `omongan ${String(m.omongan)}`}: [${m.kode}] ${m.pesan}`),
      ],
      sha256_prompt: null,
      rincian: { diperiksa: posisi, kode: [...new Set(masalahNyata.map((m) => m.kode))].sort() },
      peran: 'pemeriksa',
    });

    // --- 3. per omongan yang belum terkunci: pemeriksa → pembaca kartu → penebak → kritikus.
    const umpanBaru = new Map<number, string[]>();
    const bawaBaru = new Set<number>();
    for (const no of [1, 2, 3]) {
      const tolak = (p: Omit<PemeriksaanPeran, 'no' | 'dibawa'> & { dibawa?: boolean }): void => {
        catatan.omongan.push({ no, dibawa: false, ...p });
        umpanBaru.set(no, p.umpan.length > 0 ? p.umpan : ['[bentuk] omongan ini belum ada.']);
        if (p.dibawa === true) bawaBaru.add(no);
      };
      if (terkunci.has(no)) {
        catatan.omongan.push({
          no, status: 'terkunci-sebelumnya', suara: { pemeriksa: true, kartu: true, tebak: true, kritikus: true },
          umpan: [], kartu: null, tebak: null, kritik: null, dibawa: false,
        });
        continue;
      }
      const suara: SuaraPenilai = { pemeriksa: false, kartu: null, tebak: null, kritikus: null };
      const butir: string[] = [];
      const hilang = tidakAda.get(no);
      if (hilang !== undefined) butir.push(hilang);
      for (const m of masalahNyata.filter((x) => x.omongan === no)) butir.push(`[pemeriksa: ${m.kode}] ${m.pesan}`);
      for (const m of global) butir.push(`[pemeriksa: ${m.kode}, seluruh draf] ${m.pesan}`);
      const o = gabung[no - 1];
      // Gerbang G (pemeriksa, kode): dijalankan pada setiap omongan yang
      // bentuknya terbaca, juga bila validator menolak — umpan baliknya
      // digabung supaya penulis melihat semua keberatan pemeriksa sekaligus.
      let g: PutusanG | null = null;
      let gaya: PutusanGaya | null = null;
      const bentukRusak = masalahNyata.some((m) => m.omongan === no && m.kode === 'SKEMA');
      if (o !== null && o !== undefined && !bentukRusak) {
        const mulaiG = jam().toISOString();
        g = gerbangG(o as OmonganDraf);
        butir.push(...g.umpan);
        if (gen.gerbangGaya) {
          gaya = gerbangGaya(o as OmonganDraf);
          butir.push(...gaya.umpan);
        }
        const huruf = gen.posisiKunci === true ? periksaRujukanHuruf(o as OmonganDraf) : [];
        butir.push(...huruf);
        const nilai = gen.gerbangMakna === true ? gPenilaian((o as OmonganDraf).pesan) : null;
        const mirip = gen.gerbangMakna === true ? gMirip(no, gabung as Array<OmonganDraf | null>, terkunci) : null;
        const kembar = gen.gerbangKembar === true ? gKembar((o as OmonganDraf).pilihan) : null;
        const umpanMakna = [
          ...(nilai?.alasan ?? []).map((a) => `[pemeriksa: G-penilaian] ${a}`),
          ...(mirip?.alasan ?? []).map((a) => `[pemeriksa: G-mirip] ${a}`),
          ...(kembar?.alasan ?? []).map((a) => `[pemeriksa: G-pilihan-kembar] ${a}`),
        ];
        butir.push(...umpanMakna);
        const tolakG = g.tolak || gaya?.tolak === true || huruf.length > 0 || umpanMakna.length > 0;
        catat({
          putaran, jenis: 'gerbang-g', omongan: no, waktu_mulai: mulaiG, waktu_selesai: jam().toISOString(), model: null,
          panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: tolakG ? 'tolak' : 'lolos',
          alasan: tolakG
            ? [...g.umpan, ...(gaya?.umpan ?? []), ...huruf, ...umpanMakna]
            : [gaya === null ? 'G-angka-cukup dan G-kaku tidak keberatan' : 'G-angka-cukup, G-kaku, G-panjang, G-satu-klausa, dan G-register tidak keberatan'],
          sha256_prompt: null,
          rincian: {
            pesan: teksPolos((o as OmonganDraf).pesan),
            angka_cukup: { tolak: g.angka_cukup.tolak, bukti: g.angka_cukup.bukti },
            kaku: { tolak: g.kaku.tolak, penanda: g.kaku.penanda, panjang: g.kaku.panjang, kalimat_panjang: g.kaku.kalimat_panjang },
            ...(gaya === null
              ? {}
              : {
                  panjang: { tolak: gaya.panjang.tolak, kata_pesan: gaya.panjang.kata_pesan, kata_pilihan: gaya.panjang.kata_pilihan, batas: gaya.panjang.batas },
                  satu_klausa: { tolak: gaya.klausa.tolak, masalah: gaya.klausa.masalah },
                  register: { tolak: gaya.register.tolak, kata: gaya.register.kata },
                }),
            ...(gen.posisiKunci === true ? { huruf_pilihan: { tolak: huruf.length > 0, butir: huruf } } : {}),
            ...(nilai === null ? {} : { penilaian: { tolak: nilai.tolak, temuan: nilai.temuan } }),
            ...(mirip === null ? {} : { mirip: { tolak: mirip.tolak, ambang: mirip.ambang, pasangan: mirip.pasangan } }),
            ...(kembar === null ? {} : { pilihan_kembar: { tolak: kembar.tolak, ambang: kembar.ambang, maks: kembar.maks, kembar: kembar.kembar } }),
          },
          peran: 'pemeriksa',
        });
      }
      const sk = sudutKini.get(no);
      if (o !== null && o !== undefined && !bentukRusak && sk !== undefined) {
        const penentu = (o as OmonganDraf).kartu_penentu;
        if (!Array.isArray(penentu) || !penentu.includes(sk.fact_id)) {
          butir.push(
            `[pemeriksa: SUDUT] kartu_penentu omongan ini harus memuat "${sk.fact_id}" (sudut ke-${String(sk.ke)} dari perencana); ` +
              `yang ditulis: ${JSON.stringify(penentu)}.`,
          );
        }
      }
      if (butir.length > 0 || o === null || o === undefined) {
        tolak({
          status: o === null || o === undefined ? 'tidak-ada' : 'ditolak-pemeriksa',
          suara, umpan: butir, kartu: null, tebak: null, kritik: null, g, gaya,
        });
        continue;
      }
      suara.pemeriksa = true;
      const omongan = o as OmonganDraf;
      const pesanTeman = teksPolos(omongan.pesan);
      const opsiGerbang = { panggil: panggilGerbang, putaran, omongan: no, jam };
      let tahap: 'gerbang-kartu' | 'gerbang-tebak' | 'kritikus' = 'gerbang-kartu';
      let mulaiGerbang = jam().toISOString();
      let kartu: PutusanKartu | null = null;
      let tebak = null as PutusanTebak | null;
      let kr = null as PutusanKritik | null;
      try {
        // --- 3a. PEMBACA KARTU
        kartu = await gerbangKartu(omongan, opsi.paket, { ...opsiGerbang, tandaiBingung: gen.kartuBingung === true, ...(gen.kartu ?? {}) });
        suara.kartu = kartu.lolos;
        catat({
          putaran, jenis: 'gerbang-kartu', omongan: no, waktu_mulai: mulaiGerbang, waktu_selesai: jam().toISOString(),
          model: modelPeranGen(gen)['pembaca-kartu'], panggilan: kartu.panggilan.length,
          token_masuk: jumlah(kartu.panggilan, (p) => p.token_masuk), token_keluar: jumlah(kartu.panggilan, (p) => p.token_keluar),
          biaya_usd: jumlah(kartu.panggilan, (p) => p.biaya_usd), putusan: kartu.lolos ? 'lolos' : 'tolak',
          alasan: [
            kartu.lolos ? `pembaca yang memegang kartu memilih "${String(kartu.pilihan)}" = kunci` : kartu.alasan,
            ...(kartu.membingungkan ?? []).filter((k) => k.sumber !== 'penulis').map((k) => `dicatat (${k.sumber}${k.bagian === null ? '' : `, ${k.bagian}`}): "${k.kutipan}"`),
          ],
          sha256_prompt: null,
          rincian: {
            pesan: pesanTeman, kunci: kartu.kunci, pilihan: kartu.pilihan, kartu_ditunjuk: kartu.kartu_ditunjuk,
            menunjuk_penentu: kartu.menunjuk_penentu, alasan_penjawab: kartu.alasan_penjawab,
            ...(kartu.membingungkan === undefined ? {} : { membingungkan: kartu.membingungkan }),
            ...penyediaDari(kartu.panggilan),
          },
          peran: 'pembaca-kartu',
        });
        // --- 3b/3c. PENEBAK ×3 dan KRITIKUS. Urutannya menurut generasi:
        // M2d-3 kartu → penebak → kritikus (murah → mahal); M2d-4 kartu →
        // KRITIKUS → penebak (D-6: kritikus lebih awal, supaya masalah makna
        // ditangkap sebelum soal disaring penebak). Peran berikutnya hanya
        // dipanggil bila peran sebelumnya tidak keberatan.
        const jalankanTebak = async (): Promise<PutusanTebak> => {
          tahap = 'gerbang-tebak';
          mulaiGerbang = jam().toISOString();
          const t = await gerbangTebak(omongan, {
            ...opsiGerbang, petunjuk: gen.penebak.petunjuk, maxTokensKe: gen.penebak.maxTokens,
            ...(gen.penebak.tambahanBadan === undefined ? {} : { tambahanBadanKe: gen.penebak.tambahanBadan }),
            ...(gen.penebak.ambangPenalaran === undefined ? {} : { ambangPenalaranKe: gen.penebak.ambangPenalaran }),
          });
          tebak = t;
          suara.tebak = t.lolos;
          const semua = t.tebakan.flatMap((x) => x.panggilan);
          catat({
            putaran, jenis: 'gerbang-tebak', omongan: no, waktu_mulai: mulaiGerbang, waktu_selesai: jam().toISOString(),
            model: ringkasModelPenebak(gen), panggilan: semua.length,
            token_masuk: jumlah(semua, (p) => p.token_masuk), token_keluar: jumlah(semua, (p) => p.token_keluar),
            biaya_usd: jumlah(semua, (p) => p.biaya_usd), putusan: t.lolos ? 'lolos' : 'tolak',
            alasan: [
              t.lolos
                ? `${String(t.benar)}/3 penebak tanpa kartu memilih kunci "${omongan.kunci}"` +
                  (t.yakin_benar === null ? '' : ` (rata-rata yakin ${String(Math.round(t.yakin_benar))})`)
                : t.alasan,
            ],
            sha256_prompt: null,
            rincian: {
              pesan: pesanTeman, kunci: omongan.kunci, benar: t.benar, yakin_benar: t.yakin_benar,
              tebakan: t.tebakan.map((x) => ({
                ke: x.ke, model: modelPenebak(gen, x.ke), pilihan: x.pilihan, yakin: x.yakin, benar: x.benar, terbaca: x.terbaca, alasan: x.alasan,
                biaya_usd: jumlah(x.panggilan, (p) => p.biaya_usd),
                ...(x.penalaran_tidak_sah === undefined
                  ? {}
                  : { token_penalaran: x.panggilan.map((p) => p.token_penalaran ?? null), penalaran_tidak_sah: x.penalaran_tidak_sah }),
              })),
              ...penyediaDari(semua),
            },
            peran: 'penebak',
          });
          return t;
        };
        const jalankanKritik = async (k: PutusanKartu): Promise<PutusanKritik> => {
          tahap = 'kritikus';
          mulaiGerbang = jam().toISOString();
          const r = await kritik(
            omongan,
            opsi.paket,
            {
              no,
              kartu: {
                pilihan: k.pilihan,
                kartu_ditunjuk_no: k.kartu_ditunjuk.map((id) => omongan.kartu.indexOf(id) + 1).filter((x) => x > 0),
                alasan: k.alasan_penjawab,
              },
              tebakan: (tebak?.tebakan ?? []).map((t) => ({ pilihan: t.pilihan, yakin: t.yakin })),
              penebakSesudah: gen.kritikus.sebelumPenebak,
            },
            {
              ...opsiGerbang, cekMakna: gen.kritikus.cekMakna, maxTokens: gen.kritikus.maxTokens,
              ...(gen.kritikus.tambahanBadan === undefined ? {} : { tambahanBadan: gen.kritikus.tambahanBadan }),
              ...(gen.kritikus.ambangPenalaran === undefined ? {} : { ambangPenalaran: gen.kritikus.ambangPenalaran }),
            },
          );
          kr = r;
          suara.kritikus = r.tanpa_keberatan;
          catat({
            putaran, jenis: 'kritikus', omongan: no, waktu_mulai: mulaiGerbang, waktu_selesai: jam().toISOString(),
            model: modelPeranGen(gen).kritikus, panggilan: r.panggilan.length,
            token_masuk: jumlah(r.panggilan, (p) => p.token_masuk), token_keluar: jumlah(r.panggilan, (p) => p.token_keluar),
            biaya_usd: jumlah(r.panggilan, (p) => p.biaya_usd),
            putusan: r.tanpa_keberatan ? 'lolos' : 'tolak',
            alasan: r.tanpa_keberatan ? ['kritikus tidak keberatan'] : umpanKritik(r),
            sha256_prompt: null,
            rincian: {
              pesan: pesanTeman, menjawab: r.menjawab, terpotong: r.terpotong, keberatan: r.keberatan, arahan: r.arahan,
              diabaikan: r.diabaikan, galat: r.galat,
              finish_reason: r.panggilan.map((p) => p.finish_reason),
              ...penyediaDari(r.panggilan),
              ...(r.penalaran_tidak_sah === undefined
                ? {}
                : { token_penalaran: r.panggilan.map((p) => p.token_penalaran ?? null), penalaran_tidak_sah: r.penalaran_tidak_sah }),
              ...(r.cek_makna === undefined ? {} : { cek_makna: r.cek_makna, sebelum_penebak: gen.kritikus.sebelumPenebak }),
            },
            peran: 'kritikus',
          });
          return r;
        };
        if (kartu.lolos) {
          if (gen.kritikus.sebelumPenebak) {
            const r = await jalankanKritik(kartu);
            if (r.tanpa_keberatan) await jalankanTebak();
          } else {
            const t = await jalankanTebak();
            if (t.lolos) await jalankanKritik(kartu);
          }
        }
      } catch (galat) {
        catatan.galat = [catatan.galat, teksGalat(galat)].filter((x) => x !== null).join(' | ');
        const pagu = galat instanceof PaguTercapai;
        const alasanGalat = pagu ? `pagu tercapai: ${galat.message}` : `galat penyedia saat ${tahap}: ${teksGalat(galat)}`;
        catat({
          putaran, jenis: tahap, omongan: no, waktu_mulai: mulaiGerbang, waktu_selesai: jam().toISOString(),
          model: modelPeranGen(gen)[PERAN_JENIS[tahap]], panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0,
          putusan: 'galat', alasan: [alasanGalat], sha256_prompt: null, rincian: { pesan: pesanTeman },
          peran: PERAN_JENIS[tahap],
        });
        if (pagu) {
          hasil.berhenti = alasanGalat;
          catatan.draf = gabung as Array<OmonganDraf | null>;
          return akhiri();
        }
        const butirGalat = `[galat penyedia saat ${tahap}] ${teksGalat(galat).slice(0, 200)}; omongan ini diperiksa lagi sesudah ditulis ulang.`;
        tolak({ status: 'galat-gerbang', suara, umpan: [butirGalat], kartu, tebak, kritik: kr, g, gaya });
        continue;
      }

      if (putusanAkhir(suara)) {
        catatan.omongan.push({ no, status: 'lolos', suara, umpan: [], kartu, tebak, kritik: kr, g, gaya, dibawa: false });
        terkunci.add(no);
      } else if (kartu !== null && !kartu.lolos) {
        tolak({ status: 'ditolak-kartu', suara, umpan: [`[pembaca kartu] ${kartu.alasan}`], kartu, tebak, kritik: kr, g, gaya });
      } else if (tebak !== null && !tebak.lolos) {
        tolak({ status: 'ditolak-tebak', suara, umpan: [`[penebak tanpa kartu] ${tebak.alasan}`], kartu, tebak, kritik: kr, g, gaya });
      } else if (kr !== null && !kr.menjawab) {
        tolak({ status: 'kritikus-tidak-menjawab', suara, umpan: umpanKritik(kr), kartu, tebak, kritik: kr, g, gaya, dibawa: true });
      } else {
        tolak({ status: 'ditolak-kritikus', suara, umpan: kr === null ? ['[kritikus] tidak dijalankan.'] : umpanKritik(kr), kartu, tebak, kritik: kr, g, gaya });
      }
    }
    draf = gabung.map((x) => (x === undefined ? null : (x as OmonganDraf | null)));
    catatan.draf = [...draf];
    umpan = umpanBaru;
    bawa = bawaBaru;

    // --- 4. PERENCANA (kode): sudut yang lolos ditutup; sudut yang gagal
    // 5 putaran dibuang dan posisinya mendapat sudut berikutnya.
    let habis: number | null = null;
    for (const no of aktif) {
      const sk = sudutKini.get(no) as CatatanSudut;
      if (terkunci.has(no)) {
        sk.hasil = 'lolos';
        sk.putaran_akhir = putaran;
        for (const id of draf[no - 1]?.kartu_penentu ?? []) terpakai.add(id);
        continue;
      }
      if ((putaranSudut.get(no) ?? 0) < MAKS_PUTARAN_SUDUT) continue;
      sk.hasil = 'dibuang';
      sk.putaran_akhir = putaran;
      const baru = sk.ke < MAKS_SUDUT ? sudutBerikutnya(daftarSudut, terpakai) : null;
      const mulaiBuang = jam().toISOString();
      catatan.dibuang.push({ no, ke: sk.ke, fact_id: sk.fact_id, pengganti: baru?.fact_id ?? null });
      catat({
        putaran, jenis: 'buang-sudut', omongan: no, waktu_mulai: mulaiBuang, waktu_selesai: jam().toISOString(), model: null,
        panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: 'tolak',
        alasan: [
          `omongan ${String(no)} gagal ${String(MAKS_PUTARAN_SUDUT)} putaran di sudut ke-${String(sk.ke)} (${sk.fact_id}); versi terakhirnya dibuang`,
          baru === null
            ? sk.ke >= MAKS_SUDUT
              ? `batas ${String(MAKS_SUDUT)} sudut per posisi tercapai`
              : 'tidak ada fakta sudut yang belum dipakai'
            : `sudut ke-${String(sk.ke + 1)}: ${baru.fact_id}`,
        ],
        sha256_prompt: null,
        rincian: {
          sudut_dibuang: { ke: sk.ke, fact_id: sk.fact_id, putaran_mulai: sk.putaran_mulai },
          sudut_baru: baru,
          umpan_terakhir: umpan.get(no) ?? [],
        },
        peran: 'perencana',
      });
      if (baru === null) {
        habis = no;
        continue;
      }
      terpakai.add(baru.fact_id);
      const c: CatatanSudut = {
        ke: sk.ke + 1, fact_id: baru.fact_id, topik: baru.topik, putaran_mulai: putaran + 1, putaran_akhir: null, hasil: 'berjalan',
      };
      sudutKini.set(no, c);
      hasil.sudut[no - 1]?.push(c);
      putaranSudut.set(no, 0);
      // Omongan yang dibuang tidak ditunjukkan lagi; sudut baru mulai dari nol.
      draf[no - 1] = null;
      umpan.delete(no);
      bawa.delete(no);
    }
    if (habis !== null) {
      const h = hasil.sudut[habis - 1] ?? [];
      hasil.berhenti =
        `omongan ${String(habis)} gagal di ${String(h.length)} sudut (${h.map((c) => c.fact_id).join(', ')}); simulasi tidak terbit`;
      return akhiri();
    }

    if (terkunci.size === JUMLAH_OMONGAN) {
      const akhir: DrafSimulasi = { omongan: draf as OmonganDraf[] };
      const sisa = opsi.validasi(akhir, opsi.paket);
      if (sisa.length > 0) {
        hasil.berhenti = `draf akhir ditolak validator: ${sisa.map((m) => m.kode).join(', ')}`;
        return akhiri();
      }
      hasil.lolos = true;
      hasil.draf = akhir;
      return akhiri();
    }
  }
  hasil.berhenti = `batas ${String(maks)} putaran tercapai; omongan terkunci: ${[...terkunci].sort().join(', ') || 'tidak ada'}; simulasi tidak terbit`;
  return akhiri();
}
