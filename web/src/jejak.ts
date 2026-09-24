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
 * Berapa aturan verifikasi yang BENAR-BENAR DIJALANKAN atas kasus ini.
 *
 * `kasus.pemeriksaan` mendaftar setiap aturan mesin untuk kasus ini, lengkap
 * dengan apakah ia dijalankan dan kenapa tidak (`alasan_lewat`). Yang dihitung
 * hanya `dijalankan === true` (M3.11 amandemen A-1, D-9; diputuskan reviewer):
 * DADA mendaftar 10 dan menjalankan 9 (R8, tanda repo, datanya tidak ada), ULTJ
 * mendaftar 35 dan menjalankan 28. Sampai M3.11 T-08 fungsi ini mengembalikan
 * panjang daftar, sehingga "diperiksa 35 pemeriksaan otomatis" mengaku lebih
 * dari yang terjadi — untuk produk yang intinya "cek angkanya", itu tidak boleh.
 *
 * Satu fungsi untuk ketiga tempat yang menyebut angka ini: kalimat jejak di
 * bawah "Waktu berjalan lagi", kalimat pembuka bagian jejak, dan pintu
 * lipatannya. Yang dilewati tetap dieja apa adanya di kaki lipatan — "Aturan
 * yang tidak bisa dijalankan atas kasus ini: 1 dari 10" — yang memang
 * menyebut daftar lengkapnya.
 */
export function jumlahPemeriksaan(kasus: Kasus): number {
  return kasus.pemeriksaan.filter((p) => p.dijalankan === true).length;
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

/**
 * Kalimat jejak yang NAIK ke bawah judul "Waktu berjalan lagi" (M3.11 D-3,
 * kritik K-9; kata-kata diputuskan reviewer 24 Sep atas penilaian kritikus).
 *
 * Bukti kedalaman teknis terkuat — berapa pemeriksaan otomatis, berapa angka
 * yang dibuang — sampai M3.10 hanya ada di dasar layar pembukaan. Angkanya
 * dari SUMBER YANG SAMA dengan bagian jejak di sana (`jumlahPemeriksaan`,
 * `faktaGugur`): "angka dibuang" di sini adalah "angka yang karena itu tidak
 * boleh menjadi kartu" di sana. Tidak ada angka yang diketik tangan: DADA
 * 9/43, ULTJ 28/0 (hanya aturan yang dijalankan — amandemen A-1), dan
 * kalimat yang menulis "9 … 43" tetap akan berbohong tentang ULTJ.
 */
export function kalimatJejakNaik(kasus: Kasus): string {
  const n = jumlahPemeriksaan(kasus);
  const m = faktaGugur(kasus);
  const dibuang = m === 0 ? 'tidak ada angka yang dibuang' : `${String(m)} angka dibuang`;
  return `Sebelum jadi kartu, laporan kasus ini diperiksa ${String(n)} pemeriksaan otomatis; ${dibuang}.`;
}

/** Tautan sesudah kalimat itu; "›" ditambahkan komponen sebagai isyarat mata. */
export const TAUTAN_JEJAK_NAIK = 'Lihat pemeriksaannya';
