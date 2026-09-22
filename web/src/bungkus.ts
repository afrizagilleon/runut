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
  | { bersihkan: number }
  /**
   * Kasus lain dibuka: **sesi baru, pengunjung sama** (D-4).
   *
   * Id sesinya datang dari pemanggil, bukan dibuat di sini, supaya berkas ini
   * tetap murni — sama seperti waktu yang selalu disuntikkan ke `langkah()`.
   */
  | { kasusBaru: Kasus; sesi: string };

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
    return { ...bungkus, antre: bungkus.antre.slice(pesan.bersihkan) };
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
