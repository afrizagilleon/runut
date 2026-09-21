import { describe, expect, it } from 'vitest';
import { pecahTeks } from '../../factory/skema/rujukan.ts';
import { ikatTandaBaca } from './Teks.tsx';

/*
 * F-A1-2: tautan angka dirender sebagai <button>, yang selalu menjadi kotak
 * inline atom; peramban boleh memutus baris di kedua sisinya, sehingga tanda
 * baca sesudahnya terlempar ke baris berikutnya. Tanda bacanya karena itu
 * diikat ke tautannya di sini — murni, dan bisa dites tanpa peramban.
 */
describe('ikatTandaBaca (A2-T2)', () => {
  const ikat = (teks: string) => ikatTandaBaca(pecahTeks(teks));

  it('memindahkan titik sesudah tautan ke dalam ikatan tautan itu', () => {
    const hasil = ikat('Naik ke [[harga-akhir|Rp178]]. Grup obrolanmu ramai.');
    expect(hasil[1]?.ekor).toBe('.');
    expect(hasil[2]?.bagian).toEqual({ jenis: 'utuh', teks: ' Grup obrolanmu ramai.' });
  });

  it('memindahkan koma juga', () => {
    const hasil = ikat('Dalam [[hari-bursa|47 hari bursa]], harga naik.');
    expect(hasil[1]?.ekor).toBe(',');
    expect(hasil[2]?.bagian).toEqual({ jenis: 'utuh', teks: ' harga naik.' });
  });

  it('memindahkan deretan tanda baca sekaligus', () => {
    const hasil = ikat('Lihat [[x|angka]]?! Lalu lanjut.');
    expect(hasil[1]?.ekor).toBe('?!');
  });

  it('tidak memindahkan huruf atau spasi', () => {
    const hasil = ikat('Dalam [[x|47 hari]] bursa harga naik.');
    expect(hasil[1]?.ekor).toBe('');
    expect(hasil[2]?.bagian).toEqual({ jenis: 'utuh', teks: ' bursa harga naik.' });
  });

  it('menangani tautan di akhir teks tanpa apa pun sesudahnya', () => {
    const hasil = ikat('Harga kini [[x|Rp178]]');
    expect(hasil[1]?.ekor).toBe('');
  });

  it('menangani dua tautan berturut-turut yang masing-masing berbuntut', () => {
    const hasil = ikat('Dari [[a|Rp8]], ke [[b|Rp178]]. Selesai.');
    expect(hasil[1]?.ekor).toBe(',');
    expect(hasil[3]?.ekor).toBe('.');
  });

  it('tidak menyentuh teks tanpa satu pun tautan', () => {
    const hasil = ikat('Kalimat biasa. Tanpa tautan.');
    expect(hasil).toHaveLength(1);
    expect(hasil[0]?.ekor).toBe('');
  });

  it('mengikat tanda baca juga untuk penanda misal dan hari-ini', () => {
    const hasil = ikat('Hari ini [[hari-ini|8 Oktober 2025]]. Kamu pegang [[misal|10 lot]], lalu.');
    expect(hasil[1]?.ekor).toBe('.');
    expect(hasil[3]?.ekor).toBe(',');
  });
});
