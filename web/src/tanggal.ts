/**
 * Penanda waktu beku (D-3), dibentuk dari `tanggal_t` oleh fungsi murni.
 *
 * Pemain hidup di 2026 dan kasusnya di 2025. Tanpa jangkar yang selalu terlihat,
 * "sekarang" menjadi ambigu dan seluruh gagasan waktu beku runtuh — itu temuan
 * pemilik 21 Sep. Jadi tanggalnya tidak pernah diketik tangan di teks mana pun;
 * ia selalu lahir di sini, termasuk nama harinya.
 *
 * Sengaja tanpa `toLocaleDateString`: hasil ICU berbeda antar mesin dan antar
 * peramban, sedangkan penanda ini muncul di setiap layar.
 */

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const BULAN_PENDEK = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MEI',
  'JUN',
  'JUL',
  'AGU',
  'SEP',
  'OKT',
  'NOV',
  'DES',
] as const;

export interface Penanda {
  /** "Rabu" */
  hari: string;
  /** "RABU" — untuk kaki halaman kalender dan keping. */
  hariBesar: string;
  /** "8" — angka besar di halaman kalender. */
  angka: string;
  /** "OKTOBER 2025" — pita bulan di atas halaman kalender. */
  bulanTahun: string;
  /** "8 OKT 2025" — untuk keping yang menempel di layar soal. */
  pendek: string;
  /** "8 Oktober 2025" — untuk kalimat. */
  panjang: string;
}

export class TanggalTidakSah extends Error {}

/**
 * Pecah tanggal ISO menjadi seluruh bentuk yang dipakai antarmuka.
 * Melempar kalau tanggalnya bukan ISO atau tidak ada di kalender (INV-6):
 * penanda waktu yang salah diam-diam lebih buruk daripada halaman yang gagal.
 */
export function penanda(iso: string): Penanda {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (cocok === null) {
    throw new TanggalTidakSah(`Tanggal "${iso}" bukan tanggal ISO YYYY-MM-DD.`);
  }
  const tahun = Number(cocok[1]);
  const bulan = Number(cocok[2]);
  const hari = Number(cocok[3]);

  const waktu = Date.UTC(tahun, bulan - 1, hari);
  const tanggal = new Date(waktu);
  const benar =
    tanggal.getUTCFullYear() === tahun &&
    tanggal.getUTCMonth() === bulan - 1 &&
    tanggal.getUTCDate() === hari;
  if (!benar) {
    throw new TanggalTidakSah(`Tanggal "${iso}" tidak ada di kalender.`);
  }

  const namaHari = HARI[tanggal.getUTCDay()] ?? '';
  const namaBulan = BULAN[bulan - 1] ?? '';
  const bulanPendek = BULAN_PENDEK[bulan - 1] ?? '';

  return {
    hari: namaHari,
    hariBesar: namaHari.toUpperCase(),
    angka: String(hari),
    bulanTahun: `${namaBulan.toUpperCase()} ${String(tahun)}`,
    pendek: `${String(hari)} ${bulanPendek} ${String(tahun)}`,
    panjang: `${String(hari)} ${namaBulan} ${String(tahun)}`,
  };
}

/**
 * Tanggal ISO untuk "hari ini" menurut jam perangkat (A1-T6).
 *
 * Waktunya disuntikkan, bukan dibaca di dalam sini, supaya bisa dites dengan
 * waktu buatan. Memakai bagian **lokal**, bukan UTC: pemain di Jakarta yang
 * membuka pukul 06.00 harus melihat tanggal hari itu, bukan kemarin.
 */
export function hariIniIso(sekarang: Date): string {
  const tahun = String(sekarang.getFullYear()).padStart(4, '0');
  const bulan = String(sekarang.getMonth() + 1).padStart(2, '0');
  const hari = String(sekarang.getDate()).padStart(2, '0');
  return `${tahun}-${bulan}-${hari}`;
}
