/**
 * Kasus mana yang dimainkan pengunjung ini (M4 D-4).
 *
 * Seluruh keputusannya fungsi murni: daftar kasus masuk, satu kasus keluar.
 * Yang menyentuh peramban hanyalah dua pembungkus tipis di bawah
 * (`bacaDimainkan` / `simpanDimainkan`), dan keduanya menerima penyimpanan yang
 * disuntikkan — persis seperti `bacaPengunjung` di `sesi.ts`.
 *
 * Kegagalan yang dijaga berkas ini disebut kontrak dengan nama: **pemain yang
 * sudah main DADA disodori DADA lagi**. Karena itu daftar "sudah dimainkan"
 * hidup di `localStorage` (sama seperti nomor pengunjung), bukan di memori tab:
 * orang yang kembali besok adalah orang yang sama.
 */
import type { Kasus } from '../../factory/skema/tipe.ts';
import type { Penyimpanan } from './sesi.ts';

/** Kunci `localStorage`. Kunci ketiga repo ini; ketiganya dieja di README. */
export const KUNCI_KASUS_DIMAINKAN = 'kasus_dimainkan';

/**
 * Berapa kasus yang diingat.
 *
 * Bukan penghematan tempat: daftar yang tumbuh tanpa batas akan menyimpan
 * kasus_id yang berkasnya sudah tidak ada lagi, dan tidak ada yang pernah
 * membersihkannya. Yang dibuang adalah yang **terlama**, karena pertanyaannya
 * selalu "apa yang baru saja dimainkan orang ini".
 */
export const MAKS_DIMAINKAN = 50;

/**
 * Bentuk `kasus_id` yang mungkin: huruf kecil, angka, dan tanda hubung.
 *
 * Dipakai di dua tempat dan sengaja sama: menyaring `?kasus=` dari tautan, dan
 * menyaring isi `localStorage` yang bisa saja disunting tangan. Keduanya
 * masukan dari luar, dan keduanya berakhir di perbandingan dengan `kasus_id`
 * berkas yang ada — jadi nilai yang tidak mungkin cocok dibuang lebih dulu.
 */
const POLA_KASUS_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * `?kasus=<id>` dari query string, atau `null` (D-4).
 *
 * Nilai yang tidak dikenal **diabaikan diam-diam**, seperti `?k=` di `sesi.ts`:
 * tautan yang disebar ke grup pulang dengan ekor yang macam-macam, dan menolak
 * memainkan apa pun karena satu parameter salah ketik berarti kehilangan pemain
 * demi kerapian. Di sini "diabaikan" berarti kasusnya dipilih acak seperti
 * biasa.
 */
export function kodeKasus(pencarian: string): string | null {
  const bersih = pencarian.startsWith('?') ? pencarian.slice(1) : pencarian;
  for (const bagian of bersih.split('&')) {
    const pisah = bagian.indexOf('=');
    if (pisah < 0) continue;
    if (bagian.slice(0, pisah) !== 'kasus') continue;
    let nilai: string;
    try {
      nilai = decodeURIComponent(bagian.slice(pisah + 1));
    } catch {
      return null;
    }
    return POLA_KASUS_ID.test(nilai) ? nilai : null;
  }
  return null;
}

/**
 * Kasus yang sudah dimainkan pengunjung ini, urut dari yang terlama.
 *
 * Tidak pernah melempar: penyimpanan yang diblokir, JSON yang rusak, dan isi
 * yang bentuknya lain semuanya dibaca sebagai "belum ada yang dimainkan".
 * Akibat terburuknya adalah pemain mendapat kasus yang sama dua kali — jauh
 * lebih ringan daripada layar putih.
 */
export function bacaDimainkan(penyimpanan: Penyimpanan | null): string[] {
  if (penyimpanan === null) return [];
  try {
    const mentah = penyimpanan.getItem(KUNCI_KASUS_DIMAINKAN);
    if (mentah === null) return [];
    const isi: unknown = JSON.parse(mentah);
    if (!Array.isArray(isi)) return [];
    return isi.filter((x): x is string => typeof x === 'string' && POLA_KASUS_ID.test(x));
  } catch {
    return [];
  }
}

/** Tulis daftar yang sudah dimainkan; yang terlama dibuang di `MAKS_DIMAINKAN`. */
export function simpanDimainkan(
  penyimpanan: Penyimpanan | null,
  daftar: readonly string[],
): void {
  if (penyimpanan === null) return;
  try {
    const dipotong = daftar.slice(Math.max(0, daftar.length - MAKS_DIMAINKAN));
    penyimpanan.setItem(KUNCI_KASUS_DIMAINKAN, JSON.stringify(dipotong));
  } catch {
    /* Penyimpanan yang tidak bisa dipakai bukan alasan menghentikan permainan. */
  }
}

/** Daftar baru dengan `kasus_id` di ujung; yang sudah ada tidak digandakan. */
export function tambahDimainkan(dimainkan: readonly string[], kasus_id: string): string[] {
  return dimainkan.includes(kasus_id) ? [...dimainkan] : [...dimainkan, kasus_id];
}

/** Kasus yang belum pernah dimainkan, dalam urutan daftarnya. */
export function belumDimainkan(
  daftar: readonly Kasus[],
  dimainkan: readonly string[],
): Kasus[] {
  return daftar.filter((k) => !dimainkan.includes(k.kasus_id));
}

export interface PilihanKasus {
  daftar: readonly Kasus[];
  dimainkan: readonly string[];
  /** Nilai `?kasus=`; `null` atau tak dikenal berarti tidak memaksa. */
  paksa: string | null;
  /** Sumber acak, disuntikkan supaya pilihannya bisa dites tanpa peramban. */
  acak: () => number;
}

/** Satu anggota daftar, dipilih seragam; tidak pernah keluar dari jangkauan. */
function satuAcak<T>(daftar: readonly T[], acak: () => number): T {
  const nilai = acak();
  const mentah = Number.isFinite(nilai) ? Math.floor(nilai * daftar.length) : 0;
  const indeks = Math.min(daftar.length - 1, Math.max(0, mentah));
  const terpilih = daftar[indeks];
  /* Tidak bisa terjadi sesudah penjepitan di atas; ditulis supaya tipenya sempit. */
  if (terpilih === undefined) throw new Error('Daftar kasus kosong saat memilih.');
  return terpilih;
}

/**
 * Kasus untuk kunjungan ini (D-4).
 *
 * Urutan keputusannya:
 *
 * 1. `?kasus=<id>` yang **cocok dengan berkas yang ada** menang atas segalanya —
 *    itulah yang dipakai juri, uji duduk, dan seluruh rangkaian e2e. Nilai yang
 *    tidak cocok diabaikan, tidak menggagalkan apa pun.
 * 2. Kalau masih ada kasus yang belum dimainkan, pilihan diambil **hanya** dari
 *    kelompok itu.
 * 3. Kalau semuanya sudah dimainkan, acak lagi dari seluruh daftar.
 *
 * Langkah 2 adalah seluruh isi kegagalan nomor 3 di kontrak, dan ia diuji
 * dengan memeriksa bahwa **tidak satu pun** nilai acak bisa mendarat di kasus
 * yang sudah dimainkan.
 */
export function pilihKasus({ daftar, dimainkan, paksa, acak }: PilihanKasus): Kasus {
  if (daftar.length === 0) {
    throw new Error('Tidak ada satu kasus pun yang bisa dimainkan.');
  }
  if (paksa !== null) {
    const diminta = daftar.find((k) => k.kasus_id === paksa);
    if (diminta !== undefined) return diminta;
  }
  const belum = belumDimainkan(daftar, dimainkan);
  return satuAcak(belum.length > 0 ? belum : daftar, acak);
}

/**
 * Kasus yang dibuka tombol "Mau coba kasus lain", atau `null` kalau tidak ada
 * lagi — dan di situlah pesan penutup kasus ini tampil (D-4).
 *
 * Sengaja **tidak** acak: "kasus berikutnya" adalah janji tentang satu kasus
 * tertentu, dan tes e2e yang menekan tombol itu harus bisa menyebutkan kasus
 * mana yang seharusnya terbuka.
 */
export function kasusBerikut(
  daftar: readonly Kasus[],
  dimainkan: readonly string[],
): Kasus | null {
  return belumDimainkan(daftar, dimainkan)[0] ?? null;
}
