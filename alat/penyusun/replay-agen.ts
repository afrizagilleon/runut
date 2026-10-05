/**
 * Tampilan AI agent di pintu penyusun: apa yang dikirim ke peramban.
 *
 * `npm run penyusun` (bawaan sejak M2d-32; `--replay-agent` berarti sama) memutar rekaman empat percobaan nyata
 * agent untuk satu saham (`rekaman-agen.ts`). Penyusun mengetik kode saham,
 * lalu langkah agent muncul satu per satu. Tanpa jaringan keluar, tanpa API
 * key, tanpa biaya: yang dibaca hanya berkas rekaman di repo.
 *
 * Server mengirim seluruh langkah lewat SSE (`event: kepala`, `langkah`,
 * `simulasi`, `selesai`); JEDA antar-langkah diatur halaman, supaya bisa
 * dijeda, dilanjutkan, dilompati, dan diatur kecepatannya tanpa bolak-balik ke
 * server. Bentuk peristiwanya sengaja tidak bergantung pada replay: mode sungguhan
 * (belum dibangun) bisa mengirim langkah lewat jalur yang sama begitu pelari agent menulisnya.
 *
 * Yang dijaga di sini:
 * - medan `penalaran` (teks berpikir model) tidak pernah ada: pembaca rekaman
 *   membuangnya saat mengurai, dan bentuk `LangkahTampil` tidak punya tempat
 *   untuknya;
 * - nama perusahaan dan kode saham tidak ada di data tampilan (`periksaBersih`);
 * - tampilan Ringkas hanya memuat kalimat dari `baca-agen.ts`; teks rekaman
 *   mentah hanya ada di `asli`, yang halaman taruh di lipatan "rekaman asli".
 */
import { existsSync, readFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import {
  JENIS_DIPERBAIKI,
  KALIMAT_MENULIS_ULANG,
  NAMA_TAHAP,
  TATA_LEBAR,
  TATA_TEGAK,
  TOOL_ATURAN,
  barisBaca,
  garisTool,
  keteranganTool,
  kotakTool,
  persenKotak,
  simpulNyala,
  tanpaHasil,
  type JenisTolak,
  type PersenKotak,
  type Status,
  type TataDiagram,
  type Titik,
} from './baca-agen.ts';
import {
  KONFIG_JEJAK,
  MEDAN_TERLARANG,
  NAMA_LAMA,
  URUT_TAHAP,
  dataJejak,
  kataTerlarang,
  kodeRekaman,
  samarkanDalam,
  semuaTeksJejak,
  type DataJejak,
  type IdTahap,
  type LangkahJejak,
  type ToolJejak,
} from './rekaman-agen.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

/* --- tool di diagram --------------------------------------------------------- */

/**
 * Tool yang bisa dipanggil agent, dalam urutan TEMPAT di diagram (searah jarum
 * jam dari kiri atas). Urutannya menurut jenis tool — yang membaca bahan di
 * atas dan bawah, yang mengirim ke penguji di kanan, pemeriksa aturan di kiri
 * — bukan menurut kapan tool dipanggil: diagram ini bukan lajur waktu.
 */
export const TOOL_DIAGRAM: readonly string[] = [
  'usulkan_hari',
  'periksa_saham',
  'lihat_fakta',
  'lihat_bank',
  'ajukan',
  'tingkatkan',
  'ajukan_kasus',
  'lihat_sesudahnya',
  'lihat_soal_terkunci',
  'lihat_simulasi',
  'periksa_kasus_dengan_aturan',
  'periksa_draft_dengan_aturan',
];

/** Daftar tool diagram: yang dikenal di tempat tetapnya; tool lain dari rekaman menyusul selama masih ada tempat. */
export function toolDiagram(dipakai: readonly ToolJejak[] = []): ToolJejak[] {
  const keluar: ToolJejak[] = TOOL_DIAGRAM.map((nama) => ({
    nama,
    nama_lama: Object.entries(NAMA_LAMA).filter(([, kini]) => kini === nama).map(([lama]) => lama),
  }));
  for (const t of dipakai) if (!keluar.some((x) => x.nama === t.nama)) keluar.push({ nama: t.nama, nama_lama: [...t.nama_lama] });
  return keluar;
}

/* --- bentuk yang dikirim ke peramban ----------------------------------------- */

export interface HasilTampil {
  /** Nama tool persis seperti di rekaman. */
  alat: string;
  status: Status | null;
  jenis: JenisTolak | null;
  /** Satu kalimat yang bisa dibaca (dari `baca-agen.ts`). */
  kalimat: string;
  /** Rekaman asli tool result ini: hanya untuk lipatan "rekaman asli" di tampilan Rinci. */
  asli: { ringkas: string; hasil: unknown };
}

export interface BarisRingkas {
  status: Status | null;
  kalimat: string;
  /** Berapa tool result di langkah ini yang berkalimat sama (mis. dua draf). */
  jumlah: number;
}

export interface LangkahTampil {
  no: number;
  tahap: IdTahap;
  /** Tool yang dipilih agent di langkah ini, persis seperti di rekaman. */
  memanggil: string[];
  /** Ucapan agent di langkah ini, bila ada. Bukan teks berpikir. */
  ucapan: string | null;
  /** Lama panggilan model langkah ini. */
  lama_ms: number;
  biaya_model_usd: number;
  biaya_penguji_usd: number;
  token: { masuk: number; keluar: number; berpikir: number };
  ringkas: BarisRingkas[];
  hasil: HasilTampil[];
  /** Tool yang dipilih tetapi tool result-nya tidak tercatat di langkah ini. */
  tanpa_hasil: string[];
  /** Indeks tool (di `kepala.tool`) yang menyala di diagram pada langkah ini. */
  nyala: number[];
}

export interface GambarDiagram {
  bidang: { lebar: number; tinggi: number };
  agen: PersenKotak;
  /** Satu butir per tool, urutan sama dengan `kepala.tool`. Garisnya SELALU agent ⇄ tool itu. */
  tool: Array<{ kotak: PersenKotak; garis: { x1: number; y1: number; x2: number; y2: number }; panah: [string, string] }>;
}

export interface KepalaTampil {
  mode: 'replay' | 'langsung';
  model: string | null;
  nama_samaran: string | null;
  tanggal_simulasi: string | null;
  /** Jumlah budget yang disetujui untuk pekerjaan ini. */
  budget_usd: number;
  /** Jumlah langkah bila sudah diketahui (replay); `null` selama agent masih bekerja. */
  jumlah_langkah: number | null;
  tool: Array<{ nama: string; nama_lama: string[]; keterangan: string | null }>;
  tahap: Array<{ id: IdTahap; nama: string }>;
  diagram: { tegak: GambarDiagram; lebar: GambarDiagram };
  /** Berkas rekaman yang dibaca (kode saham disamarkan). */
  sumber: string[];
}

export interface SoalTampil {
  nama: string;
  jam: string;
  pesan: string;
  tanya: string;
  pilihan: Array<{ kunci: string; teks: string; benar: boolean }>;
  penjelasan: string;
  kartu: Array<{ kepala: string; isi: string; penentu: boolean }>;
  istilah: Array<{ kata: string; arti: string }>;
}

export interface SimulasiTampil {
  judul: string;
  nama_samaran: string;
  tanggal: string;
  soal: SoalTampil[];
  /** Bagian "apa yang terjadi sesudahnya". */
  sesudahnya: string[];
  penutup: { kepala: string; isi: string };
  /** Keterangan penyetuju, dihitung dari perbandingan berkas (lihat `simulasiTampil`). */
  keterangan_penyetuju: string;
}

/* --- langkah ---------------------------------------------------------------- */

function bulat(n: number, angka = 100): number {
  return Math.round(n * angka) / angka;
}

function titikTeks(daftar: readonly Titik[]): string {
  return daftar.map((t) => `${String(bulat(t.x))},${String(bulat(t.y))}`).join(' ');
}

export function gambarDiagram(tata: TataDiagram, jumlahTool: number): GambarDiagram {
  const tool: GambarDiagram['tool'] = [];
  for (let i = 0; i < jumlahTool; i++) {
    const tempat = tata.tempat[i];
    if (tempat === undefined) throw new Error(`Diagram hanya punya ${String(tata.tempat.length)} tempat; tool ke-${String(i + 1)} tidak muat.`);
    const g = garisTool(tata, tempat);
    tool.push({
      kotak: persenKotak(tata, kotakTool(tata, tempat)),
      garis: { x1: bulat(g.agen.x), y1: bulat(g.agen.y), x2: bulat(g.tool.x), y2: bulat(g.tool.y) },
      panah: [titikTeks(g.panahAgen), titikTeks(g.panahTool)],
    });
  }
  return { bidang: tata.bidang, agen: persenKotak(tata, tata.agen), tool };
}

/**
 * Satu langkah rekaman → yang dikirim ke peramban. `menulisUlang`: di langkah
 * berikutnya (percobaan yang sama) agent menulis draf baru; kalimat penolakan
 * yang bisa diperbaiki lalu diberi sambungan "Agent menulis ulang."
 */
export function langkahTampil(l: LangkahJejak, tool: readonly ToolJejak[], menulisUlang: boolean): LangkahTampil {
  const hasil: HasilTampil[] = l.hasil.map((h) => {
    const b = barisBaca(h);
    const sambung = menulisUlang && b.jenis !== null && JENIS_DIPERBAIKI.includes(b.jenis);
    return {
      alat: h.alat,
      status: b.status,
      jenis: b.jenis,
      kalimat: sambung ? `${b.kalimat} ${KALIMAT_MENULIS_ULANG}` : b.kalimat,
      asli: { ringkas: h.ringkas, hasil: h.hasil },
    };
  });
  const ringkas: BarisRingkas[] = [];
  for (const h of hasil) {
    const sama = ringkas.find((r) => r.kalimat === h.kalimat && r.status === h.status);
    if (sama === undefined) ringkas.push({ status: h.status, kalimat: h.kalimat, jumlah: 1 });
    else sama.jumlah += 1;
  }
  return {
    no: l.no,
    tahap: l.tahap,
    memanggil: [...l.memanggil],
    ucapan: l.teks,
    lama_ms: l.latensi_ms,
    biaya_model_usd: l.biaya_usd,
    biaya_penguji_usd: l.biaya_tester_usd,
    token: { masuk: l.token_masuk, keluar: l.token_keluar, berpikir: l.token_penalaran },
    ringkas,
    hasil,
    tanpa_hasil: tanpaHasil(l),
    nyala: simpulNyala(tool, l),
  };
}

/** Apakah langkah ini langkah menulis draf (memanggil pemeriksa aturan). */
function menulisDraf(l: LangkahJejak): boolean {
  return l.memanggil.some((t) => TOOL_ATURAN.includes(t));
}

export function kepalaTampil(
  mode: KepalaTampil['mode'],
  tool: readonly ToolJejak[],
  isi: Pick<KepalaTampil, 'model' | 'nama_samaran' | 'tanggal_simulasi' | 'budget_usd' | 'jumlah_langkah' | 'sumber'>,
): KepalaTampil {
  return {
    mode,
    ...isi,
    tool: tool.map((t) => ({ nama: t.nama, nama_lama: [...t.nama_lama], keterangan: keteranganTool(t.nama) })),
    tahap: URUT_TAHAP.map((id) => ({ id, nama: NAMA_TAHAP[id] })),
    diagram: { tegak: gambarDiagram(TATA_TEGAK, tool.length), lebar: gambarDiagram(TATA_LEBAR, tool.length) },
  };
}

/* --- simulasi yang jadi ------------------------------------------------------ */

/** "[[fact-id|Rp392]]" → "Rp392": tanda rujukan kartu dibuang, teksnya tetap. */
export function tanpaRujukan(teks: string): string {
  return teks.replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1');
}

interface KasusBerkas {
  kasus_id: string;
  judul: string;
  nama_samaran: string;
  tanggal_t: string;
  fakta: Array<{ fact_id: string; awam?: { kepala: string; isi: string } }>;
  soal: Array<{
    kartu: string[];
    kartu_penentu: string[];
    istilah: Array<{ kata: string; arti: string }>;
    pesan: { nama: string; jam: string; isi: string };
    tanya: string;
    pilihan: Array<{ kunci: string; teks: string }>;
    jawaban: string;
    penjelasan: string;
  }>;
  pembukaan: { paragraf: string[] };
  penutup: { kepala: string; isi: string };
}

/**
 * Simulasi yang jadi, dari `kasus.json` percobaan terakhir. Keterangan
 * penyetuju dihitung: bila berkas simulasi yang dimainkan (`cases/<id>.json`)
 * sama byte demi byte dengan yang ditulis agent, penyetuju tidak menyunting.
 */
export function simulasiTampil(akar: string = AKAR, konfig: typeof KONFIG_JEJAK = KONFIG_JEJAK): SimulasiTampil {
  const teks = readFileSync(`${akar}${konfig.kasus}`, 'utf8');
  const k = JSON.parse(teks) as KasusBerkas;
  const jalurMain = `${akar}cases/${k.kasus_id}.json`;
  const dimainkan = existsSync(jalurMain) ? readFileSync(jalurMain, 'utf8') : null;
  const keterangan =
    dimainkan === null
      ? 'Simulasi ini ditulis AI agent. Penyetuju belum memeriksanya.'
      : dimainkan === teks
        ? 'Simulasi ini ditulis AI agent. Penyetuju memeriksanya tanpa menyunting: yang dimainkan pemain sama huruf demi huruf dengan yang ditulis agent.'
        : 'Simulasi ini ditulis AI agent, lalu diperiksa dan disunting penyetuju sebelum dimainkan pemain.';
  const fakta = new Map(k.fakta.map((f) => [f.fact_id, f]));
  const simulasi: SimulasiTampil = {
    judul: k.judul,
    nama_samaran: k.nama_samaran,
    tanggal: k.tanggal_t,
    soal: k.soal.map((s) => ({
      nama: s.pesan.nama,
      jam: s.pesan.jam,
      pesan: s.pesan.isi,
      tanya: s.tanya,
      pilihan: s.pilihan.map((p) => ({ kunci: p.kunci, teks: tanpaRujukan(p.teks), benar: p.kunci === s.jawaban })),
      penjelasan: tanpaRujukan(s.penjelasan),
      kartu: s.kartu.flatMap((id) => {
        const awam = fakta.get(id)?.awam;
        return awam === undefined ? [] : [{ kepala: awam.kepala, isi: tanpaRujukan(awam.isi), penentu: s.kartu_penentu.includes(id) }];
      }),
      istilah: s.istilah.map((i) => ({ kata: i.kata, arti: i.arti })),
    })),
    sesudahnya: k.pembukaan.paragraf.map(tanpaRujukan),
    penutup: { kepala: k.penutup.kepala, isi: k.penutup.isi },
    keterangan_penyetuju: keterangan,
  };
  return samarkanDalam(simulasi, kataTerlarang(akar, konfig)) as SimulasiTampil;
}

/* --- replay ----------------------------------------------------------------- */

export interface PeristiwaAgen {
  jenis: 'kepala' | 'langkah' | 'simulasi';
  data: KepalaTampil | LangkahTampil | SimulasiTampil;
}

export interface ReplayAgen {
  /** Kode saham yang punya rekaman (dari `hasil.json` percobaan pertama). Tidak ikut di `peristiwa`. */
  kode: string;
  kepala: KepalaTampil;
  langkah: LangkahTampil[];
  simulasi: SimulasiTampil;
  /** Total per tahap dari rekaman (jumlah langkah dan biaya). */
  tahap: DataJejak['tahap'];
  biaya_usd: number;
}

/** Tidak satu pun teks atau nama medan memuat kata terlarang atau medan teks berpikir. */
export function periksaBersih(nilai: unknown, terlarang: readonly string[]): void {
  const isi = semuaTeksJejak(nilai);
  for (const kata of terlarang) {
    if (kata !== '' && isi.some((t) => t.toLowerCase().includes(kata.toLowerCase()))) {
      throw new Error('Data tampilan agent memuat kode saham atau nama perusahaan.');
    }
  }
  if (isi.includes(MEDAN_TERLARANG)) throw new Error(`Data tampilan agent memuat medan ${MEDAN_TERLARANG}.`);
}

/** Baca rekaman dan siapkan semua yang dikirim ke peramban. Dipanggil sekali saat server dinyalakan. */
export function siapkanReplay(akar: string = AKAR, konfig: typeof KONFIG_JEJAK = KONFIG_JEJAK): ReplayAgen {
  const data = dataJejak(akar, konfig);
  const tool = toolDiagram(data.tool);
  const langkah = data.langkah.map((l, i) => {
    const berikut = data.langkah[i + 1];
    return langkahTampil(l, tool, berikut !== undefined && berikut.percobaan === l.percobaan && menulisDraf(berikut));
  });
  const kepala = kepalaTampil('replay', tool, {
    model: data.model,
    nama_samaran: data.simulasi.nama_samaran,
    tanggal_simulasi: data.simulasi.tanggal,
    budget_usd: bulat(data.percobaan.reduce((j, p) => j + p.pagu_usd, 0), 1e4),
    jumlah_langkah: langkah.length,
    sumber: data.sumber,
  });
  const simulasi = simulasiTampil(akar, konfig);
  const replay: ReplayAgen = { kode: kodeRekaman(akar, konfig), kepala, langkah, simulasi, tahap: data.tahap, biaya_usd: data.jumlah.biaya_usd };
  periksaBersih({ kepala, langkah, simulasi }, kataTerlarang(akar, konfig));
  return replay;
}

export function peristiwaReplay(r: ReplayAgen): PeristiwaAgen[] {
  return [
    { jenis: 'kepala', data: r.kepala },
    ...r.langkah.map((l): PeristiwaAgen => ({ jenis: 'langkah', data: l })),
    { jenis: 'simulasi', data: r.simulasi },
  ];
}

/* --- SSE -------------------------------------------------------------------- */

export function bukaSse(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Content-Type-Options': 'nosniff',
  });
  res.write('retry: 2000\n\n');
}

export function tulisPeristiwaAgen(res: ServerResponse, no: number, p: PeristiwaAgen): void {
  res.write(`id: ${String(no)}\nevent: ${p.jenis}\ndata: ${JSON.stringify(p.data)}\n\n`);
}

/** Kirim seluruh rekaman ke satu sambungan, lalu `event: selesai`. Jeda diatur halaman. */
export function kirimReplay(res: ServerResponse, r: ReplayAgen): void {
  bukaSse(res);
  for (const [i, p] of peristiwaReplay(r).entries()) tulisPeristiwaAgen(res, i + 1, p);
  res.write('event: selesai\ndata: {}\n\n');
  res.end();
}
