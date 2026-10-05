/**
 * Lampiran penyetuju — Perusahaan A, Senin 15 Juni 2026.
 *
 * **DIGANTIKAN — berkas ini tidak lagi membangun kasus yang dimainkan.**
 * Sejak M2d-29 lampiran terdaftar untuk `amag-2026-06-15` adalah tulisan agent
 * (`amag-2026-06-15.ts`, dari percobaan `m2d29-amag-lengkapi-3`). Lampiran
 * tulisan tangan di bawah disimpan apa adanya karena tes tahap "lengkapi"
 * (`factory/llm/agen/lengkapi.test.ts`) memakainya sebagai contoh lampiran
 * tulisan tangan yang lolos aturan kasus. Komentar di bawah yang menyebut
 * `amag.test.ts` menggambarkan keadaan saat ia masih terpasang: tes itu kini
 * menghitung ulang lampiran tulisan agent, bukan berkas ini.
 *
 * Tiga omongan kasus ini DITULIS AI AGENT (`npm run agen`, jalan
 * `m2d26-amag-1` dan peningkatannya di M2d-27): pesan, keempat pilihan, kunci,
 * penjelasan, kartu, dan kartu penentu ada di bank omongan dan dipakai apa
 * adanya oleh `factory/kasus/dari-agen.ts`. **Tidak ada satu kalimat agent pun
 * di berkas ini.**
 *
 * Yang ada di sini adalah tulisan penyetuju: judul, teks kartu dalam bahasa
 * sehari-hari, istilah, judul pertanyaan, layar pembukaan (apa yang terjadi
 * SESUDAH 15 Juni 2026), penutup, dan kartu konsep. Seperti di kasus lain,
 * tidak ada angka telanjang: tiap angka yang dibaca pemain adalah rujukan
 * `[[fact_id|teks]]` ke fakta yang lahir dari `.cache/sectors/AMAG-*.json`.
 *
 * Golongan pelajarannya: **angka yang benar di baris yang salah**. Dua dari
 * tiga omongan cocok dengan dokumennya; yang ketiga memakai angka yang sungguh
 * tercatat, tetapi milik hari bursa sebelumnya.
 */
import type { LampiranPenyetuju } from '../dari-agen.ts';

/* fact_id yang disebut lebih dari sekali; semuanya id fakta paket agent. */
const H_MEI = 'harga-2026-05-29';
const H_AWAL_NAIK = 'harga-2026-06-08';
const H_12 = 'harga-2026-06-12';
const H_T = 'harga-2026-06-15';
const NAIK = 'hari-naik-beruntun';
const V_12 = 'volume-2026-06-12';
const V_T = 'volume-2026-06-15';
const DIV_DAFTAR = 'dividen-tercatat';
const DIV_2026 = 'div-2026-05-07';
const DIV_2025 = 'div-2025-05-14';

/* Fakta sesudah tanggal beku; hanya layar pembukaan yang boleh menautkannya. */
const H_17 = 'harga-2026-06-17';
const V_17 = 'volume-2026-06-17';
const H_18 = 'harga-2026-06-18';
const H_19 = 'harga-2026-06-19';
const H_23 = 'harga-2026-06-23';
const H_AKHIR = 'harga-2026-07-21';

export const LAMPIRAN_AMAG_2026_06_15_PENYETUJU: LampiranPenyetuju = {
  kasus_id: 'amag-2026-06-15',

  sumber: {
    paket: 'eval/penyusun/m2d26-amag-1/paket.json',
    paket_sha256: '40bccdb8f5412733fd2301665f7e8ea2707aedd06d2515d906f9aa83c2e3744e',
    bank: 'eval/bank-omongan',
    /*
     * Keenam berkas emiten ini di gudang (audit M4a). Paket yang dibaca agent
     * bisa dibangun ulang byte-identik dari keenamnya saja — dijaga
     * `amag.test.ts` — jadi tidak ada berkas lain yang ikut menentukan
     * angka kasus ini.
     */
    gudang: [
      { nama: 'AMAG-m4a-corpactions.json', sha256: 'b971ca1c44b22b5ce2c0e3b69323e41f1c6797f2e741b0b5de21255674e14b68' },
      { nama: 'AMAG-m4a-daily-2025-04-30.json', sha256: 'ad392f281f830d04a6884dec8d42e20dc87f2660fbed1be13689f4f361ee0c39' },
      { nama: 'AMAG-m4a-daily-2026-04-23.json', sha256: 'd16a6816d38bdfdd4c1036ebd8cab2e6c11f384c12b4ad7a9866cf9a8d334b82' },
      { nama: 'AMAG-m4a-filings-p0.json', sha256: '738fff6e95332ee3f19ed2500233eabd8aea7ed6f0bb5f008f8f14e80d531010' },
      { nama: 'AMAG-m4a-overview-financials.json', sha256: '62d9cf74fa6064588cbcb810687491224cad980efaa7323a368c10f9771f1591' },
      { nama: 'AMAG-m4a-ownership.json', sha256: '7f0cb005903dc2a849f7eb8c75fd3f38ac57b267ca8cb0032ecf6c9e1d8808b4' },
    ],
  },

  /* Label peristiwa, bukan penilaian — dan tidak membocorkan satu jawaban pun. */
  judul: 'Perusahaan A: harga naik lima hari beruntun, dan dividen tahun ini',

  /*
   * Disalin dari ringkasan emiten di gudang (`AMAG-m4a-overview-financials.json`:
   * listing_board "Development", sub_sector "Insurance"); pemuat tidak
   * membawa kedua medan itu.
   */
  emiten: { papan: 'Pengembangan', sektor: 'asuransi' },

  /*
   * Urutan main = urutan jam kirim (16.42, 18.15, 20.05), sama dengan kasus
   * lain. Kebetulan ia juga urutan kesulitan menurut jejak gerbang agent:
   * omongan Rara versi asal (penebak tanpa kartu masih bisa menebaknya, jadi
   * ia pemanasan dan contoh gelembung layar pertama — pesannya tanpa angka),
   * Dimas versi lebih sulit, Bayu versi sulit.
   */
  soal: [
    {
      id_omongan: '5e568a8ce3296708',
      soal_id: 'belum-balik-akhir-mei',
      tanya: 'Omongan Rara cocok dengan dokumennya?',
      istilah: [
        {
          kata: 'Harga penutupan',
          arti: 'Harga transaksi terakhir pada satu hari bursa. Angka inilah yang biasa dipakai untuk membandingkan satu hari dengan hari lain.',
        },
        {
          kata: 'Hari bursa',
          arti: 'Hari ketika bursa buka. Akhir pekan dan hari libur tidak dihitung, jadi tanggalnya bisa melompat.',
        },
      ],
    },
    {
      id_omongan: '25ddea4d9f1c3df0',
      soal_id: 'tujuh-kali-dividen',
      tanya: 'Omongan Dimas cocok dengan dokumennya?',
      istilah: [
        {
          kata: 'Aksi korporasi',
          arti: 'Tindakan perusahaan yang menyangkut pemegang sahamnya, misalnya membagi dividen. Semuanya dicatat dalam satu daftar.',
        },
        {
          kata: 'Tanggal ex',
          arti: 'Mulai tanggal ini pembeli baru tidak lagi kebagian dividen yang sudah diumumkan; yang sudah pegang sebelumnya tetap kebagian.',
        },
      ],
    },
    {
      id_omongan: 'e59779237448d406',
      soal_id: 'volume-hari-ini',
      tanya: 'Omongan Bayu cocok dengan dokumennya?',
      istilah: [
        {
          kata: 'Volume',
          arti: 'Jumlah lembar saham yang berpindah tangan dalam satu hari bursa.',
        },
        {
          kata: 'Lot',
          // Sengaja tidak menyebut satuan data ini: itu yang diuji pilihan d, dan kartunya sudah menulisnya.
          arti: 'Satuan jual-beli di bursa; satu lot berisi seratus lembar.',
        },
      ],
    },
  ],

  awam: {
    /*
     * Kartu harga dan volume: satu baris data per kartu, dengan tanggalnya di
     * kepala DAN di kalimat — tanggal itulah yang diuji ketiga soal. Kartu
     * 12 Juni menyebut dirinya "hari bursa sebelum hari ini" karena pilihan
     * agent memakai frasa "hari bursa sebelumnya"; tanpa itu pemain harus
     * menebak apakah ada hari bursa di antara Jumat dan Senin.
     */
    [H_MEI]: {
      kepala: 'Data harga harian · 29 Mei 2026',
      isi: `Harga penutupan [[${H_MEI}|29 Mei 2026]], hari bursa terakhir di bulan itu: [[${H_MEI}|Rp398 per lembar]].`,
    },
    [H_12]: {
      kepala: 'Data harga harian · 12 Jun 2026',
      isi: `Harga penutupan [[${H_12}|12 Juni 2026]], hari bursa sebelum hari ini: [[${H_12}|Rp390 per lembar]].`,
    },
    [H_T]: {
      kepala: 'Data harga harian · 15 Jun 2026',
      isi: `Harga penutupan hari ini, [[${H_T}|15 Juni 2026]]: [[${H_T}|Rp392 per lembar]].`,
    },
    [NAIK]: {
      kepala: 'Dihitung dari data harga',
      isi:
        `Dari penutupan [[${H_AWAL_NAIK}|8 Juni 2026]] ([[${H_AWAL_NAIK}|Rp356]]) sampai hari ini ` +
        `([[${H_T}|Rp392]]), harga penutupan naik [[${NAIK}|5 hari bursa]] berturut-turut.`,
    },
    [V_12]: {
      kepala: 'Data volume harian · 12 Jun 2026',
      isi: `Volume perdagangan [[${V_12}|12 Juni 2026]], hari bursa sebelum hari ini: [[${V_12}|12.000 lembar]].`,
    },
    [V_T]: {
      kepala: 'Data volume harian · 15 Jun 2026',
      isi: `Volume perdagangan hari ini, [[${V_T}|15 Juni 2026]]: [[${V_T}|50.600 lembar]].`,
    },
    /*
     * Kartu dividen sengaja TIDAK mengatakan mana yang "terbaru": itu yang
     * harus dibaca pemain dari tanggal ex-nya.
     */
    [DIV_DAFTAR]: {
      kepala: 'Daftar aksi korporasi · 2020–2026',
      isi:
        `Tercatat [[${DIV_DAFTAR}|7 pembagian]] dividen tunai, dari tanggal ex ` +
        `[[${DIV_DAFTAR}|29 Juli 2020]] sampai [[${DIV_DAFTAR}|7 Mei 2026]]. Daftar ini belum tentu lengkap.`,
    },
    [DIV_2026]: {
      kepala: 'Pengumuman dividen · ex 7 Mei 2026',
      isi: `Dividen tunai [[${DIV_2026}|Rp30 per lembar]] dengan tanggal ex [[${DIV_2026}|7 Mei 2026]].`,
    },
    [DIV_2025]: {
      kepala: 'Pengumuman dividen · ex 14 Mei 2025',
      isi: `Dividen tunai [[${DIV_2025}|Rp40 per lembar]] dengan tanggal ex [[${DIV_2025}|14 Mei 2025]].`,
    },
  },

  /*
   * Sesudah 15 Juni 2026 berkas gudang kasus ini hanya memuat harga dan volume
   * harian, sampai 21 Juli 2026. Tidak ada dividen ataupun rapat baru, dan
   * respons laporan kepemilikannya kosong (R25: kosong belum tentu berarti
   * tidak ada) — itu dikatakan apa adanya, bukan diisi cerita.
   * Tiap pernyataan "tertinggi", "terendah", dan "terakhir" di bawah dihitung
   * ulang dari berkas mentah oleh `amag.test.ts`.
   */
  pembukaan: {
    fact_ids: [H_17, V_17, H_18, H_19, H_23, H_AKHIR, 'div-2021-07-07'],
    paragraf: [
      `[[${H_17}|Baris harga berikutnya di data]], [[${H_17}|17 Juni 2026]]: harga ditutup ` +
        `[[${H_17}|Rp398]] — persis angka penutupan [[${H_MEI}|29 Mei]]. Hari itu hanya ` +
        `[[${V_17}|5.500 lembar]] yang berpindah tangan.`,
      `[[${H_18}|Sehari kemudian]] penutupannya tidak bergerak, tetap [[${H_18}|Rp398]] — rentetan ` +
        `naiknya berhenti di sini. Pada [[${H_19}|19 Juni]] harga turun ke [[${H_19}|Rp386]].`,
      `[[${H_23}|Penutupan tertinggi]] sesudah tanggal simulasi, sejauh data yang kami punya: ` +
        `[[${H_23}|Rp400]].`,
      `[[${H_AKHIR}|Baris harga terakhir di data kami]]: ditutup [[${H_AKHIR}|Rp392]], sama dengan ` +
        `penutupan pada tanggal simulasi. Di antara keduanya, penutupan hanya bergerak dari ` +
        `[[${H_19}|Rp386]] sampai [[${H_23}|Rp400]].`,
      'Selain harga dan volume harian itu, tidak ada yang tercatat sesudah tanggal simulasi di data ' +
        'kami: tidak ada pembagian dividen baru, tidak ada rapat pemegang saham baru. Laporan ' +
        'kepemilikan tidak terbaca satu pun untuk perusahaan ini — dan itu belum tentu berarti ' +
        'memang tidak ada.',
    ],
    bisa_dibaca: [
      `Harga penutupan naik [[${NAIK}|5 hari bursa]] berturut-turut sampai [[${H_T}|Rp392]], dan ` +
        `masih di bawah penutupan [[${H_MEI}|29 Mei]], [[${H_MEI}|Rp398]].`,
      `Daftar aksi korporasi mencatat [[${DIV_DAFTAR}|7 pembagian]] dividen tunai; yang terbaru ` +
        `[[${DIV_2026}|Rp30 per lembar]], lebih kecil dari [[${DIV_2025}|Rp40]] setahun sebelumnya.`,
      `Volume hari itu [[${V_T}|50.600 lembar]], bukan [[${V_12}|12.000 lembar]]. Angka kedua ` +
        'sungguh tercatat — satu baris di atasnya, milik hari bursa sebelumnya.',
    ],
    tidak_bisa_dibaca: [
      `Ke mana harga bergerak sesudahnya. Pada [[${H_23}|23 Juni penutupannya Rp400]], lebih ` +
        `tinggi daripada tanggal simulasi; pada [[${H_19}|19 Juni Rp386]], lebih rendah. Tidak satu ` +
        'pun kartu memuat itu, dan produk ini tidak pernah memintamu menebaknya.',
      'Kenapa dividen terbaru lebih kecil. Daftar aksi korporasi mencatat jumlah dan tanggalnya, ' +
        'tidak pernah alasannya.',
      'Siapa yang membeli dan siapa yang menjual selama harga naik. Untuk perusahaan ini tidak ' +
        'satu pun laporan kepemilikan terbaca di data kami, jadi tidak ada yang bisa dicocokkan — ' +
        'dan kosongnya data itu sendiri belum terbukti berarti tidak ada laporan.',
    ],
    disingkirkan: [
      'Ringkasan keputusan rapat pemegang saham bulan April tidak dijadikan kartu. Ringkasan itu ' +
        'menyebut tahun yang belum tiba pada tanggal simulasi, dan untuk salah satu agendanya ia ' +
        'sendiri menulis bahwa catatannya saling bertentangan.',
      'Perbandingan dividen dengan laba tidak dipakai kartu mana pun. Untuk ' +
        '[[div-2021-07-07|satu pembagian lama]], hitungan kami menghasilkan dividen yang lebih ' +
        'besar dari dua kali laba tahun bukunya. Bisa datanya, bisa cara kami memasangkan dividen ' +
        'dengan tahun bukunya yang keliru; rinciannya ada di jejak verifikasi di bawah.',
      'Lima dari tujuh pembagian di daftar itu terjadi di luar rentang harga harian yang kami ' +
        'punya, jadi pemeriksaan harga di sekitar tanggal ex-nya tidak bisa dijalankan. Karena itu ' +
        'tidak ada kartu yang membandingkan harga dengan dividen tahun-tahun lama.',
    ],
  },

  /*
   * Tanpa nomor urut ("simulasi yang ketiga"): penutup tampil ketika tidak ada
   * lagi simulasi yang belum dimainkan, dan urutan mainnya tidak tetap.
   */
  penutup: {
    kepala: 'Dua omongan cocok, satu meleset sebaris.',
    isi: 'Yang membedakannya bukan nada bicaranya, melainkan baris tanggal di dokumennya. Selamat belajar membaca data.',
  },

  /* Dari daftar kartu konsep yang sudah ada (`docs/kasus-dada.md`); tidak ada kode baru. */
  kartu_konsep: [
    { kode: 'A2', judul: 'Lot dan lembar' },
    { kode: 'B1', judul: 'Dividen dan tanggal cum/ex' },
  ],
};
