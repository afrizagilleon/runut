/**
 * `npm run peran:susun -- <tirt|dada|ultj> --pagu-milestone 2.00 [--ulang]`
 * — jalankan lingkar agen BERPERAN (M2d-3 D-6) untuk satu paket, sungguhan.
 *
 * Keluaran di `eval/keluaran-m2d3/<paket>/`: `jejak-agen.json` (ditulis
 * sesudah SETIAP langkah), `riwayat.json` (keluaran mentah semua peran),
 * `draf-akhir.json` (draf terbit, atau `null` + alasan), `paket.json`.
 *
 * Dijaga kode:
 * - hanya dua model M2d-3 (`MODEL_M2D3`), model ditentukan `MODEL_PERAN`;
 * - pagu kumulatif `LLM_PAGU_USD` DAN pagu milestone (`--pagu-milestone`,
 *   wajib): biaya semua entri ledger bertag `m2d3/` + perkiraan maksimum
 *   panggilan berikutnya, dicek sebelum SETIAP kirim (`pagu.ts`);
 * - DADA dan ULTJ hanya dijalankan bila sisa pagu milestone ≥ US$0,80
 *   (kontrak D-6), dicek sebelum mulai;
 * - satu proses, panggilan berurutan; jalan yang sudah dibayar tidak diulang
 *   tanpa `--ulang`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { GENERASI_M2D3, MAKS_PUTARAN_PERAN, jalankanPeran, ringkasModelPenebak, type Generasi, type InfoPeran } from './agen-peran.ts';
import { AKAR, bacaKonfigLlm } from './env.ts';
import { PencatatJejak } from './jejak.ts';
import { GalatLlm } from './klien.ts';
import { MODEL_M2D3, MODEL_PERAN } from './model.ts';
import { JALUR_LEDGER, PencatatBiaya, SaldoPenyediaHabis, chatBerpagu, galatSaldo } from './pagu.ts';
import { DEFINISI_PAKET, bangunPaket, type IdPaket } from './paket.ts';
import { pesanPaket } from './susun.ts';
import { validasiDraf } from './validasi.ts';

export const FOLDER_M2D3 = `${AKAR}eval/keluaran-m2d3`;
export const AWALAN_TAG_M2D3 = 'm2d3/';
export const URUTAN_PERAN: readonly IdPaket[] = ['tirt', 'dada', 'ultj'];
/** Kontrak D-6: DADA dan ULTJ hanya bila sisa pagu milestone sesudah TIRT ≥ US$0,80. */
export const SISA_MINIMUM_PEMBANDING = 0.8;

export function tagPeran(paket: string, info: InfoPeran, awalan: string = AWALAN_TAG_M2D3): string {
  const o = info.omongan === null ? '' : `/o${String(info.omongan)}`;
  const ke = info.jenis === 'gerbang-tebak' ? `/t${String(info.ke)}` : '';
  const ulang = info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : '';
  return `${awalan}${paket}/p${String(info.putaran)}/${info.jenis}${o}${ke}${ulang}`;
}

/** Saldo/kredit penyedia habis → `SaldoPenyediaHabis` (lingkar berhenti seketika, tidak dicoba lagi); galat lain apa adanya. */
export function ubahGalatSaldo(galat: unknown, model: string): unknown {
  return galat instanceof GalatLlm && galatSaldo(galat.status, galat.message) ? new SaldoPenyediaHabis(galat.message, galat.status, model) : galat;
}

/** Satu milestone lingkar berperan: di mana keluarannya, tag ledgernya, generasinya, model yang boleh. */
export interface KonfigSusun {
  skrip: string;
  milestone: string;
  folder: string;
  awalanTag: string;
  generasi: Generasi;
  izinModel: readonly string[];
  urutan: readonly IdPaket[];
  /** Sisa pagu milestone minimum sebelum paket selain yang pertama; `null` = tidak ada syarat. */
  sisaMinimum: number | null;
  ringkasanPrompt: string;
}

export const KONFIG_M2D3: KonfigSusun = {
  skrip: 'peran:susun',
  milestone: 'M2d-3',
  folder: FOLDER_M2D3,
  awalanTag: AWALAN_TAG_M2D3,
  generasi: GENERASI_M2D3,
  izinModel: MODEL_M2D3,
  urutan: URUTAN_PERAN,
  sisaMinimum: SISA_MINIMUM_PEMBANDING,
  ringkasanPrompt:
    'Prompt penulis = aturan M2d-1 (factory/llm/prompt-susun.md) + tambahan lingkar berperan (factory/llm/prompt-penulis.md); ' +
    'kritikus: factory/llm/prompt-kritikus.md; peran: factory/llm/peran.md. Isi penuh terlacak di repo; di sini hanya hash.',
};

function simpan(jalur: string, isi: unknown): void {
  writeFileSync(jalur, JSON.stringify(isi, null, 2) + '\n', 'utf8');
}

function nilaiOpsi(argumen: readonly string[], nama: string): string | undefined {
  const i = argumen.indexOf(nama);
  return i >= 0 ? argumen[i + 1] : undefined;
}

/**
 * Kode keluar: 0 selesai (terbit atau tidak), 1 pemakaian/jalan sudah ada,
 * 2 pagu tercapai, 3 sisa pagu milestone kurang, 4 saldo penyedia habis.
 */
export async function jalankanSusun(k: KonfigSusun, argumen: string[]): Promise<number> {
  const id = argumen.find((a, i) => !a.startsWith('--') && argumen[i - 1] !== '--pagu-milestone') as IdPaket | undefined;
  const paguMilestone = Number(nilaiOpsi(argumen, '--pagu-milestone'));
  if (id === undefined || !k.urutan.includes(id) || !Number.isFinite(paguMilestone) || paguMilestone <= 0) {
    console.error(`Pakai: npm run ${k.skrip} -- <${k.urutan.join('|')}> --pagu-milestone <US$> [--ulang]`);
    return 1;
  }
  const folder = `${k.folder}/${id}`;
  if (existsSync(`${folder}/jejak-agen.json`) && !argumen.includes('--ulang')) {
    console.error(`${folder}/jejak-agen.json sudah ada; jalan yang sudah dibayar tidak diulang tanpa --ulang.`);
    return 1;
  }

  const konfig = bacaKonfigLlm();
  const biaya = new PencatatBiaya({
    paguUsd: konfig.paguUsd,
    jalurLedger: JALUR_LEDGER,
    paguMilestone: { usd: paguMilestone, awalanTag: k.awalanTag },
  });
  const awal = biaya.total();
  const awalMilestone = biaya.totalMilestone();
  const sisa = paguMilestone - awalMilestone;
  console.log(
    `Pagu kumulatif US$${konfig.paguUsd.toFixed(2)} (ledger US$${awal.toFixed(6)}); pagu milestone US$${paguMilestone.toFixed(2)} ` +
      `(terpakai US$${awalMilestone.toFixed(6)}, sisa US$${sisa.toFixed(6)}).`,
  );
  if (k.sisaMinimum !== null && id !== k.urutan[0] && sisa < k.sisaMinimum) {
    console.error(`Sisa pagu milestone US$${sisa.toFixed(4)} < US$${k.sisaMinimum.toFixed(2)}: ${id.toUpperCase()} tidak dijalankan (kontrak ${k.milestone}).`);
    return 3;
  }
  mkdirSync(folder, { recursive: true });
  const paket = bangunPaket(DEFINISI_PAKET[id]);
  simpan(`${folder}/paket.json`, paket);
  console.log(`Paket ${id.toUpperCase()}: ${String(paket.fakta.length)} fakta, ${String(paket.disingkirkan.length)} tersingkir.`);
  const klien = { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000 };

  const modelPeran = { ...MODEL_PERAN, penebak: ringkasModelPenebak(k.generasi) };
  const jejak = new PencatatJejak({
    paket,
    model: MODEL_PERAN.penulis,
    promptSistem: k.generasi.promptPenulis(),
    pesanPaket: pesanPaket(paket),
    ringkasanPrompt: k.ringkasanPrompt,
    jalur: `${folder}/jejak-agen.json`,
    versi: 2,
    dibuatOleh: 'factory/llm/agen-peran.ts',
    modelPeran,
  });

  const hasil = await jalankanPeran({
    paket,
    validasi: validasiDraf,
    jejak,
    generasi: k.generasi,
    panggil: async (pesan, setelan, info) => {
      if (!k.izinModel.includes(info.model)) throw new Error(`Model ${info.model} tidak diizinkan ${k.milestone}.`);
      const tag = tagPeran(id, info, k.awalanTag);
      let j;
      try {
        j = await chatBerpagu(
          klien,
          biaya,
          { model: info.model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan },
          tag,
        );
      } catch (galat) {
        throw ubahGalatSaldo(galat, info.model);
      }
      console.log(
        `  ${new Date().toISOString().slice(11, 19)} ${tag} [${info.peran}]: masuk ${String(j.token_masuk)} keluar ${String(j.token_keluar)} ` +
          `${String(j.finish_reason)} US$${j.biaya_usd.toFixed(6)} ${String(Math.round(j.latensi_ms / 100) / 10)} s; ` +
          `milestone US$${biaya.totalMilestone().toFixed(6)}`,
      );
      return j;
    },
  });

  simpan(`${folder}/riwayat.json`, hasil);
  simpan(`${folder}/draf-akhir.json`, {
    paket_id: id, model_peran: modelPeran, terbit: hasil.lolos, berhenti: hasil.berhenti, draf: hasil.draf,
  });
  const j = jejak.jejak();
  console.log(
    `${hasil.lolos ? 'TERBIT (lolos penuh)' : 'TIDAK TERBIT'} sesudah ${String(hasil.jumlah_putaran)} dari ${String(MAKS_PUTARAN_PERAN)} putaran` +
      `${hasil.berhenti === null ? '' : ` (${hasil.berhenti})`}; ${String(j.hasil?.panggilan ?? 0)} panggilan, ` +
      `US$${(j.hasil?.biaya_usd ?? 0).toFixed(6)} menurut jejak, US$${(biaya.total() - awal).toFixed(6)} menurut ledger; ` +
      `milestone US$${biaya.totalMilestone().toFixed(6)} dari US$${paguMilestone.toFixed(2)}.`,
  );
  for (const r of hasil.riwayat) {
    console.log(
      `  putaran ${String(r.putaran)} (tulis ${r.ditulis.join(',') || '-'}${r.dibawa.length > 0 ? `; bawa ${r.dibawa.join(',')}` : ''}): ` +
        r.omongan.map((o) => `${String(o.no)}=${o.status}`).join(' ') +
        (r.dibuang.length > 0 ? `; dibuang ${r.dibuang.map((d) => `${String(d.no)}:${d.fact_id}→${String(d.pengganti)}`).join(' ')}` : ''),
    );
  }
  if (hasil.berhenti?.includes('Saldo penyedia habis') === true) return 4;
  return hasil.berhenti?.startsWith('pagu tercapai') === true ? 2 : 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/peran-susun.ts') === true) {
  jalankanSusun(KONFIG_M2D3, process.argv.slice(2)).then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
