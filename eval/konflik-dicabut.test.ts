// Pencabutan baris kunci C3 (reviewer, 20 Sep malam).
//
// Selisih 22,88 % -> 22,08 % pada laporan 19 Mei 2026 BUKAN kesalahan data:
// saham beredar bertambah lewat private placement Jan 2026
// (3.948.141.464 -> 4.091.357.544). Karena itu:
//   - C3 tidak boleh dihitung sebagai konflik, baik terdeteksi maupun sebagai
//     kesempatan, untuk lengan mana pun;
//   - lengan yang MELAPORKANNYA sebagai kejanggalan kini keliru, dan itu
//     dihitung di kolom tersendiri "positif palsu", bukan disembunyikan;
//   - lengan yang justru menyimpulkan penyebutnya bertambah TIDAK dihukum;
//   - angka 4.091.357.544 dan persentase yang memakainya (22,08 %, 20,77 %)
//     tidak boleh dihitung "angka salah" oleh metrik ketepatan baru.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KELUARAN } from './berkas.ts';
import { adaDataMentah, muatDataMentah } from './data-mentah.ts';
import { nilaiKetepatan } from './ketepatan.ts';
import { adaKunci, muatKunci } from './kunci.ts';
import { nilaiKeluaran } from './penilai.ts';
import { BARIS_KUNCI_DICABUT } from './penilai-aturan.ts';
import type { KeluaranLengan } from './skema-keluaran.ts';

const SEMBILAN = ['A-1', 'A-2', 'A-3', 'S-1', 'S-2', 'S-3', 'C-1', 'C-2', 'C-3'];

function baca(nama: string): KeluaranLengan {
  return (JSON.parse(readFileSync(join(KELUARAN, `${nama}.json`), 'utf8')) as { keluaran: KeluaranLengan }).keluaran;
}

function skor(nama: string): ReturnType<typeof nilaiKeluaran> {
  return nilaiKeluaran(baca(nama), nama.slice(0, 1), Number(nama.slice(2)), nama, muatKunci());
}

if (!adaKunci()) console.warn('LEWAT: .cache/kunci/ tidak ada; tes pencabutan C3 tidak dijalankan.');

describe.skipIf(!adaKunci())('C3 dicabut: tidak dihitung konflik, dilaporkan sebagai positif palsu', () => {
  it('C3 terdaftar sebagai baris yang dicabut', () => {
    expect(BARIS_KUNCI_DICABUT.map((b) => b.baris)).toContain('C3');
  });

  it('C3 tidak pernah muncul sebagai konflik terdeteksi maupun sebagai kesempatan', () => {
    for (const nama of SEMBILAN) {
      const n = skor(nama);
      const konflik = n.pelanggaran.filter((p) => p.jenis.startsWith('konflik-') && p.jenis !== 'konflik-dicabut');
      for (const p of konflik) {
        expect(p.keterangan, `${nama}: ${p.keterangan}`).not.toMatch(/\bC3\b/);
      }
    }
  });

  it('lengan C melaporkan C3 sebagai kejanggalan, jadi dihitung positif palsu', () => {
    for (const nama of ['C-1', 'C-2', 'C-3']) {
      expect(skor(nama).konflik_positif_palsu, `${nama} seharusnya punya positif palsu C3`).toBeGreaterThan(0);
    }
  });

  it('temuan yang menyebut penyebut baru sekaligus kedua persentase TIDAK dihitung positif palsu', () => {
    // Fixture buatan: isinya persis pola positif palsu, TAPI menyebut penyebut
    // barunya. Tanpa pengecualian penyebut baru, tes ini merah — itulah yang
    // membuat pengecualian itu mengikat, bukan sekadar komentar.
    const dasar = baca('C-1');
    const bersih = JSON.parse(JSON.stringify(dasar)) as KeluaranLengan;
    bersih.temuan = [
      {
        aturan: null,
        ringkasan:
          'Persentase 22,08% pada laporan 19 Mei 2026 berbeda dari 22,88% hasil hitung ulang dengan saham ' +
          'beredar lama, karena saham beredar bertambah menjadi 4.091.357.544 lembar.',
        angka: [
          { label: 'persen dilaporkan', nilai: 22.08, satuan: '%' },
          { label: 'persen penyebut lama', nilai: 22.88, satuan: '%' },
          { label: 'saham beredar baru', nilai: 4091357544, satuan: 'lembar' },
        ],
      },
    ];
    const n = nilaiKeluaran(bersih, 'uji', 0, 'uji.json', muatKunci());
    expect(n.konflik_positif_palsu).toBe(0);

    const tanpaPenyebut = JSON.parse(JSON.stringify(bersih)) as KeluaranLengan;
    const t = tanpaPenyebut.temuan[0];
    expect(t).toBeDefined();
    if (!t) return;
    t.ringkasan = 'Persentase 22,08% pada laporan 19 Mei 2026 salah; hitung ulang memberi 22,88%.';
    t.angka = t.angka.filter((a) => a.nilai !== 4091357544);
    expect(nilaiKeluaran(tanpaPenyebut, 'uji', 0, 'uji.json', muatKunci()).konflik_positif_palsu).toBe(1);
  });

  it('lengan yang menyebut penyebut baru 4.091.357.544 TIDAK dihitung positif palsu', () => {
    // S-1 menyimpulkan saham beredar bertambah ke 4.091.357.544 — itu jawaban
    // yang benar, bukan tuduhan salah, dan harus lolos.
    expect(skor('S-1').konflik_positif_palsu).toBe(0);
    for (const nama of ['A-1', 'A-2', 'A-3']) expect(skor(nama).konflik_positif_palsu).toBe(0);
  });

  it('angka 4.091.357.544 dan persentase penyebut baru tidak dihitung salah', () => {
    if (!adaDataMentah()) return;
    const hasil = nilaiKetepatan(
      [
        'Saham beredar FOLK bertambah menjadi 4.091.357.544 lembar sesudah private placement Januari 2026.',
        'Pada laporan 19 Mei 2026 kepemilikan tercatat 22,08 persen sebelum transaksi dan 20,77 persen sesudahnya.',
      ],
      muatDataMentah(),
    );
    expect(hasil.filter((h) => h.status === 'salah')).toEqual([]);
    for (const a of [4091357544, 22.08, 20.77]) {
      const p = hasil.find((h) => Math.abs(h.nilai - a) < 1e-6);
      expect(p, `angka ${a} tidak ikut dinilai`).toBeDefined();
      expect(p?.status, `angka ${a} tidak boleh dihitung salah`).not.toBe('salah');
    }
  });
});
