/**
 * Kata-kata Jejak verifikasi (M3.6 D-5).
 *
 * Dua hal yang salah sampai M3.5, keduanya ditemukan pemilik di ponselnya:
 *
 * 1. Kalimatnya berbunyi *"rantai laporan kepemilikan diperiksa…"*. "Rantai"
 *    adalah istilah kami untuk urutan saldo antar-laporan, tetapi yang terdengar
 *    pemain adalah "rantai komando". Kata itu dibuang dari kalimat ini.
 * 2. Angkanya ditulis mati: *"sepuluh aturan"*. Mesin verifikasi V2 punya 31
 *    aturan, sedangkan kasus DADA yang hidup masih dibangun V1 dengan 10 —
 *    jadi angka yang diketik tangan sudah pasti berbohong ke salah satu arah
 *    begitu mesinnya berganti. Sekarang ia dibaca dari berkas kasusnya sendiri.
 *
 * Semuanya fungsi murni dan dites tanpa peramban; komponen hanya menempatkannya.
 */
import type { Kasus } from '../../factory/skema/tipe.ts';

/**
 * Berapa aturan verifikasi yang dijalankan atas kasus ini.
 *
 * `kasus.pemeriksaan` adalah daftar aturan yang **mesinnya jalankan untuk kasus
 * ini** — satu baris per aturan, lengkap dengan apakah ia bisa dijalankan dan
 * kenapa tidak. Panjang daftar itulah angka yang benar: bukan 31 (mesin V2,
 * yang tidak membangun kasus ini), dan bukan angka yang diketik tangan.
 *
 * Yang **tidak** dipakai di sini: `filter(p => p.dijalankan).length`. Satu
 * aturan DADA (R8, tanda repo) tidak bisa dijalankan karena datanya tidak ada,
 * dan itu dikatakan apa adanya di kaki lipatan — "Aturan yang tidak bisa
 * dijalankan atas kasus ini: 1 dari 10". Kalau kalimat pembukanya memakai 9 dan
 * kakinya memakai 10, pembacanya harus menebak mana yang benar; sekarang
 * keduanya memakai penyebut yang sama dan pengecualiannya dieja.
 */
export function jumlahPemeriksaan(kasus: Kasus): number {
  return kasus.pemeriksaan.length;
}

/**
 * Berapa fakta yang gugur sebagai kartu karena pemeriksaan ini (M4 D-2).
 *
 * Fakta berstatus `KONFLIK` atau `TIDAK_LENGKAP` tidak boleh menjadi kartu dan
 * tidak boleh menjadi dasar jawaban; validator menolak kasus yang mencoba.
 * Angkanya dibaca dari berkas kasusnya sendiri, seperti `jumlahPemeriksaan`.
 */
export function faktaGugur(kasus: Kasus): number {
  return kasus.fakta.filter((f) => f.status !== 'TERVERIFIKASI').length;
}

/**
 * Kalimat pembuka Jejak verifikasi.
 *
 * "Beginilah soal ini dilahirkan" bukan hiasan: bagian ini menjawab pertanyaan
 * yang tidak pernah diucapkan pemain — dari mana kartu-kartu itu datang, dan
 * kenapa ada dokumen resmi yang tidak menjadi kartu.
 *
 * **Ekornya ikut data sejak M4.** Versi M3.6 menutup dengan "itulah sebabnya
 * dua laporan disingkirkan dari kartu" — dua, diketik tangan, benar untuk DADA
 * dan **bohong untuk kasus yang tidak menggugurkan satu pun**. Itu persis
 * kelas kesalahan yang M3.6 D-5 sendiri perbaiki di bagian depan kalimat ini;
 * ia hanya belum sampai ke belakangnya, karena waktu itu kasusnya baru satu.
 */
export function kalimatJejak(kasus: Kasus): string {
  const pembuka =
    `Beginilah soal ini dilahirkan: sebelum kartu dibuat, laporan-laporan pemilik saham ` +
    `diperiksa dengan ${String(jumlahPemeriksaan(kasus))} pemeriksaan otomatis — apakah satu ` +
    `sama lain nyambung, dan cocok dengan harga di pasar.`;
  const temuan = kasus.temuan.length;
  if (temuan === 0) return `${pembuka} Tidak ada satu pun yang tidak cocok.`;
  const gugur = faktaGugur(kasus);
  if (gugur === 0) {
    return (
      `${pembuka} Hasilnya ${String(temuan)} hal yang tidak cocok, tetapi tidak satu pun ` +
      `membuat sebuah angka gugur sebagai kartu.`
    );
  }
  return (
    `${pembuka} Hasilnya ${String(temuan)} hal yang tidak cocok, dan ${String(gugur)} angka ` +
    `yang karena itu tidak boleh menjadi kartu.`
  );
}

/** Pintu lipatan: menyebut angka yang sama dengan kalimat di atasnya. */
export function ringkasanJejak(kasus: Kasus): string {
  return `Lihat ${String(jumlahPemeriksaan(kasus))} pemeriksaan dan hasilnya`;
}
