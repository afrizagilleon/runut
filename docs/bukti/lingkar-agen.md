# Bukti: lingkar agen penyusun simulasi (M2d-2)

Berkas ini ditulis oleh `npm run agen:laporan` dari keluaran mentah di `eval/keluaran-m2d2/` (riwayat tiap putaran, jejak langkah, ledger biaya, bahan dan jawaban mentah penguji eksternal). Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian sesudah "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d2/laporan-tangan.md`). Draf **tidak** dipasang ke produk.

## Lingkarnya

Satu model, `deepseek-ai/DeepSeek-V4.1-Flash` (pemenang uji tanding M2d-1), sebagai penyusun **dan** pemeriksa, lewat klien OpenAI-compatible buatan sendiri dan pagu dolar yang dicek kode sebelum setiap panggilan. Orkestrasinya `factory/llm/agen.ts`:

1. **susun** — penyusun (suhu 0,3, `max_tokens` 32.768) menulis SATU omongan per panggilan dari paket fakta yang sudah lolos mesin verifikasi V2, dengan omongan lain sebagai konteks;
2. **validator** deterministik (`validasi.ts`, M2d-1): setiap angka berjejak ke fakta, tanpa tanggal sesudah T, bentuk 2×2, kata terlarang;
3. **gerbang jawab-dengan-kartu** — satu pembaca baru yang memegang kartu omongan itu (suhu 0) harus memilih kunci; salah → ditolak (ambigu);
4. **gerbang tebak buta** — 3 penebak baru, masing-masing percakapan sendiri (suhu 1,0), hanya melihat pesan + pertanyaan + empat pilihan; ditolak bila ≥ 2 dari 3 benar atau rata-rata keyakinan penebak benar ≥ 40 (K-05);
5. omongan yang lolos ketiganya **dikunci kode**; yang ditolak mendapat umpan balik terstruktur (gerbang, alasan, tebakan) dan hanya ia yang ditulis ulang — paling banyak 5 putaran per simulasi.

Setiap langkah dicatat oleh kode saat terjadi di `eval/keluaran-m2d2/<paket>/jejak-agen.json` (skema `factory/llm/jejak-agen.skema.json`): waktu, jenis, model, token, biaya, putusan, alasan; prompt hanya sebagai sha256.

## Hasil per simulasi

| paket | T | fakta di paket / tersingkir / aturan R dijalankan | hasil | putaran | panggilan | token masuk / keluar | biaya (ledger) | waktu |
|---|---|---|---|---:|---:|---|---:|---:|
| TIRT | 10 Desember 2025 | 20 / 2 / 12 | tidak lolos (batas 5 putaran tercapai; omongan terkunci: 1, 2) | 5 | 56 | 101.440 / 389.968 | US$0.1727 | 63,8 menit |
| DADA | 8 Oktober 2025 | 14 / 4 / 23 | tidak lolos (batas 5 putaran tercapai; omongan terkunci: 1) | 5 | 70 | 115.026 / 493.650 | US$0.2317 | 84,0 menit |
| ULTJ | 4 Mei 2026 | 29 / 1 / 28 | tidak lolos (batas 5 putaran tercapai; omongan terkunci: tidak ada) | 5 | 54 | 143.226 / 478.301 | US$0.2325 | 102,3 menit |

**Total biaya milestone menurut ledger** (semua panggilan bertanda `agen/`): **US$1.0365** dalam 286 panggilan. Ledger kumulatif sejak M2d-1: US$2.2745 dari pagu US$5,00.

### Keputusan di dalam lingkar

Setiap versi omongan yang ditulis penyusun, dan di mana ia berhenti. Satu omongan bisa punya banyak versi (satu per putaran).

| paket | versi omongan diperiksa | tak terbaca / tak ada | ditolak validator | ditolak gerbang kartu | ditolak gerbang tebak | galat gerbang | lolos (dikunci) | panggilan penyusun terpotong / cadangan tanpa berpikir |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| TIRT | 10 | 1 | 0 | 0 | 7 | 0 | 2 | 5 / 5 |
| DADA | 14 | 0 | 3 | 0 | 10 | 0 | 1 | 3 / 4 |
| ULTJ | 15 | 1 | 6 | 1 | 7 | 0 | 0 | 4 / 5 |

### TIRT — putaran demi putaran

**Putaran 1** — menyusun omongan 1, 2, 3; US$0.0388, 684 s.

- validator: menolak (ada omongan yang tidak terbaca)
- omongan 1: **tidak-ada**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1197 (line 1 column 1198)
- omongan 2: **ditolak-tebak** · pembaca kartu memilih a (kunci a) · tebakan tanpa kartu a/80, a/78, a/85
  - pesan: "Eh, gue udah baca pengumuman bursanya. Setop hari ini gara-gara harganya naik 9 hari bursa berturut-turut, bukan karena perusahaannya kenapa-kenapa. Beda sama setop yang awal tahun ya." (kunci a)
- omongan 3: **ditolak-tebak** · pembaca kartu memilih c (kunci c) · tebakan tanpa kartu c/70, c/70, c/85
  - pesan: "Gue udah cek data hariannya. Volume hari ini nol lembar, sama kayak 25 November. Dari dulu emang nggak ada yang mau transaksi di saham ini." (kunci c)

**Putaran 2** — menulis ulang omongan 1, 2, 3; US$0.0594, 1537 s.

- validator: lolos
- omongan 1: **lolos** · pembaca kartu memilih b (kunci b) · tebakan tanpa kartu d/65, d/75, d/75
  - pesan: "Gue baca data harian. Harga cuma naik 2,21 persen dari 48 ke 106. Jadi setopnya kayak nggak masuk akal." (kunci b)
- omongan 2: **ditolak-tebak** · pembaca kartu memilih c (kunci c) · tebakan tanpa kartu c/70, c/60, c/78
  - pesan: "Gue baru ngeh, setop hari ini bukan yang pertama tahun ini. Awal tahun juga pernah disetop, tapi alasannya beda jauh. Yang sekarang gara-gara harganya naik terus." (kunci c)
- omongan 3: **ditolak-tebak** · pembaca kartu memilih b (kunci b) · tebakan tanpa kartu b/100 (tak terbaca), d/60, d/60
  - pesan: "Gue lihat data harian. Harga jatuh terus 9 hari bursa, pantas aja akhirnya disetop." (kunci b)

**Putaran 3** — menulis ulang omongan 2, 3; US$0.0418, 1162 s.

- validator: lolos
- omongan 2: **lolos** · pembaca kartu memilih a (kunci a) · tebakan tanpa kartu d/60, d/60, d/60
  - pesan: "Gue cek data harian, saham ini naiknya pelan banget, sehari cuma naik dikit-dikit. Nggak heran lama-lama disetop juga." (kunci a)
- omongan 3: **ditolak-tebak** · pembaca kartu memilih a (kunci a) · tebakan tanpa kartu b/65, a/70, a/60
  - pesan: "Gue baca pengumuman setop. Setop hari ini alasannya sama kayak setop awal tahun, yaitu karena keraguan atas kelangsungan usaha." (kunci a)

**Putaran 4** — menulis ulang omongan 3; US$0.0162, 204 s.

- validator: lolos
- omongan 3: **ditolak-tebak** · pembaca kartu memilih b (kunci b) · tebakan tanpa kartu b/90, b/95, b/90
  - pesan: "Gue lihat data harian, saham ini diam aja nggak ada yang transaksi pas hari disetop. Berarti nggak ada yang mau jual, aman dong." (kunci b)

**Putaran 5** — menulis ulang omongan 3; US$0.0165, 244 s.

- validator: lolos
- omongan 3: **ditolak-tebak** · pembaca kartu memilih a (kunci a) · tebakan tanpa kartu a/65, a/65, a/95
  - pesan: "Gue baca pengumuman bursa. Setop yang sekarang alasannya beda sama yang awal tahun, yang dulu gara-gara usaha perusahaannya diragukan. Yang sekarang mah cuma karena harganya naik terus." (kunci a)

### DADA — putaran demi putaran

**Putaran 1** — menyusun omongan 1, 2, 3; US$0.0211, 932 s.

- validator: menolak (ANGKA_TANPA_RUJUKAN)
- omongan 1: **ditolak-tebak** · pembaca kartu memilih a (kunci a) · tebakan tanpa kartu a/90, a/70, a/80
  - pesan: "Gue baca laporan pemilik terbesar, dia jualan terus-terusan. Tiga laporan, totalnya 299,5 juta lembar. Ngeri juga ya, segitu banyaknya." (kunci a)
- omongan 2: **ditolak-validator**
  - [validator ANGKA_TANPA_RUJUKAN] Pilihan a memuat angka di luar rujukan: 10. Tulis tiap angka sebagai [[fact_id/teks]].
  - [validator ANGKA_TANPA_RUJUKAN] Pilihan b memuat angka di luar rujukan: 10. Tulis tiap angka sebagai [[fact_id/teks]].
  - [validator ANGKA_TANPA_RUJUKAN] Pilihan d memuat angka di luar rujukan: 10. Tulis tiap angka sebagai [[fact_id/teks]].
- omongan 3: **ditolak-tebak** · pembaca kartu memilih b (kunci b) · tebakan tanpa kartu b/90, b/90, b/90
  - pesan: "Gue lihat harganya sekarang 178 rupiah, padahal awal Agustus masih 8 rupiah. Berarti naiknya sekitar 22 kali ya, dalam dua bulan doang." (kunci b)

**Putaran 2** — menulis ulang omongan 1, 2, 3; US$0.0598, 913 s.

- validator: menolak (ada omongan yang tidak terbaca)
- omongan 1: **ditolak-tebak** · pembaca kartu memilih b (kunci b) · tebakan tanpa kartu b/65, b/100 (tak terbaca), b/75
  - pesan: "Gue baca saham ini kena suspensi 30 Juni gara-gara laporan keuangan auditan belum masuk. Sampai sekarang, 8 Oktober, berarti belum bisa diperdagangkan dong?" (kunci b)
- omongan 2: **ditolak-tebak** · pembaca kartu memilih d (kunci d) · tebakan tanpa kartu d/80, d/85, d/80
  - pesan: "Pemilik terbesar katanya udah lepas 299.500.000 lembar saham. Segitu mah sisanya remahan dong, dia udah nggak punya banyak lagi." (kunci d)
- omongan 3: **ditolak-validator**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1640 (line 1 column 1641)

**Putaran 3** — menulis ulang omongan 1, 2, 3; US$0.0565, 1509 s.

- validator: menolak (ANGKA_TANPA_RUJUKAN)
- omongan 1: **ditolak-tebak** · pembaca kartu memilih b (kunci b) · tebakan tanpa kartu b/80, b/70, b/70
  - pesan: "Gue baca saham ini kena stop dulu 30 Juni gara-gara laporan keuangan auditan belum masuk. Terus 16 September udah bagi dividen. Berarti udah beres semua urusannya dong." (kunci b)
- omongan 2: **ditolak-validator**
  - [validator ANGKA_TANPA_RUJUKAN] Pilihan c memuat angka di luar rujukan: 299.500.000, 22. Tulis tiap angka sebagai [[fact_id/teks]].
  - [validator ANGKA_TANPA_RUJUKAN] Pilihan d memuat angka di luar rujukan: 299.500.000. Tulis tiap angka sebagai [[fact_id/teks]].
- omongan 3: **ditolak-tebak** · pembaca kartu memilih c (kunci c) · tebakan tanpa kartu a/60, c/95, a/70
  - pesan: "Gue pegang 10 lot saham ini. Dividen tunainya 0,14 rupiah per lembar, jadi gue dapat 140 rupiah sebelum pajak. Buat jajan di kantin aja nggak cukup." (kunci c)

**Putaran 4** — menulis ulang omongan 1, 2, 3; US$0.0482, 1081 s.

- validator: lolos
- omongan 1: **lolos** · pembaca kartu memilih a (kunci a) · tebakan tanpa kartu d/65, d/80, d/70
  - pesan: "Gue baca pemilik terbesar jual 70.000.000 lembar, terus 179.500.000 lembar, terus 50.000.000 lembar. Habis itu dia masih pegang 58,7 persen. Berarti dia masih mayoritas dong." (kunci a)
- omongan 2: **ditolak-tebak** · pembaca kartu memilih b (kunci b) · tebakan tanpa kartu b/100 (tak terbaca), b/75, b/75
  - pesan: "Gue baca saham ini kena suspensi 30 Juni 2025 gara-gara harganya keburu naik berlipat. Sekarang harganya udah 178 rupiah, jadi masuk akal kan?" (kunci b)
- omongan 3: **ditolak-tebak** · pembaca kartu memilih c (kunci c) · tebakan tanpa kartu a/60, a/65, c/100 (tak terbaca)
  - pesan: "Gue baru baca dividen tunai 0,14 rupiah per lembar, ex 16 September 2025. Buat gue sih udah jelas itu hasil keputusan RUPS 4 September 2025. Sekarang harganya udah 178 rupiah." (kunci c)

**Putaran 5** — menulis ulang omongan 2, 3; US$0.0304, 605 s.

- validator: lolos
- omongan 2: **ditolak-tebak** · pembaca kartu memilih c (kunci c) · tebakan tanpa kartu c/85, c/70, c/75
  - pesan: "Gue baca saham ini disuspensi 30 Juni 2025 gara-gara laporan keuangan auditan belum kelar. Berarti dividen 0,14 rupiah per lembar yang ex 16 September 2025 itu nggak mungkin dibagikan dong. Aneh kan?" (kunci c)
- omongan 3: **ditolak-tebak** · pembaca kartu memilih b (kunci b) · tebakan tanpa kartu c/75, c/70, b/100 (tak terbaca)
  - pesan: "Gue lihat volume 8 Oktober 324.690.400 lembar, gede banget. Pasti banyak yang lepas, makanya harga turun dari 178 ke 162." (kunci b)

### ULTJ — putaran demi putaran

**Putaran 1** — menyusun omongan 1, 2, 3; US$0.0560, 1087 s.

- validator: menolak (ada omongan yang tidak terbaca)
- omongan 1: **tidak-ada**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1310 (line 1 column 1311)
- omongan 2: **ditolak-tebak** · pembaca kartu memilih c (kunci c) · tebakan tanpa kartu c/100 (tak terbaca), c/80, c/100 (tak terbaca)
  - pesan: "Katanya dividen tunai tahun ini Rp130 per lembar dan ex date-nya hari ini. Terakhir mereka bagi itu tahun lalu, dan dari 2020 nggak pernah bolong." (kunci c)
- omongan 3: **ditolak-tebak** · pembaca kartu memilih d (kunci d) · tebakan tanpa kartu d/65, d/60, d/75
  - pesan: "Baru ngeh, sepanjang Januari yang paling banyak nambah saham itu pemilik terbesar, 1.000.000 lembar. Yang lain cuma ikut dikit." (kunci d)

**Putaran 2** — menulis ulang omongan 1, 2, 3; US$0.0479, 2540 s.

- validator: menolak (ada omongan yang tidak terbaca)
- omongan 1: **ditolak-tebak** · pembaca kartu memilih d (kunci d) · tebakan tanpa kartu d/70, d/85, d/80
  - pesan: "Dividen tahun ini 130 per lembar dan hari ini tanggal ex-nya. Tapi bukaannya cuma turun tipis dari nutup kemarin, jadi jatuhnya masih di bawah yang dibagikan. Santai aja." (kunci d)
- omongan 2: **ditolak-validator**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1676 (line 1 column 1677)
- omongan 3: **ditolak-tebak** · pembaca kartu memilih a (kunci a) · tebakan tanpa kartu a/60, a/100 (tak terbaca), a/100 (tak terbaca)
  - pesan: "Eh, gue baru ngecek laporan Januari: ada 8 laporan kepemilikan yang masuk. Ramai juga ya sebulan segitu, biasanya kan sepi. Ada apa nih?" (kunci a)

**Putaran 3** — menulis ulang omongan 1, 2, 3; US$0.0376, 1132 s.

- validator: menolak (TIDAK_ADA_BETUL)
- omongan 1: **ditolak-validator**
  - [validator TIDAK_ADA_BETUL, seluruh draf] Minimal satu dari tiga omongan harus ternyata BETUL (kuncinya pilihan "Betul,").
- omongan 2: **ditolak-validator**
  - [validator TIDAK_ADA_BETUL, seluruh draf] Minimal satu dari tiga omongan harus ternyata BETUL (kuncinya pilihan "Betul,").
- omongan 3: **ditolak-validator**
  - [validator TIDAK_ADA_BETUL, seluruh draf] Minimal satu dari tiga omongan harus ternyata BETUL (kuncinya pilihan "Betul,").

**Putaran 4** — menulis ulang omongan 1, 2, 3; US$0.0369, 657 s.

- validator: lolos
- omongan 1: **ditolak-tebak** · pembaca kartu memilih a (kunci a) · tebakan tanpa kartu a/95, a/85, a/88
  - pesan: "Gue baca laporan Januari: pemilik terbesar nambah 1 juta lembar, tapi porsinya nyaris nggak gerak. Banyak banget tapi efeknya tipis, aneh nggak sih?" (kunci a)
- omongan 2: **ditolak-kartu** · pembaca kartu memilih d (kunci c)
  - pesan: "Gue iseng buka daftar aksi korporasi Perusahaan U. Ternyata dividen tunainya tercatat 7 tahun beruntun, nggak ada tahun yang bolong lho. Nggak nyangka." (kunci c)
- omongan 3: **ditolak-tebak** · pembaca kartu memilih a (kunci a) · tebakan tanpa kartu a/60, c/70, a/60
  - pesan: "Gue lihat harga turun dari 1.690. Turunnya lebih dalam dari dividen yang hari ini ex, kayaknya bukan cuma efek dividen doang." (kunci a)

**Putaran 5** — menulis ulang omongan 1, 2, 3; US$0.0372, 725 s.

- validator: menolak (ANGKA_TANPA_RUJUKAN)
- omongan 1: **ditolak-validator**
  - [validator ANGKA_TANPA_RUJUKAN] Penjelasan memuat angka di luar rujukan: 6.338.600, 6.338.600. Tulis tiap angka sebagai [[fact_id/teks]].
- omongan 2: **ditolak-tebak** · pembaca kartu memilih b (kunci b) · tebakan tanpa kartu b/60, b/65, b/65
  - pesan: "Dividen tunai Perusahaan U tahun ini Rp130 per lembar. Naiknya konsisten tiap tahun, nggak pernah turun. Gue cek dari yang paling lama." (kunci b)
- omongan 3: **ditolak-validator**
  - [validator ANGKA_TANPA_RUJUKAN] Penjelasan memuat angka di luar rujukan: 2020, 2020. Tulis tiap angka sebagai [[fact_id/teks]].

## Draf akhir TIRT (utuh)

**Tidak lolos penuh** (batas 5 putaran tercapai; omongan terkunci: 1, 2). Di bawah: omongan yang dikunci lingkar (lolos validator + kedua gerbang) dan versi terakhir omongan yang tidak lolos, apa adanya.

**Omongan 1 — DIKUNCI (lolos)**

> **Sari (17.20):** Gue baca data harian. Harga cuma naik 2,21 persen dari 48 ke 106. Jadi setopnya kayak nggak masuk akal.

- a) Betul, kenaikannya memang cuma 2,21 persen dari 48.
- **b) Keliru, sebab 106 itu 2,21 kali 48, bukan persen.** (kunci)
- c) Betul, sebab setopnya memang cuma karena harga naik.
- d) Keliru, sebab setopnya karena keraguan atas kelangsungan usaha.

**Omongan 2 — DIKUNCI (lolos)**

> **Gilang (19.15):** Gue cek data harian, saham ini naiknya pelan banget, sehari cuma naik dikit-dikit. Nggak heran lama-lama disetop juga.

- **a) Betul, naiknya memang pelan tapi beruntun, dan itu yang bikin disetop.** (kunci)
- b) Keliru, naiknya cuma sehari lalu langsung disetop bursa.
- c) Betul, setopnya karena naiknya pelan tapi jalan terus tanpa henti.
- d) Keliru, setopnya karena keraguan atas kelangsungan usaha perseroan.

**Omongan 3 — versi terakhir, DITOLAK**

> **Wulan (21.05):** Gue baca pengumuman bursa. Setop yang sekarang alasannya beda sama yang awal tahun, yang dulu gara-gara usaha perusahaannya diragukan. Yang sekarang mah cuma karena harganya naik terus.

- **a) Betul, setop sekarang karena harga naik, yang awal tahun karena usaha diragukan.** (kunci)
- b) Keliru, dua-duanya disetop karena harga naik terus tanpa henti.
- c) Betul, dua-duanya disetop karena usaha perusahaannya diragukan bursa.
- d) Keliru, setop sekarang karena usaha diragukan, yang awal tahun karena harga naik.

```json
{
  "omongan": [
    {
      "nama": "Sari",
      "jam": "17.20",
      "pesan": "Gue baca data harian. Harga cuma naik 2,21 persen dari 48 ke 106. Jadi setopnya kayak nggak masuk akal.",
      "angka_pesan": [
        {
          "teks": "2,21 persen",
          "andaian": true
        },
        {
          "teks": "48",
          "fact_id": "harga-2025-11-26"
        },
        {
          "teks": "106",
          "fact_id": "harga-2025-12-09"
        }
      ],
      "kartu": [
        "kelipatan-2025-11-26-2025-12-09",
        "harga-2025-11-26",
        "harga-2025-12-09",
        "susp-2025-12-10"
      ],
      "kartu_penentu": [
        "kelipatan-2025-11-26-2025-12-09"
      ],
      "pilihan": {
        "a": "Betul, kenaikannya memang cuma [[misal|2,21 persen]] dari [[harga-2025-11-26|48]].",
        "b": "Keliru, sebab [[harga-2025-12-09|106]] itu [[kelipatan-2025-11-26-2025-12-09|2,21 kali]] [[harga-2025-11-26|48]], bukan persen.",
        "c": "Betul, sebab setopnya memang cuma karena harga naik.",
        "d": "Keliru, sebab setopnya karena keraguan atas kelangsungan usaha."
      },
      "kunci": "b",
      "penjelasan": "Harga penutupan [[harga-2025-11-26|26 November 2025]] tercatat [[harga-2025-11-26|48 rupiah per lembar]], lalu pada [[harga-2025-12-09|9 Desember 2025]] menjadi [[harga-2025-12-09|106 rupiah per lembar]]. Angka terakhir itu [[kelipatan-2025-11-26-2025-12-09|2,21 kali]] angka pertama, bukan persentase. Selisih harganya [[naik-2025-11-26-2025-12-09|58 rupiah per lembar]]. Bursa menyetop perdagangan pada [[susp-2025-12-10|10 Desember 2025]] dengan alasan resmi peningkatan harga kumulatif yang signifikan. Salah-kaprah yang umum: orang menyamakan kali dengan persen, padahal keduanya beda jauh."
    },
    {
      "nama": "Gilang",
      "jam": "19.15",
      "pesan": "Gue cek data harian, saham ini naiknya pelan banget, sehari cuma naik dikit-dikit. Nggak heran lama-lama disetop juga.",
      "angka_pesan": [],
      "kartu": [
        "harga-2025-11-26",
        "harga-2025-12-09",
        "hari-naik-beruntun",
        "susp-2025-12-10"
      ],
      "kartu_penentu": [
        "hari-naik-beruntun",
        "susp-2025-12-10"
      ],
      "pilihan": {
        "a": "Betul, naiknya memang pelan tapi beruntun, dan itu yang bikin disetop.",
        "b": "Keliru, naiknya cuma sehari lalu langsung disetop bursa.",
        "c": "Betul, setopnya karena naiknya pelan tapi jalan terus tanpa henti.",
        "d": "Keliru, setopnya karena keraguan atas kelangsungan usaha perseroan."
      },
      "kunci": "a",
      "penjelasan": "Harga penutupan [[harga-2025-11-26|26 November 2025]] tercatat [[harga-2025-11-26|48 rupiah per lembar]], lalu pada [[harga-2025-12-09|9 Desember 2025]] menjadi [[harga-2025-12-09|106 rupiah per lembar]]. Kenaikannya memang bertahap, [[hari-naik-beruntun|9 hari bursa]] berturut-turut, tiap hari lebih tinggi dari hari sebelumnya. Bursa menyetop perdagangan pada [[susp-2025-12-10|10 Desember 2025]] dengan alasan resmi peningkatan harga kumulatif yang signifikan, sebagai cooling down untuk melindungi investor. Jadi yang dibilang teman cocok dengan dokumennya. Salah-kaprah yang umum: orang mengira penghentian perdagangan selalu karena harga jatuh, padahal bisa juga karena harga naik terus."
    },
    {
      "nama": "Wulan",
      "jam": "21.05",
      "pesan": "Gue baca pengumuman bursa. Setop yang sekarang alasannya beda sama yang awal tahun, yang dulu gara-gara usaha perusahaannya diragukan. Yang sekarang mah cuma karena harganya naik terus.",
      "angka_pesan": [],
      "kartu": [
        "susp-2025-12-10",
        "susp-2025-01-21",
        "hari-naik-beruntun"
      ],
      "kartu_penentu": [
        "susp-2025-12-10",
        "susp-2025-01-21"
      ],
      "pilihan": {
        "a": "Betul, setop sekarang karena harga naik, yang awal tahun karena usaha diragukan.",
        "b": "Keliru, dua-duanya disetop karena harga naik terus tanpa henti.",
        "c": "Betul, dua-duanya disetop karena usaha perusahaannya diragukan bursa.",
        "d": "Keliru, setop sekarang karena usaha diragukan, yang awal tahun karena harga naik."
      },
      "kunci": "a",
      "penjelasan": "Di pengumuman [[susp-2025-12-10|10 Desember 2025]], bursa menulis alasan setopnya: peningkatan harga kumulatif yang signifikan, sebagai cooling down untuk melindungi investor. Itu nyambung dengan data harga yang naik [[hari-naik-beruntun|9 hari bursa]] berturut-turut. Sedangkan pengumuman [[susp-2025-01-21|21 Januari 2025]] menyebut alasan yang lain, yaitu keraguan atas kelangsungan usaha perseroan. Jadi dua setop itu memang beda alasan, dan yang dibilang teman cocok dengan dokumennya. Salah-kaprah yang umum: orang menyangka semua penghentian perdagangan alasannya sama, padahal tiap pengumuman menyebut alasannya sendiri."
    }
  ]
}
```

### DADA: omongan yang dikunci

**Omongan 1** (dikunci di putaran 4)

> **Sinta (18.05):** Gue baca pemilik terbesar jual 70.000.000 lembar, terus 179.500.000 lembar, terus 50.000.000 lembar. Habis itu dia masih pegang 58,7 persen. Berarti dia masih mayoritas dong.

- **a) Betul, setelah rangkaian penjualan, pemilik terbesar masih pegang 58,7 persen saham.** (kunci)
- b) Keliru, penjualan 179.500.000 lembar bikin dia tak lagi mayoritas.
- c) Betul, penjualan terakhir 50.000.000 lembar adalah yang terbesar dari tiga laporan.
- d) Keliru, yang terakhir tercatat 59,375 persen, bukan angka yang disebut.

Riwayat utuh: `eval/keluaran-m2d2/dada/riwayat.json`.

### ULTJ: omongan yang dikunci

Tidak ada.

Riwayat utuh: `eval/keluaran-m2d2/ultj/riwayat.json`.

## Jalan TIRT yang dibuang

Dijalankan sebelum setelan akhir; rekamannya utuh di `eval/keluaran-m2d2/dibuang/`, biayanya ikut di total ledger. Sebabnya ditulis di catatan penulis.

| jalan | langkah tercatat | panggilan (jejak) | biaya (jejak) | hasil |
|---|---:|---:|---:|---|
| tirt-jalan1 | 2 | 1 | US$0.0134 | dihentikan eksekutor (jejak tidak ditutup) |
| tirt-jalan2 | 1 | 0 | US$0.0000 | tidak lolos: galat penyusun: GalatLlm: Panggilan deepseek-ai/DeepSeek-V4.1-Flash gagal: HTTP 400 — {"error":{"message":"The requested 'max_tokens' of 64000 exceeds the maxim |
| tirt-jalan3 | 2 | 1 | US$0.0138 | dihentikan eksekutor (jejak tidak ditutup) |
| tirt-jalan4 | 5 | 4 | US$0.0412 | dihentikan eksekutor (jejak tidak ditutup) |
| tirt-jalan5 | 36 | 42 | US$0.0485 | tidak lolos: batas 5 putaran tercapai; omongan terkunci: tidak ada |
| tirt-jalan6 | 26 | 34 | US$0.1237 | tidak lolos: galat penyusun: GalatLlm: Panggilan deepseek-ai/DeepSeek-V4.1-Flash: HTTP 200 tanpa choices —  {"error":{"message":"The model produced no output. Please try aga |
| tirt-jalan7 | 11 | 10 | US$0.0600 | dihentikan eksekutor (jejak tidak ditutup) |

## Pembanding eksternal

Penguji dan penilai: subagent Claude (opus) **baru**, tanpa konteks eksekutor, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d2/penguji/`). Jawaban mentah: `penguji/jawaban/`. Tebak buta memakai petunjuk yang sama persis dengan M2d-1.

### Tebak buta (tanpa kartu) — gerbang-dalam vs penguji-luar

| paket | omongan | kunci | di dalam lingkar (DeepSeek, suhu 1,0) | di luar (3 subagent) | benar luar | yakin penebak benar | lolos luar (K-05) |
|---|---:|---|---|---|---:|---:|---|
| TIRT | 1 | b | d/65, d/75, d/75 | b/75, b/70, b/55 | 3/3 | 67 | **tidak** |
| TIRT | 2 | a | d/60, d/60, d/60 | b/40, b/35, b/35 | 0/3 | — | ya |
| DADA | 1 | a | d/65, d/80, d/70 | d/55, d/55, d/45 | 0/3 | — | ya |

**Kesepakatan:** dari 3 omongan yang lolos gerbang tebak buta di dalam lingkar, **2 juga lolos** di penguji luar dan **1 lolos di dalam tetapi gagal di luar**. Rata-rata penguji luar yang menebak benar: 1,00 dari 3.

### Jawab dengan kartu

| paket | omongan | kunci | kartu penentu | jawaban luar (pilihan/kartu) | benar | menunjuk penentu | kalimat membingungkan |
|---|---:|---|---|---|---:|---:|---|
| TIRT | 1 | b | 1 | b/1, b/1, b/1 | 3/3 | 3/3 | — |
| TIRT | 2 | a | 3, 4 | a/3+4, a/3+4, a/3+4 | 3/3 | 3/3 | "Gilang bilang "naiknya pelan banget", tapi dari Rp48 ke Rp106 dalam 9 hari itu lebih dari dua kali lipat, jadi menurut gue nggak pelan. Nggak ada pilihan yang bilang itu keliru. Pilihan a dan c juga isinya hampir sama ("pelan tapi beruntun" vs "pelan tapi jalan terus tanpa henti"), jadi gue nggak yakin bedanya di mana."; "Gilang bilang 'naiknya pelan banget, sehari cuma naik dikit-dikit', padahal dari Rp48 ke Rp106 itu lebih dari dua kali lipat, jadi rasanya tidak pelan. Tapi tidak ada pilihan 'Keliru' yang menyebut itu. Pilihan a ('naiknya memang pelan tapi beruntun, dan itu yang bikin disetop') dan c ('setopnya karena naiknya pelan tapi jalan terus tanpa henti') terbaca hampir sama, jadi saya bingung harus pilih yang mana."; "a) Betul, naiknya memang pelan tapi beruntun, dan itu yang bikin disetop. / c) Betul, setopnya karena naiknya pelan tapi jalan terus tanpa henti. — dua pilihan ini rasanya sama saja, dan dari Rp48 ke Rp106 kok disebut pelan?" |
| DADA | 1 | a | 3 | a/3, a/3, a/3 | 3/3 | 3/3 | "Kepemilikan tercatat berubah dari 4.662.137.600 menjadi 4.592.137.600 lembar, yaitu dari 62,73 persen menjadi 61,788 persen saham." |

Gerbang kartu di dalam meloloskan 3 omongan ini; di luar, 3 dijawab benar oleh ketiga penguji dan 3 memenuhi kriteria K-05 penuh (3/3 benar dan ketiganya menunjuk kartu penentu).

### Kealamian bahasa (buta)

Per paket: draf agen M2d-2, draf DeepSeek M2d-1 (model dan paket yang sama, tanpa lingkar, putaran 2), dan omongan manusia yang hidup (DADA, ULTJ); label acak.

| sumber | rata-rata | n |
|---|---:|---:|
| agen M2d-2 | 3,83 | 6 |
| DeepSeek M2d-1 (tanpa lingkar) | 2,67 | 6 |
| manusia (hidup) | 4,33 | 3 |

| paket | sumber | penilai | skor | alasan |
|---|---|---|---:|---|
| DADA | agen-m2d2 | alami-p1 | 4 | Pesannya alami dan penjelasannya bernada teman ("Angka 59,375 persen yang mungkin kamu lihat"), hanya kalimat salah kaprahnya terlalu panjang dan mengulang angka yang sama. |
| DADA | agen-m2d2 | alami-p2 | 4 | Pesan dan penjelasannya mengalir dan ramah ('yang mungkin kamu lihat'), tetapi kalimat salah-kaprah di akhir kepanjangan dan diulang-ulang, dan pesannya penuh angka panjang sehingga kurang terasa seperti obrolan. |
| DADA | agen-m2d2 | alami-p3 | 4 | Bahasanya lancar dan bernada teman ("yang mungkin kamu lihat"), tetapi penjelasannya panjang dan mengulang-ulang angka sehingga terasa agak seperti laporan. |
| DADA | m2d1-deepseek | alami-p1 | 2 | Pesannya wajar, tetapi penjelasannya mekanis dan terasa seperti hasil mesin ("Kartu hitungan 22,25 kali membandingkan dua angka itu, jadi bilangan di omongan sama dengan yang tertulis di dokumen"), dan beberapa pilihan jawaban terlalu dipadatkan ("Rp140 sepuluh lot"). |
| DADA | m2d1-deepseek | alami-p2 | 2 | Frasa seperti 'bilangan di omongan', 'Kartu hitungan 22,25 kali membandingkan', dan pilihan yang dipotong-potong 'Rp140 sepuluh lot' terasa seperti isian templat mesin, bukan teman yang menjelaskan. |
| DADA | m2d1-deepseek | alami-p3 | 2 | Penjelasannya mekanis dan terasa ditulis mesin ("Kartu hitungan 22,25 kali membandingkan dua angka itu, jadi bilangan di omongan sama..."), dan beberapa pilihan jawaban terpotong-potong seperti "Rp140 sepuluh lot". |
| DADA | manusia | alami-p1 | 4 | Pesannya sangat hidup ("buat bayar parkir motor aja kurang", "nggak kedengeran jual") dan penjelasannya seperti teman yang sedang menjelaskan, tetapi masih ada rujukan "kartu" yang terasa seperti istilah sistem, dan frasa "menganggap harga yang naik sebagai semacam pengumuman" agak janggal. |
| DADA | manusia | alami-p2 | 5 | Pesannya terdengar seperti grup sungguhan ('buat bayar parkir motor aja kurang', 'tenang-tenang, nggak kedengeran jual') dan penjelasannya bernada teman yang menerangkan, hanya sedikit tersendat pada penyebutan 'kartu'. |
| DADA | manusia | alami-p3 | 4 | Pesannya sangat hidup ("buat bayar parkir motor aja kurang") dan penjelasannya bernada teman yang menerangkan, hanya saja masih ada rujukan "kartu" dan frasa janggal "menganggap harga yang naik sebagai semacam pengumuman". |
| TIRT | agen-m2d2 | alami-p1 | 4 | Pesan-pesannya terasa seperti obrolan grup sungguhan ("naiknya pelan banget, sehari cuma naik dikit-dikit"), tetapi penjelasannya agak kaku dan berulang ("tercatat 48 rupiah per lembar" muncul dua kali dengan susunan yang sama), "Jadi setopnya kayak nggak masuk akal" terdengar sedikit janggal, dan "salah-kaprah" tidak perlu diberi tanda hubung. |
| TIRT | agen-m2d2 | alami-p2 | 3 | Pesannya cukup santai, tetapi 'setopnya kayak nggak masuk akal' dan 'setopnya' yang terus diulang terdengar janggal; penutur asli lebih biasa bilang 'disuspen' atau 'kena suspend', dan penjelasannya agak kaku seperti laporan. |
| TIRT | agen-m2d2 | alami-p3 | 4 | Pesan grupnya terdengar wajar ("Nggak heran lama-lama disetop juga"), tetapi "setopnya" dan sisipan "sebagai cooling down" di penjelasan agak kaku dan terasa seperti bahasa dokumen. |
| TIRT | m2d1-deepseek | alami-p1 | 3 | Pesan dan sebagian besar penjelasannya wajar, tetapi "Kartu harga mencatat... dan hitungan paket menyebut" bocoran istilah sistem yang tidak akan dipakai penutur asli, dan pilihan "penghentiannya ini menyusul rapat umum" terasa kaku. |
| TIRT | m2d1-deepseek | alami-p2 | 4 | Pesan grupnya wajar ('Bener nggak sih?', 'rame banget', 'Cek dong'), tetapi penjelasannya memuat istilah internal yang kaku ('kartu harga', 'hitungan paket', 'omongan teman cocok dengan dokumennya'). |
| TIRT | m2d1-deepseek | alami-p3 | 3 | Pesan-pesannya alami seperti obrolan sungguhan, tetapi penjelasannya memakai istilah sistem seperti "kartu harga" dan "hitungan paket" serta pola berulang "omongan teman cocok dengan dokumennya", yang tidak lazim diucapkan teman. |

## Dibanding M2d-1

| ukuran | M2d-1 (tanpa lingkar) | M2d-2 (lingkar agen) |
|---|---|---|
| tebak buta K-05, penguji luar — semua draf | 3/24 omongan lolos | 2/3 |
| tebak buta K-05, penguji luar — DeepSeek-V4.1-Flash | 2/9, rata-rata 2,11 dari 3 benar | 2/3, rata-rata 1,00 dari 3 benar |
| kealamian DeepSeek, penilai M2d-1 | 3,00 (n=9) | — |
| kealamian, penilai yang SAMA (M2d-2) | draf M2d-1: 2,67 | draf agen: 3,83 |
| kealamian manusia (hidup) | 5,00 | 4,33 |

## Catatan penulis

### Singkatnya

**Tidak ada simulasi yang lolos penuh dalam 5 putaran.** Dari 9 omongan (3 paket × 3), lingkar mengunci 3: TIRT 2, DADA 1, ULTJ 0. Tidak ada draf yang siap dipasang, dan milestone ini memang tidak memasangnya.

Yang terbukti bekerja, dari keluaran mentah:

- **Gerbang kartu menangkap kunci yang salah.** Di jalan 5 (dibuang; penyusun tanpa berpikir) omongan "Tono" diberi kunci yang dibantah kartunya sendiri; pembaca kartu menolaknya empat putaran berturut-turut (putaran 2–5). Di jalan akhir, satu omongan ULTJ (putaran 4) ditolak pembaca kartu: kunci c, pembaca memilih d.
- **Gerbang tebak buta menolak yang mudah ditebak** — 24 dari 39 versi omongan yang diperiksa di jalan akhir berhenti di sini, sering dengan keyakinan penebak 70–100.
- **Kunci omongan ditegakkan kode**: omongan yang dikunci tidak pernah diminta lagi; versi lain yang dikirim model dibuang dan dicatat.
- **Kealamian naik** pada sampel kecil: penilai yang sama memberi draf agen 3,83 (n = 6) dan draf DeepSeek M2d-1 2,67 (n = 6); omongan manusia 4,33 (n = 3, hanya DADA). Keluhan "hitungan paket" / "bilangan di omongan" dari M2d-1 hilang; keluhan baru: "setopnya" berulang dan penjelasan yang mengulang angka.

### Seberapa bisa dipercaya gerbang-dalam

Tiga omongan lolos gerbang tebak buta di dalam; di luar (3 subagent Opus, petunjuk M2d-1), **dua lolos dan satu gagal**. Yang gagal — TIRT omongan 1, "harga cuma naik 2,21 persen dari 48 ke 106" — tertebak karena pilihan kuncinya bisa **dihitung** dari pesan tanpa kartu (106 ÷ 48 ≈ 2,2 kali). Penebak DeepSeek di dalam memilih d ("setop karena keraguan kelangsungan usaha"); ketiga penguji Opus menghitung dan memilih b. Artinya gerbang-dalam lebih lunak daripada penguji luar untuk kebocoran aritmetika, dan dengan n = 3 kesepakatan 2/3 bukan ukuran yang kuat. Perbandingan dengan M2d-1 (DeepSeek 2/9 lolos, rata-rata 2,11 dari 3 penguji menebak benar; kalibrasi omongan manusia 2/6) searah — lebih sedikit yang tertebak — tetapi datang dari 3 omongan yang **sudah disaring** gerbang, bukan dari seluruh draf.

Gerbang kartu dan uji kartu luar sepakat penuh (3/3 omongan dijawab benar oleh ketiga penguji, semuanya menunjuk kartu penentu). Tetapi **ketiga penguji luar menandai TIRT omongan 2 membingungkan**: "naiknya pelan banget" untuk harga yang naik dari Rp48 ke Rp106 dalam 9 hari bursa, dan pilihan a dan c yang nyaris sama. Kuncinya ("Betul, naiknya pelan tapi beruntun") bisa diperdebatkan; validator tidak menilai makna kata "pelan", dan pembaca kartu DeepSeek menerimanya. Omongan ini **tidak layak** sampai ke pemain tanpa suntingan manusia.

### Kenapa lingkar tidak selesai dalam 5 putaran

1. **Penyusun tidak bisa memenuhi gerbang tebak dengan andal.** Umpan balik ("3/3 penebak tanpa kartu memilih kunci…") dibaca, tetapi versi barunya sering tetap membuat pesan yang nadanya searah dengan kunci.
2. **Penalaran yang terpotong.** Dengan mode berpikir, 12 panggilan penyusun di jalan akhir habis di batas penyedia 32.768 token tanpa JSON; cadangan tanpa berpikir mengisi sebagian. Setiap panggilan berpikir makan 1–14 menit (penyedia lambat hari itu); satu simulasi 64–102 menit.
3. **Aturan konservatif ikut menolak.** Satu tebakan yang dua kali tak terbaca dihitung "benar, yakin 100" (TIRT putaran 2, omongan 3) — sesuai desain, tetapi menolak omongan yang dua penebak lainnya tidak tebak.

### Keputusan di tengah jalan (kronologis)

Tujuh jalan TIRT dibuang sebelum setelan akhir; semua rekamannya di `eval/keluaran-m2d2/dibuang/`, semua biayanya di ledger:

1. jalan 1: tiga omongan sekaligus, 32.000 token → penalaran ±109 ribu karakter, nol JSON;
2. jalan 2: 64.000 token → ditolak penyedia (batas 32.768), tanpa biaya;
3. jalan 3: + paragraf "rencanakan singkat" → tetap terpotong;
4. jalan 4: **satu omongan per panggilan** → 2 dari 3 tetap terpotong (aturan 12 versi panjang mengundang model mensimulasikan penebak);
5. jalan 5: mode berpikir dimatikan → cepat, tetapi kunci salah dan versi ditolak dikirim ulang hampir kata per kata; nol terkunci;
6. jalan 6: mode berpikir menyala, aturan 12 diringkas → 2 terkunci, lalu HTTP 200 tanpa `choices` menghentikan seluruh simulasi (celah di `agen.ts`, diperbaiki);
7. jalan 7: dihentikan saat 4 dari 6 panggilan penyusun gagal (terpotong/galat) → ditambahkan **satu cadangan tanpa berpikir per omongan per putaran**.

Empat penghentian oleh eksekutor (jalan 1, 3, 4, 7) meninggalkan panggilan yang mungkin sudah ditagih; keempatnya dicatat ke ledger sesudahnya sebagai entri KOREKSI dengan perkiraan maksimum (total US$0,0528). Jalan akhir TIRT adalah percobaan ke-8; DADA dan ULTJ hanya dijalankan sekali, dengan setelan akhir yang sama, tanpa penyetelan sesudahnya.

**Biaya:** jalan akhir ketiga paket US$0,6370 (182 panggilan); jalan dibuang, diagnosa, sonda, dan koreksi US$0,3995; total milestone US$1,0365 menurut ledger. Ledger kumulatif sejak M2d-1 US$2,2745 dari pagu US$5,00 — pagu tidak pernah tercapai.

### Keterbatasan

- **n sangat kecil**: 3 simulasi, 3 omongan terkunci, 3 penguji per uji. Selisih satu omongan mengubah semua persentase.
- **Penebak di dalam = model yang sama dengan penyusun** (DeepSeek, sesuai kontrak); penguji luar = Claude Opus. Keduanya model bahasa, bukan orang 20-an yang belum pernah beli saham.
- **Setelan berubah di tengah milestone** (satu omongan per panggilan, cadangan tanpa berpikir, aturan 12 diringkas) — semuanya lahir dari jalan TIRT, jadi TIRT adalah paket tempat setelan disetel. DADA dan ULTJ adalah pembanding yang tidak ikut menyetel.
- **Bahan kealamian**: petunjuk M2d-1 menyebut "satu draf berisi tiga soal", tetapi draf agen yang dinilai hanya berisi omongan yang dikunci (2 untuk TIRT, 1 untuk DADA). ULTJ tidak punya omongan terkunci, jadi tidak ada kelompok ULTJ dan pembanding manusia hanya DADA (n = 3).
- **Jejak vs ledger**: panggilan yang gagal di penyedia tercatat di jejak dengan biaya 0 dan di ledger dengan perkiraan maksimum; selisihnya terlihat di tabel (DADA, ULTJ). Ledger adalah sumber biaya.
- **Laporan M2d-1 tidak lagi bisa dibangun ulang byte demi byte**: `npm run llm:laporan` menjumlah seluruh ledger, yang kini memuat panggilan M2d-2. Berkas M2d-1 yang terlacak tidak diubah.

### Usul untuk langkah berikut (bukan keputusan)

1. Pemeriksa deterministik "kunci bisa dihitung dari pesan" (rasio/selisih angka di pesan yang cocok dengan angka di pilihan kunci) — menutup kebocoran yang lolos gerbang-dalam di TIRT omongan 1.
2. Penebak yang lebih kuat atau berbeda dari penyusun untuk gerbang tebak, supaya gerbang-dalam tidak lebih lunak dari penguji luar.
3. Omongan yang dikunci lingkar tetap melewati penyuntingan manusia sebelum dipasang; TIRT omongan 2 adalah contoh yang lolos semua gerbang tetapi maknanya lemah.
