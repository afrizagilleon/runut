/**
 * Kata-kata dan hitungan tampilan AI agent di pintu penyusun, sebagai fungsi
 * murni. Dipakai server (`replay-agen.ts`) untuk menyiapkan apa yang dikirim
 * ke peramban; halaman hanya menggambar.
 *
 * Datanya dibaca `rekaman-agen.ts` dari rekaman percobaan AI agent. Fungsi di
 * sini hanya MEMILIH dan MENATA yang ada di sana: status dibaca dari medan
 * `lolos` tool result, jenis penolakan dari medan `berhenti` (atau awalan kode
 * di alasan pemeriksa aturan).
 *
 * Rekaman memakai istilah internal (kode aturan, nama pemeriksaan buatan).
 * Istilah itu TIDAK tampil di tampilan Ringkas dan Diagram: `barisBaca`
 * menulis satu kalimat yang bisa dibaca dari jenis penolakannya, lewat peta
 * yang eksplisit di bawah. Jenis yang tidak dikenal jatuh ke kalimat netral,
 * bukan ke teks rekaman. Teks rekaman aslinya hanya ada di tampilan Rinci, di
 * dalam lipatan "rekaman asli".
 */
import type { DataJejak, HasilTool, IdTahap, LangkahJejak, ToolJejak } from './rekaman-agen.ts';

/** "1.234" — pemisah ribuan Indonesia untuk bilangan bulat. */
export function angkaId(nilai: number): string {
  return String(Math.trunc(nilai)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export type Tampilan = 'ringkas' | 'rinci' | 'diagram';

export const TAMPILAN: ReadonlyArray<{ id: Tampilan; label: string }> = [
  { id: 'ringkas', label: 'Ringkas' },
  { id: 'rinci', label: 'Rinci' },
  { id: 'diagram', label: 'Diagram' },
];

/** Nama tahap untuk pembaca. */
export const NAMA_TAHAP: Readonly<Record<IdTahap, string>> = {
  bahan: 'Mencari bahan',
  tulis: 'Menulis dan menguji',
  naik: 'Menaikkan kesulitan',
  lengkap: 'Melengkapi simulasi',
};

/**
 * Status satu tool result, dengan kata kerja cara kerjanya (M2d-32 D-7):
 * - `lolos`: tool meloloskan;
 * - `perbaiki`: tool meminta perbaikan, dan itu memang bisa dijawab agent dengan menulis ulang;
 * - `tidak-dipakai`: tool tidak meloloskan dan tidak ada yang ditulis ulang
 *   (mis. versi baru tidak lebih sulit, jadi versi asal yang dipakai).
 */
export type Status = 'lolos' | 'perbaiki' | 'tidak-dipakai';

function medan(nilai: unknown, nama: string): unknown {
  if (nilai !== null && typeof nilai === 'object' && nama in nilai) {
    return (nilai as Record<string, unknown>)[nama];
  }
  return undefined;
}

/**
 * Medan `lolos` yang dicatat tool itu. Tool yang hanya membaca bahan tidak
 * punya medan itu: `null`.
 */
export function lolosHasil(h: HasilTool): boolean | null {
  const lolos = medan(h.hasil, 'lolos');
  return lolos === true ? true : lolos === false ? false : null;
}

/** Status satu tool result; `null` untuk tool yang hanya membaca bahan. */
export function statusHasil(h: HasilTool): Status | null {
  const lolos = lolosHasil(h);
  if (lolos === null) return null;
  if (lolos) return 'lolos';
  const jenis = jenisTolak(h) ?? 'tak-dikenal';
  return JENIS_DIPERBAIKI.includes(jenis) ? 'perbaiki' : 'tidak-dipakai';
}

/** Medan tempat tool mencatat alasan penolakannya (penguji, pemeriksa aturan, kritikus). */
const MEDAN_ALASAN: readonly string[] = ['penolakan', 'masalah', 'keberatan'];

/** Semua alasan penolakan satu tool result, persis seperti di rekaman. */
export function alasanTolak(h: HasilTool): string[] {
  const keluar: string[] = [];
  for (const nama of MEDAN_ALASAN) {
    const daftar = medan(h.hasil, nama);
    if (Array.isArray(daftar)) for (const a of daftar) if (typeof a === 'string') keluar.push(a);
  }
  return keluar;
}

/* --- nama tool dalam bahasa biasa -------------------------------------------- */

/**
 * Keterangan satu baris tiap tool, ditulis di bawah namanya (M2d-32 D-3). Nama
 * tool sendiri nama sungguhan. "Tanpa biaya" tidak diulang di sini: itu nama
 * kelompoknya (`KELOMPOK_TOOL`).
 */
export const KETERANGAN_TOOL: Readonly<Record<string, string>> = {
  usulkan_hari: 'mencari hari yang ada peristiwanya',
  periksa_saham: 'mengambil data hari itu dan memverifikasinya',
  lihat_fakta: 'membaca kartu fakta hari itu',
  lihat_bank: 'melihat soal yang sudah lolos',
  lihat_simulasi: 'membaca soal versi asal dan skornya',
  lihat_soal_terkunci: 'membaca soal yang sudah jadi',
  lihat_sesudahnya: 'membaca data sesudah hari simulasi',
  periksa_kode: 'memeriksa satu draf dengan aturan',
  periksa_draft_dengan_aturan: 'memeriksa satu draf dengan aturan',
  periksa_kasus_dengan_aturan: 'memeriksa simulasi lengkap dengan aturan',
  ajukan: 'mengirim draf ke para penguji',
  tingkatkan: 'menguji versi yang lebih sulit',
  ajukan_kasus: 'mengirim simulasi lengkap ke kritikus',
};

/* --- kelompok tool ---------------------------------------------------------- */

export type IdKelompok = 'bahan' | 'catatan' | 'periksa' | 'uji';

/**
 * Tool dikelompokkan menurut GUNANYA (M2d-32 D-2), bukan menurut kapan
 * dipanggil: yang mengambil bahan, yang membaca catatan, yang memeriksa tanpa
 * biaya, dan yang menguji dengan biaya. Tiap kelompok satu lembar di diagram.
 */
export const KELOMPOK_TOOL: ReadonlyArray<{ id: IdKelompok; nama: string; tool: readonly string[] }> = [
  { id: 'bahan', nama: 'Bahan', tool: ['usulkan_hari', 'periksa_saham', 'lihat_fakta'] },
  { id: 'catatan', nama: 'Catatan', tool: ['lihat_bank', 'lihat_simulasi', 'lihat_soal_terkunci', 'lihat_sesudahnya'] },
  { id: 'periksa', nama: 'Pemeriksaan tanpa biaya', tool: ['periksa_draft_dengan_aturan', 'periksa_kasus_dengan_aturan'] },
  { id: 'uji', nama: 'Uji berbayar', tool: ['ajukan', 'tingkatkan', 'ajukan_kasus'] },
];

/** Kelompok sebuah tool (nama sekarang), atau `null` bila tool itu belum dikelompokkan. */
export function kelompokTool(nama: string): IdKelompok | null {
  return KELOMPOK_TOOL.find((k) => k.tool.includes(nama))?.id ?? null;
}

/** Keterangan sebuah tool, atau `null` bila namanya belum dikenal (nama saja yang tampil). */
export function keteranganTool(nama: string): string | null {
  return KETERANGAN_TOOL[nama] ?? null;
}

/* --- satu kalimat yang bisa dibaca per tool result --------------------------- */

/** Jenis penolakan, dari medan terstruktur rekaman. */
export type JenisTolak =
  | 'tebak-tanpa-kartu'
  | 'pembaca-kartu'
  | 'penguji-opus'
  | 'kritikus'
  | 'tidak-lebih-sulit'
  | 'tanpa-skor'
  | 'kritikus-tak-menjawab'
  | 'bukan-yang-kurang'
  | 'budget'
  | 'sudah-dikirim'
  | 'bentuk'
  | 'aturan'
  | 'tak-dikenal';

/** Nilai medan `berhenti` di tool result → jenis penolakan. */
export const PETA_BERHENTI: Readonly<Record<string, JenisTolak>> = {
  saringan: 'tebak-tanpa-kartu',
  kartu: 'pembaca-kartu',
  'penebak-kuat': 'penguji-opus',
  kritikus: 'kritikus',
  critic: 'kritikus',
  'tidak-naik': 'tidak-lebih-sulit',
  'tak-terukur': 'tanpa-skor',
  'galat-critic': 'kritikus-tak-menjawab',
  kebutuhan: 'bukan-yang-kurang',
  anggaran: 'budget',
  'sudah-diajukan': 'sudah-dikirim',
  'sudah-terbit': 'sudah-dikirim',
  bentuk: 'bentuk',
  kode: 'aturan',
};

/** Tool pemeriksa aturan (gratis): tool result-nya tidak punya medan `berhenti`. */
export const TOOL_ATURAN: readonly string[] = ['periksa_kode', 'periksa_draft_dengan_aturan', 'periksa_kasus_dengan_aturan'];

/** Tool yang memeriksa simulasi lengkap, bukan satu draf. */
const TOOL_SIMULASI: readonly string[] = ['periksa_kasus_dengan_aturan', 'ajukan_kasus'];

/**
 * Awalan kode di alasan pemeriksa aturan → sebab dalam bahasa biasa. Kodenya
 * sendiri tidak pernah tampil di luar lipatan "rekaman asli".
 */
export const PETA_KODE_ATURAN: ReadonlyArray<{ kode: RegExp; sebab: string }> = [
  { kode: /^pemeriksa: G-angka-cukup/, sebab: 'jawaban benar bisa dihitung dari angka di pesan dan pilihan, tanpa kartu' },
  { kode: /^gerbang artefak: meresmikan/, sebab: 'pilihan benar bisa dikenali tanpa kartu karena mengulang angka dari pesan' },
  { kode: /^gerbang artefak: keseimbangan/, sebab: 'pilihan benar bisa dikenali tanpa kartu dari bentuknya' },
  { kode: /^pemeriksa: G-panjang/, sebab: 'pesannya terlalu panjang' },
  { kode: /^pemeriksa: OPSI_PANJANG_TIMPANG/, sebab: 'panjang pilihan tidak seimbang' },
  { kode: /^pemeriksa: ANGKA_TANPA_RUJUKAN/, sebab: 'ada angka tanpa kartu sumbernya' },
  { kode: /^pemeriksa: (?:G-penilaian|KATA_PENILAIAN|AJAKAN_TRANSAKSI)/, sebab: 'ada kata penilaian saham atau ajakan membeli atau menjual' },
];

/** Jenis keberatan kritikus (tanda "[kritikus: jenis, bagian]" di rekaman) → sebab dalam bahasa biasa. */
export const PETA_KRITIKUS: Readonly<Record<string, string>> = {
  kunci: 'jawaban benar tidak sepenuhnya didukung kartu fakta',
  makna: 'ada kalimat di pesan yang tidak didukung kartu fakta',
  ambigu: 'ada pilihan yang bisa dibaca dua arti',
  tertebak: 'jawaban benar bisa ditebak tanpa membaca kartu',
  bahasa: 'bahasanya belum seperti obrolan teman',
  aturan: 'ada isi yang melanggar aturan penulisan soal',
};

/** Jenis penolakan satu tool result; `null` bila tool result itu bukan penolakan. */
export function jenisTolak(h: HasilTool): JenisTolak | null {
  if (lolosHasil(h) !== false) return null;
  const berhenti = medan(h.hasil, 'berhenti');
  if (typeof berhenti === 'string') return PETA_BERHENTI[berhenti] ?? 'tak-dikenal';
  return TOOL_ATURAN.includes(h.alat) ? 'aturan' : 'tak-dikenal';
}

function sebabAturan(h: HasilTool): string | null {
  const pertama = alasanTolak(h)[0] ?? '';
  return PETA_KODE_ATURAN.find((x) => x.kode.test(pertama))?.sebab ?? null;
}

function sebabKritikus(h: HasilTool): string | null {
  for (const a of alasanTolak(h)) {
    const jenis = /^\[kritikus: ([a-z]+)[,\]]/.exec(a)?.[1];
    const sebab = jenis === undefined ? undefined : PETA_KRITIKUS[jenis];
    if (sebab !== undefined) return sebab;
  }
  return null;
}

/**
 * Apakah SEMUA tebakan tanpa kartu memilih jawaban benar ("memilih kunci n dari
 * n" di alasan rekaman). Hitungannya sendiri tidak ditulis di kalimat (M2d-32
 * D-7): yang perlu dibaca adalah apa yang terjadi, bukan pecahannya.
 */
function semuaTebakanBenar(h: HasilTool): boolean {
  const m = /memilih kunci (\d+) dari (\d+)/.exec(alasanTolak(h)[0] ?? '');
  return m?.[1] !== undefined && m[1] === m[2];
}

function panjangLarik(nilai: unknown, nama: string): number | null {
  const x = medan(nilai, nama);
  return Array.isArray(x) ? x.length : null;
}

function angkaMedan(nilai: unknown, nama: string): number | null {
  const x = medan(nilai, nama);
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

/**
 * Kalimat untuk tiap jenis tool result yang tidak meloloskan. `obyek` = "draf
 * ini" atau "simulasi ini". Ditulis dengan kata kerja cara kerjanya (siapa
 * meminta apa), dan tidak memuat teks rekaman.
 */
export function kalimatTolak(h: HasilTool, jenis: JenisTolak, obyek: string): string {
  switch (jenis) {
    case 'tebak-tanpa-kartu': {
      return semuaTebakanBenar(h)
        ? 'Penebak tanpa kartu masih bisa menebak jawabannya: semua tebakannya memilih jawaban benar.'
        : 'Penebak tanpa kartu masih bisa menebak jawabannya.';
    }
    case 'pembaca-kartu':
      return 'Pembaca kartu menjawab keliru walau sudah membaca kartu: soalnya belum cukup jelas.';
    case 'penguji-opus':
      return 'Penguji Opus masih bisa menebak jawabannya tanpa kartu.';
    case 'kritikus': {
      const sebab = sebabKritikus(h);
      return sebab === null ? `Kritikus meminta ${obyek} diperbaiki.` : `Kritikus meminta perbaikan: ${sebab}.`;
    }
    case 'tidak-lebih-sulit':
      return 'Para penguji menilai versi baru tidak lebih sulit dari versi asal. Versi asal dipertahankan.';
    case 'tanpa-skor':
      return `Penguji belum bisa memberi skor untuk ${obyek}.`;
    case 'kritikus-tak-menjawab':
      return `Kritikus belum memberi jawaban untuk ${obyek}.`;
    case 'bukan-yang-kurang':
      return `Tool tidak menguji ${obyek}, tanpa biaya: bukan yang masih kurang untuk simulasi.`;
    case 'budget':
      return `Budget tidak cukup untuk menguji ${obyek}.`;
    case 'sudah-dikirim':
      return `Tool tidak menguji ${obyek}, tanpa biaya: sudah pernah dikirim.`;
    case 'bentuk':
      return 'Tool meminta tool call diperbaiki, tanpa biaya: isinya tidak sesuai bentuk yang diminta.';
    case 'aturan': {
      const sebab = sebabAturan(h);
      return sebab === null ? `Pemeriksa aturan meminta ${obyek} diperbaiki.` : `Pemeriksa aturan meminta perbaikan: ${sebab}.`;
    }
    case 'tak-dikenal':
      return `Penguji meminta ${obyek} diperbaiki.`;
  }
}

/** Kalimat sambungan bila di langkah berikutnya agent menulis draf baru. */
export const KALIMAT_MENULIS_ULANG = 'Agent menulis ulang.';

/** Jenis yang dijawab agent dengan menulis ulang (bukan budget habis atau salah kirim): status `perbaiki`. */
export const JENIS_DIPERBAIKI: readonly JenisTolak[] = [
  'tebak-tanpa-kartu',
  'pembaca-kartu',
  'penguji-opus',
  'kritikus',
  'aturan',
  'bentuk',
  'tak-dikenal',
];

function kalimatLolos(h: HasilTool, obyek: string): string {
  if (TOOL_ATURAN.includes(h.alat)) return `Pemeriksa aturan meloloskan ${obyek}.`;
  if (h.alat === 'ajukan') return 'Semua penguji meloloskan draf ini. Soalnya masuk kumpulan soal yang lolos.';
  if (h.alat === 'tingkatkan') return 'Semua penguji meloloskan versi baru: lebih sulit dari versi asal.';
  if (h.alat === 'ajukan_kasus') return 'Kritikus meloloskan simulasi ini. Simulasinya jadi.';
  return `Tool meloloskan ${obyek}.`;
}

/** Kalimat untuk tool yang hanya membaca bahan (tanpa medan `lolos`). */
function kalimatBaca(h: HasilTool): string {
  const x = h.hasil;
  switch (h.alat) {
    case 'usulkan_hari': {
      const n = panjangLarik(x, 'hari');
      return n === null ? 'Tool mengusulkan hari untuk dipilih agent.' : `Tool mengusulkan ${angkaId(n)} hari untuk dipilih agent.`;
    }
    case 'periksa_saham': {
      const aturan = angkaMedan(x, 'aturan_dijalankan');
      const lolos = angkaMedan(x, 'kartu_lolos');
      const singkir = panjangLarik(x, 'disingkirkan');
      return aturan === null || lolos === null || singkir === null
        ? 'Kode memverifikasi data hari itu dan menyusun kartu fakta.'
        : `Kode menjalankan ${angkaId(aturan)} aturan verifikasi: ${angkaId(lolos)} kartu fakta lolos, ${angkaId(singkir)} disingkirkan.`;
    }
    case 'lihat_bank': {
      const n = panjangLarik(x, 'omongan');
      if (n === null) return 'Agent melihat kumpulan soal yang lolos.';
      return n === 0 ? 'Kumpulan soal yang lolos masih kosong.' : `Kumpulan soal yang lolos berisi ${angkaId(n)} soal.`;
    }
    case 'lihat_fakta':
      return 'Agent membaca kartu fakta hari itu.';
    case 'lihat_simulasi': {
      const n = panjangLarik(x, 'omongan');
      return n === null ? 'Agent membaca soal versi asal dan skornya.' : `Agent membaca ${angkaId(n)} soal versi asal dan skornya.`;
    }
    case 'lihat_soal_terkunci': {
      const n = panjangLarik(x, 'omongan');
      return n === null ? 'Agent membaca soal yang sudah jadi.' : `Agent membaca ${angkaId(n)} soal yang sudah jadi.`;
    }
    case 'lihat_sesudahnya':
      return 'Agent membaca data sesudah hari simulasi.';
    default:
      return 'Agent menerima tool result.';
  }
}

export interface BarisBaca {
  status: Status | null;
  /** Jenis penolakan; `null` bila bukan penolakan. */
  jenis: JenisTolak | null;
  /** Satu kalimat dalam bahasa biasa. Tidak pernah memuat teks rekaman selain angka. */
  kalimat: string;
}

/**
 * Satu tool result sebagai satu kalimat yang bisa dibaca. Kalimatnya dipilih
 * dari peta di atas menurut nama tool dan medan `lolos`/`berhenti`; yang
 * diambil dari rekaman hanya angka.
 */
export function barisBaca(h: HasilTool): BarisBaca {
  const status = statusHasil(h);
  const obyek = TOOL_SIMULASI.includes(h.alat) ? 'simulasi ini' : 'draf ini';
  if (status === null) return { status, jenis: null, kalimat: kalimatBaca(h) };
  if (status === 'lolos') return { status, jenis: null, kalimat: kalimatLolos(h, obyek) };
  const jenis = jenisTolak(h) ?? 'tak-dikenal';
  return { status, jenis, kalimat: kalimatTolak(h, jenis, obyek) };
}

/** Tool yang dipilih agent di langkah ini tetapi tidak punya tool result di rekaman langkah itu. */
export function tanpaHasil(l: LangkahJejak): string[] {
  return l.memanggil.filter((t) => !l.hasil.some((h) => h.alat === t));
}

/** "96,7 detik" — satu desimal, koma desimal. */
export function detik(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} detik`;
}

/** "US$1,84" — dua desimal, koma desimal. */
export function dolar(nilai: number): string {
  return `US$${nilai.toFixed(2).replace('.', ',')}`;
}

/** "US$0,0054" — empat desimal untuk biaya satu langkah (dua desimal menjadikannya nol). */
export function dolarRinci(nilai: number): string {
  return `US$${nilai.toFixed(4).replace('.', ',')}`;
}

/** Langkah-langkah satu tahap, urut. */
export function langkahTahap(data: DataJejak, id: IdTahap): LangkahJejak[] {
  return data.langkah.filter((l) => l.tahap === id);
}

/** Indeks simpul diagram untuk sebuah nama tool di rekaman (nama lama ikut simpul nama sekarang). */
export function simpulTool(tool: readonly ToolJejak[], nama: string): number {
  return tool.findIndex((t) => t.nama === nama || t.nama_lama.includes(nama));
}

/** Simpul yang menyala di sebuah langkah: tool yang dipilih agent di langkah itu. */
export function simpulNyala(tool: readonly ToolJejak[], l: Pick<LangkahJejak, 'memanggil' | 'hasil'>): number[] {
  const keluar: number[] = [];
  for (const nama of [...l.memanggil, ...l.hasil.map((h) => h.alat)]) {
    const i = simpulTool(tool, nama);
    if (i >= 0 && !keluar.includes(i)) keluar.push(i);
  }
  return keluar;
}

/* --- geometri diagram ------------------------------------------------------- */

/**
 * AI agent SATU lembar di tengah bidang; tool mengelilinginya, dikelompokkan
 * menurut gunanya: tiap kelompok satu lembar berkepala nama kelompok, tiap tool
 * satu baris di lembar itu (M2d-32 D-1, D-2). Tiap tool hanya terhubung ke
 * agent — tidak ada garis dari tool ke tool, dan tempat sebuah tool tidak
 * mengatakan kapan ia dipanggil: bukan urutan kotak, bukan lajur waktu
 * (`docs/arsitektur-agen.md`).
 *
 * Dua tata letak dengan aturan yang sama. `lebar` (layar ≥ 1200 px): empat
 * lembar di empat sisi agent, tiap tool dengan keterangannya. `tegak` (layar
 * lebih sempit): dua lembar di atas agent dan dua di bawah, garis lewat celah
 * di antara dua lembar; keterangan tool tidak muat di baris selebar itu dan
 * tampil di catatan langkah di bawah diagram (M2d-32 OQ-1).
 */
export interface Titik {
  x: number;
  y: number;
}

export interface Kotak {
  /** Titik tengah. */
  cx: number;
  cy: number;
  lebar: number;
  tinggi: number;
}

/** Sisi kotak tool yang menghadap agent: di sisi itu garis agent ⇄ tool berujung. */
export type Hadap = 'atas' | 'bawah' | 'kiri' | 'kanan';

export interface LembarKelompok {
  id: IdKelompok;
  /** Seluruh lembar: kepala + baris tool. */
  lembar: Kotak;
  /** Kepala lembar (tempat nama kelompok). */
  kepala: Kotak;
  hadap: Hadap;
  /** Kotak tiap tool, urutan sama dengan `KELOMPOK_TOOL`. */
  tool: Kotak[];
}

export interface TataDiagram {
  bidang: { lebar: number; tinggi: number };
  agen: Kotak;
  kelompok: readonly LembarKelompok[];
  /** Apakah keterangan tool ditulis di dalam barisnya. */
  keterangan: boolean;
}

function kotakDari(x: number, y: number, lebar: number, tinggi: number): Kotak {
  return { cx: x + lebar / 2, cy: y + tinggi / 2, lebar, tinggi };
}

/**
 * Satu lembar kelompok dengan sudut kiri atas (x, y). `susun`: 'kolom' = tool
 * bertumpuk ke bawah selebar lembar; 'baris' = tool berjajar ke samping.
 */
function lembarKelompok(
  id: IdKelompok,
  x: number,
  y: number,
  lebar: number,
  ukuran: { kepala: number; tool: number },
  susun: 'kolom' | 'baris',
  hadap: Hadap,
): LembarKelompok {
  const n = KELOMPOK_TOOL.find((k) => k.id === id)?.tool.length ?? 0;
  const tinggi = ukuran.kepala + (susun === 'kolom' ? n * ukuran.tool : ukuran.tool);
  // Lembar yang tool-nya menghadap ke atas (lembar di bawah agent) berkepala di
  // BAWAH: garis ke tool tidak boleh melewati kepala lembarnya sendiri.
  const kepalaDiBawah = hadap === 'atas';
  const yTool = kepalaDiBawah ? y : y + ukuran.kepala;
  const yKepala = kepalaDiBawah ? y + tinggi - ukuran.kepala : y;
  const tool: Kotak[] = [];
  for (let i = 0; i < n; i++) {
    tool.push(susun === 'kolom' ? kotakDari(x, yTool + i * ukuran.tool, lebar, ukuran.tool) : kotakDari(x + (i * lebar) / n, yTool, lebar / n, ukuran.tool));
  }
  return { id, lembar: kotakDari(x, y, lebar, tinggi), kepala: kotakDari(x, yKepala, lebar, ukuran.kepala), hadap, tool };
}

/** Tinggi sebuah lembar kolom berisi n tool. */
const tinggiKolom = (n: number, u: { kepala: number; tool: number }): number => u.kepala + n * u.tool;

/**
 * Layar lebar, satuan = 1 px di jendela 1280 px (bidang 1160 px). Bahan di atas
 * dan uji berbayar di bawah (tool berjajar), catatan di kiri dan pemeriksaan
 * tanpa biaya di kanan (tool bertumpuk). Lembar atas dan bawah lebih sempit
 * dari bidang supaya garis ke tool terluarnya tidak melewati lembar kiri atau
 * kanan; pojok kiri atas yang kosong dipakai legenda. Lembar kiri dan kanan
 * selebar 290: nama tool terpanjang (27 huruf mesin 14 px) muat satu baris.
 */
const U_LEBAR = { kepala: 28, tool: 64 };
const T_LEBAR = 516;
export const TATA_LEBAR: TataDiagram = {
  bidang: { lebar: 1160, tinggi: T_LEBAR },
  agen: { cx: 580, cy: T_LEBAR / 2, lebar: 216, tinggi: 132 },
  keterangan: true,
  kelompok: [
    lembarKelompok('bahan', 230, 0, 700, U_LEBAR, 'baris', 'bawah'),
    lembarKelompok('catatan', 0, (T_LEBAR - tinggiKolom(4, U_LEBAR)) / 2, 290, U_LEBAR, 'kolom', 'kanan'),
    lembarKelompok('periksa', 870, (T_LEBAR - tinggiKolom(2, U_LEBAR)) / 2, 290, U_LEBAR, 'kolom', 'kiri'),
    lembarKelompok('uji', 230, T_LEBAR - (U_LEBAR.kepala + U_LEBAR.tool), 700, U_LEBAR, 'baris', 'atas'),
  ],
};

/**
 * Layar sempit, satuan ≈ 1 px di jendela 375 px. Dua lembar di atas agent, dua
 * di bawah; celah 28 di tengah tempat garis lewat. Lembar atas rata bawah dan
 * lembar bawah rata atas, supaya semuanya menempel ke ruang agent.
 */
const U_TEGAK = { kepala: 24, tool: 38 };
const ATAS_TEGAK = tinggiKolom(4, U_TEGAK);
/** Lembar agent setinggi 116: nama, keadaan, dan dua cap bertumpuk muat di dalamnya. */
const T_AGEN_TEGAK = 116;
const BAWAH_TEGAK = ATAS_TEGAK + 40 + T_AGEN_TEGAK + 40;
export const TATA_TEGAK: TataDiagram = {
  bidang: { lebar: 320, tinggi: BAWAH_TEGAK + tinggiKolom(3, U_TEGAK) },
  agen: { cx: 160, cy: ATAS_TEGAK + 40 + T_AGEN_TEGAK / 2, lebar: 172, tinggi: T_AGEN_TEGAK },
  keterangan: false,
  kelompok: [
    lembarKelompok('bahan', 0, ATAS_TEGAK - tinggiKolom(3, U_TEGAK), 146, U_TEGAK, 'kolom', 'kanan'),
    lembarKelompok('catatan', 174, 0, 146, U_TEGAK, 'kolom', 'kiri'),
    lembarKelompok('periksa', 0, BAWAH_TEGAK, 146, U_TEGAK, 'kolom', 'kanan'),
    lembarKelompok('uji', 174, BAWAH_TEGAK, 146, U_TEGAK, 'kolom', 'kiri'),
  ],
};

/** Titik di tepi kotak pada garis dari tengah kotak ke arah `ke`. */
export function tepiKotak(k: Kotak, ke: Titik): Titik {
  const dx = ke.x - k.cx;
  const dy = ke.y - k.cy;
  if (dx === 0 && dy === 0) return { x: k.cx, y: k.cy };
  const skala = Math.min(
    dx === 0 ? Infinity : k.lebar / 2 / Math.abs(dx),
    dy === 0 ? Infinity : k.tinggi / 2 / Math.abs(dy),
  );
  return { x: k.cx + dx * skala, y: k.cy + dy * skala };
}

/** Titik tengah sisi kotak tool yang menghadap agent. */
export function jangkarTool(k: Kotak, hadap: Hadap): Titik {
  switch (hadap) {
    case 'atas':
      return { x: k.cx, y: k.cy - k.tinggi / 2 };
    case 'bawah':
      return { x: k.cx, y: k.cy + k.tinggi / 2 };
    case 'kiri':
      return { x: k.cx - k.lebar / 2, y: k.cy };
    case 'kanan':
      return { x: k.cx + k.lebar / 2, y: k.cy };
  }
}

export interface GarisTool {
  /** Ujung di tepi lembar agent. */
  agen: Titik;
  /** Ujung di tepi kotak tool, di sisi yang menghadap agent. */
  tool: Titik;
}

/** Tempat sebuah tool (nama sekarang) di sebuah tata letak; `null` bila tool itu belum dikelompokkan. */
export function tempatTool(tata: TataDiagram, nama: string): { kelompok: LembarKelompok; kotak: Kotak } | null {
  for (const k of tata.kelompok) {
    const i = KELOMPOK_TOOL.find((x) => x.id === k.id)?.tool.indexOf(nama) ?? -1;
    const kotak = i < 0 ? undefined : k.tool[i];
    if (kotak !== undefined) return { kelompok: k, kotak };
  }
  return null;
}

/** Garis dua arah antara agent dan satu tool: tool call ke tool, tool result kembali ke agent. */
export function garisTool(tata: TataDiagram, kotak: Kotak, hadap: Hadap): GarisTool {
  const tool = jangkarTool(kotak, hadap);
  return { agen: tepiKotak(tata.agen, tool), tool };
}

export interface PersenKotak {
  left: string;
  top: string;
  width: string;
  height: string;
}

/** Persen `left`/`top`/`width`/`height` sebuah kotak di atas bidang diagram. */
export function persenKotak(tata: TataDiagram, k: Kotak): PersenKotak {
  const p = (nilai: number, dari: number): string => `${String(Math.round((nilai / dari) * 1e4) / 100)}%`;
  return {
    left: p(k.cx - k.lebar / 2, tata.bidang.lebar),
    top: p(k.cy - k.tinggi / 2, tata.bidang.tinggi),
    width: p(k.lebar, tata.bidang.lebar),
    height: p(k.tinggi, tata.bidang.tinggi),
  };
}
