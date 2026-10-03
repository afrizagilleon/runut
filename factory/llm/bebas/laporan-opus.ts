/**
 * `npm run opus:laporan` — D-6 M2d-15: `docs/bukti/lingkar-agen-opus.md`
 * dibangun dari keluaran tersimpan (jalan `eval/penyusun/m2d15-opus-*`,
 * pembanding M2d-11 & M2d-13, paket reviewer & penilai GLM bila ada) dan
 * ledger OpenRouter. Angka dihitung ulang tiap kali; kalimat bertanda
 * **Tafsiran** = bacaan eksekutor. Pra-registrasi
 * `docs/bukti/m2d15-praregistrasi.md` + amandemen `m2d15-amandemen-A1.md`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../../skema/rujukan.ts';
import { AKAR } from '../env.ts';
import { JALUR_LEDGER, type EntriLedger } from '../pagu.ts';
import type { JawabanRotasi } from '../rotasi/rotasi.ts';
import { lajuKunci, wilson } from './analisis-lama.ts';
import { bankSudut } from './bank-sudut.ts';
import type { HasilBebas, VersiBebas } from './mesin.ts';
import type { PenilaianMutu } from './mutu.ts';
import { AUDIT_MAKS_BENAR, MAKS_JALAN_M2D15, PAGU_D4_M2D15, PAGU_JALAN_M2D15, PAGU_MILESTONE_M2D15, idJalanM2d15, paguPenilaiM2d15 } from './pagu-m2d15.ts';
import { HURUF, type OmonganBebas } from './skema.ts';

export const JALUR_LAPORAN_OPUS = `${AKAR}docs/bukti/lingkar-agen-opus.md`;
const F15 = `${AKAR}eval/keluaran-m2d15`;

const persen = (x: number | null): string => (x === null ? '—' : `${(x * 100).toFixed(0)} %`);
const dua = (x: number | null): string => (x === null ? '—' : x.toFixed(2).replace('.', ','));
const usd = (x: number | null): string => (x === null ? '—' : `US$${x.toFixed(4)}`);
const wil = (k: number, n: number): string => {
  const w = wilson(k, n);
  return w === null ? '' : ` [${persen(w[0])}–${persen(w[1])}]`;
};
function json<T>(jalur: string): T | null {
  return existsSync(jalur) ? (JSON.parse(readFileSync(jalur, 'utf8')) as T) : null;
}
function ledger(): EntriLedger[] {
  return existsSync(JALUR_LEDGER) ? readFileSync(JALUR_LEDGER, 'utf8').split(/\r?\n/).filter((x) => x.trim() !== '').map((x) => JSON.parse(x) as EntriLedger) : [];
}

/* ---------------------------------------------------------------------- */
/* jenis penolakan                                                         */
/* ---------------------------------------------------------------------- */

/** Jenis aturan dari satu alasan gerbang kode / pra-periksa. Murni. */
export function jenisAlasan(a: string): string {
  const s = a.replace(/^omongan \d+: /, '');
  let m = /^validator seluruh draf \[([A-Z_]+)\]/.exec(s);
  if (m !== null) return m[1] as string;
  m = /^pemeriksa: ([A-Za-z0-9_-]+)/.exec(s);
  if (m !== null) return m[1] as string;
  m = /^detektor (D\d)/.exec(s);
  if (m !== null) return m[1] as string;
  m = /^M2d-13: ([a-z -]+?):/.exec(s);
  if (m !== null) return m[1] as string;
  if (s.startsWith('gerbang artefak: meresmikan')) return 'meresmikan';
  if (s.startsWith('gerbang artefak: keseimbangan')) return 'keseimbangan';
  if (s.startsWith('anti-salin')) return 'anti-salin';
  if (s.startsWith('A-2')) return 'A-2 kalender';
  return 'lain';
}

/** Hitung versi per jenis (satu versi dihitung sekali per jenis). Murni. */
export function hitungJenis(daftar: ReadonlyArray<readonly string[]>): Record<string, number> {
  const h: Record<string, number> = {};
  for (const alasan of daftar) for (const j of new Set(alasan.map(jenisAlasan))) h[j] = (h[j] ?? 0) + 1;
  return Object.fromEntries(Object.entries(h).sort((a, b) => b[1] - a[1]));
}
const tulisJenis = (h: Record<string, number>): string => (Object.keys(h).length === 0 ? '—' : Object.entries(h).map(([k, n]) => `${k} ${String(n)}`).join(', '));

/* ---------------------------------------------------------------------- */
/* data                                                                    */
/* ---------------------------------------------------------------------- */

interface Jalan {
  id: string;
  h: HasilBebas;
  biaya: { total: number; penulis: number; gerbang: number };
}

/** Jalan yang dihentikan untuk amandemen teknis (tanpa hasil.json): dibaca dari dihentikan.json. */
function dihentikan(id: string): HasilBebas | null {
  const d = json<{ panggilan_penulis: Array<{ token_masuk?: number; token_keluar?: number; token_penalaran?: number; finish_reason?: string; biaya_usd: number; masalah: string }>; versi: Array<{ no: number; versi: number; berhenti: string; alasan: string[] }> }>(`${AKAR}eval/penyusun/${id}/dihentikan.json`);
  if (d === null) return null;
  return {
    penulis: 'anthropic/claude-opus-5.5',
    terbit: false,
    berhenti: 'dihentikan untuk amandemen teknis T1 (docs/bukti/m2d15-amandemen-teknis-T1.md): dua panggilan penulis pertama habis di max_tokens 16.000 tanpa JSON',
    tersensor: false,
    versi: d.versi.map((v) => ({ ...v, berhenti: v.berhenti as VersiBebas['berhenti'], dicatat: [], omongan: null, rotasi: null, kartu_rotasi: null, kritik: null, biaya_gerbang_usd: 0 })),
    panggilan_penulis: d.panggilan_penulis.map((p) => ({ versi: 1, diminta: [1, 2, 3], ulang: 0, model: 'anthropic/claude-opus-5.5', token_masuk: p.token_masuk ?? 0, token_keluar: p.token_keluar ?? 0, token_penalaran: p.token_penalaran ?? null, penyedia: null, finish_reason: p.finish_reason ?? null, biaya_usd: p.biaya_usd, terbaca: [], masalah: [p.masalah], sha256_prompt: '', jenis: 'tulis' as const })),
    lulus: [],
    akhir: [null, null, null],
    validasi_draf: [],
    draf: null,
    sha256_prompt_sistem: '',
    pra_periksa: [],
  };
}

function muat(prefix: string, ids: readonly string[], L: readonly EntriLedger[]): Jalan[] {
  const hasil: Jalan[] = [];
  for (const id of ids) {
    const h = json<HasilBebas>(`${AKAR}eval/penyusun/${id}/hasil.json`) ?? dihentikan(id);
    if (h === null) continue;
    const e = L.filter((x) => x.tag.startsWith(`${prefix}${id}/`));
    const total = e.reduce((a, x) => a + x.biaya_usd, 0);
    const penulis = e.filter((x) => x.tag.includes('/tulis-bebas') || x.tag.includes('/tulis-praperiksa')).reduce((a, x) => a + x.biaya_usd, 0);
    hasil.push({ id, h, biaya: { total, penulis, gerbang: total - penulis } });
  }
  return hasil;
}

interface Ukuran {
  jalan: number;
  versi: number;
  lulus: number;
  omongan: number;
  versiPerLulus: number | null;
  biaya: number;
  biayaPerLulus: number | null;
  terbit: number;
  tersensor: number;
  berhenti: Record<string, number>;
  ps: ReturnType<typeof lajuKunci>;
  pp: ReturnType<typeof lajuKunci>;
}

function ukur(js: readonly Jalan[]): Ukuran {
  const versi = js.flatMap((j) => j.h.versi);
  const lulus = js.reduce((a, j) => a + j.h.lulus.length, 0);
  const biaya = js.reduce((a, j) => a + j.biaya.total, 0);
  const berhenti: Record<string, number> = {};
  for (const v of versi) berhenti[v.berhenti] = (berhenti[v.berhenti] ?? 0) + 1;
  const jw: JawabanRotasi[] = versi.flatMap((v) => v.rotasi?.jawaban ?? []);
  return {
    jalan: js.length,
    versi: versi.length,
    lulus,
    omongan: 3 * js.length,
    versiPerLulus: lulus === 0 ? null : versi.length / lulus,
    biaya,
    biayaPerLulus: lulus === 0 ? null : biaya / lulus,
    terbit: js.filter((j) => j.h.terbit).length,
    tersensor: js.filter((j) => j.h.tersensor).length,
    berhenti,
    ps: lajuKunci(jw.filter((x) => x.kondisi === 'pilihan-saja')),
    pp: lajuKunci(jw.filter((x) => x.kondisi === 'pesan-pilihan')),
  };
}

/** Templat M2d-11: versi dari hasil.json (bentuk lain), laju kunci dari rotasi tersimpan. */
function ukurTemplat(L: readonly EntriLedger[]): { versi: number; lulus: number; biaya: number; ps: ReturnType<typeof lajuKunci> } {
  let versi = 0;
  let lulus = 0;
  const jw: JawabanRotasi[] = [];
  for (let n = 1; n <= 7; n++) {
    const h = json<{ versi: Array<{ berhenti: string; rotasi?: { jawaban: JawabanRotasi[] } | null }> }>(`${AKAR}eval/penyusun/m2d11-tirt-${String(n)}/hasil.json`);
    if (h === null) continue;
    versi += h.versi.length;
    if (n === 7) lulus = h.versi.filter((v) => v.berhenti === 'lolos').length;
    for (const v of h.versi) jw.push(...(v.rotasi?.jawaban ?? []));
  }
  const biaya = L.filter((e) => e.tag.startsWith('penyusun/m2d11-tirt-')).reduce((a, e) => a + e.biaya_usd, 0);
  return { versi, lulus, biaya, ps: lajuKunci(jw.filter((x) => x.kondisi === 'pilihan-saja')) };
}

/** Mutu penilai buta per asal dari kunci + nilai. */
function mutuPerAsal(kunci: string, nilai: string, ambil: (x: unknown) => Array<{ id_buta: string; penilaian: PenilaianMutu | null }>): Record<string, { rata: number; n: number; layak: number }> | null {
  const k = json<{ butir: Array<{ id_buta: string; asal: string }> }>(kunci);
  const v = json<unknown>(nilai);
  if (k === null || v === null) return null;
  const per: Record<string, number[]> = {};
  const layak: Record<string, number> = {};
  for (const h of ambil(v)) {
    const a = k.butir.find((b) => b.id_buta === h.id_buta)?.asal;
    if (a === undefined || h.penilaian === null) continue;
    (per[a] ??= []).push(h.penilaian.total);
    layak[a] = (layak[a] ?? 0) + (h.penilaian.layak_tayang ? 1 : 0);
  }
  return Object.fromEntries(Object.entries(per).map(([a, xs]) => [a, { rata: xs.reduce((s, x) => s + x, 0) / xs.length, n: xs.length, layak: layak[a] ?? 0 }]));
}
const ambilOpus = (x: unknown): Array<{ id_buta: string; penilaian: PenilaianMutu | null }> => (x as { hasil: Array<{ id_buta: string; penilaian: PenilaianMutu | null }> }).hasil;

/* ---------------------------------------------------------------------- */
/* laporan                                                                 */
/* ---------------------------------------------------------------------- */

function omonganTeks(no: number, v: VersiBebas | { versi: number; omongan: OmonganBebas; berhenti: string }, catatan: string): string[] {
  const o = v.omongan as OmonganBebas;
  const b: string[] = [];
  b.push(`**Omongan ${String(no)}** — versi ${String(v.versi)}, ${v.berhenti === 'lolos' ? '**LULUS gerbang**' : `tidak lulus (berhenti: ${v.berhenti})`}; kunci ${o.kunci}; kartu ${o.kartu.join(', ')} (penentu ${o.kartu_penentu.join(', ')})${catatan}`, '');
  b.push(`Pesan (${o.nama}, ${o.jam}): "${teksPolos(o.pesan)}"`, '');
  for (const h of HURUF) {
    const p = o.pengecoh[h];
    b.push(`- ${h}) ${teksPolos(o.pilihan[h])}${h === o.kunci ? ' ← kunci' : p === undefined ? '' : ` — _${p.jenis}_ (${p.rujukan}): ${teksPolos(p.umpan_balik)}`}`);
  }
  b.push('', `Penjelasan: ${teksPolos(o.penjelasan)}`, '', `Pertanyaan cek: ${o.pertanyaan_cek}`, '');
  return b;
}

export function bangunLaporanOpus(): string {
  const L = ledger();
  const ids15 = Array.from({ length: MAKS_JALAN_M2D15 }, (_, i) => idJalanM2d15(i + 1));
  const j15 = muat('penyusun/', ids15, L);
  const j13 = muat('penyusun/', ['m2d13-opus-1', 'm2d13-opus-2'], L);
  const u15 = ukur(j15);
  const u13 = ukur(j13);
  const tpl = ukurTemplat(L);
  const audit = json<{ per_butir: Array<{ jalan: string; no: number; versi: number; lulus: boolean; tanpa_kartu_benar: number; n: number }> }>(`${F15}/audit-opus/nilai.json`);
  const mutuOpus15 = mutuPerAsal(`${F15}/kunci-mutu.json`, `${F15}/mutu-opus/nilai.json`, ambilOpus);
  const mutuGlm15 = mutuPerAsal(`${F15}/kunci-mutu.json`, `${F15}/mutu/glm.json`, ambilOpus);
  const mutuOpus13 = mutuPerAsal(`${AKAR}eval/keluaran-m2d13/kunci-mutu.json`, `${AKAR}eval/keluaran-m2d13/mutu-opus/nilai.json`, ambilOpus);
  const e15 = L.filter((e) => e.tag.startsWith('penyusun/m2d15-') || e.tag.startsWith('m2d15/'));
  const biayaD4 = L.filter((e) => e.tag.startsWith('penyusun/m2d15-')).reduce((a, e) => a + e.biaya_usd, 0);
  const biayaMutu = L.filter((e) => e.tag.startsWith('m2d15/mutu/')).reduce((a, e) => a + e.biaya_usd, 0);
  const totalM = e15.reduce((a, e) => a + e.biaya_usd, 0);
  // kumulatif sampai entri M2d-15 terakhir (laporan tidak ikut berubah oleh milestone sesudahnya)
  const akhirM15 = L.reduce((i, e, k) => (e.tag.startsWith('penyusun/m2d15-') || e.tag.startsWith('m2d15/') ? k : i), -1);
  const LK = L.slice(0, akhirM15 + 1);
  const kumulatif = LK.reduce((a, e) => a + e.biaya_usd, 0);

  // audit per jalan & patokan
  const auditButir = (id: string, no: number): { k: number; n: number } | null => {
    const x = audit?.per_butir.find((b) => b.jalan === id && b.no === no);
    return x === undefined ? null : { k: x.tanpa_kartu_benar, n: x.n };
  };
  const kelas = (j: Jalan): string => {
    if (j.h.tersensor && !j.h.terbit) return 'tersensor (tidak terbit)';
    if (!j.h.terbit) return 'tidak terbit';
    const a = j.h.lulus.map((l) => auditButir(j.id, l.no));
    if (a.some((x) => x === null)) return 'lulus gerbang (a); audit (b) **menunggu reviewer**';
    return a.every((x) => x !== null && x.k <= AUDIT_MAKS_BENAR) ? '**LAYAK TAYANG** (a + b)' : 'lulus gerbang, **tidak layak** (audit b gagal)';
  };

  const b: string[] = [];
  b.push('# Lingkar agen M2d-15 — Opus 5.5 ditingkatkan (penalaran lebih panjang — effort "medium", lalu 8.000 token sesudah amandemen T1 — aturan kode di prompt, pra-periksa kode gratis, bank sudut)', '');
  b.push(
    '> Laporan ini dibangun skrip (`npm run opus:laporan`, `factory/llm/bebas/laporan-opus.ts`) dari keluaran tersimpan (`eval/penyusun/m2d15-opus-*/`, `eval/keluaran-m2d15/`, pembanding M2d-11 & M2d-13) dan ledger OpenRouter. Kalimat bertanda **Tafsiran** adalah bacaan eksekutor. Pra-registrasi: `docs/bukti/m2d15-praregistrasi.md` (commit f98427f, sebelum panggilan berbayar pertama) + amandemen pra-data `docs/bukti/m2d15-amandemen-A1.md` (A1 label bank, A2 pagu jalan US$2,00, A3 tag `m2d15/`; commit 36f7cca, juga sebelum panggilan berbayar; keduanya dites).',
    '',
  );

  // ringkasan
  b.push('## Ringkasan', '');
  b.push(`- **Jalan:** ${String(j15.length)} dari maks ${String(MAKS_JALAN_M2D15)}. ${j15.map((j) => `${j.id}: ${kelas(j)}`).join('; ') || '—'}.`);
  b.push(`- **Omongan lulus gerbang (≤ 3 versi):** ${String(u15.lulus)}/${String(u15.omongan)}; versi diperiksa ${String(u15.versi)}; versi per omongan lulus ${dua(u15.versiPerLulus)} (Opus M2d-13 ${dua(u13.versiPerLulus)}; templat M2d-11 ${dua(tpl.lulus === 0 ? null : tpl.versi / tpl.lulus)}).`);
  b.push(`- **Biaya nyata:** D-4 ${usd(biayaD4)} dari US$${PAGU_D4_M2D15.toFixed(2)}; penilai GLM ${usd(biayaMutu)} dari ${usd(paguPenilaiM2d15(biayaD4))}; milestone ${usd(totalM)} dari US$${PAGU_MILESTONE_M2D15.toFixed(2)}. Kumulatif ledger ${usd(kumulatif)} (${String(LK.length)} entri).`);
  b.push('');

  // per jalan
  b.push('## 1. Jalan D-4 (hasil vs patokan §2)', '');
  b.push(`Setelan: Opus 5.5, \`max_tokens\` 16.000, suhu 1,0; penalaran \`reasoning.effort: "medium"\` (pra-registrasi) di jalan 1, lalu \`reasoning.max_tokens\` 8.000 sesudah **amandemen teknis T1** (\`docs/bukti/m2d15-amandemen-teknis-T1.md\`: dua panggilan pertama effort "medium" habis 16.000 token tanpa JSON); prompt v2 + bank sudut beku (A1); pra-periksa ≤ 2 tulis-ulang per versi; pagu jalan min(US$${PAGU_JALAN_M2D15.toFixed(2)}; US$2,70 − biaya sebelumnya) (A2). Paket TIRT-7 sha256 f7cabc6b….`, '');
  b.push('| jalan | kelas | versi per omongan (berhenti) | tulis-ulang pra-periksa | panggilan penulis (terpotong) · token masuk/keluar/penalaran | biaya penulis | biaya gerbang | total | sha prompt | berhenti |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const j of j15) {
    const per = [1, 2, 3].map((n) => `o${String(n)}: ${j.h.versi.filter((v) => v.no === n).map((v) => v.berhenti).join('→') || '—'}`).join('; ');
    const pp = j.h.panggilan_penulis;
    const pra = j.h.pra_periksa ?? [];
    b.push(
      `| ${j.id} | ${kelas(j)} | ${per} | ${String(pra.filter((x) => x.dilewati === null).length)} dikirim, ${String(pra.filter((x) => x.dilewati !== null).length)} dilewati pagu | ${String(pp.length)} (${String(pp.filter((x) => x.finish_reason === 'length').length)}) · ${String(pp.reduce((a, x) => a + x.token_masuk, 0))}/${String(pp.reduce((a, x) => a + x.token_keluar, 0))}/${String(pp.reduce((a, x) => a + (x.token_penalaran ?? 0), 0))} | ${usd(j.biaya.penulis)} | ${usd(j.biaya.gerbang)} | ${usd(j.biaya.total)} | ${j.h.sha256_prompt_sistem.slice(0, 12)}… | ${(j.h.berhenti ?? 'terbit').slice(0, 200)} |`,
    );
  }
  b.push('');
  for (const j of j15) {
    b.push(`<details><summary>${j.id}: pra-periksa dan alasan penolakan per versi</summary>`, '');
    b.push('| versi | pra-periksa ke | omongan ditolak: jenis aturan | dilewati |', '|---|---|---|---|');
    for (const p of j.h.pra_periksa ?? []) b.push(`| ${String(p.versi)} | ${String(p.ke)} | ${p.ditolak.map((d) => `o${String(d.no)}: ${tulisJenis(hitungJenis([d.alasan]))}`).join('; ')} | ${p.dilewati === null ? '—' : p.dilewati.slice(0, 120)} |`);
    b.push('', '| omongan | versi | berhenti | alasan |', '|---|---|---|---|');
    for (const v of j.h.versi) b.push(`| ${String(v.no)} | ${String(v.versi)} | ${v.berhenti} | ${v.alasan.join(' · ').replace(/\|/g, '/').slice(0, 600)} |`);
    b.push('', '</details>', '');
  }

  // audit
  b.push('## 2. Audit Opus satu soal tanpa kartu (patokan §2 b — dijalankan reviewer)', '');
  if (audit === null) b.push('**Menunggu reviewer.** Paket siap: `eval/keluaran-m2d15/audit-opus/` (satu soal × satu rotasi per berkas, kunci di luar `bahan/`, `PETUNJUK.md`). Sesudah dijalankan: `npm run opus:audit -- --nilai`, lalu `npm run opus:laporan`.', '');
  else {
    b.push('| jalan | omongan | versi | lulus gerbang | Opus tanpa kartu | (b) ≤ 2/4 |', '|---|---|---|---|---|---|');
    for (const x of audit.per_butir) b.push(`| ${x.jalan} | ${String(x.no)} | ${String(x.versi)} | ${x.lulus ? 'ya' : 'tidak'} | ${String(x.tanpa_kartu_benar)}/${String(x.n)} | ${x.tanpa_kartu_benar <= AUDIT_MAKS_BENAR ? 'ya' : 'tidak'} |`);
    b.push('');
  }

  // kenapa opus
  const q = (m: Record<string, { rata: number; n: number; layak: number }> | null, a: string): string => (m === null || m[a] === undefined ? '—' : `${dua(m[a].rata)} (n ${String(m[a].n)}, layak ${String(m[a].layak)})`);
  b.push('## 3. Kenapa Opus — efisien → efektif', '');
  b.push('| | templat murah (M2d-11) | Opus 5.5 effort "low" (M2d-13) | Opus 5.5 ditingkatkan (M2d-15) |', '|---|---|---|---|');
  b.push(`| jalan · omongan lulus gerbang | 7 jalan · ${String(tpl.lulus)} | ${String(u13.jalan)} jalan · ${String(u13.lulus)}/${String(u13.omongan)} (tersensor ${String(u13.tersensor)}) | ${String(u15.jalan)} jalan · ${String(u15.lulus)}/${String(u15.omongan)} (tersensor ${String(u15.tersensor)}) |`);
  b.push(`| versi per omongan lulus | ${dua(tpl.lulus === 0 ? null : tpl.versi / tpl.lulus)} (${String(tpl.versi)} versi) | ${dua(u13.versiPerLulus)} | ${dua(u15.versiPerLulus)} |`);
  b.push(`| biaya nyata per omongan lulus | ${usd(tpl.lulus === 0 ? null : tpl.biaya / tpl.lulus)} (7 jalan, US$${tpl.biaya.toFixed(4)}) | ${usd(u13.biayaPerLulus)} | ${usd(u15.biayaPerLulus)} |`);
  b.push(`| simulasi terbit | 1 (jalan ke-7) | ${String(u13.terbit)} | ${String(u15.terbit)} |`);
  b.push(`| kunci dipilih dari pilihan-saja (rotasi, terbaca; acak 25 %) | ${persen(tpl.ps.laju)} (n ${String(tpl.ps.n)}) | ${persen(u13.ps.laju)}${wil(u13.ps.kunci, u13.ps.n)} (n ${String(u13.ps.n)}) | ${persen(u15.ps.laju)}${wil(u15.ps.kunci, u15.ps.n)} (n ${String(u15.ps.n)}) |`);
  b.push(`| kunci dari pesan+pilihan | — | ${persen(u13.pp.laju)} (n ${String(u13.pp.n)}) | ${persen(u15.pp.laju)} (n ${String(u15.pp.n)}) |`);
  b.push(`| mutu penilai Opus buta (0–10) | ${q(mutuOpus13, 'templat-m2d11')} | ${q(mutuOpus13, 'opus')} | ${mutuOpus15 === null ? 'menunggu reviewer' : q(mutuOpus15, 'opus-m2d15')} |`);
  b.push(`| mutu penilai GLM "high" (0–10) | ${q(mutuGlm15, 'templat-m2d11')} | ${q(mutuGlm15, 'opus-m2d13')} (2 butir lulus) | ${q(mutuGlm15, 'opus-m2d15')} |`);
  b.push(`| DADA tayang (pembanding) | Opus M2d-13 ${q(mutuOpus13, 'tayang-dada')} | | Opus M2d-15 ${mutuOpus15 === null ? '—' : q(mutuOpus15, 'tayang-dada')}; GLM ${q(mutuGlm15, 'tayang-dada')} |`);
  b.push('');

  // penolakan per jenis
  const v13 = j13.flatMap((j) => j.h.versi);
  const v15 = j15.flatMap((j) => j.h.versi);
  const pertama = j15.flatMap((j) => (j.h.pra_periksa ?? []).filter((p) => p.ke === 1).flatMap((p) => p.ditolak.map((d) => d.alasan)));
  const semuaPra = j15.flatMap((j) => (j.h.pra_periksa ?? []).flatMap((p) => p.ditolak.map((d) => d.alasan)));
  const tulisanPertama = j15.reduce((a, j) => a + new Set(j.h.versi.map((v) => `${String(v.versi)}/${String(v.no)}`)).size, 0);
  b.push('## 4. Penolakan per jenis — sebelum / sesudah aturan di prompt', '');
  b.push('| ukuran | Opus M2d-13 (prompt v1, tanpa pra-periksa) | Opus M2d-15 |', '|---|---|---|');
  b.push(`| versi berhenti di gerbang 1 kode resmi | ${String(v13.filter((v) => v.berhenti === 'kode').length)}/${String(v13.length)} | ${String(v15.filter((v) => v.berhenti === 'kode').length)}/${String(v15.length)} |`);
  b.push(`| tulisan pertama tiap versi ditolak aturan kode (M2d-13: gerbang 1; M2d-15: pra-periksa ke-1) | ${String(v13.filter((v) => v.berhenti === 'kode').length)}/${String(v13.length)} | ${String(pertama.length)}/${String(tulisanPertama)} |`);
  b.push(`| jenis aturan pada tulisan pertama (versi per jenis) | ${tulisJenis(hitungJenis(v13.filter((v) => v.berhenti === 'kode').map((v) => v.alasan)))} | ${tulisJenis(hitungJenis(pertama))} |`);
  b.push(`| jenis aturan, semua pra-periksa | — | ${tulisJenis(hitungJenis(semuaPra))} |`);
  b.push(`| jenis aturan di gerbang 1 resmi | ${tulisJenis(hitungJenis(v13.filter((v) => v.berhenti === 'kode').map((v) => v.alasan)))} | ${tulisJenis(hitungJenis(v15.filter((v) => v.berhenti === 'kode').map((v) => v.alasan)))} |`);
  b.push(`| berhenti di gerbang berbayar: penebak / kartu / kritikus | ${String(u13.berhenti['penebak'] ?? 0)} / ${String(u13.berhenti['kartu'] ?? 0)} / ${String(u13.berhenti['kritikus'] ?? 0)} | ${String(u15.berhenti['penebak'] ?? 0)} / ${String(u15.berhenti['kartu'] ?? 0)} / ${String(u15.berhenti['kritikus'] ?? 0)} |`);
  b.push(`| tulis-gagal · tersensor | ${String(u13.berhenti['tulis-gagal'] ?? 0)} · ${String(u13.tersensor)} jalan | ${String(u15.berhenti['tulis-gagal'] ?? 0)} · ${String(u15.tersensor)} jalan |`);
  b.push('');

  // sudut
  const bank = bankSudut(JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as Parameters<typeof bankSudut>[0]);
  b.push('## 5. Sudut yang dipilih penulis (bank sudut A1)', '');
  b.push('| jalan | omongan | kartu penentu versi akhir | label bank | lulus |', '|---|---|---|---|---|');
  for (const j of j15) for (const a of j.h.akhir) if (a !== null) b.push(`| ${j.id} | ${String(a.no)} | ${a.omongan.kartu_penentu.join(', ')} | ${a.omongan.kartu_penentu.map((k) => bank.find((s) => s.fact_id === k)?.label ?? '?').join(', ')} | ${a.lulus ? 'ya' : 'tidak'} |`);
  b.push('');

  // ramalan
  const kode = v15.filter((v) => v.berhenti === 'kode').length;
  const v1Lolos = j15.length === 0 ? null : (() => {
    const j = j15[0] as Jalan;
    const tolak = (j.h.pra_periksa ?? []).find((p) => p.versi === 1 && p.ke === 1)?.ditolak.length ?? 0;
    const ditulis = new Set(j.h.versi.filter((v) => v.versi === 1).map((v) => v.no)).size;
    return { lolos: ditulis - tolak, n: ditulis };
  })();
  const ps = u15.ps.laju;
  const auditLulus = audit === null ? null : audit.per_butir.filter((x) => x.lulus);
  const ramal: Array<[string, string, string]> = [
    ['R1 versi berhenti di gerbang 1 kode ≤ 1/6', `${String(kode)}/${String(v15.length)}`, v15.length === 0 ? 'tak terukur' : kode / v15.length <= 1 / 6 ? 'sesuai' : 'tidak'],
    ['R2 lolos pra-periksa pada tulisan pertama versi 1 ≥ 2/3', v1Lolos === null ? '—' : `${String(v1Lolos.lolos)}/${String(v1Lolos.n)}`, v1Lolos === null || v1Lolos.n === 0 ? 'tak terukur' : v1Lolos.lolos / v1Lolos.n >= 2 / 3 ? 'sesuai' : 'tidak'],
    ['R3 jalan 1 terbit (a)', j15[0] === undefined ? '—' : j15[0].h.terbit ? 'terbit' : 'tidak terbit', j15[0] === undefined ? 'tak terukur' : j15[0].h.terbit ? 'sesuai' : 'tidak'],
    ['R4 versi per omongan lulus ≤ 2,0', dua(u15.versiPerLulus), u15.versiPerLulus === null ? 'tidak (tak ada yang lulus)' : u15.versiPerLulus <= 2 ? 'sesuai' : 'tidak'],
    ['R5 biaya per omongan lulus ≤ US$0,50', usd(u15.biayaPerLulus), u15.biayaPerLulus === null ? 'tidak (tak ada yang lulus)' : u15.biayaPerLulus <= 0.5 ? 'sesuai' : 'tidak'],
    ['R6 kunci pilihan-saja ≤ 30 %', `${persen(ps)} (n ${String(u15.ps.n)})`, ps === null ? 'tak terukur' : ps <= 0.3 ? 'sesuai' : 'tidak'],
    ['R7 ≥ 2 dari 3 omongan lulus dengan audit ≤ 2/4 (jalan terbit)', auditLulus === null ? 'menunggu reviewer' : `${String(auditLulus.filter((x) => x.tanpa_kartu_benar <= 2).length)}/${String(auditLulus.length)}`, auditLulus === null ? 'menunggu reviewer' : u15.terbit === 0 ? 'tak terukur (tidak ada jalan terbit)' : auditLulus.filter((x) => x.tanpa_kartu_benar <= 2).length >= 2 ? 'sesuai' : 'tidak'],
    ['R8 mutu Opus buta versi akhir ≥ 8,5', mutuOpus15?.['opus-m2d15'] === undefined ? 'menunggu reviewer' : dua(mutuOpus15['opus-m2d15'].rata), mutuOpus15?.['opus-m2d15'] === undefined ? 'menunggu reviewer' : mutuOpus15['opus-m2d15'].rata >= 8.5 ? 'sesuai' : 'tidak'],
  ];
  b.push('## 6. Ramalan arah (pra-registrasi §8)', '', '| ramalan | hasil | putusan |', '|---|---|---|');
  for (const [r, h, p] of ramal) b.push(`| ${r} | ${h} | ${p} |`);
  b.push('');

  // draf
  b.push('## 7. Draf lengkap (versi akhir tiap omongan)', '');
  b.push('Label pengecoh dan umpan balik ditulis penulis; isi label tidak divalidasi kode (hanya struktur). Tidak dipasang ke produk; tidak ada yang ditulis ke `cases/`.', '');
  for (const j of j15) {
    b.push(`### ${j.id} — ${kelas(j)}`, '');
    for (const a of j.h.akhir) {
      if (a === null) continue;
      const au = auditButir(j.id, a.no);
      b.push(...omonganTeks(a.no, { versi: a.versi, omongan: a.omongan, berhenti: a.lulus ? 'lolos' : (j.h.versi.filter((v) => v.no === a.no).at(-1)?.berhenti ?? '?') }, au === null ? '' : `; audit Opus tanpa kartu ${String(au.k)}/${String(au.n)}`));
    }
  }

  // biaya
  b.push('## 8. Biaya nyata (ledger `usage.cost`, tag `penyusun/m2d15-` + `m2d15/`)', '', '| model | entri | biaya |', '|---|---|---|');
  const perModel: Record<string, { n: number; b: number }> = {};
  for (const e of e15) {
    const x = (perModel[e.model] ??= { n: 0, b: 0 });
    x.n += 1;
    x.b += e.biaya_usd;
  }
  for (const [m, x] of Object.entries(perModel).sort()) b.push(`| ${m} | ${String(x.n)} | ${usd(x.b)} |`);
  b.push(`| **total** | ${String(e15.length)} | **${usd(totalM)}** |`, '');
  b.push(`Bagian: D-4 ${usd(biayaD4)} (pagu US$${PAGU_D4_M2D15.toFixed(2)}); penilai GLM ${usd(biayaMutu)}. Kumulatif ledger ${usd(kumulatif)}.`, '');

  // keterbatasan
  b.push('## 9. Keterbatasan', '');
  b.push('- n sangat kecil: 1–2 jalan, ≤ 6 omongan, satu emiten (TIRT), satu tanggal, satu sampel per panggilan penulis.');
  b.push('- Empat perubahan sekaligus (effort, prompt v2, pra-periksa, bank sudut + pagu jalan): hasil tidak bisa diatribusikan ke satu faktor.');
  b.push('- Penulis, auditor (b), penilai Opus, eksekutor, reviewer sekeluarga (Anthropic); penilai GLM M2d-13 menunjukkan efek langit-langit.');
  b.push('- LLM bukan pemula: "layak tayang" = lulus gerbang + audit model, bukan bukti pemain belajar.');
  b.push('- Percobaan berulang (≤ 3 versi, ≤ 2 jalan, ≤ 2 tulis-ulang pra-periksa per versi) menaikkan peluang lulus karena kebetulan.');
  b.push('- Ketepatan isi label pengecoh tidak diperiksa kode; angka yang ditulis dengan kata tidak diperiksa aturan angka-di-kartu.');
  b.push('');

  // bahan readme
  b.push('## 10. Bahan README & video (angka bersumber laporan ini)', '');
  b.push(
    `- "Kami mulai dari efisien: mesin templat murah butuh ${String(tpl.versi)} versi di 7 jalan untuk ${String(tpl.lulus)} omongan lulus (${dua(tpl.lulus === 0 ? null : tpl.versi / tpl.lulus)} versi per omongan, ${usd(tpl.lulus === 0 ? null : tpl.biaya / tpl.lulus)} per omongan lulus). Kami pindah ke efektif: Opus 5.5 dengan aturan gerbang di prompt dan pra-periksa kode gratis butuh ${dua(u15.versiPerLulus)} versi per omongan lulus (${usd(u15.biayaPerLulus)} per omongan lulus)${u15.terbit > 0 ? ' dan menerbitkan satu simulasi utuh' : ''}." — sumber: §3 tabel; pra-registrasi M2d-15.`,
    '',
  );
  b.push('## 11. Menunggu reviewer', '');
  b.push(`- Audit Opus satu soal (§2 b): ${audit === null ? 'menunggu' : 'sudah dinilai'} — \`eval/keluaran-m2d15/audit-opus/\`.`);
  b.push(`- Penilai mutu Opus buta: ${mutuOpus15 === null ? 'menunggu' : 'sudah dinilai'} — \`eval/keluaran-m2d15/mutu-opus/\`.`);
  b.push('- Sesudah keduanya: `npm run opus:audit -- --nilai`, `npm run opus:mutu -- --nilai-opus`, `npm run opus:laporan`.', '');
  return b.join('\n');
}

if (/(^|[\\/])bebas[\\/]laporan-opus\.ts$/.test(process.argv[1] ?? '')) {
  writeFileSync(JALUR_LAPORAN_OPUS, bangunLaporanOpus(), 'utf8');
  console.log(`Laporan ditulis: ${JALUR_LAPORAN_OPUS}`);
}
