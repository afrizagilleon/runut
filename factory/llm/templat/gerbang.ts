/**
 * Gerbang berbayar mesin templat (pra-registrasi M2d-10 §2–§3):
 *
 * - **penebak keluarga campur** (tanpa kartu): Haiku 4.5 → DeepSeek → GLM
 *   "high", petunjuk `PETUNJUK_PENEBAK_TAJAM`, suhu 1,0. Tolak bila ≥ 2/3
 *   memilih kunci ATAU Haiku memilih kunci dengan yakin ≥ A. Panggilan
 *   berikutnya tidak dikirim bila putusan sudah pasti (`putusanPenebakCampur`)
 *   — putusannya sama dengan memanggil ketiganya;
 * - **pembaca kartu** (DeepSeek, setelan M2d-5/M2d-7): jawaban salah menolak;
 *   kalimat membingungkan hanya dicatat;
 * - **kritikus makna** (GLM "high", setelan M2d-8): keberatan berjenis tingkat
 *   setelan menolak.
 *
 * Tebakan tak terbaca (dua panggilan) = memilih kunci dengan yakin 100.
 */
import { PETUNJUK_PENEBAK_TAJAM } from '../agen-peran.ts';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { gerbangKartu, type PutusanKartu } from '../gerbang-kartu.ts';
import { panggilTerbaca, pesanPenebak, soalTebak, SUHU_TEBAK, uraiTebakan, type InfoPanggil, type PanggilanGerbang, type PanggilLlm } from '../gerbang-tebak.ts';
import { GENERASI_M2D7, PILIHAN_SAJA_M2D7, PENULIS_M2D7 } from '../agen-pengecoh.ts';
import { JENIS_KEBERATAN, kritik, type JenisKeberatan, type PutusanKritik } from '../kritikus.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM, MODEL_OR_HAIKU, type ModelOpenRouter } from '../model.ts';
import type { PaketFakta } from '../paket.ts';
import { PENALAR_M2D8, badanPenalaran, badanUpaya, setelanPenalaran, setelanTanpaPenalaran } from '../penalaran.ts';
import { SUHU, type SetelanPanggil } from '../susun.ts';
import type { InfoTemplat, JenisTemplat, PanggilTemplat, PeranTemplat } from './penulis.ts';

/* ---------------------------------------------------------------------- */
/* setelan                                                                 */
/* ---------------------------------------------------------------------- */

export type AturanPenebakCampur = 'dua-dari-tiga' | 'tiga-dari-tiga' | 'dicatat';

export interface SetelanTumpukan {
  penebak: { aturan: AturanPenebakCampur; /** A: Haiku memilih kunci dengan yakin ≥ A menolak; `null` = tidak dipakai. */ ambangHaiku: number | null };
  kartu: 'menolak' | 'dicatat';
  kritikus: { jenis: readonly JenisKeberatan[]; dicatat: boolean };
}

/** Tingkat 1 kritikus M2d-8 (`LANGKAH.kritikus[1]`). */
export const KRITIKUS_TINGKAT_1: readonly JenisKeberatan[] = ['kunci', 'makna', 'aturan'];
export const KRITIKUS_TINGKAT_2: readonly JenisKeberatan[] = ['kunci', 'makna'];

export interface PenebakCampur {
  model: ModelOpenRouter;
  setelan: SetelanPanggil;
}

/** Urutan penebak (pra-registrasi §2): Haiku → DeepSeek → GLM. */
export const PENEBAK_CAMPUR: readonly PenebakCampur[] = [
  { model: MODEL_OR_HAIKU, setelan: { suhu: SUHU_TEBAK, maxTokens: 600 } },
  { model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU_TEBAK, maxTokens: PILIHAN_SAJA_M2D7.maxTokens, tambahanBadan: badanPenalaran(PILIHAN_SAJA_M2D7) } },
  {
    model: MODEL_OR_GLM,
    setelan: { suhu: SUHU_TEBAK, maxTokens: PENALAR_M2D8.penebakGlm.maxTokens, tambahanBadan: badanUpaya(PENALAR_M2D8.penebakGlm), ambangPenalaran: PENALAR_M2D8.penebakGlm.ambang },
  },
];

export const SETELAN_PENULIS = {
  pesan: { berpikir: setelanPenalaran(SUHU, PENULIS_M2D7.pesan), cadangan: setelanTanpaPenalaran(SUHU, 4_000) },
  penjelasan: { berpikir: setelanPenalaran(SUHU, PENULIS_M2D7.penjelasan), cadangan: setelanTanpaPenalaran(SUHU, 4_000) },
} as const;

export const SETELAN_KRITIKUS = { maxTokens: PENALAR_M2D8.kritikus.maxTokens, tambahanBadan: badanUpaya(PENALAR_M2D8.kritikus), ambangPenalaran: PENALAR_M2D8.kritikus.ambang };
export const SETELAN_KARTU = GENERASI_M2D7.kartu;

/* ---------------------------------------------------------------------- */
/* penghubung: pemanggil gerbang lama → pemanggil templat                  */
/* ---------------------------------------------------------------------- */

function peranDari(jenis: InfoPanggil['jenis']): { jenis: JenisTemplat; peran: PeranTemplat } {
  if (jenis === 'gerbang-kartu') return { jenis, peran: 'pembaca-kartu' };
  if (jenis === 'kritikus') return { jenis, peran: 'kritikus' };
  if (jenis === 'gerbang-tebak') return { jenis, peran: 'penebak' };
  throw new Error(`Jenis panggilan "${jenis}" tidak dipakai mesin templat.`);
}

/** `PanggilLlm` untuk gerbang lama, dengan model tetap per jenis (penebak: per `ke`). */
export function lewatTemplat(panggil: PanggilTemplat, modelTebak?: ModelOpenRouter): PanggilLlm {
  return (pesan, setelan, info) => {
    const { jenis, peran } = peranDari(info.jenis);
    const model: ModelOpenRouter = jenis === 'kritikus' ? MODEL_OR_GLM : jenis === 'gerbang-kartu' ? MODEL_OR_DEEPSEEK : (modelTebak ?? (PENEBAK_CAMPUR[info.ke - 1]?.model as ModelOpenRouter));
    const i: InfoTemplat = { jenis, putaran: info.putaran, omongan: info.omongan, ke: info.ke, ...(info.ulang === undefined ? {} : { ulang: info.ulang }), peran, model };
    return panggil(pesan, setelan, i);
  };
}

/* ---------------------------------------------------------------------- */
/* penebak keluarga campur                                                 */
/* ---------------------------------------------------------------------- */

export interface TebakanCampur {
  ke: number;
  model: ModelOpenRouter;
  pilihan: KunciOpsi;
  yakin: number;
  alasan: string;
  benar: boolean;
  terbaca: boolean;
  panggilan: PanggilanGerbang[];
  penalaran_tidak_sah: string[];
}

export type PutusanCampur = 'tolak' | 'lolos' | 'belum';

/** Putusan dari tebakan yang sudah ada (urut ke-1..). Murni. */
export function putusanPenebakCampur(tebakan: ReadonlyArray<Pick<TebakanCampur, 'benar' | 'yakin'>>, s: SetelanTumpukan['penebak']): PutusanCampur {
  if (s.aturan === 'dicatat') return tebakan.length >= PENEBAK_CAMPUR.length ? 'lolos' : 'belum';
  const haiku = tebakan[0];
  if (haiku !== undefined && s.ambangHaiku !== null && haiku.benar && haiku.yakin >= s.ambangHaiku) return 'tolak';
  const perlu = s.aturan === 'dua-dari-tiga' ? 2 : 3;
  const benar = tebakan.filter((t) => t.benar).length;
  if (benar >= perlu) return 'tolak';
  if (benar + (PENEBAK_CAMPUR.length - tebakan.length) < perlu) return 'lolos';
  return 'belum';
}

export interface HasilPenebakCampur {
  tolak: boolean;
  tebakan: TebakanCampur[];
  /** Penebak yang tidak dipanggil karena putusan sudah pasti. */
  tidak_dipanggil: number[];
  alasan: string;
}

export interface OpsiPenebakCampur {
  panggil: PanggilTemplat;
  putaran: number;
  omongan: number;
  setelan: SetelanTumpukan['penebak'];
  /** false (kalibrasi): ketiganya selalu dipanggil. */
  hentiDini: boolean;
}

export async function penebakCampur(o: OmonganDraf, opsi: OpsiPenebakCampur): Promise<HasilPenebakCampur> {
  const soal = soalTebak(o);
  const tebakan: TebakanCampur[] = [];
  const tidak: number[] = [];
  for (const [i, p] of PENEBAK_CAMPUR.entries()) {
    const ke = i + 1;
    if (opsi.hentiDini && putusanPenebakCampur(tebakan, opsi.setelan) !== 'belum') {
      tidak.push(ke);
      continue;
    }
    const { hasil, panggilan, penalaran_tidak_sah } = await panggilTerbaca(
      () => pesanPenebak(soal, PETUNJUK_PENEBAK_TAJAM),
      p.setelan,
      { jenis: 'gerbang-tebak', putaran: opsi.putaran, omongan: opsi.omongan, ke },
      { panggil: lewatTemplat(opsi.panggil, p.model), putaran: opsi.putaran, omongan: opsi.omongan },
      uraiTebakan,
    );
    if (hasil === null) {
      const tidakBerpikir = p.setelan.ambangPenalaran !== undefined && penalaran_tidak_sah.length === panggilan.length;
      tebakan.push({ ke, model: p.model, pilihan: o.kunci, yakin: 100, alasan: tidakBerpikir ? '(tidak terbukti berpikir)' : '(tak terbaca)', benar: true, terbaca: false, panggilan, penalaran_tidak_sah });
    } else {
      tebakan.push({ ke, model: p.model, ...hasil, benar: hasil.pilihan === o.kunci, terbaca: true, panggilan, penalaran_tidak_sah });
    }
  }
  const putusan = putusanPenebakCampur(tebakan, opsi.setelan);
  const tolak = putusan === 'tolak';
  const ringkas = tebakan.map((t) => `${t.model.split('/')[1] ?? t.model} ${t.pilihan}/${String(t.yakin)}`).join(', ');
  const alasan = tolak
    ? `penebak tanpa kartu memilih kunci "${o.kunci}" (${ringkas}); aturan: ${opsi.setelan.aturan === 'tiga-dari-tiga' ? '3/3' : '≥ 2/3'}${opsi.setelan.ambangHaiku === null ? '' : ` atau Haiku yakin ≥ ${String(opsi.setelan.ambangHaiku)}`}. Alasan: ${tebakan.filter((t) => t.benar).map((t) => `"${t.alasan}"`).join(' ')}`
    : `${String(tebakan.filter((t) => t.benar).length)}/${String(tebakan.length)} penebak memilih kunci (${ringkas})${tidak.length > 0 ? `; penebak ${tidak.join(', ')} tidak dipanggil (putusan sudah pasti)` : ''}`;
  return { tolak, tebakan, tidak_dipanggil: tidak, alasan };
}

/* ---------------------------------------------------------------------- */
/* pembaca kartu & kritikus                                                */
/* ---------------------------------------------------------------------- */

export async function pembacaKartu(o: OmonganDraf, paket: PaketFakta, panggil: PanggilTemplat, putaran: number, omongan: number): Promise<PutusanKartu> {
  return gerbangKartu(o, paket, { panggil: lewatTemplat(panggil), putaran, omongan, tandaiBingung: true, ...SETELAN_KARTU });
}

/** Kritikus dengan konteks jawaban pembaca kartu (bentuk sama dengan M2d-8: penebak "sesudah", tanpa tebakan). */
export async function kritikusMakna(o: OmonganDraf, paket: PaketFakta, kartu: PutusanKartu | null, panggil: PanggilTemplat, putaran: number, no: number, urutanV3 = false): Promise<PutusanKritik> {
  return kritik(
    o,
    paket,
    {
      no,
      kartu: kartu === null ? null : { pilihan: kartu.pilihan, kartu_ditunjuk_no: kartu.kartu_ditunjuk.map((id) => o.kartu.indexOf(id) + 1).filter((x) => x > 0), alasan: kartu.alasan_penjawab },
      tebakan: [],
      penebakSesudah: true,
      ...(urutanV3 ? { urutanV3: true } : {}),
    },
    { panggil: lewatTemplat(panggil), putaran, omongan: no, cekMakna: true, ...SETELAN_KRITIKUS },
  );
}

/** Keberatan kritikus yang menolak menurut setelan (tidak menjawab selalu menolak kecuali "dicatat"). Murni. */
export function kritikusMenolakTemplat(k: Pick<PutusanKritik, 'menjawab' | 'keberatan'>, s: SetelanTumpukan['kritikus']): boolean {
  if (s.dicatat) return false;
  return !k.menjawab || k.keberatan.some((x) => s.jenis.includes(x.jenis));
}

export { JENIS_KEBERATAN };
