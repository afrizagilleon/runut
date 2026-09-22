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
    expect(h.temuan[0]?.ringkasan).toContain('11.11%');
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
    expect(h.temuan[0]?.ringkasan).toContain('2.53%');
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
