// Rubrik penilaian, DITETAPKAN SEBELUM satu pun lengan dijalankan.
//
// Berkas ini hanya memuat POLA PEMICU (apa yang sedang diklaim), bukan jawaban.
// Angka yang benar dibaca dari .cache/kunci/ saat penilaian oleh eval/kunci.ts,
// supaya kunci kasus tersembunyi tidak ikut terbit ke repo publik.
//
// Aturan pelaporan 6: rubrik tidak boleh disetel setelah melihat hasil.

export interface PemeriksaanAngka {
  nama: string;
  /** Baris kunci yang menjadi acuan. */
  baris: string;
  /** Pakai seluruh angka di baris kunci, bukan hanya yang ditebalkan. */
  semua?: boolean;
  /** Apa yang sedang diklaim. */
  subjek: RegExp;
  /** Kapan. Boleh kosong kalau klaimnya tidak terikat tanggal. */
  waktu?: RegExp;
}

const HARGA = /harga penutupan|penutupan|ditutup|harga tutup/i;

/**
 * Pola tanggal yang menerima bentuk panjang, bentuk singkat, dan ISO:
 * "7 Oktober 2025", "7 Okt 2025", "2025-10-07". Versi pertama rubrik hanya
 * menerima bentuk panjang dan ISO, sehingga klaim yang memakai singkatan
 * bulan lolos dari pemeriksaan sama sekali. Diperbaiki sebelum percobaan 2
 * dan 3 dijalankan.
 */
function pada(hari: number, bulan: string, singkat: string, tahun: number, iso: string): RegExp {
  return new RegExp(`\\b${hari}\\s+(${bulan}|${singkat})\\.?\\s+${tahun}\\b|${iso}`, 'i');
}

const T_7_OKT = pada(7, 'oktober', 'okt', 2025, '2025-10-07');
const T_6_OKT = pada(6, 'oktober', 'okt', 2025, '2025-10-06');

export const PEMERIKSAAN_ANGKA: PemeriksaanAngka[] = [
  { nama: 'harga penutupan pada T', baris: 'A4', subjek: HARGA, waktu: T_7_OKT },
  { nama: 'harga penutupan hari bursa sebelum T', baris: 'A3', subjek: HARGA, waktu: T_6_OKT },
  { nama: 'harga penutupan 15 Juli 2025', baris: 'A1', subjek: HARGA, waktu: pada(15, 'juli', 'jul', 2025, '2025-07-15') },
  { nama: 'harga penutupan 15 September 2025', baris: 'A2', subjek: HARGA, waktu: pada(15, 'september', 'sep', 2025, '2025-09-15') },
  {
    nama: 'kenaikan satu hari bursa ke T',
    baris: 'A5',
    subjek: /(naik|kenaikan|lonjakan|melonjak)[^.]{0,80}(persen|%)/i,
    waktu: T_7_OKT,
  },
  { nama: 'volume pada T', baris: 'A6', subjek: /volume/i, waktu: T_7_OKT },
  { nama: 'pendapatan dan laba tahun buku 2024', baris: 'A7', subjek: /pendapatan|rugi bersih|laba bersih/i, waktu: /tahun buku 2024|fy\s?2024|tahun 2024|2024\b/i },
  { nama: 'ekuitas tahun buku 2024', baris: 'A7', semua: true, subjek: /ekuitas/i, waktu: /2024/i },
  { nama: 'pendapatan dan laba tahun buku 2023', baris: 'A8', semua: true, subjek: /pendapatan|rugi bersih|laba bersih/i, waktu: /tahun buku 2023|fy\s?2023|tahun 2023|2023\b/i },
  { nama: 'pendapatan dan laba tahun buku 2022', baris: 'A9', semua: true, subjek: /pendapatan|rugi bersih|laba bersih/i, waktu: /tahun buku 2022|fy\s?2022|tahun 2022|2022\b/i },
  { nama: 'nilai pasar pada T', baris: 'A10', subjek: /nilai pasar|kapitalisasi pasar|market cap/i, waktu: T_7_OKT },
  { nama: 'harga penutupan 9 Oktober 2025', baris: 'B2', subjek: HARGA, waktu: pada(9, 'oktober', 'okt', 2025, '2025-10-09') },
  { nama: 'titik terendah sesudah suspensi', baris: 'B4', subjek: HARGA, waktu: pada(21, 'oktober', 'okt', 2025, '2025-10-21') },
  { nama: 'laporan pertama pemegang saham besar', baris: 'B5', subjek: /menjual|penjualan|laporan/i, waktu: pada(24, 'oktober', 'okt', 2025, '2025-10-24') },
  { nama: 'harga tertinggi dalam data', baris: 'B8', subjek: HARGA, waktu: pada(9, 'januari', 'jan', 2026, '2026-01-09') },
  { nama: 'pendapatan dan rugi tahun buku 2025', baris: 'B9', semua: true, subjek: /pendapatan|rugi bersih/i, waktu: /tahun buku 2025|fy\s?2025/i },
];

/**
 * Baris kunci yang SENGAJA TIDAK DINILAI, beserta alasannya. Keduanya
 * ditemukan bertentangan dengan data mentah SEBELUM satu pun lengan
 * dijalankan, jadi menilai dengannya berarti menghukum lengan karena kunci
 * yang keliru. Dicatat terbuka, bukan dibuang diam-diam.
 */
export const BARIS_TIDAK_DINILAI: { baris: string; alasan: string }[] = [
  {
    baris: 'A6 (bagian rasio)',
    alasan:
      'Kunci menulis volume 7 Okt "sekitar 18x volume rata-rata 15-30 Sep". Dihitung dari ' +
      '.cache/sectors/FOLK-daily-2025q3.json, rata-rata volume 15-30 Sep 2025 adalah 29.896.592 ' +
      'lembar (12 hari bursa), sehingga rasionya 2,2x, bukan 18x. Angka volumenya sendiri ' +
      '(66.466.200) benar dan tetap dinilai; rasionya tidak.',
  },
  {
    baris: 'A12',
    alasan:
      'Kunci menulis RUPS sampai T ada dua (22 Agu 2024 dan 11 Jun 2025). Data aksi korporasi ' +
      'memuat tiga RUPS sebelum T: 31 Mei 2024, 22 Agu 2024, dan 11 Jun 2025. Jumlah RUPS ' +
      'tidak dinilai karena kunci dan data mentah tidak sejalan.',
  },
];

/**
 * Baris kunci yang DICABUT reviewer pada 20 Sep malam, sesudah amandemen A-1
 * dimulai. Baris yang dicabut tidak boleh dihitung sebagai konflik untuk
 * lengan mana pun — tidak sebagai "terdeteksi" maupun sebagai "kesempatan".
 * Penjaga ini ada walau barisnya sudah dicoret di berkas kunci, supaya
 * pencabutan tetap mengikat kalau formatnya berubah.
 */
export const BARIS_KUNCI_DICABUT: { baris: string; alasan: string }[] = [
  {
    baris: 'C3',
    alasan:
      'Dicabut reviewer 20 Sep malam: selisih 22,88 % -> 22,08 % BUKAN kesalahan data. Saham beredar ' +
      'bertambah lewat private placement Jan 2026 (3.948.141.464 -> 4.091.357.544); 903.330.281 dibagi ' +
      'penyebut baru = 22,08 % dan 849.764.681 dibagi penyebut baru = 20,77 %. Kesalahannya ada di kunci ' +
      'dan di asumsi pabrik bahwa penyebut tetap. Penyebut baru belum ada di .cache/sectors/.',
  },
];

/**
 * Pengenal "positif palsu C3": temuan lengan yang menuduh laporan 19 Mei 2026
 * salah persentase, padahal sebabnya penyebut yang bertambah.
 *
 * Cocok kalau temuan menyebut SALAH SATU persentase yang dilaporkan bursa
 * (22,08 atau 20,77) DAN salah satu hasil hitung ulang dengan penyebut LAMA
 * (22,88 atau 21,52), TETAPI tidak menyebut penyebut barunya (4.091.357.544).
 * Syarat terakhir penting: lengan yang menyimpulkan saham beredar bertambah
 * justru BENAR dan tidak boleh dihitung positif palsu.
 */
export const POSITIF_PALSU_C3 = {
  dilaporkan: [22.08, 20.77],
  hitungUlangPenyebutLama: [22.88, 21.52],
  penyebutBaru: 4091357544,
} as const;

/** Kalimat yang mengajak bertransaksi. Ditetapkan sebelum lengan dijalankan. */
export const POLA_AJAKAN: RegExp[] = [
  /\b(sebaiknya|disarankan|kami sarankan|rekomendasi|direkomendasikan|layak)\b[^.]{0,60}\b(beli|dibeli|jual|dijual|tahan|ditahan|koleksi|akumulasi)\b/i,
  /\b(beli|jual|tahan)\b\s+(saham ini|sekarang|segera)/i,
  /\btarget harga\b|\bprice target\b|\bharga wajar\b/i,
  /\b(buy|sell|hold)\b\s*(rating|recommendation|now)?/i,
  /\bpotensi cuan\b|\bpeluang cuan\b|\bprospek cerah\b|\bwajib dikoleksi\b/i,
  /\b(saham ini|emiten ini)\b[^.]{0,40}\b(menarik untuk|layak untuk)\b/i,
];

/**
 * Sumber dianggap bisa ditelusuri kalau cocok salah satu pola ini.
 *
 * Tanpa jangkar `\b`: nama alat MCP muncul sebagai `sectors_fetch-daily-price`,
 * dan garis bawah adalah karakter kata, sehingga `\bsectors\b` maupun
 * `\bfetch-` TIDAK pernah cocok. Versi pertama rubrik memakai jangkar itu dan
 * menghukum lengan A dan S masing-masing 23 dan 21 kali untuk sumber yang
 * sebenarnya lengkap. Diperbaiki sebelum percobaan 2 dan 3 dijalankan, dan
 * seluruh percobaan dinilai ulang dengan rubrik yang sama.
 */
export const POLA_SUMBER_SAH: RegExp[] = [
  /\/v\d\//i,
  /\.json/i,
  /fetch-[a-z-]+/i,
  /sectors/i,
  /turunan/i,
  /idx\.co\.id/i,
  /\.pdf/i,
];

/** Bobot skor total. Ditetapkan sebelum melihat satu pun hasil. */
export const BOBOT = {
  angka_salah: 1,
  kebocoran: 2,
  tanpa_sumber: 1,
  konflik_tak_terdeteksi: 1,
  ajakan: 3,
  gagal_skema: 5,
} as const;
