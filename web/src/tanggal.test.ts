import { describe, expect, it } from 'vitest';
import { TanggalTidakSah, hariIniIso, penanda } from './tanggal.ts';

describe('penanda waktu beku', () => {
  it('menghitung nama hari kasus DADA dengan benar', () => {
    // 8 Oktober 2025 jatuh pada hari Rabu.
    expect(penanda('2025-10-08').hari).toBe('Rabu');
  });

  it('memberi seluruh bentuk yang dipakai antarmuka', () => {
    expect(penanda('2025-10-08')).toEqual({
      hari: 'Rabu',
      hariBesar: 'RABU',
      angka: '8',
      bulanTahun: 'OKTOBER 2025',
      pendek: '8 OKT 2025',
      panjang: '8 Oktober 2025',
    });
  });

  it('menghitung nama hari yang benar untuk tanggal lain', () => {
    const contoh: Array<[string, string]> = [
      ['2025-01-01', 'Rabu'],
      ['2025-08-01', 'Jumat'],
      ['2025-10-09', 'Kamis'],
      ['2025-10-22', 'Rabu'],
      ['2026-07-16', 'Kamis'],
      ['2024-02-29', 'Kamis'],
      ['2000-02-29', 'Selasa'],
    ];
    for (const [iso, hari] of contoh) {
      expect(penanda(iso).hari, iso).toBe(hari);
    }
  });

  it('memakai singkatan bulan Indonesia di keping', () => {
    expect(penanda('2025-08-01').pendek).toBe('1 AGU 2025');
    expect(penanda('2025-05-20').pendek).toBe('20 MEI 2025');
  });

  it('tidak memakai angka berimbuhan nol di depan', () => {
    expect(penanda('2025-03-05').angka).toBe('5');
    expect(penanda('2025-03-05').panjang).toBe('5 Maret 2025');
  });

  it('melempar untuk tanggal yang bukan ISO', () => {
    expect(() => penanda('8 Oktober 2025')).toThrow(TanggalTidakSah);
    expect(() => penanda('2025-10-8')).toThrow(TanggalTidakSah);
  });

  it('melempar untuk tanggal yang tidak ada di kalender', () => {
    expect(() => penanda('2025-02-30')).toThrow(TanggalTidakSah);
    expect(() => penanda('2025-13-01')).toThrow(TanggalTidakSah);
    // 2025 bukan tahun kabisat.
    expect(() => penanda('2025-02-29')).toThrow(TanggalTidakSah);
  });

  it('murni: dua pemanggilan menghasilkan nilai yang sama', () => {
    expect(penanda('2025-10-08')).toEqual(penanda('2025-10-08'));
  });
});

describe('hariIniIso — waktu disuntikkan (A1-T6)', () => {
  it('memakai tanggal lokal, bukan UTC', () => {
    // 06.00 di Jakarta pada 21 September; di UTC masih 20 September.
    const pagi = new Date(2026, 8, 21, 6, 0, 0);
    expect(hariIniIso(pagi)).toBe('2026-09-21');
  });

  it('memberi nol di depan untuk bulan dan tanggal satu digit', () => {
    expect(hariIniIso(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
  });

  it('menghasilkan tanggal yang bisa dibaca fungsi penanda', () => {
    expect(penanda(hariIniIso(new Date(2025, 9, 8, 9, 0, 0))).panjang).toBe('8 Oktober 2025');
  });

  it('menangani pergantian tahun', () => {
    expect(hariIniIso(new Date(2026, 11, 31, 23, 59, 0))).toBe('2026-12-31');
    expect(hariIniIso(new Date(2027, 0, 1, 0, 1, 0))).toBe('2027-01-01');
  });
});
