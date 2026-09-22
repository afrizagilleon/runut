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
import { harga, konteksGudang, laporan } from './contoh.ts';
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
  daftarAksi,
  gerakanSejalan,
  hargaDiKeduaSisi,
  pasanganSekitarEx,
  r29HargaDiTanggalEx,
  r34AksiTanpaHarga,
  penyebutRantai,
  r11bPenyebutRantai,
} from './aturan-keuangan.ts';

const ktx = (ubah: Partial<DataEmiten> = {}): KonteksGudang => konteksGudang(ubah);

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

// --- M2b T-06: R29 dan R34 ---------------------------------------------------

describe('R29 — gerakan harga di tanggal ex dividen', () => {
  const hari = (tanggal: string, buka: number, tutup: number) =>
    harga({ tanggal, buka, tutup, tertinggi: Math.max(buka, tutup), terendah: Math.min(buka, tutup) });
  const dividen = (ex: string, nilai: number) => ({ ex_date: ex, tanggal_bayar: null, nilai_per_lembar: nilai });

  it('hijau untuk pola ULTJ: turun Rp145 pada dividen Rp130', () => {
    const h = r29HargaDiTanggalEx(
      ktx({
        simbol: 'ULTJ',
        dividen: [dividen('2026-05-04', 130)],
        harga: [hari('2026-04-30', 1700, 1690), hari('2026-05-04', 1545, 1550)],
      }),
    );
    expect(h.hitungan).toMatchObject({ satuan: 'dividen', diperiksa: 1, hijau: 1, merah: 0 });
  });

  it('hijau untuk pola MTLA: harga tidak bergerak sama sekali dari tutup ke buka', () => {
    const h = r29HargaDiTanggalEx(
      ktx({
        simbol: 'MTLA',
        dividen: [dividen('2025-06-12', 11.25)],
        harga: [hari('2025-06-11', 426, 426), hari('2025-06-12', 426, 430)],
      }),
    );
    expect(h.hitungan.merah).toBe(0);
  });

  it('hijau untuk kenaikan Rp1 pada dividen Rp3,20: selangnya asimetris', () => {
    // Selang lama [0, 3 x dividen] menghitung kenaikan Rp1 sebagai merah sama
    // beratnya dengan kenaikan Rp7 pada dividen Rp0,14. Selang baru membolehkan
    // kenaikan sampai satu kali dividen.
    const h = r29HargaDiTanggalEx(
      ktx({
        simbol: 'MLPT',
        dividen: [dividen('2026-05-11', 3.2)],
        harga: [hari('2026-05-08', 840, 845), hari('2026-05-11', 846, 850)],
      }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(gerakanSejalan(-1_000, 3_200)).toBe(true);
  });

  it('merah kalau harga naik lebih dari satu kali besar dividen', () => {
    const h = r29HargaDiTanggalEx(
      ktx({
        dividen: [dividen('2026-05-11', 10)],
        harga: [hari('2026-05-08', 840, 845), hari('2026-05-11', 860, 865)],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('naik Rp15');
    expect(h.temuan[0]?.ringkasan).toContain('hari pertama pembeli baru tidak lagi kebagian');
  });

  it('merah kalau harga turun lebih dari tiga kali besar dividen', () => {
    const h = r29HargaDiTanggalEx(
      ktx({
        dividen: [dividen('2026-05-11', 10)],
        harga: [hari('2026-05-08', 840, 845), hari('2026-05-11', 800, 805)],
      }),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('turun Rp45');
  });

  it('hijau tepat di kedua tepi selang', () => {
    expect(gerakanSejalan(30_000, 10_000)).toBe(true);
    expect(gerakanSejalan(30_001, 10_000)).toBe(false);
    expect(gerakanSejalan(-10_000, 10_000)).toBe(true);
    expect(gerakanSejalan(-10_001, 10_000)).toBe(false);
  });

  it('melewati dividen DADA Rp0,14, karena satu fraksi harga saja tujuh kali lebih besar', () => {
    const h = r29HargaDiTanggalEx(
      ktx({
        simbol: 'DADA',
        dividen: [dividen('2025-09-16', 0.14)],
        harga: [hari('2025-09-15', 70, 72), hari('2025-09-16', 79, 80)],
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 0, merah: 0, dilewati: 1 });
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('lebih kecil daripada satu fraksi harga bursa');
  });

  it('mengalikan kembali dividen yang R31 buktikan sudah dibagi rasio pemecahan saham', () => {
    // MLPT ex 2025-11-07: tutup Rp3.180 lalu buka Rp3.192, naik Rp12.
    // Medan dividen memberi Rp2,14 — lebih kecil daripada satu fraksi harga
    // Rp5 di tingkat harga itu, jadi tanpa koreksi dividen ini bahkan tidak
    // bisa diperiksa. Dengan koreksi ia Rp53,50, dan kenaikan Rp12 sejalan.
    const hargaMlpt = [hari('2025-11-06', 3170, 3180), hari('2025-11-07', 3192, 3200)];
    const tanpaBukti = r29HargaDiTanggalEx(
      ktx({ simbol: 'MLPT', dividen: [dividen('2025-11-07', 2.14)], harga: hargaMlpt }),
    );
    expect(tanpaBukti.hitungan).toMatchObject({ diperiksa: 0, merah: 0, dilewati: 1 });

    const denganBukti = r29HargaDiTanggalEx(
      ktx({
        simbol: 'MLPT',
        dividen: [dividen('2025-11-07', 2.14), dividen('2026-05-11', 3.2)],
        harga: [...hargaMlpt, hari('2026-05-08', 840, 845), hari('2026-05-11', 846, 850)],
        stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'MLPT-corpactions.json' }],
        rups: [
          {
            tanggal: '2026-04-29',
            ringkasan: 'approved a total cash dividend of Rp133.50 per share for the 2025 fiscal year',
          },
        ],
      }),
    );
    expect(denganBukti.hitungan).toMatchObject({ diperiksa: 2, hijau: 2, merah: 0, dilewati: 0 });
  });

  it('mencoba hari bursa tetangga, karena tanggal ex dipercaya kurang lebih satu hari', () => {
    // Gerakan pada pasangan utama tidak sejalan, tetapi pasangan sehari
    // sebelumnya sejalan. Aturan penanda tidak menuduh kalau masih ada bacaan
    // yang masuk akal.
    const h = r29HargaDiTanggalEx(
      ktx({
        dividen: [dividen('2026-05-12', 10)],
        harga: [
          hari('2026-05-08', 850, 850),
          hari('2026-05-11', 830, 830),
          hari('2026-05-12', 780, 780),
        ],
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0 });
    expect(pasanganSekitarEx(h.temuan.length === 0 ? [] : [], '2026-05-12')).toEqual([]);
  });

  it('menjawab TIDAK_LENGKAP kalau tidak ada harga di kedua sisi tanggal ex', () => {
    const h = r29HargaDiTanggalEx(
      ktx({ dividen: [dividen('2026-05-11', 10)], harga: [hari('2026-05-12', 100, 100)] }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, tidak_lengkap: 1, merah: 0 });
  });
});

describe('R34 — aksi korporasi dengan harga di kedua sisinya', () => {
  const hari = (tanggal: string) => harga({ tanggal, buka: 100, tutup: 100, tertinggi: 100, terendah: 100 });

  it('menghitung seluruh jenis aksi korporasi dalam satu daftar terurut', () => {
    const k = ktx({
      dividen: [{ ex_date: '2026-05-11', tanggal_bayar: null, nilai_per_lembar: 3.2 }],
      right_issue: [{ ex_date: '2025-10-09', rasio_lama: 1, rasio_baru: 3, sumber: 'x' }],
      stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'x' }],
      bonus: [{ ex_date: '2015-08-21', sumber: 'x', rasio_lama: 100, rasio_baru: 1 }],
    });
    expect(daftarAksi(k).map((a) => a.jenis + ' ' + a.tanggal)).toEqual([
      'saham bonus 2015-08-21',
      'penerbitan saham baru 2025-10-09',
      'dividen tunai 2026-05-11',
      'pemecahan saham 2026-07-21',
    ]);
  });

  it('hijau kalau ada baris harga sebelum dan pada tanggal aksinya', () => {
    const h = r34AksiTanpaHarga(
      ktx({
        stock_split: [{ tanggal: '2026-07-21', rasio: 25, sumber: 'x' }],
        harga: [hari('2026-07-20'), hari('2026-07-21')],
      }),
    );
    expect(h.hitungan).toMatchObject({ satuan: 'aksi korporasi', diperiksa: 1, hijau: 1, merah: 0, tidak_lengkap: 0 });
  });

  it('TIDAK_LENGKAP, bukan merah, kalau salah satu sisinya tidak ada', () => {
    // Satu-satunya saham bonus di seluruh gudang, MTLA 2015, tanpa harga 2015.
    const h = r34AksiTanpaHarga(
      ktx({
        simbol: 'MTLA',
        bonus: [{ ex_date: '2015-08-21', sumber: 'x', rasio_lama: 100, rasio_baru: 1 }],
        harga: [hari('2025-06-11'), hari('2025-06-12')],
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0, tidak_lengkap: 1 });
    expect(h.temuan[0]?.keparahan).toBe('catatan');
    expect(h.temuan[0]?.ringkasan).toContain('saham bonus 2015-08-21');
    expect(h.temuan[0]?.ringkasan).toContain('daftar pekerjaan penarikan data, bukan tanda bahwa ada yang salah');
  });

  it('tidak menghitung baris harga cacat sebagai sisi yang ada', () => {
    const cacat = harga({ tanggal: '2026-07-20', buka: 0, tutup: 0, tertinggi: 0, terendah: 0 });
    cacat.buka_kosong = true;
    expect(hargaDiKeduaSisi([cacat, hari('2026-07-21')], '2026-07-21')).toBe(false);
    expect(hargaDiKeduaSisi([hari('2026-07-20'), hari('2026-07-21')], '2026-07-21')).toBe(true);
  });

  it('dilewati beserta alasannya kalau emiten tidak punya aksi korporasi', () => {
    const h = r34AksiTanpaHarga(ktx());
    expect(h.dijalankan).toBe(false);
    expect(h.alasan_lewat).toContain('tidak punya satu pun aksi korporasi');
  });
});

// --- M2b T-07: R11b ----------------------------------------------------------

describe('R11b — satu penyebut untuk seluruh rantai', () => {
  /** Laporan yang persennya dihitung persis dari `beredar`, dengan dua desimal. */
  const sisi = (waktu: string, sebelum: number, sesudah: number, beredar: number) =>
    laporan({
      laporan_id: 'lap-' + waktu,
      dilaporkan_pada: waktu,
      sumber_dokumen: undefined,
      sebelum,
      sesudah,
      persen_sebelum: Number(((sebelum / beredar) * 100).toFixed(2)),
      persen_sesudah: Number(((sesudah / beredar) * 100).toFixed(2)),
    });

  it('hijau kalau seluruh rantai bisa dijelaskan satu jumlah saham', () => {
    const beredar = 3_948_108_393;
    const h = r11bPenyebutRantai(
      ktx({
        laporan: [
          sisi('2026-01-05T10:00:00', 900_000_000, 880_000_000, beredar),
          sisi('2026-02-05T10:00:00', 880_000_000, 860_000_000, beredar),
          sisi('2026-03-05T10:00:00', 860_000_000, 840_000_000, beredar),
        ],
      }),
    );
    expect(h.hitungan).toMatchObject({ satuan: 'sisi laporan', diperiksa: 6, hijau: 6, merah: 0 });
    expect(h.temuan).toHaveLength(0);
  });

  it('merah untuk pola FOLK: satu laporan memakai penyebut yang berbeda', () => {
    // Tujuh laporan sepakat 3.948 juta; laporan terakhir memakai 4.091 juta,
    // yaitu sesudah FOLK menerbitkan saham baru.
    const lama = 3_948_108_393;
    const baru = 4_091_357_544;
    const h = r11bPenyebutRantai(
      ktx({
        simbol: 'FOLK',
        laporan: [
          sisi('2026-01-05T10:00:00', 900_000_000, 880_000_000, lama),
          sisi('2026-02-05T10:00:00', 880_000_000, 860_000_000, lama),
          sisi('2026-03-05T10:00:00', 860_000_000, 840_000_000, lama),
          sisi('2026-05-19T12:50:02', 840_000_000, 820_000_000, baru),
        ],
      }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 8, merah: 2 });
    expect(h.temuan[0]?.keparahan).toBe('peringatan');
    expect(h.temuan[0]?.ringkasan).toContain('2026-05-19T12:50:02');
    // Angka yang dipilih adalah titik tengah irisan kelompok terbanyak, jadi ia
    // tidak persis sama dengan penyebut yang saya pakai menyusun bahan ujinya —
    // tetapi ia harus jatuh di dalam seperseribu dari angka itu.
    const pilihan = penyebutRantai(
      ktx({
        simbol: 'FOLK',
        laporan: [
          sisi('2026-01-05T10:00:00', 900_000_000, 880_000_000, lama),
          sisi('2026-02-05T10:00:00', 880_000_000, 860_000_000, lama),
          sisi('2026-03-05T10:00:00', 860_000_000, 840_000_000, lama),
          sisi('2026-05-19T12:50:02', 840_000_000, 820_000_000, baru),
        ],
      }),
    );
    expect(pilihan?.didukung).toBe(6);
    expect(Math.abs((pilihan?.lembar ?? 0) - lama) / lama).toBeLessThan(0.001);
    expect(h.temuan[0]?.ringkasan).toContain('belum tentu kesalahan');
  });

  it('memilih kelompok terbanyak, bukan kelompok yang lebih dulu disapu', () => {
    // Dua laporan memakai penyebut A, empat memakai penyebut B. Kalau
    // pemilihannya bergantung urutan sapuan, yang pertama yang menang.
    const a = 1_000_000_000;
    const b = 2_000_000_000;
    const h = r11bPenyebutRantai(
      ktx({
        laporan: [
          sisi('2026-01-05T10:00:00', 400_000_000, 390_000_000, a),
          sisi('2026-02-05T10:00:00', 800_000_000, 780_000_000, b),
          sisi('2026-03-05T10:00:00', 760_000_000, 740_000_000, b),
          sisi('2026-04-05T10:00:00', 720_000_000, 700_000_000, b),
        ],
      }),
    );
    expect(penyebutRantai(ktx({
      laporan: [
        sisi('2026-01-05T10:00:00', 400_000_000, 390_000_000, a),
        sisi('2026-02-05T10:00:00', 800_000_000, 780_000_000, b),
        sisi('2026-03-05T10:00:00', 760_000_000, 740_000_000, b),
        sisi('2026-04-05T10:00:00', 720_000_000, 700_000_000, b),
      ],
    }))?.didukung).toBe(6);
    expect(h.hitungan.merah).toBe(2);
  });

  it('memakai aturan seri yang tertulis, dan mencatat bahwa ia terpakai', () => {
    // Dua laporan memakai penyebut A, dua memakai penyebut B: seri 4 lawan 4.
    // Yang menang adalah yang paling dekat ke nilai pasar dibagi harga tutup
    // pada tanggal laporan terakhir.
    const a = 1_000_000_000;
    const b = 2_000_000_000;
    const daftar = [
      sisi('2026-01-05T10:00:00', 400_000_000, 390_000_000, a),
      sisi('2026-02-05T10:00:00', 380_000_000, 370_000_000, a),
      sisi('2026-03-05T10:00:00', 760_000_000, 740_000_000, b),
      sisi('2026-04-05T10:00:00', 720_000_000, 700_000_000, b),
    ];
    const dekatB = penyebutRantai(
      ktx({
        laporan: daftar,
        harga: [
          harga({ tanggal: '2026-04-05', tutup: 100, buka: 100, tertinggi: 100, terendah: 100, nilai_pasar: 100 * b }),
        ],
      }),
    );
    expect(dekatB?.lembar).toBeGreaterThan(1_500_000_000);
    expect(dekatB?.alasan).toContain('paling dekat ke nilai pasar dibagi harga tutup');

    const dekatA = penyebutRantai(
      ktx({
        laporan: daftar,
        harga: [
          harga({ tanggal: '2026-04-05', tutup: 100, buka: 100, tertinggi: 100, terendah: 100, nilai_pasar: 100 * a }),
        ],
      }),
    );
    expect(dekatA?.lembar).toBeLessThan(1_500_000_000);
  });

  it('memilih yang lembarnya lebih sedikit kalau tidak ada nilai pasar untuk menengahi', () => {
    const a = 1_000_000_000;
    const b = 2_000_000_000;
    const hasilSeri = penyebutRantai(
      ktx({
        laporan: [
          sisi('2026-01-05T10:00:00', 400_000_000, 390_000_000, a),
          sisi('2026-02-05T10:00:00', 380_000_000, 370_000_000, a),
          sisi('2026-03-05T10:00:00', 760_000_000, 740_000_000, b),
          sisi('2026-04-05T10:00:00', 720_000_000, 700_000_000, b),
        ],
      }),
    );
    expect(hasilSeri?.lembar).toBeLessThan(1_500_000_000);
    expect(hasilSeri?.alasan).toContain('yang lembarnya paling sedikit dipilih');
  });

  it('membandingkan batas selang secara eksak, bukan lewat pembagian yang dibulatkan', () => {
    // Selang satu sisi laporan selebar kira-kira sepersepuluh ribu penyebutnya.
    // Kalau perbandingan batasnya dibulatkan lebih kasar daripada itu, irisan
    // kelompok salah dan titik tengahnya jatuh di luar sebagian selang.
    const beredar = 889_863_981;
    const persis = (waktu: string, sebelum: number, sesudah: number) =>
      laporan({
        laporan_id: 'lap-' + waktu,
        dilaporkan_pada: waktu,
        sumber_dokumen: undefined,
        sebelum,
        sesudah,
        persen_sebelum: Number(((sebelum / beredar) * 100).toFixed(2)),
        persen_sesudah: Number(((sesudah / beredar) * 100).toFixed(2)),
      });
    const lain = beredar + 445_000; // 0,05% lebih banyak
    const persisLain = (waktu: string, sebelum: number, sesudah: number) =>
      laporan({
        laporan_id: 'lap-' + waktu,
        dilaporkan_pada: waktu,
        sumber_dokumen: undefined,
        sebelum,
        sesudah,
        persen_sebelum: Number(((sebelum / lain) * 100).toFixed(2)),
        persen_sesudah: Number(((sesudah / lain) * 100).toFixed(2)),
      });
    const pilihan = penyebutRantai(
      ktx({
        laporan: [
          persis('2025-09-30T19:55:29', 543_842_937, 543_350_037),
          persis('2025-09-30T20:31:05', 542_487_737, 533_288_237),
          persisLain('2025-10-14T07:44:00', 543_842_937, 543_350_037),
          persisLain('2025-10-15T07:44:00', 542_487_737, 533_288_237),
        ],
      }),
    );
    // Dua kelompok yang selangnya terpisah, masing-masing empat sisi. Satu
    // kelompok saja yang boleh menang; perbandingan yang dibulatkan lebih kasar
    // daripada lebar selangnya akan menyatukan kedelapannya.
    expect(pilihan?.dari).toBe(8);
    expect(pilihan?.didukung).toBe(4);
  });

  it('memberi jawaban yang sama pada dua kali panggilan (INV-C)', () => {
    const buat = () =>
      ktx({
        laporan: [
          sisi('2026-01-05T10:00:00', 400_000_000, 390_000_000, 1_000_000_000),
          sisi('2026-02-05T10:00:00', 800_000_000, 780_000_000, 2_000_000_000),
          sisi('2026-03-05T10:00:00', 760_000_000, 740_000_000, 2_000_000_000),
        ],
      });
    expect(JSON.stringify(penyebutRantai(buat()))).toBe(JSON.stringify(penyebutRantai(buat())));
  });

  it('dilewati beserta alasannya kalau rantainya kurang dari dua laporan', () => {
    const h = r11bPenyebutRantai(ktx({ laporan: [sisi('2026-01-05T10:00:00', 400_000_000, 390_000_000, 1_000_000_000)] }));
    expect(h.dijalankan).toBe(false);
    expect(h.alasan_lewat).toContain('Kurang dari dua laporan');
  });

  it('menjawab TIDAK_LENGKAP untuk sisi yang persennya nol', () => {
    const nol = laporan({
      laporan_id: 'lap-nol',
      dilaporkan_pada: '2026-05-05T10:00:00',
      sumber_dokumen: undefined,
      sebelum: 100_000_000,
      sesudah: 90_000_000,
      persen_sebelum: 0,
      persen_sesudah: 0,
    });
    const h = r11bPenyebutRantai(
      ktx({
        laporan: [
          sisi('2026-01-05T10:00:00', 400_000_000, 390_000_000, 1_000_000_000),
          sisi('2026-02-05T10:00:00', 390_000_000, 380_000_000, 1_000_000_000),
          nol,
        ],
      }),
    );
    expect(h.hitungan.tidak_lengkap).toBe(2);
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('Persen yang dilaporkan nol');
  });
});
