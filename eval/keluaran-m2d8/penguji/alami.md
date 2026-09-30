Kamu penilai bahasa Indonesia. Di bawah ada beberapa draf soal latihan, dikelompokkan; tiap draf
diberi label huruf. Satu draf berisi tiga soal: pesan teman di grup obrolan, empat pilihan jawaban,
dan penjelasan.

Nilai KEALAMIAN BAHASA INDONESIA tiap draf, skala 1-5:
1 = kaku, janggal, atau terasa terjemahan mesin;
3 = bisa dipahami, tetapi ada frasa yang tidak lazim bagi penutur asli;
5 = terdengar ditulis penutur asli dengan wajar: pesan seperti obrolan grup sungguhan, pilihan dan
    penjelasan seperti teman yang menjelaskan.
Jangan menilai benar-salah isinya atau kelengkapan faktanya — hanya bahasanya. Beri satu kalimat
alasan per draf. Jangan memakai alat apa pun.
Balas HANYA dengan JSON berbentuk:
{"nilai": [{"kelompok": 1, "label": "A", "skor": 4, "alasan": "..."}, ...]}

## Kelompok 1

#### Draf A
Soal 1
Pesan dari Sari (19.20): "Aku panik, sahamnya kena setop bursa hari ini! Awal tahun juga kena setop, katanya karena harga naik terus."
Pilihan: a) Betul, alasan setop awal tahun kenaikan harga. | b) Betul, setop awal tahun tidak dicatat bursa. | c) Keliru, setop awal tahun karena keraguan usaha. | d) Keliru, setop hari ini karena keraguan usaha.
Penjelasan: Pengumuman bursa 21 Januari 2025 menyebut alasan setop awal tahun itu keraguan atas kelangsungan usaha. Alasan kenaikan harga kumulatif justru tertulis di setop 10 Desember 2025, yang terjadi hari ini. Kapan saham dibuka lagi juga tidak tercatat di kedua pengumuman itu. Salah-kaprah yang umum: semua setop bursa dikira gara-gara harga naik terus.

Soal 2
Pesan dari Andi (20.45): "Angka 58 rupiah itu bukan harga penutupan, gw yakin itu beda dua penutupan. Gw hafal polanya."
Pilihan: a) Betul, itu selisih penutupan 1 Desember dan 9 Desember. | b) Keliru, itu harga penutupan 9 Desember. | c) Keliru, itu harga penutupan 1 Desember. | d) Betul, itu selisih penutupan 26 November dan 9 Desember.
Penjelasan: Yang terbaca: 58 rupiah itu selisih penutupan 26 November dan 9 Desember. Itu bukan harga satu hari, karena penutupan 9 Desember sendiri 106 rupiah dan penutupan 1 Desember 62 rupiah. Jadi klaim teman bahwa angka itu beda dua penutupan cocok. Salah-kaprah yang umum: angka selisih dua penutupan dikira harga saham di satu hari.

#### Draf B
Soal 1
Pesan dari Rizky (20.15): "Gw yakin banget sahamnya disetop karena bursa ragu soal kelangsungan usahanya. Ga ada alasan lain deh."
Pilihan: a) Betul, penghentiannya karena keraguan atas kelangsungan usaha perseroan. | b) Keliru, penghentiannya tercatat pada 21 Januari awal tahun. | c) Keliru, penghentiannya karena kenaikan harga kumulatif pada 10 Desember. | d) Betul, volume perdagangannya 1.461.200 lembar pada hari sebelumnya.
Penjelasan: Rizky menyimpulkan penghentian saham Perusahaan T karena bursa ragu soal kelangsungan usaha. Catatan 10 Desember 2025 menyebut alasan resminya: kenaikan harga kumulatif yang signifikan, sebagai cooling down untuk perlindungan investor. Jadi untuk kejadian itu, pernyataannya tidak cocok. Memang ada catatan 21 Januari 2025 yang memuat keraguan atas kelangsungan usaha, tetapi itu penghentian di tanggal berbeda. Catatan volume 9 Desember 2025 hanya menunjukkan angka perdagangan, bukan sebab penghentian, jadi tidak menjawab alasan. Salah-kaprah yang umum: mengira semua penghentian saham punya alasan yang sama, padahal alasan resminya bisa berbeda.

#### Draf C
Soal 1
Pesan dari Rian (20.11): "Gw yakin Januari 2025 saham ini udah pernah disetop juga, dan alasannya beda dari yang sekarang."
Pilihan: a) Keliru, tidak ada penghentian saham di awal tahun itu. | b) Betul, penghentian Januari 2025 beralasan kenaikan harga kumulatif. | c) Betul, penghentian Januari 2025 beralasan keraguan kelangsungan usaha. | d) Keliru, penghentian Januari 2025 tidak mencatat alasan resmi apa pun.
Penjelasan: Pengumuman penghentian 10 Desember 2025 menuliskan alasan resminya: naiknya harga kumulatif yang signifikan, sebagai langkah cooling down demi melindungi investor. Sementara itu 21 Januari 2025 juga memuat penghentian perdagangan, dengan alasan resmi keraguan atas kelangsungan usaha. Dua penghentian itu memang beralasan tidak sama, jadi klaim teman soal alasan yang berbeda cocok dengan catatan. Yang tidak ada di kedua pengumuman cuma tanggal kapan perdagangannya dibuka lagi. Salah-kaprah yang umum: orang menyangka satu saham cuma bisa kena penghentian sekali dalam setahun, padahal di sini tercatat dua kali dengan alasan yang tidak sama.

Soal 2
Pesan dari Sari (19.32): "Gw udah hafal polanya, dari 26 November sampe 9 Desember harganya naik 58 rupiah. Itu angka pastinya."
Pilihan: a) Keliru, kenaikan periode itu tidak pernah dihitung. | b) Betul, angka itu kenaikan sejak awal tahun, bukan periode itu. | c) Keliru, harga dua tanggal itu tidak tercatat di mana pun. | d) Betul, kenaikan periode itu memang Rp58.
Penjelasan: Data bursa memuat penutupan 26 November dan penutupan 9 Desember, dan kartu penentu menghitung selisih keduanya: Rp58. Kartu lain mencatat harga naik 9 hari bursa berturut-turut, dan kenaikan itu memang diukur dari dua tanggal tersebut, bukan dari awal tahun. Jadi angka yang diucapkan teman sama dengan yang tercatat, dan pilihan yang bilang angka ini tidak dihitung atau tidak tercatat tidak cocok dengan dokumen. Salah-kaprah yang umum: orang merasa angka kenaikan harus dihitung sendiri dari daftar harga, padahal sudah tersedia satu angka jadi.

Soal 3
Pesan dari Nia (22.14): "Kayaknya hasil putusan rapat pemegang saham 25 September 2025 ada di catatan resmi ya?"
Pilihan: a) Betul, hasil putusannya tercatat di dokumen. | b) Betul, hasil putusannya ada di catatan resmi. | c) Keliru, rapat itu tidak dijadwalkan. | d) Keliru, hasil putusannya tidak tercatat di dokumen.
Penjelasan: Catatan resmi hanya menulis bahwa rapat pemegang saham dijadwalkan 25 September 2025. Di bagian yang sama disebut isi keputusan rapatnya tidak tercatat, jadi tidak ada bahan untuk memastikan hasil putusannya. Tidak ada pula keterangan yang mengaitkan rapat itu dengan penghentian perdagangan hari ini. Karena yang tercatat cuma jadwal, anggapan bahwa hasil putusannya sudah ada di catatan resmi tidak cocok dengan dokumen. Salah-kaprah yang umum: orang mengira rapat pemegang saham yang sudah dijadwalkan pasti meninggalkan catatan hasil, padahal di sini justru tidak dicatat.

## Kelompok 2

#### Draf A
Soal 1
Pesan dari Nadia (17.58): "Saham U dibuka anjlok Rp145, padahal dividennya Rp45. Pasti ada kabar buruk!"
Pilihan: a) Betul, dividennya memang cuma Rp45 per lembar. | b) Keliru, dividennya Rp130, bukan Rp45. | c) Betul, turunnya lebih dari tiga kali dividennya. | d) Keliru, dividennya Rp160, bukan Rp45.
Penjelasan: Nadia memakai angka yang keliru: dividen yang tanggal ex-nya hari ini Rp130 per lembar, bukan Rp45. Turunnya Rp145 hanya Rp15 lebih besar dari dividen itu (penutupan terakhir Rp1.690, pembukaan hari ini Rp1.545). Pada tanggal ex, uang sebesar dividen berpindah dari perusahaan ke pemilik saham, jadi harga per lembarnya menyesuaikan. Yang tidak dikatakan kartu mana pun: apakah sisa Rp15 itu punya sebab. Salah-kaprah yang umum: mencari kabar buruk untuk setiap penurunan harga sebelum mencocokkan angkanya dengan dokumen hari itu.

Soal 2
Pesan dari Fajar (18.11): "Gue baru buka riwayat dividennya. Perusahaan U ini bagi dividen tiap tahun tanpa putus sejak 2020, dan jumlah per lembarnya naik terus tiap tahun. Rapi banget."
Pilihan: a) Keliru, tiap tahun memang ada, tetapi jumlahnya pernah turun jauh. | b) Betul, tiap tahun ada pembagian dan jumlahnya naik di tahun berikutnya. | c) Betul, jumlahnya sempat datar dua tahun, tetapi tidak pernah turun. | d) Keliru, ada satu tahun tanpa pembagian sama sekali di tengah deret.
Penjelasan: Setengah omongan Fajar cocok dengan dokumen: ada pembagian di tiap tahun, tujuh tahun berturut-turut. Setengahnya lagi tidak: jumlah per lembarnya pernah turun jauh, dari Rp85 di 2021 ke Rp25 di 2022, sebelum naik lagi tiap tahun sampai Rp130. Kartu kedua sudah membandingkan tahun demi tahun, jadi tidak ada yang perlu kamu hitung. Perhatikan juga apa yang tidak ada di kartu ini: berapa dividen tahun depan, dan kenapa jumlahnya berubah — dokumen hanya mencatat yang sudah terjadi. Salah-kaprah yang umum: satu kalimat yang setengahnya benar dibaca sebagai seluruhnya benar, dan bagian yang terdengar paling meyakinkan justru yang paling jarang dicek.

Soal 3
Pesan dari Rio (18.26): "Jangan kegeeran dulu. Gue baca laporan Januari: pemilik terbesarnya yang 53 persen itu ikut beli juga, bukan cuma orang dalam yang porsinya kecil."
Pilihan: a) Keliru, pemilik terbesarnya tidak tercatat membeli satu lembar pun. | b) Betul, pemilik terbesarnya tercatat membeli lewat satu laporan besar. | c) Keliru, yang tercatat membeli bulan itu justru pemilik terbesar sendirian. | d) Betul, pemilik terbesarnya tercatat membeli sejuta lembar di dua laporan.
Penjelasan: Rio betul, dan kartu pertama yang membuktikannya: pemilik terbesar memang tercatat membeli — dua laporan, 700.000 lalu 300.000 lembar, seluruhnya 1 juta lembar menurut kartu ketiga. Ia bukan satu-satunya: orang dalam lain menambah 16,07 juta lembar lewat enam laporan. Perhatikan seberapa jauh angka itu menggerakkan porsi mereka — dari 53,16% ke 53,17%, dan dari 1,21% ke 1,37%. Perhatikan juga tanggalnya: kedelapan laporan itu terbit Januari, hampir empat bulan sebelum hari ini. Kenapa mereka membeli, dan apa artinya untuk harga, tidak ada di dokumen mana pun. Salah-kaprah yang umum: membaca "orang dalam membeli" sebagai satu blok besar, tanpa melihat siapa, berapa, dan kapan laporannya terbit.

#### Draf B
Soal 1
Pesan dari Wulan (19.42): "Dividen Perusahaan U tuh tiap tahun keluar terus, dari dulu ga pernah bolos. Aman lah."
Pilihan: a) Betul, dividennya makin besar tiap tahun tanpa kecuali. | b) Keliru, ada tahun yang bolos tanpa pembagian dividen. | c) Betul, pembagiannya tercatat beruntun selama 7 tahun. | d) Keliru, yang tercatat cuma pembagian tahun ini saja.
Penjelasan: Kalau daftar aksi korporasinya dibuka, pembagian dividen tunai muncul tiap tahun tanpa ada tahun yang kosong, dan jumlahnya 7 tahun beruntun. Daftar yang sama juga memuat 7 pembagian dari yang paling lama sampai hari ini. Yang tidak terbaca di situ: nilainya tidak selalu naik, sebab ada tahun dengan Rp85 per lembar dan tahun sesudahnya Rp25 per lembar. Jadi soal rutinnya cocok, sedangkan yang bilang ada tahun bolos atau cuma sekali bagi tidak cocok. Salah-kaprah yang umum: orang menyamakan dividen yang rutin dengan dividen yang naik terus, padahal yang tercatat cuma soal rutinnya.

Soal 2
Pesan dari Sinta (20.31): "Orang dalam lain itu beli terus sepanjang Januari, malah lebih banyak dari pemilik terbesarnya. Gw sih udah cek laporannya."
Pilihan: a) Betul, dia nambah 16,07 juta lembar sepanjang Januari. | b) Keliru, yang nambah lebih banyak justru pemilik terbesarnya. | c) Betul, dia nambahnya cuma lewat 2 laporan. | d) Keliru, dia cuma menambah 1 juta lembar.
Penjelasan: Kalau laporan kepemilikan sahamnya dibuka, orang dalam lain muncul berkali-kali sepanjang Januari dan semuanya pembelian. Kalau ditotal, tambahannya 16,07 juta lembar yang tersebar di 6 laporan. Bandingkan dengan pemilik terbesar, yang cuma menambah 1 juta lembar lewat 2 laporan. Jadi yang bilang orang dalam lain menambah lebih banyak dari pemilik terbesar itu cocok. Yang tidak terbaca di situ: alasan mereka membeli, sebab laporannya cuma memuat transaksi dan jumlah lembar. Salah-kaprah yang umum: orang mengira pemilik terbesar selalu yang paling banyak menambah, padahal yang tercatat di Januari justru sebaliknya.

Soal 3
Pesan dari Fitri (21.15): "Katanya orang dalam Perusahaan U pada beli saham terus bulan Januari, ga ada yang jual. Aku ikut-ikutan percaya aja sih."
Pilihan: a) Betul, semuanya pembelian tanpa ada yang jual. | b) Keliru, ada juga laporan yang isinya penjualan. | c) Betul, yang beli cuma orang dalam lain. | d) Keliru, laporannya cuma dua laporan.
Penjelasan: Kalau daftar laporan kepemilikan dibuka, sepanjang Januari ada 8 laporan dan isinya pembelian semua, tidak ada satu pun yang penjualan. Yang lapor juga bukan cuma satu pihak: pemilik terbesar muncul 2 laporan dan orang dalam lain 6 laporan. Yang tidak terbaca di situ: alasan mereka membeli, sebab laporannya cuma memuat tanggal transaksi dan jumlah lembar. Jadi yang bilang ada laporan penjualan tidak cocok, begitu juga yang bilang yang beli cuma satu pihak atau laporannya cuma dua. Salah-kaprah yang umum: orang mengira laporan orang dalam selalu campur beli dan jual, padahal yang tercatat di Januari justru semuanya pembelian.
