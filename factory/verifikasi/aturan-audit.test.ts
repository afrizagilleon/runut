/**
 * M4b — aturan R baru dari salah nyata audit gudang M4a.
 *
 * Tiap fixture disalin dari respons mentah Sectors di `.cache/sectors/` (baris
 * yang sama, angka yang sama; nama berkas disebut di atas tiap fixture). Yang
 * sintetis ditandai SINTETIS dan alasannya ditulis. Ditulis MERAH lebih dulu,
 * sebelum aturannya ada.
 *
 * R36 — laporan tentang saham emiten lain. Salah nyata: laporan bersimbol
 * ADRO.JK berjudul "Alamtri Resources Indonesia Buy Transaction of Alamtri
 * Minerals Indonesia" (uji ulang M4a U18). Ini cakupan R6 lama ("laporannya
 * ternyata bercerita tentang saham lain") yang hilang ketika R6 digantikan
 * R17B, yang hanya memeriksa harga.
 */
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cocokNamaEmiten,
  r36LaporanSahamLain,
  r37BagianMelebihiKeseluruhan,
  sasaranJudul,
} from './aturan-audit.ts';
import { harga, konteksGudang, laporan } from './contoh.ts';
import { labaSesudahPajak, r23LabaBedaEndpoint } from './aturan-keuangan.ts';
import { keparahanTemuan } from '../skema/tipe.ts';
import type { BarisHarga, KeuanganTahunan, Laporan } from './tipe.ts';
import { konteksEmiten } from './konteks.ts';
import { muatGudangManifest } from '../muat/gudang-manifest.ts';

/** Satu hari harga: cukup `nilai_pasar` dan `tutup` untuk titik saham beredar. */
function hari(tanggal: string, tutup: number, nilai_pasar: number): BarisHarga {
  return harga({ tanggal, buka: tutup, tertinggi: tutup, terendah: tutup, tutup, volume: 1, nilai_pasar });
}

/** Satu tahun buku; medan yang tidak dipakai R37 dibiarkan kosong. */
function keuangan(ubah: Partial<KeuanganTahunan> & { tahun: number }): KeuanganTahunan {
  return { laba: null, pendapatan: null, ekuitas: null, aset: null, laba_kotor: null, lembar: null, ...ubah };
}

function lap(ubah: Partial<Laporan>): Laporan {
  return laporan({ transaksi: [], teks: '', ...ubah });
}

// ADRO-m4a-daily-2025-10-02.json dan ADRO-m4a-daily-2026-05-07.json
const HARGA_ADRO = [
  hari('2025-10-16', 1675, 49_227_729_745_000),
  hari('2025-10-17', 1650, 48_492_987_510_000),
  hari('2026-05-22', 2350, 69_065_770_090_000),
  hari('2026-05-25', 2300, 67_596_285_620_000),
];
const NAMA_ADRO = 'Alamtri Resources Indonesia Tbk'; // ADRO-m4a-overview-financials.json company_name

// ADRO-m4a-filings-p0.json, baris 2: laporan tentang saham Alamtri Minerals.
const ADRO_MINERALS = lap({
  laporan_id: 'ADRO|2025-10-17T22:27:59|4d80ecf450_17be92eba5.pdf',
  simbol: 'ADRO',
  pemegang: 'Alamtri Resources Indonesia',
  judul: 'Alamtri Resources Indonesia Buy Transaction of Alamtri Minerals Indonesia',
  dilaporkan_pada: '2025-10-17T22:27:59',
  jenis: 'beli',
  jenis_mentah: 'buy',
  jumlah: 231_000_000,
  harga: 1435,
  sebelum: 34_525_541_100,
  sesudah: 34_756_541_100,
  persen_sebelum: 84.451,
  persen_sesudah: 85.016,
  berkas: '4d80ecf450_17be92eba5.pdf',
});

// ADRO-m4a-filings-p0.json, baris 1: laporan sah tentang saham ADRO.
const ADRO_TRIPUTRA = lap({
  laporan_id: 'ADRO|2026-05-25T14:46:54|LK-25052026-0814-00.pdf-0.pdf',
  simbol: 'ADRO',
  pemegang: 'Triputra Investindo Arya',
  judul: 'Triputra Investindo Arya buys shares of Alamtri Resources Indonesia',
  dilaporkan_pada: '2026-05-25T14:46:54',
  jenis: 'beli',
  jenis_mentah: 'buy',
  jumlah: 20_479_100,
  sebelum: 188_696_800,
  sesudah: 209_175_900,
  persen_sebelum: 0.64,
  persen_sesudah: 0.71,
  berkas: 'LK-25052026-0814-00.pdf-0.pdf',
});

describe('R36 — nama perusahaan di judul laporan', () => {
  it('membaca perusahaan yang sahamnya diperdagangkan dari tiap pola judul di gudang', () => {
    expect(sasaranJudul('Alamtri Resources Indonesia Buy Transaction of Alamtri Minerals Indonesia')).toBe(
      'Alamtri Minerals Indonesia',
    );
    expect(sasaranJudul('Triputra Investindo Arya buys shares of Alamtri Resources Indonesia')).toBe(
      'Alamtri Resources Indonesia',
    );
    expect(sasaranJudul('Arkora Bakti Indonesia sells shares of ARKO')).toBe('ARKO');
    expect(sasaranJudul('X Receives Shares of Ancara Logistics Indonesia')).toBe('Ancara Logistics Indonesia');
    expect(sasaranJudul('X buys 1,744,000,000 shares of Ancara Logistics Indonesia')).toBe('Ancara Logistics Indonesia');
    expect(sasaranJudul("Change in Budi's position in Asri Karya Lestari")).toBe('Asri Karya Lestari');
    // "of" di dalam nama perusahaan tidak memotong namanya (Bank of India Indonesia = BSWD).
    expect(sasaranJudul('X buys shares of Bank of India Indonesia')).toBe('Bank of India Indonesia');
    expect(sasaranJudul('')).toBeNull();
    expect(sasaranJudul('Pengumuman tanpa pola')).toBeNull();
  });

  it('mencocokkan ejaan yang sah: huruf besar-kecil, PT/Tbk/(Persero), kata sesudah nama, kode saham', () => {
    // BCIC-m4a-filings-p1.json: "J Trust Asia Sell Transaction of Bank Jtrust Indonesia"
    expect(cocokNamaEmiten('Bank Jtrust Indonesia', 'BCIC', 'PT Bank JTrust Indonesia Tbk.', 'J Trust Asia')).toBe('nama');
    // ADHI-m4a-filings-p0.json: "Vera Kirana Buy Transaction of Adhi Karya"
    expect(cocokNamaEmiten('Adhi Karya', 'ADHI', 'PT Adhi Karya (Persero) Tbk.', 'Vera Kirana')).toBe('nama');
    // ALKA-m4a-filings-p0.json: "Gesit Alumas Sell Transaction of Alakasa Industrindo Shares"
    expect(cocokNamaEmiten('Alakasa Industrindo Shares', 'ALKA', 'Alakasa Industrindo Tbk', 'Gesit Alumas')).toBe('nama');
    // ALII-m4a-filings-p0.json: "... of Ancara Logistics Indonesia Shares to Pay Off Debt"
    expect(
      cocokNamaEmiten(
        'Ancara Logistics Indonesia Shares to Pay Off Debt',
        'ALII',
        'PT Ancara Logistics Indonesia Tbk',
        'Borneo Logistik Indonesia',
      ),
    ).toBe('nama');
    // ALII/ARKO/ASHA-m4a-filings-p0.json: judul hanya menyebut kode sahamnya sendiri.
    expect(cocokNamaEmiten('ALII', 'ALII', 'PT Ancara Logistics Indonesia Tbk', 'Nalinkant Amratlal Rathod')).toBe('kode');
    expect(cocokNamaEmiten('ARKO', 'ARKO', 'PT Arkora Hydro Tbk.', 'Arkora Bakti Indonesia')).toBe('kode');
    expect(cocokNamaEmiten('ASHA', 'ASHA', 'PT Cilacap Samudera Fishing Industry Tbk', 'Erlin Sutioso')).toBe('kode');
    // FOLK-filings.json: "Sumber Garam Pratama Sell Transaction of Sumber Garam Pratama"
    expect(cocokNamaEmiten('Sumber Garam Pratama', 'FOLK', 'PT Multi Garam Utama Tbk', 'Sumber Garam Pratama')).toBe(
      'pemegang',
    );
    // Yang benar-benar lain.
    expect(
      cocokNamaEmiten('Alamtri Minerals Indonesia', 'ADRO', NAMA_ADRO, 'Alamtri Resources Indonesia'),
    ).toBe('lain');
    // Satu kata umum tidak cukup untuk menyatakan cocok.
    expect(cocokNamaEmiten('Bank', 'BCIC', 'PT Bank JTrust Indonesia Tbk.', 'X')).toBe('lain');
    // Nama emiten tidak diketahui dan judul bukan kodenya → tidak bisa diputuskan.
    expect(cocokNamaEmiten('Diamond Citra Propertindo', 'DADA', null, 'Karya Permata Inovasi Indonesia')).toBe(
      'tak-diketahui',
    );
  });
});

describe('R36 — laporan tentang saham emiten lain', () => {
  it('menolak laporan ADRO yang judulnya menyebut Alamtri Minerals dan persennya bukan dari saham ADRO', () => {
    const k = konteksGudang({
      simbol: 'ADRO',
      nama_perusahaan: NAMA_ADRO,
      laporan: [ADRO_MINERALS, ADRO_TRIPUTRA],
      harga: HARGA_ADRO,
    });
    const h = r36LaporanSahamLain(k);
    expect(h.aturan).toBe('R36');
    expect(h.dijalankan).toBe(true);
    expect(h.hitungan).toMatchObject({ satuan: 'laporan', diperiksa: 2, merah: 1, hijau: 1, tidak_lengkap: 0 });
    expect(h.temuan).toHaveLength(1);
    const t = h.temuan[0];
    expect(t && keparahanTemuan(t)).toBe('konflik');
    expect(t?.ringkasan).toContain('Alamtri Minerals Indonesia');
    expect(t?.ringkasan).toContain('2025-10-17T22:27:59');
    // Penyebut tersirat 34.525.541.100 / 84,451% ≈ 40,88 miliar lawan 29.389.689.400.
    const tersirat = t?.angka.find((a) => a.label === 'saham beredar tersirat laporan (sebelum)');
    expect(tersirat?.nilai).toBe(40_882_335_437);
    expect(t?.angka.find((a) => a.label === 'saham beredar emiten')?.nilai).toBe(29_389_689_400);
  });

  it('SINTETIS: nama lama perusahaan di judul, angkanya milik emiten ini → tidak ditolak', () => {
    // Tidak ada contoh perubahan nama di gudang; ADRO memang pernah bernama
    // Adaro Energy Indonesia. Angka laporan Triputra dipakai apa adanya.
    const namaLama = { ...ADRO_TRIPUTRA, judul: 'Triputra Investindo Arya buys shares of Adaro Energy Indonesia' };
    const h = r36LaporanSahamLain(
      konteksGudang({ simbol: 'ADRO', nama_perusahaan: NAMA_ADRO, laporan: [namaLama], harga: HARGA_ADRO }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.hijau).toBe(1);
    expect(h.temuan).toEqual([]);
  });

  it('SINTETIS: kode saham emiten lain di judul dan persen yang bukan dari saham ini → ditolak', () => {
    const lain = { ...ADRO_MINERALS, judul: 'Alamtri Resources Indonesia buys shares of AADI' };
    const h = r36LaporanSahamLain(
      konteksGudang({ simbol: 'ADRO', nama_perusahaan: NAMA_ADRO, laporan: [lain], harga: HARGA_ADRO }),
    );
    expect(h.hitungan.merah).toBe(1);
  });

  it('judul yang menyebut pemegangnya sendiri (FOLK) tidak ditolak: judul itu tidak menunjuk perusahaan mana pun', () => {
    // FOLK-filings.json, 2025-10-24T16:28:11; rantai Sumber Garam Pratama nyambung
    // ke laporan berikutnya (1.048.773.345), jadi ini laporan saham FOLK yang sah.
    const folk = lap({
      laporan_id: 'FOLK|2025-10-24T16:28:11|29cac99903_fe1e579f3f.pdf',
      simbol: 'FOLK',
      pemegang: 'Sumber Garam Pratama',
      judul: 'Sumber Garam Pratama Sell Transaction of Sumber Garam Pratama',
      dilaporkan_pada: '2025-10-24T16:28:11',
      sebelum: 1_246_180_419,
      sesudah: 1_048_773_345,
      jumlah: 197_407_074,
      persen_sebelum: 31.56,
      persen_sesudah: 26.56,
    });
    const h = r36LaporanSahamLain(
      konteksGudang({ simbol: 'FOLK', nama_perusahaan: 'PT Multi Garam Utama Tbk', laporan: [folk] }),
    );
    expect(h.hitungan.merah).toBe(0);
    expect(h.hitungan.tidak_lengkap).toBe(1);
    expect(h.temuan).toEqual([]);
  });

  it('nama emiten tidak diketahui atau judul kosong → tidak lengkap, bukan merah', () => {
    const dada = lap({
      simbol: 'DADA',
      judul: 'Karya Permata Inovasi Indonesia Sell Transaction of Diamond Citra Propertindo',
    });
    const tanpaJudul = lap({ simbol: 'DADA', laporan_id: 'x2' });
    const h = r36LaporanSahamLain(konteksGudang({ simbol: 'DADA', laporan: [dada, tanpaJudul] }));
    expect(h.hitungan).toMatchObject({ diperiksa: 2, merah: 0, tidak_lengkap: 2 });
  });

  it('nama beda tetapi saham beredar tidak diketahui pada tanggal itu → tidak lengkap', () => {
    const h = r36LaporanSahamLain(
      konteksGudang({ simbol: 'ADRO', nama_perusahaan: NAMA_ADRO, laporan: [ADRO_MINERALS] }),
    );
    expect(h.hitungan).toMatchObject({ merah: 0, tidak_lengkap: 1 });
  });

  it('dilewati dengan alasan kalau tidak ada laporan', () => {
    const h = r36LaporanSahamLain(konteksGudang({ simbol: 'ADRO' }));
    expect(h.dijalankan).toBe(false);
    expect(h.alasan_lewat).toBeTruthy();
  });
});

const MANIFEST_ADA = existsSync(new URL('../../.cache/sectors/ADRO-m4a-filings-p0.json', import.meta.url));

describe.runIf(MANIFEST_ADA)('R36 atas gudang audit (372 berkas manifest, sha diperiksa)', () => {
  it('hanya satu laporan dari 267 yang ditolak: ADRO 2025-10-17 (Alamtri Minerals)', () => {
    const gudang = muatGudangManifest();
    const merah: string[] = [];
    let diperiksa = 0;
    for (const data of gudang.emiten.values()) {
      const h = r36LaporanSahamLain(konteksEmiten(data));
      diperiksa += h.hitungan.diperiksa;
      for (const t of h.temuan) merah.push(`${data.simbol} ${t.rujukan[0] ?? ''}`);
    }
    expect(diperiksa).toBe(267);
    expect(merah).toEqual(['ADRO 2025-10-17T22:27:59 · 4d80ecf450_17be92eba5.pdf']);
  });
});

/*
 * R37 — satu tahun buku laporan keuangan yang bagiannya lebih besar dari
 * keseluruhannya. Salah nyata (uji ulang M4a U28): ABMM tahun buku 2023 menulis
 * total_debt 16 triliun padahal total_liabilities 1,4 miliar, dan kas lebih
 * besar dari total aset — sebagian medan baris itu dalam dolar AS, sebagian
 * dalam rupiah. Fixture: `financials.historical_financials` apa adanya.
 */
describe('R37 — bagian lebih besar dari keseluruhannya di satu tahun buku', () => {
  // ABMM-m4a-overview-financials.json
  const ABMM_2022 = keuangan({
    tahun: 2022,
    aset: 30_912_364_969_888,
    liabilitas: 21_283_973_250_088,
    utang: 14_636_865_965_640,
    kas: 3_454_659_208_104,
    aset_lancar: 11_018_312_774_856,
  });
  const ABMM_2023 = keuangan({
    tahun: 2023,
    aset: 2_156_687_895,
    liabilitas: 1_397_760_928,
    utang: 16_059_284_798_232,
    kas: 2_911_439_932_464,
    aset_lancar: 622_722_099,
  });
  // ARCI-m4a-overview-financials.json: aset lancar dalam dolar, sisanya rupiah.
  const ARCI_2023 = keuangan({
    tahun: 2023,
    aset: 12_447_484_756_164,
    liabilitas: 8_379_337_218_315,
    utang: 6_276_758_547_050,
    kas: 144_369_863_612,
    aset_lancar: 94_562_276,
  });
  // BSIM-m4a-overview-financials.json: bank, tanpa kas dan aset lancar.
  const BSIM_2023 = keuangan({
    tahun: 2023,
    aset: 52_634_996_000_000,
    liabilitas: 37_788_908_000_000,
    utang: 633_910_000,
    kas: null,
    aset_lancar: null,
  });

  it('menolak ABMM 2023 dan menyebut ketiga hubungan yang dilanggar; ABMM 2022 lolos', () => {
    const h = r37BagianMelebihiKeseluruhan(konteksGudang({ simbol: 'ABMM', keuangan_tahunan: [ABMM_2022, ABMM_2023] }));
    expect(h.aturan).toBe('R37');
    expect(h.hitungan).toMatchObject({ satuan: 'tahun buku', diperiksa: 2, merah: 1, hijau: 1, tidak_lengkap: 0 });
    expect(h.temuan).toHaveLength(1);
    const t = h.temuan[0];
    expect(t && keparahanTemuan(t)).toBe('konflik');
    expect(t?.temuan_id).toBe('R37-ABMM-2023');
    expect(t?.ringkasan).toContain('2023');
    expect(t?.ringkasan).toContain('total_debt');
    expect(t?.ringkasan).toContain('total_liabilities');
    expect(t?.ringkasan).toContain('cash_and_equivalents');
    expect(t?.angka.map((a) => a.label)).toEqual([
      'total_debt',
      'total_liabilities',
      'cash_and_equivalents',
      'total_assets',
      'current_assets',
    ]);
  });

  it('menolak ARCI 2023: kas lebih besar dari aset lancar, walau utang dan total aset wajar', () => {
    const h = r37BagianMelebihiKeseluruhan(konteksGudang({ simbol: 'ARCI', keuangan_tahunan: [ARCI_2023] }));
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('current_assets');
    expect(h.temuan[0]?.ringkasan).not.toContain('total_liabilities');
  });

  it('bank tanpa kas dan aset lancar: hanya utang lawan liabilitas yang diperiksa, lolos', () => {
    const h = r37BagianMelebihiKeseluruhan(konteksGudang({ simbol: 'BSIM', keuangan_tahunan: [BSIM_2023] }));
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0, hijau: 1 });
  });

  it('tahun buku tanpa satu pun pasangan yang bisa diadu → tidak lengkap, bukan merah', () => {
    const kosong = keuangan({ tahun: 2020, aset: null, liabilitas: null, utang: null, kas: 5, aset_lancar: null });
    const h = r37BagianMelebihiKeseluruhan(konteksGudang({ simbol: 'AA', keuangan_tahunan: [kosong] }));
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0, tidak_lengkap: 1 });
  });

  it('dilewati dengan alasan kalau tidak ada laporan keuangan tahunan', () => {
    const h = r37BagianMelebihiKeseluruhan(konteksGudang({ simbol: 'AA' }));
    expect(h.dijalankan).toBe(false);
    expect(h.alasan_lewat).toBeTruthy();
  });

  it('sama besar bukan pelanggaran (bagian boleh sama dengan keseluruhannya)', () => {
    const pas = keuangan({ tahun: 2021, aset: 100, liabilitas: 80, utang: 80, kas: 100, aset_lancar: 100 });
    expect(r37BagianMelebihiKeseluruhan(konteksGudang({ keuangan_tahunan: [pas] })).hitungan.merah).toBe(0);
  });
});

describe.runIf(MANIFEST_ADA)('R37 atas gudang audit (372 berkas manifest, sha diperiksa)', () => {
  it('dari 363 tahun buku, hanya ABMM 2023, ARCI 2023, dan HITS 2025 yang ditolak', () => {
    const gudang = muatGudangManifest();
    const merah: string[] = [];
    let diperiksa = 0;
    for (const data of gudang.emiten.values()) {
      const h = r37BagianMelebihiKeseluruhan(konteksEmiten(data));
      diperiksa += h.hitungan.diperiksa;
      for (const t of h.temuan) merah.push(t.temuan_id);
    }
    expect(diperiksa).toBe(363);
    expect(merah.sort()).toEqual(['R37-ABMM-2023', 'R37-ARCI-2023', 'R37-HITS-2025']);
  });
});

/*
 * R23 (M4b D-4) — laba di keputusan RUPS juga diadu dengan laba sebelum pajak
 * dikurangi pajak. Bug terbukti uji ulang M4a U26: keputusan RUPS ASLC menyebut
 * Rp45.000.011.645 = earnings_before_tax − tax di laporan keuangan yang sama,
 * tepat sampai rupiah, tetapi R23 hanya mengadunya dengan `earnings`
 * (Rp42.078.526.731, laba yang diatribusikan ke induk) dan menolak kartunya.
 */
describe('R23 — laba sesudah pajak sebagai ukuran laba kedua', () => {
  // ASLC-m4a-overview-financials.json, tahun buku 2025.
  const ASLC_2025 = keuangan({
    tahun: 2025,
    laba: 42_078_526_731,
    laba_sebelum_pajak: 55_457_688_905,
    pajak: 10_457_677_260,
  });
  // ASLC-m4a-corpactions.json, agm 2026-05-19, kalimat pertama agm_result.
  const RUPS_ASLC = {
    tanggal: '2026-05-19',
    ringkasan:
      'Agenda #1: The meeting approved the 2025 Annual Report and Financial Statements, reporting a net ' +
      'profit of Rp45,000,011,645. It allocated Rp12.69 billion for cash dividends at Rp1 per share and ' +
      'Rp500 million for general reserves.',
  };

  it('labaSesudahPajak = laba sebelum pajak − pajak; kosong bila salah satunya kosong', () => {
    expect(labaSesudahPajak(ASLC_2025)).toBe(45_000_011_645);
    expect(labaSesudahPajak(keuangan({ tahun: 2025, laba_sebelum_pajak: 100, pajak: null }))).toBeNull();
    expect(labaSesudahPajak(keuangan({ tahun: 2025 }))).toBeNull();
    // Pajak negatif (manfaat pajak) menambah laba: BSIM 2023 73.578 − (−2.218) = 75.796 miliar.
    expect(
      labaSesudahPajak(keuangan({ tahun: 2023, laba_sebelum_pajak: 73_578_000_000, pajak: -2_218_000_000 })),
    ).toBe(75_796_000_000);
  });

  it('ASLC: angka RUPS sama dengan laba sebelum pajak − pajak → tidak ditolak', () => {
    const h = r23LabaBedaEndpoint(
      konteksGudang({ simbol: 'ASLC', rups: [RUPS_ASLC], keuangan_tahunan: [ASLC_2025] }),
    );
    expect(h.hitungan).toMatchObject({ diperiksa: 1, merah: 0, hijau: 1 });
    expect(h.temuan).toEqual([]);
  });

  it('angka RUPS yang tidak sama dengan kedua ukuran tetap ditolak, dan temuannya menyebut keduanya', () => {
    const lain = { ...RUPS_ASLC, ringkasan: RUPS_ASLC.ringkasan.replace('45,000,011,645', '44,000,000,000') };
    const h = r23LabaBedaEndpoint(konteksGudang({ simbol: 'ASLC', rups: [lain], keuangan_tahunan: [ASLC_2025] }));
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.ringkasan).toContain('Rp42.078.526.731');
    expect(h.temuan[0]?.ringkasan).toContain('Rp45.000.011.645');
    expect(h.temuan[0]?.angka.map((a) => a.label)).toContain('laba sebelum pajak dikurangi pajak');
  });

  it('tanpa medan pajak, R23 tetap seperti sebelumnya (hanya earnings)', () => {
    const tanpaPajak = keuangan({ tahun: 2025, laba: 42_078_526_731 });
    const h = r23LabaBedaEndpoint(konteksGudang({ simbol: 'ASLC', rups: [RUPS_ASLC], keuangan_tahunan: [tanpaPajak] }));
    expect(h.hitungan.merah).toBe(1);
    expect(h.temuan[0]?.angka.map((a) => a.label)).toEqual([
      'laba menurut keputusan RUPS',
      'laba menurut laporan keuangan',
      'selisih',
    ]);
  });
});
