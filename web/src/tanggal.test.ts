import { describe, expect, it } from 'vitest';
import { TanggalTidakSah, penanda } from './tanggal.ts';

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
