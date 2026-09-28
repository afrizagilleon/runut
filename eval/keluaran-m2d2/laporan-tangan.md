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
