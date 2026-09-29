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

  /*
   * Layar pertama M3.9 (varian A uji K-06, disetujui pemilik 24 Sep 2026):
   * judul, satu contoh omongan, lalu ajakan. Contoh omongannya TIDAK ditulis
   * di sini — layar pertama membacanya dari `soal[0].pesan`, jadi keduanya
   * tidak bisa berselisih kata.
   *
   * Kalimat M3.5 ("Teman-temanmu di grup lagi ngomongin…") diganti karena data
   * alpha 23 Sep: 13 orang asing, nol selesai, dan tiga orang uji duduk balik
   * bertanya "ini aplikasi apa?". Di uji K-06, "ini apa" terjawab 9/10 dengan
   * judul ini, 10/20 dengan kalimat lama. Kata-katanya disalin PERSIS dari
   * kontrak M3.9 D-4; satu frasa bisa membalik uji tebak buta.
   *
   * Tanpa rujukan angka: layar ini belum punya kartu, dan angka bertaut yang
   * tidak bisa dibuka adalah janji kosong.
   */
  pembuka: {
    judul: 'Cek omongan saham di grup ke dokumen resminya.',
    ajak: 'Betul atau keliru?',
    /*
     * Median durasi penyelesai di data alpha ±5–10 menit; baris meta menulis
     * "sekitar 5 menit" supaya janjinya tidak lebih panjang daripada
     * kenyataannya.
     */
    menit: 5,
  },

  // Gabungan seluruh `kartu`; validator menolak kalau tidak sama persis.
  fakta_terlihat: [KELIPATAN, SUSPENSI, DIVIDEN, DIV_LOT, JUAL_1, JUAL_2, JUAL_3, JUMLAH_JUAL],

  awam: {
    /*
     * Kedua kartu soal 1 ditulis ulang di M3.9 D-4 (varian A uji K-06),
     * disalin persis dari kontrak. Keduanya hanya tampil di soal 1 — sebagai
     * kartu dan sebagai salinan "Kartu yang menentukan"; kepalanya tidak
     * berubah, jadi daftar "Dihitung dari" di layar lain tetap sama.
     */
    [KELIPATAN]: {
      kepala: 'Dihitung dari data harga',
      isi:
        '[[' +
        HARGA_AWAL +
        '|Rp8]] pada [[' +
        HARGA_AWAL +
        '|1 Agustus]], [[' +
        HARGA_T +
        '|Rp178]] hari ini: naik [[' +
        KELIPATAN +
        '|22 kali]].',
    },
    [SUSPENSI]: {
      kepala: 'Pengumuman bursa · 30 Jun 2025',
      isi:
        'Bursa menyetop sementara jual-beli saham ini: laporan keuangan tahunannya belum ' +
        'diserahkan. Per [[' +
        HARGA_AWAL +
        '|1 Agustus]] dibuka lagi.',
    },
    [DIVIDEN]: {
      kepala: 'Pengumuman dividen · ex 16 Sep 2025',
      isi:
        'Perusahaan D membagikan dividen tunai [[' +
        DIVIDEN +
        '|Rp0,14 per lembar]] (sebelum pajak).',
    },
    [DIV_LOT]: {
      kepala: 'Dihitung dari kartu di atas',
      isi:
        'Untuk [[misal|10 lot]] ([[misal|1.000 lembar]]): dividennya [[' +
        DIV_LOT +
        '|Rp140]], sedangkan nilai [[misal|10 lot]] itu di harga hari ini, [[' +
        HARGA_T +
        '|Rp178]], adalah [[' +
        NILAI_LOT +
        '|Rp178.000]].',
    },
    [JUAL_1]: {
      kepala: 'Laporan pemilik · terbit 25 Agu 2025',
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
      kepala: 'Laporan pemilik · terbit 25 Agu 2025',
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
      kepala: 'Laporan pemilik · terbit 1 Sep 2025',
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
    /*
     * Soal 1 = pemanasan (M3.9 D-4, varian A uji K-06, disetujui pemilik
     * 24 Sep 2026). Seluruh kata disalin PERSIS dari kontrak dan dijaga huruf
     * demi huruf oleh `soal1-k06.test.ts`; jangan "dirapikan" — satu frasa
     * bisa membalik uji tebak buta.
     *
     * Kartu penentu (pengumuman bursa) kini PERTAMA: di 360 × 640 ia terlihat
     * utuh tanpa menggulir. Tanpa istilah dan tanpa petunjuk: cara mainnya
     * dikatakan layar pertama dan kalimat pengantar.
     */
    {
      soal_id: 's1-kata-bursa',
      kartu: [SUSPENSI, KELIPATAN],
      kartu_penentu: [SUSPENSI],
      istilah: [],
      petunjuk: null,
      /*
       * Pesan teman: angka di dalamnya UCAPAN, bukan fakta. Tidak ditebalkan,
       * tidak ditautkan (INV-4) — "22 kali" di sini adalah klaim Bayu, dan
       * kartu harga di bawahnyalah yang boleh berbicara sebagai bukti.
       */
      pesan: {
        nama: 'Bayu',
        jam: '19.38',
        isi: 'Saham D naik 22 kali! Pasti mau dibeli investor asing, bursa udah umumin.',
      },
      /*
       * M3.13 D-1 (varian V1): dulu "Omongan Bayu cocok dengan dokumennya?".
       * Pesan Bayu memuat klaim yang benar (naik 22 kali) dan yang keliru
       * (pengumuman investor asing); "cocok" tidak memakai kata pilihan, dan
       * 16 dari 40 pemain alpha memilih c. Judul baru bertanya vonis dengan
       * kata yang sama dengan pilihan. Dipilih menurut aturan yang ditulis
       * sebelum uji (`eval/m313/soal1/`); dijaga `soal1-k06.test.ts`.
       */
      tanya: 'Menurut dokumennya, omongan Bayu betul atau keliru?',
      pilihan: [
        { kunci: 'a', teks: 'Betul, pengumuman bursanya soal investor asing.' },
        { kunci: 'b', teks: 'Keliru, pengumumannya soal laporan keuangan telat.' },
        {
          kunci: 'c',
          // Opsi dirender polos (INV-4); penandanya hanya jejak untuk validator.
          teks: 'Betul, pengumuman itu yang bikin harganya naik [[' + KELIPATAN + '|22 kali]].',
        },
        { kunci: 'd', teks: 'Keliru, pengumumannya soal harga yang naik terlalu cepat.' },
      ],
      jawaban: 'b',
      penjelasan:
        'Bursa memang pernah mengumumkan sesuatu, tetapi isinya lain dari yang dikira Bayu: ' +
        'jual-beli disetop karena laporan keuangan tahunan belum diserahkan. Tidak ada kata ' +
        '"investor asing" di kartu mana pun. Kartu harga hanya memberi tahu bahwa harganya naik [[' +
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
      petunjuk: null,
      pesan: {
        nama: 'Dimas',
        jam: '19.42',
        isi:
          'Gue pegang 10 lot dari Juli. Dividennya receh banget, buat bayar parkir motor aja kurang. ' +
          'Harga setinggi ini jelas bukan karena dividennya.',
      },
      tanya: 'Omongan Dimas cocok dengan dokumennya?',
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
        '|Rp178.000]] — kurang dari seperseribu nilainya. Dimas betul, dan karena ia sudah pegang ' +
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
      petunjuk: null,
      pesan: {
        nama: 'Rara',
        jam: '19.47',
        isi:
          'Harganya udah Rp178 lho. Pemilik terbesarnya aja tenang-tenang, nggak kedengeran jual. ' +
          'Berarti dia yakin harganya masih bakal naik.',
      },
      tanya: 'Omongan Rara cocok dengan dokumennya?',
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
      'Sehari sesudah tanggal simulasi, pada [[susp-2025-10-09|9 Oktober 2025]], bursa menyetop lagi jual-beli saham ini — ' +
        'kali ini karena harganya sudah naik terlalu jauh, supaya pasar mendingin dulu. ' +
        'Begitu dibuka kembali keesokan harinya, harga mulai di [[harga-2025-10-10-buka|Rp177]], sempat menyentuh [[harga-2025-10-10-tertinggi|Rp240]], lalu tutup di [[harga-2025-10-10|Rp152]]. ' +
        'Hari itu [[volume-2025-10-10|5.112.760.000 lembar]] berpindah tangan. Harga tertinggi di simulasi ini justru tercapai sehari sesudah bursa menghentikannya.',
      'Dua belas hari kemudian harga tinggal [[harga-2025-10-22|Rp50]]. ' +
        'Laporan pemilik terbesar yang terbit sesudah tanggal simulasi memperlihatkan kelanjutannya: ' +
        '[[fil-2025-10-19|laporan 19 Oktober 2025]] dan [[fil-2025-10-26|laporan 26 Oktober 2025]].',
      'Laporan-laporan itu sendiri tidak bersih. Enam transaksi yang dilaporkan malam itu terbit dua kali dengan jumlah, harga, dan urutan yang persis sama, ' +
        'dan ada dua lompatan saldo yang tidak dijelaskan laporan mana pun. Rinciannya ada di jejak verifikasi simulasi ini, lengkap dengan angkanya.',
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
      'Satu-satunya pengumuman bursa sebelum tanggal simulasi berbicara tentang [[' +
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

  /*
   * M4 D-4. Kalimat lamanya berbunyi "Kasus berikutnya adalah perusahaan yang
   * **sehat** — sedang kami siapkan", dan ia salah dua kali: "sehat" adalah
   * penilaian saham, sedangkan label sebuah kasus di produk ini selalu
   * peristiwanya; dan "sedang kami siapkan" sudah tidak benar sejak kasus
   * keduanya ada.
   */
  penutup: {
    kepala: 'Tidak semua saham seperti ini.',
    isi: 'Simulasi berikutnya: perusahaan yang membagi dividen tiap tahun. Selamat belajar membaca data.',
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
