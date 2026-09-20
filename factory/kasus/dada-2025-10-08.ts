/**
 * Definisi kasus DADA beku 8 Oktober 2025.
 *
 * Seluruh kalimat di berkas ini **ditulis manusia** dan diambil dari
 * `docs/kasus-dada.md` (D-6: tidak ada LLM di milestone ini). Yang tidak ditulis
 * di sini adalah angkanya: setiap angka berupa rujukan `[[fact_id|teks]]` ke
 * fakta yang dibangun pemuat dari `.cache/`.
 *
 * Tiga hal sengaja berbeda dari `docs/kasus-dada.md`, dan dicatat di §9 kontrak:
 * 1. Soal diubah menjadi pilihan ganda, karena skema T-02 mewajibkan `pilihan`
 *    dan `jawaban`; kalimat batang dan penjelasannya tetap kalimat pemilik.
 * 2. Fakta `fin-2024` (pendapatan dan laba 2024) tidak dipakai: tidak ada satu
 *    berkas pun di `.cache/` yang memuatnya, jadi ia tidak punya sumber maupun
 *    tanggal ketersediaan (OQ-1).
 * 3. Kartu konsep `E1 pendapatan dan laba` ikut dilepas karena fakta
 *    pendukungnya tidak ada.
 */
import type { DefinisiKasus } from './bangun.ts';

const HARGA_AWAL = 'harga-2025-08-01';
const HARGA_T = 'harga-2025-10-08';
const HARI_BURSA = 'hari-bursa-2025-08-01-2025-10-08';
const KELIPATAN = 'kelipatan-2025-08-01-2025-10-08';

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

  fakta_terlihat: [
    HARGA_AWAL,
    HARGA_T,
    HARI_BURSA,
    KELIPATAN,
    'susp-2025-06-30',
    'div-2025-09-16',
    'fil-2025-08-25',
    'fil-2025-09-01',
    'fil-2025-09-29',
    'saham-beredar',
  ],

  soal: [
    {
      soal_id: 's1-sinyal-resmi',
      batang:
        'Beredar kabar di media sosial bahwa Perusahaan D akan dibeli investor besar dari luar negeri. ' +
        'Dari daftar fakta di atas, mana yang berasal dari perusahaan atau bursa, dan adakah yang mendukung kabar itu?',
      pilihan: [
        {
          kunci: 'a',
          teks: 'Ada. Kenaikan harga terus-menerus sampai [[' +
            HARGA_T +
            '|Rp178]] adalah cara perusahaan mengumumkan rencana akuisisi.',
        },
        {
          kunci: 'b',
          teks: 'Tidak ada. Yang resmi hanya penghentian perdagangan oleh bursa, jadwal dividen, dan laporan transaksi pengendali; tidak satu pun menyebut rencana akuisisi.',
        },
        {
          kunci: 'c',
          teks: 'Ada. Laporan transaksi pengendali menyebut nama calon pembeli dari luar negeri.',
        },
        {
          kunci: 'd',
          teks: 'Tidak bisa dinilai, karena tidak ada satu pun informasi resmi tentang perusahaan ini.',
        },
      ],
      jawaban: 'b',
      penjelasan:
        'Harga penutupan naik [[' +
        KELIPATAN +
        '|22,25 kali lipat]] dalam [[' +
        HARI_BURSA +
        '|47 hari bursa]], dari [[' +
        HARGA_AWAL +
        '|Rp8]] ke [[' +
        HARGA_T +
        '|Rp178]]. Kenaikan harga adalah data pasar: ia memberi tahu bahwa banyak orang bertransaksi, bukan mengapa mereka bertransaksi. ' +
        'Yang benar-benar datang dari perusahaan atau bursa hanya [[susp-2025-06-30|penghentian perdagangan 30 Juni 2025 karena laporan keuangan auditan tahunan belum disampaikan]], ' +
        '[[div-2025-09-16|jadwal dividen dengan tanggal ex 16 September 2025]], dan [[fil-2025-09-01|laporan transaksi pengendali 1 September 2025]]. Tidak ada satu pun yang menyebut akuisisi.',
      fact_ids: [
        HARGA_AWAL,
        HARGA_T,
        HARI_BURSA,
        KELIPATAN,
        'susp-2025-06-30',
        'div-2025-09-16',
        'fil-2025-09-01',
      ],
    },
    {
      soal_id: 's2-hak-pemilik-kecil',
      batang:
        'Kamu memegang [[misal|10 lot]] atau [[misal|1.000 lembar]] saham Perusahaan D sejak sebelum ' +
        '[[div-2025-09-16|tanggal ex dividen 16 September 2025]]. Berapa dividen tunai yang kamu terima?',
      pilihan: [
        { kunci: 'a', teks: '[[misal|Rp140]]' },
        { kunci: 'b', teks: '[[misal|Rp1.400]]' },
        { kunci: 'c', teks: '[[misal|Rp14.000]]' },
        { kunci: 'd', teks: 'Tidak ada, karena perusahaan ini tidak pernah membagikan dividen.' },
      ],
      jawaban: 'a',
      penjelasan:
        '[[misal|1.000 lembar]] dikali [[div-2025-09-16|Rp0,14 per lembar]] sama dengan [[misal|Rp140]]. ' +
        'Dividen dihitung per lembar dan berasal dari laba perusahaan. ' +
        'Angka sekecil ini memperlihatkan bahwa kenaikan harga menuju [[' +
        HARGA_T +
        '|Rp178]] tidak datang dari pembagian laba.',
      fact_ids: ['div-2025-09-16', HARGA_T],
    },
    {
      soal_id: 's3-membaca-pemilik',
      batang:
        'Selama harga naik, apa yang dilakukan pemegang saham terbesar, dan pada harga berapa?',
      pilihan: [
        {
          kunci: 'a',
          teks: 'Menambah kepemilikan, seluruhnya pada harga di sekitar [[' + HARGA_T + '|Rp178]].',
        },
        {
          kunci: 'b',
          teks: 'Tidak melakukan transaksi apa pun sampai tanggal kasus ini.',
        },
        {
          kunci: 'c',
          teks:
            'Mengurangi kepemilikan, antara lain lewat [[fil-2025-09-01|laporan 1 September 2025 yang melepas 50.000.000 lembar pada harga Rp15]], ' +
            'jauh di bawah harga pasar pada tanggal kasus.',
        },
        {
          kunci: 'd',
          teks: 'Melepas seluruh sahamnya sebelum [[div-2025-09-16|tanggal ex dividen]].',
        },
      ],
      jawaban: 'c',
      penjelasan:
        'Pemegang saham besar berhak melepas sahamnya pada harga yang mereka sepakati; yang perlu dipahami pembeli baru adalah siapa yang menjadi penjual ketika mereka membeli. ' +
        'Perhatikan juga tanggalnya: transaksi baru diketahui publik ketika laporannya terbit. ' +
        'Transaksi di [[fil-2025-09-01|laporan 1 September 2025]] sudah terjadi pada pertengahan Agustus, ' +
        'sementara harga pada tanggal kasus sudah [[' +
        HARGA_T +
        '|Rp178]] per lembar. ' +
        'Dua laporan lain, [[fil-2025-08-25|laporan 25 Agustus 2025]] dan [[fil-2025-09-29|laporan 29 September 2025]], memang ada di daftar fakta, ' +
        'tetapi keduanya ditandai KONFLIK oleh jejak verifikasi kasus ini, jadi tidak dipakai sebagai dasar jawaban. Alasannya bisa dibaca di bagian jejak verifikasi.',
      fact_ids: ['fil-2025-09-01', HARGA_T],
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
      'Sehari setelah tanggal kasus, [[susp-2025-10-09|bursa menghentikan perdagangan saham ini pada 9 Oktober 2025 karena kenaikan harga kumulatif yang signifikan, dalam rangka cooling down]]. ' +
        'Ketika perdagangan dibuka lagi keesokan harinya, harga dibuka di [[harga-2025-10-10-buka|Rp177]], menyentuh [[harga-2025-10-10-tertinggi|Rp240]], lalu ditutup di [[harga-2025-10-10|Rp152]], ' +
        'dengan [[volume-2025-10-10|5.112.760.000 lembar]] berpindah tangan dalam satu hari. Harga tertinggi kasus ini tercapai sehari setelah bursa menghentikan perdagangannya.',
      'Dua belas hari kemudian harga tinggal [[harga-2025-10-22|Rp50]]. ' +
        'Laporan pengendali yang terbit sesudah tanggal kasus memperlihatkan kelanjutannya: ' +
        '[[fil-2025-10-19|laporan 19 Oktober 2025]] dan [[fil-2025-10-26|laporan 26 Oktober 2025]].',
      'Rantai laporan itu sendiri tidak bersih. Enam transaksi yang dilaporkan malam itu terbit dua kali dengan jumlah, harga, dan urutan yang persis sama, ' +
        'dan ada dua lompatan saldo yang tidak dijelaskan laporan mana pun. Rinciannya ada di jejak verifikasi kasus ini, lengkap dengan angkanya.',
      'Setahun kemudian, [[rups-2026-07-16-kuorum|rapat umum pemegang saham 16 Juli 2026 gagal mencapai kuorum karena yang hadir hanya 22,32 persen saham]], sehingga tidak ada agenda yang bisa diputuskan. ' +
        'Kuorum dihitung dari saham yang hadir, bukan dari jumlah orang yang hadir.',
    ],
  },

  kartu_konsep: [
    { kode: 'A2', judul: 'Lot dan lembar' },
    { kode: 'A4', judul: 'Kapitalisasi pasar' },
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
