/**
 * Jumlah saham beredar sebagai **fungsi tanggal** (M2a D-3).
 *
 * Kenapa ini ada: jumlah saham beredar bukan tetapan. Ia berubah karena rights
 * issue, private placement, saham bonus, dan pembelian kembali. Mesin generasi
 * pertama memakai satu angka tanpa tanggal — `market_cap / close` terbaru — dan
 * memakainya untuk laporan setahun sebelumnya. Akibatnya terukur: R7 menolak
 * **22 dari 22** sisi laporan COCO, bukan karena datanya salah, melainkan
 * karena penyebutnya diambil dari tanggal yang salah.
 *
 * Aturan yang dipegang di sini:
 * - tiap titik penyebut membawa **tanggal berlakunya**;
 * - permintaan untuk satu tanggal dijawab titik **terdekat** yang jaraknya
 *   tidak lebih dari `JARAK_MAKS_HARI`;
 * - tidak ada titik dalam jarak itu berarti **`TIDAK_LENGKAP`**, bukan merah.
 */
import type { BarisHarga, DataEmiten, TitikSahamBeredar } from './tipe.ts';

/**
 * Jarak terjauh (hari kalender) antara tanggal yang ditanya dan titik penyebut
 * yang boleh menjawabnya.
 *
 * Tujuh hari, bukan lebih: penyebut tersirat rantai COCO naik dari ~890 juta
 * (30 Sep 2025) ke ~1.022 juta (8 Okt 2025) — 15% dalam sembilan hari. Jendela
 * yang lebih lebar akan menjawab dengan angka yang sudah salah, dan itu persis
 * kesalahan yang aturan ini ada untuk mencegahnya. Akhir pekan dan libur bursa
 * tertutup karena tujuh hari kalender selalu memuat lima hari bursa.
 */
export const JARAK_MAKS_HARI = 7;

/** Ketelitian medan persen di laporan: dua angka desimal, ditetapkan, bukan ditebak. */
export const DESIMAL_PERSEN = 2;

const SEHARI_MS = 24 * 60 * 60 * 1000;

function keHari(tanggal: string): number | null {
  const waktu = Date.parse(`${tanggal.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(waktu) ? waktu / SEHARI_MS : null;
}

/**
 * Titik penyebut dari baris harga: `nilai pasar / harga tutup` **pada hari itu**.
 *
 * Baris cacat dibuang lebih dulu: harga tutup nol, nilai pasar nol, atau medan
 * `open` kosong (16 baris di gudang begini; 7 di antaranya `high` dan `low`
 * juga nol).
 */
export function titikDariHarga(harga: BarisHarga[]): TitikSahamBeredar[] {
  const titik: TitikSahamBeredar[] = [];
  for (const h of harga) {
    if (h.buka_kosong === true) continue;
    if (h.tutup <= 0 || h.nilai_pasar <= 0) continue;
    titik.push({
      lembar: Math.round(h.nilai_pasar / h.tutup),
      pada: h.tanggal,
      sumber: `nilai pasar dibagi harga tutup ${h.tanggal}`,
    });
  }
  return titik;
}

/**
 * Kumpulkan semua titik penyebut bertanggal satu emiten.
 *
 * Sumber yang **tidak** punya tanggal berlaku sengaja tidak masuk: jumlah
 * `share_amount` di `ownership` adalah potret tanpa tanggal, dan
 * membandingkan besaran yang diukur pada tanggal yang tidak diketahui adalah
 * cacat yang membuat R21 pasti merah untuk setiap emiten yang menerbitkan
 * saham.
 */
export function titikPenyebut(data: DataEmiten): TitikSahamBeredar[] {
  const titik = titikDariHarga(data.harga);

  if (data.ringkasan_pasar !== null) {
    const { nilai_pasar, harga_tutup, pada } = data.ringkasan_pasar;
    if (harga_tutup > 0 && nilai_pasar > 0) {
      titik.push({
        lembar: Math.round(nilai_pasar / harga_tutup),
        pada,
        sumber: `nilai pasar dibagi harga tutup terakhir di ringkasan (${pada})`,
      });
    }
  }

  for (const tahun of data.saham_tahunan) {
    // Tahun buku berakhir 31 Desember; itulah tanggal berlakunya.
    titik.push({
      lembar: tahun.lembar,
      pada: `${String(tahun.tahun)}-12-31`,
      sumber: `outstanding_shares tahun buku ${String(tahun.tahun)}`,
    });
  }

  return urutkanTitik(titik);
}

/** Urutan tetap: tanggal, lalu jumlah lembar, lalu sumber. Tidak ada seri yang tersisa. */
export function urutkanTitik(titik: TitikSahamBeredar[]): TitikSahamBeredar[] {
  return [...titik].sort(
    (a, b) =>
      a.pada.localeCompare(b.pada) || a.lembar - b.lembar || a.sumber.localeCompare(b.sumber),
  );
}

/**
 * Bangun fungsi `sahamBeredarPada` dari sekumpulan titik bertanggal.
 *
 * Titik yang dipilih adalah yang **jaraknya terkecil** ke tanggal yang ditanya.
 * Kalau ada dua yang sama dekat, yang tanggalnya lebih awal menang, lalu yang
 * lembarnya lebih kecil, lalu yang sumbernya lebih dulu menurut abjad —
 * urutan yang sama di setiap mesin (INV-C).
 */
export function bangunSahamBeredarPada(
  titik: TitikSahamBeredar[],
  jarakMaks: number = JARAK_MAKS_HARI,
): (tanggal: string) => TitikSahamBeredar | null {
  const terurut = urutkanTitik(titik);
  const hari = terurut.map((t) => keHari(t.pada));
  return (tanggal: string): TitikSahamBeredar | null => {
    const diminta = keHari(tanggal);
    if (diminta === null) return null;
    let terbaik: TitikSahamBeredar | null = null;
    let jarakTerbaik = Number.POSITIVE_INFINITY;
    for (const [i, t] of terurut.entries()) {
      const h = hari[i];
      if (h === undefined || h === null) continue;
      const jarak = Math.abs(h - diminta);
      if (jarak > jarakMaks) continue;
      if (jarak < jarakTerbaik) {
        jarakTerbaik = jarak;
        terbaik = t;
      }
    }
    return terbaik;
  };
}

/**
 * Selang jumlah saham beredar yang konsisten dengan satu persen yang dilaporkan.
 *
 * Persen ditulis dengan ketelitian **medan** (dua desimal, tetap), jadi
 * `44.69` berarti nilai sebenarnya ada di `[44,685; 44,695)`. Ketelitian
 * sengaja tidak diturunkan dari nilainya: `22.7` yang kehilangan nol
 * berekornya saat JSON diurai akan memberi selang sepuluh kali lebih longgar
 * daripada `22.70`, dan 43 sisi persen di gudang ditulis dengan satu desimal
 * atau kurang.
 */
export function selangPenyebut(
  lembar: number,
  persen: number,
  desimal: number = DESIMAL_PERSEN,
): { bawah: number; atas: number } | null {
  if (!Number.isFinite(persen) || persen <= 0 || lembar <= 0) return null;
  const skala = 10 ** (desimal + 1);
  const q = Math.round(persen * skala);
  if (q <= 5) return null;
  return {
    bawah: (lembar * 100 * skala) / (q + 5),
    atas: (lembar * 100 * skala) / (q - 5),
  };
}

/**
 * Apakah `beredar` konsisten dengan `lembar` lembar yang dilaporkan sebagai
 * `persen` persen?
 *
 * Dibandingkan sebagai **bilangan bulat besar**, bukan pecahan: tidak ada
 * merah atau hijau di sini yang bergantung pada galat titik mengambang
 * (INV-D). Syaratnya
 *
 *     (q - 5) * beredar  <=  lembar * 100 * skala  <=  (q + 5) * beredar
 *
 * dengan `q = persen * skala` dibulatkan ke bilangan bulat.
 */
export function persenKonsisten(
  lembar: number,
  beredar: number,
  persen: number,
  desimal: number = DESIMAL_PERSEN,
): boolean {
  if (!Number.isFinite(persen) || persen <= 0 || beredar <= 0 || lembar < 0) return false;
  const skala = 10 ** (desimal + 1);
  const q = Math.round(persen * skala);
  if (q <= 5) return false;
  const kiri = BigInt(q - 5) * BigInt(Math.round(beredar));
  const tengah = BigInt(Math.round(lembar)) * BigInt(100 * skala);
  const kanan = BigInt(q + 5) * BigInt(Math.round(beredar));
  return kiri <= tengah && tengah <= kanan;
}
