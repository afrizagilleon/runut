/**
 * Pelacak ketukan: bagian yang bisa dibuktikan tanpa peramban (D-8).
 *
 * Yang ada di berkas ini murni: "ketukan ini mendarat di mana, dan apakah
 * sasarannya benar-benar bisa diketuk". Yang tinggal di komponen hanyalah
 * membaca `pointerdown`/`pointerup` dan menyusun rantai elemen — sesedikit
 * mungkin, karena apa pun yang hidup di dalam pendengar DOM tidak bisa diuji di
 * repo ini (tidak ada jsdom).
 *
 * **Yang tidak pernah dibaca berkas ini:** `textContent`, `value`, `innerText`,
 * atau isi elemen mana pun. Satu-satunya hal yang diambil dari DOM adalah
 * `data-uid` — nama yang kita tulis sendiri di markup — dan apakah elemennya
 * cocok dengan `PEMILIH_INTERAKTIF`. Itulah cara janji INV-9 dijaga di tingkat
 * kode, bukan di tingkat niat.
 */

/**
 * Elemen yang dianggap bisa diketuk.
 *
 * Daftar ini sengaja memuat `label`: opsi jawaban adalah
 * `<label><input type="radio">…</label>` (keputusan T-03), dan ketukan di
 * teksnya harus terbaca sebagai ketukan pada opsi, bukan ketukan mati.
 * `summary` masuk karena baris istilah dan "Rincian teknis" memakai `details`.
 */
export const PEMILIH_INTERAKTIF =
  'a[href], button, input, select, textarea, summary, label, [role="button"], [tabindex]';

/** Panjang `uid` paling besar yang diterima pengumpul (RQ-06). */
export const MAKS_UID = 64;

/** Gerak jari paling jauh yang masih dihitung ketukan, dalam piksel (D-8). */
export const GESER_MAKS = 10;

/** Satu simpul di rantai dari sasaran ketukan ke akar, dari dalam ke luar. */
export interface SimpulKetuk {
  /** Isi `data-uid`, atau `null` kalau simpul itu tidak punya. */
  uid: string | null;
  /** Cocok dengan `PEMILIH_INTERAKTIF`. */
  interaktif: boolean;
}

export interface Sasaran {
  uid: string | null;
  /** Ketukan mendarat di sesuatu yang tidak bisa diketuk (D-8). */
  mati: boolean;
}

/**
 * Siapa yang kena ketukan, dan apakah ketukan itu mati.
 *
 * Rantainya dibaca dari dalam ke luar dan berhenti di simpul pertama yang
 * membawa `data-uid`. Ketukan disebut **hidup** kalau ada elemen interaktif di
 * sepanjang jalan itu — termasuk simpul pemilik `uid` itu sendiri.
 *
 * Dua hal yang dijaga bentuk ini:
 *
 * - Ketukan di teks di dalam tombol kaki lembar berhenti di tombolnya
 *   (`kaki:…`), bukan di lembarnya — jadi ia hidup, dan yang tercatat adalah
 *   pintu yang memang ditekan.
 * - Ketukan di badan lembar melewati `<p>` dan `<div>` yang tidak interaktif
 *   lalu berhenti di `lembar:…`; tidak ada elemen interaktif di jalan itu, jadi
 *   ia **mati** dengan `uid` lembarnya. Itulah angka yang dicari D-1: berapa
 *   orang mengetuk angka tebal di dalam lembar, mengira ia pintu.
 */
export function bacaSasaran(rantai: readonly SimpulKetuk[]): Sasaran {
  let interaktif = false;
  for (const simpul of rantai) {
    if (simpul.interaktif) interaktif = true;
    if (simpul.uid !== null) {
      return { uid: simpul.uid.slice(0, MAKS_UID), mati: !interaktif };
    }
  }
  return { uid: null, mati: !interaktif };
}

/**
 * Ketukan, bukan guliran.
 *
 * Jari yang bergerak lebih dari `GESER_MAKS` piksel antara `pointerdown` dan
 * `pointerup` sedang menggulir; mencatatnya sebagai ketukan akan membuat setiap
 * guliran tampak seperti ketukan mati di tengah halaman, dan justru angka
 * "ketukan mati" itulah yang dipakai memutuskan sesuatu di milestone berikutnya.
 */
export function ketukanSah(
  awal: { x: number; y: number } | null,
  akhir: { x: number; y: number },
): boolean {
  // Tanpa `pointerdown` yang cocok (papan ketik, pembaca layar, pointer yang
  // ditangkap elemen lain) ketukan tetap dihitung: yang ditolak hanya gerak
  // yang benar-benar terukur.
  if (awal === null) return true;
  const dx = akhir.x - awal.x;
  const dy = akhir.y - awal.y;
  return Math.sqrt(dx * dx + dy * dy) <= GESER_MAKS;
}

/**
 * Posisi relatif terhadap viewport: 0–1, tiga desimal (D-8).
 *
 * Koordinat mutlak tidak pernah dikirim. Angka relatif menjawab pertanyaan yang
 * memang ditanyakan ("bagian layar mana yang diketuk") tanpa ikut memberi tahu
 * ukuran jendela maupun posisi halaman.
 */
export function rasioLayar(nilai: number, ukuran: number): number {
  if (!Number.isFinite(nilai) || !Number.isFinite(ukuran) || ukuran <= 0) return 0;
  const rasio = Math.min(1, Math.max(0, nilai / ukuran));
  return Math.round(rasio * 1000) / 1000;
}
