### Singkatnya

**Satu dari tiga simulasi terbit: ULTJ di putaran 9.** TIRT tidak terbit (omongan 2 habis tiga sudut; omongan 1 dan 3 dikunci di putaran 1–2). DADA dihentikan **pagu milestone** di putaran 11 (US$3,96 + perkiraan panggilan kritikus berikutnya > US$4,00; ditegakkan kode, panggilan tidak dikirim) dengan omongan 1 dan 2 dikunci. M2d-3: 2/3 terbit. Draf tetap **tidak** dipasang ke produk.

Yang membaik menurut pembanding eksternal (subagent Opus baru, petunjuk sama persis dengan M2d-3):

- **Tebak buta luar: 5 dari 7 omongan yang dikunci lolos** (M2d-3: 3 dari 8); rata-rata penguji luar yang menebak benar turun dari 1,88 ke 0,29 dari 3. Dua yang gagal (TIRT 1 dan 3) masing-masing ditebak benar oleh SATU penguji dengan yakin 50 dan 40 — gagal karena aturan yakin ≥ 40, bukan karena mayoritas menebak benar.
- **Jawab-dengan-kartu K-05: 7/7** (M2d-3: 8/8).
- **Kealamian, penilai yang sama: M2d-4 3,67, M2d-3 3,00, manusia 4,00** (n = 9, 9, 6). Pembeda terbesar ada di draf TIRT dan DADA (4, 4, 4); draf ULTJ M2d-4 tetap 3 karena "orang dalam lain" dan frasa berulang di penjelasan.
- **Panjang & bentuk pilihan: rata-rata 7,5 kata (maks 9), 0 dari 28 pilihan berekor** — manusia 8,5 (maks 11), 0/24; M2d-3 10,3 (maks 14), 10/32 berekor. Pesan: 16,4 kata rata-rata (maks 20), 0/7 memakai "gue" (manusia 19,0 / maks 26; 3 dari 6 pesan manusia sendiri memakai "Gue").

### Masalah makna (penggolongan tangan atas kalimat "bingung" penguji kartu, dan bacaan ulang eksekutor)

Dua masalah makna M2d-3 yang dilihat penguji luar — **bagian klaim yang tak bisa dicek padahal kunci "Betul"** (TIRT 1 "ngeborong") dan **pilihan lain yang ikut benar** (ULTJ 1 pilihan d) — **tidak muncul** di tujuh omongan M2d-4. Kalimat yang ditandai membingungkan (4/7 omongan) terbagi:

- **istilah kartu dari paket fakta**, bukan tulisan penulis: "Daftar itu sendiri tidak bisa dibuktikan habis…" (ULTJ 1, 3/3 penguji), "…yang lolos seluruh pemeriksaan: 3 laporan" (DADA 2, 3/3 penguji). Kritikus juga menandai frasa kedua di DADA putaran 5 (jenis bahasa, bagian kartu). Perbaikannya di teks kartu paket (`factory/llm/paket.ts`), di luar batas M2d-4.
- **"hari ini" tanpa tanggal di pesan** (TIRT 1, 1 penguji) dan kalimat pesan/kartu yang diulang tanpa keterangan (ULTJ 2) — bukan salah makna.

Keraguan eksekutor yang tidak tertangkap siapa pun: ULTJ 1 (Wulan) menutup dengan "Aman lah." — penilaian yang tak bisa dicek kartu, sedangkan kuncinya "Betul". Kritikus menjawab `bagian_tak_tercek: []`. Menurut saya ini sejenis dengan "ngeborong", walau lebih lemah (perasaan, bukan klaim sebab). Juga: TIRT 1 dan 3 berpola hampir sama ("… disetop karena …" × 4), yang terasa templat.

Kritikus dengan dua pertanyaan wajib memang menolak masalah makna di dalam lingkar: ULTJ putaran 2 (omongan 2: "dia tau sesuatu" tak tercek + pilihan c juga benar — keduanya diturunkan kode dari jawaban wajib), DADA putaran 1 (penjelasan menyebut patokan 7 Oktober yang tidak ada di kartu).

### Apa yang dikerjakan tiap peran

- **Pemeriksa (gerbang gaya)** hampir tidak pernah menolak di jalan sungguhan: G-panjang 1 kali, G-satu-klausa dan G-register 0 — penulis mematuhi prompt `prompt-penulis-gaya.md`. Efeknya terlihat di hasil (pilihan pendek, satu klausa, tanpa "gue"), bukan di jumlah penolakan. Penolakan pemeriksa terbanyak tetap dari validator lama (angka tanpa rujukan, kunci seragam, panjang timpang).
- **Kritikus GLM-5.3 (sebelum penebak)**: 49 panggilan, **US$2,74 = 69 % biaya milestone**. Ia terpotong batas token sering: 3 dari 5 panggilan di 16.384 (jalan TIRT ke-2, dibuang) dan 14 dari 44 di 24.576; keluaran yang selesai 6.362–22.734 token (median 15.730). Lima kali "tidak menjawab" dua kali berturut-turut (US$0,10–0,16 per kejadian, tanpa hasil). Karena kritikus kini dipanggil sebelum penebak, ia menilai lebih banyak versi (34 di tiga jalan dilaporkan, M2d-3: 11) — itulah harga "kritikus lebih awal".
- **Penebak GLM-5.3 (ke-3)**: tambahan **US$0,388** (plus probe US$0,023). Menebak benar tanpa kartu 57–80 % (DeepSeek 50–71 %) di versi yang sampai ke penebak. Ia juga kadang berputar sampai batas token (8.000): tebakan tak terbaca dua kali dihitung benar/100 (menolak), sesuai aturan M2d-2.
- **Penulis DeepSeek** terpotong di 32.768 token berpikir 25 kali (TIRT 14, ULTJ 4, DADA 7); cadangan tanpa berpikir selalu mengisi.

### Keputusan di tengah jalan (semua tercatat di `eval/keluaran-m2d4/dibuang/`)

1. **Jalan TIRT ke-1 dihentikan** sesudah penebak GLM ke-3 berputar sampai 16.000 token (US$0,048, 292 s) pada tebakan pertamanya. Probe tujuh panggilan (US$0,023; `dibuang/probe-glm-penebak.md`): `enable_thinking=false` tidak mematikan penalaran, `thinking=false` menumpahkan penalaran ke jawaban; pada soal TIRT sungguhan GLM menjawab dalam 1.045–1.463 token. Putusan: penebak GLM tetap berpenalaran dengan `max_tokens` 8.000. Panggilan ulang yang mungkin sedang berjalan saat dihentikan dicatat KOREKSI (perkiraan maksimum US$0,049).
2. **Jalan TIRT ke-2 dihentikan** di awal putaran 2: kritikus dengan dua pertanyaan wajib terpotong di 16.384 token pada 3 dari 5 panggilan (dua kali berturut-turut pada omongan 2 = "tidak menjawab" seharga US$0,10). Putusan: kritikus M2d-4 24.576 token (M2d-3 tetap 16.384). KOREKSI US$0,017 untuk panggilan penulis yang mungkin berjalan.
3. Kedua jalan yang dibuang + probe + KOREKSI = **US$0,457** (12 % pagu milestone). Setelan sesudahnya tidak diubah lagi; ULTJ dan DADA memakai setelan jalan TIRT ke-3.
4. **Urutan kontrak TIRT → ULTJ → DADA** dijalankan tanpa syarat sisa pagu (kontrak M2d-4 tidak menyebutnya); DADA berhenti oleh pagu milestone sebelum omongan 3 selesai.

### Keterbatasan

- **n kecil**: 3 simulasi, 7 omongan dikunci, 3 penguji per uji. Selisih satu penguji membalik status lolos satu omongan (TIRT 3 gagal tebak buta luar dengan satu tebakan benar di yakin 40 — tepat di batas).
- **Biaya**: M2d-4 menghabiskan US$3,96 (M2d-3 US$1,48) untuk hasil terbit yang lebih sedikit; dua pertiga untuk kritikus yang sering terpotong. Dengan sisa pagu kumulatif ±US$1,04 dan kredit Featherless ±US$3 (dari ±US$7), satu jalan penuh lagi dengan setelan ini tidak muat.
- **Kealamian naik, tetapi kritikan penilai pindah ke penjelasan** (pola "Kalau … dibuka", "Yang tidak terbaca di situ", "sudah dirapikan jadi" di M2d-3). Penjelasan tidak disentuh gerbang gaya.
- **Pembanding manusia memakai "Gue"** (kasus hidup tidak diubah; `cases/` terlarang). G-register menolaknya bila diperiksa; tes mencatat ini sebagai keputusan pemilik.
- **Batas G-satu-klausa adalah tafsiran**: koma kedua dibolehkan hanya untuk ", bukan …"/", tapi …"/", tetapi …"/", melainkan …" (diturunkan dari soal manusia); "karena" tanpa koma dibolehkan.
- **Harga GLM** tetap angka penjaga 1,00/3,00 per juta token, bukan tagihan; saldo sebenarnya perlu dicek pemilik di dasbor penyedia.
