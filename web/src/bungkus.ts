/**
 * Pembungkus reducer permainan: kasus mana yang sedang dimainkan (M4 D-4).
 *
 * `alur.ts` menjawab "apa yang terjadi di dalam satu kasus". Berkas ini
 * menjawab satu tingkat di atasnya: **kasus mana yang sedang dibuka, dan apa
 * yang terjadi ketika ia berganti** — yaitu ketika pemain menekan "Mau coba
 * kasus lain" dan kasus berikutnya langsung terbuka.
 *
 * Ia dipisahkan dari `Aplikasi.tsx` karena alasan yang sama dengan `alur.ts`:
 * repo ini sengaja tanpa jsdom, jadi keadaan yang hidup di dalam komponen tidak
 * bisa dibuktikan tes mana pun. Pergantian kasus membuang seluruh keadaan
 * permainan; satu-satunya cara memastikan ia tidak ikut membuang antrean
 * peristiwa yang belum terkirim adalah menjalankannya di meja.
 */
import type { Kasus } from '../../factory/skema/tipe.ts';
import { keadaanAwal, langkah, type Aksi, type Keadaan, type Peristiwa } from './alur.ts';
import { kunciBenar, petaKartu, urutanSoal } from './isi-kasus.ts';

export interface Bungkus {
  /** Kasus yang sedang dimainkan; komponen merender dari sini, bukan dari modul. */
  kasus: Kasus;
  keadaan: Keadaan;
  /** Peristiwa yang belum diserahkan ke `kirim.ts`. */
  antre: Peristiwa[];
}

export type Pesan =
  | { aksi: Aksi; waktu: number }
  /**
   * Peristiwa yang SUDAH diserahkan ke `kirim.ts`, disebut satu per satu —
   * bukan jumlahnya (F-1, M3.8). Lihat `reduksi`.
   */
  | { bersihkan: readonly Peristiwa[] }
  /**
   * Kasus lain dibuka: **sesi baru, pengunjung sama** (D-4).
   *
   * Id sesinya datang dari pemanggil, bukan dibuat di sini, supaya berkas ini
   * tetap murni — sama seperti waktu yang selalu disuntikkan ke `langkah()`.
   */
  | { kasusBaru: Kasus; sesi: string };

/** Identitas sebuah peristiwa: satu sesi tidak pernah memakai `urut` yang sama dua kali. */
function kunciPeristiwa(p: Peristiwa): string {
  return `${p.sesi}#${String(p.urut)}`;
}

export function awalBungkus(kasus: Kasus, sesi: string): Bungkus {
  return {
    kasus,
    keadaan: keadaanAwal({
      sesi,
      kasus_id: kasus.kasus_id,
      urutanSoal: urutanSoal(kasus),
      kunciBenar: kunciBenar(kasus),
      kartuSoal: petaKartu(kasus),
    }),
    antre: [],
  };
}

export function reduksi(bungkus: Bungkus, pesan: Pesan): Bungkus {
  if ('bersihkan' in pesan) {
    /*
     * Dibuang menurut IDENTITAS (sesi + urut), bukan menurut jumlah (F-1).
     *
     * Versi lama membuang `n` peristiwa terdepan. Itu benar hanya kalau setiap
     * `bersihkan` diterapkan pada antrean yang sama dengan yang diserahkan —
     * dan React tidak menjanjikannya: pembaruan dari efek (lajur bawaan)
     * dilewati ketika pembaruan dari klik (lajur sinkron) diproses lebih dulu,
     * lalu semuanya diterapkan ulang menurut urutan masuknya. Dua pembersih
     * yang menghitung dari antrean berbeda lalu membuang satu peristiwa lebih
     * banyak — terukur di e2e: `mulai` kasus kedua hilang, `layar_masuk`-nya
     * tiba. Sesi tanpa `mulai` tidak masuk penyebut mana pun di ringkasan.
     *
     * Membuang menurut identitas tidak bisa membuang yang belum diserahkan.
     * Yang diserahkan dua kali tidak berbahaya: `saringYangBaru` di
     * `kirim.ts` menolak `(sesi, urut)` yang sudah pernah lewat.
     */
    const diserahkan = new Set(pesan.bersihkan.map(kunciPeristiwa));
    const antre = bungkus.antre.filter((p) => !diserahkan.has(kunciPeristiwa(p)));
    return antre.length === bungkus.antre.length ? bungkus : { ...bungkus, antre };
  }
  if ('kasusBaru' in pesan) {
    /*
     * Antrean lama IKUT, dan itu bukan kelalaian.
     *
     * `minat_kasus_lain` lahir dari sesi yang baru saja ditinggalkan, dan
     * belum tentu sudah diserahkan ke `kirim.ts` ketika kasusnya berganti —
     * keduanya terjadi di dalam satu penangan ketukan. Membuang antrean di
     * sini akan menghapus satu-satunya angka yang mengukur "berapa orang mau
     * kasus lain", tepat pada gerakan yang melahirkannya. Peristiwa itu tetap
     * membawa sesi dan kasus_id asalnya, karena memang di sanalah ia terjadi.
     */
    return { ...awalBungkus(pesan.kasusBaru, pesan.sesi), antre: bungkus.antre };
  }
  const hasil = langkah(bungkus.keadaan, pesan.aksi, pesan.waktu);
  if (hasil.keadaan === bungkus.keadaan && hasil.peristiwa.length === 0) return bungkus;
  return {
    kasus: bungkus.kasus,
    keadaan: hasil.keadaan,
    antre: [...bungkus.antre, ...hasil.peristiwa],
  };
}
