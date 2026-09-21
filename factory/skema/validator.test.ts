import { describe, expect, it } from 'vitest';
import type { Fakta, Kasus } from './tipe.ts';
import { SEMUA_ATURAN, VERSI_SKEMA } from './tipe.ts';
import { ajakanBertransaksi, periksaKasus } from './validator.ts';
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
    awam: null,
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
    pembuka: {
      hook: 'Harga naik dari [[harga-awal|Rp8]] ke [[harga-akhir|Rp178]]. Siapa yang betul?',
      aturan: [
        'Waktu dibekukan di [[hari-ini|8 Oktober 2025]].',
        'Cek omongan teman ke kartu fakta di atas tiap soal.',
        'Sesudah soal, kamu melihat apa yang terjadi berikutnya.',
      ],
    },
    fakta: [
      fakta({
        fact_id: 'harga-awal',
        nilai: 8,
        awam: { kepala: 'Data harga · 1 Agu 2025', isi: 'Harga mulai [[harga-awal|Rp8]].' },
      }),
      fakta({
        fact_id: 'harga-akhir',
        nilai: 178,
        awam: { kepala: 'Data harga · 8 Okt 2025', isi: 'Harga kini [[harga-akhir|Rp178]].' },
      }),
      fakta({ fact_id: 'harga-nanti', nilai: 50, tersedia_sejak: '2025-10-22' }),
    ],
    fakta_terlihat: ['harga-awal', 'harga-akhir'],
    soal: [
      {
        soal_id: 's1',
        kartu: ['harga-awal', 'harga-akhir'],
        kartu_penentu: ['harga-akhir'],
        istilah: [{ kata: 'Hari bursa', arti: 'hari ketika bursa buka.' }],
        batang: 'Hari ini [[hari-ini|8 Oktober 2025]]. Temanmu bilang harga naik. Mana yang tepat?',
        pilihan: [
          { kunci: 'a', teks: 'Betul, banyak orang bertransaksi di harga itu.' },
          { kunci: 'b', teks: 'Betul, laba perusahaan naik pada tahun itu.' },
          { kunci: 'c', teks: 'Keliru, harga tidak pernah bergerak sama sekali.' },
          { kunci: 'd', teks: 'Keliru, laba perusahaan justru turun tahun itu.' },
        ],
        jawaban: 'a',
        penjelasan: 'Harga adalah data pasar, bukan kabar dari siapa pun.',
        fact_ids: ['harga-awal', 'harga-akhir'],
      },
    ],
    pembukaan: {
      fact_ids: ['harga-nanti'],
      paragraf: ['Dua pekan kemudian harga menjadi [[harga-nanti|Rp50]].'],
      bisa_dibaca: ['Harga sudah naik jauh di atas titik awalnya.'],
      tidak_bisa_dibaca: ['Kapan harga berbalik, atau sampai berapa.'],
      disingkirkan: ['Tidak ada laporan yang disingkirkan dari kasus contoh ini.'],
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

const kode = (kasus: Kasus): string[] => periksaKasus(kasus).map((m) => m.kode);
const pesan = (kasus: Kasus): string =>
  periksaKasus(kasus)
    .map((m) => m.pesan)
    .join('\n');

describe('validator kasus v2', () => {
  it('menerima kasus contoh minimal', () => {
    expect(periksaKasus(kasusMinimal())).toEqual([]);
  });

  it('menolak berkas kasus versi lama dengan pesan yang menyebut versi skema', () => {
    const kasus = kasusMinimal();
    kasus.skema_versi = 1;
    expect(kode(kasus)).toContain('SKEMA_VERSI');
    expect(pesan(kasus)).toContain('Versi skema 1');
  });
});

/*
 * Sepuluh aturan D-2, satu blok per aturan, ditambah aturan kesebelas dari
 * D-13(b). Tiap blok merusak **data** kasusnya; bahwa aturan itu benar-benar
 * mengikat dibuktikan terpisah dengan merusak **kode** validator (ledger §9).
 */
describe('D-2 aturan 1 — jumlah kartu 2–4', () => {
  it('menolak soal dengan satu kartu dan menyebut soal_id', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.kartu = ['harga-awal'];
    kasus.fakta_terlihat = ['harga-awal'];
    expect(kode(kasus)).toContain('KARTU_JUMLAH');
    expect(pesan(kasus)).toContain('s1');
  });

  it('menolak soal dengan lima kartu', () => {
    const kasus = kasusMinimal();
    for (const nomor of [1, 2, 3]) {
      const id = `tambahan-${String(nomor)}`;
      kasus.fakta.push(
        fakta({ fact_id: id, awam: { kepala: 'Kartu', isi: 'Isi kartu tambahan.' } }),
      );
      kasus.soal[0]!.kartu.push(id);
      kasus.fakta_terlihat.push(id);
    }
    expect(kode(kasus)).toContain('KARTU_JUMLAH');
  });
});

describe('D-2 aturan 2 — istilah paling banyak dua dan selalu berarti', () => {
  it('menolak tiga istilah', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.istilah = [
      { kata: 'Satu', arti: 'arti satu.' },
      { kata: 'Dua', arti: 'arti dua.' },
      { kata: 'Tiga', arti: 'arti tiga.' },
    ];
    expect(kode(kasus)).toContain('ISTILAH_TERLALU_BANYAK');
    expect(pesan(kasus)).toContain('s1');
  });

  it('menolak istilah tanpa arti dan menyebut katanya', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.istilah = [{ kata: 'Tanggal ex', arti: '   ' }];
    expect(kode(kasus)).toContain('ISTILAH_TANPA_ARTI');
    expect(pesan(kasus)).toContain('Tanggal ex');
  });
});

describe('D-2 aturan 3 — kartu wajib punya teks awam yang cukup pendek', () => {
  it('menolak kartu tanpa teks awam dan menyebut fact_id', () => {
    const kasus = kasusMinimal();
    kasus.fakta[0] = fakta({ fact_id: 'harga-awal', nilai: 8, awam: null });
    expect(kode(kasus)).toContain('KARTU_TANPA_AWAM');
    expect(pesan(kasus)).toContain('harga-awal');
  });

  it('menolak teks awam lebih dari 220 karakter polos', () => {
    const kasus = kasusMinimal();
    kasus.fakta[0] = fakta({
      fact_id: 'harga-awal',
      nilai: 8,
      awam: { kepala: 'Data harga', isi: 'Harga mulai [[harga-awal|Rp8]]. ' + 'panjang '.repeat(30) },
    });
    expect(kode(kasus)).toContain('KARTU_AWAM_PANJANG');
    expect(pesan(kasus)).toContain('harga-awal');
  });

  it('mengukur panjang atas teks polos, bukan teks mentah (D-13d)', () => {
    const kasus = kasusMinimal();
    // Mentah jauh di atas 220 karakter, polos hanya beberapa puluh.
    const id = 'harga-awal';
    const mentah = Array.from({ length: 12 }, () => `[[${id}|Rp8]]`).join(' ');
    kasus.fakta[0] = fakta({
      fact_id: id,
      nilai: 8,
      awam: { kepala: 'Data harga', isi: mentah },
    });
    expect(mentah.length).toBeGreaterThan(220);
    expect(kode(kasus)).not.toContain('KARTU_AWAM_PANJANG');
  });
});

describe('D-2 aturan 4 — opsi berlabel Betul/Keliru, dua-dua', () => {
  it('menolak opsi tanpa label dan menyebut kuncinya', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pilihan[0] = { kunci: 'a', teks: 'Banyak orang bertransaksi di harga itu.' };
    expect(kode(kasus)).toContain('OPSI_TANPA_LABEL');
    expect(pesan(kasus)).toContain('"a"');
  });

  it('menolak perbandingan tiga lawan satu', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pilihan[2] = { kunci: 'c', teks: 'Betul, harga memang tidak pernah bergerak.' };
    expect(kode(kasus)).toContain('OPSI_TAK_DUA_DUA');
    expect(pesan(kasus)).toContain('s1');
  });
});

describe('D-2 aturan 5 — kartu harus fakta yang ada', () => {
  it('menolak kartu yang bukan anggota fakta', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.kartu = ['harga-awal', 'kartu-hantu'];
    expect(kode(kasus)).toContain('KARTU_MENGGANTUNG');
    expect(pesan(kasus)).toContain('kartu-hantu');
  });
});

describe('D-2 aturan 6 — kartu wajib TERVERIFIKASI', () => {
  it('menolak kartu berstatus KONFLIK dan menyebut soal serta fact_id', () => {
    const kasus = kasusMinimal();
    kasus.fakta[1] = fakta({
      fact_id: 'harga-akhir',
      nilai: 178,
      status: 'KONFLIK',
      awam: { kepala: 'Data harga · 8 Okt 2025', isi: 'Harga kini [[harga-akhir|Rp178]].' },
    });
    expect(kode(kasus)).toContain('KARTU_TAK_TERVERIFIKASI');
    expect(pesan(kasus)).toContain('harga-akhir');
    expect(pesan(kasus)).toContain('s1');
  });

  it('menolak kartu berstatus BELUM', () => {
    const kasus = kasusMinimal();
    kasus.fakta[1] = fakta({
      fact_id: 'harga-akhir',
      nilai: 178,
      status: 'BELUM',
      awam: { kepala: 'Data harga · 8 Okt 2025', isi: 'Harga kini [[harga-akhir|Rp178]].' },
    });
    expect(kode(kasus)).toContain('KARTU_TAK_TERVERIFIKASI');
  });
});

describe('D-2 aturan 7 — kartu harus sudah tersedia pada tanggal T', () => {
  it('menolak kartu tanpa tersedia_sejak', () => {
    const kasus = kasusMinimal();
    kasus.fakta[1] = fakta({
      fact_id: 'harga-akhir',
      nilai: 178,
      tersedia_sejak: null,
      awam: { kepala: 'Data harga', isi: 'Harga kini [[harga-akhir|Rp178]].' },
    });
    expect(kode(kasus)).toContain('KARTU_TANPA_TANGGAL');
    expect(pesan(kasus)).toContain('harga-akhir');
  });

  it('menolak kartu yang baru terbit sesudah T', () => {
    const kasus = kasusMinimal();
    kasus.fakta[1] = fakta({
      fact_id: 'harga-akhir',
      nilai: 178,
      tersedia_sejak: '2025-10-22',
      awam: { kepala: 'Data harga', isi: 'Harga kini [[harga-akhir|Rp178]].' },
    });
    expect(kode(kasus)).toContain('KARTU_SESUDAH_T');
    expect(pesan(kasus)).toContain('2025-10-22');
  });
});

describe('D-2 aturan 8 — tidak ada fakta terlihat yang menganggur', () => {
  it('menolak fakta di fakta_terlihat yang tidak dipakai kartu soal mana pun', () => {
    const kasus = kasusMinimal();
    kasus.fakta.push(
      fakta({ fact_id: 'nganggur', awam: { kepala: 'Kartu', isi: 'Tidak dipakai.' } }),
    );
    kasus.fakta_terlihat.push('nganggur');
    expect(kode(kasus)).toContain('TERLIHAT_TAK_TERPAKAI');
    expect(pesan(kasus)).toContain('nganggur');
  });

  it('menolak kartu yang tidak terdaftar di fakta_terlihat (D-1: keduanya sama)', () => {
    const kasus = kasusMinimal();
    kasus.fakta_terlihat = ['harga-awal'];
    expect(kode(kasus)).toContain('KARTU_TAK_TERLIHAT');
    expect(pesan(kasus)).toContain('harga-akhir');
  });
});

describe('A2-T1 — panjang baris kepala kartu', () => {
  it('menolak kepala lebih dari 36 karakter dan menyebut panjangnya', () => {
    const kasus = kasusMinimal();
    kasus.fakta[1] = fakta({
      fact_id: 'harga-akhir',
      nilai: 178,
      awam: {
        // 44 karakter — persis kepala yang terpotong di 375 px sebelum A-2.
        kepala: 'Dihitung dari data harga · 1 Agu – 8 Okt 2025',
        isi: 'Harga kini [[harga-akhir|Rp178]].',
      },
      sumber: {
        jenis: 'turunan',
        endpoint: null,
        berkas: null,
        parameter: {},
        diambil_pada: null,
        keterangan: 'contoh hitungan',
      },
    });
    expect(kode(kasus)).toContain('KEPALA_PANJANG');
    expect(pesan(kasus)).toContain('harga-akhir');
    expect(pesan(kasus)).toContain('45');
  });

  it('menerima kepala tepat 36 karakter', () => {
    const kasus = kasusMinimal();
    const kepala = 'Laporan pemilik · terbit 25 Agu 2025';
    expect(kepala).toHaveLength(36);
    kasus.fakta[1] = fakta({
      fact_id: 'harga-akhir',
      nilai: 178,
      awam: { kepala, isi: 'Harga kini [[harga-akhir|Rp178]].' },
    });
    expect(kode(kasus)).not.toContain('KEPALA_PANJANG');
  });

  it('menolak kepala 37 karakter — batasnya benar-benar di 36', () => {
    const kasus = kasusMinimal();
    kasus.fakta[1] = fakta({
      fact_id: 'harga-akhir',
      nilai: 178,
      awam: { kepala: 'x'.repeat(37), isi: 'Harga kini [[harga-akhir|Rp178]].' },
    });
    expect(kode(kasus)).toContain('KEPALA_PANJANG');
  });
});

describe('A1-T1 — kartu penentu', () => {
  it('menolak soal tanpa satu pun kartu penentu', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.kartu_penentu = [];
    expect(kode(kasus)).toContain('KARTU_PENENTU_JUMLAH');
    expect(pesan(kasus)).toContain('s1');
  });

  it('menolak lebih dari dua kartu penentu', () => {
    const kasus = kasusMinimal();
    kasus.fakta.push(
      fakta({ fact_id: 'harga-tengah', awam: { kepala: 'Data harga', isi: 'Isi.' } }),
    );
    kasus.soal[0]!.kartu.push('harga-tengah');
    kasus.fakta_terlihat.push('harga-tengah');
    kasus.soal[0]!.kartu_penentu = ['harga-awal', 'harga-akhir', 'harga-tengah'];
    expect(kode(kasus)).toContain('KARTU_PENENTU_JUMLAH');
  });

  it('menolak kartu penentu yang bukan kartu soal itu', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.kartu_penentu = ['harga-nanti'];
    expect(kode(kasus)).toContain('KARTU_PENENTU_BUKAN_KARTU');
    expect(pesan(kasus)).toContain('harga-nanti');
  });
});

describe('A1-T1 — garis kepala harus sepakat dengan sumbernya', () => {
  function faktaTurunan(fact_id: string, kepala: string): Fakta {
    return fakta({
      fact_id,
      awam: { kepala, isi: `Isi [[${fact_id}|Rp1]].` },
      sumber: {
        jenis: 'turunan',
        endpoint: null,
        berkas: null,
        parameter: {},
        diambil_pada: null,
        keterangan: 'contoh hitungan',
      },
    });
  }

  it('menolak kartu turunan yang kepalanya tidak diawali "Dihitung dari"', () => {
    const kasus = kasusMinimal();
    kasus.fakta[1] = faktaTurunan('harga-akhir', 'Laporan pemegang saham · 1 Sep 2025');
    expect(kode(kasus)).toContain('KEPALA_HITUNG_HILANG');
    expect(pesan(kasus)).toContain('harga-akhir');
  });

  it('menerima kartu turunan yang kepalanya diawali "Dihitung dari"', () => {
    const kasus = kasusMinimal();
    kasus.fakta[1] = faktaTurunan('harga-akhir', 'Dihitung dari data harga · 8 Okt 2025');
    expect(kode(kasus)).not.toContain('KEPALA_HITUNG_HILANG');
    expect(kode(kasus)).not.toContain('KEPALA_HITUNG_PALSU');
  });

  it('menolak kartu bersumber API yang kepalanya mengaku hitungan sendiri', () => {
    const kasus = kasusMinimal();
    kasus.fakta[0] = fakta({
      fact_id: 'harga-awal',
      nilai: 8,
      awam: { kepala: 'Dihitung dari entah apa', isi: 'Harga mulai [[harga-awal|Rp8]].' },
    });
    expect(kode(kasus)).toContain('KEPALA_HITUNG_PALSU');
    expect(pesan(kasus)).toContain('harga-awal');
  });
});

describe('D-2 aturan 9 — teks kunci tidak boleh memakai fakta sesudah T (INV-10)', () => {
  it('menolak penjelasan yang menautkan fakta pembukaan', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.penjelasan =
      'Harga adalah data pasar, dan kemudian menjadi [[harga-nanti|Rp50]].';
    expect(kode(kasus)).toContain('KUNCI_SESUDAH_T');
    expect(pesan(kasus)).toContain('harga-nanti');
    expect(pesan(kasus)).toContain('s1');
  });
});

describe('D-2 aturan 10 — panjang opsi tidak boleh membocorkan jawaban', () => {
  it('menolak opsi yang selisih panjangnya lebih dari 40 persen', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pilihan[0] = {
      kunci: 'a',
      teks:
        'Betul, banyak orang bertransaksi di harga itu, dan itulah satu-satunya hal yang bisa ' +
        'disimpulkan dari deret harga tanpa satu pun keterangan lain dari perusahaan.',
    };
    expect(kode(kasus)).toContain('OPSI_PANJANG_TIMPANG');
    expect(pesan(kasus)).toContain('s1');
  });

  it('menerima opsi yang panjangnya berimbang', () => {
    expect(kode(kasusMinimal())).not.toContain('OPSI_PANJANG_TIMPANG');
  });
});

describe('D-13(b) aturan 11 — tautan di luar layar pembukaan wajib bersih', () => {
  it('menolak tautan ke fakta KONFLIK dari batang soal', () => {
    const kasus = kasusMinimal();
    kasus.fakta.push(fakta({ fact_id: 'ragu', status: 'KONFLIK' }));
    kasus.soal[0]!.batang =
      'Hari ini [[hari-ini|8 Oktober 2025]]. Ada juga [[ragu|satu laporan]] yang ramai. Mana yang tepat?';
    expect(kode(kasus)).toContain('TAUTAN_KONFLIK');
    expect(pesan(kasus)).toContain('ragu');
  });

  it('menolak tautan ke fakta sesudah T dari teks awam kartu', () => {
    const kasus = kasusMinimal();
    kasus.fakta[1] = fakta({
      fact_id: 'harga-akhir',
      nilai: 178,
      awam: {
        kepala: 'Data harga · 8 Okt 2025',
        isi: 'Harga kini [[harga-akhir|Rp178]], nanti [[harga-nanti|Rp50]].',
      },
    });
    expect(kode(kasus)).toContain('TAUTAN_SESUDAH_T');
    expect(pesan(kasus)).toContain('harga-nanti');
  });

  it('mengizinkan tautan ke fakta KONFLIK dan fakta sesudah T di layar pembukaan', () => {
    const kasus = kasusMinimal();
    kasus.fakta.push(fakta({ fact_id: 'ragu', status: 'KONFLIK', tersedia_sejak: '2025-11-01' }));
    kasus.pembukaan.disingkirkan = [
      'Satu laporan [[ragu|tidak lolos pemeriksaan]] dan karena itu tidak pernah menjadi kartu.',
    ];
    expect(periksaKasus(kasus)).toEqual([]);
  });
});

describe('penanda hari-ini', () => {
  it('menolak penanda yang menulis tanggal selain tanggal beku kasus', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.batang = 'Hari ini [[hari-ini|9 Oktober 2025]]. Mana yang paling tepat?';
    expect(kode(kasus)).toContain('HARI_INI_TAK_COCOK');
    expect(pesan(kasus)).toContain('9 Oktober 2025');
  });

  it('tidak menganggap penanda hari-ini sebagai fact_id menggantung', () => {
    expect(kode(kasusMinimal())).not.toContain('FACT_ID_MENGGANTUNG');
  });
});

describe('layar pertama', () => {
  it('menolak aturan main yang bukan tiga baris', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.aturan = ['Hanya satu baris.'];
    expect(kode(kasus)).toContain('PEMBUKA_ATURAN');
  });

  it('menolak angka telanjang di hook', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.hook = 'Harga naik 22 kali lipat. Siapa yang betul?';
    expect(kode(kasus)).toContain('ANGKA_TANPA_FACT_ID');
  });
});

describe('layar pembukaan', () => {
  it('menolak layar pembukaan tanpa butir "yang kami singkirkan"', () => {
    const kasus = kasusMinimal();
    kasus.pembukaan.disingkirkan = [];
    expect(kode(kasus)).toContain('PEMBUKAAN_TAK_LENGKAP');
    expect(pesan(kasus)).toContain('disingkirkan');
  });
});

describe('aturan v1 yang tetap berlaku', () => {
  it('menolak fact_id menggantung dan menyebut id itu', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.fact_ids = ['harga-awal', 'harga-hantu'];
    expect(kode(kasus)).toContain('FACT_ID_MENGGANTUNG');
    expect(pesan(kasus)).toContain('harga-hantu');
  });

  it('menolak angka telanjang tanpa fact_id', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.penjelasan = 'Harga naik 22 kali lipat.';
    expect(kode(kasus)).toContain('ANGKA_TANPA_FACT_ID');
    expect(pesan(kasus)).toContain('22');
  });

  it('mengizinkan angka andaian yang ditandai misal', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.batang =
      'Hari ini [[hari-ini|8 Oktober 2025]]. Kamu pegang [[misal|10 lot]]. Mana yang tepat?';
    expect(periksaKasus(kasus)).toEqual([]);
  });

  it('menolak fakta yang baru tersedia sesudah tanggal T di bagian pemain', () => {
    const kasus = kasusMinimal();
    kasus.fakta_terlihat.push('harga-nanti');
    expect(kode(kasus)).toContain('FAKTA_SESUDAH_T');
    expect(pesan(kasus)).toContain('harga-nanti');
  });

  it('menolak fakta berstatus KONFLIK sebagai dasar jawaban', () => {
    const kasus = kasusMinimal();
    kasus.fakta[0] = fakta({
      fact_id: 'harga-awal',
      nilai: 8,
      status: 'KONFLIK',
      awam: { kepala: 'Data harga · 1 Agu 2025', isi: 'Harga mulai [[harga-awal|Rp8]].' },
    });
    expect(kode(kasus)).toContain('FAKTA_KONFLIK_DIPAKAI');
  });

  it('menolak fakta pembukaan yang bocor ke daftar fakta terlihat', () => {
    const kasus = kasusMinimal();
    kasus.fakta_terlihat.push('harga-nanti');
    expect(kode(kasus)).toContain('FAKTA_PEMBUKAAN_BOCOR');
  });

  it('menolak kalimat yang mengajak bertransaksi', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.penjelasan = 'Saham ini layak dikoleksi.';
    expect(kode(kasus)).toContain('AJAKAN_TRANSAKSI');
  });

  it('menemukan ajakan bertransaksi di teks awam kartu juga', () => {
    const kasus = kasusMinimal();
    kasus.fakta[0] = fakta({
      fact_id: 'harga-awal',
      nilai: 8,
      awam: { kepala: 'Data harga', isi: 'Saham ini layak dikoleksi.' },
    });
    expect(kode(kasus)).toContain('AJAKAN_TRANSAKSI');
  });

  it('menolak kalimat tetap yang jumlahnya bukan tiga', () => {
    const kasus = kasusMinimal();
    kasus.disclaimer = ['Satu saja.'];
    expect(kode(kasus)).toContain('DISCLAIMER');
  });

  it('menolak kasus yang menghilangkan satu aturan dari jejak pemeriksaan', () => {
    const kasus = kasusMinimal();
    kasus.pemeriksaan = kasus.pemeriksaan.filter((p) => p.aturan !== 'R3');
    expect(kode(kasus)).toContain('PEMERIKSAAN_TAK_LENGKAP');
    expect(pesan(kasus)).toContain('R3');
  });

  it('menolak aturan yang dilewati tanpa menyebut alasan', () => {
    const kasus = kasusMinimal();
    kasus.pemeriksaan = kasus.pemeriksaan.map((p) =>
      p.aturan === 'R8' ? { ...p, alasan_lewat: null } : p,
    );
    expect(kode(kasus)).toContain('PEMERIKSAAN_TANPA_ALASAN');
  });

  it('menolak jumlah temuan yang tidak cocok dengan daftar temuan', () => {
    const kasus = kasusMinimal();
    kasus.pemeriksaan = kasus.pemeriksaan.map((p) =>
      p.aturan === 'R2' ? { ...p, dijalankan: true, alasan_lewat: null, jumlah_temuan: 1 } : p,
    );
    expect(kode(kasus)).toContain('PEMERIKSAAN_TAK_COCOK');
  });

  it('menolak jawaban yang tidak ada di pilihan', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.jawaban = 'z';
    expect(kode(kasus)).toContain('JAWABAN_TAK_ADA');
  });
});

/*
 * Pola INV-5 diperketat supaya bahasa sehari-hari tidak menyalakan alarm palsu.
 * Blok ini menjaga keduanya: kalimat yang menyuruh pembaca tetap tertangkap,
 * kata benda "jual-beli" dan "sisi jual" tidak.
 */
describe('INV-5 ajakan bertransaksi', () => {
  const harusTertangkap = [
    // A1-T8: awal kalimat DI DALAM paragraf, bukan hanya di awal teks.
    'Laporannya sudah terbit. Beli saham ini sekarang.',
    'Harganya sudah turun jauh. Jual saja seluruhnya sebelum terlambat.',
    'Kartu ketiga merangkumnya. Borong selagi masih murah.',
    'Ini kalimat pertama! Beli sebanyak yang kamu mampu.',
    'Pertanyaannya sederhana? Jual sekarang juga.',
    'Saham ini layak dikoleksi.',
    'Beli sekarang selagi masih murah.',
    'Sebaiknya jual saham ini sebelum turun.',
    'Borong selagi harganya rendah.',
    'Jual saja seluruhnya.',
    'Belilah pada harga sekarang.',
    'Target harga kami Rp300.',
    'Ini saham yang wajib punya.',
    'Harus dibeli sebelum pengumuman.',
    'Rekomendasi beli dari kami.',
  ];
  for (const kalimat of harusTertangkap) {
    it(`menangkap: ${kalimat}`, () => {
      expect(ajakanBertransaksi(kalimat)).not.toBeNull();
    });
  }

  const harusLolos = [
    // Dua positif palsu yang sudah diperbaiki tidak boleh hidup lagi.
    'Bursa menyetop perdagangan. Jual-beli saham ini dihentikan sementara.',
    'Pemilik terbesar menjual 70 juta lembar. Penjualan itu dilaporkan 25 Agustus.',
    'Laporannya terbit. Pemilik menjual 70 juta lembar di harga Rp13.',
    'Bursa menghentikan sementara jual-beli saham ini karena laporan keuangan belum diserahkan.',
    'Yang perlu dibaca calon pembeli adalah siapa yang ada di sisi jual.',
    'Pemilik terbesarnya tenang-tenang aja tuh, nggak kedengeran jual.',
    'Satuan jual-beli saham; satu lot sama dengan seratus lembar.',
    'Pemilik terbesar Perusahaan D menjual 70 juta lembar di harga Rp13.',
    'Setiap jual-belinya wajib dilaporkan dan diumumkan ke publik.',
  ];
  for (const kalimat of harusLolos) {
    it(`membiarkan: ${kalimat.slice(0, 48)}…`, () => {
      expect(ajakanBertransaksi(kalimat)).toBeNull();
    });
  }

  it('tidak membaca fact_id di dalam [[…|…]] sebagai kalimat', () => {
    expect(ajakanBertransaksi('Berjumlah [[jumlah-jual-terverifikasi|299,5 juta lembar]].')).toBeNull();
  });

  it('tidak tertipu fact_id yang jatuh tepat sesudah titik', () => {
    expect(
      ajakanBertransaksi('Itu laporannya. [[jumlah-jual-terverifikasi|299,5 juta lembar]] terjual.'),
    ).toBeNull();
  });

  it('menangkap perintah walau jauh di tengah paragraf panjang', () => {
    const paragraf =
      'Tiga laporan itu semuanya penjualan, tetapi ukurannya jauh berbeda. ' +
      'Pemilik besar berhak menjual sahamnya kapan pun ia mau. ' +
      'Beli saham ini sebelum harganya naik lagi.';
    expect(ajakanBertransaksi(paragraf)).not.toBeNull();
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
