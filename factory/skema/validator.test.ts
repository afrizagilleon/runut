import { describe, expect, it } from 'vitest';
import type { Fakta, Kasus } from './tipe.ts';
import { SEMUA_ATURAN, VERSI_SKEMA } from './tipe.ts';
import { periksaKasus } from './validator.ts';
import { angkaTelanjang, pecahTeks, teksPolos } from './rujukan.ts';

function fakta(ubah: Partial<Fakta> & { fact_id: string }): Fakta {
  return {
    klaim: 'Klaim contoh',
    nilai: 1,
    satuan: 'lembar',
    sumber: {
      jenis: 'api',
      endpoint: '/v2/daily/CONTOH/',
      berkas: null,
      parameter: {},
      diambil_pada: null,
      keterangan: null,
    },
    turunan_dari: [],
    tersedia_sejak: '2025-10-01',
    status: 'TERVERIFIKASI',
    ...ubah,
  };
}

function kasusMinimal(): Kasus {
  return {
    skema_versi: VERSI_SKEMA,
    kasus_id: 'contoh-2025-10-08',
    judul: 'Kasus contoh',
    emiten: { simbol: 'XXXX', nama: 'PT Contoh Tbk', papan: 'Pengembangan', sektor: 'properti' },
    nama_samaran: 'Perusahaan X',
    tanggal_t: '2025-10-08',
    fakta: [
      fakta({ fact_id: 'harga-awal', nilai: 8 }),
      fakta({ fact_id: 'harga-akhir', nilai: 178 }),
      fakta({ fact_id: 'harga-nanti', nilai: 50, tersedia_sejak: '2025-10-22' }),
    ],
    fakta_terlihat: ['harga-awal', 'harga-akhir'],
    soal: [
      {
        soal_id: 's1',
        batang: 'Harga naik dari [[harga-awal|Rp8]] ke [[harga-akhir|Rp178]]. Apa artinya?',
        pilihan: [
          { kunci: 'a', teks: 'Banyak orang bertransaksi' },
          { kunci: 'b', teks: 'Laba perusahaan naik' },
        ],
        jawaban: 'a',
        penjelasan: 'Harga adalah data pasar.',
        fact_ids: ['harga-awal', 'harga-akhir'],
      },
    ],
    pembukaan: {
      fact_ids: ['harga-nanti'],
      paragraf: ['Dua pekan kemudian harga menjadi [[harga-nanti|Rp50]].'],
    },
    temuan: [],
    pemeriksaan: SEMUA_ATURAN.map((aturan) => ({
      aturan,
      judul: 'aturan ' + aturan,
      dijalankan: false,
      alasan_lewat: 'kasus contoh tidak memuat rantai laporan',
      jumlah_temuan: 0,
    })),
    kartu_konsep: [{ kode: 'A2', judul: 'lot dan lembar' }],
    disclaimer: ['Kalimat satu.', 'Kalimat dua.', 'Kalimat tiga.'],
  };
}

describe('validator kasus', () => {
  it('menerima kasus contoh minimal', () => {
    expect(periksaKasus(kasusMinimal())).toEqual([]);
  });

  it('menolak fact_id menggantung dan menyebut id itu', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.fact_ids = ['harga-awal', 'harga-hantu'];
    const masalah = periksaKasus(kasus);
    expect(masalah.map((m) => m.kode)).toContain('FACT_ID_MENGGANTUNG');
    expect(masalah.map((m) => m.pesan).join('\n')).toContain('harga-hantu');
  });

  it('menolak rujukan angka ke fact_id yang tidak ada', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.batang = 'Harga naik ke [[harga-siluman|Rp178]].';
    const pesan = periksaKasus(kasus)
      .map((m) => m.pesan)
      .join('\n');
    expect(pesan).toContain('harga-siluman');
  });

  it('menolak angka telanjang tanpa fact_id', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.penjelasan = 'Harga naik 22 kali lipat.';
    const masalah = periksaKasus(kasus);
    expect(masalah.map((m) => m.kode)).toContain('ANGKA_TANPA_FACT_ID');
    expect(masalah.map((m) => m.pesan).join('\n')).toContain('22');
  });

  it('mengizinkan angka andaian yang ditandai misal', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.batang =
      'Kamu memegang [[misal|10 lot]]. Harga naik ke [[harga-akhir|Rp178]].';
    expect(periksaKasus(kasus)).toEqual([]);
  });

  it('menolak fakta yang baru tersedia sesudah tanggal T di bagian pemain', () => {
    const kasus = kasusMinimal();
    kasus.fakta_terlihat = ['harga-awal', 'harga-akhir', 'harga-nanti'];
    const masalah = periksaKasus(kasus);
    expect(masalah.map((m) => m.kode)).toContain('FAKTA_SESUDAH_T');
    expect(masalah.map((m) => m.pesan).join('\n')).toContain('harga-nanti');
  });

  it('menolak fakta tanpa tanggal ketersediaan di bagian pemain', () => {
    const kasus = kasusMinimal();
    kasus.fakta.push(fakta({ fact_id: 'entah-kapan', tersedia_sejak: null, status: 'BELUM' }));
    kasus.fakta_terlihat.push('entah-kapan');
    const masalah = periksaKasus(kasus);
    expect(masalah.map((m) => m.kode)).toContain('FAKTA_BELUM_TERSEDIA');
  });

  it('menolak fakta berstatus KONFLIK sebagai dasar jawaban', () => {
    const kasus = kasusMinimal();
    kasus.fakta[0] = fakta({ fact_id: 'harga-awal', nilai: 8, status: 'KONFLIK' });
    const masalah = periksaKasus(kasus);
    expect(masalah.map((m) => m.kode)).toContain('FAKTA_KONFLIK_DIPAKAI');
  });

  it('menolak fakta pembukaan yang bocor ke daftar fakta terlihat', () => {
    const kasus = kasusMinimal();
    kasus.fakta_terlihat.push('harga-nanti');
    const masalah = periksaKasus(kasus);
    expect(masalah.map((m) => m.kode)).toContain('FAKTA_PEMBUKAAN_BOCOR');
  });

  it('menolak kalimat yang mengajak bertransaksi', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.penjelasan = 'Saham ini layak dikoleksi.';
    const masalah = periksaKasus(kasus);
    expect(masalah.map((m) => m.kode)).toContain('AJAKAN_TRANSAKSI');
  });

  it('menolak kalimat tetap yang jumlahnya bukan tiga', () => {
    const kasus = kasusMinimal();
    kasus.disclaimer = ['Satu saja.'];
    expect(periksaKasus(kasus).map((m) => m.kode)).toContain('DISCLAIMER');
  });

  it('menolak kasus yang menghilangkan satu aturan dari jejak pemeriksaan', () => {
    const kasus = kasusMinimal();
    kasus.pemeriksaan = kasus.pemeriksaan.filter((p) => p.aturan !== 'R3');
    const masalah = periksaKasus(kasus);
    expect(masalah.map((m) => m.kode)).toContain('PEMERIKSAAN_TAK_LENGKAP');
    expect(masalah.map((m) => m.pesan).join(' ')).toContain('R3');
  });

  it('menolak aturan yang dilewati tanpa menyebut alasan', () => {
    const kasus = kasusMinimal();
    kasus.pemeriksaan = kasus.pemeriksaan.map((p) =>
      p.aturan === 'R8' ? { ...p, alasan_lewat: null } : p,
    );
    expect(periksaKasus(kasus).map((m) => m.kode)).toContain('PEMERIKSAAN_TANPA_ALASAN');
  });

  it('menolak jumlah temuan yang tidak cocok dengan daftar temuan', () => {
    const kasus = kasusMinimal();
    kasus.pemeriksaan = kasus.pemeriksaan.map((p) =>
      p.aturan === 'R2' ? { ...p, dijalankan: true, alasan_lewat: null, jumlah_temuan: 1 } : p,
    );
    expect(periksaKasus(kasus).map((m) => m.kode)).toContain('PEMERIKSAAN_TAK_COCOK');
  });

  it('menolak jawaban yang tidak ada di pilihan', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.jawaban = 'z';
    expect(periksaKasus(kasus).map((m) => m.kode)).toContain('JAWABAN_TAK_ADA');
  });
});

describe('rujukan angka', () => {
  it('membuang penanda saat dirender polos', () => {
    expect(teksPolos('Naik ke [[harga-akhir|Rp178]] pada Oktober.')).toBe(
      'Naik ke Rp178 pada Oktober.',
    );
  });

  it('memecah teks menjadi bagian biasa dan bagian bersumber', () => {
    expect(pecahTeks('Naik ke [[harga-akhir|Rp178]].')).toEqual([
      { jenis: 'utuh', teks: 'Naik ke ' },
      { jenis: 'rujukan', teks: 'Rp178', fact_id: 'harga-akhir' },
      { jenis: 'utuh', teks: '.' },
    ]);
  });

  it('menemukan angka telanjang di luar rujukan', () => {
    expect(angkaTelanjang('Naik 22 kali ke [[harga-akhir|Rp178]].')).toEqual(['22']);
  });
});
