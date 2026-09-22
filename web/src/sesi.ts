/**
 * Id sesi yang tidak bergantung pada konteks aman (A3-T1).
 *
 * `crypto.randomUUID` **hanya ada di konteks aman** — https atau `localhost`.
 * Pemilik membuka `http://192.168.50.200:5173/` dari ponselnya, di mana
 * `window.isSecureContext === false` dan `crypto.randomUUID` tidak ada sama
 * sekali; halamannya putih dengan `TypeError: crypto.randomUUID is not a
 * function`. Seluruh uji kami memakai `localhost`, jadi tidak pernah
 * tersentuh.
 *
 * `crypto.getRandomValues` **tetap ada** di konteks tidak aman, jadi UUID v4
 * bisa disusun sendiri dengan keacakan yang sama kualitasnya. `Math.random`
 * adalah cadangan terakhir: ia bukan keacakan kriptografis, tetapi id sesi ini
 * bukan rahasia — ia hanya perlu tidak bertabrakan (INV-9: tidak ada identitas,
 * hidup di memori tab saja).
 *
 * Sumber acaknya disuntikkan supaya ketiga cabang bisa dites tanpa peramban.
 */

export interface SumberAcak {
  /** `crypto.randomUUID`, kalau konteksnya aman. */
  randomUUID?: (() => string) | undefined;
  /** `crypto.getRandomValues`, tersedia juga di konteks tidak aman. */
  getRandomValues?: ((larik: Uint8Array) => Uint8Array) | undefined;
  /** Cadangan terakhir; `Math.random` kalau tidak disuntikkan. */
  acak?: (() => number) | undefined;
}

/** Cabang mana yang dipakai; dilaporkan supaya bisa diperiksa, bukan ditebak. */
export type CabangAcak = 'randomUUID' | 'getRandomValues' | 'Math.random';

function heks(nilai: number): string {
  return nilai.toString(16).padStart(2, '0');
}

/**
 * Susun UUID v4 dari 16 bita acak.
 *
 * Bita ke-7 dipaksa bernibble atas `4` (versi 4) dan bita ke-9 bernibble atas
 * `8`–`b` (varian RFC 4122. Tanpa keduanya, hasilnya bukan UUID v4 dan
 * pengumpul berhak menolaknya.
 */
function susunV4(bita: Uint8Array): string {
  const b = Uint8Array.from(bita);
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = [...b].map(heks).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Cabang yang akan dipakai untuk sumber acak ini. */
export function cabangAcak(sumber: SumberAcak): CabangAcak {
  if (typeof sumber.randomUUID === 'function') return 'randomUUID';
  if (typeof sumber.getRandomValues === 'function') return 'getRandomValues';
  return 'Math.random';
}

/**
 * Id sesi berbentuk UUID v4. Selalu berhasil: tidak ada cabang yang melempar,
 * karena layar putih lebih buruk daripada id yang kurang acak.
 */
export function buatIdSesi(sumber: SumberAcak = {}): string {
  const cabang = cabangAcak(sumber);

  if (cabang === 'randomUUID' && sumber.randomUUID !== undefined) {
    return sumber.randomUUID();
  }

  if (cabang === 'getRandomValues' && sumber.getRandomValues !== undefined) {
    return susunV4(sumber.getRandomValues(new Uint8Array(16)));
  }

  const acak = sumber.acak ?? Math.random;
  const bita = new Uint8Array(16);
  for (let i = 0; i < bita.length; i += 1) {
    bita[i] = Math.floor(acak() * 256) & 0xff;
  }
  return susunV4(bita);
}

/** Bentuk UUID v4 yang sah: versi `4`, varian `8`–`b`, huruf kecil. */
const POLA_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Benar kalau nilainya UUID v4 — dipakai di sini dan (disalin) di pengumpul. */
export function uuidV4Sah(nilai: unknown): boolean {
  return typeof nilai === 'string' && POLA_UUID_V4.test(nilai);
}

/* ------------------------------------------------------------------ */
/* Nomor pengunjung (D-13)                                            */
/* ------------------------------------------------------------------ */

/**
 * Kunci `localStorage` nomor pengunjung. Yang ketiga, `kasus_dimainkan`, ada di
 * `pilih-kasus.ts`; ketiganya dieja di README.
 */
export const KUNCI_PENGUNJUNG = 'pengunjung';
export const KUNCI_KUNJUNGAN = 'kunjungan_ke';

/** Batas atas hitungan kunjungan; pengumpul menolak di luar 1–9999. */
export const MAKS_KUNJUNGAN = 9999;

/**
 * Sepotong `localStorage` yang cukup untuk keperluan ini, disuntikkan.
 *
 * Bukan `Storage` penuh: yang dipakai hanya dua metode, dan tipe sempit membuat
 * penyimpanan palsu di tes tidak perlu berpura-pura punya `length`, `clear`,
 * maupun `key()`.
 */
export interface Penyimpanan {
  getItem(kunci: string): string | null;
  setItem(kunci: string, nilai: string): void;
}

export interface Pengunjung {
  /** UUID v4 pihak pertama, atau `null` kalau penyimpanan tidak bisa dipakai. */
  pengunjung: string | null;
  /** 1 pada kunjungan pertama; `null` kalau `pengunjung` juga `null`. */
  kunjungan_ke: number | null;
}

function angkaKunjungan(mentah: string | null): number {
  if (mentah === null) return 0;
  const n = Number(mentah);
  if (!Number.isInteger(n) || n < 1 || n > MAKS_KUNJUNGAN) return 0;
  return n;
}

/**
 * Baca — dan kalau perlu buat — nomor pengunjung (D-13).
 *
 * Ia bukan cookie — tidak ikut terkirim di setiap permintaan dan tidak terbaca
 * situs lain — tetapi ia **tetap sesuatu yang disimpan di browser pemain**, dan
 * D-11 menuntut hal itu dikatakan apa adanya, bukan dihaluskan. Ia ada karena "100+ peserta" harus berarti orang, bukan sesi;
 * menghitung sesi akan melebih-lebihkan jumlah peserta di depan juri.
 *
 * Empat keadaan, semuanya dites:
 *
 * 1. **Pertama kali** — belum ada nilai: dibuat UUID v4 baru, `kunjungan_ke` 1.
 * 2. **Kembali** — nilai lama sah: dipakai lagi, hitungannya naik satu.
 * 3. **Penyimpanan melempar** — mode penyamaran tertentu, penyimpanan penuh,
 *    atau situs yang diblokir menyimpan: `{ null, null }`, permainan tetap
 *    jalan, tidak ada galat yang sampai ke pemain.
 * 4. **Nilai tersimpan rusak** — bukan UUID v4: diganti yang baru dan
 *    hitungannya mulai dari 1 lagi, bukan dipaksa terbaca.
 *
 * Murni terhadap penyimpanan yang disuntikkan: tidak menyentuh `window`.
 */
export function bacaPengunjung(
  penyimpanan: Penyimpanan | null,
  buatId: () => string,
): Pengunjung {
  if (penyimpanan === null) return { pengunjung: null, kunjungan_ke: null };
  try {
    const tersimpan = penyimpanan.getItem(KUNCI_PENGUNJUNG);
    const sah = uuidV4Sah(tersimpan);
    const id = sah && tersimpan !== null ? tersimpan : buatId();
    // Hitungan hanya diwarisi kalau id-nya sendiri diwarisi. Nomor baru berarti
    // pengunjung baru, dan pengunjung baru selalu berada di kunjungan pertama.
    const lama = sah ? angkaKunjungan(penyimpanan.getItem(KUNCI_KUNJUNGAN)) : 0;
    const kunjungan = Math.min(lama + 1, MAKS_KUNJUNGAN);
    penyimpanan.setItem(KUNCI_PENGUNJUNG, id);
    penyimpanan.setItem(KUNCI_KUNJUNGAN, String(kunjungan));
    return { pengunjung: id, kunjungan_ke: kunjungan };
  } catch {
    return { pengunjung: null, kunjungan_ke: null };
  }
}

/**
 * `localStorage` peramban, atau `null` kalau menyentuhnya saja melempar.
 *
 * Membaca `window.localStorage` bisa melempar sebelum satu metode pun dipanggil
 * (peramban yang memblokir penyimpanan pihak ketiga di dalam iframe, Firefox
 * dengan `dom.storage.enabled=false`), jadi aksesnya sendiri dibungkus.
 */
export function penyimpananPeramban(): Penyimpanan | null {
  try {
    const simpan = window.localStorage;
    // Satu tulis-hapus percobaan: Safari penyamaran menyediakan objeknya tetapi
    // melempar QuotaExceededError pada tulisan pertama.
    const uji = '__runut__';
    simpan.setItem(uji, '1');
    simpan.removeItem(uji);
    return simpan;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Kode penanda dari tautan (D-9)                                     */
/* ------------------------------------------------------------------ */

/** `?k=<kode>`: huruf kecil dan angka, 1–8 karakter. */
const POLA_KODE = /^[a-z0-9]{1,8}$/;

/**
 * Kode penanda dari query string, atau `null`.
 *
 * Nilai yang tidak cocok **diabaikan diam-diam** (D-9): tautan yang disebar ke
 * grup obrolan sering pulang dengan ekor `?k=abc&utm_source=…` atau kode yang
 * salah ketik, dan menolak sesi karena itu berarti kehilangan pemain sungguhan
 * demi kerapian label.
 *
 * Penanda tidak pernah tampil di layar dan tidak pernah dipakai sebagai
 * identitas: ia hanya memisahkan sesi uji pemilik dari sesi orang lain.
 */
export function kodePenanda(pencarian: string): string | null {
  const bersih = pencarian.startsWith('?') ? pencarian.slice(1) : pencarian;
  for (const bagian of bersih.split('&')) {
    const pisah = bagian.indexOf('=');
    if (pisah < 0) continue;
    if (bagian.slice(0, pisah) !== 'k') continue;
    let nilai: string;
    try {
      nilai = decodeURIComponent(bagian.slice(pisah + 1));
    } catch {
      return null;
    }
    return POLA_KODE.test(nilai) ? nilai : null;
  }
  return null;
}

/**
 * Sumber acak dari peramban yang sedang berjalan, se-aman yang tersedia.
 * Dipanggil sekali saat aplikasi mulai; tidak melempar walau `crypto` sendiri
 * tidak ada.
 */
export function sumberAcakPeramban(): SumberAcak {
  const kripto: Crypto | undefined = typeof crypto === 'undefined' ? undefined : crypto;
  if (kripto === undefined) return {};
  return {
    randomUUID:
      typeof kripto.randomUUID === 'function' ? (): string => kripto.randomUUID() : undefined,
    getRandomValues:
      typeof kripto.getRandomValues === 'function'
        ? (larik: Uint8Array): Uint8Array => kripto.getRandomValues(larik)
        : undefined,
  };
}
