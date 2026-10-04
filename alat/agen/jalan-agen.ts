/**
 * Agen penulis ber-alat (M2d-18). Lingkarnya milik SDK (`ToolLoopAgent`, Vercel
 * AI SDK): MODEL yang memilih alat, membaca hasilnya, dan memutuskan langkah
 * berikutnya. Alat = kode yang sudah ada (`factory/llm/agen/alat.ts`).
 *
 * Kode hanya menjaga dari luar:
 * - penjaga biaya di `fetch`: panggilan model ditolak SEBELUM terkirim bila
 *   biaya percobaan (agen + gerbang) sudah mencapai pagu, atau pagu kumulatif
 *   akan terlampaui;
 * - batas langkah; berhenti saat bank memuat target sudut atau anggaran tak
 *   cukup untuk satu pengajuan lagi;
 * - PERCAKAPAN BARU per omongan (M2d-19): tiap percakapan berakhir saat satu
 *   omongan masuk bank, sesudah dua pengajuan ditolak, atau di batas langkah;
 *   pelajaran dibawa lewat alat `lihat_bank` (sudut yang pernah ditolak), bukan
 *   lewat riwayat yang terus memanjang;
 * - penyimpanan sementara prompt (prompt caching otomatis OpenRouter ke
 *   Anthropic, `cache_control` tingkat atas, TTL 1 jam): awalan yang sama
 *   dibayar sekitar 0,1 kali pada langkah berikutnya;
 * - jejak: `jejak-agen.jsonl` (tiap panggilan model + tiap panggilan alat,
 *   berurutan), `mentah-agen.jsonl` (permintaan/respons mentah agen),
 *   `mentah-panggilan.jsonl` (gerbang), `hasil.json`.
 *
 *   npm run agen -- --id <id> --pagu <usd> --setuju-berbayar [--paket <berkas>] [--target 1..3] [--langkah n]
 *   npm run agen -- --id <id> --pagu <usd> --setuju-berbayar --uji-ajukan <berkas omongan.json>
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { isStepCount, tool, ToolLoopAgent } from 'ai';
import { z } from 'zod';
import { buatAlat, CADANGAN_AJUKAN_USD, type PeristiwaAlat, type SudutDitolak } from '../../factory/llm/agen/alat.ts';
import { instruksiAgen } from '../../factory/llm/agen/prompt.ts';
import { bacaBank, FOLDER_BANK, pilihSimulasi, shaPaketBank, UKURAN_SIMULASI } from '../../factory/llm/bebas/bank.ts';
import { AKAR, bacaKonfigLlm } from '../../factory/llm/env.ts';
import { samarkan } from '../../factory/llm/klien.ts';
import { MODEL_OR_OPUS } from '../../factory/llm/model.ts';
import { BASE_URL_OPENROUTER } from '../../factory/llm/openrouter.ts';
import { PencatatBiaya } from '../../factory/llm/pagu.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { pagarPeranV2, periksaPenyedia } from '../../factory/llm/pemanggil-v2.ts';
import { AWALAN_TAG_PENYUSUN, biayaAwalan, jalurLedger } from '../penyusun/biaya.ts';
import { panggilV3 } from '../penyusun/pemanggil-v3.ts';

const PAKET_BAWAAN = 'eval/penyusun/m2d17-uji-2/paket.json';
/** Batas langkah SATU percakapan (satu omongan). */
const LANGKAH_BAWAAN = 14;
/** Pengajuan ditolak sebanyak ini: percakapan ditutup, mulai percakapan baru. */
const MAKS_DITOLAK_PER_PERCAKAPAN = 2;
/** Percakapan paling banyak per percobaan. */
const MAKS_PERCAKAPAN = 6;
/** Simpanan prompt 5 menit (bawaan): jeda antar panggilan terukur < 200 detik; TTL 1 jam bertarif tulis 2× dan memboroskan ±US$0,16 di M2d-19. */
const SIMPAN_PROMPT = { type: 'ephemeral' } as const;
/** Cadangan pagu kumulatif sebelum tiap panggilan model agen (USD). */
const CADANGAN_PANGGILAN_USD = 0.3;

const arg = (nama: string): string | null => {
  const i = process.argv.indexOf(nama);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
};
const bulat = (x: number): number => Math.round(x * 1e6) / 1e6;

const id = arg('--id');
if (id === null || !/^[a-z0-9-]{3,40}$/.test(id)) throw new Error('butuh --id <huruf kecil/angka/tanda hubung>');
if (!process.argv.includes('--setuju-berbayar')) throw new Error('percobaan ini berbayar; jalankan dengan --setuju-berbayar');
const pagu = Number(arg('--pagu'));
if (!Number.isFinite(pagu) || pagu <= 0) throw new Error('butuh --pagu <usd> (pagu percobaan ini: agen + gerbang)');
const target = Number(arg('--target') ?? UKURAN_SIMULASI);
if (!Number.isInteger(target) || target < 1 || target > UKURAN_SIMULASI) throw new Error(`--target harus 1–${String(UKURAN_SIMULASI)}`);
const maksLangkah = Number(arg('--langkah') ?? LANGKAH_BAWAAN);
const ujiAjukan = arg('--uji-ajukan');

const folder = `${AKAR}eval/penyusun/${id}`;
if (existsSync(folder)) throw new Error(`folder ${folder} sudah ada; pakai --id lain`);
const konfig = bacaKonfigLlm(AKAR);
if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak).');
const paket = JSON.parse(readFileSync(`${AKAR}${arg('--paket') ?? PAKET_BAWAAN}`, 'utf8')) as PaketFakta;
mkdirSync(folder, { recursive: true });
writeFileSync(`${folder}/paket.json`, `${JSON.stringify(paket, null, 2)}\n`, 'utf8');

const awalanTag = `${AWALAN_TAG_PENYUSUN}${id}/`;
const folderBank = `${AKAR}${FOLDER_BANK}`;
const rahasia = [konfig.apiKey];
const tulis = (berkas: string, baris: Record<string, unknown>): void => appendFileSync(`${folder}/${berkas}`, samarkan(JSON.stringify(baris), rahasia) + '\n', 'utf8');
const jejak = (baris: Record<string, unknown>): void => tulis('jejak-agen.jsonl', { waktu: new Date().toISOString(), ...baris });

const terpakaiPenyusun = biayaAwalan(AKAR, AWALAN_TAG_PENYUSUN);
const panggilGerbang = panggilV3({ akar: AKAR, paguMilestoneUsd: Math.round((terpakaiPenyusun + pagu + 0.01) * 1e4) / 1e4, awalanMilestone: AWALAN_TAG_PENYUSUN, log: (b) => console.log(b) })(awalanTag, pagu, `${folder}/mentah-panggilan.jsonl`);

/** Sudut yang ditolak gerbang berbayar di percobaan agen lain atas paket yang sama. */
function riwayatDitolak(): SudutDitolak[] {
  type N = { berhenti: string; alasan: string[]; omongan: { pesan: string; kartu_penentu: string[] } };
  const sha = shaPaketBank(paket);
  const hasil: SudutDitolak[] = [];
  const akar = `${AKAR}eval/penyusun`;
  for (const nama of readdirSync(akar).sort()) {
    const jp = `${akar}/${nama}/paket.json`;
    const jh = `${akar}/${nama}/hasil.json`;
    if (nama === id || !existsSync(jp) || !existsSync(jh)) continue;
    try {
      if (shaPaketBank(JSON.parse(readFileSync(jp, 'utf8')) as PaketFakta) !== sha) continue;
      const h = JSON.parse(readFileSync(jh, 'utf8')) as { nilai?: N[]; keadaan?: { nilai?: N[] } };
      for (const n of h.nilai ?? h.keadaan?.nilai ?? []) {
        if (['saringan', 'kartu', 'penebak-kuat', 'kritikus'].includes(n.berhenti)) hasil.push({ kartu_penentu: n.omongan.kartu_penentu, pesan: n.omongan.pesan, berhenti: n.berhenti, alasan: n.alasan.slice(0, 2) });
      }
    } catch {
      continue;
    }
  }
  return hasil;
}

let biayaAgen = 0;
const alat = buatAlat({
  paket, folderBank, idJalan: id, panggil: panggilGerbang, paguUsd: pagu, biayaAgen: () => biayaAgen, labelPenulis: `${MODEL_OR_OPUS} (agen ber-alat)`, target, riwayatDitolak: riwayatDitolak(),
  catat: (p: PeristiwaAlat) => {
    jejak({ jenis: 'alat', ...p });
    console.log(`  alat ${p.alat}: ${p.ringkas}`);
  },
});

if (ujiAjukan !== null) {
  const x = JSON.parse(readFileSync(`${AKAR}${ujiAjukan}`, 'utf8')) as { omongan?: unknown[] } | Record<string, unknown>;
  const calon = Array.isArray((x as { omongan?: unknown[] }).omongan) ? (x as { omongan: unknown[] }).omongan[0] : x;
  console.log(`Uji ajukan ${id}: satu omongan dari ${ujiAjukan} lewat gerbang berbayar; pagu US$${String(pagu)}; PID ${String(process.pid)}.`);
  const h = await alat.ajukan(calon);
  writeFileSync(`${folder}/hasil.json`, samarkan(JSON.stringify({ id, mode: 'uji-ajukan', sumber: ujiAjukan, hasil: h, keadaan: alat.keadaan() }, null, 2), rahasia), 'utf8');
  console.log(JSON.stringify({ lolos: h.lolos, berhenti: h.berhenti, penolakan: h.penolakan, biaya_usd: h.biaya_pengajuan_usd, bank: h.bank }, null, 1));
  process.exit(0);
}

const ledger = new PencatatBiaya({ paguUsd: konfig.paguUsd, jalurLedger: jalurLedger(AKAR), biayaNyata: true });
const totalAwal = ledger.total();
let panggilanModel = 0;
let percakapan = 0;
let sudutAwal = 0;
let ditolakAwal = 0;

/** `fetch` berpenjaga untuk panggilan model AGEN: tolak sebelum kirim, catat mentah, biaya nyata ke ledger. */
const fetchBerpenjaga: typeof fetch = async (masukan, init) => {
  const terpakai = alat.keadaan().biaya_total_usd;
  if (terpakai >= pagu) throw new Error(`penjaga: biaya percobaan US$${terpakai.toFixed(4)} ≥ pagu US$${String(pagu)}; panggilan tidak dikirim`);
  if (totalAwal + terpakai + CADANGAN_PANGGILAN_USD > konfig.paguUsd) throw new Error('penjaga: pagu kumulatif akan terlampaui; panggilan tidak dikirim');
  panggilanModel += 1;
  const ke = panggilanModel;
  const tag = `${awalanTag}agen/l${String(ke)}`;
  const badan = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null;
  const mulai = Date.now();
  const respons = await fetch(masukan, init);
  const teks = await respons.text();
  const latensi = Date.now() - mulai;
  let data: Record<string, unknown> | null = null;
  try {
    data = JSON.parse(teks) as Record<string, unknown>;
  } catch {
    data = null;
  }
  const usage = (data?.['usage'] ?? null) as { prompt_tokens?: number; completion_tokens?: number; cost?: number; completion_tokens_details?: { reasoning_tokens?: number }; prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number } } | null;
  const penyedia = typeof data?.['provider'] === 'string' ? (data['provider'] as string) : null;
  const dariSimpanan = usage?.prompt_tokens_details?.cached_tokens ?? null;
  const keSimpanan = usage?.prompt_tokens_details?.cache_write_tokens ?? null;
  const entri = ledger.catat(MODEL_OR_OPUS, tag, {
    percobaan: 1, status: respons.status, token_masuk: usage?.prompt_tokens ?? null, token_keluar: usage?.completion_tokens ?? null, latensi_ms: latensi,
    galat: respons.ok ? null : samarkan(teks.slice(0, 300), rahasia), mungkin_ditagih: respons.ok || respons.status >= 500,
    biaya_penyedia_usd: typeof usage?.cost === 'number' ? usage.cost : null, penyedia, token_penalaran: usage?.completion_tokens_details?.reasoning_tokens ?? null,
  }, CADANGAN_PANGGILAN_USD, { penalaran_diminta: { effort: 'medium', exclude: false } });
  biayaAgen += entri.biaya_usd;
  tulis('mentah-agen.jsonl', { ke, tag, waktu: new Date().toISOString(), status: respons.status, latensi_ms: latensi, permintaan: badan, respons: data ?? teks.slice(0, 2000) });
  const pesan = ((data?.['choices'] as Array<{ message?: { content?: string | null; reasoning?: string | null; tool_calls?: Array<{ function?: { name?: string } }> }; finish_reason?: string }> | undefined) ?? [])[0];
  jejak({
    jenis: 'model', ke, percakapan, status: respons.status, penyedia, token_masuk: usage?.prompt_tokens ?? null, token_dari_simpanan: dariSimpanan, token_ke_simpanan: keSimpanan, token_keluar: usage?.completion_tokens ?? null, token_penalaran: usage?.completion_tokens_details?.reasoning_tokens ?? null,
    biaya_usd: entri.biaya_usd, latensi_ms: latensi, finish: pesan?.finish_reason ?? null, penalaran: pesan?.message?.reasoning ?? null, teks: pesan?.message?.content ?? null,
    memanggil: (pesan?.message?.tool_calls ?? []).map((t) => t.function?.name ?? '?'),
  });
  console.log(`  model l${String(ke)}: HTTP ${String(respons.status)} masuk ${String(usage?.prompt_tokens ?? '-')} (simpanan baca ${String(dariSimpanan ?? '-')} tulis ${String(keSimpanan ?? '-')}) keluar ${String(usage?.completion_tokens ?? '-')} penalaran ${String(usage?.completion_tokens_details?.reasoning_tokens ?? '-')} US$${entri.biaya_usd.toFixed(4)} ${String(penyedia)} | total US$${alat.keadaan().biaya_total_usd.toFixed(4)}`);
  if (respons.ok) periksaPenyedia('penulis', penyedia);
  return new Response(teks, { status: respons.status, statusText: respons.statusText, headers: respons.headers });
};

const openrouter = createOpenRouter({ apiKey: konfig.apiKey, baseURL: konfig.baseUrl, fetch: fetchBerpenjaga });
const skemaOmongan = z.object({ omongan: z.record(z.string(), z.unknown()).describe('Satu objek omongan, bentuknya sama dengan contoh di petunjuk.') });

const agen = new ToolLoopAgent({
  model: openrouter(MODEL_OR_OPUS, { usage: { include: true }, provider: pagarPeranV2('penulis') as never, extraBody: { cache_control: SIMPAN_PROMPT } }),
  tools: {
    lihat_fakta: tool({ description: 'Semua kartu fakta hari simulasi. Gratis.', inputSchema: z.object({}), execute: () => alat.lihatFakta() }),
    lihat_bank: tool({ description: 'Omongan yang sudah lolos, kartu penentu yang sudah terpakai, dan sisa anggaran. Gratis.', inputSchema: z.object({}), execute: () => alat.lihatBank() }),
    periksa_kode: tool({ description: 'Periksa bentuk SATU draf omongan. Gratis. Mengembalikan penolakan apa adanya; kosong berarti lolos.', inputSchema: skemaOmongan, execute: ({ omongan }) => alat.periksaKode(omongan) }),
    ajukan: tool({ description: `Ajukan SATU draf ke gerbang berbayar (pembaca kartu, penebak tanpa kartu, kritikus). Yang lolos masuk bank. Butuh sisa anggaran minimal US$${String(CADANGAN_AJUKAN_USD)}.`, inputSchema: z.object({ id_draf: z.string().describe('id_draf dari periksa_kode yang lolos.') }), execute: ({ id_draf }) => alat.ajukan({ id_draf }) }),
  },
  stopWhen: [isStepCount(maksLangkah), () => alat.selesai() || alat.anggaranHabis() || alat.keadaan().jumlah_omongan > sudutAwal || alat.keadaan().ditolak - ditolakAwal >= MAKS_DITOLAK_PER_PERCAKAPAN],
  maxOutputTokens: 128_000,
  maxRetries: 2,
  providerOptions: { openrouter: { reasoning: { effort: 'medium', exclude: false } } },
});

console.log(`Agen ${id}: ${MODEL_OR_OPUS} @ anthropic lewat AI SDK; target ${String(target)} sudut; pagu US$${String(pagu)}; maks ${String(maksLangkah)} langkah per percakapan, ${String(MAKS_PERCAKAPAN)} percakapan; bank ${FOLDER_BANK}/${shaPaketBank(paket).slice(0, 12)}…; PID ${String(process.pid)}.`);
const mulai = Date.now();
let galat: string | null = null;
let teksAkhir = '';
let langkah = 0;
const ringkasPercakapan: Array<{ ke: number; langkah: number; sudut_sebelum: number; sudut_sesudah: number; ditolak: number; teks_akhir: string }> = [];
try {
  while (percakapan < MAKS_PERCAKAPAN && !alat.selesai() && !alat.anggaranHabis()) {
    percakapan += 1;
    sudutAwal = alat.keadaan().jumlah_omongan;
    ditolakAwal = alat.keadaan().ditolak;
    console.log(`- percakapan ${String(percakapan)} (bank ${String(sudutAwal)}/${String(target)}, sisa US$${String(alat.keadaan().sisa_anggaran_usd)})`);
    jejak({ jenis: 'percakapan', ke: percakapan, bank: sudutAwal });
    const hasil = await agen.generate({ prompt: instruksiAgen(target) });
    teksAkhir = hasil.text;
    langkah += hasil.steps.length;
    ringkasPercakapan.push({ ke: percakapan, langkah: hasil.steps.length, sudut_sebelum: sudutAwal, sudut_sesudah: alat.keadaan().jumlah_omongan, ditolak: alat.keadaan().ditolak - ditolakAwal, teks_akhir: hasil.text });
  }
} catch (g) {
  galat = samarkan(g instanceof Error ? `${g.name}: ${g.message}` : String(g), rahasia);
}

const k = alat.keadaan();
const bank = bacaBank(folderBank, shaPaketBank(paket));
const simulasi = pilihSimulasi(bank, paket);
const berhenti = galat !== null ? `galat: ${galat}` : alat.selesai() ? 'bank bisa dirakit menjadi simulasi' : alat.anggaranHabis() ? 'anggaran tidak cukup untuk satu pengajuan lagi' : percakapan >= MAKS_PERCAKAPAN ? 'batas percakapan' : 'agen berhenti sendiri';
const hasil = {
  id, model: MODEL_OR_OPUS, sdk: 'ai (ToolLoopAgent) + @openrouter/ai-sdk-provider', target, pagu_usd: pagu, berhenti, percakapan: ringkasPercakapan, langkah, panggilan_model: panggilanModel, pengajuan: k.pengajuan,
  biaya_agen_usd: bulat(biayaAgen), biaya_gerbang_usd: k.biaya_gerbang_usd, biaya_usd: k.biaya_total_usd, durasi_detik: Math.round((Date.now() - mulai) / 1000),
  bank: { jumlah_sudut: k.jumlah_sudut, omongan: bank.map((e) => ({ id: e.id, nama: e.omongan.nama, kartu_penentu: e.kartu_penentu, asal: e.asal.jalan })) },
  simulasi: { terbit: simulasi.draf !== null, dipilih: simulasi.dipilih, alasan: simulasi.alasan, draf: simulasi.draf },
  nilai: k.nilai, teks_akhir: teksAkhir,
};
writeFileSync(`${folder}/hasil.json`, samarkan(JSON.stringify(hasil, null, 2), rahasia), 'utf8');
console.log(`selesai (${berhenti}): ${String(panggilanModel)} panggilan model, ${String(k.pengajuan)} pengajuan, bank ${String(k.jumlah_sudut)}/${String(target)}, US$${k.biaya_total_usd.toFixed(4)} (agen ${biayaAgen.toFixed(4)} + gerbang ${k.biaya_gerbang_usd.toFixed(4)}), simulasi ${simulasi.draf !== null ? 'TERBIT' : 'belum'}`);
console.log(`berkas: ${folder}/hasil.json · jejak-agen.jsonl · mentah-agen.jsonl · mentah-panggilan.jsonl`);
