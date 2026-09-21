/**
 * M2a T-03 (RQ-03, D-3): jumlah saham beredar sebagai fungsi tanggal.
 *
 * Bukti wajibnya ada di bagian terakhir: rantai COCO yang membuat R7 generasi
 * pertama menolak laporan yang benar.
 */
import { describe, expect, it } from 'vitest';
import {
  JARAK_MAKS_HARI,
  bangunSahamBeredarPada,
  persenKonsisten,
  selangPenyebut,
  titikDariHarga,
} from './penyebut.ts';
import { r7PersenPerTanggal } from './aturan-v2.ts';
import { r7PersenDihitungUlang } from './aturan.ts';
import { harga, konteks, laporan } from './contoh.ts';
import type { TitikSahamBeredar } from './tipe.ts';

describe('titik penyebut dari baris harga', () => {
  it('menghitung nilai pasar dibagi harga tutup pada hari itu', () => {
    const titik = titikDariHarga([
      harga({ tanggal: '2026-01-05', tutup: 100, nilai_pasar: 100_000 }),
    ]);
    expect(titik).toEqual([
      { lembar: 1000, pada: '2026-01-05', sumber: 'nilai pasar dibagi harga tutup 2026-01-05' },
    ]);
  });

  it('membuang baris cacat lebih dulu, bukan sesudah ikut menghitung', () => {
    const titik = titikDariHarga([
      harga({ tanggal: '2026-01-06', tutup: 0, nilai_pasar: 100_000 }),
      harga({ tanggal: '2026-01-07', tutup: 100, nilai_pasar: 0 }),
      harga({ tanggal: '2026-01-08', tutup: 100, nilai_pasar: 100_000, buka_kosong: true }),
    ]);
    expect(titik).toEqual([]);
  });
});

describe('sahamBeredarPada — titik terdekat dalam jarak yang ditentukan', () => {
  const titik: TitikSahamBeredar[] = [
    { lembar: 1_000, pada: '2026-01-05', sumber: 'a' },
    { lembar: 2_000, pada: '2026-01-20', sumber: 'b' },
  ];
  const cari = bangunSahamBeredarPada(titik);

  it('menjawab tanggal yang persis ada', () => {
    expect(cari('2026-01-05')?.lembar).toBe(1000);
    expect(cari('2026-01-20')?.lembar).toBe(2000);
  });

  it('menjawab dengan titik terdekat di dalam jendela', () => {
    expect(cari('2026-01-08')?.lembar).toBe(1000);
    expect(cari('2026-01-18')?.lembar).toBe(2000);
  });

  it('menolak menjawab kalau tidak ada titik di dalam jendela', () => {
    expect(JARAK_MAKS_HARI).toBe(7);
    // 2026-01-13 berjarak 8 hari dari 05 dan 7 hari dari 20 -> masih terjawab
    expect(cari('2026-01-13')?.lembar).toBe(2000);
    // 2026-01-12 berjarak 7 dari 05 dan 8 dari 20 -> terjawab yang 05
    expect(cari('2026-01-12')?.lembar).toBe(1000);
    // 2025-12-01 jauh dari keduanya
    expect(cari('2025-12-01')).toBeNull();
  });

  it('memutus seri dengan urutan tertulis, bukan urutan masukan', () => {
    const seri = bangunSahamBeredarPada([
      { lembar: 9, pada: '2026-01-12', sumber: 'z' },
      { lembar: 7, pada: '2026-01-08', sumber: 'a' },
    ]);
    // 2026-01-10 berjarak 2 hari dari keduanya; yang tanggalnya lebih awal menang
    expect(seri('2026-01-10')?.pada).toBe('2026-01-08');
  });
});

describe('INV-D — ambang tanpa ketergantungan galat titik mengambang', () => {
  it('memakai ketelitian medan, bukan ketelitian nilai', () => {
    // 22.7 dan 22.70 adalah nilai yang sama; selangnya harus sama juga.
    const a = selangPenyebut(227_000, 22.7);
    const b = selangPenyebut(227_000, 22.7, 2);
    expect(a).toEqual(b);
  });

  it('memutus tepat di tepi selang dengan bilangan bulat', () => {
    // 44,69% dari 456.716.151 lembar: penyebut yang konsisten ada di
    // 1.021.850.657 .. 1.022.079.335 (uji lawan 4).
    expect(persenKonsisten(456_716_151, 1_021_850_657, 44.69)).toBe(true);
    expect(persenKonsisten(456_716_151, 1_022_079_335, 44.69)).toBe(true);
    expect(persenKonsisten(456_716_151, 1_021_850_656, 44.69)).toBe(false);
    expect(persenKonsisten(456_716_151, 1_022_079_336, 44.69)).toBe(false);
  });

  it('tetap tepat untuk angka yang melewati batas ketelitian pecahan', () => {
    // 50% dari 10 miliar lembar: perkalian mentahnya melampaui 2^53.
    expect(persenKonsisten(5_000_000_000, 10_000_000_000, 50)).toBe(true);
    expect(persenKonsisten(5_000_000_000, 10_010_000_000, 50)).toBe(false);
  });

  it('tidak memutus merah atau hijau dengan galat titik mengambang', () => {
    // Ketiganya duduk **tepat** di tepi selang: 8.934.450 / 889.000.000 adalah
    // persis 1,005% (tepi bawah selang untuk 1,01%), dan seterusnya. Dihitung
    // sebagai pecahan, `(lembar / beredar) * 100 * 1000` jatuh sedikit di bawah
    // tepinya dan ketiganya menjadi merah palsu; dihitung sebagai bilangan
    // bulat, ketiganya hijau - dan itulah yang benar.
    expect(persenKonsisten(8_934_450, 889_000_000, 1.01)).toBe(true);
    expect(persenKonsisten(9_023_350, 889_000_000, 1.02)).toBe(true);
    expect(persenKonsisten(10_801_350, 889_000_000, 1.22)).toBe(true);
    // Satu lembar di luar tepi tetap merah: ambangnya tajam, bukan longgar.
    expect(persenKonsisten(8_934_405, 889_000_000, 1.01)).toBe(false);
  });

  it('menolak persen nol atau kosong alih-alih membagi dengan nol', () => {
    expect(persenKonsisten(100, 1000, 0)).toBe(false);
    expect(selangPenyebut(100, 0)).toBeNull();
  });
});

/**
 * Bukti wajib D-3, memakai empat sisi rantai COCO yang angkanya diterbitkan di
 * `.context/aturan-R-uji-lawan.md` 4.
 *
 * Catatan cakupan: `.cache/sectors/` **tidak memuat satu pun laporan
 * kepemilikan COCO** (yang ada hanya `COCO-filings-sebelum.json` yang kosong),
 * jadi keempat sisi ini disusun ulang dari angka yang tertulis di dokumen uji
 * lawan, bukan dibaca dari gudang. Yang dibuktikan di sini adalah
 * **mekanismenya**, dengan angka yang bisa diperiksa ulang oleh siapa pun yang
 * membaca dokumen itu.
 */
describe('bukti COCO — penyebut satu angka menolak laporan yang benar', () => {
  const laporanCoco = [
    laporan({
      laporan_id: 'coco-1',
      simbol: 'COCO',
      pemegang: 'Pengendali',
      dilaporkan_pada: '2025-09-30T19:55:00',
      sebelum: 543_842_937,
      persen_sebelum: 61.12,
      sesudah: 526_288_237,
      persen_sesudah: 57.86,
      transaksi: [],
    }),
    laporan({
      laporan_id: 'coco-2',
      simbol: 'COCO',
      pemegang: 'Pengendali',
      dilaporkan_pada: '2025-10-08T19:58:00',
      sebelum: 459_637_051,
      persen_sebelum: 45.33,
      sesudah: 456_716_151,
      persen_sesudah: 44.69,
      transaksi: [],
    }),
  ];

  /** Angka yang dipakai mesin generasi pertama: keadaan 2026, sesudah dua rights issue. */
  const SATU_ANGKA_2026 = 14_237_823_696;
  /** Penyebut yang berlaku sampai 30 Sep 2025, dari `financials` 2025 dibagi empat. */
  const PENYEBUT_30_SEP = 889_863_981;

  it('sebelum perbaikan: satu angka tanpa tanggal menolak keempat sisi', () => {
    const hasil = r7PersenDihitungUlang(
      konteks({ laporan: laporanCoco, saham_beredar: SATU_ANGKA_2026 }),
    );
    expect(hasil.hitungan.diperiksa).toBe(4);
    expect(hasil.hitungan.merah).toBe(4);
    expect(hasil.hitungan.hijau).toBe(0);
  });

  it('sesudah perbaikan: penyebut bertanggal memisahkan yang benar dari yang salah', () => {
    const hasil = r7PersenPerTanggal(
      konteks({
        laporan: laporanCoco,
        sahamBeredarPada: bangunSahamBeredarPada([
          { lembar: PENYEBUT_30_SEP, pada: '2025-09-30', sumber: 'financials 2025 dibagi empat' },
        ]),
      }),
    );
    expect(hasil.hitungan.diperiksa).toBe(4);
    // Sisi 30 Sep 19:55 "sebelum": 543.842.937 / 889.863.981 = 61,12% -> HIJAU.
    expect(hasil.hitungan.hijau).toBe(1);
    // Sisi 30 Sep 19:55 "sesudah": laporan menulis 57,86%, hitung ulang 59,14% -> MERAH.
    expect(hasil.hitungan.merah).toBe(1);
    // Laporan 8 Okt berjarak delapan hari dari satu-satunya titik penyebut:
    // di luar jendela, jadi TIDAK_LENGKAP - bukan merah.
    expect(hasil.hitungan.tidak_lengkap).toBe(2);
    expect(hasil.hitungan.alasan_dilewati).toContain(
      'Tidak ada titik jumlah saham beredar yang berlaku pada tanggal laporan.',
    );
  });

  it('menyebut penyebut mana yang dipakai dan selang yang akan cocok', () => {
    const hasil = r7PersenPerTanggal(
      konteks({
        laporan: laporanCoco,
        sahamBeredarPada: bangunSahamBeredarPada([
          { lembar: PENYEBUT_30_SEP, pada: '2025-09-30', sumber: 'financials 2025 dibagi empat' },
        ]),
      }),
    );
    const satu = hasil.temuan[0];
    expect(satu?.ringkasan).toContain('889.863.981 saham beredar yang berlaku 2025-09-30');
    expect(satu?.ringkasan).toContain('penyebutnya antara');
    expect(satu?.rujukan).toContain('penyebut: financials 2025 dibagi empat');
  });
});
