/**
 * Penyusun draf simulasi di bawah validator (M2d D-3, D-4).
 *
 * Orkestrasinya seluruhnya di sini, terbaca:
 *
 *   paket fakta → prompt tetap (`prompt-susun.md`) + pesan paket
 *     → model → urai JSON → validator deterministik
 *       → lolos: selesai
 *       → ditolak: daftar masalah dikirim balik sebagai umpan balik → tulis ulang
 *   paling banyak 3 percobaan.
 *
 * Suhu dan `max_tokens` adalah tetapan modul, bukan parameter per model: uji
 * tanding hanya adil kalau prompt, fakta, suhu, dan batas keluaran sama.
 *
 * LLM tidak menerima JSON mentah Sectors: `pesanPaket()` menulis daftar fakta
 * ringkas yang sudah lolos verifikasi (lihat `paket.ts`). Tes menjaga bahwa
 * teks yang dikirim tidak memuat nama medan mentah maupun kode saham.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { angkaId, tanggalId } from '../format.ts';
import type { PesanChat } from './klien.ts';
import type { DrafSimulasi, MasalahDraf } from './draf.ts';
import type { FaktaPaket, PaketFakta } from './paket.ts';

export const SUHU = 0.3;
/**
 * Cukup untuk penalaran model berpikir + JSON tiga omongan (±3.000 token).
 * Sonda T-02: ketiga model menghabiskan 16 token sebelum menjawab satu kata,
 * jadi penalaran memang ikut dihitung sebagai token keluar.
 */
export const MAX_TOKENS = 12_000;

/**
 * Putaran uji tanding. Putaran 1 memakai 12.000 token keluar. Terukur di
 * putaran 1: kedua model GLM menghabiskan seluruh 12.000 token untuk penalaran
 * (±33–36 ribu karakter `reasoning_content`, `finish_reason: length`, isi
 * kosong) pada tiap percobaan DADA. Putaran 2 menaikkan batas untuk KETIGA
 * model sekaligus — tetap satu nilai untuk semua — supaya yang diukur adalah
 * tulisannya, bukan hanya panjang penalarannya. Kedua putaran dilaporkan.
 */
export const PUTARAN: Readonly<Record<1 | 2, { maxTokens: number }>> = {
  1: { maxTokens: MAX_TOKENS },
  2: { maxTokens: 32_000 },
};
export const MAKS_PERCOBAAN = 3;

const JALUR_PROMPT = fileURLToPath(new URL('./prompt-susun.md', import.meta.url));

export function promptSistem(): string {
  return readFileSync(JALUR_PROMPT, 'utf8').replace(/\r\n/g, '\n').trim();
}

function tulisNilai(f: FaktaPaket): string {
  if (f.nilai === null) return 'tidak berangka';
  if (typeof f.nilai === 'number') return `${angkaId(f.nilai)}${f.satuan ? ` ${f.satuan}` : ''}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(f.nilai) ? tanggalId(f.nilai) : f.nilai;
}

/** Pesan pengguna: tanggal, samaran, peristiwa, dan daftar fakta ringkas. */
export function pesanPaket(paket: PaketFakta): string {
  const baris: string[] = [
    `Tanggal simulasi (T): ${tanggalId(paket.tanggal_t)}. Semua pesan dikirim sesudah bursa tutup hari itu.`,
    `Nama samaran emiten: ${paket.nama_samaran}`,
    `Peristiwa: ${paket.peristiwa}`,
    '',
    `PAKET FAKTA (${String(paket.fakta.length)} fakta; hanya ini yang boleh dipakai):`,
  ];
  for (const f of paket.fakta) {
    baris.push(
      `- ${f.fact_id} | ${f.jenis === 'hitungan' ? 'hitungan' : 'dokumen'} (${f.asal}) | terbit ${tanggalId(f.terbit)} | nilai: ${tulisNilai(f)}`,
    );
    baris.push(`  isi: ${f.klaim}`);
    if (f.turunan_dari.length > 0) baris.push(`  dihitung dari: ${f.turunan_dari.join(', ')}`);
    for (const c of f.catatan) baris.push(`  catatan pemeriksaan: ${c}`);
  }
  baris.push('', 'Tulis satu simulasi (tiga omongan) sesuai aturan. Keluarkan JSON saja.');
  return baris.join('\n');
}

/** Umpan balik sesudah validator menolak. */
export function pesanUmpanBalik(masalah: readonly MasalahDraf[]): string {
  const daftar = masalah.map(
    (m, i) => `${String(i + 1)}. [${m.kode}]${m.omongan === null ? '' : ` omongan ${String(m.omongan)}:`} ${m.pesan}`,
  );
  return [
    `Draf ditolak pemeriksa otomatis (${String(masalah.length)} masalah):`,
    ...daftar,
    '',
    'Tulis ulang SELURUH JSON dengan semua masalah di atas diperbaiki. Tetap patuhi semua aturan. Keluarkan JSON saja.',
  ].join('\n');
}

/**
 * Ambil objek JSON dari teks model. Blok `<think>…</think>` dibuang lebih
 * dulu; lalu isi pagar ```json bila ada, atau dari `{` pertama sampai `}`
 * terakhir. Tidak memperbaiki apa pun — JSON rusak adalah penolakan.
 */
export function uraiKeluaran(teks: string): { ok: true; nilai: unknown; json: string } | { ok: false; alasan: string } {
  const tanpaPikir = teks.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*<\/think>/i, '');
  const pagar = /```(?:json)?\s*([\s\S]*?)```/.exec(tanpaPikir);
  const kandidat = pagar?.[1] ?? tanpaPikir;
  const mulai = kandidat.indexOf('{');
  const akhir = kandidat.lastIndexOf('}');
  if (mulai === -1 || akhir <= mulai) return { ok: false, alasan: 'tidak ada objek JSON di keluaran' };
  const json = kandidat.slice(mulai, akhir + 1);
  try {
    return { ok: true, nilai: JSON.parse(json) as unknown, json };
  } catch (galat) {
    return { ok: false, alasan: `JSON tidak bisa diurai: ${galat instanceof Error ? galat.message : String(galat)}` };
  }
}

export interface JawabanModel {
  teks: string;
  penalaran?: string | null;
  token_masuk: number;
  token_keluar: number;
  latensi_ms: number;
  finish_reason: string | null;
  biaya_usd: number;
}

export interface Percobaan {
  ke: number;
  teks_mentah: string;
  /** Penalaran terpisah dari penyedia, apa adanya (`null` kalau tidak ada). */
  penalaran: string | null;
  finish_reason: string | null;
  token_masuk: number;
  token_keluar: number;
  latensi_ms: number;
  biaya_usd: number;
  /** `null` kalau keluaran tidak bisa diurai sebagai JSON. */
  draf: unknown;
  masalah: MasalahDraf[];
  lolos: boolean;
  /** Galat panggilan (sudah disamarkan), kalau panggilannya sendiri gagal. */
  galat: string | null;
}

export interface HasilSusun {
  paket_id: string;
  model: string;
  suhu: number;
  max_tokens: number;
  lolos: boolean;
  /** Percobaan ke berapa draf lolos; `null` kalau tidak lolos. */
  lolos_di: number | null;
  percobaan: Percobaan[];
  draf: DrafSimulasi | null;
  /** Alasan berhenti kalau bukan karena lolos atau habis percobaan. */
  berhenti: string | null;
}

export interface SetelanPanggil {
  suhu: number;
  maxTokens: number;
}

export interface OpsiSusun {
  paket: PaketFakta;
  model: string;
  /**
   * Satu panggilan model; di uji tanding ini `chatBerpagu`. Suhu dan batas token
   * DIBERIKAN penyusun, bukan dipilih pemanggil — itulah yang membuat uji
   * tanding sama untuk setiap model.
   */
  panggil: (pesan: PesanChat[], setelan: SetelanPanggil) => Promise<JawabanModel>;
  validasi: (draf: unknown, paket: PaketFakta) => MasalahDraf[];
  maksPercobaan?: number;
  /** Putaran uji tanding (menentukan `max_tokens`, sama untuk semua model). Bawaan 1. */
  putaran?: 1 | 2;
  /** Galat yang harus menghentikan seluruh uji (mis. pagu tercapai), bukan hanya sel ini. */
  hentikanSemua?: (galat: unknown) => boolean;
}

export async function susun(opsi: OpsiSusun): Promise<HasilSusun> {
  const maks = opsi.maksPercobaan ?? MAKS_PERCOBAAN;
  const maxTokens = PUTARAN[opsi.putaran ?? 1].maxTokens;
  const pesan: PesanChat[] = [
    { role: 'system', content: promptSistem() },
    { role: 'user', content: pesanPaket(opsi.paket) },
  ];
  const hasil: HasilSusun = {
    paket_id: opsi.paket.paket_id,
    model: opsi.model,
    suhu: SUHU,
    max_tokens: maxTokens,
    lolos: false,
    lolos_di: null,
    percobaan: [],
    draf: null,
    berhenti: null,
  };

  for (let ke = 1; ke <= maks; ke++) {
    let jawaban: JawabanModel;
    try {
      jawaban = await opsi.panggil([...pesan], { suhu: SUHU, maxTokens });
    } catch (galat) {
      const teks = galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal';
      hasil.percobaan.push({
        ke,
        teks_mentah: '',
        penalaran: null,
        finish_reason: null,
        token_masuk: 0,
        token_keluar: 0,
        latensi_ms: 0,
        biaya_usd: 0,
        draf: null,
        masalah: [],
        lolos: false,
        galat: teks,
      });
      hasil.berhenti = teks;
      if (opsi.hentikanSemua?.(galat) === true) throw galat;
      return hasil;
    }

    const urai = uraiKeluaran(jawaban.teks);
    const masalah: MasalahDraf[] = urai.ok
      ? opsi.validasi(urai.nilai, opsi.paket)
      : [
          {
            kode: 'JSON_RUSAK',
            omongan: null,
            pesan:
              `${urai.alasan}` +
              (jawaban.finish_reason === 'length' ? ' (keluaran terpotong: batas token keluar tercapai)' : ''),
          },
        ];
    const lolos = masalah.length === 0;
    hasil.percobaan.push({
      ke,
      teks_mentah: jawaban.teks,
      penalaran: jawaban.penalaran ?? null,
      finish_reason: jawaban.finish_reason,
      token_masuk: jawaban.token_masuk,
      token_keluar: jawaban.token_keluar,
      latensi_ms: jawaban.latensi_ms,
      biaya_usd: jawaban.biaya_usd,
      draf: urai.ok ? urai.nilai : null,
      masalah,
      lolos,
      galat: null,
    });
    if (lolos) {
      hasil.lolos = true;
      hasil.lolos_di = ke;
      hasil.draf = urai.ok ? (urai.nilai as DrafSimulasi) : null;
      return hasil;
    }
    // Yang dikirim balik hanya JSON-nya, bukan penalaran panjang di depannya.
    pesan.push({ role: 'assistant', content: urai.ok ? urai.json : jawaban.teks.slice(-4000) });
    pesan.push({ role: 'user', content: pesanUmpanBalik(masalah) });
  }
  return hasil;
}
