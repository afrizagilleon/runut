import { describe, expect, it } from 'vitest';
import {
  type Aksi,
  type Keadaan,
  type Peristiwa,
  keadaanAwal,
  langkah,
  LABEL_COCOK,
  LABEL_KUNCI,
  LABEL_TURUN,
  bilahBawah,
  LABEL_PILIHAN_PEMAIN,
  BATAS_BALON,
  BATAS_KETUK,
  keadaanBalon,
  NAMA_PERISTIWA,
  namaLayar,
  layarDariNama,
  layarSebelumnya,
  pernahSampai,
  semuaTerkunci,
  tandaOpsi,
  tujuanRiwayat,
} from './alur.ts';

const AWAL = {
  sesi: 'sesi-uji',
  kasus_id: 'contoh-2025-10-08',
  urutanSoal: ['s1', 's2', 's3'],
  kunciBenar: { s1: 'b', s2: 'a', s3: 'c' },
  kartuSoal: { s1: ['k1', 'k2'], s2: ['k3', 'k4'], s3: ['k5', 'k6', 'k7', 'k8'] },
};

/**
 * Jalankan urutan aksi dengan waktu yang bertambah tetap, lalu kembalikan
 * keadaan akhir dan **seluruh** peristiwa yang lahir. Waktu disuntik, jadi
 * hasilnya deterministik.
 */
function jalankan(
  aksi: Array<Aksi | [Aksi, number]>,
  mulaiWaktu = 1_000,
): { keadaan: Keadaan; peristiwa: Peristiwa[] } {
  let keadaan = keadaanAwal(AWAL);
  const semua: Peristiwa[] = [];
  let waktu = mulaiWaktu;
  for (const butir of aksi) {
    const [a, maju] = Array.isArray(butir) ? butir : [butir, 100];
    waktu += maju;
    const hasil = langkah(keadaan, a, waktu);
    keadaan = hasil.keadaan;
    semua.push(...hasil.peristiwa);
  }
  return { keadaan, peristiwa: semua };
}

/** Urutan nama peristiwa saja, untuk dibandingkan persis. */
const namaUrut = (peristiwa: Peristiwa[]): string[] => peristiwa.map((p) => p.nama);

const MULAI: Aksi = { jenis: 'mulai', lebar_layar: 375 };

/** Jalur terpendek sampai semua soal terkunci. */
function sampaiTerkunci(): Array<Aksi | [Aksi, number]> {
  return [
    MULAI,
    { jenis: 'lanjut' },
    { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
    { jenis: 'kunci_jawaban', soal_id: 's1' },
    { jenis: 'lanjut' },
    { jenis: 'pilih', soal_id: 's2', kunci: 'a' },
    { jenis: 'kunci_jawaban', soal_id: 's2' },
    { jenis: 'lanjut' },
    { jenis: 'pilih', soal_id: 's3', kunci: 'c' },
    { jenis: 'kunci_jawaban', soal_id: 's3' },
  ];
}

describe('alur — jalur tuntas', () => {
  it('melahirkan urutan peristiwa yang persis, dari mulai sampai tutup', () => {
    const { peristiwa } = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lanjut' },
      { jenis: 'catat_gulir', persen: 80 },
      { jenis: 'lanjut' },
      { jenis: 'isi_akhir', medan: 'rating', nilai: 4 },
      { jenis: 'kirim_akhir' },
      { jenis: 'minat_kasus_lain' },
      { jenis: 'tutup' },
    ]);

    // Tiap perpindahan layar melahirkan `gulir` untuk layar yang DITINGGALKAN
    // (D-8) — termasuk sekali lagi sebelum `tutup`, untuk layar terakhir.
    expect(namaUrut(peristiwa)).toEqual([
      'mulai',
      'layar_masuk', // pembuka
      'gulir', // meninggalkan pembuka
      'layar_masuk', // soal-1
      'pilih',
      'kunci_jawaban',
      'gulir', // meninggalkan soal-1
      'layar_masuk', // soal-2
      'pilih',
      'kunci_jawaban',
      'gulir', // meninggalkan soal-2
      'layar_masuk', // soal-3
      'pilih',
      'kunci_jawaban',
      'pembukaan_masuk',
      'gulir', // meninggalkan soal-3
      'layar_masuk', // pembukaan
      'gulir', // M3.4a: ambang 50% dilewati di pembukaan (persen 80)
      'pembukaan_selesai',
      'gulir', // meninggalkan pembukaan
      'layar_masuk', // akhir
      'akhir_kirim',
      'minat_kasus_lain',
      'gulir', // layar akhir, sesaat sebelum tutup
      'tutup',
    ]);
  });

  it('menomori peristiwa berurutan tanpa lompatan dan membawa sesi serta kasus_id', () => {
    const { peristiwa } = jalankan([...sampaiTerkunci(), { jenis: 'lanjut' }]);
    expect(peristiwa.map((p) => p.urut)).toEqual(
      peristiwa.map((_, nomor) => nomor + 1),
    );
    for (const p of peristiwa) {
      expect(p.sesi).toBe('sesi-uji');
      expect(p.kasus_id).toBe('contoh-2025-10-08');
    }
  });

  it('menghitung t_ms dari aksi mulai, bukan dari epoch', () => {
    const { peristiwa } = jalankan([MULAI, { jenis: 'lanjut' }], 5_000_000);
    expect(peristiwa[0]?.t_ms).toBe(0);
    expect(peristiwa[1]?.t_ms).toBe(0);
    // 'lanjut' terjadi 100 ms sesudah 'mulai'.
    expect(peristiwa[2]?.t_ms).toBe(100);
  });

  it('mencatat nama layar yang benar di tiap layar_masuk', () => {
    const { peristiwa } = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lanjut' },
      { jenis: 'lanjut' },
    ]);
    expect(peristiwa.filter((p) => p.nama === 'layar_masuk').map((p) => p.isi['layar'])).toEqual([
      'pembuka',
      'soal-1',
      'soal-2',
      'soal-3',
      'pembukaan',
      'akhir',
    ]);
  });

  it('menilai benar dan salah menurut kunci jawaban', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'a' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
    ]);
    const kunci = peristiwa.find((p) => p.nama === 'kunci_jawaban');
    expect(kunci?.isi['benar']).toBe(false);
    expect(kunci?.isi['kunci']).toBe('a');
  });
});

describe('alur — memilih dan mengunci (D-3)', () => {
  it('mencatat ganti_ke 0 untuk pilihan pertama lalu menaikkannya tiap perpindahan', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'a' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'c' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
    ]);
    expect(peristiwa.filter((p) => p.nama === 'pilih').map((p) => p.isi['ganti_ke'])).toEqual([
      0, 1, 2,
    ]);
  });

  it('tidak mencatat apa pun kalau pemain memilih ulang pilihan yang sama', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'a' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'a' },
    ]);
    expect(peristiwa.filter((p) => p.nama === 'pilih')).toHaveLength(1);
  });

  it('NEGATIF — menolak mengunci tanpa memilih: nol peristiwa, keadaan utuh', () => {
    const sebelum = jalankan([MULAI, { jenis: 'lanjut' }]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'kunci_jawaban', soal_id: 's1' }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
    expect(hasil.keadaan).toBe(sebelum.keadaan);
    expect(hasil.keadaan.soal['s1']?.dikunci).toBe(false);
  });

  it('NEGATIF — menolak mengubah pilihan sesudah dikunci', () => {
    const sebelum = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
    ]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'pilih', soal_id: 's1', kunci: 'd' }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
    expect(hasil.keadaan.soal['s1']?.kunci).toBe('b');
  });

  it('NEGATIF — menolak mengunci dua kali', () => {
    const sebelum = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
    ]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'kunci_jawaban', soal_id: 's1' }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
  });

  it('NEGATIF — menolak lanjut dari soal yang belum dikunci', () => {
    const sebelum = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
    ]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'lanjut' }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
    expect(namaLayar(hasil.keadaan.layar)).toBe('soal-1');
  });

  it('NEGATIF — layar pembukaan tidak bisa dicapai sebelum tiga soal terkunci', () => {
    // Soal 3 sengaja tidak dikunci; 'lanjut' dari soal-3 harus ditolak.
    const sebelum = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's2', kunci: 'a' },
      { jenis: 'kunci_jawaban', soal_id: 's2' },
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's3', kunci: 'c' },
    ]);
    expect(semuaTerkunci(sebelum.keadaan)).toBe(false);
    const hasil = langkah(sebelum.keadaan, { jenis: 'lanjut' }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
    expect(namaLayar(hasil.keadaan.layar)).toBe('soal-3');
  });

  /*
   * Penjaga berlapis. Lewat alur biasa, soal-3 hanya bisa dicapai kalau soal-1
   * dan soal-2 sudah terkunci, jadi penjaga `semuaTerkunci` di cabang pembukaan
   * tidak pernah tersentuh — ia baru berarti kalau navigasi berubah di kemudian
   * hari. Tes ini menyusun keadaan tidak konsisten itu langsung supaya penjaga
   * kedua benar-benar diuji, bukan hanya diandaikan.
   */
  it('NEGATIF — penjaga kedua menolak pembukaan walau soal terakhir terkunci sendirian', () => {
    const dasar = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's2', kunci: 'a' },
      { jenis: 'kunci_jawaban', soal_id: 's2' },
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's3', kunci: 'c' },
      { jenis: 'kunci_jawaban', soal_id: 's3' },
    ]).keadaan;

    const s2 = dasar.soal['s2'];
    expect(s2).toBeDefined();
    const bolong: Keadaan = {
      ...dasar,
      soal: { ...dasar.soal, s2: { ...s2!, dikunci: false, benar: null } },
    };
    expect(semuaTerkunci(bolong)).toBe(false);

    const hasil = langkah(bolong, { jenis: 'lanjut' }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
    expect(namaLayar(hasil.keadaan.layar)).toBe('soal-3');
  });
});

describe('alur — lama kartu terlihat dan gulir balik (A1-T2)', () => {
  /*
   * Ukuran "apakah pemain membaca kartu" adalah lama tumpukan kartu berada di
   * layar sebelum jawaban dikunci, bukan berapa kali kartu dibuka: kartu tampil
   * terbuka sejak awal, sehingga hitungan buka-ulang selalu nol untuk orang
   * yang justru membacanya (F-1).
   */
  it('menjumlahkan masuk-keluar-masuk dengan angka yang persis', () => {
    const { keadaan, peristiwa } = jalankan([
      MULAI,
      [{ jenis: 'lanjut' }, 100],
      // Pengamat melaporkan kartu sudah di layar begitu layarnya dirender.
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 0],
      // Kartu terlihat dari +100 sampai +1.100 = 1.000 ms
      [{ jenis: 'kartu_keluar_layar', soal_id: 's1' }, 1_000],
      // Di luar layar 400 ms: pemain menggulir ke opsi
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 400],
      // Terlihat lagi 700 ms: gulir balik pertama
      [{ jenis: 'pilih', soal_id: 's1', kunci: 'b' }, 700],
      [{ jenis: 'kunci_jawaban', soal_id: 's1' }, 0],
    ]);
    const kunci = peristiwa.find((p) => p.nama === 'kunci_jawaban');
    expect(kunci?.isi['ms_kartu_terlihat_sebelum']).toBe(1_700);
    expect(kunci?.isi['gulir_balik_ke_kartu']).toBe(1);
    expect(keadaan.soal['s1']?.msKartuTerlihatSaatKunci).toBe(1_700);
    expect(keadaan.soal['s1']?.gulirBalikSaatKunci).toBe(1);
  });

  it('tidak menghitung waktu ketika kartu di luar layar', () => {
    const { peristiwa } = jalankan([
      MULAI,
      [{ jenis: 'lanjut' }, 100],
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 0],
      [{ jenis: 'kartu_keluar_layar', soal_id: 's1' }, 500],
      // 9 detik di luar layar tidak boleh ikut terhitung.
      [{ jenis: 'pilih', soal_id: 's1', kunci: 'b' }, 9_000],
      [{ jenis: 'kunci_jawaban', soal_id: 's1' }, 0],
    ]);
    expect(peristiwa.find((p) => p.nama === 'kunci_jawaban')?.isi['ms_kartu_terlihat_sebelum']).toBe(
      500,
    );
  });

  it('NEGATIF — waktu sesudah penguncian tidak mengubah angka yang sudah dilaporkan', () => {
    const { keadaan } = jalankan([
      MULAI,
      [{ jenis: 'lanjut' }, 100],
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 0],
      [{ jenis: 'pilih', soal_id: 's1', kunci: 'b' }, 600],
      [{ jenis: 'kunci_jawaban', soal_id: 's1' }, 0],
      // Membaca kartu lagi sesudah jawaban terkunci: tidak boleh terhitung.
      [{ jenis: 'kartu_keluar_layar', soal_id: 's1' }, 5_000],
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 1_000],
      [{ jenis: 'kartu_keluar_layar', soal_id: 's1' }, 4_000],
    ]);
    expect(keadaan.soal['s1']?.msKartuTerlihatSaatKunci).toBe(600);
    expect(keadaan.soal['s1']?.gulirBalikSaatKunci).toBe(0);
  });

  it('kemunculan pertama bukan gulir balik', () => {
    const { peristiwa } = jalankan([
      MULAI,
      [{ jenis: 'lanjut' }, 100],
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 200],
      [{ jenis: 'pilih', soal_id: 's1', kunci: 'b' }, 300],
      [{ jenis: 'kunci_jawaban', soal_id: 's1' }, 0],
    ]);
    expect(peristiwa.find((p) => p.nama === 'kunci_jawaban')?.isi['gulir_balik_ke_kartu']).toBe(0);
  });

  it('menghitung dua gulir balik sebagai dua', () => {
    const { peristiwa } = jalankan([
      MULAI,
      [{ jenis: 'lanjut' }, 100],
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 0],
      [{ jenis: 'kartu_keluar_layar', soal_id: 's1' }, 200],
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 200],
      [{ jenis: 'kartu_keluar_layar', soal_id: 's1' }, 200],
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 200],
      [{ jenis: 'pilih', soal_id: 's1', kunci: 'b' }, 200],
      [{ jenis: 'kunci_jawaban', soal_id: 's1' }, 0],
    ]);
    expect(peristiwa.find((p) => p.nama === 'kunci_jawaban')?.isi['gulir_balik_ke_kartu']).toBe(2);
  });

  it('mengabaikan laporan masuk atau keluar yang berulang', () => {
    const { keadaan } = jalankan([
      MULAI,
      [{ jenis: 'lanjut' }, 100],
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 300],
      [{ jenis: 'kartu_masuk_layar', soal_id: 's1' }, 300],
      [{ jenis: 'kartu_keluar_layar', soal_id: 's1' }, 300],
      [{ jenis: 'kartu_keluar_layar', soal_id: 's1' }, 300],
    ]);
    expect(keadaan.soal['s1']?.gulirBalik).toBe(0);
    // Terlihat dari laporan masuk pertama (+400) sampai laporan keluar pertama (+1.000).
    expect(keadaan.soal['s1']?.msKartuTerlihat).toBe(600);
  });

  it('pengamat kartu tidak melahirkan peristiwa apa pun', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'kartu_keluar_layar', soal_id: 's1' },
      { jenis: 'kartu_masuk_layar', soal_id: 's1' },
    ]);
    expect(namaUrut(peristiwa)).toEqual(['mulai', 'layar_masuk', 'gulir', 'layar_masuk']);
  });

  it('"Kembali ke kartu" melahirkan tepat satu peristiwa per ketukan', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'kembali_ke_kartu', soal_id: 's1' },
      { jenis: 'kembali_ke_kartu', soal_id: 's1' },
    ]);
    const kembali = peristiwa.filter((p) => p.nama === 'kembali_ke_kartu');
    expect(kembali).toHaveLength(2);
    expect(kembali[0]?.isi).toEqual({ soal_id: 's1' });
  });

  it('kartu_buka kini hanya berarti panel sumber dibuka', () => {
    const { peristiwa, keadaan } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'sakelar_sumber', fact_id: 'k1', soal_id: 's1' },
    ]);
    const buka = peristiwa.find((p) => p.nama === 'kartu_buka');
    expect(buka?.isi).toEqual({ soal_id: 's1', fact_id: 'k1' });
    expect(keadaan.soal['s1']?.kartuDibuka).toBe(1);
  });

  it('tidak mencatat kartu_buka untuk panel sumber di luar layar soal', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'sakelar_sumber', fact_id: 'k1', soal_id: null },
    ]);
    expect(peristiwa.filter((p) => p.nama === 'kartu_buka')).toHaveLength(0);
  });
});

describe('alur — melihat balik soal yang sudah dikunci (D-3)', () => {
  it('mencatat lihat_balik beserta layar asal dan tujuan', () => {
    const { peristiwa } = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lihat_balik', nomor: 0 },
    ]);
    const balik = peristiwa.find((p) => p.nama === 'lihat_balik');
    expect(balik?.isi).toEqual({ dari_layar: 'soal-3', ke_layar: 'soal-1' });
    // Sesudah lihat_balik, `gulir` soal-3 dan layar_masuk soal-1 juga tercatat.
    expect(namaUrut(peristiwa).slice(-3)).toEqual(['lihat_balik', 'gulir', 'layar_masuk']);
  });

  it('NEGATIF — menolak melihat balik soal yang belum dikunci', () => {
    const sebelum = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
    ]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'lihat_balik', nomor: 2 }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
    expect(namaLayar(hasil.keadaan.layar)).toBe('soal-2');
  });

  it('waktu di soal terus terkumpul lintas kunjungan, dan penguncian memakai jumlahnya', () => {
    const { peristiwa } = jalankan([
      MULAI,
      [{ jenis: 'lanjut' }, 100],
      [{ jenis: 'pilih', soal_id: 's1', kunci: 'b' }, 500],
      [{ jenis: 'kunci_jawaban', soal_id: 's1' }, 700],
    ]);
    const kunci = peristiwa.find((p) => p.nama === 'kunci_jawaban');
    // masuk soal-1 pada +100, dikunci pada +100+500+700 = 1300 → 1200 ms di soal.
    expect(kunci?.isi['ms_di_soal']).toBe(1200);
  });
});

describe('alur — layar pembukaan dan layar akhir', () => {
  it('mencatat gulir terjauh dan lama di layar pembukaan', () => {
    const { peristiwa } = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lanjut' },
      { jenis: 'catat_gulir', persen: 40 },
      { jenis: 'catat_gulir', persen: 90 },
      // Mundur lagi tidak menurunkan angka terjauh.
      { jenis: 'catat_gulir', persen: 10 },
      [{ jenis: 'lanjut' }, 250],
    ]);
    const selesai = peristiwa.find((p) => p.nama === 'pembukaan_selesai');
    expect(selesai?.isi['gulir_maks_persen']).toBe(90);
    expect(Number(selesai?.isi['ms_di_pembukaan'])).toBeGreaterThan(0);
  });

  it('membatasi gulir pada 0–100 persen', () => {
    const sebelum = jalankan([...sampaiTerkunci(), { jenis: 'lanjut' }]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'catat_gulir', persen: 350 }, 9_999);
    expect(hasil.keadaan.gulirMaksPersen).toBe(100);
  });

  it('mengirim keempat medan layar akhir, semuanya boleh null', () => {
    const { peristiwa } = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lanjut' },
      { jenis: 'lanjut' },
      { jenis: 'kirim_akhir' },
    ]);
    const kirim = peristiwa.find((p) => p.nama === 'akhir_kirim');
    expect(kirim?.isi).toEqual({
      rating: null,
      terasa: null,
      sumber_jawaban: null,
      teks: null,
    });
  });

  it('memotong teks layar akhir pada 500 karakter', () => {
    const panjang = 'a'.repeat(900);
    const { peristiwa } = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lanjut' },
      { jenis: 'lanjut' },
      { jenis: 'isi_akhir', medan: 'teks', nilai: panjang },
      { jenis: 'kirim_akhir' },
    ]);
    const kirim = peristiwa.find((p) => p.nama === 'akhir_kirim');
    expect(String(kirim?.isi['teks'])).toHaveLength(500);
  });

  it('NEGATIF — menolak kirim_akhir dua kali', () => {
    const sebelum = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lanjut' },
      { jenis: 'lanjut' },
      { jenis: 'kirim_akhir' },
    ]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'kirim_akhir' }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
  });

  it('NEGATIF — menolak kirim_akhir di luar layar akhir', () => {
    const sebelum = jalankan([...sampaiTerkunci(), { jenis: 'lanjut' }]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'kirim_akhir' }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
  });
});

describe('alur — jalur berhenti di tengah', () => {
  it('mencatat tutup dengan layar terakhir ketika pemain berhenti di soal 2', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
      { jenis: 'sakelar_sumber', soal_id: 's2', fact_id: 'k3' },
      { jenis: 'tutup' },
    ]);
    expect(namaUrut(peristiwa)).toEqual([
      'mulai',
      'layar_masuk',
      'gulir',
      'layar_masuk',
      'pilih',
      'kunci_jawaban',
      'gulir',
      'layar_masuk',
      'kartu_buka',
      'gulir',
      'tutup',
    ]);
    expect(peristiwa[peristiwa.length - 1]?.isi).toEqual({ layar_terakhir: 'soal-2' });
  });

  it('tidak melahirkan apa pun sesudah tutup', () => {
    const sebelum = jalankan([MULAI, { jenis: 'lanjut' }, { jenis: 'tutup' }]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'pilih', soal_id: 's1', kunci: 'b' }, 9_999);
    expect(hasil.peristiwa).toEqual([]);
  });

  it('mengabaikan aksi apa pun sebelum mulai', () => {
    const awal = keadaanAwal(AWAL);
    const hasil = langkah(awal, { jenis: 'lanjut' }, 1_000);
    expect(hasil.peristiwa).toEqual([]);
    expect(hasil.keadaan).toBe(awal);
  });

  it('menolak mulai dua kali', () => {
    const sebelum = jalankan([MULAI]);
    const hasil = langkah(sebelum.keadaan, MULAI, 9_999);
    expect(hasil.peristiwa).toEqual([]);
  });
});

describe('alur — kemurnian reducer (D-5)', () => {
  it('tidak mengubah keadaan yang diberikan', () => {
    const awal = keadaanAwal(AWAL);
    const salinan = JSON.stringify(awal);
    langkah(awal, MULAI, 1_000);
    expect(JSON.stringify(awal)).toBe(salinan);
  });

  it('menghasilkan peristiwa yang sama persis untuk waktu suntikan yang sama', () => {
    const satu = jalankan(sampaiTerkunci());
    const dua = jalankan(sampaiTerkunci());
    expect(JSON.stringify(satu.peristiwa)).toBe(JSON.stringify(dua.peristiwa));
  });

  it('hanya melahirkan nama peristiwa dari daftar tertutup D-6', () => {
    const { peristiwa } = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lihat_balik', nomor: 0 },
      { jenis: 'lihat_balik', nomor: 2 },
      { jenis: 'lanjut' },
      { jenis: 'lanjut' },
      { jenis: 'kirim_akhir' },
      { jenis: 'minat_kasus_lain' },
      { jenis: 'tutup' },
    ]);
    const dipakai = new Set(namaUrut(peristiwa));
    expect([...dipakai].sort()).toEqual([
      'akhir_kirim',
      'gulir',
      'kunci_jawaban',
      'layar_masuk',
      'lihat_balik',
      'minat_kasus_lain',
      'mulai',
      'pembukaan_masuk',
      'pembukaan_selesai',
      'pilih',
      'tutup',
    ]);
  });
});

describe('alur — tanda opsi sesudah dikunci (A1-T4, diperbaiki A4-T4)', () => {
  const sesudah = (aksi: Array<Aksi | [Aksi, number]>) => jalankan(aksi).keadaan.soal['s1'];
  /** Keadaannya saja, untuk menegaskan keempat keadaan itu sendiri tidak berubah. */
  const keadaanOpsi = (s: Parameters<typeof tandaOpsi>[0], k: string, j: string): string =>
    tandaOpsi(s, k, j).keadaan;
  const HURUF = ['a', 'b', 'c', 'd'];

  it('belum dikunci: hanya pilihan pemain yang ditandai, dan ia sudah berlabel kata', () => {
    const s = sesudah([MULAI, { jenis: 'lanjut' }, { jenis: 'pilih', soal_id: 's1', kunci: 'c' }]);
    expect(keadaanOpsi(s, 'c', 'b')).toBe('dipilih');
    expect(tandaOpsi(s, 'c', 'b').label).toEqual([LABEL_PILIHAN_PEMAIN]);
    expect(keadaanOpsi(s, 'b', 'b')).toBe('polos');
    expect(tandaOpsi(s, 'b', 'b').label).toEqual([]);
    expect(keadaanOpsi(s, 'a', 'b')).toBe('polos');
  });

  it('tepat satu baris berlabel Pilihanmu, di keempat keadaan mana pun', () => {
    for (const pilihan of HURUF) {
      for (const dikunci of [false, true]) {
        const aksi: Array<Aksi | [Aksi, number]> = [
          MULAI,
          { jenis: 'lanjut' },
          { jenis: 'pilih', soal_id: 's1', kunci: pilihan },
        ];
        if (dikunci) aksi.push({ jenis: 'kunci_jawaban', soal_id: 's1' });
        const s = sesudah(aksi);
        const berlabel = HURUF.filter((k) =>
          tandaOpsi(s, k, 'b').label.includes(LABEL_PILIHAN_PEMAIN),
        );
        expect(berlabel, `pilihan ${pilihan}, dikunci ${String(dikunci)}`).toEqual([pilihan]);
      }
    }
  });

  it('tepat satu baris berlabel yang cocok, dan hanya sesudah dikunci', () => {
    const belum = sesudah([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'd' },
    ]);
    expect(HURUF.filter((k) => tandaOpsi(belum, k, 'b').label.includes(LABEL_COCOK))).toEqual([]);

    const sudah = sesudah([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'd' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
    ]);
    expect(HURUF.filter((k) => tandaOpsi(sudah, k, 'b').label.includes(LABEL_COCOK))).toEqual(['b']);
  });

  it('tidak ada baris yang hanya berwarna: tiap keadaan bukan-polos membawa kata', () => {
    const s = sesudah([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'd' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
    ]);
    for (const k of HURUF) {
      const tanda = tandaOpsi(s, k, 'b');
      if (tanda.keadaan === 'polos') expect(tanda.label).toEqual([]);
      else expect(tanda.label.length, `opsi ${k} keadaan ${tanda.keadaan}`).toBeGreaterThan(0);
    }
  });

  it('dikunci dan benar: SATU baris membawa kedua tanda', () => {
    const s = sesudah([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
    ]);
    expect(keadaanOpsi(s, 'b', 'b')).toBe('cocok');
    expect(tandaOpsi(s, 'b', 'b').label).toEqual([LABEL_PILIHAN_PEMAIN, LABEL_COCOK]);
    expect(keadaanOpsi(s, 'a', 'b')).toBe('polos');
    expect(tandaOpsi(s, 'a', 'b').label).toEqual([]);
    expect(keadaanOpsi(s, 'd', 'b')).toBe('polos');
  });

  it('dikunci dan salah: pemain TAHU mana pilihannya, yang cocok tetap punya tandanya sendiri', () => {
    const s = sesudah([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'd' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
    ]);
    expect(keadaanOpsi(s, 'b', 'b')).toBe('cocok');
    expect(tandaOpsi(s, 'b', 'b').label).toEqual([LABEL_COCOK]);
    expect(keadaanOpsi(s, 'd', 'b')).toBe('keliru');
    // Inti cacat yang ditemukan pemilik: baris ini dulu tidak punya label apa pun.
    expect(tandaOpsi(s, 'd', 'b').label).toEqual([LABEL_PILIHAN_PEMAIN]);
    expect(keadaanOpsi(s, 'a', 'b')).toBe('polos');
    expect(tandaOpsi(s, 'a', 'b').label).toEqual([]);
  });

  it('melihat ulang soal lama: tandanya sama dengan saat dikunci', () => {
    const keadaan = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lihat_balik', nomor: 0 },
    ]).keadaan;
    const s = keadaan.soal['s1'];
    expect(namaLayar(keadaan.layar)).toBe('soal-1');
    expect(keadaanOpsi(s, 'b', 'b')).toBe('cocok');
    expect(tandaOpsi(s, 'b', 'b').label).toEqual([LABEL_PILIHAN_PEMAIN, LABEL_COCOK]);
    expect(keadaanOpsi(s, 'a', 'b')).toBe('polos');
  });

  it('soal yang tidak dikenal tidak pernah menandai apa pun', () => {
    expect(tandaOpsi(undefined, 'b', 'b')).toEqual({ keadaan: 'polos', label: [] });
  });
});

describe('alur — jalan pintas ke ringkasan (A4-T5)', () => {
  /** Jalur terpendek sampai berdiri di layar pembukaan. */
  const diPembukaan = (): Array<Aksi | [Aksi, number]> => [...sampaiTerkunci(), { jenis: 'lanjut' }];

  it('melahirkan loncat_ke_ringkasan dengan lama dan guliran saat itu', () => {
    const { keadaan, peristiwa } = jalankan([
      ...diPembukaan(),
      { jenis: 'catat_gulir', persen: 12 },
      [{ jenis: 'loncat_ke_ringkasan' }, 4_200],
    ]);
    expect(namaLayar(keadaan.layar)).toBe('pembukaan');
    const loncat = peristiwa.filter((p) => p.nama === 'loncat_ke_ringkasan');
    expect(loncat).toHaveLength(1);
    expect(loncat[0]?.isi['gulir_maks_persen']).toBe(12);
    // 100 ms untuk catat_gulir, lalu 4.200 ms sampai loncatan.
    expect(loncat[0]?.isi['ms_di_pembukaan']).toBe(4_300);
  });

  it('TIDAK memindahkan layar: pemain tetap di pembukaan', () => {
    const sebelum = jalankan(diPembukaan()).keadaan;
    const sesudah = jalankan([...diPembukaan(), { jenis: 'loncat_ke_ringkasan' }]).keadaan;
    expect(namaLayar(sesudah.layar)).toBe(namaLayar(sebelum.layar));
    expect(sesudah.layar).toEqual(sebelum.layar);
  });

  it('NEGATIF — diabaikan di luar layar pembukaan: nol peristiwa, keadaan utuh', () => {
    for (const jalur of [
      [MULAI],
      [MULAI, { jenis: 'lanjut' } as Aksi],
      [...sampaiTerkunci()],
    ]) {
      const dasar = jalankan(jalur);
      const hasil = langkah(dasar.keadaan, { jenis: 'loncat_ke_ringkasan' }, 99_999);
      expect(hasil.peristiwa, namaLayar(dasar.keadaan.layar)).toEqual([]);
      expect(hasil.keadaan).toBe(dasar.keadaan);
    }
  });

  it('boleh ditekan lebih dari sekali, dan tiap ketukan tercatat', () => {
    const { peristiwa } = jalankan([
      ...diPembukaan(),
      { jenis: 'loncat_ke_ringkasan' },
      { jenis: 'loncat_ke_ringkasan' },
    ]);
    expect(peristiwa.filter((p) => p.nama === 'loncat_ke_ringkasan')).toHaveLength(2);
  });

  it('tidak mengganggu urutan peristiwa sesudahnya', () => {
    const { peristiwa } = jalankan([
      ...diPembukaan(),
      { jenis: 'loncat_ke_ringkasan' },
      { jenis: 'lanjut' },
    ]);
    expect(namaUrut(peristiwa).slice(-7)).toEqual([
      'pembukaan_masuk',
      'gulir', // meninggalkan soal-3
      'layar_masuk', // layar pembukaan
      'loncat_ke_ringkasan',
      'pembukaan_selesai',
      'gulir', // meninggalkan pembukaan
      'layar_masuk', // layar akhir
    ]);
  });

  it('namanya ada di daftar tertutup D-6', () => {
    expect(NAMA_PERISTIWA).toContain('loncat_ke_ringkasan');
    // 13 nama M3.1 + tiga nama pelacak M3.2 (ketuk, ketuk_dibatasi, gulir)
    // + istilah_buka (A-2) + balon (M3.7 D-2, satu-satunya nama baru sejak).
    expect(NAMA_PERISTIWA).toHaveLength(18);
    expect(NAMA_PERISTIWA).toContain('istilah_buka');
  });
});

describe('alur — tombol kembali peramban (A1-T7)', () => {
  /** Tombol kembali: tujuannya adalah layar tepat sebelum layar kini. */
  const layarSesudahMundur = (aksi: Array<Aksi | [Aksi, number]>) => {
    const sebelum = jalankan(aksi);
    const sebelumnya = layarSebelumnya(sebelum.keadaan);
    const nama = sebelumnya === null ? 'pembuka' : namaLayar(sebelumnya);
    const hasil = langkah(sebelum.keadaan, { jenis: 'riwayat_ke', nama }, 99_000);
    return {
      dari: namaLayar(sebelum.keadaan.layar),
      ke: namaLayar(hasil.keadaan.layar),
      peristiwa: hasil.peristiwa.map((p) => p.nama),
      isi: hasil.peristiwa[0]?.isi,
    };
  };

  it('dari soal-1 kembali ke layar pembuka', () => {
    const h = layarSesudahMundur([MULAI, { jenis: 'lanjut' }]);
    expect(h).toMatchObject({ dari: 'soal-1', ke: 'pembuka' });
    expect(h.peristiwa).toEqual(['lihat_balik', 'gulir', 'layar_masuk']);
    expect(h.isi).toEqual({ dari_layar: 'soal-1', ke_layar: 'pembuka' });
  });

  it('dari soal-2 kembali ke soal-1', () => {
    const h = layarSesudahMundur([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
    ]);
    expect(h).toMatchObject({ dari: 'soal-2', ke: 'soal-1' });
  });

  it('dari layar pembukaan kembali ke soal terakhir', () => {
    const h = layarSesudahMundur([...sampaiTerkunci(), { jenis: 'lanjut' }]);
    expect(h).toMatchObject({ dari: 'pembukaan', ke: 'soal-3' });
  });

  it('dari layar akhir kembali ke layar pembukaan', () => {
    const h = layarSesudahMundur([...sampaiTerkunci(), { jenis: 'lanjut' }, { jenis: 'lanjut' }]);
    expect(h).toMatchObject({ dari: 'akhir', ke: 'pembukaan' });
  });

  it('NEGATIF — dari layar pembuka tidak ke mana-mana, jadi peramban keluar situs', () => {
    const sebelum = jalankan([MULAI]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'riwayat_ke', nama: 'pembuka' }, 99_000);
    expect(hasil.peristiwa).toEqual([]);
    expect(hasil.keadaan).toBe(sebelum.keadaan);
  });

  it('mundur tidak menghapus jawaban yang sudah dikunci', () => {
    const sebelum = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
    ]);
    const hasil = langkah(sebelum.keadaan, { jenis: 'riwayat_ke', nama: 'soal-1' }, 99_000);
    expect(hasil.keadaan.soal['s1']?.dikunci).toBe(true);
    expect(hasil.keadaan.soal['s1']?.kunci).toBe('b');
  });
});

describe('alur — bilah bawah tiga keadaan (D-4, T-04)', () => {
  const soalBaru = (): Parameters<typeof bilahBawah>[0] =>
    jalankan([MULAI, { jenis: 'lanjut' }]).keadaan.soal['s1'];

  it('belum memilih dan opsi BELUM terlihat: tawarkan "↓ Jawab di bawah"', () => {
    const s = soalBaru();
    expect(s?.opsiTerlihat).toBe(false);
    expect(bilahBawah(s, 0, 3)).toEqual({ jenis: 'turun', label: LABEL_TURUN });
  });

  it('belum memilih dan opsi SUDAH terlihat: bilah menyingkir', () => {
    const { keadaan } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'opsi_terlihat', soal_id: 's1', terlihat: true },
    ]);
    expect(bilahBawah(keadaan.soal['s1'], 0, 3)).toEqual({ jenis: 'tidak-ada' });
  });

  it('sudah memilih: "Kunci jawaban" — apa pun keadaan terlihatnya', () => {
    for (const terlihat of [false, true]) {
      const { keadaan } = jalankan([
        MULAI,
        { jenis: 'lanjut' },
        { jenis: 'opsi_terlihat', soal_id: 's1', terlihat },
        { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      ]);
      expect(bilahBawah(keadaan.soal['s1'], 0, 3), String(terlihat)).toEqual({
        jenis: 'kunci',
        label: LABEL_KUNCI,
      });
    }
  });

  it('sesudah dikunci: "Lanjut ke soal n", dan di soal terakhir kalimat lain', () => {
    const { keadaan } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
    ]);
    const s = keadaan.soal['s1'];
    expect(bilahBawah(s, 0, 3)).toEqual({ jenis: 'lanjut', label: 'Lanjut ke soal 2' });
    expect(bilahBawah(s, 1, 3)).toEqual({ jenis: 'lanjut', label: 'Lanjut ke soal 3' });
    expect(bilahBawah(s, 2, 3)).toEqual({
      jenis: 'lanjut',
      label: 'Lihat yang terjadi sesudahnya',
    });
  });

  it('TIDAK PERNAH mengembalikan tindakan utama yang mati (INV-12)', () => {
    // Keempat keadaan: yang tidak punya tindakan masuk akal mengembalikan
    // "tidak-ada", bukan tombol kelabu. Tidak ada medan "mati" sama sekali.
    for (const bilah of [
      bilahBawah(soalBaru(), 0, 3),
      bilahBawah(undefined, 0, 3),
      bilahBawah({ ...soalBaru()!, opsiTerlihat: true }, 0, 3),
      bilahBawah({ ...soalBaru()!, kunci: 'b' }, 0, 3),
      bilahBawah({ ...soalBaru()!, dikunci: true }, 0, 3),
    ]) {
      expect(Object.keys(bilah)).not.toContain('mati');
      if (bilah.jenis !== 'tidak-ada') expect(bilah.label.length).toBeGreaterThan(0);
    }
  });

  it('soal yang tidak dikenal tidak menawarkan apa-apa', () => {
    expect(bilahBawah(undefined, 0, 3)).toEqual({ jenis: 'tidak-ada' });
  });

  it('opsi_terlihat tidak melahirkan peristiwa apa pun (bukan gerakan pemain)', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'opsi_terlihat', soal_id: 's1', terlihat: true },
      { jenis: 'opsi_terlihat', soal_id: 's1', terlihat: false },
    ]);
    expect(namaUrut(peristiwa)).toEqual(['mulai', 'layar_masuk', 'gulir', 'layar_masuk']);
  });

  it('opsi_terlihat dengan nilai yang sama tidak mengubah keadaan', () => {
    const dasar = jalankan([MULAI, { jenis: 'lanjut' }]).keadaan;
    const hasil = langkah(dasar, { jenis: 'opsi_terlihat', soal_id: 's1', terlihat: false }, 9_999);
    expect(hasil.keadaan).toBe(dasar);
  });
});

/* ------------------------------------------------------------------ */
/* Pelacak ketukan dan gulir (D-8, M3.2/T-07)                         */
/* ------------------------------------------------------------------ */

/** Satu ketukan pada `uid`, di tengah layar. */
const ketuk = (uid: string | null, mati = false): Aksi => ({
  jenis: 'ketuk',
  uid,
  x: 0.5,
  y: 0.5,
  mati,
});

describe('alur — ketukan lahir dari reducer (D-8)', () => {
  it('ketukan di opsi: mati false, uid dan layar benar', () => {
    const { peristiwa } = jalankan([MULAI, { jenis: 'lanjut' }, ketuk('opsi:b')]);
    const k = peristiwa.filter((p) => p.nama === 'ketuk');
    expect(k).toHaveLength(1);
    expect(k[0]?.isi).toEqual({ layar: 'soal-1', uid: 'opsi:b', x: 0.5, y: 0.5, mati: false });
  });

  it('ketukan di badan lembar: mati true, tetap membawa uid lembarnya', () => {
    const { peristiwa } = jalankan([MULAI, { jenis: 'lanjut' }, ketuk('lembar:k1', true)]);
    const k = peristiwa.find((p) => p.nama === 'ketuk');
    expect(k?.isi['mati']).toBe(true);
    expect(k?.isi['uid']).toBe('lembar:k1');
  });

  it('ketukan di ruang kosong: uid null, tetap tercatat', () => {
    const { peristiwa } = jalankan([MULAI, ketuk(null, true)]);
    const k = peristiwa.find((p) => p.nama === 'ketuk');
    expect(k?.isi['uid']).toBeNull();
    expect(k?.isi['mati']).toBe(true);
    expect(k?.isi['layar']).toBe('pembuka');
  });

  it('ketukan TIDAK mengubah keadaan permainan, hanya melahirkan peristiwa', () => {
    const sesudahMulai = langkah(keadaanAwal(AWAL), MULAI, 1_000).keadaan;
    const hasil = langkah(sesudahMulai, ketuk('pesan', true), 1_100);
    expect(hasil.peristiwa).toHaveLength(1);
    // Yang boleh berubah hanya pencatatannya sendiri.
    expect({ ...hasil.keadaan, urut: 0, ketukan: 0 }).toEqual({
      ...sesudahMulai,
      urut: 0,
      ketukan: 0,
    });
    expect(hasil.keadaan.layar).toEqual(sesudahMulai.layar);
    expect(hasil.keadaan.soal).toEqual(sesudahMulai.soal);
  });

  it('isi ketukan hanya lima medan — tidak ada tempat untuk teks pemain', () => {
    const { peristiwa } = jalankan([MULAI, ketuk('opsi:a')]);
    const k = peristiwa.find((p) => p.nama === 'ketuk');
    expect(Object.keys(k?.isi ?? {}).sort()).toEqual(['layar', 'mati', 'uid', 'x', 'y']);
  });

  it('koordinat dijepit 0–1 dan dibulatkan tiga desimal', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'ketuk', uid: 'pesan', x: 1.8, y: -0.4, mati: true },
      { jenis: 'ketuk', uid: 'pesan', x: 0.123456, y: 0.9999, mati: true },
    ]);
    const k = peristiwa.filter((p) => p.nama === 'ketuk');
    expect([k[0]?.isi['x'], k[0]?.isi['y']]).toEqual([1, 0]);
    expect([k[1]?.isi['x'], k[1]?.isi['y']]).toEqual([0.123, 1]);
  });

  it('uid lebih panjang dari 64 karakter dipotong, bukan ditolak pengumpul', () => {
    const { peristiwa } = jalankan([MULAI, ketuk(`lembar:${'y'.repeat(120)}`, true)]);
    expect(String(peristiwa.find((p) => p.nama === 'ketuk')?.isi['uid'])).toHaveLength(64);
  });

  it('ketukan sebelum mulai diabaikan seperti aksi lain', () => {
    const hasil = langkah(keadaanAwal(AWAL), ketuk('pesan', true), 1_000);
    expect(hasil.peristiwa).toHaveLength(0);
  });
});

describe('alur — batas 300 ketukan per sesi (D-8)', () => {
  it('ketukan ke-301 melahirkan ketuk_dibatasi, tepat sekali', () => {
    const banyak: Aksi[] = [MULAI, ...Array.from({ length: 305 }, () => ketuk('pesan', true))];
    const { keadaan, peristiwa } = jalankan(banyak);
    expect(peristiwa.filter((p) => p.nama === 'ketuk')).toHaveLength(BATAS_KETUK);
    const dibatasi = peristiwa.filter((p) => p.nama === 'ketuk_dibatasi');
    expect(dibatasi).toHaveLength(1);
    expect(dibatasi[0]?.isi).toEqual({ layar: 'pembuka', batas: BATAS_KETUK });
    expect(keadaan.ketukan).toBe(BATAS_KETUK);
    // Yang ke-301 adalah yang melahirkan peringatan; sesudahnya diam.
    expect(peristiwa[peristiwa.length - 1]?.nama).toBe('ketuk_dibatasi');
  });

  it('ketukan ke-300 masih tercatat penuh', () => {
    const { peristiwa } = jalankan([
      MULAI,
      ...Array.from({ length: BATAS_KETUK }, () => ketuk('pesan', true)),
    ]);
    expect(peristiwa.filter((p) => p.nama === 'ketuk')).toHaveLength(BATAS_KETUK);
    expect(peristiwa.filter((p) => p.nama === 'ketuk_dibatasi')).toHaveLength(0);
  });
});

describe('alur — kedalaman gulir per layar (D-8)', () => {
  it('melahirkan gulir saat meninggalkan layar, dengan angka terjauh 0–1', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 35 },
      { jenis: 'catat_gulir', persen: 72 },
      { jenis: 'catat_gulir', persen: 20 },
      { jenis: 'lanjut' },
    ]);
    // Dua peristiwa: ambang 50% saat 72% dilewati (M3.4a D-1), lalu angka
    // terjauh yang sebenarnya saat layarnya ditinggalkan. Turun ke 20% tidak
    // melahirkan apa pun.
    const g = peristiwa.filter((p) => p.nama === 'gulir');
    expect(g.map((p) => p.isi)).toEqual([
      { layar: 'pembuka', maks: 0.5 },
      { layar: 'pembuka', maks: 0.72 },
    ]);
  });

  it('gulir layar sebelumnya tidak diwariskan ke layar berikutnya', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 90 },
      { jenis: 'lanjut' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
    ]);
    const g = peristiwa.filter((p) => p.nama === 'gulir');
    expect(g.map((p) => [p.isi['layar'], p.isi['maks']])).toEqual([
      ['pembuka', 0.5], // ambang, M3.4a
      ['pembuka', 0.9], // meninggalkan pembuka
      ['soal-1', 0], // soal-1 tidak digulir sama sekali
    ]);
  });

  it('layar terakhir ikut dilaporkan sebelum tutup', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 40 },
      { jenis: 'tutup' },
    ]);
    expect(namaUrut(peristiwa).slice(-2)).toEqual(['gulir', 'tutup']);
    expect(peristiwa[peristiwa.length - 2]?.isi).toEqual({ layar: 'pembuka', maks: 0.4 });
  });

  it('gulir_maks_persen di pembukaan_selesai tetap milik layar pembukaan saja', () => {
    const { peristiwa } = jalankan([
      ...sampaiTerkunci(),
      // Guliran di soal terakhir TIDAK boleh ikut terbaca di pembukaan.
      { jenis: 'catat_gulir', persen: 100 },
      { jenis: 'lanjut' },
      { jenis: 'catat_gulir', persen: 33 },
      { jenis: 'lanjut' },
    ]);
    expect(peristiwa.find((p) => p.nama === 'pembukaan_selesai')?.isi['gulir_maks_persen']).toBe(
      33,
    );
  });
});

describe('alur — penanda tautan dan nomor pengunjung di peristiwa mulai (D-9, D-13)', () => {
  it('membawa ketiganya apa adanya', () => {
    const { peristiwa } = jalankan([
      {
        jenis: 'mulai',
        lebar_layar: 360,
        penanda: 'grup1',
        pengunjung: '11111111-2222-4333-a444-555555555555',
        kunjungan_ke: 2,
      },
    ]);
    expect(peristiwa[0]?.isi).toEqual({
      lebar_layar: 360,
      penanda: 'grup1',
      pengunjung: '11111111-2222-4333-a444-555555555555',
      kunjungan_ke: 2,
    });
  });

  it('medannya tetap ada walau kosong: null, bukan hilang', () => {
    const { peristiwa } = jalankan([MULAI]);
    expect(peristiwa[0]?.isi).toEqual({
      lebar_layar: 375,
      penanda: null,
      pengunjung: null,
      kunjungan_ke: null,
    });
  });
});

/* ------------------------------------------------------------------ */
/* A-2 — yang bisa dibuka harus bisa ditutup                          */
/* ------------------------------------------------------------------ */

describe('alur — kaki lembar adalah sakelar (A-2)', () => {
  const kaki = (fact_id: string, soal_id: string | null = 's1'): Aksi => ({
    jenis: 'sakelar_sumber',
    fact_id,
    soal_id,
  });

  it('buka → tutup → buka, dan keadaannya mengikuti tiap ketukan', () => {
    const langkahnya: Aksi[] = [MULAI, { jenis: 'lanjut' }];
    let keadaan = keadaanAwal(AWAL);
    let waktu = 1_000;
    const jejak: Array<readonly string[]> = [];
    for (const a of [...langkahnya, kaki('k1'), kaki('k1'), kaki('k1')]) {
      waktu += 100;
      keadaan = langkah(keadaan, a, waktu).keadaan;
      jejak.push(keadaan.sumberTerbuka);
    }
    expect(jejak.slice(-3)).toEqual([['k1'], [], ['k1']]);
  });

  it('dua lembar terbuka BERSAMAAN; membuka yang kedua tidak menutup yang pertama', () => {
    // Inilah bug yang ditemukan pemilik: `sumberTerbuka` dulu satu nilai, jadi
    // lembar kedua menggeser isi di bawah jarinya.
    const { keadaan } = jalankan([MULAI, { jenis: 'lanjut' }, kaki('k1'), kaki('k2')]);
    expect([...keadaan.sumberTerbuka].sort()).toEqual(['k1', 'k2']);
  });

  it('menutup salah satu meninggalkan yang lain tetap terbuka', () => {
    const { keadaan } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      kaki('k1'),
      kaki('k2'),
      kaki('k1'),
    ]);
    expect(keadaan.sumberTerbuka).toEqual(['k2']);
  });

  it('kartu_buka dihitung per PEMBUKAAN, bukan per ketukan', () => {
    const { peristiwa, keadaan } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      kaki('k1'), // buka
      kaki('k1'), // tutup — tidak melahirkan peristiwa
      kaki('k1'), // buka lagi
      kaki('k2'), // buka lembar lain
    ]);
    const buka = peristiwa.filter((p) => p.nama === 'kartu_buka');
    expect(buka).toHaveLength(3);
    expect(buka.map((p) => p.isi['fact_id'])).toEqual(['k1', 'k1', 'k2']);
    expect(keadaan.soal['s1']?.kartuDibuka).toBe(3);
  });

  it('ketukan yang MENUTUP tidak melahirkan peristiwa apa pun', () => {
    const sesudahBuka = jalankan([MULAI, { jenis: 'lanjut' }, kaki('k1')]);
    const menutup = langkah(sesudahBuka.keadaan, kaki('k1'), 9_000);
    expect(menutup.peristiwa).toHaveLength(0);
    expect(menutup.keadaan.sumberTerbuka).toEqual([]);
  });

  it('pindah layar mengosongkan lembar yang terbuka', () => {
    const { keadaan } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      kaki('k1'),
      kaki('k2'),
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
    ]);
    expect(keadaan.sumberTerbuka).toEqual([]);
    expect(keadaan.istilahTerbuka).toBe(false);
  });

  it('melihat balik soal lama tidak menemukan lembar yang terlanjur terbentang', () => {
    const { keadaan } = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'lihat_balik', nomor: 0 },
    ]);
    expect(keadaan.sumberTerbuka).toEqual([]);
  });

  it('di luar layar soal, sakelar tetap bekerja tetapi tidak melahirkan kartu_buka', () => {
    const { keadaan, peristiwa } = jalankan([MULAI, kaki('k1', null), kaki('k1', null)]);
    expect(peristiwa.filter((p) => p.nama === 'kartu_buka')).toHaveLength(0);
    expect(keadaan.sumberTerbuka).toEqual([]);
  });
});

describe('alur — baris istilah adalah sakelar (A-2)', () => {
  const istilah = (soal_id = 's1'): Aksi => ({ jenis: 'sakelar_istilah', soal_id });

  it('buka → tutup → buka', () => {
    let keadaan = jalankan([MULAI, { jenis: 'lanjut' }]).keadaan;
    const jejak: boolean[] = [];
    let waktu = 5_000;
    for (let i = 0; i < 3; i += 1) {
      waktu += 100;
      keadaan = langkah(keadaan, istilah(), waktu).keadaan;
      jejak.push(keadaan.istilahTerbuka);
    }
    expect(jejak).toEqual([true, false, true]);
  });

  it('istilah_buka lahir hanya saat membuka', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      istilah(), // buka
      istilah(), // tutup
      istilah(), // buka
    ]);
    const buka = peristiwa.filter((p) => p.nama === 'istilah_buka');
    expect(buka).toHaveLength(2);
    expect(buka[0]?.isi).toEqual({ soal_id: 's1' });
  });

  it('soal yang tidak dikenal tidak mengubah apa pun', () => {
    const sebelum = jalankan([MULAI, { jenis: 'lanjut' }]).keadaan;
    const hasil = langkah(sebelum, istilah('tidak-ada'), 9_000);
    expect(hasil.keadaan).toBe(sebelum);
    expect(hasil.peristiwa).toHaveLength(0);
  });

  it('istilah dan lembar berdiri sendiri-sendiri', () => {
    const { keadaan } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      istilah(),
      { jenis: 'sakelar_sumber', fact_id: 'k1', soal_id: 's1' },
      { jenis: 'sakelar_sumber', fact_id: 'k1', soal_id: 's1' },
    ]);
    // Menutup lembar tidak ikut menutup istilah.
    expect(keadaan.istilahTerbuka).toBe(true);
    expect(keadaan.sumberTerbuka).toEqual([]);
  });
});

/**
 * A-1, cacat C-1: tombol **maju** peramban tidak menggerakkan layar, dan
 * sesudah dipakai tombol kembali pun berhenti bekerja.
 *
 * Sebabnya: `popstate` selalu dianggap mundur. Yang diuji di bawah adalah
 * penggantinya — perpindahan yang membaca **tujuan** dari entri riwayat.
 */
describe('alur — perpindahan lewat tombol peramban (A1-T2, C-1)', () => {
  const diPembukaan = () => jalankan([...sampaiTerkunci(), { jenis: 'lanjut' }]).keadaan;

  describe('layarDariNama — kebalikan namaLayar', () => {
    it('mengenali keempat bentuk nama layar', () => {
      expect(layarDariNama('pembuka', 3)).toEqual({ jenis: 'pembuka' });
      expect(layarDariNama('soal-1', 3)).toEqual({ jenis: 'soal', nomor: 0 });
      expect(layarDariNama('soal-3', 3)).toEqual({ jenis: 'soal', nomor: 2 });
      expect(layarDariNama('pembukaan', 3)).toEqual({ jenis: 'pembukaan' });
      expect(layarDariNama('akhir', 3)).toEqual({ jenis: 'akhir' });
    });

    it('bolak-balik dengan namaLayar untuk tiap layar yang mungkin', () => {
      for (const nama of ['pembuka', 'soal-1', 'soal-2', 'soal-3', 'pembukaan', 'akhir']) {
        const layar = layarDariNama(nama, 3);
        expect(layar).not.toBeNull();
        if (layar !== null) expect(namaLayar(layar)).toBe(nama);
      }
    });

    it('menolak nama yang tidak dikenal atau nomor soal di luar jangkauan', () => {
      for (const rusak of ['', 'soal-0', 'soal-4', 'soal-x', 'soal--1', 'Pembuka', 'akhirr', '{}']) {
        expect(layarDariNama(rusak, 3), rusak).toBeNull();
      }
    });
  });

  describe('pernahSampai — maju tidak boleh menjadi jalan pintas', () => {
    it('layar pertama selalu boleh', () => {
      expect(pernahSampai(jalankan([MULAI]).keadaan, { jenis: 'pembuka' })).toBe(true);
    });

    it('soal-2 belum pernah dicapai kalau soal-1 belum dikunci', () => {
      const k = jalankan([MULAI, { jenis: 'lanjut' }]).keadaan;
      expect(pernahSampai(k, { jenis: 'soal', nomor: 1 })).toBe(false);
    });

    it('soal-2 sudah pernah dicapai begitu soal-1 terkunci', () => {
      const k = jalankan([
        MULAI,
        { jenis: 'lanjut' },
        { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
        { jenis: 'kunci_jawaban', soal_id: 's1' },
      ]).keadaan;
      expect(pernahSampai(k, { jenis: 'soal', nomor: 1 })).toBe(true);
    });

    it('pembukaan dan layar akhir hanya sesudah ketiga soal terkunci', () => {
      const belum = jalankan([MULAI, { jenis: 'lanjut' }]).keadaan;
      expect(pernahSampai(belum, { jenis: 'pembukaan' })).toBe(false);
      expect(pernahSampai(belum, { jenis: 'akhir' })).toBe(false);
      const sudah = jalankan(sampaiTerkunci()).keadaan;
      expect(pernahSampai(sudah, { jenis: 'pembukaan' })).toBe(true);
      expect(pernahSampai(sudah, { jenis: 'akhir' })).toBe(true);
    });
  });

  describe('tujuanRiwayat — satu penilai untuk reducer dan komponen', () => {
    it('mundur selalu sah', () => {
      expect(tujuanRiwayat(diPembukaan(), 'soal-1')).toEqual({ jenis: 'soal', nomor: 0 });
    });

    it('maju ke layar yang pernah dicapai: sah', () => {
      const k = jalankan([...sampaiTerkunci(), { jenis: 'lanjut' }]).keadaan;
      const mundur = langkah(k, { jenis: 'riwayat_ke', nama: 'soal-1' }, 50_000).keadaan;
      expect(tujuanRiwayat(mundur, 'soal-3')).toEqual({ jenis: 'soal', nomor: 2 });
    });

    it('maju ke layar yang BELUM pernah dicapai: ditolak', () => {
      const k = jalankan([MULAI, { jenis: 'lanjut' }]).keadaan;
      expect(tujuanRiwayat(k, 'soal-3')).toBeNull();
      expect(tujuanRiwayat(k, 'pembukaan')).toBeNull();
      expect(tujuanRiwayat(k, 'akhir')).toBeNull();
    });

    it('nama rusak ditolak, tanpa melempar', () => {
      const k = jalankan([MULAI]).keadaan;
      for (const rusak of ['', 'soal-9', 'entah', '../../']) {
        expect(() => tujuanRiwayat(k, rusak)).not.toThrow();
        expect(tujuanRiwayat(k, rusak), rusak).toBeNull();
      }
    });
  });

  describe('peristiwa yang lahir', () => {
    const sesudah = (keadaan: Keadaan, nama: string) =>
      langkah(keadaan, { jenis: 'riwayat_ke', nama }, 90_000);

    it('MUNDUR melahirkan peristiwa yang persis sama dengan sebelum A-1', () => {
      const h = sesudah(diPembukaan(), 'soal-3');
      expect(h.peristiwa.map((p) => p.nama)).toEqual(['lihat_balik', 'gulir', 'layar_masuk']);
      expect(h.peristiwa[0]?.isi).toEqual({ dari_layar: 'pembukaan', ke_layar: 'soal-3' });
      expect(namaLayar(h.keadaan.layar)).toBe('soal-3');
    });

    it('MAJU melahirkan HANYA layar_masuk — tanpa nama peristiwa baru', () => {
      const mundur = sesudah(diPembukaan(), 'soal-3').keadaan;
      const maju = sesudah(mundur, 'pembukaan');
      expect(maju.peristiwa.map((p) => p.nama)).toEqual(['layar_masuk']);
      expect(maju.peristiwa[0]?.isi).toEqual({ layar: 'pembukaan' });
      expect(namaLayar(maju.keadaan.layar)).toBe('pembukaan');
    });

    it('tiap nama yang lahir tetap ada di daftar tertutup D-6', () => {
      const mundur = sesudah(diPembukaan(), 'soal-3');
      const maju = sesudah(mundur.keadaan, 'pembukaan');
      for (const p of [...mundur.peristiwa, ...maju.peristiwa]) {
        expect(NAMA_PERISTIWA).toContain(p.nama);
      }
      // 17 sampai M3.6; + `balon` di M3.7 D-2.
      expect(NAMA_PERISTIWA).toHaveLength(18);
    });

    it('maju TIDAK mengubah jawaban yang sudah dikunci', () => {
      const mundur = sesudah(diPembukaan(), 'soal-1').keadaan;
      const maju = sesudah(mundur, 'soal-2').keadaan;
      for (const id of ['s1', 's2', 's3']) {
        expect(maju.soal[id]?.dikunci, id).toBe(true);
      }
      expect(maju.soal['s1']?.kunci).toBe('b');
    });

    it('maju yang ditolak tidak mengubah keadaan sama sekali', () => {
      const k = jalankan([MULAI, { jenis: 'lanjut' }]).keadaan;
      const h = sesudah(k, 'pembukaan');
      expect(h.peristiwa).toEqual([]);
      expect(h.keadaan).toBe(k);
    });

    it('pindah ke layar yang sedang dibuka tidak melahirkan apa pun', () => {
      const k = jalankan([MULAI, { jenis: 'lanjut' }]).keadaan;
      const h = sesudah(k, 'soal-1');
      expect(h.peristiwa).toEqual([]);
      expect(h.keadaan).toBe(k);
    });
  });
});

/* ------------------------------------------------------------------ */
/* M3.4a — gulir ambang: KAPAN 50% dan 100% dilewati (D-1)             */
/* ------------------------------------------------------------------ */

/** `gulir` saja, sebagai pasangan [layar, maks], urut lahirnya. */
const gulirUrut = (peristiwa: Peristiwa[]): Array<[unknown, unknown]> =>
  peristiwa.filter((p) => p.nama === 'gulir').map((p) => [p.isi['layar'], p.isi['maks']]);

describe('alur — gulir ambang 50% dan 100% (M3.4a D-1)', () => {
  it('melahirkan 50% lalu 100% masing-masing tepat sekali, dalam satu kunjungan', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 20 },
      { jenis: 'catat_gulir', persen: 50 },
      { jenis: 'catat_gulir', persen: 60 },
      { jenis: 'catat_gulir', persen: 100 },
    ]);
    expect(gulirUrut(peristiwa)).toEqual([
      ['pembuka', 0.5],
      ['pembuka', 1],
    ]);
  });

  it('50% lahir tepat di 50, bukan sesudahnya', () => {
    const { peristiwa } = jalankan([MULAI, { jenis: 'catat_gulir', persen: 50 }]);
    expect(gulirUrut(peristiwa)).toEqual([['pembuka', 0.5]]);
  });

  it('49% belum melahirkan apa pun', () => {
    const { peristiwa } = jalankan([MULAI, { jenis: 'catat_gulir', persen: 49 }]);
    expect(gulirUrut(peristiwa)).toEqual([]);
  });

  it('lompatan langsung dari 0 ke 100 tetap melahirkan KEDUANYA, 50% lebih dulu', () => {
    const { peristiwa } = jalankan([MULAI, { jenis: 'catat_gulir', persen: 100 }]);
    expect(gulirUrut(peristiwa)).toEqual([
      ['pembuka', 0.5],
      ['pembuka', 1],
    ]);
    // Keduanya lahir dari satu pemanggilan reducer, jadi `t_ms`-nya sama;
    // yang membedakan urutannya adalah `urut`, dan itu yang dibaca peringkas.
    const g = peristiwa.filter((p) => p.nama === 'gulir');
    expect(g[1]?.urut).toBe((g[0]?.urut ?? 0) + 1);
  });

  it('naik–turun–naik tidak melahirkan ambang yang sama dua kali', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 80 },
      { jenis: 'catat_gulir', persen: 10 },
      { jenis: 'catat_gulir', persen: 55 },
      { jenis: 'catat_gulir', persen: 5 },
      { jenis: 'catat_gulir', persen: 90 },
    ]);
    expect(gulirUrut(peristiwa)).toEqual([['pembuka', 0.5]]);
  });

  it('100% yang sudah dilaporkan tidak lahir lagi walau dilapor ulang', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 100 },
      { jenis: 'catat_gulir', persen: 100 },
      { jenis: 'catat_gulir', persen: 30 },
      { jenis: 'catat_gulir', persen: 100 },
    ]);
    expect(gulirUrut(peristiwa).filter(([, m]) => m === 1)).toHaveLength(1);
  });

  it('pindah layar mengulang hitungan: tiap kunjungan punya 50% sendiri', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 70 },
      { jenis: 'lanjut' }, // ke soal-1
      { jenis: 'catat_gulir', persen: 70 },
    ]);
    expect(gulirUrut(peristiwa)).toEqual([
      ['pembuka', 0.5], // ambang di pembuka
      ['pembuka', 0.7], // meninggalkan pembuka
      ['soal-1', 0.5], // ambang di soal-1, hitungan mulai dari nol lagi
    ]);
  });

  it('kunjungan KEDUA ke layar yang sama melahirkan ambangnya lagi', () => {
    const { peristiwa } = jalankan([
      ...sampaiTerkunci(),
      { jenis: 'catat_gulir', persen: 100 }, // di soal-3, kunjungan pertama
      { jenis: 'lihat_balik', nomor: 0 },
      { jenis: 'lihat_balik', nomor: 2 }, // kembali ke soal-3
      { jenis: 'catat_gulir', persen: 100 },
    ]);
    const soal3 = gulirUrut(peristiwa).filter(([l]) => l === 'soal-3');
    expect(soal3).toEqual([
      ['soal-3', 0.5], // ambang, kunjungan 1
      ['soal-3', 1], // ambang, kunjungan 1
      ['soal-3', 1], // meninggalkan soal-3
      ['soal-3', 0.5], // ambang, kunjungan 2 — lahir lagi
      ['soal-3', 1],
    ]);
  });

  it('layar yang muat satu jendela: kedua ambang lahir tepat sesudah layar_masuk', () => {
    /*
     * Pelapor di komponen menghitung `tinggi <= 0` sebagai 100%, dan ia melapor
     * sekali tiap ganti layar. Jadi "layar muat sejendela" sampai ke reducer
     * sebagai `catat_gulir 100` segera sesudah masuk — dan itu yang ditiru di
     * sini, dengan maju waktu nol. "100% pada detik 0" harus terbaca sebagai
     * TIDAK PERLU MENGGULIR, bukan sebagai membaca.
     */
    const { peristiwa } = jalankan([
      MULAI,
      [{ jenis: 'catat_gulir', persen: 100 }, 0],
      { jenis: 'lanjut' },
      [{ jenis: 'catat_gulir', persen: 100 }, 0],
    ]);
    expect(namaUrut(peristiwa)).toEqual([
      'mulai',
      'layar_masuk', // pembuka
      'gulir', // 50% — pada t_ms yang sama dengan layar_masuk
      'gulir', // 100%
      'gulir', // meninggalkan pembuka
      'layar_masuk', // soal-1
      'gulir', // 50%
      'gulir', // 100%
    ]);
    const masukPembuka = peristiwa[1];
    for (const g of peristiwa.slice(2, 4)) expect(g.t_ms).toBe(masukPembuka?.t_ms);
  });

  it('paling banyak DUA peristiwa ambang per kunjungan layar', () => {
    const langkahGulir: Aksi[] = [];
    for (let p = 1; p <= 100; p += 1) langkahGulir.push({ jenis: 'catat_gulir', persen: p });
    const { peristiwa } = jalankan([MULAI, ...langkahGulir]);
    expect(peristiwa.filter((p) => p.nama === 'gulir')).toHaveLength(2);
  });

  it('bentuk medannya tetap { layar, maks } — tanpa medan baru (D-2)', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 100 },
      { jenis: 'lanjut' },
    ]);
    for (const g of peristiwa.filter((p) => p.nama === 'gulir')) {
      expect(Object.keys(g.isi).sort()).toEqual(['layar', 'maks']);
    }
  });

  it('`urut` tetap satu deret tanpa lubang dan tanpa kembaran', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 55 },
      { jenis: 'lanjut' },
      { jenis: 'catat_gulir', persen: 100 },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
      { jenis: 'catat_gulir', persen: 100 },
      { jenis: 'tutup' },
    ]);
    expect(peristiwa.map((p) => p.urut)).toEqual(peristiwa.map((_, nomor) => nomor + 1));
  });

  it('ambang tidak memakai kuota 300 ketukan (D-4)', () => {
    const langkahGulir: Aksi[] = [];
    for (let p = 10; p <= 100; p += 10) langkahGulir.push({ jenis: 'catat_gulir', persen: p });
    const { keadaan } = jalankan([MULAI, ...langkahGulir]);
    expect(keadaan.ketukan).toBe(0);
    expect(keadaan.ketukDibatasi).toBe(false);
    expect(BATAS_KETUK).toBe(300);
  });

  it('tidak menambah satu pun nama ke daftar tertutup D-6', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'catat_gulir', persen: 100 },
      { jenis: 'lanjut' },
      { jenis: 'catat_gulir', persen: 100 },
      { jenis: 'tutup' },
    ]);
    for (const p of peristiwa) {
      expect(NAMA_PERISTIWA as readonly string[]).toContain(p.nama);
    }
  });

  it('reducer tetap murni: keadaan yang diberikan tidak berubah', () => {
    const sebelum = jalankan([MULAI]).keadaan;
    const salinan = JSON.stringify(sebelum);
    langkah(sebelum, { jenis: 'catat_gulir', persen: 100 }, 9_999);
    expect(JSON.stringify(sebelum)).toBe(salinan);
  });
});

/* ------------------------------------------------------------------ */
/* Balon chat melayang (M3.7 D-2)                                      */
/* ------------------------------------------------------------------ */

/**
 * Daftar nama peristiwa seperti yang berlaku di M3.6, disalin apa adanya.
 *
 * Ia ditulis ulang di sini **dengan sengaja**: satu-satunya cara membuktikan
 * "daftarnya bertambah tepat satu" adalah membandingkan dengan daftar yang
 * dibekukan, bukan dengan daftar yang ikut berubah kalau kodenya berubah.
 * Kontrak M3.7 mengizinkan tepat satu nama baru (`balon`), dan pengumpul di
 * server sungguhan menolak **seluruh kelompok** kiriman dengan 400 kalau ada
 * satu nama tak dikenal di dalamnya — jadi nama kedua yang lolos diam-diam
 * menghapus data sesi orang, bukan sekadar menambah satu kolom.
 */
const NAMA_M36: readonly string[] = [
  'mulai',
  'layar_masuk',
  'kartu_buka',
  'istilah_buka',
  'kembali_ke_kartu',
  'pilih',
  'kunci_jawaban',
  'lihat_balik',
  'pembukaan_masuk',
  'loncat_ke_ringkasan',
  'pembukaan_selesai',
  'minat_kasus_lain',
  'akhir_kirim',
  'ketuk',
  'ketuk_dibatasi',
  'gulir',
  'tutup',
];

/** Sampai layar soal 1, tempat balon melayang hidup. */
const KE_SOAL_1: Array<Aksi | [Aksi, number]> = [MULAI, { jenis: 'lanjut' }];

describe('alur — daftar nama peristiwa (M3.7)', () => {
  it('bertambah TEPAT SATU nama (`balon`) dibanding M3.6, tanpa ada yang hilang', () => {
    const tambahan = (NAMA_PERISTIWA as readonly string[]).filter((n) => !NAMA_M36.includes(n));
    const hilang = NAMA_M36.filter((n) => !(NAMA_PERISTIWA as readonly string[]).includes(n));
    expect(tambahan).toEqual(['balon']);
    expect(hilang).toEqual([]);
    expect(NAMA_PERISTIWA).toHaveLength(NAMA_M36.length + 1);
  });
});

describe('alur — keadaan balon melayang hidup di reducer (M3.7 D-2)', () => {
  it('keadaan bawaannya mengintip, per layar', () => {
    const { keadaan } = jalankan(KE_SOAL_1);
    expect(keadaanBalon(keadaan, 'soal-1')).toBe('intip');
    expect(keadaan.balon).toEqual({});
  });

  it('turun lewat ketuk melahirkan satu peristiwa `balon` dan mengubah keadaan', () => {
    const { keadaan, peristiwa } = jalankan([
      ...KE_SOAL_1,
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' },
    ]);
    expect(keadaanBalon(keadaan, 'soal-1')).toBe('turun');
    const balon = peristiwa.filter((p) => p.nama === 'balon');
    expect(balon).toHaveLength(1);
    expect(balon[0]?.isi).toEqual({ layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' });
  });

  it('bentuk medannya persis { layar, keadaan, cara } — tidak lebih', () => {
    const { peristiwa } = jalankan([
      ...KE_SOAL_1,
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'tarik' },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'intip', cara: 'tarik' },
    ]);
    for (const p of peristiwa.filter((x) => x.nama === 'balon')) {
      expect(Object.keys(p.isi).sort()).toEqual(['cara', 'keadaan', 'layar']);
    }
  });

  it('tarik yang berakhir di keadaan yang sama tidak melahirkan peristiwa', () => {
    const { keadaan, peristiwa } = jalankan([
      ...KE_SOAL_1,
      // Sudah mengintip; tarikan yang jatuh kembali ke mengintip bukan perubahan.
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'intip', cara: 'tarik' },
    ]);
    expect(peristiwa.filter((p) => p.nama === 'balon')).toHaveLength(0);
    expect(keadaanBalon(keadaan, 'soal-1')).toBe('intip');
  });

  it('peristiwa lahir per perubahan keadaan, bukan per gerakan jari', () => {
    const { peristiwa } = jalankan([
      ...KE_SOAL_1,
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'tarik' },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'tarik' },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'intip', cara: 'ketuk' },
    ]);
    expect(
      peristiwa.filter((p) => p.nama === 'balon').map((p) => [p.isi.keadaan, p.isi.cara]),
    ).toEqual([
      ['turun', 'tarik'],
      ['intip', 'ketuk'],
    ]);
  });

  it('keadaannya milik layar masing-masing', () => {
    const { keadaan } = jalankan([
      ...KE_SOAL_1,
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
    ]);
    expect(keadaanBalon(keadaan, 'soal-1')).toBe('turun');
    expect(keadaanBalon(keadaan, 'soal-2')).toBe('intip');
  });

  it('salinan yang tidak lagi melayang kembali mengintip, tanpa peristiwa', () => {
    const { keadaan, peristiwa } = jalankan([
      ...KE_SOAL_1,
      { jenis: 'balon_melayang', layar: 'soal-1', melayang: true },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' },
      { jenis: 'balon_melayang', layar: 'soal-1', melayang: false },
    ]);
    expect(keadaanBalon(keadaan, 'soal-1')).toBe('intip');
    expect(keadaan.balonMelayang['soal-1'] ?? false).toBe(false);
    // Satu peristiwa saja: yang dari ketukan. Melayang atau tidak bukan gerakan pemain.
    expect(peristiwa.filter((p) => p.nama === 'balon')).toHaveLength(1);
  });

  it('`balon_melayang` tidak pernah melahirkan peristiwa apa pun', () => {
    const { peristiwa } = jalankan([
      ...KE_SOAL_1,
      { jenis: 'balon_melayang', layar: 'soal-1', melayang: true },
      { jenis: 'balon_melayang', layar: 'soal-1', melayang: false },
      { jenis: 'balon_melayang', layar: 'soal-1', melayang: true },
    ]);
    expect(peristiwa.filter((p) => p.nama === 'balon')).toHaveLength(0);
  });
});

describe('alur — batas 40 peristiwa balon per sesi (M3.7 D-2)', () => {
  it('berhenti mencatat di 40, tanpa peristiwa "dibatasi" apa pun', () => {
    const goyang: Aksi[] = [];
    for (let n = 0; n < 60; n += 1) {
      goyang.push({
        jenis: 'sakelar_balon',
        layar: 'soal-1',
        keadaan: n % 2 === 0 ? 'turun' : 'intip',
        cara: 'ketuk',
      });
    }
    const { keadaan, peristiwa } = jalankan([...KE_SOAL_1, ...goyang]);
    expect(BATAS_BALON).toBe(40);
    expect(peristiwa.filter((p) => p.nama === 'balon')).toHaveLength(BATAS_BALON);
    expect(peristiwa.filter((p) => p.nama === 'ketuk_dibatasi')).toHaveLength(0);
    // Yang berhenti hanyalah pencatatannya: balonnya sendiri tetap bergerak.
    expect(keadaanBalon(keadaan, 'soal-1')).toBe('intip');
    expect(keadaan.balonDicatat).toBe(BATAS_BALON);
  });

  it('tidak memakai kuota 300 ketukan', () => {
    const { keadaan } = jalankan([
      ...KE_SOAL_1,
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'intip', cara: 'tarik' },
    ]);
    expect(keadaan.ketukan).toBe(0);
    expect(keadaan.ketukDibatasi).toBe(false);
  });

  it('`urut` tetap satu deret bersama peristiwa lain', () => {
    const { peristiwa } = jalankan([
      ...KE_SOAL_1,
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'intip', cara: 'tarik' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'tutup' },
    ]);
    expect(peristiwa.map((p) => p.urut)).toEqual(peristiwa.map((_, nomor) => nomor + 1));
  });
});
