/**
 * `npm run kalibrasi:gerbang -- <--jalan | --matriks>` — kalibrasi tumpukan
 * gerbang M2d-8 terhadap soal manusia (kontrak D-2, pra-registrasi §1–§4).
 * Pagu kalibrasi US$0,70 (tag `m2d8/kalibrasi/`) DITEGAKKAN kode di dalam
 * pagu milestone US$2,30.
 *
 * - `--jalan` (berbayar): SEMUA gerbang atas SEMUA soal himpunan beku
 *   (`himpunanBeku`, urutan manusia → bocor → aman → tambahan), tanpa berhenti
 *   di penolakan pertama; data mentah per soal ke `mentah.json` sesudah tiap
 *   soal. Berhenti di pagu; yang tidak terukur tidak dilengkapi tangan.
 * - `--matriks` (tanpa jaringan): matriks per gerbang sebelum/sesudah +
 *   `putusanKalibrasi` (aturan §3) → `matriks.json`, `setelan.json`.
 *
 * Setelan hasil aturan dipakai PERSIS oleh lingkar TIRT M2d-8
 * (`SETELAN_KALIBRASI_M2D8`, dites sama dengan `putusanKalibrasi(mentah)`).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GENERASI_M2D7 } from './agen-pengecoh.ts';
import { PETUNJUK_PENEBAK_TAJAM } from './agen-peran.ts';
import type { KunciOpsi } from './draf.ts';
import { gKeseimbangan, gMeresmikan, gPilihanSaja, MAKS_ANGKA_RESMI } from './gerbang-artefak.ts';
import { gerbangKartu } from './gerbang-kartu.ts';
import { gerbangTebak, type InfoPanggil } from './gerbang-tebak.ts';
import { FOLDER_M2D8, PAGU_BAGIAN_M2D8, siapkanM2d8 } from './kalibrasi-konfig.ts';
import { gerbangKode, himpunanBeku, type SoalKalibrasiM2d8 } from './kalibrasi-soal.ts';
import {
  KODE_PELINDUNG,
  LANGKAH,
  SEMUA_GERBANG,
  SETELAN_AWAL,
  URUTAN_PELONGGARAN,
  aturanPenebak,
  bingungMenolak,
  jenisKritikus,
  kodeMenolak,
  kritikusMenolak,
  maksKataResmi,
  penebakMenolak,
  pilihanSajaMenolak,
  rasioKeseimbangan,
  yakinPilihanSaja,
  type ButirKode,
  type Gerbang,
  type SetelanGerbangM2d8,
} from './kalibrasi-setelan.ts';

export * from './kalibrasi-setelan.ts';
import type { PesanChat } from './klien.ts';
import { kritik, type CekMakna, type Keberatan } from './kritikus.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import { PaguTercapai, chatBerpagu } from './pagu.ts';
import { PENALAR_M2D8, badanUpaya } from './penalaran.ts';
import type { TebakMentah } from './pengecoh-kalibrasi.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import type { JawabanModel, SetelanPanggil } from './susun.ts';
import { teksPolos } from '../skema/rujukan.ts';

export const FOLDER_KALIBRASI_M2D8 = `${FOLDER_M2D8}/kalibrasi`;
export const JALUR_MENTAH = `${FOLDER_KALIBRASI_M2D8}/mentah.json`;
export const JALUR_MATRIKS_M2D8 = `${FOLDER_KALIBRASI_M2D8}/matriks.json`;
export const JALUR_SETELAN = `${FOLDER_KALIBRASI_M2D8}/setelan.json`;
export const KONKURENSI_M2D8 = 2;

/* ---------------------------------------------------------------------- */
/* setelan + langkah pelonggaran (pra-registrasi §3)                       */
/* ---------------------------------------------------------------------- */

/* ---------------------------------------------------------------------- */
/* data mentah + putusan per soal                                          */
/* ---------------------------------------------------------------------- */

export interface KartuMentah {
  pilihan: KunciOpsi | null;
  /** Kartu yang ditunjuk pembaca (fact_id); tidak ada di entri yang diukur sebelum medan ini ditambahkan. */
  ditunjuk?: string[];
  bingung_penulis: string[];
  menunjuk_penentu: boolean;
  alasan: string;
  token_penalaran: Array<number | null>;
  penyedia: Array<string | null>;
}

export interface KritikusMentah {
  menjawab: boolean;
  terpotong: boolean;
  keberatan: Keberatan[];
  arahan: string;
  cek_makna: CekMakna | null;
  finish_reason: Array<string | null>;
  token_penalaran: Array<number | null>;
  penyedia: Array<string | null>;
}

export interface MentahSoalM2d8 {
  id: string;
  kelompok: 'manusia' | 'bocor' | 'aman';
  tambahan: boolean;
  luar: string;
  kunci: KunciOpsi;
  soal: string;
  kode: ButirKode[];
  meresmikan: { angka: string[]; kata: string[] };
  keseimbangan: { rasio: number };
  pilihan_saja: TebakMentah[] | null;
  kartu: KartuMentah | null;
  kritikus: KritikusMentah | null;
  penebak: TebakMentah[] | null;
  biaya_usd: number;
  galat?: string;
}

export function lengkap(m: MentahSoalM2d8): boolean {
  return m.pilihan_saja !== null && m.kartu !== null && m.kritikus !== null && m.penebak !== null;
}

export type PutusanSoalM2d8 = Record<Gerbang, boolean> & { ditolak: boolean };

/** Putusan tiap gerbang (menolak?) untuk satu soal LENGKAP di bawah setelan; `ditolak` = tumpukan tanpa gerbang "dicatat". Murni. */
export function putusanSoalM2d8(m: MentahSoalM2d8, s: SetelanGerbangM2d8): PutusanSoalM2d8 {
  if (!lengkap(m)) throw new Error(`soal ${m.id} tidak lengkap`);
  const p: Record<Gerbang, boolean> = {
    kode: kodeMenolak(m.kode, s.kode_dicatat),
    meresmikan: m.meresmikan.angka.length >= MAKS_ANGKA_RESMI || m.meresmikan.kata.length >= maksKataResmi(s),
    keseimbangan: m.keseimbangan.rasio > rasioKeseimbangan(s),
    pilihan_saja: pilihanSajaMenolak(m.pilihan_saja as TebakMentah[], m.kunci, yakinPilihanSaja(s)),
    kartu: (m.kartu as KartuMentah).pilihan !== m.kunci || (bingungMenolak(s) && (m.kartu as KartuMentah).bingung_penulis.length > 0),
    kritikus: kritikusMenolak(m.kritikus as KritikusMentah, jenisKritikus(s)),
    penebak: penebakMenolak(m.penebak as TebakMentah[], m.kunci, aturanPenebak(s)),
  };
  const ditolak = SEMUA_GERBANG.some((g) => p[g] && (g === 'kode' || !s.dicatat.includes(g)));
  return { ...p, ditolak };
}

export interface BarisMatriksM2d8 {
  gerbang: Gerbang | 'tumpukan';
  manusia: [number, number];
  bocor: [number, number];
  aman: [number, number];
  tambahan: [number, number];
  dicatat: boolean;
}

/** Matriks per gerbang atas soal LENGKAP. [ditolak, terukur]. Murni. */
export function matriksM2d8(mentah: readonly MentahSoalM2d8[], s: SetelanGerbangM2d8): BarisMatriksM2d8[] {
  const ukur = mentah.filter(lengkap);
  const baris = (g: Gerbang | 'tumpukan'): BarisMatriksM2d8 => {
    const tolak = (m: MentahSoalM2d8): boolean => {
      const p = putusanSoalM2d8(m, s);
      return g === 'tumpukan' ? p.ditolak : p[g];
    };
    const hitung = (f: (m: MentahSoalM2d8) => boolean): [number, number] => {
      const x = ukur.filter(f);
      return [x.filter(tolak).length, x.length];
    };
    return {
      gerbang: g,
      manusia: hitung((m) => m.kelompok === 'manusia'),
      bocor: hitung((m) => m.kelompok === 'bocor' && !m.tambahan),
      aman: hitung((m) => m.kelompok === 'aman' && !m.tambahan),
      tambahan: hitung((m) => m.tambahan),
      dicatat: g !== 'tumpukan' && g !== 'kode' && s.dicatat.includes(g),
    };
  };
  return [...SEMUA_GERBANG.map(baris), baris('tumpukan')];
}

export interface PutusanKalibrasiM2d8 {
  setelan: SetelanGerbangM2d8;
  langkah: string[];
  syarat: { manusia_diterima: number; manusia_terukur: number; bocor_ditolak: number; bocor_terukur: number; manusia_terpenuhi: boolean; bocor_terpenuhi: boolean };
}

const salin = (s: SetelanGerbangM2d8): SetelanGerbangM2d8 => ({ tingkat: { ...s.tingkat }, dicatat: [...s.dicatat], kode_dicatat: [...s.kode_dicatat] });

/** Aturan penyesuaian pra-registrasi §3 (murni, dari data mentah). */
export function putusanKalibrasi(mentah: readonly MentahSoalM2d8[]): PutusanKalibrasiM2d8 {
  const manusia = mentah.filter((m) => m.kelompok === 'manusia' && lengkap(m));
  const bocor = mentah.filter((m) => m.kelompok === 'bocor' && !m.tambahan && lengkap(m));
  const diterima = (s: SetelanGerbangM2d8): number => manusia.filter((m) => !putusanSoalM2d8(m, s).ditolak).length;
  const cukup = (s: SetelanGerbangM2d8): boolean => diterima(s) * 6 >= 5 * manusia.length;
  const tolakManusia = (g: Gerbang, s: SetelanGerbangM2d8): number => manusia.filter((m) => putusanSoalM2d8(m, s)[g]).length;
  let s = salin(SETELAN_AWAL);
  const langkah: string[] = [`awal: tumpukan menerima ${String(diterima(s))}/${String(manusia.length)} soal manusia`];
  for (const g of URUTAN_PELONGGARAN) {
    if (cukup(s)) break;
    if (g === 'kode') {
      const hitung = new Map<string, number>();
      for (const m of manusia) for (const k of new Set(m.kode.map((b) => b.kode))) if (!KODE_PELINDUNG.includes(k)) hitung.set(k, (hitung.get(k) ?? 0) + 1);
      const calon = [...hitung.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
      for (const k of calon) {
        if (cukup(s)) break;
        s = { ...salin(s), kode_dicatat: [...s.kode_dicatat, k] };
        langkah.push(`kode ${k} (menolak ${String(hitung.get(k) ?? 0)} soal manusia) → dicatat; tumpukan menerima ${String(diterima(s))}/${String(manusia.length)}`);
      }
      continue;
    }
    if (tolakManusia(g, s) === 0) continue;
    const maks = LANGKAH[g].length - 1;
    while (s.tingkat[g] < maks && !cukup(s) && tolakManusia(g, s) > 0) {
      const t = salin(s);
      t.tingkat[g] += 1;
      s = t;
      langkah.push(`${g} → tingkat ${String(s.tingkat[g])}: ${g} menolak ${String(tolakManusia(g, s))} soal manusia; tumpukan menerima ${String(diterima(s))}/${String(manusia.length)}`);
    }
    if (!cukup(s) && tolakManusia(g, s) > 0) {
      s = { ...salin(s), dicatat: [...s.dicatat, g] };
      langkah.push(`${g} di batas masih menolak soal manusia → DITURUNKAN menjadi "dicatat"; tumpukan menerima ${String(diterima(s))}/${String(manusia.length)}`);
    }
  }
  const bocorDitolak = bocor.filter((m) => putusanSoalM2d8(m, s).ditolak).length;
  return {
    setelan: s,
    langkah,
    syarat: {
      manusia_diterima: diterima(s), manusia_terukur: manusia.length, bocor_ditolak: bocorDitolak, bocor_terukur: bocor.length,
      manusia_terpenuhi: cukup(s) && manusia.length > 0, bocor_terpenuhi: bocor.length > 0 && bocorDitolak * 4 >= 3 * bocor.length,
    },
  };
}

/* ---------------------------------------------------------------------- */
/* jalan (berbayar)                                                        */
/* ---------------------------------------------------------------------- */

type Panggil = (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoPanggil) => Promise<JawabanModel>;

function mentahTebak(t: { ke: number; pilihan: string | null; yakin: number | null; terbaca: boolean; alasan: string; panggilan: Array<{ token_penalaran?: number | null; penyedia?: string | null }> }): TebakMentah {
  return { ke: t.ke, pilihan: t.pilihan, yakin: t.yakin, terbaca: t.terbaca, alasan: t.alasan, token_penalaran: t.panggilan.map((p) => p.token_penalaran ?? null), penyedia: t.panggilan.map((p) => p.penyedia ?? null) };
}

/** Model per jenis panggilan kalibrasi: DeepSeek untuk pilihan-saja & pembaca kartu, GLM untuk kritikus & penebak. */
export function modelKalibrasi(jenis: InfoPanggil['jenis']): string {
  return jenis === 'gerbang-pilihan-saja' || jenis === 'gerbang-kartu' ? MODEL_OR_DEEPSEEK : MODEL_OR_GLM;
}

export function tagKalibrasi(id: string, info: InfoPanggil): string {
  return `${PAGU_BAGIAN_M2D8.kalibrasi.awalanTag}${id}/${info.jenis}/t${String(info.ke)}${info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : ''}`;
}

/**
 * Ukur satu soal dengan SEMUA gerbang. `panggil` = chatBerpagu di jalan
 * sungguhan, palsu di tes. `sebagian` (lanjutan): gerbang yang SUDAH terukur
 * tidak diukur ulang (tidak ada undian ulang); hanya yang masih `null`.
 */
export async function ukurSoalM2d8(s: SoalKalibrasiM2d8, panggil: Panggil, biaya: () => number, sebagian: MentahSoalM2d8 | null = null): Promise<MentahSoalM2d8> {
  const o = s.omongan;
  const awal = biaya();
  const biayaLama = sebagian?.biaya_usd ?? 0;
  const m: MentahSoalM2d8 = sebagian !== null ? { ...sebagian } : {
    id: s.id, kelompok: s.kelompok, tambahan: s.tambahan, luar: s.luar, kunci: o.kunci,
    soal: `${o.nama}: "${teksPolos(o.pesan)}" | ${(['a', 'b', 'c', 'd'] as const).map((h) => `${h}) ${teksPolos(o.pilihan[h])}`).join(' | ')}`,
    kode: gerbangKode(o, s.paket),
    meresmikan: (({ angka, kata }) => ({ angka, kata }))(gMeresmikan(o.pesan, o.pilihan, o.kunci)),
    keseimbangan: { rasio: gKeseimbangan(o.pilihan, o.kunci).rasio },
    pilihan_saja: null, kartu: null, kritikus: null, penebak: null, biaya_usd: 0,
  };
  delete m.galat;
  const g7 = GENERASI_M2D7;
  const opsi = { panggil, putaran: 1, omongan: s.no };
  try {
    if (m.pilihan_saja === null) {
      const ps = await gPilihanSaja({ pilihan: o.pilihan, kunci: o.kunci }, { ...opsi, maxTokens: g7.pilihanSaja.maxTokens, tambahanBadan: g7.pilihanSaja.tambahanBadan });
      m.pilihan_saja = ps.tebakan.map((t) => mentahTebak({ ...t }));
    }
    if (m.kartu === null) {
      const k = await gerbangKartu(o, s.paket, { ...opsi, tandaiBingung: true, ...g7.kartu });
      m.kartu = {
        pilihan: k.pilihan, ditunjuk: k.kartu_ditunjuk, bingung_penulis: (k.membingungkan ?? []).filter((x) => x.sumber === 'penulis').map((x) => x.kutipan), menunjuk_penentu: k.menunjuk_penentu,
        alasan: k.alasan_penjawab, token_penalaran: k.panggilan.map((x) => x.token_penalaran ?? null), penyedia: k.panggilan.map((x) => x.penyedia ?? null),
      };
    }
    const km = m.kartu;
    // Kartu yang ditunjuk: dari medan `ditunjuk`; entri lama tanpa medan itu → kartu penentu bila pembaca menunjuknya, selain itu kosong.
    const ditunjuk = km.ditunjuk ?? (km.menunjuk_penentu ? o.kartu_penentu : []);
    if (m.kritikus !== null) {
      // sudah terukur
    } else {
    const kr = await kritik(
      o, s.paket,
      { no: s.no, kartu: { pilihan: km.pilihan, kartu_ditunjuk_no: ditunjuk.map((id) => o.kartu.indexOf(id) + 1).filter((x) => x > 0), alasan: km.alasan }, tebakan: [], penebakSesudah: true },
      { ...opsi, cekMakna: true, maxTokens: PENALAR_M2D8.kritikus.maxTokens, tambahanBadan: badanUpaya(PENALAR_M2D8.kritikus), ambangPenalaran: PENALAR_M2D8.kritikus.ambang },
    );
    m.kritikus = {
      menjawab: kr.menjawab, terpotong: kr.terpotong, keberatan: kr.keberatan, arahan: kr.arahan, cek_makna: kr.cek_makna ?? null,
      finish_reason: kr.panggilan.map((x) => x.finish_reason), token_penalaran: kr.panggilan.map((x) => x.token_penalaran ?? null), penyedia: kr.panggilan.map((x) => x.penyedia ?? null),
    };
    }
    if (m.penebak !== null) return { ...m, biaya_usd: biayaLama + biaya() - awal };
    const p = PENALAR_M2D8.penebakGlm;
    const t = await gerbangTebak(o, {
      ...opsi, petunjuk: PETUNJUK_PENEBAK_TAJAM, maxTokensKe: [p.maxTokens, p.maxTokens, p.maxTokens],
      tambahanBadanKe: [badanUpaya(p), badanUpaya(p), badanUpaya(p)], ambangPenalaranKe: [p.ambang, p.ambang, p.ambang],
    });
    m.penebak = t.tebakan.map((x) => mentahTebak({ ...x, pilihan: x.terbaca ? x.pilihan : null, yakin: x.terbaca ? x.yakin : null }));
  } catch (galat) {
    m.galat = galat instanceof Error ? `${galat.name}: ${galat.message}`.slice(0, 300) : 'galat';
    if (galat instanceof PaguTercapai) {
      m.biaya_usd = biayaLama + biaya() - awal;
      throw Object.assign(galat, { mentah: m });
    }
  }
  m.biaya_usd = biayaLama + biaya() - awal;
  return m;
}

export function bacaMentah(jalur: string = JALUR_MENTAH): { selesai: boolean; hasil: MentahSoalM2d8[] } {
  return JSON.parse(readFileSync(jalur, 'utf8')) as { selesai: boolean; hasil: MentahSoalM2d8[] };
}

async function jalankan(): Promise<number> {
  if (existsSync(JALUR_MENTAH)) {
    console.error(`${JALUR_MENTAH} sudah ada; kalibrasi yang sudah dibayar tidak diulang.`);
    return 1;
  }
  const siap = siapkanM2d8();
  mkdirSync(FOLDER_KALIBRASI_M2D8, { recursive: true });
  const daftar = himpunanBeku();
  const per: Array<MentahSoalM2d8 | null> = daftar.map(() => null);
  const simpan = (selesai: boolean): void =>
    writeFileSync(JALUR_MENTAH, JSON.stringify({ selesai, pagu_kalibrasi_usd: PAGU_BAGIAN_M2D8.kalibrasi.usd, biaya_kalibrasi_usd: siap.biaya.totalAwalan(PAGU_BAGIAN_M2D8.kalibrasi.awalanTag), hasil: per.filter((x) => x !== null) }, null, 2) + '\n', 'utf8');
  let berhenti: number | null = null;
  let berikut = 0;
  const pekerja = async (): Promise<void> => {
    while (berhenti === null) {
      const i = berikut++;
      const s = daftar[i];
      if (s === undefined) return;
      const panggil: Panggil = async (pesan, setelan, info) => {
        const model = modelKalibrasi(info.jenis);
        const tag = tagKalibrasi(s.id, info);
        let j;
        try {
          j = await chatBerpagu(
            siap.klien, siap.biaya,
            { model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan, ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }) },
            tag,
            setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
          );
        } catch (galat) {
          throw ubahGalatSaldo(galat, model);
        }
        console.log(`  ${new Date().toISOString().slice(11, 19)} ${tag}: ${String(j.penyedia)} ${String(j.finish_reason)} penalaran ${String(j.token_penalaran)} US$${j.biaya_usd.toFixed(6)}; kalibrasi US$${siap.biaya.totalAwalan(PAGU_BAGIAN_M2D8.kalibrasi.awalanTag).toFixed(4)}`);
        return j;
      };
      const biayaSoal = (): number => siap.biaya.totalAwalan(`${PAGU_BAGIAN_M2D8.kalibrasi.awalanTag}${s.id}/`);
      try {
        const m = await ukurSoalM2d8(s, panggil, biayaSoal);
        per[i] = m;
        console.log(`${m.id} [${m.kelompok}${m.tambahan ? '+' : ''}] ${lengkap(m) ? 'lengkap' : `TIDAK lengkap (${String(m.galat)})`}; US$${m.biaya_usd.toFixed(4)}`);
      } catch (galat) {
        const m = (galat as { mentah?: MentahSoalM2d8 }).mentah;
        if (m !== undefined) per[i] = m;
        console.error(`${s.id}: ${galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat'}`);
        berhenti ??= galat instanceof PaguTercapai ? (galat.name === 'SaldoPenyediaHabis' ? 4 : 2) : 1;
      }
      simpan(false);
    }
  };
  await Promise.all(Array.from({ length: KONKURENSI_M2D8 }, () => pekerja()));
  simpan(berhenti === null);
  console.log(`Kalibrasi US$${siap.biaya.totalAwalan(PAGU_BAGIAN_M2D8.kalibrasi.awalanTag).toFixed(6)} dari US$${PAGU_BAGIAN_M2D8.kalibrasi.usd.toFixed(2)}; milestone US$${siap.biaya.totalMilestone().toFixed(6)}.`);
  return berhenti ?? 0;
}

/**
 * `--lanjut`: jalan pertama berhenti karena perkiraan maksimum panggilan yang
 * SEDANG berjalan (konkurensi 2) ikut dihitung pagu, sebelum biaya nyata
 * mencapai pagu. Lanjutan memakai prosedur dan urutan yang SAMA, satu soal
 * sekaligus, di pagu kalibrasi yang sama: soal yang belum lengkap diteruskan
 * dari gerbang yang belum terukur (tanpa undian ulang), lalu soal berikutnya,
 * sampai pagu.
 */
async function lanjutkan(): Promise<number> {
  const lama = bacaMentah();
  const siap = siapkanM2d8();
  const daftar = himpunanBeku();
  const per = new Map(lama.hasil.map((m) => [m.id, m]));
  const lanjutan: string[] = [];
  const simpan = (selesai: boolean): void =>
    writeFileSync(
      JALUR_MENTAH,
      JSON.stringify({
        selesai, pagu_kalibrasi_usd: PAGU_BAGIAN_M2D8.kalibrasi.usd, biaya_kalibrasi_usd: siap.biaya.totalAwalan(PAGU_BAGIAN_M2D8.kalibrasi.awalanTag),
        lanjutan: { alasan: 'jalan pertama berhenti karena perkiraan maksimum panggilan yang sedang berjalan (konkurensi 2); dilanjutkan satu soal sekaligus', soal: lanjutan },
        hasil: daftar.map((s) => per.get(s.id)).filter((x): x is MentahSoalM2d8 => x !== undefined),
      }, null, 2) + '\n',
      'utf8',
    );
  for (const s of daftar) {
    const ada = per.get(s.id) ?? null;
    if (ada !== null && lengkap(ada)) continue;
    const panggil: Panggil = async (pesan, setelan, info) => {
      const model = modelKalibrasi(info.jenis);
      const tag = tagKalibrasi(s.id, info);
      let j;
      try {
        j = await chatBerpagu(
          siap.klien, siap.biaya,
          { model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan, ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }) },
          tag,
          setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
        );
      } catch (galat) {
        throw ubahGalatSaldo(galat, model);
      }
      console.log(`  ${new Date().toISOString().slice(11, 19)} ${tag}: ${String(j.penyedia)} ${String(j.finish_reason)} penalaran ${String(j.token_penalaran)} US$${j.biaya_usd.toFixed(6)}; kalibrasi US$${siap.biaya.totalAwalan(PAGU_BAGIAN_M2D8.kalibrasi.awalanTag).toFixed(4)}`);
      return j;
    };
    const biayaSoal = (): number => siap.biaya.totalAwalan(`${PAGU_BAGIAN_M2D8.kalibrasi.awalanTag}${s.id}/`) - (ada?.biaya_usd ?? 0);
    lanjutan.push(s.id);
    try {
      const m = await ukurSoalM2d8(s, panggil, biayaSoal, ada);
      per.set(s.id, m);
      console.log(`${m.id} [${m.kelompok}${m.tambahan ? '+' : ''}] ${lengkap(m) ? 'lengkap' : `TIDAK lengkap (${String(m.galat)})`}; US$${m.biaya_usd.toFixed(4)}`);
      simpan(false);
    } catch (galat) {
      const m = (galat as { mentah?: MentahSoalM2d8 }).mentah;
      if (m !== undefined) per.set(s.id, m);
      console.error(`${s.id}: ${galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat'}`);
      simpan(false);
      console.log(`Kalibrasi US$${siap.biaya.totalAwalan(PAGU_BAGIAN_M2D8.kalibrasi.awalanTag).toFixed(6)}; milestone US$${siap.biaya.totalMilestone().toFixed(6)}.`);
      return galat instanceof PaguTercapai ? 2 : 1;
    }
  }
  simpan(true);
  return 0;
}

export function isiMatriks(mentah: readonly MentahSoalM2d8[]): { awal: BarisMatriksM2d8[]; putusan: PutusanKalibrasiM2d8; akhir: BarisMatriksM2d8[]; per_soal: unknown[] } {
  const putusan = putusanKalibrasi(mentah);
  return {
    awal: matriksM2d8(mentah, SETELAN_AWAL),
    putusan,
    akhir: matriksM2d8(mentah, putusan.setelan),
    per_soal: mentah.map((m) => ({
      id: m.id, kelompok: m.kelompok, tambahan: m.tambahan, lengkap: lengkap(m),
      ...(lengkap(m) ? { awal: putusanSoalM2d8(m, SETELAN_AWAL), akhir: putusanSoalM2d8(m, putusan.setelan) } : { galat: m.galat ?? null }),
    })),
  };
}

function tulisMatriks(): number {
  const { hasil } = bacaMentah();
  const isi = isiMatriks(hasil);
  writeFileSync(JALUR_MATRIKS_M2D8, JSON.stringify(isi, null, 2) + '\n', 'utf8');
  writeFileSync(JALUR_SETELAN, JSON.stringify(isi.putusan.setelan, null, 2) + '\n', 'utf8');
  const f = (x: [number, number]): string => `${String(x[0])}/${String(x[1])}`;
  for (const [nama, m] of [['awal', isi.awal], ['akhir', isi.akhir]] as const) {
    console.log(`— ${nama}`);
    for (const b of m) console.log(`  ${b.gerbang}${b.dicatat ? ' (dicatat)' : ''}: manusia ${f(b.manusia)}, bocor ${f(b.bocor)}, aman ${f(b.aman)}, tambahan ${f(b.tambahan)}`);
  }
  for (const l of isi.putusan.langkah) console.log(`  ${l}`);
  console.log(JSON.stringify(isi.putusan.syarat));
  console.log(JSON.stringify(isi.putusan.setelan));
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/kalibrasi-gerbang.ts') === true) {
  const a = process.argv.slice(2);
  const kerja = a.includes('--matriks') ? Promise.resolve(tulisMatriks()) : a.includes('--lanjut') ? lanjutkan() : a.includes('--jalan') ? jalankan() : Promise.resolve((console.error('Pakai: npm run kalibrasi:gerbang -- --jalan | --matriks'), 1));
  kerja.then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
