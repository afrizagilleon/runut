// Amandemen A-1, butir 1 — bukti bahwa metrik ketepatan yang baru:
//   (a) tidak lagi menghukum saldo kepemilikan 24 Okt yang BENAR menurut data,
//   (b) tidak lagi menghukum "Rp80 pada 15 Agu -> +93,75%",
//   (c) tidak lagi menghukum "17,7x volume 6 Okt",
//   (d) TETAP menghukum angka yang memang bertentangan dengan data mentah.
//
// (a)-(c) adalah tiga contoh yang reviewer sebut di §10 F-1 sebagai bukti
// bahwa metrik lama mengukur kerincian, bukan ketepatan. (d) adalah bukti
// merahnya: tanpa (d), metrik baru bisa saja selalu memberi nol.
//
// Tes ini membaca .cache/sectors/ (data mentah), bukan .cache/kunci/.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KELUARAN } from './berkas.ts';
import { adaDataMentah, muatDataMentah } from './data-mentah.ts';
import { nilaiKetepatan, type AngkaDinilai } from './ketepatan.ts';
import { adaKunci, muatKunci } from './kunci.ts';
import { nilaiKeluaran } from './penilai.ts';
import type { KeluaranLengan } from './skema-keluaran.ts';

const bisa = adaDataMentah();
if (!bisa) console.warn('LEWAT: .cache/sectors/FOLK-*.json tidak ada; tes ketepatan tidak dijalankan.');

function nilai(kalimat: string[]): AngkaDinilai[] {
  return nilaiKetepatan(kalimat, muatDataMentah());
}

function status(hasil: AngkaDinilai[], angka: number): string {
  const cocok = hasil.filter((h) => Math.abs(h.nilai - angka) < 1e-6);
  expect(cocok.length, `angka ${angka} tidak ikut dinilai sama sekali`).toBeGreaterThan(0);
  return cocok[0]?.status ?? '(tidak ada)';
}

function bacaKeluaran(nama: string): KeluaranLengan {
  const isi = JSON.parse(readFileSync(join(KELUARAN, nama), 'utf8')) as { keluaran: KeluaranLengan };
  return isi.keluaran;
}

describe.skipIf(!bisa)('ketepatan diadu ke data mentah, bukan ke kunci', () => {
  it('(a) saldo kepemilikan 24 Okt tidak lagi dihukum', () => {
    const hasil = nilai([
      'Pada 24 Oktober 2025 terbit laporan bahwa Sumber Garam Pratama menjual 197.407.074 lembar pada harga Rp170, ' +
        'sehingga kepemilikannya berubah dari 1.246.180.419 menjadi 1.048.773.345 lembar.',
    ]);
    expect(status(hasil, 1246180419)).toBe('cocok');
    expect(status(hasil, 1048773345)).toBe('cocok');
    expect(hasil.filter((h) => h.status === 'salah')).toEqual([]);
  });

  it('(b) "Rp80 pada 15 Agu, +93,75%" tidak lagi dihukum', () => {
    const hasil = nilai([
      'Harga penutupan FOLK naik dari Rp80 pada 15 Agustus 2025 menjadi Rp155 pada 7 Oktober 2025, ' +
        'kenaikan sekitar 93,75% dalam kurang dari dua bulan.',
    ]);
    expect(status(hasil, 80)).toBe('cocok');
    expect(status(hasil, 93.75)).toBe('cocok');
    expect(hasil.filter((h) => h.status === 'salah')).toEqual([]);
  });

  it('(c) "17,7x volume 6 Okt" tidak lagi dihukum', () => {
    const hasil = nilai([
      'Volume perdagangan FOLK pada 7 Oktober 2025 (66.466.200 lembar) sekitar 17,7 kali volume hari sebelumnya, ' +
        '6 Oktober 2025 (3.762.900 lembar).',
    ]);
    expect(status(hasil, 17.7)).toBe('cocok');
    expect(hasil.filter((h) => h.status === 'salah')).toEqual([]);
  });

  it('(d) BUKTI MERAH: angka yang bertentangan dengan data mentah tetap dihukum', () => {
    const hasil = nilai(['Pada 7 Oktober 2025, saham FOLK ditutup di Rp150 per lembar.']);
    expect(status(hasil, 150)).toBe('salah');
    expect(hasil[0]?.alasan).toContain('harga penutupan pada 2025-10-07');
  });

  it('(d2) BUKTI MERAH lewat penilai utuh: menyuntik Rp150 ke keluaran C-1 memperburuk kolom baru', () => {
    if (!adaKunci()) return;
    const kunci = muatKunci();
    const asli = bacaKeluaran('C-1.json');
    const sebelum = nilaiKeluaran(asli, 'C', 1, 'C-1.json', kunci);

    const rusak = JSON.parse(JSON.stringify(asli)) as KeluaranLengan;
    const hargaT = rusak.fakta_terlihat.find((f) => f.fact_id === 'harga-t');
    expect(hargaT, 'keluaran C-1 harus punya fakta harga-t').toBeDefined();
    if (!hargaT) return;
    hargaT.klaim = 'Pada 7 Oktober 2025, saham FOLK ditutup di Rp150 per lembar.';
    hargaT.nilai = 150;
    const sesudah = nilaiKeluaran(rusak, 'C', 1, 'C-1.json', kunci);

    expect(sebelum.angka_salah_baru).toBe(0);
    expect(sesudah.angka_salah_baru).toBeGreaterThan(sebelum.angka_salah_baru);
    expect(sesudah.pelanggaran_baru.some((p) => p.jenis === 'angka-bertentangan')).toBe(true);
  });

  it('angka dari endpoint yang tidak ada di cache masuk "tidak dapat diverifikasi", bukan "salah"', () => {
    const hasil = nilai([
      'Pada 7 Oktober 2025, aliran dana asing di saham FOLK tercatat net jual sebesar Rp386.886.200.',
    ]);
    expect(status(hasil, 386886200)).toBe('tidak-terverifikasi');
  });

  it('sembilan keluaran tersimpan: dua saldo 24 Okt tidak muncul sebagai angka bertentangan', () => {
    if (!adaKunci()) return;
    const kunci = muatKunci();
    for (const nama of ['A-1', 'A-2', 'A-3', 'S-1', 'S-2', 'S-3', 'C-1', 'C-2', 'C-3']) {
      const n = nilaiKeluaran(bacaKeluaran(`${nama}.json`), nama[0] ?? '?', 1, nama, kunci);
      const bentrok = n.pelanggaran_baru.filter((p) => p.jenis === 'angka-bertentangan');
      for (const b of bentrok) {
        expect(b.keterangan, `${nama}: ${b.keterangan}`).not.toContain('1246180419');
        expect(b.keterangan, `${nama}: ${b.keterangan}`).not.toContain('1048773345');
      }
    }
  });
});
