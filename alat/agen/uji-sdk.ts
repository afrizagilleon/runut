/**
 * Uji kecil SDK agen (M2d-18, 3 Okt 2026): SATU agen penulis dengan SATU alat.
 *
 * Yang diuji: apakah Vercel AI SDK (`ai`) + `@openrouter/ai-sdk-provider`
 * bisa menjalankan Opus 5.5 yang BERPIKIR sambil MEMANGGIL ALAT beberapa
 * giliran lewat OpenRouter — penyedia dikunci ke Anthropic, tanpa
 * `temperature`, blok penalaran dipertahankan antar giliran.
 *
 * Lingkarnya milik SDK (`ToolLoopAgent`): model yang memutuskan kapan
 * memanggil `periksa_kode` dan kapan berhenti. Kode hanya menjaga:
 * - batas langkah (`isStepCount`);
 * - penjaga biaya di `fetch`: panggilan DITOLAK sebelum terkirim bila biaya
 *   jalan ini sudah mencapai batas, atau pagu kumulatif akan terlampaui;
 * - catatan: tiap permintaan (tanpa header) dan respons mentah ditulis ke
 *   `mentah-agen.jsonl`; biaya nyata (`usage.cost`) masuk ledger.
 *
 *   node --experimental-strip-types alat/agen/uji-sdk.ts --id <id> --setuju-berbayar
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { isStepCount, tool, ToolLoopAgent } from 'ai';
import { z } from 'zod';
import { periksaKodeV3, promptPenulisV3 } from '../../factory/llm/bebas/prompt-v3.ts';
import { uraiOmonganBebas } from '../../factory/llm/bebas/skema.ts';
import { AKAR, bacaKonfigLlm } from '../../factory/llm/env.ts';
import { samarkan } from '../../factory/llm/klien.ts';
import { MODEL_OR_OPUS } from '../../factory/llm/model.ts';
import { BASE_URL_OPENROUTER } from '../../factory/llm/openrouter.ts';
import { PencatatBiaya } from '../../factory/llm/pagu.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { pagarPeranV2, periksaPenyedia } from '../../factory/llm/pemanggil-v2.ts';
import { jalurLedger } from '../penyusun/biaya.ts';

/** Panggilan baru ditolak bila biaya jalan ini sudah mencapai angka ini (USD). */
const BATAS_JALAN_USD = 0.2;
/** Cadangan yang harus tersisa di pagu kumulatif sebelum tiap panggilan (USD). */
const CADANGAN_PANGGILAN_USD = 0.3;
const MAKS_LANGKAH = 4;
const JALUR_PAKET = 'eval/penyusun/m2d17-uji-2/paket.json';

const arg = (nama: string): string | null => {
  const i = process.argv.indexOf(nama);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
};

const id = arg('--id');
if (id === null || !/^[a-z0-9-]{3,40}$/.test(id)) throw new Error('butuh --id <huruf kecil/angka/tanda hubung>');
if (!process.argv.includes('--setuju-berbayar')) throw new Error('uji ini berbayar; jalankan dengan --setuju-berbayar');
const folder = `${AKAR}eval/penyusun/${id}`;
if (existsSync(folder)) throw new Error(`folder ${folder} sudah ada; pakai --id lain`);
mkdirSync(folder, { recursive: true });
const jalurMentah = `${folder}/mentah-agen.jsonl`;

const konfig = bacaKonfigLlm(AKAR);
if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak).');
const paket = JSON.parse(readFileSync(`${AKAR}${JALUR_PAKET}`, 'utf8')) as PaketFakta;
const awalanTag = `penyusun/${id}/`;
const biaya = new PencatatBiaya({ paguUsd: konfig.paguUsd, jalurLedger: jalurLedger(AKAR), biayaNyata: true });

let ke = 0;
let biayaJalan = 0;
const tulisMentah = (baris: Record<string, unknown>): void => appendFileSync(jalurMentah, samarkan(JSON.stringify(baris), [konfig.apiKey]) + '\n', 'utf8');

/** `fetch` berpenjaga: tolak sebelum kirim, catat permintaan + respons mentah, catat biaya nyata. */
const fetchBerpenjaga: typeof fetch = async (masukan, init) => {
  if (biayaJalan >= BATAS_JALAN_USD) throw new Error(`penjaga: biaya jalan US$${biayaJalan.toFixed(4)} ≥ batas US$${String(BATAS_JALAN_USD)}; panggilan tidak dikirim`);
  if (biaya.total() + CADANGAN_PANGGILAN_USD > konfig.paguUsd) throw new Error('penjaga: pagu kumulatif akan terlampaui; panggilan tidak dikirim');
  ke += 1;
  const tag = `${awalanTag}l${String(ke)}/agen-penulis`;
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
  const usage = (data?.['usage'] ?? null) as { prompt_tokens?: number; completion_tokens?: number; cost?: number; completion_tokens_details?: { reasoning_tokens?: number } } | null;
  const penyedia = typeof data?.['provider'] === 'string' ? (data['provider'] as string) : null;
  const entri = biaya.catat(MODEL_OR_OPUS, tag, {
    percobaan: 1, status: respons.status, token_masuk: usage?.prompt_tokens ?? null, token_keluar: usage?.completion_tokens ?? null, latensi_ms: latensi,
    galat: respons.ok ? null : samarkan(teks.slice(0, 300), [konfig.apiKey]), mungkin_ditagih: respons.ok || respons.status >= 500,
    biaya_penyedia_usd: typeof usage?.cost === 'number' ? usage.cost : null, penyedia, token_penalaran: usage?.completion_tokens_details?.reasoning_tokens ?? null,
  }, CADANGAN_PANGGILAN_USD);
  biayaJalan += entri.biaya_usd;
  tulisMentah({ ke, tag, waktu: new Date().toISOString(), status: respons.status, latensi_ms: latensi, permintaan: badan, respons: data ?? teks.slice(0, 2000) });
  console.log(`  ${tag}: HTTP ${String(respons.status)} masuk ${String(usage?.prompt_tokens ?? '-')} keluar ${String(usage?.completion_tokens ?? '-')} penalaran ${String(usage?.completion_tokens_details?.reasoning_tokens ?? '-')} US$${entri.biaya_usd.toFixed(6)} ${String(penyedia)}`);
  if (respons.ok) periksaPenyedia('penulis', penyedia);
  return new Response(teks, { status: respons.status, statusText: respons.statusText, headers: respons.headers });
};

const openrouter = createOpenRouter({ apiKey: konfig.apiKey, baseURL: konfig.baseUrl, fetch: fetchBerpenjaga });

let periksaKe = 0;
const periksaKode = tool({
  description: 'Periksa SATU draf omongan dengan pemeriksa kode (gratis, deterministik). Mengembalikan daftar penolakan apa adanya; daftar kosong berarti lolos.',
  inputSchema: z.object({ omongan: z.record(z.string(), z.unknown()).describe('Satu objek omongan, bentuknya sama dengan contoh di prompt.') }),
  execute: ({ omongan }) => {
    periksaKe += 1;
    const u = uraiOmonganBebas(omongan);
    if (u.omongan === null) return { lolos: false, penolakan: [`bentuk JSON: ${u.alasan ?? 'tak terurai'}`] };
    const k = periksaKodeV3(u.omongan, paket);
    return { lolos: k.menolak.length === 0, penolakan: k.menolak.map((m) => `${m.sumber}: ${m.alasan}`) };
  },
});

const instruksi = [
  promptPenulisV3(paket, 1, []),
  '',
  'Kamu punya alat `periksa_kode`. Sebelum memberi jawaban akhir, panggil alat itu dengan drafmu, baca penolakannya, perbaiki, dan periksa lagi. Jawaban akhir = JSON omongan yang terakhir kamu periksa.',
].join('\n');

const agen = new ToolLoopAgent({
  model: openrouter(MODEL_OR_OPUS, { usage: { include: true }, provider: pagarPeranV2('penulis') as never }),
  tools: { periksa_kode: periksaKode },
  stopWhen: isStepCount(MAKS_LANGKAH),
  maxOutputTokens: 128_000,
  maxRetries: 0,
  providerOptions: { openrouter: { reasoning: { effort: 'medium', exclude: false } } },
});

console.log(`Uji SDK ${id}: ${MODEL_OR_OPUS} lewat AI SDK; batas ${String(MAKS_LANGKAH)} langkah; batas biaya jalan US$${String(BATAS_JALAN_USD)}; PID ${String(process.pid)}.`);
let galat: string | null = null;
let ringkasLangkah: unknown[] = [];
let teksAkhir = '';
try {
  const hasil = await agen.generate({ prompt: instruksi });
  teksAkhir = hasil.text;
  ringkasLangkah = hasil.steps.map((s, i) => ({
    langkah: i + 1,
    finish: s.finishReason,
    panjang_teks: s.text.length,
    panjang_penalaran: (s.reasoningText ?? '').length,
    panggilan_alat: s.toolCalls.map((t) => t.toolName),
    hasil_alat: s.toolResults.map((t) => t.output),
    token: s.usage,
    metadata_openrouter: s.providerMetadata?.['openrouter'] ?? null,
  }));
} catch (g) {
  galat = samarkan(g instanceof Error ? `${g.name}: ${g.message}` : String(g), [konfig.apiKey]);
}

let kodeAkhir: { lolos: boolean; penolakan: string[] } | null = null;
const m = /\{[\s\S]*\}/.exec(teksAkhir);
if (m !== null) {
  try {
    const x = JSON.parse(m[0]) as { omongan?: unknown[] } | Record<string, unknown>;
    const calon = Array.isArray((x as { omongan?: unknown[] }).omongan) ? (x as { omongan: unknown[] }).omongan[0] : x;
    const u = uraiOmonganBebas(calon);
    if (u.omongan !== null) {
      const k = periksaKodeV3(u.omongan, paket);
      kodeAkhir = { lolos: k.menolak.length === 0, penolakan: k.menolak.map((y) => `${y.sumber}: ${y.alasan}`) };
    }
  } catch {
    kodeAkhir = null;
  }
}

const ringkasan = { id, model: MODEL_OR_OPUS, sdk: 'ai + @openrouter/ai-sdk-provider', panggilan_http: ke, panggilan_alat: periksaKe, biaya_jalan_usd: Math.round(biayaJalan * 1e6) / 1e6, galat, langkah: ringkasLangkah, teks_akhir: teksAkhir, kode_akhir: kodeAkhir };
writeFileSync(`${folder}/ringkasan.json`, samarkan(JSON.stringify(ringkasan, null, 2), [konfig.apiKey]), 'utf8');
console.log(`selesai: ${String(ke)} panggilan model, ${String(periksaKe)} panggilan alat, US$${biayaJalan.toFixed(6)}${galat === null ? '' : `; GALAT: ${galat}`}`);
console.log(`berkas: ${folder}/ringkasan.json dan mentah-agen.jsonl`);
