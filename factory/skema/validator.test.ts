import { describe, expect, it } from 'vitest';
import type { Fakta, Kasus } from './tipe.ts';
import { SEMUA_ATURAN, VERSI_SKEMA } from './tipe.ts';
import { ajakanBertransaksi, periksaKasus } from './validator.ts';
import { ambilRujukan, angkaTelanjang, pecahTeks, teksPolos } from './rujukan.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const AKAR_REPO = fileURLToPath(new URL('../../', import.meta.url));
const kasusAsliDada = JSON.parse(
  readFileSync(`${AKAR_REPO}cases/dada-2025-10-08.json`, 'utf8'),
) as unknown as Kasus;

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
      judul: 'Cek omongan saham di grup ke dokumen resminya.',
      ajak: 'Betul atau keliru?',
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
        pesan: {
          nama: 'Bayu',
          jam: '19.38',
          isi: 'Harganya naik 22 kali dari Agustus. Pasti karena mau dibeli investor asing.',
        },
        tanya: 'Omongan Bayu cocok dengan dokumennya?',
        petunjuk: 'Baca pesannya, cek ke dokumen di bawahnya, lalu jawab.',
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
    penutup: {
      kepala: 'Tidak semua saham seperti ini.',
      isi: 'Kasus berikutnya: perusahaan yang membagi dividen tiap tahun.',
    },
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
  it('menolak tautan ke fakta KONFLIK dari teks kartu', () => {
    // v3: pesan teman adalah ucapan dan tidak boleh menautkan apa pun sama
    // sekali, jadi aturan ini diuji lewat teks kartu — teks pemain yang masih
    // diperiksa ketat.
    const kasus = kasusMinimal();
    kasus.fakta.push(fakta({ fact_id: 'ragu', status: 'KONFLIK' }));
    kasus.fakta[1]!.awam = {
      kepala: 'Data harga · 8 Okt 2025',
      isi: 'Harga kini [[harga-akhir|Rp178]]; ada juga [[ragu|satu laporan]] yang ramai.',
    };
    expect(kode(kasus)).toContain('TAUTAN_KONFLIK');
    expect(pesan(kasus)).toContain('ragu');
  });

  it('menolak tautan APA PUN di dalam pesan teman — ia ucapan, bukan dokumen', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.isi = 'Naiknya [[harga-akhir|22 kali]] lho, gila.';
    expect(kode(kasus)).toContain('UCAPAN_BERTAUT');
    expect(pesan(kasus)).toContain('harga-akhir');
  });

  it('mengizinkan angka telanjang di pesan teman — di situlah tempatnya', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.isi = 'Naiknya 22 kali lho, dari Rp8 ke Rp178. Gila.';
    expect(kode(kasus)).not.toContain('ANGKA_TANPA_FACT_ID');
    expect(kode(kasus)).not.toContain('UCAPAN_BERTAUT');
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
    kasus.soal[0]!.penjelasan = 'Pada [[hari-ini|9 Oktober 2025]] harganya sudah begitu.';
    expect(kode(kasus)).toContain('HARI_INI_TAK_COCOK');
    expect(pesan(kasus)).toContain('9 Oktober 2025');
  });

  it('tidak menganggap penanda hari-ini sebagai fact_id menggantung', () => {
    expect(kode(kasusMinimal())).not.toContain('FACT_ID_MENGGANTUNG');
  });
});

describe('layar pertama', () => {
  /*
   * M3.9 D-1: layar pertama tidak lagi membawa satu kalimat pembuka, melainkan
   * judul (peran judul layar pertama) dan ajakan di bawah contoh gelembung.
   * Contoh gelembungnya TIDAK punya medan sendiri: ia dibaca dari
   * `soal[0].pesan`, jadi tidak ada teks kedua yang bisa berselisih dengannya.
   */
  it('menolak layar pertama tanpa judul', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.judul = '   ';
    expect(kode(kasus)).toContain('PEMBUKA_KOSONG');
    expect(pesan(kasus)).toContain('judul');
  });

  it('menolak layar pertama tanpa ajakan', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.ajak = '';
    expect(kode(kasus)).toContain('PEMBUKA_KOSONG');
    expect(pesan(kasus)).toContain('ajak');
  });

  it('menolak berkas yang sama sekali tidak menulis judul atau ajakan', () => {
    const kasus = kasusMinimal();
    const pembuka = kasus.pembuka as unknown as Record<string, unknown>;
    delete pembuka['judul'];
    delete pembuka['ajak'];
    expect(kode(kasus).filter((k) => k === 'PEMBUKA_KOSONG')).toHaveLength(2);
  });

  it('menolak judul layar pertama yang melampaui 60 karakter', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.judul = 'a'.repeat(61);
    expect(kode(kasus)).toContain('PEMBUKA_JUDUL_PANJANG');
    expect(pesan(kasus)).toContain('61');
  });

  it('menerima judul tepat 60 karakter — batasnya benar-benar di situ', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.judul = 'a'.repeat(60);
    expect(kode(kasus)).not.toContain('PEMBUKA_JUDUL_PANJANG');
  });

  it('menolak ajakan yang melampaui 40 karakter', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.ajak = 'b'.repeat(41);
    expect(kode(kasus)).toContain('PEMBUKA_AJAK_PANJANG');
    expect(pesan(kasus)).toContain('41');
  });

  it('menerima ajakan tepat 40 karakter — batasnya benar-benar di situ', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.ajak = 'b'.repeat(40);
    expect(kode(kasus)).not.toContain('PEMBUKA_AJAK_PANJANG');
  });

  it('mengukur panjangnya atas teks polos, sesudah penanda rujukan dilepas', () => {
    const kasus = kasusMinimal();
    // 60 karakter tampil; penandanya sendiri tidak dibaca siapa pun.
    kasus.pembuka.judul = `${'a'.repeat(54)} [[harga-akhir|Rp178]]`;
    expect(kode(kasus)).not.toContain('PEMBUKA_JUDUL_PANJANG');
  });

  it('menolak angka telanjang di judul dan di ajakan', () => {
    const judul = kasusMinimal();
    judul.pembuka.judul = 'Harga naik 22 kali lipat.';
    expect(kode(judul)).toContain('ANGKA_TANPA_FACT_ID');
    expect(pesan(judul)).toContain('pembuka (judul)');

    const ajak = kasusMinimal();
    ajak.pembuka.ajak = 'Betul atau keliru, 3 soal?';
    expect(kode(ajak)).toContain('ANGKA_TANPA_FACT_ID');
    expect(pesan(ajak)).toContain('pembuka (ajak)');
  });

  it('menolak ajakan bertransaksi dan tanda tebal di layar pertama', () => {
    const transaksi = kasusMinimal();
    transaksi.pembuka.ajak = 'Beli sekarang atau tidak?';
    expect(kode(transaksi)).toContain('AJAKAN_TRANSAKSI');

    const tebal = kasusMinimal();
    tebal.pembuka.judul = 'Cek **omongan** saham di grup.';
    expect(kode(tebal)).toContain('TEKS_DITEBALKAN');
  });

  /*
   * Medan lama dihapus dari skema, dan validator menolak berkas yang masih
   * membawanya. Tanpa penolakan ini, kalimat lama yang tertinggal di sebuah
   * berkas kasus akan diam-diam tidak pernah tampil — dan penulisnya mengira
   * ia sedang mengubah layar pertama.
   */
  it('menolak medan kalimat lama yang tidak lagi dirender (M3.9 D-1)', () => {
    const kasus = kasusMinimal();
    (kasus.pembuka as unknown as Record<string, unknown>)['kalimat'] = 'Kalimat lama.';
    expect(kode(kasus)).toContain('PEMBUKA_KALIMAT_USANG');
  });

  /*
   * `menit` (M3.5 D-1): berapa lama kasus ini kira-kira dimainkan, dipakai
   * baris meta di bawah tombol "Mulai kasus". Ia opsional — berkas kasus yang
   * tidak menuliskannya tetap sah — tetapi kalau ditulis, ia harus bilangan
   * bulat 1–30. Angka yang mustahil di situ bukan salah ketik yang tidak
   * berbahaya: ia janji kepada pemain, dan pemain memutuskan lanjut atau tidak
   * berdasarkan janji itu.
   */
  it('menerima layar pertama tanpa medan menit — ia opsional', () => {
    expect(kode(kasusMinimal())).not.toContain('PEMBUKA_MENIT');
  });

  it('menolak menit nol dan menit negatif', () => {
    for (const nilai of [0, -1, -30]) {
      const kasus = kasusMinimal();
      kasus.pembuka.menit = nilai;
      expect(kode(kasus), String(nilai)).toContain('PEMBUKA_MENIT');
    }
  });

  it('menolak menit di atas 30', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.menit = 31;
    expect(kode(kasus)).toContain('PEMBUKA_MENIT');
  });

  it('menolak menit yang bukan bilangan bulat', () => {
    for (const nilai of [5.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const kasus = kasusMinimal();
      kasus.pembuka.menit = nilai;
      expect(kode(kasus), String(nilai)).toContain('PEMBUKA_MENIT');
    }
  });

  it('menerima 1 dan 30 — batasnya benar-benar di situ', () => {
    for (const nilai of [1, 5, 30]) {
      const kasus = kasusMinimal();
      kasus.pembuka.menit = nilai;
      expect(kode(kasus), String(nilai)).not.toContain('PEMBUKA_MENIT');
    }
  });

  it('menyebut angkanya di pesan masalah, bukan hanya kodenya', () => {
    const kasus = kasusMinimal();
    kasus.pembuka.menit = 99;
    expect(pesan(kasus)).toContain('99');
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
    kasus.fakta[1]!.awam = {
      kepala: 'Data harga · 8 Okt 2025',
      isi: 'Kalau kamu pegang [[misal|10 lot]], harganya [[harga-akhir|Rp178]] per lembar.',
    };
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

  /*
   * M4 D-4. Pesan penutup dirender polos di `LayarAkhir` — tanpa `Teks`, tanpa
   * pengurai rujukan — jadi yang dijaga di sini adalah bahwa ia memang bisa
   * ditulis polos: penanda yang akan terbaca mentah oleh pemain ditolak di
   * pabrik, bukan ditemukan di layar.
   */
  it('menolak pesan penutup yang kosong', () => {
    const kasus = kasusMinimal();
    kasus.penutup = { kepala: '  ', isi: 'Ada isinya.' };
    expect(kode(kasus)).toContain('PENUTUP_KOSONG');
    expect(pesan(kasus)).toContain('kepala');
  });

  it('menolak rujukan fakta di pesan penutup — penandanya akan terbaca pemain', () => {
    const kasus = kasusMinimal();
    kasus.penutup = {
      kepala: 'Tidak semua saham seperti ini.',
      isi: 'Harganya menjadi [[harga-akhir|Rp178]].',
    };
    expect(kode(kasus)).toContain('PENUTUP_BERTAUT');
  });

  it('menolak tanda tebal di pesan penutup; yang ditebalkan adalah medan kepala', () => {
    const kasus = kasusMinimal();
    kasus.penutup = { kepala: '**Tidak semua saham seperti ini.**', isi: 'Selamat membaca.' };
    expect(kode(kasus)).toContain('PENUTUP_DITEBALKAN');
  });

  it('menolak pesan penutup yang melampaui 220 karakter', () => {
    const kasus = kasusMinimal();
    kasus.penutup = { kepala: 'a'.repeat(110), isi: 'b'.repeat(110) };
    expect(kode(kasus)).toContain('PENUTUP_PANJANG');
  });

  it('menerima pesan penutup tepat 220 karakter — batasnya benar-benar di situ', () => {
    const kasus = kasusMinimal();
    kasus.penutup = { kepala: 'a'.repeat(110), isi: 'b'.repeat(109) };
    expect(kode(kasus)).not.toContain('PENUTUP_PANJANG');
  });

  it('menolak ajakan bertransaksi di pesan penutup', () => {
    const kasus = kasusMinimal();
    kasus.penutup = { kepala: 'Sampai jumpa.', isi: 'Saham ini layak dikoleksi.' };
    expect(kode(kasus)).toContain('AJAKAN_TRANSAKSI');
    expect(pesan(kasus)).toContain('penutup');
  });

  /*
   * M4. Label rujukan tidak bisa putus baris (`Teks.tsx` membungkusnya di
   * `.tanpa-putus`), jadi label sepanjang satu klausa memaksa halaman melebar
   * di 360 px. Terukur di layar pembukaan ULTJ: satu label 64 karakter membuat
   * scrollWidth 568 melawan clientWidth 360.
   */
  it('menolak label rujukan yang lebih panjang daripada 36 karakter', () => {
    const kasus = kasusMinimal();
    kasus.pembukaan.paragraf = [
      '[[harga-nanti|Terbit lagi satu laporan pembelian orang dalam, Rp50]].',
    ];
    expect(kode(kasus)).toContain('RUJUKAN_PANJANG');
    expect(pesan(kasus)).toContain('paragraf ke-1');
  });

  it('menerima label tepat 36 karakter — batasnya benar-benar di situ', () => {
    const kasus = kasusMinimal();
    kasus.pembukaan.paragraf = [`[[harga-nanti|${'a'.repeat(30)} Rp50]].`];
    expect(kode(kasus)).not.toContain('RUJUKAN_PANJANG');
  });

  it('menyapu kartu dan teks kunci juga, bukan hanya layar pembukaan', () => {
    const kartu = kasusMinimal();
    const fakta = kartu.fakta.find((f) => f.fact_id === 'harga-akhir');
    if (fakta?.awam == null) throw new Error('kasus contoh harus punya kartu');
    fakta.awam.isi = `Harga kini [[harga-akhir|${'b'.repeat(40)}]].`;
    expect(kode(kartu)).toContain('RUJUKAN_PANJANG');

    const kunci = kasusMinimal();
    const soal = kunci.soal[0];
    if (soal === undefined) throw new Error('kasus contoh harus punya soal');
    soal.penjelasan = `Karena [[harga-akhir|${'c'.repeat(40)}]].`;
    expect(kode(kunci)).toContain('RUJUKAN_PANJANG');
  });

  it('kasus DADA yang hidup lolos batas itu — label terpanjangnya 31 karakter', () => {
    const teks = [
      ...kasusAsliDada.fakta.filter((f) => f.awam !== null).map((f) => f.awam?.isi ?? ''),
      ...kasusAsliDada.soal.map((s) => s.penjelasan),
      ...kasusAsliDada.pembukaan.paragraf,
      ...kasusAsliDada.pembukaan.bisa_dibaca,
      ...kasusAsliDada.pembukaan.tidak_bisa_dibaca,
      ...kasusAsliDada.pembukaan.disingkirkan,
    ];
    const terpanjang = Math.max(
      ...teks.flatMap((t) => ambilRujukan(t).map((r) => r.teks.length)),
    );
    expect(terpanjang).toBeLessThanOrEqual(36);
  });

  it('menolak tanda tebal di teks yang dirender apa adanya', () => {
    const kasus = kasusMinimal();
    const soal = kasus.soal[0];
    if (soal === undefined) throw new Error('kasus contoh harus punya soal');
    soal.penjelasan = 'Perhatikan apa yang **tidak** ada di kartu ini.';
    expect(kode(kasus)).toContain('TEKS_DITEBALKAN');
    expect(pesan(kasus)).toContain('penjelasan "s1"');
  });

  it('kedua berkas kasus yang ikut repo tidak memuat satu tanda tebal pun', () => {
    expect(JSON.stringify(kasusAsliDada)).not.toContain('**');
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

describe('A4-T3 — keterangan fakta harus berbahasa orang', () => {
  /** Fakta turunan dengan keterangan yang bisa diatur, dipasang sebagai kartu. */
  function dengan(keterangan: string): Kasus {
    const kasus = kasusMinimal();
    kasus.fakta[1] = fakta({
      fact_id: 'harga-akhir',
      nilai: 178,
      awam: { kepala: 'Data harga · 8 Okt 2025', isi: 'Harga kini [[harga-akhir|Rp178]].' },
      sumber: {
        jenis: 'turunan',
        endpoint: null,
        berkas: null,
        parameter: {},
        diambil_pada: null,
        keterangan,
      },
    });
    return kasus;
  }

  it('menolak tanggal ISO di tengah kalimat — persis yang dibaca pemilik di ponselnya', () => {
    const kasus = dengan('harga penutupan 2025-10-08 dibagi harga penutupan 2025-08-01');
    expect(kode(kasus)).toContain('KETERANGAN_TANGGAL_MESIN');
    expect(pesan(kasus)).toContain('2025-10-08');
    expect(pesan(kasus)).toContain('harga-akhir');
  });

  it('menerima kalimat yang sama sesudah tanggalnya dibahasakan', () => {
    const kasus = dengan('harga penutupan 8 Oktober 2025 dibagi harga penutupan 1 Agustus 2025');
    expect(kode(kasus)).not.toContain('KETERANGAN_TANGGAL_MESIN');
    expect(kode(kasus)).not.toContain('KETERANGAN_KODE_FAKTA');
  });

  it('menolak kode fakta mentah di dalam keterangan', () => {
    const kasus = dengan('penjumlahan fakta harga-awal dan harga-nanti');
    expect(kode(kasus)).toContain('KETERANGAN_KODE_FAKTA');
    expect(pesan(kasus)).toContain('harga-awal');
  });

  it('tidak mengeluh untuk kata berstrip biasa yang bukan kode fakta', () => {
    const kasus = dengan('rata-rata harga penutupan sepanjang 1 Agustus 2025 sampai hari beku');
    expect(kode(kasus)).not.toContain('KETERANGAN_KODE_FAKTA');
    expect(kode(kasus)).not.toContain('KETERANGAN_TANGGAL_MESIN');
  });

  it('membiarkan keterangan kosong (fakta bersumber API tidak punya cara hitung)', () => {
    const kasus = kasusMinimal();
    expect(kode(kasus)).not.toContain('KETERANGAN_TANGGAL_MESIN');
    expect(kode(kasus)).not.toContain('KETERANGAN_KODE_FAKTA');
  });
});

describe('D-2 v3 — pesan teman, judul pertanyaan, petunjuk', () => {
  it('menolak nama pengirim yang terlalu pendek', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.nama = 'B';
    expect(kode(kasus)).toContain('PESAN_NAMA');
  });

  it('menolak nama pengirim lebih dari 12 huruf', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.nama = 'Bayuuuuuuuuuu';
    expect(kode(kasus)).toContain('PESAN_NAMA');
  });

  it('menolak nama pengirim yang memuat angka', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.nama = 'Bayu99';
    expect(kode(kasus)).toContain('PESAN_NAMA');
  });

  it('menerima nama 2 dan 12 huruf — batasnya benar-benar di situ', () => {
    for (const nama of ['Bu', 'Bayu Pratama']) {
      const kasus = kasusMinimal();
      kasus.soal[0]!.pesan.nama = nama;
      kasus.soal[0]!.tanya = `Omongan ${nama} cocok dengan dokumennya?`;
      expect(kode(kasus), nama).not.toContain('PESAN_NAMA');
    }
  });

  it('menolak jam yang memakai titik dua, bukan titik', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.jam = '19:38';
    expect(kode(kasus)).toContain('PESAN_JAM');
  });

  it('menolak jam di luar 24 jam', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.jam = '24.00';
    expect(kode(kasus)).toContain('PESAN_JAM');
  });

  it('menolak pesan lebih dari 220 karakter polos', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.isi = 'a'.repeat(221);
    expect(kode(kasus)).toContain('PESAN_PANJANG');
  });

  it('menerima pesan tepat 220 karakter', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.isi = 'a'.repeat(220);
    expect(kode(kasus)).not.toContain('PESAN_PANJANG');
  });

  it('menolak tanda tebal di dalam pesan — angka di ucapan bukan fakta', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pesan.isi = 'Naiknya **22 kali** lho.';
    expect(kode(kasus)).toContain('PESAN_DITEBALKAN');
  });

  it('menolak tanda tebal di dalam opsi', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.pilihan[0]!.teks = 'Betul, naiknya **22 kali** memang begitu.';
    expect(kode(kasus)).toContain('OPSI_DITEBALKAN');
  });

  it('menolak judul pertanyaan lebih dari 60 karakter', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.tanya = `Omongan Bayu ${'a'.repeat(60)}?`;
    expect(kode(kasus)).toContain('TANYA_PANJANG');
  });

  it('menolak judul pertanyaan yang tidak menyebut nama pengirimnya', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.tanya = 'Mana yang paling tepat?';
    expect(kode(kasus)).toContain('TANYA_TANPA_NAMA');
  });

  it('menolak petunjuk di soal yang bukan pertama', () => {
    const kasus = kasusMinimal();
    kasus.soal.push({ ...kasus.soal[0]!, soal_id: 's2', petunjuk: 'Baca dulu ya.' });
    expect(kode(kasus)).toContain('PETUNJUK_BUKAN_SOAL_PERTAMA');
  });

  it('menolak soal pertama tanpa petunjuk', () => {
    const kasus = kasusMinimal();
    kasus.soal[0]!.petunjuk = null;
    expect(kode(kasus)).toContain('PETUNJUK_HILANG');
  });

  it('menerima soal kedua tanpa petunjuk', () => {
    const kasus = kasusMinimal();
    kasus.soal.push({ ...kasus.soal[0]!, soal_id: 's2', petunjuk: null });
    expect(kode(kasus)).not.toContain('PETUNJUK_BUKAN_SOAL_PERTAMA');
    expect(kode(kasus)).not.toContain('PETUNJUK_HILANG');
  });
});
