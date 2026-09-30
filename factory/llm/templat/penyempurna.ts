/**
 * Penyempurna struktur (M2d-10 D-3, Claude Haiku 4.5 lewat OpenRouter).
 *
 * Dipanggil HANYA bila sebuah gerbang menolak bagian pilihan. Masukannya
 * pendek: empat pilihan kini (per slot), kalimat kartu omongan itu, jenis
 * kegagalan + alasan singkat, dan ALTERNATIF YANG DIIZINKAN per slot (varian
 * templat yang proposisinya sudah diperiksa `bukti.ts`). Keluarannya: per slot
 * yang diubah, id varian + teks.
 *
 * Kode memeriksa ulang SETIAP slot yang diubah (`verifikasiPerbaikan`): varian
 * ada di daftar slot itu; label sama; rujukan `[[…]]` dan angka persis sama
 * dengan varian; kata inti & penanda waktu tertulis; panjang; anti-salin;
 * lalu syarat kunci tunggal atas kombinasi baru. Slot yang gagal dibuang
 * (pilihan lama tetap). Haiku karena itu tidak bisa mengubah angka, rujukan,
 * label, atau nilai kebenaran — hanya memilih varian dan merangkai kata.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ambilRujukan, teksPolos } from '../../skema/rujukan.ts';
import type { PesanChat } from '../klien.ts';
import { MODEL_OR_HAIKU } from '../model.ts';
import type { PaketFakta } from '../paket.ts';
import { uraiKeluaran, type SetelanPanggil } from '../susun.ts';
import { buktiKunciTunggal, periksaTeksVarian } from './bukti.ts';
import type { NamaSlot, RencanaSoal, VarianPilihan } from './pola.ts';
import { SLOT, salinanTayang, type PilihanAktif } from './rakit.ts';

export const MODEL_PENYEMPURNA = MODEL_OR_HAIKU;
export const SETELAN_PENYEMPURNA: SetelanPanggil = { suhu: 0.3, maxTokens: 1_500 };

export type JenisKegagalan = 'tertebak' | 'pembaca-kartu' | 'kode' | 'kritikus';

export const promptPenyempurna = (): string =>
  readFileSync(fileURLToPath(new URL('./prompt-templat-penyempurna.md', import.meta.url)), 'utf8').replace(/\r\n/g, '\n').trim();

const KET_JENIS: Readonly<Record<JenisKegagalan, string>> = {
  tertebak: 'tertebak tanpa kartu',
  'pembaca-kartu': 'pembaca kartu memilih pilihan lain',
  kode: 'pemeriksa kode',
  kritikus: 'keberatan kritikus',
};

function potong(t: string, n: number): string {
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

export interface PermintaanPenyempurna {
  paket: PaketFakta;
  r: RencanaSoal;
  pilihan: PilihanAktif;
  jenis: JenisKegagalan;
  alasan: readonly string[];
}

/** Pesan untuk Haiku — pendek: pilihan, kartu, kegagalan, alternatif. */
export function pesanPenyempurna(p: PermintaanPenyempurna): PesanChat[] {
  const klaim = (id: string): string => p.paket.fakta.find((f) => f.fact_id === id)?.klaim ?? '';
  const baris: string[] = [
    `Klaim teman: ${p.r.klaim.inti} (menurut kartu klaim ini ${p.r.klaim.label.toUpperCase()}).`,
    'Kartu:',
    ...p.r.kartu.map((id, i) => `- Kartu ${String(i + 1)}: ${potong(klaim(id), 320)}`),
    '',
    'Pilihan kini (per slot):',
  ];
  for (const s of SLOT) {
    const v = p.pilihan[s];
    baris.push(`- ${s}${s === 'kunci' ? ' (JAWABAN BENAR — harus tetap benar)' : ' (pengecoh — harus tetap salah)'} [${v.id}]: ${v.teks}`);
  }
  baris.push('', `DITOLAK: ${KET_JENIS[p.jenis]}.`, ...p.alasan.slice(0, 3).map((a) => `- ${potong(a, 300)}`), '', 'ALTERNATIF YANG DIIZINKAN per slot (teks + kata inti yang wajib tetap ada):');
  for (const sl of p.r.slot) {
    for (const v of sl.varian) baris.push(`- ${sl.slot} ${v.id}: ${v.teks}   [kata inti: ${[...v.inti, ...(v.penanda === null ? [] : [v.penanda])].join(', ')}]`);
  }
  baris.push('', 'Keluarkan JSON saja: {"pilihan": {"<slot>": {"varian": "<id>", "teks": "..."}}, "alasan": "..."}');
  return [
    { role: 'system', content: promptPenyempurna() },
    { role: 'user', content: baris.join('\n') },
  ];
}

export interface UsulanSlot {
  varian: string;
  teks: string;
}

export function uraiPenyempurna(teks: string): { pilihan: Partial<Record<NamaSlot, UsulanSlot>>; alasan: string } | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || typeof u.nilai !== 'object' || u.nilai === null) return null;
  const n = u.nilai as Record<string, unknown>;
  const p = n['pilihan'];
  if (typeof p !== 'object' || p === null) return null;
  const hasil: Partial<Record<NamaSlot, UsulanSlot>> = {};
  for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
    if (!(SLOT as readonly string[]).includes(k) || typeof v !== 'object' || v === null) continue;
    const x = v as Record<string, unknown>;
    if (typeof x['varian'] === 'string' && typeof x['teks'] === 'string') hasil[k as NamaSlot] = { varian: x['varian'].trim(), teks: x['teks'].trim() };
  }
  return { pilihan: hasil, alasan: typeof n['alasan'] === 'string' ? n['alasan'] : '' };
}

const rujukanUrut = (t: string): string[] => ambilRujukan(t).map((r) => `[[${r.fact_id}|${r.teks}]]`).sort();
const angkaUrut = (t: string): string[] => (teksPolos(t).match(/\d+(?:[.,]\d+)*/g) ?? []).sort();
const sama = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/** Rujukan `[[…]]` dan angka teks baru harus persis sama dengan alternatifnya. Murni. */
export function angkaTerkunci(baru: string, dasar: string): string[] {
  const m: string[] = [];
  if (!sama(rujukanUrut(baru), rujukanUrut(dasar))) m.push('rujukan [[…]] tidak persis sama dengan alternatif');
  if (!sama(angkaUrut(baru), angkaUrut(dasar))) m.push('angka berubah');
  return m;
}

export interface HasilVerifikasi {
  pilihan: PilihanAktif;
  diterima: Array<{ slot: NamaSlot; dari: string; ke: string; varian: string }>;
  dibuang: Array<{ slot: NamaSlot; alasan: string }>;
}

/** Periksa ulang usulan penyempurna slot demi slot; yang gagal dibuang. Murni. */
export function verifikasiPerbaikan(r: RencanaSoal, paket: PaketFakta, lama: PilihanAktif, usulan: Partial<Record<NamaSlot, UsulanSlot>>): HasilVerifikasi {
  const pilihan: PilihanAktif = { ...lama };
  const diterima: HasilVerifikasi['diterima'] = [];
  const dibuang: HasilVerifikasi['dibuang'] = [];
  for (const s of SLOT) {
    const u = usulan[s];
    if (u === undefined) continue;
    const slot = r.slot.find((x) => x.slot === s);
    const dasar = slot?.varian.find((v) => v.id === u.varian);
    if (dasar === undefined) {
      dibuang.push({ slot: s, alasan: `varian "${u.varian}" bukan alternatif yang diizinkan untuk ${s}` });
      continue;
    }
    const calon: VarianPilihan = { ...dasar, teks: u.teks };
    const m: string[] = [];
    m.push(...angkaTerkunci(u.teks, dasar.teks));
    m.push(...periksaTeksVarian(calon, paket));
    m.push(...salinanTayang(u.teks).map((x) => `menyalin soal tayang ${x}`));
    const uji = { ...pilihan, [s]: calon };
    const b = buktiKunciTunggal(r, paket, uji);
    if (!b.sah) m.push(...b.masalah.filter((x) => x.startsWith('kombinasi')));
    if (m.length > 0) {
      dibuang.push({ slot: s, alasan: m.join('; ') });
      continue;
    }
    if (calon.teks === lama[s].teks && calon.id === lama[s].id) continue;
    diterima.push({ slot: s, dari: lama[s].teks, ke: calon.teks, varian: calon.id });
    pilihan[s] = calon;
  }
  return { pilihan, diterima, dibuang };
}
