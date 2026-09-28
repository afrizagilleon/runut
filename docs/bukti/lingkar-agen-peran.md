# Bukti: lingkar agen berperan — penulis ≠ penilai (M2d-3)

Berkas ini ditulis oleh `npm run peran:laporan` dari keluaran mentah di `eval/keluaran-m2d3/` (riwayat tiap putaran, jejak langkah, ledger biaya, bahan dan jawaban mentah penguji eksternal). Semua angka dihitung ulang tiap kali perintah itu dijalankan; hanya bagian "Catatan penulis" yang ditulis tangan (`eval/keluaran-m2d3/laporan-tangan.md`). Draf **tidak** dipasang ke produk.

## Perannya

Tidak ada satu peran "maha kuasa" (keputusan pemilik, 28 Sep). Rinciannya `factory/llm/peran.md`; orkestrasinya `factory/llm/agen-peran.ts`.

| peran | pelaksana | melihat | wewenang |
|---|---|---|---|
| perencana | kode | paket fakta (gudang + aturan R) | daftar sudut (fakta penentu) + nada per posisi |
| penulis | `deepseek-ai/DeepSeek-V4.1-Flash` | paket + sudut + 2–3 contoh bank gaya + umpan balik | menulis/merevisi satu omongan per panggilan |
| pemeriksa | kode | semua | validator + G-angka-cukup + G-kaku + sudut |
| penebak ×3 | `deepseek-ai/DeepSeek-V4.1-Flash` | hanya pesan + pertanyaan + pilihan | tolak bila tertebak (K-05) |
| pembaca kartu | `deepseek-ai/DeepSeek-V4.1-Flash` | pesan + kartu + pilihan, tanpa kunci | tolak bila salah |
| kritikus | `zai-org/GLM-5.3` | semua, termasuk kunci & kartu | hanya keberatan + arahan; tidak menulis ulang; tidak bisa meloloskan |

Omongan dikunci hanya bila keempat penilai tidak keberatan. Posisi yang gagal 5 putaran di satu sudut dibuang dan mendapat sudut (fakta penentu) lain; paling banyak 3 sudut, 15 putaran per simulasi. Bila tetap gagal: **tidak terbit**.

## Hasil per simulasi

| paket | T | hasil | putaran | versi diperiksa | panggilan (ledger) | biaya (ledger) | DeepSeek (penulis / kartu / penebak) | GLM (kritikus) | waktu |
|---|---|---|---:|---:|---:|---:|---|---:|---:|
| TIRT | 10 Desember 2025 | **terbit (lolos penuh)** | 7 | 15 | 68 | US$0.3294 | US$0.1469 / US$0.0050 / US$0.0562 | US$0.1213 (4 panggilan) | 95,9 menit |
| DADA | 8 Oktober 2025 | tidak terbit (omongan 2 gagal di 3 sudut (jumlah-jual-terverifikasi, andai-10-lot-dividen, fil-2025-09-01-01); simulasi tidak terbit) | 15 | 26 | 117 | US$0.5450 | US$0.3332 / US$0.0121 / US$0.1158 | US$0.0839 (2 panggilan) | 208,5 menit |
| ULTJ | 4 Mei 2026 | **terbit (lolos penuh)** | 12 | 21 | 100 | US$0.5516 | US$0.2080 / US$0.0129 / US$0.0518 | US$0.2788 (7 panggilan) | 54,2 menit |

**Biaya milestone menurut ledger** (semua entri bertag `m2d3/`, dipotong 2026-09-28T16:29:33.952Z): **US$1.4776** dalam 296 panggilan — penulis US$0.7234 (90), pembaca kartu US$0.0316 (51), penebak US$0.2352 (141), kritikus GLM US$0.4840 (13). Pagu milestone US$2,00 (ditegakkan kode). Ledger kumulatif sejak M2d-1: US$3.7521 dari pagu US$5,00.

### Sudut per posisi

| paket | omongan | sudut (fakta penentu) → hasil, putaran |
|---|---:|---|
| TIRT | 1 | 1. `susp-2025-12-10` → dibuang (1–5); 2. `kelipatan-2025-11-26-2025-12-09` → lolos (6–7) |
| TIRT | 2 | 1. `naik-2025-11-26-2025-12-09` → dibuang (1–5); 2. `hari-naik-beruntun` → lolos (6–7) |
| TIRT | 3 | 1. `susp-2025-01-21` → lolos (1–1) |
| DADA | 1 | 1. `kelipatan-2025-08-01-2025-10-08` → dibuang (1–5); 2. `laporan-jual-terverifikasi` → lolos (6–8) |
| DADA | 2 | 1. `jumlah-jual-terverifikasi` → dibuang (1–5); 2. `andai-10-lot-dividen` → dibuang (6–10); 3. `fil-2025-09-01-01` → dibuang (11–15) |
| DADA | 3 | 1. `susp-2025-06-30` → lolos (1–3) |
| ULTJ | 1 | 1. `tahun-berdividen` → dibuang (1–5); 2. `laporan-jan-2026` → lolos (6–7) |
| ULTJ | 2 | 1. `fil-jan-orang-dalam-lain` → dibuang (1–5); 2. `fil-jan-orang-dalam-lain-laporan` → dibuang (6–10); 3. `beda-turun-dividen` → lolos (11–12) |
| ULTJ | 3 | 1. `turun-2026-05-04` → lolos (1–2) |

### Keputusan per versi omongan

Setiap versi yang ditulis penulis (atau dibawa ulang), dan penilai pertama yang keberatan.

| paket | versi | tidak-ada | ditolak-pemeriksa | ditolak-kartu | ditolak-tebak | ditolak-kritikus | kritikus-tidak-menjawab | galat-gerbang | lolos | rincian pemeriksa | penulis terpotong / cadangan |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| TIRT | 15 | 1 | 2 | 1 | 7 | 1 | 0 | 0 | 3 | SUDUT 1, ANGKA_TANPA_RUJUKAN 1, TAK_TERBACA 1 | 4 / 4 |
| DADA | 26 | 4 | 4 | 0 | 16 | 0 | 0 | 0 | 2 | TAK_TERBACA 6, ANGKA_TANPA_RUJUKAN 1, ANGKA_TAK_COCOK 1 | 13 / 14 |
| ULTJ | 21 | 1 | 3 | 1 | 11 | 1 | 1 | 0 | 3 | TAK_TERBACA 2, KUNCI_SERAGAM 2 | 7 / 7 |

### Keberatan kritikus

**TIRT** — kritikus menilai 4 versi (4 panggilan; ada panggilan terpotong di 0 versi); keberatan per jenis: bahasa 1.

- putaran 3, omongan 1 · bahasa (penjelasan): Penjelasan memakai istilah sistem 'omongan' ('bagian omongan soal pemicunya') untuk menyebut pesan Andi, padahal kata itu justru termasuk istilah yang tidak boleh muncul di teks untuk pemain.

**DADA** — kritikus menilai 2 versi (2 panggilan; ada panggilan terpotong di 0 versi); keberatan per jenis: tidak ada.

**ULTJ** — kritikus menilai 5 versi (7 panggilan; ada panggilan terpotong di 2 versi); keberatan per jenis: tidak-menjawab 1, makna 1.

- putaran 2, omongan 1 · tidak-menjawab (-): kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali
- putaran 3, omongan 1 · makna (penjelasan): Penjelasan hanya membantah klaim 'makin besar terus' dari pilihan d dan tidak pernah membantah klaim Wulan 'makin kecil tiap tahun' yang justru dibantah kartu 4 (Rp130 per lembar), sehingga kalimat 'memang pernah turun' bisa terbaca seolah membenarkan omongan Wulan.

### TIRT — putaran demi putaran

**Putaran 1** — tulis 1, 2, 3; sudut 1:susp-2025-12-10 (1.1), 2:naik-2025-11-26-2025-12-09 (1.1), 3:susp-2025-01-21 (1.1); US$0.0736, 1174 s.

- omongan 1: **ditolak-tebak** · pembaca kartu b (kunci b) · tanpa kartu b/85, b/85, b/90
  - pesan: "Perusahaan T disetop bursa lagi hari ini. Harganya udah naik 9 hari bursa berturut-turut, tapi gue yakin ini gara-gara perusahaannya ada masalah, bukan soal harga." (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 87 (tebakan: b/85, b/85, b/90). Alasan mereka: "Karena saham naik 9 hari bursa berturut-turut, setop bursa biasanya akibat kenaikan harga kumulatif dalam rangka cooling down, bukan masalah perusahaan." "Harga naik 9 hari berturut-turut
- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/80, a/85, a/85
  - pesan: "Harga Perusahaan T naik Rp58 dari 26 Nov sampai 9 Des, 9 hari bursa naik terus, gue pantau dari awal. Setop hari ini cuma pendinginan gara-gara kenaikan itu, bukan karena ada masalah." (kunci a)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 83 (tebakan: a/80, a/85, a/85). Alasan mereka: "Pesan Wawan menyebut setop karena kenaikan harga kumulatif untuk pendinginan, cocok dengan opsi a." "Pesan Wawan menyebut penghentian sebagai pendinginan akibat kenaikan harga kumulatif, 
- omongan 3: **lolos** · pembaca kartu c (kunci c) · tanpa kartu a/75, a/80, a/80 · kritikus: 0 keberatan
  - pesan: "Perusahaan T disetop lagi hari ini, terus yang 21 Januari dulu juga. Itu dulu gara-gara harganya naik juga kan? Gue ragu sih, kayaknya gitu." (kunci c)

**Putaran 2** — tulis 1, 2; sudut 1:susp-2025-12-10 (1.2), 2:naik-2025-11-26-2025-12-09 (1.2); US$0.0215, 225 s.

- omongan 1: **ditolak-tebak** · pembaca kartu b (kunci b) · tanpa kartu b/75, b/85, b/75
  - pesan: "Perusahaan T disetop bursa lagi hari ini. Ini pasti gara-gara volume dagangnya meledak kemarin, soalnya transaksinya rame banget." (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 78 (tebakan: b/75, b/85, b/75). Alasan mereka: "Setop bursa biasanya untuk pendinginan karena kenaikan harga kumulatif, bukan karena volume dagang ramai seperti dugaan Andi." "Suspensi saham di bursa biasanya dilakukan dalam rangka pen
- omongan 2: **ditolak-pemeriksa**
  - pesan: "Gue udah cek, Perusahaan T naik 2,21 kali lipat dari 26 Nov ke 9 Des. Makanya bursa setop hari ini, bukan gara-gara usaha mereka bermasalah kayak dulu." (kunci a)
  - [pemeriksa: SUDUT] kartu_penentu omongan ini harus memuat "naik-2025-11-26-2025-12-09" (sudut ke-1 dari perencana); yang ditulis: ["kelipatan-2025-11-26-2025-12-09","susp-2025-12-10"].

**Putaran 3** — tulis 1, 2; sudut 1:susp-2025-12-10 (1.3), 2:naik-2025-11-26-2025-12-09 (1.3); US$0.0515, 876 s.

- omongan 1: **ditolak-kritikus** · pembaca kartu d (kunci d) · tanpa kartu a/80, a/70, a/85 · kritikus: 1 keberatan
  - pesan: "Perusahaan T disetop bursa hari ini, fix cooling down gara-gara harga naik kumulatif. Paling lama sehari, besok pasti udah bisa ditransaksikan lagi." (kunci d)
  - [kritikus: bahasa, penjelasan] Penjelasan memakai istilah sistem 'omongan' ('bagian omongan soal pemicunya') untuk menyebut pesan Andi, padahal kata itu justru termasuk istilah yang tidak boleh muncul di teks untuk pemain.
  - [kritikus: arahan] Ganti pemakaian kata 'omongan' di penjelasan dengan rujukan alami ke kalimat Andi, misalnya dengan menyebut namanya sebagai pemilik klaim, agar tidak terdengar seperti label komponen soal.
- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu c/60, a/80, d/60
  - pesan: "Gue udah itung sendiri, dari 26 November ke 9 Desember harganya naik Rp58. Bursa pasti setop hari ini gara-gara lonjakan itu, bukan karena usaha mereka kenapa-napa." (kunci a)
  - [penebak tanpa kartu] 1/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 80 (tebakan: c/60, a/80, d/60). Alasan mereka: "Angka kenaikan Rp58 dari 26 November ke 9 Desember dan alasan suspensi karena lonjakan harga memang sesuai dengan pernyataan Yoga." — jawaban benar harus melawan dugaan pertama orang yang

**Putaran 4** — tulis 1, 2; sudut 1:susp-2025-12-10 (1.4), 2:naik-2025-11-26-2025-12-09 (1.4); US$0.0261, 929 s.

- omongan 1: **ditolak-tebak** · pembaca kartu b (kunci b) · tanpa kartu b/70, b/78, b/80
  - pesan: "Perusahaan T disetop bursa hari ini, fix ini gara-gara harganya naik kumulatif, bukan karena usaha mereka kenapa-napa. Dari 26 November naiknya nggak pernah putus." (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 76 (tebakan: b/70, b/78, b/80). Alasan mereka: "Pesan Fajar menyebut pemicu kenaikan harga kumulatif, dan hitungan dari 26 November hingga sekitar awal Desember menunjukkan 9 hari bursa beruntun." "Omongan Fajar menyebut pemicunya kena
- omongan 2: **ditolak-kartu** · pembaca kartu b (kunci c)
  - pesan: "Gue udah hafal pola ginian. Dari 26 November harganya naik terus sampai 9 Desember, naiknya Rp58. Bursa setop hari ini ya pasti gara-gara lonjakan itu, bukan karena usaha mereka kenapa-napa." (kunci c)
  - [pembaca kartu] Pembaca yang MEMEGANG kartu memilih "b", padahal kunci "c" (alasannya: "Kartu 2 menyatakan perdagangan dihentikan 10 Desember 2025 karena kenaikan harga kumulatif yang signifikan, bukan karena keraguan kelangsungan usaha."). Periksa dulu apakah kuncimu memang benar menurut kartu — pembaca ini bisa jadi 

**Putaran 5** — tulis 1, 2; sudut 1:susp-2025-12-10 (1.5), 2:naik-2025-11-26-2025-12-09 (1.5); US$0.0421, 1643 s.

- omongan 1: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu b/70, a/60, a/60
  - pesan: "Perusahaan T kena setop bursa hari ini. Gue yakin banget ini bukan yang pertama, soalnya awal tahun juga sempat kena setop." (kunci a)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 60 (tebakan: b/70, a/60, a/60). Alasan mereka: "Pesan Rizky menyebut setop hari ini dan awal tahun juga pernah, dan alasan suspensi berulang yang paling lazim adalah harga naik kumulatif." "Pesan Rizky menyebut awal tahun juga pernah d
- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/80, a/85, a/70
  - pesan: "Gue udah hafal pola ginian: dari 26 November sampai 9 Desember harganya naik Rp58, terus hari ini bursa setop, pasti gara-gara naiknya itu. Bukan karena usaha mereka kenapa-napa." (kunci a)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 78 (tebakan: a/80, a/85, a/70). Alasan mereka: "Fajar menyebut harga naik Rp58 dan bursa setop karena kenaikan itu, cocok dengan opsi a yang menyatakan suspensi karena kenaikan harga kumulatif." "Pesan Fajar menyebut harga naik Rp58 da
- **sudut dibuang**: omongan 1 `susp-2025-12-10` → `kelipatan-2025-11-26-2025-12-09`
- **sudut dibuang**: omongan 2 `naik-2025-11-26-2025-12-09` → `hari-naik-beruntun`

**Putaran 6** — tulis 1, 2; sudut 1:kelipatan-2025-11-26-2025-12-09 (2.1), 2:hari-naik-beruntun (2.1); US$0.0215, 246 s.

- omongan 1: **ditolak-pemeriksa**
  - pesan: "Gila gue panik, harga Perusahaan T udah 2,21 kali dari 26 November! Takut banget kejebak di puncak, ada yang tau kenapa bisa segini?" (kunci a)
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Penjelasan memuat angka di luar rujukan: 48, 106. Tulis tiap angka sebagai [[fact_id/teks]].
- omongan 2: **tidak-ada**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1655 (line 1 column 1656)

**Putaran 7** — tulis 1, 2; sudut 1:kelipatan-2025-11-26-2025-12-09 (2.2), 2:hari-naik-beruntun (2.2); US$0.0930, 659 s.

- omongan 1: **lolos** · pembaca kartu a (kunci a) · tanpa kartu c/78, c/78, c/65 · kritikus: 0 keberatan
  - pesan: "Gila gue panik, Perusahaan T udah naik 2,21 kali dari 26 November! Ini gara-gara ada yang ngeborong gede ya? Gue takut banget kejebak." (kunci a)
- omongan 2: **lolos** · pembaca kartu b (kunci b) · tanpa kartu c/60, c/60, c/58 · kritikus: 0 keberatan
  - pesan: "Gue udah liat Perusahaan T naik terus dari 26 November sampai 9 Desember, nggak ada putusnya. Kalian telat nyadar aja, gue dari dulu pantau." (kunci b)

### DADA — putaran demi putaran

**Putaran 1** — tulis 1, 2, 3; sudut 1:kelipatan-2025-08-01-2025-10-08 (1.1), 2:jumlah-jual-terverifikasi (1.1), 3:susp-2025-06-30 (1.1); US$0.0378, 1489 s.

- omongan 1: **tidak-ada**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1416 (line 1 column 1417)
- omongan 2: **ditolak-tebak** · pembaca kartu c (kunci c) · tanpa kartu c/55, c/60, c/65
  - pesan: "Gue udah telusurin laporan si pemilik terbesar. Dia cuma lepas 70.000.000 lembar, sekali doang, nggak nambah lagi, jadi yang bilang dia jualan gede-gedean itu cuma bikin panik." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 60 (tebakan: c/55, c/60, c/65). Alasan mereka: "Fajar menyebut 70.000.000 lembar, sedangkan pilihan c menyebut 299.500.000 lembar, sehingga omongan Fajar kemungkinan keliru." "Angka 299.500.000 lembar di opsi c membantah klaim Fajar ya
- omongan 3: **tidak-ada**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Expected ',' or ']' after array element in JSON at position 1532 (line 1 column 1533)

**Putaran 2** — tulis 1, 2, 3; sudut 1:kelipatan-2025-08-01-2025-10-08 (1.2), 2:jumlah-jual-terverifikasi (1.2), 3:susp-2025-06-30 (1.2); US$0.0517, 1234 s.

- omongan 1: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/45, b/65, a/60
  - pesan: "Gue cek riwayat harganya, nggak bohong: naiknya udah 22,25 kali lipat. Coba cek sendiri deh, serius." (kunci a)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 53 (tebakan: a/45, b/65, a/60). Alasan mereka: "Pesan menyebut kenaikan harga 22,25 kali lipat, dan opsi a memakai tanggal penutupan terbaru yang paling mungkin ada di riwayat harga." "Pesan Wulan menyebut riwayat harga dan kenaikan 22
- omongan 2: **ditolak-tebak** · pembaca kartu b (kunci b) · tanpa kartu b/60, b/65, b/60
  - pesan: "Gue udah jumlahin sendiri dari laporannya, totalnya 299.500.000 lembar. Percaya gue, nggak usah diragukan lagi." (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 62 (tebakan: b/60, b/65, b/60). Alasan mereka: "Pesan menyebut total hasil penjumlahan laporan, dan opsi b paling sesuai karena menyatakan gabungan tiga laporan, sedangkan angka 70 juta di opsi c hanya salah satu komponen." "Kata 'juml
- omongan 3: **ditolak-tebak** · pembaca kartu c (kunci c) · tanpa kartu c/70, c/80, c/80
  - pesan: "Gue baca katanya saham ini disetop bursa sejak 30 Juni gara-gara laporan keuangan auditan tahunan belum diserahkan, dan kayaknya masih setop ya sampai sekarang? Gue nggak lihat kabar dibukanya." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 77 (tebakan: c/70, c/80, c/80). Alasan mereka: "Adanya harga penutupan pada 8 Oktober 2025 menunjukkan saham sudah diperdagangkan, sehingga klaim Sari bahwa masih disetop tidak cocok." "Adanya harga penutupan pada 8 Oktober 2025 menunj

**Putaran 3** — tulis 1, 2, 3; sudut 1:kelipatan-2025-08-01-2025-10-08 (1.3), 2:jumlah-jual-terverifikasi (1.3), 3:susp-2025-06-30 (1.3); US$0.0940, 2618 s.

- omongan 1: **ditolak-tebak** · pembaca kartu c (kunci c) · tanpa kartu c/90, c/85, c/75
  - pesan: "Gue iseng bandingin harga penutupan 1 Agustus sama 8 Oktober, hasilnya 22,25 kali. Nggak nyangka banget, coba cek deh." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 83 (tebakan: c/90, c/85, c/75). Alasan mereka: "Pesan Tono sendiri menyebut perbandingan penutupan 1 Agustus dan 8 Oktober, cocok dengan opsi c." "Pernyataan Tono menyebutkan penutupan 1 Agustus dan 8 Oktober, sehingga opsi yang menyat
- omongan 2: **ditolak-tebak** · pembaca kartu d (kunci d) · tanpa kartu d/70, d/70, d/85
  - pesan: "Gue udah cek semua laporannya satu-satu, nggak mungkin salah. Pemilik terbesar jual 299.500.000 lembar lewat tiga laporan, semuanya dilaporkan 25 Agustus. Percaya gue deh." (kunci d)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "d", rata-rata keyakinan 75 (tebakan: d/70, d/70, d/85). Alasan mereka: "Fajar mengklaim semua laporan tanggal 25 Agustus, tetapi opsi d menyebut satu laporan terbit 1 September 2025, sehingga ada ketidakcocokan tanggal." "Klaim Fajar bahwa ketiga laporan terb
- omongan 3: **lolos** · pembaca kartu b (kunci b) · tanpa kartu d/85, d/65, d/85 · kritikus: 0 keberatan
  - pesan: "Gue ragu nih, saham ini kan disetop bursa 30 Juni gara-gara laporan keuangan auditan tahunan belum diserahkan. Katanya cuma sampai 5 Juli doang, terus udah dibuka lagi, bener nggak sih?" (kunci b)

**Putaran 4** — tulis 1, 2; sudut 1:kelipatan-2025-08-01-2025-10-08 (1.4), 2:jumlah-jual-terverifikasi (1.4); US$0.0460, 1074 s.

- omongan 1: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu b/65, a/80, a/60
  - pesan: "Gue baru ngeh, harga penutupan 8 Oktober itu 22,25 kali lipat harga penutupan 1 Agustus. Nggak nyangka banget, coba cek deh." (kunci a)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 70 (tebakan: b/65, a/80, a/60). Alasan mereka: "Pesan Sari secara eksplisit membandingkan harga penutupan 8 Oktober dengan 1 Agustus, sesuai dengan opsi a." "Pesan Sari secara eksplisit membandingkan penutupan 8 Oktober dengan 1 Agustu
- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu d/60, c/60, a/65
  - pesan: "Gue udah itung sendiri dari laporannya, nggak usah diraguin. Pemilik terbesar udah jual 299.500.000 lembar, itu total semua laporan penjualannya, percaya gue aja." (kunci a)
  - [penebak tanpa kartu] 1/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 65 (tebakan: d/60, c/60, a/65). Alasan mereka: "Pernyataan Rizky menyebut 299.500.000 lembar sebagai total semua laporan penjualan, dan opsi a adalah satu-satunya yang menyatakan angka itu jumlah dari 3 laporan." — jawaban benar harus 

**Putaran 5** — tulis 1, 2; sudut 1:kelipatan-2025-08-01-2025-10-08 (1.5), 2:jumlah-jual-terverifikasi (1.5); US$0.0269, 589 s.

- omongan 1: **ditolak-pemeriksa**
  - pesan: "Gue liat grafiknya, dari 1 Agustus sampai 7 Oktober harganya naik 22,25 kali lipat. Nggak salah lagi, ini yang paling gede." (kunci c)
  - [pemeriksa: ANGKA_TANPA_RUJUKAN] Penjelasan memuat angka di luar rujukan: 7. Tulis tiap angka sebagai [[fact_id/teks]].
- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/70, d/60, a/85
  - pesan: "Gue udah cek semua laporannya, nggak usah dibantah. Pemilik terbesar udah lepas 299.500.000 lembar, itu gabungan dari tiga laporan penjualannya. Percaya gue aja." (kunci a)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 78 (tebakan: a/70, d/60, a/85). Alasan mereka: "Pesan Tono secara eksplisit menyebut 299.500.000 lembar adalah gabungan dari tiga laporan penjualan pemilik terbesar, cocok dengan pilihan a." "Pesan Tono menyebut 299.500.000 lembar seba
- **sudut dibuang**: omongan 1 `kelipatan-2025-08-01-2025-10-08` → `laporan-jual-terverifikasi`
- **sudut dibuang**: omongan 2 `jumlah-jual-terverifikasi` → `andai-10-lot-dividen`

**Putaran 6** — tulis 1, 2; sudut 1:laporan-jual-terverifikasi (2.1), 2:andai-10-lot-dividen (2.1); US$0.0301, 912 s.

- omongan 1: **ditolak-pemeriksa**
  - pesan: "Gila, pemilik terbesarnya udah jualan 299,5 juta lembar! Ada 3 laporan segala. Ini pasti mau ditinggalin nih, gue takut banget." (kunci a)
  - [pemeriksa: ANGKA_TAK_COCOK] Pilihan b: [[laporan-jual-terverifikasi/2 laporan]] menampilkan 2, yang tidak ada di fakta itu (Laporan penjualan pemilik terbesar yang lolos seluruh pemeriksaan: 3 laporan.)
  - [pemeriksa: ANGKA_TAK_COCOK] Pilihan d: [[jumlah-jual-terverifikasi/199,5 juta lembar]] menampilkan 199,5, yang tidak ada di fakta itu (Penjualan pemilik terbesar di laporan yang lolos seluruh pemeriksaan: 70.000.000 + 179.500.000 + 50.000.000 = 299.500.000 lembar.)
- omongan 2: **tidak-ada**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1588 (line 1 column 1589)

**Putaran 7** — tulis 1, 2; sudut 1:laporan-jual-terverifikasi (2.2), 2:andai-10-lot-dividen (2.2); US$0.0314, 845 s.

- omongan 1: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/85, a/80, a/75
  - pesan: "Gila, pemilik terbesarnya jualan terus! Ada 3 laporan penjualan yang lolos pemeriksaan. Ini pasti mau ditinggalin nih, gue panik banget." (kunci a)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 80 (tebakan: a/85, a/80, a/75). Alasan mereka: "Pesan Tono secara eksplisit menyebut ada 3 laporan penjualan yang lolos pemeriksaan, sama seperti pilihan a." "Pesan Tono secara eksplisit menyebut ada 3 laporan penjualan yang lolos peme
- omongan 2: **tidak-ada**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1697 (line 1 column 1698)

**Putaran 8** — tulis 1, 2; sudut 1:laporan-jual-terverifikasi (2.3), 2:andai-10-lot-dividen (2.3); US$0.0745, 1352 s.

- omongan 1: **lolos** · pembaca kartu b (kunci b) · tanpa kartu d/60, a/70, a/60 · kritikus: 0 keberatan
  - pesan: "Gue panik nih, pemilik terbesar katanya udah lepas 299,5 juta lembar saham. Tapi laporannya nggak lolos pemeriksaan, jadi angkanya belum tentu bener." (kunci b)
- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/80, a/78, a/85
  - pesan: "Gue pegang 10 lot, dividen tunai yang gue dapet Rp140. Gue yang paling teliti ngitung di grup ini, kalian mah baru ngeh sekarang." (kunci a)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 81 (tebakan: a/80, a/78, a/85). Alasan mereka: "10 lot sama dengan 1.000 lembar, sehingga Rp140 berarti dividen tunai per lembar Rp0,14 dan dihitung dari jumlah lembar yang dipegang." "10 lot sama dengan 1.000 lembar, sehingga Rp140 di

**Putaran 9** — tulis 2; sudut 2:andai-10-lot-dividen (2.4); US$0.0166, 205 s.

- omongan 2: **ditolak-tebak** · pembaca kartu c (kunci c) · tanpa kartu c/95, c/95, c/100
  - pesan: "Gue udah ngitung dividen tunai dari 10 lot yang gue pegang, dapet Rp140. Kalian mah baru ngeh sekarang, padahal angkanya udah ada dari dulu." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 97 (tebakan: c/95, c/95, c/100). Alasan mereka: "10 lot = 1.000 lembar; jika dividen Rp0,14 per lembar, totalnya 1.000 × Rp0,14 = Rp140, cocok dengan hitungan Sari." "10 lot = 1.000 lembar, jadi Rp0,14 per lembar dikali 1.000 lembar me

**Putaran 10** — tulis 2; sudut 2:andai-10-lot-dividen (2.5); US$0.0165, 174 s.

- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/90, a/95, a/95
  - pesan: "Gue udah pegang 10 lot dari lama, santai aja. Dividen tunainya udah cair Rp140 buat gue, kalian mah baru ngeh sekarang." (kunci a)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 93 (tebakan: a/90, a/95, a/95). Alasan mereka: "10 lot sama dengan 1.000 lembar, sehingga dividen Rp0,14 per lembar menghasilkan Rp140." "10 lot sama dengan 1.000 lembar, jadi Rp0,14 per lembar dikali 1.000 lembar = Rp140." "10 lot sam
- **sudut dibuang**: omongan 2 `andai-10-lot-dividen` → `fil-2025-09-01-01`

**Putaran 11** — tulis 2; sudut 2:fil-2025-09-01-01 (3.1); US$0.0164, 773 s.

- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu c/85, a/75, c/85
  - pesan: "Gue ragu nih, katanya pemilik terbesar jual 50 juta lembar tanggal 14 Agustus, tapi baru dilaporkan 1 September. Jangan-jangan porsinya nggak berubah ya?" (kunci a)
  - [penebak tanpa kartu] 1/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 75 (tebakan: c/85, a/75, c/85). Alasan mereka: "Jika pemilik terbesar semula memegang 1 miliar lembar (61,79%), menjual 50 juta lembar berarti turun 5%, sehingga porsinya menjadi sekitar 58,70%." — jawaban benar harus melawan dugaan pe

**Putaran 12** — tulis 2; sudut 2:fil-2025-09-01-01 (3.2); US$0.0156, 425 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Gue ragu nih, katanya pemilik terbesar jual 50 juta lembar tanggal 14 Agustus, tapi baru dilaporkan 1 September. Jangan-jangan porsinya nggak berubah ya?" (kunci a)
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1860 (line 1 column 1861)

**Putaran 13** — tulis 2; sudut 2:fil-2025-09-01-01 (3.3); US$0.0331, 509 s.

- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/80, a/100 (tak terbaca), c/82
  - pesan: "Gue ragu nih, katanya pemilik terbesar jual 50 juta lembar tanggal 14 Agustus, laporannya baru masuk 1 September. Tapi porsinya cuma turun dikit, aneh nggak sih?" (kunci a)
  - [penebak tanpa kartu] 2/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 90 (tebakan: a/80, a/100, c/82). Alasan mereka: "Selisih 59,38% ke 58,7% sekitar 0,68 poin persen, cocok dengan penjualan 50 juta lembar dan komentar 'turun dikit'." "(tak terbaca)" — jawaban benar harus melawan dugaan pertama orang ya

**Putaran 14** — tulis 2; sudut 2:fil-2025-09-01-01 (3.4); US$0.0236, 216 s.

- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/85, a/80, a/85
  - pesan: "Gue ragu nih, katanya pemilik terbesar udah lepas sahamnya tiga kali dalam sebulan. Yang terakhir bikin porsinya turun ke 58,7 persen. Berarti dia beneran mundur ya?" (kunci a)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 83 (tebakan: a/85, a/80, a/85). Alasan mereka: "Selisih angka 62,73 ke 61,79 ke 59,38 lalu ke 58,7 konsisten dengan tiga kali penjualan, sehingga porsi terakhir 58,7 persen cocok dengan omongan Tono." "Angka 58,7 persen yang disebut To

**Putaran 15** — tulis 2; sudut 2:fil-2025-09-01-01 (3.5); US$0.0156, 97 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Gue ragu nih, katanya pemilik terbesar udah lepas sahamnya tiga kali dalam sebulan. Yang terakhir bikin porsinya turun ke 58,7 persen. Berarti dia beneran mundur ya?" (kunci a)
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1687 (line 1 column 1688)
- **sudut dibuang**: omongan 2 `fil-2025-09-01-01` → tidak ada pengganti

### ULTJ — putaran demi putaran

**Putaran 1** — tulis 1, 2, 3; sudut 1:tahun-berdividen (1.1), 2:fil-jan-orang-dalam-lain (1.1), 3:turun-2026-05-04 (1.1); US$0.0345, 349 s.

- omongan 1: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/70, a/60, a/65
  - pesan: "Gue udah cek, Perusahaan U udah 7 tahun berturut-turut bagi dividen tunai, nggak pernah bolong. Yakin banget, tiap tahun pasti ada." (kunci a)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 65 (tebakan: a/70, a/60, a/65). Alasan mereka: "Pesan Sinta secara eksplisit menyatakan dividen tunai 7 tahun berturut-turut tanpa bolong, sehingga paling cocok dengan opsi a." "Pesan Sinta menyatakan dividen tunai dibagikan berturut-t
- omongan 2: **tidak-ada**
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1500 (line 1 column 1501)
- omongan 3: **ditolak-tebak** · pembaca kartu d (kunci d) · tanpa kartu d/60, d/65, d/65
  - pesan: "Gue liat harga buka Perusahaan U hari ini Rp1.545, kayak jatuh lumayan jauh dari penutupan terakhir. Bener nggak sih? Gue ragu, takut salah baca grafik." (kunci d)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "d", rata-rata keyakinan 63 (tebakan: d/60, d/65, d/65). Alasan mereka: "Opsi d adalah satu-satunya yang menguatkan klaim Nadia bahwa harga jatuh dari penutupan terakhir dengan selisih spesifik Rp145." "Selisih Rp145 dari penutupan terakhir ke harga buka Rp1.5

**Putaran 2** — tulis 1, 2, 3; sudut 1:tahun-berdividen (1.2), 2:fil-jan-orang-dalam-lain (1.2), 3:turun-2026-05-04 (1.2); US$0.1730, 1029 s.

- omongan 1: **kritikus-tidak-menjawab** · pembaca kartu b (kunci b) · tanpa kartu d/60, a/60, d/55 · kritikus: tidak menjawab
  - pesan: "Gue yakin dividen tunai Perusahaan U nggak beruntun, dan nilainya makin kecil tiap tahun. Gue inget banget, jadi jangan harap rutin." (kunci b)
  - [kritikus] kritikus tidak menjawab (terpotong, tak terbaca, atau galat) dua kali; versi ini diperiksa lagi di putaran berikutnya tanpa ditulis ulang.
- omongan 2: **ditolak-tebak** · pembaca kartu c (kunci c) · tanpa kartu b/60, b/55, c/60
  - pesan: "Gue udah pantau dari awal, orang dalam lain di Perusahaan U nambah saham terus sepanjang Januari. Tapi gue yakin pemilik terbesarnya yang nambah paling banyak, dia kan yang paling tau." (kunci c)
  - [penebak tanpa kartu] 1/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 60 (tebakan: b/60, b/55, c/60). Alasan mereka: "Bagian 'orang dalam lain menambah' mungkin benar, tetapi keyakinan Gilang bahwa pemilik terbesar menambah paling banyak kemungkinan tidak cocok dengan dokumen." — jawaban benar harus mela
- omongan 3: **lolos** · pembaca kartu a (kunci a) · tanpa kartu b/40, b/55, c/50 · kritikus: 0 keberatan
  - pesan: "Katanya kalau lagi bagi dividen harga turun sebanyak dividennya, tapi di Perusahaan U hari ini kok jatuhnya nggak sama ya? Gue ragu nih, takut salah baca." (kunci a)

**Putaran 3** — tulis 2; bawa 1; sudut 1:tahun-berdividen (1.3), 2:fil-jan-orang-dalam-lain (1.3); US$0.1109, 478 s.

- omongan 1: **ditolak-kritikus** · pembaca kartu b (kunci b) · tanpa kartu a/60, a/80, d/45 · kritikus: 1 keberatan
  - pesan: "Gue yakin dividen tunai Perusahaan U nggak beruntun, dan nilainya makin kecil tiap tahun. Gue inget banget, jadi jangan harap rutin." (kunci b)
  - [kritikus: makna, penjelasan] Penjelasan hanya membantah klaim 'makin besar terus' dari pilihan d dan tidak pernah membantah klaim Wulan 'makin kecil tiap tahun' yang justru dibantah kartu 4 (Rp130 per lembar), sehingga kalimat 'memang pernah turun' bisa terbaca seolah membenarkan omongan Wulan.
  - [kritikus: arahan] Lengkapi bagian nilai di penjelasan dengan kenaikan dividen ke Rp130 per lembar pada 2026 agar klaim Wulan 'makin kecil tiap tahun' juga jelas terbantahkan, bukan hanya klaim 'makin besar terus' milik pilihan d.
- omongan 2: **ditolak-tebak** · pembaca kartu c (kunci c) · tanpa kartu c/85, c/78, c/85
  - pesan: "Gue udah pantau dari awal, orang dalam lain di Perusahaan U itu beli sahamnya nggak cuma sekali, laporannya nongol terus di Januari. Gue yakin banget, dia paling tau kapan waktunya masuk." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 83 (tebakan: c/85, c/78, c/85). Alasan mereka: "Pernyataan Fajar menyebut orang dalam lain menambah saham lebih dari sekali dan laporannya muncul terus di Januari, cocok dengan opsi c." "Pernyataan Fajar persis menyebut orang dalam lai

**Putaran 4** — tulis 1, 2; sudut 1:tahun-berdividen (1.4), 2:fil-jan-orang-dalam-lain (1.4); US$0.0212, 157 s.

- omongan 1: **ditolak-tebak** · pembaca kartu c (kunci c) · tanpa kartu c/60, c/60, c/60
  - pesan: "Gue yakin banget, dividen tunai Perusahaan U tuh udah rutin tiap tahun sejak 10 tahun lalu, nggak pernah bolong. Aman." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 60 (tebakan: c/60, c/60, c/60). Alasan mereka: "Pesan Nadia mengklaim 10 tahun tanpa bolong, sedangkan opsi c menyatakan hanya 7 tahun terakhir meski beruntun, sehingga klaim 10 tahun tidak cocok." "Nadia menyebut 10 tahun, sedangkan p
- omongan 2: **ditolak-tebak** · pembaca kartu c (kunci c) · tanpa kartu c/60, c/60, c/60
  - pesan: "Gue udah baca laporannya kok, orang dalam lain di Perusahaan U itu cuma beli sekali doang di Januari, abis itu diem. Nggak ada laporan kedua. Percaya gue, gue pantau terus." (kunci c)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 60 (tebakan: c/60, c/60, c/60). Alasan mereka: "Pesan Gilang menegaskan tidak ada laporan kedua, sedangkan opsi c menyebut ada beberapa laporan penambahan saham, sehingga kemungkinan dokumen menunjukkan Gilang keliru." "Gilang mengklai

**Putaran 5** — tulis 1, 2; sudut 1:tahun-berdividen (1.5), 2:fil-jan-orang-dalam-lain (1.5); US$0.0318, 205 s.

- omongan 1: **ditolak-pemeriksa**
  - pesan: "Gue yakin banget, Perusahaan U tuh nggak pernah bolong bagi dividen tunai tiap tahun. Buktinya dari 2020 sampai sekarang masih jalan terus. Aman lah." (kunci a)
  - [pemeriksa: KUNCI_SERAGAM, seluruh draf] Huruf kunci ketiga omongan sama semua ("a").
- omongan 2: **ditolak-pemeriksa**
  - pesan: "Gue pantau terus lho, orang dalam lain di Perusahaan U itu beli terus tiap minggu sepanjang Januari. Nggak mungkin cuma sekali, gue hafal polanya." (kunci a)
  - [pemeriksa: KUNCI_SERAGAM, seluruh draf] Huruf kunci ketiga omongan sama semua ("a").
- **sudut dibuang**: omongan 1 `tahun-berdividen` → `laporan-jan-2026`
- **sudut dibuang**: omongan 2 `fil-jan-orang-dalam-lain` → `fil-jan-orang-dalam-lain-laporan`

**Putaran 6** — tulis 1, 2; sudut 1:laporan-jan-2026 (2.1), 2:fil-jan-orang-dalam-lain-laporan (2.1); US$0.0232, 154 s.

- omongan 1: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu a/80, a/60, a/70
  - pesan: "Gila, orang dalemnya beli terus sebulan penuh! Ada 8 laporan semua isinya beli, ini pasti ada yang mereka tau dan kita nggak. Serem banget, gue jadi takut nih." (kunci a)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 70 (tebakan: a/80, a/60, a/70). Alasan mereka: "Pesan Tio menyatakan ada 8 laporan dan semuanya berisi pembelian, sama dengan isi pilihan a." "Pesan Tio secara eksplisit menyebut ada 8 laporan dan semuanya berisi pembelian, sehingga pa
- omongan 2: **ditolak-tebak** · pembaca kartu b (kunci b) · tanpa kartu b/72, b/60, b/70
  - pesan: "Gue udah pantau dari awal tahun, orang dalam lain di Perusahaan U itu laporannya ada 6 kali sepanjang Januari. Kalian baru ngeh sekarang ya." (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 67 (tebakan: b/72, b/60, b/70). Alasan mereka: "Enam laporan insider sepanjang Januari paling masuk akal tersebar dalam rentang 6–22 Januari, bukan semuanya di minggu yang sama." "Pernyataan Gilang menyebut 6 laporan sepanjang Januari,

**Putaran 7** — tulis 1, 2; sudut 1:laporan-jan-2026 (2.2), 2:fil-jan-orang-dalam-lain-laporan (2.2); US$0.0579, 288 s.

- omongan 1: **lolos** · pembaca kartu b (kunci b) · tanpa kartu a/78, a/70, a/60 · kritikus: 0 keberatan
  - pesan: "Gila, orang dalam Perusahaan U ada 8 laporan sepanjang Januari, dan ada yang isinya jual. Ini pasti ada yang disembunyiin, gue panik nih." (kunci b)
- omongan 2: **ditolak-kartu** · pembaca kartu a (kunci d)
  - pesan: "Gue udah pantau dari awal tahun, orang dalam lain di Perusahaan U itu laporannya keluar terus tiap minggu sepanjang Januari. Kalian baru ngeh ya." (kunci d)
  - [pembaca kartu] Pembaca yang MEMEGANG kartu memilih "a", padahal kunci "d" (alasannya: "Kartu 1 menyatakan orang dalam lain menerbitkan 6 laporan dalam rentang 6–22 Januari, jadi laporan keluar beberapa kali, bukan hanya sekali atau di awal dan akhir saja."). Periksa dulu apakah kuncimu memang benar menurut kartu — pem

**Putaran 8** — tulis 2; sudut 2:fil-jan-orang-dalam-lain-laporan (2.3); US$0.0138, 107 s.

- omongan 2: **ditolak-tebak** · pembaca kartu b (kunci b) · tanpa kartu b/60, b/65, b/65
  - pesan: "Gue udah pantau dari awal tahun. Orang dalam lain di Perusahaan U itu laporannya keluar 6 kali sepanjang Januari, numpuk semua di minggu pertama. Kalian baru ngeh ya." (kunci b)
  - [penebak tanpa kartu] 3/3 penebak TANPA kartu memilih kunci "b", rata-rata keyakinan 63 (tebakan: b/60, b/65, b/65). Alasan mereka: "Adit benar soal jumlah 6, tetapi klaim menumpuk di minggu pertama tidak cocok karena laporan tersebar sampai 22 Januari." "Pilihan b menyebut laporan tersebar sampai 22 Januari, sehingga 

**Putaran 9** — tulis 2; sudut 2:fil-jan-orang-dalam-lain-laporan (2.4); US$0.0160, 108 s.

- omongan 2: **ditolak-pemeriksa**
  - pesan: "Gue udah pantau dari awal tahun. Orang dalam lain di Perusahaan U itu laporannya keluar 6 kali sepanjang Januari, numpuk semua di minggu pertama. Kalian baru ngeh ya." (kunci b)
  - [bentuk] keluaran bukan JSON yang sah: JSON tidak bisa diurai: Unexpected non-whitespace character after JSON at position 1528 (line 1 column 1529)

**Putaran 10** — tulis 2; sudut 2:fil-jan-orang-dalam-lain-laporan (2.5); US$0.0122, 80 s.

- omongan 2: **ditolak-tebak** · pembaca kartu c (kunci c) · tanpa kartu c/55, a/60, a/80
  - pesan: "Gue udah pantau dari awal tahun. Yang paling rajin lapor di Perusahaan U itu pemilik terbesarnya, 6 kali sepanjang Januari. Kalian baru ngeh ya." (kunci c)
  - [penebak tanpa kartu] 1/3 penebak TANPA kartu memilih kunci "c", rata-rata keyakinan 55 (tebakan: c/55, a/60, a/80). Alasan mereka: "Pesan Adit mengklaim pemilik terbesar, tetapi opsi yang membedakan pelaku menunjukkan yang lapor 6 kali adalah orang dalam lain, dan waktunya tetap sepanjang Januari." — jawaban benar har
- **sudut dibuang**: omongan 2 `fil-jan-orang-dalam-lain-laporan` → `beda-turun-dividen`

**Putaran 11** — tulis 2; sudut 2:beda-turun-dividen (3.1); US$0.0189, 113 s.

- omongan 2: **ditolak-tebak** · pembaca kartu a (kunci a) · tanpa kartu b/55, b/60, a/70
  - pesan: "Gue liat harga Perusahaan U hari ini jatuh lebih dalem dari dividen yang dibagi. Berarti ada yang aneh dong? Atau gue yang salah baca ya, coba ada yang cek." (kunci a)
  - [penebak tanpa kartu] 1/3 penebak TANPA kartu memilih kunci "a", rata-rata keyakinan 70 (tebakan: b/55, b/60, a/70). Alasan mereka: "Pesan Tio menyatakan harga jatuh lebih dalam daripada dividen yang dibagikan, sama dengan opsi a." — jawaban benar harus melawan dugaan pertama orang yang belum membaca kartu.

**Putaran 12** — tulis 2; sudut 2:beda-turun-dividen (3.2); US$0.0383, 184 s.

- omongan 2: **lolos** · pembaca kartu b (kunci b) · tanpa kartu a/60, a/60, a/60 · kritikus: 0 keberatan
  - pesan: "Gue denger katanya kalau lagi bagi dividen, harga jatuh sebanyak dividennya. Di Perusahaan U kayaknya pas banget deh, nggak ada selisihnya. Bener nggak sih? Gue ragu nih." (kunci b)

## Draf akhir TIRT

**Terbit** — ketiga omongan lolos keempat penilai. Draf utuh, apa adanya:

**Omongan 1 — DIKUNCI**

> **Nadia (19.47):** Gila gue panik, Perusahaan T udah naik 2,21 kali dari 26 November! Ini gara-gara ada yang ngeborong gede ya? Gue takut banget kejebak.

- **a) Betul, 2,21 kali itu dari penutupan dibanding penutupan, jadi naiknya nyata.** (kunci)
- b) Betul, 2,21 kali itu dari harga pembukaan, jadi wajar panik.
- c) Keliru, 2,21 kali itu jumlah lembar yang ditransaksikan, bukan harga.
- d) Keliru, penutupan terakhir masih di bawah penutupan akhir November, jadi belum naik.

**Omongan 2 — DIKUNCI**

> **Rizky (20.15):** Gue udah liat Perusahaan T naik terus dari 26 November sampai 9 Desember, nggak ada putusnya. Kalian telat nyadar aja, gue dari dulu pantau.

- a) Betul, naiknya nggak putus karena tiap hari jumlah lembar yang ditransaksikan nambah.
- **b) Betul, tiap hari bursa penutupannya lebih tinggi dari hari sebelumnya, nggak putus.** (kunci)
- c) Keliru, di rentang itu ada hari bursa yang penutupannya lebih rendah dari hari sebelumnya.
- d) Keliru, yang naik beruntun cuma harga tertinggi harian, penutupannya diam aja.

**Omongan 3 — DIKUNCI**

> **Santi (21.08):** Perusahaan T disetop lagi hari ini, terus yang 21 Januari dulu juga. Itu dulu gara-gara harganya naik juga kan? Gue ragu sih, kayaknya gitu.

- a) Betul, setop awal tahun juga karena kenaikan harga kumulatif, sama seperti setop hari ini.
- b) Betul, setop awal tahun karena harganya naik beruntun, jadi sama saja dengan yang sekarang.
- **c) Keliru, setop awal tahun karena bursa ragu usaha bakal lanjut, bukan soal harga.** (kunci)
- d) Keliru, setop awal tahun karena sahamnya nggak ada yang beli, bukan soal harga.

```json
{
  "omongan": [
    {
      "nama": "Nadia",
      "jam": "19.47",
      "pesan": "Gila gue panik, Perusahaan T udah naik 2,21 kali dari 26 November! Ini gara-gara ada yang ngeborong gede ya? Gue takut banget kejebak.",
      "angka_pesan": [
        {
          "teks": "2,21 kali",
          "fact_id": "kelipatan-2025-11-26-2025-12-09"
        },
        {
          "teks": "26 November",
          "fact_id": "harga-2025-11-26"
        }
      ],
      "kartu": [
        "harga-2025-11-26",
        "harga-2025-12-09",
        "kelipatan-2025-11-26-2025-12-09",
        "susp-2025-12-10"
      ],
      "kartu_penentu": [
        "kelipatan-2025-11-26-2025-12-09"
      ],
      "pilihan": {
        "a": "Betul, [[kelipatan-2025-11-26-2025-12-09|2,21 kali]] itu dari penutupan dibanding penutupan, jadi naiknya nyata.",
        "b": "Betul, [[kelipatan-2025-11-26-2025-12-09|2,21 kali]] itu dari harga pembukaan, jadi wajar panik.",
        "c": "Keliru, [[kelipatan-2025-11-26-2025-12-09|2,21 kali]] itu jumlah lembar yang ditransaksikan, bukan harga.",
        "d": "Keliru, penutupan terakhir masih di bawah penutupan akhir November, jadi belum naik."
      },
      "kunci": "a",
      "penjelasan": "Penutupan [[harga-2025-11-26|26 November 2025]] ada di [[harga-2025-11-26|Rp48 per lembar]] dan penutupan [[harga-2025-12-09|9 Desember 2025]] ada di [[harga-2025-12-09|Rp106 per lembar]]. Bandingkan dua-duanya, hasilnya [[kelipatan-2025-11-26-2025-12-09|2,21 kali]], jadi angka yang diteriakkan temanmu itu bukan karangan. Yang bikin orang salah kalau angka itu disangka datang dari harga pembukaan atau dari jumlah lembar yang diperdagangkan, karena dasarnya penutupan dibanding penutupan. Soal kenapa naik, yang tertulis cuma peningkatan harga kumulatif di [[susp-2025-12-10|pengumuman 10 Desember 2025]], bukan soal ada yang ngeborong. Salah-kaprah yang umum: dengar angka naik besar langsung dicap hoaks, padahal cukup bandingkan dua penutupan yang tertulis."
    },
    {
      "nama": "Rizky",
      "jam": "20.15",
      "pesan": "Gue udah liat Perusahaan T naik terus dari 26 November sampai 9 Desember, nggak ada putusnya. Kalian telat nyadar aja, gue dari dulu pantau.",
      "angka_pesan": [
        {
          "teks": "26 November",
          "fact_id": "harga-2025-11-26"
        },
        {
          "teks": "9 Desember",
          "fact_id": "harga-2025-12-09"
        }
      ],
      "kartu": [
        "hari-naik-beruntun",
        "harga-2025-11-26",
        "harga-2025-12-09"
      ],
      "kartu_penentu": [
        "hari-naik-beruntun"
      ],
      "pilihan": {
        "a": "Betul, naiknya nggak putus karena tiap hari jumlah lembar yang ditransaksikan nambah.",
        "b": "Betul, tiap hari bursa penutupannya lebih tinggi dari hari sebelumnya, nggak putus.",
        "c": "Keliru, di rentang itu ada hari bursa yang penutupannya lebih rendah dari hari sebelumnya.",
        "d": "Keliru, yang naik beruntun cuma harga tertinggi harian, penutupannya diam aja."
      },
      "kunci": "b",
      "penjelasan": "Kalau catatan harganya dibuka, penutupan [[harga-2025-11-26|26 November 2025]] ada di [[harga-2025-11-26|Rp48 per lembar]] dan penutupan [[harga-2025-12-09|9 Desember 2025]] ada di [[harga-2025-12-09|Rp106 per lembar]]. Yang bikin naiknya disebut beruntun ada di ringkasan [[hari-naik-beruntun|sembilan hari bursa]]: tiap hari bursa penutupannya lebih tinggi dari hari sebelumnya, jadi memang nggak ada hari yang turun. Alasan soal jumlah lembar yang ditransaksikan makin nambah itu nggak ada catatannya, jadi nggak bisa dipakai. Salah-kaprah yang umum: dengar naik beruntun panjang langsung dikira mustahil dan dicap hoaks, padahal cukup lihat catatan penutupan hariannya."
    },
    {
      "nama": "Santi",
      "jam": "21.08",
      "pesan": "Perusahaan T disetop lagi hari ini, terus yang 21 Januari dulu juga. Itu dulu gara-gara harganya naik juga kan? Gue ragu sih, kayaknya gitu.",
      "angka_pesan": [
        {
          "teks": "21 Januari",
          "fact_id": "susp-2025-01-21"
        }
      ],
      "kartu": [
        "susp-2025-01-21",
        "susp-2025-12-10",
        "hari-naik-beruntun"
      ],
      "kartu_penentu": [
        "susp-2025-01-21"
      ],
      "pilihan": {
        "a": "Betul, setop awal tahun juga karena kenaikan harga kumulatif, sama seperti setop hari ini.",
        "b": "Betul, setop awal tahun karena harganya naik beruntun, jadi sama saja dengan yang sekarang.",
        "c": "Keliru, setop awal tahun karena bursa ragu usaha bakal lanjut, bukan soal harga.",
        "d": "Keliru, setop awal tahun karena sahamnya nggak ada yang beli, bukan soal harga."
      },
      "kunci": "c",
      "penjelasan": "Setop yang [[susp-2025-01-21|21 Januari 2025]] alasannya beda dari setop hari ini. Waktu itu bursa menulis ragu soal kelanjutan usaha perusahaannya, sedangkan yang sekarang pemicunya kenaikan harga kumulatif, terbaca di [[susp-2025-12-10|pengumuman 10 Desember 2025]]. Jadi kalau anggapannya dua setop itu sama-sama gara-gara harga, itu nggak cocok dengan tulisan bursa sendiri. Lamanya setop juga nggak ada di dokumen, jadi nggak bisa dipastikan. Salah-kaprah yang umum: orang mengira semua setop bursa pemicunya sama, padahal yang awal tahun ragu soal kelanjutan usaha, yang sekarang soal harga."
    }
  ]
}
```

### DADA: omongan yang dikunci

**Omongan 1** (dikunci di putaran 8, sudut `laporan-jual-terverifikasi`)

> **Wawan (20.15):** Gue panik nih, pemilik terbesar katanya udah lepas 299,5 juta lembar saham. Tapi laporannya nggak lolos pemeriksaan, jadi angkanya belum tentu bener.

- a) Betul, laporannya nggak lolos pemeriksaan, jadi angkanya nggak bisa dipercaya.
- **b) Keliru, laporannya lolos pemeriksaan, jumlahnya 3 laporan.** (kunci)
- c) Betul, laporannya nggak lolos pemeriksaan, cuma kabar di grup doang.
- d) Keliru, laporannya lolos pemeriksaan, tapi cuma satu laporan.

**Omongan 3** (dikunci di putaran 3, sudut `susp-2025-06-30`)

> **Ika (21.05):** Gue ragu nih, saham ini kan disetop bursa 30 Juni gara-gara laporan keuangan auditan tahunan belum diserahkan. Katanya cuma sampai 5 Juli doang, terus udah dibuka lagi, bener nggak sih?

- a) Betul, penghentiannya sudah dicabut dan sahamnya diperdagangkan lagi.
- **b) Keliru, tanggal pencabutan penghentiannya nggak ada di catatan.** (kunci)
- c) Betul, penghentiannya dicabut begitu laporan keuangannya masuk.
- d) Keliru, penghentiannya masih jalan sampai 8 Oktober 2025.

### ULTJ: omongan yang dikunci

**Omongan 1** (dikunci di putaran 7, sudut `laporan-jan-2026`)

> **Wulan (18.35):** Gila, orang dalam Perusahaan U ada 8 laporan sepanjang Januari, dan ada yang isinya jual. Ini pasti ada yang disembunyiin, gue panik nih.

- a) Betul, ada juga laporan yang isinya pengurangan saham.
- **b) Keliru, semua laporan itu isinya penambahan saham.** (kunci)
- c) Betul, laporan itu terbitnya cuma dari pemilik terbesar.
- d) Keliru, laporan itu terbitnya bukan cuma dari pemilik terbesar.

**Omongan 2** (dikunci di putaran 12, sudut `beda-turun-dividen`)

> **Fajar (19.50):** Gue denger katanya kalau lagi bagi dividen, harga jatuh sebanyak dividennya. Di Perusahaan U kayaknya pas banget deh, nggak ada selisihnya. Bener nggak sih? Gue ragu nih.

- a) Betul, jatuhnya hari ini persis sebanyak dividen tunai yang dibagikan.
- **b) Keliru, jatuhnya hari ini lebih dalam dari dividen tunai yang dibagikan.** (kunci)
- c) Betul, jatuhnya hari ini lebih dangkal dari dividen tunai yang dibagikan.
- d) Keliru, harganya hari ini nggak jatuh sama sekali dari penutupan terakhir.

**Omongan 3** (dikunci di putaran 2, sudut `turun-2026-05-04`)

> **Sinta (21.40):** Katanya kalau lagi bagi dividen harga turun sebanyak dividennya, tapi di Perusahaan U hari ini kok jatuhnya nggak sama ya? Gue ragu nih, takut salah baca.

- **a) Betul, turunnya hari ini lebih besar dari dividen tunai yang dibagikan.** (kunci)
- b) Betul, turunnya hari ini lebih kecil dari dividen tunai yang dibagikan.
- c) Keliru, turunnya hari ini persis sama dengan dividen tunai yang dibagikan.
- d) Keliru, harga bukanya tidak jatuh dari penutupan terakhir.

## Jalan yang dibuang

Rekamannya utuh di `eval/keluaran-m2d3/dibuang/`; biayanya ikut di total milestone. Sebabnya di catatan penulis.

| jalan | langkah tercatat | panggilan (jejak) | biaya (jejak) | hasil |
|---|---:|---:|---:|---|
| tirt-jalan1 | 11 | 9 | US$0.0323 | dihentikan eksekutor (jejak tidak ditutup) |

## Gerbang G atas versi M2d-2 (retro)

Berapa versi omongan M2d-2 (semua putaran jalan akhir) yang akan ditolak pemeriksa baru — tanpa panggilan model.

| paket | versi M2d-2 | ditolak G-angka-cukup | ditolak G-kaku | dari yang dikunci M2d-2, ditolak G |
|---|---:|---:|---:|---|
| TIRT | 9 | 1 | 1 | 1/2 |
| DADA | 14 | 3 | 0 | 0/1 |
| ULTJ | 14 | 3 | 0 | 0/0 |

## Pembanding eksternal

Penguji dan penilai: subagent Claude (opus) **baru**, tanpa konteks eksekutor, masing-masing hanya menerima isi satu berkas bahan (`eval/keluaran-m2d3/penguji/`); label acak. Jawaban mentah: `penguji/jawaban/`. Petunjuk sama persis dengan M2d-1/M2d-2.

### Tebak buta (tanpa kartu) — gerbang-dalam vs penguji-luar

| paket | omongan | kunci | di dalam (DeepSeek, petunjuk berhitung) | di luar (3 subagent) | benar luar | yakin benar | lolos luar |
|---|---:|---|---|---|---:|---:|---|
| TIRT | 1 | a | c/78, c/78, c/65 | a/40, a/40, a/45 | 3/3 | 42 | **tidak** |
| TIRT | 2 | b | c/60, c/60, c/58 | c/55, c/60, c/55 | 0/3 | — | ya |
| TIRT | 3 | c | a/75, a/80, a/80 | c/45, c/55, c/50 | 3/3 | 50 | **tidak** |
| DADA | 1 | b | d/60, a/70, a/60 | b/40, b/35, b/40 | 3/3 | 38 | **tidak** |
| DADA | 3 | b | d/85, d/65, d/85 | d/45, d/40, d/45 | 0/3 | — | ya |
| ULTJ | 1 | b | a/78, a/70, a/60 | a/40, a/50, a/45 | 0/3 | — | ya |
| ULTJ | 2 | b | a/60, a/60, a/60 | b/35, b/30, b/35 | 3/3 | 33 | **tidak** |
| ULTJ | 3 | a | b/40, b/55, c/50 | a/35, a/30, a/35 | 3/3 | 33 | **tidak** |

**Kesepakatan:** dari 8 omongan yang lolos di dalam, **3 juga lolos** tebak buta luar dan **5 gagal** di luar; rata-rata penguji luar yang menebak benar 1,88 dari 3.

### Jawab dengan kartu

| paket | omongan | kunci | kartu penentu | jawaban luar (pilihan/kartu) | benar | menunjuk penentu | kalimat membingungkan |
|---|---:|---|---|---|---:|---:|---|
| TIRT | 1 | a | 3 | a/3, a/3, a/3 | 3/3 | 3/3 | "Ini gara-gara ada yang ngeborong gede ya? — tidak ada kartu yang membahas siapa yang membeli, jadi bagian ini tidak bisa dicek"; "Ini gara-gara ada yang ngeborong gede ya?"; "Ini gara-gara ada yang ngeborong gede ya?" |
| TIRT | 2 | b | 1 | b/1, b/1, b/1 | 3/3 | 3/3 | — |
| TIRT | 3 | c | 1 | c/1, c/1, c/1 | 3/3 | 3/3 | — |
| DADA | 1 | b | 1 | b/1, b/1, b/1 | 3/3 | 3/3 | "hitungan dari kartu lain"; "Kartu 1 — hitungan dari kartu lain" |
| DADA | 3 | b | 1, 2 | b/1, b/1, b/1 | 3/3 | 3/3 | "Kartu 2 dan 3 ada harga penutupan 7 dan 8 Oktober 2025, jadi kelihatannya saham sudah diperdagangkan lagi, padahal Kartu 1 bilang tanggal pencabutannya tidak ada di data" |
| ULTJ | 1 | b | 1 | b/1, b/1, b/1 | 3/3 | 3/3 | "Pilihan d juga kelihatan benar menurut Kartu 2 dan 3 (laporannya bukan cuma dari pemilik terbesar), tapi Wulan tidak mengklaim soal itu"; "Keliru, laporan itu terbitnya bukan cuma dari pemilik terbesar." |
| ULTJ | 2 | b | 1 | b/1, b/1, b/1 | 3/3 | 3/3 | — |
| ULTJ | 3 | a | 1, 2 | a/1+2, a/1+2, a/1+2 | 3/3 | 3/3 | "Jarak antara penutupan terakhir sebelum tanggal ex dan pembukaan hari ini"; "Jarak antara penutupan terakhir sebelum tanggal ex dan pembukaan hari ini" |

K-05 penuh (3/3 benar dan menunjuk penentu): 8/8.

### Kealamian bahasa (buta, penilai yang sama untuk semua generasi)

| sumber | rata-rata | n |
|---|---:|---:|
| agen M2d-3 (berperan) | 3,33 | 9 |
| agen M2d-2 | 3,33 | 6 |
| DeepSeek M2d-1 (tanpa lingkar) | 2,44 | 9 |
| manusia (hidup) | 4,00 | 6 |

| paket | sumber | penilai | skor | alasan |
|---|---|---|---:|---|
| DADA | agen-m2d2 | alami-p1 | 4 | Penjelasannya runtut dan wajar dengan sapaan 'yang mungkin kamu lihat', walaupun kalimat penutupnya panjang dan agak formal untuk obrolan teman. |
| DADA | agen-m2d2 | alami-p2 | 4 | Bahasanya lancar dan runtut seperti penjelasan penutur asli, meskipun penjelasannya panjang dan agak formal untuk nada teman. |
| DADA | agen-m2d2 | alami-p3 | 3 | Menulis angka lengkap "70.000.000 lembar" dalam pesan grup tidak lazim (orang biasa bilang "70 juta"), dan penjelasannya panjang serta berulang meski tetap wajar. |
| DADA | agen-m2d3 | alami-p1 | 3 | Istilah teknis 'lolos pemeriksaan' janggal di pesan grup dan diulang-ulang di penjelasan ('penjualan yang lolos seluruh pemeriksaan tercatat 3 laporan'), sedangkan Soal 2 cukup wajar. |
| DADA | agen-m2d3 | alami-p2 | 3 | Pesannya wajar, tetapi penjelasannya memuat frasa janggal seperti "penjualan yang lolos seluruh pemeriksaan tercatat 3 laporan" dan terasa berputar-putar. |
| DADA | agen-m2d3 | alami-p3 | 3 | Pesannya wajar dan "temanmu bilang" terdengar akrab, tetapi frasa seperti "penjualan yang lolos seluruh pemeriksaan tercatat 3 laporan" dan "menyebut tanggal pencabutannya nggak ada di data" terasa canggung. |
| DADA | m2d1-deepseek | alami-p1 | 2 | Penjelasannya bernada mesin, dengan frasa seperti 'bilangan di omongan sama dengan yang tertulis' dan 'kartu hitungan 22,25 kali', dan ada pilihan terpotong seperti 'Rp140 sepuluh lot'. |
| DADA | m2d1-deepseek | alami-p2 | 2 | Penjelasannya mekanis dan penuh istilah sistem ("kartu hitungan 22,25 kali", "bilangan di omongan"), sedangkan pilihan seperti "Rp140 sepuluh lot" janggal secara tata bahasa. |
| DADA | m2d1-deepseek | alami-p3 | 2 | Penjelasannya mekanis ("bilangan di omongan sama dengan yang tertulis", "Kartu hitungan 22,25 kali membandingkan") dan pilihannya patah-patah seperti "Rp140 sepuluh lot", jadi terasa seperti hasil mesin. |
| DADA | manusia | alami-p1 | 4 | Pesannya sangat alami ('buat bayar parkir motor aja kurang') dan penjelasannya luwes, meski rujukan 'kartu kedua' dan frasa 'harga yang naik sebagai semacam pengumuman' agak janggal. |
| DADA | manusia | alami-p2 | 4 | Pesannya sangat alami ("buat bayar parkir motor aja kurang") dan penjelasannya lancar seperti teman yang menerangkan, hanya sedikit terganggu rujukan meta "kartu kedua". |
| DADA | manusia | alami-p3 | 4 | Pesannya sangat alami ("buat bayar parkir motor aja kurang") dan penjelasannya enak diikuti, hanya saja "ia" di pilihan jawaban dan rujukan "kartu kedua" terasa agak formal dan meta. |
| TIRT | agen-m2d2 | alami-p1 | 3 | Bahasanya mudah dipahami, tetapi pilihan yang diawali 'Keliru, sebab...' terasa kaku, dan penjelasannya datar serta berulang sehingga tidak terdengar seperti teman yang menjelaskan. |
| TIRT | agen-m2d2 | alami-p2 | 3 | Pesannya agak kaku untuk obrolan grup, pilihan yang berpola "Keliru, sebab..." terasa seperti bahasa tulis, dan penjelasannya mengulang templat yang sama. |
| TIRT | agen-m2d2 | alami-p3 | 3 | Mudah dipahami, tetapi "sebab" yang terus diulang di pilihan dan penjelasan yang datar serta berulang membuatnya kaku, sedangkan "Gue baca data harian" kurang lazim untuk obrolan grup. |
| TIRT | agen-m2d3 | alami-p1 | 4 | Pesan dan penjelasannya hidup seperti teman mengobrol, hanya ada beberapa kalimat yang tersendat, misalnya 'Yang bikin orang salah kalau angka itu disangka...' dan 'yang awal tahun ragu soal kelanjutan usaha'. |
| TIRT | agen-m2d3 | alami-p2 | 4 | Pesan dan pilihannya hidup seperti obrolan sungguhan, tetapi beberapa kalimat penjelasan tersusun canggung, misalnya "Yang bikin orang salah kalau angka itu disangka..." dan "Yang bikin naiknya disebut beruntun ada di ringkasan". |
| TIRT | agen-m2d3 | alami-p3 | 4 | Pesan dan penjelasannya hidup dan santai seperti teman bicara, tetapi ada kalimat yang susunannya janggal, misalnya "Yang bikin orang salah kalau angka itu disangka datang dari...". |
| TIRT | m2d1-deepseek | alami-p1 | 3 | Pesan grupnya wajar, tetapi penjelasannya terasa seperti templat dengan frasa janggal seperti 'hitungan paket menyebut' dan 'omongan teman cocok dengan dokumennya'. |
| TIRT | m2d1-deepseek | alami-p2 | 3 | Pesan grupnya terasa wajar, tetapi penjelasannya kaku dan menyisipkan istilah teknis seperti "hitungan paket" dan "kartu harga mencatat", serta frasa "omongan teman cocok dengan dokumennya" yang tidak lazim. |
| TIRT | m2d1-deepseek | alami-p3 | 4 | Pesannya wajar seperti obrolan grup, tetapi frasa seperti "hitungan paket menyebut" dan "Kartu harga mencatat" dalam penjelasan terasa seperti istilah sistem, bukan cara teman bercerita. |
| ULTJ | agen-m2d3 | alami-p1 | 3 | Register santainya pas, tetapi frasa 'sudah dirapikan jadi 8 laporan' atau 'Rp145' dan 'nggak ketemu di catatannya' tidak lazim, ditambah pola kalimat yang berulang di tiap soal. |
| ULTJ | agen-m2d3 | alami-p2 | 3 | Frasa "sudah dirapikan jadi" tidak lazim untuk menyatakan hasil hitungan, dan pola "Gue ragu nih" yang diulang terasa seperti templat. |
| ULTJ | agen-m2d3 | alami-p3 | 3 | "Gue ragu nih" muncul berulang sehingga terasa seperti templat, dan kata "dirapikan" untuk angka hasil hitungan ("sudah dirapikan jadi Rp145") tidak lazim bagi penutur asli. |
| ULTJ | m2d1-deepseek | alami-p1 | 2 | Penjelasannya kaku dan berulang seperti hasil templat ('kartu data harga harian bursa mencatat ... dan kartu data harga harian bursa mencatat ...'), dan pesan grupnya pendek tanpa nuansa obrolan. |
| ULTJ | m2d1-deepseek | alami-p2 | 2 | Penjelasannya repetitif dan terasa buatan mesin ("kartu data harga harian bursa mencatat... dan kartu data harga harian bursa mencatat..."), sedangkan pesannya datar dan kurang terasa seperti obrolan. |
| ULTJ | m2d1-deepseek | alami-p3 | 2 | Penjelasannya kaku dan berulang ("kartu data harga harian bursa mencatat... dan kartu data harga harian bursa mencatat") serta berputar pada dirinya sendiri ("menegaskan pembagian ini memang tercatat di daftar"), sehingga terasa seperti keluaran mesin. |
| ULTJ | manusia | alami-p1 | 4 | Suaranya seperti teman yang menjelaskan dengan jelas dan enak dibaca, dengan sedikit kejanggalan pada 'Jangan kegeeran dulu' dan rujukan meta ke 'kartu kedua' atau 'kartu ketiga'. |
| ULTJ | manusia | alami-p2 | 4 | Pesan ("Jangan kegeeran dulu") dan penjelasannya fasih serta bernada teman yang menjelaskan, meskipun rujukan "kartu pertama/kedua/ketiga" sedikit meta. |
| ULTJ | manusia | alami-p3 | 4 | Pesannya alami ("Jangan kegeeran dulu") dan penjelasannya lancar seperti teman yang menerangkan, meski "Perhatikan juga..." diulang-ulang dan rujukan ke "kartu kedua" terasa meta. |

## M2d-1 → M2d-2 → M2d-3

| ukuran | M2d-1 (tanpa lingkar) | M2d-2 (lingkar, satu model menilai) | M2d-3 (berperan) |
|---|---|---|---|
| simulasi lolos penuh | — (tanpa gerbang) | 0/3 | 2/3 |
| tebak buta luar K-05 (omongan lolos / diuji) | 2/9 (DeepSeek, semua draf), rata-rata 2,11 benar | 2/3 (omongan terkunci), rata-rata 1,00 benar | 3/8, rata-rata 1,88 benar |
| kealamian, penilai masing-masing milestone | 3,00 (manusia 5,00) | 3,83 (manusia 4,33) | 3,33 (manusia 4,00) |
| kealamian, penilai M2d-3 yang SAMA | 2,44 | 3,33 | 3,33 |

## Catatan penulis

### Singkatnya

**Dua dari tiga simulasi terbit (lolos penuh): TIRT di putaran 7 dan ULTJ di putaran 12. DADA tidak terbit** — omongan 2 habis tiga sudut (15 putaran); omongan 1 dan 3 terkunci. Di M2d-2 tidak ada satu pun simulasi yang lolos penuh dalam 5 putaran. Draf tetap **tidak** dipasang ke produk.

Tetapi pembanding eksternal menunjukkan bahwa "terbit" di dalam lingkar belum berarti soal yang baik:

- **Tebak buta luar: 3 dari 8 omongan yang dikunci lolos** (M2d-2: 2 dari 3). Lima omongan dijawab benar oleh ketiga penguji Opus tanpa kartu, walau dengan keyakinan rendah (30–45). Penebak DeepSeek di dalam lingkar justru memilih pengecoh untuk kelimanya. **Gerbang tebak di dalam lebih lunak daripada penguji luar**, dan jaraknya membesar: model penebak yang sama dengan penulis, sekarang diberi petunjuk berhitung, tetap tertipu pola yang tidak menipu Opus.
- **Jawab-dengan-kartu luar: 8 dari 8** dijawab benar oleh ketiga penguji dan semuanya menunjuk kartu penentu. Kalimat membingungkan yang mereka tandai konkret: "Ini gara-gara ada yang ngeborong gede ya?" (TIRT 1 — bagian omongan yang tidak bisa dicek kartu, padahal kuncinya "Betul"), pilihan d ULTJ 1 yang juga benar menurut kartu, dan istilah kartu "hitungan dari kartu lain" / "Jarak antara penutupan terakhir … dan pembukaan hari ini".
- **Kealamian: 3,33 untuk draf M2d-3, sama dengan draf M2d-2 (3,33) di tangan penilai yang sama**; M2d-1 2,44; manusia 4,00. Bank gaya dan G-kaku tidak menaikkan skor bahasa. Keluhan penilai berpindah dari pesan ke penjelasan dan pola berulang: "sudah dirapikan jadi", "Gue ragu nih" di dua pesan ULTJ, "lolos pemeriksaan" (istilah fakta paket yang terbawa ke pesan DADA).

### Apa yang dikerjakan tiap peran (dari jejak)

- **Kritikus GLM-5.3** dipanggil 13 kali (US$0,4840 — sepertiga biaya milestone untuk 4 % panggilan). Karena ia hanya dipanggil sesudah pemeriksa, pembaca kartu, dan penebak tidak keberatan, ia menilai sedikit versi, dan keberatannya sedikit tetapi nyata: "omongan" (istilah sistem) di penjelasan TIRT, dan penjelasan ULTJ yang membantah pengecoh tetapi tidak membantah klaim teman. Kritikus **tidak** menangkap satu pun dari lima omongan yang tertebak di luar, dan tidak menangkap pilihan d ULTJ 1 yang ikut benar menurut kartu.
- **Kritikus yang terpotong**: tiga panggilan di dua langkah (ULTJ omongan 1, putaran 2 dua kali dan putaran 3 sekali; batas 16.384 token habis untuk penalaran). Aturan "tidak menjawab = keberatan" bekerja: di putaran 2 versi itu tidak lolos, dibawa tanpa ditulis ulang, diperiksa lagi di putaran 3, dan kali itu kritikus menjawab (ulangan) dengan keberatan makna. Harganya ±US$0,05 per panggilan terpotong.
- **Gerbang G tidak pernah menolak di M2d-3**: 56 pemeriksaan G (tiap versi yang bentuknya terbaca, dari 62 versi), 0 tolak — penulis diberi tahu kedua aturannya di prompt. Retro atas 37 versi M2d-2, G-angka-cukup menolak 7 dan G-kaku 1 — termasuk omongan TIRT "48 ke 106" yang dulu lolos gerbang dalam dan gagal di luar. Tetapi **G-angka-cukup tidak menangkap perkalian**: DADA omongan 2 berputar lima putaran di sudut `andai-10-lot-dividen` karena penebak menghitung 10 lot × 100 lembar × Rp0,14 = Rp140 sendiri. Itu keterbatasan yang sudah ditulis di `gerbang-g.ts` (hanya rasio, persen, selisih).
- **Strategi sudut** bekerja sebagai mekanisme: TIRT membuang dua sudut di putaran 5 dan keduanya terkunci di sudut kedua pada putaran 7; ULTJ membuang tiga sudut dan terkunci di putaran 7 dan 12. DADA omongan 2 habis di `jumlah-jual-terverifikasi` → `andai-10-lot-dividen` → `fil-2025-09-01-01`.

### Keputusan di tengah jalan

1. **Jalan TIRT ke-1 dibuang** (±35 menit, US$0,0516 menurut ledger termasuk KOREKSI US$0,0034): penebak dengan petunjuk berhitung habis di 8.000 token dua kali dari empat panggilan, dan tebakan tak terbaca dihitung benar/100. Batas penebak M2d-3 dinaikkan ke 16.000 token. DADA dan ULTJ memakai setelan yang sama dengan jalan TIRT ke-2, tanpa penyetelan lagi.
2. **DADA dan ULTJ dijalankan** karena sisa pagu milestone sesudah TIRT US$1,6190 dan sesudah DADA US$1,0740 (syarat D-6 ≥ US$0,80, saya periksa sebelum masing-masing).
3. **Panggilan penulis berpikir kadang lewat 900 detik** (dua kali: TIRT jalan 1 dan DADA putaran 1). Klien tidak mengulang batas waktu (bisa sudah ditagih), jadi ledger mencatat perkiraan maksimum (US$0,0160 dan US$0,0154) dan cadangan tanpa berpikir mengisi omongannya; selisih jejak vs ledger DADA (US$0,5296 vs US$0,5450) adalah panggilan itu.

### Keterbatasan

- **n kecil**: 3 simulasi, 8 omongan terkunci, 3 penguji per uji, 3 penilai. Selisih satu omongan menggeser persentase besar-besar.
- **Penebak di dalam = model penulis** (DeepSeek). Hasil M2d-3 menguatkan usul M2d-2: gerbang tebak perlu penebak yang berbeda atau lebih kuat; kritikus GLM tidak menggantikannya.
- **Kritikus hanya melihat versi yang sudah lolos tiga penilai lain** (urutan murah → mahal). Keberatan kritikus terbanyak karena itu datang dari sedikit panggilan (13); kalau kritikus dipanggil lebih awal, arahannya bisa membantu lebih banyak versi, tetapi biayanya naik tajam.
- **"Terbit" bukan "siap dipasang"**: TIRT 1 menyebut spekulasi ("gara-gara ada yang ngeborong") yang tidak bisa dicek tetapi kuncinya "Betul"; ULTJ 1 punya dua pilihan yang benar menurut kartu; ULTJ 2 dan 3 membahas klaim yang hampir sama (turun harga vs dividen). Semua lolos keempat penilai di dalam. Penghalusan RASA oleh manusia (disetujui pemilik, bukan bagian M2d-3) dan pemeriksaan makna oleh manusia tetap perlu.
- **Kealamian M2d-2 di tabel ini (3,33)** berbeda dari laporan M2d-2 (3,83) karena penilainya lain dan draf M2d-2 dinilai berdampingan dengan draf M2d-3; bandingkan antar-generasi hanya di baris "penilai M2d-3 yang SAMA".
- **Waktu**: TIRT 96 menit, DADA 209 menit, ULTJ 54 menit; penyedia lambat dan tidak rata (satu panggilan penulis 566 detik, satu penebak 705 detik).
- **Biaya kritikus** memakai angka penjaga harga GLM-5.3 (1,00/3,00 per juta token), bukan tagihan; ledger bisa dihitung ulang dari token.
