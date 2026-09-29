### Singkatnya

**TIRT M2d-6 TIDAK layak tayang.** Jalan TIRT (segar, setelan D-1…D-5) tidak terbit sesudah 15 putaran: omongan 2 dikunci di putaran 3, omongan 1 di putaran 8 (sudut kedua), omongan 3 gagal di ketiga sudutnya. Uji luar atas dua omongan yang dikunci: jawab-dengan-kartu lolos 2/2, tetapi tebak buta luar lolos 1/2 — omongan 1 ("Awal tahun juga kena setop, katanya karena harga naik terus", kunci "Keliru, setop awal tahun karena keraguan usaha") ditebak benar ketiga penguji Opus tanpa kartu (yakin 50–55), padahal ketiga penebak GLM di dalam memilih salah (a/60, a/72, a/60). Syarat pemilik (terbit + tebak buta luar lolos semua + kartu lolos + nol masalah makna) tidak terpenuhi di dua butir pertama. Draf tidak dipasang.

Jalan kedua tidak dijalankan: jalan pertama menghabiskan US$1,84 dan sisa pagu milestone sesudahnya US$0,51 — tidak cukup untuk satu jalan penuh (kontrak D-6: ≤ 2 jalan penuh DALAM pagu milestone).

### Apa yang berhasil

- **GLM memang bisa dipaksa berpikir, dan kini terbukti dari respons.** Dengan `effort: "high"` kritikus berpikir median 6.588 token di jalan TIRT (M2d-5: median 84, maks 260) dan untuk pertama kalinya di OpenRouter mengajukan keberatan: 5 dari 17 putusan terjawab berkeberatan (8 keberatan; terbanyak "tertebak", 5). Penjaga D-1 menolak 26 dari 80 panggilan GLM di jalan TIRT (token penalaran di bawah ambang) dan mengulang 18 di antaranya ke penyedia lain — tanpa penjaga, jawaban-jawaban itu akan dibaca seperti di M2d-5.
- **G-pilihan-kembar menangkap pengecoh kembar TIRT M2d-5 omongan 3 lebih dulu** (identik sesudah normalisasi), sementara kritikus yang berpikir (1.538 dan 5.777 token) TIDAK mengajukan keberatan atas pasangan itu di dua sampel yang terjawab. Tanpa gerbang kode, pasangan seperti ini tetap lolos. Di data agen M2d-3…M2d-5 gerbang ini juga menandai dua pasang pilihan "Betul, X" / "Keliru, X" (isi sama, label berlawanan) di DADA M2d-3 dan TIRT M2d-3.
- **Pengecualian penyedia DeepSeek berdasar bukti** (AtlasCloud 10/16 melewati batas penalaran) menghilangkan penulis yang berpikir sampai `max_tokens` habis; di jalan M2d-6 penulis terpotong 9 dari 32 panggilan (penyedia lain juga bisa habis di 20.000).

### Yang tidak berhasil, dan kenapa (terukur)

1. **Penebak di dalam masih lebih lunak dari penguji luar pada omongan yang dikunci.** Kalibrasi D-3 memilih K3 (GLM ×3 ber-effort, petunjuk "pemburu soal bocor"): 4/4 soal bocor tertangkap, 4/6 soal aman ikut ditolak — tetapi dari SATU sampel penuh (sampel kedua K3 terhenti di pagu kalibrasi sesudah 2 soal; keduanya bocor dan keduanya tertangkap). Sebagian tangkapan itu berasal dari penjaga (tebakan GLM yang tidak berpikir dihitung benar/100), bukan dari menebak: di K3-s1, 11 dari 30 tebakan bertanda `!`. Di jalan TIRT, penebak GLM menebak benar 13 dari 36 tebakan terbaca, dan omongan 1 lolos dengan 0/3 — omongan yang sama ditebak 3/3 di luar.
2. **"Penyedia tidak berpikir" untuk penebak sebagian besar adalah perilaku model pada tugas pendek, bukan hanya penyedia.** Pada tugas menebak, GLM-5.3 dengan `effort: "high"` berpikir 0–150 token di banyak penyedia — termasuk penyedia resmi Z.AI (32 dan 187 token). Aturan D-2 (≥ 2 pelanggaran dan ≥ 1/3 panggilan sejenis) karena itu mengecualikan 12 penyedia GLM; GLM kini sebagian besar dilayani Wafer (50 dari 80 panggilan GLM di jalan TIRT; 106 dari 252 panggilan GLM M2d-6; US$2,07 dari US$2,99 seluruh milestone). Ambang penebak 300 berasal dari probe atas SATU soal (penalaran 60–685); data kalibrasi (122 tebakan GLM ber-effort, median 187 token) memperlihatkan sebaran yang lebih rendah. Ambang ini keputusan eksekutor yang paling rapuh di milestone ini.
3. **Kritikus yang berpikir mahal dan kadang terlalu panjang.** Kritikus menghabiskan US$1,12 dari US$1,84 jalan TIRT (Wafer: US$0,03–0,07 per putusan); penalaran terpanjang 24.002 token = `max_tokens` (terpotong → "tidak menjawab", 3 kali).
4. **Kealamian tidak membaik**: TIRT M2d-6 3,00 (sama dengan M2d-5; M2d-4 4,00) pada penilai yang sama. Kritik penilai: pilihan "telegrafis" ("alasan setop awal tahun kenaikan harga") dan pembuka penjelasan "Yang terbaca:" — gerbang gaya tidak menyentuh penjelasan.

### Keputusan yang diambil eksekutor (bisa ditolak reviewer)

1. **Ambang**: kritikus 1.000 (kontrak ≥ 500) dan penebak GLM 300, dari probe (lihat `probe/putusan.md`); `effort: "high"` (bukan "medium", yang tidak berpikir).
2. **Bukti penyedia per jenis pelanggaran** (porsi dihitung terhadap panggilan sejenis) dan hanya untuk `effort` yang DIPAKAI peran itu — `effort: "medium"` yang sengaja diprobe tidak dihitung sebagai pelanggaran penyedia. Daftar dibekukan di commit T-04; tidak diubah selama jalan TIRT.
3. **Kalibrasi serentak** (5 soal sekaligus, penebak tiap soal tetap berurutan) dengan pesanan perkiraan di pagu, sesudah jalan berurutan pertama terlalu lambat; jalan K0 berurutan yang dihentikan disimpan di `kalibrasi/dibuang/` (panggilan yang sedang berjalan saat dihentikan mungkin ditagih tanpa tercatat — lihat rekonsiliasi di §9 kontrak).
4. **Sampel kedua K1–K4 memakai daftar pengecualian yang sudah diperbarui** sesudah sampel pertama (bukti D-2 bertambah dari kalibrasi); K2-s2 terhenti karena galat penyedia (respons bukan JSON) dan dibuang; K3-s2 dan K4-s2 terhenti di pagu kalibrasi.
5. **Petunjuk "pemburu soal bocor"** menyebut kebiasaan umum pembuat soal (dua pilihan kembar, pilihan "tidak pernah dihitung", jangan menganggap teman pasti keliru) — ditulis sesudah melihat empat soal bocor; risiko terlalu pas dengan himpunan kalibrasi disebut terbuka. Di jalan TIRT penebak GLM juga memakai "dua pilihan sama-sama membenarkan → singkirkan" untuk pasangan yang TIDAK kembar.

### Keterbatasan

- n sangat kecil: himpunan kalibrasi 10 soal, satu sampel per susunan (dua untuk K1), 3 penebak per soal; K-05 menolak satu tebakan benar dengan yakin ≥ 40, jadi penebak yang beragam menolak banyak soal aman.
- Kontrak menyebut M2d-4 TIRT 1 & 3 "ditebak benar ≥ 2/3"; menurut jawaban mentah, keduanya ditebak benar 1/3 dengan yakin 40 dan 50 — bocor menurut K-05 (yakin ≥ 40), bukan menurut ≥ 2/3. Label kalibrasi diturunkan dari jawaban mentah dengan K-05 (dites).
- Tidak ada panggilan Sectors; `web/`, `server/`, `cases/`, `factory/verifikasi/`, `factory/kasus/`, `alat/`, `deploy/` tidak disentuh; draf tidak dipasang ke produk.
