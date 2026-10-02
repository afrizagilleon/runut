/**
 * `npm run penulis:analisis-lama` — D-A M2d-13 (gratis, tanpa panggilan
 * berbayar; pra-registrasi `docs/bukti/m2d13-praregistrasi.md` §9,
 * EKSPLORATIF): atribusi penulis tiap soal bank uji ulang M2d-11 (+ versi
 * jalan TIRT M2d-11 yang sampai ke tebak rotasi), lalu matriks penulis ×
 * penebak dari data rotasi M2d-11 dan audit Opus satu-soal.
 *
 * Ukuran: laju kunci per kondisi (utama = jawaban terbaca saja; kepekaan =
 * tak terbaca dihitung kunci, aturan M2d-11), konsistensi isi kunci (≥ 3/4
 * rotasi), prior huruf per penebak, selisih-dalam-selisih sekeluarga (GLM
 * kendali). Atribusi dibaca dari `jejak-agen.json` (model langkah menulis).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AKAR } from '../env.ts';
import type { JawabanRotasi, Kondisi } from '../rotasi/rotasi.ts';

export type KelompokPenulis = 'opus-pemilik' | 'deepseek' | 'templat-m2d10' | 'templat-m2d11' | 'tak-diketahui';
export type Keluarga = 'anthropic' | 'deepseek' | 'campuran' | 'tak-diketahui';

export interface Atribusi {
  kelompok: KelompokPenulis;
  keluarga: Keluarga;
  bukti: string;
}

export interface ButirAnalisis {
  id: string;
  atribusi: Atribusi;
  /** Milestone asal (pembaur masa pembuatan). */
  milestone: string;
  jawaban: JawabanRotasi[];
}

export const PENEBAK = ['anthropic/claude-haiku-4.5', 'deepseek/deepseek-v4.1-flash', 'z-ai/glm-5.3'] as const;
export const KONDISI_A: readonly Kondisi[] = ['pilihan-saja', 'pesan-pilihan'];
const HURUF = ['a', 'b', 'c', 'd'] as const;
const LANGKAH_TULIS = new Set(['susun', 'tulis-ulang', 'tulis-pesan', 'tulis-pilihan', 'tulis-penjelasan']);

/* ---------------------------------------------------------------------- */
/* atribusi                                                                */
/* ---------------------------------------------------------------------- */

/** Model langkah menulis di satu berkas jejak (urut, unik). */
export function modelPenulisJejak(jejak: unknown): string[] {
  const langkah = Array.isArray(jejak) ? jejak : Object.values(jejak as Record<string, unknown>).find(Array.isArray) ?? [];
  const m = new Set<string>();
  for (const s of langkah as Array<{ jenis?: string; model?: string | null }>) {
    if (s.jenis !== undefined && LANGKAH_TULIS.has(s.jenis) && typeof s.model === 'string') m.add(s.model);
  }
  return [...m].sort();
}

const JEJAK_MILESTONE: Record<string, (paket: string) => string> = {
  m2d3: (p) => `eval/keluaran-m2d3/${p}/jejak-agen.json`,
  m2d4: (p) => `eval/keluaran-m2d4/${p}/jejak-agen.json`,
  m2d5: (p) => `eval/keluaran-m2d5/${p}/jejak-agen.json`,
  m2d6: (p) => `eval/keluaran-m2d6/jalan-1/${p}/jejak-agen.json`,
  m2d8: (p) => `eval/keluaran-m2d8/jalan/${p}/jejak-agen.json`,
};

const DEEPSEEK = /deepseek-v4\.1-flash/i;

/**
 * Atribusi dari id bank + model penulis di jejak (diberikan pemanggil).
 * Murni: aturan pra-registrasi §9.
 */
export function atribusi(id: string, modelJejak: readonly string[] | null): Atribusi {
  if (id.startsWith('tayang-')) return { kelompok: 'opus-pemilik', keluarga: 'anthropic', bukti: 'soal tayang: Claude Opus bersama pemilik (cases/*.json)' };
  if (id.startsWith('m2d11-tirt-')) return { kelompok: 'templat-m2d11', keluarga: 'campuran', bukti: 'mesin templat M2d-11: pilihan teks kode (ditulis Claude), pesan & penjelasan DeepSeek, varian bisa dipilih penyempurna Haiku' };
  if (/^m2d10(a1|a2)?-/.test(id)) return { kelompok: 'templat-m2d10', keluarga: 'campuran', bukti: 'mesin templat M2d-10: pilihan teks kode (ditulis Claude), pesan & penjelasan DeepSeek, varian bisa dipilih penyempurna Haiku' };
  const ms = /^(m2d[3-8])-/.exec(id)?.[1];
  if (ms !== undefined) {
    if (modelJejak === null || modelJejak.length === 0) return { kelompok: 'tak-diketahui', keluarga: 'tak-diketahui', bukti: `${ms}: jejak tidak ada` };
    if (modelJejak.every((m) => DEEPSEEK.test(m))) return { kelompok: 'deepseek', keluarga: 'deepseek', bukti: `${ms}: langkah menulis di jejak = ${modelJejak.join(', ')}` };
    return { kelompok: 'tak-diketahui', keluarga: 'tak-diketahui', bukti: `${ms}: model menulis campur (${modelJejak.join(', ')})` };
  }
  return { kelompok: 'tak-diketahui', keluarga: 'tak-diketahui', bukti: 'id tidak dikenal' };
}

/* ---------------------------------------------------------------------- */
/* ukuran                                                                  */
/* ---------------------------------------------------------------------- */

export interface Laju {
  kunci: number;
  n: number;
  tak_terbaca: number;
  /** Utama: kunci / n (terbaca saja); null bila n = 0. */
  laju: number | null;
  /** Kepekaan (aturan M2d-11): (kunci + tak terbaca) / (n + tak terbaca). */
  laju_kepekaan: number | null;
}

/** Laju kunci atas sekumpulan jawaban. Murni. */
export function lajuKunci(j: readonly JawabanRotasi[]): Laju {
  const terbaca = j.filter((x) => x.terbaca && x.isi !== null);
  const kunci = terbaca.filter((x) => x.isi === x.isi_kunci).length;
  const tak = j.length - terbaca.length;
  return {
    kunci,
    n: terbaca.length,
    tak_terbaca: tak,
    laju: terbaca.length === 0 ? null : kunci / terbaca.length,
    laju_kepekaan: j.length === 0 ? null : (kunci + tak) / j.length,
  };
}

/** Isi kunci dipilih di ≥ 3 dari 4 rotasi (jawaban terbaca). Murni. */
export function konsistenIsiKunci(j: readonly JawabanRotasi[]): boolean {
  return j.filter((x) => x.terbaca && x.isi === x.isi_kunci).length >= 3;
}

export interface Prior {
  a: number;
  b: number;
  c: number;
  d: number;
  n: number;
  huruf_maks: string;
  porsi_maks: number | null;
  /** Pra-registrasi §2 H1a: satu huruf ≥ 0,32 dengan n ≥ 200. */
  bias: boolean;
}

/** Sebaran huruf jawaban terpetakan. Murni. */
export function priorHuruf(j: readonly JawabanRotasi[]): Prior {
  const h = { a: 0, b: 0, c: 0, d: 0 };
  for (const x of j) if (x.huruf !== null) h[x.huruf] += 1;
  const n = h.a + h.b + h.c + h.d;
  const maks = HURUF.reduce((m, k) => (h[k] > h[m] ? k : m), 'a' as (typeof HURUF)[number]);
  const porsi = n === 0 ? null : h[maks] / n;
  return { ...h, n, huruf_maks: maks, porsi_maks: porsi, bias: porsi !== null && n >= 200 && porsi >= 0.32 };
}

/**
 * Selisih-dalam-selisih (pra-registrasi §2 H2): [g(sendiri) − g(lain)] −
 * [kendali(sendiri) − kendali(lain)]. null bila salah satu laju tak ada. Murni.
 */
export function selisihDalamSelisih(g: { sendiri: number | null; lain: number | null }, kendali: { sendiri: number | null; lain: number | null }): number | null {
  if (g.sendiri === null || g.lain === null || kendali.sendiri === null || kendali.lain === null) return null;
  return g.sendiri - g.lain - (kendali.sendiri - kendali.lain);
}

/** Interval Wilson 95 % untuk k/n. Murni. */
export function wilson(k: number, n: number): [number, number] | null {
  if (n === 0) return null;
  const z = 1.959964;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

/* ---------------------------------------------------------------------- */
/* matriks                                                                 */
/* ---------------------------------------------------------------------- */

export interface SelMatriks {
  kelompok: KelompokPenulis;
  penebak: string;
  kondisi: Kondisi;
  butir: number;
  laju: Laju;
  wilson: [number, number] | null;
  /** Butir dengan isi kunci konsisten (≥ 3/4 rotasi) pada penebak & kondisi ini. */
  konsisten_isi_kunci: number;
}

/** Matriks kelompok penulis × penebak × kondisi. Murni. */
export function matriks(butir: readonly ButirAnalisis[]): SelMatriks[] {
  const kelompok = [...new Set(butir.map((b) => b.atribusi.kelompok))];
  const sel: SelMatriks[] = [];
  for (const k of kelompok) {
    const bk = butir.filter((b) => b.atribusi.kelompok === k);
    for (const p of PENEBAK) {
      for (const kondisi of KONDISI_A) {
        const per = bk.map((b) => b.jawaban.filter((j) => j.model === p && j.kondisi === kondisi));
        const semua = per.flat();
        const l = lajuKunci(semua);
        sel.push({ kelompok: k, penebak: p, kondisi, butir: bk.length, laju: l, wilson: wilson(l.kunci, l.n), konsisten_isi_kunci: per.filter((x) => konsistenIsiKunci(x)).length });
      }
    }
  }
  return sel;
}

function lajuSel(sel: readonly SelMatriks[], k: KelompokPenulis, p: string, kondisi: Kondisi): number | null {
  return sel.find((s) => s.kelompok === k && s.penebak === p && s.kondisi === kondisi)?.laju.laju ?? null;
}

/**
 * Δ sekeluarga (pra-registrasi §2) dengan kelompok "anthropic" dan
 * "deepseek" yang diberikan; GLM kendali. Murni.
 */
export function deltaSekeluarga(sel: readonly SelMatriks[], kondisi: Kondisi, anthropic: KelompokPenulis, deepseek: KelompokPenulis): { delta_deepseek: number | null; delta_haiku: number | null } {
  const [H, D, G] = PENEBAK;
  const r = (p: string, k: KelompokPenulis): number | null => lajuSel(sel, k, p, kondisi);
  return {
    delta_deepseek: selisihDalamSelisih({ sendiri: r(D, deepseek), lain: r(D, anthropic) }, { sendiri: r(G, deepseek), lain: r(G, anthropic) }),
    delta_haiku: selisihDalamSelisih({ sendiri: r(H, anthropic), lain: r(H, deepseek) }, { sendiri: r(G, anthropic), lain: r(G, deepseek) }),
  };
}

/* ---------------------------------------------------------------------- */
/* pemuat data (tanpa jaringan)                                            */
/* ---------------------------------------------------------------------- */

function json<T>(rel: string): T {
  return JSON.parse(readFileSync(`${AKAR}${rel}`, 'utf8')) as T;
}

interface MentahUjiUlang {
  hasil: Array<{ id: string; asal: string; luar: string | null; kunci: string; rotasi: { jawaban: JawabanRotasi[] } | null }>;
}

interface VersiTirt {
  no: number;
  versi: number;
  putaran: number;
  berhenti: string;
  rotasi?: { jawaban: JawabanRotasi[] } | null;
}

function paketDariId(id: string): string {
  return /^m2d\d+-(tirt|dada|ultj)-/.exec(id)?.[1] ?? 'tirt';
}

/** Bank uji ulang (33) + versi jalan TIRT M2d-11 yang sampai ke tebak rotasi. */
export function muatButir(): ButirAnalisis[] {
  const m = json<MentahUjiUlang>('eval/keluaran-m2d11/uji-ulang/mentah.json');
  const cacheJejak = new Map<string, string[] | null>();
  const jejak = (ms: string, paket: string): string[] | null => {
    const f = JEJAK_MILESTONE[ms];
    if (f === undefined) return null;
    const jalur = f(paket);
    if (!cacheJejak.has(jalur)) cacheJejak.set(jalur, existsSync(`${AKAR}${jalur}`) ? modelPenulisJejak(json<unknown>(jalur)) : null);
    return cacheJejak.get(jalur) ?? null;
  };
  const butir: ButirAnalisis[] = m.hasil
    .filter((h) => h.rotasi !== null)
    .map((h) => {
      const ms = /^(m2d\d+)/.exec(h.id)?.[1] ?? (h.id.startsWith('tayang-') ? 'tayang' : '?');
      return { id: h.id, atribusi: atribusi(h.id, jejak(ms, paketDariId(h.id))), milestone: ms, jawaban: h.rotasi?.jawaban ?? [] };
    });
  for (let n = 1; n <= 7; n++) {
    const jalur = `eval/penyusun/m2d11-tirt-${String(n)}/hasil.json`;
    if (!existsSync(`${AKAR}${jalur}`)) continue;
    const h = json<{ versi: VersiTirt[] }>(jalur);
    for (const v of h.versi) {
      if (v.rotasi === undefined || v.rotasi === null) continue;
      const id = `m2d11-tirt-${String(n)}-o${String(v.no)}-p${String(v.putaran)}`;
      butir.push({ id, atribusi: atribusi(id, null), milestone: 'm2d11', jawaban: v.rotasi.jawaban });
    }
  }
  return butir;
}

interface NilaiAudit {
  per_soal: Array<{ id: string; tanpa_kartu_benar: number; n: number }>;
}

/* ---------------------------------------------------------------------- */
/* utama                                                                   */
/* ---------------------------------------------------------------------- */

const persen = (x: number | null): string => (x === null ? '—' : `${(x * 100).toFixed(0)} %`);
const dua = (x: number | null): string => (x === null ? '—' : x.toFixed(2).replace('.', ','));

export function analisis(butir: readonly ButirAnalisis[], audit: NilaiAudit, luarLama: ReadonlyArray<{ id: string; luar: string | null }>): Record<string, unknown> {
  const sel = matriks(butir);
  const bank = butir.filter((b) => !b.id.match(/^m2d11-tirt-\d+-o\d+-p\d+$/));
  const selBank = matriks(bank);
  const prior = Object.fromEntries(PENEBAK.map((p) => [p, priorHuruf(butir.flatMap((b) => b.jawaban.filter((j) => j.model === p)))]));
  const priorPerKelompok = Object.fromEntries(
    [...new Set(butir.map((b) => b.atribusi.kelompok))].map((k) => [k, Object.fromEntries(PENEBAK.map((p) => [p, priorHuruf(butir.filter((b) => b.atribusi.kelompok === k).flatMap((b) => b.jawaban.filter((j) => j.model === p)))]))]),
  );
  const delta = Object.fromEntries(KONDISI_A.map((k) => [k, deltaSekeluarga(sel, k, 'opus-pemilik', 'deepseek')]));
  const kelompokId = new Map(butir.map((b) => [b.id, b.atribusi.kelompok]));
  const opus = [...new Set(audit.per_soal.map((s) => kelompokId.get(s.id) ?? (s.id.startsWith('m2d11-tirt-7') ? 'templat-m2d11' : 'tak-diketahui')))].map((k) => {
    const s = audit.per_soal.filter((x) => (kelompokId.get(x.id) ?? (x.id.startsWith('m2d11-tirt-7') ? 'templat-m2d11' : 'tak-diketahui')) === k);
    const benar = s.reduce((a, x) => a + x.tanpa_kartu_benar, 0);
    const n = s.reduce((a, x) => a + x.n, 0);
    return { kelompok: k, butir: s.map((x) => x.id), benar, n, laju: n === 0 ? null : benar / n };
  });
  const luar = [...new Set(luarLama.filter((x) => x.luar !== null).map((x) => kelompokId.get(x.id) ?? 'tak-diketahui'))].map((k) => {
    const s = luarLama.filter((x) => x.luar !== null && (kelompokId.get(x.id) ?? 'tak-diketahui') === k);
    const benar = s.reduce((a, x) => a + Number(/\((\d)\/3 kunci\)/.exec(x.luar ?? '')?.[1] ?? 0), 0);
    return { kelompok: k, butir: s.length, benar, n: 3 * s.length, laju: s.length === 0 ? null : benar / (3 * s.length) };
  });
  return {
    catatan: 'D-A M2d-13, EKSPLORATIF (pra-registrasi §9); data M2d-11 sudah terlihat sebelum pra-registrasi.',
    atribusi: butir.map((b) => ({ id: b.id, milestone: b.milestone, ...b.atribusi })),
    jumlah_butir: Object.fromEntries([...new Set(butir.map((b) => b.atribusi.kelompok))].map((k) => [k, butir.filter((b) => b.atribusi.kelompok === k).length])),
    matriks_semua: sel,
    matriks_bank33: selBank,
    prior_huruf: prior,
    prior_huruf_per_kelompok: priorPerKelompok,
    delta_sekeluarga_semua: delta,
    delta_sekeluarga_bank33: Object.fromEntries(KONDISI_A.map((k) => [k, deltaSekeluarga(selBank, k, 'opus-pemilik', 'deepseek')])),
    opus_satu_soal: opus,
    opus_luar_lama: luar,
  };
}

export function ringkasan(h: Record<string, unknown>): string {
  const sel = h['matriks_semua'] as SelMatriks[];
  const kel = Object.keys(h['jumlah_butir'] as Record<string, number>);
  const pend = (p: string): string => p.split('/')[1]?.replace('claude-', '').replace('-v4.1-flash', '') ?? p;
  const baris: string[] = [];
  baris.push('# D-A M2d-13 — analisis gratis data M2d-11 (EKSPLORATIF)', '');
  baris.push('Dibangun `npm run penulis:analisis-lama` (`factory/llm/bebas/analisis-lama.ts`) dari `eval/keluaran-m2d11/uji-ulang/mentah.json`, `eval/penyusun/m2d11-tirt-*/hasil.json`, `eval/keluaran-m2d11/audit-opus/satu-soal/nilai.json` dan jejak model penulis. Laju utama = jawaban terbaca; kepekaan (aturan M2d-11) di kurung.', '');
  baris.push('## Butir per kelompok penulis', '', '| kelompok | butir |', '|---|---:|');
  for (const [k, n] of Object.entries(h['jumlah_butir'] as Record<string, number>)) baris.push(`| ${k} | ${String(n)} |`);
  baris.push('', '## Laju kunci penulis × penebak', '', `| kelompok | kondisi | ${PENEBAK.map(pend).join(' | ')} |`, `|---|---|${PENEBAK.map(() => '---').join('|')}|`);
  for (const k of kel) {
    for (const kondisi of KONDISI_A) {
      const c = PENEBAK.map((p) => {
        const s = sel.find((x) => x.kelompok === k && x.penebak === p && x.kondisi === kondisi);
        return s === undefined ? '—' : `${persen(s.laju.laju)} (${persen(s.laju.laju_kepekaan)}; n ${String(s.laju.n)}, tak ${String(s.laju.tak_terbaca)}; konsisten ${String(s.konsisten_isi_kunci)}/${String(s.butir)})`;
      });
      baris.push(`| ${k} | ${kondisi} | ${c.join(' | ')} |`);
    }
  }
  baris.push('', '## Prior huruf per penebak (semua butir)', '', '| penebak | a | b | c | d | n | huruf terbanyak | bias (≥ 0,32, n ≥ 200) |', '|---|---:|---:|---:|---:|---:|---|---|');
  for (const [p, x] of Object.entries(h['prior_huruf'] as Record<string, Prior>)) baris.push(`| ${pend(p)} | ${String(x.a)} | ${String(x.b)} | ${String(x.c)} | ${String(x.d)} | ${String(x.n)} | ${x.huruf_maks} ${persen(x.porsi_maks)} | ${x.bias ? 'ya' : 'tidak'} |`);
  baris.push('', '## Δ sekeluarga (GLM kendali; anthropic = soal tayang Opus+pemilik, deepseek = M2d-3…M2d-8)', '', '| data | kondisi | Δ_DeepSeek | Δ_Haiku |', '|---|---|---:|---:|');
  for (const [nama, kunci] of [['semua butir', 'delta_sekeluarga_semua'], ['bank 33', 'delta_sekeluarga_bank33']] as const) {
    for (const [kondisi, d] of Object.entries(h[kunci] as Record<string, { delta_deepseek: number | null; delta_haiku: number | null }>)) baris.push(`| ${nama} | ${kondisi} | ${dua(d.delta_deepseek)} | ${dua(d.delta_haiku)} |`);
  }
  baris.push('', '## Opus', '', '| sumber | kelompok | butir | kunci / jawaban | laju |', '|---|---|---:|---:|---:|');
  for (const o of h['opus_satu_soal'] as Array<{ kelompok: string; butir: string[]; benar: number; n: number; laju: number | null }>) baris.push(`| satu-soal tanpa kartu (4 rotasi, audit reviewer) | ${o.kelompok} | ${String(o.butir.length)} | ${String(o.benar)}/${String(o.n)} | ${persen(o.laju)} |`);
  for (const o of h['opus_luar_lama'] as Array<{ kelompok: string; butir: number; benar: number; n: number; laju: number | null }>) baris.push(`| luar lama (3 penguji, tanpa rotasi, dibundel) | ${o.kelompok} | ${String(o.butir)} | ${String(o.benar)}/${String(o.n)} | ${persen(o.laju)} |`);
  baris.push('', '## Pembaur (wajib dibaca bersama angka di atas)', '');
  baris.push('- **Seleksi:** omongan M2d-3…M2d-8 masuk bank karena LOLOS penebak di dalam lingkar (jejak: M2d-3 penebak DeepSeek; M2d-4/M2d-5 DeepSeek ×2 + GLM; M2d-6 GLM; M2d-8 GLM ×3). Butir DeepSeek sudah tersaring agar tidak tertebak DeepSeek dan/atau GLM — keduanya kolom pembanding Δ — sehingga Δ_DeepSeek (dan kendali GLM) tercampur seleksi, bukan titik buta murni.');
  baris.push('- **Jenis soal dan masa pembuatan** berbeda antar kelompok: soal tayang = DADA/ULTJ/(tanpa TIRT) buatan Claude+pemilik; DeepSeek = TIRT/DADA/ULTJ M2d-3…M2d-8 dengan lingkar dan gerbang yang berubah tiap milestone; templat = TIRT dengan enam pola yang sama.');
  baris.push('- **Tangan manusia** ikut di soal tayang (bukan keluaran LLM murni). Templat = campuran (kode Claude + DeepSeek + Haiku).');
  baris.push('- **Opus luar lama** dibundel beberapa soal per berkas dan tanpa rotasi (audit M2d-11 menunjukkan pembundelan membocorkan jawaban); Opus satu-soal hanya 8 butir yang sudah lolos rotasi tiga keluarga (bias seleksi).');
  baris.push('- Versi jalan TIRT M2d-11 berulang dari rencana yang sama (bukan butir independen).');
  return `${baris.join('\n')}\n`;
}

function utama(): void {
  const butir = muatButir();
  const audit = json<NilaiAudit>('eval/keluaran-m2d11/audit-opus/satu-soal/nilai.json');
  const luar = json<MentahUjiUlang>('eval/keluaran-m2d11/uji-ulang/mentah.json').hasil.map((h) => ({ id: h.id, luar: h.luar }));
  const h = analisis(butir, audit, luar);
  const folder = `${AKAR}eval/keluaran-m2d13/analisis-lama`;
  mkdirSync(folder, { recursive: true });
  writeFileSync(`${folder}/hasil.json`, `${JSON.stringify(h, null, 2)}\n`);
  writeFileSync(`${folder}/ringkasan.md`, ringkasan(h));
  console.log(ringkasan(h));
}

if (/(^|[\\/])bebas[\\/]analisis-lama\.ts$/.test(process.argv[1] ?? '')) utama();
