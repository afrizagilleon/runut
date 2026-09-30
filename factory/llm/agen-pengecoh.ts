/**
 * Lingkar agen PENGECOH DARI DATA (M2d-7). Peran dan wewenangnya sama dengan
 * lingkar berperan (`peran.md`): tidak ada peran yang bisa meloloskan
 * sendirian; penulis tidak menilai; kritikus tidak menulis ulang. Yang berubah:
 *
 *   perencana (kode): sudut + BANK PENGECOH dari data (D-2) + label klaim
 *     → penulis dipecah (D-3): pesan → pilihan (dari bank) → penjelasan
 *     → pemeriksa (kode): validator + gerbang G/gaya/makna/kembar
 *         + G-ikatan-bank + gerbang artefak murah: meresmikan, keseimbangan (D-4b/c)
 *     → gerbang pilihan-saja (DeepSeek ×2, hanya empat pilihan) (D-4a)
 *     → pembaca kartu (DeepSeek) → kritikus (GLM "max") → penebak ×3 (GLM "max")
 *     → lolos HANYA bila semuanya tidak keberatan
 *
 * Penolakan menjadi umpan balik BERALTERNATIF per lokasi (D-5,
 * `umpan-terarah.ts`); hanya bagian yang gagal ditulis ulang, bagian lain
 * dikunci; paling banyak 2 perbaikan per bagian, lalu posisi itu mendapat
 * sudut baru (paling banyak 3 sudut, 5 putaran per sudut — sama dengan M2d-3).
 */
import { bacaBank, nadaUntuk, pilihContoh, topikDariTeks, URUT_NADA_V2, type KalimatGaya, type Nada } from './bank-gaya.ts';
import { bankPengecoh, kunciSudut, type KandidatPengecoh, type KunciSudut } from './bank-pengecoh.ts';
import { PETUNJUK_PENEBAK_TAJAM, putusanAkhir, type HasilPeran, type InfoPeran, type PanggilanPenulis, type PanggilPeran, type PemeriksaanPeran, type PutaranPeran, type StatusPeran, type SuaraPenilai } from './agen-peran.ts';
import type { DrafSimulasi, KunciOpsi, MasalahDraf, OmonganDraf } from './draf.ts';
import { gArtefak, gPilihanSaja, type AmbangArtefak, type PutusanArtefak, type PutusanPilihanSaja } from './gerbang-artefak.ts';
import { gerbangG, type PutusanG } from './gerbang-g.ts';
import { gerbangGaya, type PutusanGaya } from './gerbang-gaya.ts';
import { gerbangKartu, type PutusanKartu } from './gerbang-kartu.ts';
import { gKembar } from './gerbang-kembar.ts';
import { gMirip } from './gerbang-mirip.ts';
import { gPenilaian } from './gerbang-penilaian.ts';
import { gerbangTebak, type InfoPanggil, type PanggilanGerbang, type PanggilLlm, type PutusanTebak } from './gerbang-tebak.ts';
import { hashPesan, type LangkahJejak, type PencatatJejak, type PeranLangkah } from './jejak.ts';
import type { PesanChat } from './klien.ts';
import { jawabanTerpotong, kritik, umpanKritik, type PutusanKritik } from './kritikus.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM, MODEL_PERAN_M2D5, type ModelOpenRouter, type PeranModel } from './model.ts';
import { PaguTercapai } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { PENALARAN_M2D5, PENALAR_M2D7, badanPenalaran, badanUpaya, setelanPenalaran, setelanTanpaPenalaran, type BatasPenalaran } from './penalaran.ts';
import {
  gIkatan,
  labelKode,
  pesanTulisPenjelasan,
  pesanTulisPesan,
  pesanTulisPilihan,
  promptPesan,
  rakitOmongan,
  susunHuruf,
  uraiPenjelasan,
  uraiPesan,
  uraiPilihanPenuh,
  uraiPilihanSebagian,
  type BagianPesan,
  type Label,
  type LokasiBagian,
  type SetPilihan,
} from './penulis-pecah.ts';
import { hurufKunciKode, periksaRujukanHuruf } from './posisi-kunci.ts';
import { KODE_PELINDUNG, aturanPenebak, bingungMenolak, jenisKritikus, penebakMenolak, type SetelanGerbangM2d8 } from './kalibrasi-setelan.ts';
import { MAKS_PUTARAN_SUDUT, MAKS_SUDUT, rencanaSudut, sudutBerikutnya, type CatatanSudut, type Sudut } from './sudut.ts';
import { SUHU, type JawabanModel, type SetelanPanggil } from './susun.ts';
import {
  catatPerbaikan,
  dariG,
  dariGaya,
  dariHuruf,
  dariIkatan,
  dariKartu,
  dariKembar,
  dariKritik,
  dariMeresmikan,
  dariPilihanSaja,
  dariTebak,
  dariValidator,
  isiLokasi,
  lengkapi,
  rencanaPerbaikan,
  tulisUmpan,
  type Bagian,
  type HitungPerbaikan,
  type RencanaPerbaikan,
  type UmpanMentah,
  type UmpanTerarah,
} from './umpan-terarah.ts';


export const JUMLAH_OMONGAN = 3;
export const MAKS_PUTARAN_PENGECOH = MAKS_PUTARAN_SUDUT * MAKS_SUDUT;
const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

/**
 * Batas penalaran penulis dipecah (DeepSeek, `reasoning.max_tokens`). Tugas
 * tiap panggilan jauh lebih kecil dari satu omongan utuh (M2d-5: penalaran
 * ±11.000 untuk omongan utuh): pesan dan penjelasan 4.000/8.000, pilihan
 * 8.000/14.000. Terpotong/tak terbaca → cadangan tanpa berpikir (M2d-2).
 */
export const PENULIS_M2D7 = {
  pesan: { penalaran: 4_000, maxTokens: 8_000 },
  pilihan: { penalaran: 8_000, maxTokens: 14_000 },
  penjelasan: { penalaran: 4_000, maxTokens: 8_000 },
} as const satisfies Record<string, BatasPenalaran>;
/** Penebak pilihan-saja (DeepSeek, D-4a): tebakan satu huruf, batas penalaran 4.000/8.000. */
export const PILIHAN_SAJA_M2D7 = { penalaran: 4_000, maxTokens: 8_000 } as const satisfies BatasPenalaran;

export interface SetelanTulis {
  berpikir: SetelanPanggil;
  cadangan: SetelanPanggil;
}

const tulis = (b: BatasPenalaran): SetelanTulis => ({ berpikir: setelanPenalaran(SUHU, b), cadangan: setelanTanpaPenalaran(SUHU, 4_000) });

export interface GenerasiPengecoh {
  nama: 'm2d7' | 'm2d8';
  model: Readonly<Record<PeranModel, ModelOpenRouter>>;
  modelPilihanSaja: ModelOpenRouter;
  penulis: Record<Bagian, SetelanTulis>;
  pilihanSaja: { maxTokens: number; tambahanBadan: Readonly<Record<string, unknown>> };
  kartu: { maxTokens: number; tambahanBadan: Readonly<Record<string, unknown>> };
  penebak: { petunjuk: string; model: readonly ModelOpenRouter[]; maxTokens: number; tambahanBadan: Readonly<Record<string, unknown>>; ambang: number };
  kritikus: { maxTokens: number; tambahanBadan: Readonly<Record<string, unknown>>; ambang: number };
  bank: () => KalimatGaya[];
  urutNada: readonly Nada[];
  /** Panjang daftar bank pengecoh yang ditunjukkan ke penulis. */
  maksBank: number;
  /** Ambang gerbang artefak + aturan penebak (kalibrasi D-6). */
  ambang: AmbangArtefak;
  /**
   * M2d-8: setelan tumpukan hasil kalibrasi terhadap soal manusia
   * (`kalibrasi-setelan.ts`). Bila ada: kode yang diturunkan dan gerbang
   * "dicatat" tetap dijalankan dan dicatat, tetapi tidak menolak; aturan
   * penebak/kritikus/pembaca kartu mengikuti tingkatnya. Tanpa medan ini
   * lingkar berperilaku persis M2d-7.
   */
  kalibrasi?: SetelanGerbangM2d8;
}

/**
 * Ambang hasil kalibrasi D-6 (`eval/keluaran-m2d7/kalibrasi/matriks.json`,
 * `putusanAmbang` — dites sama): gerbang baru menolak 3 dari 4 soal aman
 * yang terukur (> 4/6), maka keempat langkah pelonggaran diambil berurutan;
 * soal aman yang tetap ditolak ditolak oleh penebak 3/3 benar.
 */
export const AMBANG_KALIBRASI_M2D7: AmbangArtefak = { rasio: 1.5, maksKata: 3, pilihanSajaYakin: 60, penebakYakin: false };

/**
 * Generasi M2d-7: penulis dipecah (DeepSeek), pilihan-saja DeepSeek, pembaca
 * kartu DeepSeek (M2d-5), kritikus + penebak ×3 GLM `effort: "max"` dengan
 * penjaga (`PENALAR_M2D7`, dari probe T-01), petunjuk penebak "pemburu soal
 * bocor" (K3, M2d-6).
 */
export const GENERASI_M2D7: GenerasiPengecoh = {
  nama: 'm2d7',
  model: MODEL_PERAN_M2D5,
  modelPilihanSaja: MODEL_OR_DEEPSEEK,
  penulis: { pesan: tulis(PENULIS_M2D7.pesan), pilihan: tulis(PENULIS_M2D7.pilihan), penjelasan: tulis(PENULIS_M2D7.penjelasan) },
  pilihanSaja: { maxTokens: PILIHAN_SAJA_M2D7.maxTokens, tambahanBadan: badanPenalaran(PILIHAN_SAJA_M2D7) },
  kartu: { maxTokens: PENALARAN_M2D5.kartu.maxTokens, tambahanBadan: badanPenalaran(PENALARAN_M2D5.kartu) },
  penebak: {
    petunjuk: PETUNJUK_PENEBAK_TAJAM,
    model: [MODEL_OR_GLM, MODEL_OR_GLM, MODEL_OR_GLM],
    maxTokens: PENALAR_M2D7.penebakGlm.maxTokens,
    tambahanBadan: badanUpaya(PENALAR_M2D7.penebakGlm),
    ambang: PENALAR_M2D7.penebakGlm.ambang,
  },
  kritikus: { maxTokens: PENALAR_M2D7.kritikus.maxTokens, tambahanBadan: badanUpaya(PENALAR_M2D7.kritikus), ambang: PENALAR_M2D7.kritikus.ambang },
  bank: () => bacaBank(2).filter((k) => !gPenilaian(k.teks).tolak),
  urutNada: URUT_NADA_V2,
  maksBank: 12,
  ambang: AMBANG_KALIBRASI_M2D7,
};

/* ---------------------------------------------------------------------- */
/* keadaan                                                                 */
/* ---------------------------------------------------------------------- */

interface Posisi {
  no: number;
  label: Label;
  sudut: CatatanSudut;
  kunci: KunciSudut;
  bank: KandidatPengecoh[];
  pesan: BagianPesan | null;
  pilihan: SetPilihan | null;
  penjelasan: string | null;
  omongan: OmonganDraf | null;
  rencana: RencanaPerbaikan;
  umpan: UmpanTerarah[];
  perbaikan: HitungPerbaikan;
  bawa: boolean;
  putaranSudut: number;
  /** Bagian yang gagal ditulis (keluaran tak terbaca) di putaran ini. */
  gagalTulis: UmpanMentah[];
}

const RENCANA_PENUH: RencanaPerbaikan = { gagal: [], tulisPesan: true, tulisPilihan: [...HURUF], tulisPenjelasan: true };
const NOL: HitungPerbaikan = { pesan: 0, pilihan: 0, penjelasan: 0 };

export interface PemeriksaanPengecoh extends PemeriksaanPeran {
  /** M2d-8: penolakan gerbang/kode yang diturunkan menjadi "dicatat" (tidak menolak). */
  dicatat?: Array<{ sumber: string; alasan: string }>;
  artefak?: PutusanArtefak | null;
  pilihan_saja?: PutusanPilihanSaja | null;
  ikatan?: Array<{ lokasi: LokasiBagian; teramati: string; alasan: string }>;
  umpan_terarah?: UmpanTerarah[];
  rencana?: RencanaPerbaikan | null;
  perbaikan?: HitungPerbaikan;
}

export interface PutaranPengecoh extends PutaranPeran {
  /** Bagian yang ditulis per omongan di putaran ini. */
  bagian_ditulis: Array<{ no: number; pesan: boolean; pilihan: KunciOpsi[]; penjelasan: boolean }>;
  omongan: PemeriksaanPengecoh[];
}

export interface HasilPengecoh extends HasilPeran {
  generasi: 'm2d7' | 'm2d8';
  label: Label[];
  /** Bank pengecoh per sudut yang dipakai. */
  bank: Record<string, KandidatPengecoh[]>;
  riwayat: PutaranPengecoh[];
}

export interface OpsiPengecoh {
  paket: PaketFakta;
  panggil: PanggilPeran;
  validasi: (draf: unknown, paket: PaketFakta) => MasalahDraf[];
  maksPutaran?: number;
  jam?: () => Date;
  jejak?: PencatatJejak;
  rencanaSudut?: Sudut[];
  generasi?: GenerasiPengecoh;
}

type CatatLangkah = Omit<LangkahJejak, 'no' | 'peran'> & { peran: PeranLangkah };

function teksGalat(galat: unknown): string {
  return galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
}

function jumlah<T>(larik: readonly T[], f: (x: T) => number): number {
  return larik.reduce((a, x) => a + f(x), 0);
}

function penyediaDari(p: ReadonlyArray<{ penyedia?: string | null }>): { penyedia?: Array<string | null> } {
  return p.some((x) => x.penyedia !== undefined) ? { penyedia: p.map((x) => x.penyedia ?? null) } : {};
}

/** Pemanggil untuk gerbang (kartu, kritikus, penebak, pilihan-saja): tempelkan peran + model M2d-7. */
function lewatPeran(panggil: PanggilPeran, gen: GenerasiPengecoh): PanggilLlm {
  return (pesan, setelan, info) => {
    let peran: PeranModel;
    let model: ModelOpenRouter;
    if (info.jenis === 'gerbang-tebak') {
      peran = 'penebak';
      model = gen.penebak.model[info.ke - 1] ?? MODEL_OR_GLM;
    } else if (info.jenis === 'gerbang-pilihan-saja') {
      peran = 'penebak';
      model = gen.modelPilihanSaja;
    } else if (info.jenis === 'gerbang-kartu') {
      peran = 'pembaca-kartu';
      model = gen.model['pembaca-kartu'];
    } else if (info.jenis === 'kritikus') {
      peran = 'kritikus';
      model = gen.model.kritikus;
    } else {
      peran = 'penulis';
      model = gen.model.penulis;
    }
    return panggil(pesan, setelan, { ...info, peran, model });
  };
}

export async function jalankanPengecoh(opsi: OpsiPengecoh): Promise<HasilPengecoh> {
  const gen = opsi.generasi ?? GENERASI_M2D7;
  const maks = opsi.maksPutaran ?? MAKS_PUTARAN_PENGECOH;
  const jam = opsi.jam ?? (() => new Date());
  const jejak = opsi.jejak ?? null;
  const paket = opsi.paket;
  const catat = (l: CatatLangkah): void => {
    jejak?.catat(l);
  };
  const panggilGerbang = lewatPeran(opsi.panggil, gen);
  const label = [1, 2, 3].map((no) => labelKode(paket.paket_id, no));
  const hasil: HasilPengecoh = {
    paket_id: paket.paket_id,
    model_peran: { ...gen.model, penebak: gen.penebak.model[0] ?? MODEL_OR_GLM },
    lolos: false,
    jumlah_putaran: 0,
    berhenti: null,
    draf: null,
    rencana_sudut: [],
    sudut: [[], [], []],
    riwayat: [],
    generasi: gen.nama,
    label,
    bank: {},
  };
  const akhiri = (): HasilPengecoh => {
    jejak?.selesai(hasil.lolos, hasil.jumlah_putaran, hasil.berhenti);
    return hasil;
  };

  // --- 0. PERENCANA: sudut, bank pengecoh, label klaim.
  const daftarSudut = opsi.rencanaSudut ?? rencanaSudut(paket);
  hasil.rencana_sudut = daftarSudut;
  const terpakai = new Set<string>();
  const terkunci = new Set<number>();
  const posisi = new Map<number, Posisi>();
  const mulaiRencana = jam().toISOString();
  const siapkan = (no: number, s: Sudut, ke: number, putaranMulai: number): Posisi => {
    const c: CatatanSudut = { ke, fact_id: s.fact_id, topik: s.topik, putaran_mulai: putaranMulai, putaran_akhir: null, hasil: 'berjalan' };
    hasil.sudut[no - 1]?.push(c);
    const bank = bankPengecoh(paket, s.fact_id, gen.maksBank);
    hasil.bank[s.fact_id] = bank;
    return {
      no, label: label[no - 1] as Label, sudut: c, kunci: kunciSudut(paket, s.fact_id), bank, pesan: null, pilihan: null, penjelasan: null, omongan: null,
      rencana: RENCANA_PENUH, umpan: [], perbaikan: { ...NOL }, bawa: false, putaranSudut: 0, gagalTulis: [],
    };
  };
  for (const no of [1, 2, 3]) {
    const s = sudutBerikutnya(daftarSudut, terpakai);
    if (s === null) break;
    terpakai.add(s.fact_id);
    posisi.set(no, siapkan(no, s, 1, 1));
  }
  catat({
    putaran: 1, jenis: 'rencana-sudut', omongan: null, waktu_mulai: mulaiRencana, waktu_selesai: jam().toISOString(), model: null,
    panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: posisi.size === JUMLAH_OMONGAN ? 'lolos' : 'tolak',
    alasan: [
      `${String(daftarSudut.length)} sudut; ` +
        [1, 2, 3].map((no) => `omongan ${String(no)} = ${posisi.get(no)?.sudut.fact_id ?? '(tidak ada)'} (klaim ${label[no - 1] ?? '?'}, bank ${String(posisi.get(no)?.bank.length ?? 0)})`).join(', '),
    ],
    sha256_prompt: null,
    rincian: { daftar: daftarSudut, label, bank: Object.fromEntries([...posisi.values()].map((p) => [p.sudut.fact_id, p.bank.map((b) => `${b.id} ${b.jenis} ${b.fact_id}`)])) },
    peran: 'perencana',
  });
  if (posisi.size < JUMLAH_OMONGAN) {
    hasil.berhenti = `paket hanya memberi ${String(posisi.size)} sudut; simulasi tidak terbit`;
    return akhiri();
  }

  for (let putaran = 1; putaran <= maks; putaran++) {
    hasil.jumlah_putaran = putaran;
    const aktif = [1, 2, 3].filter((no) => !terkunci.has(no));
    for (const no of aktif) (posisi.get(no) as Posisi).putaranSudut += 1;
    const catatan: PutaranPengecoh = {
      putaran,
      sudut: aktif.map((no) => {
        const p = posisi.get(no) as Posisi;
        return { no, ke: p.sudut.ke, fact_id: p.sudut.fact_id, putaran_sudut: p.putaranSudut };
      }),
      dibuang: [],
      ditulis: aktif.filter((no) => !(posisi.get(no) as Posisi).bawa),
      dibawa: aktif.filter((no) => (posisi.get(no) as Posisi).bawa),
      panggilan: [],
      diabaikan: [],
      masalah: [],
      omongan: [],
      draf: [],
      galat: null,
      bagian_ditulis: [],
    };
    hasil.riwayat.push(catatan);
    const drafKini = (): Array<OmonganDraf | null> => [1, 2, 3].map((no) => posisi.get(no)?.omongan ?? null);

    // --- 1. PENULIS dipecah (hanya bagian yang direncanakan).
    for (const no of catatan.ditulis) {
      const p = posisi.get(no) as Posisi;
      p.gagalTulis = [];
      const r = p.rencana;
      catatan.bagian_ditulis.push({ no, pesan: r.tulisPesan, pilihan: [...r.tulisPilihan], penjelasan: r.tulisPenjelasan });
      const umpanBagian = (b: Bagian): string[] => p.umpan.filter((u) => (b === 'pilihan' ? u.lokasi.startsWith('pilihan-') : u.lokasi === b)).map(tulisUmpan);
      const panggilTulis = async <T>(
        bagian: Bagian,
        pesan: PesanChat[],
        urai: (teks: string) => T | null,
      ): Promise<T | null | 'pagu'> => {
        const jenis = bagian === 'pesan' ? 'tulis-pesan' : bagian === 'pilihan' ? 'tulis-pilihan' : 'tulis-penjelasan';
        const upaya = [{ setelan: gen.penulis[bagian].berpikir, berpikir: true }, { setelan: gen.penulis[bagian].cadangan, berpikir: false }];
        for (const [ulang, u] of upaya.entries()) {
          const info: InfoPeran = { jenis, putaran, omongan: no, ke: 1, ulang, peran: 'penulis', model: gen.model.penulis };
          const mulai = jam().toISOString();
          let j: JawabanModel;
          try {
            j = await opsi.panggil(pesan, { ...u.setelan }, info);
          } catch (galat) {
            catatan.galat = [catatan.galat, teksGalat(galat)].filter((x) => x !== null).join(' | ');
            catat({
              putaran, jenis, omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(), model: gen.model.penulis, panggilan: 0,
              token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: 'galat', alasan: [teksGalat(galat)], sha256_prompt: hashPesan(pesan),
              rincian: { bagian, mode_berpikir: u.berpikir }, peran: 'penulis',
            });
            if (galat instanceof PaguTercapai) {
              hasil.berhenti = `pagu tercapai: ${galat.message}`;
              return 'pagu';
            }
            continue;
          }
          const nilai = urai(j.teks);
          const pp: PanggilanPenulis & { bagian: Bagian } = {
            omongan: no, permintaan: pesan[1]?.content ?? '', waktu_mulai: mulai, waktu_selesai: jam().toISOString(), teks_mentah: j.teks,
            panjang_penalaran: j.penalaran?.length ?? 0, finish_reason: j.finish_reason, token_masuk: j.token_masuk, token_keluar: j.token_keluar,
            biaya_usd: j.biaya_usd, latensi_ms: j.latensi_ms, terurai: nilai !== null, mode_berpikir: u.berpikir, bagian,
            ...(j.penyedia === undefined ? {} : { penyedia: j.penyedia, token_penalaran: j.token_penalaran ?? null }),
          };
          catatan.panggilan.push(pp);
          catat({
            putaran, jenis, omongan: no, waktu_mulai: mulai, waktu_selesai: pp.waktu_selesai, model: gen.model.penulis, panggilan: 1,
            token_masuk: j.token_masuk, token_keluar: j.token_keluar, biaya_usd: j.biaya_usd, putusan: 'ditulis',
            alasan: [`${bagian} omongan ${String(no)}${u.berpikir ? '' : ' — cadangan tanpa berpikir'}${nilai === null ? ' (tak terbaca)' : ''}`],
            sha256_prompt: hashPesan(pesan),
            rincian: {
              bagian, terurai: nilai !== null, finish_reason: j.finish_reason, terpotong: jawabanTerpotong(j), mode_berpikir: u.berpikir,
              max_tokens: u.setelan.maxTokens, ...(u.setelan.tambahanBadan === undefined ? {} : { badan: u.setelan.tambahanBadan }),
              ...(j.penyedia === undefined ? {} : { penyedia: [j.penyedia], token_penalaran: j.token_penalaran ?? null }),
            },
            peran: 'penulis',
          });
          if (nilai !== null) return nilai;
        }
        return null;
      };
      const gagalBentuk = (lokasi: LokasiBagian, apa: string): void => {
        p.gagalTulis.push({ lokasi, sumber: 'pemeriksa: BENTUK', teramati: '(keluaran tak terbaca)', alasan: `keluaran ${apa} bukan JSON berbentuk yang diminta; kirim tepat bentuk JSON di akhir permintaan` });
      };

      // 1a. pesan
      if (r.tulisPesan) {
        const gaya = (() => {
          const nada = nadaUntuk(no, p.sudut.ke, gen.urutNada);
          const topik = [p.sudut.topik, ...topikDariTeks(paket.peristiwa).filter((t) => t !== p.sudut.topik)];
          return { nada, contoh: pilihContoh({ topik, nada, paket_id: paket.paket_id }, gen.bank()) };
        })();
        const namaLain = [1, 2, 3].filter((x) => x !== no).map((x) => posisi.get(x)?.pesan?.nama).filter((x): x is string => x !== undefined);
        const h = await panggilTulis('pesan', pesanTulisPesan({
          paket, no, label: p.label, kunci: p.kunci, bank: p.bank, namaLain, gaya, sebelumnya: p.pesan, umpan: umpanBagian('pesan'),
        }), uraiPesan);
        if (h === 'pagu') return akhiriPagu();
        if (h === null) {
          gagalBentuk('pesan', 'pesan');
          p.omongan = null;
          continue;
        }
        p.pesan = h;
      }
      if (p.pesan === null) {
        gagalBentuk('pesan', 'pesan');
        p.omongan = null;
        continue;
      }
      // 1b. pilihan (penuh, atau hanya huruf yang gagal)
      const hurufKunci = hurufKunciKode(paket.paket_id, no);
      if (r.tulisPilihan.length > 0 || p.pilihan === null) {
        const sebagian = p.pilihan !== null && !r.tulisPesan && r.tulisPilihan.length > 0 && r.tulisPilihan.length < 4;
        const tulisHuruf = sebagian ? r.tulisPilihan : [...HURUF];
        const pesanP = pesanTulisPilihan({
          paket, no, label: p.label, kunci: p.kunci, bank: p.bank, pesan: p.pesan,
          sebelumnya: p.pilihan === null ? null : { pilihan: p.pilihan, kunci: hurufKunci }, tulis: tulisHuruf, umpan: umpanBagian('pilihan'),
        });
        const h = await panggilTulis('pilihan', pesanP, (teks) => {
          if (sebagian && p.pilihan !== null) {
            const s = uraiPilihanSebagian(teks, tulisHuruf);
            return s === null ? null : ({ ...p.pilihan, ...s } as SetPilihan);
          }
          const d = uraiPilihanPenuh(teks);
          return d === null ? null : susunHuruf(d, hurufKunci);
        });
        if (h === 'pagu') return akhiriPagu();
        if (h === null) {
          for (const x of tulisHuruf) gagalBentuk(`pilihan-${x}`, 'pilihan');
          p.omongan = null;
          continue;
        }
        p.pilihan = h;
      }
      // 1c. penjelasan
      if (r.tulisPenjelasan || p.penjelasan === null) {
        const tanpa = rakitOmongan(paket, p.kunci, p.pesan, p.pilihan as SetPilihan, hurufKunci, p.bank, '');
        const { penjelasan: _p, ...inti } = tanpa;
        void _p;
        const h = await panggilTulis('penjelasan', pesanTulisPenjelasan(paket, inti, umpanBagian('penjelasan'), p.penjelasan), uraiPenjelasan);
        if (h === 'pagu') return akhiriPagu();
        if (h === null) {
          gagalBentuk('penjelasan', 'penjelasan');
          p.omongan = null;
          continue;
        }
        p.penjelasan = h;
      }
      p.omongan = rakitOmongan(paket, p.kunci, p.pesan, p.pilihan as SetPilihan, hurufKunci, p.bank, p.penjelasan as string);
    }

    // --- 2. PEMERIKSA: validator atas draf gabungan.
    const gabung = drafKini();
    const ada = gabung.filter((x): x is OmonganDraf => x !== null);
    const posisiAda = gabung.map((x, i) => (x === null ? null : i + 1)).filter((x): x is number => x !== null);
    const masalah = (ada.length > 0 ? opsi.validasi({ omongan: ada }, paket) : [])
      .filter((m) => !(ada.length < JUMLAH_OMONGAN && m.omongan === null && m.kode === 'SKEMA'))
      .map((m) => ({ ...m, omongan: m.omongan === null ? null : (posisiAda[m.omongan - 1] ?? m.omongan) }));
    catatan.masalah = masalah;
    catat({
      putaran, jenis: 'validator', omongan: null, waktu_mulai: jam().toISOString(), waktu_selesai: jam().toISOString(), model: null,
      panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: masalah.length > 0 ? 'tolak' : 'lolos',
      alasan: masalah.map((m) => `${m.omongan === null ? 'seluruh draf' : `omongan ${String(m.omongan)}`}: [${m.kode}] ${m.pesan}`),
      sha256_prompt: null, rincian: { diperiksa: posisiAda, kode: [...new Set(masalah.map((m) => m.kode))].sort() }, peran: 'pemeriksa',
    });

    // --- 3. per omongan: pemeriksa (kode) → pilihan-saja → pembaca kartu → kritikus → penebak.
    for (const no of [1, 2, 3]) {
      if (terkunci.has(no)) {
        catatan.omongan.push({
          no, status: 'terkunci-sebelumnya', suara: { pemeriksa: true, kartu: true, tebak: true, kritikus: true }, umpan: [], kartu: null, tebak: null, kritik: null, dibawa: false,
        });
        continue;
      }
      const p = posisi.get(no) as Posisi;
      const o = p.omongan;
      const suara: SuaraPenilai = { pemeriksa: false, kartu: null, tebak: null, kritikus: null };
      const hurufKunci = hurufKunciKode(paket.paket_id, no);
      const konteks = { paket, label: p.label, kunci: p.kunci, bank: p.bank, pesan: p.pesan, pilihan: p.pilihan, hurufKunci, kartu: o?.kartu ?? [p.kunci.fact_id] };
      const tolak = (status: StatusPeran, mentah: readonly UmpanMentah[], isi: Partial<PemeriksaanPengecoh>, bawa = false): void => {
        const umpan = lengkapi(mentah.length > 0 ? mentah : [{ lokasi: `pilihan-${hurufKunci}`, sumber: status, teramati: '', alasan: status }], konteks);
        const rencana = bawa ? null : rencanaPerbaikan(umpan);
        catatan.omongan.push({
          no, status, suara, umpan: umpan.map(tulisUmpan), kartu: null, tebak: null, kritik: null, dibawa: bawa, ...isi,
          umpan_terarah: umpan, rencana, perbaikan: { ...p.perbaikan },
        });
        if (bawa) {
          p.bawa = true;
          return;
        }
        p.bawa = false;
        const { hitung, gantiSudut } = catatPerbaikan(p.perbaikan, rencana as RencanaPerbaikan);
        p.perbaikan = hitung;
        p.umpan = umpan;
        p.rencana = gantiSudut ? RENCANA_PENUH : (rencana as RencanaPerbaikan);
        if (gantiSudut) p.putaranSudut = MAKS_PUTARAN_SUDUT; // dibuang di langkah perencana di bawah
        const last = catatan.omongan.at(-1) as PemeriksaanPengecoh;
        last.perbaikan = { ...hitung };
      };
      if (o === null) {
        tolak('tidak-ada', p.gagalTulis, {});
        continue;
      }
      // 3a. pemeriksa (kode)
      const mentah: UmpanMentah[] = [];
      const milik = masalah.filter((m) => m.omongan === no || m.omongan === null);
      mentah.push(...dariValidator(milik, o));
      const bentukRusak = masalah.some((m) => m.omongan === no && m.kode === 'SKEMA');
      let g: PutusanG | null = null;
      let gaya: PutusanGaya | null = null;
      let artefak: PutusanArtefak | null = null;
      let ikatan: ReturnType<typeof gIkatan> = [];
      if (!bentukRusak) {
        const mulaiG = jam().toISOString();
        g = gerbangG(o);
        gaya = gerbangGaya(o);
        const huruf = periksaRujukanHuruf(o);
        const nilai = gPenilaian(o.pesan);
        const mirip = gMirip(no, gabung, terkunci);
        const kembar = gKembar(o.pilihan);
        ikatan = gIkatan(p.pesan as BagianPesan, p.pilihan as SetPilihan, hurufKunci, p.label, p.kunci, p.bank);
        artefak = gArtefak(o, gen.ambang);
        const kode: UmpanMentah[] = [
          ...dariG(g, o),
          ...dariGaya(gaya, o),
          ...dariHuruf(huruf, o),
          ...nilai.alasan.map((a) => ({ lokasi: 'pesan' as const, sumber: 'pemeriksa: G-penilaian', teramati: o.pesan, alasan: a })),
          ...mirip.alasan.map((a) => ({ lokasi: `pilihan-${hurufKunci}` as LokasiBagian, sumber: 'pemeriksa: G-mirip', teramati: isiLokasi(o, `pilihan-${hurufKunci}`), alasan: a })),
          ...(mirip.tolak ? HURUF.filter((h) => h !== hurufKunci).map((h) => ({ lokasi: `pilihan-${h}` as LokasiBagian, sumber: 'pemeriksa: G-mirip', teramati: isiLokasi(o, `pilihan-${h}`), alasan: 'pola pilihan hampir sama dengan omongan lain' })) : []),
          ...dariKembar(kembar, o),
          ...dariIkatan(ikatan),
        ];
        const kodeArtefak: UmpanMentah[] = [
          ...dariMeresmikan(artefak.meresmikan.alasan, o),
          ...artefak.keseimbangan.alasan.map((a) => ({ lokasi: `pilihan-${hurufKunci}` as LokasiBagian, sumber: 'gerbang artefak: keseimbangan', teramati: isiLokasi(o, `pilihan-${hurufKunci}`), alasan: a })),
        ];
        mentah.push(...kode, ...kodeArtefak);
        catat({
          putaran, jenis: 'gerbang-g', omongan: no, waktu_mulai: mulaiG, waktu_selesai: jam().toISOString(), model: null, panggilan: 0,
          token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: kode.length > 0 ? 'tolak' : 'lolos',
          alasan: kode.length > 0 ? kode.map((u) => `${u.sumber} (${u.lokasi}): ${u.alasan}`) : ['gerbang G, gaya, makna, kembar, dan ikatan bank tidak keberatan'],
          sha256_prompt: null,
          rincian: {
            pesan: o.pesan, angka_cukup: { tolak: g.angka_cukup.tolak }, kaku: { tolak: g.kaku.tolak, penanda: g.kaku.penanda },
            panjang: { kata_pesan: gaya.panjang.kata_pesan, kata_pilihan: gaya.panjang.kata_pilihan }, satu_klausa: gaya.klausa.masalah, register: gaya.register.kata,
            huruf_pilihan: huruf, penilaian: nilai.temuan, mirip: { tolak: mirip.tolak, pasangan: mirip.pasangan }, pilihan_kembar: { tolak: kembar.tolak, maks: kembar.maks },
            ikatan, sumber_pilihan: Object.fromEntries(HURUF.map((h) => [h, p.pilihan?.[h].sumber ?? null])), klaim_dari: p.pesan?.klaim_dari ?? null,
          },
          peran: 'pemeriksa',
        });
        catat({
          putaran, jenis: 'gerbang-artefak', omongan: no, waktu_mulai: mulaiG, waktu_selesai: jam().toISOString(), model: null, panggilan: 0,
          token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: artefak.tolak ? 'tolak' : 'lolos',
          alasan: artefak.tolak ? kodeArtefak.map((u) => u.alasan) : ['meresmikan dan keseimbangan tidak keberatan'],
          sha256_prompt: null, rincian: { meresmikan: artefak.meresmikan, keseimbangan: artefak.keseimbangan }, peran: 'pemeriksa',
        });
      }
      // M2d-8: kode bukan-pelindung yang diturunkan dan gerbang artefak "dicatat" tidak menolak (tetap dicatat).
      const kal = gen.kalibrasi;
      const dicatat: Array<{ sumber: string; alasan: string }> = [];
      if (kal !== undefined) {
        const turun = (u: UmpanMentah): boolean => {
          const kode = u.sumber.startsWith('pemeriksa: ') ? u.sumber.slice('pemeriksa: '.length) : null;
          if (kode !== null && kal.kode_dicatat.includes(kode) && !KODE_PELINDUNG.includes(kode)) return true;
          if (u.sumber === 'gerbang artefak: meresmikan' && kal.dicatat.includes('meresmikan')) return true;
          return u.sumber === 'gerbang artefak: keseimbangan' && kal.dicatat.includes('keseimbangan');
        };
        for (const u of mentah) if (turun(u) && !dicatat.some((d) => d.sumber === u.sumber && d.alasan === u.alasan)) dicatat.push({ sumber: u.sumber, alasan: u.alasan });
        mentah.splice(0, mentah.length, ...mentah.filter((u) => !turun(u)));
      }
      const catatGerbang = (sumber: string, alasan: readonly string[]): void => {
        for (const a of alasan) dicatat.push({ sumber, alasan: a });
      };
      if (mentah.length > 0) {
        tolak('ditolak-pemeriksa', mentah, { g, gaya, artefak, ikatan, ...(kal === undefined ? {} : { dicatat }) });
        continue;
      }
      suara.pemeriksa = true;
      const opsiGerbang = { panggil: panggilGerbang, putaran, omongan: no, jam };
      let tahap: 'gerbang-pilihan-saja' | 'gerbang-kartu' | 'kritikus' | 'gerbang-tebak' = 'gerbang-pilihan-saja';
      let mulai = jam().toISOString();
      let pilihanSaja: PutusanPilihanSaja | null = null;
      let kartu: PutusanKartu | null = null;
      let kr: PutusanKritik | null = null;
      let tebak: PutusanTebak | null = null;
      const isi = (): Partial<PemeriksaanPengecoh> => ({ g, gaya, artefak, ikatan, pilihan_saja: pilihanSaja, kartu, kritik: kr, tebak, ...(kal === undefined ? {} : { dicatat }) });
      try {
        // 3b. pilihan-saja (D-4a)
        pilihanSaja = await gPilihanSaja(o, { ...opsiGerbang, maxTokens: gen.pilihanSaja.maxTokens, tambahanBadan: gen.pilihanSaja.tambahanBadan, yakinMin: gen.ambang.pilihanSajaYakin });
        const semuaPS = pilihanSaja.tebakan.flatMap((t) => t.panggilan);
        catat({
          putaran, jenis: 'gerbang-pilihan-saja', omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(), model: gen.modelPilihanSaja,
          panggilan: semuaPS.length, token_masuk: jumlah(semuaPS, (x) => x.token_masuk), token_keluar: jumlah(semuaPS, (x) => x.token_keluar),
          biaya_usd: jumlah(semuaPS, (x) => x.biaya_usd), putusan: pilihanSaja.tolak ? 'tolak' : 'lolos',
          alasan: pilihanSaja.tolak ? pilihanSaja.alasan : [`${String(pilihanSaja.kena)}/2 penebak pilihan-saja memilih kunci`],
          sha256_prompt: null,
          rincian: { kunci: o.kunci, tebakan: pilihanSaja.tebakan.map((t) => ({ ke: t.ke, pilihan: t.pilihan, yakin: t.yakin, alasan: t.alasan, terbaca: t.terbaca })), ...penyediaDari(semuaPS) },
          peran: 'penebak',
        });
        if (pilihanSaja.tolak && kal?.dicatat.includes('pilihan_saja') === true) catatGerbang('gerbang pilihan-saja', pilihanSaja.alasan);
        else if (pilihanSaja.tolak) {
          tolak('ditolak-artefak', dariPilihanSaja(pilihanSaja.alasan, o), isi());
          continue;
        }
        // 3c. pembaca kartu
        tahap = 'gerbang-kartu';
        mulai = jam().toISOString();
        kartu = await gerbangKartu(o, paket, { ...opsiGerbang, tandaiBingung: true, ...gen.kartu });
        // M2d-8: di tingkat 1 kalimat membingungkan tidak menolak (jawaban salah tetap menolak); "dicatat" = tidak menolak.
        if (kal !== undefined && !kartu.lolos) {
          const benar = kartu.pilihan === o.kunci;
          if (kal.dicatat.includes('kartu') || (benar && !bingungMenolak(kal))) {
            catatGerbang('pembaca kartu', [kartu.alasan]);
            kartu = { ...kartu, lolos: true };
          }
        }
        suara.kartu = kartu.lolos;
        catat({
          putaran, jenis: 'gerbang-kartu', omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(), model: gen.model['pembaca-kartu'],
          panggilan: kartu.panggilan.length, token_masuk: jumlah(kartu.panggilan, (x) => x.token_masuk), token_keluar: jumlah(kartu.panggilan, (x) => x.token_keluar),
          biaya_usd: jumlah(kartu.panggilan, (x) => x.biaya_usd), putusan: kartu.lolos ? 'lolos' : 'tolak',
          alasan: [kartu.lolos ? `pembaca yang memegang kartu memilih "${String(kartu.pilihan)}" = kunci` : kartu.alasan],
          sha256_prompt: null,
          rincian: { kunci: kartu.kunci, pilihan: kartu.pilihan, kartu_ditunjuk: kartu.kartu_ditunjuk, menunjuk_penentu: kartu.menunjuk_penentu, alasan_penjawab: kartu.alasan_penjawab, membingungkan: kartu.membingungkan ?? [], ...penyediaDari(kartu.panggilan) },
          peran: 'pembaca-kartu',
        });
        if (!kartu.lolos) {
          tolak('ditolak-kartu', dariKartu(kartu, o), isi());
          continue;
        }
        // 3d. kritikus (GLM "max", dijaga)
        tahap = 'kritikus';
        mulai = jam().toISOString();
        kr = await kritik(
          o, paket,
          {
            no,
            kartu: { pilihan: kartu.pilihan, kartu_ditunjuk_no: kartu.kartu_ditunjuk.map((id) => o.kartu.indexOf(id) + 1).filter((x) => x > 0), alasan: kartu.alasan_penjawab },
            tebakan: [], penebakSesudah: true,
          },
          { ...opsiGerbang, cekMakna: true, maxTokens: gen.kritikus.maxTokens, tambahanBadan: gen.kritikus.tambahanBadan, ambangPenalaran: gen.kritikus.ambang },
        );
        // M2d-8: hanya keberatan berjenis tingkat setelan yang menolak; "dicatat" = tidak menolak (juga bila tidak menjawab).
        if (kal !== undefined && !kr.tanpa_keberatan) {
          const menolak = kr.menjawab ? kr.keberatan.some((x) => jenisKritikus(kal).includes(x.jenis)) : true;
          if (kal.dicatat.includes('kritikus') || !menolak) {
            catatGerbang('kritikus', umpanKritik(kr));
            kr = { ...kr, menjawab: true, tanpa_keberatan: true };
          }
        }
        suara.kritikus = kr.tanpa_keberatan;
        catat({
          putaran, jenis: 'kritikus', omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(), model: gen.model.kritikus,
          panggilan: kr.panggilan.length, token_masuk: jumlah(kr.panggilan, (x) => x.token_masuk), token_keluar: jumlah(kr.panggilan, (x) => x.token_keluar),
          biaya_usd: jumlah(kr.panggilan, (x) => x.biaya_usd), putusan: kr.tanpa_keberatan ? 'lolos' : 'tolak',
          alasan: kr.tanpa_keberatan ? ['kritikus tidak keberatan'] : umpanKritik(kr),
          sha256_prompt: null,
          rincian: {
            menjawab: kr.menjawab, terpotong: kr.terpotong, keberatan: kr.keberatan, arahan: kr.arahan, diabaikan: kr.diabaikan, galat: kr.galat,
            finish_reason: kr.panggilan.map((x) => x.finish_reason), token_penalaran: kr.panggilan.map((x) => x.token_penalaran ?? null),
            ...(kr.penalaran_tidak_sah === undefined ? {} : { penalaran_tidak_sah: kr.penalaran_tidak_sah }),
            ...(kr.cek_makna === undefined ? {} : { cek_makna: kr.cek_makna }), ...penyediaDari(kr.panggilan),
          },
          peran: 'kritikus',
        });
        if (!kr.menjawab) {
          tolak('kritikus-tidak-menjawab', [], isi(), true);
          continue;
        }
        if (!kr.tanpa_keberatan) {
          const u = dariKritik(kr, o);
          tolak('ditolak-kritikus', u.length > 0 ? u : umpanKritik(kr).map((a) => ({ lokasi: `pilihan-${hurufKunci}` as LokasiBagian, sumber: 'kritikus', teramati: isiLokasi(o, `pilihan-${hurufKunci}`), alasan: a })), isi());
          continue;
        }
        // 3e. penebak ×3 (GLM "max", dijaga) — TANPA kartu
        tahap = 'gerbang-tebak';
        mulai = jam().toISOString();
        tebak = await gerbangTebak(o, {
          ...opsiGerbang, petunjuk: gen.penebak.petunjuk, maxTokensKe: gen.penebak.model.map(() => gen.penebak.maxTokens),
          tambahanBadanKe: gen.penebak.model.map(() => gen.penebak.tambahanBadan), ambangPenalaranKe: gen.penebak.model.map(() => gen.penebak.ambang),
        });
        // Kalibrasi D-6 bisa melepas klausa "yakin ≥ 40" K-05: tolak hanya bila ≥ 2/3 benar (tak terbaca = benar).
        if (kal === undefined && !gen.ambang.penebakYakin) tebak = { ...tebak, lolos: tebak.benar <= 1, alasan: tebak.benar <= 1 ? '' : tebak.alasan };
        // M2d-8: aturan penebak menurut tingkat setelan; "dicatat" = tidak menolak.
        if (kal !== undefined) {
          const t0 = tebak;
          const menolak = penebakMenolak(t0.tebakan.map((x) => ({ pilihan: x.terbaca ? x.pilihan : null, yakin: x.terbaca ? x.yakin : null, terbaca: x.terbaca })), o.kunci, aturanPenebak(kal));
          if (menolak && kal.dicatat.includes('penebak')) catatGerbang('penebak tanpa kartu', [t0.alasan === '' ? `${String(t0.benar)}/3 memilih kunci` : t0.alasan]);
          tebak = { ...t0, lolos: !menolak || kal.dicatat.includes('penebak'), alasan: menolak ? (t0.alasan === '' ? `${String(t0.benar)}/3 penebak tanpa kartu memilih kunci "${o.kunci}"` : t0.alasan) : '' };
        }
        suara.tebak = tebak.lolos;
        const semuaT: PanggilanGerbang[] = tebak.tebakan.flatMap((x) => x.panggilan);
        catat({
          putaran, jenis: 'gerbang-tebak', omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(), model: gen.penebak.model.join(' + '),
          panggilan: semuaT.length, token_masuk: jumlah(semuaT, (x) => x.token_masuk), token_keluar: jumlah(semuaT, (x) => x.token_keluar),
          biaya_usd: jumlah(semuaT, (x) => x.biaya_usd), putusan: tebak.lolos ? 'lolos' : 'tolak',
          alasan: [tebak.lolos ? `${String(tebak.benar)}/3 penebak tanpa kartu memilih kunci "${o.kunci}"` : tebak.alasan],
          sha256_prompt: null,
          rincian: {
            kunci: o.kunci, benar: tebak.benar, yakin_benar: tebak.yakin_benar,
            tebakan: tebak.tebakan.map((x) => ({
              ke: x.ke, pilihan: x.pilihan, yakin: x.yakin, benar: x.benar, terbaca: x.terbaca, alasan: x.alasan,
              token_penalaran: x.panggilan.map((y) => y.token_penalaran ?? null), ...(x.penalaran_tidak_sah === undefined ? {} : { penalaran_tidak_sah: x.penalaran_tidak_sah }),
            })),
            ...penyediaDari(semuaT),
          },
          peran: 'penebak',
        });
        if (!tebak.lolos) {
          tolak('ditolak-tebak', dariTebak(tebak, o), isi());
          continue;
        }
      } catch (galat) {
        catatan.galat = [catatan.galat, teksGalat(galat)].filter((x) => x !== null).join(' | ');
        const pagu = galat instanceof PaguTercapai;
        const alasan = pagu ? `pagu tercapai: ${galat.message}` : `galat penyedia saat ${tahap}: ${teksGalat(galat)}`;
        catat({
          putaran, jenis: tahap, omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(), model: null, panggilan: 0,
          token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: 'galat', alasan: [alasan], sha256_prompt: null, rincian: {},
          peran: tahap === 'gerbang-kartu' ? 'pembaca-kartu' : tahap === 'kritikus' ? 'kritikus' : 'penebak',
        });
        if (pagu) {
          hasil.berhenti = alasan;
          catatan.draf = drafKini();
          return akhiri();
        }
        tolak('galat-gerbang', [], isi(), true);
        continue;
      }
      if (!putusanAkhir(suara)) throw new Error('putusan tidak konsisten');
      catatan.omongan.push({
        no, status: 'lolos', suara, umpan: [], kartu, tebak, kritik: kr, g, gaya, dibawa: false, artefak, ikatan, pilihan_saja: pilihanSaja, perbaikan: { ...p.perbaikan },
        ...(kal === undefined ? {} : { dicatat }),
      });
      terkunci.add(no);
      p.bawa = false;
    }
    catatan.draf = drafKini();

    // --- 4. PERENCANA: sudut yang lolos ditutup; sudut yang habis (5 putaran, atau perbaikan > 2) dibuang.
    let habis: number | null = null;
    for (const no of aktif) {
      const p = posisi.get(no) as Posisi;
      if (terkunci.has(no)) {
        p.sudut.hasil = 'lolos';
        p.sudut.putaran_akhir = putaran;
        for (const id of p.omongan?.kartu_penentu ?? []) terpakai.add(id);
        continue;
      }
      if (p.putaranSudut < MAKS_PUTARAN_SUDUT) continue;
      p.sudut.hasil = 'dibuang';
      p.sudut.putaran_akhir = putaran;
      const baru = p.sudut.ke < MAKS_SUDUT ? sudutBerikutnya(daftarSudut, terpakai) : null;
      catatan.dibuang.push({ no, ke: p.sudut.ke, fact_id: p.sudut.fact_id, pengganti: baru?.fact_id ?? null });
      catat({
        putaran, jenis: 'buang-sudut', omongan: no, waktu_mulai: jam().toISOString(), waktu_selesai: jam().toISOString(), model: null, panggilan: 0,
        token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: 'tolak',
        alasan: [
          `omongan ${String(no)} habis di sudut ke-${String(p.sudut.ke)} (${p.sudut.fact_id}): perbaikan ${JSON.stringify(p.perbaikan)}, putaran ${String(Math.min(p.putaranSudut, MAKS_PUTARAN_SUDUT))}`,
          baru === null ? (p.sudut.ke >= MAKS_SUDUT ? `batas ${String(MAKS_SUDUT)} sudut per posisi tercapai` : 'tidak ada fakta sudut yang belum dipakai') : `sudut ke-${String(p.sudut.ke + 1)}: ${baru.fact_id}`,
        ],
        sha256_prompt: null, rincian: { sudut_dibuang: p.sudut.fact_id, sudut_baru: baru, perbaikan: p.perbaikan }, peran: 'perencana',
      });
      if (baru === null) {
        habis = no;
        continue;
      }
      terpakai.add(baru.fact_id);
      posisi.set(no, siapkan(no, baru, p.sudut.ke + 1, putaran + 1));
    }
    if (habis !== null) {
      const h = hasil.sudut[habis - 1] ?? [];
      hasil.berhenti = `omongan ${String(habis)} gagal di ${String(h.length)} sudut (${h.map((c) => c.fact_id).join(', ')}); simulasi tidak terbit`;
      return akhiri();
    }
    if (terkunci.size === JUMLAH_OMONGAN) {
      const akhir: DrafSimulasi = { omongan: drafKini() as OmonganDraf[] };
      const sisa = opsi.validasi(akhir, paket);
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

  function akhiriPagu(): HasilPengecoh {
    const c = hasil.riwayat.at(-1);
    if (c !== undefined) c.draf = [1, 2, 3].map((no) => posisi.get(no)?.omongan ?? null);
    return akhiri();
  }
}

/** Prompt sistem ringkas untuk jejak (hash): ketiga prompt penulis dipecah. */
export function promptPenulisPengecoh(): string {
  return promptPesan();
}

export type { InfoPanggil };
