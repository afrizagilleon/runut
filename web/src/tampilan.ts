/**
 * Keadaan TAMPILAN di luar permainan (M3.14): pemandu pengguna baru, soal
 * pemanasan, petunjuk, dan kalender simulasi — sebagai reducer murni.
 *
 * Kenapa bukan di `alur.ts`: reducer itu menjawab "apa yang terjadi di dalam
 * satu simulasi" dan melahirkan peristiwa untuk pengumpul yang memvalidasi
 * daftar tertutup (`server/` di luar batas M3.14). Pemandu dan petunjuk tidak
 * melahirkan peristiwa baru sama sekali — ketukannya tercatat oleh `ketuk`
 * yang sudah ada, lewat `data-uid` — jadi keadaannya tidak perlu lewat sana.
 *
 * Kenapa bukan `useState`: aturan proyek sejak M3.1 D-5 — keadaan yang hidup di
 * komponen tidak bisa dibuktikan tes mana pun (repo ini tanpa jsdom). Semua
 * keputusan "langkah mana sekarang", "kapan pemandu menutup", "kartu mana yang
 * disorot" ada di sini dan dites di `tampilan.test.ts`.
 */

/* ------------------------------------------------------------------ */
/* Pemandu (D-1)                                                      */
/* ------------------------------------------------------------------ */

/** Apa yang disorot satu langkah pemandu; nama ini juga `data-sorot` di markup. */
export type SasaranSorot = 'omongan' | 'kartu' | 'penentu' | 'pilihan';

export interface LangkahPemandu {
  sasaran: SasaranSorot;
  teks: string;
}

/**
 * Empat langkah, urutan kontrak D-1: omongan → kartu → petunjuk → pilihan.
 *
 * Langkah ketiga MENDEMONSTRASIKAN petunjuk: yang disorot adalah kartu yang
 * akan ditunjuk tombol "Minta petunjuk" (`kartu_penentu`), dengan label yang
 * sama persis — bukan pilihannya. Teksnya netral: tidak ada satu kata pun dari
 * pilihan, kunci, atau penjelasan soal mana pun (dites).
 *
 * Panjangnya dijaga tes (≤ 70 kata seluruhnya, ±30 detik baca).
 */
export const LANGKAH_PEMANDU: readonly LangkahPemandu[] = [
  {
    sasaran: 'omongan',
    teks: 'Ini omongan teman di grup. Isinya klaim yang kamu cek.',
  },
  {
    sasaran: 'kartu',
    teks: 'Buktinya ada di kartu-kartu ini: dokumen resmi dan hitungan dari datanya.',
  },
  {
    sasaran: 'penentu',
    teks:
      'Kalau bingung, tombol “Minta petunjuk” di bawah pilihan menandai kartu yang penting, ' +
      'seperti ini. Jawabannya tetap kamu yang cari.',
  },
  {
    sasaran: 'pilihan',
    teks: 'Sekarang kamu yang memutuskan: pilih jawaban yang cocok dengan kartu.',
  },
];

/** Label penanda kartu — dipakai petunjuk DAN langkah ketiga pemandu, satu kalimat. */
export const LABEL_PETUNJUK_KARTU = 'Coba cek kartu ini';

/** Tombol petunjuk di layar soal (D-2). */
export const LABEL_TOMBOL_PETUNJUK = 'Minta petunjuk';

/** Tautan kecil untuk membuka pemandu lagi (D-1). */
export const LABEL_CARA_MAIN = 'Cara main';

export const LABEL_PEMANDU_LANJUT = 'Lanjut';
export const LABEL_PEMANDU_SELESAI = 'Mulai menjawab';
export const LABEL_PEMANDU_LEWATI = 'Lewati';

/**
 * `?pemandu=` dari query string: `'1'` memaksa pemandu, `'0'` mematikannya,
 * selain itu `null` (keputusan otomatis). Nilai lain diabaikan diam-diam,
 * seperti `?kasus=` dan `?k=`.
 *
 * `0` dipakai rangkaian e2e (setiap konteks peramban uji adalah pengunjung
 * baru); `1` dipakai pemilik untuk memperlihatkan pemandu ke juri.
 */
export function kodePemandu(pencarian: string): '0' | '1' | null {
  const nilai = new URLSearchParams(pencarian).get('pemandu');
  return nilai === '0' || nilai === '1' ? nilai : null;
}

/**
 * Apakah pemandu berjalan sendiri di pemuatan ini (D-1: pengunjung baru saja).
 *
 * "Baru" = kunjungan pertama menurut nomor pengunjung (`kunjungan_ke === 1`).
 * Penyimpanan yang tidak bisa dipakai (`null`) TIDAK ditebak sebagai orang
 * baru — aturan yang sama dengan ringkasan pemilik (README, "Nomor
 * pengunjung"); pemandu tetap bisa dibuka lewat "Cara main".
 *
 * Tidak ada kunci penyimpanan baru untuk ini: orang yang melewati pemandu lalu
 * memuat ulang sudah berada di kunjungan kedua.
 */
export function pemanduOtomatis(kunjungan_ke: number | null, kode: '0' | '1' | null): boolean {
  if (kode === '0') return false;
  if (kode === '1') return true;
  return kunjungan_ke === 1;
}

/* ------------------------------------------------------------------ */
/* Keadaan dan aksi                                                   */
/* ------------------------------------------------------------------ */

export interface KeadaanPemandu {
  /** Nomor langkah yang tampil (0-based); `null` = pemandu tidak tampil. */
  langkah: number | null;
  /** Pemandu sudah pernah tampil di pemuatan ini (dan tidak berjalan sendiri lagi). */
  sudah: boolean;
}

export interface KeadaanPemanasan {
  /** Layar soal pemanasan sedang tampil. */
  aktif: boolean;
  kunci: string | null;
  dikunci: boolean;
}

export interface KeadaanTampilan {
  /** Diputuskan sekali per pemuatan (`pemanduOtomatis`). */
  otomatis: boolean;
  pemandu: KeadaanPemandu;
  pemanasan: KeadaanPemanasan;
}

export type AksiTampilan =
  /** Pemain tiba di layar tempat pemandu menempel (soal pertama atau pemanasan). */
  | { jenis: 'tiba_di_soal_pertama' }
  /** "Cara main": buka pemandu lagi dari langkah pertama. */
  | { jenis: 'buka_pemandu' }
  | { jenis: 'lanjut_pemandu' }
  | { jenis: 'lewati_pemandu' }
  /** Pemain memilih jawaban: ia sudah bermain, pemandu menyingkir. */
  | { jenis: 'pemain_memilih' }
  /** "Mulai simulasi" ditekan dan ada soal pemanasan yang disetujui. */
  | { jenis: 'mulai_pemanasan' }
  | { jenis: 'pilih_pemanasan'; kunci: string }
  | { jenis: 'kunci_pemanasan' }
  | { jenis: 'selesai_pemanasan' };

export function tampilanAwal(otomatis: boolean): KeadaanTampilan {
  return {
    otomatis,
    pemandu: { langkah: null, sudah: false },
    pemanasan: { aktif: false, kunci: null, dikunci: false },
  };
}

function tutupPemandu(k: KeadaanTampilan): KeadaanTampilan {
  return k.pemandu.langkah === null ? k : { ...k, pemandu: { langkah: null, sudah: true } };
}

export function langkahTampilan(k: KeadaanTampilan, aksi: AksiTampilan): KeadaanTampilan {
  switch (aksi.jenis) {
    case 'tiba_di_soal_pertama':
      if (!k.otomatis || k.pemandu.sudah || k.pemandu.langkah !== null) return k;
      return { ...k, pemandu: { langkah: 0, sudah: true } };
    case 'buka_pemandu':
      return { ...k, pemandu: { langkah: 0, sudah: true } };
    case 'lanjut_pemandu': {
      const kini = k.pemandu.langkah;
      if (kini === null) return k;
      if (kini + 1 >= LANGKAH_PEMANDU.length) return tutupPemandu(k);
      return { ...k, pemandu: { langkah: kini + 1, sudah: true } };
    }
    case 'lewati_pemandu':
    case 'pemain_memilih':
      return tutupPemandu(k);
    case 'mulai_pemanasan':
      if (k.pemanasan.aktif) return k;
      return { ...k, pemanasan: { aktif: true, kunci: null, dikunci: false } };
    case 'pilih_pemanasan':
      if (!k.pemanasan.aktif || k.pemanasan.dikunci) return k;
      return tutupPemandu({ ...k, pemanasan: { ...k.pemanasan, kunci: aksi.kunci } });
    case 'kunci_pemanasan':
      if (!k.pemanasan.aktif || k.pemanasan.kunci === null) return k;
      return { ...k, pemanasan: { ...k.pemanasan, dikunci: true } };
    case 'selesai_pemanasan':
      return tutupPemandu({ ...k, pemanasan: { aktif: false, kunci: null, dikunci: false } });
  }
}

/** Langkah pemandu yang tampil, atau `null`. */
export function langkahPemanduKini(k: KeadaanTampilan): LangkahPemandu | null {
  return k.pemandu.langkah === null ? null : (LANGKAH_PEMANDU[k.pemandu.langkah] ?? null);
}

/** Sasaran yang disorot pemandu sekarang, atau `null`. */
export function sorotPemandu(k: KeadaanTampilan): SasaranSorot | null {
  return langkahPemanduKini(k)?.sasaran ?? null;
}

/** "Langkah 2 dari 4". */
export function nomorLangkah(k: KeadaanTampilan): string | null {
  const n = k.pemandu.langkah;
  return n === null ? null : `${String(n + 1)} dari ${String(LANGKAH_PEMANDU.length)}`;
}

/** Langkah terakhir? Tombolnya berbunyi "Mulai menjawab", bukan "Lanjut". */
export function langkahTerakhir(k: KeadaanTampilan): boolean {
  return k.pemandu.langkah === LANGKAH_PEMANDU.length - 1;
}
