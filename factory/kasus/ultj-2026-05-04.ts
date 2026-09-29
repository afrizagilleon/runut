/**
 * Kasus ULTJ — Senin, 4 Mei 2026 (M4 D-3).
 *
 * Golongan pelajarannya: **tanpa masalah yang terbaca di dokumen**. Labelnya
 * peristiwa, bukan penilaian — perusahaan membagi dividen tunai tiap tahun, dan
 * orang dalamnya melaporkan pembelian. Tidak satu kata penilaian saham pun
 * ("sehat", "bagus", "buruk") ada di berkas ini; yang menjaga itu bukan niat
 * melainkan satu grep di gate regresi. Satu-satunya pengecualian bernama:
 * frasa "kabar buruk" di soal 1 (M3.9 D-4) — ia menilai kabar yang
 * dibayangkan Nadia, bukan sahamnya (lihat `ultj.test.ts`).
 *
 * **Tidak ada satu angka pun yang ditulis di berkas ini.** Setiap angka yang
 * dibaca pemain adalah rujukan `[[fact_id|teks]]` ke fakta yang lahir di
 * `factory/muat/pustaka-gudang.ts` dari `.cache/sectors/ULTJ-*.json`, dan
 * validator menolak angka telanjang (INV-4). Yang ditulis manusia di sini
 * hanyalah kalimat.
 *
 * T = 4 Mei 2026 dipilih karena ia satu-satunya tanggal yang memegang **dua**
 * peristiwa sekaligus: tanggal ex dividen, dan laporan pembelian orang dalam
 * yang sudah terbit sebelumnya. Tanggal ex 15 Mei 2025 juga ada di dalam deret
 * harga, tetapi pada tanggal itu belum ada satu pun laporan kepemilikan di
 * cache — yang paling awal bertanggal 6 Januari 2026.
 */
import type { DefinisiKasusUmum } from './bangun.ts';
import {
  faktaHitung,
  faktaJumlah,
  faktaPemegangJendela,
  faktaSelisih,
} from '../muat/turunan-gudang.ts';

/* fact_id yang disebut lebih dari sekali; ditulis sekali supaya tidak bisa salah ketik. */
const DIV_T = 'div-2026-05-04';
/** Dividen 2025 yang tercatat — "Rp45" yang dikutip keliru di pesan soal 1. */
const DIV_2025 = 'div-2025-05-15';
const DIV_BAYAR = 'div-2026-05-04-bayar';
const DIV_RIWAYAT = 'dividen-tercatat';
const TAHUN_DIVIDEN = 'tahun-berdividen';
const HARGA_SEBELUM = 'harga-2026-04-30';
const BUKA_T = 'harga-2026-05-04-buka';
const TURUN = 'turun-2026-05-04';
const BEDA = 'beda-turun-dividen';
const BESAR = 'fil-jan-pemilik-terbesar';
const LAIN = 'fil-jan-orang-dalam-lain';
const TAMBAHAN = 'tambahan-jan-2026';
const LAPORAN_JAN = 'laporan-jan-2026';
/* Laporan pertama tiap pemegang; kartunya berlabuh di sana supaya garis kepalanya utuh. */
const LAPOR_BESAR_1 = 'fil-2026-01-06-01';
const LAPOR_BESAR_2 = 'fil-2026-01-07-01';
const LAPOR_LAIN_1 = 'fil-2026-01-06-02';
const LAPOR_LAIN_6 = 'fil-2026-01-22-01';

/** Dividen 2020–2026, menurut tanggal ex-nya. Urut, dan dipakai dua kartu. */
const DIVIDEN_TAHUNAN = [
  'div-2020-09-03',
  'div-2021-09-01',
  'div-2022-08-04',
  'div-2023-07-03',
  'div-2024-06-28',
  'div-2025-05-15',
  DIV_T,
] as const;

export const ULTJ_2026_05_04: DefinisiKasusUmum = {
  kasus_id: 'ultj-2026-05-04',
  judul: 'Perusahaan U: dividen tiap tahun, dan orang dalam yang membeli',
  simbol: 'ULTJ',
  emiten: {
    simbol: 'ULTJ',
    nama: 'PT Ultrajaya Milk Industry & Trading Company Tbk',
    papan: 'Utama',
    sektor: 'makanan dan minuman',
  },
  nama_samaran: 'Perusahaan U',
  tanggal_t: '2026-05-04',

  /*
   * M3.13 D-2: kalimat kedua "Kalimat resminya" kartu Riwayat dividen (soal 2)
   * ditandai membingungkan oleh ketiga penguji kartu M2d-4. Penggantinya
   * dipilih dari dua kalimat yang diuji 3 + 3 pembaca kartu Opus baru
   * (`eval/m313/kartu-ultj/`): keduanya dipahami 3/3 dan tidak mengubah
   * jawaban; yang ini lebih sedikit ditandai membingungkan (1/3 lawan 2/3).
   */
  perjelas_klaim: [
    {
      fact_id: DIV_RIWAYAT,
      lama: 'Daftar itu sendiri tidak bisa dibuktikan habis, jadi yang tercatat bukan tentu saja yang pernah terjadi.',
      baru: 'Daftar ini hanya memuat pembagian yang tercatat; kalau ada yang tidak tercatat, ia tidak terlihat di sini.',
    },
  ],

  /*
   * Alamat yang benar-benar ditarik, ditulis apa adanya. Menyusunnya sendiri
   * dari simbol emiten akan membuat jejak sumber terlihat pasti padahal ia
   * karangan.
   */
  sumber: {
    endpoint: {
      harga: '/v2/daily/ULTJ/',
      laporan: '/v2/filings/',
      aksi: '/v2/company/corporate-actions/ULTJ/',
      suspensi: '/v2/suspensions/',
    },
    parameter: { laporan: { symbol: 'ULTJ' } },
    /*
     * Sumber mengeja kedua orang ini dengan dua cara masing-masing ("Sabana
     * Prawira Widjaja" di laporan, "Sabana Prawirawidjaja" di potret
     * kepemilikan) — R22 menemukannya sendiri dan melaporkannya sebagai
     * peringatan. Kartu karena itu memakai peran, dan panel sumber di bawah
     * kartu harus menyebut pihak yang sama dengan sebutan yang sama.
     */
    peran: {
      'Sabana Prawira Widjaja': 'Pemilik terbesar',
      'Suhendra Prawira Widjaja': 'Orang dalam lain',
    },
  },

  turunan: (pustaka, data) => {
    const turun = faktaSelisih(pustaka, {
      fact_id: TURUN,
      dari: HARGA_SEBELUM,
      kurangi: BUKA_T,
      satuan: 'rupiah per lembar',
      sebutan: 'Jarak antara penutupan terakhir sebelum tanggal ex dan pembukaan hari ini',
    });
    const beda = faktaSelisih([...pustaka, turun], {
      fact_id: BEDA,
      dari: TURUN,
      kurangi: DIV_T,
      satuan: 'rupiah per lembar',
      sebutan: 'Jarak antara turunnya harga dan dividen per lembar',
    });
    const tahun = faktaHitung(pustaka, {
      fact_id: TAHUN_DIVIDEN,
      dari: [...DIVIDEN_TAHUNAN],
      satuan: 'tahun',
      sebutan: 'Tahun yang tercatat punya pembagian dividen tunai, beruntun tanpa lompatan',
    });

    const besar = faktaPemegangJendela(data, pustaka, {
      fact_id: BESAR,
      pemegang: 'Sabana Prawira Widjaja',
      dari: '2026-01-01',
      sampai: '2026-01-31',
      peran: 'Pemilik terbesar',
    });
    const lain = faktaPemegangJendela(data, pustaka, {
      fact_id: LAIN,
      pemegang: 'Suhendra Prawira Widjaja',
      dari: '2026-01-01',
      sampai: '2026-01-31',
      peran: 'Orang dalam lain',
    });
    const sejauhIni = [...pustaka, ...besar.fakta, ...lain.fakta];

    const jumlahLaporan = faktaHitung(pustaka, {
      fact_id: LAPORAN_JAN,
      dari: [...besar.laporan, ...lain.laporan],
      satuan: 'laporan',
      sebutan: 'Laporan kepemilikan orang dalam yang terbit Januari, seluruhnya pembelian',
    });
    const tambahan = faktaJumlah(sejauhIni, {
      fact_id: TAMBAHAN,
      dari: [BESAR, LAIN],
      satuan: 'lembar',
      sebutan: 'Lembar yang ditambahkan kedua orang dalam sepanjang bulan itu',
    });

    return [turun, beda, tahun, ...besar.fakta, ...lain.fakta, jumlahLaporan, tambahan];
  },

  /*
   * Layar pertama M3.9 D-4: judul dan ajakan sama dengan DADA; contoh
   * omongannya dibaca dari `soal[0].pesan` kasus ini (lihat `Pembuka`).
   */
  pembuka: {
    judul: 'Cek omongan saham di grup ke dokumen resminya.',
    ajak: 'Betul atau keliru?',
    menit: 5,
  },

  fakta_terlihat: [DIV_T, TURUN, DIV_RIWAYAT, TAHUN_DIVIDEN, LAPOR_BESAR_1, LAPOR_LAIN_1, TAMBAHAN],

  awam: {
    /*
     * Dua kartu soal 1, M3.9 D-4. Kepala dividen tanpa "ex": keputusan reviewer
     * 24 Sep sesudah K-06 — kata itu keluhan utama penguji ULTJ, dan isi
     * kartunya sudah mengatakan artinya ("Pembeli mulai hari ini tidak
     * kebagian"). Istilah "Tanggal ex" tetap ada untuk teks kunci.
     *
     * Kartu turun: angka yang dibaca pemain hanya Rp145; kedua harga asalnya
     * (penutupan 30 April Rp1.690, pembukaan hari ini Rp1.545) ada di panel
     * "Lihat cara menghitungnya" — kalimat resminya dan daftar "Dihitung dari".
     */
    [DIV_T]: {
      kepala: 'Pengumuman dividen · 4 Mei 2026',
      isi: `Dividen tunai [[${DIV_T}|Rp130 per lembar]]. Pembeli mulai hari ini tidak kebagian.`,
    },
    [TURUN]: {
      kepala: 'Dihitung dari data harga',
      isi: `Hari ini dibuka [[${TURUN}|Rp145]] di bawah penutupan terakhir.`,
    },
    [DIV_RIWAYAT]: {
      kepala: 'Riwayat dividen · 2020–2026',
      isi:
        'Tercatat satu pembagian dividen tunai di tiap tahun, menurut tanggal ex-nya: ' +
        `[[${DIVIDEN_TAHUNAN[0]}|2020 Rp12]], [[${DIVIDEN_TAHUNAN[1]}|2021 Rp85]], ` +
        `[[${DIVIDEN_TAHUNAN[2]}|2022 Rp25]], [[${DIVIDEN_TAHUNAN[3]}|2023 Rp30]], ` +
        `[[${DIVIDEN_TAHUNAN[4]}|2024 Rp40]], [[${DIVIDEN_TAHUNAN[5]}|2025 Rp45]], ` +
        `[[${DIV_T}|2026 Rp130]] per lembar.`,
    },
    [TAHUN_DIVIDEN]: {
      kepala: 'Dihitung dari riwayat di atas',
      isi:
        `[[${TAHUN_DIVIDEN}|Tujuh tahun berturut-turut]] ada pembagian. Jumlah per lembarnya ` +
        `tidak selalu naik: dari [[${DIVIDEN_TAHUNAN[1]}|Rp85 di 2021]] turun ke ` +
        `[[${DIVIDEN_TAHUNAN[2]}|Rp25 di 2022]], baru naik lagi tiap tahun sampai ` +
        `[[${DIV_T}|Rp130]].`,
    },
    [LAPOR_BESAR_1]: {
      kepala: 'Laporan pemilik terbesar · Jan',
      isi:
        `Pemilik terbesar Perusahaan U melaporkan [[${BESAR}-laporan|dua pembelian]], terbit ` +
        `[[${LAPOR_BESAR_1}|6]] dan [[${LAPOR_BESAR_2}|7 Januari 2026]]: ` +
        `[[${LAPOR_BESAR_1}|700.000]] lalu [[${LAPOR_BESAR_2}|300.000 lembar]]. Porsinya hanya ` +
        `naik sehelai — dari [[${BESAR}-persen-awal|53,16%]] ke ` +
        `[[${BESAR}-persen-akhir|53,17%]] — tapi itu [[${BESAR}|1 juta lembar]].`,
    },
    [LAPOR_LAIN_1]: {
      kepala: 'Laporan orang dalam lain · Jan',
      isi:
        `Seorang orang dalam lain melaporkan [[${LAIN}-laporan|enam pembelian]], terbit ` +
        `[[${LAPOR_LAIN_1}|6]] sampai [[${LAPOR_LAIN_6}|22 Januari 2026]]. Ia menambah ` +
        `[[${LAIN}|16,07 juta lembar]], dan porsinya bergerak dari ` +
        `[[${LAIN}-persen-awal|1,21%]] ke [[${LAIN}-persen-akhir|1,37%]].`,
    },
    [TAMBAHAN]: {
      kepala: 'Dihitung dari laporan di atas',
      isi:
        `[[${LAPORAN_JAN}|Kedelapan laporan]] itu pembelian. Pemilik terbesar menambah ` +
        `[[${BESAR}|1 juta lembar]] lewat [[${BESAR}-laporan|dua laporan]]; orang dalam lain ` +
        `menambah [[${LAIN}|16,07 juta lembar]] lewat [[${LAIN}-laporan|enam laporan]]. ` +
        `Seluruhnya [[${TAMBAHAN}|17,07 juta lembar]].`,
    },
  },

  soal: [
    /*
     * Soal 1 = pemanasan (M3.9 D-4, varian A uji K-06, disetujui pemilik
     * 24 Sep 2026). Versi lama bisa ditebak TANPA kartu (3/3 di uji tebak
     * buta); versi ini 0/3. Seluruh kata disalin PERSIS dari kontrak dan dijaga
     * huruf demi huruf oleh `soal1-k06.test.ts`.
     *
     * "Rp45" di pesan Nadia adalah dividen 2025 yang tercatat (kartu riwayat di
     * soal 2) — angka keliru yang sungguh ada, jangan "dibetulkan". Di opsi dan
     * teks kunci ia ditautkan ke fakta dividen 2025 itu, bukan ke `misal`:
     * mengetuknya membuka dokumen yang memang menulis Rp45. "Rp160" tidak
     * tercatat di mana pun, jadi ia pengandaian (`misal`).
     *
     * Kartu penentu (dividen hari ini) PERTAMA; kartu kedua kini kartu turun
     * (`turun-2026-05-04`), menggantikan kartu selisih `beda-turun-dividen`
     * yang menyebutkan jawabannya sendiri. Fakta selisih itu tetap lahir —
     * teks kunci merujuknya untuk "Rp15".
     */
    {
      soal_id: 'turun-di-tanggal-ex',
      kartu: [DIV_T, TURUN],
      istilah: [
        {
          kata: 'Tanggal ex',
          arti:
            'Mulai tanggal ini pembeli baru tidak lagi kebagian dividen yang sudah diumumkan; ' +
            'yang sudah pegang sebelumnya tetap kebagian. Uang sebesar dividen itu keluar dari ' +
            'kas perusahaan pada rangkaian tanggal ini, jadi harga per lembarnya menyesuaikan.',
        },
      ],
      pesan: {
        nama: 'Nadia',
        jam: '17.58',
        isi: 'Saham U dibuka anjlok Rp145, padahal dividennya Rp45. Pasti ada kabar buruk!',
      },
      tanya: 'Omongan Nadia cocok dengan dokumennya?',
      petunjuk: null,
      kartu_penentu: [DIV_T],
      pilihan: [
        {
          kunci: 'a',
          teks: `Betul, dividennya memang cuma [[${DIV_2025}|Rp45]] per lembar.`,
        },
        { kunci: 'b', teks: `Keliru, dividennya [[${DIV_T}|Rp130]], bukan [[${DIV_2025}|Rp45]].` },
        { kunci: 'c', teks: 'Betul, turunnya lebih dari tiga kali dividennya.' },
        { kunci: 'd', teks: `Keliru, dividennya [[misal|Rp160]], bukan [[${DIV_2025}|Rp45]].` },
      ],
      jawaban: 'b',
      penjelasan:
        `Nadia memakai angka yang keliru: dividen yang tanggal ex-nya hari ini ` +
        `[[${DIV_T}|Rp130 per lembar]], bukan [[${DIV_2025}|Rp45]]. Turunnya ` +
        `[[${TURUN}|Rp145]] hanya [[${BEDA}|Rp15]] lebih besar dari dividen itu (penutupan ` +
        `terakhir [[${HARGA_SEBELUM}|Rp1.690]], pembukaan hari ini [[${BUKA_T}|Rp1.545]]). ` +
        'Pada tanggal ex, uang sebesar dividen berpindah dari perusahaan ke pemilik saham, jadi ' +
        'harga per lembarnya menyesuaikan. Yang tidak dikatakan kartu mana pun: apakah sisa ' +
        `[[${BEDA}|Rp15]] itu punya sebab. Salah-kaprah yang umum: mencari kabar buruk untuk ` +
        'setiap penurunan harga sebelum mencocokkan angkanya dengan dokumen hari itu.',
      fact_ids: [DIV_T, TURUN],
    },
    {
      soal_id: 'riwayat-dividen',
      kartu: [DIV_RIWAYAT, TAHUN_DIVIDEN],
      istilah: [
        {
          kata: 'Per lembar',
          arti: 'Dividen dihitung untuk tiap satu lembar saham, bukan per lot dan bukan per orang.',
        },
      ],
      pesan: {
        nama: 'Fajar',
        jam: '18.11',
        isi:
          'Gue baru buka riwayat dividennya. Perusahaan U ini bagi dividen tiap tahun tanpa putus ' +
          'sejak 2020, dan jumlah per lembarnya naik terus tiap tahun. Rapi banget.',
      },
      tanya: 'Omongan Fajar cocok dengan dokumennya?',
      petunjuk: null,
      kartu_penentu: [TAHUN_DIVIDEN],
      pilihan: [
        { kunci: 'a', teks: 'Keliru, tiap tahun memang ada, tetapi jumlahnya pernah turun jauh.' },
        { kunci: 'b', teks: 'Betul, tiap tahun ada pembagian dan jumlahnya naik di tahun berikutnya.' },
        { kunci: 'c', teks: 'Betul, jumlahnya sempat datar dua tahun, tetapi tidak pernah turun.' },
        { kunci: 'd', teks: 'Keliru, ada satu tahun tanpa pembagian sama sekali di tengah deret.' },
      ],
      jawaban: 'a',
      penjelasan:
        'Setengah omongan Fajar cocok dengan dokumen: ada pembagian di tiap tahun, ' +
        `[[${TAHUN_DIVIDEN}|tujuh tahun berturut-turut]]. Setengahnya lagi tidak: jumlah per ` +
        `lembarnya pernah turun jauh, dari [[${DIVIDEN_TAHUNAN[1]}|Rp85 di 2021]] ke ` +
        `[[${DIVIDEN_TAHUNAN[2]}|Rp25 di 2022]], sebelum naik lagi tiap tahun sampai ` +
        `[[${DIV_T}|Rp130]]. Kartu kedua sudah membandingkan tahun demi tahun, jadi tidak ada ` +
        'yang perlu kamu hitung. Perhatikan juga apa yang tidak ada di kartu ini: berapa ' +
        'dividen tahun depan, dan kenapa jumlahnya berubah — dokumen hanya mencatat yang sudah ' +
        'terjadi. Salah-kaprah yang umum: satu kalimat yang setengahnya benar dibaca sebagai ' +
        'seluruhnya benar, dan bagian yang terdengar paling meyakinkan justru yang paling jarang ' +
        'dicek.',
      fact_ids: [DIV_RIWAYAT, TAHUN_DIVIDEN],
    },
    {
      soal_id: 'siapa-yang-membeli',
      kartu: [LAPOR_BESAR_1, LAPOR_LAIN_1, TAMBAHAN],
      istilah: [
        {
          kata: 'Orang dalam',
          arti: 'Pemilik besar, pengurus, atau pihak terafiliasi perusahaan; tiap jual-belinya wajib dilaporkan dan diumumkan ke publik.',
        },
      ],
      pesan: {
        nama: 'Rio',
        jam: '18.26',
        isi:
          'Jangan kegeeran dulu. Gue baca laporan Januari: pemilik terbesarnya yang 53 persen itu ' +
          'ikut beli juga, bukan cuma orang dalam yang porsinya kecil.',
      },
      tanya: 'Omongan Rio cocok dengan dokumennya?',
      petunjuk: null,
      kartu_penentu: [LAPOR_BESAR_1, TAMBAHAN],
      pilihan: [
        { kunci: 'a', teks: 'Keliru, pemilik terbesarnya tidak tercatat membeli satu lembar pun.' },
        { kunci: 'b', teks: 'Betul, pemilik terbesarnya tercatat membeli lewat satu laporan besar.' },
        { kunci: 'c', teks: 'Keliru, yang tercatat membeli bulan itu justru pemilik terbesar sendirian.' },
        { kunci: 'd', teks: 'Betul, pemilik terbesarnya tercatat membeli sejuta lembar di dua laporan.' },
      ],
      jawaban: 'd',
      penjelasan:
        'Rio betul, dan kartu pertama yang membuktikannya: pemilik terbesar memang tercatat ' +
        `membeli — [[${BESAR}-laporan|dua laporan]], [[${LAPOR_BESAR_1}|700.000]] lalu ` +
        `[[${LAPOR_BESAR_2}|300.000 lembar]], seluruhnya [[${BESAR}|1 juta lembar]] menurut kartu ` +
        `ketiga. Ia bukan satu-satunya: orang dalam lain menambah [[${LAIN}|16,07 juta lembar]] ` +
        `lewat [[${LAIN}-laporan|enam laporan]]. Perhatikan seberapa jauh angka itu menggerakkan ` +
        `porsi mereka — dari [[${BESAR}-persen-awal|53,16%]] ke [[${BESAR}-persen-akhir|53,17%]], ` +
        `dan dari [[${LAIN}-persen-awal|1,21%]] ke [[${LAIN}-persen-akhir|1,37%]]. Perhatikan juga ` +
        `tanggalnya: [[${LAPORAN_JAN}|kedelapan laporan]] itu terbit Januari, hampir empat bulan ` +
        'sebelum hari ini. Kenapa mereka membeli, dan apa artinya untuk harga, tidak ada di ' +
        'dokumen mana pun. Salah-kaprah yang umum: membaca "orang dalam membeli" sebagai satu ' +
        'blok besar, tanpa melihat siapa, berapa, dan kapan laporannya terbit.',
      fact_ids: [LAPOR_BESAR_1, TAMBAHAN],
    },
  ],

  pembukaan: {
    fact_ids: [
      'harga-2026-05-05',
      'fil-2026-05-22-01',
      'harga-2026-06-08',
      'harga-2026-06-08-terendah',
      'harga-2026-09-18',
      'harga-2026-09-18-tertinggi',
      'volume-2026-09-17',
      'volume-2026-09-18',
      'rups-2026-10-27',
    ],
    paragraf: [
      '[[harga-2026-05-05|Hari bursa berikutnya]] ditutup [[harga-2026-05-05|Rp1.700]], di atas ' +
        `[[${HARGA_SEBELUM}|Rp1.690]] — penutupan terakhir sebelum tanggal ex.`,
      'Terbit lagi satu laporan pembelian orang dalam, ' +
        `[[fil-2026-05-22-01|3.000.000 lembar]]; [[${DIV_BAYAR}|di hari yang sama]] dividen ` +
        `[[${DIV_T}|Rp130 per lembar]] dibayarkan.`,
      '[[harga-2026-06-08-terendah|Harga menyentuh Rp1.210]] di dalam hari dan ditutup ' +
        '[[harga-2026-06-08|Rp1.245]], angka terendah sepanjang deret tahun itu.',
      '[[harga-2026-09-18-tertinggi|Harga menyentuh Rp2.190]] dan ditutup ' +
        '[[harga-2026-09-18|Rp2.060]], tertinggi sepanjang deret; volume sehari ' +
        '[[volume-2026-09-18|123.380.100 lembar]], enam kali volume ' +
        '[[volume-2026-09-17|hari sebelumnya]].',
      '[[rups-2026-10-27|Satu rapat pemegang saham]] lagi dijadwalkan. Teks keputusannya ' +
        'belum ada di data mana pun, jadi isinya tidak bisa dikutip di sini.',
    ],
    bisa_dibaca: [
      `Dividen tunai [[${DIV_T}|Rp130 per lembar]] dengan tanggal ex hari ini; pembagian yang ` +
        `tercatat di [[${TAHUN_DIVIDEN}|tujuh tahun beruntun]]; dan ` +
        `[[${LAPORAN_JAN}|delapan laporan orang dalam]] yang terbit Januari, seluruhnya ` +
        `pembelian — [[${TAMBAHAN}|17,07 juta lembar]].`,
      `Turunnya harga pada tanggal ex, kalau dibandingkan: [[${TURUN}|Rp145]] terasa seperti ` +
        `kabar sampai diletakkan di sebelah [[${DIV_T}|Rp130]] yang sudah tertulis di pengumuman ` +
        'dividen, tiga baris di atasnya.',
    ],
    tidak_bisa_dibaca: [
      'Ke mana harga akan bergerak. Pada [[harga-2026-06-08|8 Juni harga tutup Rp1.245]], lebih ' +
        'rendah daripada hari ini; pada [[harga-2026-09-18|18 September Rp2.060]], lebih tinggi. ' +
        'Tidak satu pun kartu memuat itu, dan produk ini tidak pernah memintamu menebaknya.',
      'Kenapa orang dalam membeli. Laporan mencatat berapa lembar dan kapan, tidak pernah ' +
        'alasannya — dan tidak ada dokumen lain di data ini yang mengatakannya.',
    ],
    disingkirkan: [
      'Nama orang tidak dipakai kartu mana pun. Sumber mengeja orang yang sama dengan dua cara, ' +
        'sehingga satu orang bisa terbaca sebagai dua; kartu memakai perannya — pemilik terbesar, ' +
        'orang dalam lain. Pemeriksaan kami sendiri yang menemukannya, dan ia ada di jejak di bawah.',
      'Harga yang ditulis laporan juga tidak dipakai. Satu laporan Januari menulis harga rata-rata ' +
        'jauh di bawah harga tiap butir transaksinya sendiri, karena butir yang harganya kosong ikut ' +
        'dihitung sebagai nol. Yang dipakai kartu hanya jumlah lembar dan porsinya.',
      'Rantai laporan orang dalam lain putus sesudah hari ini: ada lembar yang bertambah tanpa ' +
        'laporan di antaranya. Karena putusnya sesudah hari ini, tidak ada kartu yang terkena — dan ' +
        'tidak ada butir garis waktu di atas yang menjumlahkan melintasi jeda itu.',
      'Laba per lembar tidak dijadikan kartu. Penyebutnya berganti antar tahun, jadi dua angkanya ' +
        'tidak bisa dibandingkan langsung; dan tanggal terbit laporan keuangan tahunan tidak ada di ' +
        'data mana pun, jadi tidak bisa dipastikan angka itu sudah bisa dibaca hari ini.',
    ],
  },

  penutup: {
    kepala: 'Ini simulasi yang kedua.',
    isi: 'Simulasi lain: perusahaan yang harganya melonjak sementara pemilik besarnya menjual.',
  },

  kartu_konsep: [
    { kode: 'B1', judul: 'Dividen dan tanggal cum/ex' },
    { kode: 'C1', judul: 'Pengendali' },
    { kode: 'C3', judul: 'Tanggal transaksi dan tanggal laporan' },
  ],

  disclaimer: [
    'Data di halaman ini menggambarkan keadaan pada 4 Mei 2026 dan bukan kondisi perusahaan sekarang.',
    'Produk ini tidak menyarankan membeli atau menjual efek apa pun.',
    'Setiap angka di halaman ini bisa ditelusuri ke sumbernya.',
  ],
};
