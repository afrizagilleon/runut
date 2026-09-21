import { describe, expect, it } from 'vitest';
import type { Fakta } from '../../factory/skema/tipe.ts';
import { namaAsal, namaFakta } from './PanelSumber.tsx';

/**
 * "Dihitung dari" dulu mencetak `fact_id` apa adanya, dan pemilik membaca
 * "harga-2025-08-01 · harga-2025-10-08" di ponselnya. `namaFakta` memilih kata
 * yang menggantikannya; kodenya pindah ke lipatan rincian teknis.
 */

function buat(ubah: Partial<Fakta> & { fact_id: string }): Fakta {
  return {
    klaim: 'Klaim contoh.',
    nilai: 1,
    satuan: 'lembar',
    sumber: {
      jenis: 'api',
      endpoint: null,
      berkas: null,
      parameter: {},
      diambil_pada: null,
      keterangan: null,
    },
    turunan_dari: [],
    tersedia_sejak: '2025-10-01',
    status: 'TERVERIFIKASI',
    awam: null,
    ...ubah,
  };
}

const petakan = (daftar: Fakta[]): Map<string, Fakta> =>
  new Map(daftar.map((f) => [f.fact_id, f]));

describe('namaFakta', () => {
  it('memakai kepala awam kalau fakta itu memang sebuah kartu', () => {
    const indeks = petakan([
      buat({
        fact_id: 'harga-2025-08-01',
        awam: { kepala: 'Dihitung dari data harga', isi: 'apa pun' },
      }),
    ]);
    expect(namaFakta('harga-2025-08-01', indeks)).toBe('Dihitung dari data harga');
  });

  it('TIDAK pernah mengembalikan fact_id untuk fakta yang dikenal', () => {
    const indeks = petakan([
      buat({ fact_id: 'harga-2025-08-01', klaim: 'Harga penutupan 1 Agustus 2025 Rp8 per lembar.' }),
    ]);
    const nama = namaFakta('harga-2025-08-01', indeks);
    expect(nama).not.toContain('harga-2025-08-01');
    expect(nama).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('memakai klaim pendek apa adanya kalau tidak ada kepala awam', () => {
    const indeks = petakan([buat({ fact_id: 'x', klaim: 'Harga penutupan Rp8 per lembar.' })]);
    expect(namaFakta('x', indeks)).toBe('Harga penutupan Rp8 per lembar.');
  });

  it('memotong klaim panjang di batas kata, bukan di tengah kata', () => {
    const indeks = petakan([
      buat({
        fact_id: 'x',
        klaim:
          'Jumlah saham beredar 1.700.000.000 lembar, dihitung dari nilai pasar dibagi harga penutupan.',
      }),
    ]);
    const nama = namaFakta('x', indeks);
    expect(nama.endsWith('…')).toBe(true);
    expect(nama.length).toBeLessThanOrEqual(49);
    // Potongannya jatuh di spasi: tidak ada kata yang terbelah.
    expect(nama.slice(0, -1).trimEnd()).toBe(nama.slice(0, -1));
    expect(nama).toBe('Jumlah saham beredar 1.700.000.000 lembar…');
  });

  it('tidak meninggalkan koma menggantung sebelum elipsis', () => {
    const indeks = petakan([
      buat({ fact_id: 'x', klaim: 'Satu dua tiga empat lima enam tujuh delapan, sembilan sepuluh.' }),
    ]);
    expect(namaFakta('x', indeks)).toBe('Satu dua tiga empat lima enam tujuh delapan…');
  });

  it('mengembalikan id apa adanya kalau faktanya tidak dikenal — lebih baik daripada kosong', () => {
    expect(namaFakta('tidak-ada-ini', petakan([]))).toBe('tidak-ada-ini');
  });
});

describe('namaAsal — daftar fakta asal harus bisa dibedakan', () => {
  /** Persis bentuk yang merusak: 22 laporan berkalimat awal sama. */
  const laporan = (nomor: string, lembar: number): Fakta =>
    buat({
      fact_id: `fil-2025-10-19-${nomor}`,
      nilai: lembar,
      satuan: 'lembar',
      klaim:
        `Karya Permata Inovasi Indonesia melaporkan pembelian ${String(lembar)} lembar ` +
        `pada harga Rp152 atas transaksi 14 Oktober 2025.`,
    });

  it('tidak pernah mengembalikan dua nama yang sama', () => {
    const daftar = [laporan('01', 67_944_600), laporan('02', 33_029_600), laporan('03', 19_187_800)];
    const nama = namaAsal(
      daftar.map((f) => f.fact_id),
      petakan(daftar),
    );
    expect(new Set(nama).size).toBe(nama.length);
    expect(nama).toEqual(['67.944.600 lembar', '33.029.600 lembar', '19.187.800 lembar']);
  });

  it('membiarkan nama yang sudah berbeda apa adanya', () => {
    const daftar = [
      buat({ fact_id: 'a', awam: { kepala: 'Data harga · 1 Agu 2025', isi: '' } }),
      buat({ fact_id: 'b', awam: { kepala: 'Data harga · 8 Okt 2025', isi: '' } }),
    ];
    expect(namaAsal(['a', 'b'], petakan(daftar))).toEqual([
      'Data harga · 1 Agu 2025',
      'Data harga · 8 Okt 2025',
    ]);
  });

  it('memberi nomor urut kalau nilainya pun kembar', () => {
    const daftar = [laporan('01', 1_000), laporan('02', 1_000)];
    expect(namaAsal(['fil-2025-10-19-01', 'fil-2025-10-19-02'], petakan(daftar))).toEqual([
      '1.000 lembar (1)',
      '1.000 lembar (2)',
    ]);
  });

  it('tidak ada satu pun nama yang berupa kode fakta atau tanggal ISO', () => {
    const daftar = [laporan('01', 67_944_600), laporan('02', 33_029_600)];
    for (const nama of namaAsal(
      daftar.map((f) => f.fact_id),
      petakan(daftar),
    )) {
      expect(nama).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(nama).not.toMatch(/^[a-z]+(-[a-z0-9]+){2,}$/);
    }
  });
});
