# M3.14 D-6 — tanggapan per butir kritik (satu putaran perbaikan)

Kritik mentah: `kritik-desain-r0.txt` (1 subagent Opus baru, sinkron; bahan `.cache/e2e/m314/sesudah-r0/`, 360×640 dan 390×844, terang dan gelap). Tangkapan sesudah perbaikan: `.cache/e2e/m314/sesudah/`.

| butir | tindakan | alasan |
|---|---|---|
| 1 label petunjuk terpotong di bawah keping + balon | **dikerjakan**: `[data-gulir-sorot] { scroll-margin-top: max(var(--tepi-atas, 64px), 112px) }`; sasaran gulir petunjuk = label itu sendiri. Dijaga e2e baru `tertutupPuncak()` (E-60a, E-61a). | Balon melayang baru aktif SESUDAH guliran, jadi `--tepi-atas` belum terukur saat tujuan dihitung. |
| 2 panel menutupi separuh layar (juga 3/5 penguji D-5) | **dikerjakan** (putusan A): dua baris — "Cara main · n dari 4" + "Lewati" di kanan; kalimat + tombol utama di kanan; bantalan halaman 240 → 160 px. Tinggi terukur ±110–130 px (kalimat langkah 4 jadi 3 baris di 360). | Putusan kritikus; keluhan penguji. |
| 3 + B langkah petunjuk menunjuk tombol yang tak terlihat | **dikerjakan**: urutan jadi omongan → kartu → pilihan → **tombol petunjuk**; langkah 4 menyorot tombol sungguhan, tombol utama "Tunjukkan" menjalankan petunjuk sekali (aksi `tunjukkan_petunjuk`) lalu pemandu selesai; teks kritikus dipakai ("Buntu? Tombol ini menandai kartu yang perlu dicek, bukan jawabannya."). | Tombol berada di bawah pilihan; demonstrasi mendarat di kartu, bukan di pilihan. **Menyimpang dari urutan tertulis kontrak D-1** (①②③petunjuk④pilihan) — dicatat di §9. "Selesai" versi kritikus diganti "Lewati" yang sudah ada di tiap langkah, supaya demonstrasi tetap terjadi dengan satu ketukan yang sama seperti "Lanjut". |
| A kata-kata langkah 1–3 | **dikerjakan**: "Ini omongan teman. Betul atau keliru?" · "Buktinya ada di kartu-kartu ini." · "Pilih yang cocok dengan kartu." (seluruh pemandu ±30 kata). | Putusan kritikus; tes 4-gram anti-bocor tetap hijau. |
| 4 cincin terlalu terang di gelap, sudut 8 px | **dikerjakan**: 2 px `--tinta`, offset 4 px, `border-radius: 3px` (4 px tidak ada di daftar radius `periksa:desain`); di balon mengikuti 4/16/16/16. | |
| 5 label di dalam lembar resmi | **dikerjakan**: label di atas lembar, di luar cincin, *isi* 600 17 px, tanpa panah. | Dua suara tidak bercampur. |
| 6a penutup tampil sebagai lembar | **dikerjakan**: `.pesan-alpha` garis kiri 2 px `--garis-tegas`, tanpa latar/bingkai. | `docs/desain.md` "Dua bahan". |
| 6b judul kedua "Hari bursa lain" | **dikerjakan**: satu baris *meta* "Hari bursa lain, ketuk untuk main:"; `KalenderSimulasi` menerima `judul={null}`. | Satu judul per layar. |
| 7 pintu dapur terlalu jauh | **dikerjakan sebagian**: baris kisi 40 → 32 px (lingkaran 28 px). Pintu dapur tetap di akhir (putusan D). | Putusan kritikus. |
| 8 lingkaran jangan interaktif; › 16 px; status pendek | **dikerjakan**: kisi sudah `aria-hidden` dan tanpa kontrol; › 16 px 500 `--stempel`; status "Baru saja selesai" / "Sudah selesai" / "Belum dimainkan". | |
| 9 pengunjung yang kembali ke simulasi yang sudah selesai | **dikerjakan**: tautan "Simulasi baru: Senin, 4 Mei 2026 ›" (hanya bila simulasi yang dibuka sudah selesai dan masih ada yang belum; `simulasiBaru()` murni, dites; e2e E-62d) + "Pilih dari kalender simulasi ›". | Pengunjung baru: layar pertama tetap sama persis. |
| 10 tautan rata tengah | **dikerjakan**: rata kiri, `margin-top: 16px`, *aksi* 16 px (`.tautan-kecil`). | |
| 11 keterangan kalender 3 baris | **dikerjakan**: "Tiap lingkaran = satu hari bursa nyata. Penuh = sudah kamu selesaikan." | "selesaikan", bukan "mainkan": tanda penuh berarti selesai. |
| 12 amandemen `docs/desain.md` | **tidak dikerjakan** — `docs/desain.md` di luar batas kerja M3.14 (hanya `docs/bukti/**`). Diserahkan ke reviewer (§9). | Batas kerja. |
| 13a status tebal + ambar | **dikerjakan**: warna saja, 400. | Satu teknik penekanan. |
| 13b garis kiri ambar "Berhenti karena" | **dikerjakan**: 2 px `--garis-tegas`. | |
| 13c sel "sudah dikunci" balok gelap | **dikerjakan** lewat butir 14: kotak sesudah dikunci = garis bawah tipis saja. | |
| 14 tabel garis waktu tak terbaca di 360 | **dikerjakan**: tabel diganti tiga pita (satu per omongan), 15 kotak 19 px berikon peran (✓ = dikunci), legenda, dan satu kalimat per omongan dari data yang sama (`kalimatOmongan`, dites terhadap jejak). | Ikon per peran tetap ada (kontrak D-4). |
| E pengantar dapur 7 baris | **dikerjakan**: kalimat ketiga dibuang (dua kalimat yang dijaga tes tetap). | |
| E 4 angka → 2 | **dikerjakan**: putaran + biaya nyata di badan; panggilan, menit, token ke "Rincian teknis". | |
| E nama model ke Rincian teknis, "model murah" | **tidak dikerjakan**. | Putusan reviewer M3.13 (nama model boleh tampil) dan "murah" adalah penilaian yang tidak ada di jejak. |
| E "Lima peran" ke atas | **dikerjakan**: dipindah sebelum jalan TIRT (tidak digabung; tes M3.13 menjaga judul bagian tepat sekali). | Penjelasan datang sebelum dipakai. |
| E keterangan "cooling down", "volume nol" | **tidak dikerjakan**. | Keduanya di dalam kutipan jejak; menambah glosarium = teks buatan di halaman yang dijanjikan "dari jejak". |
| E "Simulasi yang tayang: hanya angka, tanpa isi" | **dikerjakan**: "Simulasi yang bisa kamu mainkan: hanya angka, supaya jawabannya tidak bocor". | |
| E "Tulisan penulis … tidak terbaca" | **dikerjakan**: "Mesin tidak menemukan omongan n di jawaban penulis; penulis diminta menulis lagi." | Makna jejak "tidak ada omongan terbaca dari penulis". |
| C tombol petunjuk | **dikerjakan**: baris sendiri di bawah pilihan (`margin-top: 24px`), tombol garis tepi 16 px 500 kiri, "Cara main" kanan; "↑ Kembali ke dokumen" tetap di bawahnya. | Sudah 16 px sejak T-02; jarak ditambah. |
