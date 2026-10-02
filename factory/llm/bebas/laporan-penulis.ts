/**
 * `npm run penulis:laporan` — D-E M2d-13: `docs/bukti/lingkar-agen-penulis.md`
 * dibangun dari keluaran tersimpan (jalan D-B, D-A, penilai GLM, paket &
 * hasil reviewer bila ada) dan ledger OpenRouter. Angka dihitung ulang tiap
 * kali; kalimat bertanda **Tafsiran** = bacaan eksekutor.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../../skema/rujukan.ts';
import type { KunciOpsi } from '../draf.ts';
import { AKAR } from '../env.ts';
import { JALUR_LEDGER, type EntriLedger } from '../pagu.ts';
import type { JawabanRotasi, Kondisi } from '../rotasi/rotasi.ts';
import { lajuKunci, priorHuruf, selisihDalamSelisih, wilson, type Laju, type Prior } from './analisis-lama.ts';
import { FOLDER_AUDIT_M2D13, FOLDER_M2D13 } from './audit.ts';
import type { HasilBebas } from './mesin.ts';
import { FOLDER_MUTU, FOLDER_MUTU_OPUS, type AsalMutu, type HasilGlm, type PenilaianMutu } from './mutu.ts';
import { PAGU_DB, PAGU_DD, PAGU_JALAN, PAGU_MILESTONE_M2D13, urutanJalan, type NamaPenulis, type SlotJalan } from './pagu-adil.ts';
import { putusanH1a, putusanH1b, putusanH2, putusanH3b, putusanH4, putusanSelisih, type Putusan, type UkuranH4 } from './putusan.ts';
import { HURUF } from './skema.ts';

export const JALUR_LAPORAN = `${AKAR}docs/bukti/lingkar-agen-penulis.md`;
const PENULIS: readonly NamaPenulis[] = ['opus', 'haiku', 'deepseek'];
const NAMA: Record<NamaPenulis, string> = { opus: 'Opus 5.5', haiku: 'Haiku 4.5', deepseek: 'DeepSeek V4.1 Flash' };
const PENEBAK = ['anthropic/claude-haiku-4.5', 'deepseek/deepseek-v4.1-flash', 'z-ai/glm-5.3'] as const;
const pendek = (m: string): string => ({ 'anthropic/claude-haiku-4.5': 'Haiku', 'deepseek/deepseek-v4.1-flash': 'DeepSeek', 'z-ai/glm-5.3': 'GLM', 'anthropic/claude-opus-5.5': 'Opus' })[m] ?? m;

const persen = (x: number | null): string => (x === null ? '—' : `${(x * 100).toFixed(0)} %`);
const dua = (x: number | null): string => (x === null ? '—' : x.toFixed(2).replace('.', ','));
const usd = (x: number | null): string => (x === null ? '—' : `US$${x.toFixed(4)}`);
const wil = (k: number, n: number): string => {
  const w = wilson(k, n);
  return w === null ? '' : ` [${persen(w[0])}–${persen(w[1])}]`;
};

/* ---------------------------------------------------------------------- */
/* data                                                                    */
/* ---------------------------------------------------------------------- */

export interface DataJalan {
  slot: SlotJalan;
  h: HasilBebas;
  biaya: { total: number; penulis: number; gerbang: number };
}

function json<T>(jalur: string): T | null {
  return existsSync(jalur) ? (JSON.parse(readFileSync(jalur, 'utf8')) as T) : null;
}

export function ledger(): EntriLedger[] {
  return existsSync(JALUR_LEDGER) ? readFileSync(JALUR_LEDGER, 'utf8').split(/\r?\n/).filter((x) => x.trim() !== '').map((x) => JSON.parse(x) as EntriLedger) : [];
}

export function muatJalan(L: readonly EntriLedger[]): DataJalan[] {
  const hasil: DataJalan[] = [];
  for (const slot of urutanJalan()) {
    const h = json<HasilBebas>(`${AKAR}eval/penyusun/${slot.id}/hasil.json`);
    if (h === null) continue;
    const e = L.filter((x) => x.tag.startsWith(`penyusun/${slot.id}/`));
    const total = e.reduce((a, x) => a + x.biaya_usd, 0);
    const penulis = e.filter((x) => x.tag.includes('/tulis-bebas')).reduce((a, x) => a + x.biaya_usd, 0);
    hasil.push({ slot, h, biaya: { total, penulis, gerbang: total - penulis } });
  }
  return hasil;
}

/* ---------------------------------------------------------------------- */
/* ukuran per penulis                                                      */
/* ---------------------------------------------------------------------- */

export interface UkuranPenulis {
  penulis: NamaPenulis;
  jalan: number;
  tersensor: number;
  omongan: number;
  L: number;
  /** Post-hoc (bukan pra-registrasi): lulus dalam ≤ 2 versi. */
  L2: number;
  vRata: number;
  versi: number;
  versiPerLulus: number | null;
  terbit: number;
  berhenti: Record<string, number>;
  biaya: number;
  biayaPenulis: number;
  biayaPerLulus: number | null;
  panggilanPenulis: number;
  tokenMasuk: number;
  tokenKeluar: number;
  tokenPenalaran: number;
  takTerbacaPenulis: number;
  /** Panggilan penulis yang berhenti di max_tokens (finish "length"). */
  terpotong: number;
  butirRotasi: number;
  ps: Laju;
  pp: Laju;
  hurufKunci: Record<KunciOpsi, number>;
}

function jawabanDB(js: readonly DataJalan[], penulis: NamaPenulis | null): JawabanRotasi[] {
  return js.filter((j) => penulis === null || j.slot.penulis === penulis).flatMap((j) => j.h.versi.flatMap((v) => v.rotasi?.jawaban ?? []));
}

export function ukurPenulis(js: readonly DataJalan[], p: NamaPenulis): UkuranPenulis {
  const d = js.filter((j) => j.slot.penulis === p);
  const versi = d.flatMap((j) => j.h.versi);
  const lulus = d.reduce((a, j) => a + j.h.lulus.length, 0);
  const omongan = 3 * d.length;
  const vPer = d.flatMap((j) => [1, 2, 3].map((n) => j.h.lulus.find((x) => x.no === n)?.versi ?? 3));
  const berhenti: Record<string, number> = {};
  for (const v of versi) berhenti[v.berhenti] = (berhenti[v.berhenti] ?? 0) + 1;
  const pp = d.flatMap((j) => j.h.panggilan_penulis);
  const biaya = d.reduce((a, j) => a + j.biaya.total, 0);
  const huruf = { a: 0, b: 0, c: 0, d: 0 } as Record<KunciOpsi, number>;
  for (const v of versi) if (v.omongan !== null) huruf[v.omongan.kunci] += 1;
  const jw = jawabanDB(js, p);
  return {
    penulis: p,
    jalan: d.length,
    tersensor: d.filter((j) => j.h.tersensor).length,
    omongan,
    L: lulus,
    L2: d.reduce((a, j) => a + j.h.lulus.filter((x) => x.versi <= 2).length, 0),
    vRata: vPer.length === 0 ? 0 : vPer.reduce((a, x) => a + x, 0) / vPer.length,
    versi: versi.length,
    versiPerLulus: lulus === 0 ? null : versi.length / lulus,
    terbit: d.filter((j) => j.h.terbit).length,
    berhenti,
    biaya,
    biayaPenulis: d.reduce((a, j) => a + j.biaya.penulis, 0),
    biayaPerLulus: lulus === 0 ? null : biaya / lulus,
    panggilanPenulis: pp.length,
    tokenMasuk: pp.reduce((a, x) => a + x.token_masuk, 0),
    tokenKeluar: pp.reduce((a, x) => a + x.token_keluar, 0),
    tokenPenalaran: pp.reduce((a, x) => a + (x.token_penalaran ?? 0), 0),
    takTerbacaPenulis: versi.filter((v) => v.berhenti === 'tulis-gagal').length,
    terpotong: pp.filter((x) => x.finish_reason === 'length').length,
    butirRotasi: versi.filter((v) => v.rotasi !== null).length,
    ps: lajuKunci(jw.filter((x) => x.kondisi === 'pilihan-saja')),
    pp: lajuKunci(jw.filter((x) => x.kondisi === 'pesan-pilihan')),
    hurufKunci: huruf,
  };
}

const laju = (j: readonly JawabanRotasi[], model: string, k: Kondisi): number | null => lajuKunci(j.filter((x) => x.model === model && x.kondisi === k)).laju;

export function deltaH2(js: readonly DataJalan[], k: Kondisi): { ds: number | null; h: number | null; hSemodel: number | null; butirDs: number; butirAnth: number } {
  const [H, D, G] = PENEBAK;
  const ds = jawabanDB(js, 'deepseek');
  const an = [...jawabanDB(js, 'opus'), ...jawabanDB(js, 'haiku')];
  const hk = jawabanDB(js, 'haiku');
  const butir = (ps: readonly NamaPenulis[]): number => js.filter((j) => ps.includes(j.slot.penulis)).flatMap((j) => j.h.versi).filter((v) => v.rotasi !== null).length;
  return {
    ds: selisihDalamSelisih({ sendiri: laju(ds, D, k), lain: laju(an, D, k) }, { sendiri: laju(ds, G, k), lain: laju(an, G, k) }),
    h: selisihDalamSelisih({ sendiri: laju(an, H, k), lain: laju(ds, H, k) }, { sendiri: laju(an, G, k), lain: laju(ds, G, k) }),
    hSemodel: selisihDalamSelisih({ sendiri: laju(hk, H, k), lain: laju(ds, H, k) }, { sendiri: laju(hk, G, k), lain: laju(ds, G, k) }),
    butirDs: butir(['deepseek']),
    butirAnth: butir(['opus', 'haiku']),
  };
}

/* ---------------------------------------------------------------------- */
/* mutu                                                                    */
/* ---------------------------------------------------------------------- */

interface KunciMutu {
  butir: Array<{ id_buta: string; asal: AsalMutu; sumber: string }>;
}

export function spearman(x: readonly number[], y: readonly number[]): number | null {
  if (x.length < 3 || x.length !== y.length) return null;
  const peringkat = (v: readonly number[]): number[] => {
    const urut = v.map((a, i) => [a, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(v.length);
    for (let i = 0; i < urut.length; ) {
      let j = i;
      while (j + 1 < urut.length && urut[j + 1]?.[0] === urut[i]?.[0]) j++;
      for (let k = i; k <= j; k++) r[urut[k]?.[1] ?? 0] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  const a = peringkat(x);
  const b = peringkat(y);
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  const kov = a.reduce((s, v, i) => s + (v - ma) * ((b[i] ?? 0) - mb), 0);
  const va = Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0));
  const vb = Math.sqrt(b.reduce((s, v) => s + (v - mb) ** 2, 0));
  return va === 0 || vb === 0 ? null : kov / (va * vb);
}

export interface Mutu {
  kunci: KunciMutu | null;
  glm: Map<string, PenilaianMutu | null>;
  opus: Map<string, PenilaianMutu | null> | null;
  biayaGlm: number;
  /** Penilai GLM pra-registrasi (effort "medium"): sah / total. */
  medium: { sah: number; total: number; biaya: number };
  /** Skor yang dipakai = amandemen effort "high" bila ada. */
  amandemen: boolean;
}

function muatMutu(): Mutu {
  const kunci = json<KunciMutu>(`${FOLDER_M2D13}/kunci-mutu.json`);
  const gm = json<{ hasil: HasilGlm[]; biaya_tag_usd: number }>(`${FOLDER_MUTU}/glm.json`);
  const gt = json<{ hasil: HasilGlm[]; biaya_tag_usd: number }>(`${FOLDER_MUTU}/glm-tinggi.json`);
  const g = gt ?? gm;
  const o = json<{ hasil: Array<{ id_buta: string; penilaian: PenilaianMutu | null }> }>(`${FOLDER_MUTU_OPUS}/nilai.json`);
  const opusAda = o !== null && o.hasil.some((x) => x.penilaian !== null);
  return {
    kunci,
    glm: new Map((g?.hasil ?? []).map((x) => [x.id_buta, x.penilaian])),
    opus: opusAda ? new Map(o.hasil.map((x) => [x.id_buta, x.penilaian])) : null,
    biayaGlm: g?.biaya_tag_usd ?? 0,
    medium: { sah: (gm?.hasil ?? []).filter((x) => x.penilaian !== null).length, total: gm?.hasil.length ?? 0, biaya: gm?.biaya_tag_usd ?? 0 },
    amandemen: gt !== null,
  };
}

function rataMutu(m: Mutu, penilai: 'glm' | 'opus', asal: AsalMutu): { rata: number | null; n: number; layak: number } {
  const peta = penilai === 'glm' ? m.glm : m.opus;
  if (peta === null || m.kunci === null) return { rata: null, n: 0, layak: 0 };
  const xs = m.kunci.butir.filter((b) => b.asal === asal).map((b) => peta.get(b.id_buta) ?? null).filter((x): x is PenilaianMutu => x !== null);
  return { rata: xs.length === 0 ? null : xs.reduce((a, x) => a + x.total, 0) / xs.length, n: xs.length, layak: xs.filter((x) => x.layak_tayang).length };
}

/* ---------------------------------------------------------------------- */
/* audit Opus (reviewer)                                                   */
/* ---------------------------------------------------------------------- */

interface NilaiAuditM2d13 {
  per_butir: Array<{ jalan: string; penulis: NamaPenulis; no: number; versi: number; tanpa_kartu_benar: number; n: number }>;
}

function lajuAuditOpus(a: NilaiAuditM2d13 | null, p: NamaPenulis): { k: number; n: number; laju: number | null; butir: number } {
  if (a === null) return { k: 0, n: 0, laju: null, butir: 0 };
  const xs = a.per_butir.filter((x) => x.penulis === p && x.n > 0);
  const k = xs.reduce((s, x) => s + x.tanpa_kartu_benar, 0);
  const n = xs.reduce((s, x) => s + x.n, 0);
  return { k, n, laju: n === 0 ? null : k / n, butir: xs.length };
}

/** Laju GLM (pesan+pilihan, rotasi) pada versi akhir penulis p yang punya data rotasi. */
function lajuGlmAkhir(js: readonly DataJalan[], p: NamaPenulis): number | null {
  const j = js
    .filter((x) => x.slot.penulis === p)
    .flatMap((x) => x.h.akhir.map((a) => (a === null ? null : x.h.versi.find((v) => v.no === a.no && v.versi === a.versi)?.rotasi?.jawaban ?? null)))
    .filter((x): x is JawabanRotasi[] => x !== null)
    .flat();
  return laju(j, 'z-ai/glm-5.3', 'pesan-pilihan');
}

/* ---------------------------------------------------------------------- */
/* laporan                                                                 */
/* ---------------------------------------------------------------------- */

function biayaModel(L: readonly EntriLedger[]): Array<{ model: string; n: number; biaya: number }> {
  const e = L.filter((x) => x.tag.startsWith('m2d13/') || x.tag.startsWith('penyusun/m2d13-'));
  const m = [...new Set(e.map((x) => x.model))].sort();
  return m.map((model) => ({ model, n: e.filter((x) => x.model === model).length, biaya: e.filter((x) => x.model === model).reduce((a, x) => a + x.biaya_usd, 0) }));
}

function omonganMd(o: HasilBebas['akhir'][number]): string[] {
  if (o === null) return ['(tidak ada versi terbaca)'];
  const x = o.omongan;
  const baris = [
    `**Omongan ${String(o.no)}** — versi ${String(o.versi)}, ${o.lulus ? '**LULUS**' : 'tidak lulus'}; kunci ${x.kunci}; kartu ${x.kartu.join(', ')} (penentu ${x.kartu_penentu.join(', ')})`,
    '',
    `Pesan (${x.nama}, ${x.jam}): "${teksPolos(x.pesan)}"`,
    '',
    ...HURUF.map((h) => `- ${h}) ${teksPolos(x.pilihan[h])}${h === x.kunci ? ' ← kunci' : x.pengecoh[h] === undefined ? '' : ` — _${x.pengecoh[h]?.jenis ?? ''}_ (${x.pengecoh[h]?.rujukan ?? ''}): ${teksPolos(x.pengecoh[h]?.umpan_balik ?? '')}`}`),
    '',
    `Penjelasan: ${teksPolos(x.penjelasan)}`,
    '',
    `Pertanyaan cek: ${x.pertanyaan_cek}`,
    '',
  ];
  return baris;
}

export function bangunLaporan(): string {
  const L = ledger();
  const js = muatJalan(L);
  const U = PENULIS.map((p) => ukurPenulis(js, p));
  const mutu = muatMutu();
  const audit = json<NilaiAuditM2d13>(`${FOLDER_AUDIT_M2D13}/nilai.json`);
  const da = json<Record<string, unknown>>(`${FOLDER_M2D13}/analisis-lama/hasil.json`);
  const b: string[] = [];
  const db = js.reduce((a, j) => a + j.biaya.total, 0);
  const dd = L.filter((x) => x.tag.startsWith('m2d13/mutu/')).reduce((a, x) => a + x.biaya_usd, 0);
  const totalM = L.filter((x) => x.tag.startsWith('m2d13/') || x.tag.startsWith('penyusun/m2d13-')).reduce((a, x) => a + x.biaya_usd, 0);

  b.push('# Lingkar agen M2d-13 — keluarga penulis × penguji (H1–H4)', '');
  b.push('> Laporan ini dibangun skrip (`npm run penulis:laporan`, `factory/llm/bebas/laporan-penulis.ts`) dari keluaran tersimpan (`eval/penyusun/m2d13-*/`, `eval/keluaran-m2d13/`) dan ledger OpenRouter. Kalimat bertanda **Tafsiran** adalah bacaan eksekutor. Pra-registrasi: `docs/bukti/m2d13-praregistrasi.md` (commit 15c3766, sebelum panggilan berbayar pertama; dites). **H4 diuji pada effort penalaran "low" untuk ketiga penulis.**', '');

  // ---- ringkasan
  b.push('## Ringkasan', '');
  b.push(`- **Jalan D-B:** ${String(js.length)} dari 6 slot (${js.map((j) => `${j.slot.id}${j.h.tersensor ? ' (tersensor)' : ''}`).join(', ') || '—'}). Biaya nyata D-B ${usd(db)} dari pagu ${usd(PAGU_DB)}; penilai GLM ${usd(dd)} dari ${usd(PAGU_DD)}; total milestone ${usd(totalM)} dari ${usd(PAGU_MILESTONE_M2D13)}.`);
  b.push(`- **Omongan lulus (≤ 3 versi):** ${U.map((u) => `${NAMA[u.penulis]} ${String(u.L)}/${String(u.omongan)}`).join(' · ')}; simulasi terbit: ${U.map((u) => `${NAMA[u.penulis]} ${String(u.terbit)}`).join(' · ')}.`);
  b.push(`- **Penyimpangan yang memengaruhi bacaan (bukan perubahan pra-registrasi):** (1) jalan Opus tersensor ${String(U[0]?.tersensor ?? 0)}/${String(U[0]?.jalan ?? 0)} — pagu jalan US$0,60 tidak memuat versi 3 (perkiraan maksimum panggilan penulis Opus ≈ US$0,25 dicek sebelum kirim); (2) penulis DeepSeek: ${String(U[2]?.terpotong ?? 0)}/${String(U[2]?.panggilanPenulis ?? 0)} panggilan habis di max_tokens 8.000 seluruhnya penalaran walau effort "low" → semua versi tulis-gagal; (3) penilai GLM pra-registrasi (effort "medium") nyaris tidak berpikir → amandemen teknis effort "high" (lihat §3).`);
  b.push('');

  // ---- D-A
  b.push('## 1. D-A — analisis gratis data M2d-11 (eksploratif)', '');
  if (da !== null) {
    const prior = da['prior_huruf'] as Record<string, Prior>;
    const delta = da['delta_sekeluarga_bank33'] as Record<string, { delta_deepseek: number | null; delta_haiku: number | null }>;
    b.push(`Rincian: \`eval/keluaran-m2d13/analisis-lama/ringkasan.md\`. Atribusi bank 33: soal tayang Opus+pemilik 6, DeepSeek 21 (jejak M2d-3…M2d-8), templat M2d-10 6; + 23 versi jalan TIRT M2d-11 (templat). Prior huruf (semua butir): ${Object.entries(prior).map(([m, x]) => `${pendek(m)} ${x.huruf_maks} ${persen(x.porsi_maks)} (n ${String(x.n)})`).join(', ')}. Δ sekeluarga bank 33 (GLM kendali): pilihan-saja Δ_DS ${dua(delta['pilihan-saja']?.delta_deepseek ?? null)}, Δ_H ${dua(delta['pilihan-saja']?.delta_haiku ?? null)}; pesan+pilihan Δ_DS ${dua(delta['pesan-pilihan']?.delta_deepseek ?? null)}, Δ_H ${dua(delta['pesan-pilihan']?.delta_haiku ?? null)}.`);
    b.push('', '**Pembaur:** butir DeepSeek lama sudah lolos penebak DeepSeek/GLM di lingkar asalnya (seleksi); jenis soal, masa pembuatan, dan host berbeda; soal tayang ditulis bersama manusia. Dicatat sebagai petunjuk, bukan putusan.', '');
  } else b.push('(belum dibangun)', '');

  // ---- D-B jalan
  b.push('## 2. D-B — jalan tiga penulis', '');
  b.push(`Paket TIRT-7 apa adanya (sha256 f7cabc6b…), satu prompt sistem yang sama (sha256 ${js[0]?.h.sha256_prompt_sistem.slice(0, 12) ?? '—'}…${js.every((j) => j.h.sha256_prompt_sistem === js[0]?.h.sha256_prompt_sistem) ? ', sama di semua jalan' : ', BERBEDA antar jalan!'}), penulis \`reasoning.effort: "low"\`, \`max_tokens\` 8.000, suhu 1,0; urutan bergiliran; pagu jalan Opus ${usd(PAGU_JALAN.opus)}, Haiku ${usd(PAGU_JALAN.haiku)}, DeepSeek ${usd(PAGU_JALAN.deepseek)}.`, '');
  b.push('| jalan | putaran | terbit | versi per omongan (berhenti) | biaya penulis | biaya gerbang | total | berhenti |', '|---|---|---|---|---|---|---|---|');
  for (const j of js) {
    const per = [1, 2, 3].map((n) => `o${String(n)}: ${j.h.versi.filter((v) => v.no === n).map((v) => v.berhenti).join('→') || '—'}`).join('; ');
    b.push(`| ${j.slot.id} | ${String(j.slot.putaran)} | ${j.h.terbit ? '**YA**' : 'tidak'} | ${per} | ${usd(j.biaya.penulis)} | ${usd(j.biaya.gerbang)} | ${usd(j.biaya.total)} | ${(j.h.berhenti ?? '—').slice(0, 220)} |`);
  }
  b.push('');
  for (const j of js) {
    b.push(`<details><summary>${j.slot.id}: alasan penolakan per versi</summary>`, '', '| omongan | versi | berhenti | alasan |', '|---|---|---|---|');
    for (const v of j.h.versi) b.push(`| ${String(v.no)} | ${String(v.versi)} | ${v.berhenti} | ${v.alasan.join(' · ').replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 600)} |`);
    b.push('', '</details>', '');
  }

  // ---- tabel per penulis
  b.push('## 3. Tabel per penulis', '');
  b.push('| penulis | jalan (tersensor) | lulus ≤ 3 versi | lulus ≤ 2 versi (post-hoc) | V̄ versi/omongan | versi per omongan lulus | distribusi berhenti (versi) | terbit | biaya | biaya per omongan lulus | panggilan penulis (terpotong) · token masuk/keluar/penalaran | kunci pilihan-saja (H1b) | kunci pesan+pilihan | mutu GLM (rata, n, layak) |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const u of U) {
    const g = rataMutu(mutu, 'glm', u.penulis);
    b.push(
      `| ${NAMA[u.penulis]} | ${String(u.jalan)} (${String(u.tersensor)}) | ${String(u.L)}/${String(u.omongan)} | ${String(u.L2)}/${String(u.omongan)} | ${dua(u.vRata)} | ${dua(u.versiPerLulus)} | ${Object.entries(u.berhenti).map(([k, n]) => `${k} ${String(n)}`).join(', ')} | ${String(u.terbit)} | ${usd(u.biaya)} (penulis ${usd(u.biayaPenulis)}) | ${usd(u.biayaPerLulus)} | ${String(u.panggilanPenulis)} (${String(u.terpotong)}) · ${String(u.tokenMasuk)}/${String(u.tokenKeluar)}/${String(u.tokenPenalaran)} | ${persen(u.ps.laju)}${wil(u.ps.kunci, u.ps.n)} (kepekaan ${persen(u.ps.laju_kepekaan)}; n ${String(u.ps.n)}, tak terbaca ${String(u.ps.tak_terbaca)}; butir ${String(u.butirRotasi)}) | ${persen(u.pp.laju)} (n ${String(u.pp.n)}) | ${dua(g.rata)} (${String(g.n)}, ${String(g.layak)}) |`,
    );
  }
  const gT = rataMutu(mutu, 'glm', 'templat-m2d11');
  const gD = rataMutu(mutu, 'glm', 'tayang-dada');
  b.push('', `**Penilai GLM:** pra-registrasi (effort "medium") sah ${String(mutu.medium.sah)}/${String(mutu.medium.total)} butir (penjaga penalaran 500 token; ${usd(mutu.medium.biaya)}). ${mutu.amandemen ? 'Skor mutu di laporan ini dari **amandemen teknis effort "high"** (setelan kritikus; rubrik, butir, penjaga, `max_tokens` sama) — `eval/keluaran-m2d13/mutu/glm-tinggi.json`.' : 'Amandemen effort "high" belum dijalankan.'}`);
  {
    const skor = [...mutu.glm.values()].filter((x): x is PenilaianMutu => x !== null);
    const penuh = skor.filter((x) => x.total === 10).length;
    b.push('', `GLM menilai ${String(skor.length)}/${String(mutu.kunci?.butir.length ?? 0)} butir sebelum pagu D-D US$0,40 habis (urutan buta, sehingga butir yang tidak dinilai acak); ${String(penuh)}/${String(skor.length)} diberi 10/10. **Tafsiran:** dengan rubrik ini GLM nyaris tidak membedakan (efek langit-langit) — skor mutu GLM tidak cukup untuk membandingkan penulis; bagian mutu H4 bergantung pada penilai Opus.`);
  }
  b.push('', `Pembanding mutu GLM: templat TIRT-7 ${dua(gT.rata)} (n ${String(gT.n)}, layak ${String(gT.layak)}); DADA tayang ${dua(gD.rata)} (n ${String(gD.n)}, layak ${String(gD.layak)}). Skala 0–10 (rubrik pra-registrasi §7). Templat M2d-11 butuh 29 versi untuk 3 omongan lulus (9,7 versi per omongan lulus).`, '');

  // ---- H1
  const jwSemua = jawabanDB(js, null);
  const prior = PENEBAK.map((m) => ({ m, p: priorHuruf(jwSemua.filter((x) => x.model === m)) }));
  const h1a = putusanH1a(prior.map((x) => ({ bias: x.p.bias, n: x.p.n })));
  const psGab = lajuKunci(jwSemua.filter((x) => x.kondisi === 'pilihan-saja'));
  const h1b = putusanH1b(psGab.laju, U.map((u) => u.ps.laju), Math.min(...U.map((u) => u.butirRotasi)));
  b.push('## 4. Hipotesis', '');
  b.push('### H1 — keluaran LLM berpola khas yang mudah dikenali LLM', '');
  b.push(`- **H1a (prior huruf penebak, semua jawaban rotasi D-B): ${h1a}.** ${prior.map((x) => `${pendek(x.m)} a/b/c/d ${String(x.p.a)}/${String(x.p.b)}/${String(x.p.c)}/${String(x.p.d)} → ${x.p.huruf_maks} ${persen(x.p.porsi_maks)} (n ${String(x.p.n)}; ${x.p.bias ? 'berbias' : x.p.n < 200 ? 'n < 200, tak terukur' : 'tidak berbias'})`).join('; ')}. Ambang: satu huruf ≥ 0,32 dengan n ≥ 200; ≥ 2 dari 3 = mendukung.`);
  b.push(`- **H1b (kunci pilihan-saja, butir rotasi D-B): ${h1b}.** Gabungan ${persen(psGab.laju)}${wil(psGab.kunci, psGab.n)} (n ${String(psGab.n)} jawaban terbaca, tak terbaca ${String(psGab.tak_terbaca)}; kepekaan ${persen(psGab.laju_kepekaan)}); per penulis ${U.map((u) => `${NAMA[u.penulis]} ${persen(u.ps.laju)}`).join(', ')}. Ambang: gabungan ≥ 0,40 dan ≥ 2 penulis ≥ 0,35 = mendukung; gabungan ≤ 0,30 = tidak.`);
  b.push(`- **H1c (deskriptif, huruf kunci pilihan penulis per versi):** ${U.map((u) => `${NAMA[u.penulis]} a/b/c/d ${HURUF.map((h) => String(u.hurufKunci[h])).join('/')}`).join('; ')}.`, '');

  // ---- H2
  const d2 = deltaH2(js, 'pesan-pilihan');
  const d2ps = deltaH2(js, 'pilihan-saja');
  const h2 = putusanH2(d2.ds, d2.h, Math.min(d2.butirDs, d2.butirAnth));
  b.push('### H2 — penebak sekeluarga buta terhadap bocoran penulisnya', '');
  b.push(`- **Putusan (pesan+pilihan, rotasi tiga keluarga): ${h2}.** Δ_DS ${dua(d2.ds)}, Δ_H ${dua(d2.h)} (semodel Haiku→Haiku: ${dua(d2.hSemodel)}); butir rotasi DeepSeek ${String(d2.butirDs)}, Anthropic ${String(d2.butirAnth)}. Pilihan-saja (pelengkap): Δ_DS ${dua(d2ps.ds)}, Δ_H ${dua(d2ps.h)}. Ambang: keduanya ≤ −0,10 = mendukung; keduanya ≥ 0 = tidak.`);
  b.push('', '| penulis | kondisi | Haiku | DeepSeek | GLM |', '|---|---|---|---|---|');
  for (const p of PENULIS) {
    const j = jawabanDB(js, p);
    for (const k of ['pilihan-saja', 'pesan-pilihan'] as const) b.push(`| ${NAMA[p]} | ${k} | ${PENEBAK.map((m) => { const l = lajuKunci(j.filter((x) => x.model === m && x.kondisi === k)); return `${persen(l.laju)} (n ${String(l.n)}, tak ${String(l.tak_terbaca)})`; }).join(' | ')} |`);
  }
  b.push('', '**Pembaur jenis soal (wajib):** penulis memilih sudutnya sendiri. Sebaran kartu penentu (sudut) dan label pengecoh per penulis, atas semua versi terbaca:', '');
  for (const p of PENULIS) {
    const vs = js.filter((j) => j.slot.penulis === p).flatMap((j) => j.h.versi).filter((v) => v.omongan !== null);
    const sudut: Record<string, number> = {};
    const label: Record<string, number> = {};
    for (const v of vs) {
      for (const k of v.omongan?.kartu_penentu ?? []) sudut[k] = (sudut[k] ?? 0) + 1;
      for (const h of HURUF) {
        const e = v.omongan?.pengecoh[h];
        if (e !== undefined) label[e.jenis] = (label[e.jenis] ?? 0) + 1;
      }
    }
    b.push(`- ${NAMA[p]}: sudut ${Object.entries(sudut).sort((a, c) => c[1] - a[1]).map(([k, n]) => `${k} ${String(n)}`).join(', ') || '—'}; label ${Object.entries(label).sort((a, c) => c[1] - a[1]).map(([k, n]) => `${k} ${String(n)}`).join(', ') || '—'}.`);
  }
  const aO = lajuAuditOpus(audit, 'opus');
  const aH = lajuAuditOpus(audit, 'haiku');
  const aD = lajuAuditOpus(audit, 'deepseek');
  const gO = lajuGlmAkhir(js, 'opus');
  const gH = lajuGlmAkhir(js, 'haiku');
  const gDs = lajuGlmAkhir(js, 'deepseek');
  const h2opus = audit === null || aO.laju === null || aD.laju === null || gO === null || gDs === null ? null : aO.laju - aD.laju - (gO - gDs);
  const h3a = audit === null || aH.laju === null || aD.laju === null || gH === null || gDs === null ? null : aH.laju - aD.laju - (gH - gDs);
  b.push('', `- **H2-Opus (auditor Opus tanpa kartu, D-C): ${audit === null ? '**menunggu reviewer**' : putusanSelisih(h2opus, -0.1, Math.min(aO.butir, aD.butir))}.** ${audit === null ? 'Paket siap: `eval/keluaran-m2d13/audit-opus/` (satu soal per berkas, 4 rotasi, kunci di luar `bahan/`).' : `Opus pada butir Opus ${persen(aO.laju)} (${String(aO.k)}/${String(aO.n)}), pada butir DeepSeek ${persen(aD.laju)} (${String(aD.k)}/${String(aD.n)}); GLM (rotasi, versi akhir) ${persen(gO)} vs ${persen(gDs)}; selisih ${dua(h2opus)}.`}`, '');

  // ---- H3
  b.push('### H3 — keluaran Haiku terasa "masuk akal" bagi Opus', '');
  b.push(`- **H3a (auditor Opus): ${audit === null ? '**menunggu reviewer**' : putusanSelisih(h3a, -0.15, Math.min(aH.butir, aD.butir))}.** ${audit === null ? '' : `Opus pada butir Haiku ${persen(aH.laju)} (${String(aH.k)}/${String(aH.n)}), pada butir DeepSeek ${persen(aD.laju)}; GLM ${persen(gH)} vs ${persen(gDs)}; selisih ${dua(h3a)}.`}`);
  let S: number | null = null;
  let nS = 0;
  if (mutu.opus !== null && mutu.kunci !== null) {
    const selisih = (asal: readonly AsalMutu[]): number[] =>
      (mutu.kunci as KunciMutu).butir
        .filter((x) => asal.includes(x.asal))
        .map((x) => {
          const o = mutu.opus?.get(x.id_buta) ?? null;
          const g = mutu.glm.get(x.id_buta) ?? null;
          return o === null || g === null ? null : o.total - g.total;
        })
        .filter((x): x is number => x !== null);
    const an = selisih(['opus', 'haiku']);
    const ds = selisih(['deepseek']);
    nS = Math.min(an.length, ds.length);
    S = an.length === 0 || ds.length === 0 ? null : an.reduce((a, x) => a + x, 0) / an.length - ds.reduce((a, x) => a + x, 0) / ds.length;
  }
  b.push(`- **H3b (self-preference penilai): ${mutu.opus === null ? '**menunggu reviewer**' : putusanH3b(S, nS)}.** ${mutu.opus === null ? 'Paket siap: `eval/keluaran-m2d13/mutu-opus/` (satu butir per berkas, rubrik sama, asal disamarkan).' : `S = ${dua(S)} (Opus − GLM pada butir Anthropic dikurangi pada butir DeepSeek).`}`, '');

  // ---- kesepakatan penilai
  if (mutu.opus !== null && mutu.kunci !== null) {
    const pas = mutu.kunci.butir.map((x) => [mutu.glm.get(x.id_buta) ?? null, mutu.opus?.get(x.id_buta) ?? null] as const).filter((x): x is readonly [PenilaianMutu, PenilaianMutu] => x[0] !== null && x[1] !== null);
    const rho = spearman(pas.map((x) => x[0].total), pas.map((x) => x[1].total));
    const mad = pas.length === 0 ? null : pas.reduce((a, x) => a + Math.abs(x[0].total - x[1].total), 0) / pas.length;
    const sama = pas.filter((x) => x[0].layak_tayang === x[1].layak_tayang).length;
    b.push('### Kesepakatan dua penilai', '', `n ${String(pas.length)} butir; ρ Spearman total ${dua(rho)}; rata-rata |selisih| ${dua(mad)}; layak tayang sama ${String(sama)}/${String(pas.length)}.`, '');
    b.push('| asal | GLM | Opus |', '|---|---|---|');
    for (const a of ['opus', 'haiku', 'deepseek', 'templat-m2d11', 'tayang-dada'] as const) b.push(`| ${a} | ${dua(rataMutu(mutu, 'glm', a).rata)} | ${dua(rataMutu(mutu, 'opus', a).rata)} |`);
    b.push('');
  }

  // ---- H4
  const ukur = (u: UkuranPenulis): UkuranH4 => ({ L: u.L, vRata: u.vRata, q: { glm: rataMutu(mutu, 'glm', u.penulis).rata, opus: mutu.opus === null ? null : rataMutu(mutu, 'opus', u.penulis).rata }, versiPerLulus: u.versiPerLulus });
  const uO = U.find((u) => u.penulis === 'opus') as UkuranPenulis;
  const lain = U.filter((u) => u.penulis !== 'opus');
  const r4 = js.length === 0 ? null : putusanH4(ukur(uO), lain.map(ukur), { glm: gT.rata, opus: mutu.opus === null ? null : rataMutu(mutu, 'opus', 'templat-m2d11').rata });
  const sensor = js.filter((j) => j.h.tersensor);
  const tanpaSensor = js.filter((j) => !j.h.tersensor);
  const r4ts = (() => {
    const Ut = PENULIS.map((p) => ukurPenulis(tanpaSensor, p));
    if (Ut.some((u) => u.jalan === 0)) return null;
    const o = Ut.find((u) => u.penulis === 'opus') as UkuranPenulis;
    return putusanH4(ukur(o), Ut.filter((u) => u.penulis !== 'opus').map(ukur), { glm: gT.rata, opus: mutu.opus === null ? null : rataMutu(mutu, 'opus', 'templat-m2d11').rata });
  })();
  b.push('### H4 — Opus 5.5 tanpa penyempurna: soal lebih baik, revisi lebih sedikit (effort "low")', '');
  b.push(`- **Putusan (semua jalan): ${r4 === null ? 'tak bisa disimpulkan (belum ada jalan)' : `${r4.putusan}${r4.sementara ? ' — SEMENTARA (mutu GLM saja; penilai Opus menunggu reviewer)' : ''}`}.** ${r4?.alasan.join('; ') ?? ''}`);
  b.push(`- **Tanpa jalan tersensor** (${sensor.length === 0 ? 'tidak ada jalan tersensor' : `tersensor: ${sensor.map((j) => j.slot.id).join(', ')}`}): ${r4ts === null ? 'tak bisa dihitung (ada penulis tanpa jalan tak tersensor)' : `${r4ts.putusan}; ${r4ts.alasan.join('; ')}`}.`);
  b.push(`- **Post-hoc, bukan pra-registrasi** (perbandingan adil bila jalan Opus terpotong sebelum versi 3): lulus dalam ≤ 2 versi — ${U.map((u) => `${NAMA[u.penulis]} ${String(u.L2)}/${String(u.omongan)}`).join(', ')}.`, '');

  // ---- draf terbaik
  b.push('## 5. Draf terbaik tiap penulis', '', 'Jalan dengan omongan lulus terbanyak (seri: jalan pertama). Label pengecoh dan umpan balik ditulis penulis; isi label tidak divalidasi kode (hanya struktur). Tidak dipasang ke produk.', '');
  for (const p of PENULIS) {
    const d = js.filter((j) => j.slot.penulis === p).sort((a, c) => c.h.lulus.length - a.h.lulus.length)[0];
    b.push(`### ${NAMA[p]}${d === undefined ? '' : ` — ${d.slot.id} (${String(d.h.lulus.length)}/3 lulus${d.h.terbit ? ', TERBIT' : ''})`}`, '');
    if (d === undefined) {
      b.push('(belum ada jalan)', '');
      continue;
    }
    for (const a of d.h.akhir) b.push(...omonganMd(a));
  }

  // ---- biaya
  b.push('## 6. Biaya nyata (ledger `usage.cost`, tag `m2d13/` + `penyusun/m2d13-`)', '', '| model | entri | biaya |', '|---|---|---|');
  const bm = biayaModel(L);
  for (const x of bm) b.push(`| ${x.model} | ${String(x.n)} | ${usd(x.biaya)} |`);
  b.push(`| **total** | ${String(bm.reduce((a, x) => a + x.n, 0))} | **${usd(totalM)}** |`, '');
  b.push(`Bagian: D-B ${usd(db)} (pagu ${usd(PAGU_DB)}); D-D penilai GLM ${usd(dd)} (pagu ${usd(PAGU_DD)}). Kumulatif ledger ${usd(L.reduce((a, x) => a + x.biaya_usd, 0))} (${String(L.length)} entri).`, '');

  // ---- keterbatasan
  b.push('## 7. Keterbatasan', '');
  b.push('- n kecil (≤ 18 omongan, satu sampel per panggilan penulis), satu emiten (TIRT) dan satu tanggal; LLM bukan pemula — mutu yang diukur adalah mutu menurut penilai LLM.');
  b.push('- Prompt, rubrik, teladan DADA, eksekutor dan reviewer semuanya keluarga Anthropic (pembaur H3/H4).');
  b.push('- Pagu jalan pra-registrasi: Opus US$0,60. Dengan effort "low" penulis Opus tetap berpikir ~3.000–4.600 token per panggilan (US$0,15–0,20), dan perkiraan maksimum panggilan berikutnya (≈ US$0,25) dicek sebelum kirim — jalan Opus bisa terpotong sebelum versi 3 (tersensor; aturan pra-registrasi §6). Perbandingan "≤ 2 versi" di H4 adalah post-hoc.');
  b.push('- Ketepatan isi label pengecoh tidak diperiksa kode (hanya struktur); dinilai penilai mutu (kriteria 2).');
  b.push('- Angka yang ditulis dengan kata tidak diperiksa aturan angka-di-kartu.');
  b.push('- Penyedia OpenRouter bisa berganti antar panggilan (dicatat di jejak/ledger).');
  b.push('');
  b.push('## 8. Menunggu reviewer', '');
  b.push(`- **Audit Opus satu soal (D-C):** ${audit === null ? 'menunggu' : 'sudah dinilai'} — \`eval/keluaran-m2d13/audit-opus/\` (PETUNJUK.md).`);
  b.push(`- **Penilai mutu Opus (D-D):** ${mutu.opus === null ? 'menunggu' : 'sudah dinilai'} — \`eval/keluaran-m2d13/mutu-opus/\` (PETUNJUK.md).`);
  b.push('- Sesudah keduanya: `npm run penulis:audit -- --nilai`, `npm run penulis:mutu -- --nilai-opus`, `npm run penulis:laporan`.', '');
  return `${b.join('\n')}\n`;
}

if (/(^|[\\/])bebas[\\/]laporan-penulis\.ts$/.test(process.argv[1] ?? '')) {
  writeFileSync(JALUR_LAPORAN, bangunLaporan(), 'utf8');
  console.log(`ditulis ${JALUR_LAPORAN}`);
}

export type { Putusan };
