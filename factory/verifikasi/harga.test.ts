/**
 * M2a T-07 (RQ-04): aturan harga — R17B, R18a, R19a, R19b.
 *
 * Tiga baris "GAGAL" uji lawan 7 yang menyangkut aturan harga ditulis di sini
 * sebagai tes yang kini lulus: harga Rp170 pada hari Rp240-Rp256, satu baris
 * `low=0/high=0` yang membuat Rp33 jadi hijau palsu, dan runtun lima hari yang
 * pecah karena satu hari bergerak Rp1.
 */
import { describe, expect, it } from 'vitest';
import {
  DATAR_LUNAK_MINIMAL,
  JENDELA_LUNAK,
  RUNTUN_MINIMAL,
  barisHargaCacat,
  cariRuntunDatar,
  hariDatar,
  r17bHargaHariTransaksi,
  r18aVolumeNolTanpaSuspensi,
  r19aDatarTanpaVolume,
  kalimatRuntun,
  r19bRuntunDatar,
} from './aturan-v2.ts';
import { harga, konteks, laporan, suspensi } from './contoh.ts';
import type { BarisHarga, Transaksi } from './tipe.ts';

const bar = (tanggal: string, terendah: number, tertinggi: number, volume = 1000): BarisHarga =>
  harga({ tanggal, terendah, tertinggi, buka: terendah, tutup: tertinggi, volume });

const datar = (tanggal: string, nilai: number, volume = 0): BarisHarga =>
  harga({ tanggal, buka: nilai, tertinggi: nilai, terendah: nilai, tutup: nilai, volume });

const beli = (tanggal: string, hargaButir: number | null, jumlah = 100): Transaksi => {
  const t: Transaksi = { tanggal, jenis: 'beli', harga: hargaButir ?? 0, jumlah };
  if (hargaButir === null) t.harga_kosong = true;
  return t;
};

// --- R17B --------------------------------------------------------------------

describe('R17B — harga laporan terhadap rentang hari transaksinya', () => {
  it('hijau kalau harga butir ada di dalam rentang hari itu', () => {
    const h = r17bHargaHariTransaksi(
      konteks({
        laporan: [laporan({ transaksi: [beli('2025-10-24', 207)] })],
        harga: [bar('2025-10-24', 206, 208)],
      }),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(0);
  });

  it('uji lawan 7 GAGAL: harga Rp170 pada hari yang bergerak Rp240-Rp256 kini merah', () => {
    const h = r17bHargaHariTransaksi(
      konteks({
        laporan: [laporan({ transaksi: [beli('2025-10-24', 170)] })],
        harga: [bar('2025-10-24', 240, 256)],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('Rp170');
    expect(h.temuan[0]?.ringkasan).toContain('Rp240-Rp256');
  });

  it('uji lawan 7 GAGAL: satu baris low=0/high=0 tidak lagi membuat Rp33 jadi hijau palsu', () => {
    const cacat: BarisHarga = harga({
      tanggal: '2025-10-24',
      buka: 0,
      tertinggi: 0,
      terendah: 0,
      tutup: 0,
      buka_kosong: true,
    });
    expect(barisHargaCacat(cacat)).toBe(true);
    const h = r17bHargaHariTransaksi(
      konteks({
        laporan: [laporan({ transaksi: [beli('2025-10-24', 33)] })],
        // Baris cacat untuk tanggal yang sama; baris sehat ada di hari lain.
        harga: [cacat, bar('2025-10-23', 240, 256)],
      }),
    );
    // Baris cacat dibuang lebih dulu, jadi tanggalnya tidak punya rentang sama
    // sekali: TIDAK_LENGKAP, bukan hijau.
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.hijau).toBe(0);
    expect(h.hitungan.tidak_lengkap).toBe(1);
  });

  it('TIDAK_LENGKAP untuk tanggal transaksi yang tidak ada di deret harga', () => {
    const h = r17bHargaHariTransaksi(
      konteks({
        laporan: [laporan({ transaksi: [beli('2026-01-13', 75)] })],
        harga: [bar('2026-01-09', 70, 80)],
      }),
    );
    expect(h.hitungan.tidak_lengkap).toBe(1);
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.alasan_dilewati).toContain(
      'Tanggal transaksi tidak ada di deret harga harian, atau baris harganya cacat.',
    );
  });

  it('tidak memakai medan harga gabungan, dan mengatakan kenapa', () => {
    // Pola ULTJ: tiga butir berharga di dalam rentang, dua butir tanpa harga.
    const h = r17bHargaHariTransaksi(
      konteks({
        laporan: [
          laporan({
            harga: 910,
            transaksi: [
              beli('2026-01-13', 1445, 308_200),
              beli('2026-01-13', 1440, 52_400),
              beli('2026-01-13', 1450, 596_600),
              beli('2026-01-13', null, 400_000),
              beli('2026-01-13', null, 165_500),
            ],
          }),
        ],
        harga: [bar('2026-01-13', 1380, 1570)],
      }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.tidak_lengkap).toBe(2);
    const catatan = h.temuan.find((t) => t.keparahan === 'catatan');
    expect(catatan?.ringkasan).toContain('rata-rata tertimbang');
    expect(catatan?.angka[0]?.nilai).toBe(2);
  });

  it('TIDAK_LENGKAP, bukan merah, untuk laporan bertanda repo', () => {
    const h = r17bHargaHariTransaksi(
      konteks({
        laporan: [laporan({ laporan_id: 'repo-1', transaksi: [beli('2025-10-24', 170)] })],
        harga: [bar('2025-10-24', 240, 256)],
        tanda_repo: { 'repo-1': true },
      }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.tidak_lengkap).toBe(1);
  });
});

// --- R18a --------------------------------------------------------------------

describe('R18a — hari bervolume nol tanpa baris suspensi', () => {
  it('TIDAK_LENGKAP, bukan merah: daftar suspensi hanya mencatat hari mulai', () => {
    const h = r18aVolumeNolTanpaSuspensi(
      konteks({ harga: [datar('2025-12-22', 100), datar('2025-12-23', 100)], suspensi: [] }),
    );
    expect(h.hitungan.diperiksa).toBe(2);
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.tidak_lengkap).toBe(2);
    expect(h.temuan[0]?.keparahan).toBe('catatan');
  });

  it('hijau untuk hari bervolume nol yang memang ada di daftar suspensi', () => {
    const h = r18aVolumeNolTanpaSuspensi(
      konteks({
        harga: [datar('2025-10-09', 100)],
        suspensi: [suspensi({ tanggal: '2025-10-09' })],
      }),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.hijau).toBe(1);
    expect(h.hitungan.tidak_lengkap).toBe(0);
  });

  it('menghitung hari bervolume sebagai dilewati, bukan sebagai hijau yang tidak berarti', () => {
    const h = r18aVolumeNolTanpaSuspensi(
      konteks({ harga: [bar('2025-12-22', 90, 110), datar('2025-12-23', 100)] }),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.dilewati).toBe(1);
    expect(h.hitungan.alasan_dilewati[0]).toContain('volumenya tidak nol');
  });
});

// --- R19a / R19b -------------------------------------------------------------

describe('R19a — harga datar pada hari tanpa transaksi', () => {
  it('mengenali hari datar hanya kalau keempat harganya sama', () => {
    expect(hariDatar(datar('2025-12-23', 490))).toBe(true);
    expect(hariDatar(bar('2025-12-23', 489, 490))).toBe(false);
  });

  it('merah, berkeparahan peringatan, untuk hari datar bervolume nol', () => {
    const h = r19aDatarTanpaVolume(konteks({ harga: [datar('2025-12-23', 490, 0)] }));
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('bukan harga yang disepakati siapa pun');
  });

  it('hijau untuk hari datar yang volumenya tetap ada', () => {
    const h = r19aDatarTanpaVolume(konteks({ harga: [datar('2025-12-23', 490, 5000)] }));
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.hijau).toBe(1);
  });

  it('menghitung hari yang harganya bergerak sebagai dilewati', () => {
    const h = r19aDatarTanpaVolume(
      konteks({ harga: [datar('2025-12-23', 490, 0), bar('2025-12-24', 480, 500)] }),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.dilewati).toBe(1);
  });
});

describe('R19b — runtun hari datar', () => {
  const runtunDatar = (n: number, mulai = 5): BarisHarga[] =>
    Array.from({ length: n }, (_, i) => datar(`2026-01-${String(mulai + i).padStart(2, '0')}`, 100));

  it('melaporkan runtun tiga hari atau lebih', () => {
    expect(RUNTUN_MINIMAL).toBe(3);
    expect(cariRuntunDatar(runtunDatar(2))).toEqual([]);
    const tiga = cariRuntunDatar(runtunDatar(3));
    expect(tiga).toHaveLength(1);
    expect(tiga[0]?.panjang).toBe(3);
    expect(tiga[0]?.lunak).toBe(false);
  });

  it('uji lawan 7: runtun panjang yang pecah satu hari tetap terlihat lewat jendela lunak', () => {
    expect(JENDELA_LUNAK).toBe(10);
    expect(DATAR_LUNAK_MINIMAL).toBe(9);
    // Lima hari datar, satu hari bergerak Rp1, lalu lima hari datar lagi.
    // Runtun penuhnya jadi 5 + 5 -- keduanya masih di atas ambang -- tetapi
    // jendela lunak juga melihat 9 dari 10 hari datar di tengahnya.
    const jendela: BarisHarga[] = [
      ...runtunDatar(5, 5),
      bar('2026-01-10', 100, 101),
      ...runtunDatar(5, 11),
    ];
    const runtun = cariRuntunDatar(jendela);
    expect(runtun.filter((r) => !r.lunak)).toHaveLength(2);
    const lunak = runtun.filter((r) => r.lunak);
    expect(lunak.length).toBeGreaterThan(0);
    expect(lunak[0]?.panjang).toBeGreaterThanOrEqual(DATAR_LUNAK_MINIMAL);
  });

  it('BATAS YANG DILAPORKAN: runtun 2 + 2 memang tidak terselamatkan ambang 9 dari 10', () => {
    // Uji lawan 7 menyebut "5 hari datar, satu hari bergerak di tengah ->
    // pecah 2 + 2 dan keduanya hilang" sebagai alasan runtun lunak ada, lalu
    // menetapkan ambangnya "90% hari datar dalam jendela 10 hari bursa".
    // Kedua hal itu tidak bisa berlaku sekaligus: 4 hari datar dari 5 adalah
    // 80%, dan untuk mencapai 9 dari 10 hari datar, runtun penuh terpanjangnya
    // pasti sudah >= 5 hari. Ambang ditulis apa adanya seperti yang diputuskan;
    // batasnya dilaporkan di sini, bukan disembunyikan dengan mengubah angka
    // diam-diam.
    const pecah: BarisHarga[] = [
      ...runtunDatar(2, 5),
      bar('2026-01-07', 100, 101),
      ...runtunDatar(2, 8),
      bar('2026-01-10', 100, 101),
      bar('2026-01-11', 100, 102),
      bar('2026-01-12', 100, 103),
      bar('2026-01-13', 100, 104),
      bar('2026-01-14', 100, 105),
    ];
    const hasilPecah = cariRuntunDatar(pecah);
    expect(hasilPecah).toEqual([]);
  });

  it('memberi temuan berkeparahan peringatan dengan panjang runtunnya', () => {
    const h = r19bRuntunDatar(konteks({ harga: runtunDatar(5) }));
    expect(h.hitungan.diperiksa).toBe(5);
    expect(h.hitungan.merah).toBe(5);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('5 hari bursa');
  });

  it('hijau kalau harganya bergerak tiap hari', () => {
    const h = r19bRuntunDatar(
      konteks({
        harga: [bar('2026-01-05', 100, 101), bar('2026-01-06', 101, 102), bar('2026-01-07', 99, 103)],
      }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.hijau).toBe(3);
  });

  it('memberi runtun yang sama di dua kali panggil, apa pun urutan masukannya (INV-C)', () => {
    const baris = runtunDatar(4);
    const satu = cariRuntunDatar(baris);
    const dua = cariRuntunDatar([...baris].reverse());
    expect(dua).toEqual(satu);
  });
});

describe('R19b — kalimat runtun menyebut apa yang sebenarnya datar (A-1 D-A1)', () => {
  /**
   * "Hari datar" adalah sifat satu hari: buka, tertinggi, terendah, dan
   * tutupnya sama. Runtun hari datar karena itu belum tentu berarti harganya
   * diam. Data nyata DADA 2025-08-05..08 adalah empat hari datar berturut-turut
   * yang harganya Rp10, Rp11, Rp12, Rp11 — berubah tiap hari, dengan volume
   * ratusan juta lembar.
   */
  const berganti = (): BarisHarga[] => [
    datar('2025-08-05', 10, 134_573_300),
    datar('2025-08-06', 11, 93_430_500),
    datar('2025-08-07', 12, 111_731_200),
    datar('2025-08-08', 11, 192_997_900),
  ];
  /** Data nyata DADA 2025-10-22..28: tutupnya Rp50 di semua hari. */
  const diam = (): BarisHarga[] => [
    datar('2025-10-22', 50, 190_759_400),
    datar('2025-10-23', 50, 66_156_200),
    datar('2025-10-24', 50, 36_349_000),
    datar('2025-10-27', 50, 25_522_300),
  ];

  it('menandai runtun yang harganya berganti tiap hari, dan tidak menyebutnya tidak bergerak', () => {
    const runtun = cariRuntunDatar(berganti());
    expect(runtun).toHaveLength(1);
    expect(runtun[0]?.tutup_sama).toBe(false);
    const kalimat = kalimatRuntun('DADA', runtun[0]!);
    expect(kalimat).not.toContain('tidak bergerak');
    expect(kalimat).toContain('hanya mencatat satu angka');
    expect(kalimat).toContain('berganti dari hari ke hari');
    expect(kalimat).toContain('Rp10 di awal');
    expect(kalimat).toContain('Rp11 di akhir');
  });

  it('baru menyebut "tidak bergerak sama sekali" kalau tutup semua harinya memang sama', () => {
    const runtun = cariRuntunDatar(diam());
    expect(runtun).toHaveLength(1);
    expect(runtun[0]?.tutup_sama).toBe(true);
    const kalimat = kalimatRuntun('DADA', runtun[0]!);
    expect(kalimat).toContain('tidak bergerak sama sekali');
    expect(kalimat).toContain('tutup di Rp50');
  });

  it('memakai kaca mata yang sama untuk runtun lunak', () => {
    const jendela: BarisHarga[] = [
      ...berganti(),
      datar('2025-08-11', 13),
      datar('2025-08-12', 14),
      bar('2025-08-13', 14, 15),
      datar('2025-08-14', 15),
      datar('2025-08-15', 16),
      datar('2025-08-18', 17),
    ];
    const lunak = cariRuntunDatar(jendela).filter((r) => r.lunak);
    expect(lunak).toHaveLength(1);
    expect(lunak[0]?.tutup_sama).toBe(false);
    expect(kalimatRuntun('DADA', lunak[0]!)).not.toContain('tidak bergerak');
  });

  it('memakai kalimat itu juga di temuan yang benar-benar dikeluarkan aturannya', () => {
    const h = r19bRuntunDatar(konteks({ harga: berganti(), simbol: 'DADA' }));
    expect(h.temuan).toHaveLength(1);
    expect(h.temuan[0]?.ringkasan).not.toContain('tidak bergerak');
    const diamHasil = r19bRuntunDatar(konteks({ harga: diam(), simbol: 'DADA' }));
    expect(diamHasil.temuan[0]?.ringkasan).toContain('tidak bergerak sama sekali');
  });

  it('R19a tetap berbicara tentang satu hari, bukan tentang gerakan antar hari', () => {
    const h = r19aDatarTanpaVolume(konteks({ harga: berganti().map((b) => ({ ...b, volume: 0 })) }));
    expect(h.temuan[0]?.ringkasan).toContain('mencatat satu harga saja untuk buka');
    expect(h.temuan[0]?.ringkasan).not.toContain('tidak bergerak');
  });
});
