/**
 * M2a T-02 (RQ-02): pemuat gudang umum.
 *
 * Bahan ujinya adalah berkas contoh **buatan sendiri** di `contoh-gudang/`
 * (3-5 baris per jenis), bukan salinan data mentah: yang diuji adalah
 * pengenalan bentuk dan penormalan, bukan isi gudang hari ini.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { kenaliBerkas, muatGudang, normalkanSimbol } from './gudang.ts';

const CONTOH = fileURLToPath(new URL('./contoh-gudang', import.meta.url));

const gudang = muatGudang(CONTOH);
const aa = gudang.emiten.get('AA');
const bb = gudang.emiten.get('BB');

describe('kenaliBerkas — jenis dibaca dari bentuk isi, bukan dari nama berkas', () => {
  it('mengenali harga harian dari medan barisnya', () => {
    expect(
      kenaliBerkas([{ symbol: 'X.JK', date: '2026-01-05', close: 1, open: 1, high: 1, low: 1, volume: 0 }])
        .jenis,
    ).toBe('harga-harian');
  });

  it('membedakan laporan kepemilikan dari berita walaupun pembungkusnya sama', () => {
    const paginasi = { total_count: 1, showing: 1, limit: 30, offset: 0, has_next: false, has_previous: false };
    expect(
      kenaliBerkas({
        results: [{ holder_name: 'A', holding_before: 1, holding_after: 2, symbol: 'X.JK' }],
        pagination: paginasi,
      }).jenis,
    ).toBe('laporan-kepemilikan');
    expect(
      kenaliBerkas({ results: [{ symbols: ['X.JK'], dimension: null }], pagination: paginasi }).jenis,
    ).toBe('berita');
  });

  it('mengenali suspensi dalam dua pembungkus yang berbeda', () => {
    const baris = { symbol: 'X.JK', suspension_date: '2026-01-06', reason: 'cooling down' };
    expect(kenaliBerkas([baris]).jenis).toBe('suspensi');
    expect(
      kenaliBerkas({
        results: [baris],
        pagination: { total_count: 1, showing: 1, limit: 20, offset: 0, has_next: false, has_previous: false },
      }).jenis,
    ).toBe('suspensi');
  });

  it('menandai respons berpaginasi kosong sebagai jenisnya sendiri, bukan laporan', () => {
    const hasil = kenaliBerkas({
      results: [],
      pagination: { total_count: 0, showing: 0, limit: 30, offset: 0, has_next: false, has_previous: false },
    });
    expect(hasil.jenis).toBe('paginasi-kosong');
    expect(hasil.alasan).toContain('tidak ada di dalam isinya');
  });

  it('menyamakan simbol dengan dan tanpa akhiran bursa', () => {
    expect(normalkanSimbol('ARNA.JK')).toBe('ARNA');
    expect(normalkanSimbol('arna')).toBe('ARNA');
  });
});

describe('muatGudang — penormalan dan pembuangan rangkap', () => {
  it('membaca setiap jenis berkas contoh tanpa satu pun tersisa tak dikenal selain yang memang begitu', () => {
    const jenis = new Map(gudang.berkas.map((b) => [b.berkas, b.jenis]));
    expect(jenis.get('aa-harian.json')).toBe('harga-harian');
    expect(jenis.get('aa-filings.json')).toBe('laporan-kepemilikan');
    expect(jenis.get('aa-berita.json')).toBe('berita');
    expect(jenis.get('suspensi-semua.json')).toBe('suspensi');
    expect(jenis.get('aa-suspensi.json')).toBe('suspensi');
    expect(jenis.get('aa-aksi.json')).toBe('aksi-korporasi');
    expect(jenis.get('aa-ringkasan.json')).toBe('ringkasan');
    expect(jenis.get('bb-keuangan.json')).toBe('keuangan');
    expect(jenis.get('aa-kepemilikan.json')).toBe('kepemilikan');
    expect(jenis.get('kalender-split.json')).toBe('kalender');
    expect(jenis.get('kosong.json')).toBe('paginasi-kosong');
  });

  it('melaporkan berkas yang tidak dikenali, tidak membuangnya diam-diam', () => {
    const nama = gudang.tak_dikenal.map((b) => b.berkas).sort();
    expect(nama).toEqual(['entah-larik.json', 'entah.json']);
    for (const b of gudang.tak_dikenal) {
      expect(b.alasan.length).toBeGreaterThan(0);
    }
  });

  it('membuang laporan rangkap dengan kunci isi, bukan kunci nama berkas', () => {
    expect(aa?.laporan).toHaveLength(3);
    expect(gudang.ringkasan.laporan_rangkap).toBe(1);
    expect(new Set(aa?.laporan.map((l) => l.dilaporkan_pada)).size).toBe(3);
  });

  it('memakai baris harga pertama untuk tanggal yang muncul di dua berkas, dan mencatat bentrokannya', () => {
    // Urutan berkas: aa-harian-lanjutan.json mendahului aa-harian.json
    // (nama berkas menaik), jadi yang menang adalah baris di berkas pertama itu.
    const delapan = aa?.harga.find((h) => h.tanggal === '2026-01-08');
    expect(delapan?.tutup).toBe(106);
    expect(gudang.ringkasan.baris_harga_rangkap).toBe(1);
    expect(gudang.bentrok_harga).toEqual([
      { simbol: 'AA', tanggal: '2026-01-08', medan: 'tutup', dipakai: '106', diabaikan: '105' },
      { simbol: 'AA', tanggal: '2026-01-08', medan: 'nilai_pasar', dipakai: '106000', diabaikan: '105000' },
    ]);
  });

  it('menandai baris harga ber-open kosong alih-alih memakai nol diam-diam', () => {
    const cacat = aa?.harga.find((h) => h.tanggal === '2026-01-07');
    expect(cacat?.buka_kosong).toBe(true);
    expect(cacat?.terendah).toBe(0);
    const sehat = aa?.harga.find((h) => h.tanggal === '2026-01-05');
    expect(sehat?.buka_kosong).toBeUndefined();
  });

  it('menandai harga butir transaksi yang kosong, karena nol bukan harganya', () => {
    const kedua = aa?.laporan.find((l) => l.dilaporkan_pada === '2026-01-09T11:00:00');
    expect(kedua?.transaksi).toHaveLength(2);
    expect(kedua?.transaksi[0]?.harga_kosong).toBeUndefined();
    expect(kedua?.transaksi[1]?.harga_kosong).toBe(true);
    expect(kedua?.transaksi[1]?.harga).toBe(0);
  });

  it('menyimpan transaction_type apa adanya, termasuk others', () => {
    const jenis = aa?.laporan.map((l) => l.jenis_mentah);
    expect(jenis).toEqual(['sell', 'sell', 'others']);
    // `jenis` yang dinormalkan memetakan others menjadi jual, dan itulah sebabnya
    // `jenis_mentah` harus disimpan terpisah.
    expect(aa?.laporan[2]?.jenis).toBe('jual');
  });

  it('menyimpan source apa adanya untuk R12', () => {
    expect(aa?.laporan[0]?.sumber_dokumen).toContain('LK-05012026-');
    expect(aa?.laporan[2]?.sumber_dokumen).toContain('From_EREP');
  });

  it('mencatat paginasi per berkas, bukan per emiten', () => {
    expect(aa?.berkas_laporan.map((b) => b.berkas)).toEqual([
      'aa-filings-ulang.json',
      'aa-filings.json',
    ]);
    expect(aa?.berkas_laporan[1]?.paginasi.total_count).toBe(3);
    expect(aa?.berkas_laporan[1]?.simbol).toBe('AA');
  });

  it('tidak mengarang simbol untuk respons kosong', () => {
    const kosong = gudang.berkas.find((b) => b.berkas === 'kosong.json');
    expect(kosong?.simbol).toBeNull();
  });

  it('menggabungkan suspensi dari dua berkas dan membuang yang sama', () => {
    expect(aa?.suspensi).toEqual([{ tanggal: '2026-01-06', alasan: 'cooling down' }]);
    expect(bb?.suspensi).toEqual([
      { tanggal: '2026-02-02', alasan: 'unusual market activity' },
    ]);
  });

  it('menyatukan aksi korporasi dari berkas emiten dan berkas kalender tanpa menggandakannya', () => {
    expect(aa?.stock_split).toEqual([{ tanggal: '2026-03-02', rasio: 4, sumber: 'aa-aksi.json' }]);
    expect(bb?.stock_split).toEqual([
      { tanggal: '2026-03-10', rasio: 2, sumber: 'kalender-split.json' },
    ]);
  });

  it('membaca all_time_price, dividen, RUPS, pemegang, dan saham tahunan', () => {
    expect(aa?.all_time_price).toEqual([
      { label: '52_w_high', tanggal: '2026-01-09', nilai: 110 },
      { label: '52_w_low', tanggal: '2026-01-05', nilai: 96 },
      { label: 'ytd_low', tanggal: '2026-07-01', nilai: 11 },
    ]);
    expect(aa?.dividen).toEqual([
      { ex_date: '2026-04-10', tanggal_bayar: '2026-04-24', nilai_per_lembar: 5 },
    ]);
    expect(aa?.rups[0]?.tanggal).toBe('2026-04-01');
    expect(aa?.pemegang.map((p) => p.nama)).toEqual(['Contoh Sejahtera', 'Public']);
    expect(aa?.saham_tahunan).toEqual([
      { tahun: 2024, lembar: 900 },
      { tahun: 2025, lembar: 1000 },
    ]);
    expect(aa?.ringkasan_pasar).toEqual({ nilai_pasar: 108000, harga_tutup: 108, pada: '2026-01-09' });
  });

  it('mengurutkan segalanya, supaya dua kali muat memberi hasil yang sama (INV-C)', () => {
    const lagi = muatGudang(CONTOH);
    const bentuk = (g: typeof gudang): string =>
      JSON.stringify([...g.emiten.entries()]) + JSON.stringify(g.berkas) + JSON.stringify(g.ringkasan);
    expect(bentuk(lagi)).toBe(bentuk(gudang));
    expect(aa?.harga.map((h) => h.tanggal)).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
    ]);
  });
});
