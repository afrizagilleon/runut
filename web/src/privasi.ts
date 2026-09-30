/**
 * Apa yang dicatat, dikatakan (D-11; diperbarui M3.8 D-9).
 *
 * M3.8 menambah yang dicatat: jenis perangkat dan pengaturan tampilan secara
 * garis besar (os, peramban di dalam aplikasi, mode gelap, jenis layar
 * sentuh), jam setempat, asal tautan (nama situsnya saja), kapan halaman
 * ditinggalkan (`tampak`), dan kesalahan teknis (`galat`, disamarkan). Kalimat
 * lama hanya menyebut ketukan dan gulir — tidak lagi jujur, jadi ia diganti.
 * Batasnya ikut dikatakan dengan bahasa awam: tanpa alamat IP, tanpa
 * identitas.
 *
 * Kalimat ini **menggantikan** kalimat privasi di `docs/kasus-dada-v3.md`, yang
 * ditulis sebelum nomor pengunjung (D-13) diputuskan. Ia tinggal di berkasnya
 * sendiri, bukan di dalam `Aplikasi.tsx`, supaya tes bisa menunjuk teks yang
 * sama persis dengan yang dirender — bukan salinan kedua yang bisa berbeda
 * diam-diam, dan bukan parafrase yang melunak satu kata.
 *
 * Janji lama tentang kue peramban sengaja **tidak ada** di sini maupun di layar
 * mana pun. Nomor pengunjung memang bukan benda itu, tetapi ia tetap sesuatu
 * yang disimpan di browser pemain; janji yang terdengar lebih bersih daripada
 * kenyataannya tidak boleh ada.
 */
export const KALIMAT_PRIVASI =
  'Kami mencatat apa yang diketuk, seberapa jauh layar digulir, kapan halaman ' +
  'ditinggalkan, dan kesalahan teknisnya; juga jenis perangkat dan pengaturan tampilan ' +
  'secara garis besar, jam setempat, dan asal tautan — tanpa alamat IP dan tanpa ' +
  'identitas. Kami menyimpan satu nomor acak di browsermu supaya tahu kalau kamu ' +
  'kembali, dan daftar simulasi yang sudah kamu mainkan. Bukan nama, bukan akun; tidak dibagikan ke siapa pun. Teks yang kamu ' +
  'ketik tidak dicatat, kecuali kotak masukan ini.';

/** Kalimat layar terima kasih (D-11). Dua janji, dan keduanya benar. */
export const KALIMAT_TERIMA_KASIH = 'Jawabanmu tercatat tanpa nama dan tanpa akun.';
