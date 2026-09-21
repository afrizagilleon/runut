import type { Fakta } from '../../factory/skema/tipe.ts';
import { angkaId } from './angka.ts';
import { penanda } from './tanggal.ts';

/**
 * Apa yang tampil ketika sebuah fakta dibuka (D-5).
 *
 * Dulu ini lembar bawah `role="dialog"` yang menutupi layar. Usul pemilik —
 * buka di tempat — membuang seluruh kelas cacat sekaligus: perangkap fokus,
 * kunci gulir, garis bawah yang melayang, dan "di mana tadi saya" sesudah panel
 * ditutup. Yang tersisa hanyalah pertanyaan isi: **apa yang pantas dibaca
 * orang di sini**, dan itu fungsi murni yang bisa dites tanpa peramban.
 *
 * Kosakata pabrik (kode fakta, endpoint, parameter) tidak ikut ke permukaan; ia
 * duduk di `rincian`, di balik lipatan "Rincian teknis".
 */

/** Berapa karakter klaim yang dipakai kalau fakta asal belum punya teks awam. */
const MAKS_NAMA_ASAL = 48;

export interface BarisRincian {
  label: string;
  nilai: string;
}

export interface IsiSumber {
  /** "Lihat sumbernya" untuk sumber resmi, "Lihat cara menghitungnya" untuk hitungan. */
  pintu: string;
  /** Klaim formal fakta itu. Selalu ada. */
  kalimatResmi: string;
  /** Cara menghitungnya, hanya untuk fakta turunan. */
  caraHitung: string | null;
  /** "Sudah bisa dibaca publik sejak 16 September 2025." */
  sejakKapan: string;
  /** Nama fakta asal dalam bahasa orang; kosong kalau bukan turunan. */
  dihitungDari: string[];
  /** Isi lipatan "Rincian teknis". */
  rincian: BarisRincian[];
}

export const PINTU_SUMBER = 'Lihat sumbernya';
export const PINTU_HITUNG = 'Lihat cara menghitungnya';

function tanggalOrang(iso: string | null): string {
  if (iso === null) return 'tidak bisa ditentukan dari data';
  try {
    return penanda(iso).panjang;
  } catch {
    return iso;
  }
}

/**
 * Nama fakta dalam bahasa orang: kepala awam kalau ada, kalau tidak potongan
 * klaimnya. Kodenya sendiri tetap ada — di dalam lipatan "Rincian teknis".
 */
export function namaFakta(id: string, indeks: ReadonlyMap<string, Fakta>): string {
  const fakta = indeks.get(id);
  if (fakta === undefined) return id;
  const kepala = fakta.awam?.kepala.trim();
  if (kepala !== undefined && kepala !== '') return kepala;
  const klaim = fakta.klaim.trim();
  if (klaim.length <= MAKS_NAMA_ASAL) return klaim;
  const potong = klaim.slice(0, MAKS_NAMA_ASAL);
  const spasi = potong.lastIndexOf(' ');
  return `${(spasi > 0 ? potong.slice(0, spasi) : potong).replace(/[.,;:]$/, '')}…`;
}

/**
 * Nama untuk satu daftar fakta asal, dijamin saling berbeda (A4-T3).
 * Kalau namanya bentrok, yang dipakai adalah hal yang memang membedakan
 * mereka: nilai dan satuannya. Kalau nilainya pun kembar, baru nomor urut.
 */
export function namaAsal(ids: readonly string[], indeks: ReadonlyMap<string, Fakta>): string[] {
  const dasar = ids.map((id) => namaFakta(id, indeks));
  const hitung = new Map<string, number>();
  for (const nama of dasar) hitung.set(nama, (hitung.get(nama) ?? 0) + 1);

  const pakai = dasar.map((nama, i) => {
    if ((hitung.get(nama) ?? 0) < 2) return nama;
    const fakta = indeks.get(ids[i] ?? '');
    if (fakta === undefined) return nama;
    if (typeof fakta.nilai === 'number') return `${angkaId(fakta.nilai)} ${fakta.satuan}`;
    if (typeof fakta.nilai === 'string' && fakta.nilai.trim() !== '') return fakta.nilai;
    return nama;
  });

  const hitung2 = new Map<string, number>();
  for (const nama of pakai) hitung2.set(nama, (hitung2.get(nama) ?? 0) + 1);
  const urut = new Map<string, number>();
  return pakai.map((nama) => {
    if ((hitung2.get(nama) ?? 0) < 2) return nama;
    const n = (urut.get(nama) ?? 0) + 1;
    urut.set(nama, n);
    return `${nama} (${String(n)})`;
  });
}

/** Apa yang dibaca orang ketika fakta ini dibuka di tempat. */
export function isiSumber(fakta: Fakta, indeks: ReadonlyMap<string, Fakta>): IsiSumber {
  const dihitung = fakta.sumber.jenis === 'turunan';

  const rincian: BarisRincian[] = [
    { label: 'Kode fakta', nilai: fakta.fact_id },
    { label: 'Jenis sumber', nilai: fakta.sumber.jenis },
    { label: 'Status verifikasi', nilai: fakta.status },
  ];
  if (fakta.sumber.endpoint !== null) {
    rincian.push({ label: 'Endpoint', nilai: fakta.sumber.endpoint });
  }
  if (fakta.sumber.berkas !== null) {
    rincian.push({ label: 'Berkas sumber', nilai: fakta.sumber.berkas });
  }
  for (const [kunci, nilai] of Object.entries(fakta.sumber.parameter)) {
    rincian.push({ label: `Parameter ${kunci}`, nilai });
  }
  if (fakta.turunan_dari.length > 0) {
    rincian.push({ label: 'Kode fakta asal', nilai: fakta.turunan_dari.join(', ') });
  }
  rincian.push({
    label: 'Waktu data ditarik',
    nilai: fakta.sumber.diambil_pada ?? 'tidak tercatat di dalam data',
  });

  return {
    pintu: dihitung ? PINTU_HITUNG : PINTU_SUMBER,
    kalimatResmi: fakta.klaim,
    caraHitung: dihitung ? fakta.sumber.keterangan : null,
    sejakKapan: `Sudah bisa dibaca publik sejak ${tanggalOrang(fakta.tersedia_sejak)}.`,
    dihitungDari: namaAsal(fakta.turunan_dari, indeks),
    rincian,
  };
}
