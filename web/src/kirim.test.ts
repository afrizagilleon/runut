import { describe, expect, it } from 'vitest';
import type { Peristiwa } from './alur.ts';
import { MAKS_BADAN, MENGIRIM, pecahMuatan, perluSiram, saringYangBaru } from './kirim.ts';

function peristiwa(nama: Peristiwa['nama'], urut: number, isi = {}): Peristiwa {
  return {
    nama,
    sesi: '2f1a1d6c-0000-4000-8000-000000000001',
    kasus_id: 'dada-2025-10-08',
    t_ms: urut * 1000,
    urut,
    isi,
  };
}

describe('kirim — tanpa VITE_KOLEKTOR_URL', () => {
  it('tidak mengirim apa pun ketika alamat pengumpul tidak dikonfigurasi', () => {
    // Suite ini berjalan tanpa VITE_KOLEKTOR_URL, seperti build biasa.
    expect(MENGIRIM).toBe(false);
  });
});

describe('kirim — pemecahan muatan (D-9 membatasi badan 8 KB)', () => {
  it('menyatukan peristiwa kecil menjadi satu muatan', () => {
    const daftar = [peristiwa('mulai', 1), peristiwa('layar_masuk', 2)];
    const muatan = pecahMuatan(daftar);
    expect(muatan).toHaveLength(1);
    expect(muatan[0]).toHaveLength(2);
  });

  it('memecah sebelum melampaui batas', () => {
    const daftar = Array.from({ length: 200 }, (_, nomor) =>
      peristiwa('kartu_buka', nomor + 1, { soal_id: 's1-kata-bursa', fact_id: 'susp-2025-06-30' }),
    );
    const muatan = pecahMuatan(daftar);
    expect(muatan.length).toBeGreaterThan(1);
    for (const bagian of muatan) {
      expect(JSON.stringify(bagian).length).toBeLessThanOrEqual(MAKS_BADAN);
    }
    // Tidak ada peristiwa yang hilang atau berganda.
    expect(muatan.flat().map((p) => p.urut)).toEqual(daftar.map((p) => p.urut));
  });

  it('mempertahankan urutan peristiwa di dalam dan antar muatan', () => {
    const daftar = Array.from({ length: 60 }, (_, nomor) =>
      peristiwa('pilih', nomor + 1, { soal_id: 's1', kunci: 'b', ganti_ke: nomor }),
    );
    expect(pecahMuatan(daftar, 400).flat().map((p) => p.urut)).toEqual(
      daftar.map((p) => p.urut),
    );
  });

  it('tetap mengirim satu peristiwa raksasa sendirian daripada membuangnya diam-diam', () => {
    const raksasa = peristiwa('akhir_kirim', 1, { teks: 'a'.repeat(600) });
    const muatan = pecahMuatan([raksasa], 100);
    expect(muatan).toHaveLength(1);
    expect(muatan[0]).toHaveLength(1);
  });

  it('mengembalikan larik kosong untuk masukan kosong', () => {
    expect(pecahMuatan([])).toEqual([]);
  });
});

describe('kirim — peristiwa yang tidak boleh menunggu', () => {
  const penting: Array<Peristiwa['nama']> = [
    'kunci_jawaban',
    'pembukaan_masuk',
    'pembukaan_selesai',
    'minat_kasus_lain',
    'akhir_kirim',
    'tutup',
  ];
  for (const nama of penting) {
    it(`menyiram antrean begitu ada ${nama}`, () => {
      expect(perluSiram([peristiwa(nama, 1)])).toBe(true);
    });
  }

  const menunggu: Array<Peristiwa['nama']> = ['mulai', 'layar_masuk', 'kartu_buka', 'pilih'];
  for (const nama of menunggu) {
    it(`membiarkan ${nama} menumpuk dulu`, () => {
      expect(perluSiram([peristiwa(nama, 1)])).toBe(false);
    });
  }

  it('menyiram kalau satu saja di antaranya penting', () => {
    expect(perluSiram([peristiwa('pilih', 1), peristiwa('kunci_jawaban', 2)])).toBe(true);
  });
});

/*
 * Penjaga kirim-ganda (A1-T2). Penyebabnya terukur, bukan ditebak: `pagehide`
 * menyala lebih dari sekali di ponsel dan jalur itu menghitung peristiwanya dari
 * keadaan yang sama, sehingga `urut` yang sama lahir dua kali. Reproduksinya
 * ditempel di ledger.
 */
describe('kirim — satu peristiwa hanya boleh diserahkan sekali', () => {
  const p = (urut: number, sesi = 'sesi-1'): Peristiwa => ({
    nama: 'tutup',
    sesi,
    kasus_id: 'dada-2025-10-08',
    t_ms: urut * 100,
    urut,
    isi: { layar_terakhir: 'akhir' },
  });

  it('membuang peristiwa dengan urut yang sudah pernah lewat', () => {
    const catatan = new Map<string, number>();
    expect(saringYangBaru([p(1), p(2)], catatan)).toHaveLength(2);
    expect(saringYangBaru([p(2)], catatan)).toHaveLength(0);
  });

  it('membuang kembaran di dalam satu serahan', () => {
    expect(saringYangBaru([p(6), p(6)], new Map())).toHaveLength(1);
  });

  it('menghitung urut terpisah per sesi', () => {
    const catatan = new Map<string, number>();
    saringYangBaru([p(5, 'sesi-1')], catatan);
    expect(saringYangBaru([p(5, 'sesi-2')], catatan)).toHaveLength(1);
  });

  it('meloloskan urut yang lebih besar sesudah kembaran ditolak', () => {
    const catatan = new Map<string, number>();
    saringYangBaru([p(3)], catatan);
    saringYangBaru([p(3)], catatan);
    expect(saringYangBaru([p(4)], catatan).map((x) => x.urut)).toEqual([4]);
  });
});
