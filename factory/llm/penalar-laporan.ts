/**
 * `npm run penalar:laporan` — tulis `docs/bukti/lingkar-agen-penalar.md` dan
 * `eval/keluaran-m2d6/{ringkasan,ledger-ringkas}.json` dari keluaran mentah
 * M2d-6 (kontrak D-8): ledger OpenRouter (biaya NYATA), data M2d-5 (temuan
 * "gerbang yang tidak berpikir"), probe, bukti penyedia, matriks kalibrasi,
 * kalibrasi kritikus, riwayat + jejak jalan TIRT, jawaban mentah penguji luar.
 * Hanya "Catatan penulis" yang ditulis tangan
 * (`eval/keluaran-m2d6/laporan-tangan.md`). Draf TIDAK dipasang ke produk.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import { GENERASI_M2D6, type HasilPeran } from './agen-peran.ts';
import { lolosKartuLuar, lolosTebakLuar } from './agen-laporan.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { ambangKembar } from './gerbang-kembar.ts';
import type { JejakAgen } from './jejak.ts';
import { jsonDari, lolosTebak } from './laporan.ts';
import { JALUR_LEDGER, FOLDER_ARSIP_LEDGER, berkasArsip, type EntriLedger } from './pagu.ts';
import { PENALAR_M2D6 } from './penalaran.ts';
import { bacaBukti } from './penalar-bukti.ts';
import { SOAL_KALIBRASI, bacaSemuaJalan, matriks, pilihSusunan, SUSUNAN_KALIBRASI } from './penalar-kalibrasi.ts';
import { JALUR_KRITIKUS_M2D6 } from './penalar-kritikus.ts';
import { FOLDER_PENGUJI_M2D6 } from './penalar-penguji.ts';
import { AWALAN_TAG_M2D6, FOLDER_M2D6, MAKS_JALAN_M2D6, PAGU_BAGIAN_M2D6, PAGU_MILESTONE_M2D6 } from './penalar-susun.ts';
import { MIN_PELANGGARAN, MIN_PORSI, PENYEDIA_DIKECUALIKAN, ringkasPenyedia } from './penyedia-bukti.ts';
import { omonganLolosPeran } from './peran-penguji.ts';
import { peranDariTag } from './peran-laporan.ts';
import type { KunciPengujiM2d5 } from './tirt-penguji.ts';
import { kelompokkan } from './tirt-laporan.ts';

const JALUR_LAPORAN = `${AKAR}docs/bukti/lingkar-agen-penalar.md`;

function baca<T>(jalur: string): T {
  return JSON.parse(readFileSync(jalur, 'utf8')) as T;
}
function median(x: readonly number[]): number | null {
  if (x.length === 0) return null;
  const s = [...x].sort((a, b) => a - b);
  const t = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[t] as number) : ((s[t - 1] as number) + (s[t] as number)) / 2;
}
function rata(x: readonly number[]): number | null {
  return x.length === 0 ? null : x.reduce((a, b) => a + b, 0) / x.length;
}
function f(n: number | null | undefined, d = 2): string {
  return n === null || n === undefined ? '—' : n.toFixed(d).replace('.', ',');
}
function usd(n: number): string {
  return `US$${n.toFixed(4)}`;
}
function sel(t: string): string {
  return t.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}
function bacaLedgerBerkas(jalur: string): EntriLedger[] {
  if (!existsSync(jalur)) return [];
  return readFileSync(jalur, 'utf8').split(/\r?\n/).filter((b) => b.trim() !== '').map((b) => JSON.parse(b) as EntriLedger);
}

/**
 * Peran pemilik biaya satu entri ledger M2d-6. Penebak dibedakan menurut
 * MODEL entri (di M2d-6 ketiga penebak GLM); tanpa model, penebak ke-3 = GLM
 * (susunan M2d-4/M2d-5). Murni.
 */
export function peranM2d6(tag: string, model?: string): string {
  if (tag.startsWith(PAGU_BAGIAN_M2D6.probe.awalanTag)) return 'probe';
  if (tag.startsWith(PAGU_BAGIAN_M2D6.kalibrasi.awalanTag)) return 'kalibrasi penebak';
  if (tag.startsWith(PAGU_BAGIAN_M2D6.kritikus.awalanTag)) return 'kalibrasi kritikus';
  const jalan = /^m2d6\/jalan-\d+\//.exec(tag);
  if (jalan === null) return 'lain';
  const t = `m2d6/${tag.slice(jalan[0].length)}`;
  const p = peranDariTag(t);
  if (p === 'penebak') {
    if (model !== undefined) return model.startsWith('z-ai/') ? 'penebak GLM' : 'penebak DeepSeek';
    return /\/t3(\/|$)/.test(t) ? 'penebak GLM' : 'penebak DeepSeek';
  }
  return p;
}

/** Peran dari tag M2d-5 (jalan TIRT saja). */
function peranM2d5(tag: string): string {
  const p = peranDariTag(tag);
  if (p === 'penebak') return /\/t3(\/|$)/.test(tag) ? 'penebak GLM' : 'penebak DeepSeek';
  return p;
}

interface Jalan {
  n: number;
  h: HasilPeran;
  j: JejakAgen;
}

export function bacaJalanM2d6(): Jalan[] {
  const hasil: Jalan[] = [];
  for (let n = 1; n <= MAKS_JALAN_M2D6; n++) {
    const d = `${FOLDER_M2D6}/jalan-${String(n)}/tirt`;
    if (!existsSync(`${d}/riwayat.json`)) continue;
    hasil.push({ n, h: baca<HasilPeran>(`${d}/riwayat.json`), j: baca<JejakAgen>(`${d}/jejak-agen.json`) });
  }
  return hasil;
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
    .map((b) => ({ penguji: b.replace('.txt', ''), isi: (jsonDari(readFileSync(`${d}/${b}`, 'utf8')) as Record<string, T[]>)[medan] ?? [] }));
}

function statPenalaran(e: readonly EntriLedger[]): { n: number; median: number | null; maks: number | null } {
  const x = e.map((z) => z.token_penalaran).filter((z): z is number => typeof z === 'number');
  return { n: x.length, median: median(x), maks: x.length === 0 ? null : Math.max(...x) };
}

export interface LaporanPenalar {
  md: string;
  ringkasan: unknown;
  ledgerRingkas: unknown;
  konsol: string[];
}

function hitung(ledgerKini: readonly EntriLedger[], ledgerFeatherless: readonly EntriLedger[]) {
  // --- A. temuan "gerbang yang tidak berpikir" (M2d-5)
  const m5 = ledgerKini.filter((e) => e.tag.startsWith('m2d5/tirt/'));
  const peran5 = ['kritikus', 'penebak GLM', 'penebak DeepSeek', 'pembaca-kartu', 'penulis'];
  const temuan5 = Object.fromEntries(peran5.map((p) => [p, statPenalaran(m5.filter((e) => peranM2d5(e.tag) === p))]));
  const riwayat5 = baca<HasilPeran>(`${AKAR}eval/keluaran-m2d5/tirt/riwayat.json`);
  const kritik5 = riwayat5.riwayat.flatMap((r) => r.omongan.filter((o) => o.kritik !== null).map((o) => o.kritik));
  const fl4 = ledgerFeatherless.filter((e) => e.tag.startsWith('m2d4/') && peranDariTag(e.tag) === 'kritikus' && typeof e.token_keluar === 'number');
  const flKritikus = { n: fl4.length, median_token_keluar: median(fl4.map((e) => e.token_keluar as number)) };
  const luar5 = baca<{ luar: Array<{ no: number; tebak_luar: { benar: number; lolos: boolean } }> }>(`${AKAR}eval/keluaran-m2d5/ringkasan.json`).luar;

  // --- B. probe
  const probe = [1, 2, 3]
    .filter((p) => existsSync(`${FOLDER_M2D6}/probe/probe-${String(p)}.json`))
    .flatMap((p) => baca<{ hasil: Array<{ tag: string; peran: string; badan: { reasoning?: { effort?: string } } | null; penyedia: string | null; token_penalaran: number | null; biaya_usd: number; catatan: string }> }>(`${FOLDER_M2D6}/probe/probe-${String(p)}.json`).hasil);

  // --- C. bukti penyedia
  const bukti = bacaBukti();
  const penyedia = ringkasPenyedia(bukti.baris);

  // --- D. kalibrasi penebak
  const jalanK = bacaSemuaJalan();
  const mat = matriks(jalanK);
  const pilihan = pilihSusunan(mat);

  // --- E. kalibrasi kritikus
  const kalKritikus = existsSync(JALUR_KRITIKUS_M2D6)
    ? baca<{ biaya_usd: number; hasil: Array<{ omongan: number; sampel: number; g_pilihan_kembar: { tolak: boolean; kembar: Array<{ a: string; b: string; kemiripan: number }> }; menjawab: boolean; tanpa_keberatan: boolean; keberatan: Array<{ jenis: string; alasan: string }>; panggilan: Array<{ penyedia: string | null; token_penalaran: number | null }> }> }>(JALUR_KRITIKUS_M2D6)
    : null;

  // --- F. jalan TIRT
  const jalan = bacaJalanM2d6();
  const potong = jalan.map((s) => s.j.selesai ?? s.j.mulai).sort().at(-1) ?? '';
  const m6 = ledgerKini.filter((e) => e.tag.startsWith(AWALAN_TAG_M2D6) && (potong === '' || e.waktu <= potong || !e.tag.startsWith(`${AWALAN_TAG_M2D6}jalan-`)));
  const perJalan = jalan.map((s) => {
    const entri = m6.filter((e) => e.tag.startsWith(`${AWALAN_TAG_M2D6}jalan-${String(s.n)}/`));
    const versi = s.h.riwayat.flatMap((r) => r.omongan.filter((o) => o.status !== 'terkunci-sebelumnya'));
    const status: Record<string, number> = {};
    for (const o of versi) status[o.status] = (status[o.status] ?? 0) + 1;
    const g = s.j.langkah.filter((l) => l.jenis === 'gerbang-g');
    const kembar = g.filter((l) => (l.rincian['pilihan_kembar'] as { tolak?: boolean } | undefined)?.tolak === true).map((l) => ({ putaran: l.putaran, no: l.omongan, kembar: (l.rincian['pilihan_kembar'] as { kembar: unknown }).kembar }));
    const kodeP: Record<string, number> = {};
    for (const o of versi.filter((x) => x.status === 'ditolak-pemeriksa')) {
      for (const k of new Set(o.umpan.map((u) => /^\[pemeriksa: ([^\],]+)/.exec(u)?.[1]).filter((x): x is string => x !== undefined))) kodeP[k] = (kodeP[k] ?? 0) + 1;
    }
    const kritik = s.h.riwayat.flatMap((r) => r.omongan.filter((o) => o.kritik !== null).map((o) => o.kritik));
    const keberatan: Record<string, number> = {};
    for (const k of kritik) for (const x of k?.keberatan ?? []) keberatan[x.jenis] = (keberatan[x.jenis] ?? 0) + 1;
    const dijaga = entri.filter((e) => e.ambang_penalaran !== undefined);
    const perModel: Record<string, { tebak: number; benar: number; tak_terbaca: number }> = {};
    for (const l of s.j.langkah.filter((x) => x.jenis === 'gerbang-tebak')) {
      for (const t of (l.rincian['tebakan'] as Array<{ model?: string; benar: boolean; terbaca: boolean }> | undefined) ?? []) {
        const m = t.model ?? '?';
        perModel[m] ??= { tebak: 0, benar: 0, tak_terbaca: 0 };
        perModel[m].tebak++;
        if (t.benar && t.terbaca) perModel[m].benar++;
        if (!t.terbaca) perModel[m].tak_terbaca++;
      }
    }
    const penulis = s.h.riwayat.flatMap((r) => r.panggilan);
    return {
      jalan: s.n,
      terbit: s.h.lolos,
      putaran: s.h.jumlah_putaran,
      berhenti: s.h.berhenti,
      dikunci: omonganLolosPeran('tirt', s.h).map((o) => ({ no: o.no, putaran: o.putaran, sudut: o.sudut })),
      sudut: s.h.sudut.map((ss, i) => ({ no: i + 1, riwayat: ss.map((c) => `${String(c.ke)}. \`${c.fact_id}\` → ${c.hasil} (${String(c.putaran_mulai)}–${String(c.putaran_akhir ?? '')})`) })),
      versi: versi.length,
      status,
      kode_pemeriksa: kodeP,
      g_pilihan_kembar: kembar,
      kritikus: { putusan: kritik.length, menjawab: kritik.filter((k) => k?.menjawab === true).length, tanpa_keberatan: kritik.filter((k) => k?.tanpa_keberatan === true).length, keberatan, penalaran: statPenalaran(entri.filter((e) => peranM2d6(e.tag, e.model) === 'kritikus')) },
      penjaga: {
        dijaga: dijaga.length,
        tidak_sah: dijaga.filter((e) => e.penalaran_sah === false).length,
        per_penyedia: kelompokkan(dijaga.filter((e) => e.penalaran_sah === false), (e) => `${e.model} · ${String(e.penyedia)}`),
        ulangan_lewati: entri.filter((e) => (e.penyedia_diabaikan ?? []).length > 0).length,
      },
      penebak_glm_penalaran: statPenalaran(entri.filter((e) => peranM2d6(e.tag, e.model) === 'penebak GLM')),
      tebak_dalam_per_model: perModel,
      penulis: { panggilan: penulis.length, terpotong: penulis.filter((p) => p.finish_reason === 'length' || p.teks_mentah.trim() === '').length, cadangan: penulis.filter((p) => !p.mode_berpikir).length },
      panggilan_ledger: entri.length,
      biaya_ledger: entri.reduce((a, e) => a + e.biaya_usd, 0),
      durasi_ms: s.j.hasil?.durasi_ms ?? 0,
    };
  });

  // --- G. biaya nyata M2d-6
  const totalM = m6.reduce((a, e) => a + e.biaya_usd, 0);
  const perPeran = kelompokkan(m6, (e) => peranM2d6(e.tag, e.model));
  const perPenyedia = kelompokkan(m6, (e) => `${e.model} · ${e.penyedia ?? '(tidak disebut)'}`);
  const dasar = kelompokkan(m6, (e) => `${e.dasar_biaya}${e.tanpa_cost === true ? ' (tanpa usage.cost)' : ''}`);

  // --- H. uji luar
  const akhir = jalan.find((s) => s.n === (existsSync(`${FOLDER_PENGUJI_M2D6}/kunci.json`) ? baca<{ jalan?: number }>(`${FOLDER_PENGUJI_M2D6}/kunci.json`).jalan : -1)) ?? jalan.at(-1);
  const lolos = akhir === undefined ? [] : omonganLolosPeran('tirt', akhir.h);
  const kunci = existsSync(`${FOLDER_PENGUJI_M2D6}/kunci.json`) ? baca<KunciPengujiM2d5>(`${FOLDER_PENGUJI_M2D6}/kunci.json`) : null;
  const tebakM = bacaJawaban<JawabanTebak>(FOLDER_PENGUJI_M2D6, 'tebak-', 'jawaban');
  const kartuM = bacaJawaban<JawabanKartu>(FOLDER_PENGUJI_M2D6, 'kartu-', 'jawaban');
  const alamiM = bacaJawaban<JawabanAlami>(FOLDER_PENGUJI_M2D6, 'alami-', 'nilai');
  const luar = kunci === null ? [] : lolos.flatMap((o) => {
    const bt = kunci.tebak.find((x) => x.no === o.no);
    const bk = kunci.kartu.find((x) => x.no === o.no);
    if (bt === undefined || bk === undefined) return [];
    const jt = tebakM.map((p) => p.isi.find((x) => x.id === bt.id)).filter((x): x is JawabanTebak => x !== undefined).map((x) => ({ pilihan: String(x.pilihan).toLowerCase(), yakin: Number(x.yakin) }));
    const nt = lolosTebak(jt, bt.kunci);
    const jk = kartuM.map((p) => p.isi.find((x) => x.id === bk.id)).filter((x): x is JawabanKartu => x !== undefined).map((x) => ({ pilihan: String(x.pilihan).toLowerCase(), kartu: (x.kartu ?? []).map(Number), bingung: x.bingung ?? '', penilaian: x.penilaian ?? '' }));
    return [{
      no: o.no, kunci: bt.kunci, tebak_dalam: o.tebak_dalam,
      tebak_luar: { jawaban: jt, benar: nt.benar, yakin_benar: nt.yakinBenar, lolos: lolosTebakLuar(jt, bt.kunci) },
      kartu_luar: { jawaban: jk, benar: jk.filter((x) => x.pilihan === bk.kunci).length, lolos: lolosKartuLuar(jk, bk.kunci, bk.penentu), penentu: bk.penentu },
    }];
  });
  const alami: Array<{ penilai: string; paket: string; sumber: string; skor: number; alasan: string }> = [];
  if (kunci !== null) {
    for (const p of alamiM) {
      for (const n of p.isi) {
        const k = kunci.alami.find((x) => x.kelompok === Number(n.kelompok));
        const sumber = k?.label[n.label];
        if (k !== undefined && sumber !== undefined) alami.push({ penilai: p.penguji, paket: k.paket, sumber, skor: Number(n.skor), alasan: n.alasan });
      }
    }
  }
  const alamiRata = (paket: string, sumber: string): number | null => rata(alami.filter((a) => a.paket === paket && a.sumber === sumber).map((a) => a.skor));
  const setuju = {
    omongan: luar.length,
    tebak_lolos: luar.filter((x) => x.tebak_luar.lolos).length,
    kartu_lolos: luar.filter((x) => x.kartu_luar.lolos).length,
    ada_bingung: luar.filter((x) => x.kartu_luar.jawaban.some((j) => j.bingung.trim() !== '')).length,
    ada_penilaian: luar.filter((x) => x.kartu_luar.jawaban.some((j) => j.penilaian.trim() !== '')).length,
  };
  const layak = akhir !== undefined && akhir.h.lolos && luar.length === 3 && setuju.tebak_lolos === 3 && setuju.kartu_lolos === 3;

  // --- I. pembanding
  const r4 = baca<{ per_simulasi: Array<{ paket: string; terbit: boolean; putaran: number; biaya_ledger: number }>; luar: Array<{ paket: string; tebak_luar: { benar: number; lolos: boolean }; kartu_luar: { lolos: boolean } }> }>(`${AKAR}eval/keluaran-m2d4/ringkasan.json`);
  const r5 = baca<{ per_jalan: Array<{ terbit: boolean; putaran: number; biaya_ledger: number }>; luar: Array<{ tebak_luar: { benar: number; lolos: boolean }; kartu_luar: { lolos: boolean } }>; biaya: { milestone_nyata_usd: number } }>(`${AKAR}eval/keluaran-m2d5/ringkasan.json`);
  const s4 = r4.per_simulasi.find((x) => x.paket === 'tirt');
  const l4 = r4.luar.filter((x) => x.paket === 'tirt');
  const s5 = r5.per_jalan.at(-1);
  const s6 = perJalan.find((x) => x.jalan === akhir?.n);
  const pembanding = {
    m2d4: { terbit: s4?.terbit ?? null, putaran: s4?.putaran ?? null, dikunci: l4.length, tebak_lolos: l4.filter((x) => x.tebak_luar.lolos).length, kartu_lolos: l4.filter((x) => x.kartu_luar.lolos).length, biaya: s4?.biaya_ledger ?? null, kritikus_keberatan: null as number | null },
    m2d5: { terbit: s5?.terbit ?? null, putaran: s5?.putaran ?? null, dikunci: r5.luar.length, tebak_lolos: r5.luar.filter((x) => x.tebak_luar.lolos).length, kartu_lolos: r5.luar.filter((x) => x.kartu_luar.lolos).length, biaya: s5?.biaya_ledger ?? null, kritikus_keberatan: kritik5.reduce((a, k) => a + (k?.keberatan.length ?? 0), 0) },
    m2d6: { terbit: s6?.terbit ?? null, putaran: s6?.putaran ?? null, dikunci: s6?.dikunci.length ?? 0, tebak_lolos: setuju.tebak_lolos, kartu_lolos: setuju.kartu_lolos, biaya: s6?.biaya_ledger ?? null, kritikus_keberatan: s6 === undefined ? null : Object.values(s6.kritikus.keberatan).reduce((a, b) => a + b, 0) },
  };

  const ringkasan = {
    setelan: { penalar: PENALAR_M2D6, ambang_pilihan_kembar: ambangKembar(), penebak: { petunjuk_sha: null, model: GENERASI_M2D6.penebak.model }, penyedia_dikecualikan: PENYEDIA_DIKECUALIKAN },
    pagu: { milestone_usd: PAGU_MILESTONE_M2D6, bagian: PAGU_BAGIAN_M2D6 },
    temuan_m2d5: { penalaran: temuan5, kritikus_putusan: kritik5.length, kritikus_keberatan: kritik5.reduce((a, k) => a + (k?.keberatan.length ?? 0), 0), featherless_m2d4_kritikus: flKritikus, luar: luar5 },
    probe: probe.map((p) => ({ tag: p.tag, peran: p.peran, effort: p.badan?.reasoning?.effort ?? null, penyedia: p.penyedia, token_penalaran: p.token_penalaran, biaya_usd: p.biaya_usd, catatan: p.catatan })),
    penyedia: penyedia.map((r) => ({ model: r.model, penyedia: r.penyedia, slug: r.slug, diperiksa: r.diperiksa, melanggar: r.melanggar, jenis: r.jenis, dikecualikan: r.dikecualikan, bukti: r.bukti })),
    kalibrasi: { matriks: mat, pilihan: pilihan?.susunan ?? null, jalan: jalanK.map((j) => ({ susunan: j.susunan, sampel: j.sampel, selesai: j.selesai, biaya_usd: j.biaya_usd, soal: j.soal.map((s) => ({ id: s.id, kelompok: s.kelompok, kunci: s.kunci, ditolak: s.ditolak, tebakan: s.tebakan.map((t) => `${t.pilihan}/${String(t.yakin)}${t.terbaca ? '' : '!'}`) })) })) },
    kalibrasi_kritikus: kalKritikus,
    per_jalan: perJalan,
    biaya: { milestone_nyata_usd: totalM, panggilan: m6.length, dipotong: potong, per_peran: perPeran, per_penyedia: perPenyedia, dasar_biaya: dasar },
    luar,
    setuju,
    layak_tayang: layak,
    alami,
    alami_rata: { tirt_m2d6: alamiRata('tirt', 'agen-m2d6'), tirt_m2d5: alamiRata('tirt', 'agen-m2d5'), tirt_m2d4: alamiRata('tirt', 'agen-m2d4'), ultj_manusia: alamiRata('ultj', 'manusia'), ultj_m2d4: alamiRata('ultj', 'agen-m2d4') },
    pembanding,
  };
  const ledgerRingkas = m6.map((e) => ({
    waktu: e.waktu, tag: e.tag, model: e.model, penyedia: e.penyedia ?? null, status: e.status, token_keluar: e.token_keluar, token_penalaran: e.token_penalaran ?? null,
    penalaran_diminta: e.penalaran_diminta ?? null, ambang_penalaran: e.ambang_penalaran ?? null, penalaran_sah: e.penalaran_sah ?? null, penyedia_diabaikan: e.penyedia_diabaikan ?? [],
    biaya_usd: e.biaya_usd, dasar_biaya: e.dasar_biaya,
  }));
  const tangan = existsSync(`${FOLDER_M2D6}/laporan-tangan.md`) ? readFileSync(`${FOLDER_M2D6}/laporan-tangan.md`, 'utf8') : '';
  const konsol = [
    `Biaya NYATA M2d-6 (ledger ${AWALAN_TAG_M2D6}*): ${usd(totalM)} dalam ${String(m6.length)} panggilan — ${Object.entries(perPeran).map(([k, v]) => `${k} ${usd(v.usd)}`).join(', ')}`,
    ...perJalan.map((s) => `  jalan ${String(s.jalan)}: ${s.terbit ? 'TERBIT' : 'TIDAK TERBIT'} (${String(s.putaran)} putaran), ${String(s.panggilan_ledger)} panggilan, ${usd(s.biaya_ledger)}`),
    `  kalibrasi: pilihan ${pilihan?.susunan ?? '-'}; uji luar: tebak ${String(setuju.tebak_lolos)}/${String(setuju.omongan)}, kartu ${String(setuju.kartu_lolos)}/${String(setuju.omongan)}; layak tayang: ${layak ? 'ya (bila nol masalah makna)' : 'TIDAK'}`,
  ];
  return { ringkasan, ledgerRingkas, konsol, akhir, tangan };
}

/** Bangun laporan M2d-6. Murni atas masukannya (dan berkas keluaran yang tersimpan). */
export function bangunLaporanPenalar(ledgerKini: readonly EntriLedger[], ledgerFeatherless: readonly EntriLedger[]): LaporanPenalar {
  const h = hitung(ledgerKini, ledgerFeatherless);
  return { md: tulis(h.ringkasan, h.akhir, h.tangan), ringkasan: h.ringkasan, ledgerRingkas: h.ledgerRingkas, konsol: h.konsol };
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

type Ringkas = ReturnType<typeof hitung>['ringkasan'];

function tulis(r: Ringkas, akhir: Jalan | undefined, tangan: string): string {
  const b: string[] = [];
  b.push('# Bukti: penalar sungguhan di lingkar agen TIRT (M2d-6)', '');
  b.push(
    'Berkas ini ditulis oleh `npm run penalar:laporan` dari keluaran mentah di `eval/keluaran-m2d6/` (probe, bukti penyedia, matriks kalibrasi, kalibrasi kritikus, riwayat dan jejak jalan TIRT, jawaban mentah penguji luar), ledger OpenRouter (biaya NYATA `usage.cost`), dan keluaran M2d-5. Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d6/laporan-tangan.md`). Draf **tidak** dipasang ke produk.',
    '',
  );

  const t = r.temuan_m2d5;
  b.push('## Temuan: gerbang yang tidak berpikir (data ledger M2d-5)', '');
  b.push('Di M2d-5 medan `reasoning.max_tokens` dikirim ke semua peran penalar, tetapi `max_tokens` penalaran hanyalah BATAS atas. Yang dilaporkan penyedia (`usage.completion_tokens_details.reasoning_tokens`, jalan TIRT M2d-5):', '');
  b.push('| peran | panggilan | penalaran median | penalaran maks |', '|---|---:|---:|---:|');
  for (const [k, v] of Object.entries(t.penalaran)) b.push(`| ${k} | ${String(v.n)} | ${f(v.median, 0)} | ${String(v.maks ?? '—')} |`);
  b.push('');
  b.push(
    `- Kritikus GLM: ${String(t.kritikus_putusan)} putusan, **${String(t.kritikus_keberatan)} keberatan**. Pembanding Featherless M2d-4: kritikus GLM ${String(t.featherless_m2d4_kritikus.n)} panggilan, token keluar median ${f(t.featherless_m2d4_kritikus.median_token_keluar, 0)} (Featherless tidak melaporkan token penalaran terpisah; keluaran kritikus hampir seluruhnya penalaran).`,
    `- Penebak GLM di M2d-5 berpikir 0–${String(t.penalaran['penebak GLM']?.maks ?? '—')} token; di uji luar ${String(t.luar.filter((x) => !x.tebak_luar.lolos).length)} dari ${String(t.luar.length)} omongan yang lolos semua gerbang di dalam tertebak penguji luar tanpa kartu.`,
    '- Gerbang yang tampak ada tetapi tidak bekerja: kritikus dan penebak GLM "menjawab", tetapi tanpa berpikir. Tidak ada gerbang yang memeriksa bukti berpikir — itu yang dibetulkan di M2d-6.',
    '',
  );

  b.push('## Metode M2d-6 (semua ditetapkan kode, `GENERASI_M2D6`)', '');
  b.push(
    `- **D-1 GLM wajib berpikir.** Kritikus dan penebak GLM meminta \`reasoning.effort: "${r.setelan.penalar.kritikus.effort}"\`; kritikus \`max_tokens\` ${String(r.setelan.penalar.kritikus.maxTokens)}, ambang ${String(r.setelan.penalar.kritikus.ambang)} token penalaran; penebak GLM \`max_tokens\` ${String(r.setelan.penalar.penebakGlm.maxTokens)}, ambang ${String(r.setelan.penalar.penebakGlm.ambang)}. Penjaga (\`penjaga-penalaran.ts\`): token penalaran di bawah ambang atau tidak dilaporkan = tidak sah → diulang sekali dengan penyedia itu di \`provider.ignore\` → bila tetap tidak sah, kritikus "tidak menjawab" / tebakan dihitung benar/100 (menolak).`,
    `- **D-2 Penyedia berdasar bukti.** \`provider.ignore\` = ${Object.entries(r.setelan.penyedia_dikecualikan).map(([m, s]) => `\`${m}\`: ${s.map((x) => `\`${x}\``).join(', ')}`).join('; ')} — diturunkan kode dari cuplikan ledger (\`eval/keluaran-m2d6/bukti-penyedia.json\`): ≥ ${String(MIN_PELANGGARAN)} pelanggaran dan ≥ ${f(MIN_PORSI)} dari panggilan yang bisa melanggar. Pagar M2d-5 lain tetap.`,
    `- **D-4 G-pilihan-kembar** di pemeriksa: dua pilihan satu omongan yang isinya sama sesudah normalisasi, atau kemiripan ≥ ${f(r.setelan.ambang_pilihan_kembar.ambang, 3)} (titik tengah antara kemiripan manusia terbesar ${f(r.setelan.ambang_pilihan_kembar.maks_manusia, 3)} — ${r.setelan.ambang_pilihan_kembar.pasangan} — dan 1) → ditolak.`,
    `- **D-3 Penebak** = susunan terpilih kalibrasi (${r.kalibrasi.pilihan ?? '—'}).`,
    '',
  );

  b.push('## Probe penalar (D-1)', '');
  b.push('Putusan: `eval/keluaran-m2d6/probe/putusan.md`.', '', '| panggilan | effort | penyedia | token penalaran | biaya | hasil |', '|---|---|---|---:|---:|---|');
  for (const p of r.probe) b.push(`| ${p.tag.replace('m2d6/probe/', '')} | ${String(p.effort)} | ${String(p.penyedia)} | ${String(p.token_penalaran)} | ${usd(p.biaya_usd)} | ${sel(p.catatan)} |`);
  b.push('');

  b.push('## Penyedia yang dikecualikan (D-2) — bukti ledger', '');
  b.push('| model · penyedia | panggilan yang bisa melanggar | pelanggaran | jenis | dikecualikan |', '|---|---:|---:|---|---|');
  for (const p of r.penyedia) b.push(`| ${p.model} · ${p.penyedia} | ${String(p.diperiksa)} | ${String(p.melanggar)} | ${p.jenis.join(', ') || '—'} | ${p.dikecualikan ? `**ya** (\`${String(p.slug)}\`)` : 'tidak'} |`);
  b.push('');
  for (const p of r.penyedia.filter((x) => x.dikecualikan)) {
    b.push(`Bukti ${p.model} · ${p.penyedia}:`, '');
    for (const x of p.bukti) b.push(`- \`${x.tag}\` (${x.waktu}): ${x.rincian}`);
    b.push('');
  }

  b.push('## Kalibrasi penebak dengan soal yang sudah diketahui (D-3)', '');
  b.push('Bocor = ditolak K-05 oleh penguji luar Opus; aman = lolos tebak buta luar. Label diturunkan dari jawaban mentah penguji luar (dites). Kriteria per soal = K-05 lingkar (≥ 2/3 benar atau rata-rata yakin yang benar ≥ 40 → ditolak). Aturan pilih: tangkap soal bocor sebanyak mungkin, lalu tolak soal aman sesedikit mungkin, lalu termurah.', '');
  b.push('| susunan | sampel | bocor ditolak | aman ditolak | biaya | ringkas |', '|---|---:|---:|---:|---:|---|');
  for (const m of r.kalibrasi.matriks) b.push(`| ${m.susunan === r.kalibrasi.pilihan ? `**${m.susunan}**` : m.susunan} | ${String(m.sampel)} | ${String(m.bocor_ditolak)}/${String(m.bocor_total)} | ${String(m.aman_ditolak)}/${String(m.aman_total)} | ${usd(m.biaya_usd)} | ${sel(m.ringkas)} |`);
  b.push('');
  b.push(`| soal | kelompok | uji luar | ${r.kalibrasi.jalan.map((j) => `${j.susunan}-s${String(j.sampel)}`).join(' | ')} |`, `|---|---|---|${r.kalibrasi.jalan.map(() => '---').join('|')}|`);
  for (const s of SOAL_KALIBRASI) {
    const sel2 = r.kalibrasi.jalan.map((j) => {
      const x = j.soal.find((z) => z.id === s.id);
      return x === undefined ? '—' : `${x.ditolak ? '**tolak**' : 'lolos'} (${x.tebakan.join(' ')})`;
    });
    b.push(`| ${s.id} (kunci ${r.kalibrasi.jalan[0]?.soal.find((z) => z.id === s.id)?.kunci ?? '?'}) | ${s.kelompok} | ${s.luar} | ${sel2.join(' | ')} |`);
  }
  b.push('', `Pilihan aturan: **${r.kalibrasi.pilihan ?? '—'}**. Susunan: ${SUSUNAN_KALIBRASI.map((s) => `${s.id} = ${s.ringkas}`).join('; ')}. \`!\` = tebakan tak terbaca/tidak terbukti berpikir (dihitung benar/100).`, '');

  b.push('## Kalibrasi kritikus (D-5)', '');
  if (r.kalibrasi_kritikus === null) {
    b.push('Belum dijalankan.', '');
  } else {
    b.push(`Kritikus M2d-6 atas draf TIRT M2d-5 (terbit, gagal uji luar), ${usd(r.kalibrasi_kritikus.biaya_usd)}:`, '', '| omongan | sampel | G-pilihan-kembar | kritikus | penalaran (penyedia) |', '|---:|---:|---|---|---|');
    for (const h of r.kalibrasi_kritikus.hasil) {
      b.push(`| ${String(h.omongan)} | ${String(h.sampel)} | ${h.g_pilihan_kembar.tolak ? `**menolak** (${h.g_pilihan_kembar.kembar.map((k) => `${k.a}–${k.b}`).join(', ')})` : 'lolos'} | ${h.menjawab ? (h.tanpa_keberatan ? 'tanpa keberatan' : sel(h.keberatan.map((k) => `[${k.jenis}] ${k.alasan}`).join(' / '))) : '**tidak menjawab**'} | ${h.panggilan.map((p) => `${String(p.token_penalaran)} (${String(p.penyedia)})`).join(', ')} |`);
    }
    b.push('');
  }

  b.push('## Hasil TIRT (D-6)', '');
  b.push('| jalan | hasil | putaran | versi diperiksa | omongan dikunci | panggilan | biaya NYATA | waktu |', '|---:|---|---:|---:|---:|---:|---:|---:|');
  for (const s of r.per_jalan) b.push(`| ${String(s.jalan)} | ${s.terbit ? '**terbit**' : `tidak terbit (${sel(String(s.berhenti))})`} | ${String(s.putaran)} | ${String(s.versi)} | ${String(s.dikunci.length)} | ${String(s.panggilan_ledger)} | ${usd(s.biaya_ledger)} | ${f(s.durasi_ms / 60000, 1)} menit |`);
  b.push('');
  for (const s of r.per_jalan) {
    b.push(`### Jalan ${String(s.jalan)}`, '');
    for (const ss of s.sudut) b.push(`- omongan ${String(ss.no)}: ${ss.riwayat.join('; ')}`);
    b.push(
      `- Status per versi: ${Object.entries(s.status).map(([k, v]) => `${k} ${String(v)}`).join(', ')}.`,
      `- Penolakan pemeriksa per kode: ${Object.entries(s.kode_pemeriksa).map(([k, v]) => `${k} ${String(v)}`).join(', ') || '—'}; G-pilihan-kembar menolak ${String(s.g_pilihan_kembar.length)} versi.`,
      `- Kritikus: ${String(s.kritikus.putusan)} putusan, menjawab ${String(s.kritikus.menjawab)}, tanpa keberatan ${String(s.kritikus.tanpa_keberatan)}; keberatan per jenis: ${Object.entries(s.kritikus.keberatan).map(([k, v]) => `${k} ${String(v)}`).join(', ') || '—'}; penalaran median ${f(s.kritikus.penalaran.median, 0)} (maks ${String(s.kritikus.penalaran.maks ?? '—')}).`,
      `- Penjaga penalaran: ${String(s.penjaga.dijaga)} panggilan dijaga, ${String(s.penjaga.tidak_sah)} tidak sah (${Object.entries(s.penjaga.per_penyedia).map(([k, v]) => `${k} ${String(v.panggilan)}`).join(', ') || '—'}); ulangan yang melewati penyedia: ${String(s.penjaga.ulangan_lewati)}. Penebak GLM: penalaran median ${f(s.penebak_glm_penalaran.median, 0)}.`,
      `- Penebak di dalam (benar tanpa kartu / tebakan): ${Object.entries(s.tebak_dalam_per_model).map(([m, v]) => `\`${m}\` ${String(v.benar)}/${String(v.tebak)}${v.tak_terbaca > 0 ? ` (+${String(v.tak_terbaca)} tak terbaca)` : ''}`).join(', ') || '—'}.`,
      `- Penulis: ${String(s.penulis.panggilan)} panggilan, terpotong/kosong ${String(s.penulis.terpotong)}, cadangan ${String(s.penulis.cadangan)}.`,
      '',
    );
  }
  b.push('### Draf', '');
  if (akhir !== undefined) {
    if (akhir.h.lolos && akhir.h.draf !== null) {
      b.push(`Jalan ${String(akhir.n)}: TIRT **terbit** — draf utuh apa adanya (tidak disunting tangan):`, '');
      akhir.h.draf.omongan.forEach((o, i) => b.push(`**Omongan ${String(i + 1)}**`, '', ...tulisOmongan(o)));
      b.push('```json', JSON.stringify(akhir.h.draf, null, 2), '```', '');
    } else {
      const l = omonganLolosPeran('tirt', akhir.h);
      b.push(`Jalan ${String(akhir.n)}: TIRT tidak terbit; omongan yang dikunci (${String(l.length)}):`, '');
      for (const o of l) b.push(`**Omongan ${String(o.no)}** (dikunci di putaran ${String(o.putaran)}, sudut \`${o.sudut}\`)`, '', ...tulisOmongan(o.omongan));
    }
  }

  b.push('## Uji luar (D-7)', '');
  b.push('Penguji dan penilai: subagent Claude (opus) **baru**, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d6/penguji/`); label acak; dijalankan sinkron. Jawaban mentah: `penguji/jawaban/`. Petunjuk sama dengan M2d-5 D-10.', '');
  if (r.luar.length === 0) {
    b.push('Belum ada jawaban penguji luar.', '');
  } else {
    b.push('| omongan | kunci | tebak di dalam | tebak di luar | lolos luar | kartu luar (pilihan/kartu) | K-05 kartu | membingungkan | penilaian tak tercek |', '|---:|---|---|---|---|---|---|---|---|');
    for (const l of r.luar) {
      b.push(
        `| ${String(l.no)} | ${l.kunci} | ${l.tebak_dalam.map((x) => `${x.pilihan}/${String(x.yakin)}`).join(', ')} | ${l.tebak_luar.jawaban.map((x) => `${x.pilihan}/${String(x.yakin)}`).join(', ')} | ${l.tebak_luar.lolos ? 'ya' : '**tidak**'} | ` +
          `${l.kartu_luar.jawaban.map((j) => `${j.pilihan}/${j.kartu.join('+')}`).join(', ')} | ${l.kartu_luar.lolos ? 'ya' : '**tidak**'} | ${sel(l.kartu_luar.jawaban.map((j) => j.bingung).filter((z) => z.trim() !== '').map((z) => `"${z}"`).join('; ')) || '—'} | ${sel(l.kartu_luar.jawaban.map((j) => j.penilaian).filter((z) => z.trim() !== '').map((z) => `"${z}"`).join('; ')) || '—'} |`,
      );
    }
    b.push('', `Tebak buta luar lolos ${String(r.setuju.tebak_lolos)}/${String(r.setuju.omongan)}; jawab-dengan-kartu K-05 ${String(r.setuju.kartu_lolos)}/${String(r.setuju.omongan)}; kalimat membingungkan di ${String(r.setuju.ada_bingung)} omongan; penilaian tak tercek di ${String(r.setuju.ada_penilaian)} omongan.`, '');
    b.push(`**Syarat layak tayang (pemilik): terbit + tebak buta luar lolos semua omongan + jawab-dengan-kartu lolos + nol masalah makna → ${r.layak_tayang ? 'tiga syarat terukur terpenuhi (masalah makna: lihat catatan penulis)' : '**TIDAK terpenuhi**'}.**`, '');
  }
  if (r.alami.length > 0) {
    b.push('### Kealamian bahasa (buta, penilai yang sama)', '', '| kelompok · sumber | rata-rata |', '|---|---:|');
    for (const [k, v] of Object.entries(r.alami_rata)) b.push(`| ${k.replace('_', ' · ')} | ${f(v)} |`);
    b.push('', '| paket | sumber | penilai | skor | alasan |', '|---|---|---|---:|---|');
    for (const a of [...r.alami].sort((p, q) => `${p.paket}${p.sumber}${p.penilai}`.localeCompare(`${q.paket}${q.sumber}${q.penilai}`))) b.push(`| ${a.paket} | ${a.sumber} | ${a.penilai} | ${String(a.skor)} | ${sel(a.alasan)} |`);
    b.push('');
  }

  b.push('## Biaya NYATA M2d-6 (OpenRouter, `usage.cost`)', '');
  b.push(`Entri ledger bertag \`m2d6/\`: **${usd(r.biaya.milestone_nyata_usd)} dalam ${String(r.biaya.panggilan)} panggilan**, dari pagu milestone US$${PAGU_MILESTONE_M2D6.toFixed(2)} (ditegakkan kode).`, '');
  b.push('| peran | panggilan | token keluar | biaya nyata |', '|---|---:|---:|---:|');
  for (const [k, v] of Object.entries(r.biaya.per_peran).sort()) b.push(`| ${k} | ${String(v.panggilan)} | ${String(v.token_keluar)} | ${usd(v.usd)} |`);
  b.push('', '| model · penyedia yang melayani | panggilan | biaya nyata |', '|---|---:|---:|');
  for (const [k, v] of Object.entries(r.biaya.per_penyedia).sort((a, c) => c[1].usd - a[1].usd)) b.push(`| ${k} | ${String(v.panggilan)} | ${usd(v.usd)} |`);
  b.push('', '| dasar biaya | panggilan | biaya |', '|---|---:|---:|');
  for (const [k, v] of Object.entries(r.biaya.dasar_biaya).sort()) b.push(`| ${k} | ${String(v.panggilan)} | ${usd(v.usd)} |`);
  b.push('');

  b.push('## TIRT: M2d-4 → M2d-5 → M2d-6', '');
  const p = r.pembanding;
  const ya = (x: boolean | null): string => (x === null ? '—' : x ? 'ya' : 'tidak');
  b.push('| ukuran | M2d-4 (Featherless) | M2d-5 (OpenRouter) | M2d-6 (penalar) |', '|---|---|---|---|');
  b.push(`| terbit (putaran) | ${ya(p.m2d4.terbit)} (${String(p.m2d4.putaran)}) | ${ya(p.m2d5.terbit)} (${String(p.m2d5.putaran)}) | ${ya(p.m2d6.terbit)} (${String(p.m2d6.putaran)}) |`);
  b.push(`| omongan dikunci | ${String(p.m2d4.dikunci)} | ${String(p.m2d5.dikunci)} | ${String(p.m2d6.dikunci)} |`);
  b.push(`| tebak buta luar lolos | ${String(p.m2d4.tebak_lolos)}/${String(p.m2d4.dikunci)} | ${String(p.m2d5.tebak_lolos)}/${String(p.m2d5.dikunci)} | ${String(p.m2d6.tebak_lolos)}/${String(r.setuju.omongan)} |`);
  b.push(`| jawab-dengan-kartu K-05 | ${String(p.m2d4.kartu_lolos)}/${String(p.m2d4.dikunci)} | ${String(p.m2d5.kartu_lolos)}/${String(p.m2d5.dikunci)} | ${String(p.m2d6.kartu_lolos)}/${String(r.setuju.omongan)} |`);
  b.push(`| keberatan kritikus (jalan) | — | ${String(p.m2d5.kritikus_keberatan)} | ${String(p.m2d6.kritikus_keberatan ?? '—')} |`);
  b.push(`| biaya jalan TIRT | ${usd(p.m2d4.biaya ?? 0)} (tabel tebakan; tagihan ±1,88×) | ${usd(p.m2d5.biaya ?? 0)} (nyata) | ${usd(p.m2d6.biaya ?? 0)} (nyata) |`);
  b.push(`| kealamian TIRT (penilai M2d-6 yang sama) | ${f(r.alami_rata['tirt_m2d4'])} | ${f(r.alami_rata['tirt_m2d5'])} | ${f(r.alami_rata['tirt_m2d6'])} |`);
  b.push('');

  if (tangan.trim() !== '') b.push('## Catatan penulis', '', tangan.trim(), '');
  return b.join('\n');
}

export function ledgerUntukLaporanPenalar(): { kini: EntriLedger[]; featherless: EntriLedger[] } {
  return {
    kini: bacaLedgerBerkas(JALUR_LEDGER),
    featherless: berkasArsip(FOLDER_ARSIP_LEDGER).flatMap((a) => bacaLedgerBerkas(`${FOLDER_ARSIP_LEDGER}/${a}`)),
  };
}

function utama(): number {
  const { kini, featherless } = ledgerUntukLaporanPenalar();
  const l = bangunLaporanPenalar(kini, featherless);
  writeFileSync(JALUR_LAPORAN, l.md, 'utf8');
  writeFileSync(`${FOLDER_M2D6}/ringkasan.json`, JSON.stringify(l.ringkasan, null, 2) + '\n', 'utf8');
  writeFileSync(`${FOLDER_M2D6}/ledger-ringkas.json`, JSON.stringify(l.ledgerRingkas, null, 2) + '\n', 'utf8');
  for (const k of l.konsol) console.log(k);
  console.log(`Ditulis: ${JALUR_LAPORAN.replace(AKAR, '')}`);
  return 0;
}

if (/(^|[\\/])penalar-laporan\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
