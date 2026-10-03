/**
 * Prompt penulis v3 (M2d-16 D-5). Berkas `prompt-penulis-v3.md` ditulis
 * REVIEWER dan disalin apa adanya (sha256 dites); kode ini hanya mengisi empat
 * isian dan TIDAK menambah aturan. v1 (`prompt-penulis-bebas.md`) dan v2
 * (`prompt-penulis-opus-v2.md`) tidak berubah.
 *
 * Keputusan reviewer 3 Okt:
 * - prompt dikirim sebagai SATU pesan pengguna (tanpa pesan sistem);
 * - `{TELADAN}` = `teladan-dada-s3.json` (berkas reviewer: soal tayang DADA s3,
 *   kalimat pembuka berangka dibuang; label pengecoh, umpan balik, dan
 *   pertanyaan cek ditulis reviewer; pilihan dan penjelasan = soal tayang),
 *   dirender `{"omongan": [ … ]}`. Ia lolos `periksaKodeBebas` terhadap paket
 *   DADA dengan TEPAT dua pengecualian — `NAMA_TERLARANG` dan `anti-salin`:
 *   keduanya menyala untuk soal tayang mana pun (nama dan kalimatnya sendiri)
 *   dan menjaga KELUARAN penulis, bukan teladannya;
 * - teks teladan ikut masuk himpunan anti-salin 5 kata untuk keluaran penulis;
 * - tulis ulang TANPA keadaan: satu pesan pengguna baru = prompt v3 yang sama
 *   dengan `{JUMLAH}` = jumlah butir yang ditulis ulang, lalu per butir
 *   "Draf sebelumnya" (JSON) dan "Belum bisa dipakai karena" (alasan gerbang
 *   yang menolak, apa adanya). Tanpa aturan tambahan.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { potongan } from '../kalibrasi-pemanasan.ts';
import type { PesanChat } from '../klien.ts';
import type { PaketFakta } from '../paket.ts';
import { uraiKeluaran } from '../susun.ts';
import { periksaKodeBebas, type MasalahKodeBebas } from './mesin.ts';
import { teksPaket } from './prompt.ts';
import { HURUF, uraiOmonganBebas, type OmonganBebas } from './skema.ts';

const JALUR_V3 = fileURLToPath(new URL('./prompt-penulis-v3.md', import.meta.url));
const JALUR_TELADAN = fileURLToPath(new URL('./teladan-dada-s3.json', import.meta.url));

/** sha256 berkas reviewer `.contracts/lampiran/M-02d16/prompt-penulis-v3.md` (akhir baris LF). */
export const SHA256_PROMPT_V3 = 'fb895a8a6450a289df71d757fadfc42df975b6eabae3235257e2e28cc5c1874f';

/** Pemeriksaan yang TIDAK berlaku untuk teladan (hanya untuk keluaran penulis). */
export const PENGECUALIAN_TELADAN: readonly string[] = ['pemeriksa: NAMA_TERLARANG', 'anti-salin'];

/** Isi berkas prompt v3 apa adanya (CRLF → LF saja). */
export function teksPromptV3(): string {
  return readFileSync(JALUR_V3, 'utf8').replace(/\r\n/g, '\n');
}

function teladanMentah(): Record<string, unknown> {
  const t = JSON.parse(readFileSync(JALUR_TELADAN, 'utf8')) as { omongan?: Record<string, unknown> };
  if (typeof t.omongan !== 'object' || t.omongan === null) throw new Error('teladan-dada-s3.json tidak memuat "omongan"');
  return t.omongan;
}

/** Teladan sebagai `OmonganBebas` (untuk pemeriksaan). */
export function teladanV3(): OmonganBebas {
  const r = uraiOmonganBebas(teladanMentah());
  if (r.omongan === null) throw new Error(`teladan tak terurai: ${r.alasan ?? '?'}`);
  return r.omongan;
}

/** Teladan dirender dalam skema keluaran penuh, persis bentuk yang diminta dari penulis. */
export function teksTeladanV3(): string {
  return JSON.stringify({ omongan: [teladanMentah()] }, null, 2);
}

/** `{SUDUT_TERPAKAI}`: kalimat pendek berisi kartu penentu yang sudah ada di bank; kosong bila belum ada. Murni. */
export function kalimatSudut(sudutBank: readonly string[]): string {
  return sudutBank.length === 0 ? '' : ` Kartu penentu yang sudah dipakai: ${sudutBank.join(', ')}.`;
}

/** Prompt v3 terisi. `jumlah` = omongan yang masih kurang (1–3). */
export function promptPenulisV3(paket: PaketFakta, jumlah: number, sudutBank: readonly string[]): string {
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 3) throw new Error(`jumlah omongan harus 1–3, bukan ${String(jumlah)}`);
  const isi: Record<string, string> = { PAKET: teksPaket(paket), JUMLAH: String(jumlah), SUDUT_TERPAKAI: kalimatSudut(sudutBank), TELADAN: teksTeladanV3() };
  // Satu lintasan: isi yang disisipkan (paket, teladan) tidak ikut dipindai sebagai isian.
  return teksPromptV3()
    .replace(/\{([A-Z_]+)\}/g, (utuh, nama: string) => {
      const v = isi[nama];
      if (v === undefined) throw new Error(`prompt v3: isian ${utuh} tidak dikenal`);
      return v;
    })
    .trimEnd(); // hanya baris kosong di akhir berkas yang dibuang
}

/** Panggilan tulis: SATU pesan pengguna. */
export function pesanV3(paket: PaketFakta, jumlah: number, sudutBank: readonly string[]): PesanChat[] {
  return [{ role: 'user', content: promptPenulisV3(paket, jumlah, sudutBank) }];
}

export interface DitolakV3 {
  omongan: OmonganBebas;
  /** Alasan gerbang yang menolak, apa adanya. */
  alasan: readonly string[];
}

/** Tulis ulang tanpa keadaan: prompt v3 yang sama ({JUMLAH} = jumlah butir) + per butir draf sebelumnya dan alasan gerbang. */
export function pesanTulisUlangV3(paket: PaketFakta, sudutBank: readonly string[], ditolak: readonly DitolakV3[]): PesanChat[] {
  if (ditolak.length === 0) throw new Error('tulis ulang butuh minimal satu butir ditolak; untuk tulisan baru pakai pesanV3');
  const blok = ditolak.flatMap((d) => ['', 'Draf sebelumnya:', JSON.stringify(d.omongan), '', 'Belum bisa dipakai karena:', ...d.alasan.map((a) => `- ${a}`)]);
  return [{ role: 'user', content: [promptPenulisV3(paket, ditolak.length, sudutBank), ...blok].join('\n') }];
}

/** Urai keluaran penulis v3: `{"omongan": [ … ]}` → paling banyak `jumlah` omongan. Murni. */
export function uraiKeluaranV3(teks: string, jumlah: number): { omongan: OmonganBebas[]; masalah: string[] } {
  const u = uraiKeluaran(teks);
  if (!u.ok) return { omongan: [], masalah: [u.alasan] };
  const daftar = (u.nilai as { omongan?: unknown } | null)?.omongan;
  if (!Array.isArray(daftar)) return { omongan: [], masalah: ['keluaran tidak memuat larik "omongan"'] };
  const omongan: OmonganBebas[] = [];
  const masalah: string[] = [];
  daftar.forEach((x, i) => {
    const r = uraiOmonganBebas(x);
    if (r.omongan === null) masalah.push(`butir ${String(i + 1)}: ${r.alasan ?? 'tak terurai'}`);
    else if (omongan.length < jumlah) omongan.push(r.omongan);
  });
  if (omongan.length === 0 && masalah.length === 0) masalah.push('larik "omongan" kosong');
  return { omongan, masalah };
}

/* ---------------------------------------------------------------------- */
/* anti-salin teladan + gerbang kode v3                                    */
/* ---------------------------------------------------------------------- */

let POTONGAN_TELADAN: Map<string, string> | null = null;

/** Potongan 5 kata teladan → bagian asalnya. */
export function potonganTeladan(): Map<string, string> {
  if (POTONGAN_TELADAN !== null) return POTONGAN_TELADAN;
  const t = teladanV3();
  const peta = new Map<string, string>();
  const bagian: Array<[string, string]> = [['pesan', t.pesan], ...HURUF.map((h): [string, string] => [`pilihan ${h}`, t.pilihan[h]]), ['penjelasan', t.penjelasan], ['pertanyaan cek', t.pertanyaan_cek]];
  for (const h of HURUF) {
    const p = t.pengecoh[h];
    if (p !== undefined) bagian.push([`umpan balik ${h}`, p.umpan_balik]);
  }
  for (const [b, teks] of bagian) for (const p of potongan(teks)) if (!peta.has(p)) peta.set(p, b);
  POTONGAN_TELADAN = peta;
  return peta;
}

/** Keluaran penulis tidak boleh memuat potongan 5 kata teladan ("tiru bentuk dan gayanya, jangan kalimatnya"). */
export function periksaSalinTeladan(o: OmonganBebas): string[] {
  const s = potonganTeladan();
  const bagian: Array<[string, string]> = [['pesan', o.pesan], ...HURUF.map((h): [string, string] => [`pilihan ${h}`, o.pilihan[h]]), ['penjelasan', o.penjelasan], ['pertanyaan cek', o.pertanyaan_cek]];
  for (const h of HURUF) {
    const p = o.pengecoh[h];
    if (p !== undefined) bagian.push([`umpan balik ${h}`, p.umpan_balik]);
  }
  return bagian.flatMap(([b, teks]) => [...potongan(teks)].filter((p) => s.has(p)).map((p) => `${b} menyalin teladan: "${p}" (teladan, ${s.get(p) ?? '?'})`));
}

/**
 * Gerbang kode v3 untuk SATU omongan (dinilai sendiri, M2d-16 D-6): gerbang 1
 * yang sama (`periksaKodeBebas`, tanpa omongan lain → tanpa aturan sudut dan
 * G-mirip antar omongan) + anti-salin teladan.
 */
export function periksaKodeV3(o: OmonganBebas, paket: PaketFakta): { menolak: MasalahKodeBebas[]; dicatat: MasalahKodeBebas[] } {
  const k = periksaKodeBebas(1, o, paket, [o], new Set());
  return { menolak: [...k.menolak, ...periksaSalinTeladan(o).map((alasan) => ({ sumber: 'anti-salin teladan', alasan }))], dicatat: k.dicatat };
}

export const sha256V3 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');
