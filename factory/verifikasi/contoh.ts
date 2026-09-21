/**
 * Bahan uji untuk aturan verifikasi.
 *
 * Dua jenis:
 * 1. `laporan()` dan `konteks()` — pembuat laporan kecil untuk menguji satu aturan.
 *    Angkanya diambil dari contoh pelanggaran nyata yang ditulis di
 *    `docs/aturan-verifikasi.md` (KRYA, COCO, LPLI, RLCO), bukan karangan baru.
 * 2. `bersihkanRantai()` — fixture negatif: rantai DADA yang sama setelah set
 *    laporan ganda dibuang dan saldonya disambung ulang. Rantai ini tidak boleh
 *    memicu satu temuan pun.
 */
import type {
  BarisHarga,
  DataEmiten,
  KonteksGudang,
  KonteksVerifikasi,
  Laporan,
  Suspensi,
} from './tipe.ts';
import { cariBlokUlangan } from './aturan.ts';
import { SAHAM_BEREDAR_DADA } from './rantai-dada.ts';

/** Laporan netral yang tidak melanggar aturan apa pun; ubah satu field untuk menguji satu aturan. */
export function laporan(ubah: Partial<Laporan> = {}): Laporan {
  const dasar: Laporan = {
    laporan_id: 'contoh-1',
    simbol: 'DADA.JK',
    pemegang: 'Karya Permata Inovasi Indonesia',
    dilaporkan_pada: '2025-08-25T17:00:51',
    jenis: 'jual',
    jumlah: 100_000_000,
    harga: 12,
    sebelum: 4_792_137_600,
    sesudah: 4_692_137_600,
    persen_sebelum: 64.48,
    persen_sesudah: 63.13,
    transaksi: [{ tanggal: '2025-08-07', jenis: 'jual', harga: 12, jumlah: 100_000_000 }],
    teks: '',
    berkas: 'contoh-1.pdf',
    sumber_dokumen: 'https://contoh/LK-07082025-0001-00.pdf',
    jenis_mentah: 'sell',
    berkas_cache: 'contoh-filings.json',
  };
  return { ...dasar, ...ubah };
}

export function konteks(ubah: Partial<KonteksVerifikasi> = {}): KonteksVerifikasi {
  const dasar: KonteksVerifikasi = {
    simbol: 'DADA.JK',
    laporan: [],
    harga: [],
    suspensi: [],
    saham_beredar: null,
    potret: null,
    tanda_repo: {},
  };
  return { ...dasar, ...ubah };
}

/** Konteks yang hanya berisi rantai laporan: aturan harga, potret, dan repo dilewati dengan alasan. */
export function konteksRantai(daftar: Laporan[]): KonteksVerifikasi {
  return konteks({ laporan: daftar, saham_beredar: SAHAM_BEREDAR_DADA });
}

export function harga(ubah: Partial<BarisHarga> = {}): BarisHarga {
  const dasar: BarisHarga = {
    tanggal: '2025-08-07',
    buka: 12,
    tertinggi: 12,
    terendah: 12,
    tutup: 12,
    volume: 111_731_200,
    nilai_pasar: 89_178_369_600,
  };
  return { ...dasar, ...ubah };
}

export function suspensi(ubah: Partial<Suspensi> = {}): Suspensi {
  return { tanggal: '2025-10-09', alasan: 'cooling down', ...ubah };
}

/**
 * Data satu emiten gudang yang seluruhnya kosong; ubah satu medan untuk menguji
 * satu aturan.
 *
 * Ditulis di sini, sekali, karena `DataEmiten` bertambah medan tiap milestone:
 * lima berkas tes M2a masing-masing menyalin bentuknya sendiri, dan tiap medan
 * baru memecahkan kelimanya. Satu pembuat bersama berarti satu tempat yang
 * harus diubah.
 */
export function dataEmiten(ubah: Partial<DataEmiten> = {}): DataEmiten {
  const dasar: DataEmiten = {
    simbol: 'AA',
    laporan: [],
    harga: [],
    suspensi: [],
    berkas_laporan: [],
    stock_split: [],
    right_issue: [],
    bonus: [],
    dividen: [],
    rups: [],
    all_time_price: [],
    pemegang: [],
    saham_tahunan: [],
    keuangan_tahunan: [],
    eps_tahunan: [],
    rasio: [],
    ringkasan_pasar: null,
    berkas: [],
  };
  return { ...dasar, ...ubah };
}

/**
 * Konteks gudang dari `dataEmiten`, dengan `sahamBeredarPada` yang sungguh
 * dibangun dari titik-titik bertanggal — sama seperti `konteksEmiten` di
 * produksi, supaya tes tidak diam-diam menguji mesin yang berbeda.
 */
export function konteksGudang(ubah: Partial<DataEmiten> = {}): KonteksGudang {
  const data = dataEmiten(ubah);
  return {
    ...konteks({
      simbol: data.simbol,
      laporan: data.laporan,
      harga: data.harga,
      suspensi: data.suspensi,
    }),
    data,
    berkas_kosong: [],
  };
}

/**
 * Buang set laporan ganda, lalu sambung ulang saldo rantai dari laporan pertama
 * dan hitung ulang persentasenya. Hasilnya adalah rantai yang konsisten dengan
 * dirinya sendiri: fixture negatif untuk R1, R2, R3, dan R7.
 */
export function bersihkanRantai(
  daftar: Laporan[],
  beredar: number = SAHAM_BEREDAR_DADA,
): Laporan[] {
  const dibuang = new Set<string>();
  for (const blok of cariBlokUlangan(daftar)) {
    for (const l of blok.salinan) dibuang.add(l.laporan_id);
  }
  const tersisa = [...daftar]
    .filter((l) => !dibuang.has(l.laporan_id))
    .sort((a, b) => {
      const selisih = a.dilaporkan_pada.localeCompare(b.dilaporkan_pada);
      return selisih !== 0 ? selisih : a.laporan_id.localeCompare(b.laporan_id);
    });

  const persen = (lembar: number): number => Number(((lembar / beredar) * 100).toFixed(3));
  let saldo = tersisa[0]?.sebelum ?? 0;
  return tersisa.map((l) => {
    const sebelum = saldo;
    const sesudah = sebelum + (l.jenis === 'jual' ? -l.jumlah : l.jumlah);
    saldo = sesudah;
    return {
      ...l,
      sebelum,
      sesudah,
      persen_sebelum: persen(sebelum),
      persen_sesudah: persen(sesudah),
    };
  });
}
