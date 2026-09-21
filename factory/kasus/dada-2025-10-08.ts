/**
 * Definisi kasus DADA beku 8 Oktober 2025, skema versi 2.
 *
 * Seluruh kalimat di berkas ini **ditulis manusia** dan diambil dari
 * `docs/kasus-dada-v2.md` (nol LLM di milestone ini). Yang tidak ditulis di sini
 * adalah angkanya: setiap angka berupa rujukan `[[fact_id|teks]]` ke fakta yang
 * dibangun pemuat dari `.cache/`, kecuali dua penanda yang bukan fakta:
 * `misal` (pengandaian) dan `hari-ini` (tanggal beku kasus).
 *
 * Yang sengaja berbeda dari `docs/kasus-dada.md` versi pertama, dan dicatat di
 * §9 kontrak:
 * 1. Soal berbentuk "omongan teman yang dicek ke kartu": tiap soal membawa 2–4
 *    kartu fakta tepat di atasnya, bukan sepuluh fakta sekaligus di layar sendiri.
 * 2. Fakta `fin-2024` (pendapatan dan laba 2024) tidak dipakai: tidak ada satu
 *    berkas pun di `.cache/` yang memuatnya.
 * 3. Soal 3 hanya memakai laporan yang lolos seluruh aturan verifikasi. Dua
 *    laporan yang tidak lolos (rangkaian 25 Agustus yang putus, laporan
 *    29 September yang menyebut harga di luar rentang hari itu) dipindahkan ke
 *    layar pembukaan sebagai pelajaran, bukan disembunyikan.
 */
import type { DefinisiKasus } from './bangun.ts';

const HARGA_AWAL = 'harga-2025-08-01';
const HARGA_T = 'harga-2025-10-08';
const HARI_BURSA = 'hari-bursa-2025-08-01-2025-10-08';
const KELIPATAN = 'kelipatan-2025-08-01-2025-10-08';
const SUSPENSI = 'susp-2025-06-30';
const DIVIDEN = 'div-2025-09-16';
const DIV_LOT = 'andai-10-lot-dividen';
const NILAI_LOT = 'andai-10-lot-nilai';
const JUAL_1 = 'fil-2025-08-25-03';
const JUAL_2 = 'fil-2025-08-25-04';
// Laporan aslinya, bukan fakta gabungan `fil-2025-09-01` (jenis turunan):
// hanya laporan asli yang boleh bergaris kepala utuh (dokumen soal, revisi
// 21 Sep malam).
const JUAL_3 = 'fil-2025-09-01-01';
const JUMLAH_JUAL = 'jumlah-jual-terverifikasi';

export const DADA_2025_10_08: DefinisiKasus = {
  kasus_id: 'dada-2025-10-08',
  judul: 'Perusahaan D: harga naik terus, siapa yang menjadi penjualnya?',
  emiten: {
    simbol: 'DADA',
    nama: 'PT Diamond Citra Propertindo Tbk',
    papan: 'Pengembangan',
    sektor: 'properti dan real estat',
  },
  nama_samaran: 'Perusahaan D',
  tanggal_t: '2025-10-08',
  turunan: [{ dari: '2025-08-01', sampai: '2025-10-08' }],
  turunan_pemain: {
    dividen: DIVIDEN,
    harga_t: HARGA_T,
    // Hanya laporan yang lolos seluruh aturan verifikasi yang boleh dijumlahkan.
    jual_terverifikasi: [JUAL_1, JUAL_2, JUAL_3],
    lot: 10,
  },

  pembuka: {
    hook:
      'Dalam [[' +
      HARI_BURSA +
      '|47 hari bursa]], harga saham sebuah perusahaan properti naik dari [[' +
      HARGA_AWAL +
      '|Rp8]] ke [[' +
      HARGA_T +
      '|Rp178]]. Grup obrolanmu ramai. Siapa yang omongannya cocok dengan data resmi?',
    aturan: [
      'Waktu dibekukan di [[hari-ini|8 Oktober 2025]]. Kamu hanya melihat apa yang publik tahu hari itu.',
      'Cek omongan teman ke kartu fakta di atas tiap soal. Ini bukan tebak harga.',
      'Sesudah tiga soal, kamu melihat apa yang terjadi berikutnya.',
    ],
  },

  // Gabungan seluruh `kartu`; validator menolak kalau tidak sama persis.
  fakta_terlihat: [KELIPATAN, SUSPENSI, DIVIDEN, DIV_LOT, JUAL_1, JUAL_2, JUAL_3, JUMLAH_JUAL],

  awam: {
    [KELIPATAN]: {
      kepala: 'Dihitung dari data harga · 1 Agu – 8 Okt 2025',
      isi:
        'Harga saham Perusahaan D naik dari [[' +
        HARGA_AWAL +
        '|Rp8]] ke [[' +
        HARGA_T +
        '|Rp178]] dalam [[' +
        HARI_BURSA +
        '|47 hari bursa]] — sekarang [[' +
        KELIPATAN +
        '|22 kali]] harga awalnya.',
    },
    [SUSPENSI]: {
      kepala: 'Pengumuman bursa · 30 Jun 2025',
      isi:
        'Bursa menghentikan sementara jual-beli saham ini karena perusahaan belum menyerahkan ' +
        'laporan keuangan tahunan yang sudah diaudit. Per [[' +
        HARGA_AWAL +
        '|1 Agustus]] sahamnya sudah diperdagangkan lagi.',
    },
    [DIVIDEN]: {
      kepala: 'Pengumuman dividen · tanggal ex 16 Sep 2025',
      isi:
        'Perusahaan D membagikan dividen tunai [[' +
        DIVIDEN +
        '|Rp0,14 per lembar]] (sebelum pajak).',
    },
    [DIV_LOT]: {
      kepala: 'Dihitung dari kartu di atas dan harga 8 Okt 2025',
      isi:
        'Untuk [[misal|10 lot]] ([[misal|1.000 lembar]]): dividennya [[' +
        DIV_LOT +
        '|Rp140]], sedangkan nilai [[misal|10 lot]] itu di harga [[' +
        HARGA_T +
        '|Rp178]] adalah [[' +
        NILAI_LOT +
        '|Rp178.000]].',
    },
    [JUAL_1]: {
      kepala: 'Laporan pemegang saham · terbit 25 Agu 2025',
      isi:
        'Pemilik terbesar Perusahaan D menjual [[' +
        JUAL_1 +
        '|70 juta lembar]] di harga [[' +
        JUAL_1 +
        '|Rp13]]. Transaksinya [[' +
        JUAL_1 +
        '|12 Agustus]].',
    },
    [JUAL_2]: {
      kepala: 'Laporan pemegang saham · terbit 25 Agu 2025',
      isi:
        'Ia menjual lagi [[' +
        JUAL_2 +
        '|179,5 juta lembar]] di harga [[' +
        JUAL_2 +
        '|Rp14]]. Transaksinya [[' +
        JUAL_2 +
        '|13 Agustus]].',
    },
    [JUAL_3]: {
      kepala: 'Laporan pemegang saham · terbit 1 Sep 2025',
      isi:
        'Ia menjual lagi [[' +
        JUAL_3 +
        '|50 juta lembar]] di harga [[' +
        JUAL_3 +
        '|Rp15]]. Transaksinya [[' +
        JUAL_3 +
        '|14 Agustus]].',
    },
    [JUMLAH_JUAL]: {
      kepala: 'Dihitung dari tiga laporan di atas',
      isi:
        'Tiga penjualan itu berjumlah [[' +
        JUMLAH_JUAL +
        '|299,5 juta lembar]], semuanya di harga [[' +
        JUAL_3 +
        '|Rp15]] ke bawah.',
    },
  },

  soal: [
    {
      soal_id: 's1-kata-bursa',
      kartu: [KELIPATAN, SUSPENSI],
      kartu_penentu: [SUSPENSI],
      istilah: [
        {
          kata: 'Penghentian sementara (suspensi)',
          arti: 'bursa menyetop jual-beli sebuah saham untuk sementara; pemiliknya tetap punya sahamnya, tetapi tidak bisa menjual atau membeli.',
        },
        {
          kata: 'Hari bursa',
          arti: 'hari ketika bursa buka, yaitu Senin–Jumat di luar hari libur.',
        },
      ],
      batang:
        'Hari ini [[hari-ini|8 Oktober 2025]]. Temanmu bilang: "Naik [[' +
        KELIPATAN +
        '|22 kali]] tuh pasti karena mau dibeli investor asing. Bursa juga udah kasih pengumuman soal saham ini." ' +
        'Dari kartu di atas, mana yang paling tepat?',
      pilihan: [
        {
          kunci: 'a',
          teks: 'Betul, pengumuman bursa itu memang soal rencana pembelian oleh investor asing.',
        },
        {
          kunci: 'b',
          teks: 'Keliru, pengumuman bursa itu soal laporan keuangan yang belum diserahkan.',
        },
        {
          kunci: 'c',
          teks:
            'Betul, pengumuman bursa itu menjelaskan kenapa harganya bisa naik [[' +
            KELIPATAN +
            '|22 kali]].',
        },
        {
          kunci: 'd',
          teks: 'Keliru, pengumuman bursa itu soal harga yang naik terlalu cepat.',
        },
      ],
      jawaban: 'b',
      penjelasan:
        'Bursa memang pernah mengumumkan sesuatu, tetapi isinya lain: jual-beli disetop karena ' +
        'laporan keuangan tahunan belum diserahkan. Tidak ada kata "investor asing" atau "akuisisi" ' +
        'di kartu mana pun. Kartu harga hanya memberi tahu bahwa harganya naik [[' +
        KELIPATAN +
        '|22 kali]], bukan kenapa. Salah-kaprah yang umum: menganggap harga yang naik sebagai ' +
        'semacam pengumuman, lalu mencocokkannya dengan kabar yang sedang ramai.',
      fact_ids: [KELIPATAN, SUSPENSI],
    },
    {
      soal_id: 's2-dividen-pemilik-kecil',
      kartu: [DIVIDEN, DIV_LOT],
      kartu_penentu: [DIV_LOT],
      istilah: [
        { kata: 'Lot', arti: 'satuan jual-beli saham; satu lot sama dengan seratus lembar.' },
        {
          kata: 'Tanggal ex',
          arti: 'mulai tanggal ini pembeli baru tidak lagi kebagian dividen tersebut; yang sudah pegang sebelumnya tetap kebagian.',
        },
      ],
      batang:
        'Hari ini [[hari-ini|8 Oktober 2025]]. Temanmu pegang [[misal|10 lot]] sejak Juli. Ia bilang: ' +
        '"Dividennya receh banget, buat bayar parkir motor aja kurang. Harga setinggi ini jelas bukan karena dividennya." ' +
        'Dari kartu di atas, mana yang paling tepat?',
      pilihan: [
        {
          kunci: 'a',
          teks: 'Betul, ia kebagian dividen dan jumlahnya cuma [[' + DIV_LOT + '|Rp140]].',
        },
        { kunci: 'b', teks: 'Betul, malah ia tidak kebagian karena tanggal ex-nya.' },
        {
          kunci: 'c',
          teks: 'Keliru, ia kebagian [[misal|Rp14.000]] untuk [[misal|10 lot]] miliknya.',
        },
        {
          kunci: 'd',
          teks: 'Keliru, [[' + DIV_LOT + '|Rp140]] itu sudah besar dibanding nilai sahamnya.',
        },
      ],
      jawaban: 'a',
      penjelasan:
        'Kartu kedua sudah menghitungnya: [[misal|1.000 lembar]] × [[' +
        DIVIDEN +
        '|Rp0,14]] = [[' +
        DIV_LOT +
        '|Rp140]], untuk saham yang nilainya [[' +
        NILAI_LOT +
        '|Rp178.000]] — kurang dari seperseribu nilainya. Temanmu betul, dan karena ia sudah pegang ' +
        'sejak sebelum tanggal ex, ia memang kebagian. Dividen adalah bagian laba yang benar-benar ' +
        'sampai ke pemilik saham; angka ini memperlihatkan bahwa harga [[' +
        HARGA_T +
        '|Rp178]] tidak ditopang pembagian laba. Salah-kaprah yang umum: menghitung dividen per lot, ' +
        'padahal dividen dihitung per lembar; dan mengira tanggal ex menggugurkan hak orang yang sudah ' +
        'lama pegang, padahal yang tidak kebagian hanya pembeli sesudah tanggal itu.',
      fact_ids: [DIVIDEN, DIV_LOT],
    },
    {
      soal_id: 's3-siapa-yang-menjual',
      kartu: [JUAL_1, JUAL_2, JUAL_3, JUMLAH_JUAL],
      kartu_penentu: [JUMLAH_JUAL],
      istilah: [
        {
          kata: 'Pemilik terbesar (pemegang saham pengendali)',
          arti: 'pihak dengan porsi saham paling besar, yang menentukan arah perusahaan. Setiap jual-belinya wajib dilaporkan dan diumumkan ke publik.',
        },
      ],
      batang:
        'Hari ini [[hari-ini|8 Oktober 2025]], harganya [[' +
        HARGA_T +
        '|Rp178]]. Temanmu bilang: "Pemilik terbesarnya tenang-tenang aja tuh, nggak kedengeran jual. ' +
        'Berarti dia yakin harganya masih bakal naik." Dari kartu di atas, mana yang paling tepat?',
      pilihan: [
        {
          kunci: 'a',
          teks: 'Betul, laporannya menunjukkan ia membeli lagi di harga belasan rupiah.',
        },
        {
          kunci: 'b',
          teks: 'Betul, laporannya menunjukkan ia membeli lagi di harga ratusan rupiah.',
        },
        {
          kunci: 'c',
          teks: 'Keliru, laporannya menunjukkan ia menjual banyak di harga belasan rupiah.',
        },
        {
          kunci: 'd',
          teks: 'Keliru, laporannya menunjukkan ia menjual banyak di harga ratusan rupiah.',
        },
      ],
      jawaban: 'c',
      penjelasan:
        'Ketiga kartu laporan itu penjualan, bukan pembelian: [[' +
        JUAL_1 +
        '|70 juta]], [[' +
        JUAL_2 +
        '|179,5 juta]], dan [[' +
        JUAL_3 +
        '|50 juta lembar]] — seluruhnya [[' +
        JUMLAH_JUAL +
        '|299,5 juta lembar]], semuanya di harga [[' +
        JUAL_1 +
        '|Rp13]] sampai [[' +
        JUAL_3 +
        '|Rp15]], jauh di bawah harga hari ini. Perhatikan juga tanggalnya: transaksinya terjadi [[' +
        JUAL_1 +
        '|12 Agustus]] sampai [[' +
        JUAL_3 +
        '|14 Agustus]], tetapi publik baru bisa membacanya pada [[' +
        JUAL_2 +
        '|25 Agustus]] dan [[' +
        JUAL_3 +
        '|1 September]], ketika laporannya terbit. Pemilik besar berhak menjual; yang perlu dibaca ' +
        'calon pembeli adalah siapa yang ada di sisi jual. Salah-kaprah yang umum: menganggap ' +
        '"nggak kedengeran jual" sama dengan "tidak menjual".',
      fact_ids: [JUAL_1, JUAL_2, JUAL_3, JUMLAH_JUAL],
    },
  ],

  pembukaan: {
    fact_ids: [
      'susp-2025-10-09',
      'harga-2025-10-10',
      'harga-2025-10-10-buka',
      'harga-2025-10-10-tertinggi',
      'volume-2025-10-10',
      'harga-2025-10-22',
      'fil-2025-10-19',
      'fil-2025-10-26',
      'rups-2026-07-16-kuorum',
    ],
    paragraf: [
      'Perusahaan D adalah PT Diamond Citra Propertindo Tbk, sandi DADA, tercatat di Papan Pengembangan.',
      'Sehari sesudah tanggal kasus, pada [[susp-2025-10-09|9 Oktober 2025]], bursa menyetop lagi jual-beli saham ini — ' +
        'kali ini karena harganya sudah naik terlalu jauh, supaya pasar mendingin dulu. ' +
        'Begitu dibuka kembali keesokan harinya, harga mulai di [[harga-2025-10-10-buka|Rp177]], sempat menyentuh [[harga-2025-10-10-tertinggi|Rp240]], lalu tutup di [[harga-2025-10-10|Rp152]]. ' +
        'Hari itu [[volume-2025-10-10|5.112.760.000 lembar]] berpindah tangan. Harga tertinggi kasus ini justru tercapai sehari sesudah bursa menghentikannya.',
      'Dua belas hari kemudian harga tinggal [[harga-2025-10-22|Rp50]]. ' +
        'Laporan pemilik terbesar yang terbit sesudah tanggal kasus memperlihatkan kelanjutannya: ' +
        '[[fil-2025-10-19|laporan 19 Oktober 2025]] dan [[fil-2025-10-26|laporan 26 Oktober 2025]].',
      'Rantai laporan itu sendiri tidak bersih. Enam transaksi yang dilaporkan malam itu terbit dua kali dengan jumlah, harga, dan urutan yang persis sama, ' +
        'dan ada dua lompatan saldo yang tidak dijelaskan laporan mana pun. Rinciannya ada di jejak verifikasi kasus ini, lengkap dengan angkanya.',
      'Setahun kemudian, rapat umum pemegang saham [[rups-2026-07-16-kuorum|16 Juli 2026]] gagal karena yang hadir ' +
        'hanya [[rups-2026-07-16-kuorum|22,32 persen]] saham, sehingga tidak ada satu pun agenda yang bisa diputuskan. ' +
        'Yang dihitung adalah jumlah saham yang hadir, bukan jumlah orang yang hadir.',
    ],
    bisa_dibaca: [
      'Pemilik terbesarnya sudah menjual [[' +
        JUMLAH_JUAL +
        '|ratusan juta lembar]] di harga belasan rupiah.',
      'Dividennya sangat kecil dibanding harganya: [[' +
        DIV_LOT +
        '|Rp140]] untuk saham senilai [[' +
        NILAI_LOT +
        '|Rp178.000]].',
      'Satu-satunya pengumuman bursa sebelum tanggal kasus berbicara tentang [[' +
        SUSPENSI +
        '|laporan keuangan yang terlambat]], bukan tentang akuisisi.',
    ],
    tidak_bisa_dibaca: [
      'Kapan harga berbalik, atau sampai berapa. Tidak satu pun kartu memuat itu, dan produk ini tidak pernah memintamu menebaknya.',
    ],
    disingkirkan: [
      'Dua laporan resmi dari periode yang sama tidak lolos pemeriksaan kami, jadi keduanya tidak pernah menjadi kartu. ' +
        'Rangkaian laporan [[fil-2025-08-25|25 Agustus]] putus di tengah: saldo [[fil-2025-08-25-01|laporan pertama]] tidak bersambung dengan [[fil-2025-08-25-02|laporan berikutnya]]. ' +
        'Dan laporan [[fil-2025-09-29|29 September]] menyebut harga [[fil-2025-09-29-01|Rp165]] pada hari ketika harga tertinggi di pasar hanya [[harga-2025-09-26-tertinggi|Rp163]]. ' +
        'Dokumen resmi pun perlu dihitung ulang; rinciannya ada di jejak verifikasi di bawah.',
    ],
  },

  kartu_konsep: [
    { kode: 'A2', judul: 'Lot dan lembar' },
    { kode: 'B1', judul: 'Dividen dan tanggal cum/ex' },
    { kode: 'C1', judul: 'Pengendali' },
    { kode: 'C3', judul: 'Tanggal transaksi dan tanggal laporan' },
    { kode: 'D1', judul: 'Suspensi' },
    { kode: 'D2', judul: 'Cooling down dan suspensi sampai pengumuman lebih lanjut' },
    { kode: 'D4', judul: 'Suspensi karena terlambat menyampaikan laporan' },
  ],

  disclaimer: [
    'Data di halaman ini menggambarkan keadaan pada 8 Oktober 2025 dan bukan kondisi perusahaan sekarang.',
    'Produk ini tidak menyarankan membeli atau menjual efek apa pun.',
    'Setiap angka di halaman ini bisa ditelusuri ke sumbernya.',
  ],
};
