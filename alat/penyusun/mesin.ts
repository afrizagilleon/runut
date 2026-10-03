/**
 * Antarmuka mesin penulis soal (M2d-9 D-4) dan dua pemasangnya.
 *
 * Pintu penyusun tidak tahu BAGAIMANA soal ditulis: ia menyerahkan paket fakta
 * dan pagu ke sebuah `MesinPenulis`, menerima peristiwa tahapan untuk
 * dialirkan, dan menerima hasil (draf + jejak, atau penolakan beralasan).
 * Pendekatan lain — misalnya templat dari soal manusia yang diisi fakta oleh
 * kode — cukup memasang mesin baru tanpa mengubah server maupun halaman.
 *
 * Pemasang yang ada:
 * - `MesinLingkar` + `panggilSungguhan`: lingkar agen pengecoh dengan setelan
 *   terkini M2d-8 (`GENERASI_M2D8`, validator `validasiM2d8`), OpenRouter,
 *   dua model tetap, pagu berlapis (kumulatif `LLM_PAGU_USD` → semua tag
 *   `penyusun/` → satu jalan);
 * - `MesinLingkar` + model palsu (mode `--palsu`): lingkar & gerbang kode yang
 *   sama, model dipalsukan, tanpa jaringan dan tanpa ledger.
 */
import { GENERASI_M2D8 } from '../../factory/llm/kalibrasi-susun.ts';
import { validasiM2d8 } from '../../factory/llm/kalibrasi-soal.ts';
import { jalankanPengecoh, promptPenulisPengecoh, ujiUlangDraf, type GenerasiPengecoh, type KeadaanOmongan } from '../../factory/llm/agen-pengecoh.ts';
import type { PanggilPeran } from '../../factory/llm/agen-peran.ts';
import type { PesanChat } from '../../factory/llm/klien.ts';
import type { DrafSimulasi, OmonganDraf } from '../../factory/llm/draf.ts';
import { bacaKonfigLlm } from '../../factory/llm/env.ts';
import { HARGA, biayaUsd } from '../../factory/llm/harga.ts';
import { PencatatJejak, type JejakAgen, type LangkahJejak, type OpsiPencatatJejak } from '../../factory/llm/jejak.ts';
import { MODEL_OPENROUTER, type ModelOpenRouter } from '../../factory/llm/model.ts';
import { BASE_URL_OPENROUTER } from '../../factory/llm/openrouter.ts';
import { chatBerpagu, PencatatBiaya } from '../../factory/llm/pagu.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { pagarM2d7 } from '../../factory/llm/penyedia-urutan.ts';
import { ubahGalatSaldo } from '../../factory/llm/peran-susun.ts';
import { pesanPaket, type JawabanModel, type SetelanPanggil } from '../../factory/llm/susun.ts';
import type { TahapAliran } from './aliran.ts';
import { AWALAN_TAG_PENYUSUN, jalurLedger } from './biaya.ts';

/* ---------------------------------------------------------------------- */
/* antarmuka                                                               */
/* ---------------------------------------------------------------------- */

export interface PerkiraanBiaya {
  /** Perkiraan maksimum satu panggilan per peran: batas masukan + `max_tokens` × harga daftar. */
  per_panggilan: Array<{ peran: string; model: string; maks_usd: number }>;
  /** Satu omongan melewati seluruh gerbang sekali (termasuk ulangan penjaga penalaran). */
  per_omongan_usd: number;
  /** Tiga omongan satu putaran. */
  per_putaran_usd: number;
  maks_putaran: number;
  catatan: string[];
}

export type Lapor = (tahap: TahapAliran, judul: string, isi: Record<string, unknown>) => void;

export interface KonteksJalan {
  id: string;
  paket: PaketFakta;
  /** Folder jalan (`eval/penyusun/<id>/`); jejak ditulis ke sini. */
  folder: string;
  paguJalanUsd: number;
  lapor: Lapor;
  jam: () => Date;
}

export interface HasilMesin {
  terbit: boolean;
  draf: DrafSimulasi | null;
  /** Alasan berhenti/penolakan (kalimat lingkar); `null` bila terbit. */
  berhenti: string | null;
  putaran: number;
  /** Omongan yang lolos semua gerbang (dikunci), untuk uji ulang suntingan. */
  keadaan: KeadaanOmongan[];
  /** Versi terakhir tiap posisi (untuk ditampilkan saat tidak terbit). */
  draf_terakhir: Array<OmonganDraf | null>;
  biaya_usd: number;
  jejak: JejakAgen;
  /** Riwayat lengkap lingkar (disimpan ke `hasil.json`). */
  riwayat: unknown;
}

export interface KonteksUjiUlang {
  id: string;
  /** Nomor uji ulang (1, 2, …) — untuk tag dan nama berkas jejak. */
  ke: number;
  paket: PaketFakta;
  folder: string;
  /** Keadaan KETIGA omongan sesudah suntingan. */
  keadaan: KeadaanOmongan[];
  diuji: number[];
  paguUsd: number;
  lapor: Lapor;
  jam: () => Date;
}

export interface HasilUjiUlang {
  lolos: boolean;
  berhenti: string | null;
  /** Masalah validator atas draf gabungan. */
  masalah: string[];
  per_omongan: Array<{ no: number; lolos: boolean; status: string; alasan: string[]; dicatat: string[] }>;
  biaya_usd: number;
}

export interface MesinPenulis {
  readonly nama: string;
  readonly keterangan: string;
  /** Tanda biaya: sungguhan (OpenRouter) atau palsu. */
  readonly palsu: boolean;
  /** Bisakah mesin dijalankan sekarang (kunci ada, dsb.). Tanpa memanggil jaringan. */
  siap(): { siap: boolean; alasan: string | null };
  /**
   * M2d-10: apakah paket cukup untuk mesin ini (tanpa jaringan, sebelum biaya).
   * Tanpa metode ini pintu memakai aturan lingkar (≥ 3 sudut).
   */
  cukupPaket?(paket: PaketFakta): { cukup: boolean; jumlah: number; satuan: string };
  perkiraan(): PerkiraanBiaya;
  jalankan(k: KonteksJalan): Promise<HasilMesin>;
  /** Perkiraan maksimum uji ulang `jumlah` omongan lewat gerbang yang sama (tanpa penulis). */
  perkiraanUjiUlang(jumlah: number): number;
  /** Uji ulang draf yang disunting penyetuju dengan gerbang yang sama. */
  ujiUlang(k: KonteksUjiUlang): Promise<HasilUjiUlang>;
}

/* ---------------------------------------------------------------------- */
/* perkiraan biaya                                                         */
/* ---------------------------------------------------------------------- */

/**
 * Batas atas token masukan per panggilan untuk perkiraan di layar. Terukur di
 * jalan TIRT M2d-8 (ledger `m2d8/jalan/`): masukan terbesar 4.894 token
 * (penulis pilihan). Perkiraan ini untuk manusia; yang MENEGAKKAN pagu adalah
 * `PencatatBiaya`, yang menghitung batas masukan dari byte pesan sungguhan.
 */
export const MASUKAN_MAKS_TOKEN = 6_000;

function maks(model: ModelOpenRouter, maxTokens: number): number {
  return biayaUsd(HARGA[model], MASUKAN_MAKS_TOKEN, maxTokens);
}

export function perkiraanGenerasi(gen: GenerasiPengecoh, maksPutaran: number): PerkiraanBiaya {
  const p = gen.model.penulis;
  const tulis = (['pesan', 'pilihan', 'penjelasan'] as const).map((b) => ({
    peran: `penulis (${b})`,
    model: p,
    maks_usd: maks(p, gen.penulis[b].berpikir.maxTokens) + maks(p, gen.penulis[b].cadangan.maxTokens),
  }));
  const pilihanSaja = { peran: 'penebak pilihan-saja (×2)', model: gen.modelPilihanSaja, maks_usd: maks(gen.modelPilihanSaja, gen.pilihanSaja.maxTokens) };
  const kartu = { peran: 'pembaca kartu', model: gen.model['pembaca-kartu'], maks_usd: maks(gen.model['pembaca-kartu'], gen.kartu.maxTokens) };
  const kritikus = { peran: 'kritikus', model: gen.model.kritikus, maks_usd: maks(gen.model.kritikus, gen.kritikus.maxTokens) };
  const penebakModel = gen.penebak.model[0] ?? gen.model.kritikus;
  const penebak = { peran: `penebak tanpa kartu (×${String(gen.penebak.model.length)})`, model: penebakModel, maks_usd: maks(penebakModel, gen.penebak.maxTokens) };
  const perOmongan =
    tulis.reduce((a, x) => a + x.maks_usd, 0) + 2 * pilihanSaja.maks_usd + kartu.maks_usd + 2 * kritikus.maks_usd + gen.penebak.model.length * 2 * penebak.maks_usd;
  const bulat = (x: number): number => Math.round(x * 10_000) / 10_000;
  return {
    per_panggilan: [...tulis, pilihanSaja, kartu, kritikus, penebak].map((x) => ({ ...x, maks_usd: bulat(x.maks_usd) })),
    per_omongan_usd: bulat(perOmongan),
    per_putaran_usd: bulat(3 * perOmongan),
    maks_putaran: maksPutaran,
    catatan: [
      `Perkiraan per panggilan = ${MASUKAN_MAKS_TOKEN.toLocaleString('id-ID')} token masukan + max_tokens peran × harga daftar OpenRouter (factory/llm/harga.ts).`,
      'Per omongan: tiga bagian penulis (dengan cadangan), pilihan-saja ×2, pembaca kartu, kritikus, dan penebak ×3 — kritikus dan penebak termasuk satu ulangan penjaga penalaran.',
      'Sebelum SETIAP panggilan kode memeriksa: biaya nyata tercatat + perkiraan maksimum panggilan itu ≤ pagu jalan, ≤ pagu semua jalan penyusun, dan ≤ LLM_PAGU_USD. Bila tidak, panggilan tidak dikirim dan jalan berhenti dengan alasan tertulis.',
    ],
  };
}

/** Gerbang saja (tanpa penulis) untuk satu omongan: pilihan-saja ×2, kartu, kritikus, penebak — dengan ulangan penjaga. */
export function perkiraanGerbangOmongan(gen: GenerasiPengecoh): number {
  const penebakModel = gen.penebak.model[0] ?? gen.model.kritikus;
  const x =
    2 * maks(gen.modelPilihanSaja, gen.pilihanSaja.maxTokens) +
    maks(gen.model['pembaca-kartu'], gen.kartu.maxTokens) +
    2 * maks(gen.model.kritikus, gen.kritikus.maxTokens) +
    gen.penebak.model.length * 2 * maks(penebakModel, gen.penebak.maxTokens);
  return Math.round(x * 10_000) / 10_000;
}

/* ---------------------------------------------------------------------- */
/* jejak yang juga mengalirkan tahapan                                    */
/* ---------------------------------------------------------------------- */

const NAMA_PERAN: Readonly<Record<string, string>> = {
  perencana: 'perencana (kode)',
  penulis: 'penulis',
  pemeriksa: 'pemeriksa (kode)',
  penebak: 'penebak',
  'pembaca-kartu': 'pembaca kartu',
  kritikus: 'kritikus',
  penyempurna: 'penyempurna struktur (Haiku)',
};

const NAMA_LANGKAH: Readonly<Record<string, string>> = {
  'rencana-sudut': 'rencana sudut',
  'tulis-pesan': 'tulis pesan teman',
  'tulis-pilihan': 'tulis pilihan',
  'tulis-penjelasan': 'tulis penjelasan',
  validator: 'validator draf',
  'gerbang-g': 'gerbang kode',
  'gerbang-artefak': 'gerbang artefak',
  'gerbang-pilihan-saja': 'tebak dari pilihan saja',
  'gerbang-kartu': 'jawab dengan kartu',
  kritikus: 'kritikus makna',
  'gerbang-tebak': 'tebak tanpa kartu',
  'buang-sudut': 'buang sudut',
  'rencana-templat': 'rencana templat',
  'sempurnakan-pilihan': 'sempurnakan pilihan',
};

function potong(t: string, n: number): string {
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

/** Satu baris tahapan untuk halaman dari satu langkah jejak. */
export function ringkasLangkah(l: LangkahJejak, total: number): { judul: string; isi: Record<string, unknown> } {
  const siapa = NAMA_PERAN[l.peran ?? ''] ?? l.peran ?? '?';
  const apa = NAMA_LANGKAH[l.jenis] ?? l.jenis;
  const putusan = l.putusan === 'lolos' ? 'lolos' : l.putusan === 'tolak' ? 'TOLAK' : l.putusan === 'galat' ? 'GALAT' : 'ditulis';
  const letak = `putaran ${String(l.putaran)}${l.omongan === null ? '' : ` · omongan ${String(l.omongan)}`}`;
  const alasan = l.alasan.slice(0, 3).map((a) => potong(a, 280));
  return {
    judul: `${letak} · ${siapa}: ${apa} → ${putusan}${alasan[0] === undefined ? '' : ` — ${potong(alasan[0], 160)}`}`,
    isi: {
      putaran: l.putaran,
      omongan: l.omongan,
      peran: l.peran ?? null,
      jenis: l.jenis,
      putusan: l.putusan,
      alasan,
      model: l.model,
      panggilan: l.panggilan,
      biaya_usd: l.biaya_usd,
      total_usd: Math.round(total * 1e6) / 1e6,
    },
  };
}

export class PencatatJejakAliran extends PencatatJejak {
  private readonly saat: (l: LangkahJejak) => void;
  constructor(o: OpsiPencatatJejak, saat: (l: LangkahJejak) => void) {
    super(o);
    this.saat = saat;
  }
  override catat(l: Omit<LangkahJejak, 'no'>): LangkahJejak {
    const x = super.catat(l);
    this.saat(x);
    return x;
  }
}

/* ---------------------------------------------------------------------- */
/* pemanggil model                                                         */
/* ---------------------------------------------------------------------- */

/** Pembuat pemanggil model untuk satu awalan tag dan pagu bagiannya. */
export type BuatPanggil = (awalanTag: string, paguBagianUsd: number) => PanggilPeran;

/** Keterangan minimal satu panggilan lewat pintu (lingkar M2d-8 dan mesin templat M2d-10). */
export interface InfoPanggilPintu {
  jenis: string;
  putaran: number;
  omongan: number | null;
  ke: number;
  ulang?: number;
  model: string;
}
export type PanggilPintu = (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoPanggilPintu) => Promise<JawabanModel>;

/** Tag ledger satu panggilan: `penyusun/<id>/p<putaran>/<jenis>[/o<n>][/t<k>|/k<k>][/u<k>]` (`/k<k>` = tulis-ulang pra-periksa ke-k, M2d-15). */
export function tagPanggilan(awalan: string, info: Pick<InfoPanggilPintu, 'jenis' | 'putaran' | 'omongan' | 'ke' | 'ulang'>): string {
  const o = info.omongan === null ? '' : `/o${String(info.omongan)}`;
  const ke = info.jenis === 'gerbang-tebak' || info.jenis === 'gerbang-pilihan-saja' ? `/t${String(info.ke)}` : '';
  const pra = info.jenis === 'tulis-praperiksa' ? `/k${String(info.ke)}` : '';
  const ulang = info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : '';
  return `${awalan}p${String(info.putaran)}/${info.jenis}${o}${ke}${pra}${ulang}`;
}

/**
 * Pemanggil OpenRouter sungguhan. Kunci dibaca dari `.env` oleh kode ini
 * (`bacaKonfigLlm`) SAAT jalan disetujui, dan hanya berpindah ke header klien.
 * Pagu berlapis ditegakkan `PencatatBiaya` sebelum setiap percobaan HTTP.
 */
/** M2d-10 A-1: pagar & bungkus khusus panggilan kritikus (penyedia dikunci). */
export interface OpsiKritikusPintu {
  pagarKritikus: (model: string, abaikan?: readonly string[]) => Readonly<Record<string, unknown>>;
  bungkus: (p: PanggilPintu) => PanggilPintu;
}

/**
 * `awalanMilestone`: awalan tag yang dijumlah pagu milestone (bawaan `penyusun/`). M2d-14: uji ulang
 * mode demo memakai `m2d14/` dengan pagu US$0,15 sendiri, supaya biayanya tidak masuk laporan M2d-13.
 */
export function panggilSungguhan(
  akar: string,
  paguPenyusunUsd: number,
  log: (b: string) => void = () => undefined,
  kritikus?: OpsiKritikusPintu,
  awalanMilestone: string = AWALAN_TAG_PENYUSUN,
): (awalanTag: string, paguBagianUsd: number) => PanggilPintu {
  return (awalanTag, paguBagianUsd) => {
    const konfig = bacaKonfigLlm(akar);
    if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak); pintu penyusun hanya memanggil OpenRouter.');
    const klien = { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000, pagar: pagarM2d7 };
    const biaya = new PencatatBiaya({
      paguUsd: konfig.paguUsd,
      jalurLedger: jalurLedger(akar),
      biayaNyata: true,
      paguMilestone: { usd: paguPenyusunUsd, awalanTag: awalanMilestone },
      paguBagian: [{ usd: paguBagianUsd, awalanTag }],
    });
    const klienKritikus = kritikus === undefined ? klien : { ...klien, pagar: kritikus.pagarKritikus };
    const dasar = async (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoPanggilPintu): Promise<JawabanModel> => {
      if (!(MODEL_OPENROUTER as readonly string[]).includes(info.model)) throw new Error(`Model ${info.model} tidak diizinkan pintu penyusun.`);
      const tag = tagPanggilan(awalanTag, info);
      try {
        const j = await chatBerpagu(
          info.jenis === 'kritikus' ? klienKritikus : klien,
          biaya,
          { model: info.model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan, ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }) },
          tag,
          setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
        );
        log(`  ${tag}: keluar ${String(j.token_keluar)} ${String(j.finish_reason)} US$${j.biaya_usd.toFixed(6)} ${String(j.penyedia)}`);
        return j;
      } catch (galat) {
        throw ubahGalatSaldo(galat, info.model);
      }
    };
    if (kritikus === undefined) return dasar;
    const terkunci = kritikus.bungkus(dasar);
    return (pesan, setelan, info) => (info.jenis === 'kritikus' ? terkunci(pesan, setelan, info) : dasar(pesan, setelan, info));
  };
}

/* ---------------------------------------------------------------------- */
/* mesin lingkar                                                           */
/* ---------------------------------------------------------------------- */

export interface OpsiMesinLingkar {
  nama: string;
  keterangan: string;
  palsu: boolean;
  buatPanggil: BuatPanggil;
  /** Pemanggil untuk uji ulang (bawaan = `buatPanggil`); mode palsu memberi teks kunci suntingan ke penebak palsu. */
  buatPanggilUjiUlang?: (awalanTag: string, paguBagianUsd: number, keadaan: readonly KeadaanOmongan[]) => PanggilPeran;
  siap: () => { siap: boolean; alasan: string | null };
  generasi?: GenerasiPengecoh;
  maksPutaran?: number;
}

export class MesinLingkar implements MesinPenulis {
  readonly nama: string;
  readonly keterangan: string;
  readonly palsu: boolean;
  private readonly o: OpsiMesinLingkar;
  constructor(o: OpsiMesinLingkar) {
    this.o = o;
    this.nama = o.nama;
    this.keterangan = o.keterangan;
    this.palsu = o.palsu;
  }

  get generasi(): GenerasiPengecoh {
    return this.o.generasi ?? GENERASI_M2D8;
  }

  siap(): { siap: boolean; alasan: string | null } {
    return this.o.siap();
  }

  perkiraan(): PerkiraanBiaya {
    return perkiraanGenerasi(this.generasi, this.o.maksPutaran ?? 15);
  }

  perkiraanUjiUlang(jumlah: number): number {
    return Math.round(jumlah * perkiraanGerbangOmongan(this.generasi) * 10_000) / 10_000;
  }

  async ujiUlang(k: KonteksUjiUlang): Promise<HasilUjiUlang> {
    const gen = this.generasi;
    let total = 0;
    const jejak = new PencatatJejakAliran(
      {
        paket: k.paket,
        model: gen.model.penulis,
        promptSistem: promptPenulisPengecoh(),
        pesanPaket: pesanPaket(k.paket),
        ringkasanPrompt: `Uji ulang ke-${String(k.ke)} sesudah suntingan penyetuju (pintu penyusun M2d-9): validator + periksaOmongan (gerbang lingkar yang sama, GENERASI_M2D8).`,
        jalur: `${k.folder}/uji-ulang-${String(k.ke)}.json`,
        jam: k.jam,
        versi: 2,
        dibuatOleh: 'factory/llm/agen-pengecoh.ts',
      },
      (l) => {
        total += l.biaya_usd;
        const r = ringkasLangkah(l, total);
        k.lapor('uji-ulang', r.judul.replace(/^putaran \d+/, `uji ulang ${String(k.ke)}`), r.isi);
      },
    );
    const awalan = `${AWALAN_TAG_PENYUSUN}${k.id}/uji-ulang-${String(k.ke)}/`;
    const panggil = this.o.buatPanggilUjiUlang?.(awalan, k.paguUsd, k.keadaan) ?? this.o.buatPanggil(awalan, k.paguUsd);
    const h = await ujiUlangDraf({ paket: k.paket, keadaan: k.keadaan, diuji: k.diuji, panggil, validasi: validasiM2d8, generasi: gen, jejak, jam: k.jam, putaran: 1 });
    jejak.selesai(h.lolos, 1, h.berhenti);
    return {
      lolos: h.lolos,
      berhenti: h.berhenti,
      masalah: h.masalah.map((m) => `${m.omongan === null ? 'seluruh draf' : `omongan ${String(m.omongan)}`}: [${m.kode}] ${m.pesan}`),
      per_omongan: h.per.map(({ no, hasil }) => ({
        no,
        lolos: hasil.jenis === 'lolos',
        status: hasil.jenis === 'lolos' ? 'lolos' : hasil.jenis === 'pagu' ? 'pagu' : hasil.status,
        alasan: hasil.jenis === 'tolak' ? hasil.mentah.map((u) => `${u.sumber} (${u.lokasi}): ${u.alasan}`) : hasil.jenis === 'pagu' ? [hasil.alasan] : [],
        dicatat: (hasil.jenis === 'lolos' ? (hasil.isi.dicatat ?? []) : (hasil.jenis === 'tolak' ? (hasil.isi.dicatat ?? []) : [])).map((d) => `${d.sumber}: ${d.alasan}`),
      })),
      biaya_usd: Math.round(total * 1e6) / 1e6,
    };
  }

  async jalankan(k: KonteksJalan): Promise<HasilMesin> {
    const gen = this.generasi;
    let total = 0;
    const modelPeran = { ...gen.model, penebak: gen.penebak.model.join(' + '), 'pilihan-saja': gen.modelPilihanSaja };
    const jejak = new PencatatJejakAliran(
      {
        paket: k.paket,
        model: gen.model.penulis,
        promptSistem: promptPenulisPengecoh(),
        pesanPaket: pesanPaket(k.paket),
        ringkasanPrompt:
          `Pintu penyusun M2d-9, mesin "${this.nama}": lingkar pengecoh (factory/llm/agen-pengecoh.ts) dengan setelan M2d-8 ` +
          '(factory/llm/kalibrasi-susun.ts GENERASI_M2D8, validator validasiM2d8). Di sini hanya hash.',
        jalur: `${k.folder}/jejak-agen.json`,
        jam: k.jam,
        versi: 2,
        dibuatOleh: 'factory/llm/agen-pengecoh.ts',
        modelPeran,
      },
      (l) => {
        total += l.biaya_usd;
        const r = ringkasLangkah(l, total);
        k.lapor('agen', r.judul, r.isi);
      },
    );
    const keadaan: KeadaanOmongan[] = [];
    const panggil = this.o.buatPanggil(`${AWALAN_TAG_PENYUSUN}${k.id}/`, k.paguJalanUsd);
    const hasil = await jalankanPengecoh({
      paket: k.paket,
      panggil,
      validasi: validasiM2d8,
      jejak,
      generasi: gen,
      jam: k.jam,
      saatKunci: (x) => keadaan.push(x),
      ...(this.o.maksPutaran === undefined ? {} : { maksPutaran: this.o.maksPutaran }),
    });
    const akhir = hasil.riwayat.at(-1);
    return {
      terbit: hasil.lolos,
      draf: hasil.draf,
      berhenti: hasil.berhenti,
      putaran: hasil.jumlah_putaran,
      keadaan: keadaan.sort((a, b) => a.no - b.no),
      draf_terakhir: akhir?.draf ?? [null, null, null],
      biaya_usd: Math.round(total * 1e6) / 1e6,
      jejak: jejak.jejak(),
      riwayat: hasil,
    };
  }
}

/** Mesin sungguhan: lingkar M2d-8 lewat OpenRouter. */
export function mesinSungguhan(akar: string, paguPenyusunUsd: number, siap: () => { siap: boolean; alasan: string | null }, log?: (b: string) => void): MesinLingkar {
  return new MesinLingkar({
    nama: 'lingkar-m2d8',
    keterangan: 'lingkar agen pengecoh, setelan terkini M2d-8 (penulis dipecah DeepSeek; pilihan-saja & pembaca kartu DeepSeek; kritikus & penebak ×3 GLM effort "high")',
    palsu: false,
    buatPanggil: panggilSungguhan(akar, paguPenyusunUsd, log),
    siap,
  });
}

export type { KeadaanOmongan };
