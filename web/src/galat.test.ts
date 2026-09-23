import { describe, expect, it } from 'vitest';
import {
  MAKS_PESAN_GALAT,
  POLA_TERLARANG_PESAN,
  berkasDariTumpukan,
  laporGalatAkar,
  pasangPelaporAkar,
  pesanDari,
  samarkanPesan,
  sumberGalat,
} from './galat.ts';

/**
 * Penyamaran pesan galat (M3.8 D-3).
 *
 * Pesan galat JavaScript adalah teks yang TIDAK kita tulis: ia bisa memuat
 * alamat berkas, alamat permintaan yang gagal lengkap dengan query-nya, jalur
 * di cakram, nomor yang panjang, bahkan potongan UA dari skrip pihak ketiga.
 * Yang boleh sampai ke pengumpul hanyalah bentuknya.
 */

describe('galat — samarkanPesan (D-3)', () => {
  it('alamat lengkap dengan query diganti ‹url›', () => {
    expect(
      samarkanPesan('Failed to fetch https://alpha.contoh/e?k=threads&x=1 (status 0)'),
    ).toBe('Failed to fetch ‹url› (status 0)');
  });

  it('skema apa pun, www., blob:, data:, chrome-extension:// ikut diganti', () => {
    expect(samarkanPesan('lihat www.contoh.id/jalur sekarang')).toBe('lihat ‹url› sekarang');
    expect(samarkanPesan('muat blob:https://runut.test/0f1e-22 gagal')).toBe('muat ‹url› gagal');
    expect(samarkanPesan('x data:text/html;base64,PGgxPg== y')).toBe('x ‹url› y');
    expect(samarkanPesan('chrome-extension://abcdef/isi.js menolak')).toBe('‹url› menolak');
  });

  it('jalur berkas — unix, windows, relatif — diganti ‹url›', () => {
    expect(samarkanPesan('at /assets/index-DYF9bqqq.js:12:34')).toBe('at ‹url›');
    expect(samarkanPesan('di C:\\Users\\ASUS\\berkas.js baris 3')).toBe('di ‹url› baris 3');
    expect(samarkanPesan('muat ./potongan/a.js gagal')).toBe('muat ‹url› gagal');
    expect(samarkanPesan('muat ../a/b.js gagal')).toBe('muat ‹url› gagal');
  });

  it('angka panjang ≥ 6 digit diganti ‹n›, yang pendek dibiarkan', () => {
    expect(samarkanPesan('sesi 1234567 gagal di langkah 42 dari 99999')).toBe(
      'sesi ‹n› gagal di langkah 42 dari 99999',
    );
    expect(samarkanPesan('id 628123456789')).toBe('id ‹n›');
  });

  it('potongan UA dari skrip pihak ketiga diganti ‹ua›', () => {
    const teks = samarkanPesan('agen Mozilla/5.0 (Linux) AppleWebKit/537.36 menolak');
    expect(teks).not.toMatch(/mozilla|applewebkit/i);
    expect(teks).toContain('‹ua›');
  });

  it('pertahanan terakhir: tidak ada sisa http / :// / www. / mozilla, dalam huruf apa pun', () => {
    for (const mentah of [
      'XMLHttpRequest is not defined',
      'HTTP 500',
      'aneh:// tanpa host',
      'WWW.CONTOH',
      'MOZILLA saja',
      'lihat hxxp://aman tetapi http juga',
    ]) {
      const hasil = samarkanPesan(mentah);
      expect(hasil, mentah).not.toMatch(POLA_TERLARANG_PESAN);
    }
  });

  it(`dipangkas ${String(120)} karakter, SESUDAH penyamaran`, () => {
    expect(MAKS_PESAN_GALAT).toBe(120);
    const panjang = `awal ${'x'.repeat(300)} https://rahasia.contoh/akhir`;
    const hasil = samarkanPesan(panjang);
    expect(hasil.length).toBe(120);
    expect(hasil.startsWith('awal ')).toBe(true);
    // Alamat di ekor dipotong, tidak disambung menjadi potongan alamat.
    expect(hasil).not.toContain('rahasia');
  });

  it('spasi berulang dan baris baru dirapatkan; kosong menjadi penanda, bukan teks kosong', () => {
    expect(samarkanPesan('  a\n\n  b\t c  ')).toBe('a b c');
    expect(samarkanPesan('')).toBe('(tanpa pesan)');
    expect(samarkanPesan('   ')).toBe('(tanpa pesan)');
  });

  it('hasilnya selalu stabil: menyamarkan dua kali = sekali (pesan identik tetap identik)', () => {
    const sekali = samarkanPesan('Error at https://a.b/c.js:1:2 id 1234567');
    expect(samarkanPesan(sekali)).toBe(sekali);
  });
});

describe('galat — sumberGalat, berkasDariTumpukan, pesanDari (D-3)', () => {
  const ASAL = 'https://runut.test';

  it('berkas dari asal aplikasi = aplikasi; lainnya = luar', () => {
    expect(sumberGalat('https://runut.test/assets/index-abc.js', ASAL)).toBe('aplikasi');
    expect(sumberGalat('https://runut.test.jahat.contoh/x.js', ASAL)).toBe('luar');
    expect(sumberGalat('chrome-extension://abc/isi.js', ASAL)).toBe('luar');
    // "Script error." lintas asal tidak punya berkas: kita tidak bisa membuktikan
    // ia milik aplikasi, jadi ia luar.
    expect(sumberGalat('', ASAL)).toBe('luar');
    expect(sumberGalat(null, ASAL)).toBe('luar');
    expect(sumberGalat(undefined, ASAL)).toBe('luar');
  });

  it('berkas pertama di tumpukan pemanggilan', () => {
    const tumpukan =
      'Error: tolak\n    at f (https://runut.test/assets/index-abc.js:1:200)\n    at https://luar.contoh/b.js:2:3';
    expect(berkasDariTumpukan(tumpukan)).toBe('https://runut.test/assets/index-abc.js');
    expect(berkasDariTumpukan('tanpa alamat')).toBeNull();
    expect(berkasDariTumpukan(undefined)).toBeNull();
  });

  it('pesan dari Error, dari teks, dan dari nilai lain tanpa membocorkan isinya', () => {
    expect(pesanDari(new TypeError('x is undefined'))).toBe('TypeError: x is undefined');
    expect(pesanDari('ditolak begitu saja')).toBe('ditolak begitu saja');
    // Objek sembarang bisa berisi apa saja; yang dilaporkan hanya jenisnya.
    expect(pesanDari({ kata_sandi: 'rahasia' })).toBe('(bukan Error: object)');
    expect(pesanDari(undefined)).toBe('(bukan Error: undefined)');
    expect(pesanDari(42)).toBe('(bukan Error: number)');
  });
});

describe('galat — pelapor akar untuk batas galat (D-3, A-3)', () => {
  it('memanggil pelapor yang terpasang; tanpa pelapor tidak melempar', () => {
    pasangPelaporAkar(null);
    expect(() => {
      laporGalatAkar(new Error('tanpa pelapor'));
    }).not.toThrow();

    const diterima: unknown[] = [];
    pasangPelaporAkar((g) => diterima.push(g));
    const galat = new Error('render jatuh');
    laporGalatAkar(galat);
    expect(diterima).toEqual([galat]);
    pasangPelaporAkar(null);
  });

  it('pelapor yang melempar tidak ikut menjatuhkan batas galat', () => {
    pasangPelaporAkar(() => {
      throw new Error('pelapor rusak');
    });
    expect(() => {
      laporGalatAkar(new Error('x'));
    }).not.toThrow();
    pasangPelaporAkar(null);
  });
});
