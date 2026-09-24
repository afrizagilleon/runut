import { describe, expect, it } from 'vitest';
import type { Fakta } from '../../factory/skema/tipe.ts';
import {
  CATATAN_SAMARAN,
  PINTU_HITUNG,
  PINTU_SUMBER,
  SAMARAN,
  isiSumber,
  namaAsal,
  namaFakta,
  samarkan,
} from './sumber.ts';

/**
 * Identitas emiten yang dipakai seluruh berkas ini. Tes lama memanggil
 * `isiSumber` dengan dua argumen; sejak A-1 identitas dan bendera "sudah
 * dibuka" wajib disebut, jadi tes lama memakai `DIBUKA` — perilakunya sama
 * persis dengan sebelum amandemen.
 */
const EMITEN = { simbol: 'DADA', nama: 'PT Diamond Citra Propertindo Tbk' };
const DIBUKA = true;
const DISAMARKAN = false;

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

describe('isiSumber — apa yang tampil saat sebuah fakta dibuka (D-5)', () => {
  const resmi = (): Fakta =>
    buat({
      fact_id: 'div-2025-09-16',
      klaim: 'Dividen tunai Rp0,14 per lembar dengan tanggal ex 16 September 2025.',
      tersedia_sejak: '2025-09-16',
      sumber: {
        jenis: 'api',
        endpoint: '/v2/corporate-actions/',
        berkas: null,
        parameter: { simbol: 'DADA' },
        diambil_pada: null,
        keterangan: null,
      },
    });

  const hitungan = (): Fakta =>
    buat({
      fact_id: 'andai-10-lot-dividen',
      klaim: 'Pengandaian: 1.000 lembar menerima Rp140 dividen tunai.',
      tersedia_sejak: '2025-09-16',
      turunan_dari: ['div-2025-09-16'],
      sumber: {
        jenis: 'turunan',
        endpoint: null,
        berkas: null,
        parameter: {},
        diambil_pada: null,
        keterangan: 'pengandaian 10 lot dikali dividen per lembar yang diumumkan 16 September 2025',
      },
    });

  it('sumber resmi: pintunya "Buka dokumennya", tanpa cara menghitung', () => {
    expect(PINTU_SUMBER).toBe('Buka dokumennya');
    const isi = isiSumber(resmi(), petakan([resmi()]), EMITEN, DIBUKA);
    expect(isi.pintu).toBe(PINTU_SUMBER);
    expect(isi.caraHitung).toBeNull();
    expect(isi.dihitungDari).toEqual([]);
  });

  it('hitungan: pintunya "Lihat hitungannya", dengan cara menghitung', () => {
    expect(PINTU_HITUNG).toBe('Lihat hitungannya');
    const isi = isiSumber(hitungan(), petakan([hitungan(), resmi()]), EMITEN, DIBUKA);
    expect(isi.pintu).toBe(PINTU_HITUNG);
    expect(isi.caraHitung).toContain('pengandaian 10 lot');
  });

  it('tanggal ditulis dalam bahasa orang, bukan ISO', () => {
    const isi = isiSumber(resmi(), petakan([resmi()]), EMITEN, DIBUKA);
    expect(isi.sejakKapan).toBe('Sudah bisa dibaca publik sejak 16 September 2025.');
    expect(isi.sejakKapan).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('fakta tanpa tanggal tidak berbohong, ia mengatakan tidak tahu', () => {
    const isi = isiSumber(buat({ fact_id: 'x', tersedia_sejak: null }), petakan([]), EMITEN, DIBUKA);
    expect(isi.sejakKapan).toContain('tidak bisa ditentukan dari data');
  });

  it('"Dihitung dari" memakai nama orang, bukan kode fakta', () => {
    const asal = buat({
      fact_id: 'div-2025-09-16',
      awam: { kepala: 'Pengumuman dividen · ex 16 Sep 2025', isi: '' },
    });
    const isi = isiSumber(hitungan(), petakan([hitungan(), asal]), EMITEN, DIBUKA);
    expect(isi.dihitungDari).toEqual(['Pengumuman dividen · ex 16 Sep 2025']);
  });

  it('kosakata pabrik HANYA di rincian teknis, tidak di permukaan', () => {
    const isi = isiSumber(resmi(), petakan([resmi()]), EMITEN, DIBUKA);
    const permukaan = [isi.kalimatResmi, isi.caraHitung ?? '', isi.sejakKapan, ...isi.dihitungDari].join(' ');
    for (const bocor of ['div-2025-09-16', '/v2/corporate-actions/', 'api', 'TERVERIFIKASI']) {
      expect(permukaan, bocor).not.toContain(bocor);
    }
    const label = isi.rincian.map((b) => b.label);
    expect(label).toContain('Kode fakta');
    expect(label).toContain('Endpoint');
    expect(isi.rincian.find((b) => b.label === 'Kode fakta')?.nilai).toBe('div-2025-09-16');
  });

  it('kode fakta asal ikut ke rincian teknis, bukan hilang', () => {
    const isi = isiSumber(hitungan(), petakan([hitungan(), resmi()]), EMITEN, DIBUKA);
    expect(isi.rincian.find((b) => b.label === 'Kode fakta asal')?.nilai).toBe('div-2025-09-16');
  });
});

/**
 * A-1, cacat C-3: kode saham terbaca di layar soal, dua ketukan dari kartu mana
 * pun — "Lihat sumbernya ›" lalu "Rincian teknis". Di berkas kasus DADA, kode
 * sahamnya muncul 44 kali di `sumber.parameter` dan 10 kali di `sumber.endpoint`,
 * dan `IsiLembarTerbuka` merender `rincian` apa adanya.
 *
 * Yang dijaga di bawah bukan "ada penyamaran", melainkan **tiap medan** dan
 * **tiap cara identitas itu bisa tertulis** — karena yang bocor kemarin justru
 * medan yang tidak terpikirkan.
 */
describe('samarkan — tiap variasi penulisan identitas', () => {
  const emiten = { simbol: 'DADA', nama: 'PT Diamond Citra Propertindo Tbk' };

  it('mengganti kode saham yang berdiri sendiri', () => {
    expect(samarkan('Parameter symbol DADA', emiten)).toBe(`Parameter symbol ${SAMARAN}`);
  });

  it('mengganti kode saham di dalam jalur endpoint', () => {
    expect(samarkan('/v2/company/corporate-actions/DADA/', emiten)).toBe(
      `/v2/company/corporate-actions/${SAMARAN}/`,
    );
  });

  it('mengganti varian .JK utuh, bukan menyisakan ".JK"', () => {
    const hasil = samarkan('simbol=DADA.JK&x=1', emiten);
    expect(hasil).toBe(`simbol=${SAMARAN}&x=1`);
    expect(hasil).not.toContain('.JK');
  });

  it('tidak peduli huruf besar-kecil', () => {
    expect(samarkan('dada / Dada / DaDa', emiten)).toBe(`${SAMARAN} / ${SAMARAN} / ${SAMARAN}`);
  });

  it('mengganti nama emiten, bukan hanya kodenya', () => {
    expect(samarkan('Diumumkan PT Diamond Citra Propertindo Tbk.', emiten)).toBe(
      `Diumumkan ${SAMARAN}.`,
    );
  });

  it('TIDAK menyamarkan kode yang hanya kebetulan menjadi bagian kata lain', () => {
    // "pada" memuat "ada", dan "DADAP" memuat "DADA": keduanya kata lain.
    expect(samarkan('pada DADAP sore', { simbol: 'DADA', nama: 'X Y Z' })).toBe('pada DADAP sore');
  });

  it('mengganti semua kemunculan, bukan yang pertama saja', () => {
    expect(samarkan('DADA lalu DADA lagi', emiten)).toBe(`${SAMARAN} lalu ${SAMARAN} lagi`);
  });

  it('membiarkan teks yang memang tidak memuat identitas', () => {
    expect(samarkan('Harga penutupan Rp178 per lembar.', emiten)).toBe(
      'Harga penutupan Rp178 per lembar.',
    );
  });
});

describe('isiSumber — identitas disamarkan sampai kasus selesai (A-1, C-3)', () => {
  const emiten = { simbol: 'DADA', nama: 'PT Diamond Citra Propertindo Tbk' };

  const bocor = (): Fakta =>
    buat({
      fact_id: 'susp-DADA-2025-06-30',
      klaim: 'Bursa menghentikan sementara perdagangan PT Diamond Citra Propertindo Tbk.',
      turunan_dari: ['harga-DADA-2025-08-01'],
      sumber: {
        jenis: 'api',
        endpoint: '/v2/company/corporate-actions/DADA/',
        berkas: 'idx/DADA-2025-06-30.pdf',
        parameter: { symbol: 'DADA.JK', papan: 'Pengembangan' },
        diambil_pada: '2025-10-08T03:00:00Z',
        keterangan: null,
      },
    });

  const hitunganBocor = (): Fakta =>
    buat({
      ...bocor(),
      fact_id: 'turunan-DADA',
      sumber: {
        ...bocor().sumber,
        jenis: 'turunan',
        keterangan: 'harga DADA 8 Oktober dibagi harga DADA 1 Agustus',
      },
    });

  /** Semua teks yang dikembalikan `isiSumber`, digabung. */
  const semuaTeks = (isi: ReturnType<typeof isiSumber>): string =>
    [
      isi.kalimatResmi,
      isi.caraHitung ?? '',
      isi.sejakKapan,
      ...isi.dihitungDari,
      ...isi.rincian.map((b) => `${b.label} ${b.nilai}`),
    ].join(' | ');

  it('tidak menyisakan kode saham di satu medan pun selama belum dibuka', () => {
    const isi = isiSumber(hitunganBocor(), petakan([hitunganBocor()]), emiten, DISAMARKAN);
    const teks = semuaTeks(isi);
    expect(teks).not.toContain('DADA');
    expect(teks).not.toContain('dada');
    expect(teks).not.toContain('.JK');
  });

  it('tidak menyisakan nama emiten selama belum dibuka', () => {
    const isi = isiSumber(bocor(), petakan([bocor()]), emiten, DISAMARKAN);
    expect(semuaTeks(isi)).not.toContain(emiten.nama);
  });

  it('menyamarkan endpoint, berkas, parameter, kode fakta, dan kode fakta asal', () => {
    const isi = isiSumber(bocor(), petakan([bocor()]), emiten, DISAMARKAN);
    const nilai = (label: string): string =>
      isi.rincian.find((b) => b.label === label)?.nilai ?? '(tidak ada)';
    expect(nilai('Endpoint')).toBe(`/v2/company/corporate-actions/${SAMARAN}/`);
    expect(nilai('Berkas sumber')).toBe(`idx/${SAMARAN}-2025-06-30.pdf`);
    expect(nilai('Parameter symbol')).toBe(SAMARAN);
    expect(nilai('Kode fakta')).toBe(`susp-${SAMARAN}-2025-06-30`);
    expect(nilai('Kode fakta asal')).toBe(`harga-${SAMARAN}-2025-08-01`);
  });

  it('menyamarkan kalimat resmi dan cara menghitungnya', () => {
    const isi = isiSumber(hitunganBocor(), petakan([hitunganBocor()]), emiten, DISAMARKAN);
    expect(isi.kalimatResmi).toBe(`Bursa menghentikan sementara perdagangan ${SAMARAN}.`);
    expect(isi.caraHitung).toBe(
      `harga ${SAMARAN} 8 Oktober dibagi harga ${SAMARAN} 1 Agustus`,
    );
  });

  it('menyamarkan "Dihitung dari", yang memakai klaim fakta asal', () => {
    const asal = buat({
      fact_id: 'harga-DADA-2025-08-01',
      klaim: 'Harga penutupan DADA 1 Agustus 2025.',
    });
    const isi = isiSumber(hitunganBocor(), petakan([hitunganBocor(), asal]), emiten, DISAMARKAN);
    expect(isi.dihitungDari.join(' ')).not.toContain('DADA');
    expect(isi.dihitungDari.join(' ')).toContain(SAMARAN);
  });

  it('baris pertama rincian mengatakan kenapa, supaya ••• tidak tampak seperti data hilang', () => {
    const isi = isiSumber(bocor(), petakan([bocor()]), emiten, DISAMARKAN);
    expect(isi.rincian[0]?.nilai).toBe(CATATAN_SAMARAN);
  });

  it('SESUDAH dibuka, tiap nilai kembali utuh dan catatannya hilang', () => {
    const isi = isiSumber(hitunganBocor(), petakan([hitunganBocor()]), emiten, DIBUKA);
    const nilai = (label: string): string =>
      isi.rincian.find((b) => b.label === label)?.nilai ?? '(tidak ada)';
    expect(nilai('Endpoint')).toBe('/v2/company/corporate-actions/DADA/');
    expect(nilai('Berkas sumber')).toBe('idx/DADA-2025-06-30.pdf');
    expect(nilai('Parameter symbol')).toBe('DADA.JK');
    expect(nilai('Kode fakta')).toBe('turunan-DADA');
    expect(isi.kalimatResmi).toContain(emiten.nama);
    expect(isi.caraHitung).toContain('DADA');
    expect(isi.rincian.map((b) => b.nilai)).not.toContain(CATATAN_SAMARAN);
    expect(semuaTeks(isi)).not.toContain(SAMARAN);
  });

  it('tanggal "sudah bisa dibaca sejak" tidak ikut berubah oleh penyamaran', () => {
    const disamarkan = isiSumber(bocor(), petakan([bocor()]), emiten, DISAMARKAN);
    const dibuka = isiSumber(bocor(), petakan([bocor()]), emiten, DIBUKA);
    expect(disamarkan.sejakKapan).toBe(dibuka.sejakKapan);
  });
});
