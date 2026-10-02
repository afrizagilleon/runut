/**
 * M4c — dua bug sisa R23 yang dibuktikan uji ulang M4b (B05 AVIA, B06 BSIM).
 *
 * D-1 kata skala: keputusan RUPS AVIA menulis "net profit of Rp1.74 trillion",
 * tetapi pembaca angka rupiah berhenti di "Rp1.74" dan R23 mengadu Rp2 dengan
 * laba 1.747.462.000.000. Angka berskala harus dibaca dengan skalanya dan
 * dibandingkan pada presisi yang tertulis (cara R31 M4a).
 *
 * Fixture disalin dari respons mentah Sectors di `.cache/sectors/` (nama
 * berkas disebut di atas tiap fixture). Yang sintetis ditandai SINTETIS.
 * Ditulis MERAH lebih dulu, sebelum pembacanya ada.
 */
import { describe, expect, it } from 'vitest';
import { bacaAngkaLabaR23, bacaAngkaRupiah, r23LabaBedaEndpoint } from './aturan-keuangan.ts';
import { konteksGudang } from './contoh.ts';
import type { KeuanganTahunan } from './tipe.ts';

// AVIA-m4a-overview-financials.json, tahun buku 2025 (semua medan uang kelipatan satu juta).
const AVIA_2025: KeuanganTahunan = {
  tahun: 2025,
  laba: 1_747_462_000_000,
  pendapatan: 8_123_685_000_000,
  ekuitas: 9_540_224_000_000,
  aset: 11_084_379_000_000,
  laba_kotor: 3_578_256_000_000,
  lembar: 60_029_611_817,
  utang: 86_208_000_000,
  liabilitas: 1_544_155_000_000,
  kas: 1_654_810_000_000,
  aset_lancar: 7_821_844_000_000,
  laba_sebelum_pajak: 2_175_816_000_000,
  pajak: 431_796_000_000,
};

// AVIA-m4a-corpactions.json, agm 2026-04-09, agenda #2 agm_result apa adanya.
const TEKS_AVIA =
  'Agenda #2: The 2025 net profit of Rp1.74 trillion was allocated for a total cash dividend of Rp23 per ' +
  'share, consisting of an Rp11 interim dividend and an Rp12 final dividend.';

function rupsAvia(teks: string = TEKS_AVIA) {
  return { tanggal: '2026-04-09', ringkasan: teks };
}

function r23Avia(teks: string = TEKS_AVIA) {
  return r23LabaBedaEndpoint(konteksGudang({ simbol: 'AVIA', rups: [rupsAvia(teks)], keuangan_tahunan: [AVIA_2025] }));
}

describe('bacaAngkaLabaR23 — kata skala (M4c D-1)', () => {
  it('AVIA: "Rp1.74 trillion" = 1.740.000.000.000, presisi dua desimal triliun (Rp10 miliar)', () => {
    const [a] = bacaAngkaLabaR23(TEKS_AVIA);
    expect(a).toMatchObject({ rupiah: 1_740_000_000_000, presisi: 10_000_000_000, teks: 'Rp1.74 trillion' });
    expect(TEKS_AVIA.slice(a?.mulai, a?.selesai)).toBe('Rp1.74 trillion');
  });

  it('kata skala Inggris yang ada di gudang: million, billion, trillion (koma ribuan, titik desimal)', () => {
    // ASLC-m4a-corpactions.json, ASPR-m4a-corpactions.json, ASSA-m4a-corpactions.json
    const daftar = bacaAngkaLabaR23(
      'allocated Rp12.69 billion for cash dividends at Rp1 per share and Rp500 million for reserves; ' +
        'Rp 8.74 billion in net profit; Rp417.7 billion',
    );
    expect(daftar.map((a) => [a.rupiah, a.presisi])).toEqual([
      [12_690_000_000, 10_000_000],
      [1, 1],
      [500_000_000, 1_000_000],
      [8_740_000_000, 10_000_000],
      [417_700_000_000, 100_000_000],
    ]);
  });

  it('SINTETIS: "thousand" dan pemisah ribuan gaya Inggris di depan kata skala', () => {
    expect(bacaAngkaLabaR23('Rp3 thousand')[0]).toMatchObject({ rupiah: 3_000, presisi: 1_000 });
    expect(bacaAngkaLabaR23('Rp1,740 trillion')[0]).toMatchObject({
      rupiah: 1_740_000_000_000_000,
      presisi: 1_000_000_000_000,
    });
    expect(bacaAngkaLabaR23('Rp1.740 trillion')[0]).toMatchObject({
      rupiah: 1_740_000_000_000,
      presisi: 1_000_000_000,
    });
  });

  it('SINTETIS (gudang tidak memuat teks berbahasa Indonesia): ribu/juta/miliar/triliun dibaca gaya Indonesia', () => {
    expect(bacaAngkaLabaR23('laba bersih Rp1,74 triliun')[0]).toMatchObject({
      rupiah: 1_740_000_000_000,
      presisi: 10_000_000_000,
    });
    // Titik adalah pemisah ribuan gaya Indonesia: 1.740 miliar = 1,74 triliun.
    expect(bacaAngkaLabaR23('Rp1.740 miliar')[0]).toMatchObject({
      rupiah: 1_740_000_000_000,
      presisi: 1_000_000_000,
    });
    expect(bacaAngkaLabaR23('Rp500 juta')[0]).toMatchObject({ rupiah: 500_000_000, presisi: 1_000_000 });
    expect(bacaAngkaLabaR23('Rp12 ribu')[0]).toMatchObject({ rupiah: 12_000, presisi: 1_000 });
    expect(bacaAngkaLabaR23('Rp2 milyar')[0]).toMatchObject({ rupiah: 2_000_000_000, presisi: 1_000_000_000 });
  });

  it('kata skala Indonesia dengan titik desimal gaya Inggris ("Rp1.74 miliar") tidak ditebak: tidak terbaca', () => {
    const [a] = bacaAngkaLabaR23('Rp1.74 miliar');
    expect(a?.rupiah).toBeNull();
    expect(a?.teks).toBe('Rp1.74 miliar');
  });

  it('"Rp1.740" tanpa kata skala tetap Rp1,74 (dibulatkan Rp2), tidak pernah triliun', () => {
    expect(bacaAngkaLabaR23('net profit of Rp1.740 was allocated')[0]).toMatchObject({
      rupiah: 2,
      presisi: 1,
      teks: 'Rp1.740',
    });
  });

  it('tanpa kata skala, hasilnya sama dengan bacaAngkaRupiah dibulatkan ke rupiah, presisi Rp1', () => {
    const teks =
      'net profit of Rp285,747,406,391. The 2025 net profit of Rp40,983,839,406.00 was designated; Rp133.50 per share';
    expect(bacaAngkaLabaR23(teks).map((a) => [a.rupiah, a.presisi, a.mulai, a.selesai, a.teks])).toEqual(
      bacaAngkaRupiah(teks).map((a) => [Math.round(a.milli / 1000), 1, a.mulai, a.selesai, a.teks]),
    );
  });

  it('singkatan yang tidak ada di gudang (bn, T, M, B) tidak dibaca sebagai skala', () => {
    for (const teks of ['Rp2 bn', 'Rp2 T', 'Rp2 M', 'Rp2 B', 'Rp2 billionaire']) {
      expect(bacaAngkaLabaR23(teks)[0], teks).toMatchObject({ rupiah: 2, presisi: 1, teks: 'Rp2' });
    }
  });

  it('bacaAngkaRupiah (dipakai R31 dan lainnya) tidak berubah: "Rp1.74 trillion" tetap 1,74', () => {
    expect(bacaAngkaRupiah(TEKS_AVIA)[0]).toMatchObject({ milli: 1_740, teks: 'Rp1.74' });
  });
});

describe('R23 — angka berskala dibandingkan pada presisi yang tertulis (M4c D-1)', () => {
  it('B05 AVIA: Rp1.74 trillion ↔ laba 1.747.462.000.000 → cocok (selisih Rp7,46 miliar < Rp10 miliar)', () => {
    const h = r23Avia();
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0, hijau: 1, tidak_lengkap: 0 });
    expect(h.temuan).toEqual([]);
  });

  it('SABOTASE ×1000: "Rp1.74 billion" atau "Rp1,740 trillion" tetap MERAH', () => {
    for (const ganti of ['Rp1.74 billion', 'Rp1,740 trillion']) {
      const h = r23Avia(TEKS_AVIA.replace('Rp1.74 trillion', ganti));
      expect(h.hitungan.merah, ganti).toBe(1);
    }
  });

  it('SABOTASE: selisih lebih dari satu satuan presisi tetap MERAH (Rp1.73 / Rp1.76 trillion)', () => {
    // 1,73 T: selisih 17,46 miliar; 1,76 T: selisih 12,54 miliar — keduanya > Rp10 miliar.
    for (const ganti of ['Rp1.73 trillion', 'Rp1.76 trillion']) {
      expect(r23Avia(TEKS_AVIA.replace('Rp1.74 trillion', ganti)).hitungan.merah, ganti).toBe(1);
    }
    // 1,75 T (pembulatan biasa dari 1,747): selisih 2,54 miliar < Rp10 miliar → cocok.
    expect(r23Avia(TEKS_AVIA.replace('Rp1.74 trillion', 'Rp1.75 trillion')).hitungan.merah).toBe(0);
  });

  it('SABOTASE: "Rp1.740" tanpa kata skala tidak dibaca triliun → MERAH', () => {
    expect(r23Avia(TEKS_AVIA.replace('Rp1.74 trillion', 'Rp1.740')).hitungan.merah).toBe(1);
  });

  it('temuan merah atas angka berskala menyebut teks aslinya dan presisi pembandingnya', () => {
    const h = r23Avia(TEKS_AVIA.replace('Rp1.74 trillion', 'Rp1.74 billion'));
    const t = h.temuan[0];
    expect(t?.ringkasan).toContain('Rp1.740.000.000');
    expect(t?.ringkasan).toContain('"Rp1.74 billion"');
    expect(t?.ringkasan).toContain('Rp10.000.000');
    expect(t?.angka.find((a) => a.label === 'laba menurut keputusan RUPS')?.nilai).toBe(1_740_000_000);
    expect(t?.angka.find((a) => a.label === 'presisi pembanding')?.nilai).toBe(10_000_000);
  });

  it('angka berskala yang tidak terbaca pasti → tidak lengkap, bukan merah dan bukan hijau', () => {
    const h = r23Avia(TEKS_AVIA.replace('Rp1.74 trillion', 'Rp1.74 triliun'));
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0, hijau: 0, tidak_lengkap: 1 });
    expect(h.hitungan.alasan_dilewati.join(' ')).toContain('Rp1.74 triliun');
  });
});
