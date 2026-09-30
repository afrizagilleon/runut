/**
 * `npm run pengecoh:susun -- --jalan <1|2>` — lingkar PENGECOH M2d-7 untuk
 * TIRT, sungguhan (kontrak D-7). Keluaran `eval/keluaran-m2d7/jalan-<n>/tirt/`:
 * `jejak-agen.json` (ditulis sesudah setiap langkah), `riwayat.json`,
 * `draf-akhir.json`, `paket.json`.
 *
 * Dijaga kode:
 * - hanya dua model OpenRouter; pagar M2d-7 (`pagarM2d7`);
 * - pagu milestone US$3,00 atas SEMUA tag `m2d7/` + pagu bagian jalan 1
 *   US$1,10 (`pengecoh-konfig.ts`) + pagu kumulatif `LLM_PAGU_USD`, dicek
 *   sebelum SETIAP kirim;
 * - paling banyak dua jalan; **jalan 2 hanya bila jalan 1 sudah selesai dan
 *   TIDAK terbit** (pra-registrasi D-0: tidak ada pemilihan draf terbaik dari
 *   beberapa jalan yang terbit); jalan yang sudah ada tidak diulang.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GENERASI_M2D7, MAKS_PUTARAN_PENGECOH, jalankanPengecoh, promptPenulisPengecoh } from './agen-pengecoh.ts';
import type { InfoPeran } from './agen-peran.ts';
import { PencatatJejak } from './jejak.ts';
import { MODEL_DUA } from './model.ts';
import { chatBerpagu } from './pagu.ts';
import { DEFINISI_PAKET, bangunPaket } from './paket.ts';
import { AWALAN_TAG_M2D7, FOLDER_M2D7, MAKS_JALAN_M2D7, PAGU_MILESTONE_M2D7, siapkanM2d7 } from './pengecoh-konfig.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import { pesanPaket } from './susun.ts';
import { validasiDraf } from './validasi.ts';

export function folderJalanM2d7(n: number): string {
  return `${FOLDER_M2D7}/jalan-${String(n)}/tirt`;
}

/** Tag ledger satu panggilan lingkar pengecoh. */
export function tagPengecoh(jalan: number, info: Pick<InfoPeran, 'jenis' | 'putaran' | 'omongan' | 'ke' | 'ulang'>): string {
  const o = info.omongan === null ? '' : `/o${String(info.omongan)}`;
  const ke = info.jenis === 'gerbang-tebak' || info.jenis === 'gerbang-pilihan-saja' ? `/t${String(info.ke)}` : '';
  const ulang = info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : '';
  return `${AWALAN_TAG_M2D7}jalan-${String(jalan)}/tirt/p${String(info.putaran)}/${info.jenis}${o}${ke}${ulang}`;
}

/** Boleh menjalankan jalan `n`? `null` = boleh; teks = alasan tidak. */
export function bolehJalan(n: number, folder: (x: number) => string = folderJalanM2d7): string | null {
  if (!Number.isInteger(n) || n < 1 || n > MAKS_JALAN_M2D7) return `M2d-7 paling banyak ${String(MAKS_JALAN_M2D7)} jalan penuh (--jalan 1 atau 2).`;
  if (existsSync(`${folder(n)}/jejak-agen.json`)) return `${folder(n)}/jejak-agen.json sudah ada; jalan yang sudah dibayar tidak diulang.`;
  if (n === 2) {
    const d = `${folder(1)}/draf-akhir.json`;
    if (!existsSync(d)) return 'Jalan 2 hanya sesudah jalan 1 selesai.';
    const a = JSON.parse(readFileSync(d, 'utf8')) as { terbit: boolean };
    if (a.terbit) return 'Jalan 1 sudah terbit: jalan 2 tidak dijalankan (pra-registrasi D-0).';
  }
  return null;
}

function simpan(jalur: string, isi: unknown): void {
  writeFileSync(jalur, JSON.stringify(isi, null, 2) + '\n', 'utf8');
}

async function utama(argumen: string[]): Promise<number> {
  const i = argumen.indexOf('--jalan');
  const jalan = i >= 0 ? Number(argumen[i + 1]) : NaN;
  const tidak = bolehJalan(jalan);
  if (tidak !== null) {
    console.error(tidak);
    return 1;
  }
  const { klien, biaya } = siapkanM2d7();
  const folder = folderJalanM2d7(jalan);
  mkdirSync(folder, { recursive: true });
  const paket = bangunPaket(DEFINISI_PAKET.tirt);
  simpan(`${folder}/paket.json`, paket);
  console.log(`Pagu milestone US$${PAGU_MILESTONE_M2D7.toFixed(2)} (terpakai US$${biaya.totalMilestone().toFixed(6)}); paket TIRT ${String(paket.fakta.length)} fakta.`);
  const gen = GENERASI_M2D7;
  const modelPeran = { ...gen.model, penebak: gen.penebak.model.join(' + '), 'pilihan-saja': gen.modelPilihanSaja };
  const jejak = new PencatatJejak({
    paket, model: gen.model.penulis, promptSistem: promptPenulisPengecoh(), pesanPaket: pesanPaket(paket),
    ringkasanPrompt:
      'Penulis dipecah: factory/llm/prompt-penulis-pesan.md, prompt-penulis-pilihan.md, prompt-penulis-penjelasan.md; bank pengecoh: factory/llm/bank-pengecoh.ts; ' +
      'gerbang artefak: factory/llm/gerbang-artefak.ts; kritikus: factory/llm/prompt-kritikus-makna.md; penebak: PETUNJUK_PENEBAK_TAJAM (factory/llm/agen-peran.ts). Di sini hanya hash.',
    jalur: `${folder}/jejak-agen.json`, versi: 2, dibuatOleh: 'factory/llm/agen-pengecoh.ts', modelPeran,
  });
  const awal = biaya.totalMilestone();
  const hasil = await jalankanPengecoh({
    paket,
    validasi: validasiDraf,
    jejak,
    generasi: gen,
    panggil: async (pesan, setelan, info) => {
      if (!MODEL_DUA.includes(info.model)) throw new Error(`Model ${info.model} tidak diizinkan M2d-7.`);
      const tag = tagPengecoh(jalan, info);
      let j;
      try {
        j = await chatBerpagu(
          klien,
          biaya,
          {
            model: info.model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan,
            ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }),
          },
          tag,
          setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
        );
      } catch (galat) {
        throw ubahGalatSaldo(galat, info.model);
      }
      console.log(
        `  ${new Date().toISOString().slice(11, 19)} ${tag}: keluar ${String(j.token_keluar)} ${String(j.finish_reason)} US$${j.biaya_usd.toFixed(6)} ` +
          `${String(j.penyedia)}${setelan.ambangPenalaran === undefined ? '' : ` penalaran ${String(j.token_penalaran)}/${String(setelan.ambangPenalaran)}`}; milestone US$${biaya.totalMilestone().toFixed(4)}`,
      );
      return j;
    },
  });
  simpan(`${folder}/riwayat.json`, hasil);
  simpan(`${folder}/draf-akhir.json`, { paket_id: 'tirt', jalan, model_peran: modelPeran, terbit: hasil.lolos, berhenti: hasil.berhenti, draf: hasil.draf });
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

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/pengecoh-susun.ts') === true) {
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
