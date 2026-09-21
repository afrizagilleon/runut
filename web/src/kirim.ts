import type { NamaPeristiwa, Peristiwa } from './alur.ts';

/**
 * Pengiriman peristiwa (D-7).
 *
 * Tanpa `VITE_KOLEKTOR_URL` saat build, `ALAMAT` menjadi string kosong,
 * `MENGIRIM` menjadi `false` harfiah, dan seluruh cabang di bawahnya dibuang
 * saat bundling — sehingga berkas hasil build **tidak memuat alamat mana pun
 * dan tidak memuat `sendBeacon`**. Itulah cara INV-2 tetap berlaku untuk build
 * biasa, dan itu dibuktikan dari isi `dist/`, bukan dari membaca berkas ini.
 *
 * Nilai alamatnya boleh mutlak (`https://contoh.invalid/e`) maupun relatif
 * (`/e`, yang dipakai di produksi karena aplikasi dan pengumpul satu asal).
 */
const ALAMAT: string = import.meta.env.VITE_KOLEKTOR_URL ?? '';

/** Benar kalau build ini memang punya pengumpul. */
export const MENGIRIM: boolean = ALAMAT !== '';

/**
 * Peristiwa yang tidak boleh menunggu: sesudahnya pemain bisa saja menutup tab.
 * Sisanya menumpuk di memori dan ikut terkirim bersama yang berikutnya.
 */
const PENTING: ReadonlySet<NamaPeristiwa> = new Set<NamaPeristiwa>([
  'kunci_jawaban',
  'pembukaan_masuk',
  'pembukaan_selesai',
  'minat_kasus_lain',
  'akhir_kirim',
  'tutup',
]);

/**
 * Batas badan permintaan di pengumpul (D-9) adalah 8 KB. Pengirim memotong
 * sendiri supaya tidak pernah menabrak batas itu dan kehilangan satu sesi utuh.
 */
export const MAKS_BADAN = 8 * 1024;

/**
 * Pecah peristiwa menjadi beberapa muatan yang masing-masing muat di `maks`.
 *
 * Murni dan bisa dites tanpa peramban maupun variabel lingkungan. Satu peristiwa
 * yang sendirian sudah melampaui batas tetap dikirim sendirian: menahannya
 * berarti membuangnya diam-diam, dan pengumpul yang menolaknya akan mencatat
 * penolakan itu — kegagalan yang terlihat lebih baik daripada yang senyap.
 */
export function pecahMuatan(peristiwa: Peristiwa[], maks: number = MAKS_BADAN): Peristiwa[][] {
  const muatan: Peristiwa[][] = [];
  let sekarang: Peristiwa[] = [];
  for (const p of peristiwa) {
    const calon = [...sekarang, p];
    if (sekarang.length > 0 && JSON.stringify(calon).length > maks) {
      muatan.push(sekarang);
      sekarang = [p];
    } else {
      sekarang = calon;
    }
  }
  if (sekarang.length > 0) muatan.push(sekarang);
  return muatan;
}

/** Benar kalau sekumpulan peristiwa memuat sesuatu yang tidak boleh menunggu. */
export function perluSiram(peristiwa: Peristiwa[]): boolean {
  return peristiwa.some((p) => PENTING.has(p.nama));
}

let antre: Peristiwa[] = [];
let sudahMengeluh = false;

/**
 * INV-6, dengan satu pengecualian yang disengaja: gagalnya pengiriman **tidak
 * boleh** mengganggu permainan. Dicatat sekali, lalu diam.
 */
function mengeluhSekali(): void {
  if (sudahMengeluh) return;
  sudahMengeluh = true;
  console.warn(
    'Runut: peristiwa tidak sampai ke pengumpul. Permainan lanjut seperti biasa; ' +
      'yang hilang hanya catatan perilaku, bukan jawabanmu.',
  );
}

function kirimSatu(badan: string): void {
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const terkirim = navigator.sendBeacon(
        ALAMAT,
        new Blob([badan], { type: 'application/json' }),
      );
      if (terkirim) return;
    }
    void fetch(ALAMAT, {
      method: 'POST',
      body: badan,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).then(
      (jawaban) => {
        if (!jawaban.ok) mengeluhSekali();
      },
      () => {
        mengeluhSekali();
      },
    );
  } catch {
    mengeluhSekali();
  }
}

/** Kirim seluruh antrean sekarang juga. Dipanggil juga pada `pagehide`. */
export function siramPeristiwa(): void {
  if (!MENGIRIM) return;
  if (antre.length === 0) return;
  const menunggu = antre;
  antre = [];
  for (const muatan of pecahMuatan(menunggu)) {
    kirimSatu(JSON.stringify(muatan));
  }
}

/** Terima peristiwa dari aplikasi; kirim sekarang kalau ada yang penting. */
export function catatPeristiwa(peristiwa: Peristiwa[]): void {
  if (!MENGIRIM) return;
  if (peristiwa.length === 0) return;
  antre = [...antre, ...peristiwa];
  if (perluSiram(peristiwa)) siramPeristiwa();
}
