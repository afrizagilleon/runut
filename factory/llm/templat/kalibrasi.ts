/**
 * `npm run templat:kalibrasi -- --jalan | --matriks` — kalibrasi singkat
 * tumpukan gerbang mesin templat (kontrak M2d-10 D-5, pra-registrasi §4).
 * Pagu US$0,35 (tag `m2d10/kalibrasi/`) ditegakkan kode.
 *
 * - `--jalan` (berbayar): 6 soal tayang (kode, penebak campur ×3 TANPA henti
 *   dini, pembaca kartu) → kritikus ULTJ s3 (satu-satunya yang belum diukur
 *   kritikus M2d-8) → 6 soal bocor (kode, penebak ×3, pembaca kartu). Kritikus
 *   lima soal tayang lain = hasil M2d-8 (teks soal dicek sama). Data mentah
 *   ke `mentah.json` sesudah tiap soal; berhenti di pagu.
 * - `--matriks` (tanpa jaringan): aturan pra-registrasi §4 → `setelan.json`,
 *   `matriks.json`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { AKAR } from '../env.ts';
import type { PutusanKartu } from '../gerbang-kartu.ts';
import { SETELAN_KALIBRASI_M2D8 } from '../kalibrasi-susun.ts';
import { kodeMenolak, type ButirKode } from '../kalibrasi-setelan.ts';
import { gerbangKode, ringkasSoal, soalHimpunanM2d8, soalManusiaM2d8 } from '../kalibrasi-soal.ts';
import type { Keberatan } from '../kritikus.ts';
import { MODEL_OPENROUTER } from '../model.ts';
import { chatBerpagu, PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { ubahGalatSaldo } from '../peran-susun.ts';
import {
  KRITIKUS_TINGKAT_1,
  KRITIKUS_TINGKAT_2,
  kritikusMakna,
  kritikusMenolakTemplat,
  pembacaKartu,
  penebakCampur,
  putusanPenebakCampur,
  type SetelanTumpukan,
} from './gerbang.ts';
import { FOLDER_M2D10, PAGU_BAGIAN_M2D10, siapkanM2d10 } from './konfig.ts';
import type { PanggilTemplat } from './penulis.ts';

export const FOLDER_KALIBRASI_M2D10 = `${FOLDER_M2D10}/kalibrasi`;
export const JALUR_MENTAH_M2D10 = `${FOLDER_KALIBRASI_M2D10}/mentah.json`;

/* ---------------------------------------------------------------------- */
/* himpunan beku                                                           */
/* ---------------------------------------------------------------------- */

export interface SoalKalibrasiTemplat {
  id: string;
  kelompok: 'tayang' | 'bocor';
  luar: string;
  omongan: OmonganDraf;
  paket: PaketFakta;
  no: number;
}

export const ID_BOCOR = ['m2d5-tirt-o2', 'm2d5-tirt-o3', 'm2d4-tirt-o3', 'm2d4-tirt-o1', 'm2d6-tirt-o1'] as const;
export const ID_BOCOR_M2D8 = 'm2d8-tirt-o1';

export function himpunanTemplat(): SoalKalibrasiTemplat[] {
  const tayang = soalManusiaM2d8().map((s) => ({ id: s.id, kelompok: 'tayang' as const, luar: 'soal tayang (Claude + pemilik)', omongan: s.omongan, paket: s.paket, no: s.no }));
  const h = soalHimpunanM2d8();
  const bocor = ID_BOCOR.map((id) => {
    const s = h.find((x) => x.id === id);
    if (s === undefined || s.kelompok !== 'bocor') throw new Error(`soal bocor ${id} tidak ada di himpunan M2d-8`);
    return { id, kelompok: 'bocor' as const, luar: s.luar, omongan: s.omongan, paket: s.paket, no: s.no };
  });
  const d8 = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d8/penguji/draf-terbaik.json`, 'utf8')) as Array<{ no: number; status: string; omongan: OmonganDraf }>;
  const o1 = d8.find((x) => x.no === 1 && x.status === 'lolos');
  if (o1 === undefined) throw new Error('omongan 1 M2d-8 yang dikunci tidak ada');
  const paket8 = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d8/jalan/tirt/paket.json`, 'utf8')) as PaketFakta;
  return [...tayang, ...bocor, { id: ID_BOCOR_M2D8, kelompok: 'bocor', luar: 'c/50 · c/55 · c/55 (3/3 memilih kunci); 3/3 penguji kartu: pilihan a juga benar', omongan: o1.omongan, paket: paket8, no: 1 }];
}

/* ---------------------------------------------------------------------- */
/* data mentah + putusan                                                   */
/* ---------------------------------------------------------------------- */

export interface TebakMentahTemplat {
  ke: number;
  model: string;
  pilihan: string | null;
  yakin: number | null;
  terbaca: boolean;
  alasan: string;
  token_penalaran: Array<number | null>;
  penyedia: Array<string | null>;
}

export interface KritikusMentahTemplat {
  sumber: 'm2d8' | 'm2d10';
  menjawab: boolean;
  keberatan: Keberatan[];
  token_penalaran: Array<number | null>;
}

export interface MentahTemplat {
  id: string;
  kelompok: 'tayang' | 'bocor';
  luar: string;
  kunci: KunciOpsi;
  soal: string;
  kode: ButirKode[];
  penebak: TebakMentahTemplat[] | null;
  kartu: { pilihan: string | null; ditunjuk: string[]; menunjuk_penentu: boolean; bingung: string[]; alasan: string } | null;
  kritikus: KritikusMentahTemplat | null;
  biaya_usd: number;
  galat?: string;
}

export function lengkapTemplat(m: MentahTemplat): boolean {
  return m.penebak !== null && m.penebak.length === 3 && m.kartu !== null && (m.kelompok === 'bocor' || m.kritikus !== null);
}

/** Keadaan penebak berurutan (pra-registrasi §4, S1…S7). */
export const KEADAAN_PENEBAK: ReadonlyArray<{ nama: string; penebak: SetelanTumpukan['penebak'] }> = [
  { nama: 'S1', penebak: { aturan: 'dua-dari-tiga', ambangHaiku: 60 } },
  { nama: 'S2', penebak: { aturan: 'dua-dari-tiga', ambangHaiku: 70 } },
  { nama: 'S3', penebak: { aturan: 'dua-dari-tiga', ambangHaiku: 80 } },
  { nama: 'S4', penebak: { aturan: 'dua-dari-tiga', ambangHaiku: 90 } },
  { nama: 'S5', penebak: { aturan: 'dua-dari-tiga', ambangHaiku: null } },
  { nama: 'S6', penebak: { aturan: 'tiga-dari-tiga', ambangHaiku: null } },
  { nama: 'S7', penebak: { aturan: 'dicatat', ambangHaiku: null } },
];

export const SETELAN_S1: SetelanTumpukan = { penebak: { aturan: 'dua-dari-tiga', ambangHaiku: 60 }, kartu: 'menolak', kritikus: { jenis: KRITIKUS_TINGKAT_1, dicatat: false } };

export interface PutusanSoalTemplat {
  kode: boolean;
  penebak: boolean;
  kartu: boolean;
  kritikus: boolean;
  ditolak: boolean;
  /** Ditolak sebelum kritikus (untuk tangkapan soal bocor). */
  sebelum_kritikus: boolean;
}

/** Putusan tiap gerbang untuk satu soal lengkap di bawah setelan. Murni. */
export function putusanSoalTemplat(m: MentahTemplat, s: SetelanTumpukan): PutusanSoalTemplat {
  if (!lengkapTemplat(m)) throw new Error(`soal ${m.id} tidak lengkap`);
  const kode = kodeMenolak(m.kode, SETELAN_KALIBRASI_M2D8.kode_dicatat);
  const tebakan = (m.penebak ?? []).map((t) => (t.terbaca ? { benar: t.pilihan === m.kunci, yakin: t.yakin ?? 0 } : { benar: true, yakin: 100 }));
  const penebak = putusanPenebakCampur(tebakan, s.penebak) === 'tolak';
  const kartu = s.kartu === 'menolak' && m.kartu?.pilihan !== m.kunci;
  const kritikus = m.kritikus !== null && kritikusMenolakTemplat(m.kritikus, s.kritikus);
  return { kode, penebak, kartu, kritikus, ditolak: kode || penebak || kartu || kritikus, sebelum_kritikus: kode || penebak || kartu };
}

export interface PutusanKalibrasiTemplat {
  setelan: SetelanTumpukan;
  keadaan: string;
  langkah: string[];
  syarat: { tayang_diterima: number; tayang_terukur: number; terpenuhi: boolean; bocor_tertangkap_sebelum_kritikus: number; bocor_terukur: number };
}

const cukup = (diterima: number, terukur: number): boolean => terukur > 0 && diterima * 6 >= 5 * terukur;

/** Aturan pra-registrasi §4 (murni, dari data mentah). */
export function putusanKalibrasiTemplat(mentah: readonly MentahTemplat[]): PutusanKalibrasiTemplat {
  const tayang = mentah.filter((m) => m.kelompok === 'tayang' && lengkapTemplat(m));
  const bocor = mentah.filter((m) => m.kelompok === 'bocor' && lengkapTemplat(m));
  const diterima = (s: SetelanTumpukan): number => tayang.filter((m) => !putusanSoalTemplat(m, s).ditolak).length;
  const langkah: string[] = [];
  const calon: Array<{ nama: string; s: SetelanTumpukan }> = KEADAAN_PENEBAK.map((k) => ({ nama: k.nama, s: { ...SETELAN_S1, penebak: k.penebak } }));
  const s7 = calon[calon.length - 1]?.s as SetelanTumpukan;
  calon.push({ nama: 'S7 + pembaca kartu dicatat', s: { ...s7, kartu: 'dicatat' } });
  calon.push({ nama: 'S7 + kartu dicatat + kritikus tingkat 2', s: { ...s7, kartu: 'dicatat', kritikus: { jenis: KRITIKUS_TINGKAT_2, dicatat: false } } });
  calon.push({ nama: 'S7 + kartu dicatat + kritikus dicatat', s: { ...s7, kartu: 'dicatat', kritikus: { jenis: KRITIKUS_TINGKAT_2, dicatat: true } } });
  let pilih = calon[calon.length - 1] as { nama: string; s: SetelanTumpukan };
  for (const c of calon) {
    const d = diterima(c.s);
    langkah.push(`${c.nama}: tumpukan menerima ${String(d)}/${String(tayang.length)} soal tayang`);
    if (cukup(d, tayang.length)) {
      pilih = c;
      break;
    }
  }
  const tangkap = bocor.filter((m) => putusanSoalTemplat(m, pilih.s).sebelum_kritikus).length;
  return {
    setelan: pilih.s,
    keadaan: pilih.nama,
    langkah,
    syarat: { tayang_diterima: diterima(pilih.s), tayang_terukur: tayang.length, terpenuhi: cukup(diterima(pilih.s), tayang.length), bocor_tertangkap_sebelum_kritikus: tangkap, bocor_terukur: bocor.length },
  };
}

/* ---------------------------------------------------------------------- */
/* kritikus M2d-8 yang dipakai ulang                                       */
/* ---------------------------------------------------------------------- */

interface MentahM2d8 {
  id: string;
  soal: string;
  kunci: string;
  kritikus: { menjawab: boolean; keberatan: Keberatan[]; token_penalaran: Array<number | null> } | null;
}

/** Kritikus M2d-8 untuk soal tayang yang teksnya SAMA (ringkasan soal dicek sama). */
export function kritikusM2d8(s: SoalKalibrasiTemplat, jalur = `${AKAR}eval/keluaran-m2d8/kalibrasi/mentah.json`): KritikusMentahTemplat | null {
  const m = (JSON.parse(readFileSync(jalur, 'utf8')) as { hasil: MentahM2d8[] }).hasil.find((x) => x.id === s.id);
  if (m === undefined || m.kritikus === null) return null;
  const o = s.omongan;
  const ringkas = `${o.nama}: "${teksPolos(o.pesan)}" | ${(['a', 'b', 'c', 'd'] as const).map((h) => `${h}) ${teksPolos(o.pilihan[h])}`).join(' | ')}`;
  if (m.soal !== ringkas || m.kunci !== s.omongan.kunci) throw new Error(`teks soal ${s.id} berbeda dari yang diukur kritikus M2d-8; hasilnya tidak boleh dipakai ulang`);
  return { sumber: 'm2d8', menjawab: m.kritikus.menjawab, keberatan: m.kritikus.keberatan, token_penalaran: m.kritikus.token_penalaran };
}

/* ---------------------------------------------------------------------- */
/* jalan (berbayar)                                                        */
/* ---------------------------------------------------------------------- */

export async function ukurSoalTemplat(s: SoalKalibrasiTemplat, panggil: PanggilTemplat): Promise<{ m: MentahTemplat; kartu: PutusanKartu | null }> {
  const o = s.omongan;
  const m: MentahTemplat = { id: s.id, kelompok: s.kelompok, luar: s.luar, kunci: o.kunci, soal: ringkasSoal(o), kode: gerbangKode(o, s.paket), penebak: null, kartu: null, kritikus: null, biaya_usd: 0 };
  let kartu: PutusanKartu | null = null;
  try {
    const t = await penebakCampur(o, { panggil, putaran: 1, omongan: s.no, setelan: SETELAN_S1.penebak, hentiDini: false });
    m.penebak = t.tebakan.map((x) => ({
      ke: x.ke, model: x.model, pilihan: x.terbaca ? x.pilihan : null, yakin: x.terbaca ? x.yakin : null, terbaca: x.terbaca, alasan: x.alasan,
      token_penalaran: x.panggilan.map((y) => y.token_penalaran ?? null), penyedia: x.panggilan.map((y) => y.penyedia ?? null),
    }));
    kartu = await pembacaKartu(o, s.paket, panggil, 1, s.no);
    m.kartu = {
      pilihan: kartu.pilihan, ditunjuk: kartu.kartu_ditunjuk, menunjuk_penentu: kartu.menunjuk_penentu,
      bingung: (kartu.membingungkan ?? []).map((x) => x.kutipan), alasan: kartu.alasan_penjawab,
    };
  } catch (galat) {
    m.galat = galat instanceof Error ? `${galat.name}: ${galat.message}`.slice(0, 300) : 'galat';
    if (galat instanceof PaguTercapai) throw Object.assign(galat, { mentah: m });
  }
  return { m, kartu };
}

function tulis(nama: string, isi: unknown): void {
  writeFileSync(`${FOLDER_KALIBRASI_M2D10}/${nama}`, JSON.stringify(isi, null, 2) + '\n', 'utf8');
}

async function jalankan(): Promise<number> {
  if (existsSync(JALUR_MENTAH_M2D10)) {
    console.error(`${JALUR_MENTAH_M2D10} sudah ada; kalibrasi yang sudah dibayar tidak diulang.`);
    return 1;
  }
  const { klien, biaya } = siapkanM2d10();
  mkdirSync(FOLDER_KALIBRASI_M2D10, { recursive: true });
  const daftar = himpunanTemplat();
  const hasil: MentahTemplat[] = [];
  const awalan = PAGU_BAGIAN_M2D10.kalibrasi.awalanTag;
  const simpan = (selesai: boolean): void => tulis('mentah.json', { selesai, pagu_kalibrasi_usd: PAGU_BAGIAN_M2D10.kalibrasi.usd, biaya_kalibrasi_usd: biaya.totalAwalan(awalan), hasil });
  const buatPanggil = (id: string): PanggilTemplat => async (pesan, setelan, info) => {
    if (!(MODEL_OPENROUTER as readonly string[]).includes(info.model)) throw new Error(`Model ${info.model} tidak diizinkan M2d-10.`);
    const tag = `${awalan}${id}/${info.jenis}/t${String(info.ke)}${info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : ''}`;
    let j;
    try {
      j = await chatBerpagu(
        klien, biaya,
        { model: info.model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan, ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }) },
        tag,
        setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
      );
    } catch (galat) {
      throw ubahGalatSaldo(galat, info.model);
    }
    console.log(`  ${new Date().toISOString().slice(11, 19)} ${tag} ${info.model}: ${String(j.penyedia)} ${String(j.finish_reason)} penalaran ${String(j.token_penalaran)} US$${j.biaya_usd.toFixed(6)}; kalibrasi US$${biaya.totalAwalan(awalan).toFixed(4)}`);
    return j;
  };
  const kartuTayang = new Map<string, PutusanKartu | null>();
  const urutan: Array<{ s: SoalKalibrasiTemplat; tahap: 'ukur' | 'kritikus' }> = [
    ...daftar.filter((s) => s.kelompok === 'tayang').map((s) => ({ s, tahap: 'ukur' as const })),
    ...daftar.filter((s) => s.kelompok === 'tayang').map((s) => ({ s, tahap: 'kritikus' as const })),
    ...daftar.filter((s) => s.kelompok === 'bocor').map((s) => ({ s, tahap: 'ukur' as const })),
  ];
  for (const { s, tahap } of urutan) {
    const sebelum = biaya.totalAwalan(`${awalan}${s.id}/`);
    try {
      if (tahap === 'ukur') {
        const { m, kartu } = await ukurSoalTemplat(s, buatPanggil(s.id));
        m.biaya_usd = biaya.totalAwalan(`${awalan}${s.id}/`) - sebelum;
        hasil.push(m);
        kartuTayang.set(s.id, kartu);
        console.log(`${s.id} [${s.kelompok}] penebak ${m.penebak?.map((t) => `${t.model.split('/')[1] ?? ''}:${String(t.pilihan)}/${String(t.yakin)}`).join(' ') ?? '-'} kartu ${String(m.kartu?.pilihan)} (kunci ${m.kunci}); US$${m.biaya_usd.toFixed(4)}`);
      } else {
        const m = hasil.find((x) => x.id === s.id);
        if (m === undefined || m.kartu === null) continue;
        const lama = kritikusM2d8(s);
        if (lama !== null) {
          m.kritikus = lama;
          console.log(`${s.id}: kritikus dipakai ulang dari M2d-8 (${lama.keberatan.map((k) => k.jenis).join(', ') || 'tanpa keberatan'})`);
        } else {
          const kr = await kritikusMakna(s.omongan, s.paket, kartuTayang.get(s.id) ?? null, buatPanggil(s.id), 1, s.no);
          m.kritikus = { sumber: 'm2d10', menjawab: kr.menjawab, keberatan: kr.keberatan, token_penalaran: kr.panggilan.map((x) => x.token_penalaran ?? null) };
          m.biaya_usd += biaya.totalAwalan(`${awalan}${s.id}/`) - sebelum;
          console.log(`${s.id}: kritikus baru (${kr.menjawab ? kr.keberatan.map((k) => k.jenis).join(', ') || 'tanpa keberatan' : 'tidak menjawab'})`);
        }
      }
    } catch (galat) {
      const m = (galat as { mentah?: MentahTemplat }).mentah;
      if (m !== undefined) hasil.push(m);
      console.error(`${s.id}: ${galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat'}`);
      simpan(false);
      return galat instanceof PaguTercapai ? (galat.name === 'SaldoPenyediaHabis' ? 4 : 2) : 1;
    }
    simpan(false);
  }
  simpan(true);
  console.log(`Kalibrasi US$${biaya.totalAwalan(awalan).toFixed(6)} dari US$${PAGU_BAGIAN_M2D10.kalibrasi.usd.toFixed(2)}.`);
  return 0;
}

export function bacaMentahTemplat(jalur: string = JALUR_MENTAH_M2D10): MentahTemplat[] {
  return (JSON.parse(readFileSync(jalur, 'utf8')) as { hasil: MentahTemplat[] }).hasil;
}

export function matriksTemplat(mentah: readonly MentahTemplat[], s: SetelanTumpukan): Array<{ gerbang: string; tayang: [number, number]; bocor: [number, number] }> {
  const ukur = mentah.filter(lengkapTemplat);
  const baris = (g: keyof PutusanSoalTemplat): { gerbang: string; tayang: [number, number]; bocor: [number, number] } => {
    const h = (k: 'tayang' | 'bocor'): [number, number] => {
      const x = ukur.filter((m) => m.kelompok === k);
      return [x.filter((m) => putusanSoalTemplat(m, s)[g]).length, x.length];
    };
    return { gerbang: g, tayang: h('tayang'), bocor: h('bocor') };
  };
  return (['kode', 'penebak', 'kartu', 'kritikus', 'sebelum_kritikus', 'ditolak'] as const).map(baris);
}

function tulisMatriks(): number {
  const mentah = bacaMentahTemplat();
  const p = putusanKalibrasiTemplat(mentah);
  const isi = {
    putusan: p,
    awal: matriksTemplat(mentah, SETELAN_S1),
    akhir: matriksTemplat(mentah, p.setelan),
    per_soal: mentah.map((m) => ({ id: m.id, kelompok: m.kelompok, lengkap: lengkapTemplat(m), ...(lengkapTemplat(m) ? { awal: putusanSoalTemplat(m, SETELAN_S1), akhir: putusanSoalTemplat(m, p.setelan) } : { galat: m.galat ?? null }) })),
  };
  tulis('matriks.json', isi);
  tulis('setelan.json', p.setelan);
  for (const l of p.langkah) console.log(l);
  console.log(JSON.stringify(p.syarat));
  console.log(JSON.stringify(p.setelan));
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/templat/kalibrasi.ts') === true) {
  const a = process.argv.slice(2);
  const kerja = a.includes('--matriks') ? Promise.resolve(tulisMatriks()) : a.includes('--jalan') ? jalankan() : Promise.resolve((console.error('Pakai: npm run templat:kalibrasi -- --jalan | --matriks'), 1));
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
