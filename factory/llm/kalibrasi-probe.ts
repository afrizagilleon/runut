/**
 * `npm run kalibrasi:probe` — probe GLM `reasoning.effort: "high"` (kontrak
 * M2d-8 D-1, pra-registrasi §5). Pagu probe US$0,25 (tag `m2d8/probe/`)
 * DITEGAKKAN kode di dalam pagu milestone US$2,30.
 *
 * Bahan (terlacak, dari jalan 2 TIRT M2d-7, `riwayat.json`):
 * - kritikus ×3, `max_tokens` 32.000, cek makna, konteks jawaban pembaca kartu
 *   yang tercatat: tiga entri pertama (urut putaran, lalu omongan) yang
 *   kritikus `"max"`-nya tidak menjawab. Di jalan itu ketiganya versi YANG
 *   SAMA (omongan 2, dibawa putaran 5–9): tiga sampel dari versi tersulit.
 * - penebak ×4, `max_tokens` 8.000, petunjuk tajam: empat entri pertama yang
 *   sampai kritikus di jalan itu.
 * Tanpa penjaga dan tanpa ulangan: angka mentah per panggilan (pagar M2d-7).
 *
 * Putusan angka (`putusanPenalar`, murni, dites sama dengan `PENALAR_M2D8`) —
 * aturan pra-registrasi §5, ditulis sebelum probe:
 * - effort tetap `"high"`; 4xx dari penyedia → berhenti (tidak kembali ke "max");
 * - kritikus: ambang 1.000; `max_tokens` = min(40.000, max(24.000, 1,5 ×
 *   keluaran kritikus "high" terpanjang yang SELESAI (M2d-6 ledger + probe),
 *   dibulatkan ke atas ke ribuan)); 40.000 bila kritikus probe habis di 32.000;
 * - penebak: kumpulan = penebak GLM "high" M2d-6 yang dilayani Wafer + penebak
 *   probe, tanpa yang habis token (penalaran ≥ 7.990); ambang = max(50, ½ ×
 *   kuartil bawah, dibulatkan ke bawah ke puluhan); `max_tokens` 8.000 bila
 *   porsi yang habis token ≤ 1/10, selain itu 12.000.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PETUNJUK_PENEBAK_TAJAM, type HasilPeran } from './agen-peran.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { pesanPenebak, soalTebak, SUHU_TEBAK, uraiTebakan } from './gerbang-tebak.ts';
import type { PesanChat } from './klien.ts';
import { SUHU_KRITIKUS, pesanKritikus, uraiCekMakna, uraiKritik } from './kritikus.ts';
import { FOLDER_M2D8, PAGU_BAGIAN_M2D8, PAGU_MILESTONE_M2D8, siapkanM2d8 } from './kalibrasi-konfig.ts';
import { MODEL_OR_GLM } from './model.ts';
import { JALUR_LEDGER, PaguTercapai, chatBerpagu, type EntriLedger } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import type { PenalarBerpikir } from './penalaran.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import { uraiKeluaran, type SetelanPanggil } from './susun.ts';

export const FOLDER_PROBE_M2D8 = `${FOLDER_M2D8}/probe`;
export const JALUR_PROBE_M2D8 = `${FOLDER_PROBE_M2D8}/probe-1.json`;
export const JALAN_BAHAN = `${AKAR}eval/keluaran-m2d7/jalan-2/tirt`;
export const MAX_TOKENS_PROBE_KRITIKUS = 32_000;
export const MAX_TOKENS_PROBE_PENEBAK = 8_000;
export const AMBANG_KRITIKUS_M2D8 = 1_000;
/** Penalaran ≥ nilai ini = habis token (`max_tokens` 8.000 / 24.000 di M2d-6). */
export const HABIS_PENEBAK = 7_990;
export const HABIS_KRITIKUS_M2D6 = 23_990;
const SAMPAI_KRITIKUS = ['kritikus-tidak-menjawab', 'ditolak-kritikus', 'ditolak-tebak', 'lolos'];

interface EntriRiwayat {
  putaran: number;
  no: number;
  status: string;
  omongan: OmonganDraf;
  kartu: { pilihan: string | null; kartu_ditunjuk: string[]; alasan_penjawab: string } | null;
}

/** Entri riwayat jalan bahan yang sampai kritikus, urut putaran lalu omongan. */
export function entriBahan(jalan: string = JALAN_BAHAN): EntriRiwayat[] {
  const h = JSON.parse(readFileSync(`${jalan}/riwayat.json`, 'utf8')) as HasilPeran & {
    riwayat: Array<{ putaran: number; omongan: Array<{ no: number; status: string; kartu: EntriRiwayat['kartu'] }>; draf: Array<OmonganDraf | null> }>;
  };
  const hasil: EntriRiwayat[] = [];
  for (const r of h.riwayat) {
    for (const o of [...r.omongan].sort((a, b) => a.no - b.no)) {
      const d = r.draf[o.no - 1];
      if (SAMPAI_KRITIKUS.includes(o.status) && d !== null && d !== undefined) hasil.push({ putaran: r.putaran, no: o.no, status: o.status, omongan: d, kartu: o.kartu });
    }
  }
  return hasil;
}

interface Butir {
  tag: string;
  peran: 'kritikus' | 'penebak';
  setelan: SetelanPanggil;
  pesan: PesanChat[];
  nilai: (teks: string) => { terurai: boolean; catatan: string };
}

export function butirProbe(): Butir[] {
  const paket = JSON.parse(readFileSync(`${JALAN_BAHAN}/paket.json`, 'utf8')) as PaketFakta;
  const semua = entriBahan();
  const butir: Butir[] = [];
  // Penebak dulu (murah), supaya pagu probe tidak habis oleh kritikus sebelum penebak terukur.
  for (const e of semua.slice(0, 4)) {
    const o = e.omongan;
    butir.push({
      tag: `penebak/p${String(e.putaran)}-o${String(e.no)}`,
      peran: 'penebak',
      setelan: { suhu: SUHU_TEBAK, maxTokens: MAX_TOKENS_PROBE_PENEBAK, tambahanBadan: { reasoning: { effort: 'high' } } },
      pesan: pesanPenebak(soalTebak(o), PETUNJUK_PENEBAK_TAJAM),
      nilai: (teks) => {
        const t = uraiTebakan(teks);
        return { terurai: t !== null, catatan: t === null ? 'tak terbaca' : `${t.pilihan}/${String(t.yakin)} (kunci ${o.kunci})` };
      },
    });
  }
  for (const e of semua.filter((x) => x.status === 'kritikus-tidak-menjawab').slice(0, 3)) {
    const o = e.omongan;
    const konteks = {
      no: e.no,
      kartu: e.kartu === null ? null : { pilihan: e.kartu.pilihan, kartu_ditunjuk_no: e.kartu.kartu_ditunjuk.map((id) => o.kartu.indexOf(id) + 1).filter((x) => x > 0), alasan: e.kartu.alasan_penjawab },
      tebakan: [],
      penebakSesudah: true,
    };
    butir.push({
      tag: `kritikus/p${String(e.putaran)}-o${String(e.no)}`,
      peran: 'kritikus',
      setelan: { suhu: SUHU_KRITIKUS, maxTokens: MAX_TOKENS_PROBE_KRITIKUS, tambahanBadan: { reasoning: { effort: 'high' } } },
      pesan: pesanKritikus(o, paket, konteks, true),
      nilai: (teks) => {
        const k = uraiKritik(teks);
        const u = uraiKeluaran(teks);
        const c = u.ok ? uraiCekMakna(u.nilai as Record<string, unknown>) : null;
        return { terurai: k !== null && c !== null, catatan: k === null ? 'tak terbaca' : c === null ? 'tanpa dua jawaban wajib' : `${String(k.keberatan.length)} keberatan (${k.keberatan.map((x) => x.jenis).join(',') || '-'})` };
      },
    });
  }
  return butir;
}

export interface HasilProbeM2d8 {
  tag: string;
  peran: 'kritikus' | 'penebak';
  max_tokens: number;
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

export interface PutusanPenalarM2d8 {
  effort_diterima: boolean;
  kritikus: PenalarBerpikir;
  penebakGlm: PenalarBerpikir;
  alasan: string[];
  data: { kritikus_selesai: number; kritikus_habis: number; penebak_kumpulan: number; penebak_habis: number; kuartil_bawah: number };
}

function kuartilBawah(x: readonly number[]): number {
  const s = [...x].sort((a, b) => a - b);
  return s[Math.floor(0.25 * (s.length - 1))] ?? 0;
}

const glmHigh = (e: EntriLedger): boolean =>
  e.model === MODEL_OR_GLM && e.tag.startsWith('m2d6/') && e.galat === null && (e as { penalaran_diminta?: { effort?: unknown } }).penalaran_diminta?.effort === 'high';
const tagKritikus = (tag: string): boolean => /\/kritikus(\/|$)/.test(tag);

/** Putusan angka penalar M2d-8 (aturan pra-registrasi §5). Murni. */
export function putusanPenalar(ledger: readonly EntriLedger[], probe: readonly HasilProbeM2d8[]): PutusanPenalarM2d8 {
  const alasan: string[] = [];
  const ditolak = probe.filter((h) => h.galat !== undefined && typeof h.status === 'number' && h.status >= 400 && h.status < 500);
  alasan.push(`effort "high": ${String(ditolak.length)} panggilan probe ditolak penyedia (4xx)${ditolak.length > 0 ? ' → BERHENTI (tidak kembali ke "max")' : ''}`);

  const k6 = ledger.filter((e) => glmHigh(e) && tagKritikus(e.tag));
  const k6Selesai = k6.filter((e) => typeof e.token_penalaran === 'number' && e.token_penalaran < HABIS_KRITIKUS_M2D6).map((e) => e.token_keluar ?? 0);
  const kp = probe.filter((h) => h.peran === 'kritikus' && h.galat === undefined);
  const kpSelesai = kp.filter((h) => h.finish_reason !== 'length').map((h) => h.token_keluar ?? 0);
  const kpHabis = kp.some((h) => h.finish_reason === 'length');
  const terpanjang = Math.max(0, ...k6Selesai, ...kpSelesai);
  const maxKritikus = kpHabis ? 40_000 : Math.min(40_000, Math.max(24_000, Math.ceil((1.5 * terpanjang) / 1000) * 1000));
  alasan.push(
    `kritikus: keluaran selesai terpanjang ${String(terpanjang)} (M2d-6 ${String(k6Selesai.length)} selesai + probe ${String(kpSelesai.length)}/${String(kp.length)} selesai)` +
      `${kpHabis ? '; ada kritikus probe yang habis di 32.000' : ''} → max_tokens ${String(maxKritikus)}; ambang ${String(AMBANG_KRITIKUS_M2D8)}`,
  );

  const p6 = ledger.filter((e) => glmHigh(e) && !tagKritikus(e.tag) && e.penyedia === 'Wafer' && typeof e.token_penalaran === 'number');
  const pp = probe.filter((h) => h.peran === 'penebak' && h.galat === undefined && typeof h.token_penalaran === 'number');
  const habis6 = p6.filter((e) => (e.token_penalaran as number) >= HABIS_PENEBAK).length;
  const habisP = pp.filter((h) => h.finish_reason === 'length' || (h.token_penalaran as number) >= HABIS_PENEBAK).length;
  const kumpulan = [
    ...p6.filter((e) => (e.token_penalaran as number) < HABIS_PENEBAK).map((e) => e.token_penalaran as number),
    ...pp.filter((h) => h.finish_reason !== 'length' && (h.token_penalaran as number) < HABIS_PENEBAK).map((h) => h.token_penalaran as number),
  ];
  const q1 = kuartilBawah(kumpulan);
  const ambangTebak = Math.max(50, Math.floor(q1 / 2 / 10) * 10);
  const nTotal = p6.length + pp.length;
  const maxTebak = (habis6 + habisP) * 10 <= nTotal ? 8_000 : 12_000;
  alasan.push(
    `penebak: kumpulan ${String(kumpulan.length)} (M2d-6 Wafer ${String(p6.length - habis6)} + probe ${String(pp.length - habisP)}), kuartil bawah ${String(q1)} → ambang ${String(ambangTebak)}; ` +
      `habis token ${String(habis6 + habisP)}/${String(nTotal)} → max_tokens ${String(maxTebak)}`,
  );
  return {
    effort_diterima: ditolak.length === 0,
    kritikus: { effort: 'high', maxTokens: maxKritikus, ambang: AMBANG_KRITIKUS_M2D8 },
    penebakGlm: { effort: 'high', maxTokens: maxTebak, ambang: ambangTebak },
    alasan,
    data: { kritikus_selesai: k6Selesai.length + kpSelesai.length, kritikus_habis: k6.length - k6Selesai.length + kp.length - kpSelesai.length, penebak_kumpulan: kumpulan.length, penebak_habis: habis6 + habisP, kuartil_bawah: q1 },
  };
}

export function bacaLedger(jalur: string = JALUR_LEDGER): EntriLedger[] {
  return readFileSync(jalur, 'utf8').split(/\r?\n/).filter((b) => b.trim() !== '').map((b) => JSON.parse(b) as EntriLedger);
}

export function bacaProbeM2d8(jalur: string = JALUR_PROBE_M2D8): HasilProbeM2d8[] {
  return (JSON.parse(readFileSync(jalur, 'utf8')) as { hasil: HasilProbeM2d8[] }).hasil;
}

async function utama(): Promise<number> {
  if (existsSync(JALUR_PROBE_M2D8)) {
    const p = putusanPenalar(bacaLedger(), bacaProbeM2d8());
    for (const a of p.alasan) console.log(a);
    console.log(JSON.stringify({ kritikus: p.kritikus, penebakGlm: p.penebakGlm }));
    return 0;
  }
  const { klien, biaya } = siapkanM2d8();
  mkdirSync(FOLDER_PROBE_M2D8, { recursive: true });
  const awalan = PAGU_BAGIAN_M2D8.probe.awalanTag;
  const hasil: HasilProbeM2d8[] = [];
  const simpan = (): void =>
    writeFileSync(JALUR_PROBE_M2D8, JSON.stringify({ pagu_probe_usd: PAGU_BAGIAN_M2D8.probe.usd, biaya_probe_usd: biaya.totalAwalan(awalan), hasil }, null, 2) + '\n', 'utf8');
  console.log(`Pagu milestone US$${PAGU_MILESTONE_M2D8.toFixed(2)} (terpakai US$${biaya.totalMilestone().toFixed(6)}); pagu probe US$${PAGU_BAGIAN_M2D8.probe.usd.toFixed(2)}.`);
  for (const b of butirProbe()) {
    const tag = `${awalan}${b.tag}`;
    const dasar = { tag, peran: b.peran, max_tokens: b.setelan.maxTokens };
    try {
      const j = await chatBerpagu(klien, biaya, { model: MODEL_OR_GLM, pesan: b.pesan, suhu: b.setelan.suhu, maxTokens: b.setelan.maxTokens, tambahanBadan: b.setelan.tambahanBadan }, tag);
      const n = b.nilai(j.teks);
      hasil.push({ ...dasar, penyedia: j.penyedia ?? null, finish_reason: j.finish_reason, token_keluar: j.token_keluar, token_penalaran: j.token_penalaran ?? null, biaya_usd: j.biaya_usd, terurai: n.terurai, catatan: n.catatan, teks: j.teks, status: 200 });
      console.log(`${tag}: ${String(j.penyedia)} ${String(j.finish_reason)} keluar ${String(j.token_keluar)} (penalaran ${String(j.token_penalaran)}) US$${j.biaya_usd.toFixed(6)} — ${n.catatan}`);
    } catch (galat) {
      const g = ubahGalatSaldo(galat, MODEL_OR_GLM);
      const pesan = g instanceof Error ? `${g.name}: ${g.message}` : 'galat tak dikenal';
      const status = typeof (g as { status?: unknown }).status === 'number' ? (g as { status: number }).status : null;
      hasil.push({ ...dasar, galat: pesan.slice(0, 300), status });
      console.log(`${tag}: GALAT ${pesan.slice(0, 200)}`);
      if (g instanceof PaguTercapai) {
        simpan();
        break;
      }
    }
    simpan();
  }
  simpan();
  const p = putusanPenalar(bacaLedger(), hasil);
  console.log(`Probe selesai: US$${biaya.totalAwalan(awalan).toFixed(6)}; milestone US$${biaya.totalMilestone().toFixed(6)}.`);
  for (const a of p.alasan) console.log(`  ${a}`);
  return p.effort_diterima ? 0 : 3;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/kalibrasi-probe.ts') === true) {
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
