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

export type Status = 'lolos' | 'ditolak';

function medan(nilai: unknown, nama: string): unknown {
  if (nilai !== null && typeof nilai === 'object' && nama in nilai) {
    return (nilai as Record<string, unknown>)[nama];
  }
  return undefined;
}

/**
 * Status satu tool result, dari medan `lolos` yang dicatat tool itu. Tool yang
 * hanya membaca bahan tidak punya medan itu dan tidak berstatus.
 */
export function statusHasil(h: HasilTool): Status | null {
  const lolos = medan(h.hasil, 'lolos');
  if (lolos === true) return 'lolos';
  if (lolos === false) return 'ditolak';
  return null;
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
 * Keterangan singkat tiap tool, ditulis di sebelah namanya. Nama tool sendiri
 * selalu ditulis persis seperti di rekaman: itu nama sungguhan.
 */
export const KETERANGAN_TOOL: Readonly<Record<string, string>> = {
  usulkan_hari: 'mencari hari yang ada peristiwanya',
  periksa_saham: 'mengambil data hari itu dan memverifikasinya',
  lihat_bank: 'melihat kumpulan soal yang lolos',
  lihat_fakta: 'membaca kartu fakta hari itu',
  lihat_simulasi: 'membaca soal versi asal dan skornya',
  periksa_kode: 'pemeriksa aturan untuk draf, gratis',
  periksa_draft_dengan_aturan: 'pemeriksa aturan untuk draf, gratis',
  ajukan: 'mengirim draf ke para penguji',
  tingkatkan: 'menguji versi yang lebih sulit',
  lihat_soal_terkunci: 'membaca soal yang sudah jadi',
  lihat_sesudahnya: 'membaca data sesudah hari simulasi',
  periksa_kasus_dengan_aturan: 'pemeriksa aturan untuk simulasi lengkap, gratis',
  ajukan_kasus: 'mengirim simulasi lengkap ke kritikus',
};

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
  if (statusHasil(h) !== 'ditolak') return null;
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

/** Hitungan uji tebak tanpa kartu ("memilih kunci 12 dari 12" di alasan rekaman): [benar, jumlah tebakan]. */
function hitunganTebak(h: HasilTool): [string, string] | null {
  const m = /memilih kunci (\d+) dari (\d+)/.exec(alasanTolak(h)[0] ?? '');
  return m?.[1] !== undefined && m[2] !== undefined ? [m[1], m[2]] : null;
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
 * Kalimat penolakan untuk tiap jenis. `obyek` = "draf ini" atau "simulasi ini".
 * Yang diambil dari rekaman hanya angka (hitungan tebakan); sisanya kata kami.
 */
export function kalimatTolak(h: HasilTool, jenis: JenisTolak, obyek: string): string {
  switch (jenis) {
    case 'tebak-tanpa-kartu': {
      const n = hitunganTebak(h);
      return n === null
        ? 'Penebak tanpa kartu masih bisa menebak jawabannya.'
        : `Penebak tanpa kartu masih bisa menebak jawabannya: ${n[0]} dari ${n[1]} tebakan memilih jawaban benar.`;
    }
    case 'pembaca-kartu':
      return 'Pembaca kartu menjawab keliru walau sudah membaca kartu: soalnya belum cukup jelas.';
    case 'penguji-opus':
      return 'Penguji Opus masih bisa menebak jawabannya tanpa kartu.';
    case 'kritikus': {
      const sebab = sebabKritikus(h);
      return sebab === null ? `Kritikus menolak ${obyek}.` : `Kritikus menolak: ${sebab}.`;
    }
    case 'tidak-lebih-sulit':
      return 'Para penguji menilai versi baru tidak lebih sulit dari versi asal. Versi asal dipertahankan.';
    case 'tanpa-skor':
      return `Penguji belum bisa memberi skor untuk ${obyek}.`;
    case 'kritikus-tak-menjawab':
      return `Kritikus belum memberi jawaban untuk ${obyek}.`;
    case 'bukan-yang-kurang':
      return `Tool menolak tanpa biaya: ${obyek} bukan yang masih kurang untuk simulasi.`;
    case 'budget':
      return `Budget tidak cukup untuk menguji ${obyek}.`;
    case 'sudah-dikirim':
      return `Tool menolak tanpa biaya: ${obyek} sudah pernah dikirim.`;
    case 'bentuk':
      return 'Tool menolak tanpa biaya: isi tool call tidak sesuai bentuk yang diminta.';
    case 'aturan': {
      const sebab = sebabAturan(h);
      return sebab === null ? `Pemeriksa aturan menolak ${obyek}.` : `Pemeriksa aturan menolak: ${sebab}.`;
    }
    case 'tak-dikenal':
      return `Penguji menolak ${obyek}.`;
  }
}

/** Kalimat sambungan bila di langkah berikutnya agent menulis draf baru. */
export const KALIMAT_MENULIS_ULANG = 'Agent menulis ulang.';

/** Jenis penolakan yang dijawab agent dengan menulis ulang (bukan budget habis atau salah kirim). */
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
 * AI agent SATU kotak di tengah bidang; tool mengelilinginya di dua belas
 * tempat. Tiap tool hanya terhubung ke agent — tidak ada garis dari tool ke
 * tool, dan tempat sebuah tool tidak mengatakan kapan ia dipanggil: bukan
 * urutan kotak, bukan lajur waktu (`docs/arsitektur-agen.md`).
 *
 * Dua tata letak dengan aturan yang sama: `tegak` untuk layar sempit (tiga
 * tool di tiap sisi) dan `lebar` untuk layar lebar (empat di atas, empat di
 * bawah, dua di kiri, dua di kanan).
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

export interface TataDiagram {
  bidang: { lebar: number; tinggi: number };
  agen: Kotak;
  ukuranTool: { lebar: number; tinggi: number };
  /** Titik tengah dua belas tempat tool, searah jarum jam dari kiri atas. */
  tempat: readonly Titik[];
}

export const TATA_TEGAK: TataDiagram = {
  bidang: { lebar: 100, tinggi: 150 },
  agen: { cx: 50, cy: 75, lebar: 24, tinggi: 30 },
  // Tinggi 20: nama tool terpanjang patah jadi empat baris di layar 375 px.
  ukuranTool: { lebar: 28, tinggi: 20 },
  tempat: [
    { x: 14.5, y: 11 },
    { x: 50, y: 11 },
    { x: 85.5, y: 11 },
    { x: 85.5, y: 48 },
    { x: 85.5, y: 75 },
    { x: 85.5, y: 102 },
    { x: 85.5, y: 139 },
    { x: 50, y: 139 },
    { x: 14.5, y: 139 },
    { x: 14.5, y: 102 },
    { x: 14.5, y: 75 },
    { x: 14.5, y: 48 },
  ],
};

export const TATA_LEBAR: TataDiagram = {
  bidang: { lebar: 160, tinggi: 96 },
  agen: { cx: 80, cy: 48, lebar: 30, tinggi: 22 },
  ukuranTool: { lebar: 35, tinggi: 15 },
  tempat: [
    { x: 18.5, y: 8.5 },
    { x: 59.5, y: 8.5 },
    { x: 100.5, y: 8.5 },
    { x: 141.5, y: 8.5 },
    { x: 141.5, y: 37 },
    { x: 141.5, y: 59 },
    { x: 141.5, y: 87.5 },
    { x: 100.5, y: 87.5 },
    { x: 59.5, y: 87.5 },
    { x: 18.5, y: 87.5 },
    { x: 18.5, y: 59 },
    { x: 18.5, y: 37 },
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

export interface GarisTool {
  /** Ujung di tepi kotak agent. */
  agen: Titik;
  /** Ujung di tepi kotak tool. */
  tool: Titik;
  /** Mata panah di tiap ujung (tool call ke tool, tool result ke agent), tiga titik. */
  panahAgen: [Titik, Titik, Titik];
  panahTool: [Titik, Titik, Titik];
}

const PANJANG_PANAH = 2.4;
const LEBAR_PANAH = 1.1;

function panah(ujung: Titik, dari: Titik): [Titik, Titik, Titik] {
  const dx = ujung.x - dari.x;
  const dy = ujung.y - dari.y;
  const p = Math.hypot(dx, dy);
  const ux = dx / p;
  const uy = dy / p;
  const pangkal = { x: ujung.x - ux * PANJANG_PANAH, y: ujung.y - uy * PANJANG_PANAH };
  return [
    ujung,
    { x: pangkal.x - uy * LEBAR_PANAH, y: pangkal.y + ux * LEBAR_PANAH },
    { x: pangkal.x + uy * LEBAR_PANAH, y: pangkal.y - ux * LEBAR_PANAH },
  ];
}

/** Kotak tool di sebuah tempat. */
export function kotakTool(tata: TataDiagram, tempat: Titik): Kotak {
  return { cx: tempat.x, cy: tempat.y, lebar: tata.ukuranTool.lebar, tinggi: tata.ukuranTool.tinggi };
}

/** Garis dua arah antara agent dan tool di sebuah tempat: dari tepi kotak agent ke tepi kotak tool. */
export function garisTool(tata: TataDiagram, tempat: Titik): GarisTool {
  const agen = tepiKotak(tata.agen, tempat);
  const tool = tepiKotak(kotakTool(tata, tempat), { x: tata.agen.cx, y: tata.agen.cy });
  return { agen, tool, panahAgen: panah(agen, tool), panahTool: panah(tool, agen) };
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
