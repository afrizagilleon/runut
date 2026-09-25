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

/* ------------------------------------------------------------------ */
/* Penyamaran identitas emiten (A-1, cacat C-3)                        */
/* ------------------------------------------------------------------ */

/**
 * Identitas emiten, seperti yang ada di berkas kasus.
 *
 * Ia masuk ke sini karena kebocorannya lahir di sini: `rincian` dibangun dari
 * `sumber.parameter` dan `sumber.endpoint` apa adanya, dan di berkas kasus DADA
 * kode sahamnya muncul 44 kali di parameter dan 10 kali di endpoint. Dua
 * ketukan dari kartu mana pun — "Lihat sumbernya ›" lalu "Rincian teknis" —
 * dan pemain sudah membaca kode saham yang seharusnya baru ia tahu di akhir.
 */
export interface Emiten {
  simbol: string;
  nama: string;
}

/** Yang menggantikan identitas selama kasus belum selesai. */
export const SAMARAN = '•••';

/** Baris pertama "Rincian teknis" selama identitasnya masih disamarkan. */
export const CATATAN_SAMARAN = 'Kode saham disamarkan sampai simulasi selesai.';

function lolosRegex(teks: string): string {
  return teks.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pola yang menangkap satu identitas di dalam teks apa pun.
 *
 * Tiga hal yang dijaga bentuk ini, dan ketiganya ada di data sungguhan:
 *
 * - **Varian `.JK` lebih dulu**, supaya `DADA.JK` menjadi `•••` utuh dan bukan
 *   `•••.JK` yang masih memberi tahu bursanya.
 * - **Tanpa peduli huruf besar-kecil**, karena endpoint dan parameter tidak
 *   sepakat soal itu.
 * - **Batas bukan-alfanumerik**, bukan batas kata biasa: di
 *   `/v2/company/corporate-actions/DADA/` yang mengapit adalah garis miring,
 *   dan itu harus tertangkap; sementara `dada` di dalam kata seperti "pada"
 *   tidak boleh ikut tersamar.
 */
function polaIdentitas(nilai: string): RegExp | null {
  const bersih = nilai.trim();
  if (bersih === '') return null;
  return new RegExp(`(?<![A-Za-z0-9])${lolosRegex(bersih)}(?![A-Za-z0-9])`, 'gi');
}

/**
 * Ganti setiap kemunculan identitas emiten dengan `•••`.
 *
 * Murni, dan diekspor supaya tiap variasi penulisannya bisa dites sendiri tanpa
 * membangun satu `Fakta` utuh.
 */
export function samarkan(teks: string, emiten: Emiten): string {
  let hasil = teks;
  // Yang terpanjang lebih dulu: `DADA.JK` sebelum `DADA`, nama sebelum simbol
  // kalau salah satunya kebetulan memuat yang lain.
  const urut = [`${emiten.simbol}.JK`, emiten.nama, emiten.simbol].sort(
    (a, b) => b.length - a.length,
  );
  for (const nilai of urut) {
    const pola = polaIdentitas(nilai);
    if (pola !== null) hasil = hasil.replace(pola, SAMARAN);
  }
  return hasil;
}

function samarkanBila(teks: string, emiten: Emiten | null): string {
  return emiten === null ? teks : samarkan(teks, emiten);
}

export interface BarisRincian {
  label: string;
  nilai: string;
}

export interface IsiSumber {
  /** "Buka dokumennya" untuk sumber resmi, "Lihat hitungannya" untuk hitungan (M3.11 D-5). */
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

/*
 * Label kaki lembar (M3.11 D-5; diputuskan reviewer 24 Sep atas penilaian
 * kritikus — pemilik menyerahkan penilaian rupa). Sampai M3.10: "Lihat
 * sumbernya" / "Lihat cara menghitungnya". KartuFakta memakai konstanta ini,
 * jadi label di layar dan di fungsi murni tidak bisa berselisih.
 */
export const PINTU_SUMBER = 'Buka dokumennya';
export const PINTU_HITUNG = 'Lihat hitungannya';

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

/**
 * Apa yang dibaca orang ketika fakta ini dibuka di tempat.
 *
 * `emiten` bukan opsional dan `sudahDibuka` bukan bawaan: keduanya wajib
 * disebut di tiap pemanggilan. Parameter yang boleh dilupakan adalah parameter
 * yang akan dilupakan, dan yang bocor kalau dilupakan adalah premis
 * permainannya sendiri (C-3).
 */
export function isiSumber(
  fakta: Fakta,
  indeks: ReadonlyMap<string, Fakta>,
  emiten: Emiten,
  sudahDibuka: boolean,
): IsiSumber {
  const dihitung = fakta.sumber.jenis === 'turunan';
  /** `null` berarti tidak ada yang perlu disamarkan lagi. */
  const samaran: Emiten | null = sudahDibuka ? null : emiten;

  const rincian: BarisRincian[] = [];
  /*
   * Catatannya berdiri paling depan, bukan di ekor: pemain yang membuka
   * "Rincian teknis" dan melihat `•••` berhak tahu bahwa itu disengaja, bukan
   * data yang hilang.
   */
  if (samaran !== null) rincian.push({ label: 'Catatan', nilai: CATATAN_SAMARAN });
  rincian.push(
    { label: 'Kode fakta', nilai: samarkanBila(fakta.fact_id, samaran) },
    { label: 'Jenis sumber', nilai: fakta.sumber.jenis },
    { label: 'Status verifikasi', nilai: fakta.status },
  );
  if (fakta.sumber.endpoint !== null) {
    rincian.push({ label: 'Endpoint', nilai: samarkanBila(fakta.sumber.endpoint, samaran) });
  }
  if (fakta.sumber.berkas !== null) {
    rincian.push({ label: 'Berkas sumber', nilai: samarkanBila(fakta.sumber.berkas, samaran) });
  }
  for (const [kunci, nilai] of Object.entries(fakta.sumber.parameter)) {
    rincian.push({ label: `Parameter ${kunci}`, nilai: samarkanBila(nilai, samaran) });
  }
  if (fakta.turunan_dari.length > 0) {
    rincian.push({
      label: 'Kode fakta asal',
      nilai: samarkanBila(fakta.turunan_dari.join(', '), samaran),
    });
  }
  rincian.push({
    label: 'Waktu data ditarik',
    nilai: samarkanBila(fakta.sumber.diambil_pada ?? 'tidak tercatat di dalam data', samaran),
  });

  const caraHitung = dihitung ? fakta.sumber.keterangan : null;

  return {
    pintu: dihitung ? PINTU_HITUNG : PINTU_SUMBER,
    kalimatResmi: samarkanBila(fakta.klaim, samaran),
    caraHitung: caraHitung === null ? null : samarkanBila(caraHitung, samaran),
    sejakKapan: `Sudah bisa dibaca publik sejak ${tanggalOrang(fakta.tersedia_sejak)}.`,
    dihitungDari: namaAsal(fakta.turunan_dari, indeks).map((n) => samarkanBila(n, samaran)),
    rincian,
  };
}
