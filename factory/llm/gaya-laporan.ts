/**
 * `npm run gaya:laporan` — tulis `docs/bukti/lingkar-agen-gaya.md` +
 * `eval/keluaran-m2d4/{ringkasan,ledger-ringkas}.json` dari keluaran mentah
 * (M2d-4 D-9).
 *
 * Tidak ada angka yang ditulis tangan: putaran, sudut, penolakan pemeriksa
 * gaya, keberatan kritikus (termasuk dua pertanyaan makna), tebakan dalam per
 * model, biaya per peran (dan tambahan GLM penebak), waktu dihitung dari
 * `riwayat.json` + `jejak-agen.json` + ledger; hasil eksternal dari
 * `penguji/kunci.json` + jawaban mentah subagent; panjang & bentuk pilihan
 * dihitung dengan fungsi yang sama dengan gerbang (`gerbang-gaya.ts`) atas
 * omongan yang dikunci M2d-4, M2d-3, dan soal manusia; pembanding M2d-1…M2d-3
 * dari ringkasan terlacaknya. Satu-satunya bagian tulisan tangan:
 * `eval/keluaran-m2d4/laporan-tangan.md`, ditempel apa adanya.
 *
 * Biaya: ledger kini (mulai dari nol sesudah arsip, M2d-4 §0) dipotong di akhir
 * milestone, hanya entri `m2d4/`; ledger lama yang diarsipkan dilaporkan
 * totalnya (tidak dijumlah ke milestone).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tanggalId } from '../format.ts';
import { teksPolos } from '../skema/rujukan.ts';
import type { HasilPeran, PemeriksaanPeran } from './agen-peran.ts';
import { lolosKartuLuar, lolosTebakLuar } from './agen-laporan.ts';
import type { KunciOpsi } from './draf.ts';
import { AKAR } from './env.ts';
import { FOLDER_PENGUJI_M2D4, bacaRiwayatDi, lolosM2d4, type KunciPengujiM2d4 } from './gaya-penguji.ts';
import { AWALAN_TAG_M2D4, FOLDER_M2D4, PAGU_MILESTONE_M2D4, URUTAN_GAYA } from './gaya-susun.ts';
import { batasPanjang, gRegister, hitungKata, masalahKlausa } from './gerbang-gaya.ts';
import type { JejakAgen } from './jejak.ts';
import type { Keberatan } from './kritikus.ts';
import { jsonDari, lolosTebak } from './laporan.ts';
import { MODEL_KRITIKUS, MODEL_PENEBAK_M2D4, MODEL_PERAN } from './model.ts';
import { FOLDER_ARSIP_LEDGER, JALUR_ARSIP_FEATHERLESS, JALUR_LEDGER, type EntriLedger } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { omonganLolosPeran, type OmonganLolosPeran } from './peran-penguji.ts';
import { biayaPerPeran, type BiayaPeran } from './peran-laporan.ts';
import { FOLDER_M2D3 } from './peran-susun.ts';

const JALUR_LAPORAN = `${AKAR}docs/bukti/lingkar-agen-gaya.md`;
const KUNCI: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

function baca<T>(jalur: string): T {
  return JSON.parse(readFileSync(jalur, 'utf8')) as T;
}
function rata(x: readonly number[]): number | null {
  return x.length === 0 ? null : x.reduce((a, b) => a + b, 0) / x.length;
}
function f(n: number | null, d = 2): string {
  return n === null ? '—' : n.toFixed(d).replace('.', ',');
}
function usd(n: number): string {
  return `US$${n.toFixed(4)}`;
}
function sel(t: string): string {
  return t.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}
function bacaLedgerBerkas(jalur: string): EntriLedger[] {
  if (!existsSync(jalur)) return [];
  return readFileSync(jalur, 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.trim() !== '')
    .map((b) => JSON.parse(b) as EntriLedger);
}

/* ---------------------------------------------------------------------- */
/* panjang & bentuk                                                        */
/* ---------------------------------------------------------------------- */

export interface BentukOmongan {
  kata_pesan: number;
  kata_pilihan: number[];
  /** Pilihan yang TIDAK berbentuk `Betul|Keliru, <satu klausa>` (G-satu-klausa). */
  pilihan_berekor: number;
  pakai_gue: boolean;
}

export function bentukOmongan(o: { pesan: string; pilihan: Record<KunciOpsi, string> }): BentukOmongan {
  return {
    kata_pesan: hitungKata(o.pesan),
    kata_pilihan: KUNCI.map((k) => hitungKata(o.pilihan[k])),
    pilihan_berekor: KUNCI.filter((k) => masalahKlausa(o.pilihan[k]) !== null).length,
    pakai_gue: gRegister(o.pesan).tolak,
  };
}

export interface RingkasBentuk {
  omongan: number;
  pilihan_rata: number | null;
  pilihan_maks: number;
  pilihan_lewat_batas: number;
  pesan_rata: number | null;
  pesan_maks: number;
  pilihan_berekor: number;
  pesan_gue: number;
}

export function ringkasBentuk(daftar: readonly BentukOmongan[], batasPilihan: number): RingkasBentuk {
  const semua = daftar.flatMap((b) => b.kata_pilihan);
  return {
    omongan: daftar.length,
    pilihan_rata: rata(semua),
    pilihan_maks: Math.max(0, ...semua),
    pilihan_lewat_batas: semua.filter((n) => n > batasPilihan).length,
    pesan_rata: rata(daftar.map((b) => b.kata_pesan)),
    pesan_maks: Math.max(0, ...daftar.map((b) => b.kata_pesan)),
    pilihan_berekor: daftar.reduce((a, b) => a + b.pilihan_berekor, 0),
    pesan_gue: daftar.filter((b) => b.pakai_gue).length,
  };
}

function soalManusia(): Array<{ pesan: string; pilihan: Record<KunciOpsi, string> }> {
  return readdirSync(`${AKAR}cases`)
    .filter((x) => x.endsWith('.json'))
    .sort()
    .flatMap((x) =>
      baca<{ soal: Array<{ pesan: { isi: string }; pilihan: Array<{ kunci: KunciOpsi; teks: string }> }> }>(`${AKAR}cases/${x}`).soal.map((s) => ({
        pesan: s.pesan.isi,
        pilihan: Object.fromEntries(s.pilihan.map((p) => [p.kunci, p.teks])) as Record<KunciOpsi, string>,
      })),
    );
}

/* ---------------------------------------------------------------------- */
/* biaya                                                                   */
/* ---------------------------------------------------------------------- */

/** Biaya per peran + pemisahan penebak menurut model (tambahan GLM, D-5). */
export function biayaGaya(entri: readonly EntriLedger[]): BiayaPeran & { penebak_glm: number; penebak_deepseek: number } {
  const b = biayaPerPeran(entri);
  const tebak = entri.filter((e) => (e.tag.split('/')[3] ?? '') === 'gerbang-tebak');
  return {
    ...b,
    penebak_glm: tebak.filter((e) => e.model === MODEL_KRITIKUS).reduce((a, e) => a + e.biaya_usd, 0),
    penebak_deepseek: tebak.filter((e) => e.model !== MODEL_KRITIKUS).reduce((a, e) => a + e.biaya_usd, 0),
  };
}

/* ---------------------------------------------------------------------- */
/* eksternal                                                               */
/* ---------------------------------------------------------------------- */

interface JawabanTebak { id: string; pilihan: string; yakin: number }
interface JawabanKartu { id: string; pilihan: string; kartu: number[]; bingung: string }
interface JawabanAlami { kelompok: number; label: string; skor: number; alasan: string }

function bacaJawaban<T>(awalan: string, medan: string): Array<{ penguji: string; isi: T[] }> {
  const folder = `${FOLDER_PENGUJI_M2D4}/jawaban`;
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((b) => b.startsWith(awalan) && b.endsWith('.txt'))
    .sort()
    .map((b) => {
      const n = jsonDari(readFileSync(`${folder}/${b}`, 'utf8')) as Record<string, T[]>;
      return { penguji: b.replace('.txt', ''), isi: n[medan] ?? [] };
    });
}

interface Sim {
  paket: string;
  p: PaketFakta;
  h: HasilPeran;
  j: JejakAgen;
}

interface HasilLuar {
  paket: string;
  no: number;
  kunci: string;
  dalam: OmonganLolosPeran;
  tebak: { jawaban: Array<{ pilihan: string; yakin: number }>; benar: number; yakinBenar: number | null; lolos: boolean };
  kartu: { jawaban: Array<{ pilihan: string; kartu: number[]; bingung: string }>; benar: number; menunjuk: number; lolos: boolean; penentu: number[] };
}

function kodePemeriksa(o: PemeriksaanPeran): string[] {
  const k = new Set<string>();
  for (const u of o.umpan) {
    const m = /^\[pemeriksa: ([A-Za-z_-]+)/.exec(u);
    if (m?.[1] !== undefined) k.add(m[1]);
    else if (u.startsWith('[bentuk]') || u.startsWith('[galat penyedia]')) k.add('TAK_TERBACA');
  }
  return [...k];
}

export interface Laporan {
  md: string;
  ringkasan: unknown;
  ledgerRingkas: unknown;
  konsol: string[];
}

export function bangunLaporanGaya(ledgerKini: readonly EntriLedger[], ledgerArsip: readonly EntriLedger[]): Laporan {
  const sim: Sim[] = [];
  for (const paket of URUTAN_GAYA) {
    const h = bacaRiwayatDi(FOLDER_M2D4, paket);
    if (h === null) continue;
    sim.push({ paket, h, p: baca<PaketFakta>(`${FOLDER_M2D4}/${paket}/paket.json`), j: baca<JejakAgen>(`${FOLDER_M2D4}/${paket}/jejak-agen.json`) });
  }
  const potong = sim.map((s) => s.j.selesai ?? s.j.mulai).sort().at(-1) ?? '';
  const ledgerM = ledgerKini.filter((e) => e.waktu <= potong && e.tag.startsWith(AWALAN_TAG_M2D4));
  const totalM = ledgerM.reduce((a, e) => a + e.biaya_usd, 0);
  const totalKini = ledgerKini.filter((e) => e.waktu <= potong).reduce((a, e) => a + e.biaya_usd, 0);
  const totalArsip = ledgerArsip.reduce((a, e) => a + e.biaya_usd, 0);
  const peranM = biayaGaya(ledgerM);

  const perSim = sim.map((s) => {
    // Hanya entri dalam jendela jalan yang jejaknya dilaporkan; jalan yang dibuang,
    // probe, dan KOREKSI dilaporkan terpisah (tetap di total milestone).
    const entri = ledgerM.filter(
      (e) => e.tag.startsWith(`${AWALAN_TAG_M2D4}${s.paket}/`) && !e.tag.includes('/KOREKSI/') && e.waktu >= s.j.mulai && (s.j.selesai === null || e.waktu <= s.j.selesai),
    );
    const versi = s.h.riwayat.flatMap((r) => r.omongan.filter((o) => o.status !== 'terkunci-sebelumnya'));
    const status: Record<string, number> = {};
    for (const o of versi) status[o.status] = (status[o.status] ?? 0) + 1;
    const kodeP: Record<string, number> = {};
    for (const o of versi.filter((x) => x.status === 'ditolak-pemeriksa' || x.status === 'tidak-ada')) {
      for (const k of kodePemeriksa(o)) kodeP[k] = (kodeP[k] ?? 0) + 1;
    }
    const keberatan: Array<Keberatan & { putaran: number; no: number }> = [];
    let cekKlaim = 0;
    let cekPilihan = 0;
    for (const r of s.h.riwayat) {
      for (const o of r.omongan) {
        for (const k of o.kritik?.keberatan ?? []) keberatan.push({ ...k, putaran: r.putaran, no: o.no });
        const c = o.kritik?.cek_makna;
        if (c !== null && c !== undefined) {
          if (c.bagian_tak_tercek.length > 0) cekKlaim += 1;
          if (c.juga_benar.some((x) => x !== r.draf[o.no - 1]?.kunci)) cekPilihan += 1;
        }
      }
    }
    const jenis: Record<string, number> = {};
    for (const k of keberatan) jenis[k.jenis] = (jenis[k.jenis] ?? 0) + 1;
    const langkahKritik = s.j.langkah.filter((l) => l.jenis === 'kritikus');
    const panggilanPenulis = s.h.riwayat.flatMap((r) => r.panggilan);
    // Tebakan dalam per model (siapa yang menebak benar tanpa kartu).
    const perModel: Record<string, { tebak: number; benar: number }> = {};
    for (const l of s.j.langkah.filter((x) => x.jenis === 'gerbang-tebak')) {
      for (const t of (l.rincian['tebakan'] as Array<{ model?: string; benar: boolean }> | undefined) ?? []) {
        const m = t.model ?? '?';
        perModel[m] ??= { tebak: 0, benar: 0 };
        perModel[m].tebak += 1;
        if (t.benar) perModel[m].benar += 1;
      }
    }
    return {
      paket: s.paket,
      tanggal_t: s.p.tanggal_t,
      terbit: s.h.lolos,
      putaran: s.h.jumlah_putaran,
      berhenti: s.h.berhenti,
      sudut: s.h.sudut.map((ss, i) => ({ no: i + 1, riwayat: ss.map((c) => ({ ke: c.ke, fact_id: c.fact_id, hasil: c.hasil, putaran: `${String(c.putaran_mulai)}–${String(c.putaran_akhir ?? '')}` })) })),
      versi: versi.length,
      status,
      kode_pemeriksa: kodeP,
      keberatan_kritikus: keberatan,
      jenis_keberatan: jenis,
      cek_makna: { bagian_tak_tercek: cekKlaim, pilihan_lain_benar: cekPilihan },
      kritikus_dipanggil: langkahKritik.length,
      kritikus_terpotong: langkahKritik.filter((l) => l.rincian['terpotong'] === true).length,
      penulis_terpotong: panggilanPenulis.filter((p) => p.finish_reason === 'length').length,
      penulis_cadangan: panggilanPenulis.filter((p) => !p.mode_berpikir).length,
      tebak_dalam_per_model: perModel,
      panggilan_ledger: entri.length,
      biaya_ledger: entri.reduce((a, e) => a + e.biaya_usd, 0),
      biaya_peran: biayaGaya(entri),
      biaya_jejak: s.j.hasil?.biaya_usd ?? 0,
      durasi_ms: s.j.hasil?.durasi_ms ?? 0,
    };
  });

  // --- panjang & bentuk: M2d-4 vs M2d-3 vs manusia
  const batas = batasPanjang();
  const kunci4 = URUTAN_GAYA.flatMap((p) => lolosM2d4(p));
  const kunci3 = ['tirt', 'dada', 'ultj'].flatMap((p) => {
    const h = bacaRiwayatDi(FOLDER_M2D3, p);
    return h === null ? [] : omonganLolosPeran(p, h);
  });
  const bentuk = {
    batas: { pilihan: batas.pilihan, pesan: batas.pesan },
    m2d4: ringkasBentuk(kunci4.map((l) => bentukOmongan(l.omongan)), batas.pilihan),
    m2d3: ringkasBentuk(kunci3.map((l) => bentukOmongan(l.omongan)), batas.pilihan),
    manusia: ringkasBentuk(soalManusia().map(bentukOmongan), batas.pilihan),
  };

  // --- eksternal
  const kunciPath = `${FOLDER_PENGUJI_M2D4}/kunci.json`;
  const kunci = existsSync(kunciPath) ? baca<KunciPengujiM2d4>(kunciPath) : null;
  const tebakMentah = bacaJawaban<JawabanTebak>('tebak-', 'jawaban');
  const kartuMentah = bacaJawaban<JawabanKartu>('kartu-', 'jawaban');
  const alamiMentah = bacaJawaban<JawabanAlami>('alami-', 'nilai');
  const luar: HasilLuar[] = [];
  if (kunci !== null) {
    for (const o of kunci4) {
      const bt = kunci.tebak.find((x) => x.paket === o.paket && x.no === o.no);
      const bk = kunci.kartu.find((x) => x.paket === o.paket && x.no === o.no);
      if (bt === undefined || bk === undefined) continue;
      const jt = tebakMentah
        .map((p) => p.isi.find((x) => x.id === bt.id))
        .filter((x): x is JawabanTebak => x !== undefined)
        .map((x) => ({ pilihan: String(x.pilihan).toLowerCase(), yakin: Number(x.yakin) }));
      const nt = lolosTebak(jt, bt.kunci);
      const jk = kartuMentah
        .map((p) => p.isi.find((x) => x.id === bk.id))
        .filter((x): x is JawabanKartu => x !== undefined)
        .map((x) => ({ pilihan: String(x.pilihan).toLowerCase(), kartu: (x.kartu ?? []).map(Number), bingung: x.bingung ?? '' }));
      luar.push({
        paket: o.paket,
        no: o.no,
        kunci: bt.kunci,
        dalam: o,
        tebak: { jawaban: jt, benar: nt.benar, yakinBenar: nt.yakinBenar, lolos: lolosTebakLuar(jt, bt.kunci) },
        kartu: {
          jawaban: jk,
          benar: jk.filter((x) => x.pilihan === bk.kunci).length,
          menunjuk: jk.filter((x) => x.pilihan === bk.kunci && x.kartu.some((k) => bk.penentu.includes(k))).length,
          lolos: lolosKartuLuar(jk, bk.kunci, bk.penentu),
          penentu: bk.penentu,
        },
      });
    }
  }
  const alami: Array<{ penilai: string; paket: string; sumber: string; skor: number; alasan: string }> = [];
  if (kunci !== null) {
    for (const p of alamiMentah) {
      for (const n of p.isi) {
        const k = kunci.alami.find((x) => x.kelompok === Number(n.kelompok));
        const sumber = k?.label[n.label];
        if (k === undefined || sumber === undefined) continue;
        alami.push({ penilai: p.penguji, paket: k.paket, sumber, skor: Number(n.skor), alasan: n.alasan });
      }
    }
  }
  const alamiRata = (sumber: string): { rata: number | null; n: number } => {
    const x = alami.filter((a) => a.sumber === sumber).map((a) => a.skor);
    return { rata: rata(x), n: x.length };
  };

  // --- pembanding generasi sebelumnya (ringkasan terlacak)
  const m2d3 = baca<{
    per_simulasi: Array<{ paket: string; terbit: boolean }>;
    setuju: Record<string, number>;
    luar: Array<{ tebak_luar: { benar: number; lolos: boolean }; kartu_luar: { lolos: boolean; jawaban: Array<{ bingung: string }> } }>;
    alami_rata: Record<string, { rata: number | null; n: number }>;
    pembanding: {
      m2d1: { tebak_luar_deepseek: string | null; tebak_benar_rata: number | null; alami: number | null; manusia: number };
      m2d2: { lolos_penuh: string; tebak_luar: string; tebak_benar_rata: number | null; alami_agen: number | null; alami_manusia: number | null };
    };
    biaya: { milestone_ledger_usd: number };
  }>(`${FOLDER_M2D3}/ringkasan.json`);

  // --- di luar jalan yang dilaporkan: jalan yang dibuang, probe, KOREKSI
  const dalamJalan = new Set(perSim.flatMap((s) => ledgerM.filter((e) => e.tag.startsWith(`${AWALAN_TAG_M2D4}${s.paket}/`) && !e.tag.includes('/KOREKSI/') && e.waktu >= (sim.find((x) => x.paket === s.paket)?.j.mulai ?? '') && e.waktu <= (sim.find((x) => x.paket === s.paket)?.j.selesai ?? ''))));
  const luarJalan = ledgerM.filter((e) => !dalamJalan.has(e));
  const kelompokLuar = (e: EntriLedger): string => (e.tag.includes('/KOREKSI/') ? `KOREKSI ${e.tag.split('/')[3] ?? ''}` : e.tag.startsWith(`${AWALAN_TAG_M2D4}probe/`) ? 'probe GLM penebak' : 'jalan TIRT dibuang (ke-1 dan ke-2)');
  const dibuang: Record<string, { panggilan: number; usd: number }> = {};
  for (const e of luarJalan) {
    const k = kelompokLuar(e);
    dibuang[k] ??= { panggilan: 0, usd: 0 };
    dibuang[k].panggilan += 1;
    dibuang[k].usd += e.biaya_usd;
  }

  const ringkasan = {
    model_peran: { ...MODEL_PERAN, penebak: MODEL_PENEBAK_M2D4 },
    pagu_milestone_usd: PAGU_MILESTONE_M2D4,
    per_simulasi: perSim,
    bentuk,
    luar: luar.map((x) => ({ paket: x.paket, no: x.no, kunci: x.kunci, tebak_dalam: x.dalam.tebak_dalam, tebak_luar: x.tebak, kartu_luar: x.kartu })),
    setuju: {
      tebak_lolos_dalam_lolos_luar: luar.filter((x) => x.tebak.lolos).length,
      tebak_lolos_dalam_gagal_luar: luar.filter((x) => !x.tebak.lolos).length,
      kartu_lolos_luar: luar.filter((x) => x.kartu.lolos).length,
      kartu_ada_bingung: luar.filter((x) => x.kartu.jawaban.some((j) => j.bingung.trim() !== '')).length,
    },
    alami,
    alami_rata: { agen_m2d4: alamiRata('agen-m2d4'), agen_m2d3: alamiRata('agen-m2d3'), manusia: alamiRata('manusia') },
    pembanding_m2d3: {
      terbit: `${String(m2d3.per_simulasi.filter((s) => s.terbit).length)}/${String(m2d3.per_simulasi.length)}`,
      tebak_luar: `${String(m2d3.setuju['tebak_lolos_dalam_lolos_luar'] ?? 0)}/${String(m2d3.luar.length)}`,
      tebak_benar_rata: rata(m2d3.luar.map((x) => x.tebak_luar.benar)),
      kartu_luar: `${String(m2d3.setuju['kartu_lolos_luar'] ?? 0)}/${String(m2d3.luar.length)}`,
      kartu_ada_bingung: m2d3.luar.filter((x) => x.kartu_luar.jawaban.some((j) => j.bingung.trim() !== '')).length,
      alami_agen: m2d3.alami_rata['agen_m2d3']?.rata ?? null,
      alami_manusia: m2d3.alami_rata['manusia']?.rata ?? null,
      biaya_usd: m2d3.biaya.milestone_ledger_usd,
      m2d1: m2d3.pembanding.m2d1,
      m2d2: m2d3.pembanding.m2d2,
    },
    biaya: {
      milestone_ledger_usd: totalM,
      per_peran: peranM,
      ledger_kini_usd: totalKini,
      ledger_arsip_usd: totalArsip,
      ledger_arsip_entri: ledgerArsip.length,
      panggilan: ledgerM.length,
      dipotong: potong,
      di_luar_jalan: dibuang,
    },
  };
  const ledgerRingkas = ledgerM.map((e) => ({
    waktu: e.waktu, tag: e.tag, model: e.model, status: e.status, token_masuk: e.token_masuk, token_keluar: e.token_keluar,
    biaya_usd: e.biaya_usd, dasar_biaya: e.dasar_biaya, latensi_ms: e.latensi_ms,
  }));
  const tangan = existsSync(`${FOLDER_M2D4}/laporan-tangan.md`) ? readFileSync(`${FOLDER_M2D4}/laporan-tangan.md`, 'utf8') : '';
  const md = tulis(sim, perSim, luar, alami, ringkasan, tangan);
  const konsol = [
    `Biaya milestone (ledger ${AWALAN_TAG_M2D4}*, dipotong ${potong}): ${usd(totalM)} dalam ${String(ledgerM.length)} panggilan — penulis ${usd(peranM.penulis)}, ` +
      `pembaca kartu ${usd(peranM['pembaca-kartu'])}, penebak ${usd(peranM.penebak)} (GLM ${usd(peranM.penebak_glm)}), kritikus ${usd(peranM.kritikus)}; ` +
      `ledger lama diarsipkan ${usd(totalArsip)} (${String(ledgerArsip.length)} entri).`,
    ...perSim.map((s) => `  ${s.paket}: ${s.terbit ? 'TERBIT' : 'TIDAK TERBIT'} di putaran ${String(s.putaran)}, ${String(s.panggilan_ledger)} panggilan, ${usd(s.biaya_ledger)}; keberatan kritikus ${JSON.stringify(s.jenis_keberatan)}`),
    `  tebak buta luar: ${String(ringkasan.setuju.tebak_lolos_dalam_lolos_luar)}/${String(luar.length)} lolos; kartu luar K-05: ${String(ringkasan.setuju.kartu_lolos_luar)}/${String(luar.length)}`,
    `  kealamian: M2d-4 ${f(ringkasan.alami_rata.agen_m2d4.rata)} (n=${String(ringkasan.alami_rata.agen_m2d4.n)}), M2d-3 ${f(ringkasan.alami_rata.agen_m2d3.rata)}, manusia ${f(ringkasan.alami_rata.manusia.rata)}`,
    `  pilihan: M2d-4 rata ${f(bentuk.m2d4.pilihan_rata, 1)} kata (maks ${String(bentuk.m2d4.pilihan_maks)}), M2d-3 ${f(bentuk.m2d3.pilihan_rata, 1)} (maks ${String(bentuk.m2d3.pilihan_maks)}), manusia ${f(bentuk.manusia.pilihan_rata, 1)} (maks ${String(bentuk.manusia.pilihan_maks)})`,
  ];
  return { md, ringkasan, ledgerRingkas, konsol };
}

function tulisDraf(o: { nama: string; jam: string; pesan: string; pilihan: Record<string, string>; kunci: string }): string[] {
  return [
    `> **${o.nama} (${o.jam}):** ${teksPolos(o.pesan)}`,
    '',
    ...KUNCI.map((k) => `- ${k === o.kunci ? '**' : ''}${k}) ${teksPolos(o.pilihan[k] ?? '')}${k === o.kunci ? '** (kunci)' : ''}`),
    '',
  ];
}

interface PerSim {
  paket: string; tanggal_t: string; terbit: boolean; putaran: number; berhenti: string | null;
  sudut: Array<{ no: number; riwayat: Array<{ ke: number; fact_id: string; hasil: string; putaran: string }> }>;
  versi: number; status: Record<string, number>; kode_pemeriksa: Record<string, number>;
  keberatan_kritikus: Array<Keberatan & { putaran: number; no: number }>; jenis_keberatan: Record<string, number>;
  cek_makna: { bagian_tak_tercek: number; pilihan_lain_benar: number };
  kritikus_dipanggil: number; kritikus_terpotong: number; penulis_terpotong: number; penulis_cadangan: number;
  tebak_dalam_per_model: Record<string, { tebak: number; benar: number }>;
  panggilan_ledger: number; biaya_ledger: number; biaya_peran: ReturnType<typeof biayaGaya>; biaya_jejak: number; durasi_ms: number;
}

function barisBentuk(nama: string, b: RingkasBentuk): string {
  return `| ${nama} | ${String(b.omongan)} | ${f(b.pilihan_rata, 1)} | ${String(b.pilihan_maks)} | ${String(b.pilihan_lewat_batas)} | ${String(b.pilihan_berekor)}/${String(b.omongan * 4)} | ${f(b.pesan_rata, 1)} | ${String(b.pesan_maks)} | ${String(b.pesan_gue)}/${String(b.omongan)} |`;
}

function tulis(
  sim: Sim[],
  perSim: PerSim[],
  luar: HasilLuar[],
  alami: Array<{ penilai: string; paket: string; sumber: string; skor: number; alasan: string }>,
  r: {
    bentuk: { batas: { pilihan: number; pesan: number }; m2d4: RingkasBentuk; m2d3: RingkasBentuk; manusia: RingkasBentuk };
    alami_rata: Record<string, { rata: number | null; n: number }>;
    setuju: Record<string, number>;
    pembanding_m2d3: {
      terbit: string; tebak_luar: string; tebak_benar_rata: number | null; kartu_luar: string; kartu_ada_bingung: number;
      alami_agen: number | null; alami_manusia: number | null; biaya_usd: number;
      m2d1: { tebak_luar_deepseek: string | null; tebak_benar_rata: number | null; alami: number | null; manusia: number };
      m2d2: { lolos_penuh: string; tebak_luar: string; tebak_benar_rata: number | null; alami_agen: number | null; alami_manusia: number | null };
    };
    biaya: { milestone_ledger_usd: number; per_peran: ReturnType<typeof biayaGaya>; ledger_kini_usd: number; ledger_arsip_usd: number; ledger_arsip_entri: number; panggilan: number; dipotong: string; di_luar_jalan: Record<string, { panggilan: number; usd: number }> };
  },
  tangan: string,
): string {
  const b: string[] = [];
  b.push('# Bukti: lingkar agen gaya & makna (M2d-4)', '');
  b.push(
    'Berkas ini ditulis oleh `npm run gaya:laporan` dari keluaran mentah di `eval/keluaran-m2d4/` (riwayat tiap putaran, jejak langkah, ledger biaya, bahan dan jawaban mentah penguji eksternal). Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d4/laporan-tangan.md`). Draf **tidak** dipasang ke produk.',
    '',
  );

  b.push('## Metode', '');
  b.push('Lingkar berperan M2d-3 (`factory/llm/peran.md`) dengan perubahan M2d-4, semuanya ditetapkan kode (`GENERASI_M2D4` di `factory/llm/agen-peran.ts`):', '');
  b.push(`- **Pemeriksa** menambah tiga gerbang gaya (\`factory/llm/gerbang-gaya.ts\`): G-panjang — pilihan ≤ ${String(r.bentuk.batas.pilihan)} kata, pesan ≤ ${String(r.bentuk.batas.pesan)} kata (maksimum soal manusia di \`cases/*.json\`, dihitung dari teks tampil); G-satu-klausa — \`Betul|Keliru, <satu klausa>\`, tanpa ekor ", jadi …"/", karena …", koma kedua hanya untuk ", bukan …"/", tapi …"; G-register — tanpa "gue"/"gua"/"lo"/"elo".`);
  b.push('- **Penulis** memakai `prompt-penulis-gaya.md` dan bank gaya v2 (`factory/llm/bank-gaya-v2.json`, 90 kalimat, enam nada termasuk "ikut-ikutan").');
  b.push(`- **Penebak ×3** tetap tanpa kartu: ke-1 dan ke-2 \`${MODEL_PENEBAK_M2D4[0] ?? ''}\`, ke-3 \`${MODEL_PENEBAK_M2D4[2] ?? ''}\`; petunjuk "pemain pintar".`);
  b.push(`- **Kritikus** (\`${MODEL_KRITIKUS}\`) dipanggil sesudah pemeriksa dan pembaca kartu, SEBELUM penebak, dengan dua pertanyaan wajib yang diubah kode menjadi keberatan yang menolak: bagian klaim yang tak bisa dicek dari kartu padahal kunci "Betul", dan pilihan lain yang juga benar menurut kartu.`);
  b.push('');
  b.push(
    '**Bank gaya v2 dan korpus.** Kalimat bank v2 semuanya ditulis baru (K-07); gayanya disarikan dari statistik korpus santai berlisensi, **tanpa menyalin kalimat korpus** (diperiksa: nol 6-gram bersama). Sumber statistik: STIF-Indonesia — Wibowo, H. A., dkk. (2020), *Semi-Supervised Low-Resource Style Transfer of Indonesian Informal to Formal Language with Iterative Forward-Translation*, IALP 2020, github.com/haryoa/stif-indonesia (MIT License, © 2020 Haryo AW); IndoNLU EmoT dan SmSA — Wilie, B., dkk. (2020), *IndoNLU: Benchmark and Resources for Evaluating Indonesian Natural Language Understanding*, AACL-IJCNLP 2020, github.com/IndoNLP/indonlu (data MIT menurut kartu data; kode Apache-2.0). Korpus hanya disimpan lokal (tidak terlacak).',
    '',
  );

  b.push('## Hasil per simulasi', '');
  b.push('| paket | T | hasil | putaran | versi diperiksa | panggilan (ledger) | biaya (ledger) | penulis / kartu / penebak (GLM) / kritikus | waktu |');
  b.push('|---|---|---|---:|---:|---:|---:|---|---:|');
  for (const s of perSim) {
    const bp = s.biaya_peran;
    b.push(
      `| ${s.paket.toUpperCase()} | ${tanggalId(s.tanggal_t)} | ${s.terbit ? '**terbit (lolos penuh)**' : `tidak terbit (${sel(s.berhenti ?? '')})`} | ${String(s.putaran)} | ${String(s.versi)} | ${String(s.panggilan_ledger)} | ${usd(s.biaya_ledger)} | ${usd(bp.penulis)} / ${usd(bp['pembaca-kartu'])} / ${usd(bp.penebak)} (${usd(bp.penebak_glm)}) / ${usd(bp.kritikus)} | ${f(s.durasi_ms / 60000, 1)} menit |`,
    );
  }
  b.push('');
  const bp = r.biaya.per_peran;
  b.push(
    `**Biaya milestone menurut ledger** (entri bertag \`${AWALAN_TAG_M2D4}\`, dipotong ${r.biaya.dipotong}): **${usd(r.biaya.milestone_ledger_usd)}** dalam ${String(r.biaya.panggilan)} panggilan — penulis ${usd(bp.penulis)} (${String(bp.panggilan['penulis'] ?? 0)}), pembaca kartu ${usd(bp['pembaca-kartu'])} (${String(bp.panggilan['pembaca-kartu'] ?? 0)}), penebak ${usd(bp.penebak)} (${String(bp.panggilan['penebak'] ?? 0)}; DeepSeek ${usd(bp.penebak_deepseek)}, **tambahan GLM ${usd(bp.penebak_glm)}**), kritikus GLM ${usd(bp.kritikus)} (${String(bp.panggilan['kritikus'] ?? 0)}). Pagu milestone US$${PAGU_MILESTONE_M2D4.toFixed(2).replace('.', ',')} (ditegakkan kode) di dalam pagu kumulatif US$5,00 yang dimulai dari nol sesudah arsip. **Ledger lama diarsipkan** (\`.cache/llm/arsip/\`, tidak dihapus): ${usd(r.biaya.ledger_arsip_usd)} dalam ${String(r.biaya.ledger_arsip_entri)} entri (M2d-1 s.d. M2d-3). Total sepanjang lingkar LLM: ${usd(r.biaya.ledger_arsip_usd + r.biaya.ledger_kini_usd)}.`,
    '',
  );

  b.push('Di luar tiga jalan yang dilaporkan (tetap dihitung di biaya milestone; rekamannya di `eval/keluaran-m2d4/dibuang/`, sebabnya di catatan penulis):', '');
  b.push('| kelompok | panggilan | biaya |', '|---|---:|---:|');
  for (const [k, v] of Object.entries(r.biaya.di_luar_jalan)) b.push(`| ${k} | ${String(v.panggilan)} | ${usd(v.usd)} |`);
  b.push('');

  b.push('### Sudut per posisi', '');
  b.push('| paket | omongan | sudut (fakta penentu) → hasil, putaran |', '|---|---:|---|');
  for (const s of perSim) for (const x of s.sudut) b.push(`| ${s.paket.toUpperCase()} | ${String(x.no)} | ${x.riwayat.map((c) => `${String(c.ke)}. \`${c.fact_id}\` → ${c.hasil} (${c.putaran})`).join('; ')} |`);
  b.push('');

  b.push('### Keputusan per versi omongan', '');
  b.push('Setiap versi yang ditulis penulis (atau dibawa ulang), dan penilai pertama yang keberatan (urutan M2d-4: pemeriksa → pembaca kartu → kritikus → penebak).', '');
  const kolom = ['tidak-ada', 'ditolak-pemeriksa', 'ditolak-kartu', 'ditolak-kritikus', 'kritikus-tidak-menjawab', 'ditolak-tebak', 'galat-gerbang', 'lolos'];
  b.push(`| paket | versi | ${kolom.join(' | ')} | rincian pemeriksa | penulis terpotong / cadangan |`);
  b.push(`|---|---:|${kolom.map(() => '---:').join('|')}|---|---|`);
  for (const s of perSim) {
    b.push(
      `| ${s.paket.toUpperCase()} | ${String(s.versi)} | ${kolom.map((k) => String(s.status[k] ?? 0)).join(' | ')} | ${Object.entries(s.kode_pemeriksa).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${String(n)}`).join(', ') || '—'} | ${String(s.penulis_terpotong)} / ${String(s.penulis_cadangan)} |`,
    );
  }
  b.push('');

  b.push('### Kritikus: keberatan dan cek makna', '');
  for (const s of perSim) {
    const urut = Object.entries(s.jenis_keberatan).sort((x, y) => y[1] - x[1]);
    b.push(
      `**${s.paket.toUpperCase()}** — kritikus menilai ${String(s.kritikus_dipanggil)} versi (${String(s.biaya_peran.panggilan['kritikus'] ?? 0)} panggilan; terpotong di ${String(s.kritikus_terpotong)} versi); cek makna: bagian klaim tak tercek disebut di ${String(s.cek_makna.bagian_tak_tercek)} versi, pilihan lain juga benar di ${String(s.cek_makna.pilihan_lain_benar)} versi; keberatan per jenis: ${urut.map(([k, n]) => `${k} ${String(n)}`).join(', ') || 'tidak ada'}.`,
      '',
    );
    for (const k of s.keberatan_kritikus) b.push(`- putaran ${String(k.putaran)}, omongan ${String(k.no)} · ${k.jenis} (${sel(k.bagian)}): ${sel(k.alasan)}`);
    if (s.keberatan_kritikus.length > 0) b.push('');
  }

  b.push('### Penebak di dalam: siapa yang menebak benar tanpa kartu', '');
  b.push('| paket | model | tebakan | benar | proporsi benar |', '|---|---|---:|---:|---:|');
  for (const s of perSim) {
    for (const [m, x] of Object.entries(s.tebak_dalam_per_model)) b.push(`| ${s.paket.toUpperCase()} | \`${m}\` | ${String(x.tebak)} | ${String(x.benar)} | ${f(x.tebak === 0 ? null : x.benar / x.tebak)} |`);
  }
  b.push('');

  for (const s of sim) {
    b.push(`### ${s.paket.toUpperCase()} — putaran demi putaran`, '');
    for (const rr of s.h.riwayat) {
      const langkah = s.j.langkah.filter((l) => l.putaran === rr.putaran);
      const biayaP = langkah.reduce((a, l) => a + l.biaya_usd, 0);
      const mulai = langkah[0]?.waktu_mulai;
      const akhir = langkah[langkah.length - 1]?.waktu_selesai;
      const lama = mulai !== undefined && akhir !== undefined ? Date.parse(akhir) - Date.parse(mulai) : 0;
      b.push(
        `**Putaran ${String(rr.putaran)}** — tulis ${rr.ditulis.join(', ') || '—'}${rr.dibawa.length > 0 ? `; bawa ${rr.dibawa.join(', ')}` : ''}; sudut ${rr.sudut.map((x) => `${String(x.no)}:${x.fact_id} (${String(x.ke)}.${String(x.putaran_sudut)})`).join(', ')}; ${usd(biayaP)}, ${f(lama / 1000, 0)} s.`,
        '',
      );
      for (const o of rr.omongan) {
        if (o.status === 'terkunci-sebelumnya') continue;
        const bagian: string[] = [`omongan ${String(o.no)}: **${o.status}**`];
        if (o.kartu !== null) bagian.push(`pembaca kartu ${o.kartu.pilihan ?? '—'} (kunci ${o.kartu.kunci})`);
        if (o.kritik !== null) bagian.push(`kritikus: ${o.kritik.menjawab ? `${String(o.kritik.keberatan.length)} keberatan` : 'tidak menjawab'}`);
        if (o.tebak !== null) bagian.push(`tanpa kartu ${o.tebak.tebakan.map((t) => `${t.pilihan}/${String(t.yakin)}${t.terbaca ? '' : ' (tak terbaca)'}`).join(', ')} (ke-3 = GLM)`);
        b.push(`- ${bagian.join(' · ')}`);
        const pesan = rr.draf[o.no - 1];
        if (pesan !== null && pesan !== undefined && typeof pesan.pesan === 'string') b.push(`  - pesan: "${sel(teksPolos(pesan.pesan))}" (kunci ${String(pesan.kunci)})`);
        if (o.status !== 'lolos') for (const u of o.umpan.slice(0, 3)) b.push(`  - ${sel(u).slice(0, 320)}`);
      }
      for (const d of rr.dibuang) b.push(`- **sudut dibuang**: omongan ${String(d.no)} \`${d.fact_id}\` → ${d.pengganti === null ? 'tidak ada pengganti' : `\`${d.pengganti}\``}`);
      b.push('');
    }
  }

  b.push('## Draf akhir', '');
  for (const s of sim) {
    const terkunci = omonganLolosPeran(s.paket, s.h);
    b.push(`### ${s.paket.toUpperCase()} — ${s.h.lolos ? '**terbit**, draf utuh apa adanya' : `tidak terbit (${sel(s.h.berhenti ?? '')}); omongan yang dikunci`}`, '');
    if (s.h.lolos && s.h.draf !== null) {
      s.h.draf.omongan.forEach((o, i) => {
        b.push(`**Omongan ${String(i + 1)}**`, '');
        b.push(...tulisDraf(o));
      });
      b.push('```json', JSON.stringify(s.h.draf, null, 2), '```', '');
    } else {
      if (terkunci.length === 0) b.push('Tidak ada omongan yang dikunci.', '');
      for (const l of terkunci) {
        b.push(`**Omongan ${String(l.no)}** (dikunci di putaran ${String(l.putaran)}, sudut \`${l.sudut}\`)`, '');
        b.push(...tulisDraf(l.omongan));
      }
    }
  }

  b.push('## Panjang dan bentuk pilihan dibanding soal manusia', '');
  b.push(`Dihitung dengan fungsi gerbang (\`hitungKata\`, \`masalahKlausa\`, \`gRegister\`) atas omongan yang dikunci. Batas M2d-4: pilihan ≤ ${String(r.bentuk.batas.pilihan)} kata, pesan ≤ ${String(r.bentuk.batas.pesan)} kata.`, '');
  b.push('| sumber | omongan | kata/pilihan rata | maks | pilihan > batas | pilihan berekor (bukan satu klausa) | kata/pesan rata | maks | pesan ber-"gue" |');
  b.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  b.push(barisBentuk('agen M2d-4', r.bentuk.m2d4));
  b.push(barisBentuk('agen M2d-3', r.bentuk.m2d3));
  b.push(barisBentuk('manusia (DADA, ULTJ)', r.bentuk.manusia));
  b.push('');

  b.push('## Pembanding eksternal', '');
  b.push(
    'Penguji dan penilai: subagent Claude (opus) **baru**, tanpa konteks eksekutor, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d4/penguji/`); label acak. Jawaban mentah: `penguji/jawaban/`. Petunjuk sama persis dengan M2d-1…M2d-3.',
    '',
  );
  b.push('### Tebak buta (tanpa kartu) — gerbang-dalam vs penguji-luar', '');
  b.push('| paket | omongan | kunci | di dalam (DeepSeek, DeepSeek, GLM) | di luar (3 subagent) | benar luar | yakin benar | lolos luar |');
  b.push('|---|---:|---|---|---|---:|---:|---|');
  for (const x of luar) {
    b.push(
      `| ${x.paket.toUpperCase()} | ${String(x.no)} | ${x.kunci} | ${x.dalam.tebak_dalam.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(', ')} | ${x.tebak.jawaban.map((j) => `${j.pilihan}/${String(j.yakin)}`).join(', ')} | ${String(x.tebak.benar)}/${String(x.tebak.jawaban.length)} | ${f(x.tebak.yakinBenar, 0)} | ${x.tebak.lolos ? 'ya' : '**tidak**'} |`,
    );
  }
  if (luar.length === 0) b.push('| — | — | — | — | — | — | — | — |');
  b.push('');
  b.push(
    `**Kesepakatan:** dari ${String(luar.length)} omongan yang lolos di dalam, **${String(r.setuju['tebak_lolos_dalam_lolos_luar'] ?? 0)} juga lolos** tebak buta luar dan **${String(r.setuju['tebak_lolos_dalam_gagal_luar'] ?? 0)} gagal** di luar; rata-rata penguji luar yang menebak benar ${f(rata(luar.map((x) => x.tebak.benar)))} dari 3 (M2d-3: ${r.pembanding_m2d3.tebak_luar} lolos, rata-rata ${f(r.pembanding_m2d3.tebak_benar_rata)}).`,
    '',
  );
  b.push('### Jawab dengan kartu', '');
  b.push('| paket | omongan | kunci | kartu penentu | jawaban luar (pilihan/kartu) | benar | menunjuk penentu | kalimat membingungkan |');
  b.push('|---|---:|---|---|---|---:|---:|---|');
  for (const x of luar) {
    const bingung = x.kartu.jawaban.map((j) => j.bingung).filter((t) => t.trim() !== '').map((t) => `"${sel(t)}"`).join('; ');
    b.push(
      `| ${x.paket.toUpperCase()} | ${String(x.no)} | ${x.kunci} | ${x.kartu.penentu.join(', ')} | ${x.kartu.jawaban.map((j) => `${j.pilihan}/${j.kartu.join('+')}`).join(', ')} | ${String(x.kartu.benar)}/${String(x.kartu.jawaban.length)} | ${String(x.kartu.menunjuk)}/${String(x.kartu.jawaban.length)} | ${bingung || '—'} |`,
    );
  }
  if (luar.length === 0) b.push('| — | — | — | — | — | — | — | — |');
  b.push('');
  b.push(
    `K-05 penuh (3/3 benar dan menunjuk penentu): ${String(r.setuju['kartu_lolos_luar'] ?? 0)}/${String(luar.length)} (M2d-3: ${r.pembanding_m2d3.kartu_luar}). Omongan dengan kalimat yang ditandai membingungkan oleh ≥ 1 penguji: ${String(r.setuju['kartu_ada_bingung'] ?? 0)}/${String(luar.length)} (M2d-3: ${String(r.pembanding_m2d3.kartu_ada_bingung)}/8). Penggolongan masalah makna ada di catatan penulis.`,
    '',
  );
  b.push('### Kealamian bahasa (buta, penilai yang sama untuk M2d-4, M2d-3, dan manusia)', '');
  b.push('| sumber | rata-rata | n |', '|---|---:|---:|');
  for (const [nama, k] of [['agen M2d-4 (bank v2)', 'agen_m2d4'], ['agen M2d-3 (bank v1)', 'agen_m2d3'], ['manusia (hidup)', 'manusia']] as const) {
    const a = r.alami_rata[k];
    b.push(`| ${nama} | ${f(a?.rata ?? null)} | ${String(a?.n ?? 0)} |`);
  }
  b.push('');
  b.push('| paket | sumber | penilai | skor | alasan |', '|---|---|---|---:|---|');
  for (const a of [...alami].sort((x, y) => x.paket.localeCompare(y.paket) || x.sumber.localeCompare(y.sumber) || x.penilai.localeCompare(y.penilai))) {
    b.push(`| ${a.paket.toUpperCase()} | ${a.sumber} | ${a.penilai} | ${String(a.skor)} | ${sel(a.alasan)} |`);
  }
  b.push('');

  b.push('## M2d-1 → M2d-2 → M2d-3 → M2d-4', '');
  const p = r.pembanding_m2d3;
  const terbit = `${String(perSim.filter((s) => s.terbit).length)}/${String(perSim.length)}`;
  b.push('| ukuran | M2d-1 (tanpa lingkar) | M2d-2 (lingkar, satu model) | M2d-3 (berperan) | M2d-4 (gaya & makna) |', '|---|---|---|---|---|');
  b.push(`| simulasi terbit | — (tanpa gerbang) | ${p.m2d2.lolos_penuh} | ${p.terbit} | ${terbit} |`);
  b.push(
    `| tebak buta luar K-05 (lolos / diuji), rata-rata benar | ${p.m2d1.tebak_luar_deepseek ?? '—'}, ${f(p.m2d1.tebak_benar_rata)} | ${p.m2d2.tebak_luar}, ${f(p.m2d2.tebak_benar_rata)} | ${p.tebak_luar}, ${f(p.tebak_benar_rata)} | ${String(r.setuju['tebak_lolos_dalam_lolos_luar'] ?? 0)}/${String(luar.length)}, ${f(rata(luar.map((x) => x.tebak.benar)))} |`,
  );
  b.push(`| jawab-dengan-kartu K-05 penuh | — | — | ${p.kartu_luar} | ${String(r.setuju['kartu_lolos_luar'] ?? 0)}/${String(luar.length)} |`);
  b.push(`| omongan dengan kalimat membingungkan (penguji kartu) | — | — | ${String(p.kartu_ada_bingung)}/8 | ${String(r.setuju['kartu_ada_bingung'] ?? 0)}/${String(luar.length)} |`);
  b.push(`| kealamian, penilai masing-masing milestone (manusia) | ${f(p.m2d1.alami)} (${f(p.m2d1.manusia)}) | ${f(p.m2d2.alami_agen)} (${f(p.m2d2.alami_manusia)}) | ${f(p.alami_agen)} (${f(p.alami_manusia)}) | ${f(r.alami_rata['agen_m2d4']?.rata ?? null)} (${f(r.alami_rata['manusia']?.rata ?? null)}) |`);
  b.push(`| kealamian, penilai M2d-4 yang SAMA | — | — | ${f(r.alami_rata['agen_m2d3']?.rata ?? null)} | ${f(r.alami_rata['agen_m2d4']?.rata ?? null)} |`);
  b.push(`| kata per pilihan, rata-rata (maks) — manusia ${f(r.bentuk.manusia.pilihan_rata, 1)} (${String(r.bentuk.manusia.pilihan_maks)}) | — | — | ${f(r.bentuk.m2d3.pilihan_rata, 1)} (${String(r.bentuk.m2d3.pilihan_maks)}) | ${f(r.bentuk.m2d4.pilihan_rata, 1)} (${String(r.bentuk.m2d4.pilihan_maks)}) |`);
  b.push(`| biaya milestone (ledger) | — | — | ${usd(p.biaya_usd)} | ${usd(r.biaya.milestone_ledger_usd)} |`);
  b.push('');
  if (tangan.trim() !== '') b.push('## Catatan penulis', '', tangan.trim(), '');
  return b.join('\n');
}

/**
 * Ledger M2d-4 dan arsip SEBELUM M2d-4. Sesudah M2d-5 D-0 ledger yang memuat
 * M2d-4 pindah ke `JALUR_ARSIP_FEATHERLESS`; laporan M2d-4 membacanya dari sana
 * (hasilnya byte-sama), dan ledger kini (OpenRouter) tidak ikut.
 */
export function ledgerM2d4(): { kini: EntriLedger[]; arsip: EntriLedger[] } {
  const arsip = existsSync(FOLDER_ARSIP_LEDGER)
    ? readdirSync(FOLDER_ARSIP_LEDGER).filter((x) => /^ledger-sampai-.*\.jsonl$/.test(x)).sort().flatMap((x) => bacaLedgerBerkas(`${FOLDER_ARSIP_LEDGER}/${x}`))
    : [];
  return { kini: bacaLedgerBerkas(existsSync(JALUR_ARSIP_FEATHERLESS) ? JALUR_ARSIP_FEATHERLESS : JALUR_LEDGER), arsip };
}

function utama(): number {
  const { kini, arsip } = ledgerM2d4();
  const l = bangunLaporanGaya(kini, arsip);
  writeFileSync(`${FOLDER_M2D4}/ringkasan.json`, JSON.stringify(l.ringkasan, null, 2) + '\n', 'utf8');
  writeFileSync(`${FOLDER_M2D4}/ledger-ringkas.json`, JSON.stringify(l.ledgerRingkas, null, 2) + '\n', 'utf8');
  writeFileSync(JALUR_LAPORAN, l.md, 'utf8');
  console.log('Ditulis: docs/bukti/lingkar-agen-gaya.md, eval/keluaran-m2d4/ringkasan.json, eval/keluaran-m2d4/ledger-ringkas.json.');
  for (const x of l.konsol) console.log(x);
  return 0;
}

if (/(^|[\\/])gaya-laporan\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
