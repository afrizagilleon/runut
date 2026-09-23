import { describe, expect, it } from 'vitest';
import type { Peristiwa } from './alur.ts';
import {
  KELOMPOK,
  PENTING,
  MAKS_BADAN,
  MENGIRIM,
  pecahMuatan,
  perluKirim,
  perluSiram,
  saringYangBaru,
} from './kirim.ts';

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
    // A-1 memindahkan `mulai` dan `layar_masuk` ke daftar ini. Keduanya dulu
    // sengaja menunggu; temuan reviewer F-1 membalik keputusan itu, karena
    // kunjungan yang ditinggalkan di layar pertama tidak pernah sampai.
    'mulai',
    'layar_masuk',
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

  // Sisanya tetap menunggu kelompoknya: kalau semuanya penting, satu layar soal
  // melahirkan puluhan permintaan kecil.
  const menunggu: Array<Peristiwa['nama']> = ['kartu_buka', 'pilih', 'ketuk', 'gulir'];
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

describe('kirim — kelompok 20 peristiwa (D-8)', () => {
  const sepele = (jumlah: number): Peristiwa[] =>
    Array.from({ length: jumlah }, (_, nomor) =>
      peristiwa('ketuk', nomor + 1, { layar: 'soal-1', uid: 'pesan', x: 0.5, y: 0.5, mati: true }),
    );

  it('antrean yang belum penuh dan tanpa peristiwa penting boleh menunggu', () => {
    expect(perluKirim(KELOMPOK - 1, sepele(1))).toBe(false);
    expect(perluKirim(0, sepele(5))).toBe(false);
  });

  it('antrean yang sudah mencapai 20 dikirim sekarang juga', () => {
    expect(perluKirim(KELOMPOK, sepele(1))).toBe(true);
    expect(perluKirim(KELOMPOK + 4, sepele(1))).toBe(true);
  });

  it('peristiwa penting tetap menyalip batas kelompok', () => {
    expect(perluKirim(1, [peristiwa('kunci_jawaban', 9)])).toBe(true);
    expect(perluKirim(1, [peristiwa('tutup', 9)])).toBe(true);
  });

  it('ketukan bukan peristiwa penting: ia menunggu kelompoknya penuh', () => {
    expect(perluSiram(sepele(19))).toBe(false);
  });

  it('dua puluh ketukan muat jauh di bawah batas muatan D-8 (32 KB)', () => {
    const muatan = pecahMuatan(sepele(KELOMPOK));
    expect(muatan).toHaveLength(1);
    expect(JSON.stringify(muatan[0]).length).toBeLessThan(32 * 1024);
    expect(MAKS_BADAN).toBeLessThanOrEqual(32 * 1024);
  });
});

describe('kirim — A-1: kunjungan tidak boleh hilang', () => {
  /*
   * Temuan reviewer F-1: sesi yang ditinggalkan di layar pertama hanya sampai
   * ke pengumpul kalau `pagehide` atau `visibilitychange` sempat menyala. Di
   * ponsel keduanya tidak selalu sempat, dan yang hilang adalah angka
   * pengunjung — angka yang akan disebut ke juri.
   */
  it('mulai dikirim segera, tanpa menunggu kelompok penuh', () => {
    expect(perluSiram([peristiwa('mulai', 1, { lebar_layar: 360 })])).toBe(true);
    expect(perluKirim(0, [peristiwa('mulai', 1, { lebar_layar: 360 })])).toBe(true);
  });

  it('layar_masuk dikirim segera, jadi tiap perpindahan layar tercatat', () => {
    expect(perluSiram([peristiwa('layar_masuk', 2, { layar: 'pembuka' })])).toBe(true);
    expect(perluKirim(0, [peristiwa('layar_masuk', 2, { layar: 'soal-1' })])).toBe(true);
  });

  it('kunjungan terpendek yang mungkin pun sudah memicu pengiriman', () => {
    // Buka halaman, tidak menyentuh apa pun: dua peristiwa, dan keduanya penting.
    const baruBuka = [
      peristiwa('mulai', 1, { lebar_layar: 360 }),
      peristiwa('layar_masuk', 2, { layar: 'pembuka' }),
    ];
    expect(perluKirim(0, baruBuka)).toBe(true);
  });

  it('ketukan dan gulir TETAP menunggu kelompoknya — A-1 tidak membuka keran', () => {
    // Kalau semua peristiwa menjadi penting, satu layar soal melahirkan puluhan
    // permintaan. Yang dikirim segera hanya yang menandai keberadaan orang.
    expect(perluSiram([peristiwa('ketuk', 3, { layar: 'soal-1' })])).toBe(false);
    expect(perluSiram([peristiwa('gulir', 4, { layar: 'soal-1' })])).toBe(false);
    expect(perluSiram([peristiwa('pilih', 5, {})])).toBe(false);
  });

  it('daftar PENTING memuat kedua nama A-1, dan sepuluh nama sejak `galat` (M3.8)', () => {
    expect(PENTING.has('mulai')).toBe(true);
    expect(PENTING.has('layar_masuk')).toBe(true);
    expect(PENTING.has('ketuk')).toBe(false);
    expect(PENTING.size).toBe(10);
  });

  /*
   * M3.8 D-3. Galat dikirim SEGERA: halaman yang baru saja melempar adalah
   * halaman yang mungkin tidak hidup cukup lama untuk kelompok berikutnya.
   * Batas 5 per sesi di reducer menjaga biaya beacon-nya tetap kecil.
   */
  it('`galat` termasuk PENTING', () => {
    expect(PENTING.has('galat')).toBe(true);
    expect(perluSiram([peristiwa('galat', 6, { jenis: 'error' })])).toBe(true);
  });

  /*
   * M3.7 D-2. `balon` sengaja **tidak** penting: ia bisa lahir berkali-kali di
   * satu layar, dan satu `sendBeacon` per goyangan jari adalah persis kiriman
   * yang tidak layak menunda apa pun. Ia menumpang kelompok berikutnya, seperti
   * `ketuk` dan `gulir`.
   */
  it('`balon` tidak termasuk PENTING — ia menumpang kelompok berikutnya', () => {
    expect(PENTING.has('balon')).toBe(false);
    expect(perluSiram([peristiwa('balon', 6, { layar: 'soal-1' })])).toBe(false);
  });
});
