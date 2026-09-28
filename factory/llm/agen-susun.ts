/**
 * `npm run agen:susun -- <tirt|dada|ultj> [--ulang]` — jalankan lingkar agen
 * (M2d-2 D-5) untuk satu paket fakta, sungguhan, di bawah pagu.
 *
 * Keluaran di `eval/keluaran-m2d2/<paket>/`:
 * - `jejak-agen.json` — jejak nyata (D-4), ditulis sesudah SETIAP langkah;
 * - `draf-akhir.json` — draf yang lolos semua gerbang (atau `null` + alasan);
 * - `riwayat.json` — keluaran mentah: teks penyusun tiap putaran, jawaban
 *   mentah tiap penebak/pembaca kartu, masalah validator, umpan balik;
 * - `paket.json` — paket fakta yang dipakai.
 *
 * Semua panggilan berurutan lewat `chatBerpagu` (pagu dicek sebelum SETIAP
 * kirim, ledger kumulatif `.cache/llm/ledger.jsonl`), hanya ke model agen.
 * Paket yang keluarannya sudah ada ditolak kecuali `--ulang`, supaya jalan
 * yang sudah dibayar tidak terulang tanpa sengaja. Draf TIDAK dipasang ke
 * produk.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { MAKS_PUTARAN, jalankanAgen, promptAgen } from './agen.ts';
import { AKAR, bacaKonfigLlm } from './env.ts';
import { PencatatJejak, sha256 } from './jejak.ts';
import { MODEL_AGEN } from './model.ts';
import { JALUR_LEDGER, PencatatBiaya, chatBerpagu } from './pagu.ts';
import { DEFINISI_PAKET, bangunPaket, type IdPaket } from './paket.ts';
import { pesanPaket } from './susun.ts';
import { validasiDraf } from './validasi.ts';
import type { InfoPanggil } from './gerbang-tebak.ts';

export const FOLDER_M2D2 = `${AKAR}eval/keluaran-m2d2`;
export const URUTAN_AGEN: readonly IdPaket[] = ['tirt', 'dada', 'ultj'];

export function tagPanggil(paket: string, info: InfoPanggil): string {
  const o = info.omongan === null ? '' : `/o${String(info.omongan)}`;
  const ke = info.jenis === 'gerbang-tebak' ? `/t${String(info.ke)}` : '';
  const ulang = info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : '';
  return `agen/${paket}/p${String(info.putaran)}/${info.jenis}${o}${ke}${ulang}`;
}

function simpan(jalur: string, isi: unknown): void {
  writeFileSync(jalur, JSON.stringify(isi, null, 2) + '\n', 'utf8');
}

async function utama(argumen: string[]): Promise<number> {
  const id = argumen.find((a) => !a.startsWith('--')) as IdPaket | undefined;
  if (id === undefined || !URUTAN_AGEN.includes(id)) {
    console.error(`Pakai: npm run agen:susun -- <${URUTAN_AGEN.join('|')}> [--ulang]`);
    return 1;
  }
  const folder = `${FOLDER_M2D2}/${id}`;
  if (existsSync(`${folder}/jejak-agen.json`) && !argumen.includes('--ulang')) {
    console.error(`${folder}/jejak-agen.json sudah ada; jalan yang sudah dibayar tidak diulang tanpa --ulang.`);
    return 1;
  }
  mkdirSync(folder, { recursive: true });

  const paket = bangunPaket(DEFINISI_PAKET[id]);
  simpan(`${folder}/paket.json`, paket);
  const m2d1 = `${AKAR}eval/keluaran-m2d/paket/${id}.json`;
  const sama = existsSync(m2d1) && sha256(readFileSync(m2d1, 'utf8')) === sha256(readFileSync(`${folder}/paket.json`, 'utf8'));
  console.log(
    `Paket ${id.toUpperCase()}: ${String(paket.fakta.length)} fakta, ${String(paket.disingkirkan.length)} tersingkir, ` +
      `${String(paket.pemeriksaan.aturan_dijalankan)} aturan R dijalankan; sama persis dengan paket M2d-1: ${sama ? 'ya' : 'TIDAK'}.`,
  );

  const konfig = bacaKonfigLlm();
  const biaya = new PencatatBiaya({ paguUsd: konfig.paguUsd, jalurLedger: JALUR_LEDGER });
  const awal = biaya.total();
  console.log(`Model ${MODEL_AGEN}; pagu US$${konfig.paguUsd.toFixed(2)}; akumulasi ledger sebelum mulai US$${awal.toFixed(6)}.`);
  const klien = { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000 };

  const jejak = new PencatatJejak({
    paket,
    model: MODEL_AGEN,
    promptSistem: promptAgen(),
    pesanPaket: pesanPaket(paket),
    ringkasanPrompt:
      'Prompt sistem = aturan penulisan M2d-1 (factory/llm/prompt-susun.md) + tambahan lingkar agen ' +
      '(factory/llm/prompt-agen.md); pesan pengguna = paket fakta terverifikasi. Isi penuh terlacak di repo; di sini hanya hash.',
    jalur: `${folder}/jejak-agen.json`,
  });

  const hasil = await jalankanAgen({
    paket,
    validasi: validasiDraf,
    jejak,
    panggil: async (pesan, setelan, info) => {
      const tag = tagPanggil(id, info);
      const j = await chatBerpagu(klien, biaya, { model: MODEL_AGEN, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan }, tag);
      console.log(
        `  ${tag}: masuk ${String(j.token_masuk)} keluar ${String(j.token_keluar)} US$${j.biaya_usd.toFixed(6)} ` +
          `${String(Math.round(j.latensi_ms / 100) / 10)} s; akumulasi US$${biaya.total().toFixed(6)}`,
      );
      return j;
    },
  });

  simpan(`${folder}/riwayat.json`, hasil);
  simpan(`${folder}/draf-akhir.json`, { paket_id: id, model: MODEL_AGEN, lolos: hasil.lolos, berhenti: hasil.berhenti, draf: hasil.draf });
  const j = jejak.jejak();
  console.log(
    `${hasil.lolos ? 'LOLOS' : 'TIDAK LOLOS'} sesudah ${String(hasil.jumlah_putaran)} dari ${String(MAKS_PUTARAN)} putaran` +
      `${hasil.berhenti === null ? '' : ` (${hasil.berhenti})`}; ${String(j.hasil?.panggilan ?? 0)} panggilan, ` +
      `US$${(j.hasil?.biaya_usd ?? 0).toFixed(6)} menurut jejak, US$${(biaya.total() - awal).toFixed(6)} menurut ledger; ` +
      `akumulasi ledger US$${biaya.total().toFixed(6)} dari pagu US$${konfig.paguUsd.toFixed(2)}.`,
  );
  for (const r of hasil.riwayat) {
    console.log(`  putaran ${String(r.putaran)} (${r.jenis}, omongan ${r.diminta.join(',')}): ${r.omongan.map((o) => `${String(o.no)}=${o.status}`).join(' ')}`);
  }
  return hasil.berhenti?.startsWith('pagu tercapai') === true ? 2 : 0;
}

if (process.argv[1]?.endsWith('agen-susun.ts') === true) {
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
