/**
 * `npm run pengecoh:probe [-- --bukti]` — probe GLM `reasoning.effort: "max"`
 * (kontrak M2d-7 D-1). Pagu probe US$0,30 (tag `m2d7/probe/`) DITEGAKKAN
 * kode di dalam pagu milestone US$3,00.
 *
 * Pertanyaannya: apakah penyedia MENERIMA `"max"` (HTTP 200, tanpa
 * `reasoning.max_tokens` — dokumen OpenRouter: tidak boleh digabung) dan
 * apakah GLM BERPIKIR (dari `usage.completion_tokens_details.
 * reasoning_tokens`, bukan dari badan permintaan). Tanpa penjaga dan tanpa
 * ulangan: angka mentah per panggilan, dengan pagar M2d-7 (pengecualian
 * M2d-6 + `order` GLM dari bukti).
 *
 * Bahan (terlacak, jawabannya sudah diketahui):
 * - kritikus: omongan 1 dan 2 TIRT M2d-6 yang dikunci (uji luar: o1 tertebak
 *   3/3, o2 lolos), cek makna M2d-4, `max_tokens` 20.000;
 * - penebak GLM: dua soal bocor + dua soal aman dari himpunan kalibrasi M2d-6,
 *   petunjuk "pemburu soal bocor", masing-masing dua sampel, `max_tokens` 8.000.
 *
 * `--bukti` (tanpa jaringan): tulis cuplikan ledger M2d-6 GLM ber-effort ke
 * `eval/keluaran-m2d7/bukti-urutan.json` — dasar `URUTAN_GLM_M2D7`.
 *
 * Putusan angka (`putusanProbe`, murni, dites sama dengan `PENALAR_M2D7`):
 * - effort = "max" bila tidak ada panggilan yang ditolak penyedia (4xx) DAN
 *   ≥ 2/3 panggilan kritikus berpikir ≥ 1.000 token; selain itu "high"
 *   (terbukti di M2d-6);
 * - kritikus: ambang 1.000 (kontrak: tetap ≥ 1.000); `max_tokens` =
 *   24.000 bila ada kritikus yang terpotong (`length`), selain itu
 *   min(24.000, max(16.000, 1,5 × keluaran kritikus terpanjang dibulatkan
 *   ke atas ke ribuan));
 * - penebak: ambang = max(50, ½ × kuartil bawah token penalaran tebakan yang
 *   terbaca, dibulatkan ke bawah ke puluhan) — dari distribusi nyata tugas
 *   menebak; `max_tokens` 8.000, atau 12.000 bila ada tebakan terpotong.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PETUNJUK_PENEBAK_TAJAM, type HasilPeran } from './agen-peran.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { pesanPenebak, soalTebak, SUHU_TEBAK, uraiTebakan } from './gerbang-tebak.ts';
import type { PesanChat } from './klien.ts';
import { SUHU_KRITIKUS, pesanKritikus, uraiCekMakna, uraiKritik } from './kritikus.ts';
import { MODEL_OR_GLM } from './model.ts';
import { JALUR_LEDGER, PaguTercapai, chatBerpagu, type EntriLedger } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { SOAL_KALIBRASI, muatSoal } from './penalar-kalibrasi.ts';
import { FOLDER_M2D7, PAGU_BAGIAN_M2D7, PAGU_MILESTONE_M2D7, siapkanM2d7 } from './pengecoh-konfig.ts';
import { barisBukti, type BarisBukti } from './penyedia-bukti.ts';
import { URUTAN_GLM_M2D7, ringkasUrutan, urutanBerpikirDalam } from './penyedia-urutan.ts';
import { omonganLolosPeran } from './peran-penguji.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import { uraiKeluaran, type SetelanPanggil } from './susun.ts';
import type { UpayaPenalaran } from './penalaran.ts';

export const FOLDER_PROBE_M2D7 = `${FOLDER_M2D7}/probe`;
export const JALUR_PROBE_M2D7 = `${FOLDER_PROBE_M2D7}/probe-1.json`;
export const JALUR_BUKTI_URUTAN = `${FOLDER_M2D7}/bukti-urutan.json`;
export const MAX_TOKENS_PROBE_KRITIKUS = 20_000;
export const MAX_TOKENS_PROBE_PENEBAK = 8_000;
/** Kontrak M2d-7 D-1: ambang kritikus tetap ≥ 1.000. */
export const AMBANG_KRITIKUS_M2D7 = 1_000;

interface Butir {
  tag: string;
  peran: 'kritikus' | 'penebak';
  setelan: SetelanPanggil;
  pesan: PesanChat[];
  nilai: (teks: string) => { terurai: boolean; catatan: string };
}

/** Omongan TIRT M2d-6 yang dikunci (jalan 1) dan paketnya. */
export function bahanM2d6(): { paket: PaketFakta; omongan: OmonganDraf[] } {
  const f = `${AKAR}eval/keluaran-m2d6/jalan-1/tirt`;
  const paket = JSON.parse(readFileSync(`${f}/paket.json`, 'utf8')) as PaketFakta;
  const h = JSON.parse(readFileSync(`${f}/riwayat.json`, 'utf8')) as HasilPeran;
  return { paket, omongan: omonganLolosPeran('tirt', h).map((l) => l.omongan) };
}

/** Soal penebak probe: dua bocor + dua aman (himpunan kalibrasi M2d-6). */
export const SOAL_PROBE_PENEBAK = ['m2d5-tirt-o2', 'm2d4-tirt-o3', 'm2d4-ultj-o1', 'm2d4-dada-o1'] as const;

export function butirProbe(): Butir[] {
  const { paket, omongan } = bahanM2d6();
  const butir: Butir[] = [];
  omongan.forEach((o, i) => {
    const penentu = o.kartu.map((id, j) => (o.kartu_penentu.includes(id) ? j + 1 : 0)).filter((x) => x > 0);
    const konteks = { no: i + 1, kartu: { pilihan: o.kunci, kartu_ditunjuk_no: penentu, alasan: 'dari kartu penentu' }, tebakan: [], penebakSesudah: true };
    butir.push({
      tag: `kritikus/o${String(i + 1)}`,
      peran: 'kritikus',
      setelan: { suhu: SUHU_KRITIKUS, maxTokens: MAX_TOKENS_PROBE_KRITIKUS, tambahanBadan: { reasoning: { effort: 'max' } } },
      pesan: pesanKritikus(o, paket, konteks, true),
      nilai: (teks) => {
        const k = uraiKritik(teks);
        const u = uraiKeluaran(teks);
        const c = u.ok ? uraiCekMakna(u.nilai as Record<string, unknown>) : null;
        return {
          terurai: k !== null && c !== null,
          catatan: k === null ? 'tak terbaca' : c === null ? 'tanpa dua jawaban wajib' : `${String(k.keberatan.length)} keberatan (${k.keberatan.map((x) => x.jenis).join(',') || '-'})`,
        };
      },
    });
  });
  // Satu kritikus lagi atas omongan 1 (yang tertebak 3/3 di luar): sebaran antarsampel.
  const b0 = butir[0];
  if (b0 !== undefined) butir.push({ ...b0, tag: 'kritikus/o1-b' });
  for (const id of SOAL_PROBE_PENEBAK) {
    const s = SOAL_KALIBRASI.find((x) => x.id === id);
    if (s === undefined) throw new Error(`soal ${id} tidak ada`);
    const o = muatSoal(s);
    for (const n of [1, 2]) {
      butir.push({
        tag: `penebak/${id}/${String(n)}`,
        peran: 'penebak',
        setelan: { suhu: SUHU_TEBAK, maxTokens: MAX_TOKENS_PROBE_PENEBAK, tambahanBadan: { reasoning: { effort: 'max' } } },
        pesan: pesanPenebak(soalTebak(o), PETUNJUK_PENEBAK_TAJAM),
        nilai: (teks) => {
          const t = uraiTebakan(teks);
          return { terurai: t !== null, catatan: t === null ? 'tak terbaca' : `${t.pilihan}/${String(t.yakin)} (kunci ${o.kunci}, ${s.kelompok})` };
        },
      });
    }
  }
  return butir;
}

export interface HasilProbe {
  tag: string;
  peran: 'kritikus' | 'penebak';
  max_tokens: number;
  badan: Readonly<Record<string, unknown>> | null;
  penyedia?: string | null;
  finish_reason?: string | null;
  token_keluar?: number;
  token_penalaran?: number | null;
  biaya_usd?: number;
  terurai?: boolean;
  catatan?: string;
  teks?: string;
  galat?: string;
  status?: number | null;
}

export interface SetelanPenalarM2d7 {
  effort: UpayaPenalaran;
  kritikus: { maxTokens: number; ambang: number };
  penebakGlm: { maxTokens: number; ambang: number };
  alasan: string[];
}

function kuartilBawah(x: readonly number[]): number {
  const s = [...x].sort((a, b) => a - b);
  return s[Math.floor(0.25 * (s.length - 1))] ?? 0;
}

/** Putusan angka dari data probe (aturan di kepala berkas). Murni. */
export function putusanProbe(hasil: readonly HasilProbe[]): SetelanPenalarM2d7 {
  const kritikus = hasil.filter((h) => h.peran === 'kritikus');
  const penebak = hasil.filter((h) => h.peran === 'penebak');
  const ditolak = hasil.filter((h) => h.galat !== undefined && typeof h.status === 'number' && h.status >= 400 && h.status < 500);
  const kritikusBerpikir = kritikus.filter((h) => typeof h.token_penalaran === 'number' && h.token_penalaran >= AMBANG_KRITIKUS_M2D7).length;
  const maxDiterima = ditolak.length === 0 && kritikus.length > 0 && kritikusBerpikir * 3 >= kritikus.length * 2;
  const alasan: string[] = [
    `effort "max": ${String(ditolak.length)} panggilan ditolak penyedia (4xx); kritikus berpikir ≥ ${String(AMBANG_KRITIKUS_M2D7)} token ${String(kritikusBerpikir)}/${String(kritikus.length)} → ${maxDiterima ? '"max"' : '"high" (terbukti M2d-6)'}`,
  ];
  const kritikusTerpotong = kritikus.some((h) => h.finish_reason === 'length');
  const keluarMaks = Math.max(0, ...kritikus.map((h) => h.token_keluar ?? 0));
  const maxKritikus = kritikusTerpotong ? 24_000 : Math.min(24_000, Math.max(16_000, Math.ceil((1.5 * keluarMaks) / 1000) * 1000));
  alasan.push(`kritikus: keluaran terpanjang ${String(keluarMaks)}${kritikusTerpotong ? ' (ada yang terpotong)' : ''} → max_tokens ${String(maxKritikus)}; ambang ${String(AMBANG_KRITIKUS_M2D7)}`);
  const tokenTebak = penebak.filter((h) => h.terurai === true && typeof h.token_penalaran === 'number').map((h) => h.token_penalaran as number);
  const q1 = kuartilBawah(tokenTebak);
  const ambangTebak = Math.max(50, Math.floor(q1 / 2 / 10) * 10);
  const tebakTerpotong = penebak.some((h) => h.finish_reason === 'length');
  alasan.push(
    `penebak: ${String(tokenTebak.length)} tebakan terbaca, kuartil bawah penalaran ${String(q1)} → ambang ${String(ambangTebak)}; ` +
      `max_tokens ${tebakTerpotong ? '12000 (ada yang terpotong)' : '8000'}`,
  );
  return {
    effort: maxDiterima ? 'max' : 'high',
    kritikus: { maxTokens: maxKritikus, ambang: AMBANG_KRITIKUS_M2D7 },
    penebakGlm: { maxTokens: tebakTerpotong ? 12_000 : 8_000, ambang: ambangTebak },
    alasan,
  };
}

export function bacaProbe(jalur: string = JALUR_PROBE_M2D7): HasilProbe[] {
  return (JSON.parse(readFileSync(jalur, 'utf8')) as { hasil: HasilProbe[] }).hasil;
}

/** Cuplikan bukti urutan dari ledger (entri m2d6/ GLM ber-effort). */
export function bangunBuktiUrutan(entri: readonly EntriLedger[]): { sumber: string; baris: BarisBukti[]; urutan: string[] } {
  const baris = entri
    .filter((e) => e.tag.startsWith('m2d6/') && e.model === MODEL_OR_GLM)
    .map(barisBukti)
    .filter((x): x is BarisBukti => x !== null && x.penalaran_diminta !== null && typeof x.penalaran_diminta['effort'] === 'string');
  return { sumber: '.cache/llm/ledger.jsonl (entri m2d6/ GLM yang berhasil, dengan reasoning.effort diminta)', baris, urutan: urutanBerpikirDalam(baris) };
}

function tulisBukti(): number {
  if (!existsSync(JALUR_LEDGER)) {
    console.error('Ledger belum ada.');
    return 1;
  }
  const entri = readFileSync(JALUR_LEDGER, 'utf8').split(/\r?\n/).filter((b) => b.trim() !== '').map((b) => JSON.parse(b) as EntriLedger);
  const b = bangunBuktiUrutan(entri);
  mkdirSync(FOLDER_M2D7, { recursive: true });
  writeFileSync(JALUR_BUKTI_URUTAN, JSON.stringify(b, null, 2) + '\n', 'utf8');
  for (const r of ringkasUrutan(b.baris)) {
    console.log(`  ${r.masuk ? 'DAHULU' : '      '} ${r.penyedia}: ${Object.entries(r.per_peran).map(([p, x]) => `${p} n=${String(x.n)} median ${String(x.median)} (ambang ${String(x.ambang)})`).join('; ')}`);
  }
  console.log(`Urutan turunan: ${JSON.stringify(b.urutan)}; di kode: ${JSON.stringify(URUTAN_GLM_M2D7)}`);
  return 0;
}

async function utama(): Promise<number> {
  if (process.argv.includes('--bukti')) return tulisBukti();
  if (existsSync(JALUR_PROBE_M2D7)) {
    console.error(`${JALUR_PROBE_M2D7} sudah ada; probe yang sudah dibayar tidak diulang.`);
    return 1;
  }
  const { klien, biaya } = siapkanM2d7();
  mkdirSync(FOLDER_PROBE_M2D7, { recursive: true });
  const awalan = PAGU_BAGIAN_M2D7.probe.awalanTag;
  const hasil: HasilProbe[] = [];
  const simpan = (): void =>
    writeFileSync(JALUR_PROBE_M2D7, JSON.stringify({ pagu_probe_usd: PAGU_BAGIAN_M2D7.probe.usd, biaya_probe_usd: biaya.totalAwalan(awalan), hasil }, null, 2) + '\n', 'utf8');
  console.log(`Pagu milestone US$${PAGU_MILESTONE_M2D7.toFixed(2)} (terpakai US$${biaya.totalMilestone().toFixed(6)}); pagu probe US$${PAGU_BAGIAN_M2D7.probe.usd.toFixed(2)}.`);
  for (const b of butirProbe()) {
    const tag = `${awalan}${b.tag}`;
    const dasar = { tag, peran: b.peran, max_tokens: b.setelan.maxTokens, badan: b.setelan.tambahanBadan ?? null };
    try {
      const j = await chatBerpagu(klien, biaya, { model: MODEL_OR_GLM, pesan: b.pesan, suhu: b.setelan.suhu, maxTokens: b.setelan.maxTokens, tambahanBadan: b.setelan.tambahanBadan }, tag);
      const n = b.nilai(j.teks);
      hasil.push({
        ...dasar, penyedia: j.penyedia ?? null, finish_reason: j.finish_reason, token_keluar: j.token_keluar, token_penalaran: j.token_penalaran ?? null,
        biaya_usd: j.biaya_usd, terurai: n.terurai, catatan: n.catatan, teks: j.teks, status: 200,
      });
      console.log(`${tag}: ${String(j.penyedia)} ${String(j.finish_reason)} keluar ${String(j.token_keluar)} (penalaran ${String(j.token_penalaran)}) US$${j.biaya_usd.toFixed(6)} — ${n.catatan}`);
    } catch (galat) {
      const g = ubahGalatSaldo(galat, MODEL_OR_GLM);
      const pesan = g instanceof Error ? `${g.name}: ${g.message}` : 'galat tak dikenal';
      const status = typeof (g as { status?: unknown }).status === 'number' ? ((g as { status: number }).status) : null;
      hasil.push({ ...dasar, galat: pesan.slice(0, 300), status });
      console.log(`${tag}: GALAT ${pesan.slice(0, 200)}`);
      if (g instanceof PaguTercapai) {
        simpan();
        return g.name === 'SaldoPenyediaHabis' ? 4 : 2;
      }
    }
    simpan();
  }
  const p = putusanProbe(hasil);
  console.log(`Probe selesai: US$${biaya.totalAwalan(awalan).toFixed(6)}; milestone US$${biaya.totalMilestone().toFixed(6)}.`);
  for (const a of p.alasan) console.log(`  ${a}`);
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/pengecoh-probe.ts') === true) {
  utama().then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
