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
export const PENTING: ReadonlySet<NamaPeristiwa> = new Set<NamaPeristiwa>([
  /*
   * A-1: `mulai` dan `layar_masuk` dikirim **segera**, bukan menunggu kelompok
   * penuh atau halaman mati.
   *
   * Temuan reviewer (F-1): kunjungan yang ditinggalkan di layar pertama tidak
   * pernah sampai ke pengumpul sampai `pagehide` atau `visibilitychange`
   * menyala — dan di ponsel keduanya tidak selalu sempat. Sesi yang hilang
   * begitu bukan sembarang angka: ia justru **jumlah pengunjung**, angka yang
   * akan disebut pemilik ke juri. Orang yang membuka tautan lalu menutupnya
   * dua detik kemudian tetap seorang pengunjung.
   *
   * Biayanya satu `sendBeacon` kecil per perpindahan layar — enam per sesi
   * penuh. Itu murah dibanding sesi yang hilang tanpa jejak.
   */
  'mulai',
  'layar_masuk',
  'kunci_jawaban',
  'kembali_ke_kartu',
  'pembukaan_masuk',
  'pembukaan_selesai',
  'minat_kasus_lain',
  'akhir_kirim',
  /*
   * M3.8 D-3: halaman yang baru saja melempar mungkin tidak hidup cukup lama
   * untuk kelompok berikutnya. Biayanya dibatasi reducer: paling banyak lima
   * per sesi, pesan yang sama sekali saja.
   */
  'galat',
  'tutup',
]);

/**
 * Batas badan permintaan di pengumpul (D-9) adalah 8 KB. Pengirim memotong
 * sendiri supaya tidak pernah menabrak batas itu dan kehilangan satu sesi utuh.
 */
export const MAKS_BADAN = 8 * 1024;

/**
 * Kelompok pengiriman (D-8): kirim begitu antrean mencapai 20 peristiwa.
 *
 * Sebelum pelacak, antrean hanya berisi gerakan besar dan bisa menunggu sampai
 * ada yang penting. Ketukan mengubah itu: satu layar soal saja bisa melahirkan
 * puluhan `ketuk`, dan menyimpannya sampai `pagehide` berarti satu kiriman
 * raksasa pada saat halaman sedang mati — persis kiriman yang paling mungkin
 * hilang. D-8 menyebut batas muatan 32 KB; `MAKS_BADAN` 8 KB lebih ketat dari
 * itu dan tetap memenuhinya, sekaligus menjauh dari kuota `sendBeacon`.
 */
export const KELOMPOK = 20;

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

/**
 * Antrean sepanjang ini harus dikirim sekarang: ada yang penting di dalamnya,
 * atau kelompoknya sudah penuh (D-8). Murni, supaya aturannya bisa dites tanpa
 * `VITE_KOLEKTOR_URL` maupun peramban.
 */
export function perluKirim(panjangAntrean: number, baru: Peristiwa[]): boolean {
  return perluSiram(baru) || panjangAntrean >= KELOMPOK;
}

let antre: Peristiwa[] = [];
let sudahMengeluh = false;

/**
 * Nomor urut tertinggi yang sudah pernah diterima, per sesi.
 *
 * Tanpa ini, satu peristiwa bisa diserahkan dua kali dan tertulis dua baris
 * dengan `(sesi, urut)` yang sama. Itu bukan kemungkinan teoretis: `pagehide`
 * menyala lebih dari sekali di ponsel — pindah tab lalu menutup, atau halaman
 * dipulihkan dari bfcache — dan jalur `pagehide` menghitung peristiwanya dari
 * keadaan yang sama, sehingga melahirkan `urut` yang sama dua kali.
 * Direproduksi dan diukur sebelum ditambal (ledger A1-T2).
 *
 * Penjagaan ditaruh di sini, bukan di pemanggilnya, karena ini satu-satunya
 * pintu yang dilewati semua jalur: efek React maupun `pagehide`.
 */
const urutTerakhir = new Map<string, number>();

/**
 * Buang peristiwa yang nomor urutnya sudah pernah lewat sini.
 *
 * Petanya diberikan pemanggil supaya fungsi ini bisa dites tanpa peramban dan
 * tanpa variabel lingkungan — penjaga yang tidak bisa dibuktikan bukan penjaga.
 */
export function saringYangBaru(
  peristiwa: Peristiwa[],
  tertinggiPerSesi: Map<string, number>,
): Peristiwa[] {
  const baru: Peristiwa[] = [];
  for (const p of peristiwa) {
    const tertinggi = tertinggiPerSesi.get(p.sesi) ?? 0;
    if (p.urut <= tertinggi) continue;
    tertinggiPerSesi.set(p.sesi, p.urut);
    baru.push(p);
  }
  return baru;
}

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
  const baru = saringYangBaru(peristiwa, urutTerakhir);
  if (baru.length === 0) return;
  antre = [...antre, ...baru];
  if (perluKirim(antre.length, baru)) siramPeristiwa();
}
