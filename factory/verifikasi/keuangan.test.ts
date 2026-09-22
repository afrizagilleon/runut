/**
 * M2b T-03 (RQ-03): R20, R21, R32.
 *
 * Angka contohnya disusun ulang dari pola nyata yang ditulis di
 * `.context/aturan-R-uji-lawan.md` — ULTJ yang basis sahamnya turun 11% tanpa
 * aksi korporasi, COCO yang naik empat kali lipat karena penerbitan saham baru
 * 1 : 3, ARNA yang dua sumbernya berbeda 2,53% pada tanggal yang sama, dan FOLK
 * yang di usulan lama merah karena dua tanggal yang berbeda diadu.
 */
import { describe, expect, it } from 'vitest';
import { dataEmiten, harga, konteks } from './contoh.ts';
import type { DataEmiten, KonteksGudang } from './tipe.ts';
import {
  AMBANG_R20,
  AMBANG_R21,
  AMBANG_R32,
  aksiBerasio,
  basisSahamPerTahun,
  r20BasisLabaPerLembar,
  r21SahamBedaSumber,
  r32PerubahanSahamVsAksi,
  rasioMenjelaskan,
  sebarMelewati,
  sumberSaham,
  angkaPerLembar,
  bacaAngkaRupiah,
  cariCocokDividen,
  penyesuaianSplitDividen,
  r23LabaBedaEndpoint,
  r31DividenRupsVersusMedan,
  menyatakanTanpaDividen,
  r26PembagianLaba,
  r27RasioSiapPakai,
} from './aturan-keuangan.ts';

function ktx(ubah: Partial<DataEmiten> = {}): KonteksGudang {
  const data = dataEmiten(ubah);
  return {
    ...konteks({ simbol: data.simbol, harga: data.harga, laporan: data.laporan }),
    data,
    berkas_kosong: [],
  };
}

/** Tahun buku dengan laba dan laba per lembar yang memberi basis saham persis `lembar`. */
function tahun(t: number, lembar: number, laba = 1_000_000_000): {
  keuangan: DataEmiten['keuangan_tahunan'][number];
  eps: DataEmiten['eps_tahunan'][number];
} {
  return {
    keuangan: { tahun: t, laba, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
    eps: { tahun: t, eps: laba / lembar },
  };
}

function denganBasis(daftar: Array<[number, number]>): Partial<DataEmiten> {
  const baris = daftar.map(([t, lembar]) => tahun(t, lembar));
  return {
    keuangan_tahunan: baris.map((b) => b.keuangan),
    eps_tahunan: baris.map((b) => b.eps),
  };
}

describe('sebarMelewati — perbandingan ambang sebagai bilangan bulat (INV-D)', () => {
  it('tepat di ambang tidak melewati ambang', () => {
    // 100 -> 101 adalah tepat 1%; ambang R20 adalah "lebih dari 1%".
    expect(sebarMelewati(100, 101, AMBANG_R20)).toBe(false);
    expect(sebarMelewati(100, 102, AMBANG_R20)).toBe(true);
  });

  it('tepat 5% tidak melewati ambang R32, satu lembar lebih melewatinya', () => {
    expect(sebarMelewati(1_000_000_000, 1_050_000_000, AMBANG_R32)).toBe(false);
    expect(sebarMelewati(1_000_000_000, 1_050_000_001, AMBANG_R32)).toBe(true);
  });

  it('tepat 0,5% tidak melewati ambang R21', () => {
    expect(sebarMelewati(1_000_000_000, 1_005_000_000, AMBANG_R21)).toBe(false);
    expect(sebarMelewati(1_000_000_000, 1_005_000_001, AMBANG_R21)).toBe(true);
  });

  it('memakai bilangan bulat besar, jadi angka miliaran tidak kehilangan satu lembar pun', () => {
    // 11.553.528.000 -> 10.398.175.200 adalah 11,11%: jelas di atas 5%.
    expect(sebarMelewati(10_398_175_200, 11_553_528_000, AMBANG_R32)).toBe(true);
    // Satu lembar dari sebelas miliar bukan 5%.
    expect(sebarMelewati(11_553_528_000, 11_553_528_001, AMBANG_R32)).toBe(false);
  });
});

describe('R20 — basis saham di laba per lembar', () => {
  it('hijau kalau laba dibagi laba per lembar tetap tiap tahun', () => {
    // Pola ARNA: basis ~7.341,4 juta tetap walau jumlah saham yang diterbitkan turun.
    const h = r20BasisLabaPerLembar(
      ktx(denganBasis([
        [2023, 7_341_430_976],
        [2024, 7_341_430_976],
        [2025, 7_341_430_976],
      ])),
    );
    expect(h.hitungan).toMatchObject({ satuan: 'emiten', diperiksa: 1, hijau: 1, merah: 0 });
    expect(h.temuan).toHaveLength(0);
  });

  it('merah untuk pola ULTJ: basis turun 11% di tahun terakhir', () => {
    const h = r20BasisLabaPerLembar(
      ktx(denganBasis([
        [2023, 11_553_528_000],
        [2024, 11_553_528_000],
        [2025, 10_398_175_200],
      ])),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('10.398.175.200');
    expect(h.temuan[0]?.ringkasan).toContain('11.553.528.000');
    expect(h.temuan[0]?.ringkasan).toContain('11,11%');
  });

  it('merah untuk pola TIRT: 1,06% saja sudah di atas ambang satu persen', () => {
    const h = r20BasisLabaPerLembar(
      ktx(denganBasis([
        [2020, 1_019_607_843],
        [2021, 1_008_928_571],
      ])),
    );
    expect(h.hitungan.merah).toBe(1);
  });

  it('hijau tepat di ambang satu persen', () => {
    const h = r20BasisLabaPerLembar(
      ktx(denganBasis([
        [2024, 1_000_000_000],
        [2025, 1_010_000_000],
      ])),
    );
    expect(h.hitungan.merah).toBe(0);
  });

  it('dilewati beserta alasannya kalau hanya satu tahun buku yang lengkap', () => {
    const h = r20BasisLabaPerLembar(ktx(denganBasis([[2025, 1_000_000_000]])));
    expect(h.dijalankan).toBe(false);
    expect(h.alasan_lewat).toContain('Kurang dari dua tahun buku');
  });

  it('memakai laba dibagi laba per lembar, bukan jumlah saham yang diterbitkan', () => {
    // Pola ARNA: jumlah saham yang diterbitkan turun 1,7% dari 2022 ke 2025
    // (pembelian kembali saham), sementara basis laba per lembar tetap
    // 7.341.430.976. R20 menanyakan basisnya, bukan jumlah yang diterbitkan —
    // kalau tertukar, ARNA merah tanpa sebab.
    const baris = [
      [2022, 7_341_430_976, 7_270_833_619],
      [2023, 7_341_430_976, 7_265_340_760],
      [2025, 7_341_430_976, 7_160_306_042],
    ] as const;
    const h = r20BasisLabaPerLembar(
      ktx({
        simbol: 'ARNA',
        keuangan_tahunan: baris.map(([t, basis, diterbitkan]) => ({
          tahun: t,
          laba: basis,
          pendapatan: null,
          ekuitas: null,
          aset: null,
          laba_kotor: null,
          lembar: diterbitkan,
        })),
        eps_tahunan: baris.map(([t]) => ({ tahun: t, eps: 1 })),
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0 });
  });

  it('membuang tahun yang labanya nol, bukan menghitungnya sebagai basis nol', () => {
    const kosong = ktx({
      keuangan_tahunan: [
        { tahun: 2024, laba: 0, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
        { tahun: 2025, laba: 1_000_000_000, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
      ],
      eps_tahunan: [
        { tahun: 2024, eps: 1 },
        { tahun: 2025, eps: 1 },
      ],
    });
    expect(basisSahamPerTahun(kosong).map((b) => b.tahun)).toEqual([2025]);
    expect(r20BasisLabaPerLembar(kosong).dijalankan).toBe(false);
  });
});

describe('R21 — jumlah saham beda antar sumber', () => {
  /** Baris harga akhir tahun dengan jumlah saham tersirat yang ditentukan persis. */
  const akhirTahun2025 = (lembar: number) =>
    harga({ tanggal: '2025-12-30', tutup: 100, buka: 100, tertinggi: 100, terendah: 100, nilai_pasar: 100 * lembar });

  it('merah untuk pola ARNA: dua sumber, satu tanggal, selisih 2,53%', () => {
    const h = r21SahamBedaSumber(
      ktx({
        saham_tahunan: [{ tahun: 2025, lembar: 7_160_306_042 }],
        harga: [akhirTahun2025(7_341_430_976)],
      }),
    );
    expect(h.hitungan).toMatchObject({ satuan: 'pasang sumber', diperiksa: 1, merah: 1 });
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('2025-12-31');
    expect(h.temuan[0]?.ringkasan).toContain('2,53%');
  });

  it('hijau untuk positif palsu FOLK: dua tanggal berbeda tidak diadu', () => {
    // Ringkasan pasar potret 2026-09-18 memberi 4.091.357.544; baris harian
    // terakhir 2026-01-09 memberi 3.948.141.464. Rumus yang sama, tanggal yang
    // berbeda, dan FOLK memang menerbitkan saham di antara keduanya.
    const h = r21SahamBedaSumber(
      ktx({
        simbol: 'FOLK',
        ringkasan_pasar: { nilai_pasar: 4_091_357_544 * 100, harga_tutup: 100, pada: '2026-09-18' },
        saham_tahunan: [{ tahun: 2025, lembar: 3_948_141_464 }],
        harga: [akhirTahun2025(3_948_141_464)],
      }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.dilewati).toBeGreaterThan(0);
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('tanggal yang berbeda');
  });

  it('tidak mengadu laba dibagi laba per lembar dengan angka bertanggal', () => {
    // Pola ULTJ: outstanding_shares 10.398.175.200 (akhir tahun) dan basis saham
    // 11.553.528.000 (rata-rata setahun). Selisih 11%, tetapi bukan merah R21 —
    // temuannya milik R20 dan R32.
    const h = r21SahamBedaSumber(
      ktx({
        simbol: 'ULTJ',
        saham_tahunan: [{ tahun: 2025, lembar: 10_398_175_200 }],
        ...denganBasis([
          [2024, 11_553_528_000],
          [2025, 11_553_528_000],
        ]),
      }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('rata-rata sepanjang satu tahun buku');
  });

  it('melewati potret pemegang saham karena ia tidak membawa tanggal berlaku', () => {
    const h = r21SahamBedaSumber(
      ktx({
        pemegang: [{ nama: 'Contoh', lembar: 14_237_823_696 }],
        saham_tahunan: [{ tahun: 2025, lembar: 3_583_687_879 }],
      }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('tidak menyebutkan kapan angkanya berlaku');
  });

  it('hijau tepat di ambang setengah persen', () => {
    const h = r21SahamBedaSumber(
      ktx({
        saham_tahunan: [{ tahun: 2025, lembar: 1_000_000_000 }],
        harga: [akhirTahun2025(1_005_000_000)],
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0, hijau: 1 });
  });

  it('memakai hari bursa terakhir tahun itu, bukan hari bursa mana pun', () => {
    // Baris bertanggal 2025-12-20 berjarak sebelas hari dari akhir tahun: terlalu
    // jauh untuk mewakili keadaan 31 Desember.
    const jauh = harga({
      tanggal: '2025-12-20',
      tutup: 100,
      buka: 100,
      tertinggi: 100,
      terendah: 100,
      nilai_pasar: 100 * 2_000_000_000,
    });
    const h = r21SahamBedaSumber(
      ktx({ saham_tahunan: [{ tahun: 2025, lembar: 1_000_000_000 }], harga: [jauh] }),
    );
    expect(h.dijalankan).toBe(false);
    expect(sumberSaham(ktx({ saham_tahunan: [{ tahun: 2025, lembar: 1 }], harga: [jauh] }))).toHaveLength(1);
  });
});

describe('R32 — perubahan jumlah saham dijelaskan aksi korporasi', () => {
  it('hijau untuk COCO 2025: empat kali lipat dijelaskan penerbitan saham baru 1 : 3', () => {
    const h = r32PerubahanSahamVsAksi(
      ktx({
        simbol: 'COCO',
        ...denganBasis([
          [2024, 889_863_981],
          [2025, 3_559_455_924],
        ]),
        right_issue: [
          { ex_date: '2025-10-09', rasio_lama: 1, rasio_baru: 3, sumber: 'COCO-corpactions.json', harga: 100 },
        ],
      }),
    );
    expect(h.hitungan).toMatchObject({ satuan: 'pergantian tahun buku', diperiksa: 1, merah: 0 });
    expect(h.temuan[0]?.keparahan).toBe('catatan');
    expect(h.temuan[0]?.ringkasan).toContain('penerbitan saham baru 1 berbanding 3');
    expect(h.temuan[0]?.ringkasan).toContain('889.863.981');
    expect(h.temuan[0]?.ringkasan).toContain('3.559.455.924');
  });

  it('hijau untuk COCO 2021: penerbitan saham baru 17 : 10 menjelaskan 1,59 kali lipat', () => {
    const h = r32PerubahanSahamVsAksi(
      ktx({
        simbol: 'COCO',
        ...denganBasis([
          [2020, 560_000_000],
          [2021, 888_888_888],
        ]),
        right_issue: [
          { ex_date: '2021-12-09', rasio_lama: 17, rasio_baru: 10, sumber: 'COCO-corpactions.json', harga: 304 },
        ],
      }),
    );
    expect(h.hitungan.merah).toBe(0);
  });

  it('merah untuk pola ULTJ: turun 10% tanpa satu pun aksi korporasi', () => {
    const h = r32PerubahanSahamVsAksi(
      ktx({
        simbol: 'ULTJ',
        ...denganBasis([
          [2024, 11_553_528_000],
          [2025, 10_398_175_200],
        ]),
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('Tidak ada aksi korporasi tercatat sepanjang tahun buku itu');
    expect(h.temuan[0]?.ringkasan).toContain('Penyebabnya tidak diketahui');
  });

  it('hijau untuk pola KRYA dan TIRT: 1-2% tidak mencapai ambang lima persen', () => {
    // Inilah sebab ambangnya dinaikkan dari 1% ke 5%. Alasannya bukan pembulatan
    // laba per lembar — angkanya punya 14 angka penting — melainkan jumlah saham
    // rata-rata tertimbang setahun.
    const krya = r32PerubahanSahamVsAksi(
      ktx({ simbol: 'KRYA', ...denganBasis([[2022, 1_625_490_196], [2023, 1_663_943_474]]) }),
    );
    expect(krya.hitungan).toMatchObject({ diperiksa: 1, merah: 0 });
    const tirt = r32PerubahanSahamVsAksi(
      ktx({ simbol: 'TIRT', ...denganBasis([[2021, 1_019_607_843], [2022, 1_008_928_571]]) }),
    );
    expect(tirt.hitungan.merah).toBe(0);
  });

  it('merah kalau aksi yang tercatat rasionya tidak sebesar perubahannya', () => {
    const h = r32PerubahanSahamVsAksi(
      ktx({
        ...denganBasis([
          [2024, 1_000_000_000],
          [2025, 4_000_000_000],
        ]),
        stock_split: [{ tanggal: '2025-03-02', rasio: 2, sumber: 'aa-aksi.json' }],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('rasionya tidak sebesar itu');
  });

  it('tidak memakai aksi dari tahun lain untuk menjelaskan perubahan tahun ini', () => {
    const h = r32PerubahanSahamVsAksi(
      ktx({
        ...denganBasis([
          [2024, 1_000_000_000],
          [2025, 4_000_000_000],
        ]),
        stock_split: [{ tanggal: '2023-03-02', rasio: 4, sumber: 'aa-aksi.json' }],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
  });

  it('dilewati beserta alasannya kalau basis sahamnya kurang dari dua tahun', () => {
    const h = r32PerubahanSahamVsAksi(ktx(denganBasis([[2025, 1_000_000_000]])));
    expect(h.dijalankan).toBe(false);
    expect(h.alasan_lewat).toContain('Kurang dari dua tahun buku');
  });

  it('membaca rasio penerbitan saham baru sebagai (lama + baru) dibagi lama', () => {
    const aksi = aksiBerasio(
      [{ tanggal: '2026-03-02', rasio: 4, sumber: 'x' }],
      [{ ex_date: '2025-10-09', rasio_lama: 1, rasio_baru: 3, sumber: 'x', harga: 100 }],
      [{ ex_date: '2026-02-10', sumber: 'x', rasio_lama: 100, rasio_baru: 1 }],
    );
    expect(aksi.map((a) => a.lipat)).toEqual([4, 1.01, 4]);
  });

  it('memberi toleransi sepuluh persen pada rasio yang dipakai menjelaskan', () => {
    expect(rasioMenjelaskan(1_000_000_000, 4_000_000_000, 4)).toBe(true);
    expect(rasioMenjelaskan(1_000_000_000, 4_300_000_000, 4)).toBe(true);
    expect(rasioMenjelaskan(1_000_000_000, 4_500_000_000, 4)).toBe(false);
  });
});

// --- M2b T-04: R23 dan R31 ---------------------------------------------------

describe('bacaAngkaRupiah — koma adalah pemisah ribuan gaya Inggris', () => {
  it('membaca Rp400,475,916,944 sebagai empat ratus miliar, bukan empat ratus koma sekian', () => {
    expect(bacaAngkaRupiah('a net profit of Rp400,475,916,944, allocating')[0]?.milli).toBe(
      400_475_916_944_000,
    );
  });

  it('membaca titik sebagai pemisah desimal', () => {
    expect(bacaAngkaRupiah('Rp40,983,839,406.00 was')[0]?.milli).toBe(40_983_839_406_000);
    expect(bacaAngkaRupiah('Rp133.50 per share')[0]?.milli).toBe(133_500);
    expect(bacaAngkaRupiah('Rp9.70 per share')[0]?.milli).toBe(9_700);
  });

  it('membaca angka yang dipisahkan spasi dari Rp', () => {
    expect(bacaAngkaRupiah('a final dividend of Rp 275 per share')[0]?.milli).toBe(275_000);
  });

  it('membaca setiap angka di satu kalimat, beserta letaknya', () => {
    const daftar = bacaAngkaRupiah('allocating Rp330,364,393,920 for cash dividends at Rp45 per share');
    expect(daftar.map((a) => a.milli)).toEqual([330_364_393_920_000, 45_000]);
    expect(daftar[1]?.mulai).toBeGreaterThan(daftar[0]?.mulai ?? 0);
  });
});

describe('angkaPerLembar — menempel pada "per share", dan bukan nilai nominal', () => {
  it('membuang total dividen yang kebetulan sekalimat dengan per share', () => {
    // Positif palsu pengurai yang ditemukan uji lawan: Rp330.364.393.920 adalah
    // total dividen ARNA, bukan dividen per lembar.
    const teks = 'allocating Rp330,364,393,920 for cash dividends at Rp45 per share and the remainder';
    expect(angkaPerLembar(teks).map((a) => a.milli)).toEqual([45_000]);
  });

  it('membuang nilai nominal saham walau ia menempel pada "per share"', () => {
    // MLPT RUPS 2026-06-29: RUPS pemecahan saham, bukan RUPS dividen.
    const teks =
      "Approval of the company's stock split plan, changing the nominal value from Rp100 to Rp4 per share";
    expect(angkaPerLembar(teks)).toEqual([]);
  });

  it('membaca dua dividen di satu agenda', () => {
    const teks =
      'an interim dividend of Rp 28 per share (paid 29 January 2026) and a final dividend of Rp 40 per share';
    expect(angkaPerLembar(teks).map((a) => a.milli)).toEqual([28_000, 40_000]);
  });
});

describe('cariCocokDividen — perbandingan dalam seperseribu rupiah (INV-D)', () => {
  const dividen = [
    { ex_date: '2025-05-15', nilai_per_lembar: 3.44 },
    { ex_date: '2025-11-07', nilai_per_lembar: 2.14 },
    { ex_date: '2026-05-11', nilai_per_lembar: 3.2 },
  ];

  it('menemukan MLPT Rp133,50 sebagai 25 kali (2,14 + 3,20)', () => {
    const cocok = cariCocokDividen(133_500, dividen, [25]);
    expect(cocok).toEqual({ cara: 'jumlah-dua', lipat: 25, ex: ['2025-11-07', '2026-05-11'], milli: 5_340 });
  });

  it('tidak terpeleset galat titik mengambang saat menjumlahkan dua dividen', () => {
    // Dalam pecahan, 3,44 + 3,20 memberi 6,640000000000001; dikali 25 ia tidak
    // pernah sama dengan 166,00 yang tertulis di teks. Dalam seperseribu rupiah
    // ia bilangan bulat 6.640, dan perbandingannya tepat.
    expect(3.44 + 3.2).not.toBe(6.64);
    const cocok = cariCocokDividen(166_000, dividen, [25]);
    expect(cocok).toEqual({ cara: 'jumlah-dua', lipat: 25, ex: ['2025-05-15', '2026-05-11'], milli: 6_640 });
  });

  it('memilih satu dividen sebelum jumlah dua, dan tanpa pengali sebelum dengan pengali', () => {
    expect(cariCocokDividen(3_200, dividen, [25])?.cara).toBe('satu');
    expect(cariCocokDividen(3_200, dividen, [25])?.lipat).toBe(1);
  });

  it('menjawab "cocok apa adanya" kalau satu angka cocok dengan dan tanpa pengali', () => {
    // Rp25 ada di medan apa adanya, dan Rp1 dikali rasio 25 juga memberi Rp25.
    // Kalau pengali dicoba lebih dulu, dividen yang sebenarnya cocok akan
    // dilaporkan sebagai "disesuaikan pemecahan saham" — peringatan palsu.
    const dua = [
      { ex_date: '2025-03-01', nilai_per_lembar: 1 },
      { ex_date: '2025-09-01', nilai_per_lembar: 25 },
    ];
    expect(cariCocokDividen(25_000, dua, [25])).toEqual({
      cara: 'satu',
      lipat: 1,
      ex: ['2025-09-01'],
      milli: 25_000,
    });
  });

  it('mengubah rupiah ke seperseribu rupiah dengan pembulatan, bukan perkalian pecahan', () => {
    // 2,01 x 1.000 dalam pecahan memberi 2.009,9999999999998; tanpa pembulatan
    // dividen sebesar itu tidak akan pernah cocok dengan angka mana pun.
    expect(2.01 * 1000).not.toBe(2010);
    const h = cariCocokDividen(2_010, [{ ex_date: '2025-03-01', nilai_per_lembar: 2.01 }], []);
    expect(h).toEqual({ cara: 'satu', lipat: 1, ex: ['2025-03-01'], milli: 2_010 });
  });

  it('tidak menemukan RAJA Rp28: tidak ada satu, tidak ada dua, tidak ada yang dikali lima', () => {
    const raja = [
      { ex_date: '2025-05-14', nilai_per_lembar: 12 },
      { ex_date: '2026-01-09', nilai_per_lembar: 5 },
      { ex_date: '2026-07-02', nilai_per_lembar: 40 },
    ];
    expect(cariCocokDividen(28_000, raja, [5])).toBeNull();
    expect(cariCocokDividen(40_000, raja, [5])?.cara).toBe('satu');
  });
});

describe('R23 — laba di keputusan RUPS versus laporan keuangan', () => {
  it('hijau untuk pola ARNA: kedua angka sama persis', () => {
    const h = r23LabaBedaEndpoint(
      ktx({
        simbol: 'ARNA',
        rups: [
          {
            tanggal: '2026-04-08',
            ringkasan: 'Agenda #4: The meeting approved a net profit of Rp400,475,916,944, allocating',
          },
        ],
        keuangan_tahunan: [
          { tahun: 2025, laba: 400_475_916_944, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
        ],
      }),
    );
    expect(h.hitungan).toMatchObject({ satuan: 'keputusan RUPS', diperiksa: 1, hijau: 1, merah: 0 });
  });

  it('merah untuk pola RLCO, dan menyebut kedua angka tanpa memutuskan mana yang benar', () => {
    const h = r23LabaBedaEndpoint(
      ktx({
        simbol: 'RLCO',
        rups: [
          {
            tanggal: '2026-06-08',
            ringkasan: 'Agenda #3: The 2025 net profit of Rp40,983,839,406.00 was designated as retained earnings',
          },
        ],
        keuangan_tahunan: [
          { tahun: 2025, laba: 40_920_550_292, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
        ],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('40.983.839.406');
    expect(h.temuan[0]?.ringkasan).toContain('40.920.550.292');
    expect(h.temuan[0]?.ringkasan).toContain('63.289.114');
    expect(h.temuan[0]?.ringkasan).toContain('tidak terbaca dari data ini');
  });

  it('memakai tahun RUPS dikurangi satu sebagai tahun buku', () => {
    const h = r23LabaBedaEndpoint(
      ktx({
        rups: [{ tanggal: '2026-06-08', ringkasan: 'a net profit of Rp100' }],
        keuangan_tahunan: [
          { tahun: 2026, laba: 100, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
        ],
      }),
    );
    // Tahun buku 2025 tidak ada; 2026 ada tetapi bukan tahun bukunya.
    expect(h.hitungan).toMatchObject({ diperiksa: 1, tidak_lengkap: 1, merah: 0 });
  });

  it('melewati RUPS yang teks keputusannya kosong, dan menyebutnya', () => {
    const h = r23LabaBedaEndpoint(ktx({ rups: [{ tanggal: '2026-06-08', ringkasan: null }] }));
    expect(h.hitungan).toMatchObject({ diperiksa: 0, dilewati: 1 });
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('kosong di data');
  });

  it('tidak membaca angka rupiah yang tidak menempel pada "net profit of"', () => {
    const h = r23LabaBedaEndpoint(
      ktx({
        rups: [
          {
            tanggal: '2026-04-17',
            ringkasan: "increasing the company's authorized capital from Rp400 billion to Rp3 trillion",
          },
        ],
        keuangan_tahunan: [
          { tahun: 2025, laba: 400, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
        ],
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 0, merah: 0, dilewati: 1 });
  });
});

describe('R31 — dividen di keputusan RUPS versus medan dividend', () => {
  const rupsMlpt = {
    tanggal: '2026-04-29',
    ringkasan:
      'Agenda #2: The meeting approved a total cash dividend of Rp133.50 per share for the 2025 fiscal year and allocated Rp100 million to the reserve fund.',
  };
  const dividenMlpt = [
    { ex_date: '2025-05-15', tanggal_bayar: '2025-06-05', nilai_per_lembar: 3.44 },
    { ex_date: '2025-11-07', tanggal_bayar: '2025-11-28', nilai_per_lembar: 2.14 },
    { ex_date: '2026-05-11', tanggal_bayar: '2026-06-03', nilai_per_lembar: 3.2 },
  ];

  it('hijau untuk pola MERK: satu angka, satu dividen, cocok persis', () => {
    const h = r31DividenRupsVersusMedan(
      ktx({
        simbol: 'MERK',
        rups: [
          {
            tanggal: '2026-05-25',
            ringkasan: 'The meeting approved the allocation of net profit for a final dividend of Rp 275 per share for 448,000,000 shares.',
          },
        ],
        dividen: [{ ex_date: '2026-06-08', tanggal_bayar: '2026-06-24', nilai_per_lembar: 275 }],
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, hijau: 1, merah: 0 });
  });

  it('peringatan untuk MLPT: cocok hanya sesudah dikali rasio pemecahan saham 25', () => {
    const h = r31DividenRupsVersusMedan(
      ktx({
        simbol: 'MLPT',
        rups: [rupsMlpt],
        dividen: dividenMlpt,
        stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'MLPT-corpactions.json' }],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('Rp2,14');
    expect(h.temuan[0]?.ringkasan).toContain('Rp3,2');
    expect(h.temuan[0]?.ringkasan).toContain('dikali 25');
  });

  it('konflik untuk RAJA Rp28: tidak cocok dengan cara apa pun', () => {
    const h = r31DividenRupsVersusMedan(
      ktx({
        simbol: 'RAJA',
        rups: [
          {
            tanggal: '2026-06-23',
            ringkasan:
              'approved the allocation of net profit to an interim dividend of Rp 28 per share (paid 29 January 2026) and a final dividend of Rp 40 per share (payable 24 July 2026)',
          },
        ],
        dividen: [
          { ex_date: '2025-05-14', tanggal_bayar: '2025-06-04', nilai_per_lembar: 12 },
          { ex_date: '2026-01-09', tanggal_bayar: '2026-01-28', nilai_per_lembar: 5 },
          { ex_date: '2026-07-02', tanggal_bayar: '2026-07-24', nilai_per_lembar: 40 },
        ],
        stock_split: [{ tanggal: '2026-07-16', rasio: 5, sumber: 'RAJA-corpactions.json' }],
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 2, hijau: 1, merah: 1 });
    expect(h.temuan[0]?.keparahan).toBeUndefined();
    expect(h.temuan[0]?.ringkasan).toContain('Rp28 per lembar');
  });

  it('melewati RUPS pemecahan saham MLPT karena Rp4 itu nilai nominal', () => {
    const h = r31DividenRupsVersusMedan(
      ktx({
        simbol: 'MLPT',
        rups: [
          {
            tanggal: '2026-06-29',
            ringkasan:
              "Approval of the company's stock split plan, changing the nominal value from Rp100 to Rp4 per share",
          },
        ],
        dividen: dividenMlpt,
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 0, merah: 0, dilewati: 1 });
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('tidak menyebut satu pun jumlah rupiah per lembar');
  });

  it('menjawab TIDAK_LENGKAP kalau tidak ada dividen bertanggal dekat RUPS itu', () => {
    const h = r31DividenRupsVersusMedan(
      ktx({
        rups: [rupsMlpt],
        dividen: [{ ex_date: '2019-01-02', tanggal_bayar: null, nilai_per_lembar: 5 }],
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, tidak_lengkap: 1, merah: 0 });
  });

  it('melaporkan penyesuaian pemecahan saham untuk dipakai R26 dan R29', () => {
    const konteksMlpt = ktx({
      simbol: 'MLPT',
      rups: [rupsMlpt],
      dividen: dividenMlpt,
      stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'MLPT-corpactions.json' }],
    });
    expect(penyesuaianSplitDividen(konteksMlpt)).toEqual({
      disesuaikan: true,
      lipat: 25,
      bukti: '2026-04-29',
    });
    expect(penyesuaianSplitDividen(ktx({ simbol: 'MTLA' }))).toEqual({
      disesuaikan: false,
      lipat: 1,
      bukti: null,
    });
  });
});

// --- M2b T-05: R26 dan R27 ---------------------------------------------------

describe('R26 — pembagian laba terhadap laba tahun buku', () => {
  /** Tahun buku dengan laba dan laba per lembar yang memberi jumlah saham persis. */
  const tahunBuku = (t: number, laba: number, lembar: number): Partial<DataEmiten> => ({
    keuangan_tahunan: [
      { tahun: t, laba, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
    ],
    eps_tahunan: [{ tahun: t, eps: laba / lembar }],
  });

  const dividen = (ex: string, nilai: number) => ({
    ex_date: ex,
    tanggal_bayar: null,
    nilai_per_lembar: nilai,
  });

  it('hijau untuk pembagian laba yang masuk akal', () => {
    // Pola MTLA: Rp11,25 per lembar atas laba tahun buku 2024.
    const h = r26PembagianLaba(
      ktx({
        simbol: 'MTLA',
        dividen: [dividen('2025-06-12', 11.25)],
        ...tahunBuku(2024, 500_000_000_000, 7_655_126_330),
      }),
    );
    expect(h.hitungan).toMatchObject({ satuan: 'tahun buku berdividen', diperiksa: 1, hijau: 1, merah: 0 });
  });

  it('merah untuk pola BIRD: dividen dibagikan sesudah tahun buku yang rugi', () => {
    const h = r26PembagianLaba(
      ktx({
        simbol: 'BIRD',
        dividen: [dividen('2021-09-07', 36)],
        ...tahunBuku(2020, -161_353_000_000, 2_502_307_692),
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('rugi Rp161.353.000.000');
    expect(h.temuan[0]?.ringkasan).toContain('-55,8%');
    expect(h.temuan[0]?.ringkasan).not.toContain('untung Rp');
  });

  it('merah untuk pola BIRD kedua: 1.946% dari laba tahun buku', () => {
    const h = r26PembagianLaba(
      ktx({
        simbol: 'BIRD',
        dividen: [dividen('2022-07-04', 60)],
        ...tahunBuku(2021, 7_714_000_000, 2_502_173_913),
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('untung Rp7.714.000.000');
  });

  it('menjumlahkan per tahun buku: dua dividen yang lolos satu-satu tertangkap bersama', () => {
    // Sabotase uji lawan §7: RAJA tahun buku 2025 membagi Rp5 (23,2%) dan
    // Rp40 (185,4%) — keduanya di dalam selang; jumlahnya 208,6% tidak.
    const laba = 455_902_659_945;
    const lembar = 21_138_000_000;
    const satuSatu = (ex: string, nilai: number) =>
      r26PembagianLaba(ktx({ simbol: 'RAJA', dividen: [dividen(ex, nilai)], ...tahunBuku(2025, laba, lembar) }));
    expect(satuSatu('2026-01-09', 5).hitungan.merah).toBe(0);
    expect(satuSatu('2026-07-02', 40).hitungan.merah).toBe(0);

    const bersama = r26PembagianLaba(
      ktx({
        simbol: 'RAJA',
        dividen: [dividen('2026-01-09', 5), dividen('2026-07-02', 40)],
        ...tahunBuku(2025, laba, lembar),
      }),
    );
    expect(bersama.hitungan).toMatchObject({ diperiksa: 1, merah: 1 });
    expect(bersama.temuan[0]?.ringkasan).toContain('2 pembagian');
    expect(bersama.temuan[0]?.ringkasan).toContain('Rp45 per lembar');
  });

  it('memakai jumlah saham tahun buku itu, bukan jumlah saham tahun terakhir', () => {
    // Pola ULTJ dilebih-lebihkan supaya bedanya menentukan putusan: dividen
    // Rp200 per lembar untuk tahun buku 2023, yang basis sahamnya 11,55 miliar.
    // Dengan basis tahun buku terakhir (satu juta lembar) pembagiannya nyaris
    // nol dan lolos hijau; dengan basis tahun bukunya sendiri ia 231%.
    const h = r26PembagianLaba(
      ktx({
        simbol: 'ULTJ',
        dividen: [dividen('2024-05-04', 200)],
        keuangan_tahunan: [
          { tahun: 2023, laba: 1_000_000_000_000, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
          { tahun: 2025, laba: 1_000_000_000_000, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null },
        ],
        eps_tahunan: [
          { tahun: 2023, eps: 1_000_000_000_000 / 11_553_528_000 },
          { tahun: 2025, eps: 1_000_000_000_000 / 1_000_000 },
        ],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('tahun buku 2023');
    expect(h.temuan[0]?.angka.find((a) => a.satuan === 'lembar')?.nilai).toBe(11_553_528_000);
  });

  it('menandai dividen yang dipetakan ke tahun buku yang RUPS-nya menyatakan tidak membagi', () => {
    // Penjaga kalimat negatif. R24 dibuang justru karena tidak punya ini.
    const h = r26PembagianLaba(
      ktx({
        simbol: 'FOLK',
        dividen: [dividen('2026-03-02', 5)],
        rups: [
          {
            tanggal: '2026-06-09',
            ringkasan:
              'Agenda #2: The meeting decided not to distribute dividends for the 2025 fiscal year, instead allocating the net profit to retained earnings.',
          },
        ],
        ...tahunBuku(2025, 1_000_000_000_000, 4_000_000_000),
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('tidak ada dividen yang dibagikan untuk tahun buku 2025');
  });

  it('mengenali kalimat negatif dalam beberapa bentuk, dan tidak salah membaca yang positif', () => {
    expect(menyatakanTanpaDividen('The meeting decided not to distribute dividends for 2025')).toBe(true);
    expect(menyatakanTanpaDividen('designated as retained earnings, with no dividend distribution')).toBe(true);
    expect(menyatakanTanpaDividen('including cash dividends (no cash dividend was proposed)')).toBe(true);
    expect(menyatakanTanpaDividen('approved a total cash dividend of Rp133.50 per share')).toBe(false);
  });

  it('menjawab TIDAK_LENGKAP kalau laba tahun buku itu tidak ada di data', () => {
    const h = r26PembagianLaba(ktx({ dividen: [dividen('2026-01-09', 5)] }));
    expect(h.hitungan).toMatchObject({ diperiksa: 1, tidak_lengkap: 1, merah: 0 });
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('tidak ada di data');
  });

  it('hijau tepat di tepi dua ratus persen', () => {
    const h = r26PembagianLaba(
      ktx({ dividen: [dividen('2026-06-01', 200)], ...tahunBuku(2025, 100_000_000_000, 1_000_000_000) }),
    );
    expect(h.hitungan.merah).toBe(0);
    const lewat = r26PembagianLaba(
      ktx({ dividen: [dividen('2026-06-01', 201)], ...tahunBuku(2025, 100_000_000_000, 1_000_000_000) }),
    );
    expect(lewat.hitungan.merah).toBe(1);
  });

  it('mengalikan kembali dividen yang R31 buktikan sudah dibagi rasio pemecahan saham', () => {
    // Tanpa ini, pembagian laba MLPT terhitung 25 kali terlalu kecil.
    const dasar = {
      simbol: 'MLPT',
      dividen: [dividen('2026-05-11', 3.2)],
      ...tahunBuku(2025, 30_000_000_000, 1_000_000_000),
    };
    expect(r26PembagianLaba(ktx(dasar)).hitungan.merah).toBe(0);

    const denganBukti = r26PembagianLaba(
      ktx({
        ...dasar,
        stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'MLPT-corpactions.json' }],
        rups: [
          {
            tanggal: '2026-04-29',
            ringkasan: 'approved a total cash dividend of Rp80.00 per share for the 2025 fiscal year',
          },
        ],
      }),
    );
    // Tanpa dikalikan kembali: 3,20 x 1 miliar / 30 miliar = 10,7%, hijau.
    // Sesudah dikalikan kembali: Rp80 x 1 miliar / 30 miliar = 266,7%, merah.
    expect(denganBukti.hitungan.merah).toBe(1);
    expect(denganBukti.temuan[0]?.ringkasan).toContain('Rp80 per lembar');
  });
});

describe('R27 — medan rasio siap pakai', () => {
  const rasio = (nama: string, nilai: number, kelompok = 'profitability') => ({
    tahun: 2025,
    kelompok,
    nama,
    nilai,
  });
  const keuangan2025 = (ubah: Partial<DataEmiten['keuangan_tahunan'][number]> = {}) => [
    {
      tahun: 2025,
      laba: 635_837_000_000,
      pendapatan: 5_705_193_000_000,
      ekuitas: 6_326_724_000_000,
      aset: 9_651_198_000_000,
      laba_kotor: 1_814_425_000_000,
      lembar: null,
      ...ubah,
    },
  ];

  it('hijau kalau rasio siap pakai sama dengan hitungan ulangnya', () => {
    const h = r27RasioSiapPakai(
      ktx({
        simbol: 'BIRD',
        rasio: [rasio('roe', 635_837_000_000 / 6_326_724_000_000)],
        keuangan_tahunan: keuangan2025(),
      }),
    );
    expect(h.hitungan).toMatchObject({ satuan: 'medan rasio', diperiksa: 1, hijau: 1, merah: 0 });
  });

  it('merah kalau rasio siap pakai tidak bisa dihitung ulang dari laporan keuangan', () => {
    const h = r27RasioSiapPakai(
      ktx({ rasio: [rasio('roe', 0.5)], keuangan_tahunan: keuangan2025() }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('bukan rumus yang kami kira');
  });

  it('merah untuk pola TLDN: imbal hasil ekuitas 262,52 tidak mungkin', () => {
    const h = r27RasioSiapPakai(ktx({ simbol: 'TLDN', rasio: [rasio('roe', 262.52)] }));
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('di luar selang');
  });

  it('merah untuk pola PSSI: pembagian laba siap pakai yang negatif', () => {
    const h = r27RasioSiapPakai(ktx({ simbol: 'PSSI', rasio: [rasio('payout_ratio', -0.479)] }));
    expect(h.hitungan.merah).toBe(1);
  });

  it('merah untuk pola TIRT: rasio positif yang lahir dari dua angka negatif', () => {
    const h = r27RasioSiapPakai(
      ktx({
        simbol: 'TIRT',
        rasio: [rasio('roe', -33_358_663_046 / -635_584_467_177)],
        keuangan_tahunan: keuangan2025({ laba: -33_358_663_046, ekuitas: -635_584_467_177 }),
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('positif hanya karena kedua angka yang dibagi sama-sama negatif');
    expect(h.temuan[0]?.ringkasan).toContain('terbaca seperti untung, padahal tahun buku itu rugi');
  });

  it('tidak menandai marjin yang besar hanya karena pendapatannya kecil', () => {
    // TIRT 2023: pendapatan Rp22 juta, laba kotor minus Rp29 miliar. Marjinnya
    // -1.306 kali dan angka itu benar. Menandainya berarti menolak data benar.
    const h = r27RasioSiapPakai(
      ktx({
        simbol: 'TIRT',
        rasio: [rasio('gross_profit_margin', -29_193_956_975 / 22_360_023)],
        keuangan_tahunan: keuangan2025({ laba_kotor: -29_193_956_975, pendapatan: 22_360_023 }),
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0, hijau: 1 });
  });

  it('menjawab TIDAK_LENGKAP untuk medan yang tidak punya rumus hitung ulang', () => {
    const h = r27RasioSiapPakai(
      ktx({ rasio: [rasio('current_ratio', 1.93, 'liquidity')], keuangan_tahunan: keuangan2025() }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, tidak_lengkap: 1, merah: 0 });
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('tidak punya rumus hitung ulang');
  });

  it('dilewati beserta alasannya kalau emiten tidak punya medan rasio', () => {
    const h = r27RasioSiapPakai(ktx());
    expect(h.dijalankan).toBe(false);
    expect(h.alasan_lewat).toContain('tidak punya satu pun medan rasio');
  });
});
