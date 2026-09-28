/**
 * `npm run peran:laporan` — tulis `docs/bukti/lingkar-agen-peran.md` +
 * `eval/keluaran-m2d3/{ringkasan,ledger-ringkas}.json` dari keluaran mentah
 * (M2d-3 D-8).
 *
 * Tidak ada angka yang ditulis tangan: putaran, sudut, keberatan kritikus,
 * biaya per peran, waktu dihitung dari `riwayat.json` + `jejak-agen.json` +
 * ledger; hasil eksternal dari `penguji/kunci.json` + jawaban mentah subagent;
 * pembanding M2d-1/M2d-2 dari ringkasan terlacaknya. Satu-satunya bagian
 * tulisan tangan: `eval/keluaran-m2d3/laporan-tangan.md`, ditempel apa adanya.
 *
 * Ledger dipotong di akhir milestone (jejak M2d-3 terakhir ditutup) dan hanya
 * entri bertag `m2d3/` yang dijumlah sebagai biaya milestone — sama dengan
 * yang ditegakkan pagu milestone.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tanggalId } from '../format.ts';
import { teksPolos } from '../skema/rujukan.ts';
import { MAKS_PUTARAN_PERAN, type HasilPeran, type PemeriksaanPeran } from './agen-peran.ts';
import { bacaLedger, lolosKartuLuar, lolosTebakLuar } from './agen-laporan.ts';
import { bacaRiwayat as bacaRiwayatM2d2 } from './agen-penguji.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { gAngkaCukup, gKaku } from './gerbang-g.ts';
import type { JejakAgen } from './jejak.ts';
import type { Keberatan } from './kritikus.ts';
import { jsonDari, lolosTebak } from './laporan.ts';
import { MODEL_PERAN } from './model.ts';
import type { EntriLedger } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { FOLDER_PENGUJI_M2D3, bacaRiwayatPeran, omonganLolosPeran, type KunciPengujiM2d3, type OmonganLolosPeran } from './peran-penguji.ts';
import { AWALAN_TAG_M2D3, FOLDER_M2D3, URUTAN_PERAN } from './peran-susun.ts';

const JALUR_LAPORAN = `${AKAR}docs/bukti/lingkar-agen-peran.md`;

function baca<T>(jalur: string): T {
  return JSON.parse(readFileSync(jalur, 'utf8')) as T;
}
function rata(x: number[]): number | null {
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

/** Peran pemilik biaya satu entri ledger M2d-3, dari tagnya (`m2d3/<paket>/p<n>/<jenis>/…`). */
export function peranDariTag(tag: string): 'penulis' | 'pembaca-kartu' | 'penebak' | 'kritikus' | 'lain' {
  const jenis = tag.split('/')[3] ?? '';
  if (jenis === 'susun' || jenis === 'tulis-ulang') return 'penulis';
  if (jenis === 'gerbang-kartu') return 'pembaca-kartu';
  if (jenis === 'gerbang-tebak') return 'penebak';
  if (jenis === 'kritikus') return 'kritikus';
  return 'lain';
}

export interface BiayaPeran {
  penulis: number;
  'pembaca-kartu': number;
  penebak: number;
  kritikus: number;
  lain: number;
  panggilan: Record<string, number>;
}

export function biayaPerPeran(entri: readonly EntriLedger[]): BiayaPeran {
  const b: BiayaPeran = { penulis: 0, 'pembaca-kartu': 0, penebak: 0, kritikus: 0, lain: 0, panggilan: {} };
  for (const e of entri) {
    const p = peranDariTag(e.tag);
    b[p] += e.biaya_usd;
    b.panggilan[p] = (b.panggilan[p] ?? 0) + 1;
  }
  return b;
}

interface JawabanTebak { id: string; pilihan: string; yakin: number }
interface JawabanKartu { id: string; pilihan: string; kartu: number[]; bingung: string }
interface JawabanAlami { kelompok: number; label: string; skor: number; alasan: string }

function bacaJawaban<T>(awalan: string, medan: string): Array<{ penguji: string; isi: T[] }> {
  const folder = `${FOLDER_PENGUJI_M2D3}/jawaban`;
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

/** Rincian penolakan pemeriksa per versi: kode validator, G-angka-cukup, G-kaku, SUDUT, tak ada. */
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

export function bangunLaporanPeran(ledgerSemua: readonly EntriLedger[]): Laporan {
  const sim: Sim[] = [];
  for (const paket of URUTAN_PERAN) {
    const h = bacaRiwayatPeran(paket);
    if (h === null) continue;
    sim.push({ paket, h, p: baca<PaketFakta>(`${FOLDER_M2D3}/${paket}/paket.json`), j: baca<JejakAgen>(`${FOLDER_M2D3}/${paket}/jejak-agen.json`) });
  }
  const potong = sim.map((s) => s.j.selesai ?? s.j.mulai).sort().at(-1) ?? '';
  const ledger = ledgerSemua.filter((e) => e.waktu <= potong);
  const ledgerM = ledger.filter((e) => e.tag.startsWith(AWALAN_TAG_M2D3));
  const totalM = ledgerM.reduce((a, e) => a + e.biaya_usd, 0);
  const totalLedger = ledger.reduce((a, e) => a + e.biaya_usd, 0);
  const peranM = biayaPerPeran(ledgerM);

  // --- per simulasi
  const perSim = sim.map((s) => {
    // Hanya entri dalam jendela jalan yang jejaknya dilaporkan; jalan yang dibuang
    // (eval/keluaran-m2d3/dibuang/) tetap dihitung di total milestone.
    const entri = ledgerM.filter(
      (e) => e.tag.startsWith(`${AWALAN_TAG_M2D3}${s.paket}/`) && e.waktu >= s.j.mulai && (s.j.selesai === null || e.waktu <= s.j.selesai),
    );
    const versi = s.h.riwayat.flatMap((r) => r.omongan.filter((o) => o.status !== 'terkunci-sebelumnya'));
    const hitung: Record<string, number> = {};
    for (const o of versi) hitung[o.status] = (hitung[o.status] ?? 0) + 1;
    const kodeP: Record<string, number> = {};
    for (const o of versi.filter((x) => x.status === 'ditolak-pemeriksa' || x.status === 'tidak-ada')) {
      for (const k of kodePemeriksa(o)) kodeP[k] = (kodeP[k] ?? 0) + 1;
    }
    const keberatan: Array<Keberatan & { putaran: number; no: number }> = [];
    for (const r of s.h.riwayat) {
      for (const o of r.omongan) for (const k of o.kritik?.keberatan ?? []) keberatan.push({ ...k, putaran: r.putaran, no: o.no });
    }
    const jenisKeberatan: Record<string, number> = {};
    for (const k of keberatan) jenisKeberatan[k.jenis] = (jenisKeberatan[k.jenis] ?? 0) + 1;
    const langkahKritik = s.j.langkah.filter((l) => l.jenis === 'kritikus');
    const kritikTerpotong = langkahKritik.filter((l) => l.rincian['terpotong'] === true).length;
    const panggilanPenulis = s.h.riwayat.flatMap((r) => r.panggilan);
    return {
      paket: s.paket,
      tanggal_t: s.p.tanggal_t,
      terbit: s.h.lolos,
      putaran: s.h.jumlah_putaran,
      berhenti: s.h.berhenti,
      sudut: s.h.sudut.map((ss, i) => ({ no: i + 1, riwayat: ss.map((c) => ({ ke: c.ke, fact_id: c.fact_id, hasil: c.hasil, putaran: `${String(c.putaran_mulai)}–${String(c.putaran_akhir ?? '')}` })) })),
      versi: versi.length,
      status: hitung,
      kode_pemeriksa: kodeP,
      keberatan_kritikus: keberatan,
      jenis_keberatan: jenisKeberatan,
      kritikus_dipanggil: langkahKritik.length,
      kritikus_terpotong: kritikTerpotong,
      penulis_terpotong: panggilanPenulis.filter((p) => p.finish_reason === 'length').length,
      penulis_cadangan: panggilanPenulis.filter((p) => !p.mode_berpikir).length,
      panggilan_ledger: entri.length,
      biaya_ledger: entri.reduce((a, e) => a + e.biaya_usd, 0),
      biaya_peran: biayaPerPeran(entri),
      biaya_jejak: s.j.hasil?.biaya_usd ?? 0,
      durasi_ms: s.j.hasil?.durasi_ms ?? 0,
    };
  });

  // --- retro: gerbang G atas SEMUA versi omongan M2d-2 (berapa yang akan ditolak pemeriksa baru)
  const retro = ['tirt', 'dada', 'ultj'].map((paket) => {
    const h = bacaRiwayatM2d2(paket);
    const versi: Array<{ o: OmonganDraf; status: string }> = [];
    for (const r of h?.riwayat ?? []) {
      for (const x of r.omongan) {
        const o = r.draf[x.no - 1];
        if (x.status === 'terkunci-sebelumnya' || o === null || o === undefined || typeof o.pesan !== 'string' || typeof o.pilihan !== 'object') continue;
        versi.push({ o, status: x.status });
      }
    }
    return {
      paket,
      versi: versi.length,
      angka_cukup: versi.filter((v) => gAngkaCukup(v.o).tolak).length,
      kaku: versi.filter((v) => gKaku(v.o.pesan).tolak).length,
      lolos_m2d2_ditolak_g: versi.filter((v) => v.status === 'lolos' && (gAngkaCukup(v.o).tolak || gKaku(v.o.pesan).tolak)).length,
      lolos_m2d2: versi.filter((v) => v.status === 'lolos').length,
    };
  });

  // --- eksternal
  const kunciPath = `${FOLDER_PENGUJI_M2D3}/kunci.json`;
  const kunci = existsSync(kunciPath) ? baca<KunciPengujiM2d3>(kunciPath) : null;
  const tebakMentah = bacaJawaban<JawabanTebak>('tebak-', 'jawaban');
  const kartuMentah = bacaJawaban<JawabanKartu>('kartu-', 'jawaban');
  const alamiMentah = bacaJawaban<JawabanAlami>('alami-', 'nilai');
  const luar: HasilLuar[] = [];
  if (kunci !== null) {
    for (const s of sim) {
      for (const o of omonganLolosPeran(s.paket, s.h)) {
        const bt = kunci.tebak.find((x) => x.paket === s.paket && x.no === o.no);
        const bk = kunci.kartu.find((x) => x.paket === s.paket && x.no === o.no);
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
          paket: s.paket,
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

  // --- pembanding generasi sebelumnya (dari ringkasan terlacak)
  const m2d2 = baca<{
    per_simulasi: Array<{ paket: string; lolos: boolean }>;
    luar: Array<{ tebak_luar: { lolos: boolean; benar: number } }>;
    alami_rata: Record<string, { rata: number | null; n: number }>;
  }>(`${AKAR}eval/keluaran-m2d2/ringkasan.json`);
  const m2d1 = baca<{
    per_model: Array<{ model: string; tebak_lolos: number; tebak_total: number; tebak_benar_rata: number; alami_rata: number; alami_n: number }>;
    manusia_alami_rata: number;
  }>(`${AKAR}eval/keluaran-m2d/ringkasan.json`);
  const m2d1ds = m2d1.per_model.find((m) => m.model === MODEL_PERAN.penulis) ?? null;

  const ringkasan = {
    model_peran: MODEL_PERAN,
    maks_putaran: MAKS_PUTARAN_PERAN,
    per_simulasi: perSim,
    retro_g_m2d2: retro,
    luar: luar.map((x) => ({ paket: x.paket, no: x.no, kunci: x.kunci, tebak_dalam: x.dalam.tebak_dalam, tebak_luar: x.tebak, kartu_luar: x.kartu })),
    setuju: {
      tebak_lolos_dalam_lolos_luar: luar.filter((x) => x.tebak.lolos).length,
      tebak_lolos_dalam_gagal_luar: luar.filter((x) => !x.tebak.lolos).length,
      kartu_lolos_luar: luar.filter((x) => x.kartu.lolos).length,
    },
    alami,
    alami_rata: {
      agen_m2d3: alamiRata('agen-m2d3'),
      agen_m2d2: alamiRata('agen-m2d2'),
      m2d1_deepseek: alamiRata('m2d1-deepseek'),
      manusia: alamiRata('manusia'),
    },
    pembanding: {
      m2d1: { tebak_luar_deepseek: m2d1ds === null ? null : `${String(m2d1ds.tebak_lolos)}/${String(m2d1ds.tebak_total)}`, tebak_benar_rata: m2d1ds?.tebak_benar_rata ?? null, alami: m2d1ds?.alami_rata ?? null, manusia: m2d1.manusia_alami_rata },
      m2d2: {
        lolos_penuh: `${String(m2d2.per_simulasi.filter((s) => s.lolos).length)}/${String(m2d2.per_simulasi.length)}`,
        tebak_luar: `${String(m2d2.luar.filter((x) => x.tebak_luar.lolos).length)}/${String(m2d2.luar.length)}`,
        tebak_benar_rata: rata(m2d2.luar.map((x) => x.tebak_luar.benar)),
        alami_agen: m2d2.alami_rata['agen_m2d2']?.rata ?? null,
        alami_manusia: m2d2.alami_rata['manusia']?.rata ?? null,
      },
    },
    biaya: { milestone_ledger_usd: totalM, per_peran: peranM, ledger_kumulatif_usd: totalLedger, panggilan: ledgerM.length, dipotong: potong },
  };
  const ledgerRingkas = ledgerM.map((e) => ({
    waktu: e.waktu, tag: e.tag, model: e.model, status: e.status, token_masuk: e.token_masuk, token_keluar: e.token_keluar,
    biaya_usd: e.biaya_usd, dasar_biaya: e.dasar_biaya, latensi_ms: e.latensi_ms,
  }));
  const tangan = existsSync(`${FOLDER_M2D3}/laporan-tangan.md`) ? readFileSync(`${FOLDER_M2D3}/laporan-tangan.md`, 'utf8') : '';
  const md = tulis(sim, perSim, retro, luar, alami, ringkasan, tangan);
  const konsol = [
    `Biaya milestone (ledger ${AWALAN_TAG_M2D3}*, dipotong ${potong}): ${usd(totalM)} dalam ${String(ledgerM.length)} panggilan — ` +
      `penulis ${usd(peranM.penulis)}, pembaca kartu ${usd(peranM['pembaca-kartu'])}, penebak ${usd(peranM.penebak)}, kritikus ${usd(peranM.kritikus)}; ledger kumulatif ${usd(totalLedger)}.`,
    ...perSim.map((s) => `  ${s.paket}: ${s.terbit ? 'TERBIT' : 'TIDAK TERBIT'} di putaran ${String(s.putaran)}, ${String(s.panggilan_ledger)} panggilan, ${usd(s.biaya_ledger)}; keberatan kritikus ${JSON.stringify(s.jenis_keberatan)}`),
    `  tebak buta luar: ${String(ringkasan.setuju.tebak_lolos_dalam_lolos_luar)}/${String(luar.length)} lolos; kartu luar K-05: ${String(ringkasan.setuju.kartu_lolos_luar)}/${String(luar.length)}`,
    `  kealamian: M2d-3 ${f(ringkasan.alami_rata.agen_m2d3.rata)} (n=${String(ringkasan.alami_rata.agen_m2d3.n)}), M2d-2 ${f(ringkasan.alami_rata.agen_m2d2.rata)}, M2d-1 ${f(ringkasan.alami_rata.m2d1_deepseek.rata)}, manusia ${f(ringkasan.alami_rata.manusia.rata)}`,
  ];
  return { md, ringkasan, ledgerRingkas, konsol };
}

function tulisDraf(o: { nama: string; jam: string; pesan: string; pilihan: Record<string, string>; kunci: string }): string[] {
  return [
    `> **${o.nama} (${o.jam}):** ${teksPolos(o.pesan)}`,
    '',
    ...(['a', 'b', 'c', 'd'] as const).map((k) => `- ${k === o.kunci ? '**' : ''}${k}) ${teksPolos(o.pilihan[k] ?? '')}${k === o.kunci ? '** (kunci)' : ''}`),
    '',
  ];
}

interface PerSim {
  paket: string; tanggal_t: string; terbit: boolean; putaran: number; berhenti: string | null;
  sudut: Array<{ no: number; riwayat: Array<{ ke: number; fact_id: string; hasil: string; putaran: string }> }>;
  versi: number; status: Record<string, number>; kode_pemeriksa: Record<string, number>;
  keberatan_kritikus: Array<Keberatan & { putaran: number; no: number }>; jenis_keberatan: Record<string, number>;
  kritikus_dipanggil: number; kritikus_terpotong: number; penulis_terpotong: number; penulis_cadangan: number;
  panggilan_ledger: number; biaya_ledger: number; biaya_peran: BiayaPeran; biaya_jejak: number; durasi_ms: number;
}

function tulis(
  sim: Sim[],
  perSim: PerSim[],
  retro: Array<{ paket: string; versi: number; angka_cukup: number; kaku: number; lolos_m2d2_ditolak_g: number; lolos_m2d2: number }>,
  luar: HasilLuar[],
  alami: Array<{ penilai: string; paket: string; sumber: string; skor: number; alasan: string }>,
  r: {
    alami_rata: Record<string, { rata: number | null; n: number }>;
    pembanding: {
      m2d1: { tebak_luar_deepseek: string | null; tebak_benar_rata: number | null; alami: number | null; manusia: number };
      m2d2: { lolos_penuh: string; tebak_luar: string; tebak_benar_rata: number | null; alami_agen: number | null; alami_manusia: number | null };
    };
    biaya: { milestone_ledger_usd: number; per_peran: BiayaPeran; ledger_kumulatif_usd: number; panggilan: number; dipotong: string };
    setuju: Record<string, number>;
  },
  tangan: string,
): string {
  const b: string[] = [];
  b.push('# Bukti: lingkar agen berperan — penulis ≠ penilai (M2d-3)', '');
  b.push(
    'Berkas ini ditulis oleh `npm run peran:laporan` dari keluaran mentah di `eval/keluaran-m2d3/` (riwayat tiap putaran, jejak langkah, ledger biaya, bahan dan jawaban mentah penguji eksternal). Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d3/laporan-tangan.md`). Draf **tidak** dipasang ke produk.',
    '',
  );
  b.push('## Perannya', '');
  b.push('Tidak ada satu peran "maha kuasa" (keputusan pemilik, 28 Sep). Rinciannya `factory/llm/peran.md`; orkestrasinya `factory/llm/agen-peran.ts`.', '');
  b.push('| peran | pelaksana | melihat | wewenang |', '|---|---|---|---|');
  b.push('| perencana | kode | paket fakta (gudang + aturan R) | daftar sudut (fakta penentu) + nada per posisi |');
  b.push(`| penulis | \`${MODEL_PERAN.penulis}\` | paket + sudut + 2–3 contoh bank gaya + umpan balik | menulis/merevisi satu omongan per panggilan |`);
  b.push('| pemeriksa | kode | semua | validator + G-angka-cukup + G-kaku + sudut |');
  b.push(`| penebak ×3 | \`${MODEL_PERAN.penebak}\` | hanya pesan + pertanyaan + pilihan | tolak bila tertebak (K-05) |`);
  b.push(`| pembaca kartu | \`${MODEL_PERAN['pembaca-kartu']}\` | pesan + kartu + pilihan, tanpa kunci | tolak bila salah |`);
  b.push(`| kritikus | \`${MODEL_PERAN.kritikus}\` | semua, termasuk kunci & kartu | hanya keberatan + arahan; tidak menulis ulang; tidak bisa meloloskan |`);
  b.push('');
  b.push(`Omongan dikunci hanya bila keempat penilai tidak keberatan. Posisi yang gagal 5 putaran di satu sudut dibuang dan mendapat sudut (fakta penentu) lain; paling banyak 3 sudut, ${String(MAKS_PUTARAN_PERAN)} putaran per simulasi. Bila tetap gagal: **tidak terbit**.`, '');

  b.push('## Hasil per simulasi', '');
  b.push('| paket | T | hasil | putaran | versi diperiksa | panggilan (ledger) | biaya (ledger) | DeepSeek (penulis / kartu / penebak) | GLM (kritikus) | waktu |');
  b.push('|---|---|---|---:|---:|---:|---:|---|---:|---:|');
  for (const s of perSim) {
    const bp = s.biaya_peran;
    b.push(
      `| ${s.paket.toUpperCase()} | ${tanggalId(s.tanggal_t)} | ${s.terbit ? '**terbit (lolos penuh)**' : `tidak terbit (${sel(s.berhenti ?? '')})`} | ${String(s.putaran)} | ${String(s.versi)} | ${String(s.panggilan_ledger)} | ${usd(s.biaya_ledger)} | ${usd(bp.penulis)} / ${usd(bp['pembaca-kartu'])} / ${usd(bp.penebak)} | ${usd(bp.kritikus)} (${String(bp.panggilan['kritikus'] ?? 0)} panggilan) | ${f(s.durasi_ms / 60000, 1)} menit |`,
    );
  }
  b.push('');
  const bp = r.biaya.per_peran;
  b.push(
    `**Biaya milestone menurut ledger** (semua entri bertag \`${AWALAN_TAG_M2D3}\`, dipotong ${r.biaya.dipotong}): **${usd(r.biaya.milestone_ledger_usd)}** dalam ${String(r.biaya.panggilan)} panggilan — penulis ${usd(bp.penulis)} (${String(bp.panggilan['penulis'] ?? 0)}), pembaca kartu ${usd(bp['pembaca-kartu'])} (${String(bp.panggilan['pembaca-kartu'] ?? 0)}), penebak ${usd(bp.penebak)} (${String(bp.panggilan['penebak'] ?? 0)}), kritikus GLM ${usd(bp.kritikus)} (${String(bp.panggilan['kritikus'] ?? 0)}). Pagu milestone US$2,00 (ditegakkan kode). Ledger kumulatif sejak M2d-1: ${usd(r.biaya.ledger_kumulatif_usd)} dari pagu US$5,00.`,
    '',
  );

  b.push('### Sudut per posisi', '');
  b.push('| paket | omongan | sudut (fakta penentu) → hasil, putaran |', '|---|---:|---|');
  for (const s of perSim) {
    for (const x of s.sudut) {
      b.push(`| ${s.paket.toUpperCase()} | ${String(x.no)} | ${x.riwayat.map((c) => `${String(c.ke)}. \`${c.fact_id}\` → ${c.hasil} (${c.putaran})`).join('; ')} |`);
    }
  }
  b.push('');

  b.push('### Keputusan per versi omongan', '');
  b.push('Setiap versi yang ditulis penulis (atau dibawa ulang), dan penilai pertama yang keberatan.', '');
  const kolom = ['tidak-ada', 'ditolak-pemeriksa', 'ditolak-kartu', 'ditolak-tebak', 'ditolak-kritikus', 'kritikus-tidak-menjawab', 'galat-gerbang', 'lolos'];
  b.push(`| paket | versi | ${kolom.join(' | ')} | rincian pemeriksa | penulis terpotong / cadangan |`);
  b.push(`|---|---:|${kolom.map(() => '---:').join('|')}|---|---|`);
  for (const s of perSim) {
    b.push(
      `| ${s.paket.toUpperCase()} | ${String(s.versi)} | ${kolom.map((k) => String(s.status[k] ?? 0)).join(' | ')} | ${Object.entries(s.kode_pemeriksa).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${String(n)}`).join(', ') || '—'} | ${String(s.penulis_terpotong)} / ${String(s.penulis_cadangan)} |`,
    );
  }
  b.push('');

  b.push('### Keberatan kritikus', '');
  for (const s of perSim) {
    const urut = Object.entries(s.jenis_keberatan).sort((x, y) => y[1] - x[1]);
    b.push(
      `**${s.paket.toUpperCase()}** — kritikus menilai ${String(s.kritikus_dipanggil)} versi (${String(s.biaya_peran.panggilan['kritikus'] ?? 0)} panggilan; ada panggilan terpotong di ${String(s.kritikus_terpotong)} versi); keberatan per jenis: ${urut.map(([k, n]) => `${k} ${String(n)}`).join(', ') || 'tidak ada'}.`,
      '',
    );
    for (const k of s.keberatan_kritikus) b.push(`- putaran ${String(k.putaran)}, omongan ${String(k.no)} · ${k.jenis} (${sel(k.bagian)}): ${sel(k.alasan)}`);
    if (s.keberatan_kritikus.length > 0) b.push('');
  }

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
        if (o.tebak !== null) bagian.push(`tanpa kartu ${o.tebak.tebakan.map((t) => `${t.pilihan}/${String(t.yakin)}${t.terbaca ? '' : ' (tak terbaca)'}`).join(', ')}`);
        if (o.kritik !== null) bagian.push(`kritikus: ${o.kritik.menjawab ? `${String(o.kritik.keberatan.length)} keberatan` : 'tidak menjawab'}`);
        b.push(`- ${bagian.join(' · ')}`);
        const pesan = rr.draf[o.no - 1];
        if (pesan !== null && pesan !== undefined && typeof pesan.pesan === 'string') b.push(`  - pesan: "${sel(teksPolos(pesan.pesan))}" (kunci ${String(pesan.kunci)})`);
        if (o.status !== 'lolos') for (const u of o.umpan.slice(0, 3)) b.push(`  - ${sel(u).slice(0, 320)}`);
      }
      for (const d of rr.dibuang) b.push(`- **sudut dibuang**: omongan ${String(d.no)} \`${d.fact_id}\` → ${d.pengganti === null ? 'tidak ada pengganti' : `\`${d.pengganti}\``}`);
      b.push('');
    }
  }

  const tirt = sim.find((s) => s.paket === 'tirt');
  b.push('## Draf akhir TIRT', '');
  if (tirt !== undefined) {
    const terakhir = tirt.h.riwayat[tirt.h.riwayat.length - 1];
    const terkunci = new Set(omonganLolosPeran('tirt', tirt.h).map((l) => l.no));
    b.push(
      tirt.h.lolos
        ? '**Terbit** — ketiga omongan lolos keempat penilai. Draf utuh, apa adanya:'
        : `**Tidak terbit** (${sel(tirt.h.berhenti ?? '')}). Di bawah: omongan yang dikunci dan versi terakhir yang tidak lolos, apa adanya.`,
      '',
    );
    const draf = tirt.h.lolos && tirt.h.draf !== null ? tirt.h.draf.omongan : (terakhir?.draf ?? []);
    draf.forEach((o, i) => {
      if (o === null || o === undefined) return;
      b.push(`**Omongan ${String(i + 1)} — ${terkunci.has(i + 1) ? 'DIKUNCI' : 'versi terakhir, DITOLAK'}**`, '');
      b.push(...tulisDraf(o));
    });
    b.push('```json', JSON.stringify({ omongan: draf }, null, 2), '```', '');
  }
  for (const s of sim.filter((x) => x.paket !== 'tirt')) {
    const k = omonganLolosPeran(s.paket, s.h);
    b.push(`### ${s.paket.toUpperCase()}: omongan yang dikunci`, '');
    if (k.length === 0) b.push('Tidak ada.', '');
    for (const l of k) {
      b.push(`**Omongan ${String(l.no)}** (dikunci di putaran ${String(l.putaran)}, sudut \`${l.sudut}\`)`, '');
      b.push(...tulisDraf(l.omongan));
    }
  }

  const dibuang = `${FOLDER_M2D3}/dibuang`;
  if (existsSync(dibuang)) {
    b.push('## Jalan yang dibuang', '');
    b.push('Rekamannya utuh di `eval/keluaran-m2d3/dibuang/`; biayanya ikut di total milestone. Sebabnya di catatan penulis.', '');
    b.push('| jalan | langkah tercatat | panggilan (jejak) | biaya (jejak) | hasil |', '|---|---:|---:|---:|---|');
    for (const d of readdirSync(dibuang).sort()) {
      const jalur = `${dibuang}/${d}/jejak-agen.json`;
      if (!existsSync(jalur)) continue;
      const j = baca<JejakAgen>(jalur);
      b.push(
        `| ${d} | ${String(j.langkah.length)} | ${String(j.langkah.reduce((a, l) => a + l.panggilan, 0))} | ${usd(j.langkah.reduce((a, l) => a + l.biaya_usd, 0))} | ${j.hasil === null ? 'dihentikan eksekutor (jejak tidak ditutup)' : sel(j.hasil.berhenti ?? '')} |`,
      );
    }
    b.push('');
  }

  b.push('## Gerbang G atas versi M2d-2 (retro)', '');
  b.push('Berapa versi omongan M2d-2 (semua putaran jalan akhir) yang akan ditolak pemeriksa baru — tanpa panggilan model.', '');
  b.push('| paket | versi M2d-2 | ditolak G-angka-cukup | ditolak G-kaku | dari yang dikunci M2d-2, ditolak G |', '|---|---:|---:|---:|---|');
  for (const x of retro) b.push(`| ${x.paket.toUpperCase()} | ${String(x.versi)} | ${String(x.angka_cukup)} | ${String(x.kaku)} | ${String(x.lolos_m2d2_ditolak_g)}/${String(x.lolos_m2d2)} |`);
  b.push('');

  b.push('## Pembanding eksternal', '');
  b.push(
    'Penguji dan penilai: subagent Claude (opus) **baru**, tanpa konteks eksekutor, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d3/penguji/`); label acak. Jawaban mentah: `penguji/jawaban/`. Petunjuk sama persis dengan M2d-1/M2d-2.',
    '',
  );
  b.push('### Tebak buta (tanpa kartu) — gerbang-dalam vs penguji-luar', '');
  b.push('| paket | omongan | kunci | di dalam (DeepSeek, petunjuk berhitung) | di luar (3 subagent) | benar luar | yakin benar | lolos luar |');
  b.push('|---|---:|---|---|---|---:|---:|---|');
  for (const x of luar) {
    b.push(
      `| ${x.paket.toUpperCase()} | ${String(x.no)} | ${x.kunci} | ${x.dalam.tebak_dalam.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(', ')} | ${x.tebak.jawaban.map((j) => `${j.pilihan}/${String(j.yakin)}`).join(', ')} | ${String(x.tebak.benar)}/${String(x.tebak.jawaban.length)} | ${f(x.tebak.yakinBenar, 0)} | ${x.tebak.lolos ? 'ya' : '**tidak**'} |`,
    );
  }
  if (luar.length === 0) b.push('| — | — | — | — | — | — | — | — |');
  b.push('');
  b.push(
    `**Kesepakatan:** dari ${String(luar.length)} omongan yang lolos di dalam, **${String(r.setuju['tebak_lolos_dalam_lolos_luar'] ?? 0)} juga lolos** tebak buta luar dan **${String(r.setuju['tebak_lolos_dalam_gagal_luar'] ?? 0)} gagal** di luar; rata-rata penguji luar yang menebak benar ${f(rata(luar.map((x) => x.tebak.benar)))} dari 3.`,
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
  b.push(`K-05 penuh (3/3 benar dan menunjuk penentu): ${String(r.setuju['kartu_lolos_luar'] ?? 0)}/${String(luar.length)}.`, '');
  b.push('### Kealamian bahasa (buta, penilai yang sama untuk semua generasi)', '');
  b.push('| sumber | rata-rata | n |', '|---|---:|---:|');
  for (const [nama, k] of [['agen M2d-3 (berperan)', 'agen_m2d3'], ['agen M2d-2', 'agen_m2d2'], ['DeepSeek M2d-1 (tanpa lingkar)', 'm2d1_deepseek'], ['manusia (hidup)', 'manusia']] as const) {
    const a = r.alami_rata[k];
    b.push(`| ${nama} | ${f(a?.rata ?? null)} | ${String(a?.n ?? 0)} |`);
  }
  b.push('');
  b.push('| paket | sumber | penilai | skor | alasan |', '|---|---|---|---:|---|');
  for (const a of [...alami].sort((x, y) => x.paket.localeCompare(y.paket) || x.sumber.localeCompare(y.sumber) || x.penilai.localeCompare(y.penilai))) {
    b.push(`| ${a.paket.toUpperCase()} | ${a.sumber} | ${a.penilai} | ${String(a.skor)} | ${sel(a.alasan)} |`);
  }
  b.push('');

  b.push('## M2d-1 → M2d-2 → M2d-3', '');
  const p1 = r.pembanding.m2d1;
  const p2 = r.pembanding.m2d2;
  const lolosPenuh = `${String(perSim.filter((s) => s.terbit).length)}/${String(perSim.length)}`;
  b.push('| ukuran | M2d-1 (tanpa lingkar) | M2d-2 (lingkar, satu model menilai) | M2d-3 (berperan) |', '|---|---|---|---|');
  b.push(`| simulasi lolos penuh | — (tanpa gerbang) | ${p2.lolos_penuh} | ${lolosPenuh} |`);
  b.push(
    `| tebak buta luar K-05 (omongan lolos / diuji) | ${p1.tebak_luar_deepseek ?? '—'} (DeepSeek, semua draf), rata-rata ${f(p1.tebak_benar_rata)} benar | ${p2.tebak_luar} (omongan terkunci), rata-rata ${f(p2.tebak_benar_rata)} benar | ${String(r.setuju['tebak_lolos_dalam_lolos_luar'] ?? 0)}/${String(luar.length)}, rata-rata ${f(rata(luar.map((x) => x.tebak.benar)))} benar |`,
  );
  b.push(`| kealamian, penilai masing-masing milestone | ${f(p1.alami)} (manusia ${f(p1.manusia)}) | ${f(p2.alami_agen)} (manusia ${f(p2.alami_manusia)}) | ${f(r.alami_rata['agen_m2d3']?.rata ?? null)} (manusia ${f(r.alami_rata['manusia']?.rata ?? null)}) |`);
  b.push(`| kealamian, penilai M2d-3 yang SAMA | ${f(r.alami_rata['m2d1_deepseek']?.rata ?? null)} | ${f(r.alami_rata['agen_m2d2']?.rata ?? null)} | ${f(r.alami_rata['agen_m2d3']?.rata ?? null)} |`);
  b.push('');
  if (tangan.trim() !== '') b.push('## Catatan penulis', '', tangan.trim(), '');
  return b.join('\n');
}

function utama(): number {
  const l = bangunLaporanPeran(bacaLedger());
  writeFileSync(`${FOLDER_M2D3}/ringkasan.json`, JSON.stringify(l.ringkasan, null, 2) + '\n', 'utf8');
  writeFileSync(`${FOLDER_M2D3}/ledger-ringkas.json`, JSON.stringify(l.ledgerRingkas, null, 2) + '\n', 'utf8');
  writeFileSync(JALUR_LAPORAN, l.md, 'utf8');
  console.log('Ditulis: docs/bukti/lingkar-agen-peran.md, eval/keluaran-m2d3/ringkasan.json, eval/keluaran-m2d3/ledger-ringkas.json.');
  for (const x of l.konsol) console.log(x);
  return 0;
}

if (/(^|[\\/])peran-laporan\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
