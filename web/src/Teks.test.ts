import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

/* ------------------------------------------------------------------ */
/* M3.2/T-12 — opsi dirender POLOS, penandanya dilepas (D-2)          */
/* ------------------------------------------------------------------ */

describe('opsi: penanda rujukan dilepas, bukan ikut terbaca', () => {
  const AKAR = fileURLToPath(new URL('../../', import.meta.url));
  const kasus = JSON.parse(
    readFileSync(`${AKAR}cases/dada-2025-10-08.json`, 'utf8'),
  ) as { soal: Array<{ soal_id: string; pilihan: Array<{ kunci: string; teks: string }> }> };

  /** Teks yang benar-benar dilihat pemain kalau opsi dirender `interaktif={false}`. */
  const terlihat = (teks: string): string =>
    pecahTeks(teks)
      .map((b) => (b.jenis === 'utuh' ? b.teks : b.teks))
      .join('');

  it('berkas kasus memang masih menyimpan penanda di beberapa opsi', () => {
    // Itu disengaja (D-2: penanda boleh ada di data untuk jejak). Kalau suatu
    // hari tidak ada lagi, tes di bawah menjadi hampa — jadi keberadaannya
    // ikut dijaga di sini.
    const berpenanda = kasus.soal.flatMap((s) => s.pilihan).filter((p) => p.teks.includes('[['));
    expect(berpenanda.length).toBeGreaterThan(0);
  });

  it('tidak satu pun opsi menampilkan kurung siku ganda ke pemain', () => {
    for (const soal of kasus.soal) {
      for (const p of soal.pilihan) {
        const tampil = terlihat(p.teks);
        expect(tampil, `${soal.soal_id} ${p.kunci}`).not.toContain('[[');
        expect(tampil, `${soal.soal_id} ${p.kunci}`).not.toContain(']]');
        expect(tampil, `${soal.soal_id} ${p.kunci}`).not.toContain('|');
      }
    }
  });

  it('teks yang dilihat pemain tetap memuat angkanya', () => {
    const c = kasus.soal[0]?.pilihan.find((p) => p.kunci === 'c');
    expect(terlihat(c?.teks ?? '')).toContain('22 kali');
    expect(terlihat(c?.teks ?? '')).not.toContain('kelipatan-2025-08-01');
  });

  it('opsi dirender lewat Teks dengan interaktif={false}, bukan sebagai teks mentah', () => {
    // Penjaga terakhir: yang di atas membuktikan aturannya, yang ini
    // membuktikan aturan itu dipakai di tempat yang benar.
    // Komentar dibuang lebih dulu: komentar yang MENYEBUT `interaktif={false}`
    // tidak boleh dihitung sebagai kode yang memakainya.
    const sumber = readFileSync(`${AKAR}web/src/Aplikasi.tsx`, 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const opsi = sumber.slice(sumber.indexOf('className="opsi-teks"'), sumber.indexOf('opsi-tanda'));
    expect(opsi).toContain('<Teks teks={p.teks}');
    // `interaktif={false}` bukan hiasan: tanpa ia, angka di dalam opsi menjadi
    // tombol yang membuka sumber, dan ucapan teman tampak sudah terverifikasi
    // sebelum pemain memeriksanya (D-2, mode ketat 'ucapan').
    expect(opsi).toContain('interaktif={false}');
  });
});
