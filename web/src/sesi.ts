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
 * tidak ada cookie, hidup di memori tab saja).
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
