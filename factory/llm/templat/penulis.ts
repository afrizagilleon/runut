/**
 * Penulis kata (M2d-10 D-2, DeepSeek V4.1 Flash): mengubah klaim templat
 * menjadi pesan teman (dengan contoh bank gaya v2) dan menulis penjelasan
 * sesudah soal jadi. Penulis TIDAK menyentuh pilihan: pilihan datang dari
 * templat (kode) dan hanya penyempurna yang boleh memilih varian lain.
 *
 * Angka dikunci: pesan hanya boleh memuat angka yang diizinkan templat (teks
 * persis; `angka_pesan` dihitung kode), penjelasan hanya boleh memakai
 * rujukan yang diizinkan templat (persis).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tanggalId } from '../../format.ts';
import { teksPolos } from '../../skema/rujukan.ts';
import { tulisContoh, type KalimatGaya, type Nada } from '../bank-gaya.ts';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { batasPanjang } from '../gerbang-gaya.ts';
import { gPenilaian } from '../gerbang-penilaian.ts';
import { kasusTayang } from '../kalibrasi-pemanasan.ts';
import type { PesanChat } from '../klien.ts';
import type { ModelOpenRouter } from '../model.ts';
import type { PaketFakta } from '../paket.ts';
import { uraiPenjelasan } from '../penulis-pecah.ts';
import { uraiKeluaran, type JawabanModel, type SetelanPanggil } from '../susun.ts';
import { NAMA_TERLARANG } from '../validasi.ts';
import { gKlaimTambahan } from './a2.ts';
import type { RencanaSoal } from './pola.ts';
import { angkaPesanDari, periksaPenjelasan, periksaWajib, salinanTayang, type TulisanPesan } from './rakit.ts';

/* ---------------------------------------------------------------------- */
/* pemanggil                                                               */
/* ---------------------------------------------------------------------- */

export type PeranTemplat = 'penulis' | 'penyempurna' | 'penebak' | 'pembaca-kartu' | 'kritikus';
/** M2d-13: `tulis-bebas` = penulis bebas (factory/llm/bebas/). */
export type JenisTemplat = 'tulis-pesan' | 'tulis-penjelasan' | 'sempurnakan-pilihan' | 'gerbang-tebak' | 'gerbang-kartu' | 'kritikus' | 'tulis-bebas';

export interface InfoTemplat {
  jenis: JenisTemplat;
  /** Nomor versi yang sedang dikerjakan (untuk tag ledger dan jejak). */
  putaran: number;
  omongan: number | null;
  ke: number;
  ulang?: number;
  peran: PeranTemplat;
  model: ModelOpenRouter;
}

export type PanggilTemplat = (pesan: PesanChat[], setelan: SetelanPanggil, info: InfoTemplat) => Promise<JawabanModel>;

/* ---------------------------------------------------------------------- */
/* prompt                                                                  */
/* ---------------------------------------------------------------------- */

const JALUR = {
  pesan: fileURLToPath(new URL('./prompt-templat-pesan.md', import.meta.url)),
  penjelasan: fileURLToPath(new URL('./prompt-templat-penjelasan.md', import.meta.url)),
} as const;

function bacaPrompt(jalur: string): string {
  return readFileSync(jalur, 'utf8').replace(/\r\n/g, '\n').trim().replaceAll('{BATAS_PESAN}', String(batasPanjang().pesan));
}

export const promptTemplatPesan = (): string => bacaPrompt(JALUR.pesan);
export const promptTemplatPenjelasan = (): string => bacaPrompt(JALUR.penjelasan);

/** Nama yang tidak boleh dipakai: validator + nama pengirim di kasus tayang. */
export function namaTerlarang(): string[] {
  return [...new Set([...NAMA_TERLARANG, ...kasusTayang().flatMap((k) => k.soal.map((s) => s.pesan.nama.toLowerCase()))])];
}

function kepala(paket: PaketFakta): string[] {
  return [
    `Tanggal simulasi (T): ${tanggalId(paket.tanggal_t)}; pesan dikirim sesudah bursa tutup hari itu.`,
    `Nama samaran emiten: ${paket.nama_samaran}`,
  ];
}

function umpanBlok(umpan: readonly string[] | undefined, sebelumnya: string | null | undefined): string[] {
  const b: string[] = [];
  if (sebelumnya !== undefined && sebelumnya !== null) b.push('', `Tulisan sebelumnya DITOLAK: ${sebelumnya}`);
  if (umpan !== undefined && umpan.length > 0) b.push('Masalahnya (perbaiki semuanya, isi klaim tetap):', ...umpan.map((u) => `- ${u}`));
  return b;
}

export interface PermintaanPesanTemplat {
  paket: PaketFakta;
  r: RencanaSoal;
  no: number;
  namaLain: readonly string[];
  gaya: { nada: Nada; contoh: readonly KalimatGaya[] };
  sebelumnya?: TulisanPesan | null;
  umpan?: readonly string[];
}

export function pesanTulisPesanTemplat(p: PermintaanPesanTemplat): PesanChat[] {
  const k = p.r.klaim;
  const baris = [
    ...kepala(p.paket),
    '',
    `KLAIM TEMAN (isi tidak boleh berubah): ${k.inti}`,
    'Teman sungguh percaya klaimnya. Jangan memberi petunjuk apakah klaim itu benar atau salah.',
    `ANGKA YANG BOLEH (tulis persis, atau tanpa angka): ${k.angka.length === 0 ? 'TIDAK ADA — pesan tanpa angka sama sekali' : k.angka.map((a) => `"${a.teks}"`).join(', ')}`,
    `WAJIB DISEBUT: ${k.wajib.map((g) => g.map((x) => `"${x}"`).join(' atau ')).join('; ') || '-'}`,
    `Nama terlarang: ${[...namaTerlarang(), ...p.namaLain.map((n) => n.toLowerCase())].join(', ')}.`,
    '',
    tulisContoh(p.gaya.nada, p.gaya.contoh),
    ...umpanBlok(p.umpan, p.sebelumnya === undefined || p.sebelumnya === null ? null : JSON.stringify(p.sebelumnya)),
    '',
    'Keluarkan JSON saja: {"nama": "...", "jam": "HH.MM", "pesan": "..."}',
  ];
  return [
    { role: 'system', content: promptTemplatPesan() },
    { role: 'user', content: baris.join('\n') },
  ];
}

export function uraiTulisanPesan(teks: string): TulisanPesan | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || typeof u.nilai !== 'object' || u.nilai === null) return null;
  const n = u.nilai as Record<string, unknown>;
  if (typeof n['nama'] !== 'string' || typeof n['jam'] !== 'string' || typeof n['pesan'] !== 'string') return null;
  const t = { nama: n['nama'].trim(), jam: n['jam'].trim(), pesan: n['pesan'].trim() };
  return t.nama === '' || t.pesan === '' ? null : t;
}

/** Pemeriksaan kode atas pesan (sebelum gerbang lain): angka terkunci, kata wajib, panjang, nama, anti-salin, penilaian. */
export function periksaTulisanPesan(t: TulisanPesan, r: RencanaSoal, namaLain: readonly string[]): string[] {
  const m = [...angkaPesanDari(t.pesan, r.klaim).masalah, ...periksaWajib(t.pesan, r.klaim), ...gKlaimTambahan(t.pesan)];
  if (t.pesan.length > 220) m.push(`pesan ${String(t.pesan.length)} karakter, lebih dari 220`);
  const nama = t.nama.toLowerCase();
  if (namaTerlarang().includes(nama) || namaLain.some((x) => x.toLowerCase() === nama)) m.push(`nama "${t.nama}" terlarang atau sudah dipakai omongan lain`);
  for (const s of salinanTayang(t.pesan)) m.push(`pesan menyalin soal tayang: ${s}`);
  for (const a of gPenilaian(t.pesan).alasan) m.push(a);
  return m;
}

export interface PermintaanPenjelasanTemplat {
  paket: PaketFakta;
  r: RencanaSoal;
  o: Omit<OmonganDraf, 'penjelasan'>;
  sebelumnya?: string | null;
  umpan?: readonly string[];
}

const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

export function pesanTulisPenjelasanTemplat(p: PermintaanPenjelasanTemplat): PesanChat[] {
  const klaim = (id: string): string => p.paket.fakta.find((f) => f.fact_id === id)?.klaim ?? '';
  const baris = [
    ...kepala(p.paket),
    '',
    `Pesan dari ${p.o.nama} (${p.o.jam}): "${p.o.pesan}"`,
    'Kartu:',
    ...p.o.kartu.map((id, i) => `- Kartu ${String(i + 1)}${p.o.kartu_penentu.includes(id) ? ' (menentukan jawaban)' : ''}: ${klaim(id)}`),
    'Pilihan (urutan bisa diatur ulang mesin; jangan sebut hurufnya):',
    ...HURUF.map((h) => `- ${teksPolos(p.o.pilihan[h])}${h === p.o.kunci ? '   ← JAWABAN' : ''}`),
    '',
    `Salah kaprah yang dijelaskan di kalimat terakhir: ${p.r.salah_kaprah}.`,
    'RUJUKAN YANG BOLEH (salin persis bila menyebut angka/tanggal):',
    ...p.r.rujukan_penjelasan.map((t) => `- ${t}`),
    ...umpanBlok(p.umpan, p.sebelumnya),
    '',
    'Keluarkan JSON saja: {"penjelasan": "..."}',
  ];
  return [
    { role: 'system', content: promptTemplatPenjelasan() },
    { role: 'user', content: baris.join('\n') },
  ];
}

export { uraiPenjelasan };

export function periksaTulisanPenjelasan(pj: string, r: RencanaSoal): string[] {
  const m = periksaPenjelasan(pj, r);
  if (!/salah-kaprah yang umum:/i.test(pj)) m.push('penjelasan harus ditutup satu kalimat "Salah-kaprah yang umum: …"');
  if (teksPolos(pj).length > 750) m.push(`penjelasan ${String(teksPolos(pj).length)} karakter polos, lebih dari 750`);
  for (const s of salinanTayang(pj)) m.push(`penjelasan menyalin soal tayang: ${s}`);
  return m;
}

/* ---------------------------------------------------------------------- */
/* satu panggilan penulis dengan cadangan                                  */
/* ---------------------------------------------------------------------- */

export interface CatatanTulis {
  jawaban: JawabanModel;
  terurai: boolean;
  berpikir: boolean;
  setelan: SetelanPanggil;
}

/** Panggil penulis; bila keluaran tak terbaca, sekali lagi dengan setelan cadangan (tanpa berpikir). */
export async function tulisBercadangan<T>(
  panggil: PanggilTemplat,
  pesan: PesanChat[],
  setelan: { berpikir: SetelanPanggil; cadangan: SetelanPanggil },
  info: Omit<InfoTemplat, 'ulang'>,
  urai: (teks: string) => T | null,
  catat: (c: CatatanTulis) => void,
): Promise<T | null> {
  const upaya = [
    { s: setelan.berpikir, berpikir: true },
    { s: setelan.cadangan, berpikir: false },
  ];
  for (const [ulang, u] of upaya.entries()) {
    const j = await panggil(pesan, { ...u.s }, { ...info, ulang });
    const n = urai(j.teks);
    catat({ jawaban: j, terurai: n !== null, berpikir: u.berpikir, setelan: u.s });
    if (n !== null) return n;
  }
  return null;
}
