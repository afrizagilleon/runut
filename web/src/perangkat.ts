/**
 * Keterangan KASAR tentang perangkat dan asal kunjungan (M3.8 D-1).
 *
 * Pertanyaan yang tidak bisa dijawab data 23 Sep: dari 13 orang asing, nol yang
 * selesai, dan kita tidak tahu apa pun tentang mereka — ponsel apa, dibuka di
 * dalam aplikasi Threads atau di peramban, mode gelap atau terang, jam berapa di
 * tempatnya, koneksinya lambat atau tidak. Berkas ini menjawabnya dengan
 * **kategori**, bukan dengan bahan mentahnya.
 *
 * Tiga janji yang dijaga bentuk berkas ini:
 *
 * - **Murni.** Tidak satu baris pun menyentuh `window`, `navigator`, atau
 *   `document`. Pemanggil (di `Aplikasi.tsx`) menyerahkan string dan fungsi;
 *   berkas ini hanya memutuskan kategorinya — dan karena itu bisa dites dengan
 *   UA sungguhan tanpa peramban.
 * - **UA tidak pernah keluar.** String User-Agent masuk sebagai argumen dan yang
 *   keluar hanya `os` + `peramban_dalam`, dua enum. INV M3.8 D-9 membuktikannya
 *   dari antrean kiriman e2e: nol `Mozilla`, nol `AppleWebKit`, nol `://`.
 * - **Perujuk hanya nama host.** `document.referrer` bisa memuat path dan query
 *   (Threads dan Instagram menaruh alamat tujuan dan kode pelacaknya di sana).
 *   Yang dibaca hanya host-nya, dipetakan ke daftar tertutup; path dan query
 *   tidak pernah disimpan, bahkan sementara.
 *
 * Batas yang disengaja: tidak ada lebar/tinggi layar fisik (`screen.*`), tidak
 * ada daftar huruf atau pemasang, tidak ada kanvas. Tinggi jendela dan rasio
 * piksel ikut karena keduanya menjawab pertanyaan desain ("apakah opsi pertama
 * terlihat tanpa menggulir") — dan rasio dibulatkan satu desimal.
 */

export const NILAI_OS = ['android', 'ios', 'windows', 'mac', 'linux', 'lain'] as const;
export type Os = (typeof NILAI_OS)[number];

export const NILAI_PERAMBAN_DALAM = [
  'threads',
  'instagram',
  'facebook',
  'whatsapp',
  'tiktok',
  'line',
  'telegram',
  'x',
  'lain',
  'tidak',
] as const;
export type PerambanDalam = (typeof NILAI_PERAMBAN_DALAM)[number];

export const NILAI_PERUJUK = [
  'threads',
  'instagram',
  'facebook',
  'whatsapp',
  'google',
  'x',
  'tiktok',
  'telegram',
  'langsung',
  'lain',
] as const;
export type Perujuk = (typeof NILAI_PERUJUK)[number];

export const NILAI_BAHASA = ['id', 'en', 'lain'] as const;
export type Bahasa = (typeof NILAI_BAHASA)[number];

export const NILAI_KONEKSI = ['4g', '3g', '2g', 'lambat', 'tidak-tahu'] as const;
export type Koneksi = (typeof NILAI_KONEKSI)[number];

export const NILAI_SKEMA_WARNA = ['terang', 'gelap'] as const;
export type SkemaWarna = (typeof NILAI_SKEMA_WARNA)[number];

export const NILAI_PENUNJUK = ['kasar', 'halus', 'tidak'] as const;
export type Penunjuk = (typeof NILAI_PENUNJUK)[number];

/** Batas `zona_menit`: UTC−12 sampai UTC+14, dalam menit ke timur. */
export const ZONA_MIN = -720;
export const ZONA_MAKS = 840;

/**
 * Lima belas medan, dalam urutan yang dikirim.
 *
 * Semuanya **selalu ada** di peristiwa `mulai`; `null` berarti keterangan itu
 * memang tidak tersedia di peramban ini — bukan "hilang di jalan". Pola yang
 * sama dengan `penanda`/`pengunjung` sejak M3.2.
 */
export interface Perangkat {
  tinggi_layar: number | null;
  rasio_piksel: number | null;
  skema_warna: SkemaWarna | null;
  penunjuk: Penunjuk | null;
  os: Os | null;
  peramban_dalam: PerambanDalam | null;
  perujuk: Perujuk | null;
  bahasa: Bahasa | null;
  jam_lokal: number | null;
  hari_lokal: number | null;
  zona_menit: number | null;
  koneksi: Koneksi | null;
  hemat_data: boolean | null;
  gerak_dikurangi: boolean | null;
  mandiri: boolean | null;
}

export const MEDAN_PERANGKAT = [
  'tinggi_layar',
  'rasio_piksel',
  'skema_warna',
  'penunjuk',
  'os',
  'peramban_dalam',
  'perujuk',
  'bahasa',
  'jam_lokal',
  'hari_lokal',
  'zona_menit',
  'koneksi',
  'hemat_data',
  'gerak_dikurangi',
  'mandiri',
] as const satisfies ReadonlyArray<keyof Perangkat>;

export const PERANGKAT_KOSONG: Perangkat = {
  tinggi_layar: null,
  rasio_piksel: null,
  skema_warna: null,
  penunjuk: null,
  os: null,
  peramban_dalam: null,
  perujuk: null,
  bahasa: null,
  jam_lokal: null,
  hari_lokal: null,
  zona_menit: null,
  koneksi: null,
  hemat_data: null,
  gerak_dikurangi: null,
  mandiri: null,
};

/**
 * Sistem operasi dari UA.
 *
 * Urutannya penting: UA Android memuat "Linux", dan UA iPhone memuat "like Mac
 * OS X". `titikSentuh` (`navigator.maxTouchPoints`) memisahkan iPad — yang
 * sejak iPadOS 13 mengaku Macintosh — dari Mac sungguhan; Mac tidak punya layar
 * sentuh dengan lebih dari satu titik.
 *
 * ChromeOS jatuh ke `lain`: ia Linux di bawahnya, tetapi bukan yang dimaksud
 * siapa pun yang membaca tabel "linux".
 */
export function osDari(ua: string, titikSentuh: number): Os {
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Windows/.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/.test(ua)) return titikSentuh > 1 ? 'ios' : 'mac';
  if (/CrOS/.test(ua)) return 'lain';
  if (/Linux|X11/.test(ua)) return 'linux';
  return 'lain';
}

/**
 * Peramban di dalam aplikasi, dari penanda yang ditulis aplikasi itu sendiri di
 * UA-nya.
 *
 * Threads diperiksa **pertama**: UA-nya berasal dari basis kode Instagram dan
 * bisa ikut memuat penanda Instagram, sedangkan "Barcelona" (nama sandi Threads)
 * hanya ada di Threads.
 *
 * Tampilan-web tanpa nama aplikasi (`; wv)` di Android, atau iOS tanpa
 * `Safari/`) adalah `lain`: kita tahu ia BUKAN peramban biasa, dan itu sudah
 * jawaban yang berguna — "tidak" berarti peramban sungguhan.
 */
export function perambanDalamDari(ua: string): PerambanDalam {
  if (/\bBarcelona\b/.test(ua)) return 'threads';
  if (/\bInstagram\b/.test(ua)) return 'instagram';
  if (/FBAN\/|FBAV\/|FB_IAB|FBIOS|\[FB/.test(ua)) return 'facebook';
  if (/WhatsApp/i.test(ua)) return 'whatsapp';
  if (/musical_ly|BytedanceWebview|TikTok|\btrill_/i.test(ua)) return 'tiktok';
  if (/\bLine\//.test(ua)) return 'line';
  if (/Telegram/i.test(ua)) return 'telegram';
  if (/Twitter/i.test(ua)) return 'x';
  if (/Android/i.test(ua) && /; wv\)/.test(ua)) return 'lain';
  if (/iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua)) return 'lain';
  return 'tidak';
}

/** Akhiran domain → kategori. Dicocokkan per label, bukan per potongan teks. */
const PETA_PERUJUK: ReadonlyArray<[string, Perujuk]> = [
  ['threads.net', 'threads'],
  ['threads.com', 'threads'],
  ['instagram.com', 'instagram'],
  ['facebook.com', 'facebook'],
  ['fb.com', 'facebook'],
  ['fb.me', 'facebook'],
  ['whatsapp.com', 'whatsapp'],
  ['whatsapp.net', 'whatsapp'],
  ['wa.me', 'whatsapp'],
  ['t.co', 'x'],
  ['x.com', 'x'],
  ['twitter.com', 'x'],
  ['tiktok.com', 'tiktok'],
  ['t.me', 'telegram'],
  ['telegram.org', 'telegram'],
  ['telegram.me', 'telegram'],
];

function akhiranCocok(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Asal kunjungan dari **nama host** `document.referrer` saja.
 *
 * Kosong = `langsung` (diketik, dari penanda buku, atau aplikasi yang tidak
 * memberi perujuk — WhatsApp dan Telegram sering begitu, jadi `langsung` di
 * tabel bukan berarti "bukan dari grup"). Perujuk dari situs ini sendiri (muat
 * ulang) juga `langsung`. Google dikenali dari label `google` di mana pun
 * sebelum akhiran negara (`google.com`, `google.co.id`), tidak dari potongan
 * teks: `google.evil.example` bukan Google.
 */
export function perujukDari(perujuk: string, hostSendiri: string): Perujuk {
  if (perujuk.trim() === '') return 'langsung';
  let host: string;
  try {
    host = new URL(perujuk).hostname.toLowerCase();
  } catch {
    return 'lain';
  }
  if (host === '') return 'lain';
  if (host === hostSendiri.toLowerCase()) return 'langsung';
  for (const [domain, kategori] of PETA_PERUJUK) {
    if (akhiranCocok(host, domain)) return kategori;
  }
  if (/(^|\.)google\.(com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/.test(host)) return 'google';
  return 'lain';
}

/** Bahasa peramban: `id` (dan `in`, kode lama Java untuk Indonesia), `en`, sisanya `lain`. */
export function bahasaDari(bahasa: string): Bahasa {
  const kecil = bahasa.trim().toLowerCase();
  if (/^(id|in)(-|_|$)/.test(kecil)) return 'id';
  if (/^en(-|_|$)/.test(kecil)) return 'en';
  return 'lain';
}

/** Bentuk minimal `navigator.connection`; tidak ada di Safari maupun Firefox. */
export interface InfoKoneksi {
  effectiveType?: string | undefined;
  saveData?: boolean | undefined;
}

export function koneksiDari(info: InfoKoneksi | null): Koneksi {
  const jenis = info?.effectiveType;
  if (jenis === '4g' || jenis === '3g' || jenis === '2g') return jenis;
  if (jenis === 'slow-2g') return 'lambat';
  return 'tidak-tahu';
}

/**
 * Offset zona waktu dalam menit **ke timur** (WIB = 420).
 *
 * `Date#getTimezoneOffset` mengembalikan kebalikannya (WIB = −420), jadi
 * tandanya dibalik di sini, dibulatkan, lalu dibatasi ke rentang zona yang ada
 * di bumi.
 */
export function zonaMenitDari(offsetGetTimezone: number): number | null {
  if (!Number.isFinite(offsetGetTimezone)) return null;
  const timur = Math.round(-offsetGetTimezone);
  // `+ 0` membuang −0: nol yang dikirim sebagai "-0" tidak sama dengan 0 di JSON mana pun.
  return Math.min(ZONA_MAKS, Math.max(ZONA_MIN, timur)) + 0;
}

function bulatAtauNull(nilai: number): number | null {
  return Number.isFinite(nilai) && nilai > 0 ? Math.round(nilai) : null;
}

function satuDesimalAtauNull(nilai: number): number | null {
  return Number.isFinite(nilai) && nilai > 0 ? Math.round(nilai * 10) / 10 : null;
}

function bulatDalam(nilai: number, min: number, maks: number): number | null {
  return Number.isInteger(nilai) && nilai >= min && nilai <= maks ? nilai : null;
}

/** Semua yang dibutuhkan `bacaPerangkat`, diserahkan pemanggil. */
export interface MasukanPerangkat {
  /** `navigator.userAgent`. Dibaca di sini, tidak pernah diteruskan. */
  ua: string;
  /** `navigator.maxTouchPoints`. */
  titikSentuh: number;
  /** `document.referrer`. Hanya host-nya yang dibaca. */
  perujuk: string;
  /** `location.hostname`, untuk mengenali perujuk dari situs sendiri. */
  hostSendiri: string;
  /** `navigator.language`. */
  bahasa: string;
  /** `(kueri) => matchMedia(kueri).matches`; `null` kalau `matchMedia` tidak ada. */
  cocokMedia: ((kueri: string) => boolean) | null;
  /** `innerHeight`. */
  tinggi: number;
  /** `devicePixelRatio`. */
  rasioPiksel: number;
  /** `Date#getHours()`, jam setempat. */
  jamLokal: number;
  /** `Date#getDay()`, 0 = Minggu. */
  hariLokal: number;
  /** `Date#getTimezoneOffset()`, apa adanya. */
  offsetZona: number;
  /** `navigator.connection`, atau `null`. */
  koneksi: InfoKoneksi | null;
}

/**
 * Seluruh keterangan perangkat untuk peristiwa `mulai`.
 *
 * Objek yang dikembalikan dibangun dari nol dengan kelima belas medan dalam
 * urutan `MEDAN_PERANGKAT` — tidak ada satu pun medan masukan yang disalin
 * utuh, jadi tidak ada jalan bagi `ua` atau `perujuk` mentah untuk menumpang.
 */
export function bacaPerangkat(m: MasukanPerangkat): Perangkat {
  const media = m.cocokMedia;
  const cocok = (kueri: string): boolean | null => (media === null ? null : media(kueri));

  const gelap = cocok('(prefers-color-scheme: dark)');
  const kasar = cocok('(pointer: coarse)');
  const halus = cocok('(pointer: fine)');
  const penunjuk: Penunjuk | null =
    kasar === null ? null : kasar ? 'kasar' : halus === true ? 'halus' : 'tidak';

  return {
    tinggi_layar: bulatAtauNull(m.tinggi),
    rasio_piksel: satuDesimalAtauNull(m.rasioPiksel),
    skema_warna: gelap === null ? null : gelap ? 'gelap' : 'terang',
    penunjuk,
    os: osDari(m.ua, m.titikSentuh),
    peramban_dalam: perambanDalamDari(m.ua),
    perujuk: perujukDari(m.perujuk, m.hostSendiri),
    bahasa: bahasaDari(m.bahasa),
    jam_lokal: bulatDalam(m.jamLokal, 0, 23),
    hari_lokal: bulatDalam(m.hariLokal, 0, 6),
    zona_menit: zonaMenitDari(m.offsetZona),
    koneksi: koneksiDari(m.koneksi),
    hemat_data: typeof m.koneksi?.saveData === 'boolean' ? m.koneksi.saveData : null,
    gerak_dikurangi: cocok('(prefers-reduced-motion: reduce)'),
    mandiri: cocok('(display-mode: standalone)'),
  };
}
