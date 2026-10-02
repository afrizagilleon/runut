/**
 * Prompt penulis bebas M2d-13 (pra-registrasi §3): SATU prompt sistem yang
 * sama byte demi byte untuk ketiga model; pesan pengguna = paket fakta
 * (+ omongan lulus sebagai konteks + versi ditolak & alasannya). Murni
 * kecuali pembacaan berkas prompt dan soal tayang.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tanggalId } from '../../format.ts';
import { teksPolos } from '../../skema/rujukan.ts';
import { batasPanjang } from '../gerbang-gaya.ts';
import { soalManusiaM2d8 } from '../kalibrasi-soal.ts';
import type { PesanChat } from '../klien.ts';
import type { PaketFakta } from '../paket.ts';
import { uraiKeluaran } from '../susun.ts';
import { namaTerlarang } from '../templat/penulis.ts';
import { HURUF, uraiOmonganBebas, type OmonganBebas } from './skema.ts';

const JALUR = fileURLToPath(new URL('./prompt-penulis-bebas.md', import.meta.url));

/** Tiga soal DADA tayang (teks polos) sebagai teladan gaya. */
export function teladanDada(): string {
  return soalManusiaM2d8()
    .filter((s) => s.id.startsWith('dada-'))
    .map((s, i) => {
      const o = s.omongan;
      return [
        `Teladan ${String(i + 1)} — pesan dari ${o.nama}: "${teksPolos(o.pesan)}"`,
        ...HURUF.map((h) => `  ${h}) ${teksPolos(o.pilihan[h])}`),
        `  kunci: ${o.kunci}`,
        `  penjelasan: ${teksPolos(o.penjelasan)}`,
      ].join('\n');
    })
    .join('\n\n');
}

const kapital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Prompt sistem penulis bebas untuk paket ini. */
export function promptPenulisBebas(paket: Pick<PaketFakta, 'tanggal_t'>): string {
  const b = batasPanjang();
  const nama = namaTerlarang().map(kapital);
  return readFileSync(JALUR, 'utf8')
    .replace(/\r\n/g, '\n')
    .trim()
    .replaceAll('{NAMA_TERLARANG}', `${nama.slice(0, -1).join(', ')}, atau ${nama.at(-1) ?? ''}`)
    .replaceAll('{BATAS_PESAN}', String(b.pesan))
    .replaceAll('{BATAS_PILIHAN}', String(b.pilihan))
    .replaceAll('{TANGGAL_T}', tanggalId(paket.tanggal_t))
    .replaceAll('{TELADAN}', teladanDada());
}

export const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

function tulisNilai(f: PaketFakta['fakta'][number]): string {
  return f.nilai === null ? '-' : `${String(f.nilai)}${f.satuan === null ? '' : ` ${f.satuan}`}`;
}

/** Paket fakta sebagai teks (sama untuk semua penulis). */
export function teksPaket(paket: PaketFakta): string {
  const baris: string[] = [
    `Tanggal simulasi (T): ${tanggalId(paket.tanggal_t)}. Semua pesan dikirim sesudah bursa tutup hari itu.`,
    `Nama samaran emiten: ${paket.nama_samaran}`,
    `Peristiwa: ${paket.peristiwa}`,
    '',
    `PAKET FAKTA (${String(paket.fakta.length)} fakta; hanya ini yang boleh dipakai):`,
  ];
  for (const f of paket.fakta) {
    baris.push(`- ${f.fact_id} | ${f.jenis === 'hitungan' ? 'hitungan' : 'dokumen'} (${f.asal}) | terbit ${tanggalId(f.terbit)} | nilai: ${tulisNilai(f)}`);
    baris.push(`  isi: ${f.klaim}`);
    if (f.turunan_dari.length > 0) baris.push(`  dihitung dari: ${f.turunan_dari.join(', ')}`);
  }
  return baris.join('\n');
}

export interface Ditolak {
  no: number;
  omongan: OmonganBebas | null;
  alasan: string[];
}

/** Versi 1: tulis ketiga omongan. */
export function pesanVersi1(paket: PaketFakta): PesanChat[] {
  return [
    { role: 'system', content: promptPenulisBebas(paket) },
    { role: 'user', content: `${teksPaket(paket)}\n\nTulis satu simulasi: tepat tiga omongan (no 1, 2, 3) sesuai aturan. Keluarkan JSON saja.` },
  ];
}

const jsonOmongan = (no: number, o: OmonganBebas): string => JSON.stringify({ no, ...o });

/** Versi 2–3: tulis ulang SEMUA omongan yang ditolak; yang lulus ikut sebagai konteks. */
export function pesanRevisi(paket: PaketFakta, lulus: ReadonlyArray<{ no: number; omongan: OmonganBebas }>, ditolak: readonly Ditolak[]): PesanChat[] {
  const nomor = ditolak.map((d) => d.no);
  const bagian: string[] = [teksPaket(paket), ''];
  if (lulus.length > 0) {
    bagian.push('OMONGAN YANG SUDAH LULUS (konteks saja — JANGAN ditulis ulang; omonganmu harus bersudut lain dan pengirimnya berbeda):');
    for (const l of lulus) bagian.push(jsonOmongan(l.no, l.omongan));
    bagian.push('');
  }
  bagian.push('OMONGAN YANG DITOLAK PEMERIKSA (tulis ulang masing-masing; boleh mengganti sudut, kartu, dan seluruh kalimatnya):');
  for (const d of ditolak) {
    bagian.push(`--- omongan ${String(d.no)} ---`);
    bagian.push(d.omongan === null ? 'versi sebelumnya: (keluaranmu tidak terbaca)' : `versi sebelumnya: ${jsonOmongan(d.no, d.omongan)}`);
    bagian.push('alasan penolakan:');
    for (const a of d.alasan) bagian.push(`- ${a}`);
  }
  bagian.push('', `Tulis ulang HANYA omongan nomor ${nomor.join(', ')}. Keluarkan JSON saja: {"omongan": [ ... ]} berisi tepat ${String(nomor.length)} objek, masing-masing dengan "no" yang sesuai.`);
  return [
    { role: 'system', content: promptPenulisBebas(paket) },
    { role: 'user', content: bagian.join('\n') },
  ];
}

/**
 * Urai keluaran penulis untuk nomor yang diminta. Omongan tanpa "no" diberi
 * nomor menurut urutan permintaan. Nomor yang tidak ada/tak terurai → hilang.
 * Murni.
 */
export function uraiKeluaranBebas(teks: string, diminta: readonly number[]): { omongan: Map<number, OmonganBebas>; masalah: string[] } {
  const hasil = new Map<number, OmonganBebas>();
  const masalah: string[] = [];
  const u = uraiKeluaran(teks);
  if (!u.ok) return { omongan: hasil, masalah: [u.alasan] };
  const daftar = (u.nilai as { omongan?: unknown } | null)?.omongan;
  if (!Array.isArray(daftar)) return { omongan: hasil, masalah: ['keluaran tidak memuat larik "omongan"'] };
  const noTertulis = (x: unknown): number | null => {
    const n = typeof x === 'object' && x !== null ? (x as Record<string, unknown>)['no'] : undefined;
    return typeof n === 'number' && diminta.includes(n) ? n : null;
  };
  const dipakai = new Set(daftar.map(noTertulis).filter((n): n is number => n !== null));
  const bebasNo = diminta.filter((n) => !dipakai.has(n));
  for (const x of daftar) {
    const no = noTertulis(x) ?? bebasNo.shift();
    if (no === undefined || hasil.has(no)) continue;
    const r = uraiOmonganBebas(x);
    if (r.omongan === null) masalah.push(`omongan ${String(no)}: ${r.alasan ?? 'tak terurai'}`);
    else hasil.set(no, r.omongan);
  }
  for (const n of diminta) if (!hasil.has(n)) masalah.push(`omongan ${String(n)} tidak ada di keluaran`);
  return { omongan: hasil, masalah };
}
