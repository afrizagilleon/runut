/**
 * Apa yang dicatat, dikatakan (D-11).
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
  'Kami mencatat apa yang diketuk dan seberapa jauh layar digulir, dan menyimpan ' +
  'satu nomor acak di browsermu supaya tahu kalau kamu kembali. Bukan nama, bukan ' +
  'akun, bukan alamat IP; tidak dibagikan ke siapa pun. Teks yang kamu ketik tidak ' +
  'dicatat, kecuali kotak masukan ini.';

/** Kalimat layar terima kasih (D-11). Dua janji, dan keduanya benar. */
export const KALIMAT_TERIMA_KASIH = 'Jawabanmu tercatat tanpa nama dan tanpa akun.';
