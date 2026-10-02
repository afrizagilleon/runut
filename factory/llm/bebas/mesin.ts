/**
 * Mesin penulis bebas M2d-13 (pra-registrasi `docs/bukti/m2d13-praregistrasi.md`
 * §3–§5): satu model penulis (Opus 5.5 / Haiku 4.5 / DeepSeek), TANPA
 * penyempurna, gerbang M2d-11 persis + aturan angka-di-kartu + label &
 * umpan balik struktural.
 *
 * Alur satu jalan:
 * - versi 1: satu panggilan menulis ketiga omongan;
 * - tiap omongan diperiksa sendiri: kode (gratis) → tebak rotasi 24 → pembaca
 *   kartu r0+r2 → kritikus GLM tingkat 1 (tidak menjawab → sekali lagi);
 * - versi 2 dan 3: satu panggilan per putaran menulis ulang SEMUA omongan
 *   yang ditolak (versi ditolak + alasan gerbang); yang lulus = konteks;
 * - maks 3 versi per omongan; tanpa henti dini; keluaran tak terbaca diulang
 *   sekali, tetap gagal = "tulis-gagal" (versi terpakai);
 * - ketiganya lulus → validator seluruh draf sekali.
 */
import type { DrafSimulasi, OmonganDraf } from '../draf.ts';
import { AMBANG_M2D11 } from '../cacat/ambang.ts';
import { deteksi, menolak } from '../cacat/detektor.ts';
import { gArtefak } from '../gerbang-artefak.ts';
import { gerbangG } from '../gerbang-g.ts';
import { gerbangGaya } from '../gerbang-gaya.ts';
import { gKembar } from '../gerbang-kembar.ts';
import { gMirip } from '../gerbang-mirip.ts';
import { gPenilaian } from '../gerbang-penilaian.ts';
import type { PencatatJejak } from '../jejak.ts';
import { GENERASI_M2D8, SETELAN_KALIBRASI_M2D8 } from '../kalibrasi-susun.ts';
import { KODE_PELINDUNG } from '../kalibrasi-setelan.ts';
import { validasiM2d8 } from '../kalibrasi-soal.ts';
import { umpanKritik, type PutusanKritik } from '../kritikus.ts';
import { MODEL_OR_DEEPSEEK, type ModelOpenRouter } from '../model.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { periksaRujukanHuruf } from '../posisi-kunci.ts';
import { kartuRotasi, tebakRotasi, type KartuRotasi } from '../rotasi/jalan.ts';
import type { JawabanRotasi, PutusanRotasi } from '../rotasi/rotasi.ts';
import type { SetelanPanggil } from '../susun.ts';
import { bocorKalender } from '../templat/a2.ts';
import { kritikusMakna, kritikusMenolakTemplat } from '../templat/gerbang.ts';
import { lokasiDetektor } from '../templat/kode.ts';
import { SETELAN_TEMPLAT_M2D11 } from '../templat/m2d11.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { dariG, dariGaya, dariHuruf, dariKembar, dariMeresmikan, dariValidator, isiLokasi, type UmpanMentah } from '../umpan-terarah.ts';
import { angkaDiKartu } from './angka-kartu.ts';
import { pesanRevisi, pesanVersi1, sha256, uraiKeluaranBebas, type Ditolak } from './prompt.ts';
import { drafDari, type OmonganBebas } from './skema.ts';
import { periksaLabel, periksaSalin, periksaSudut, periksaUmpanBalik } from './struktur.ts';

export const MAKS_VERSI_BEBAS = 3;

/** Setelan penulis, sama untuk ketiga model (pra-registrasi §3). */
export const SETELAN_PENULIS_BEBAS: SetelanPanggil = { suhu: 1, maxTokens: 8_000, tambahanBadan: { reasoning: { effort: 'low' } } };

export type BerhentiBebas = 'kode' | 'penebak' | 'kartu' | 'kritikus' | 'lolos' | 'tulis-gagal' | 'pagu' | 'galat';

export interface MasalahKodeBebas {
  sumber: string;
  alasan: string;
}

export interface PanggilanPenulis {
  versi: number;
  diminta: number[];
  ulang: number;
  model: string;
  token_masuk: number;
  token_keluar: number;
  token_penalaran: number | null;
  penyedia: string | null;
  finish_reason: string | null;
  biaya_usd: number;
  terbaca: number[];
  masalah: string[];
  sha256_prompt: string;
}

export interface VersiBebas {
  no: number;
  versi: number;
  berhenti: BerhentiBebas;
  alasan: string[];
  dicatat: string[];
  omongan: OmonganBebas | null;
  rotasi: { jawaban: JawabanRotasi[]; putusan: PutusanRotasi; biaya_usd: number } | null;
  kartu_rotasi: { per_rotasi: Array<Omit<KartuRotasi, 'putusan'>>; lulus: boolean } | null;
  kritik: Pick<PutusanKritik, 'menjawab' | 'tanpa_keberatan' | 'keberatan' | 'arahan'> & { token_penalaran: Array<number | null> } | null;
  biaya_gerbang_usd: number;
}

export interface HasilBebas {
  penulis: string;
  terbit: boolean;
  berhenti: string | null;
  tersensor: boolean;
  versi: VersiBebas[];
  panggilan_penulis: PanggilanPenulis[];
  /** Omongan yang lulus (versi lulus). */
  lulus: Array<{ no: number; versi: number; omongan: OmonganBebas }>;
  /** Versi akhir terbaca tiap omongan (lulus atau tidak). */
  akhir: Array<{ no: number; versi: number; lulus: boolean; omongan: OmonganBebas } | null>;
  validasi_draf: string[];
  draf: DrafSimulasi | null;
  sha256_prompt_sistem: string;
}

export interface OpsiBebas {
  paket: PaketFakta;
  penulis: ModelOpenRouter;
  panggil: PanggilTemplat;
  jejak?: PencatatJejak;
  jam?: () => Date;
}

const jumlah = <T>(x: readonly T[], f: (y: T) => number): number => x.reduce((a, y) => a + f(y), 0);
const teksGalat = (g: unknown): string => (g instanceof Error ? `${g.name}: ${g.message}` : 'galat tak dikenal');

/** Pemeriksaan kode (gerbang 1, pra-registrasi §4). Murni. */
export function periksaKodeBebas(no: number, o: OmonganBebas, paket: PaketFakta, semua: ReadonlyArray<OmonganBebas | null>, lulus: ReadonlySet<number>): { menolak: MasalahKodeBebas[]; dicatat: MasalahKodeBebas[] } {
  const d = drafDari(o);
  const semuaM: MasalahKodeBebas[] = [];
  const umpan: UmpanMentah[] = [
    ...dariValidator(validasiM2d8({ omongan: [d] }, paket).filter((m) => m.omongan !== null), d),
    ...dariG(gerbangG(d), d),
    ...dariGaya(gerbangGaya(d), d),
    ...dariHuruf(periksaRujukanHuruf(d), d),
    ...dariKembar(gKembar(d.pilihan), d),
    ...gPenilaian(d.pesan).alasan.map((x) => ({ lokasi: 'pesan' as const, sumber: 'pemeriksa: G-penilaian', teramati: d.pesan, alasan: x })),
  ];
  const gabung = semua.map((x) => (x === null ? null : drafDari(x)));
  for (const x of gMirip(no, gabung, lulus).alasan) umpan.push({ lokasi: `pilihan-${d.kunci}`, sumber: 'pemeriksa: G-mirip', teramati: isiLokasi(d, `pilihan-${d.kunci}`), alasan: x });
  const art = gArtefak(d, GENERASI_M2D8.ambang);
  umpan.push(...dariMeresmikan(art.meresmikan.alasan, d));
  for (const x of art.keseimbangan.alasan) umpan.push({ lokasi: `pilihan-${d.kunci}`, sumber: 'gerbang artefak: keseimbangan', teramati: isiLokasi(d, `pilihan-${d.kunci}`), alasan: x });
  const sudah = new Set<string>();
  for (const u of umpan) {
    const k = `${u.sumber}|${u.alasan}`;
    if (sudah.has(k)) continue;
    sudah.add(k);
    semuaM.push({ sumber: u.sumber, alasan: u.alasan });
  }
  for (const m of bocorKalender(d, paket)) semuaM.push({ sumber: 'A-2: kalender', alasan: m });
  for (const b of menolak(deteksi({ pesan: d.pesan, pilihan: d.pilihan, kunci: d.kunci }, AMBANG_M2D11))) semuaM.push({ sumber: `detektor ${b.kode} (${b.nama}; ${lokasiDetektor(b.kode)})`, alasan: `${b.alasan}; opsi ${b.opsi.join(', ')}` });
  for (const m of angkaDiKartu(o)) semuaM.push({ sumber: 'M2d-13: angka-di-kartu', alasan: m });
  for (const m of periksaLabel(o)) semuaM.push({ sumber: 'M2d-13: label pengecoh', alasan: m });
  for (const m of periksaUmpanBalik(o)) semuaM.push({ sumber: 'M2d-13: umpan balik', alasan: m });
  for (const m of periksaSudut(no, semua)) semuaM.push({ sumber: 'M2d-13: sudut', alasan: m });
  for (const m of periksaSalin(o)) semuaM.push({ sumber: 'anti-salin', alasan: m });
  const turun = (m: MasalahKodeBebas): boolean => {
    const kode = m.sumber.startsWith('pemeriksa: ') ? m.sumber.slice('pemeriksa: '.length) : null;
    return kode !== null && SETELAN_KALIBRASI_M2D8.kode_dicatat.includes(kode) && !KODE_PELINDUNG.includes(kode);
  };
  return { menolak: semuaM.filter((m) => !turun(m)), dicatat: semuaM.filter(turun) };
}

export async function jalankanBebas(opsi: OpsiBebas): Promise<HasilBebas> {
  const { paket, penulis, panggil } = opsi;
  const jam = opsi.jam ?? (() => new Date());
  const sistem = pesanVersi1(paket)[0]?.content ?? '';
  const hasil: HasilBebas = {
    penulis, terbit: false, berhenti: null, tersensor: false, versi: [], panggilan_penulis: [], lulus: [], akhir: [null, null, null], validasi_draf: [], draf: null,
    sha256_prompt_sistem: sha256(sistem),
  };
  const catat = (l: Parameters<PencatatJejak['catat']>[0]): void => {
    opsi.jejak?.catat(l);
  };
  const terkini: Array<OmonganBebas | null> = [null, null, null];
  const lulus = new Set<number>();
  const ditolak = new Map<number, Ditolak>();
  let versiTerakhir = 0;

  try {
    for (let v = 1; v <= MAKS_VERSI_BEBAS; v++) {
      const diminta = v === 1 ? [1, 2, 3] : [1, 2, 3].filter((n) => !lulus.has(n));
      if (diminta.length === 0) break;
      versiTerakhir = v;
      // --- penulis (satu panggilan; tak terbaca → diulang sekali)
      let keluaran = new Map<number, OmonganBebas>();
      for (let ulang = 0; ulang < 2; ulang++) {
        const kurang = diminta.filter((n) => !keluaran.has(n));
        if (kurang.length === 0) break;
        const pesan =
          v === 1 && kurang.length === 3
            ? pesanVersi1(paket)
            : pesanRevisi(
                paket,
                [...lulus].sort().map((n) => ({ no: n, omongan: terkini[n - 1] as OmonganBebas })),
                kurang.map((n) => ditolak.get(n) ?? { no: n, omongan: null, alasan: v === 1 ? ['(versi pertama tidak terbaca; tulis omongan ini)'] : ['(tidak ada catatan)'] }),
              );
        const mulai = jam().toISOString();
        const j = await panggil(pesan, SETELAN_PENULIS_BEBAS, { jenis: 'tulis-bebas', putaran: v, omongan: null, ke: 1, ...(ulang > 0 ? { ulang } : {}), peran: 'penulis', model: penulis });
        const u = uraiKeluaranBebas(j.teks, kurang);
        for (const [n, o] of u.omongan) keluaran.set(n, o);
        const p: PanggilanPenulis = {
          versi: v, diminta: kurang, ulang, model: penulis, token_masuk: j.token_masuk, token_keluar: j.token_keluar, token_penalaran: j.token_penalaran ?? null,
          penyedia: j.penyedia ?? null, finish_reason: j.finish_reason, biaya_usd: j.biaya_usd, terbaca: [...u.omongan.keys()], masalah: u.masalah, sha256_prompt: sha256(pesan.map((x) => x.content).join('\n')),
        };
        hasil.panggilan_penulis.push(p);
        catat({
          putaran: v, jenis: v === 1 ? 'susun' : 'tulis-ulang', omongan: null, waktu_mulai: mulai, waktu_selesai: jam().toISOString(), model: penulis, panggilan: 1,
          token_masuk: j.token_masuk, token_keluar: j.token_keluar, biaya_usd: j.biaya_usd, putusan: u.masalah.length === 0 ? 'ditulis' : 'galat', alasan: u.masalah, sha256_prompt: p.sha256_prompt,
          rincian: { diminta: kurang, terbaca: p.terbaca, token_penalaran: p.token_penalaran, penyedia: p.penyedia, finish_reason: p.finish_reason, ulang },
          peran: 'penulis',
        });
      }
      for (const n of diminta) {
        const o = keluaran.get(n);
        if (o === undefined) {
          hasil.versi.push({ no: n, versi: v, berhenti: 'tulis-gagal', alasan: ['keluaran penulis tak terbaca dua kali'], dicatat: [], omongan: null, rotasi: null, kartu_rotasi: null, kritik: null, biaya_gerbang_usd: 0 });
          ditolak.set(n, { no: n, omongan: ditolak.get(n)?.omongan ?? null, alasan: ['keluaranmu untuk omongan ini tidak terbaca atau tidak ada; tulis lengkap sesuai bentuk JSON'] });
        } else terkini[n - 1] = o;
      }
      keluaran = new Map([...keluaran].filter(([n]) => diminta.includes(n)));
      // --- gerbang per omongan
      for (const no of diminta) {
        const o = keluaran.get(no);
        if (o === undefined) continue;
        const cv: VersiBebas = { no, versi: v, berhenti: 'galat', alasan: [], dicatat: [], omongan: o, rotasi: null, kartu_rotasi: null, kritik: null, biaya_gerbang_usd: 0 };
        hasil.versi.push(cv);
        const tolak = (b: BerhentiBebas, alasan: string[]): void => {
          cv.berhenti = b;
          cv.alasan = alasan;
          ditolak.set(no, { no, omongan: o, alasan });
        };
        // 1. kode
        const mk = jam().toISOString();
        const kode = periksaKodeBebas(no, o, paket, terkini, lulus);
        cv.dicatat.push(...kode.dicatat.map((m) => `${m.sumber} (dicatat): ${m.alasan}`));
        catat({
          putaran: v, jenis: 'validator', omongan: no, waktu_mulai: mk, waktu_selesai: jam().toISOString(), model: null, panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0,
          putusan: kode.menolak.length === 0 ? 'lolos' : 'tolak', alasan: kode.menolak.map((m) => `${m.sumber}: ${m.alasan}`).slice(0, 40), sha256_prompt: null, rincian: { dicatat: kode.dicatat }, peran: 'pemeriksa',
        });
        if (kode.menolak.length > 0) {
          tolak('kode', kode.menolak.map((m) => `${m.sumber}: ${m.alasan}`));
          continue;
        }
        const d = drafDari(o);
        // 2. tebak rotasi
        const mr = jam().toISOString();
        const tr = await tebakRotasi(d, { panggil, putaran: v, omongan: no });
        cv.rotasi = tr;
        cv.biaya_gerbang_usd += tr.biaya_usd;
        const pr = tr.putusan;
        const ringkasIsi = (['pilihan-saja', 'pesan-pilihan'] as const)
          .map((kd) => `${kd}: ${pr.kondisi[kd].per_model.map((m) => `${m.model.split('/')[1] ?? m.model} isi ${m.isi_konsisten === null ? '-' : `opsi asal ${'abcd'[m.isi_konsisten] ?? '?'}`}${m.diabaikan ? ' (diabaikan)' : ''}`).join(', ')}`)
          .join('; ');
        const alasanR = `tebak rotasi ${pr.putusan}: ${pr.alasan.join('; ')} [${ringkasIsi}] — kunci = pilihan ${d.kunci}; tanpa kartu, penebak memilih isi kunci terlalu sering`;
        catat({
          putaran: v, jenis: 'gerbang-tebak', omongan: no, waktu_mulai: mr, waktu_selesai: jam().toISOString(), model: 'haiku + deepseek + glm (rotasi)',
          panggilan: jumlah(tr.jawaban, (x) => x.panggilan), token_masuk: 0, token_keluar: 0, biaya_usd: tr.biaya_usd, putusan: pr.putusan === 'lulus' ? 'lolos' : 'tolak', alasan: [alasanR], sha256_prompt: null,
          rincian: { kunci: d.kunci, putusan: pr.putusan }, peran: 'penebak',
        });
        if (pr.putusan !== 'lulus') {
          tolak('penebak', [alasanR]);
          continue;
        }
        // 3. pembaca kartu r0 + r2
        const mkt = jam().toISOString();
        const kr2 = await kartuRotasi(d, paket, { panggil, putaran: v, omongan: no });
        cv.kartu_rotasi = { per_rotasi: kr2.per_rotasi.map(({ putusan: _p, ...x }) => x), lulus: kr2.lulus };
        const biayaK = jumlah(kr2.per_rotasi, (x) => x.biaya_usd);
        cv.biaya_gerbang_usd += biayaK;
        const alasanK2 = kr2.per_rotasi.map((x) => `r${String(x.r)}: memilih ${String(x.pilihan)} (kunci ${x.kunci})${x.benar ? '' : ` — ${x.alasan}`}`).join('; ');
        for (const x of kr2.per_rotasi) if (x.bingung.length > 0) cv.dicatat.push(`pembaca kartu r${String(x.r)} bingung: ${x.bingung.map((b) => `"${b}"`).join('; ')}`);
        catat({
          putaran: v, jenis: 'gerbang-kartu', omongan: no, waktu_mulai: mkt, waktu_selesai: jam().toISOString(), model: MODEL_OR_DEEPSEEK,
          panggilan: jumlah(kr2.per_rotasi, (x) => x.putusan.panggilan.length), token_masuk: 0, token_keluar: 0, biaya_usd: biayaK, putusan: kr2.lulus ? 'lolos' : 'tolak',
          alasan: [`pembaca kartu 2 rotasi: ${alasanK2}`], sha256_prompt: null, rincian: { kunci: d.kunci, per_rotasi: cv.kartu_rotasi.per_rotasi }, peran: 'pembaca-kartu',
        });
        if (!kr2.lulus) {
          tolak('kartu', [`pembaca yang memegang kartu tidak memilih kunci di kedua rotasi (pilihan diputar): ${alasanK2}`]);
          continue;
        }
        // 4. kritikus GLM
        const mkr = jam().toISOString();
        const kartu0 = kr2.per_rotasi[0]?.putusan ?? null;
        let kr = await kritikusMakna(d, paket, kartu0, panggil, v, no);
        if (!kr.menjawab) {
          cv.dicatat.push(`kritikus tidak menjawab (${kr.keberatan[0]?.alasan ?? '-'}); diperiksa sekali lagi`);
          const ulang = await kritikusMakna(d, paket, kartu0, panggil, v, no);
          kr = { ...ulang, panggilan: [...kr.panggilan, ...ulang.panggilan] };
        }
        const biayaR = jumlah(kr.panggilan, (x) => x.biaya_usd);
        cv.biaya_gerbang_usd += biayaR;
        cv.kritik = { menjawab: kr.menjawab, tanpa_keberatan: kr.tanpa_keberatan, keberatan: kr.keberatan, arahan: kr.arahan, token_penalaran: kr.panggilan.map((x) => x.token_penalaran ?? null) };
        const tolakR = kritikusMenolakTemplat(kr, SETELAN_TEMPLAT_M2D11.kritikus);
        if (!tolakR && !kr.tanpa_keberatan) cv.dicatat.push(...umpanKritik(kr).map((a) => `kritikus (dicatat): ${a}`));
        catat({
          putaran: v, jenis: 'kritikus', omongan: no, waktu_mulai: mkr, waktu_selesai: jam().toISOString(), model: 'z-ai/glm-5.3', panggilan: kr.panggilan.length,
          token_masuk: jumlah(kr.panggilan, (x) => x.token_masuk), token_keluar: jumlah(kr.panggilan, (x) => x.token_keluar), biaya_usd: biayaR, putusan: tolakR ? 'tolak' : 'lolos',
          alasan: kr.tanpa_keberatan ? ['kritikus tidak keberatan'] : umpanKritik(kr), sha256_prompt: null, rincian: { menjawab: kr.menjawab, keberatan: kr.keberatan, arahan: kr.arahan }, peran: 'kritikus',
        });
        if (tolakR) {
          tolak('kritikus', kr.menjawab ? umpanKritik(kr) : ['kritikus tidak menjawab (dua kali)']);
          continue;
        }
        cv.berhenti = 'lolos';
        lulus.add(no);
        ditolak.delete(no);
        hasil.lulus.push({ no, versi: v, omongan: o });
      }
    }
  } catch (galat) {
    if (galat instanceof PaguTercapai) {
      hasil.tersensor = true;
      hasil.berhenti = `terpotong pagu: ${teksGalat(galat)}`;
    } else {
      hasil.berhenti = `galat: ${teksGalat(galat)}`;
    }
  }

  // versi akhir terbaca tiap omongan
  for (const n of [1, 2, 3]) {
    const v = [...hasil.versi].reverse().find((x) => x.no === n && x.omongan !== null);
    hasil.akhir[n - 1] = v === undefined || v.omongan === null ? null : { no: n, versi: v.versi, lulus: v.berhenti === 'lolos', omongan: v.omongan };
  }
  if (hasil.berhenti === null) {
    if (lulus.size === 3) {
      const draf: DrafSimulasi = { omongan: [1, 2, 3].map((n) => drafDari(hasil.lulus.find((x) => x.no === n)?.omongan as OmonganBebas)) };
      hasil.validasi_draf = validasiM2d8(draf, paket)
        .filter((m) => m.omongan === null)
        .map((m) => `[${m.kode}] ${m.pesan}`);
      hasil.terbit = hasil.validasi_draf.length === 0;
      hasil.draf = hasil.terbit ? draf : null;
      hasil.berhenti = hasil.terbit ? null : `validator seluruh draf: ${hasil.validasi_draf.join('; ')}`;
    } else {
      hasil.berhenti = `omongan tidak lulus dalam ${String(MAKS_VERSI_BEBAS)} versi: ${[1, 2, 3].filter((n) => !lulus.has(n)).join(', ')}; simulasi tidak terbit`;
    }
  }
  opsi.jejak?.selesai(hasil.terbit, versiTerakhir, hasil.berhenti);
  return hasil;
}

export type { OmonganDraf };
