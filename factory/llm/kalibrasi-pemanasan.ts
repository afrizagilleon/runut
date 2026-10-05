/**
 * `npm run kalibrasi:pemanasan` — SATU soal pemanasan (mode dipandu) dari
 * paket TIRT (kontrak M2d-8 D-3, pra-registrasi §7). Pagu pemanasan US$0,25
 * (tag `m2d8/pemanasan/`) DITEGAKKAN kode.
 *
 * - Kartu: `susp-2025-12-10` (kartu 1, penentu) + `susp-2025-01-21`; klaim
 *   teman KELIRU (alasan penghentian Januari dikira alasan hari ini). Huruf
 *   kunci dari kode.
 * - Satu penulis DeepSeek per percobaan (`prompt-penulis-pemanasan.md`),
 *   paling banyak 4 percobaan; umpan balik = alasan gerbang, tanpa
 *   penyuntingan tangan.
 * - Gerbang yang MENOLAK: validator (semua kode per soal, termasuk
 *   `NAMA_TERLARANG`) + nama bukan nama kasus tayang; G-penilaian;
 *   G-pilihan-kembar; pemeriksa anti-bocor DADA/ULTJ; pembaca kartu 3/3
 *   (masing-masing memilih kunci DAN menunjuk kartu penentu); kritikus makna
 *   (GLM "high"): tidak menjawab atau keberatan `kunci`/`makna` menolak.
 *   Dicatat saja: gerbang G/gaya, artefak, keberatan kritikus lain.
 * - Tebak buta TIDAK disyaratkan (soal dipandu; alasan di pra-registrasi §7).
 *
 * Keluaran `eval/keluaran-m2d8/pemanasan/`: `soal.json` (bentuk `Soal` kasus),
 * `fakta.json` (kalimat kedua kartu), `jejak.json` (semua percobaan). TIDAK
 * dipasang ke produk.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ambilRujukan, teksPolos } from '../skema/rujukan.ts';
import { tanggalId } from '../format.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { berkasKasusManusia } from '../kasus/kasus-manusia.ts';
import { gArtefak } from './gerbang-artefak.ts';
import { gerbangG } from './gerbang-g.ts';
import { gerbangGaya } from './gerbang-gaya.ts';
import { gerbangKartu, type PutusanKartu } from './gerbang-kartu.ts';
import { gKembar } from './gerbang-kembar.ts';
import { gPenilaian } from './gerbang-penilaian.ts';
import type { InfoPanggil } from './gerbang-tebak.ts';
import { FOLDER_M2D8, PAGU_BAGIAN_M2D8, siapkanM2d8 } from './kalibrasi-konfig.ts';
import { validasiM2d8 } from './kalibrasi-soal.ts';
import type { PesanChat } from './klien.ts';
import { kritik, type PutusanKritik } from './kritikus.ts';
import { GENERASI_M2D7, PENULIS_M2D7 } from './agen-pengecoh.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import { PaguTercapai, chatBerpagu } from './pagu.ts';
import { DEFINISI_PAKET, bangunPaket, type PaketFakta } from './paket.ts';
import { PENALAR_M2D8, badanUpaya, setelanPenalaran } from './penalaran.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import { hurufKunciKode } from './posisi-kunci.ts';
import { SUHU, uraiKeluaran, type JawabanModel, type SetelanPanggil } from './susun.ts';
import { NAMA_TERLARANG } from './validasi.ts';
import { fileURLToPath } from 'node:url';

export const FOLDER_PEMANASAN = `${FOLDER_M2D8}/pemanasan`;
export const SUDUT_PEMANASAN = 'susp-2025-12-10';
export const KARTU_KEDUA = 'susp-2025-01-21';
export const KARTU_PEMANASAN = [SUDUT_PEMANASAN, KARTU_KEDUA] as const;
export const LABEL_PEMANASAN = 'Keliru' as const;
export const SALAH_KAPRAH_PEMANASAN = 'alasan resmi penghentian 21 Januari 2025 (kartu 2) dikira alasan penghentian hari ini';
export const MAKS_PERCOBAAN = 4;
export const PEMBACA_KARTU = 3;
export const HURUF_KUNCI_PEMANASAN: KunciOpsi = hurufKunciKode('tirt-pemanasan', 1);
export const SOAL_ID_PEMANASAN = 'pemanasan-tirt-1';
/** Kritikus makna: hanya keberatan ini (dan tidak menjawab) yang menolak (pra-registrasi §7). */
export const JENIS_MENOLAK_PEMANASAN = ['kunci', 'makna'] as const;
const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

export function promptPemanasan(): string {
  return readFileSync(fileURLToPath(new URL('./prompt-penulis-pemanasan.md', import.meta.url)), 'utf8').replace(/\r\n/g, '\n').trim();
}

/** Kalimat pemandu (templat kode, bukan tulisan model). */
export function petunjukPemanasan(nama: string): string {
  return `Pemanasan: jawabannya ada di kartu 1. Baca alasan resmi di kartu itu, lalu cocokkan dengan omongan ${nama}.`;
}

/* ---------------------------------------------------------------------- */
/* anti-bocor DADA/ULTJ                                                    */
/* ---------------------------------------------------------------------- */

interface SoalTayang {
  pesan: { nama: string; isi: string };
  pilihan: Array<{ teks: string }>;
  penjelasan: string;
  petunjuk: string | null;
}

export function kasusTayang(): Array<{ berkas: string; fakta: string[]; soal: SoalTayang[] }> {
  const folder = `${AKAR}cases`;
  // Anti-bocor menjaga soal tayang tulisan manusia. Kasus dari agent tidak ikut: nama pemeran
  // tetap agent dan kalimatnya sendiri akan terlarang bagi agent itu (`kasus-manusia.ts`).
  return berkasKasusManusia(folder)
    .map((f) => {
      const k = JSON.parse(readFileSync(`${folder}/${f}`, 'utf8')) as { fakta: Array<{ fact_id: string }>; soal: SoalTayang[] };
      return { berkas: f, fakta: k.fakta.map((x) => x.fact_id), soal: k.soal };
    });
}

/** Frasa wajib validator ("Salah-kaprah yang umum:") dilepas sebelum dipotong: templat, bukan isi kasus. */
const TEMPLAT = /salah-kaprah yang umum:?/giu;
export const PANJANG_POTONGAN = 5;

export function kataNormal(teks: string): string[] {
  return teksPolos(teks).replace(TEMPLAT, ' ').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x !== '');
}

export function potongan(teks: string, n: number = PANJANG_POTONGAN): Set<string> {
  const k = kataNormal(teks);
  const hasil = new Set<string>();
  for (let i = 0; i + n <= k.length; i++) hasil.add(k.slice(i, i + n).join(' '));
  return hasil;
}

export interface SoalPemanasan {
  soal_id: string;
  kartu: string[];
  kartu_penentu: string[];
  istilah: Array<{ kata: string; arti: string }>;
  pesan: { nama: string; jam: string; isi: string };
  tanya: string;
  petunjuk: string | null;
  pilihan: Array<{ kunci: KunciOpsi; teks: string }>;
  jawaban: KunciOpsi;
  penjelasan: string;
  fact_ids: string[];
}

/** Pemeriksa anti-bocor (pra-registrasi §7). Kosong = bersih. Murni. */
export function periksaBocor(s: SoalPemanasan, paket: PaketFakta, tayang = kasusTayang()): string[] {
  const masalah: string[] = [];
  const sumber = new Map<string, string>();
  for (const k of tayang) {
    for (const x of k.soal) {
      for (const [bagian, teks] of [['pesan', x.pesan.isi], ...x.pilihan.map((p, i): [string, string] => [`pilihan ${String(i + 1)}`, p.teks]), ['penjelasan', x.penjelasan], ['petunjuk', x.petunjuk ?? '']] as Array<[string, string]>) {
        for (const p of potongan(teks)) if (!sumber.has(p)) sumber.set(p, `${k.berkas} ${bagian}`);
      }
    }
  }
  const milik = [['pesan', s.pesan.isi], ...s.pilihan.map((p): [string, string] => [`pilihan ${p.kunci}`, p.teks]), ['penjelasan', s.penjelasan], ['petunjuk', s.petunjuk ?? '']] as Array<[string, string]>;
  for (const [bagian, teks] of milik) {
    for (const p of potongan(teks)) {
      const asal = sumber.get(p);
      if (asal !== undefined) masalah.push(`${bagian} memuat "${p}" dari ${asal}`);
    }
  }
  const idTirt = new Set(paket.fakta.map((f) => f.fact_id));
  const idTayang = new Set(tayang.flatMap((k) => k.fakta));
  for (const id of s.fact_ids) if (idTayang.has(id) && !idTirt.has(id)) masalah.push(`fact_id "${id}" milik kasus tayang, bukan paket TIRT`);
  const nama = new Set(tayang.flatMap((k) => k.soal.map((x) => x.pesan.nama.toLowerCase())));
  if (nama.has(s.pesan.nama.toLowerCase())) masalah.push(`nama "${s.pesan.nama}" dipakai kasus tayang`);
  return masalah;
}

/* ---------------------------------------------------------------------- */
/* penulis                                                                  */
/* ---------------------------------------------------------------------- */

export interface TulisanPemanasan {
  nama: string;
  jam: string;
  pesan: string;
  angka_pesan: OmonganDraf['angka_pesan'];
  kunci: string;
  pengecoh: [string, string, string];
  penjelasan: string;
}

export function uraiTulisan(teks: string): TulisanPemanasan | null {
  const u = uraiKeluaran(teks);
  if (!u.ok) return null;
  const n = u.nilai as Record<string, unknown>;
  const str = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';
  if (!str(n['nama']) || !str(n['jam']) || !str(n['pesan']) || !str(n['kunci']) || !str(n['penjelasan'])) return null;
  const p = n['pengecoh'];
  if (!Array.isArray(p) || p.length !== 3 || !p.every(str)) return null;
  const a = Array.isArray(n['angka_pesan']) ? (n['angka_pesan'] as unknown[]) : [];
  const angka = a
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null && typeof (x as Record<string, unknown>)['teks'] === 'string')
    .map((x) => (typeof x['fact_id'] === 'string' ? { teks: x['teks'] as string, fact_id: x['fact_id'] } : { teks: x['teks'] as string }));
  return { nama: n['nama'], jam: n['jam'], pesan: n['pesan'], angka_pesan: angka, kunci: n['kunci'], pengecoh: [p[0], p[1], p[2]] as [string, string, string], penjelasan: n['penjelasan'] };
}

/** Rakit omongan: kunci di huruf kode, pengecoh di huruf lain menurut urutan tulisan. Murni. */
export function rakitPemanasan(t: TulisanPemanasan): OmonganDraf {
  const pilihan = {} as Record<KunciOpsi, string>;
  let i = 0;
  for (const h of HURUF) pilihan[h] = h === HURUF_KUNCI_PEMANASAN ? t.kunci : (t.pengecoh[i++] as string);
  return { nama: t.nama, jam: t.jam, pesan: t.pesan, angka_pesan: t.angka_pesan, kartu: [...KARTU_PEMANASAN], kartu_penentu: [SUDUT_PEMANASAN], pilihan, kunci: HURUF_KUNCI_PEMANASAN, penjelasan: t.penjelasan };
}

export function keSoal(o: OmonganDraf): SoalPemanasan {
  const rujukan = [...HURUF.map((h) => o.pilihan[h]), o.penjelasan].flatMap((t) => ambilRujukan(t).map((r) => r.fact_id)).filter((id) => id !== 'misal' && id !== 'hari-ini');
  return {
    soal_id: SOAL_ID_PEMANASAN,
    kartu: [...o.kartu],
    kartu_penentu: [...o.kartu_penentu],
    istilah: [],
    pesan: { nama: o.nama, jam: o.jam, isi: o.pesan },
    tanya: `Omongan ${o.nama} cocok dengan dokumennya?`,
    petunjuk: petunjukPemanasan(o.nama),
    pilihan: HURUF.map((h) => ({ kunci: h, teks: o.pilihan[h] })),
    jawaban: o.kunci,
    penjelasan: o.penjelasan,
    fact_ids: [...new Set([...o.kartu, ...rujukan])].sort(),
  };
}

export function pesanTulisPemanasan(paket: PaketFakta, umpan: readonly string[], sebelumnya: string | null): PesanChat[] {
  const klaim = (id: string): string => paket.fakta.find((f) => f.fact_id === id)?.klaim ?? '';
  const baris = [
    `Tanggal hari ini (T): ${tanggalId(paket.tanggal_t)}; pesan dikirim sesudah bursa tutup.`,
    `Nama samaran emiten: ${paket.nama_samaran}`,
    '',
    `Kartu 1 (${SUDUT_PEMANASAN}) [MENENTUKAN JAWABAN]: ${klaim(SUDUT_PEMANASAN)}`,
    `Kartu 2 (${KARTU_KEDUA}): ${klaim(KARTU_KEDUA)}`,
    '',
    `Klaim teman harus: ${LABEL_PEMANASAN.toUpperCase()}. Salah kaprah yang dipakai teman: ${SALAH_KAPRAH_PEMANASAN}.`,
    `Label pilihan kunci: "${LABEL_PEMANASAN},". Pengecoh: dua "Betul," dan satu "Keliru,".`,
    `Nama yang dilarang: ${[...new Set([...NAMA_TERLARANG, ...kasusTayang().flatMap((k) => k.soal.map((s) => s.pesan.nama.toLowerCase()))])].join(', ')}.`,
    ...(sebelumnya === null ? [] : ['', `Soal sebelumnya DITOLAK: ${sebelumnya}`]),
    ...(umpan.length === 0 ? [] : ['Masalahnya (perbaiki semuanya):', ...umpan.map((u) => `- ${u}`)]),
    '',
    'Keluarkan JSON saja dengan bentuk di akhir petunjuk.',
  ];
  return [
    { role: 'system', content: promptPemanasan() },
    { role: 'user', content: baris.join('\n') },
  ];
}

/* ---------------------------------------------------------------------- */
/* gerbang                                                                  */
/* ---------------------------------------------------------------------- */

export interface PutusanPemanasan {
  lolos: boolean;
  menolak: string[];
  dicatat: string[];
  kartu: PutusanKartu[];
  kritik: PutusanKritik | null;
}

/** Gerbang kode pemanasan (tanpa jaringan). */
export function gerbangKodePemanasan(o: OmonganDraf, paket: PaketFakta): { menolak: string[]; dicatat: string[] } {
  const menolak: string[] = [];
  for (const m of validasiM2d8({ omongan: [o] }, paket)) if (m.omongan !== null) menolak.push(`[${m.kode}] ${m.pesan}`);
  for (const a of gPenilaian(o.pesan).alasan) menolak.push(`[G-penilaian] ${a}`);
  for (const k of gKembar(o.pilihan).kembar) menolak.push(`[G-pilihan-kembar] pilihan ${k.a} dan ${k.b} isinya sama (kemiripan ${k.kemiripan.toFixed(2)})`);
  for (const b of periksaBocor(keSoal(o), paket)) menolak.push(`[anti-bocor] ${b}`);
  const dicatat = [...gerbangG(o).umpan, ...gerbangGaya(o).umpan, ...(gArtefak(o).tolak ? [...gArtefak(o).meresmikan.alasan, ...gArtefak(o).keseimbangan.alasan].map((a) => `[artefak] ${a}`) : [])];
  return { menolak, dicatat };
}

type Panggil = (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoPanggil) => Promise<JawabanModel>;

/** Semua gerbang untuk satu percobaan: kode dulu (gratis); gerbang berbayar hanya bila kode bersih. */
export async function periksaPemanasan(o: OmonganDraf, paket: PaketFakta, panggil: Panggil, percobaan: number): Promise<PutusanPemanasan> {
  const { menolak, dicatat } = gerbangKodePemanasan(o, paket);
  const hasil: PutusanPemanasan = { lolos: false, menolak, dicatat, kartu: [], kritik: null };
  if (menolak.length > 0) return hasil;
  for (let i = 1; i <= PEMBACA_KARTU; i++) {
    const k = await gerbangKartu(o, paket, { panggil: (p, s, info) => panggil(p, s, { ...info, ke: i }), putaran: percobaan, omongan: 1, tandaiBingung: true, ...GENERASI_M2D7.kartu });
    hasil.kartu.push(k);
    if (k.pilihan !== o.kunci || !k.menunjuk_penentu) {
      menolak.push(`[pembaca kartu ${String(i)}] memilih "${String(k.pilihan)}" (kunci "${o.kunci}")${k.menunjuk_penentu ? '' : ', tidak menunjuk kartu 1'}; alasannya: "${k.alasan_penjawab}"`);
      return hasil;
    }
    if ((k.membingungkan ?? []).length > 0) dicatat.push(`[pembaca kartu ${String(i)}] bingung: ${(k.membingungkan ?? []).map((x) => `"${x.kutipan}"`).join('; ')}`);
  }
  const k1 = hasil.kartu[0] as PutusanKartu;
  const kr = await kritik(
    o, paket,
    { no: 1, kartu: { pilihan: k1.pilihan, kartu_ditunjuk_no: k1.kartu_ditunjuk.map((id) => o.kartu.indexOf(id) + 1).filter((x) => x > 0), alasan: k1.alasan_penjawab }, tebakan: [], penebakSesudah: true },
    { panggil, putaran: percobaan, omongan: 1, cekMakna: true, maxTokens: PENALAR_M2D8.kritikus.maxTokens, tambahanBadan: badanUpaya(PENALAR_M2D8.kritikus), ambangPenalaran: PENALAR_M2D8.kritikus.ambang },
  );
  hasil.kritik = kr;
  if (!kr.menjawab) menolak.push(`[kritikus] ${kr.keberatan[0]?.alasan ?? 'tidak menjawab'}`);
  for (const x of kr.keberatan) {
    if (!kr.menjawab) break;
    const teks = `[kritikus: ${x.jenis}, ${x.bagian}] ${x.alasan}`;
    if ((JENIS_MENOLAK_PEMANASAN as readonly string[]).includes(x.jenis)) menolak.push(teks);
    else dicatat.push(teks);
  }
  if (kr.menjawab && kr.arahan !== '') dicatat.push(`[kritikus: arahan] ${kr.arahan}`);
  hasil.lolos = menolak.length === 0;
  return hasil;
}

/* ---------------------------------------------------------------------- */
/* jalan                                                                    */
/* ---------------------------------------------------------------------- */

export interface PercobaanPemanasan {
  ke: number;
  teks_mentah: string | null;
  tulisan: TulisanPemanasan | null;
  omongan: OmonganDraf | null;
  putusan: PutusanPemanasan | null;
  biaya_usd: number;
  galat?: string;
}

export async function jalankanPemanasan(paket: PaketFakta, panggil: Panggil, biaya: () => number): Promise<{ lolos: boolean; soal: SoalPemanasan | null; percobaan: PercobaanPemanasan[]; berhenti: string | null }> {
  const percobaan: PercobaanPemanasan[] = [];
  let umpan: string[] = [];
  let sebelumnya: string | null = null;
  for (let ke = 1; ke <= MAKS_PERCOBAAN; ke++) {
    const awal = biaya();
    const c: PercobaanPemanasan = { ke, teks_mentah: null, tulisan: null, omongan: null, putusan: null, biaya_usd: 0 };
    percobaan.push(c);
    try {
      const pesan = pesanTulisPemanasan(paket, umpan, sebelumnya);
      const j = await panggil(pesan, setelanPenalaran(SUHU, PENULIS_M2D7.pilihan), { jenis: 'susun', putaran: ke, omongan: 1, ke: 1 });
      c.teks_mentah = j.teks;
      c.tulisan = uraiTulisan(j.teks);
      if (c.tulisan === null) {
        umpan = ['keluaran bukan JSON berbentuk yang diminta; kirim tepat bentuk JSON di akhir petunjuk'];
        sebelumnya = null;
      } else {
        const o = rakitPemanasan(c.tulisan);
        c.omongan = o;
        c.putusan = await periksaPemanasan(o, paket, panggil, ke);
        if (c.putusan.lolos) {
          c.biaya_usd = biaya() - awal;
          return { lolos: true, soal: keSoal(o), percobaan, berhenti: null };
        }
        umpan = c.putusan.menolak;
        sebelumnya = JSON.stringify(c.tulisan);
      }
    } catch (galat) {
      c.galat = galat instanceof Error ? `${galat.name}: ${galat.message}`.slice(0, 300) : 'galat';
      c.biaya_usd = biaya() - awal;
      if (galat instanceof PaguTercapai) return { lolos: false, soal: null, percobaan, berhenti: `pagu tercapai: ${galat.message}` };
      throw galat;
    }
    c.biaya_usd = biaya() - awal;
  }
  return { lolos: false, soal: null, percobaan, berhenti: `${String(MAKS_PERCOBAAN)} percobaan tanpa soal yang lolos semua gerbang` };
}

/** Model per jenis panggilan pemanasan. */
export function modelPemanasan(jenis: InfoPanggil['jenis']): string {
  return jenis === 'kritikus' ? MODEL_OR_GLM : MODEL_OR_DEEPSEEK;
}

async function utama(): Promise<number> {
  if (existsSync(`${FOLDER_PEMANASAN}/jejak.json`)) {
    console.error(`${FOLDER_PEMANASAN}/jejak.json sudah ada; pemanasan yang sudah dibayar tidak diulang.`);
    return 1;
  }
  const { klien, biaya } = siapkanM2d8();
  mkdirSync(FOLDER_PEMANASAN, { recursive: true });
  const paket = bangunPaket(DEFINISI_PAKET.tirt);
  const awalan = PAGU_BAGIAN_M2D8.pemanasan.awalanTag;
  const panggil: Panggil = async (pesan, setelan, info) => {
    const model = modelPemanasan(info.jenis);
    const tag = `${awalan}c${String(info.putaran)}/${info.jenis}/t${String(info.ke)}${info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : ''}`;
    let j;
    try {
      j = await chatBerpagu(
        klien, biaya,
        { model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan, ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }) },
        tag,
        setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
      );
    } catch (galat) {
      throw ubahGalatSaldo(galat, model);
    }
    console.log(`  ${new Date().toISOString().slice(11, 19)} ${tag}: ${String(j.penyedia)} ${String(j.finish_reason)} penalaran ${String(j.token_penalaran)} US$${j.biaya_usd.toFixed(6)}; pemanasan US$${biaya.totalAwalan(awalan).toFixed(4)}`);
    return j;
  };
  const h = await jalankanPemanasan(paket, panggil, () => biaya.totalAwalan(awalan));
  const tulis = (nama: string, isi: unknown): void => writeFileSync(`${FOLDER_PEMANASAN}/${nama}`, JSON.stringify(isi, null, 2) + '\n', 'utf8');
  tulis('jejak.json', { paket_id: paket.paket_id, kartu: KARTU_PEMANASAN, label: LABEL_PEMANASAN, huruf_kunci: HURUF_KUNCI_PEMANASAN, lolos: h.lolos, berhenti: h.berhenti, biaya_usd: biaya.totalAwalan(awalan), percobaan: h.percobaan });
  if (h.soal !== null) {
    tulis('soal.json', h.soal);
    tulis('fakta.json', KARTU_PEMANASAN.map((id) => paket.fakta.find((f) => f.fact_id === id)));
  }
  for (const c of h.percobaan) console.log(`percobaan ${String(c.ke)}: ${c.putusan?.lolos === true ? 'LOLOS' : `ditolak (${(c.putusan?.menolak ?? [c.galat ?? 'tak terbaca']).join(' | ').slice(0, 400)})`}`);
  console.log(`${h.lolos ? 'SOAL PEMANASAN LOLOS' : `TIDAK ADA SOAL (${String(h.berhenti)})`}; US$${biaya.totalAwalan(awalan).toFixed(6)}; milestone US$${biaya.totalMilestone().toFixed(6)}.`);
  return h.lolos ? 0 : 2;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/kalibrasi-pemanasan.ts') === true) {
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
