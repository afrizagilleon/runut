import { describe, expect, it } from 'vitest';
import type { Soal } from '../../factory/skema/tipe.ts';
import { barisMeta } from './pembuka.ts';

/**
 * Soal kosong sebanyak yang diminta. Yang diuji di sini hanya **berapa**
 * soalnya, jadi isinya tidak perlu masuk akal — yang harus masuk akal adalah
 * bahwa angkanya dibaca dari larik itu, bukan ditulis mati di komponen.
 */
function soalPalsu(jumlah: number): Soal[] {
  return Array.from({ length: jumlah }, (_, nomor) => ({
    soal_id: `s${String(nomor + 1)}`,
    kartu: [],
    kartu_penentu: [],
    istilah: [],
    pesan: { nama: 'Bayu', jam: '19.38', isi: 'Halo.' },
    tanya: 'Cocok?',
    petunjuk: null,
    pilihan: [],
    jawaban: 'a',
    penjelasan: '',
    fact_ids: [],
  }));
}

describe('baris meta layar pertama (D-1)', () => {
  it('menyebut jumlah soal dari data: kasus tiga soal berkata "3 soal"', () => {
    const baris = barisMeta({ soal: soalPalsu(3), pembuka: { kalimat: 'Halo.', menit: 5 } });
    expect(baris).toBe('3 soal · sekitar 5 menit · tanpa akun, tanpa skor');
  });

  it('menyebut jumlah soal dari data: kasus empat soal berkata "4 soal"', () => {
    const baris = barisMeta({ soal: soalPalsu(4), pembuka: { kalimat: 'Halo.', menit: 5 } });
    expect(baris).toContain('4 soal');
    expect(baris).not.toContain('3 soal');
  });

  it('memakai menit dari data, bukan angka tetap', () => {
    const baris = barisMeta({ soal: soalPalsu(3), pembuka: { kalimat: 'Halo.', menit: 12 } });
    expect(baris).toBe('3 soal · sekitar 12 menit · tanpa akun, tanpa skor');
  });

  it('menghilangkan potongan menit kalau kasusnya tidak menuliskannya', () => {
    const baris = barisMeta({ soal: soalPalsu(3), pembuka: { kalimat: 'Halo.' } });
    expect(baris).toBe('3 soal · tanpa akun, tanpa skor');
    expect(baris).not.toContain('menit');
  });

  it('tidak menambah kalimat: hanya tiga potongan, dipisah titik tengah', () => {
    const baris = barisMeta({ soal: soalPalsu(3), pembuka: { kalimat: 'Halo.', menit: 5 } });
    expect(baris.split(' · ')).toHaveLength(3);
    expect(baris).not.toContain('.');
  });

  it('murni: dua pemanggilan menghasilkan teks yang sama', () => {
    const kasus = { soal: soalPalsu(3), pembuka: { kalimat: 'Halo.', menit: 5 } };
    expect(barisMeta(kasus)).toBe(barisMeta(kasus));
  });
});
