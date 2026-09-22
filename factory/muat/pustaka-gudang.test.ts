/**
 * M4 T-01 (RQ-01): pustaka fakta umum di atas pemuat gudang.
 *
 * Bahan ujinya berkas contoh **buatan sendiri** di `contoh-gudang/`, sama
 * seperti `gudang.test.ts`: yang diuji adalah penurunan fakta dan jejak
 * sumbernya, bukan isi gudang hari ini. Berkas contoh itu sengaja memuat
 * baris-baris yang menyakitkan — hari tanpa volume, baris `open: null`, laporan
 * rangkap di dua berkas — supaya pustaka ini bertemu dengan keadaan yang
 * sebenarnya ada di data.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { muatGudang } from './gudang.ts';
import { pustakaGudang, type SumberGudang } from './pustaka-gudang.ts';
import { ambilFakta } from './fakta.ts';
import {
  faktaHitung,
  faktaJumlah,
  faktaPemegangJendela,
  faktaSelisih,
} from './turunan-gudang.ts';
import type { Fakta } from '../skema/tipe.ts';

const CONTOH = fileURLToPath(new URL('./contoh-gudang', import.meta.url));
const gudang = muatGudang(CONTOH);

function dataAA(): ReturnType<typeof muatGudang>['emiten'] extends Map<string, infer T>
  ? T
  : never {
  const aa = gudang.emiten.get('AA');
  expect(aa, 'emiten AA harus ada di gudang contoh').toBeDefined();
  if (aa === undefined) throw new Error('AA tidak ada');
  return aa;
}

const SUMBER: Omit<SumberGudang, 'asal'> = {
  endpoint: {
    harga: '/v2/daily/AA/',
    laporan: '/v2/filings/',
    aksi: '/v2/company/corporate-actions/AA/',
    suspensi: '/v2/suspensions/',
  },
  parameter: { laporan: { symbol: 'AA' } },
  peran: { 'PT Contoh Sejahtera Tbk': 'Pemilik terbesar' },
};

function pustaka(): Fakta[] {
  return pustakaGudang(dataAA(), { ...SUMBER, asal: gudang.asal }).fakta;
}

describe('pustakaGudang — fakta harga', () => {
  it('lima fakta per hari bursa, kecuali hari yang medan bukanya kosong', () => {
    const p = pustaka();
    // 2026-01-05 lengkap: tutup, buka, tertinggi, terendah, volume.
    for (const akhiran of ['', '-buka', '-tertinggi', '-terendah']) {
      expect(p.some((f) => f.fact_id === `harga-2026-01-05${akhiran}`)).toBe(true);
    }
    expect(p.some((f) => f.fact_id === 'volume-2026-01-05')).toBe(true);
  });

  it('hari ber-`open: null` tidak melahirkan fakta buka/tertinggi/terendah bernilai nol', () => {
    const p = pustaka();
    // Nol di baris itu adalah pengganti medan yang kosong, bukan harga; satu
    // fakta bernilai nol yang terbaca sebagai harga adalah kartu yang bohong.
    expect(p.some((f) => f.fact_id === 'harga-2026-01-07')).toBe(true);
    expect(p.some((f) => f.fact_id === 'harga-2026-01-07-buka')).toBe(false);
    expect(p.some((f) => f.fact_id === 'harga-2026-01-07-tertinggi')).toBe(false);
    expect(p.some((f) => f.fact_id === 'harga-2026-01-07-terendah')).toBe(false);
  });

  it('angkanya sama dengan baris gudangnya, bukan dihitung ulang sendiri', () => {
    const p = pustaka();
    expect(ambilFakta(p, 'harga-2026-01-09').nilai).toBe(108);
    expect(ambilFakta(p, 'harga-2026-01-09-buka').nilai).toBe(105);
    expect(ambilFakta(p, 'harga-2026-01-09-tertinggi').nilai).toBe(110);
    expect(ambilFakta(p, 'volume-2026-01-06').nilai).toBe(0);
  });

  it('menyebut berkas cache asal tiap baris, dan bedanya antar-berkas terbaca', () => {
    const p = pustaka();
    // Dua berkas harga menyumbang hari yang berbeda; jejaknya tidak boleh
    // diratakan menjadi satu nama berkas.
    expect(ambilFakta(p, 'harga-2026-01-05').sumber.parameter['berkas_cache']).toBe(
      'aa-harian.json',
    );
    expect(ambilFakta(p, 'harga-2026-01-09').sumber.parameter['berkas_cache']).toBe(
      'aa-harian-lanjutan.json',
    );
  });

  it('endpoint dan tanggalnya ikut ke jejak sumber', () => {
    const fakta = ambilFakta(pustaka(), 'harga-2026-01-08');
    expect(fakta.sumber.jenis).toBe('api');
    expect(fakta.sumber.endpoint).toBe('/v2/daily/AA/');
    expect(fakta.sumber.parameter['tanggal']).toBe('2026-01-08');
    expect(fakta.sumber.diambil_pada).toBeNull();
  });

  it('tersedia_sejak harga adalah tanggalnya sendiri (R4)', () => {
    expect(ambilFakta(pustaka(), 'harga-2026-01-08').tersedia_sejak).toBe('2026-01-08');
  });
});

describe('pustakaGudang — dividen, RUPS, suspensi', () => {
  it('dividen melahirkan nilai per lembar dan tanggal bayarnya sebagai dua fakta', () => {
    const p = pustaka();
    expect(ambilFakta(p, 'div-2026-04-10').nilai).toBe(5);
    expect(ambilFakta(p, 'div-2026-04-10-bayar').nilai).toBe('2026-04-24');
  });

  it('tanggal bayar bisa dibaca sejak tanggal ex, bukan baru saat uangnya keluar', () => {
    expect(ambilFakta(pustaka(), 'div-2026-04-10-bayar').tersedia_sejak).toBe('2026-04-10');
  });

  it('imbal hasil tidak pernah menjadi fakta — ia null untuk sebagian dividen', () => {
    expect(pustaka().some((f) => f.fact_id.includes('imbal'))).toBe(false);
  });

  it('RUPS tanpa teks keputusan TETAP menjadi fakta, dan kalimatnya mengatakannya', () => {
    const p = pustaka();
    expect(ambilFakta(p, 'rups-2026-04-01').klaim).toContain('mencatat keputusan');
    const kosong = ambilFakta(p, 'rups-2026-09-01');
    expect(kosong.klaim).toContain('dijadwalkan');
    expect(kosong.klaim).toContain('tidak ada di data');
  });

  it('suspensi memakai tanggal suspensinya sendiri dan menyebut berkasnya', () => {
    const fakta = ambilFakta(pustaka(), 'susp-2026-01-06');
    expect(fakta.tersedia_sejak).toBe('2026-01-06');
    expect(fakta.sumber.parameter['berkas_cache']).toBe('aa-suspensi.json');
  });
});

describe('pustakaGudang — laporan kepemilikan', () => {
  it('satu fakta per laporan, dinomori per tanggal terbit', () => {
    const p = pustaka();
    expect(ambilFakta(p, 'fil-2026-01-06-01').nilai).toBe(100);
    expect(ambilFakta(p, 'fil-2026-01-09-01').nilai).toBe(100);
    expect(ambilFakta(p, 'fil-2026-01-12-01').nilai).toBe(50);
  });

  it('memakai sebutan peran, bukan nama pemegang — sumber bisa mengeja satu orang dua cara', () => {
    const fakta = ambilFakta(pustaka(), 'fil-2026-01-06-01');
    expect(fakta.klaim).toContain('Pemilik terbesar');
    expect(fakta.klaim).not.toContain('PT Contoh Sejahtera');
  });

  it('nama pemegang dipakai apa adanya kalau kasus tidak menyebut perannya', () => {
    const tanpaPeran = pustakaGudang(dataAA(), {
      ...SUMBER,
      peran: {},
      asal: gudang.asal,
    }).fakta;
    expect(ambilFakta(tanpaPeran, 'fil-2026-01-06-01').klaim).toContain('PT Contoh Sejahtera');
  });

  it('kalimatnya menyebut lembar dan persen, TIDAK menyebut harga laporan', () => {
    const fakta = ambilFakta(pustaka(), 'fil-2026-01-06-01');
    expect(fakta.klaim).toContain('lembar');
    expect(fakta.klaim).toContain('persen');
    // Medan harga gabungan laporan adalah rata-rata tertimbang yang menghitung
    // butir tanpa harga sebagai Rp0 (R17B); ia tidak pernah menjadi klaim.
    expect(fakta.klaim).not.toContain('harga');
  });

  it('tersedia_sejak laporan adalah tanggal LAPORAN, bukan tanggal transaksinya (R4)', () => {
    expect(ambilFakta(pustaka(), 'fil-2026-01-06-01').tersedia_sejak).toBe('2026-01-06');
  });

  it('berkas cache laporan dibaca dari laporannya sendiri', () => {
    const p = pustaka();
    expect(ambilFakta(p, 'fil-2026-01-06-01').sumber.parameter['berkas_cache']).toBe(
      'aa-filings-ulang.json',
    );
    expect(ambilFakta(p, 'fil-2026-01-09-01').sumber.parameter['berkas_cache']).toBe(
      'aa-filings.json',
    );
  });
});

describe('pustakaGudang — dua kali memanggil menghasilkan hal yang sama', () => {
  it('deterministik (INV-C)', () => {
    expect(JSON.stringify(pustaka())).toBe(JSON.stringify(pustaka()));
  });

  it('jumlah per jenis dilaporkan, bukan hanya jumlah seluruhnya', () => {
    const hasil = pustakaGudang(dataAA(), { ...SUMBER, asal: gudang.asal });
    expect(Object.keys(hasil.jumlah).sort()).toEqual([
      'dividen',
      'harga',
      'laporan',
      'rups',
      'seluruhnya',
      'suspensi',
    ]);
    expect(hasil.jumlah['laporan']).toBe(3);
    expect(hasil.jumlah['seluruhnya']).toBe(hasil.fakta.length);
  });
});

describe('fakta turunan umum', () => {
  it('selisih menghitung, tidak menyalin', () => {
    const p = pustaka();
    const f = faktaSelisih(p, {
      fact_id: 'beda-tutup-buka',
      dari: 'harga-2026-01-09',
      kurangi: 'harga-2026-01-09-buka',
      satuan: 'rupiah per lembar',
      sebutan: 'Jarak antara tutup dan buka hari itu',
    });
    expect(f.nilai).toBe(3);
    expect(f.klaim).toContain('Rp3');
    expect(f.turunan_dari).toEqual(['harga-2026-01-09', 'harga-2026-01-09-buka']);
  });

  it('penjumlahan mengeja tiap sukunya di klaim', () => {
    const p = pustaka();
    const f = faktaJumlah(p, {
      fact_id: 'jumlah-jual',
      dari: ['fil-2026-01-06-01', 'fil-2026-01-09-01', 'fil-2026-01-12-01'],
      satuan: 'lembar',
      sebutan: 'Lembar yang berpindah lewat tiga laporan',
    });
    expect(f.nilai).toBe(250);
    expect(f.klaim).toContain('100 + 100 + 50 = 250');
  });

  it('penjumlahan terbit pada tanggal fakta asal yang paling akhir', () => {
    const p = pustaka();
    const f = faktaJumlah(p, {
      fact_id: 'jumlah-jual',
      dari: ['fil-2026-01-06-01', 'fil-2026-01-12-01'],
      satuan: 'lembar',
      sebutan: 'Dua laporan',
    });
    expect(f.tersedia_sejak).toBe('2026-01-12');
  });

  it('hitungan menjawab "dua dari mana" dengan daftar fakta asalnya', () => {
    const p = pustaka();
    const f = faktaHitung(p, {
      fact_id: 'jumlah-laporan',
      dari: ['fil-2026-01-06-01', 'fil-2026-01-09-01'],
      satuan: 'laporan',
      sebutan: 'Laporan yang terbit Januari',
    });
    expect(f.nilai).toBe(2);
    expect(f.turunan_dari).toHaveLength(2);
  });

  it('fakta asal yang tidak ada membuat turunan melempar dengan menyebut id-nya', () => {
    expect(() =>
      faktaSelisih(pustaka(), {
        fact_id: 'x',
        dari: 'harga-yang-tidak-ada',
        kurangi: 'harga-2026-01-09',
        satuan: 'rupiah',
        sebutan: 'x',
      }),
    ).toThrow(/harga-yang-tidak-ada/);
  });
});

describe('faktaPemegangJendela — empat fakta tentang satu pemegang', () => {
  const hasil = (): ReturnType<typeof faktaPemegangJendela> =>
    faktaPemegangJendela(dataAA(), pustaka(), {
      fact_id: 'jual-jan-2026',
      pemegang: 'PT Contoh Sejahtera Tbk',
      dari: '2026-01-01',
      sampai: '2026-01-31',
      peran: 'Pemilik terbesar',
    });

  it('menjumlahkan lembar, menghitung laporan, dan membawa dua persen sebagai dua fakta', () => {
    const { fakta } = hasil();
    const id = Object.fromEntries(fakta.map((f) => [f.fact_id, f.nilai]));
    expect(id['jual-jan-2026']).toBe(250);
    expect(id['jual-jan-2026-laporan']).toBe(3);
    expect(id['jual-jan-2026-persen-awal']).toBe(10);
    expect(id['jual-jan-2026-persen-akhir']).toBe(7.5);
  });

  it('arah dibaca dari laporannya sendiri, bukan ditulis pemanggil', () => {
    const [total] = hasil().fakta;
    expect(total?.klaim).toContain('mengurangi');
  });

  it('mengembalikan fact_id laporan yang ikut, supaya kasus tidak menomori sendiri', () => {
    expect(hasil().laporan).toEqual([
      'fil-2026-01-06-01',
      'fil-2026-01-09-01',
      'fil-2026-01-12-01',
    ]);
  });

  it('jendela yang kosong melempar, bukan menjumlahkan nol', () => {
    expect(() =>
      faktaPemegangJendela(dataAA(), pustaka(), {
        fact_id: 'kosong',
        pemegang: 'PT Contoh Sejahtera Tbk',
        dari: '2027-01-01',
        sampai: '2027-12-31',
        peran: 'Pemilik terbesar',
      }),
    ).toThrow(/kosong/);
  });

  it('pemegang lain tidak ikut terjumlah', () => {
    expect(() =>
      faktaPemegangJendela(dataAA(), pustaka(), {
        fact_id: 'lain',
        pemegang: 'Orang Yang Tidak Ada',
        dari: '2026-01-01',
        sampai: '2026-01-31',
        peran: 'Orang dalam lain',
      }),
    ).toThrow(/Orang Yang Tidak Ada/);
  });
});
