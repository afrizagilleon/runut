/**
 * `npm run kalibrasi:susun` — SATU jalan TIRT dengan gerbang terkalibrasi
 * (kontrak M2d-8 D-4, pra-registrasi §8). Keluaran
 * `eval/keluaran-m2d8/jalan/tirt/`: `jejak-agen.json`, `riwayat.json`,
 * `draf-akhir.json`, `paket.json`.
 *
 * Lingkar = lingkar pengecoh M2d-7 (penulis dipecah, bank pengecoh, umpan
 * balik beralternatif) dengan:
 * - setelan tumpukan hasil kalibrasi (`SETELAN_KALIBRASI_M2D8`, dites sama
 *   dengan `putusanKalibrasi(mentah.json)`): kode yang diturunkan dan gerbang
 *   "dicatat" tetap dijalankan dan dicatat, tidak menolak;
 * - penalar GLM `effort: "high"` (`PENALAR_M2D8`);
 * - validator `validasiM2d8` (pengecualian "kabar buruk" M2d-5 untuk
 *   `KATA_PENILAIAN`, sama dengan kalibrasi).
 * Dijaga kode: dua model; pagar M2d-7; pagu = sisa pagu milestone US$2,30 +
 * pagu kumulatif; jalan yang sudah ada tidak diulang (satu jalan).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { GENERASI_M2D7, MAKS_PUTARAN_PENGECOH, jalankanPengecoh, promptPenulisPengecoh, type GenerasiPengecoh } from './agen-pengecoh.ts';
import type { InfoPeran } from './agen-peran.ts';
import { AWALAN_TAG_JALAN_M2D8, FOLDER_M2D8, PAGU_MILESTONE_M2D8, siapkanM2d8 } from './kalibrasi-konfig.ts';
import { aturanPenebak, maksKataResmi, rasioKeseimbangan, yakinPilihanSaja, type SetelanGerbangM2d8 } from './kalibrasi-setelan.ts';
import { validasiM2d8 } from './kalibrasi-soal.ts';
import { PencatatJejak } from './jejak.ts';
import { MODEL_DUA } from './model.ts';
import { chatBerpagu } from './pagu.ts';
import { DEFINISI_PAKET, bangunPaket } from './paket.ts';
import { PENALAR_M2D8, badanUpaya } from './penalaran.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import { pesanPaket } from './susun.ts';

export const FOLDER_JALAN_M2D8 = `${FOLDER_M2D8}/jalan`;
export const FOLDER_TIRT_M2D8 = `${FOLDER_JALAN_M2D8}/tirt`;

/**
 * Setelan tumpukan hasil kalibrasi D-2 (`eval/keluaran-m2d8/kalibrasi/setelan.json`
 * = `putusanKalibrasi(mentah.json)`, dites sama). Diisi dari keluaran kalibrasi,
 * tidak disetel tangan.
 */
export const SETELAN_KALIBRASI_M2D8: SetelanGerbangM2d8 = {
  // 5 soal manusia terukur (ULTJ s3 berhenti di pagu), 0 bocor. Langkah: kode G-register, ANDAIAN_DI_PENJELASAN,
  // PENJELASAN_TANPA_PENENTU → dicatat; penebak → 3/3; kritikus → tingkat 1; pembaca kartu → tingkat 1 lalu "dicatat"
  // (ULTJ riwayat-dividen: pembaca memilih b, kunci a).
  tingkat: { penebak: 2, pilihan_saja: 0, meresmikan: 0, keseimbangan: 0, kritikus: 1, kartu: 1 },
  dicatat: ['kartu'],
  kode_dicatat: ['G-register', 'ANDAIAN_DI_PENJELASAN', 'PENJELASAN_TANPA_PENENTU'],
};

/** Generasi M2d-8: generasi M2d-7 + penalar "high" + setelan kalibrasi. Murni. */
export function generasiM2d8(s: SetelanGerbangM2d8): GenerasiPengecoh {
  const k = PENALAR_M2D8.kritikus;
  const p = PENALAR_M2D8.penebakGlm;
  return {
    ...GENERASI_M2D7,
    nama: 'm2d8',
    penebak: { ...GENERASI_M2D7.penebak, maxTokens: p.maxTokens, tambahanBadan: badanUpaya(p), ambang: p.ambang },
    kritikus: { maxTokens: k.maxTokens, tambahanBadan: badanUpaya(k), ambang: k.ambang },
    ambang: { rasio: rasioKeseimbangan(s), maksKata: maksKataResmi(s), pilihanSajaYakin: yakinPilihanSaja(s), penebakYakin: aturanPenebak(s) === 'k05' },
    kalibrasi: s,
  };
}

export const GENERASI_M2D8: GenerasiPengecoh = generasiM2d8(SETELAN_KALIBRASI_M2D8);

/** Tag ledger satu panggilan jalan TIRT M2d-8. */
export function tagJalanM2d8(info: Pick<InfoPeran, 'jenis' | 'putaran' | 'omongan' | 'ke' | 'ulang'>): string {
  const o = info.omongan === null ? '' : `/o${String(info.omongan)}`;
  const ke = info.jenis === 'gerbang-tebak' || info.jenis === 'gerbang-pilihan-saja' ? `/t${String(info.ke)}` : '';
  const ulang = info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : '';
  return `${AWALAN_TAG_JALAN_M2D8}tirt/p${String(info.putaran)}/${info.jenis}${o}${ke}${ulang}`;
}

function simpan(jalur: string, isi: unknown): void {
  writeFileSync(jalur, JSON.stringify(isi, null, 2) + '\n', 'utf8');
}

async function utama(): Promise<number> {
  if (existsSync(`${FOLDER_TIRT_M2D8}/jejak-agen.json`)) {
    console.error(`${FOLDER_TIRT_M2D8}/jejak-agen.json sudah ada; M2d-8 hanya SATU jalan TIRT (pra-registrasi §8).`);
    return 1;
  }
  const { klien, biaya } = siapkanM2d8();
  mkdirSync(FOLDER_TIRT_M2D8, { recursive: true });
  const paket = bangunPaket(DEFINISI_PAKET.tirt);
  simpan(`${FOLDER_TIRT_M2D8}/paket.json`, paket);
  const gen = GENERASI_M2D8;
  console.log(`Pagu milestone US$${PAGU_MILESTONE_M2D8.toFixed(2)} (terpakai US$${biaya.totalMilestone().toFixed(6)}); setelan ${JSON.stringify(gen.kalibrasi)}.`);
  const modelPeran = { ...gen.model, penebak: gen.penebak.model.join(' + '), 'pilihan-saja': gen.modelPilihanSaja };
  const jejak = new PencatatJejak({
    paket, model: gen.model.penulis, promptSistem: promptPenulisPengecoh(), pesanPaket: pesanPaket(paket),
    ringkasanPrompt:
      'Penulis dipecah (M2d-7): factory/llm/prompt-penulis-pesan.md, prompt-penulis-pilihan.md, prompt-penulis-penjelasan.md; bank pengecoh: factory/llm/bank-pengecoh.ts; ' +
      'setelan tumpukan M2d-8: factory/llm/kalibrasi-susun.ts (SETELAN_KALIBRASI_M2D8); kritikus: factory/llm/prompt-kritikus-makna.md; penebak: PETUNJUK_PENEBAK_TAJAM. Di sini hanya hash.',
    jalur: `${FOLDER_TIRT_M2D8}/jejak-agen.json`, versi: 2, dibuatOleh: 'factory/llm/agen-pengecoh.ts', modelPeran,
  });
  const awal = biaya.totalMilestone();
  const hasil = await jalankanPengecoh({
    paket,
    validasi: validasiM2d8,
    jejak,
    generasi: gen,
    panggil: async (pesan, setelan, info) => {
      if (!MODEL_DUA.includes(info.model)) throw new Error(`Model ${info.model} tidak diizinkan M2d-8.`);
      const tag = tagJalanM2d8(info);
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
      console.log(
        `  ${new Date().toISOString().slice(11, 19)} ${tag}: keluar ${String(j.token_keluar)} ${String(j.finish_reason)} US$${j.biaya_usd.toFixed(6)} ${String(j.penyedia)}` +
          `${setelan.ambangPenalaran === undefined ? '' : ` penalaran ${String(j.token_penalaran)}/${String(setelan.ambangPenalaran)}`}; milestone US$${biaya.totalMilestone().toFixed(4)}`,
      );
      return j;
    },
  });
  simpan(`${FOLDER_TIRT_M2D8}/riwayat.json`, hasil);
  simpan(`${FOLDER_TIRT_M2D8}/draf-akhir.json`, { paket_id: 'tirt', jalan: 1, model_peran: modelPeran, setelan: gen.kalibrasi, terbit: hasil.lolos, berhenti: hasil.berhenti, draf: hasil.draf });
  console.log(
    `${hasil.lolos ? 'TERBIT' : 'TIDAK TERBIT'} sesudah ${String(hasil.jumlah_putaran)} dari ${String(MAKS_PUTARAN_PENGECOH)} putaran` +
      `${hasil.berhenti === null ? '' : ` (${hasil.berhenti})`}; jalan ini US$${(biaya.totalMilestone() - awal).toFixed(6)}; milestone US$${biaya.totalMilestone().toFixed(6)}.`,
  );
  for (const r of hasil.riwayat) {
    console.log(`  putaran ${String(r.putaran)}: ${r.omongan.map((o) => `${String(o.no)}=${o.status}`).join(' ')}${r.dibuang.length > 0 ? `; dibuang ${r.dibuang.map((d) => `${String(d.no)}:${d.fact_id}→${String(d.pengganti)}`).join(' ')}` : ''}`);
  }
  if (hasil.berhenti?.includes('Saldo penyedia habis') === true) return 4;
  return hasil.berhenti?.startsWith('pagu tercapai') === true ? 2 : 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/kalibrasi-susun.ts') === true) {
  utama().then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
