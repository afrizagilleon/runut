/**
 * Kalibrasi penebak berpasangan (M2d-23) + penguji Opus pada soal tayang.
 *
 * Butir: 6 soal tayang, 27 omongan lama yang pernah diuji penguji luar, omongan
 * di bank, dan omongan agen yang ditolak gerbang berbayar. Tiap butir: 12
 * jawaban berpasangan (3 model × 2 urutan × 2 rumusan). Plasebo tidak butuh
 * panggilan baru: kembaran diperlakukan sebagai kunci = 12 − kunci.
 * Enam soal tayang juga dijalankan lewat penguji Opus (4 rotasi, empat pilihan).
 *
 *   node --experimental-strip-types alat/agen/kalibrasi-pasangan.ts --id <id> --pagu <usd> --setuju-berbayar
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { bacaBank, FOLDER_BANK, shaPaketBank } from '../../factory/llm/bebas/bank.ts';
import { drafDari, type OmonganBebas } from '../../factory/llm/bebas/skema.ts';
import type { OmonganDraf } from '../../factory/llm/draf.ts';
import { AKAR } from '../../factory/llm/env.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { omonganLama, soalTayang } from '../../factory/llm/patokan/bank-lama.ts';
import { AMBANG_P_PASANGAN, tebakPasangan } from '../../factory/llm/rotasi/pasangan.ts';
import { tebakKuat } from '../../factory/llm/rotasi/penebak-kuat.ts';
import { binomEkor } from '../../factory/llm/rotasi/rotasi-v2.ts';
import { labelBetul } from '../../factory/llm/rotasi/selabel.ts';
import { HURUF_ROTASI } from '../../factory/llm/rotasi/rotasi.ts';
import { AWALAN_TAG_PENYUSUN, biayaAwalan } from '../penyusun/biaya.ts';
import { panggilV3 } from '../penyusun/pemanggil-v3.ts';

const arg = (nama: string): string | null => {
  const i = process.argv.indexOf(nama);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
};
const id = arg('--id');
if (id === null || !/^[a-z0-9-]{3,40}$/.test(id)) throw new Error('butuh --id');
if (!process.argv.includes('--setuju-berbayar')) throw new Error('berbayar; jalankan dengan --setuju-berbayar');
const pagu = Number(arg('--pagu'));
if (!Number.isFinite(pagu) || pagu <= 0) throw new Error('butuh --pagu <usd>');
const folder = `${AKAR}eval/penyusun/${id}`;
if (existsSync(folder)) throw new Error(`folder ${folder} sudah ada`);
mkdirSync(folder, { recursive: true });

interface Butir {
  id: string;
  kelompok: string;
  catatan: string;
  o: OmonganDraf;
}
const tirt = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d17-uji-2/paket.json`, 'utf8')) as PaketFakta;
const lama = new Map(omonganLama().map((b) => [b.id, b]));
const mentah = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d11/uji-ulang/mentah.json`, 'utf8')) as { hasil: Array<{ id: string; kelompok: string; tertebak_luar: boolean }> };
const butir: Butir[] = soalTayang().map((s) => ({ id: s.id, kelompok: 'tayang', catatan: 'soal tayang', o: s.omongan }));
for (const e of mentah.hasil) {
  if (e.kelompok === 'tayang') continue;
  const b = lama.get(e.id);
  if (b !== undefined) butir.push({ id: e.id, kelompok: e.tertebak_luar ? 'lama-tertebak-opus-luar' : 'lama-tak-tertebak', catatan: e.tertebak_luar ? 'penguji luar Opus menebak ≥ 2/3' : 'penguji luar tidak menebak', o: b.omongan });
}
for (const e of bacaBank(`${AKAR}${FOLDER_BANK}`, shaPaketBank(tirt))) butir.push({ id: `bank-${e.omongan.nama}`, kelompok: 'bank', catatan: 'di bank (lolos semua gerbang saat masuk)', o: drafDari(e.omongan) });
for (const nama of readdirSync(`${AKAR}eval/penyusun`).sort()) {
  const jh = `${AKAR}eval/penyusun/${nama}/hasil.json`;
  if (!/^m2d(18|19|22)-/.test(nama) || !existsSync(jh)) continue;
  type N = { putaran: number; berhenti: string; omongan: OmonganBebas };
  const h = JSON.parse(readFileSync(jh, 'utf8')) as { nilai?: N[]; keadaan?: { nilai?: N[] } };
  for (const n of h.nilai ?? h.keadaan?.nilai ?? []) {
    if (['saringan', 'penebak-kuat', 'kritikus'].includes(n.berhenti)) butir.push({ id: `${nama.replace('m2d', '')}-p${String(n.putaran)}`, kelompok: 'agen-ditolak', catatan: `ditolak ${n.berhenti}`, o: drafDari(n.omongan) });
  }
}

const terpakai = biayaAwalan(AKAR, AWALAN_TAG_PENYUSUN);
const panggil = panggilV3({ akar: AKAR, paguMilestoneUsd: Math.round((terpakai + pagu + 0.01) * 1e4) / 1e4, awalanMilestone: AWALAN_TAG_PENYUSUN })(`${AWALAN_TAG_PENYUSUN}${id}/`, pagu, `${folder}/mentah-panggilan.jsonl`);

console.log(`Kalibrasi berpasangan ${id}: ${String(butir.length)} butir × 12 jawaban; penguji Opus pada 6 soal tayang; pagu US$${String(pagu)}; PID ${String(process.pid)}.`);
const baris: Array<Record<string, unknown>> = [];
let biaya = 0;
let galat: string | null = null;
try {
  for (const [i, b] of butir.entries()) {
    const betul = labelBetul(b.o.pilihan)[HURUF_ROTASI.indexOf(b.o.kunci)] === true;
    const t = await tebakPasangan(b.o, { panggil, putaran: i + 1, omongan: 1 });
    biaya += t.biaya_usd;
    const pl = t.putusan.n === 0 ? null : binomEkor(t.putusan.n - t.putusan.kunci, t.putusan.n, 0.5);
    let kuat: { kunci: number; n: number; putusan: string; alasan: string[] } | null = null;
    if (b.kelompok === 'tayang') {
      const q = await tebakKuat(b.o, { panggil, putaran: i + 1, omongan: 1 });
      biaya += q.biaya_usd;
      kuat = { kunci: q.putusan.kunci, n: q.putusan.n, putusan: q.putusan.putusan, alasan: q.jawaban.map((j) => j.alasan) };
    }
    baris.push({ id: b.id, kelompok: b.kelompok, catatan: b.catatan, jawaban: betul ? 'Betul' : 'Keliru', pasangan: t.putusan, plasebo_tolak: pl !== null && pl < AMBANG_P_PASANGAN, per_model: [...new Set(t.jawaban.map((j) => j.model))].map((m) => ({ model: m, kunci: t.jawaban.filter((j) => j.model === m && j.isi === j.isi_kunci).length, n: t.jawaban.filter((j) => j.model === m && j.isi !== null).length })), alasan_kunci: t.jawaban.filter((j) => j.isi === j.isi_kunci).map((j) => j.alasan).slice(0, 4), penguji_opus: kuat });
    console.log(`  ${b.id.slice(0, 34).padEnd(35)} ${b.kelompok.padEnd(24)} ${(betul ? 'Betul' : 'Keliru').padEnd(7)} pasangan ${String(t.putusan.kunci).padStart(2)}/${String(t.putusan.n).padStart(2)} ${t.putusan.putusan.padEnd(11)}${kuat === null ? '' : ` | penguji Opus ${String(kuat.kunci)}/${String(kuat.n)} ${kuat.putusan}`} | ${b.catatan}`);
  }
} catch (g) {
  galat = g instanceof Error ? `${g.name}: ${g.message}`.slice(0, 400) : String(g);
}
writeFileSync(`${folder}/hasil.json`, `${JSON.stringify({ id, ambang_p: AMBANG_P_PASANGAN, biaya_usd: Math.round(biaya * 1e6) / 1e6, galat, butir: baris }, null, 2)}\n`, 'utf8');

const kel = [...new Set(baris.map((x) => x['kelompok'] as string))];
console.log('\n===== ditolak per kelompok (kunci asli | plasebo) =====');
for (const k of [...kel, 'SEMUA']) {
  for (const jw of ['Betul', 'Keliru']) {
    const y = baris.filter((z) => (k === 'SEMUA' || z['kelompok'] === k) && z['jawaban'] === jw);
    if (y.length > 0) console.log(`  ${k.padEnd(24)} ${jw.padEnd(7)} n=${String(y.length).padStart(2)} | tolak ${String(y.filter((z) => (z['pasangan'] as { putusan: string }).putusan === 'tolak').length).padStart(2)} | tak-terukur ${String(y.filter((z) => (z['pasangan'] as { putusan: string }).putusan === 'tak-terukur').length)} | plasebo ${String(y.filter((z) => z['plasebo_tolak'] === true).length)}`);
  }
}
console.log(`selesai: US$${biaya.toFixed(4)}${galat === null ? '' : `; GALAT: ${galat}`}`);
