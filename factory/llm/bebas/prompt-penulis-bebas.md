Kamu menulis satu simulasi untuk produk latihan membaca dokumen pasar modal Indonesia. Pemainnya PEMULA: orang 20-an yang belum pernah beli saham, membaca di ponsel, dan tidak mau berhitung. Tujuan soal: melatih pemula MEMBACA KARTU. Isi tidak dimudahkan; yang dibuang adalah petunjuk palsu di bentuk pilihan.

Cara main: teman di grup obrolan melempar omongan tentang sebuah saham. Pemain mencocokkan omongan itu dengan 2–4 kartu dokumen resmi, lalu memilih satu dari empat pilihan: omongan itu Betul atau Keliru, dan kenapa.

Kamu menerima PAKET FAKTA. Setiap fakta sudah diperiksa mesin dan sudah bisa dibaca publik pada tanggal simulasi (T). Kamu hanya menulis kata-kata; kamu TIDAK menghitung dan TIDAK menambah fakta. Satu `fact_id` = satu kartu.

SOAL YANG BAIK: jawabannya hanya bisa dipastikan dengan membaca kartu. Bagi orang yang BELUM membaca kartu, keempat pilihan sama masuk akalnya. Setiap pengecoh adalah SATU salah baca kartu yang memang sering dilakukan pemula, dan hanya satu pilihan yang benar menurut kartu.

ENAM JENIS SALAH BACA (label tiap pengecoh, pakai nama kode di kiri):
- `salah-periode` (salah periode): isinya milik tanggal/periode lain, bukan yang dibicarakan.
- `salah-entitas` (salah entitas): isinya tentang hal lain di kartu (ukuran lain, pihak lain), bukan yang ditanyakan.
- `nyaris-benar-angka` (angka nyaris benar): angkanya mirip angka yang benar, tetapi bukan angka untuk hal itu — angkanya tetap HARUS ada di kartu omongan ini (mis. angka lain di kartu yang sama).
- `pertanyaan-lain` (menjawab pertanyaan lain): kalimatnya benar atau masuk akal, tetapi tidak menjawab apakah omongan teman cocok.
- `sebagian-benar` (sebagian benar): sebagian cocok dengan kartu, sebagian tidak.
- `percaya-otoritas` (percaya omongan tanpa cek): membenarkan teman tanpa mengecek kartu. Hanya sah bila pengecoh diawali "Betul" dan kunci diawali "Keliru".

CACAT PENULISAN SOAL YANG MEMBOCORKAN KUNCI (dari riset; mesin memeriksanya — hindari):
- kunci = pilihan terpanjang atau paling rinci; panjang keempat pilihan harus mirip;
- angka, tanggal, persen, kode, atau nama dokumen yang hanya muncul di kunci (setiap jenis rincian muncul di 0 atau ≥ 2 pilihan);
- kunci mengulang kata-kata pesan teman, atau kata pesan yang hanya muncul lagi di kunci;
- kunci yang menjadi "titik tengah" pilihan lain (paling banyak kata bersama dengan pilihan lain);
- kata mutlak (selalu, pasti, semua, hanya, cuma, tidak pernah, jelas, tentu…) atau kata pelunak (mungkin, belum tentu, sekitar, cenderung…) hanya di satu sisi;
- label tidak seimbang (harus tepat 2 "Betul" + 2 "Keliru");
- angka pilihan yang tersusun naik/turun mengikuti huruf a→d;
- angka kunci yang bisa dihitung dari angka lain yang terlihat tanpa kartu;
- lebih dari satu pilihan benar menurut kartu;
- nada pesan yang menunjuk jawaban (teman yang "terlalu yakin" selalu keliru, dsb.).

ATURAN (semuanya diperiksa mesin; omongan yang melanggar ditolak dan dikembalikan kepadamu):

1. Tepat 3 omongan dari pengirim berbeda: nama panggilan pendek yang umum di Indonesia, 2–12 huruf, huruf saja. Jangan memakai nama {NAMA_TERLARANG}. Jam kirim HH.MM antara 16.00 dan 23.59 pada tanggal T.
2. Pesan: gaya obrolan grup yang wajar (pakai "gw"/"aku", "lu"/"kamu"; jangan "gue", "gua", "lo", "elo"; jangan bahasa resmi), paling banyak {BATAS_PESAN} kata dan 220 karakter, polos (tanpa [[...]] dan tanpa tanda tebal). Setiap angka di pesan (termasuk tanggal, tahun, persen, rupiah, lembar, lot) dicatat di `angka_pesan` sebagai `{"teks": "<potongan persis>", "fact_id": "<kartu omongan ini yang memuat angka itu>"}`. Angka karangan (andaian) DILARANG: angka yang diucapkan teman, benar atau keliru, harus ada di salah satu kartu omongan itu.
3. Minimal satu dari tiga omongan ternyata BETUL. Huruf kunci ketiga omongan tidak boleh sama semua.
4. Tiap omongan membawa 2–4 `kartu` (fact_id dari paket, tidak berulang) dan 1–2 `kartu_penentu` (bagian dari `kartu`) — kartu yang membuktikan jawabannya. Ketiga omongan harus bersudut berbeda: `kartu_penentu` satu omongan tidak boleh sama dengan `kartu_penentu` omongan lain.
5. Empat pilihan a, b, c, d: tepat dua diawali "Betul," dan dua diawali "Keliru,". Tiap pilihan paling banyak {BATAS_PILIHAN} kata dan 110 karakter, dan berbentuk SATU klausa: `Betul|Keliru, <satu klausa>`. Koma kedua hanya boleh membuka kontras ("…, bukan …", "…, tapi …", "…, tetapi …", "…, melainkan …"); tanpa ekor ", jadi …"/", karena …"/", sehingga …"; tanpa tanda pisah dan titik koma. Panjang kunci paling banyak 1,3 × median panjang ketiga pengecoh. `kunci` = huruf pilihan yang benar.
6. SETIAP ANGKA DAN TANGGAL HARUS ADA DI KARTU OMONGAN ITU. Di `pilihan`, `penjelasan`, dan `umpan_balik`, setiap angka (termasuk tanggal dan tahun) ditulis sebagai rujukan `[[fact_id|teks tampil]]` dengan `fact_id` dari `kartu` omongan itu (bukan fakta paket lain); teks tampil ≤ 36 karakter dan harus angka yang memang ada di fakta itu. `[[misal|…]]` DILARANG. Tanggal simulasi boleh ditulis `[[hari-ini|{TANGGAL_T}]]`. Tidak boleh ada digit di luar rujukan, kecuali "kartu 1", "kartu 2", … di umpan balik. Kata bilangan tanpa digit ("dua kali lipat") boleh.
7. Hanya isi paket. Tidak ada peristiwa, tanggal, atau angka sesudah T. Emiten disamarkan dengan nama samaran yang diberikan; jangan menulis kode saham, nama perusahaan, atau nama orang (pakai peran). Jangan menyarankan membeli/menjual. Jangan memakai kata bagus, jelek, sehat, buruk, murah, mahal (bentuk apa pun).
8. `penjelasan`: jelaskan apa yang terbaca di kartu, rujuk minimal satu kartu penentu dengan `[[fact_id|teks]]`, jelaskan kenapa pengecoh yang menggoda salah, lalu tutup dengan satu kalimat yang diawali "Salah-kaprah yang umum:". Paling banyak 800 karakter polos. Tulis untuk teman yang belum pernah beli saham.
9. `pengecoh`: untuk TIAP huruf yang bukan kunci (tepat tiga), satu objek `{"jenis": "<kode jenis salah baca>", "rujukan": "<fact_id kartu yang menunjukkan kesalahannya>", "umpan_balik": "<kalimat untuk pemain yang memilih pengecoh itu>"}`. `rujukan` harus salah satu `kartu` omongan itu. `umpan_balik` paling banyak 200 karakter, WAJIB memuat nama jenis kesalahannya persis seperti di dalam kurung pada daftar di atas (mis. "salah periode", "angka nyaris benar", "percaya omongan tanpa cek") dan WAJIB menyebut "kartu N" — N = nomor urut `rujukan` di daftar `kartu` (kartu pertama = kartu 1). Huruf kunci TIDAK diberi label.
10. `pertanyaan_cek`: satu pertanyaan pendek (≤ 20 kata, diakhiri "?", tanpa digit) yang bisa dipakai pemain lagi di soal lain untuk mengecek kartu, mis. "Angka ini milik tanggal yang mana menurut kartu?".

TELADAN GAYA (tiga soal tayang dari emiten lain — tiru gaya, ringkasnya, dan cara pengecohnya; JANGAN menyalin kalimatnya, dan aturan angka nomor 6 di atas tetap berlaku):

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
