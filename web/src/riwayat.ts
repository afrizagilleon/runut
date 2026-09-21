/**
 * Tumpukan riwayat peramban sebagai model murni (A4-T1).
 *
 * ## Penyebab cacatnya
 *
 * A1-T7 memasang satu entri riwayat per layar lewat efek yang mengawasi nama
 * layar: kalau namanya berubah, dorong (`pushState`) entri baru. Efek itu tidak
 * bisa membedakan **kenapa** layarnya berubah. Waktu pemain menekan tombol
 * kembali, peramban sudah memundurkan penunjuknya sendiri, reducer memundurkan
 * layarnya, lalu efek yang sama mendorong entri baru di atas posisi itu —
 * memotong entri di depannya dan menambah satu entri tanpa gerakan pemain.
 *
 * Akibatnya tumpukan peramban berhenti mencerminkan perjalanan pemain, dan
 * kembali yang kedua tidak lagi mendarat di layar yang benar. Di ponsel pemilik
 * ia keluar dari situs. Entri yang didorong di dalam penanganan `popstate` juga
 * lahir **tanpa gerakan pemain**, dan Chrome sengaja melompatinya saat kembali.
 *
 * ## Perbaikannya
 *
 * Entri riwayat yang sedang aktif sudah membawa nama layarnya sendiri. Jadi
 * pertanyaannya bukan "apakah layarnya berubah" melainkan **"apakah peramban
 * sudah berada di entri yang benar"**. Kalau sudah — yang persis terjadi sesudah
 * `popstate` — tidak ada yang perlu didorong. Aplikasi tidak perlu mengingat
 * kenapa layarnya berubah, dan modelnya tidak bisa melenceng dari kenyataan,
 * karena sumber kebenarannya adalah `history.state` milik peramban sendiri.
 *
 * Berkas ini murni: tidak menyentuh `window`. `Tumpukan` di bawah adalah tiruan
 * peramban yang dipakai tes untuk menjalankan urutan maju–mundur–maju lengkap.
 */

/** Apa yang harus dilakukan aplikasi pada riwayat peramban. */
export type PerintahRiwayat = 'ganti' | 'dorong' | 'diam';

/**
 * Perintah untuk satu layar aplikasi, dilihat dari entri riwayat yang aktif.
 *
 * - `layarEntri === null` → belum ada entri milik kita: **ganti** (`replaceState`),
 *   supaya menekan kembali di layar pertama memang keluar dari situs.
 * - sama → peramban sudah di tempat yang benar: **diam**. Inilah yang
 *   menyembuhkan cacat tombol kembali.
 * - beda → pemain maju: **dorong** (`pushState`).
 */
export function perintahRiwayat(
  layarEntri: string | null,
  layarAplikasi: string,
): PerintahRiwayat {
  if (layarEntri === null) return 'ganti';
  if (layarEntri === layarAplikasi) return 'diam';
  return 'dorong';
}

/**
 * Tiruan tumpukan riwayat peramban. `indeks === -1` berarti belum ada entri
 * milik aplikasi sama sekali (keadaan sesaat sebelum `replaceState` pertama).
 */
export interface Tumpukan {
  readonly entri: readonly string[];
  readonly indeks: number;
  /** Pemain sudah mundur melewati entri pertama kita: peramban meninggalkan situs. */
  readonly diLuarSitus: boolean;
}

export function tumpukanBaru(): Tumpukan {
  return { entri: [], indeks: -1, diLuarSitus: false };
}

/** Nama layar pada entri yang sedang aktif; `null` kalau belum ada. */
export function layarEntri(tumpukan: Tumpukan): string | null {
  if (tumpukan.indeks < 0) return null;
  return tumpukan.entri[tumpukan.indeks] ?? null;
}

/** `history.replaceState`: menimpa entri aktif tanpa menambah panjang. */
export function ganti(tumpukan: Tumpukan, layar: string): Tumpukan {
  if (tumpukan.indeks < 0) return { entri: [layar], indeks: 0, diLuarSitus: false };
  const entri = [...tumpukan.entri];
  entri[tumpukan.indeks] = layar;
  return { ...tumpukan, entri };
}

/**
 * `history.pushState`: membuang semua entri di depan penunjuk, lalu menambah
 * satu. Pembuangan itulah yang dulu diam-diam memotong perjalanan pemain.
 */
export function dorong(tumpukan: Tumpukan, layar: string): Tumpukan {
  const entri = [...tumpukan.entri.slice(0, tumpukan.indeks + 1), layar];
  return { entri, indeks: entri.length - 1, diLuarSitus: false };
}

/** Tombol kembali. Dari entri pertama, peramban meninggalkan situs. */
export function mundurPeramban(tumpukan: Tumpukan): Tumpukan {
  if (tumpukan.indeks <= 0) return { ...tumpukan, diLuarSitus: true };
  return { ...tumpukan, indeks: tumpukan.indeks - 1 };
}

/**
 * Satu putaran aplikasi: layar sekarang `layar`, sesuaikan riwayatnya.
 * Inilah yang dijalankan efek di `Aplikasi.tsx`, ditulis sebagai fungsi murni
 * supaya urutan maju–mundur–maju bisa dijalankan di meja tanpa peramban.
 */
export function sesuaikan(tumpukan: Tumpukan, layar: string): Tumpukan {
  switch (perintahRiwayat(layarEntri(tumpukan), layar)) {
    case 'ganti':
      return ganti(tumpukan, layar);
    case 'dorong':
      return dorong(tumpukan, layar);
    case 'diam':
      return tumpukan;
  }
}
