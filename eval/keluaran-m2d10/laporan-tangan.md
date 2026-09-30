### Singkatnya

- **Templat (D-1):** enam pola dari POLA enam soal tayang (Claude + pemilik). Kode menghitung nilai kebenaran tiap pilihan dari fakta paket dan membuktikan tepat satu pilihan benar, untuk setiap varian yang boleh dipilih penyempurna. Di paket TIRT keenam pola berlaku, dan keenam rencananya sah. Tes anti-salin: tidak ada potongan 5 kata dari soal tayang.
- **Kalibrasi (D-5):** biaya nyata US$0,3150 dari pagu 0,35. Pagu berhenti di soal bocor keempat, jadi 3 dari 6 soal bocor terukur.
  - Penebak keluarga campur tidak menolak satu pun soal tayang (0/6) dan menolak 2 dari 3 soal bocor.
  - Pembaca kartu DeepSeek salah di 2 soal tayang (ULTJ s2 dan s3). Kegagalannya sama dengan M2d-8.
  - Kritikus baru untuk ULTJ s3 berkeberatan `kunci`.
  - Aturan pra-registrasi §4 mencoba keadaan penebak S1…S7 LEBIH DULU. Akibatnya setelan pertama yang memenuhi syarat adalah **"S7 + pembaca kartu dicatat"**: penebak dan pembaca kartu tidak menolak lagi. Lihat temuan 1.
- **Soal pemanasan (D-7a):** lolos di percobaan pertama (US$0,0214). Pembaca kartu 3/3 memilih kunci dan menunjuk kartu 1. Kritikus tidak berkeberatan. Arahannya dicatat: "terlalu tajam" bisa diperdebatkan pembaca teliti.
- **Jalan TIRT (D-7b):** **tidak terbit** sesudah 2 versi (US$0,0365). Kedua versi sampai ke kritikus, dan kritikus "tidak menjawab" di keduanya (temuan 2). Tidak ada omongan yang dikunci, jadi putusan mekanis M2d-7 = **TIDAK** (syarat a).
- **Biaya nyata M2d-10:** US$0,3728 dari pagu US$1,20.
  - Per model: GLM US$0,3099, DeepSeek US$0,0469, Haiku US$0,0161.
  - Kumulatif ledger kini ±US$8,64 dari `LLM_PAGU_USD` 10.

### Temuan yang paling penting

1. **Aturan kalibrasi pra-registrasi saya cacat urutannya.**
   - Tabel §4 hanya mengurutkan keadaan penebak. Pembaca kartu baru boleh diturunkan sesudah S7 (penebak "dicatat"). M2d-8 punya klausa "lewati gerbang yang tidak menolak soal manusia"; pra-registrasi ini tidak memuatnya.
   - Akibatnya penebak diturunkan menjadi "dicatat" walau ia tidak menolak satu pun soal tayang, dan walau ia menangkap 2 dari 3 soal bocor.
   - Tangkapan bocor sebelum kritikus turun dari 3/3 (S1) ke 1/3 (setelan hasil).
   - Aturan itu tetap saya jalankan PERSIS, tanpa diubah sesudah melihat data, dan setelan itulah yang dipakai jalan TIRT.
   - Kalau penyimpangan diizinkan, pembanding yang masuk akal adalah "S1 + pembaca kartu dicatat": 5/6 soal tayang diterima (ULTJ s3 ditolak kritikus), 3/3 bocor tertangkap. Setelan ini **tidak** dipakai; reviewer yang memutuskan.
2. **Jalan TIRT gagal karena infrastruktur, lalu cacat mesin memperburuknya.**
   - Semua panggilan GLM di jalan ini dilayani SiliconFlow dan Phala, bukan Wafer (kalibrasi 10 menit sebelumnya masih dilayani Wafer). Kedua penyedia itu berpikir 333–886 token, di bawah ambang kritikus 1.000.
   - Dua kali panggilan kritik (empat percobaan) per versi = "tidak menjawab".
   - Mesin lalu **membuang rencana sesudah satu versi**. Pra-registrasi §3 membolehkan ≤ 4 versi per rencana, jadi mesin menyimpang dari prosedur yang didaftarkan.
   - Omongan 1 hanya mencoba 2 dari 3 rencana. Rencana ketiga tidak ada karena bentrok penentu dengan posisi lain, jadi jalan berhenti di omongan 1. Omongan 2 dan 3 tidak pernah ditulis.
   - Cacat itu sudah diperbaiki sesudah jalan (kritikus diam = versi ditolak, rencana tetap; dites, sabotase T07-S1 merah).
   - Jalan **tidak diulang**, karena pra-registrasi §6 menulis tepat satu jalan. Sisa pagu milestone ±US$0,83.
3. **Tujuan struktur templat terlihat di uji luar tambahan, walau n kecil.**
   - Tiga soal diuji: dua versi jalan yang sampai ke kritikus dan soal pemanasan.
   - Ketiganya dijawab benar 3/3 oleh penguji kartu Opus, dan **tidak ada satu pun penguji yang menyebut pilihan lain juga benar**. Di M2d-8, 3/3 penguji kartu menyebut "a juga benar".
   - Dua soal sebab-resmi gagal tebak buta hanya lewat klausa keyakinan: 1/3 penguji memilih kunci, dengan yakin 50.
   - Soal besaran-hitungan tertebak 3/3. Pesannya ("ini gila banget!") ditandai tak tercek dan berpenilaian oleh 3/3 penguji.
   - Semua ini BUKAN putusan: tidak ada omongan yang dikunci.
4. **Penyempurna Haiku (D-3) tidak pernah dipanggil di panggilan sungguhan.**
   - Dengan setelan hasil, penebak dan pembaca kartu tidak menolak. Kritikus tidak menjawab.
   - Karena itu tidak ada penolakan di pilihan yang memicunya. Perilakunya hanya terbukti dengan model palsu: kode membuang perubahan angka, rujukan, label, dan varian slot lain (T03, T04).
   - Titik buta Haiku ↔ penguji luar Anthropic tetap risiko teoretis. Belum ada draf yang disempurnakan Haiku lalu ditebak Haiku.
5. **Haiku sebagai penebak** tidak menebak satu pun soal tayang. Di soal bocor ia memilih kunci 2/3 (d/62, a/55), dan dengan A = 60 hanya satu yang menolak. Haiku, DeepSeek, dan GLM sering berbeda pilihan; keluarga campur memang memberi suara yang berbeda.

### Keputusan yang diambil eksekutor (bisa ditolak reviewer)

1. Kritikus lima soal tayang dipakai ulang dari M2d-8. Ini tertulis di pra-registrasi §4, dengan pengecekan kode bahwa teks soal sama. Hanya ULTJ s3 yang diukur baru.
2. Model ketiga ditambahkan ke `MODEL_OPENROUTER`. Skrip M2d-5/M2d-7/M2d-8 dibatasi ke `MODEL_DUA` supaya tetap dua model. Pemanggil pintu kini menerima ketiga model.
3. Dengan penebak "dicatat", ketiga penebak tetap dipanggil tiap versi, supaya tebakannya terlihat di jejak (±US$0,005/versi).
4. Uji luar tambahan atas versi yang tidak dikunci dan soal pemanasan dijalankan untuk laporan saja, di folder terpisah.
5. Skrip uji luar dan laporan dinamai `templat/uji-luar.ts` dan `templat/tulis-laporan.ts`. Nama `penguji.ts` dan `laporan.ts` memicu penjaga `main` milik `factory/llm/penguji.ts` dan `factory/llm/laporan.ts` (regex akhiran nama berkas; `laporan.ts` ikut termuat lewat `kalibrasi-setelan.ts`). Penjaga penguji menulis ulang berkas M2d-1 dengan isi sama byte demi byte. Penjaga laporan menulis ulang `docs/bukti/uji-tanding-model.md` dan `eval/keluaran-m2d/*.json` dengan ledger kini; ketiga berkas itu dipulihkan dengan `git checkout` sebelum commit.
6. Penjelasan penulis boleh diawali "Yang terbaca:". Prompt penjelasan templat tidak melarangnya, dan validator juga tidak.

### Perbandingan jalan TIRT M2d-4…M2d-10

| milestone | mesin | hasil | biaya jalan | catatan uji luar |
|---|---|---|---:|---|
| M2d-4 | lingkar gaya | tidak terbit | US$1,18 | — |
| M2d-5 | lingkar OpenRouter | terbit | US$0,16 | gagal uji luar |
| M2d-6 | penalar "high" | tidak terbit | US$1,84 | omongan dikunci bocor |
| M2d-7 | pengecoh dari data (2 jalan) | tidak terbit | US$0,34 + 1,15 | — |
| M2d-8 | kalibrasi soal manusia | tidak terbit | US$0,91 | 1 dikunci: tebak 3/3, "a juga benar" 3/3 |
| M2d-9 | pintu penyusun (lingkar M2d-8) | tidak terbit | US$0,44 | — |
| M2d-10 | templat lewat pintu | tidak terbit | US$0,04 | 0 dikunci; tambahan: kartu 3/3, kunci lain 0/9 |

### Keterbatasan

- n sangat kecil: 6 soal tayang, 3 soal bocor terukur, 2 versi jalan, 3 soal di uji tambahan.
- Soal pemanasan dan omongan 1 jalan memakai pola dan kartu yang sama (sebab-resmi, penghentian 10 Des + 21 Jan). Di produk keduanya akan terasa berulang.
- Kalimat templat "kenaikan harganya terlalu tajam" diberi arahan kritikus: kurang menempel ke "peningkatan harga kumulatif yang signifikan".
- Penguji luar dan Haiku sekeluarga (Anthropic). Hipotesis pemilik tentang bias keluarga berlaku ke arah ini juga.
- Tidak ada panggilan Sectors. `web/`, `server/`, `cases/`, `factory/verifikasi/`, `factory/kasus/`, `deploy/` tidak disentuh. Tidak ada yang dipasang ke produk.

### Usul untuk reviewer

- (a) Tulis pra-registrasi tambahan dengan aturan kalibrasi yang melewati gerbang yang tidak menolak soal tayang. Setelan pembandingnya "S1 + pembaca kartu dicatat".
- (b) Izinkan satu jalan TIRT lagi dengan mesin yang sudah diperbaiki, dengan sisa pagu ±US$0,83.
- (c) Pertimbangkan pagar GLM yang tidak jatuh ke penyedia yang tidak berpikir: `allow_fallbacks: false` untuk kritikus, atau ulangan yang menunggu Wafer.
