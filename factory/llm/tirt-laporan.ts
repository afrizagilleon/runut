/**
 * `npm run tirt:laporan` — tulis `docs/bukti/lingkar-agen-tirt.md` dan
 * `eval/keluaran-m2d5/{ringkasan,ledger-ringkas}.json` dari keluaran mentah
 * M2d-5 (kontrak D-11): riwayat + jejak lingkar TIRT, ledger OpenRouter
 * (biaya NYATA `usage.cost`), probe, jawaban mentah penguji eksternal, dan
 * arsip ledger Featherless. Hanya "Catatan penulis" yang ditulis tangan
 * (`eval/keluaran-m2d5/laporan-tangan.md`). Draf TIDAK dipasang ke produk.
 *
 * Biaya: entri ledger bertag `m2d5/`, dipotong saat jalan TIRT terakhir
 * selesai (panggilan sesudahnya tidak mengubah laporan). Per peran dari tag,
 * per penyedia dari medan `penyedia` (nama penyedia yang benar-benar melayani,
 * dari respons OpenRouter).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import type { HasilPeran, PemeriksaanPeran } from './agen-peran.ts';
import { lolosKartuLuar, lolosTebakLuar } from './agen-laporan.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { ambangMirip } from './gerbang-mirip.ts';
import type { KalimatBingung } from './gerbang-kartu.ts';
import type { JejakAgen } from './jejak.ts';
import { jsonDari, lolosTebak } from './laporan.ts';
import { MODEL_PENEBAK_M2D5, MODEL_PERAN_M2D5 } from './model.ts';
import { JALUR_ARSIP_FEATHERLESS, JALUR_LEDGER, berkasArsip, FOLDER_ARSIP_LEDGER, type EntriLedger } from './pagu.ts';
import { PERJELAS_KLAIM, type PaketFakta } from './paket.ts';
import { PENALARAN_M2D5 } from './penalaran.ts';
import { omonganLolosPeran, type OmonganLolosPeran } from './peran-penguji.ts';
import { peranDariTag } from './peran-laporan.ts';
import { polaKunci } from './posisi-kunci.ts';
import { FOLDER_PENGUJI_M2D5, type KunciPengujiM2d5 } from './tirt-penguji.ts';
import { AWALAN_TAG_M2D5, FOLDER_M2D5, PAGU_MILESTONE_M2D5 } from './tirt-susun.ts';

const JALUR_LAPORAN = `${AKAR}docs/bukti/lingkar-agen-tirt.md`;
/** Jalan TIRT yang dilaporkan, urut waktu: jalan ke-1 (bila jalan ke-2 dijalankan) lalu jalan terakhir. */
export const JALAN_TIRT = ['tirt-jalan1', 'tirt'] as const;
/** Kredit Featherless menurut pemilik/reviewer (kontrak M2d-5 §0, "Temuan yang memicu"). */
export const KREDIT_FEATHERLESS = { awal_usd: 15, turun_usd: 14.5 } as const;

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

interface Jalan {
  nama: string;
  p: PaketFakta;
  h: HasilPeran;
  j: JejakAgen;
}

export function bacaJalan(folder: string = FOLDER_M2D5): Jalan[] {
  return JALAN_TIRT.filter((n) => existsSync(`${folder}/${n}/riwayat.json`)).map((n) => ({
    nama: n,
    p: baca<PaketFakta>(`${folder}/${n}/paket.json`),
    h: baca<HasilPeran>(`${folder}/${n}/riwayat.json`),
    j: baca<JejakAgen>(`${folder}/${n}/jejak-agen.json`),
  }));
}

/** Peran pemilik biaya satu entri ledger M2d-5; probe dikelompokkan sendiri. */
export function peranM2d5(tag: string): string {
  if (tag.startsWith(`${AWALAN_TAG_M2D5}probe/`)) return 'probe';
  const p = peranDariTag(tag);
  if (p === 'penebak') return /\/t3(\/|$)/.test(tag) ? 'penebak GLM' : 'penebak DeepSeek';
  return p;
}

export interface KelompokBiaya {
  panggilan: number;
  usd: number;
  token_keluar: number;
}

/** Jumlahkan biaya nyata per kunci kelompok. Murni. */
export function kelompokkan(entri: readonly EntriLedger[], kunci: (e: EntriLedger) => string): Record<string, KelompokBiaya> {
  const hasil: Record<string, KelompokBiaya> = {};
  for (const e of entri) {
    const k = kunci(e);
    hasil[k] ??= { panggilan: 0, usd: 0, token_keluar: 0 };
    hasil[k].panggilan += 1;
    hasil[k].usd += e.biaya_usd;
    hasil[k].token_keluar += e.token_keluar ?? 0;
  }
  return hasil;
}

function kodePemeriksa(o: PemeriksaanPeran): string[] {
  return o.umpan.map((u) => /^\[pemeriksa: ([^\],]+)/.exec(u)?.[1] ?? (u.startsWith('[bentuk]') ? 'TAK_TERBACA' : null)).filter((x): x is string => x !== null);
}

interface JawabanTebak { id: string; pilihan: string; yakin: number }
interface JawabanKartu { id: string; pilihan: string; kartu: number[]; bingung: string; penilaian?: string }
interface JawabanAlami { kelompok: number; label: string; skor: number; alasan: string }

function bacaJawaban<T>(folder: string, awalan: string, medan: string): Array<{ penguji: string; isi: T[] }> {
  const d = `${folder}/jawaban`;
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((b) => b.startsWith(awalan) && b.endsWith('.txt'))
    .sort()
    .map((b) => {
      const n = jsonDari(readFileSync(`${d}/${b}`, 'utf8')) as Record<string, T[]>;
      return { penguji: b.replace('.txt', ''), isi: n[medan] ?? [] };
    });
}

export interface Laporan {
  md: string;
  ringkasan: Record<string, unknown>;
  ledgerRingkas: unknown;
  konsol: string[];
}

/** Bangun laporan M2d-5. Murni atas masukannya (dan berkas keluaran yang tersimpan). */
export function bangunLaporanTirt(ledgerKini: readonly EntriLedger[], ledgerFeatherless: readonly EntriLedger[], ledgerLama: readonly EntriLedger[]): Laporan {
  const jalan = bacaJalan();
  const potong = jalan.map((s) => s.j.selesai ?? s.j.mulai).sort().at(-1) ?? '';
  const ledgerM = ledgerKini.filter((e) => e.tag.startsWith(AWALAN_TAG_M2D5) && e.waktu <= potong);
  const totalM = ledgerM.reduce((a, e) => a + e.biaya_usd, 0);

  const perJalan = jalan.map((s) => {
    const entri = ledgerM.filter((e) => e.tag.startsWith(`${AWALAN_TAG_M2D5}tirt/`) && e.waktu >= s.j.mulai && (s.j.selesai === null || e.waktu <= s.j.selesai));
    const versi = s.h.riwayat.flatMap((r) => r.omongan.filter((o) => o.status !== 'terkunci-sebelumnya').map((o) => ({ o, putaran: r.putaran })));
    const status: Record<string, number> = {};
    for (const { o } of versi) status[o.status] = (status[o.status] ?? 0) + 1;
    const kodeP: Record<string, number> = {};
    for (const { o } of versi.filter((x) => x.o.status === 'ditolak-pemeriksa' || x.o.status === 'tidak-ada')) {
      for (const k of new Set(kodePemeriksa(o))) kodeP[k] = (kodeP[k] ?? 0) + 1;
    }
    const langkah = s.j.langkah;
    const g = langkah.filter((l) => l.jenis === 'gerbang-g');
    const penilaian = g
      .filter((l) => (l.rincian['penilaian'] as { tolak?: boolean } | undefined)?.tolak === true)
      .map((l) => ({ putaran: l.putaran, no: l.omongan, temuan: ((l.rincian['penilaian'] as { temuan: Array<{ frasa: string }> }).temuan ?? []).map((t) => t.frasa), pesan: String(l.rincian['pesan'] ?? '') }));
    const mirip = g
      .filter((l) => (l.rincian['mirip'] as { tolak?: boolean } | undefined)?.tolak === true)
      .map((l) => ({ putaran: l.putaran, no: l.omongan, pasangan: (l.rincian['mirip'] as { pasangan: Array<{ dengan: number; kemiripan: number }> }).pasangan }));
    const miripMaks = g.flatMap((l) => ((l.rincian['mirip'] as { pasangan?: Array<{ kemiripan: number }> } | undefined)?.pasangan ?? []).map((x) => x.kemiripan));
    const huruf = g.filter((l) => (l.rincian['huruf_pilihan'] as { tolak?: boolean } | undefined)?.tolak === true).length;
    const tulis = langkah.filter((l) => l.jenis === 'susun' || l.jenis === 'tulis-ulang');
    const posisi = tulis
      .map((l) => l.rincian['posisi_kunci'] as { dari: string; ke: string } | undefined)
      .filter((x): x is { dari: string; ke: string } => x !== undefined);
    const bingung = langkah
      .filter((l) => l.jenis === 'gerbang-kartu')
      .flatMap((l) => ((l.rincian['membingungkan'] as KalimatBingung[] | undefined) ?? []).map((k) => ({ ...k, putaran: l.putaran, no: l.omongan })));
    const panggilanPenulis = s.h.riwayat.flatMap((r) => r.panggilan);
    const kritik = s.h.riwayat.flatMap((r) => r.omongan.filter((o) => o.kritik !== null).map((o) => o.kritik));
    const perModel: Record<string, { tebak: number; benar: number }> = {};
    for (const l of langkah.filter((x) => x.jenis === 'gerbang-tebak')) {
      for (const t of (l.rincian['tebakan'] as Array<{ model?: string; benar: boolean }> | undefined) ?? []) {
        const m = t.model ?? '?';
        perModel[m] ??= { tebak: 0, benar: 0 };
        perModel[m].tebak += 1;
        if (t.benar) perModel[m].benar += 1;
      }
    }
    const keberatan: Record<string, number> = {};
    for (const k of kritik) for (const x of k?.keberatan ?? []) keberatan[x.jenis] = (keberatan[x.jenis] ?? 0) + 1;
    return {
      jalan: s.nama,
      terbit: s.h.lolos,
      putaran: s.h.jumlah_putaran,
      berhenti: s.h.berhenti,
      sudut: s.h.sudut.map((ss, i) => ({ no: i + 1, riwayat: ss.map((c) => ({ ke: c.ke, fact_id: c.fact_id, hasil: c.hasil, putaran: `${String(c.putaran_mulai)}–${String(c.putaran_akhir ?? '')}` })) })),
      versi: versi.length,
      status,
      kode_pemeriksa: kodeP,
      g_penilaian: penilaian,
      g_mirip: mirip,
      mirip_maks: miripMaks.length === 0 ? null : Math.max(...miripMaks),
      huruf_pilihan_ditolak: huruf,
      posisi_kunci: { versi: posisi.length, dipindah: posisi.filter((x) => x.dari !== x.ke).length },
      bingung: bingung.map((b) => ({ putaran: b.putaran, no: b.no, sumber: b.sumber, bagian: b.bagian, fact_id: b.fact_id, kutipan: b.kutipan })),
      penulis: {
        panggilan: panggilanPenulis.length,
        terpotong: panggilanPenulis.filter((p) => p.finish_reason === 'length' || p.teks_mentah.trim() === '').length,
        cadangan: panggilanPenulis.filter((p) => !p.mode_berpikir).length,
      },
      kritikus: {
        dipanggil: kritik.length,
        terpotong: kritik.filter((k) => k?.terpotong === true).length,
        tidak_menjawab: kritik.filter((k) => k?.menjawab === false).length,
        keberatan,
      },
      tebak_dalam_per_model: perModel,
      panggilan_ledger: entri.length,
      biaya_ledger: entri.reduce((a, e) => a + e.biaya_usd, 0),
      biaya_jejak: s.j.hasil?.biaya_usd ?? 0,
      durasi_ms: s.j.hasil?.durasi_ms ?? 0,
      mulai: s.j.mulai,
      selesai: s.j.selesai,
    };
  });

  // --- biaya nyata per peran, per penyedia, per model; dasar biaya; penalaran
  const perPeran = kelompokkan(ledgerM, (e) => peranM2d5(e.tag));
  const perPenyedia = kelompokkan(ledgerM, (e) => `${e.model} · ${e.penyedia ?? '(tidak disebut)'}`);
  const perModel = kelompokkan(ledgerM, (e) => e.model);
  const dasar = kelompokkan(ledgerM, (e) => `${e.dasar_biaya}${e.tanpa_cost === true ? ' (tanpa usage.cost)' : ''}`);
  const penalaran = Object.fromEntries(
    Object.entries(kelompokkan(ledgerM, (e) => peranM2d5(e.tag))).map(([k]) => {
      const x = ledgerM.filter((e) => peranM2d5(e.tag) === k && typeof e.token_penalaran === 'number').map((e) => e.token_penalaran as number);
      return [k, { n: x.length, rata: rata(x), maks: x.length === 0 ? null : Math.max(...x) }];
    }),
  );

  // --- temuan Featherless (arsip): ledger vs kredit pemilik
  const featherless = [...ledgerLama, ...ledgerFeatherless];
  const ledgerFl = featherless.reduce((a, e) => a + e.biaya_usd, 0);

  // --- eksternal
  const lolos = jalan.length === 0 ? [] : omonganLolosPeran('tirt', (jalan.at(-1) as Jalan).h);
  const kunciPath = `${FOLDER_PENGUJI_M2D5}/kunci.json`;
  const kunci = existsSync(kunciPath) ? baca<KunciPengujiM2d5>(kunciPath) : null;
  const tebakMentah = bacaJawaban<JawabanTebak>(FOLDER_PENGUJI_M2D5, 'tebak-', 'jawaban');
  const kartuMentah = bacaJawaban<JawabanKartu>(FOLDER_PENGUJI_M2D5, 'kartu-', 'jawaban');
  const alamiMentah = bacaJawaban<JawabanAlami>(FOLDER_PENGUJI_M2D5, 'alami-', 'nilai');
  const luar = kunci === null ? [] : lolos.flatMap((o) => {
    const bt = kunci.tebak.find((x) => x.no === o.no);
    const bk = kunci.kartu.find((x) => x.no === o.no);
    if (bt === undefined || bk === undefined) return [];
    const jt = tebakMentah.map((p) => p.isi.find((x) => x.id === bt.id)).filter((x): x is JawabanTebak => x !== undefined).map((x) => ({ pilihan: String(x.pilihan).toLowerCase(), yakin: Number(x.yakin) }));
    const nt = lolosTebak(jt, bt.kunci);
    const jk = kartuMentah
      .map((p) => p.isi.find((x) => x.id === bk.id))
      .filter((x): x is JawabanKartu => x !== undefined)
      .map((x) => ({ pilihan: String(x.pilihan).toLowerCase(), kartu: (x.kartu ?? []).map(Number), bingung: x.bingung ?? '', penilaian: x.penilaian ?? '' }));
    return [{
      no: o.no, kunci: bt.kunci, tebak_dalam: o.tebak_dalam,
      tebak_luar: { jawaban: jt, benar: nt.benar, yakin_benar: nt.yakinBenar, lolos: lolosTebakLuar(jt, bt.kunci) },
      kartu_luar: {
        jawaban: jk, benar: jk.filter((x) => x.pilihan === bk.kunci).length,
        menunjuk: jk.filter((x) => x.pilihan === bk.kunci && x.kartu.some((k) => bk.penentu.includes(k))).length,
        lolos: lolosKartuLuar(jk, bk.kunci, bk.penentu), penentu: bk.penentu,
      },
    }];
  });
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
  const alamiRata = (paket: string, sumber: string): { rata: number | null; n: number } => {
    const x = alami.filter((a) => a.paket === paket && a.sumber === sumber).map((a) => a.skor);
    return { rata: rata(x), n: x.length };
  };

  // --- pembanding TIRT generasi sebelumnya (ringkasan terlacak)
  type RingkasLama = {
    per_simulasi: Array<{ paket: string; terbit: boolean; putaran: number; biaya_ledger: number; panggilan_ledger: number }>;
    luar: Array<{ paket: string; tebak_luar: { benar: number; lolos: boolean }; kartu_luar: { lolos: boolean; jawaban: Array<{ bingung: string }> } }>;
    alami: Array<{ paket: string; sumber: string; skor: number }>;
  };
  const lama = (folder: string, sumber: string): Record<string, unknown> => {
    const r = baca<RingkasLama>(`${AKAR}${folder}/ringkasan.json`);
    const s = r.per_simulasi.find((x) => x.paket === 'tirt');
    const l = r.luar.filter((x) => x.paket === 'tirt');
    const a = r.alami.filter((x) => x.paket === 'tirt' && x.sumber === sumber).map((x) => x.skor);
    return {
      terbit: s?.terbit ?? null, putaran: s?.putaran ?? null, panggilan: s?.panggilan_ledger ?? null, biaya_ledger_usd: s?.biaya_ledger ?? null,
      omongan_dikunci: l.length, tebak_luar_lolos: l.filter((x) => x.tebak_luar.lolos).length, tebak_benar_rata: rata(l.map((x) => x.tebak_luar.benar)),
      kartu_luar_lolos: l.filter((x) => x.kartu_luar.lolos).length, kartu_ada_bingung: l.filter((x) => x.kartu_luar.jawaban.some((j) => j.bingung.trim() !== '')).length,
      alami: rata(a), alami_n: a.length,
    };
  };
  const pembanding = { m2d3: lama('eval/keluaran-m2d3', 'agen-m2d3'), m2d4: lama('eval/keluaran-m2d4', 'agen-m2d4') };

  // --- frasa kartu yang diperjelas dan masih ada di kasus tayang (D-8)
  const kasus = readdirSync(`${AKAR}cases`).filter((x) => x.endsWith('.json')).sort();
  const frasaTayang = PERJELAS_KLAIM.map((p) => ({ lama: p.lama, di_kasus: kasus.filter((k) => readFileSync(`${AKAR}cases/${k}`, 'utf8').includes(p.lama)) }));
  const frasaSebutan = ['lolos seluruh pemeriksaan', 'Jarak antara penutupan terakhir sebelum tanggal ex dan pembukaan hari ini', 'Jarak antara turunnya harga dan dividen per lembar'].map((lamaF) => ({
    lama: lamaF,
    di_kasus: kasus.filter((k) => readFileSync(`${AKAR}cases/${k}`, 'utf8').includes(lamaF)),
  }));

  const ringkasan = {
    model_peran: { ...MODEL_PERAN_M2D5, penebak: MODEL_PENEBAK_M2D5 },
    pagu_milestone_usd: PAGU_MILESTONE_M2D5,
    penalaran: PENALARAN_M2D5,
    ambang_mirip: ambangMirip().ambang,
    pola_kunci_tirt: polaKunci('tirt'),
    per_jalan: perJalan,
    biaya: {
      milestone_nyata_usd: totalM,
      panggilan: ledgerM.length,
      dipotong: potong,
      per_peran: perPeran,
      per_penyedia: perPenyedia,
      per_model: perModel,
      dasar_biaya: dasar,
      penalaran,
    },
    featherless: {
      entri: featherless.length,
      ledger_usd: ledgerFl,
      kredit_awal_usd: KREDIT_FEATHERLESS.awal_usd,
      kredit_turun_usd: KREDIT_FEATHERLESS.turun_usd,
      rasio_tagihan_per_ledger: KREDIT_FEATHERLESS.turun_usd / ledgerFl,
      arsip: berkasArsip(FOLDER_ARSIP_LEDGER),
    },
    luar,
    setuju: {
      tebak_lolos_luar: luar.filter((x) => x.tebak_luar.lolos).length,
      kartu_lolos_luar: luar.filter((x) => x.kartu_luar.lolos).length,
      kartu_ada_bingung: luar.filter((x) => x.kartu_luar.jawaban.some((j) => j.bingung.trim() !== '')).length,
      kartu_ada_penilaian: luar.filter((x) => x.kartu_luar.jawaban.some((j) => j.penilaian.trim() !== '')).length,
    },
    alami,
    alami_rata: {
      tirt_m2d5: alamiRata('tirt', 'agen-m2d5'),
      tirt_m2d4: alamiRata('tirt', 'agen-m2d4'),
      tirt_m2d3: alamiRata('tirt', 'agen-m2d3'),
      ultj_manusia: alamiRata('ultj', 'manusia'),
      ultj_m2d4: alamiRata('ultj', 'agen-m2d4'),
    },
    pembanding,
    frasa_kartu_di_kasus_tayang: [...frasaTayang, ...frasaSebutan],
  };
  const ledgerRingkas = ledgerM.map((e) => ({
    waktu: e.waktu, tag: e.tag, model: e.model, penyedia: e.penyedia ?? null, status: e.status, token_masuk: e.token_masuk, token_keluar: e.token_keluar,
    token_penalaran: e.token_penalaran ?? null, biaya_usd: e.biaya_usd, dasar_biaya: e.dasar_biaya, perkiraan_maks_usd: e.perkiraan_maks_usd, latensi_ms: e.latensi_ms,
  }));
  const tangan = existsSync(`${FOLDER_M2D5}/laporan-tangan.md`) ? readFileSync(`${FOLDER_M2D5}/laporan-tangan.md`, 'utf8') : '';
  const md = tulis(jalan, ringkasan, tangan);
  const konsol = [
    `Biaya NYATA milestone (ledger ${AWALAN_TAG_M2D5}*, dipotong ${potong}): ${usd(totalM)} dalam ${String(ledgerM.length)} panggilan — ` +
      Object.entries(perPeran).map(([k, v]) => `${k} ${usd(v.usd)}`).join(', '),
    ...perJalan.map((s) => `  ${s.jalan}: ${s.terbit ? 'TERBIT' : 'TIDAK TERBIT'} di putaran ${String(s.putaran)}, ${String(s.panggilan_ledger)} panggilan, ${usd(s.biaya_ledger)}`),
    `  tebak buta luar: ${String(ringkasan.setuju.tebak_lolos_luar)}/${String(luar.length)} lolos; kartu luar K-05: ${String(ringkasan.setuju.kartu_lolos_luar)}/${String(luar.length)}; penilaian ditandai: ${String(ringkasan.setuju.kartu_ada_penilaian)}`,
    `  Featherless: ledger ${usd(ledgerFl)} (${String(featherless.length)} entri) vs kredit turun ±US$${String(KREDIT_FEATHERLESS.turun_usd)} → ×${f(ringkasan.featherless.rasio_tagihan_per_ledger)}`,
  ];
  return { md, ringkasan, ledgerRingkas, konsol };
}

function tulisOmongan(o: OmonganDraf): string[] {
  return [
    `> **${o.nama} (${o.jam}):** ${teksPolos(o.pesan)}`,
    '',
    ...(['a', 'b', 'c', 'd'] as const).map((k) => (k === o.kunci ? `- **${k}) ${teksPolos(o.pilihan[k])}** (kunci)` : `- ${k}) ${teksPolos(o.pilihan[k])}`)),
    '',
    `Penjelasan: ${teksPolos(o.penjelasan)}`,
    '',
  ];
}

type Ringkasan = ReturnType<typeof bangunLaporanTirt>['ringkasan'] extends infer R ? R : never;

function tulis(jalan: Jalan[], r: Record<string, unknown>, tangan: string): string {
  const x = r as {
    penalaran: typeof PENALARAN_M2D5;
    ambang_mirip: number;
    pola_kunci_tirt: readonly KunciOpsi[];
    per_jalan: Array<Record<string, unknown> & { jalan: string; terbit: boolean; putaran: number; berhenti: string | null; versi: number; status: Record<string, number>; kode_pemeriksa: Record<string, number>; g_penilaian: Array<{ putaran: number; no: number | null; temuan: string[]; pesan: string }>; g_mirip: Array<{ putaran: number; no: number | null; pasangan: Array<{ dengan: number; kemiripan: number }> }>; mirip_maks: number | null; huruf_pilihan_ditolak: number; posisi_kunci: { versi: number; dipindah: number }; bingung: Array<{ putaran: number; no: number | null; sumber: string; bagian: string | null; fact_id: string | null; kutipan: string }>; penulis: { panggilan: number; terpotong: number; cadangan: number }; kritikus: { dipanggil: number; terpotong: number; tidak_menjawab: number; keberatan: Record<string, number> }; tebak_dalam_per_model: Record<string, { tebak: number; benar: number }>; panggilan_ledger: number; biaya_ledger: number; durasi_ms: number; sudut: Array<{ no: number; riwayat: Array<{ ke: number; fact_id: string; hasil: string; putaran: string }> }> }>;
    biaya: { milestone_nyata_usd: number; panggilan: number; dipotong: string; per_peran: Record<string, KelompokBiaya>; per_penyedia: Record<string, KelompokBiaya>; per_model: Record<string, KelompokBiaya>; dasar_biaya: Record<string, KelompokBiaya>; penalaran: Record<string, { n: number; rata: number | null; maks: number | null }> };
    featherless: { entri: number; ledger_usd: number; kredit_awal_usd: number; kredit_turun_usd: number; rasio_tagihan_per_ledger: number; arsip: string[] };
    luar: Array<{ no: number; kunci: string; tebak_dalam: Array<{ pilihan: string; yakin: number }>; tebak_luar: { jawaban: Array<{ pilihan: string; yakin: number }>; benar: number; yakin_benar: number | null; lolos: boolean }; kartu_luar: { jawaban: Array<{ pilihan: string; kartu: number[]; bingung: string; penilaian: string }>; benar: number; menunjuk: number; lolos: boolean; penentu: number[] } }>;
    setuju: { tebak_lolos_luar: number; kartu_lolos_luar: number; kartu_ada_bingung: number; kartu_ada_penilaian: number };
    alami: Array<{ penilai: string; paket: string; sumber: string; skor: number; alasan: string }>;
    alami_rata: Record<string, { rata: number | null; n: number }>;
    pembanding: Record<'m2d3' | 'm2d4', Record<string, number | boolean | null>>;
    frasa_kartu_di_kasus_tayang: Array<{ lama: string; di_kasus: string[] }>;
  };
  const b: string[] = [];
  b.push('# Bukti: lingkar agen TIRT di OpenRouter (M2d-5)', '');
  b.push(
    'Berkas ini ditulis oleh `npm run tirt:laporan` dari keluaran mentah di `eval/keluaran-m2d5/` (riwayat dan jejak lingkar TIRT, probe penalaran, ledger OpenRouter dengan biaya NYATA dari `usage.cost`, bahan dan jawaban mentah penguji eksternal) dan dari arsip ledger Featherless. Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d5/laporan-tangan.md`). Draf **tidak** dipasang ke produk.',
    '',
  );
  b.push('## Metode', '');
  b.push(
    'Lingkar berperan M2d-4 (`factory/llm/peran.md`, urutan pemeriksa → pembaca kartu → kritikus → penebak ×3) dengan perubahan M2d-5, semuanya ditetapkan kode (`GENERASI_M2D5` di `factory/llm/agen-peran.ts`), hanya untuk TIRT:',
    '',
    '- **OpenRouter + pagar penyedia (D-1).** `deepseek/deepseek-v4.1-flash` (penulis, pembaca kartu, penebak 1–2) dan `z-ai/glm-5.3` (kritikus, penebak 3), tanpa sufiks. Setiap permintaan membawa `provider` = kuantisasi fp8/mxfp8/fp16/bf16/fp32/unknown (fp4, nvfp4, int4, int8, fp6 ditolak), `max_price` = harga daftar standar (DeepSeek 0,30/1,20; GLM 1,40/4,40 USD per juta token), `require_parameters: true`, `data_collection: "deny"`, `allow_fallbacks: true`, tanpa `sort` (`factory/llm/openrouter.ts`).',
    '- **Biaya nyata (D-2).** Ledger mencatat `usage.cost` dari respons; perkiraan sebelum kirim = `max_price` × (batas atas token masuk + `max_tokens`). Pagu milestone US$4,00 dan pagu kumulatif `LLM_PAGU_USD` menegakkan biaya nyata + perkiraan panggilan berikutnya.',
    `- **Batas penalaran (D-3)** dari probe (\`eval/keluaran-m2d5/probe/putusan.md\`): penulis ${String(x.penalaran.penulis.penalaran)} / ${String(x.penalaran.penulis.maxTokens)}, kritikus ${String(x.penalaran.kritikus.penalaran)} / ${String(x.penalaran.kritikus.maxTokens)}, penebak GLM ${String(x.penalaran.penebakGlm.penalaran)} / ${String(x.penalaran.penebakGlm.maxTokens)}, pembaca kartu ${String(x.penalaran.kartu.penalaran)} / ${String(x.penalaran.kartu.maxTokens)} (\`reasoning.max_tokens\` / \`max_tokens\`). Jawaban kosong karena penalaran habis = terpotong (dibayar).`,
    `- **Posisi kunci diatur kode (D-4)**: pola TIRT ${x.pola_kunci_tirt.join(', ')} (sha256 id paket); penjelasan/pilihan dilarang merujuk huruf.`,
    `- **G-penilaian (D-5)** dan **G-mirip (D-6)** di pemeriksa; ambang G-mirip ${f(x.ambang_mirip)} = 4 × kemiripan manusia terbesar.`,
    '- **Pembaca kartu menandai kalimat membingungkan (D-7)**: tulisan penulis → menolak; teks kartu paket → dicatat.',
    '- **Teks kartu paket diperjelas (D-8)** di `factory/llm/paket.ts` (`PERJELAS_KLAIM` dan `sebutan` turunan).',
    '',
  );

  b.push('## Hasil TIRT', '');
  b.push('| jalan | hasil | putaran | versi diperiksa | panggilan (ledger) | biaya NYATA | waktu |', '|---|---|---:|---:|---:|---:|---:|');
  for (const s of x.per_jalan) {
    b.push(`| ${s.jalan} | ${s.terbit ? '**terbit (lolos penuh)**' : `tidak terbit (${sel(String(s.berhenti))})`} | ${String(s.putaran)} | ${String(s.versi)} | ${String(s.panggilan_ledger)} | ${usd(s.biaya_ledger)} | ${f(s.durasi_ms / 60000, 1)} menit |`);
  }
  b.push('');
  for (const s of x.per_jalan) {
    b.push(`### ${s.jalan} — sudut, keputusan, gerbang baru`, '');
    b.push('| omongan | sudut (fakta penentu) → hasil, putaran |', '|---:|---|');
    for (const ss of s.sudut) b.push(`| ${String(ss.no)} | ${ss.riwayat.map((c) => `${String(c.ke)}. \`${c.fact_id}\` → ${c.hasil} (${c.putaran})`).join('; ')} |`);
    b.push('');
    b.push(`- Status per versi: ${Object.entries(s.status).map(([k, v]) => `${k} ${String(v)}`).join(', ')}.`);
    b.push(`- Penolakan pemeriksa per kode (versi): ${Object.entries(s.kode_pemeriksa).map(([k, v]) => `${k} ${String(v)}`).join(', ') || '—'}.`);
    b.push(`- Posisi kunci diatur kode: ${String(s.posisi_kunci.versi)} versi ditulis, ${String(s.posisi_kunci.dipindah)} dipindah hurufnya; rujukan huruf ditolak ${String(s.huruf_pilihan_ditolak)} kali.`);
    b.push(`- G-penilaian menolak ${String(s.g_penilaian.length)} versi${s.g_penilaian.length === 0 ? '' : `: ${s.g_penilaian.map((g) => `p${String(g.putaran)} o${String(g.no)} (${g.temuan.map((t) => `"${t}"`).join(', ')})`).join('; ')}`}.`);
    b.push(`- G-mirip menolak ${String(s.g_mirip.length)} versi${s.g_mirip.length === 0 ? '' : `: ${s.g_mirip.map((g) => `p${String(g.putaran)} o${String(g.no)} (${g.pasangan.map((p) => `vs ${String(p.dengan)}: ${f(p.kemiripan)}`).join(', ')})`).join('; ')}`}; kemiripan terbesar yang terukur ${f(s.mirip_maks)}.`);
    b.push(`- Penulis: ${String(s.penulis.panggilan)} panggilan, terpotong/kosong ${String(s.penulis.terpotong)}, cadangan tanpa berpikir ${String(s.penulis.cadangan)}. Kritikus: ${String(s.kritikus.dipanggil)} putusan, terpotong ${String(s.kritikus.terpotong)}, tidak menjawab ${String(s.kritikus.tidak_menjawab)}; keberatan per jenis: ${Object.entries(s.kritikus.keberatan).map(([k, v]) => `${k} ${String(v)}`).join(', ') || '—'}.`);
    b.push(`- Penebak di dalam (benar tanpa kartu / tebakan): ${Object.entries(s.tebak_dalam_per_model).map(([m, v]) => `\`${m}\` ${String(v.benar)}/${String(v.tebak)}`).join(', ') || '—'}.`);
    b.push('');
    if (s.bingung.length > 0) {
      b.push('Kalimat yang ditandai membingungkan oleh pembaca kartu (D-7):', '', '| putaran | omongan | asal | bagian | kutipan |', '|---:|---:|---|---|---|');
      for (const k of s.bingung) b.push(`| ${String(k.putaran)} | ${String(k.no)} | ${k.sumber}${k.sumber === 'penulis' ? ' (menolak)' : ' (dicatat)'} | ${sel(`${String(k.bagian)}${k.fact_id === null ? '' : ` \`${k.fact_id}\``}`)} | ${sel(k.kutipan)} |`);
      b.push('');
    } else {
      b.push('Pembaca kartu tidak menandai kalimat membingungkan di jalan ini.', '');
    }
  }

  b.push('### Putaran demi putaran (jalan terakhir)', '');
  const akhir = jalan.at(-1);
  if (akhir !== undefined) {
    for (const r of akhir.h.riwayat) {
      b.push(`**Putaran ${String(r.putaran)}** — tulis ${r.ditulis.join(', ') || '—'}${r.dibawa.length > 0 ? `; bawa ${r.dibawa.join(', ')}` : ''}.`, '');
      for (const o of r.omongan.filter((z) => z.status !== 'terkunci-sebelumnya')) {
        const d = r.draf[o.no - 1];
        b.push(`- omongan ${String(o.no)}: **${o.status}**${d === null || d === undefined ? '' : ` — "${sel(teksPolos(d.pesan))}" (kunci ${d.kunci})`}`);
        for (const u of o.umpan.slice(0, 3)) b.push(`  - ${sel(u).slice(0, 320)}`);
      }
      if (r.dibuang.length > 0) b.push(`- sudut dibuang: ${r.dibuang.map((z) => `omongan ${String(z.no)} \`${z.fact_id}\` → ${z.pengganti === null ? 'tidak ada pengganti' : `\`${z.pengganti}\``}`).join('; ')}`);
      b.push('');
    }
  }

  b.push('## Draf akhir', '');
  if (akhir !== undefined) {
    if (akhir.h.lolos && akhir.h.draf !== null) {
      b.push('TIRT **terbit** — draf utuh apa adanya (tidak disunting tangan):', '');
      akhir.h.draf.omongan.forEach((o, i) => b.push(`**Omongan ${String(i + 1)}**`, '', ...tulisOmongan(o)));
      b.push('```json', JSON.stringify(akhir.h.draf, null, 2), '```', '');
    } else {
      const l = omonganLolosPeran('tirt', akhir.h);
      b.push(`TIRT tidak terbit; omongan yang dikunci (${String(l.length)}):`, '');
      for (const o of l) b.push(`**Omongan ${String(o.no)}** (dikunci di putaran ${String(o.putaran)}, sudut \`${o.sudut}\`)`, '', ...tulisOmongan(o.omongan));
    }
  }

  b.push('## Biaya NYATA (OpenRouter, `usage.cost`)', '');
  b.push(`Entri ledger bertag \`m2d5/\`, dipotong ${x.biaya.dipotong}: **${usd(x.biaya.milestone_nyata_usd)} dalam ${String(x.biaya.panggilan)} panggilan**, dari pagu milestone US$4,00 (ditegakkan kode).`, '');
  b.push('| peran | panggilan | token keluar | biaya nyata | penalaran rata / maks (token) |', '|---|---:|---:|---:|---|');
  for (const [k, v] of Object.entries(x.biaya.per_peran).sort()) {
    const p = x.biaya.penalaran[k];
    b.push(`| ${k} | ${String(v.panggilan)} | ${String(v.token_keluar)} | ${usd(v.usd)} | ${p === undefined ? '—' : `${f(p.rata, 0)} / ${String(p.maks ?? '—')}`} |`);
  }
  b.push('', '| model · penyedia yang melayani | panggilan | biaya nyata |', '|---|---:|---:|');
  for (const [k, v] of Object.entries(x.biaya.per_penyedia).sort((a, c) => c[1].usd - a[1].usd)) b.push(`| ${k} | ${String(v.panggilan)} | ${usd(v.usd)} |`);
  b.push('', '| dasar biaya | panggilan | biaya |', '|---|---:|---:|');
  for (const [k, v] of Object.entries(x.biaya.dasar_biaya).sort()) b.push(`| ${k} | ${String(v.panggilan)} | ${usd(v.usd)} |`);
  b.push('');

  b.push('## Temuan Featherless', '');
  b.push(
    `Ledger Featherless (M2d-1…M2d-4, diarsipkan utuh: ${x.featherless.arsip.map((a) => `\`${a}\``).join(', ')}) mencatat **${usd(x.featherless.ledger_usd)} dalam ${String(x.featherless.entri)} entri**, dihitung dari token × tabel tebakan (\`HARGA_FEATHERLESS_USANG\`). Kredit Featherless pemilik turun ±US$${f(x.featherless.kredit_turun_usd, 1)} (dari US$${String(x.featherless.kredit_awal_usd)}; angka pemilik, kontrak M2d-5 §0) — **tagihan nyata ±${f(x.featherless.rasio_tagihan_per_ledger)} × ledger**: tabel harga "konservatif" itu ±separuh tagihan, sehingga pagu kode M2d-2…M2d-4 tidak konservatif seperti klaimnya. Di M2d-5 ledger memakai \`usage.cost\` dari tiap respons, dan perkiraan sebelum kirim memakai batas \`max_price\` yang juga dikirim ke penyedia.`,
    '',
  );

  b.push('## Pembanding eksternal', '');
  b.push('Penguji dan penilai: subagent Claude (opus) **baru**, tanpa konteks eksekutor, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d5/penguji/`); label acak. Jawaban mentah: `penguji/jawaban/`. Petunjuk sama persis dengan M2d-4, ditambah satu pertanyaan ke penguji kartu: "Adakah bagian pesan teman yang berupa penilaian (aman/bagus/pasti) yang tak bisa dicek dari kartu?".', '');
  if (x.luar.length === 0) {
    b.push('Belum ada jawaban penguji eksternal.', '');
  } else {
    b.push('| omongan | kunci | tebak di dalam | tebak di luar | benar luar | yakin benar | lolos luar | kartu luar (pilihan/kartu) | K-05 kartu | membingungkan | penilaian tak tercek |', '|---:|---|---|---|---:|---:|---|---|---|---|---|');
    for (const l of x.luar) {
      b.push(
        `| ${String(l.no)} | ${l.kunci} | ${l.tebak_dalam.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(', ')} | ${l.tebak_luar.jawaban.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(', ')} | ${String(l.tebak_luar.benar)}/3 | ${f(l.tebak_luar.yakin_benar, 0)} | ${l.tebak_luar.lolos ? 'ya' : '**tidak**'} | ` +
          `${l.kartu_luar.jawaban.map((j) => `${j.pilihan}/${j.kartu.join('+')}`).join(', ')} | ${l.kartu_luar.lolos ? 'ya' : '**tidak**'} | ${sel(l.kartu_luar.jawaban.map((j) => j.bingung).filter((z) => z.trim() !== '').map((z) => `"${z}"`).join('; ')) || '—'} | ${sel(l.kartu_luar.jawaban.map((j) => j.penilaian).filter((z) => z.trim() !== '').map((z) => `"${z}"`).join('; ')) || '—'} |`,
      );
    }
    b.push('');
    b.push(`Tebak buta luar lolos ${String(x.setuju.tebak_lolos_luar)}/${String(x.luar.length)}; jawab-dengan-kartu K-05 penuh ${String(x.setuju.kartu_lolos_luar)}/${String(x.luar.length)}; omongan dengan kalimat membingungkan ${String(x.setuju.kartu_ada_bingung)}/${String(x.luar.length)}; omongan yang ditandai memuat penilaian tak tercek ${String(x.setuju.kartu_ada_penilaian)}/${String(x.luar.length)}.`, '');
  }
  if (x.alami.length > 0) {
    b.push('### Kealamian bahasa (buta, penilai yang sama)', '', '| kelompok | sumber | rata-rata | n |', '|---|---|---:|---:|');
    for (const [k, v] of Object.entries(x.alami_rata)) b.push(`| ${k.split('_')[0] ?? ''} | ${k.split('_')[1] ?? ''} | ${f(v.rata)} | ${String(v.n)} |`);
    b.push('', '| paket | sumber | penilai | skor | alasan |', '|---|---|---|---:|---|');
    for (const a of [...x.alami].sort((p, q) => `${p.paket}${p.sumber}${p.penilai}`.localeCompare(`${q.paket}${q.sumber}${q.penilai}`))) {
      b.push(`| ${a.paket} | ${a.sumber} | ${a.penilai} | ${String(a.skor)} | ${sel(a.alasan)} |`);
    }
    b.push('');
  }

  b.push('## TIRT: M2d-3 → M2d-4 → M2d-5', '');
  const m3 = x.pembanding.m2d3;
  const m4 = x.pembanding.m2d4;
  const s5 = x.per_jalan.at(-1);
  const l5 = x.luar;
  b.push('| ukuran | M2d-3 (Featherless) | M2d-4 (Featherless) | M2d-5 (OpenRouter) |', '|---|---|---|---|');
  b.push(`| terbit | ${m3['terbit'] === true ? 'ya' : 'tidak'} (putaran ${String(m3['putaran'])}) | ${m4['terbit'] === true ? 'ya' : 'tidak'} (putaran ${String(m4['putaran'])}) | ${s5?.terbit === true ? 'ya' : 'tidak'} (putaran ${String(s5?.putaran ?? '—')}) |`);
  b.push(`| omongan dikunci | ${String(m3['omongan_dikunci'])} | ${String(m4['omongan_dikunci'])} | ${String(l5.length > 0 ? l5.length : (akhir === undefined ? 0 : omonganLolosPeran('tirt', akhir.h).length))} |`);
  b.push(`| tebak buta luar lolos (rata-rata benar) | ${String(m3['tebak_luar_lolos'])}/${String(m3['omongan_dikunci'])} (${f(m3['tebak_benar_rata'] as number | null)}) | ${String(m4['tebak_luar_lolos'])}/${String(m4['omongan_dikunci'])} (${f(m4['tebak_benar_rata'] as number | null)}) | ${String(x.setuju.tebak_lolos_luar)}/${String(l5.length)} (${f(rata(l5.map((z) => z.tebak_luar.benar)))}) |`);
  b.push(`| jawab-dengan-kartu K-05 penuh | ${String(m3['kartu_luar_lolos'])}/${String(m3['omongan_dikunci'])} | ${String(m4['kartu_luar_lolos'])}/${String(m4['omongan_dikunci'])} | ${String(x.setuju.kartu_lolos_luar)}/${String(l5.length)} |`);
  b.push(`| omongan dengan kalimat membingungkan (luar) | ${String(m3['kartu_ada_bingung'])} | ${String(m4['kartu_ada_bingung'])} | ${String(x.setuju.kartu_ada_bingung)} |`);
  b.push(`| kealamian (penilai milestone itu) | ${f(m3['alami'] as number | null)} | ${f(m4['alami'] as number | null)} | ${f(x.alami_rata['tirt_m2d5']?.rata ?? null)} |`);
  b.push(`| kealamian (penilai M2d-5 yang SAMA) | ${f(x.alami_rata['tirt_m2d3']?.rata ?? null)} | ${f(x.alami_rata['tirt_m2d4']?.rata ?? null)} | ${f(x.alami_rata['tirt_m2d5']?.rata ?? null)} |`);
  b.push(`| biaya jalan TIRT (ledger) | ${usd(Number(m3['biaya_ledger_usd'] ?? 0))} (tabel tebakan) | ${usd(Number(m4['biaya_ledger_usd'] ?? 0))} (tabel tebakan) | ${usd(s5?.biaya_ledger ?? 0)} (**nyata**) |`);
  b.push('');

  b.push('## Frasa kartu yang diperjelas (D-8) dan kasus tayang', '');
  b.push('Teks kartu paket lingkar LLM diperjelas di `factory/llm/paket.ts`. `cases/*.json` (kasus tayang) TIDAK diubah di milestone ini; frasa lama yang masih ada di kasus tayang, untuk milestone produk terpisah:', '');
  b.push('| frasa lama | masih ada di |', '|---|---|');
  for (const p of x.frasa_kartu_di_kasus_tayang) b.push(`| ${sel(p.lama)} | ${p.di_kasus.length === 0 ? '—' : p.di_kasus.map((k) => `\`cases/${k}\``).join(', ')} |`);
  b.push('');

  if (tangan.trim() !== '') b.push('## Catatan penulis', '', tangan.trim(), '');
  return b.join('\n');
}

export function ledgerUntukLaporan(): { kini: EntriLedger[]; featherless: EntriLedger[]; lama: EntriLedger[] } {
  const lama = berkasArsip(FOLDER_ARSIP_LEDGER)
    .filter((b) => b.startsWith('ledger-sampai-'))
    .flatMap((b) => bacaLedgerBerkas(`${FOLDER_ARSIP_LEDGER}/${b}`));
  return { kini: bacaLedgerBerkas(JALUR_LEDGER), featherless: bacaLedgerBerkas(JALUR_ARSIP_FEATHERLESS), lama };
}

function utama(): number {
  const { kini, featherless, lama } = ledgerUntukLaporan();
  const l = bangunLaporanTirt(kini, featherless, lama);
  writeFileSync(`${FOLDER_M2D5}/ringkasan.json`, JSON.stringify(l.ringkasan, null, 2) + '\n', 'utf8');
  writeFileSync(`${FOLDER_M2D5}/ledger-ringkas.json`, JSON.stringify(l.ledgerRingkas, null, 2) + '\n', 'utf8');
  writeFileSync(JALUR_LAPORAN, l.md, 'utf8');
  console.log('Ditulis: docs/bukti/lingkar-agen-tirt.md, eval/keluaran-m2d5/ringkasan.json, eval/keluaran-m2d5/ledger-ringkas.json.');
  for (const k of l.konsol) console.log(k);
  return 0;
}

export type { Ringkasan, OmonganLolosPeran };

if (/(^|[\\/])tirt-laporan\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
