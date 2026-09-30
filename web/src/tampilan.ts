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
export type SasaranSorot = 'omongan' | 'kartu' | 'pilihan' | 'petunjuk';

export interface LangkahPemandu {
  sasaran: SasaranSorot;
  teks: string;
}

/**
 * Empat langkah: omongan → kartu → pilihan → petunjuk.
 *
 * Urutan kontrak D-1 menaruh petunjuk sebelum pilihan; putaran kritik D-6
 * (`eval/m314/kritik/kritik-desain-r0.txt`, putusan B) memindahkannya ke
 * akhir, dan 3/5 penguji D-5 mendukung alasannya: tombol "Minta petunjuk"
 * berada DI BAWAH pilihan, jadi langkah petunjuk sebelum pilihan menunjuk
 * tombol yang belum terlihat. Di urutan baru, langkah terakhir menyorot tombol
 * yang sebenarnya, dan tombol utamanya ("Tunjukkan") menjalankan petunjuk itu
 * sekali (`tunjukkan_petunjuk`): layar menggulir ke kartu penentu, bukan ke
 * pilihan — demonstrasinya sekaligus bukti bahwa petunjuk tidak membocorkan
 * jawaban. Teksnya netral: tidak ada potongan pilihan, kunci, atau penjelasan
 * soal mana pun (dites).
 *
 * Panjangnya dijaga tes (≤ 70 kata seluruhnya; sekarang ±30 kata).
 */
export const LANGKAH_PEMANDU: readonly LangkahPemandu[] = [
  { sasaran: 'omongan', teks: 'Ini omongan teman. Betul atau keliru?' },
  { sasaran: 'kartu', teks: 'Buktinya ada di kartu-kartu ini.' },
  { sasaran: 'pilihan', teks: 'Pilih yang cocok dengan kartu.' },
  { sasaran: 'petunjuk', teks: 'Buntu? Tombol ini menandai kartu yang perlu dicek, bukan jawabannya.' },
];

/** Label penanda kartu — dipakai petunjuk (juga saat didemonstrasikan pemandu), satu kalimat. */
export const LABEL_PETUNJUK_KARTU = 'Coba cek kartu ini';

/** Tombol petunjuk di layar soal (D-2). */
export const LABEL_TOMBOL_PETUNJUK = 'Minta petunjuk';

/** Tautan kecil untuk membuka pemandu lagi (D-1). */
export const LABEL_CARA_MAIN = 'Cara main';

export const LABEL_PEMANDU_LANJUT = 'Lanjut';
/** Tombol utama langkah terakhir: menjalankan petunjuk sekali (demonstrasi), lalu pemandu selesai. */
export const LABEL_PEMANDU_SELESAI = 'Tunjukkan';
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

/**
 * Petunjuk yang sedang menandai kartu (D-2): soal mana, dan tekanan ke berapa
 * (angka yang naik tiap tekanan, supaya tekanan kedua menggulir lagi).
 */
export interface KeadaanPetunjuk {
  soal_id: string;
  ke: number;
}

export interface KeadaanTampilan {
  /** Diputuskan sekali per pemuatan (`pemanduOtomatis`). */
  otomatis: boolean;
  pemandu: KeadaanPemandu;
  pemanasan: KeadaanPemanasan;
  petunjuk: KeadaanPetunjuk | null;
  /**
   * Kalender simulasi (D-3). `selesai` dibaca dari penyimpanan SEKALI saat
   * memuat, lalu hidup di sini: simulasi yang diselesaikan di pemuatan ini
   * tetap ditandai walau penyimpanannya mati.
   */
  kalender: { terbuka: boolean; selesai: readonly string[]; kembali: boolean };
}

export type AksiTampilan =
  /** Pemain tiba di layar tempat pemandu menempel (soal pertama atau pemanasan). */
  | { jenis: 'tiba_di_soal_pertama' }
  /** "Cara main": buka pemandu lagi dari langkah pertama. */
  | { jenis: 'buka_pemandu' }
  | { jenis: 'lanjut_pemandu' }
  /** Langkah terakhir: jalankan petunjuk di soal ini sekali, lalu pemandu selesai. */
  | { jenis: 'tunjukkan_petunjuk'; soal_id: string }
  | { jenis: 'lewati_pemandu' }
  /** Pemain memilih jawaban: ia sudah bermain, pemandu menyingkir. */
  | { jenis: 'pemain_memilih' }
  /** "Mulai simulasi" ditekan dan ada soal pemanasan yang disetujui. */
  | { jenis: 'mulai_pemanasan' }
  | { jenis: 'pilih_pemanasan'; kunci: string }
  | { jenis: 'kunci_pemanasan' }
  | { jenis: 'selesai_pemanasan' }
  /** "Minta petunjuk" di soal ini (D-2). */
  | { jenis: 'minta_petunjuk'; soal_id: string }
  /** Layar berganti: tanda petunjuk tidak ikut ke layar lain. */
  | { jenis: 'tutup_petunjuk' }
  /** Ketiga soal dikunci dan pembukaan tercapai: simulasi ini selesai. */
  | { jenis: 'simulasi_selesai'; kasus_id: string }
  | { jenis: 'buka_kalender' }
  | { jenis: 'tutup_kalender' };

export interface BekalTampilan {
  /** Daftar selesai dari penyimpanan (`bacaSelesai`). */
  selesai?: readonly string[];
  /** Pengunjung yang kembali (kunjungan kedua dan seterusnya). */
  kembali?: boolean;
}

export function tampilanAwal(otomatis: boolean, bekal: BekalTampilan = {}): KeadaanTampilan {
  return {
    kalender: { terbuka: false, selesai: [...(bekal.selesai ?? [])], kembali: bekal.kembali ?? false },
    otomatis,
    pemandu: { langkah: null, sudah: false },
    pemanasan: { aktif: false, kunci: null, dikunci: false },
    petunjuk: null,
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
    case 'tunjukkan_petunjuk':
      return {
        ...tutupPemandu(k),
        petunjuk: { soal_id: aksi.soal_id, ke: (k.petunjuk?.ke ?? 0) + 1 },
      };
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
      return tutupPemandu({
        ...k,
        pemanasan: { aktif: false, kunci: null, dikunci: false },
        petunjuk: null,
      });
    case 'minta_petunjuk':
      /*
       * M3.16: di langkah terakhir tombol petunjuk berada DI DALAM lubang
       * sorotan dan bisa diketuk langsung. Pemandunya ikut selesai — kalau
       * tidak, petunjuk menggulir ke kartu penentu yang masih teredup lapisan.
       * Tanpa pemandu, `tutupPemandu` tidak mengubah apa pun.
       */
      return { ...tutupPemandu(k), petunjuk: { soal_id: aksi.soal_id, ke: (k.petunjuk?.ke ?? 0) + 1 } };
    case 'tutup_petunjuk':
      return k.petunjuk === null ? k : { ...k, petunjuk: null };
    case 'simulasi_selesai':
      if (k.kalender.selesai.includes(aksi.kasus_id)) return k;
      return { ...k, kalender: { ...k.kalender, selesai: [...k.kalender.selesai, aksi.kasus_id] } };
    case 'buka_kalender':
      return k.kalender.terbuka ? k : { ...tutupPemandu(k), kalender: { ...k.kalender, terbuka: true } };
    case 'tutup_kalender':
      return k.kalender.terbuka ? { ...k, kalender: { ...k.kalender, terbuka: false } } : k;
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

/* ------------------------------------------------------------------ */
/* Petunjuk (D-2)                                                     */
/* ------------------------------------------------------------------ */

/**
 * Kartu yang ditunjuk petunjuk sebuah soal: `kartu_penentu`, dan HANYA itu —
 * tidak pernah pilihan jawaban, dan tidak pernah teks kartunya sendiri (yang
 * tampil hanya cincin dan label netral di atas kartu yang sudah ada di layar,
 * jadi pemain tetap harus membacanya).
 *
 * Disaring terhadap `kartu` soal itu: penanda tidak boleh jatuh pada lembar
 * yang tidak ada di layar.
 */
export function kartuPetunjuk(soal: { kartu: readonly string[]; kartu_penentu: readonly string[] }): string[] {
  return soal.kartu_penentu.filter((id) => soal.kartu.includes(id));
}

/** Apakah petunjuk sedang menandai kartu di soal ini. */
export function petunjukAktif(k: KeadaanTampilan, soal_id: string): boolean {
  return k.petunjuk?.soal_id === soal_id;
}

/** Kartu mana yang ditandai petunjuk di soal ini sekarang (juga saat didemonstrasikan pemandu). */
export function kartuDitandai(
  k: KeadaanTampilan | undefined,
  soal: { soal_id: string; kartu: readonly string[]; kartu_penentu: readonly string[] },
  dikunci: boolean,
): Set<string> {
  if (k === undefined || dikunci || !petunjukAktif(k, soal.soal_id)) return new Set();
  return new Set(kartuPetunjuk(soal));
}

/* ------------------------------------------------------------------ */
/* Kalender simulasi (D-3)                                            */
/* ------------------------------------------------------------------ */

/**
 * Tautan kecil "Kalender simulasi" di layar pertama: hanya untuk pengunjung
 * yang kembali atau yang sudah menyelesaikan satu simulasi. Pengunjung baru
 * mendapat layar pertama yang sama persis seperti sebelum M3.14 — tanpa
 * langkah tambahan sebelum "Mulai simulasi" (kontrak D-3).
 */
export function tautanKalenderDiPembuka(k: KeadaanTampilan): boolean {
  return k.kalender.kembali || k.kalender.selesai.length > 0;
}

export const LABEL_TAUTAN_KALENDER = 'Pilih dari kalender simulasi';

/**
 * Simulasi yang ditawarkan tautan "Simulasi baru: …" di layar pertama (kritik
 * D-6 butir 9): hanya bila simulasi yang sedang dibuka SUDAH selesai (orang
 * itu akan mengulang) dan masih ada simulasi lain yang belum selesai — yang
 * pertama dalam urutan daftar. Selain itu `null`.
 */
export function simulasiBaru<T extends { kasus_id: string }>(
  daftar: readonly T[],
  kini: string,
  selesai: readonly string[],
): T | null {
  if (!selesai.includes(kini)) return null;
  return daftar.find((k) => k.kasus_id !== kini && !selesai.includes(k.kasus_id)) ?? null;
}
/** Di layar terima kasih: satu baris *meta*, bukan judul kedua (kritik D-6 butir 6). */
export const PENGANTAR_KALENDER_AKHIR = 'Hari bursa lain, ketuk untuk main:';
export const JUDUL_KALENDER = 'Kalender simulasi';
export const PENGANTAR_KALENDER = 'Tiap lingkaran = satu hari bursa nyata. Penuh = sudah kamu selesaikan.';
