/**
 * Pembaca rekaman percobaan AI agent untuk pintu penyusun (mode replay).
 *
 * Sumbernya rekaman empat percobaan AI agent yang menulis simulasi 15 Juni
 * 2026 (`eval/penyusun/<id>/jejak-agen.jsonl` + `hasil.json`). Yang ditulis
 * tangan hanya DAFTAR percobaan; setiap angka dan setiap teks lahir di sini
 * dari rekaman, saat server dinyalakan. Tidak ada berkas data turunan.
 *
 * Tiga hal yang dijaga berkas ini, disebut dengan nama:
 *
 * 1. **Medan `penalaran` tidak pernah ikut.** Baris berjenis `model` di rekaman
 *    membawa teks berpikir model. Medan itu dibuang SAAT BARIS DIURAI (reviver
 *    `JSON.parse`), jadi tidak pernah ada di memori pembaca, apalagi di data
 *    yang dikirim ke peramban. Yang diambil dari baris `model` hanya daftar di
 *    `MEDAN_MODEL`; dari baris `alat` hanya `alat`, `ringkas`, `hasil`. Jumlah
 *    token berpikir (`token_penalaran`) ikut sebagai angka.
 * 2. **Tidak ada kode saham, nama perusahaan, atau alamat berkas mesin.** Id
 *    percobaan dan jalur berkas di rekaman memuat kode saham; keduanya
 *    disamarkan (`[kode]`), dan pembaca menolak bila masih ada sisa.
 * 3. **Angka cocok dengan `hasil.json`.** Jumlah langkah dan biaya tiap
 *    percobaan diperiksa terhadap `hasil.json` sebelum data dipakai.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

/** Folder rekaman; satu percobaan satu subfolder. */
export const FOLDER_REKAMAN = 'eval/penyusun';

/** Percobaan yang membentuk simulasi ini, berurutan. Hanya daftar; bukan isi. */
export const KONFIG_JEJAK: { kasus: string; percobaan: readonly string[] } = {
  /** Simulasi yang jadi, ditulis percobaan terakhir (sama byte demi byte dengan yang dimainkan). */
  kasus: 'eval/penyusun/m2d29-amag-lengkapi-3/kasus.json',
  percobaan: ['m2d26-amag-1', 'm2d26-amag-naik-1', 'm2d27-amag-naik-2', 'm2d29-amag-lengkapi-3'],
};

/** Pengganti kode saham di id percobaan dan jalur berkas. */
export const SAMARAN_KODE = '[kode]';

/**
 * Satu-satunya medan baris `model` yang boleh dibaca. `penalaran` (teks
 * berpikir) sengaja tidak ada di sini dan dibuang saat baris diurai.
 */
export const MEDAN_MODEL = [
  'ke',
  'memanggil',
  'teks',
  'token_masuk',
  'token_keluar',
  'token_penalaran',
  'biaya_usd',
  'latensi_ms',
  'mode_hemat',
] as const;

/** Medan yang dibuang saat rekaman diurai. */
export const MEDAN_TERLARANG = 'penalaran';

/**
 * Tool yang berganti nama di tengah rangkaian percobaan: nama lama → nama
 * sekarang. `periksa_kode` menjadi `periksa_draft_dengan_aturan`
 * (`factory/llm/agen/m2d27.test.ts`, "petunjuk memakai
 * `periksa_draft_dengan_aturan`, bukan `periksa_kode`"). Nama di tiap langkah
 * TETAP seperti di rekaman; peta ini hanya dipakai supaya diagram menggambar
 * tool itu sekali.
 */
export const NAMA_LAMA: Readonly<Record<string, string>> = {
  periksa_kode: 'periksa_draft_dengan_aturan',
};

/** Tool yang hanya membaca bahan; langkah awal yang hanya memanggil ini = tahap "bahan". */
const TOOL_BAHAN: readonly string[] = ['usulkan_hari', 'periksa_saham', 'lihat_bank', 'lihat_fakta'];

/* --- bentuk data ----------------------------------------------------------- */

export type IdTahap = 'bahan' | 'tulis' | 'naik' | 'lengkap';

export const URUT_TAHAP: readonly IdTahap[] = ['bahan', 'tulis', 'naik', 'lengkap'];

export interface HasilTool {
  /** Nama tool persis seperti di rekaman. */
  alat: string;
  /** Ringkasan satu baris dari rekaman. */
  ringkas: string;
  /** Tool result lengkap dari rekaman (hanya kode saham dan alamat berkas disamarkan). */
  hasil: unknown;
}

export interface LangkahJejak {
  /** Nomor urut di seluruh jejak, mulai 1. */
  no: number;
  /** Indeks percobaan di `percobaan`. */
  percobaan: number;
  tahap: IdTahap;
  /** Nomor langkah di dalam percobaannya (medan `ke` baris model). */
  ke: number;
  /** Tool yang dipilih agent di langkah ini, persis seperti di rekaman. */
  memanggil: string[];
  /** Ucapan agent di langkah ini, bila ada. */
  teks: string | null;
  token_masuk: number;
  token_keluar: number;
  /** Jumlah token berpikir — angkanya saja. */
  token_penalaran: number;
  /** Biaya panggilan model langkah ini. */
  biaya_usd: number;
  /** Biaya tester/critic yang dijalankan tool di langkah ini (`hasil.biaya_pengajuan_usd`). */
  biaya_tester_usd: number;
  latensi_ms: number;
  mode_hemat: boolean | null;
  hasil: HasilTool[];
}

export interface PercobaanJejak {
  /** Id percobaan, kode saham disamarkan. */
  id: string;
  mode: string;
  berhenti: string;
  pagu_usd: number;
  jumlah_langkah: number;
  /** `hasil.json` → `biaya_usd`. */
  biaya_usd: number;
  /** Jumlah biaya panggilan model. */
  biaya_agen_usd: number;
  /** Jumlah biaya tester dan critic. */
  biaya_tester_usd: number;
  durasi_detik: number;
}

export interface TahapJejak {
  id: IdTahap;
  jumlah_langkah: number;
  biaya_usd: number;
}

export interface ToolJejak {
  /** Nama sekarang (satu simpul di diagram). */
  nama: string;
  /** Nama lain tool yang sama di rekaman awal. */
  nama_lama: string[];
}

export interface DataJejak {
  keterangan: string;
  sumber: string[];
  simulasi: { tanggal: string; nama_samaran: string };
  model: string;
  jumlah: { langkah: number; biaya_usd: number };
  tool: ToolJejak[];
  tahap: TahapJejak[];
  percobaan: PercobaanJejak[];
  langkah: LangkahJejak[];
}

/* --- pembacaan rekaman ----------------------------------------------------- */

interface BarisModel {
  jenis: 'model';
  ke: number;
  memanggil: string[];
  teks: string | null;
  token_masuk: number;
  token_keluar: number;
  token_penalaran: number;
  biaya_usd: number;
  latensi_ms: number;
  mode_hemat?: boolean;
}

interface BarisAlat {
  jenis: 'alat';
  alat: string;
  ringkas: string;
  hasil: unknown;
}

interface HasilPercobaan {
  id: string;
  mode: string;
  kode: string | null;
  hari_dipilih: string;
  model: string;
  pagu_usd: number;
  berhenti: string;
  langkah: number;
  biaya_agen_usd: number;
  biaya_usd: number;
  durasi_detik: number;
}

/** Membuang medan `penalaran` di kedalaman mana pun, saat diurai. */
export function uraiTanpaPenalaran(teks: string): unknown {
  return JSON.parse(teks, (kunci: string, nilai: unknown): unknown =>
    kunci === MEDAN_TERLARANG ? undefined : nilai,
  );
}

/** Enam desimal: menghapus debu pecahan biner dari penjumlahan biaya. */
function enam(nilai: number): number {
  return Math.round(nilai * 1e6) / 1e6;
}

function wajibAngka(nilai: unknown, apa: string): number {
  if (typeof nilai !== 'number' || !Number.isFinite(nilai)) throw new Error(`${apa}: bukan angka.`);
  return nilai;
}

/** Menyamarkan kode saham dan alamat berkas mesin di satu teks. */
export function samarkan(teks: string, terlarang: readonly string[]): string {
  // Alamat mutlak mesin pembangun ("D:\…\eval/penyusun/…") → jalur relatif repo.
  let keluar = teks.replace(/[A-Za-z]:[\\/][^\s"]*?(?=eval[\\/]penyusun[\\/])/g, '');
  for (const kata of terlarang) {
    if (kata === '') continue;
    keluar = keluar.replace(new RegExp(kata.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), SAMARAN_KODE);
  }
  return keluar;
}

/** `samarkan` atas setiap teks di dalam sebuah nilai JSON. */
export function samarkanDalam(nilai: unknown, terlarang: readonly string[]): unknown {
  if (typeof nilai === 'string') return samarkan(nilai, terlarang);
  if (Array.isArray(nilai)) return nilai.map((x) => samarkanDalam(x, terlarang));
  if (nilai !== null && typeof nilai === 'object') {
    return Object.fromEntries(Object.entries(nilai).map(([k, v]) => [k, samarkanDalam(v, terlarang)]));
  }
  return nilai;
}

/** Semua teks di dalam sebuah nilai JSON, termasuk nama medannya. */
export function semuaTeksJejak(nilai: unknown, keluar: string[] = []): string[] {
  if (typeof nilai === 'string') keluar.push(nilai);
  else if (Array.isArray(nilai)) for (const x of nilai) semuaTeksJejak(x, keluar);
  else if (nilai !== null && typeof nilai === 'object') {
    for (const [k, v] of Object.entries(nilai)) {
      keluar.push(k);
      semuaTeksJejak(v, keluar);
    }
  }
  return keluar;
}

/** Biaya tester/critic yang dicatat sebuah tool result, bila ada. */
function biayaTester(hasil: unknown): number {
  if (hasil !== null && typeof hasil === 'object' && 'biaya_pengajuan_usd' in hasil) {
    const b = hasil.biaya_pengajuan_usd;
    return typeof b === 'number' ? b : 0;
  }
  return 0;
}

function tahapLangkah(mode: string, sudahMenulis: boolean): IdTahap {
  if (mode === 'tingkatkan') return 'naik';
  if (mode === 'lengkapi') return 'lengkap';
  if (mode === 'dari-kode') return sudahMenulis ? 'tulis' : 'bahan';
  throw new Error(`Mode percobaan tak dikenal: ${mode}`);
}

export function dataJejak(akar: string = AKAR, konfig: typeof KONFIG_JEJAK = KONFIG_JEJAK): DataJejak {
  const kasus = JSON.parse(readFileSync(`${akar}${konfig.kasus}`, 'utf8')) as {
    emiten: { simbol: string; nama: string };
    nama_samaran: string;
    tanggal_t: string;
  };
  /** Yang tidak boleh ada di data: kode saham dan nama perusahaan (utuh dan tanpa "Tbk"). */
  const terlarang = kataTerlarang(akar, konfig);

  const percobaan: PercobaanJejak[] = [];
  const langkah: LangkahJejak[] = [];
  const sumber: string[] = [];
  let model: string | null = null;

  for (const [indeks, id] of konfig.percobaan.entries()) {
    const folder = `${FOLDER_REKAMAN}/${id}`;
    const hasil = JSON.parse(readFileSync(`${akar}${folder}/hasil.json`, 'utf8')) as HasilPercobaan;
    if (hasil.hari_dipilih !== kasus.tanggal_t) {
      throw new Error(`${folder}: hari ${hasil.hari_dipilih} bukan tanggal simulasi ${kasus.tanggal_t}.`);
    }
    if (model !== null && model !== hasil.model) throw new Error(`${folder}: model berbeda (${hasil.model}).`);
    model = hasil.model;

    const baris = readFileSync(`${akar}${folder}/jejak-agen.jsonl`, 'utf8')
      .split('\n')
      .filter((b) => b.trim() !== '')
      .map((b) => uraiTanpaPenalaran(b) as { jenis?: string });

    const awal = langkah.length;
    let sudahMenulis = false;
    let kini: LangkahJejak | null = null;
    for (const b of baris) {
      if (b.jenis === 'model') {
        const m = b as BarisModel;
        const memanggil = [...m.memanggil];
        if (memanggil.some((t) => !TOOL_BAHAN.includes(t))) sudahMenulis = true;
        kini = {
          no: langkah.length + 1,
          percobaan: indeks,
          tahap: tahapLangkah(hasil.mode, sudahMenulis),
          ke: wajibAngka(m.ke, `${folder} ke`),
          memanggil,
          teks: typeof m.teks === 'string' && m.teks.trim() !== '' ? samarkan(m.teks, terlarang) : null,
          token_masuk: wajibAngka(m.token_masuk, `${folder} token_masuk`),
          token_keluar: wajibAngka(m.token_keluar, `${folder} token_keluar`),
          token_penalaran: wajibAngka(m.token_penalaran, `${folder} token_penalaran`),
          biaya_usd: wajibAngka(m.biaya_usd, `${folder} biaya_usd`),
          biaya_tester_usd: 0,
          latensi_ms: wajibAngka(m.latensi_ms, `${folder} latensi_ms`),
          mode_hemat: typeof m.mode_hemat === 'boolean' ? m.mode_hemat : null,
          hasil: [],
        };
        langkah.push(kini);
      } else if (b.jenis === 'alat') {
        const a = b as BarisAlat;
        if (kini === null) throw new Error(`${folder}: tool result sebelum langkah model pertama.`);
        kini.hasil.push({
          alat: a.alat,
          ringkas: samarkan(a.ringkas, terlarang),
          hasil: samarkanDalam(a.hasil, terlarang),
        });
        kini.biaya_tester_usd = enam(kini.biaya_tester_usd + biayaTester(a.hasil));
      }
      // Baris jenis lain (`percakapan`) tidak dipakai.
    }

    const milik = langkah.slice(awal);
    const agen = enam(milik.reduce((j, l) => j + l.biaya_usd, 0));
    const tester = enam(milik.reduce((j, l) => j + l.biaya_tester_usd, 0));
    // Data hanya ditulis bila cocok dengan `hasil.json` percobaannya.
    if (milik.length !== hasil.langkah) {
      throw new Error(`${folder}: ${String(milik.length)} langkah di jejak, ${String(hasil.langkah)} di hasil.json.`);
    }
    if (Math.abs(agen - hasil.biaya_agen_usd) > 1e-6) {
      throw new Error(`${folder}: biaya model ${String(agen)} ≠ hasil.json ${String(hasil.biaya_agen_usd)}.`);
    }
    // `hasil.json` membulatkan biaya ke empat desimal (dan biaya model lebih dulu), jadi selisihnya < 0,0001.
    if (Math.abs(agen + tester - hasil.biaya_usd) >= 1e-4) {
      throw new Error(`${folder}: biaya ${String(enam(agen + tester))} ≠ hasil.json ${String(hasil.biaya_usd)}.`);
    }

    percobaan.push({
      id: samarkan(hasil.id, terlarang),
      mode: hasil.mode,
      berhenti: samarkan(hasil.berhenti, terlarang),
      pagu_usd: hasil.pagu_usd,
      jumlah_langkah: hasil.langkah,
      biaya_usd: hasil.biaya_usd,
      biaya_agen_usd: agen,
      biaya_tester_usd: tester,
      durasi_detik: hasil.durasi_detik,
    });
    const folderSamar = samarkan(folder, terlarang);
    sumber.push(`${folderSamar}/jejak-agen.jsonl (teks berpikir model tidak ikut)`, `${folderSamar}/hasil.json`);
  }

  if (model === null) throw new Error('Tidak ada percobaan.');

  const tool: ToolJejak[] = [];
  for (const l of langkah) {
    for (const asli of [...l.memanggil, ...l.hasil.map((h) => h.alat)]) {
      const nama = NAMA_LAMA[asli] ?? asli;
      let t = tool.find((x) => x.nama === nama);
      if (t === undefined) {
        t = { nama, nama_lama: [] };
        tool.push(t);
      }
      if (asli !== nama && !t.nama_lama.includes(asli)) t.nama_lama.push(asli);
    }
  }

  const tahap: TahapJejak[] = URUT_TAHAP.map((id) => {
    const milik = langkah.filter((l) => l.tahap === id);
    return {
      id,
      jumlah_langkah: milik.length,
      biaya_usd: enam(milik.reduce((j, l) => j + l.biaya_usd + l.biaya_tester_usd, 0)),
    };
  }).filter((t) => t.jumlah_langkah > 0);

  const data: DataJejak = {
    keterangan: 'Dibaca dari rekaman percobaan AI agent oleh alat/penyusun/rekaman-agen.ts.',
    sumber,
    simulasi: { tanggal: kasus.tanggal_t, nama_samaran: kasus.nama_samaran },
    model,
    jumlah: {
      langkah: langkah.length,
      biaya_usd: enam(percobaan.reduce((j, p) => j + p.biaya_usd, 0)),
    },
    tool,
    tahap,
    percobaan,
    langkah,
  };

  // Pemeriksaan terakhir: tidak satu pun teks atau nama medan memuat yang terlarang.
  const isi = semuaTeksJejak(data);
  for (const kata of terlarang) {
    const bocor = isi.find((t) => t.toLowerCase().includes(kata.toLowerCase()));
    if (bocor !== undefined) throw new Error(`Data jejak masih memuat kode saham atau nama perusahaan.`);
  }
  if (isi.includes(MEDAN_TERLARANG)) throw new Error(`Data jejak memuat medan ${MEDAN_TERLARANG}.`);
  if (isi.some((t) => /[A-Za-z]:[\\/]/.test(t))) throw new Error('Data jejak memuat alamat berkas mesin.');

  return data;
}

export function keJsonJejak(data: DataJejak): string {
  return `${JSON.stringify(data, null, 1)}\n`;
}

/**
 * Kode saham percobaan pertama (`hasil.json` → `kode`): yang diketik penyusun
 * untuk memutar rekaman ini. Hanya dipakai server untuk mencocokkan ketikan;
 * tidak ikut di data tampilan agent.
 */
export function kodeRekaman(akar: string = AKAR, konfig: typeof KONFIG_JEJAK = KONFIG_JEJAK): string {
  const pertama = konfig.percobaan[0];
  if (pertama === undefined) throw new Error('Tidak ada percobaan.');
  const hasil = JSON.parse(readFileSync(`${akar}${FOLDER_REKAMAN}/${pertama}/hasil.json`, 'utf8')) as { kode?: unknown };
  if (typeof hasil.kode !== 'string' || !/^[A-Z]{4}$/.test(hasil.kode)) throw new Error(`${pertama}: hasil.json tanpa kode saham.`);
  return hasil.kode;
}

/** Kata yang tidak boleh ada di data tampilan agent: nama perusahaan (utuh dan tanpa "Tbk") dan kode saham. */
export function kataTerlarang(akar: string = AKAR, konfig: typeof KONFIG_JEJAK = KONFIG_JEJAK): string[] {
  const kasus = JSON.parse(readFileSync(`${akar}${konfig.kasus}`, 'utf8')) as { emiten: { simbol: string; nama: string } };
  return [kasus.emiten.nama, kasus.emiten.nama.replace(/\s+Tbk\.?$/i, ''), kasus.emiten.simbol];
}
