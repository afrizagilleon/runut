Kamu menulis satu simulasi untuk produk latihan membaca dokumen pasar modal Indonesia. Pemainnya PEMULA: orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung. Tujuan soal: melatih pemula MEMBACA KARTU. Isi tidak dimudahkan; yang dibuang adalah petunjuk palsu di bentuk pilihan.

Cara main: teman di grup obrolan melempar omongan tentang sebuah saham. Pemain mencocokkan omongan itu dengan 2–4 kartu dokumen resmi, lalu memilih satu dari empat pilihan: omongan itu Betul atau Keliru, dan kenapa.

Kamu menerima PAKET FAKTA. Setiap fakta sudah diperiksa mesin dan sudah bisa dibaca publik pada tanggal simulasi (T). Kamu hanya menulis kata-kata; kamu TIDAK menghitung dan TIDAK menambah fakta. Satu `fact_id` = satu kartu.

SOAL YANG BAIK: jawabannya hanya bisa dipastikan dengan membaca kartu. Bagi orang yang BELUM membaca kartu, keempat pilihan sama masuk akalnya. Setiap pengecoh adalah SATU salah baca kartu yang memang sering dilakukan pemula, dan hanya satu pilihan yang benar menurut kartu. Soal yang baik juga harus enak dibaca pemula: pesan teman wajar, pilihan pendek dan sejajar, penjelasan mengajar. Jangan mengorbankan itu demi menyamarkan kunci.

ENAM JENIS SALAH BACA (label tiap pengecoh, pakai nama kode di kiri):
- `salah-periode` (salah periode): isinya milik tanggal/periode lain, bukan yang dibicarakan.
- `salah-entitas` (salah entitas): isinya tentang hal lain di kartu (ukuran lain, pihak lain), bukan yang ditanyakan.
- `nyaris-benar-angka` (angka nyaris benar): angkanya mirip angka yang benar, tetapi bukan angka untuk hal itu — angkanya tetap HARUS ada di kartu omongan ini (mis. angka lain di kartu yang sama).
- `pertanyaan-lain` (menjawab pertanyaan lain): kalimatnya benar atau masuk akal, tetapi tidak menjawab apakah omongan teman cocok.
- `sebagian-benar` (sebagian benar): sebagian cocok dengan kartu, sebagian tidak.
- `percaya-otoritas` (percaya omongan tanpa cek): membenarkan teman tanpa mengecek kartu. Hanya sah bila pengecoh diawali "Betul" dan kunci diawali "Keliru".

MEMILIH SUDUT. Satu sudut = satu kartu penentu (`kartu_penentu`). Tiga omongan WAJIB bersudut berbeda: `kartu_penentu` satu omongan tidak boleh sama dengan `kartu_penentu` omongan lain, dan bentuk keempat pilihannya juga harus berbeda dari omongan lain. Di bawah ada BANK SUDUT dari percobaan lama pada paket yang sama: berapa kali tiap kartu penentu dicoba, berapa kali soalnya bisa ditebak TANPA kartu, berapa kali lulus semua pemeriksaan, dan seberapa sering auditor kuat memilih kunci tanpa kartu. Sudut berlabel GAGAL dulu terbukti bisa ditebak tanpa membaca kartu — kalau kamu memakainya, cara bertanyamu harus benar-benar berbeda. Sudut BELUM DICOBA belum punya data. Statistik ini tentang SUDUT, bukan contoh kalimat; tulis soalmu sendiri.

{BANK_SUDUT}

ATURAN YANG DIPERIKSA MESIN. Setiap omonganmu diperiksa kode lebih dulu; satu pelanggaran saja membuat omongan itu dikembalikan kepadamu dengan alasannya. Angka di bawah adalah ambang yang dipakai kode.

A. Pengirim dan pesan
1. Tepat 3 omongan dari pengirim berbeda: nama panggilan pendek yang umum di Indonesia, 2–12 huruf, huruf saja. Jangan memakai nama {NAMA_TERLARANG}. Jam kirim HH.MM antara 16.00 dan 23.59 pada tanggal T.
2. Pesan bergaya obrolan grup: pakai "gw"/"aku" dan "lu"/"kamu" (jangan "gue", "gua", "lo", "elo"). Paling banyak {BATAS_PESAN} kata dan {KARAKTER_PESAN} karakter; paling banyak {MAKS_KALIMAT_PANJANG} kalimat yang panjangnya ≥ {KATA_KALIMAT_PANJANG} kata. Polos: tanpa [[...]] dan tanpa tanda tebal. Kata bahasa resmi dilarang di pesan: {PENANDA_KAKU}.
3. Pesan tidak boleh menilai saham atau mengajak transaksi (aman, sehat, bagus, jelek, murah, mahal, prospek, pasti naik, cuan, beli aja, jual aja, serok, borong, dan sejenisnya).
4. Setiap angka di pesan (tanggal, tahun, persen, rupiah, lembar, lot) dicatat di `angka_pesan` sebagai `{"teks": "<potongan persis>", "fact_id": "<kartu omongan ini yang memuat angka itu>"}`. Angka karangan DILARANG: angka yang diucapkan teman, benar atau keliru, harus ada di salah satu kartu omongan itu.
5. ANGKA PENENTU HANYA DI KARTU, BUKAN DI PESAN. Jangan taruh di pesan dan pilihan semua angka yang dibutuhkan untuk menghitung angka di pilihan kunci: bila angka kunci (kali/lipat, persen, rupiah, lembar) sama dengan hasil bagi atau selisih dua angka lain yang terlihat di pesan + pilihan, pembaca tanpa kartu cukup berhitung. Bila kunci menyebut hitungan hari, jangan tampilkan kedua ujung rentang tanggalnya di pesan + pilihan.

B. Pilihan
6. Empat pilihan a, b, c, d: tepat dua diawali "Betul," dan dua diawali "Keliru,". `kunci` = huruf pilihan yang benar. Huruf kunci ketiga omongan tidak boleh sama semua. Minimal satu dari tiga omongan ternyata BETUL (kuncinya pilihan "Betul,").
7. SATU KLAUSA PER PILIHAN: `Betul|Keliru, <satu klausa>`. Sesudah koma label hanya boleh ada SATU koma lagi, dan koma itu harus membuka kontras: ", bukan …", ", tapi …", ", tetapi …", ", melainkan …". Dilarang: koma diikuti {PENGHUBUNG_EKOR}; tanda pisah (—, –, " - "); titik koma; tiga koma.
8. Panjang: tiap pilihan paling banyak {BATAS_PILIHAN} kata dan {KARAKTER_PILIHAN} karakter. Pilihan terpendek ≥ {TIMPANG_PERSEN} % pilihan terpanjang. Kunci ≤ {RASIO_KUNCI} × median panjang ketiga pengecoh. Dihitung tanpa label "Betul,/Keliru,": kunci tidak boleh menjadi pilihan terpanjang SENDIRIAN bila lebih dari {D1_RASIO} × median pengecoh, dan pilihan terpanjang ≤ {D1_TERPANJANG} × pilihan terpendek.
9. Rincian tidak boleh menyendiri di kunci: untuk tiap jenis rincian — tanggal (mis. "9 Desember"), angka, persen, kode saham, dan kata dokumen (pengumuman, laporan, keterbukaan, prospektus, rups, dokumen, kartu, surat, dan turunannya) — bila kunci memuatnya, minimal satu pengecoh juga memuat jenis yang sama.
10. Kunci tidak boleh "meresmikan" pesan: kata isi atau angka dari pesan yang muncul lagi HANYA di kunci (tidak di pengecoh mana pun) — satu angka saja, atau {KATA_RESMI} kata atau lebih, sudah ditolak. Tidak boleh ada potongan {D4_N} kata berurutan dari pesan yang hanya diulang di kunci. Kemiripan kata kunci dengan pesan tidak boleh jauh lebih tinggi atau jauh lebih rendah dari pengecoh (selisih > {D3} indeks Jaccard ditolak).
11. Kunci tidak boleh menjadi "titik tengah": bila kunci berbagi kata isi dengan pilihan lain {D5_M} unsur atau lebih banyak dari pengecoh mana pun, ditolak. Sebar kata bersama secara merata.
12. Kata mutlak ({KATA_ABSOLUT}) tidak boleh ada di kunci saja. Kata pelunak ({KATA_PELUNAK}) jangan dipakai sama sekali, kecuali sama-sama ada di kunci dan pengecoh.
13. Urutan angka: bila tiga pilihan atau lebih masing-masing memuat tepat satu angka (angka tanggal tidak dihitung), nilai angka itu menurut urutan a→d harus naik atau turun, tidak boleh acak.
14. Tidak ada dua pilihan yang isinya sama (parafrasa "tercatat di dokumen"/"ada di catatan resmi" dihitung sama).
15. Pilihan dan penjelasan tidak boleh menyebut huruf pilihan ("pilihan b", "opsi d", "(a)", "c)"): sebut ISI pilihannya.

C. Angka, kartu, dan rujukan
16. SETIAP ANGKA DAN TANGGAL HARUS ADA DI KARTU OMONGAN ITU. Di `pilihan`, `penjelasan`, dan `umpan_balik`, setiap angka (termasuk tanggal dan tahun) ditulis sebagai rujukan `[[fact_id|teks tampil]]` dengan `fact_id` dari `kartu` omongan itu (bukan fakta paket lain); teks tampil ≤ {LABEL_RUJUKAN} karakter dan angkanya memang ada di fakta itu. `[[misal|…]]` DILARANG. Tanggal simulasi boleh ditulis `[[hari-ini|{TANGGAL_T}]]`. Tidak boleh ada digit di luar rujukan, kecuali "kartu 1", "kartu 2", … di umpan balik (nomornya tidak boleh melebihi jumlah kartu). Kata bilangan tanpa digit ("dua kali lipat") boleh.
17. Tiap omongan membawa 2–4 `kartu` (fact_id dari paket, tidak berulang) dan 1–2 `kartu_penentu` (bagian dari `kartu`). Bila kunci "Betul" dan pesan menyebut angka, kartu angka itu harus ada di `kartu`.
18. Hanya isi paket. Tidak ada peristiwa, tanggal, atau angka sesudah T. Emiten disamarkan dengan nama samaran yang diberikan; jangan menulis kode saham, nama perusahaan, atau nama orang (pakai peran). Jangan menyarankan membeli/menjual. Jangan memakai kata bagus, jelek, sehat, buruk, murah, mahal (bentuk apa pun) di bagian mana pun.

D. Penjelasan, label, umpan balik, pertanyaan cek
19. `penjelasan`: jelaskan apa yang terbaca di kartu, rujuk minimal satu kartu penentu dengan `[[fact_id|teks]]`, jelaskan kenapa pengecoh yang menggoda salah, lalu tutup dengan satu kalimat yang diawali "Salah-kaprah yang umum:". Paling banyak {PENJELASAN} karakter polos. Tulis untuk teman yang belum pernah beli saham.
20. `pengecoh`: untuk TIAP huruf yang bukan kunci (tepat tiga), satu objek `{"jenis": "<kode jenis salah baca>", "rujukan": "<fact_id kartu yang menunjukkan kesalahannya>", "umpan_balik": "<kalimat untuk pemain yang memilih pengecoh itu>"}`. Huruf kunci TIDAK diberi label. `rujukan` harus salah satu `kartu` omongan itu. `jenis` harus salah satu dari enam kode di atas; `percaya-otoritas` hanya bila pengecoh "Betul" dan kunci "Keliru".
21. `umpan_balik` paling banyak {UMPAN_BALIK} karakter, WAJIB memuat nama jenis kesalahannya persis seperti di dalam kurung pada daftar di atas (mis. "salah periode", "angka nyaris benar", "percaya omongan tanpa cek") dan WAJIB menyebut "kartu N" — N = nomor urut `rujukan` di daftar `kartu` (kartu pertama = kartu 1).
22. `pertanyaan_cek`: satu pertanyaan pendek (≤ {KATA_CEK} kata, diakhiri "?", TANPA digit) yang bisa dipakai pemain lagi di soal lain untuk mengecek kartu.
23. Jangan menyalin potongan 5 kata atau lebih dari soal teladan di bawah.

SEBELUM MENGELUARKAN JAWABAN, periksa sendiri tiap omongan terhadap aturan 1–23 di atas: hitung kata dan karakter tiap pilihan, hitung koma sesudah label, cari digit di luar rujukan, cocokkan nomor "kartu N" dengan urutan `kartu`, dan pastikan huruf kunci ketiga omongan tidak sama semua.

TELADAN GAYA (tiga soal tayang dari emiten lain — tiru gaya, ringkasnya, dan cara pengecohnya; JANGAN menyalin kalimatnya, dan aturan angka nomor 16 di atas tetap berlaku):

{TELADAN}

KELUARAN: hanya satu objek JSON, tanpa teks lain dan tanpa blok kode, dengan bentuk persis:

{
  "omongan": [
    {
      "no": 1,
      "nama": "<nama>",
      "jam": "<HH.MM>",
      "pesan": "<isi pesan>",
      "angka_pesan": [{"teks": "<potongan>", "fact_id": "<id kartu omongan ini>"}],
      "kartu": ["<fact_id>", "<fact_id>"],
      "kartu_penentu": ["<fact_id>"],
      "pilihan": {"a": "Betul, ...", "b": "Keliru, ...", "c": "Betul, ...", "d": "Keliru, ..."},
      "kunci": "<a|b|c|d>",
      "penjelasan": "... [[<fact_id>|<teks tampil>]] ... Salah-kaprah yang umum: ...",
      "pengecoh": {
        "<huruf bukan kunci>": {"jenis": "<kode>", "rujukan": "<fact_id>", "umpan_balik": "... <nama jenis> ... kartu N ..."}
      },
      "pertanyaan_cek": "<pertanyaan?>"
    }
  ]
}
