import { describe, expect, it } from 'vitest';
import type { Soal } from '../../factory/skema/tipe.ts';
import { barisMeta, contohPembuka } from './pembuka.ts';

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
    const baris = barisMeta({ soal: soalPalsu(3), pembuka: { judul: 'Halo.', ajak: 'Ya?', menit: 5 } });
    expect(baris).toBe('3 soal · sekitar 5 menit · tanpa akun, tanpa skor');
  });

  it('menyebut jumlah soal dari data: kasus empat soal berkata "4 soal"', () => {
    const baris = barisMeta({ soal: soalPalsu(4), pembuka: { judul: 'Halo.', ajak: 'Ya?', menit: 5 } });
    expect(baris).toContain('4 soal');
    expect(baris).not.toContain('3 soal');
  });

  it('memakai menit dari data, bukan angka tetap', () => {
    const baris = barisMeta({ soal: soalPalsu(3), pembuka: { judul: 'Halo.', ajak: 'Ya?', menit: 12 } });
    expect(baris).toBe('3 soal · sekitar 12 menit · tanpa akun, tanpa skor');
  });

  it('menghilangkan potongan menit kalau kasusnya tidak menuliskannya', () => {
    const baris = barisMeta({ soal: soalPalsu(3), pembuka: { judul: 'Halo.', ajak: 'Ya?' } });
    expect(baris).toBe('3 soal · tanpa akun, tanpa skor');
    expect(baris).not.toContain('menit');
  });

  it('tidak menambah kalimat: hanya tiga potongan, dipisah titik tengah', () => {
    const baris = barisMeta({ soal: soalPalsu(3), pembuka: { judul: 'Halo.', ajak: 'Ya?', menit: 5 } });
    expect(baris.split(' · ')).toHaveLength(3);
    expect(baris).not.toContain('.');
  });

  it('murni: dua pemanggilan menghasilkan teks yang sama', () => {
    const kasus = { soal: soalPalsu(3), pembuka: { judul: 'Halo.', ajak: 'Ya?', menit: 5 } };
    expect(barisMeta(kasus)).toBe(barisMeta(kasus));
  });
});

/*
 * M3.9 D-1/D-2: contoh gelembung layar pertama DIBACA dari `soal[0].pesan`.
 * Tidak ada medan kedua di berkas kasus, jadi layar pertama dan soal 1 tidak
 * bisa berselisih kata — dan yang dibawa hanya nama dan isi: tanpa jam, tanpa
 * tanggal (kontrak D-2).
 */
describe('contoh gelembung layar pertama (M3.9 D-2)', () => {
  it('membawa nama dan isi pesan soal PERTAMA, bukan soal lain', () => {
    const soal = soalPalsu(3).map((s, i) => ({
      ...s,
      pesan: { nama: `Nama${String(i)}`, jam: `19.3${String(i)}`, isi: `Isi ke-${String(i)}.` },
    }));
    expect(contohPembuka({ soal })).toEqual({ nama: 'Nama0', isi: 'Isi ke-0.' });
  });

  it('tidak membawa jam: yang dikembalikan hanya dua medan', () => {
    const contoh = contohPembuka({ soal: soalPalsu(1) });
    expect(Object.keys(contoh ?? {}).sort()).toEqual(['isi', 'nama']);
  });

  it('kasus tanpa soal tidak punya contoh — null, bukan teks karangan', () => {
    expect(contohPembuka({ soal: [] })).toBeNull();
  });
});
