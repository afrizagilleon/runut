/**
 * `npm run agen:laporan` — tulis `docs/bukti/lingkar-agen.md` +
 * `eval/keluaran-m2d2/ringkasan.json` + `eval/keluaran-m2d2/ledger-ringkas.json`
 * dari keluaran mentah (M2d-2 D-7).
 *
 * Tidak ada angka yang ditulis tangan: putaran, alasan tolak, biaya, waktu
 * dihitung dari `riwayat.json` + `jejak-agen.json`; hasil eksternal dari
 * `penguji/kunci.json` + jawaban mentah subagent; pembanding M2d-1 dari
 * `eval/keluaran-m2d/ringkasan.json`; total biaya dari ledger. Satu-satunya
 * bagian tulisan tangan: `eval/keluaran-m2d2/laporan-tangan.md`, ditempel
 * apa adanya di akhir.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tanggalId } from '../format.ts';
import { teksPolos } from '../skema/rujukan.ts';
import { MAKS_PUTARAN, SETELAN_PENYUSUN, type HasilAgen } from './agen.ts';
import { FOLDER_PENGUJI_M2D2, bacaRiwayat, omonganLolos, type KunciPengujiM2d2, type OmonganLolos } from './agen-penguji.ts';
import { FOLDER_M2D2, URUTAN_AGEN } from './agen-susun.ts';
import { AKAR } from './env.ts';
import { JUMLAH_PENEBAK, SUHU_TEBAK } from './gerbang-tebak.ts';
import { SUHU_KARTU } from './gerbang-kartu.ts';
import type { JejakAgen } from './jejak.ts';
import { jsonDari, lolosTebak } from './laporan.ts';
import { MODEL_AGEN } from './model.ts';
import { bacaLedgerSemua, type EntriLedger } from './pagu.ts';
import type { PaketFakta } from './paket.ts';

const JALUR_LAPORAN = `${AKAR}docs/bukti/lingkar-agen.md`;

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
function ribuan(n: number): string {
  return n.toLocaleString('id-ID');
}
function detik(ms: number): string {
  return `${f(ms / 1000, 0)} s`;
}

/* ---------------------------------------------------------------------- */
/* jawaban eksternal                                                       */
/* ---------------------------------------------------------------------- */

interface JawabanTebak { id: string; pilihan: string; yakin: number }
interface JawabanKartu { id: string; pilihan: string; kartu: number[]; bingung: string }
interface JawabanAlami { kelompok: number; label: string; skor: number; alasan: string }

function berkasJawaban(awalan: string): string[] {
  const folder = `${FOLDER_PENGUJI_M2D2}/jawaban`;
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((b) => b.startsWith(awalan) && b.endsWith('.txt'))
    .sort()
    .map((b) => `${folder}/${b}`);
}

function bacaJawaban<T>(awalan: string, medan: string): Array<{ penguji: string; isi: T[] }> {
  return berkasJawaban(awalan).map((jalur) => {
    const n = jsonDari(readFileSync(jalur, 'utf8')) as Record<string, T[]>;
    return { penguji: jalur.split('/').pop()?.replace('.txt', '') ?? jalur, isi: n[medan] ?? [] };
  });
}

/** K-05 tebak buta, penguji luar: tepat 3 jawaban dan kriteria yang sama dengan gerbang (lolosTebak). */
export function lolosTebakLuar(jawaban: ReadonlyArray<{ pilihan: string; yakin: number }>, kunci: string): boolean {
  return jawaban.length === 3 && lolosTebak([...jawaban], kunci).lolos;
}

/** K-05 jawab dengan kartu: 3 dari 3 benar DAN masing-masing menunjuk kartu penentu. */
export function lolosKartuLuar(
  jawaban: ReadonlyArray<{ pilihan: string; kartu: number[] }>,
  kunci: string,
  penentu: readonly number[],
): boolean {
  return jawaban.length === 3 && jawaban.every((j) => j.pilihan === kunci && j.kartu.some((k) => penentu.includes(k)));
}

export interface HasilLuar {
  paket: string;
  no: number;
  kunci: string;
  putaran: number;
  dalam: OmonganLolos;
  tebak: { jawaban: Array<{ pilihan: string; yakin: number }>; benar: number; yakinBenar: number | null; lolos: boolean };
  kartu: { jawaban: Array<{ pilihan: string; kartu: number[]; bingung: string }>; benar: number; menunjuk: number; lolos: boolean; penentu: number[] };
}

/* ---------------------------------------------------------------------- */
/* utama                                                                   */
/* ---------------------------------------------------------------------- */

interface Sim {
  paket: string;
  p: PaketFakta;
  h: HasilAgen;
  j: JejakAgen;
}

/** Seluruh riwayat biaya: ledger yang diarsipkan (M2d-4) + ledger kini. */
export function bacaLedger(): EntriLedger[] {
  return bacaLedgerSemua();
}

export interface Laporan {
  md: string;
  ringkasan: unknown;
  ledgerRingkas: unknown;
  /** Baris ringkas untuk konsol. */
  konsol: string[];
}

/**
 * Bangun laporan dari keluaran mentah dan ledger. Murni: tidak menulis apa pun.
 *
 * Ledger dipotong di akhir milestone ini (entri yang tercatat paling lambat
 * saat jejak terakhir ditutup), supaya laporan bisa dibangun ulang identik
 * walau ledger kumulatif terus bertambah — pelajaran dari M2d-1, yang laporannya
 * menjumlah seluruh ledger dan berubah begitu M2d-2 memanggil model.
 */
export function bangunLaporan(ledgerSemua: readonly EntriLedger[]): Laporan {
  const sim: Sim[] = [];
  for (const paket of URUTAN_AGEN) {
    const h = bacaRiwayat(paket);
    if (h === null) continue;
    sim.push({
      paket,
      h,
      p: baca<PaketFakta>(`${FOLDER_M2D2}/${paket}/paket.json`),
      j: baca<JejakAgen>(`${FOLDER_M2D2}/${paket}/jejak-agen.json`),
    });
  }
  const potong = sim.map((s) => s.j.selesai ?? s.j.mulai).sort().at(-1) ?? '';
  const ledger = ledgerSemua.filter((e) => e.waktu <= potong);
  const ledgerAgen = ledger.filter((e) => e.tag.startsWith('agen/'));
  const totalAgen = ledgerAgen.reduce((a, e) => a + e.biaya_usd, 0);
  const totalLedger = ledger.reduce((a, e) => a + e.biaya_usd, 0);

  // --- eksternal
  const kunciPath = `${FOLDER_PENGUJI_M2D2}/kunci.json`;
  const kunci = existsSync(kunciPath) ? baca<KunciPengujiM2d2>(kunciPath) : null;
  const tebakMentah = bacaJawaban<JawabanTebak>('tebak-', 'jawaban');
  const kartuMentah = bacaJawaban<JawabanKartu>('kartu-', 'jawaban');
  const alamiMentah = bacaJawaban<JawabanAlami>('alami-', 'nilai');
  const luar: HasilLuar[] = [];
  if (kunci !== null) {
    for (const s of sim) {
      for (const o of omonganLolos(s.paket, s.h)) {
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
        const benarK = jk.filter((x) => x.pilihan === bk.kunci).length;
        const menunjuk = jk.filter((x) => x.pilihan === bk.kunci && x.kartu.some((k) => bk.penentu.includes(k))).length;
        luar.push({
          paket: s.paket,
          no: o.no,
          kunci: bt.kunci,
          putaran: o.putaran,
          dalam: o,
          tebak: { jawaban: jt, benar: nt.benar, yakinBenar: nt.yakinBenar, lolos: lolosTebakLuar(jt, bt.kunci) },
          kartu: { jawaban: jk, benar: benarK, menunjuk, lolos: lolosKartuLuar(jk, bk.kunci, bk.penentu), penentu: bk.penentu },
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

  // --- M2d-1
  const m2d1 = baca<{
    per_model: Array<{ model: string; tebak_lolos: number; tebak_total: number; tebak_benar_rata: number; alami_rata: number; alami_n: number }>;
    tebak: Array<{ lolos: boolean; sumber: string }>;
    manusia_alami_rata: number;
  }>(`${AKAR}eval/keluaran-m2d/ringkasan.json`);
  const m2d1Model = m2d1.per_model.find((m) => m.model === MODEL_AGEN);
  const m2d1Draf = m2d1.tebak.filter((t) => t.sumber !== 'manusia');

  // --- ringkasan terlacak
  const perSim = sim.map((s) => ({
    paket: s.paket,
    tanggal_t: s.p.tanggal_t,
    lolos: s.h.lolos,
    putaran: s.h.jumlah_putaran,
    berhenti: s.h.berhenti,
    panggilan: s.j.hasil?.panggilan ?? 0,
    token_masuk: s.j.hasil?.token_masuk ?? 0,
    token_keluar: s.j.hasil?.token_keluar ?? 0,
    biaya_jejak: s.j.hasil?.biaya_usd ?? 0,
    // Hanya entri dalam jendela jalan yang jejaknya dilaporkan: jalan yang
    // dibuang (eval/keluaran-m2d2/dibuang/) tetap dihitung di total milestone.
    biaya_ledger: ledgerAgen
      .filter((e) => e.tag.startsWith(`agen/${s.paket}/`) && e.waktu >= s.j.mulai && (s.j.selesai === null || e.waktu <= s.j.selesai))
      .reduce((a, e) => a + e.biaya_usd, 0),
    durasi_ms: s.j.hasil?.durasi_ms ?? 0,
    status_per_putaran: s.h.riwayat.map((r) => r.omongan.map((o) => o.status)),
  }));
  const tebakLuarLolos = luar.filter((x) => x.tebak.lolos).length;
  const setuju = {
    lolos_dalam_lolos_luar: luar.filter((x) => x.tebak.lolos).length,
    lolos_dalam_gagal_luar: luar.filter((x) => !x.tebak.lolos).length,
    kartu_lolos_dalam_lolos_luar: luar.filter((x) => x.kartu.lolos).length,
    kartu_lolos_dalam_benar_luar_3: luar.filter((x) => x.kartu.benar === 3).length,
  };
  const ringkasan = {
    model: MODEL_AGEN,
    maks_putaran: MAKS_PUTARAN,
    setelan_penyusun: SETELAN_PENYUSUN,
    per_simulasi: perSim,
    luar: luar.map((x) => ({
      paket: x.paket, no: x.no, kunci: x.kunci, putaran: x.putaran,
      tebak_dalam: x.dalam.tebak_dalam, tebak_luar: x.tebak, kartu_luar: x.kartu,
    })),
    setuju,
    alami,
    alami_rata: {
      agen_m2d2: alamiRata('agen-m2d2'),
      m2d1_deepseek: alamiRata('m2d1-deepseek'),
      manusia: alamiRata('manusia'),
    },
    m2d1: {
      tebak_lolos_semua: `${String(m2d1Draf.filter((t) => t.lolos).length)}/${String(m2d1Draf.length)}`,
      deepseek: m2d1Model ?? null,
      manusia_alami_rata: m2d1.manusia_alami_rata,
    },
    biaya: { milestone_ledger_usd: totalAgen, ledger_kumulatif_usd: totalLedger, panggilan: ledgerAgen.length },
  };
  const ledgerRingkas = ledgerAgen.map((e) => ({
    waktu: e.waktu,
    tag: e.tag,
    status: e.status,
    token_masuk: e.token_masuk,
    token_keluar: e.token_keluar,
    biaya_usd: e.biaya_usd,
    dasar_biaya: e.dasar_biaya,
    latensi_ms: e.latensi_ms,
    koreksi: e.galat?.startsWith('KOREKSI') === true,
  }));
  const tangan = existsSync(`${FOLDER_M2D2}/laporan-tangan.md`) ? readFileSync(`${FOLDER_M2D2}/laporan-tangan.md`, 'utf8') : '';
  const md = tulis(sim, perSim, luar, alami, ringkasan, totalAgen, totalLedger, ledgerAgen.length, tangan);
  const konsol = [
    `Biaya milestone (ledger agen/*, dipotong ${potong}): ${usd(totalAgen)} dalam ${String(ledgerAgen.length)} panggilan; ledger kumulatif ${usd(totalLedger)}.`,
    ...perSim.map(
      (s) => `  ${s.paket}: ${s.lolos ? 'LOLOS' : 'TIDAK LOLOS'} di putaran ${String(s.putaran)}, ${String(s.panggilan)} panggilan, ${usd(s.biaya_ledger)}`,
    ),
    `  tebak buta eksternal: ${String(tebakLuarLolos)}/${String(luar.length)} lolos; kartu eksternal 3/3 + penentu: ${String(setuju.kartu_lolos_dalam_lolos_luar)}/${String(luar.length)}`,
    `  kealamian: agen ${f(ringkasan.alami_rata.agen_m2d2.rata)} (n=${String(ringkasan.alami_rata.agen_m2d2.n)}), M2d-1 ${f(ringkasan.alami_rata.m2d1_deepseek.rata)}, manusia ${f(ringkasan.alami_rata.manusia.rata)}`,
  ];
  return { md, ringkasan, ledgerRingkas, konsol };
}

function utama(): number {
  const l = bangunLaporan(bacaLedger());
  writeFileSync(`${FOLDER_M2D2}/ringkasan.json`, JSON.stringify(l.ringkasan, null, 2) + '\n', 'utf8');
  writeFileSync(`${FOLDER_M2D2}/ledger-ringkas.json`, JSON.stringify(l.ledgerRingkas, null, 2) + '\n', 'utf8');
  writeFileSync(JALUR_LAPORAN, l.md, 'utf8');
  console.log('Ditulis: docs/bukti/lingkar-agen.md, eval/keluaran-m2d2/ringkasan.json, eval/keluaran-m2d2/ledger-ringkas.json.');
  for (const b of l.konsol) console.log(b);
  return 0;
}

function tulisDraf(o: { nama: string; jam: string; pesan: string; pilihan: Record<string, string>; kunci: string }): string[] {
  return [
    `> **${o.nama} (${o.jam}):** ${teksPolos(o.pesan)}`,
    '',
    ...(['a', 'b', 'c', 'd'] as const).map((k) => `- ${k === o.kunci ? '**' : ''}${k}) ${teksPolos(o.pilihan[k] ?? '')}${k === o.kunci ? '** (kunci)' : ''}`),
    '',
  ];
}

function tulis(
  sim: Sim[],
  perSim: Array<{ paket: string; tanggal_t: string; lolos: boolean; putaran: number; berhenti: string | null; panggilan: number; token_masuk: number; token_keluar: number; biaya_jejak: number; biaya_ledger: number; durasi_ms: number }>,
  luar: HasilLuar[],
  alami: Array<{ penilai: string; paket: string; sumber: string; skor: number; alasan: string }>,
  r: {
    alami_rata: Record<string, { rata: number | null; n: number }>;
    m2d1: { tebak_lolos_semua: string; deepseek: { tebak_lolos: number; tebak_total: number; tebak_benar_rata: number; alami_rata: number; alami_n: number } | null; manusia_alami_rata: number };
    setuju: Record<string, number>;
  },
  totalAgen: number,
  totalLedger: number,
  nPanggilan: number,
  tangan: string,
): string {
  const b: string[] = [];
  b.push('# Bukti: lingkar agen penyusun simulasi (M2d-2)', '');
  b.push(
    'Berkas ini ditulis oleh `npm run agen:laporan` dari keluaran mentah di `eval/keluaran-m2d2/` (riwayat tiap putaran, jejak langkah, ledger biaya, bahan dan jawaban mentah penguji eksternal). Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian sesudah "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d2/laporan-tangan.md`). Draf **tidak** dipasang ke produk.',
    '',
  );
  b.push('## Lingkarnya', '');
  b.push(
    `Satu model, \`${MODEL_AGEN}\` (pemenang uji tanding M2d-1), sebagai penyusun **dan** pemeriksa, lewat klien OpenAI-compatible buatan sendiri dan pagu dolar yang dicek kode sebelum setiap panggilan. Orkestrasinya \`factory/llm/agen.ts\`:`,
    '',
    '1. **susun** — penyusun (suhu ' + f(SETELAN_PENYUSUN.suhu, 1) + `, \`max_tokens\` ${ribuan(SETELAN_PENYUSUN.maxTokens)}) menulis SATU omongan per panggilan dari paket fakta yang sudah lolos mesin verifikasi V2, dengan omongan lain sebagai konteks;`,
    '2. **validator** deterministik (`validasi.ts`, M2d-1): setiap angka berjejak ke fakta, tanpa tanggal sesudah T, bentuk 2×2, kata terlarang;',
    `3. **gerbang jawab-dengan-kartu** — satu pembaca baru yang memegang kartu omongan itu (suhu ${f(SUHU_KARTU, 0)}) harus memilih kunci; salah → ditolak (ambigu);`,
    `4. **gerbang tebak buta** — ${String(JUMLAH_PENEBAK)} penebak baru, masing-masing percakapan sendiri (suhu ${f(SUHU_TEBAK, 1)}), hanya melihat pesan + pertanyaan + empat pilihan; ditolak bila ≥ 2 dari 3 benar atau rata-rata keyakinan penebak benar ≥ 40 (K-05);`,
    `5. omongan yang lolos ketiganya **dikunci kode**; yang ditolak mendapat umpan balik terstruktur (gerbang, alasan, tebakan) dan hanya ia yang ditulis ulang — paling banyak ${String(MAKS_PUTARAN)} putaran per simulasi.`,
    '',
    'Setiap langkah dicatat oleh kode saat terjadi di `eval/keluaran-m2d2/<paket>/jejak-agen.json` (skema `factory/llm/jejak-agen.skema.json`): waktu, jenis, model, token, biaya, putusan, alasan; prompt hanya sebagai sha256.',
    '',
  );

  b.push('## Hasil per simulasi', '');
  b.push('| paket | T | fakta di paket / tersingkir / aturan R dijalankan | hasil | putaran | panggilan | token masuk / keluar | biaya (ledger) | waktu |');
  b.push('|---|---|---|---|---:|---:|---|---:|---:|');
  for (const s of perSim) {
    const si = sim.find((x) => x.paket === s.paket);
    b.push(
      `| ${s.paket.toUpperCase()} | ${tanggalId(s.tanggal_t)} | ${String(si?.j.paket.fakta_lolos ?? '')} / ${String(si?.j.paket.fakta_tersingkir ?? '')} / ${String(si?.j.paket.aturan_dijalankan ?? '')} | ${s.lolos ? '**lolos**' : `tidak lolos (${s.berhenti ?? ''})`} | ${String(s.putaran)} | ${String(s.panggilan)} | ${ribuan(s.token_masuk)} / ${ribuan(s.token_keluar)} | ${usd(s.biaya_ledger)} | ${f(s.durasi_ms / 60000, 1)} menit |`,
    );
  }
  b.push('');
  b.push(`**Total biaya milestone menurut ledger** (semua panggilan bertanda \`agen/\`): **${usd(totalAgen)}** dalam ${String(nPanggilan)} panggilan. Ledger kumulatif sejak M2d-1: ${usd(totalLedger)} dari pagu US$5,00.`, '');

  // --- keputusan gerbang di dalam lingkar, dihitung dari riwayat
  b.push('### Keputusan di dalam lingkar', '');
  b.push('Setiap versi omongan yang ditulis penyusun, dan di mana ia berhenti. Satu omongan bisa punya banyak versi (satu per putaran).', '');
  b.push('| paket | versi omongan diperiksa | tak terbaca / tak ada | ditolak validator | ditolak gerbang kartu | ditolak gerbang tebak | galat gerbang | lolos (dikunci) | panggilan penyusun terpotong / cadangan tanpa berpikir |');
  b.push('|---|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const s of sim) {
    const semua = s.h.riwayat.flatMap((r) => r.omongan.filter((o) => o.status !== 'terkunci-sebelumnya'));
    const hitung = (st: string): number => semua.filter((o) => o.status === st).length;
    const panggilan = s.h.riwayat.flatMap((r) => r.panggilan);
    const terpotong = panggilan.filter((p) => p.finish_reason === 'length').length;
    const cadangan = s.j.langkah.filter((l) => (l.jenis === 'susun' || l.jenis === 'tulis-ulang') && l.rincian['mode_berpikir'] === false).length;
    b.push(
      `| ${s.paket.toUpperCase()} | ${String(semua.length)} | ${String(hitung('tidak-ada'))} | ${String(hitung('ditolak-validator'))} | ${String(hitung('ditolak-kartu'))} | ${String(hitung('ditolak-tebak'))} | ${String(hitung('galat-gerbang'))} | ${String(hitung('lolos'))} | ${String(terpotong)} / ${String(cadangan)} |`,
    );
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
      b.push(`**Putaran ${String(rr.putaran)}** — ${rr.jenis === 'susun' ? 'menyusun' : 'menulis ulang'} omongan ${rr.diminta.join(', ')}; ${usd(biayaP)}, ${detik(lama)}.`, '');
      const langkahValidator = langkah.find((l) => l.jenis === 'validator');
      const kode = [...new Set(rr.masalah.map((m) => m.kode))];
      const tolak = langkahValidator?.putusan === 'tolak';
      b.push(
        `- validator: ${tolak ? `menolak${kode.length > 0 ? ` (${kode.join(', ')})` : ' (ada omongan yang tidak terbaca)'}` : 'lolos'}` +
          (rr.diabaikan.length > 0 ? `; objek omongan lain dari model (${rr.diabaikan.join(', ')}) dibuang` : ''),
      );
      for (const o of rr.omongan) {
        if (o.status === 'terkunci-sebelumnya') continue;
        const bagian: string[] = [`omongan ${String(o.no)}: **${o.status}**`];
        if (o.kartu !== null) bagian.push(`pembaca kartu memilih ${o.kartu.pilihan ?? '—'} (kunci ${o.kartu.kunci})`);
        if (o.tebak !== null) bagian.push(`tebakan tanpa kartu ${o.tebak.tebakan.map((t) => `${t.pilihan}/${String(t.yakin)}${t.terbaca ? '' : ' (tak terbaca)'}`).join(', ')}`);
        b.push(`- ${bagian.join(' · ')}`);
        if (o.status === 'ditolak-validator' || o.status === 'tidak-ada' || o.status === 'galat-gerbang') {
          for (const u of o.umpan.slice(0, 4)) b.push(`  - ${u.replace(/\|/g, '/').slice(0, 300)}`);
        }
        if (o.status === 'ditolak-tebak' || o.status === 'ditolak-kartu' || o.status === 'lolos') {
          const pesan = rr.draf[o.no - 1];
          if (pesan !== null && pesan !== undefined) b.push(`  - pesan: "${teksPolos(pesan.pesan)}" (kunci ${pesan.kunci})`);
        }
      }
      b.push('');
    }
  }

  // --- draf akhir: TIRT utuh (yang terkunci + versi terakhir omongan yang tidak lolos)
  const tirt = sim.find((s) => s.paket === 'tirt');
  b.push('## Draf akhir TIRT (utuh)', '');
  if (tirt !== undefined) {
    const terakhir = tirt.h.riwayat[tirt.h.riwayat.length - 1];
    const terkunci = new Set(omonganLolos('tirt', tirt.h).map((l) => l.no));
    b.push(
      tirt.h.lolos
        ? 'Kasus pertama buatan agen: lolos semua gerbang.'
        : `**Tidak lolos penuh** (${tirt.h.berhenti ?? ''}). Di bawah: omongan yang dikunci lingkar (lolos validator + kedua gerbang) dan versi terakhir omongan yang tidak lolos, apa adanya.`,
      '',
    );
    const draf = terakhir?.draf ?? [];
    draf.forEach((o, i) => {
      if (o === null || o === undefined) return;
      b.push(`**Omongan ${String(i + 1)} — ${terkunci.has(i + 1) ? 'DIKUNCI (lolos)' : 'versi terakhir, DITOLAK'}**`, '');
      b.push(...tulisDraf(o));
    });
    b.push('```json', JSON.stringify({ omongan: draf }, null, 2), '```', '');
  }
  for (const s of sim.filter((x) => x.paket !== 'tirt')) {
    const kunci = omonganLolos(s.paket, s.h);
    b.push(`### ${s.paket.toUpperCase()}: omongan yang dikunci`, '');
    if (kunci.length === 0) b.push('Tidak ada.', '');
    for (const l of kunci) {
      b.push(`**Omongan ${String(l.no)}** (dikunci di putaran ${String(l.putaran)})`, '');
      b.push(...tulisDraf(l.omongan));
    }
    b.push(`Riwayat utuh: \`eval/keluaran-m2d2/${s.paket}/riwayat.json\`.`, '');
  }

  // --- jalan yang dibuang (semuanya tetap di ledger)
  const dibuang = `${FOLDER_M2D2}/dibuang`;
  if (existsSync(dibuang)) {
    b.push('## Jalan TIRT yang dibuang', '');
    b.push('Dijalankan sebelum setelan akhir; rekamannya utuh di `eval/keluaran-m2d2/dibuang/`, biayanya ikut di total ledger. Sebabnya ditulis di catatan penulis.', '');
    b.push('| jalan | langkah tercatat | panggilan (jejak) | biaya (jejak) | hasil |', '|---|---:|---:|---:|---|');
    for (const d of readdirSync(dibuang).sort()) {
      const jalur = `${dibuang}/${d}/jejak-agen.json`;
      if (!existsSync(jalur)) continue;
      const j = baca<JejakAgen>(jalur);
      const panggilan = j.langkah.reduce((a, l) => a + l.panggilan, 0);
      const biaya = j.langkah.reduce((a, l) => a + l.biaya_usd, 0);
      b.push(
        `| ${d} | ${String(j.langkah.length)} | ${String(panggilan)} | ${usd(biaya)} | ${j.hasil === null ? 'dihentikan eksekutor (jejak tidak ditutup)' : `${j.hasil.lolos ? 'lolos' : 'tidak lolos'}: ${(j.hasil.berhenti ?? '').replace(/\|/g, '/').slice(0, 160)}`} |`,
      );
    }
    b.push('');
  }

  b.push('## Pembanding eksternal', '');
  b.push(
    'Penguji dan penilai: subagent Claude (opus) **baru**, tanpa konteks eksekutor, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d2/penguji/`). Jawaban mentah: `penguji/jawaban/`. Tebak buta memakai petunjuk yang sama persis dengan M2d-1.',
    '',
  );
  b.push('### Tebak buta (tanpa kartu) — gerbang-dalam vs penguji-luar', '');
  b.push('| paket | omongan | kunci | di dalam lingkar (DeepSeek, suhu 1,0) | di luar (3 subagent) | benar luar | yakin penebak benar | lolos luar (K-05) |');
  b.push('|---|---:|---|---|---|---:|---:|---|');
  for (const x of luar) {
    const dalam = x.dalam.tebak_dalam?.tebakan.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(', ') ?? '—';
    b.push(
      `| ${x.paket.toUpperCase()} | ${String(x.no)} | ${x.kunci} | ${dalam} | ${x.tebak.jawaban.map((j) => `${j.pilihan}/${String(j.yakin)}`).join(', ')} | ${String(x.tebak.benar)}/${String(x.tebak.jawaban.length)} | ${f(x.tebak.yakinBenar, 0)} | ${x.tebak.lolos ? 'ya' : '**tidak**'} |`,
    );
  }
  b.push('');
  const n = luar.length;
  b.push(
    `**Kesepakatan:** dari ${String(n)} omongan yang lolos gerbang tebak buta di dalam lingkar, **${String(r.setuju['lolos_dalam_lolos_luar'] ?? 0)} juga lolos** di penguji luar dan **${String(r.setuju['lolos_dalam_gagal_luar'] ?? 0)} lolos di dalam tetapi gagal di luar**. Rata-rata penguji luar yang menebak benar: ${f(rata(luar.map((x) => x.tebak.benar)))} dari 3.`,
    '',
  );
  b.push('### Jawab dengan kartu', '');
  b.push('| paket | omongan | kunci | kartu penentu | jawaban luar (pilihan/kartu) | benar | menunjuk penentu | kalimat membingungkan |');
  b.push('|---|---:|---|---|---|---:|---:|---|');
  for (const x of luar) {
    const bingung = x.kartu.jawaban.map((j) => j.bingung).filter((t) => t.trim() !== '').map((t) => `"${t.replace(/\|/g, '/')}"`).join('; ');
    b.push(
      `| ${x.paket.toUpperCase()} | ${String(x.no)} | ${x.kunci} | ${x.kartu.penentu.join(', ')} | ${x.kartu.jawaban.map((j) => `${j.pilihan}/${j.kartu.join('+')}`).join(', ')} | ${String(x.kartu.benar)}/${String(x.kartu.jawaban.length)} | ${String(x.kartu.menunjuk)}/${String(x.kartu.jawaban.length)} | ${bingung || '—'} |`,
    );
  }
  b.push('');
  b.push(
    `Gerbang kartu di dalam meloloskan ${String(n)} omongan ini; di luar, ${String(r.setuju['kartu_lolos_dalam_benar_luar_3'] ?? 0)} dijawab benar oleh ketiga penguji dan ${String(r.setuju['kartu_lolos_dalam_lolos_luar'] ?? 0)} memenuhi kriteria K-05 penuh (3/3 benar dan ketiganya menunjuk kartu penentu).`,
    '',
  );
  b.push('### Kealamian bahasa (buta)', '');
  b.push('Per paket: draf agen M2d-2, draf DeepSeek M2d-1 (model dan paket yang sama, tanpa lingkar, putaran 2), dan omongan manusia yang hidup (DADA, ULTJ); label acak.', '');
  b.push('| sumber | rata-rata | n |', '|---|---:|---:|');
  for (const [nama, k] of [['agen M2d-2', 'agen_m2d2'], ['DeepSeek M2d-1 (tanpa lingkar)', 'm2d1_deepseek'], ['manusia (hidup)', 'manusia']] as const) {
    const a = r.alami_rata[k];
    b.push(`| ${nama} | ${f(a?.rata ?? null)} | ${String(a?.n ?? 0)} |`);
  }
  b.push('');
  b.push('| paket | sumber | penilai | skor | alasan |', '|---|---|---|---:|---|');
  for (const a of [...alami].sort((x, y) => x.paket.localeCompare(y.paket) || x.sumber.localeCompare(y.sumber) || x.penilai.localeCompare(y.penilai))) {
    b.push(`| ${a.paket.toUpperCase()} | ${a.sumber} | ${a.penilai} | ${String(a.skor)} | ${a.alasan.replace(/\|/g, '/')} |`);
  }
  b.push('');

  b.push('## Dibanding M2d-1', '');
  const d = r.m2d1.deepseek;
  b.push('| ukuran | M2d-1 (tanpa lingkar) | M2d-2 (lingkar agen) |', '|---|---|---|');
  b.push(`| tebak buta K-05, penguji luar — semua draf | ${r.m2d1.tebak_lolos_semua} omongan lolos | ${String(luar.filter((x) => x.tebak.lolos).length)}/${String(n)} |`);
  if (d !== null) {
    b.push(`| tebak buta K-05, penguji luar — DeepSeek-V4.1-Flash | ${String(d.tebak_lolos)}/${String(d.tebak_total)}, rata-rata ${f(d.tebak_benar_rata)} dari 3 benar | ${String(luar.filter((x) => x.tebak.lolos).length)}/${String(n)}, rata-rata ${f(rata(luar.map((x) => x.tebak.benar)))} dari 3 benar |`);
    b.push(`| kealamian DeepSeek, penilai M2d-1 | ${f(d.alami_rata)} (n=${String(d.alami_n)}) | — |`);
  }
  b.push(`| kealamian, penilai yang SAMA (M2d-2) | draf M2d-1: ${f(r.alami_rata['m2d1_deepseek']?.rata ?? null)} | draf agen: ${f(r.alami_rata['agen_m2d2']?.rata ?? null)} |`);
  b.push(`| kealamian manusia (hidup) | ${f(r.m2d1.manusia_alami_rata)} | ${f(r.alami_rata['manusia']?.rata ?? null)} |`);
  b.push('');
  if (tangan.trim() !== '') b.push('## Catatan penulis', '', tangan.trim(), '');
  return b.join('\n');
}

if (/(^|[\\/])agen-laporan\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
