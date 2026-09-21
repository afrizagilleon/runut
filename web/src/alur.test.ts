import { describe, expect, it } from 'vitest';
import {
  type Aksi,
  type Keadaan,
  type Peristiwa,
  keadaanAwal,
  langkah,
  namaLayar,
  semuaTerkunci,
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

    expect(namaUrut(peristiwa)).toEqual([
      'mulai',
      'layar_masuk', // pembuka
      'layar_masuk', // soal-1
      'pilih',
      'kunci_jawaban',
      'layar_masuk', // soal-2
      'pilih',
      'kunci_jawaban',
      'layar_masuk', // soal-3
      'pilih',
      'kunci_jawaban',
      'pembukaan_masuk',
      'layar_masuk', // pembukaan
      'pembukaan_selesai',
      'layar_masuk', // akhir
      'akhir_kirim',
      'minat_kasus_lain',
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

describe('alur — kartu (D-4, D-6)', () => {
  it('menghitung kartu_dibuka_sebelum hanya dari pembukaan sebelum penguncian', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'buka_kartu', soal_id: 's1', fact_id: 'k1' },
      { jenis: 'buka_kartu', soal_id: 's1', fact_id: 'k2' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      // Dibuka lagi SESUDAH dikunci: tidak boleh ikut terhitung.
      { jenis: 'buka_kartu', soal_id: 's1', fact_id: 'k1' },
      { jenis: 'buka_kartu', soal_id: 's1', fact_id: 'k2' },
    ]);
    const kunci = peristiwa.find((p) => p.nama === 'kunci_jawaban');
    expect(kunci?.isi['kartu_dibuka_sebelum']).toBe(2);
  });

  it('membekukan kartuDibukaSebelumKunci saat penguncian, sementara kartuDibuka terus jalan', () => {
    const { keadaan } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'buka_kartu', soal_id: 's1', fact_id: 'k1' },
      { jenis: 'buka_kartu', soal_id: 's1', fact_id: 'k2' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'buka_kartu', soal_id: 's1', fact_id: 'k1' },
      { jenis: 'buka_kartu', soal_id: 's1', fact_id: 'k2' },
    ]);
    expect(keadaan.soal['s1']?.kartuDibukaSebelumKunci).toBe(2);
    expect(keadaan.soal['s1']?.kartuDibuka).toBe(4);
  });

  it('mencatat nol kartu dibuka untuk pemain yang menjawab tanpa membuka kartu', () => {
    const { peristiwa } = jalankan(sampaiTerkunci());
    for (const p of peristiwa.filter((e) => e.nama === 'kunci_jawaban')) {
      expect(p.isi['kartu_dibuka_sebelum']).toBe(0);
    }
  });

  it('mencatat kartu_buka saat panel sumber dibuka dari sebuah kartu', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'buka_sumber', fact_id: 'k1', soal_id: 's1' },
    ]);
    const buka = peristiwa.find((p) => p.nama === 'kartu_buka');
    expect(buka?.isi).toEqual({ soal_id: 's1', fact_id: 'k1' });
  });

  it('tidak mencatat kartu_buka untuk panel sumber di luar layar soal', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'buka_sumber', fact_id: 'k1', soal_id: null },
    ]);
    expect(peristiwa.filter((p) => p.nama === 'kartu_buka')).toHaveLength(0);
  });

  it('"Lihat kartu lagi" mencatat satu kartu_buka per kartu soal itu', () => {
    const { peristiwa } = jalankan([
      MULAI,
      { jenis: 'lanjut' },
      { jenis: 'lihat_kartu_lagi', soal_id: 's1' },
    ]);
    const buka = peristiwa.filter((p) => p.nama === 'kartu_buka');
    expect(buka.map((p) => p.isi['fact_id'])).toEqual(['k1', 'k2']);
  });

  it('melipat kartu mengubah keadaan di reducer tanpa melahirkan peristiwa', () => {
    const sebelum = jalankan([MULAI, { jenis: 'lanjut' }]);
    const hasil = langkah(
      sebelum.keadaan,
      { jenis: 'lipat_kartu', soal_id: 's1', fact_id: 'k1' },
      9_999,
    );
    expect(hasil.peristiwa).toEqual([]);
    expect(hasil.keadaan.soal['s1']?.terlipat['k1']).toBe(true);
    // Membukanya lagi melahirkan peristiwa dan membatalkan lipatan.
    const dibuka = langkah(
      hasil.keadaan,
      { jenis: 'buka_kartu', soal_id: 's1', fact_id: 'k1' },
      10_000,
    );
    expect(namaUrut(dibuka.peristiwa)).toEqual(['kartu_buka']);
    expect(dibuka.keadaan.soal['s1']?.terlipat['k1']).toBe(false);
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
    // Sesudah lihat_balik, layar_masuk soal-1 juga tercatat.
    expect(namaUrut(peristiwa).slice(-2)).toEqual(['lihat_balik', 'layar_masuk']);
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
      { jenis: 'buka_kartu', soal_id: 's2', fact_id: 'k3' },
      { jenis: 'tutup' },
    ]);
    expect(namaUrut(peristiwa)).toEqual([
      'mulai',
      'layar_masuk',
      'layar_masuk',
      'pilih',
      'kunci_jawaban',
      'layar_masuk',
      'kartu_buka',
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
