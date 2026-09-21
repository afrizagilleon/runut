import { describe, expect, it } from 'vitest';
import { angkaBesar, angkaBesarSatuan, angkaId } from './angka.ts';

describe('angkaBesar — batas juta dan miliar', () => {
  it('memakai angka apa adanya di bawah satu juta', () => {
    expect(angkaBesar(0)).toBe('0');
    expect(angkaBesar(999)).toBe('999');
    expect(angkaBesar(35_713_500 / 100)).toBe('357.135');
    expect(angkaBesar(999_999)).toBe('999.999');
  });

  it('beralih ke "juta" tepat di satu juta', () => {
    expect(angkaBesar(1_000_000)).toBe('1 juta');
    expect(angkaBesar(999_999)).toBe('999.999');
  });

  it('beralih ke "miliar" tepat di satu miliar', () => {
    // Dibulatkan ke atas melewati batas: naik satuan, bukan dicetak "1000 juta".
    expect(angkaBesar(999_999_999)).toBe('1 miliar');
    expect(angkaBesar(1_000_000_000)).toBe('1 miliar');
    expect(angkaBesar(994_000_000)).toBe('994 juta');
  });

  it('memberi contoh yang disebut kontrak', () => {
    expect(angkaBesar(4_692_137_600)).toBe('4,69 miliar');
    expect(angkaBesar(10_000_000)).toBe('10 juta');
  });

  it('membulatkan ke dua desimal', () => {
    expect(angkaBesar(299_500_000)).toBe('299,5 juta');
    expect(angkaBesar(179_500_000)).toBe('179,5 juta');
    expect(angkaBesar(1_234_567_890)).toBe('1,23 miliar');
    expect(angkaBesar(1_235_000_000)).toBe('1,24 miliar');
  });

  it('membuang nol berekor', () => {
    expect(angkaBesar(70_000_000)).toBe('70 juta');
    expect(angkaBesar(4_700_000_000)).toBe('4,7 miliar');
    expect(angkaBesar(5_000_000_000)).toBe('5 miliar');
  });

  it('mempertahankan tanda negatif, karena lompatan saldo bisa negatif', () => {
    expect(angkaBesar(-1_660_008_900)).toBe('-1,66 miliar');
    expect(angkaBesar(-10_000_000)).toBe('-10 juta');
  });

  it('menempelkan satuan kalau diminta', () => {
    expect(angkaBesarSatuan(4_692_137_600, 'lembar')).toBe('4,69 miliar lembar');
    expect(angkaBesarSatuan(6, '')).toBe('6');
  });

  it('tidak melempar untuk angka yang bukan angka', () => {
    expect(angkaBesar(Number.NaN)).toBe('NaN');
    expect(angkaBesar(Number.POSITIVE_INFINITY)).toBe('Infinity');
  });
});

describe('angkaId', () => {
  it('memberi pemisah ribuan Indonesia', () => {
    expect(angkaId(1_660_008_900)).toBe('1.660.008.900');
    expect(angkaId(999)).toBe('999');
  });

  it('memakai koma untuk desimal', () => {
    expect(angkaId(22.25)).toBe('22,25');
    expect(angkaId(-0.14)).toBe('-0,14');
  });
});
