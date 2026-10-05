/**
 * Kata-kata dan hitungan bagian "Jejak AI agent" di halaman dapur, sebagai
 * fungsi murni.
 *
 * Datanya (`jejak-agen-data.json`) dibangun
 * `node --experimental-strip-types alat/jejak-agen.ts` dari rekaman percobaan
 * AI agent. Fungsi di sini hanya MEMILIH dan MENATA yang ada di sana: status
 * dibaca dari medan `lolos` tool result, alasan penolakan dari daftar yang
 * dicatat tool itu sendiri. Tidak ada angka atau kalimat rekaman yang diketik.
 */
import type {
  DataJejak,
  HasilTool,
  IdTahap,
  LangkahJejak,
  PercobaanJejak,
  TahapJejak,
  ToolJejak,
} from '../../alat/jejak-agen.ts';

export type { DataJejak, HasilTool, IdTahap, LangkahJejak, PercobaanJejak, TahapJejak, ToolJejak };

export type Tampilan = 'ringkas' | 'rinci' | 'diagram';

export const TAMPILAN: ReadonlyArray<{ id: Tampilan; label: string }> = [
  { id: 'ringkas', label: 'Ringkas' },
  { id: 'rinci', label: 'Rinci' },
  { id: 'diagram', label: 'Diagram' },
];

/** Nama tahap untuk pembaca. Satuan permainan disebut "simulasi" (`docs/desain.md`). */
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

/** Medan tempat tool mencatat alasan penolakannya (tester, pemeriksa aturan, critic). */
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

/**
 * Satu baris: teks dipotong di batas kata dan diberi "…" bila lebih panjang
 * dari `maks`. Potongan selalu awalan teks aslinya; teks utuhnya ada di
 * tampilan Rinci.
 */
export function satuBaris(teks: string, maks = 140): string {
  const rapat = teks.replace(/\s+/g, ' ').trim();
  if (rapat.length <= maks) return rapat;
  const potong = rapat.slice(0, maks);
  const spasi = potong.lastIndexOf(' ');
  return `${(spasi > maks / 2 ? potong.slice(0, spasi) : potong).replace(/[\s,;:—-]+$/, '')}…`;
}

/** Tool yang dipilih agent di langkah ini tetapi tidak punya tool result di rekaman langkah itu. */
export function tanpaHasil(l: LangkahJejak): string[] {
  return l.memanggil.filter((t) => !l.hasil.some((h) => h.alat === t));
}

/** "96,7 detik" — satu desimal, koma desimal. */
export function detik(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} detik`;
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
export function simpulNyala(data: DataJejak, l: LangkahJejak): number[] {
  const keluar: number[] = [];
  for (const nama of [...l.memanggil, ...l.hasil.map((h) => h.alat)]) {
    const i = simpulTool(data.tool, nama);
    if (i >= 0 && !keluar.includes(i)) keluar.push(i);
  }
  return keluar;
}

/* --- geometri diagram ------------------------------------------------------- */

/**
 * Bidang diagram: 100 × 130 satuan. AI agent SATU kotak di tengah; tool
 * mengelilinginya di dua belas tempat (tiga di atas, tiga di kanan, tiga di
 * bawah, tiga di kiri). Tiap tool hanya terhubung ke agent — tidak ada garis
 * dari tool ke tool, dan tidak ada urutan atas-ke-bawah: tempat sebuah tool
 * tidak mengatakan kapan ia dipanggil.
 */
export const BIDANG = { lebar: 100, tinggi: 130 } as const;
export const KOTAK_AGEN = { x: 40, y: 34, lebar: 20, tinggi: 62 } as const;
export const UKURAN_TOOL = { lebar: 28, tinggi: 15 } as const;

export type Sisi = 'atas' | 'kanan' | 'bawah' | 'kiri';

export interface Tempat {
  /** Titik tengah kotak tool. */
  cx: number;
  cy: number;
  sisi: Sisi;
}

/** Dua belas tempat, searah jarum jam dari kiri atas. */
export const TEMPAT: readonly Tempat[] = [
  { cx: 15.5, cy: 8.5, sisi: 'atas' },
  { cx: 50, cy: 8.5, sisi: 'atas' },
  { cx: 84.5, cy: 8.5, sisi: 'atas' },
  { cx: 84.5, cy: 45, sisi: 'kanan' },
  { cx: 84.5, cy: 65, sisi: 'kanan' },
  { cx: 84.5, cy: 85, sisi: 'kanan' },
  { cx: 84.5, cy: 121.5, sisi: 'bawah' },
  { cx: 50, cy: 121.5, sisi: 'bawah' },
  { cx: 15.5, cy: 121.5, sisi: 'bawah' },
  { cx: 15.5, cy: 85, sisi: 'kiri' },
  { cx: 15.5, cy: 65, sisi: 'kiri' },
  { cx: 15.5, cy: 45, sisi: 'kiri' },
];

export interface Titik {
  x: number;
  y: number;
}

export interface GarisTool {
  /** Ujung di sisi agent. */
  agen: Titik;
  /** Ujung di sisi tool. */
  tool: Titik;
  /** Mata panah di tiap ujung (tool call ke tool, tool result ke agent), tiga titik. */
  panahAgen: [Titik, Titik, Titik];
  panahTool: [Titik, Titik, Titik];
}

const JARAK_UJUNG = 1.2;
const PANJANG_PANAH = 2.6;
const LEBAR_PANAH = 1.3;

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

/** Garis dua arah antara agent dan tool di sebuah tempat. Selalu berujung di kotak agent. */
export function garisTool(t: Tempat): GarisTool {
  const a = KOTAK_AGEN;
  let agen: Titik;
  let tool: Titik;
  if (t.sisi === 'atas' || t.sisi === 'bawah') {
    // Tiga tool di atas/bawah menempel ke tiga titik berbeda di tepi agent.
    const geser = t.cx < 40 ? -6 : t.cx > 60 ? 6 : 0;
    const atas = t.sisi === 'atas';
    agen = { x: a.x + a.lebar / 2 + geser, y: atas ? a.y : a.y + a.tinggi };
    tool = { x: t.cx, y: atas ? t.cy + UKURAN_TOOL.tinggi / 2 : t.cy - UKURAN_TOOL.tinggi / 2 };
  } else {
    const kiri = t.sisi === 'kiri';
    agen = { x: kiri ? a.x : a.x + a.lebar, y: t.cy };
    tool = { x: kiri ? t.cx + UKURAN_TOOL.lebar / 2 : t.cx - UKURAN_TOOL.lebar / 2, y: t.cy };
  }
  // Ujung garis berhenti sedikit sebelum kotak, supaya mata panahnya terlihat.
  const dx = tool.x - agen.x;
  const dy = tool.y - agen.y;
  const p = Math.hypot(dx, dy);
  const ux = dx / p;
  const uy = dy / p;
  const ujungAgen = { x: agen.x + ux * JARAK_UJUNG, y: agen.y + uy * JARAK_UJUNG };
  const ujungTool = { x: tool.x - ux * JARAK_UJUNG, y: tool.y - uy * JARAK_UJUNG };
  return {
    agen: ujungAgen,
    tool: ujungTool,
    panahAgen: panah(ujungAgen, ujungTool),
    panahTool: panah(ujungTool, ujungAgen),
  };
}

/** Persen untuk `left`/`top`/`width`/`height` kotak di atas bidang diagram. */
export function persenKotak(cx: number, cy: number, lebar: number, tinggi: number): Record<string, string> {
  const p = (nilai: number, dari: number): string => `${String(Math.round((nilai / dari) * 1e4) / 100)}%`;
  return {
    left: p(cx - lebar / 2, BIDANG.lebar),
    top: p(cy - tinggi / 2, BIDANG.tinggi),
    width: p(lebar, BIDANG.lebar),
    height: p(tinggi, BIDANG.tinggi),
  };
}
