/**
 * `npm run penalar:kalibrasi -- <susunan…> [--sampel <n>]` — kalibrasi
 * penebak dengan soal yang SUDAH diketahui bocor/aman (kontrak M2d-6 D-3).
 *
 * Tujuannya MENANGKAP soal yang sudah terbukti bocor di uji luar, bukan
 * meloloskan soal: susunan penebak yang dipilih harus menolak semua soal
 * bocor dan menolak sesedikit mungkin soal aman. Tidak ada yang disetel
 * supaya soal lolos.
 *
 * - Himpunan kalibrasi (`SOAL_KALIBRASI`): bocor = M2d-5 TIRT omongan 2 & 3,
 *   M2d-4 TIRT omongan 1 & 3; aman = M2d-4 ULTJ 1–3, DADA 1–2, M2d-5 TIRT 1.
 *   Versi omongan = versi yang dikirim ke penguji luar (`kunci.json` penguji
 *   milestone itu: paket, nomor, putaran); teksnya dites sama dengan bahan
 *   tebak buta yang dikirim.
 * - Susunan (`SUSUNAN_KALIBRASI`): tiga penebak TANPA kartu; model hanya
 *   DeepSeek/GLM; effort; petunjuk. Penebak GLM ber-effort dijaga penjaga
 *   penalaran (M2d-6 D-1), persis seperti di lingkar.
 * - Kriteria per soal = K-05 lingkar (`gerbangTebak`): ditolak bila ≥ 2/3
 *   benar atau rata-rata yakin yang benar ≥ 40.
 * - Pagu kalibrasi US$0,80 (tag `m2d6/kalibrasi/`) DITEGAKKAN kode.
 *
 * Keluaran `eval/keluaran-m2d6/kalibrasi/<susunan>-s<n>.json` (mentah) dan
 * `matriks.json` (ringkasan semua jalan yang ada).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { MAX_TOKENS_PENEBAK_PERAN, PETUNJUK_PENEBAK_KUAT, PETUNJUK_PENEBAK_TAJAM } from './agen-peran.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { gerbangTebak, type PutusanTebak } from './gerbang-tebak.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM, type ModelOpenRouter } from './model.ts';
import { PaguTercapai, chatBerpagu } from './pagu.ts';
import type { IdPaket } from './paket.ts';
import { PENALARAN_M2D5, PENALAR_M2D6, badanPenalaran, badanUpaya } from './penalaran.ts';
import { PAGU_BAGIAN_M2D6, siapkanM2d6 } from './penalar-susun.ts';
import { ubahGalatSaldo } from './peran-susun.ts';

export { PETUNJUK_PENEBAK_TAJAM };
export const FOLDER_KALIBRASI = `${AKAR}eval/keluaran-m2d6/kalibrasi`;
/** Soal yang dijalankan serentak (penebak tiap soal tetap berurutan). */
export const KONKURENSI_KALIBRASI = 5;

export interface SoalKalibrasi {
  id: string;
  kelompok: 'bocor' | 'aman';
  milestone: 'm2d4' | 'm2d5';
  paket: IdPaket;
  no: number;
  /** Putaran versi yang dikirim ke penguji luar. */
  putaran: number;
  /** Id soal di bahan tebak buta penguji luar milestone itu. */
  id_luar: string;
  /** Hasil tebak buta luar (dari jawaban mentah penguji). */
  luar: string;
}

/** Kontrak D-3. Hasil luar dibaca dari `eval/keluaran-<m>/penguji/jawaban/tebak-p*.txt` (dites). */
export const SOAL_KALIBRASI: readonly SoalKalibrasi[] = [
  { id: 'm2d5-tirt-o2', kelompok: 'bocor', milestone: 'm2d5', paket: 'tirt', no: 2, putaran: 2, id_luar: 'Q1', luar: 'd/40 · d/40 · d/40 (3/3 benar)' },
  { id: 'm2d5-tirt-o3', kelompok: 'bocor', milestone: 'm2d5', paket: 'tirt', no: 3, putaran: 4, id_luar: 'Q2', luar: 'd/55 · d/60 · d/55 (3/3 benar)' },
  { id: 'm2d4-tirt-o3', kelompok: 'bocor', milestone: 'm2d4', paket: 'tirt', no: 3, putaran: 1, id_luar: 'Q2', luar: 'b/55 · a/40 · b/55 (1/3 benar, yakin 40)' },
  { id: 'm2d4-tirt-o1', kelompok: 'bocor', milestone: 'm2d4', paket: 'tirt', no: 1, putaran: 2, id_luar: 'Q3', luar: 'b/50 · a/50 · b/50 (1/3 benar, yakin 50)' },
  { id: 'm2d4-ultj-o1', kelompok: 'aman', milestone: 'm2d4', paket: 'ultj', no: 1, putaran: 1, id_luar: 'Q1', luar: 'b/45 · b/55 · b/50 (0/3)' },
  { id: 'm2d4-ultj-o2', kelompok: 'aman', milestone: 'm2d4', paket: 'ultj', no: 2, putaran: 3, id_luar: 'Q4', luar: 'b/45 · b/40 · b/40 (0/3)' },
  { id: 'm2d4-ultj-o3', kelompok: 'aman', milestone: 'm2d4', paket: 'ultj', no: 3, putaran: 9, id_luar: 'Q7', luar: 'b/55 · b/45 · b/55 (0/3)' },
  { id: 'm2d4-dada-o2', kelompok: 'aman', milestone: 'm2d4', paket: 'dada', no: 2, putaran: 7, id_luar: 'Q5', luar: 'd/45 · d/40 · d/40 (0/3)' },
  { id: 'm2d4-dada-o1', kelompok: 'aman', milestone: 'm2d4', paket: 'dada', no: 1, putaran: 3, id_luar: 'Q6', luar: 'c/60 · c/35 · c/55 (0/3)' },
  { id: 'm2d5-tirt-o1', kelompok: 'aman', milestone: 'm2d5', paket: 'tirt', no: 1, putaran: 4, id_luar: 'Q3', luar: 'b/40 · b/35 · c/30 (1/3 benar, yakin 30)' },
];

/** Omongan versi yang dikirim ke penguji luar. */
export function muatSoal(s: SoalKalibrasi): OmonganDraf {
  const r = JSON.parse(readFileSync(`${AKAR}eval/keluaran-${s.milestone}/${s.paket}/riwayat.json`, 'utf8')) as { riwayat: Array<{ draf: Array<OmonganDraf | null> }> };
  const o = r.riwayat[s.putaran - 1]?.draf[s.no - 1];
  if (o === null || o === undefined) throw new Error(`Soal ${s.id} tidak ada di riwayat.`);
  return o;
}

export interface SlotPenebak {
  model: ModelOpenRouter;
  maxTokens: number;
  tambahanBadan?: Readonly<Record<string, unknown>>;
  /** Penjaga penalaran (penebak GLM ber-effort). */
  ambang?: number;
}

export interface Susunan {
  id: string;
  ringkas: string;
  petunjuk: string;
  penebak: readonly [SlotPenebak, SlotPenebak, SlotPenebak];
}

const DS: SlotPenebak = { model: MODEL_OR_DEEPSEEK, maxTokens: MAX_TOKENS_PENEBAK_PERAN };
const GLM_M2D5: SlotPenebak = { model: MODEL_OR_GLM, maxTokens: PENALARAN_M2D5.penebakGlm.maxTokens, tambahanBadan: badanPenalaran(PENALARAN_M2D5.penebakGlm) };
const GLM_TINGGI: SlotPenebak = {
  model: MODEL_OR_GLM, maxTokens: PENALAR_M2D6.penebakGlm.maxTokens, tambahanBadan: badanUpaya(PENALAR_M2D6.penebakGlm), ambang: PENALAR_M2D6.penebakGlm.ambang,
};

export const SUSUNAN_KALIBRASI: readonly Susunan[] = [
  { id: 'K0', ringkas: 'M2d-5: DeepSeek ×2 + GLM reasoning.max_tokens 3.000, petunjuk "pemain pintar"', petunjuk: PETUNJUK_PENEBAK_KUAT, penebak: [DS, DS, GLM_M2D5] },
  { id: 'K1', ringkas: 'DeepSeek ×2 + GLM effort high (dijaga), petunjuk "pemain pintar"', petunjuk: PETUNJUK_PENEBAK_KUAT, penebak: [DS, DS, GLM_TINGGI] },
  { id: 'K2', ringkas: 'DeepSeek ×2 + GLM effort high (dijaga), petunjuk "pemburu soal bocor"', petunjuk: PETUNJUK_PENEBAK_TAJAM, penebak: [DS, DS, GLM_TINGGI] },
  { id: 'K3', ringkas: 'GLM effort high ×3 (dijaga), petunjuk "pemburu soal bocor"', petunjuk: PETUNJUK_PENEBAK_TAJAM, penebak: [GLM_TINGGI, GLM_TINGGI, GLM_TINGGI] },
  { id: 'K4', ringkas: 'DeepSeek ×3, petunjuk "pemburu soal bocor"', petunjuk: PETUNJUK_PENEBAK_TAJAM, penebak: [DS, DS, DS] },
];

export interface HasilSoal {
  id: string;
  kelompok: 'bocor' | 'aman';
  kunci: string;
  ditolak: boolean;
  benar: number;
  yakin_benar: number | null;
  tebakan: Array<{ ke: number; model: string; pilihan: string; yakin: number; terbaca: boolean; alasan: string; penyedia: Array<string | null>; token_penalaran: Array<number | null> }>;
  biaya_usd: number;
}

export interface HasilJalan {
  susunan: string;
  sampel: number;
  ringkas: string;
  soal: HasilSoal[];
  biaya_usd: number;
  selesai: boolean;
}

export function hasilSoal(s: SoalKalibrasi, t: PutusanTebak, model: readonly string[]): HasilSoal {
  const kunci = muatSoal(s).kunci;
  return {
    id: s.id,
    kelompok: s.kelompok,
    kunci,
    ditolak: !t.lolos,
    benar: t.benar,
    yakin_benar: t.yakin_benar,
    tebakan: t.tebakan.map((x) => ({
      ke: x.ke, model: model[x.ke - 1] ?? '?', pilihan: x.pilihan, yakin: x.yakin, terbaca: x.terbaca, alasan: x.alasan,
      penyedia: x.panggilan.map((p) => p.penyedia ?? null), token_penalaran: x.panggilan.map((p) => p.token_penalaran ?? null),
    })),
    biaya_usd: t.tebakan.flatMap((x) => x.panggilan).reduce((a, p) => a + p.biaya_usd, 0),
  };
}

export interface BarisMatriks {
  susunan: string;
  ringkas: string;
  sampel: number;
  bocor_ditolak: number;
  bocor_total: number;
  aman_ditolak: number;
  aman_total: number;
  /** Per soal: berapa sampel menolak. */
  per_soal: Record<string, { ditolak: number; sampel: number }>;
  biaya_usd: number;
}

/** Matriks per susunan dari semua jalan yang SELESAI (semua soal). Murni. */
export function matriks(jalan: readonly HasilJalan[]): BarisMatriks[] {
  const peta = new Map<string, BarisMatriks>();
  for (const j of jalan) {
    if (!j.selesai) continue;
    const b = peta.get(j.susunan) ?? { susunan: j.susunan, ringkas: j.ringkas, sampel: 0, bocor_ditolak: 0, bocor_total: 0, aman_ditolak: 0, aman_total: 0, per_soal: {}, biaya_usd: 0 };
    b.sampel++;
    b.biaya_usd += j.biaya_usd;
    for (const s of j.soal) {
      const p = (b.per_soal[s.id] ??= { ditolak: 0, sampel: 0 });
      p.sampel++;
      if (s.ditolak) p.ditolak++;
      if (s.kelompok === 'bocor') {
        b.bocor_total++;
        if (s.ditolak) b.bocor_ditolak++;
      } else {
        b.aman_total++;
        if (s.ditolak) b.aman_ditolak++;
      }
    }
    peta.set(j.susunan, b);
  }
  return [...peta.values()].sort((a, b) => a.susunan.localeCompare(b.susunan));
}

/**
 * Aturan pilih (kontrak D-3): tangkap soal bocor sebanyak mungkin (porsi
 * bocor ditolak tertinggi — idealnya semua), lalu tolak soal aman sesedikit
 * mungkin (porsi terendah), lalu termurah per sampel. Murni.
 */
export function pilihSusunan(m: readonly BarisMatriks[]): BarisMatriks | null {
  const porsi = (a: number, b: number): number => (b === 0 ? 0 : a / b);
  const urut = [...m].sort(
    (a, b) =>
      porsi(b.bocor_ditolak, b.bocor_total) - porsi(a.bocor_ditolak, a.bocor_total) ||
      porsi(a.aman_ditolak, a.aman_total) - porsi(b.aman_ditolak, b.aman_total) ||
      a.biaya_usd / a.sampel - b.biaya_usd / b.sampel,
  );
  return urut[0] ?? null;
}

export function bacaSemuaJalan(folder: string = FOLDER_KALIBRASI): HasilJalan[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((f) => /^K\d+-s\d+\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(`${folder}/${f}`, 'utf8')) as HasilJalan);
}

async function jalankan(s: Susunan, sampel: number): Promise<number> {
  const jalur = `${FOLDER_KALIBRASI}/${s.id}-s${String(sampel)}.json`;
  if (existsSync(jalur)) {
    console.error(`${jalur} sudah ada; kalibrasi yang sudah dibayar tidak diulang.`);
    return 1;
  }
  const { klien, biaya } = siapkanM2d6();
  const awalan = PAGU_BAGIAN_M2D6.kalibrasi.awalanTag;
  const hasil: HasilJalan = { susunan: s.id, sampel, ringkas: s.ringkas, soal: [], biaya_usd: 0, selesai: false };
  const simpan = (): void => writeFileSync(jalur, JSON.stringify(hasil, null, 2) + '\n', 'utf8');
  const model = s.penebak.map((p) => p.model);
  console.log(`${s.id} sampel ${String(sampel)} — ${s.ringkas}; pagu kalibrasi US$${PAGU_BAGIAN_M2D6.kalibrasi.usd.toFixed(2)} (terpakai US$${biaya.totalAwalan(awalan).toFixed(6)}).`);
  // Soal dijalankan serentak (paling banyak KONKURENSI_KALIBRASI); tiap soal tetap memakai gerbangTebak
  // lingkar apa adanya (tiga penebak berurutan). Pagu tetap ditegakkan: perkiraan panggilan yang sedang
  // berjalan dipesan di pencatat (`pagu.ts`).
  const per: Array<HasilSoal | null> = SOAL_KALIBRASI.map(() => null);
  let berhenti: number | null = null;
  let berikut = 0;
  const pekerja = async (): Promise<void> => {
    while (berhenti === null) {
      const i = berikut++;
      const soal = SOAL_KALIBRASI[i];
      if (soal === undefined) return;
      const o = muatSoal(soal);
      for (let coba = 1; coba <= 2 && berhenti === null && per[i] === null; coba++) try {
        const t = await gerbangTebak(o, {
          putaran: 1,
          omongan: soal.no,
          petunjuk: s.petunjuk,
          maxTokensKe: s.penebak.map((p) => p.maxTokens),
          tambahanBadanKe: s.penebak.map((p) => p.tambahanBadan),
          ambangPenalaranKe: s.penebak.map((p) => p.ambang),
          panggil: async (pesan, setelan, info) => {
            const slot = s.penebak[info.ke - 1] as SlotPenebak;
            const tag = `${awalan}${s.id}/s${String(sampel)}/${soal.id}/penebak/t${String(info.ke)}${info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : ''}`;
            const j = await chatBerpagu(
              klien,
              biaya,
              {
                model: slot.model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan,
                ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }),
              },
              tag,
              setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
            );
            console.log(`  ${tag}: ${String(j.penyedia)} penalaran ${String(j.token_penalaran)} ${String(j.finish_reason)} US$${j.biaya_usd.toFixed(6)}`);
            return j;
          },
        });
        const h = hasilSoal(soal, t, model);
        per[i] = h;
        console.log(`${soal.id} [${soal.kelompok}] kunci ${h.kunci}: ${h.tebakan.map((x) => `${x.pilihan}/${String(x.yakin)}${x.terbaca ? '' : '!'}`).join(' ')} → ${h.ditolak ? 'DITOLAK' : 'lolos'}`);
      } catch (galat) {
        // Galat penyedia (bukan pagu/saldo): soal itu diukur ulang SEKALI dari awal (tiga tebakan baru);
        // biaya percobaan yang gagal tetap di ledger. Galat kedua menghentikan jalan (tidak selesai).
        const g = ubahGalatSaldo(galat, 'penebak');
        console.error(`${soal.id} (percobaan ${String(coba)}): ${g instanceof Error ? `${g.name}: ${g.message}` : 'galat'}`);
        if (g instanceof PaguTercapai) berhenti ??= g.name === 'SaldoPenyediaHabis' ? 4 : 2;
        else if (coba === 2) berhenti ??= 1;
      }
      hasil.soal = per.filter((x): x is HasilSoal => x !== null);
      hasil.biaya_usd = hasil.soal.reduce((a, x) => a + x.biaya_usd, 0);
      simpan();
    }
  };
  await Promise.all(Array.from({ length: KONKURENSI_KALIBRASI }, () => pekerja()));
  if (berhenti !== null) return berhenti;
  hasil.selesai = true;
  simpan();
  const b = matriks([hasil])[0];
  console.log(`${s.id} s${String(sampel)}: bocor ditolak ${String(b?.bocor_ditolak)}/${String(b?.bocor_total)}, aman ditolak ${String(b?.aman_ditolak)}/${String(b?.aman_total)}, US$${hasil.biaya_usd.toFixed(6)}; kalibrasi terpakai US$${biaya.totalAwalan(awalan).toFixed(6)}.`);
  return 0;
}

async function utama(argumen: string[]): Promise<number> {
  mkdirSync(FOLDER_KALIBRASI, { recursive: true });
  if (argumen.includes('--matriks')) {
    const m = matriks(bacaSemuaJalan());
    const p = pilihSusunan(m);
    writeFileSync(`${FOLDER_KALIBRASI}/matriks.json`, JSON.stringify({ matriks: m, pilihan: p?.susunan ?? null }, null, 2) + '\n', 'utf8');
    for (const b of m) console.log(`${b.susunan} (${String(b.sampel)} sampel): bocor ditolak ${String(b.bocor_ditolak)}/${String(b.bocor_total)}, aman ditolak ${String(b.aman_ditolak)}/${String(b.aman_total)}, US$${b.biaya_usd.toFixed(4)} — ${b.ringkas}`);
    console.log(`Pilihan (aturan D-3): ${p?.susunan ?? '-'}`);
    return 0;
  }
  const i = argumen.indexOf('--sampel');
  const sampel = i >= 0 ? Number(argumen[i + 1]) : 1;
  const id = argumen.filter((a, j) => !a.startsWith('--') && argumen[j - 1] !== '--sampel');
  const pilih = SUSUNAN_KALIBRASI.filter((s) => id.includes(s.id));
  if (pilih.length === 0 || !Number.isInteger(sampel) || sampel < 1) {
    console.error(`Pakai: npm run penalar:kalibrasi -- <${SUSUNAN_KALIBRASI.map((s) => s.id).join('|')}…> [--sampel <n>] | --matriks`);
    return 1;
  }
  for (const s of pilih) {
    const k = await jalankan(s, sampel);
    if (k !== 0) return k;
  }
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penalar-kalibrasi.ts') === true) {
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
