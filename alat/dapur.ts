/**
 * `node --experimental-strip-types alat/dapur.ts` — data statis halaman "Dapur agen" (M3.13 D-4).
 *
 * Halaman dapur memperlihatkan kerja agen AI yang menulis draf simulasi: siapa
 * berperan apa, apa yang ditolak dan kenapa, dan status jujurnya. Kegagalan
 * yang dijaga berkas ini disebut kontrak dengan nama: **halaman yang mengarang
 * angka atau teks alih-alih membaca jejak nyata**. Karena itu setiap angka dan
 * setiap kalimat trace di `web/src/dapur-data.json` lahir di sini, dari berkas
 * mentah yang sudah ada di repo, dan tidak disunting:
 *
 * - jalan "utuh" (`alat/dapur-jalan.json` → `utuh`): hanya emiten yang TIDAK
 *   tayang — TIRT (`eval/keluaran-m2d6/jalan-1/tirt/`, ditolak; jalan TIRT
 *   berikutnya ditambahkan dengan `alat/dapur.ts tambah <folder> <milestone>`);
 * - jalan "agregat" (DADA, ULTJ M2d-4): hanya angka — putaran, versi,
 *   penolakan per peran — tanpa isi apa pun (Amandemen A-1: isi jalan atas
 *   simulasi yang tayang bisa membocorkan jawabannya).
 *
 * Yang ditulis tangan hanyalah konfigurasi di `alat/dapur-jalan.json` (folder mana, dan apakah
 * biaya ledger jalan itu biaya nyata) — bukan isi. Kalimat di halaman yang
 * bukan trace (judul, penjelasan peran) ada di komponen `web/src/Dapur.tsx`.
 *
 * `dapur.test.ts` menjaga dua hal: berkas data di repo = keluaran fungsi ini
 * atas jejak mentah (byte demi byte), dan tidak ada angka/kalimat yang tidak
 * bisa ditemukan kembali di jejaknya.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AKAR = fileURLToPath(new URL('../', import.meta.url));

export const BERKAS_DATA = 'web/src/dapur-data.json';

/* --- bentuk data ----------------------------------------------------------- */

export interface PeranDapur {
  /** Nama peran persis seperti di jejak (`langkah[].peran`). */
  peran: string;
  /** Model dari `model_peran` jejak; `null` = dikerjakan kode, bukan model. */
  model: string | null;
  langkah: number;
  panggilan: number;
  putusan: Record<string, number>;
}

export interface PenolakanDapur {
  no: number;
  putaran: number;
  omongan: number | null;
  peran: string;
  jenis: string;
  alasan: string[];
}

export interface SudutDapur {
  omongan: number;
  riwayat: Array<{ ke: number; fact_id: string; hasil: string; putaran_mulai: number; putaran_akhir: number }>;
}

export interface DrafDapur {
  nama: string;
  jam: string;
  pesan: string;
  pilihan: Record<string, string>;
  kunci: string;
  penjelasan: string;
}

export interface UjiLuarDapur {
  omongan: number;
  kunci: string;
  tebak_benar: number;
  tebak_n: number;
  kartu_benar: number;
  kartu_n: number;
}

export interface JalanDapur {
  id: string;
  milestone: string;
  folder: string;
  simulasi: { nama_samaran: string; tanggal_t: string; peristiwa: string };
  terbit: boolean;
  berhenti: string | null;
  mulai: string;
  selesai: string;
  durasi_ms: number;
  putaran: number;
  panggilan: number;
  token_masuk: number;
  token_keluar: number;
  /** `null` bila ledger jalan itu tidak mencatat biaya nyata penyedia. */
  biaya_usd: number | null;
  pemeriksaan: {
    aturan_dijalankan: number;
    aturan_dilewati: number;
    temuan: number;
    fakta_lolos: number;
    fakta_tersingkir: number;
    tersingkir: Array<{ fact_id: string; alasan: string }>;
  };
  peran: PeranDapur[];
  sudut: SudutDapur[];
  penolakan: PenolakanDapur[];
  draf: DrafDapur[] | null;
  uji_luar: UjiLuarDapur[] | null;
  alami: { agen: number; manusia: number; penilai: number } | null;
}

/**
 * Satu jalan atas simulasi yang SEDANG TAYANG (DADA, ULTJ): hanya angka
 * (Amandemen A-1). Tanpa nama samaran, tanggal, pesan, pilihan, kunci,
 * penjelasan, atau kutipan keberatan — isi apa pun dari jalan ini bisa
 * membocorkan jawaban simulasi yang dimainkan orang.
 */
export interface AgregatDapur {
  id: string;
  milestone: string;
  terbit: boolean;
  putaran: number;
  /** Versi omongan yang ditulis penulis (langkah penulis berputusan "ditulis"). */
  versi: number;
  /** Penolakan per peran, urutan kerja lingkar. */
  penolakan: Array<{ peran: string; tolak: number }>;
}

export interface DataDapur {
  keterangan: string;
  sumber: string[];
  jalan: JalanDapur[];
  agregat: AgregatDapur[];
}

/* --- konfigurasi: folder mana, bukan isi ------------------------------------ */

export const BERKAS_KONFIG = 'alat/dapur-jalan.json';

export interface KonfigJalan {
  id: string;
  milestone: string;
  folder: string;
  /**
   * Apakah `hasil.biaya_usd` jejak ini biaya nyata dari respons penyedia.
   * M2d-4 (Featherless) mencatat token × tabel harga tebakan — tagihan
   * nyatanya ±1,88 × ledger (`docs/bukti/lingkar-agen-tirt.md`). Sejak M2d-5
   * (OpenRouter) ledger mencatat `usage.cost`.
   */
  biaya_nyata: boolean;
  /** Ringkasan penguji luar (`luar`, `alami`) bila ada; kunci paket di sana. */
  ringkasan?: { berkas: string; paket: string } | null;
}

export interface KonfigAgregat {
  id: string;
  milestone: string;
  folder: string;
}

export interface Konfig {
  keterangan: string;
  utuh: KonfigJalan[];
  agregat: KonfigAgregat[];
}

export function bacaKonfig(akar: string = AKAR): Konfig {
  return JSON.parse(readFileSync(`${akar}${BERKAS_KONFIG}`, 'utf8')) as Konfig;
}

/**
 * Nama samaran dan paket simulasi yang sedang tayang, dibaca dari `cases/`.
 * Jalan atas salah satunya TIDAK boleh ditampilkan utuh (A-1).
 */
export function simulasiTayang(akar: string = AKAR): { samaran: Set<string>; paket: Set<string> } {
  const samaran = new Set<string>();
  const paket = new Set<string>();
  for (const f of readdirSync(`${akar}cases`).filter((n) => n.endsWith('.json'))) {
    const k = JSON.parse(readFileSync(`${akar}cases/${f}`, 'utf8')) as {
      nama_samaran: string;
      emiten: { simbol: string };
    };
    samaran.add(k.nama_samaran);
    paket.add(k.emiten.simbol.toLowerCase());
  }
  return { samaran, paket };
}

/** Urutan peran di halaman: urutan kerja lingkar (`factory/llm/peran.md`). */
export const URUT_PERAN = ['perencana', 'penulis', 'pemeriksa', 'pembaca-kartu', 'kritikus', 'penebak'];

/* --- pembacaan jejak ------------------------------------------------------- */

interface Langkah {
  no: number;
  putaran: number;
  jenis: string;
  omongan: number | null;
  model: string | null;
  panggilan: number;
  putusan: string;
  alasan: string[];
  peran: string;
}

interface JejakAgen {
  simulasi: { nama_samaran: string; tanggal_t: string; peristiwa: string };
  model_peran: Record<string, string>;
  paket: JalanDapur['pemeriksaan'];
  mulai: string;
  selesai: string;
  langkah: Langkah[];
  hasil: {
    lolos: boolean;
    putaran: number;
    berhenti: unknown;
    panggilan: number;
    token_masuk: number;
    token_keluar: number;
    biaya_usd: number;
    durasi_ms: number;
  };
}

interface Riwayat {
  sudut: Array<Array<SudutDapur['riwayat'][number] & { topik?: string }>>;
}

interface DrafAkhir {
  terbit: boolean;
  berhenti: unknown;
  draf: { omongan: Array<DrafDapur & Record<string, unknown>> } | null;
}

interface RingkasanLuar {
  luar: Array<{
    paket: string;
    no: number;
    kunci: string;
    tebak_luar: { jawaban: unknown[]; benar: number };
    kartu_luar: { jawaban: unknown[]; benar: number };
  }>;
  alami: Array<{ penilai: string; paket: string; sumber: string; skor: number }>;
}

function baca<T>(akar: string, berkas: string): T {
  return JSON.parse(readFileSync(`${akar}${berkas}`, 'utf8')) as T;
}

/** `berhenti` jejak bisa teks, `null`, atau obyek; yang tampil hanya teksnya. */
function teksBerhenti(nilai: unknown): string | null {
  if (nilai === null || nilai === undefined) return null;
  if (typeof nilai === 'string') return nilai;
  if (typeof nilai === 'object' && 'alasan' in nilai && typeof nilai.alasan === 'string') return nilai.alasan;
  return JSON.stringify(nilai);
}

function rataRata(nilai: number[]): number {
  return nilai.reduce((a, b) => a + b, 0) / nilai.length;
}

export function jalanDapur(konfig: KonfigJalan, akar: string = AKAR): JalanDapur {
  const jejak = baca<JejakAgen>(akar, `${konfig.folder}/jejak-agen.json`);
  const riwayat = baca<Riwayat>(akar, `${konfig.folder}/riwayat.json`);
  const akhir = baca<DrafAkhir>(akar, `${konfig.folder}/draf-akhir.json`);

  const peranAda = [...new Set(jejak.langkah.map((l) => l.peran))];
  const tidakDikenal = peranAda.filter((p) => !URUT_PERAN.includes(p));
  if (tidakDikenal.length > 0) {
    throw new Error(`Peran tak dikenal di ${konfig.folder}: ${tidakDikenal.join(', ')}`);
  }
  const peran: PeranDapur[] = URUT_PERAN.filter((p) => peranAda.includes(p)).map((p) => {
    const langkah = jejak.langkah.filter((l) => l.peran === p);
    const putusan: Record<string, number> = {};
    for (const l of langkah) putusan[l.putusan] = (putusan[l.putusan] ?? 0) + 1;
    return {
      peran: p,
      model: jejak.model_peran[p] ?? null,
      langkah: langkah.length,
      panggilan: langkah.reduce((j, l) => j + l.panggilan, 0),
      putusan,
    };
  });

  const penolakan: PenolakanDapur[] = jejak.langkah
    .filter((l) => l.putusan === 'tolak')
    .map((l) => ({
      no: l.no,
      putaran: l.putaran,
      omongan: l.omongan,
      peran: l.peran,
      jenis: l.jenis,
      alasan: [...l.alasan],
    }));

  const sudut: SudutDapur[] = riwayat.sudut.map((daftar, i) => ({
    omongan: i + 1,
    riwayat: daftar.map((s) => ({
      ke: s.ke,
      fact_id: s.fact_id,
      hasil: s.hasil,
      putaran_mulai: s.putaran_mulai,
      putaran_akhir: s.putaran_akhir,
    })),
  }));

  // Jejak dan draf akhir harus sepakat soal status; kalau tidak, halaman tidak dibangun.
  if (akhir.terbit !== jejak.hasil.lolos) {
    throw new Error(`${konfig.folder}: draf-akhir.terbit (${String(akhir.terbit)}) ≠ jejak hasil.lolos.`);
  }

  const draf: DrafDapur[] | null =
    akhir.draf === null
      ? null
      : akhir.draf.omongan.map((o) => ({
          nama: o.nama,
          jam: o.jam,
          pesan: o.pesan,
          pilihan: { ...o.pilihan },
          kunci: o.kunci,
          penjelasan: o.penjelasan,
        }));

  let uji_luar: UjiLuarDapur[] | null = null;
  let alami: JalanDapur['alami'] = null;
  if (konfig.ringkasan !== undefined && konfig.ringkasan !== null) {
    const r = baca<RingkasanLuar>(akar, konfig.ringkasan.berkas);
    const paket = konfig.ringkasan.paket;
    uji_luar = r.luar
      .filter((x) => x.paket === paket)
      .map((x) => ({
        omongan: x.no,
        kunci: x.kunci,
        tebak_benar: x.tebak_luar.benar,
        tebak_n: x.tebak_luar.jawaban.length,
        kartu_benar: x.kartu_luar.benar,
        kartu_n: x.kartu_luar.jawaban.length,
      }));
    const skor = (sumber: string): number[] =>
      r.alami.filter((a) => a.paket === paket && a.sumber === sumber).map((a) => a.skor);
    const agen = skor(`agen-${konfig.milestone.toLowerCase().replace('-', '')}`);
    const manusia = skor('manusia');
    if (agen.length > 0 && manusia.length > 0) {
      alami = { agen: rataRata(agen), manusia: rataRata(manusia), penilai: agen.length };
    }
  }

  return {
    id: konfig.id,
    milestone: konfig.milestone,
    folder: konfig.folder,
    simulasi: { ...jejak.simulasi },
    terbit: jejak.hasil.lolos,
    berhenti: teksBerhenti(jejak.hasil.berhenti),
    mulai: jejak.mulai,
    selesai: jejak.selesai,
    durasi_ms: jejak.hasil.durasi_ms,
    putaran: jejak.hasil.putaran,
    panggilan: jejak.hasil.panggilan,
    token_masuk: jejak.hasil.token_masuk,
    token_keluar: jejak.hasil.token_keluar,
    biaya_usd: konfig.biaya_nyata ? jejak.hasil.biaya_usd : null,
    pemeriksaan: {
      aturan_dijalankan: jejak.paket.aturan_dijalankan,
      aturan_dilewati: jejak.paket.aturan_dilewati,
      temuan: jejak.paket.temuan,
      fakta_lolos: jejak.paket.fakta_lolos,
      fakta_tersingkir: jejak.paket.fakta_tersingkir,
      tersingkir: jejak.paket.tersingkir.map((t) => ({ fact_id: t.fact_id, alasan: t.alasan })),
    },
    peran,
    sudut,
    penolakan,
    draf,
    uji_luar,
    alami,
  };
}

/** Satu baris agregat jalan atas simulasi tayang: angka saja, dari jejak. */
export function agregatDapur(konfig: KonfigAgregat, akar: string = AKAR): AgregatDapur {
  const jejak = baca<JejakAgen>(akar, `${konfig.folder}/jejak-agen.json`);
  const tolak = (p: string): number => jejak.langkah.filter((l) => l.peran === p && l.putusan === 'tolak').length;
  return {
    id: konfig.id,
    milestone: konfig.milestone,
    terbit: jejak.hasil.lolos,
    putaran: jejak.hasil.putaran,
    versi: jejak.langkah.filter((l) => l.peran === 'penulis' && l.putusan === 'ditulis').length,
    penolakan: URUT_PERAN.map((p) => ({ peran: p, tolak: tolak(p) })).filter((x) => x.tolak > 0),
  };
}

/**
 * Tolak keras jalan "utuh" atas simulasi yang tayang (A-1): isinya bisa
 * membocorkan jawaban. Yang dibandingkan: nama samaran di jejak dengan
 * `cases/*.json`, dan kode paket dengan simbol emiten kasus tayang.
 */
export function periksaUtuh(konfig: KonfigJalan, akar: string = AKAR): void {
  const jejak = baca<JejakAgen & { simulasi: { paket_id?: string } }>(akar, `${konfig.folder}/jejak-agen.json`);
  const tayang = simulasiTayang(akar);
  const paket = (jejak.simulasi.paket_id ?? '').toLowerCase();
  if (tayang.samaran.has(jejak.simulasi.nama_samaran) || tayang.paket.has(paket)) {
    throw new Error(
      `${konfig.folder}: jalan atas simulasi yang tayang (${jejak.simulasi.nama_samaran}) tidak boleh ` +
        'ditampilkan utuh di dapur — pakai "agregat".',
    );
  }
}

export function dataDapur(akar: string = AKAR, konfig: Konfig = bacaKonfig(akar)): DataDapur {
  for (const j of konfig.utuh) periksaUtuh(j, akar);
  const sumber = konfig.utuh.flatMap((j) => [
    `${j.folder}/jejak-agen.json`,
    `${j.folder}/riwayat.json`,
    `${j.folder}/draf-akhir.json`,
    ...(j.ringkasan === undefined || j.ringkasan === null ? [] : [j.ringkasan.berkas]),
  ]);
  return {
    keterangan:
      'Dibangun `node --experimental-strip-types alat/dapur.ts` dari jejak mentah lingkar agen. Jangan disunting tangan.',
    sumber: [...sumber, ...konfig.agregat.map((j) => `${j.folder}/jejak-agen.json (hanya angka)`)],
    jalan: konfig.utuh.map((j) => jalanDapur(j, akar)),
    agregat: konfig.agregat.map((j) => agregatDapur(j, akar)),
  };
}

/**
 * `tambah <folder> <milestone>` — satu perintah untuk jalan TIRT baru (mis.
 * M2d-7): periksa bahwa foldernya berisi jejak lengkap dan bukan simulasi
 * tayang, catat di `alat/dapur-jalan.json`, lalu bangun ulang data. Biaya
 * dianggap nyata (ledger OpenRouter `usage.cost`, sejak M2d-5); `--biaya-tabel`
 * untuk jalan lama yang mencatat tabel tebakan.
 */
export function tambahJalan(
  folder: string,
  milestone: string,
  biaya_nyata: boolean,
  akar: string = AKAR,
): KonfigJalan {
  const bersih = folder.replaceAll('\\', '/').replace(/\/+$/, '');
  for (const f of ['jejak-agen.json', 'riwayat.json', 'draf-akhir.json']) {
    if (!existsSync(`${akar}${bersih}/${f}`)) throw new Error(`${bersih}/${f} tidak ada.`);
  }
  if (!/^M\d[\w.-]*$/.test(milestone)) throw new Error(`Milestone "${milestone}" tidak berbentuk M…`);
  const jejak = baca<{ simulasi: { paket_id: string } }>(akar, `${bersih}/jejak-agen.json`);
  const konfig = bacaKonfig(akar);
  const baru: KonfigJalan = {
    id: `${jejak.simulasi.paket_id}-${milestone.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    milestone,
    folder: bersih,
    biaya_nyata,
  };
  periksaUtuh(baru, akar);
  if ([...konfig.utuh, ...konfig.agregat].some((j) => j.id === baru.id || j.folder === bersih)) {
    throw new Error(`Jalan ${baru.id} (${bersih}) sudah tercatat.`);
  }
  konfig.utuh.push(baru);
  writeFileSync(`${akar}${BERKAS_KONFIG}`, `${JSON.stringify(konfig, null, 2)}\n`, 'utf8');
  return baru;
}

export function keJsonDapur(data: DataDapur): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dijalankanLangsung) {
  const [perintah, folder, milestone] = process.argv.slice(2);
  if (perintah === 'tambah') {
    if (folder === undefined || milestone === undefined) {
      console.error('Pakai: node --experimental-strip-types alat/dapur.ts tambah <folder> <milestone> [--biaya-tabel]');
      process.exit(1);
    }
    const baru = tambahJalan(folder, milestone, !process.argv.includes('--biaya-tabel'));
    console.log(`Dicatat ${baru.id} (${baru.folder}) di ${BERKAS_KONFIG}.`);
  }
  const teks = keJsonDapur(dataDapur());
  writeFileSync(`${AKAR}${BERKAS_DATA}`, teks, 'utf8');
  console.log(`Ditulis ${BERKAS_DATA} (${String(teks.length)} karakter).`);
}
