/**
 * Kritikus lingkar agen M2d-3 (`factory/llm/peran.md`): GLM-5.3 membaca SEMUA
 * — pesan, kartu dan kartu penentunya, pilihan, kunci, penjelasan, hasil
 * pemeriksa lain — lalu menyebut keberatan terstruktur + satu arahan.
 *
 * Yang dijaga kode, bukan model:
 *
 * - **Kritikus tidak bisa meloloskan.** Keluarannya hanya dibaca sebagai
 *   `keberatan` + `arahan`; medan lain (mis. `"lolos": true`, versi omongan
 *   baru) dibuang dan dicatat `diabaikan`. Putusan akhir dihitung
 *   `putusanAkhir()` di `agen-peran.ts` dari keempat peran.
 * - **Kritikus tidak menulis ulang.** Tidak ada jalur dari jawabannya ke draf:
 *   yang kembali ke penulis hanyalah butir keberatan (≤ 300 karakter) dan
 *   arahan (≤ 400 karakter) sebagai umpan balik.
 * - **Tidak menjawab = keberatan.** Terpotong batas token (`finish_reason`
 *   `length` — GLM menghabiskan token untuk penalaran, terukur di M2d-1), JSON
 *   tak terbaca, atau galat penyedia → dicoba ulang SEKALI; bila tetap gagal,
 *   keberatan "kritikus tidak menjawab". Jawaban yang terpotong tidak pernah
 *   dibaca sebagai "tidak keberatan", walau potongannya kebetulan JSON sah.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { teksPolos } from '../skema/rujukan.ts';
import type { PesanChat } from './klien.ts';
import type { OmonganDraf } from './draf.ts';
import { kartuOmongan } from './gerbang-kartu.ts';
import type { InfoPanggil, PanggilanGerbang, PanggilLlm } from './gerbang-tebak.ts';
import { PaguTercapai } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { uraiKeluaran } from './susun.ts';
import { tanggalId } from '../format.ts';

export const SUHU_KRITIKUS = 0.2;
/**
 * GLM-5.3 berpikir panjang sebelum menjawab (M2d-1: 8 dari 9 draf terpotong
 * di 12.000 token). Jawaban kritikus kecil, tetapi penalarannya tidak; 16.384
 * memberi ruang, dan perkiraan maksimum yang dicek pagu tetap ±US$0,05.
 */
export const MAX_TOKENS_KRITIKUS = 16_384;
export const MAKS_KEBERATAN = 6;
export const MAKS_ALASAN = 300;
export const MAKS_ARAHAN = 400;

export const JENIS_KEBERATAN = ['kunci', 'makna', 'ambigu', 'tertebak', 'bahasa', 'aturan', 'lain', 'tidak-menjawab'] as const;
export type JenisKeberatan = (typeof JENIS_KEBERATAN)[number];

export interface Keberatan {
  jenis: JenisKeberatan;
  bagian: string;
  alasan: string;
}

const JALUR_PROMPT = fileURLToPath(new URL('./prompt-kritikus.md', import.meta.url));

export function promptKritikus(): string {
  return readFileSync(JALUR_PROMPT, 'utf8').replace(/\r\n/g, '\n').trim();
}

/** Hasil peran lain yang boleh (dan perlu) dilihat kritikus. */
export interface KonteksKritik {
  no: number;
  kartu: { pilihan: string | null; kartu_ditunjuk_no: number[]; alasan: string } | null;
  tebakan: Array<{ pilihan: string; yakin: number }>;
}

/** Pesan pengguna untuk kritikus: seluruh soal, kunci, kartu penentu, penjelasan, hasil peran lain. */
export function tulisSoalKritik(o: OmonganDraf, paket: PaketFakta, k: KonteksKritik): string {
  const kartu = kartuOmongan(o, paket);
  const baris = [
    `SOAL YANG DIPERIKSA: omongan ${String(k.no)} dari 3, simulasi "${paket.nama_samaran}" pada ${tanggalId(paket.tanggal_t)}.`,
    `Peristiwa hari itu: ${paket.peristiwa}`,
    '',
    `Pesan dari ${o.nama} (${o.jam}): "${teksPolos(o.pesan)}"`,
    '',
    'Kartu yang dilihat pemain:',
    ...kartu.map(
      (x) => `Kartu ${String(x.no)} — ${x.kepala}: ${x.isi}${o.kartu_penentu.includes(x.fact_id) ? '  [KARTU PENENTU]' : ''}`,
    ),
    '',
    `Pertanyaan: Omongan ${o.nama} cocok dengan dokumennya?`,
    `a) ${teksPolos(o.pilihan.a)}`,
    `b) ${teksPolos(o.pilihan.b)}`,
    `c) ${teksPolos(o.pilihan.c)}`,
    `d) ${teksPolos(o.pilihan.d)}`,
    `KUNCI: ${o.kunci}`,
    '',
    `Penjelasan (dibaca pemain sesudah menjawab): ${teksPolos(o.penjelasan)}`,
    '',
    'HASIL PEMERIKSA LAIN:',
    '- pemeriksa otomatis (validator + gerbang G): tidak keberatan.',
    k.kartu === null
      ? '- pembaca kartu: belum dijalankan.'
      : `- pembaca yang memegang kartu (tanpa tahu kunci) memilih "${String(k.kartu.pilihan)}"` +
        `${k.kartu.kartu_ditunjuk_no.length > 0 ? `, menunjuk kartu ${k.kartu.kartu_ditunjuk_no.join(' dan ')}` : ''}; ` +
        `alasannya: "${k.kartu.alasan}"`,
    k.tebakan.length === 0
      ? '- tiga penebak tanpa kartu: belum dijalankan.'
      : `- tiga penebak TANPA kartu memilih: ${k.tebakan.map((t) => `${t.pilihan} (yakin ${String(t.yakin)})`).join(', ')}`,
  ];
  return baris.join('\n');
}

export function pesanKritikus(o: OmonganDraf, paket: PaketFakta, k: KonteksKritik): PesanChat[] {
  return [
    { role: 'system', content: promptKritikus() },
    { role: 'user', content: tulisSoalKritik(o, paket, k) },
  ];
}

export interface KritikTerurai {
  keberatan: Keberatan[];
  arahan: string;
  /** Medan keluaran yang bukan `keberatan`/`arahan` — dibuang, tidak pernah dibaca. */
  diabaikan: string[];
}

function potong(teks: string, n: number): string {
  const t = teks.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Urai jawaban kritikus; `null` kalau bentuknya tidak sah (dihitung "tidak menjawab"). */
export function uraiKritik(teks: string): KritikTerurai | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || typeof u.nilai !== 'object' || u.nilai === null || Array.isArray(u.nilai)) return null;
  const n = u.nilai as Record<string, unknown>;
  if (!Array.isArray(n['keberatan'])) return null;
  const keberatan: Keberatan[] = [];
  for (const x of n['keberatan'] as unknown[]) {
    if (typeof x === 'string' && x.trim() !== '') {
      keberatan.push({ jenis: 'lain', bagian: '-', alasan: potong(x, MAKS_ALASAN) });
      continue;
    }
    if (typeof x !== 'object' || x === null) continue;
    const b = x as Record<string, unknown>;
    const alasan = typeof b['alasan'] === 'string' ? b['alasan'] : '';
    if (alasan.trim() === '') continue;
    const jenis = typeof b['jenis'] === 'string' ? b['jenis'].trim().toLowerCase() : '';
    keberatan.push({
      jenis: (JENIS_KEBERATAN as readonly string[]).includes(jenis) && jenis !== 'tidak-menjawab' ? (jenis as JenisKeberatan) : 'lain',
      bagian: typeof b['bagian'] === 'string' ? potong(b['bagian'], 40) : '-',
      alasan: potong(alasan, MAKS_ALASAN),
    });
  }
  return {
    keberatan: keberatan.slice(0, MAKS_KEBERATAN),
    arahan: typeof n['arahan'] === 'string' ? potong(n['arahan'], MAKS_ARAHAN) : '',
    diabaikan: Object.keys(n).filter((x) => x !== 'keberatan' && x !== 'arahan'),
  };
}

export interface PutusanKritik {
  /** Benar HANYA bila kritikus menjawab terbaca dan larik keberatannya kosong. */
  tanpa_keberatan: boolean;
  /** `false` = dua percobaan terpotong/tak terbaca/galat → keberatan "tidak menjawab". */
  menjawab: boolean;
  /** Ada percobaan yang berhenti di batas token. */
  terpotong: boolean;
  keberatan: Keberatan[];
  arahan: string;
  diabaikan: string[];
  panggilan: PanggilanGerbang[];
  /** Galat penyedia (bukan pagu) per percobaan, bila ada. */
  galat: string[];
}

export interface OpsiKritik {
  panggil: PanggilLlm;
  putaran: number;
  omongan: number;
  jam?: () => Date;
}

export const KEBERATAN_TIDAK_MENJAWAB = 'kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali';

/**
 * Jalankan kritikus untuk satu omongan: paling banyak dua panggilan (satu
 * ulang bila yang pertama tidak menjawab). `PaguTercapai` diteruskan ke
 * pemanggil — pagu menghentikan lingkar, bukan menjadi keberatan.
 */
export async function kritik(o: OmonganDraf, paket: PaketFakta, k: KonteksKritik, opsi: OpsiKritik): Promise<PutusanKritik> {
  const jam = opsi.jam ?? (() => new Date());
  const panggilan: PanggilanGerbang[] = [];
  const galat: string[] = [];
  let terpotong = false;
  for (let ulang = 0; ulang < 2; ulang++) {
    const info: InfoPanggil = { jenis: 'kritikus', putaran: opsi.putaran, omongan: opsi.omongan, ke: 1, ulang };
    const mulai = jam().toISOString();
    let j;
    try {
      j = await opsi.panggil(pesanKritikus(o, paket, k), { suhu: SUHU_KRITIKUS, maxTokens: MAX_TOKENS_KRITIKUS }, info);
    } catch (e) {
      if (e instanceof PaguTercapai) throw e;
      galat.push(e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 300) : 'galat tak dikenal');
      continue;
    }
    const kena = j.finish_reason === 'length';
    terpotong ||= kena;
    const hasil = kena ? null : uraiKritik(j.teks);
    panggilan.push({
      waktu_mulai: mulai,
      waktu_selesai: jam().toISOString(),
      token_masuk: j.token_masuk,
      token_keluar: j.token_keluar,
      biaya_usd: j.biaya_usd,
      latensi_ms: j.latensi_ms,
      finish_reason: j.finish_reason,
      teks_mentah: j.teks,
      terbaca: hasil !== null,
    });
    if (hasil !== null) {
      return {
        tanpa_keberatan: hasil.keberatan.length === 0,
        menjawab: true,
        terpotong,
        keberatan: hasil.keberatan,
        arahan: hasil.arahan,
        diabaikan: hasil.diabaikan,
        panggilan,
        galat,
      };
    }
  }
  return {
    tanpa_keberatan: false,
    menjawab: false,
    terpotong,
    keberatan: [{ jenis: 'tidak-menjawab', bagian: '-', alasan: KEBERATAN_TIDAK_MENJAWAB }],
    arahan: '',
    diabaikan: [],
    panggilan,
    galat,
  };
}

/** Butir umpan balik untuk penulis dari putusan kritikus (kosong bila tanpa keberatan). */
export function umpanKritik(p: PutusanKritik): string[] {
  if (p.tanpa_keberatan) return [];
  if (!p.menjawab) {
    return [`[kritikus] ${KEBERATAN_TIDAK_MENJAWAB}; versi ini diperiksa lagi di putaran berikutnya tanpa ditulis ulang.`];
  }
  return [
    ...p.keberatan.map((x) => `[kritikus: ${x.jenis}, ${x.bagian}] ${x.alasan}`),
    ...(p.arahan === '' ? [] : [`[kritikus: arahan] ${p.arahan}`]),
  ];
}
