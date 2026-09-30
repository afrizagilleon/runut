/**
 * Sorotan pemandu (M3.16) — hitungan murni di balik lapisan redup.
 *
 * Masukan pemilik 1 Okt: cincin tipis saja tidak cukup menarik mata di layar
 * ponsel yang ramai; sisa layar harus diredupkan dan panel panduan tetap
 * terlihat. Komponennya (`Sorotan.tsx`) hanya mengukur dan merender; semua
 * keputusan "di mana lubangnya", "bentuk klipnya", dan "siapa yang
 * disembunyikan dari pembaca layar" ada di sini dan dites di
 * `sorotan.test.ts` (repo ini tanpa jsdom — M3.1 D-5).
 *
 * Bentuknya satu elemen, bukan empat potongan: satu bidang redup setinggi
 * DOKUMEN dengan `clip-path: polygon(evenodd, …)` yang melubanginya.
 *
 * - Satu elemen = tanpa garis sambungan antar-potongan pada piksel pecahan.
 * - `clip-path` juga memotong uji-kena (hit-testing): ketukan di dalam lubang
 *   jatuh ke elemen di bawahnya, ketukan di luar ditangkap lapisan.
 * - Koordinat DOKUMEN (bukan jendela): lapisannya ikut tergulir bersama isi
 *   halaman di kompositor, jadi lubang tidak tertinggal satu frame pun saat
 *   digulir — tanpa pendengar `scroll` sama sekali. Yang perlu diukur ulang
 *   hanya perubahan tata letak (ubah ukuran, putar, kartu dibuka).
 * - Jumlah titik poligon selalu sama, jadi peralihan antar-langkah bisa
 *   dihaluskan dengan `transition: clip-path`.
 *
 * Tanpa `backdrop-filter`/buram: `npm run periksa:desain` menolaknya (KABUR)
 * dan `docs/desain.md` melarang efek kaca; buram juga mahal di ponsel lama.
 */

/** Kotak dalam piksel CSS; koordinat dokumen kecuali disebut lain. */
export interface Kotak {
  kiri: number;
  atas: number;
  kanan: number;
  bawah: number;
}

/**
 * Jarak lubang dari tepi sasaran. Cincin `.disorot` berjarak 4 px dan tebal
 * 2 px, jadi 8 px memuat cincinnya utuh di dalam bagian yang terang.
 */
export const JARAK_LUBANG = 8;

/**
 * Lubang untuk satu langkah: gabungan kotak semua sasaran (mis. judul
 * pertanyaan + pilihan), diperlebar `jarak`, dibulatkan KE LUAR (lubang tidak
 * pernah memotong sasarannya), lalu dipotong ke batas dokumen — tidak pernah
 * negatif dan tidak pernah lebih lebar dari jendela (tanpa gulir mendatar).
 *
 * `null` bila tidak ada sasaran yang punya luas (belum dirender, atau
 * tersembunyi): lapisannya tetap redup penuh, panelnya tetap bisa diketuk.
 */
export function lubangDari(
  kotak: readonly Kotak[],
  batas: { lebar: number; tinggi: number },
  jarak: number = JARAK_LUBANG,
): Kotak | null {
  const berluas = kotak.filter((k) => k.kanan > k.kiri && k.bawah > k.atas);
  if (berluas.length === 0) return null;
  const kiri = Math.floor(Math.min(...berluas.map((k) => k.kiri)) - jarak);
  const atas = Math.floor(Math.min(...berluas.map((k) => k.atas)) - jarak);
  const kanan = Math.ceil(Math.max(...berluas.map((k) => k.kanan)) + jarak);
  const bawah = Math.ceil(Math.max(...berluas.map((k) => k.bawah)) + jarak);
  return {
    kiri: Math.max(0, kiri),
    atas: Math.max(0, atas),
    kanan: Math.min(batas.lebar, kanan),
    bawah: Math.min(batas.tinggi, bawah),
  };
}

const px = (n: number): string => `${String(n)}px`;

/**
 * `clip-path` lapisan: kotak luar penuh (persen, jadi ikut tinggi lapisan),
 * lalu lubangnya — `evenodd` membuat bagian yang tumpang-tindih kosong.
 * Selalu sepuluh titik, supaya dua langkah bisa diinterpolasi.
 */
export function klipSelubung(l: Kotak): string {
  const luar = '0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px';
  const a = `${px(l.kiri)} ${px(l.atas)}`;
  const dalam = [a, `${px(l.kanan)} ${px(l.atas)}`, `${px(l.kanan)} ${px(l.bawah)}`, `${px(l.kiri)} ${px(l.bawah)}`, a];
  return `polygon(evenodd, ${luar}, ${dalam.join(', ')})`;
}

/** Bagian pohon DOM yang dibutuhkan `simpulDisembunyikan` (dites dengan pohon tiruan). */
export interface Simpul {
  readonly parentElement: Simpul | null;
  readonly children: ArrayLike<Simpul>;
}

/**
 * Simpul yang disembunyikan dari pembaca layar dan papan ketik (`inert` +
 * `aria-hidden`) selama sorotan tampil: setiap saudara di sepanjang jalan dari
 * `simpan` (panel, lapisan, sasaran) naik ke `akar`, yang tidak memuat satu
 * pun `simpan`. Pola "sembunyikan yang lain" dialog modal, dengan satu beda:
 * sasaran di dalam lubang TETAP hidup — kartu masih bisa dibuka, pilihan
 * masih bisa dipilih.
 *
 * Isi `simpan` sendiri tidak pernah disentuh; `akar` dan leluhur `simpan`
 * juga tidak (menyembunyikan leluhur berarti menyembunyikan panelnya).
 */
export function simpulDisembunyikan<S extends Simpul>(akar: S, simpan: readonly S[]): S[] {
  const jalan = new Set<Simpul>();
  for (const s of simpan) {
    let kini: Simpul | null = s;
    while (kini !== null) {
      jalan.add(kini);
      if (kini === akar) break;
      kini = kini.parentElement;
    }
  }
  const utuh = new Set<Simpul>(simpan);
  const keluar: S[] = [];
  const telusuri = (induk: Simpul): void => {
    for (const anak of Array.from(induk.children)) {
      if (!jalan.has(anak)) keluar.push(anak as S);
      else if (!utuh.has(anak)) telusuri(anak);
    }
  };
  if (jalan.has(akar)) telusuri(akar);
  return keluar;
}
