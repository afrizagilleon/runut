/**
 * Kata-kata dan hitungan halaman "Dapur agen" (M3.13 D-4), sebagai fungsi murni.
 *
 * Datanya (`dapur-data.json`) dibangun `node --experimental-strip-types alat/dapur.ts` dari jejak mentah
 * lingkar agen; fungsi di sini hanya MEMILIH dan MENATA apa yang ada di sana.
 * Tidak ada angka yang diketik: status, jumlah penolakan per peran, dan waktu
 * semuanya dihitung dari data, jadi halaman ini ikut berubah kalau jejaknya
 * dibangun ulang.
 *
 * Satu batas kata yang dijaga di sini dan di `dapur.test.ts`: halaman ini
 * TIDAK boleh terbaca seolah simulasi yang dimainkan ditulis AI. Simulasi yang
 * tayang ditulis manusia; draf agen belum pernah dimainkan siapa pun.
 */
import { tanggalSingkat } from './tanggal.ts';

/** Bentuk data — cermin `alat/dapur.ts` (yang membangunnya dari jejak). */
export interface PeranDapur {
  peran: string;
  model: string | null;
  langkah: number;
  panggilan: number;
  putusan: Record<string, number>;
}

export interface PenolakanDapur {
  no: number;
  putaran: number;
  omongan: number | null;
  peran: string;
  jenis: string;
  alasan: string[];
}

export interface DrafDapur {
  nama: string;
  jam: string;
  pesan: string;
  pilihan: Record<string, string>;
  kunci: string;
  penjelasan: string;
}

export interface JalanDapur {
  id: string;
  milestone: string;
  folder: string;
  simulasi: { nama_samaran: string; tanggal_t: string; peristiwa: string };
  terbit: boolean;
  berhenti: string | null;
  mulai: string;
  selesai: string;
  durasi_ms: number;
  putaran: number;
  panggilan: number;
  token_masuk: number;
  token_keluar: number;
  biaya_usd: number | null;
  pemeriksaan: {
    aturan_dijalankan: number;
    aturan_dilewati: number;
    temuan: number;
    fakta_lolos: number;
    fakta_tersingkir: number;
    tersingkir: Array<{ fact_id: string; alasan: string }>;
  };
  peran: PeranDapur[];
  sudut: Array<{
    omongan: number;
    riwayat: Array<{ ke: number; fact_id: string; hasil: string; putaran_mulai: number; putaran_akhir: number }>;
  }>;
  penolakan: PenolakanDapur[];
  draf: DrafDapur[] | null;
  uji_luar: Array<{
    omongan: number;
    kunci: string;
    tebak_benar: number;
    tebak_n: number;
    kartu_benar: number;
    kartu_n: number;
  }> | null;
  alami: { agen: number; manusia: number; penilai: number } | null;
}

/** Jalan atas simulasi yang tayang: angka saja (Amandemen A-1). */
export interface AgregatDapur {
  id: string;
  milestone: string;
  terbit: boolean;
  putaran: number;
  versi: number;
  penolakan: Array<{ peran: string; tolak: number }>;
}

export interface DataDapur {
  keterangan: string;
  sumber: string[];
  jalan: JalanDapur[];
  agregat: AgregatDapur[];
}

/**
 * Satu baris jalan agregat, tanpa nama, tanggal, atau isi apa pun:
 * "Jalan M2d-4: tidak terbit · 11 putaran · 20 versi ditulis · ditolak: …".
 */
export function kalimatAgregat(a: AgregatDapur): string {
  const status = a.terbit ? 'lolos semua penjaga, belum dimainkan' : 'tidak terbit';
  const tolak = a.penolakan.map((p) => `${namaPeran(p.peran)} ${String(p.tolak)}`).join(', ');
  return (
    `Jalan ${a.milestone}: ${status} · ${String(a.putaran)} putaran · ${String(a.versi)} versi ditulis` +
    (tolak === '' ? '' : ` · penolakan: ${tolak}`)
  );
}

/** Parameter URL halaman ini: `?dapur`. Nilainya tidak dibaca; keberadaannya cukup. */
export const PARAM_DAPUR = 'dapur';

/** Apakah alamat ini meminta halaman dapur, bukan permainan. */
export function mintaDapur(pencarian: string): boolean {
  return new URLSearchParams(pencarian).has(PARAM_DAPUR);
}

/** Nama peran untuk pemain (nama di jejak memakai tanda hubung). */
export const NAMA_PERAN: Readonly<Record<string, string>> = {
  perencana: 'Perencana',
  penulis: 'Penulis',
  pemeriksa: 'Pemeriksa',
  'pembaca-kartu': 'Pembaca kartu',
  kritikus: 'Kritikus',
  penebak: 'Penebak ×3',
};

export function namaPeran(peran: string): string {
  return NAMA_PERAN[peran] ?? peran;
}

export type JenisStatus = 'draf' | 'ditolak';

/**
 * Status jujur satu jalan. "Terbit" di jejak berarti lolos semua penjaga di
 * lingkar dalam — BUKAN tayang: tidak ada draf agen di `cases/`.
 */
export function statusJalan(jalan: JalanDapur): { jenis: JenisStatus; label: string } {
  return jalan.terbit
    ? { jenis: 'draf', label: 'Draf — lolos semua penjaga, belum dimainkan' }
    : { jenis: 'ditolak', label: 'Ditolak — tidak terbit' };
}

/** Siapa menolak berapa kali, dari yang terbanyak; peran tanpa penolakan tidak ikut. */
export function tolakPerPeran(jalan: JalanDapur): Array<{ peran: string; tolak: number }> {
  return jalan.peran
    .map((p) => ({ peran: p.peran, tolak: p.putusan['tolak'] ?? 0 }))
    .filter((p) => p.tolak > 0)
    .sort((a, b) => b.tolak - a.tolak);
}

/** Lama jalan dalam menit penuh, dibulatkan ke terdekat. */
export function menit(ms: number): number {
  return Math.round(ms / 60_000);
}

/** "US$1,84" — dua desimal, koma desimal. */
export function dolar(nilai: number): string {
  return `US$${nilai.toFixed(2).replace('.', ',')}`;
}

/** "3,0" — satu desimal, koma desimal. */
export function satuDesimal(nilai: number): string {
  return nilai.toFixed(1).replace('.', ',');
}

/**
 * Judul satu jalan (kritik D-5 butir 6): "Jalan agen: data Perusahaan U" —
 * bukan "Perusahaan U · 4 Mei 2026", yang terbaca seperti judul simulasi
 * yang dimainkan. Tanggalnya tanggal DATA, dieja terpisah (`tanggalData`).
 */
export function judulJalan(jalan: JalanDapur): string {
  return `Jalan agen: data ${jalan.simulasi.nama_samaran}`;
}

export function tanggalData(jalan: JalanDapur): string {
  return tanggalSingkat(jalan.simulasi.tanggal_t);
}

/** Satu baris angka jalan (meta): putaran · panggilan · menit · biaya. */
export function barisAngka(jalan: JalanDapur): string {
  return [
    `${String(jalan.putaran)} putaran`,
    `${String(jalan.panggilan)} panggilan model`,
    `${String(menit(jalan.durasi_ms))} menit`,
    jalan.biaya_usd === null ? 'biaya nyata tidak tercatat' : `${dolar(jalan.biaya_usd)} biaya nyata`,
  ].join(' · ');
}

/** Keterangan satu penolakan: "putaran 3 · omongan 2 · Pemeriksa". */
export function kepalaPenolakan(p: PenolakanDapur): string {
  const bagian = [`putaran ${String(p.putaran)}`];
  if (p.omongan !== null) bagian.push(`omongan ${String(p.omongan)}`);
  bagian.push(namaPeran(p.peran));
  return bagian.join(' · ');
}

/** Berapa contoh penolakan yang tampil sebelum lipatan "Lihat semua" (kritik D-5 butir 4). */
export const PENOLAKAN_TERLIHAT = 2;

/**
 * Contoh penolakan yang tampil tanpa dibuka: yang TERPENDEK (kritik D-5 butir
 * 4), urut menurut nomor langkahnya. Isinya tidak dipotong; yang panjang tetap
 * utuh di lipatan "Lihat semua".
 */
export function contohPenolakan(jalan: JalanDapur): PenolakanDapur[] {
  const panjang = (p: PenolakanDapur): number => p.alasan.join(' ').length;
  return [...jalan.penolakan]
    .sort((a, b) => panjang(a) - panjang(b) || a.no - b.no)
    .slice(0, PENOLAKAN_TERLIHAT)
    .sort((a, b) => a.no - b.no);
}

/** Kalimat pintu masuk di layar lain (M3.13 D-4): pendek, tidak mengganggu alur main. */
export const TAUTAN_DAPUR = 'Lihat dapur agen AI kami';

/** Jumlah hasil penguji luar atas semua omongan satu jalan; `null` bila tidak diuji. */
export function ringkasUjiLuar(
  jalan: JalanDapur,
): { tebak_benar: number; tebak_n: number; kartu_benar: number; kartu_n: number } | null {
  if (jalan.uji_luar === null || jalan.uji_luar.length === 0) return null;
  const jumlah = (f: (x: NonNullable<JalanDapur['uji_luar']>[number]) => number): number =>
    (jalan.uji_luar ?? []).reduce((j, x) => j + f(x), 0);
  return {
    tebak_benar: jumlah((x) => x.tebak_benar),
    tebak_n: jumlah((x) => x.tebak_n),
    kartu_benar: jumlah((x) => x.kartu_benar),
    kartu_n: jumlah((x) => x.kartu_n),
  };
}
