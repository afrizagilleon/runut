/**
 * Kalibrasi Jev (typesafe/jev-1.13, Decisions API OpenRouter — alpha) sebagai
 * (1) penebak TANPA kartu dan (2) pembaca DENGAN kartu (M2d-20 langkah 2).
 *
 * Kenapa: gerbang tebak belum pernah dikalibrasi pada soal tayang yang menjadi
 * patokan "setara". Jev nyaris gratis (US$0,042 per juta token masukan), jadi
 * kalibrasi yang dulu terlalu mahal kini bisa dilakukan: tiap soal × 2 kondisi
 * × 4 urutan pilihan.
 *
 * Butir: 6 soal tayang; omongan di bank; omongan agen yang pernah ditolak
 * gerbang berbayar (pembanding dengan gerbang yang sekarang).
 *
 * Yang diukur per butir: peluang yang Jev berikan ke isi KUNCI (rata-rata 4
 * urutan) dan berapa urutan Jev memilih kunci. Tanpa kartu, peluang acak 0,25.
 * Skrip ini TIDAK memutuskan apa pun; ia hanya menulis angka.
 *
 *   node --experimental-strip-types alat/agen/kalibrasi-jev.ts --id <id> --setuju-berbayar
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { bacaBank, FOLDER_BANK, shaPaketBank } from '../../factory/llm/bebas/bank.ts';
import { drafDari, type OmonganBebas } from '../../factory/llm/bebas/skema.ts';
import type { KunciOpsi, OmonganDraf } from '../../factory/llm/draf.ts';
import { AKAR, bacaKonfigLlm } from '../../factory/llm/env.ts';
import { kartuOmongan } from '../../factory/llm/gerbang-kartu.ts';
import { samarkan } from '../../factory/llm/klien.ts';
import { BASE_URL_OPENROUTER } from '../../factory/llm/openrouter.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { soalTayang } from '../../factory/llm/patokan/bank-lama.ts';
import { HURUF_ROTASI, putar, ROTASI } from '../../factory/llm/rotasi/rotasi.ts';
import { teksPolos } from '../../factory/skema/rujukan.ts';
import { jalurLedger } from '../penyusun/biaya.ts';

const MODEL = 'typesafe/jev-1.13';
const BATAS_USD = 0.05;
const PAKET_TIRT = 'eval/penyusun/m2d17-uji-2/paket.json';

const arg = (nama: string): string | null => {
  const i = process.argv.indexOf(nama);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
};
const id = arg('--id');
if (id === null || !/^[a-z0-9-]{3,40}$/.test(id)) throw new Error('butuh --id');
if (!process.argv.includes('--setuju-berbayar')) throw new Error('berbayar (kecil); jalankan dengan --setuju-berbayar');
const folder = `${AKAR}eval/penyusun/${id}`;
if (existsSync(folder)) throw new Error(`folder ${folder} sudah ada`);
const konfig = bacaKonfigLlm(AKAR);
if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter.');
mkdirSync(folder, { recursive: true });
const rahasia = [konfig.apiKey];

interface Butir {
  id: string;
  kelompok: 'tayang' | 'bank-agen' | 'agen-ditolak';
  catatan: string;
  o: OmonganDraf;
  paket: PaketFakta;
}

const tirt = JSON.parse(readFileSync(`${AKAR}${PAKET_TIRT}`, 'utf8')) as PaketFakta;
const butir: Butir[] = soalTayang().map((s) => ({ id: s.id, kelompok: 'tayang' as const, catatan: 'soal tayang', o: s.omongan, paket: s.paket }));
for (const e of bacaBank(`${AKAR}${FOLDER_BANK}`, shaPaketBank(tirt))) butir.push({ id: `bank-${e.id.slice(0, 6)}`, kelompok: 'bank-agen', catatan: `lolos semua gerbang (${e.omongan.nama})`, o: drafDari(e.omongan), paket: tirt });
for (const nama of readdirSync(`${AKAR}eval/penyusun`).sort()) {
  const jh = `${AKAR}eval/penyusun/${nama}/hasil.json`;
  if (!/^m2d1[89]-/.test(nama) || !existsSync(jh)) continue;
  type N = { putaran: number; berhenti: string; omongan: OmonganBebas };
  const h = JSON.parse(readFileSync(jh, 'utf8')) as { nilai?: N[]; keadaan?: { nilai?: N[] } };
  for (const n of h.nilai ?? h.keadaan?.nilai ?? []) {
    if (['saringan', 'penebak-kuat', 'kritikus'].includes(n.berhenti)) butir.push({ id: `${nama.replace('m2d', '')}-p${String(n.putaran)}`, kelompok: 'agen-ditolak', catatan: `ditolak ${n.berhenti}`, o: drafDari(n.omongan), paket: tirt });
  }
}

let biaya = 0;
let panggilan = 0;
const ledger = jalurLedger(AKAR);
const fetchCatat: typeof fetch = async (masukan, init) => {
  if (biaya >= BATAS_USD) throw new Error(`penjaga: biaya US$${biaya.toFixed(5)} ≥ batas US$${String(BATAS_USD)}; tidak dikirim`);
  panggilan += 1;
  const tag = `penyusun/${id}/jev/${String(panggilan)}`;
  const mulai = Date.now();
  const r = await fetch(masukan, init);
  const teks = await r.text();
  let d: Record<string, unknown> | null = null;
  try {
    d = JSON.parse(teks) as Record<string, unknown>;
  } catch {
    d = null;
  }
  const u = (d?.['usage'] ?? null) as { input_tokens?: number; output_tokens?: number; cost?: number } | null;
  const c = typeof u?.cost === 'number' ? u.cost : 0;
  biaya += c;
  appendFileSync(ledger, JSON.stringify({ waktu: new Date().toISOString(), model: MODEL, tag, percobaan_http: 1, status: r.status, token_masuk: u?.input_tokens ?? null, token_keluar: u?.output_tokens ?? null, biaya_usd: c, dasar_biaya: typeof u?.cost === 'number' ? 'usage-cost' : 'nol-ditolak', perkiraan_maks_usd: 0.001, latensi_ms: Date.now() - mulai, galat: r.ok ? null : samarkan(teks.slice(0, 300), rahasia), penyedia: typeof d?.['provider'] === 'string' ? d['provider'] : null, token_penalaran: null, tanpa_cost: r.ok && typeof u?.cost !== 'number' }) + '\n', 'utf8');
  appendFileSync(`${folder}/mentah-jev.jsonl`, samarkan(JSON.stringify({ ke: panggilan, tag, status: r.status, latensi_ms: Date.now() - mulai, permintaan: typeof init?.body === 'string' ? JSON.parse(init.body) : null, respons: d ?? teks.slice(0, 1000) }), rahasia) + '\n', 'utf8');
  return new Response(teks, { status: r.status, statusText: r.statusText, headers: r.headers });
};
/**
 * Panggilan langsung ke Decisions API (alpha). Percobaan pertama (m2d20-jev-1) memakai `experimental_evaluate`
 * AI SDK dan berhenti di butir ke-8: SDK menolak jawaban yang peluangnya seri sesudah dibulatkan
 * ("did not select a highest-probability option"). Seri adalah data, jadi di sini dibaca apa adanya.
 */
const URL_DECISIONS = `${konfig.baseUrl.replace(/\/v1$/, '/alpha')}/decisions`;
async function putuskan(state: unknown, questions: unknown): Promise<{ choice: string; probabilities: Record<string, number> }> {
  const r = await fetchCatat(URL_DECISIONS, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${konfig.apiKey}` }, body: JSON.stringify({ provider: { data_collection: 'deny' }, model: MODEL, state, questions }) });
  const d = (await r.json()) as { answers?: { jawaban?: { choice: string; probabilities: Record<string, number> } }; error?: unknown };
  if (!r.ok || d.answers?.jawaban === undefined) throw new Error(`Decisions API HTTP ${String(r.status)}: ${JSON.stringify(d).slice(0, 200)}`);
  return d.answers.jawaban;
}

const INSTRUKSI = {
  tebak: 'Seorang teman mengirim pesan ini di grup obrolan tentang sebuah saham. Kamu TIDAK diberi dokumen apa pun. Dari yang tertulis saja, pernyataan mana yang paling mungkin benar?',
  kartu: 'Seorang teman mengirim pesan ini di grup obrolan tentang sebuah saham. Di bawahnya ada kartu: potongan dokumen resmi. Cocokkan omongan teman dengan kartunya. Pernyataan mana yang benar menurut kartu?',
} as const;

interface Ukur {
  kondisi: 'tebak' | 'kartu';
  r: number;
  /** Peluang per ISI asal (indeks 0–3 = pilihan a–d asli). */
  p_isi: number[];
  pilih_isi: number;
  isi_kunci: number;
}

async function ukur(b: Butir, kondisi: 'tebak' | 'kartu', r: number): Promise<Ukur> {
  const p = putar(b.o, r as never);
  const pesan = `Pesan dari ${b.o.nama} (${b.o.jam}): "${teksPolos(b.o.pesan)}"`;
  const state = kondisi === 'tebak' ? { pesan } : { pesan, kartu: kartuOmongan(b.o, b.paket).map((x) => `Kartu ${String(x.no)} — ${x.kepala}: ${x.isi}`) };
  const criteria = Object.fromEntries(HURUF_ROTASI.map((h) => [h, teksPolos(p.pilihan[h])]));
  const a = await putuskan(state, { jawaban: { type: 'choice', instructions: INSTRUKSI[kondisi], criteria } });
  const pIsi = [0, 0, 0, 0];
  for (const h of HURUF_ROTASI) pIsi[p.asal[h as KunciOpsi] as number] = a.probabilities[h] ?? 0;
  return { kondisi, r, p_isi: pIsi, pilih_isi: p.asal[a.choice as KunciOpsi] as number, isi_kunci: HURUF_ROTASI.indexOf(b.o.kunci) };
}

const rata = (x: number[]): number => Math.round((x.reduce((a, y) => a + y, 0) / x.length) * 1000) / 1000;
console.log(`Kalibrasi Jev ${id}: ${String(butir.length)} butir × 2 kondisi × ${String(ROTASI.length)} urutan = ${String(butir.length * 2 * ROTASI.length)} panggilan; batas US$${String(BATAS_USD)}; PID ${String(process.pid)}.`);
const baris: Array<Record<string, unknown>> = [];
let galat: string | null = null;
try {
  for (const b of butir) {
    const semua: Ukur[] = [];
    for (const kondisi of ['tebak', 'kartu'] as const) for (const r of ROTASI) semua.push(await ukur(b, kondisi, r as number));
    const per = (k: 'tebak' | 'kartu'): { p_kunci: number; pilih_kunci: number; p_per_isi: number[]; pilihan: number[] } => {
      const x = semua.filter((u) => u.kondisi === k);
      return { p_kunci: rata(x.map((u) => u.p_isi[u.isi_kunci] as number)), pilih_kunci: x.filter((u) => u.pilih_isi === u.isi_kunci).length, p_per_isi: [0, 1, 2, 3].map((i) => rata(x.map((u) => u.p_isi[i] as number))), pilihan: x.map((u) => u.pilih_isi) };
    };
    const betul = /^\s*betul\b/i.test(teksPolos(b.o.pilihan[b.o.kunci]));
    const t = per('tebak');
    const k = per('kartu');
    baris.push({ id: b.id, kelompok: b.kelompok, catatan: b.catatan, jawaban: betul ? 'Betul' : 'Keliru', kunci: b.o.kunci, tanpa_kartu: t, dengan_kartu: k, pesan: teksPolos(b.o.pesan).slice(0, 90) });
    console.log(`  ${b.id.padEnd(22)} ${b.kelompok.padEnd(12)} ${betul ? 'Betul ' : 'Keliru'} | tanpa kartu: P(kunci) ${t.p_kunci.toFixed(2)}, memilih kunci ${String(t.pilih_kunci)}/4 | dengan kartu: P(kunci) ${k.p_kunci.toFixed(2)}, ${String(k.pilih_kunci)}/4 | ${b.catatan}`);
  }
} catch (g) {
  galat = samarkan(g instanceof Error ? `${g.name}: ${g.message}` : String(g), rahasia);
}
writeFileSync(`${folder}/hasil.json`, samarkan(JSON.stringify({ id, model: MODEL, panggilan, biaya_usd: Math.round(biaya * 1e6) / 1e6, galat, instruksi: INSTRUKSI, butir: baris }, null, 2), rahasia), 'utf8');
console.log(`selesai: ${String(panggilan)} panggilan, US$${biaya.toFixed(6)}${galat === null ? '' : `; GALAT: ${galat}`}`);
