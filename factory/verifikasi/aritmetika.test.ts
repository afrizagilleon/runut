/**
 * M2a T-05 (RQ-04): R33, R15, R11a, R13.
 *
 * Empat baris "GAGAL" dan "ambang rapuh" dari uji lawan 7 yang menyangkut
 * keempat aturan ini ditulis di sini sebagai tes yang **kini lulus**:
 * laporan rusak ber-`transaction_type` `others` (R15), kepemilikan tepat 100%
 * modal (R13), persen ditulis dengan satu desimal (R11a), dan perbandingan
 * tepat 2,0% (R33).
 */
import { describe, expect, it } from 'vitest';
import {
  ambangGoyah,
  fraksiHarga,
  melewatiModal,
  mencapaiAmbang,
  r11aPenyebutDuaSisi,
  r13LembarLebihBesarDariModal,
  r15Aritmetika,
  r33SahamTersiratGoyah,
} from './aturan-v2.ts';
import { bangunSahamBeredarPada } from './penyebut.ts';
import { harga, konteks, laporan } from './contoh.ts';
import type { BarisHarga, DataEmiten, KonteksGudang } from './tipe.ts';

function dataEmiten(ubah: Partial<DataEmiten> = {}): DataEmiten {
  return {
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
    ringkasan_pasar: null,
    berkas: [],
    ...ubah,
  };
}

function konteksHarga(baris: BarisHarga[], ubah: Partial<DataEmiten> = {}): KonteksGudang {
  const data = dataEmiten({ harga: baris, ...ubah });
  return { ...konteks({ harga: baris, simbol: 'AA' }), data, berkas_kosong: [] };
}

/** Baris harga dengan jumlah saham tersirat yang ditentukan persis. */
function hari(tanggal: string, tutup: number, lembar: number): BarisHarga {
  return harga({ tanggal, tutup, tertinggi: tutup, terendah: tutup, buka: tutup, nilai_pasar: tutup * lembar });
}

// --- R33 ---------------------------------------------------------------------

describe('R33 — jumlah saham tersirat goyah', () => {
  it('memakai fraksi harga bursa untuk ambangnya', () => {
    expect(fraksiHarga(50)).toBe(1);
    expect(fraksiHarga(200)).toBe(2);
    expect(fraksiHarga(1000)).toBe(5);
    // Satu tick dari Rp50 adalah 2,00%; ambang 2% akan merah setiap hari.
    expect(ambangGoyah(50)).toEqual({ pembilang: 2, penyebut: 50 });
    expect(ambangGoyah(200)).toEqual({ pembilang: 2, penyebut: 100 });
    expect(ambangGoyah(1000)).toEqual({ pembilang: 2, penyebut: 100 });
  });

  it('uji lawan 7: perbandingan tepat 2,0% adalah merah, dan itu putusan, bukan galat', () => {
    // 1.000.000 -> 1.020.000 adalah persis 2,0%.
    expect(mencapaiAmbang(1_000_000, 1_020_000, { pembilang: 2, penyebut: 100 })).toBe(true);
    // Satu lembar di bawahnya tidak.
    expect(mencapaiAmbang(1_000_000, 1_019_999, { pembilang: 2, penyebut: 100 })).toBe(false);
  });

  it('hijau untuk hari yang jumlah saham tersiratnya tidak bergerak', () => {
    const h = r33SahamTersiratGoyah(
      konteksHarga([hari('2026-01-05', 1000, 1_000_000), hari('2026-01-06', 1100, 1_000_000)]),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(0);
  });

  it('merah untuk lompatan, dan menyebut aksi korporasi di dekatnya sebagai fakta', () => {
    const h = r33SahamTersiratGoyah(
      konteksHarga([hari('2026-01-05', 1000, 1_000_000), hari('2026-01-06', 1000, 4_000_000)], {
        right_issue: [{ ex_date: '2026-01-06', rasio_lama: 1, rasio_baru: 3, sumber: 'x.json' }],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('rights issue 2026-01-06');
    expect(h.temuan[0]?.ringkasan).not.toContain('karena');
  });

  it('mengatakan penyebabnya tidak diketahui kalau tidak ada aksi korporasi di dekatnya', () => {
    const h = r33SahamTersiratGoyah(
      konteksHarga([hari('2026-01-05', 1000, 1_000_000), hari('2026-01-06', 1000, 4_000_000)]),
    );
    expect(h.temuan[0]?.ringkasan).toContain('penyebabnya tidak diketahui');
  });

  it('tidak menghitung pasangan yang salah satu barisnya cacat sebagai hijau', () => {
    const h = r33SahamTersiratGoyah(
      konteksHarga([
        hari('2026-01-05', 1000, 1_000_000),
        { ...hari('2026-01-06', 1000, 4_000_000), buka_kosong: true },
      ]),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.tidak_lengkap).toBe(1);
    expect(h.hitungan.hijau).toBe(0);
  });

  it('tidak menandai saham berharga rendah merah untuk satu tick saja', () => {
    // Rp50, satu tick = 2,00%: dengan ambang 2% saja ini akan merah.
    const h = r33SahamTersiratGoyah(
      konteksHarga([hari('2026-01-05', 50, 1_000_000), hari('2026-01-06', 50, 1_030_000)]),
    );
    expect(h.hitungan.merah).toBe(0);
    // Tetapi lompatan yang benar-benar besar tetap tertangkap.
    const besar = r33SahamTersiratGoyah(
      konteksHarga([hari('2026-01-05', 50, 1_000_000), hari('2026-01-06', 50, 1_500_000)]),
    );
    expect(besar.hitungan.merah).toBe(1);
  });
});

// --- R15 ---------------------------------------------------------------------

describe('R15 — aritmetika per laporan, termasuk transaksi jenis lain', () => {
  const rusak = { sebelum: 13_966_000, jumlah: 1_657_900, sesudah: 15_923_600 };

  it('hijau untuk laporan beli dan jual yang konsisten', () => {
    const h = r15Aritmetika(
      konteks({
        laporan: [
          laporan({ laporan_id: 'a', jenis_mentah: 'buy', sebelum: 100, jumlah: 20, sesudah: 120 }),
          laporan({ laporan_id: 'b', jenis_mentah: 'sell', sebelum: 120, jumlah: 20, sesudah: 100 }),
        ],
      }),
    );
    expect(h.hitungan.diperiksa).toBe(2);
    expect(h.hitungan.merah).toBe(0);
  });

  it('merah untuk laporan beli yang aritmetikanya tidak cocok', () => {
    const h = r15Aritmetika(
      konteks({ laporan: [laporan({ jenis_mentah: 'buy', ...rusak })] }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('15.623.900');
  });

  it('uji lawan 7 GAGAL: laporan rusak yang sama, dengan jenis others, tidak lagi lolos hijau', () => {
    const h = r15Aritmetika(
      konteks({ laporan: [laporan({ jenis_mentah: 'others', ...rusak })] }),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('others');
  });

  it('menerima transaksi others yang besarannya cocok, ke arah mana pun', () => {
    const naik = r15Aritmetika(
      konteks({ laporan: [laporan({ jenis_mentah: 'others', sebelum: 100, jumlah: 20, sesudah: 120 })] }),
    );
    const turun = r15Aritmetika(
      konteks({ laporan: [laporan({ jenis_mentah: 'others', sebelum: 120, jumlah: 20, sesudah: 100 })] }),
    );
    expect(naik.hitungan.merah).toBe(0);
    expect(turun.hitungan.merah).toBe(0);
  });

  it('memakai jenis yang dinormalkan kalau pemuatnya tidak menyimpan jenis mentah', () => {
    const h = r15Aritmetika(
      konteks({
        laporan: [laporan({ jenis_mentah: undefined, jenis: 'jual', sebelum: 120, jumlah: 20, sesudah: 100 })],
      }),
    );
    expect(h.hitungan.merah).toBe(0);
  });
});

// --- R11a --------------------------------------------------------------------

describe('R11a — penyebut dua sisi satu laporan', () => {
  const duaSisi = (sebelum: number, ps: number, sesudah: number, pa: number) =>
    r11aPenyebutDuaSisi(
      konteks({ laporan: [laporan({ sebelum, persen_sebelum: ps, sesudah, persen_sesudah: pa })] }),
    );

  it('hijau kalau kedua selang penyebut bersinggungan', () => {
    // 1.000.000 lembar = 10,00% dan 900.000 lembar = 9,00% dari 10 juta.
    const h = duaSisi(1_000_000, 10, 900_000, 9);
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(0);
  });

  it('uji lawan 7: sisi sesudah dinaikkan 10% tertangkap', () => {
    const h = duaSisi(1_000_000, 10, 990_000, 9);
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('tidak ada satu jumlah saham beredar pun');
  });

  it('uji lawan 7: 0,02% menjadi 0,03% tetap hijau — itu satu angka penting, bukan cacat', () => {
    // ARNA/AGII: lembar yang sangat kecil, persen yang hanya punya satu angka
    // penting. Selangnya lebar, dan memang seharusnya begitu.
    const h = duaSisi(211_400, 0.02, 317_100, 0.03);
    expect(h.hitungan.merah).toBe(0);
  });

  it('uji lawan 7: ketelitian medan ditetapkan, jadi 22.7 tidak melebar sepuluh kali', () => {
    // Kalau ketelitian diturunkan dari nilainya, "22.7" memberi selang sepuluh
    // kali lebih longgar daripada "22.70" dan pergeseran kecil akan lolos.
    const sempit = duaSisi(362_207_800, 21.77, 374_014_400, 22.73);
    const satuDesimal = duaSisi(362_207_800, 21.77, 374_014_400, 22.7);
    expect(sempit.hitungan.merah).toBe(1);
    expect(satuDesimal.hitungan.merah).toBe(1);
  });

  it('mencatat berapa desimal yang sebenarnya tertulis, supaya merah bisa ditimbang', () => {
    const h = duaSisi(602_207_800, 36.2, 522_207_800, 31.38);
    expect(h.hitungan.merah).toBe(1);
    const desimal = h.temuan[0]?.angka.find((a) => a.satuan === 'angka desimal');
    expect(desimal?.nilai).toBe(1);
  });

  it('TIDAK_LENGKAP kalau kedua sisi nol', () => {
    const h = duaSisi(0, 0, 0, 0);
    expect(h.hitungan.tidak_lengkap).toBe(1);
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.alasan_dilewati).toContain('Kedua medan persen nol atau kosong.');
  });

  it('TIDAK_LENGKAP kalau tepat satu sisi nol, bukan dilewati diam-diam', () => {
    const h = duaSisi(0, 0, 282_879_400, 17);
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.tidak_lengkap).toBe(1);
    expect(h.hitungan.hijau).toBe(0);
    expect(h.hitungan.alasan_dilewati).toContain(
      'Tepat satu medan persen nol atau kosong, jadi kedua sisi tidak bisa diadu.',
    );
  });
});

// --- R13 ---------------------------------------------------------------------

describe('R13 — lembar dilaporkan melebihi saham beredar', () => {
  const cari = bangunSahamBeredarPada([
    { lembar: 1_000_000, pada: '2026-01-06', sumber: 'contoh' },
  ]);
  const uji = (lembar: number) =>
    r13LembarLebihBesarDariModal(
      konteks({
        laporan: [
          laporan({
            dilaporkan_pada: '2026-01-06T10:00:00',
            sebelum: lembar,
            sesudah: 1,
            jumlah: 1,
          }),
        ],
        sahamBeredarPada: cari,
      }),
    );

  it('uji lawan 7: kepemilikan tepat 100% modal tetap hijau', () => {
    expect(melewatiModal(1_000_000, 1_000_000)).toBe(false);
    expect(uji(1_000_000).hitungan.merah).toBe(0);
  });

  it('uji lawan 7: 100,000001% tidak lagi merah — batas lama terlalu tajam', () => {
    expect(melewatiModal(1_000_001, 1_000_000)).toBe(false);
  });

  it('memutus tepat di 101% dengan bilangan bulat', () => {
    expect(melewatiModal(1_010_000, 1_000_000)).toBe(false);
    expect(melewatiModal(1_010_001, 1_000_000)).toBe(true);
  });

  it('merah untuk kepemilikan yang jelas melewati modal', () => {
    const h = uji(1_626_000);
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('162.6%');
  });

  it('memeriksa tiga medan per laporan, bukan satu', () => {
    expect(uji(1_000_000).hitungan.diperiksa).toBe(3);
  });

  it('TIDAK_LENGKAP tanpa penyebut, bukan hijau — melewati emiten diam-diam lebih berbahaya', () => {
    const h = r13LembarLebihBesarDariModal(
      konteks({
        laporan: [laporan({ dilaporkan_pada: '2030-01-06T10:00:00' })],
        sahamBeredarPada: cari,
      }),
    );
    expect(h.hitungan.diperiksa).toBe(3);
    expect(h.hitungan.tidak_lengkap).toBe(3);
    expect(h.hitungan.hijau).toBe(0);
  });
});
