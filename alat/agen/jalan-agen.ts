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
 *
 * M2d-26:
 *   npm run agen -- --id <id> --kode XXXX --pagu <usd> --setuju-berbayar
 *     agen mulai dari KODE SAHAM: alat `usulkan_hari` dan `periksa_saham` (data Sectors → 33 aturan → kartu);
 *     emiten yang belum ada di cache hanya diambil dengan --setuju-kredit-sectors.
 *   npm run agen -- --id <id> --paket <berkas> [--bank folder] --tingkatkan --pagu <usd> --setuju-berbayar
 *     menaikkan kesulitan simulasi yang SUDAH terakit, satu omongan demi satu omongan (128 rb token, effort high);
 *     versi asal tidak dihapus.
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { isStepCount, tool, ToolLoopAgent } from 'ai';
import { z } from 'zod';
import { buatAlat, CADANGAN_AJUKAN_USD, peningkatanDari, rakitSimulasi, tingkatEntri, type AlatAgen, type PeristiwaAlat, type SudutDitolak } from '../../factory/llm/agen/alat.ts';
import { instruksiAgen, instruksiTingkatkan } from '../../factory/llm/agen/prompt.ts';
import type { NilaiOmonganV3 } from '../../factory/llm/bebas/mesin-v3.ts';
import { bacaBank, FOLDER_BANK, shaPaketBank, UKURAN_SIMULASI } from '../../factory/llm/bebas/bank.ts';
import { AKAR, bacaKonfigLlm } from '../../factory/llm/env.ts';
import { samarkan } from '../../factory/llm/klien.ts';
import { HARGA } from '../../factory/llm/harga.ts';
import { MODEL_OR_OPUS } from '../../factory/llm/model.ts';
import { BASE_URL_OPENROUTER } from '../../factory/llm/openrouter.ts';
import { PencatatBiaya } from '../../factory/llm/pagu.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { pagarPeranV2, PENYEDIA_PERAN, periksaPenyedia } from '../../factory/llm/pemanggil-v2.ts';
import { AWALAN_TAG_PENYUSUN, biayaAwalan, jalurLedger } from '../penyusun/biaya.ts';
import { ambilDataEmiten, PemuatGudang } from '../penyusun/emiten.ts';
import { kodeSah } from '../penyusun/usulan.ts';
import { panggilV3 } from '../penyusun/pemanggil-v3.ts';
import { pengambilSungguhan } from '../sectors.ts';
import { buatAlatSectors } from './alat-sectors.ts';

const PAKET_BAWAAN = 'eval/penyusun/m2d17-uji-2/paket.json';
/** Batas langkah SATU percakapan (satu omongan). */
const LANGKAH_BAWAAN = 20;
/** Pengajuan ditolak sebanyak ini: percakapan ditutup, mulai percakapan baru. */
const MAKS_DITOLAK_PER_PERCAKAPAN = 5;
/** Percakapan paling banyak per percobaan. */
const MAKS_PERCAKAPAN = 4;
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
/** `--tingkat sulit`: penguji Opus harus 0 benar; batas token penulis tidak diturunkan (kata pemilik 5 Okt). */
const tingkat = (arg('--tingkat') ?? 'biasa') as 'biasa' | 'sulit';
if (tingkat !== 'biasa' && tingkat !== 'sulit') throw new Error('--tingkat harus biasa atau sulit');
/** `--ajukan-dulu <hasil.json>`: draf lolos-kode yang tersisa dari percobaan lama diajukan sebelum agen menulis lagi. */
const ajukanDulu = arg('--ajukan-dulu');
/** `--kode XXXX`: agen mulai dari kode saham dan memilih harinya sendiri (alat `usulkan_hari`, `periksa_saham`). */
const kode = arg('--kode') === null ? null : kodeSah(arg('--kode'));
if (arg('--kode') !== null && kode === null) throw new Error('--kode bukan kode saham yang sah');
/** `--tingkatkan`: menaikkan kesulitan simulasi yang sudah terakit (pemilik 4 Okt: "cukup sampai di sini" atau "lanjut tingkatin"). */
const modeTingkatkan = process.argv.includes('--tingkatkan');
if (modeTingkatkan && (kode !== null || arg('--paket') === null)) throw new Error('--tingkatkan butuh --paket <berkas> dari simulasi yang sudah terakit (bukan --kode)');
if (kode !== null && arg('--paket') !== null) throw new Error('pakai --kode ATAU --paket, bukan keduanya');
/** Batas token keluaran penulis: 32.000 (keluaran terbesar terukur 12.063 token; OpenRouter menolak panggilan bila saldo tidak menjamin seluruh batas). Mode sulit dan langkah tingkatkan: 128.000 (kata pemilik). */
const MAKS_TOKEN_PENULIS = tingkat === 'sulit' || modeTingkatkan ? 128_000 : 32_000;
/** Effort penulis: medium (K-9); langkah tingkatkan memakai high — satu omongan, butuh berpikir paling keras. */
const EFFORT_PENULIS: 'medium' | 'high' = modeTingkatkan ? 'high' : 'medium';
/** Pengajuan ditolak sebanyak ini di langkah tingkatkan: berhenti. */
const MAKS_DITOLAK_TINGKATKAN = 6;
/** Model penulis agen: Opus 5.5 (bawaan) atau Sonnet 5.5 (banding M2d-21). Penyedia tetap dikunci ke Anthropic. */
const MODEL_SONNET = 'anthropic/claude-sonnet-5.5';
const namaModel = arg('--model') ?? 'opus';
if (namaModel !== 'opus' && namaModel !== 'sonnet') throw new Error('--model harus opus atau sonnet');
const MODEL_PENULIS: string = namaModel === 'sonnet' ? MODEL_SONNET : MODEL_OR_OPUS;

const folder = `${AKAR}eval/penyusun/${id}`;
if (existsSync(folder)) throw new Error(`folder ${folder} sudah ada; pakai --id lain`);
const konfig = bacaKonfigLlm(AKAR);
if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak).');
/** Paket fakta: dari berkas (`--paket`), atau baru diketahui saat agen memanggil `periksa_saham` (`--kode`). */
let paket: PaketFakta | null = kode === null ? (JSON.parse(readFileSync(`${AKAR}${arg('--paket') ?? PAKET_BAWAAN}`, 'utf8')) as PaketFakta) : null;
mkdirSync(folder, { recursive: true });

const awalanTag = `${AWALAN_TAG_PENYUSUN}${id}/`;
/** `--bank <folder>`: bank selain bank sungguhan (mis. salinan untuk membandingkan dua model dari keadaan yang sama). */
const folderBank = `${AKAR}${arg('--bank') ?? FOLDER_BANK}`;
const rahasia = [konfig.apiKey];
const tulis = (berkas: string, baris: Record<string, unknown>): void => appendFileSync(`${folder}/${berkas}`, samarkan(JSON.stringify(baris), rahasia) + '\n', 'utf8');
const jejak = (baris: Record<string, unknown>): void => tulis('jejak-agen.jsonl', { waktu: new Date().toISOString(), ...baris });

/**
 * Pemeriksaan GRATIS sebelum panggilan berbayar apa pun (M2d-22): tiap penyedia yang dikunci per peran harus
 * masih melayani modelnya dengan harga di bawah batas `max_price`. Daftar titik akhir OpenRouter tidak ditagih.
 * Tanpa ini, penyedia yang menaikkan harga membuat gerbang 404 sementara agen terus membayar.
 */
async function periksaPenyediaTerkunci(): Promise<string[]> {
  const masalah: string[] = [];
  const perModel = new Map<string, Array<{ tag?: string; pricing: { prompt: string; completion: string } }>>();
  for (const [peran, k] of Object.entries(PENYEDIA_PERAN)) {
    if (!perModel.has(k.model)) {
      const r = await fetch(`${konfig.baseUrl}/models/${k.model}/endpoints`);
      if (!r.ok) { masalah.push(`${peran}: daftar titik akhir ${k.model} tidak terbaca (HTTP ${String(r.status)})`); continue; }
      perModel.set(k.model, ((await r.json()) as { data: { endpoints: Array<{ tag?: string; pricing: { prompt: string; completion: string } }> } }).data.endpoints);
    }
    const batas = (pagarPeranV2(peran as keyof typeof PENYEDIA_PERAN) as { max_price: { prompt: number; completion: number } }).max_price;
    const cocok = (perModel.get(k.model) ?? []).filter((e) => (e.tag ?? '').split('/')[0] === k.slug);
    if (cocok.length === 0) { masalah.push(`${peran}: penyedia "${k.slug}" tidak lagi melayani ${k.model}`); continue; }
    if (!cocok.some((e) => Number(e.pricing.prompt) * 1e6 <= batas.prompt + 1e-9 && Number(e.pricing.completion) * 1e6 <= batas.completion + 1e-9)) {
      masalah.push(`${peran}: harga "${k.slug}" untuk ${k.model} (US$${cocok.map((e) => `${String(Number(e.pricing.prompt) * 1e6)}/${String(Number(e.pricing.completion) * 1e6)}`).join(', ')} per juta) di atas batas US$${String(batas.prompt)}/${String(batas.completion)}`);
    }
  }
  return masalah;
}
const masalahPenyedia = await periksaPenyediaTerkunci();
if (masalahPenyedia.length > 0) throw new Error(`Penyedia terkunci bermasalah; TIDAK ada panggilan berbayar yang dikirim:\n- ${masalahPenyedia.join('\n- ')}`);
console.log('Penyedia terkunci: semua peran masih dilayani di bawah batas harga (diperiksa gratis).');

const terpakaiPenyusun = biayaAwalan(AKAR, AWALAN_TAG_PENYUSUN);
const panggilGerbang = panggilV3({ akar: AKAR, paguMilestoneUsd: Math.round((terpakaiPenyusun + pagu + 0.01) * 1e4) / 1e4, awalanMilestone: AWALAN_TAG_PENYUSUN, log: (b) => console.log(b) })(awalanTag, pagu, `${folder}/mentah-panggilan.jsonl`);

/** Sudut yang ditolak gerbang berbayar di percobaan agen lain atas paket yang sama. */
function riwayatDitolak(paket: PaketFakta): SudutDitolak[] {
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
const catatAlat = (p: Omit<PeristiwaAlat, 'ke'> & { ke?: number }): void => {
  jejak({ jenis: 'alat', ...p });
  console.log(`  alat ${p.alat}: ${p.ringkas}`);
};
let alat: AlatAgen | null = null;
/** Pasang paket fakta: tulis `paket.json`, buat alat penulis untuk paket itu. */
function pasangPaket(p: PaketFakta): AlatAgen {
  paket = p;
  writeFileSync(`${folder}/paket.json`, `${JSON.stringify(p, null, 2)}\n`, 'utf8');
  alat = buatAlat({ paket: p, folderBank, idJalan: id as string, panggil: panggilGerbang, paguUsd: pagu, biayaAgen: () => biayaAgen, labelPenulis: `${MODEL_PENULIS} (agen ber-alat)`, target, tingkat, riwayatDitolak: riwayatDitolak(p), catat: catatAlat });
  return alat;
}
if (paket !== null) pasangPaket(paket);
/** Alat penulis; melempar bila belum ada paket (hanya mungkin di mode --kode sebelum `periksa_saham`). */
const A = (): AlatAgen => {
  if (alat === null) throw new Error('belum ada paket fakta');
  return alat;
};
const BELUM_ADA_HARI = { galat: 'Belum ada hari yang dipilih. Panggil usulkan_hari, lalu periksa_saham dengan salah satu tanggalnya.' };
const kead = (): ReturnType<AlatAgen['keadaan']> => alat?.keadaan() ?? { ditolak: 0, jumlah_omongan: 0, jumlah_sudut: 0, target, biaya_gerbang_usd: 0, biaya_total_usd: bulat(biayaAgen), sisa_anggaran_usd: bulat(Math.max(0, pagu - biayaAgen)), pengajuan: 0, nilai: [] as NilaiOmonganV3[] };
/** Panggilan model termahal di percobaan ini; cadangan untuk panggilan berikutnya = 1,5 kalinya (minimal US$0,10). */
let panggilanTermahal = 0;
const cadanganModel = (): number => Math.max(0.1, 1.5 * panggilanTermahal);
const selesai = (): boolean => (alat === null ? false : modeTingkatkan ? alat.semuaNaik() : alat.selesai());
/** Anggaran habis = tidak cukup untuk satu pengajuan lagi, ATAU tidak cukup untuk satu panggilan model lagi (pagu keras, M2d-26). */
const habis = (): boolean => kead().sisa_anggaran_usd < CADANGAN_AJUKAN_USD || kead().sisa_anggaran_usd < cadanganModel();
const rusakAlat = (): string | null => alat?.rusak() ?? null;

const hariIni = new Date().toISOString().slice(0, 10);
const sectorsAtauNull = kode === null ? null : buatAlatSectors({
  kode, pemuat: new PemuatGudang(join(AKAR, '.cache', 'sectors')), hariIni,
  ...(process.argv.includes('--setuju-kredit-sectors') ? { ambil: (k: string) => ambilDataEmiten(pengambilSungguhan(AKAR), k) } : {}),
});
let keAlatData = 0;

if (ujiAjukan !== null) {
  const x = JSON.parse(readFileSync(`${AKAR}${ujiAjukan}`, 'utf8')) as { omongan?: unknown[] } | Record<string, unknown>;
  const calon = Array.isArray((x as { omongan?: unknown[] }).omongan) ? (x as { omongan: unknown[] }).omongan[0] : x;
  console.log(`Uji ajukan ${id}: satu omongan dari ${ujiAjukan} lewat gerbang berbayar; pagu US$${String(pagu)}; PID ${String(process.pid)}.`);
  const h = await A().ajukan(calon);
  writeFileSync(`${folder}/hasil.json`, samarkan(JSON.stringify({ id, mode: 'uji-ajukan', sumber: ujiAjukan, hasil: h, keadaan: kead() }, null, 2), rahasia), 'utf8');
  console.log(JSON.stringify({ lolos: h.lolos, berhenti: h.berhenti, penolakan: h.penolakan, biaya_usd: h.biaya_pengajuan_usd, bank: h.bank }, null, 1));
  process.exit(0);
}

// Biaya selalu dari usage.cost; baris harga hanya batas atas bila respons tanpa cost (Sonnet memakai baris Opus = batas atas yang aman).
if (ajukanDulu !== null) {
  type D = { id: string; omongan: Record<string, unknown> & { pesan: string } };
  const lama = JSON.parse(readFileSync(`${AKAR}${ajukanDulu}`, 'utf8')) as { draf_lolos_kode?: D[]; nilai?: Array<{ omongan: { pesan: string } }> };
  const dinilai = new Set((lama.nilai ?? []).map((n) => n.omongan.pesan));
  const sisaDraf = (lama.draf_lolos_kode ?? []).filter((d) => !dinilai.has(d.omongan.pesan));
  const idSiap = A().periksaKodeBanyak(sisaDraf.map((d) => d.omongan)).flatMap((h) => (h.lolos && h.id_draf !== undefined ? [h.id_draf] : []));
  console.log(`Draf tersisa dari ${ajukanDulu}: ${String(sisaDraf.length)} belum dinilai, ${String(idSiap.length)} lolos kode → diajukan dulu.`);
  if (idSiap.length > 0) await A().ajukanBanyak(idSiap);
}

const ledger = new PencatatBiaya({ paguUsd: konfig.paguUsd, jalurLedger: jalurLedger(AKAR), biayaNyata: true, harga: { ...HARGA, [MODEL_PENULIS]: HARGA[MODEL_OR_OPUS] } });
const totalAwal = ledger.total();
let panggilanModel = 0;
let percakapan = 0;
let sudutAwal = 0;
let ditolakAwal = 0;

/** `fetch` berpenjaga untuk panggilan model AGEN: tolak sebelum kirim, catat mentah, biaya nyata ke ledger. */
const fetchBerpenjaga: typeof fetch = async (masukan, init) => {
  const terpakai = kead().biaya_total_usd;
  // Pagu keras (M2d-26): dulu hanya ditolak bila biaya SUDAH ≥ pagu, sehingga satu panggilan terakhir bisa melewatinya (m2d25-agar-sulit-1: 1,5812 > 1,5).
  if (terpakai + cadanganModel() > pagu) throw new Error(`penjaga: biaya percobaan US$${terpakai.toFixed(4)} + cadangan satu panggilan US$${cadanganModel().toFixed(2)} > pagu US$${String(pagu)}; panggilan tidak dikirim`);
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
  const entri = ledger.catat(MODEL_PENULIS, tag, {
    percobaan: 1, status: respons.status, token_masuk: usage?.prompt_tokens ?? null, token_keluar: usage?.completion_tokens ?? null, latensi_ms: latensi,
    galat: respons.ok ? null : samarkan(teks.slice(0, 300), rahasia), mungkin_ditagih: respons.ok || respons.status >= 500,
    biaya_penyedia_usd: typeof usage?.cost === 'number' ? usage.cost : null, penyedia, token_penalaran: usage?.completion_tokens_details?.reasoning_tokens ?? null,
  }, CADANGAN_PANGGILAN_USD, { penalaran_diminta: { effort: EFFORT_PENULIS, exclude: false } });
  biayaAgen += entri.biaya_usd;
  panggilanTermahal = Math.max(panggilanTermahal, entri.biaya_usd);
  tulis('mentah-agen.jsonl', { ke, tag, waktu: new Date().toISOString(), status: respons.status, latensi_ms: latensi, permintaan: badan, respons: data ?? teks.slice(0, 2000) });
  const pesan = ((data?.['choices'] as Array<{ message?: { content?: string | null; reasoning?: string | null; tool_calls?: Array<{ function?: { name?: string } }> }; finish_reason?: string }> | undefined) ?? [])[0];
  jejak({
    jenis: 'model', ke, percakapan, status: respons.status, penyedia, token_masuk: usage?.prompt_tokens ?? null, token_dari_simpanan: dariSimpanan, token_ke_simpanan: keSimpanan, token_keluar: usage?.completion_tokens ?? null, token_penalaran: usage?.completion_tokens_details?.reasoning_tokens ?? null,
    biaya_usd: entri.biaya_usd, latensi_ms: latensi, finish: pesan?.finish_reason ?? null, penalaran: pesan?.message?.reasoning ?? null, teks: pesan?.message?.content ?? null,
    memanggil: (pesan?.message?.tool_calls ?? []).map((t) => t.function?.name ?? '?'),
  });
  console.log(`  model l${String(ke)}: HTTP ${String(respons.status)} masuk ${String(usage?.prompt_tokens ?? '-')} (simpanan baca ${String(dariSimpanan ?? '-')} tulis ${String(keSimpanan ?? '-')}) keluar ${String(usage?.completion_tokens ?? '-')} penalaran ${String(usage?.completion_tokens_details?.reasoning_tokens ?? '-')} US$${entri.biaya_usd.toFixed(4)} ${String(penyedia)} | total US$${kead().biaya_total_usd.toFixed(4)}`);
  if (respons.ok) periksaPenyedia('penulis', penyedia);
  return new Response(teks, { status: respons.status, statusText: respons.statusText, headers: respons.headers });
};

const openrouter = createOpenRouter({ apiKey: konfig.apiKey, baseURL: konfig.baseUrl, fetch: fetchBerpenjaga });
const skemaDraf = z.object({ draf: z.array(z.record(z.string(), z.unknown())).min(1).max(3).describe('Satu sampai tiga objek omongan, bentuknya sama dengan contoh di petunjuk.') });

const alatPenulis = {
  lihat_fakta: tool({ description: 'Semua kartu fakta hari simulasi. Gratis.', inputSchema: z.object({}), execute: () => (alat === null ? BELUM_ADA_HARI : alat.lihatFakta()) }),
  periksa_kode: tool({ description: 'Periksa bentuk satu sampai tiga draf omongan. Gratis. Untuk tiap draf: penolakan apa adanya, atau id_draf bila lolos.', inputSchema: skemaDraf, execute: ({ draf }) => (alat === null ? BELUM_ADA_HARI : { hasil: alat.periksaKodeBanyak(draf) }) }),
};
const alatSusun = {
  ...alatPenulis,
  lihat_bank: tool({ description: 'Omongan yang sudah lolos, kartu penentu yang sudah terpakai, dan sisa anggaran. Gratis.', inputSchema: z.object({}), execute: () => (alat === null ? BELUM_ADA_HARI : alat.lihatBank()) }),
  ajukan: tool({ description: `Ajukan satu sampai tiga draf (id_draf dari periksa_kode) ke gerbang berbayar. Tiap draf dinilai sendiri; yang lolos masuk bank. Butuh sisa anggaran minimal US$${String(CADANGAN_AJUKAN_USD)} per draf.`, inputSchema: z.object({ id_draf: z.array(z.string()).min(1).max(3) }), execute: async ({ id_draf }) => (alat === null ? BELUM_ADA_HARI : await alat.ajukanBanyak(id_draf)) }),
};
/** Dua alat data (hanya di mode --kode): agen memilih hari dan meminta kartu faktanya sendiri. */
const buatAlatData = (sectors: NonNullable<typeof sectorsAtauNull>) => ({
  usulkan_hari: tool({
    description: 'Hari-hari yang layak dibekukan untuk saham yang diminta penyusun: tanggal, jenis peristiwa, alasannya, dan jumlah kartu fakta yang lolos pemeriksaan. Gratis.',
    inputSchema: z.object({}),
    execute: async () => {
      const h = await sectors.usulkanHari();
      keAlatData += 1;
      catatAlat({ alat: 'usulkan_hari', ke: keAlatData, ringkas: 'galat' in h ? `galat: ${h.galat}` : `${String(h.hari.length)} hari diusulkan (${h.hari.map((x) => `${x.tanggal} ${String(x.kartu_lolos)} kartu`).join('; ')})`, hasil: h });
      return h;
    },
  }),
  periksa_saham: tool({
    description: 'Ambil data Sectors saham itu untuk satu tanggal dari usulkan_hari, jalankan 33 aturan verifikasi, dan kembalikan kartu fakta yang lolos beserta yang disingkirkan. Gratis. Hari boleh diganti selama belum ada draf yang diajukan.',
    inputSchema: z.object({ tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Tanggal YYYY-MM-DD dari daftar usulkan_hari.') }),
    execute: async ({ tanggal }) => {
      keAlatData += 1;
      if (paket !== null && paket.tanggal_t !== tanggal && kead().pengajuan > 0) {
        const g = { galat: `Hari sudah dikunci di ${paket.tanggal_t} karena sudah ada draf yang diajukan. Lanjutkan dengan hari itu.` };
        catatAlat({ alat: 'periksa_saham', ke: keAlatData, ringkas: 'hari sudah dikunci', hasil: g });
        return g;
      }
      const h = await sectors.periksaSaham(tanggal);
      if (h.paket === null) {
        catatAlat({ alat: 'periksa_saham', ke: keAlatData, ringkas: `galat: ${h.galat}`, hasil: { galat: h.galat } });
        return { galat: h.galat };
      }
      if (paket === null || shaPaketBank(paket) !== shaPaketBank(h.paket)) pasangPaket(h.paket);
      catatAlat({ alat: 'periksa_saham', ke: keAlatData, ringkas: `${tanggal}: ${String(h.laporan.aturan_dijalankan)} aturan dijalankan, ${String(h.laporan.kartu_lolos)} kartu lolos, ${String(h.laporan.disingkirkan.length)} disingkirkan (${h.laporan.sumber})`, hasil: h.laporan });
      return h.laporan;
    },
  }),
});
const alatTingkat = {
  ...alatPenulis,
  lihat_simulasi: tool({ description: 'Tiga omongan simulasi versi asal, ukuran tiap omongan (penebak tanpa kartu, penguji Opus), alasan penebak memilih kunci, dan versi lebih sulit yang sudah tersimpan. Gratis.', inputSchema: z.object({}), execute: () => A().lihatSimulasi() }),
  tingkatkan: tool({ description: `Ajukan versi lebih sulit dari satu omongan simulasi. Berbayar; butuh sisa anggaran minimal US$${String(CADANGAN_AJUKAN_USD)}. Kartu penentu dan jawabannya harus sama dengan versi asal. Disimpan hanya bila lolos semua pemeriksaan DAN terukur lebih sulit.`, inputSchema: z.object({ id_asal: z.string(), id_draf: z.string() }), execute: ({ id_asal, id_draf }) => A().tingkatkan(id_asal, id_draf) }),
};

const setelanAgen = {
  model: openrouter(MODEL_PENULIS, { usage: { include: true }, provider: pagarPeranV2('penulis') as never, extraBody: { cache_control: SIMPAN_PROMPT } }),
  stopWhen: [isStepCount(maksLangkah), () => selesai() || habis() || rusakAlat() !== null || kead().ditolak - ditolakAwal >= (modeTingkatkan ? MAKS_DITOLAK_TINGKATKAN : MAKS_DITOLAK_PER_PERCAKAPAN)],
  maxOutputTokens: MAKS_TOKEN_PENULIS,
  maxRetries: 2,
  providerOptions: { openrouter: { reasoning: { effort: EFFORT_PENULIS, exclude: false } } },
};
const agen: { generate(o: { prompt: string }): Promise<{ text: string; steps: unknown[] }> } = modeTingkatkan
  ? new ToolLoopAgent({ ...setelanAgen, tools: alatTingkat })
  : sectorsAtauNull !== null ? new ToolLoopAgent({ ...setelanAgen, tools: { ...buatAlatData(sectorsAtauNull), ...alatSusun } })
  : new ToolLoopAgent({ ...setelanAgen, tools: alatSusun });

if (modeTingkatkan && rakitSimulasi(bacaBank(folderBank, shaPaketBank(paket as PaketFakta)).filter((e) => peningkatanDari(e) === null), paket as PaketFakta).draf === null) {
  throw new Error('--tingkatkan: bank untuk paket ini belum bisa dirakit menjadi simulasi; tidak ada yang ditingkatkan. Tidak ada panggilan berbayar yang dikirim.');
}

console.log(`Agen ${id}: ${MODEL_PENULIS} @ anthropic lewat AI SDK; mode ${modeTingkatkan ? 'tingkatkan' : kode !== null ? `dari kode ${kode}` : 'susun'}; effort ${EFFORT_PENULIS}; maks ${String(MAKS_TOKEN_PENULIS)} token; target ${String(target)} sudut; pagu US$${String(pagu)}; maks ${String(maksLangkah)} langkah per percakapan; bank ${arg('--bank') ?? FOLDER_BANK}${paket === null ? '' : `/${shaPaketBank(paket).slice(0, 12)}…`}; PID ${String(process.pid)}.`);
const mulai = Date.now();
let galat: string | null = null;
let teksAkhir = '';
let langkah = 0;
const ringkasPercakapan: Array<{ ke: number; langkah: number; sudut_sebelum: number; sudut_sesudah: number; ditolak: number; teks_akhir: string }> = [];
try {
  while (percakapan < (modeTingkatkan ? 1 : MAKS_PERCAKAPAN) && !selesai() && !habis() && rusakAlat() === null) {
    percakapan += 1;
    sudutAwal = kead().jumlah_omongan;
    ditolakAwal = kead().ditolak;
    console.log(`- percakapan ${String(percakapan)} (bank ${String(sudutAwal)}/${String(target)}, sisa US$${String(kead().sisa_anggaran_usd)})`);
    jejak({ jenis: 'percakapan', ke: percakapan, bank: sudutAwal });
    // Mode --kode: selama hari belum dipilih, petunjuknya mulai dari `usulkan_hari`; sesudah itu sama dengan mode paket.
    const hasil = await agen.generate({ prompt: modeTingkatkan ? instruksiTingkatkan() : instruksiAgen(target, MAKS_DITOLAK_PER_PERCAKAPAN, tingkat, kode !== null) });
    teksAkhir = hasil.text;
    langkah += hasil.steps.length;
    ringkasPercakapan.push({ ke: percakapan, langkah: hasil.steps.length, sudut_sebelum: sudutAwal, sudut_sesudah: kead().jumlah_omongan, ditolak: kead().ditolak - ditolakAwal, teks_akhir: hasil.text });
    if (alat === null) break; // agen berhenti tanpa memilih hari: percakapan baru tidak akan mengubahnya
  }
} catch (g) {
  galat = samarkan(g instanceof Error ? `${g.name}: ${g.message}` : String(g), rahasia);
}

const k = kead();
const paketAkhir = paket as PaketFakta | null;
const semuaEntri = paketAkhir === null ? [] : bacaBank(folderBank, shaPaketBank(paketAkhir));
/** Simulasi dirakit dari versi ASAL saja; versi yang ditingkatkan dilaporkan terpisah. */
const bank = semuaEntri.filter((e) => peningkatanDari(e) === null);
const simulasi = paketAkhir === null ? { draf: null, dipilih: [] as string[], dicoba: 0, alasan: ['agen tidak memilih hari; tidak ada paket fakta'] } : rakitSimulasi(bank, paketAkhir);
const naik = semuaEntri.filter((e) => peningkatanDari(e) !== null && simulasi.dipilih.includes(peningkatanDari(e) as string));
const berhenti = galat !== null ? `galat: ${galat}` : rusakAlat() !== null ? `gerbang rusak: ${rusakAlat() ?? ''}`
  : modeTingkatkan ? (selesai() ? 'ketiga omongan punya versi lebih sulit' : habis() ? 'anggaran tidak cukup untuk satu langkah lagi' : kead().ditolak >= MAKS_DITOLAK_TINGKATKAN ? 'batas penolakan' : 'agen berhenti sendiri (cukup sampai di sini)')
  : selesai() ? 'bank bisa dirakit menjadi simulasi' : habis() ? 'anggaran tidak cukup untuk satu langkah lagi' : percakapan >= MAKS_PERCAKAPAN ? 'batas percakapan' : 'agen berhenti sendiri';
const hasil = {
  id, mode: modeTingkatkan ? 'tingkatkan' : kode !== null ? 'dari-kode' : 'susun', kode, hari_dipilih: paketAkhir?.tanggal_t ?? null, effort: EFFORT_PENULIS, maks_token: MAKS_TOKEN_PENULIS,
  model: MODEL_PENULIS, sdk: 'ai (ToolLoopAgent) + @openrouter/ai-sdk-provider', target, pagu_usd: pagu, berhenti, percakapan: ringkasPercakapan, langkah, panggilan_model: panggilanModel, pengajuan: k.pengajuan,
  biaya_agen_usd: bulat(biayaAgen), biaya_gerbang_usd: k.biaya_gerbang_usd, biaya_usd: k.biaya_total_usd, durasi_detik: Math.round((Date.now() - mulai) / 1000),
  bank: { jumlah_sudut: k.jumlah_sudut, omongan: bank.map((e) => ({ id: e.id, nama: e.omongan.nama, kartu_penentu: e.kartu_penentu, asal: e.asal.jalan, tingkat: tingkatEntri(e) })) },
  simulasi: { terbit: simulasi.draf !== null, dipilih: simulasi.dipilih, alasan: simulasi.alasan, draf: simulasi.draf },
  peningkatan: naik.map((e) => ({ id: e.id, dari: peningkatanDari(e), nama: e.omongan.nama, tingkat: tingkatEntri(e), asal: e.asal.jalan, omongan: e.omongan })),
  nilai: k.nilai, draf_lolos_kode: (alat as AlatAgen | null)?.drafLolos() ?? [], teks_akhir: teksAkhir,
};
writeFileSync(`${folder}/hasil.json`, samarkan(JSON.stringify(hasil, null, 2), rahasia), 'utf8');
console.log(`selesai (${berhenti}): ${String(panggilanModel)} panggilan model, ${String(k.pengajuan)} pengajuan, bank ${String(k.jumlah_sudut)}/${String(target)}, US$${k.biaya_total_usd.toFixed(4)} (agen ${biayaAgen.toFixed(4)} + gerbang ${k.biaya_gerbang_usd.toFixed(4)}), simulasi ${simulasi.draf !== null ? 'TERBIT' : 'belum'}${modeTingkatkan ? `, versi lebih sulit ${String(new Set(naik.map((e) => peningkatanDari(e))).size)}/${String(simulasi.dipilih.length)}` : ''}${kode !== null ? `, hari dipilih ${paketAkhir?.tanggal_t ?? '-'}` : ''}`);
console.log(`berkas: ${folder}/hasil.json · jejak-agen.jsonl · mentah-agen.jsonl · mentah-panggilan.jsonl`);
