/**
 * `npm run pengecoh:kalibrasi -- <--manusia | --himpunan | --matriks>` —
 * kalibrasi gerbang M2d-7 (kontrak D-4, D-6). Pagu kalibrasi US$0,60 (tag
 * `m2d7/kalibrasi/`) DITEGAKKAN kode di dalam pagu milestone US$3,00.
 *
 * - `--manusia` (D-4): gerbang pilihan-saja (DeepSeek ×2) atas keenam soal
 *   manusia yang hidup — semuanya harus lolos, atau pengecualiannya dicatat.
 *   Meresmikan dan keseimbangan atas soal manusia dites tanpa jaringan
 *   (`gerbang-artefak.test.ts`).
 * - `--himpunan` (D-6): himpunan bocor/aman M2d-6 (`SOAL_KALIBRASI`, 4 bocor +
 *   6 aman, label dari jawaban mentah penguji luar) dengan gerbang baru:
 *   meresmikan + keseimbangan (kode), pilihan-saja (DeepSeek ×2), dan penebak
 *   M2d-7 (GLM ×3 `effort: "max"`, dijaga, petunjuk "pemburu soal bocor").
 *   Semua gerbang dijalankan pada semua soal (matriks per gerbang). Dua soal
 *   TIRT M2d-6 yang diuji di luar (o1 bocor 3/3, o2 aman) ikut sebagai
 *   TAMBAHAN — dilaporkan terpisah, tidak masuk aturan.
 * - `--matriks` (tanpa jaringan): hitung ulang matriks + putusan ambang dari
 *   berkas mentah.
 *
 * Aturan penurunan ambang (kontrak D-6, ditulis SEBELUM kalibrasi dijalankan;
 * `putusanAmbang`, murni): bila gerbang baru bersama-sama menolak > 4 dari 6
 * soal aman (sebagai porsi > 4/6 dari soal aman yang terukur — ditambahkan
 * sesudah kalibrasi berhenti di pagu dengan 4 dari 6 soal aman terukur), longgarkan gerbang yang menolak soal aman, satu per satu dalam
 * urutan ini, sampai ≤ 4 (dihitung ulang dari data mentah, tanpa panggilan
 * baru): (1) keseimbangan 1,3 → 1,5; (2) meresmikan kata 2 → 3; (3)
 * pilihan-saja: tolak hanya bila keduanya memilih kunci DAN rata-rata yakin
 * ≥ 60; (4) penebak: tolak hanya bila ≥ 2/3 benar (klausa "yakin ≥ 40" K-05
 * dilepas). Tiap langkah hanya diambil bila gerbang itu memang menolak ≥ 1
 * soal aman.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GENERASI_M2D7 } from './agen-pengecoh.ts';
import type { HasilPeran } from './agen-peran.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { AMBANG_ARTEFAK_AWAL, gKeseimbangan, gMeresmikan, gPilihanSaja, MAKS_ANGKA_RESMI, type AmbangArtefak } from './gerbang-artefak.ts';
import { gerbangTebak, type InfoPanggil } from './gerbang-tebak.ts';
import { lolosTebak } from './laporan.ts';
import { PaguTercapai, chatBerpagu } from './pagu.ts';
import { SOAL_KALIBRASI, muatSoal } from './penalar-kalibrasi.ts';
import { FOLDER_M2D7, PAGU_BAGIAN_M2D7, siapkanM2d7 } from './pengecoh-konfig.ts';
import { omonganLolosPeran } from './peran-penguji.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import type { PesanChat } from './klien.ts';
import type { JawabanModel, SetelanPanggil } from './susun.ts';
import { teksPolos } from '../skema/rujukan.ts';

export const FOLDER_KALIBRASI_M2D7 = `${FOLDER_M2D7}/kalibrasi`;
export const JALUR_MANUSIA = `${FOLDER_KALIBRASI_M2D7}/manusia.json`;
export const JALUR_HIMPUNAN = `${FOLDER_KALIBRASI_M2D7}/himpunan.json`;
export const JALUR_MATRIKS = `${FOLDER_KALIBRASI_M2D7}/matriks.json`;
export const KONKURENSI = 4;

/* ---------------------------------------------------------------------- */
/* soal                                                                    */
/* ---------------------------------------------------------------------- */

export interface SoalManusiaK {
  id: string;
  berkas: string;
  pesan: string;
  pilihan: Record<KunciOpsi, string>;
  kunci: KunciOpsi;
}

export function soalManusia(): SoalManusiaK[] {
  return ['dada-2025-10-08', 'ultj-2026-05-04'].flatMap((f) =>
    (JSON.parse(readFileSync(`${AKAR}cases/${f}.json`, 'utf8')) as { soal: Array<{ soal_id: string; pesan: { isi: string }; pilihan: Array<{ kunci: KunciOpsi; teks: string }>; jawaban: KunciOpsi }> }).soal.map((s) => ({
      id: s.soal_id,
      berkas: f,
      pesan: s.pesan.isi,
      pilihan: Object.fromEntries(s.pilihan.map((p) => [p.kunci, p.teks])) as Record<KunciOpsi, string>,
      kunci: s.jawaban,
    })),
  );
}

export interface SoalHimpunan {
  id: string;
  kelompok: 'bocor' | 'aman';
  tambahan: boolean;
  luar: string;
  omongan: OmonganDraf;
}

/** Tambahan: dua omongan TIRT M2d-6 yang diuji di luar (label dari jawaban mentah penguji M2d-6). */
export const TAMBAHAN_M2D6 = [
  { id: 'm2d6-tirt-o1', no: 1, kelompok: 'bocor' as const, luar: 'c/55 · c/50 · c/50 (3/3 benar)' },
  { id: 'm2d6-tirt-o2', no: 2, kelompok: 'aman' as const, luar: 'a/35 · b/35 · a/30 (0/3)' },
];

export function soalHimpunan(): SoalHimpunan[] {
  const inti = SOAL_KALIBRASI.map((s) => ({ id: s.id, kelompok: s.kelompok, tambahan: false, luar: s.luar, omongan: muatSoal(s) }));
  const h = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d6/jalan-1/tirt/riwayat.json`, 'utf8')) as HasilPeran;
  const lolos = omonganLolosPeran('tirt', h);
  const tambah = TAMBAHAN_M2D6.map((t) => {
    const o = lolos.find((l) => l.no === t.no)?.omongan;
    if (o === undefined) throw new Error(`${t.id} tidak ada`);
    return { id: t.id, kelompok: t.kelompok, tambahan: true, luar: t.luar, omongan: o };
  });
  return [...inti, ...tambah];
}

/* ---------------------------------------------------------------------- */
/* hasil mentah + putusan ambang (murni)                                   */
/* ---------------------------------------------------------------------- */

export interface TebakMentah {
  ke: number;
  pilihan: string | null;
  yakin: number | null;
  terbaca: boolean;
  token_penalaran: Array<number | null>;
  penyedia: Array<string | null>;
  alasan: string;
}

export interface HasilSoalK {
  id: string;
  kelompok: 'bocor' | 'aman' | 'manusia';
  tambahan: boolean;
  kunci: KunciOpsi;
  meresmikan: { angka: string[]; kata: string[] };
  keseimbangan: { rasio: number };
  pilihan_saja: TebakMentah[] | null;
  penebak: TebakMentah[] | null;
  biaya_usd: number;
}

export type AmbangK = AmbangArtefak;

export const AMBANG_AWAL: AmbangK = AMBANG_ARTEFAK_AWAL;

export interface PutusanGerbangK {
  meresmikan: boolean;
  keseimbangan: boolean;
  pilihan_saja: boolean | null;
  penebak: boolean | null;
  ditolak: boolean;
}

/** Putusan tiap gerbang untuk satu soal di bawah satu set ambang. Murni. */
export function putusanSoal(h: HasilSoalK, a: AmbangK): PutusanGerbangK {
  const meresmikan = h.meresmikan.angka.length >= MAKS_ANGKA_RESMI || h.meresmikan.kata.length >= a.maksKata;
  const keseimbangan = h.keseimbangan.rasio > a.rasio;
  let pilihan_saja: boolean | null = null;
  if (h.pilihan_saja !== null) {
    const kena = h.pilihan_saja.filter((t) => !t.terbaca || t.pilihan === h.kunci);
    const yakin = kena.map((t) => (t.terbaca ? (t.yakin ?? 0) : 100));
    const rata = yakin.length === 0 ? 0 : yakin.reduce((x, y) => x + y, 0) / yakin.length;
    pilihan_saja = kena.length >= h.pilihan_saja.length && (a.pilihanSajaYakin === null || rata >= a.pilihanSajaYakin);
  }
  let penebak: boolean | null = null;
  if (h.penebak !== null) {
    const jawab = h.penebak.map((t) => (t.terbaca ? { pilihan: t.pilihan ?? '', yakin: t.yakin ?? 0 } : { pilihan: h.kunci, yakin: 100 }));
    const n = lolosTebak(jawab, h.kunci);
    penebak = a.penebakYakin ? !n.lolos : n.benar >= 2;
  }
  return { meresmikan, keseimbangan, pilihan_saja, penebak, ditolak: meresmikan || keseimbangan || pilihan_saja === true || penebak === true };
}

export interface BarisMatriksK {
  gerbang: keyof Omit<PutusanGerbangK, 'ditolak'> | 'gabungan';
  bocor_ditolak: number;
  bocor_total: number;
  aman_ditolak: number;
  aman_total: number;
}

/** Matriks per gerbang atas soal INTI (bukan tambahan). Murni. */
export function matriksK(hasil: readonly HasilSoalK[], a: AmbangK): BarisMatriksK[] {
  const inti = hasil.filter((h) => !h.tambahan && h.kelompok !== 'manusia');
  const gerbang: Array<BarisMatriksK['gerbang']> = ['meresmikan', 'keseimbangan', 'pilihan_saja', 'penebak', 'gabungan'];
  return gerbang.map((g) => {
    const ya = (h: HasilSoalK): boolean => {
      const p = putusanSoal(h, a);
      return g === 'gabungan' ? p.ditolak : p[g] === true;
    };
    const bocor = inti.filter((h) => h.kelompok === 'bocor');
    const aman = inti.filter((h) => h.kelompok === 'aman');
    return { gerbang: g, bocor_ditolak: bocor.filter(ya).length, bocor_total: bocor.length, aman_ditolak: aman.filter(ya).length, aman_total: aman.length };
  });
}

export const BATAS_AMAN_DITOLAK = 4;

/** Aturan penurunan ambang D-6 (di kepala berkas). Murni. */
export function putusanAmbang(hasil: readonly HasilSoalK[]): { ambang: AmbangK; langkah: string[] } {
  let a: AmbangK = { ...AMBANG_AWAL };
  const langkah: string[] = [];
  // Porsi, bukan jumlah: "> 4 dari 6" dibandingkan sebagai > 4/6 dari soal aman yang TERUKUR (kalibrasi bisa berhenti di pagu).
  const gab = (x: AmbangK): BarisMatriksK | undefined => matriksK(hasil, x).find((b) => b.gerbang === 'gabungan');
  const amanDitolak = (x: AmbangK): number => gab(x)?.aman_ditolak ?? 0;
  const melewati = (x: AmbangK): boolean => (gab(x)?.aman_ditolak ?? 0) * 6 > BATAS_AMAN_DITOLAK * (gab(x)?.aman_total ?? 0);
  const menolakAman = (x: AmbangK, g: keyof Omit<PutusanGerbangK, 'ditolak'>): boolean => (matriksK(hasil, x).find((b) => b.gerbang === g)?.aman_ditolak ?? 0) > 0;
  const urutan: Array<[keyof Omit<PutusanGerbangK, 'ditolak'>, (x: AmbangK) => AmbangK, string]> = [
    ['keseimbangan', (x) => ({ ...x, rasio: 1.5 }), 'keseimbangan 1,3 → 1,5'],
    ['meresmikan', (x) => ({ ...x, maksKata: 3 }), 'meresmikan kata 2 → 3'],
    ['pilihan_saja', (x) => ({ ...x, pilihanSajaYakin: 60 }), 'pilihan-saja: juga rata-rata yakin ≥ 60'],
    ['penebak', (x) => ({ ...x, penebakYakin: false }), 'penebak: hanya ≥ 2/3 benar'],
  ];
  const n = gab(a)?.aman_total ?? 0;
  langkah.push(`awal: aman ditolak ${String(amanDitolak(a))}/${String(n)}`);
  for (const [g, ubah, nama] of urutan) {
    if (!melewati(a)) break;
    if (!menolakAman(a, g)) continue;
    a = ubah(a);
    langkah.push(`${nama} → aman ditolak ${String(amanDitolak(a))}/${String(n)}`);
  }
  return { ambang: a, langkah };
}

/* ---------------------------------------------------------------------- */
/* jalan (berbayar)                                                        */
/* ---------------------------------------------------------------------- */

function mentah(t: { ke: number; pilihan: string | null; yakin: number | null; terbaca: boolean; alasan: string; panggilan: Array<{ token_penalaran?: number | null; penyedia?: string | null }> }): TebakMentah {
  return {
    ke: t.ke, pilihan: t.pilihan, yakin: t.yakin, terbaca: t.terbaca, alasan: t.alasan,
    token_penalaran: t.panggilan.map((p) => p.token_penalaran ?? null), penyedia: t.panggilan.map((p) => p.penyedia ?? null),
  };
}

type Panggil = (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoPanggil) => Promise<JawabanModel>;

function pemanggil(id: string, klien: ReturnType<typeof siapkanM2d7>['klien'], biaya: ReturnType<typeof siapkanM2d7>['biaya'], biayaSoal: { usd: number }): Panggil {
  return async (pesan, setelan, info) => {
    const ds = info.jenis === 'gerbang-pilihan-saja';
    const model = ds ? GENERASI_M2D7.modelPilihanSaja : (GENERASI_M2D7.penebak.model[info.ke - 1] ?? 'z-ai/glm-5.3');
    const tag = `${PAGU_BAGIAN_M2D7.kalibrasi.awalanTag}${id}/${ds ? 'pilihan-saja' : 'penebak'}/t${String(info.ke)}${info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : ''}`;
    const j = await chatBerpagu(
      klien,
      biaya,
      { model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan, ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }) },
      tag,
      setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
    );
    biayaSoal.usd += j.biaya_usd;
    console.log(`  ${tag}: ${String(j.penyedia)} penalaran ${String(j.token_penalaran)} ${String(j.finish_reason)} US$${j.biaya_usd.toFixed(6)}`);
    return j;
  };
}

async function ukurSoal(
  s: { id: string; kelompok: HasilSoalK['kelompok']; tambahan: boolean; pesan: string; pilihan: Record<KunciOpsi, string>; kunci: KunciOpsi; omongan: OmonganDraf | null },
  siap: ReturnType<typeof siapkanM2d7>,
  denganPenebak: boolean,
): Promise<HasilSoalK> {
  const biayaSoal = { usd: 0 };
  const panggil = pemanggil(s.id, siap.klien, siap.biaya, biayaSoal);
  const m = gMeresmikan(s.pesan, s.pilihan, s.kunci);
  const k = gKeseimbangan(s.pilihan, s.kunci);
  const ps = await gPilihanSaja({ pilihan: s.pilihan, kunci: s.kunci }, { panggil, putaran: 1, omongan: 1, maxTokens: GENERASI_M2D7.pilihanSaja.maxTokens, tambahanBadan: GENERASI_M2D7.pilihanSaja.tambahanBadan });
  let penebak: TebakMentah[] | null = null;
  if (denganPenebak && s.omongan !== null) {
    const g = GENERASI_M2D7.penebak;
    const t = await gerbangTebak(s.omongan, {
      panggil, putaran: 1, omongan: 1, petunjuk: g.petunjuk, maxTokensKe: g.model.map(() => g.maxTokens),
      tambahanBadanKe: g.model.map(() => g.tambahanBadan), ambangPenalaranKe: g.model.map(() => g.ambang),
    });
    penebak = t.tebakan.map((x) => mentah({ ...x, pilihan: x.terbaca ? x.pilihan : null, yakin: x.terbaca ? x.yakin : null }));
  }
  return {
    id: s.id, kelompok: s.kelompok, tambahan: s.tambahan, kunci: s.kunci,
    meresmikan: { angka: m.angka, kata: m.kata }, keseimbangan: { rasio: k.rasio },
    pilihan_saja: ps.tebakan.map((x) => mentah({ ...x })), penebak, biaya_usd: biayaSoal.usd,
  };
}

async function jalankan(jalur: string, daftar: Array<Parameters<typeof ukurSoal>[0] & { penebak: boolean }>): Promise<number> {
  if (existsSync(jalur)) {
    console.error(`${jalur} sudah ada; kalibrasi yang sudah dibayar tidak diulang.`);
    return 1;
  }
  const siap = siapkanM2d7();
  mkdirSync(FOLDER_KALIBRASI_M2D7, { recursive: true });
  const per: Array<HasilSoalK | null> = daftar.map(() => null);
  const simpan = (selesai: boolean): void =>
    writeFileSync(jalur, JSON.stringify({ selesai, pagu_kalibrasi_usd: PAGU_BAGIAN_M2D7.kalibrasi.usd, hasil: per.filter((x) => x !== null) }, null, 2) + '\n', 'utf8');
  let berhenti: number | null = null;
  let berikut = 0;
  const pekerja = async (): Promise<void> => {
    while (berhenti === null) {
      const i = berikut++;
      const s = daftar[i];
      if (s === undefined) return;
      for (let coba = 1; coba <= 2 && berhenti === null && per[i] === null; coba++) {
        try {
          const h = await ukurSoal(s, siap, s.penebak);
          per[i] = h;
          const p = putusanSoal(h, AMBANG_AWAL);
          console.log(`${h.id} [${h.kelompok}${h.tambahan ? ', tambahan' : ''}] kunci ${h.kunci}: meresmikan ${String(p.meresmikan)}, keseimbangan ${String(p.keseimbangan)} (${String(h.keseimbangan.rasio)}), ` +
            `pilihan-saja ${h.pilihan_saja?.map((t) => `${String(t.pilihan)}/${String(t.yakin)}`).join(' ') ?? '-'} → ${String(p.pilihan_saja)}, ` +
            `penebak ${h.penebak?.map((t) => `${String(t.pilihan)}/${String(t.yakin)}`).join(' ') ?? '-'} → ${String(p.penebak)}; US$${h.biaya_usd.toFixed(4)}`);
        } catch (galat) {
          const g = ubahGalatSaldo(galat, 'kalibrasi');
          console.error(`${s.id} (percobaan ${String(coba)}): ${g instanceof Error ? `${g.name}: ${g.message}` : 'galat'}`);
          if (g instanceof PaguTercapai) berhenti ??= g.name === 'SaldoPenyediaHabis' ? 4 : 2;
          else if (coba === 2) berhenti ??= 1;
        }
      }
      simpan(false);
    }
  };
  await Promise.all(Array.from({ length: KONKURENSI }, () => pekerja()));
  simpan(berhenti === null);
  console.log(`Kalibrasi terpakai US$${siap.biaya.totalAwalan(PAGU_BAGIAN_M2D7.kalibrasi.awalanTag).toFixed(6)} dari US$${PAGU_BAGIAN_M2D7.kalibrasi.usd.toFixed(2)}; milestone US$${siap.biaya.totalMilestone().toFixed(6)}.`);
  return berhenti ?? 0;
}

export function bacaHasil(jalur: string): { selesai: boolean; hasil: HasilSoalK[] } {
  return JSON.parse(readFileSync(jalur, 'utf8')) as { selesai: boolean; hasil: HasilSoalK[] };
}

function tulisMatriks(): number {
  const h = existsSync(JALUR_HIMPUNAN) ? bacaHasil(JALUR_HIMPUNAN).hasil : [];
  const m = existsSync(JALUR_MANUSIA) ? bacaHasil(JALUR_MANUSIA).hasil : [];
  const putusan = putusanAmbang(h);
  const isi = {
    ambang_awal: AMBANG_AWAL,
    matriks_awal: matriksK(h, AMBANG_AWAL),
    putusan,
    matriks_akhir: matriksK(h, putusan.ambang),
    per_soal: h.map((x) => ({ id: x.id, kelompok: x.kelompok, tambahan: x.tambahan, awal: putusanSoal(x, AMBANG_AWAL), akhir: putusanSoal(x, putusan.ambang) })),
    manusia: m.map((x) => ({ id: x.id, awal: putusanSoal(x, AMBANG_AWAL), akhir: putusanSoal(x, putusan.ambang) })),
  };
  writeFileSync(JALUR_MATRIKS, JSON.stringify(isi, null, 2) + '\n', 'utf8');
  for (const b of isi.matriks_awal) console.log(`${b.gerbang}: bocor ditolak ${String(b.bocor_ditolak)}/${String(b.bocor_total)}, aman ditolak ${String(b.aman_ditolak)}/${String(b.aman_total)}`);
  for (const l of putusan.langkah) console.log(`  ${l}`);
  console.log(`Ambang: ${JSON.stringify(putusan.ambang)}`);
  for (const x of isi.manusia) console.log(`manusia ${x.id}: ${JSON.stringify(x.akhir)}`);
  return 0;
}

async function utama(argumen: string[]): Promise<number> {
  if (argumen.includes('--matriks')) return tulisMatriks();
  if (argumen.includes('--manusia')) {
    return jalankan(JALUR_MANUSIA, soalManusia().map((s) => ({ id: `manusia-${s.id}`, kelompok: 'manusia', tambahan: false, pesan: s.pesan, pilihan: s.pilihan, kunci: s.kunci, omongan: null, penebak: false })));
  }
  if (argumen.includes('--himpunan')) {
    return jalankan(
      JALUR_HIMPUNAN,
      soalHimpunan().map((s) => ({
        id: s.id, kelompok: s.kelompok, tambahan: s.tambahan, pesan: teksPolos(s.omongan.pesan),
        pilihan: s.omongan.pilihan, kunci: s.omongan.kunci, omongan: s.omongan, penebak: true,
      })),
    );
  }
  console.error('Pakai: npm run pengecoh:kalibrasi -- --manusia | --himpunan | --matriks');
  return 1;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/pengecoh-kalibrasi.ts') === true) {
  utama(process.argv.slice(2)).then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
