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
Pesan dari Sinta (19.42): "Eh, saham Perusahaan T katanya dihentikan sementara hari ini gara-gara harganya naik 9 hari bursa berturut-turut. Bener nggak sih?"
Pilihan: a) Betul, bursa menghentikannya 10 Desember 2025 karena harga naik kumulatif | b) Keliru, penghentian itu karena keraguan atas kelangsungan usaha perseroan | c) Betul, penghentiannya ini menyusul rapat umum pemegang saham 25 September 2025 | d) Keliru, harganya justru turun 58 rupiah dalam sembilan hari bursa
Penjelasan: Pengumuman bursa 10 Desember 2025 menyebut perdagangan saham Perusahaan T dihentikan sementara hari itu, dengan alasan resmi kenaikan harga kumulatif yang signifikan, sebagai cooling down untuk melindungi investor. Kartu harga mencatat penutupan 9 Desember 2025, dan hitungan paket menyebut naik 9 hari bursa berturut-turut. Jadi omongan teman cocok dengan dokumennya. Salah-kaprah yang umum: orang mengira penghentian sementara selalu berarti ada masalah di perusahaan, padahal dokumen kali ini menyebut alasannya kenaikan harga.

Soal 2
Pesan dari Gilang (20.15): "Suspend 21 Januari 2025 itu alasannya sama dong kayak yang sekarang, gara-gara harga naik juga kan?"
Pilihan: a) Betul, alasan penghentian 21 Januari 2025 sama dengan yang sekarang | b) Keliru, penghentian 21 Januari 2025 karena keraguan kelangsungan usaha | c) Betul, yang 21 Januari 2025 itu juga karena harga naik kumulatif | d) Keliru, yang 21 Januari 2025 itu karena harganya turun tajam
Penjelasan: Pengumuman bursa 21 Januari 2025 menuliskan alasan resmi penghentian sementara waktu itu: bursa menilai ada keraguan atas kelangsungan usaha perseroan. Pengumuman 10 Desember 2025 menuliskan alasan yang berbeda, yaitu kenaikan harga kumulatif yang signifikan sebagai cooling down. Jadi alasan keduanya tidak sama, dan omongan teman tidak cocok dengan dokumennya. Salah-kaprah yang umum: karena dua-duanya berupa penghentian sementara, orang menyimpulkan alasannya pasti sama.

Soal 3
Pesan dari Nadia (21.07): "Volume hari ini katanya 1.461.200 lembar, rame banget berarti banyak yang masuk. Cek dong."
Pilihan: a) Betul, volume 1.461.200 lembar itu tercatat hari ini | b) Keliru, volume hari ini 0 lembar karena perdagangannya dihentikan | c) Betul, 1.461.200 lembar itu volume terakhir sebelum perdagangan dihentikan | d) Keliru, 1.461.200 lembar itu tercatat pada 10 Desember 2025
Penjelasan: Data perdagangan harian mencatat volume 0 lembar pada hari penghentian, sementara angka 1.461.200 lembar tercatat pada 9 Desember 2025, sehari sebelum perdagangannya dihentikan. Karena perdagangan sahamnya dihentikan sementara, tidak ada transaksi yang tercatat di hari penghentian. Salah-kaprah yang umum: angka ramai yang beredar di grup dianggap otomatis kejadian hari ini, padahal tanggalnya bisa berbeda.

#### Draf B
Soal 1
Pesan dari Nadia (19.47): "Gila gue panik, Perusahaan T udah naik 2,21 kali dari 26 November! Ini gara-gara ada yang ngeborong gede ya? Gue takut banget kejebak."
Pilihan: a) Betul, 2,21 kali itu dari penutupan dibanding penutupan, jadi naiknya nyata. | b) Betul, 2,21 kali itu dari harga pembukaan, jadi wajar panik. | c) Keliru, 2,21 kali itu jumlah lembar yang ditransaksikan, bukan harga. | d) Keliru, penutupan terakhir masih di bawah penutupan akhir November, jadi belum naik.
Penjelasan: Penutupan 26 November 2025 ada di Rp48 per lembar dan penutupan 9 Desember 2025 ada di Rp106 per lembar. Bandingkan dua-duanya, hasilnya 2,21 kali, jadi angka yang diteriakkan temanmu itu bukan karangan. Yang bikin orang salah kalau angka itu disangka datang dari harga pembukaan atau dari jumlah lembar yang diperdagangkan, karena dasarnya penutupan dibanding penutupan. Soal kenapa naik, yang tertulis cuma peningkatan harga kumulatif di pengumuman 10 Desember 2025, bukan soal ada yang ngeborong. Salah-kaprah yang umum: dengar angka naik besar langsung dicap hoaks, padahal cukup bandingkan dua penutupan yang tertulis.

Soal 2
Pesan dari Rizky (20.15): "Gue udah liat Perusahaan T naik terus dari 26 November sampai 9 Desember, nggak ada putusnya. Kalian telat nyadar aja, gue dari dulu pantau."
Pilihan: a) Betul, naiknya nggak putus karena tiap hari jumlah lembar yang ditransaksikan nambah. | b) Betul, tiap hari bursa penutupannya lebih tinggi dari hari sebelumnya, nggak putus. | c) Keliru, di rentang itu ada hari bursa yang penutupannya lebih rendah dari hari sebelumnya. | d) Keliru, yang naik beruntun cuma harga tertinggi harian, penutupannya diam aja.
Penjelasan: Kalau catatan harganya dibuka, penutupan 26 November 2025 ada di Rp48 per lembar dan penutupan 9 Desember 2025 ada di Rp106 per lembar. Yang bikin naiknya disebut beruntun ada di ringkasan sembilan hari bursa: tiap hari bursa penutupannya lebih tinggi dari hari sebelumnya, jadi memang nggak ada hari yang turun. Alasan soal jumlah lembar yang ditransaksikan makin nambah itu nggak ada catatannya, jadi nggak bisa dipakai. Salah-kaprah yang umum: dengar naik beruntun panjang langsung dikira mustahil dan dicap hoaks, padahal cukup lihat catatan penutupan hariannya.

Soal 3
Pesan dari Santi (21.08): "Perusahaan T disetop lagi hari ini, terus yang 21 Januari dulu juga. Itu dulu gara-gara harganya naik juga kan? Gue ragu sih, kayaknya gitu."
Pilihan: a) Betul, setop awal tahun juga karena kenaikan harga kumulatif, sama seperti setop hari ini. | b) Betul, setop awal tahun karena harganya naik beruntun, jadi sama saja dengan yang sekarang. | c) Keliru, setop awal tahun karena bursa ragu usaha bakal lanjut, bukan soal harga. | d) Keliru, setop awal tahun karena sahamnya nggak ada yang beli, bukan soal harga.
Penjelasan: Setop yang 21 Januari 2025 alasannya beda dari setop hari ini. Waktu itu bursa menulis ragu soal kelanjutan usaha perusahaannya, sedangkan yang sekarang pemicunya kenaikan harga kumulatif, terbaca di pengumuman 10 Desember 2025. Jadi kalau anggapannya dua setop itu sama-sama gara-gara harga, itu nggak cocok dengan tulisan bursa sendiri. Lamanya setop juga nggak ada di dokumen, jadi nggak bisa dipastikan. Salah-kaprah yang umum: orang mengira semua setop bursa pemicunya sama, padahal yang awal tahun ragu soal kelanjutan usaha, yang sekarang soal harga.

#### Draf C
Soal 1
Pesan dari Sari (17.20): "Gue baca data harian. Harga cuma naik 2,21 persen dari 48 ke 106. Jadi setopnya kayak nggak masuk akal."
Pilihan: a) Betul, kenaikannya memang cuma 2,21 persen dari 48. | b) Keliru, sebab 106 itu 2,21 kali 48, bukan persen. | c) Betul, sebab setopnya memang cuma karena harga naik. | d) Keliru, sebab setopnya karena keraguan atas kelangsungan usaha.
Penjelasan: Harga penutupan 26 November 2025 tercatat 48 rupiah per lembar, lalu pada 9 Desember 2025 menjadi 106 rupiah per lembar. Angka terakhir itu 2,21 kali angka pertama, bukan persentase. Selisih harganya 58 rupiah per lembar. Bursa menyetop perdagangan pada 10 Desember 2025 dengan alasan resmi peningkatan harga kumulatif yang signifikan. Salah-kaprah yang umum: orang menyamakan kali dengan persen, padahal keduanya beda jauh.

Soal 2
Pesan dari Gilang (19.15): "Gue cek data harian, saham ini naiknya pelan banget, sehari cuma naik dikit-dikit. Nggak heran lama-lama disetop juga."
Pilihan: a) Betul, naiknya memang pelan tapi beruntun, dan itu yang bikin disetop. | b) Keliru, naiknya cuma sehari lalu langsung disetop bursa. | c) Betul, setopnya karena naiknya pelan tapi jalan terus tanpa henti. | d) Keliru, setopnya karena keraguan atas kelangsungan usaha perseroan.
Penjelasan: Harga penutupan 26 November 2025 tercatat 48 rupiah per lembar, lalu pada 9 Desember 2025 menjadi 106 rupiah per lembar. Kenaikannya memang bertahap, 9 hari bursa berturut-turut, tiap hari lebih tinggi dari hari sebelumnya. Bursa menyetop perdagangan pada 10 Desember 2025 dengan alasan resmi peningkatan harga kumulatif yang signifikan, sebagai cooling down untuk melindungi investor. Jadi yang dibilang teman cocok dengan dokumennya. Salah-kaprah yang umum: orang mengira penghentian perdagangan selalu karena harga jatuh, padahal bisa juga karena harga naik terus.

## Kelompok 2

#### Draf A
Soal 1
Pesan dari Nadia (19.42): "Harga Perusahaan D sekarang Rp178, dari Rp8 awal Agustus. Berarti udah 22,25 kali lipat dong?"
Pilihan: a) Betul, 22,25 kali harga penutupan awal Agustus. | b) Betul, kenaikannya karena dividen Rp0,14 per lembar. | c) Keliru, kenaikannya cuma 1,25 kali harga awal. | d) Keliru, Rp178 cuma 2 kali harga awal.
Penjelasan: Kartu data harga harian bursa memuat penutupan 1 Agustus 2025 dan 8 Oktober 2025. Kartu hitungan 22,25 kali membandingkan dua angka itu, jadi bilangan di omongan sama dengan yang tertulis di dokumen. Salah-kaprah yang umum: mengira lonjakan harga selalu ada penjelasannya di dokumen harga, padahal kartu itu hanya memuat angka penutupan.

Soal 2
Pesan dari Fajar (20.15): "Pemilik terbesar katanya udah lepas 500 juta lembar di transaksi 12 Agustus 2025. Bener nggak?"
Pilihan: a) Betul, jumlahnya memang 500 juta lembar sesuai kabar itu. | b) Keliru, total penjualannya 299,5 juta lembar. | c) Betul, penjualannya tercatat di 179,5 juta lembar. | d) Keliru, penjualannya cuma 70 juta lembar di satu laporan.
Penjelasan: Tiga laporan kepemilikan yang diumumkan ke publik memuat penjualan pemilik terbesar: 70 juta lembar, 179,5 juta lembar, dan 50 juta lembar. Kartu hitungan 299,5 juta lembar menjumlahkan ketiganya, jadi bilangan di omongan tidak ada di dokumen mana pun. Salah-kaprah yang umum: menjumlahkan sendiri angka dari beberapa laporan lalu membulatkannya ke atas.

Soal 3
Pesan dari Sinta (21.07): "Perusahaan D bagi dividen tunai Rp0,14 per lembar, ex date 16 September 2025. Yang punya 10 lot dapat Rp140."
Pilihan: a) Keliru, dividen tunainya cuma Rp1,40 per lembar, bukan segitu. | b) Keliru, Rp140 itu untuk pemilik 100 lot saham. | c) Betul, Rp0,14 per lembar, Rp140 sepuluh lot. | d) Betul, tanggal ex dividennya jatuh 4 September 2025.
Penjelasan: Kartu aksi korporasi mencatat dividen tunai Rp0,14 per lembar dengan tanggal ex 16 September 2025. Kartu hitungan Rp140 menunjukkan hasil untuk pemilik sepuluh lot, jadi keduanya cocok dengan omongan. Salah-kaprah yang umum: mengira Rp140 itu dividen tiap lembar, padahal itu total untuk sepuluh lot.

#### Draf B
Soal 1
Pesan dari Bayu (19.38): "Saham D naik 22 kali! Pasti mau dibeli investor asing, bursa udah umumin."
Pilihan: a) Betul, pengumuman bursanya soal investor asing. | b) Keliru, pengumumannya soal laporan keuangan telat. | c) Betul, pengumuman itu yang bikin harganya naik 22 kali. | d) Keliru, pengumumannya soal harga yang naik terlalu cepat.
Penjelasan: Bursa memang pernah mengumumkan sesuatu, tetapi isinya lain dari yang dikira Bayu: jual-beli disetop karena laporan keuangan tahunan belum diserahkan. Tidak ada kata "investor asing" di kartu mana pun. Kartu harga hanya memberi tahu bahwa harganya naik 22 kali, bukan kenapa. Salah-kaprah yang umum: menganggap harga yang naik sebagai semacam pengumuman, lalu mencocokkannya dengan kabar yang sedang ramai.

Soal 2
Pesan dari Dimas (19.42): "Gue pegang 10 lot dari Juli. Dividennya receh banget, buat bayar parkir motor aja kurang. Harga setinggi ini jelas bukan karena dividennya."
Pilihan: a) Betul, ia kebagian dividen dan jumlahnya cuma Rp140. | b) Betul, malah ia tidak kebagian karena tanggal ex-nya. | c) Keliru, ia kebagian Rp14.000 untuk 10 lot miliknya. | d) Keliru, Rp140 itu sudah besar dibanding nilai sahamnya.
Penjelasan: Kartu kedua sudah menghitungnya: 1.000 lembar × Rp0,14 = Rp140, untuk saham yang nilainya Rp178.000 — kurang dari seperseribu nilainya. Dimas betul, dan karena ia sudah pegang sejak sebelum tanggal ex, ia memang kebagian. Dividen adalah bagian laba yang benar-benar sampai ke pemilik saham; angka ini memperlihatkan bahwa harga Rp178 tidak ditopang pembagian laba. Salah-kaprah yang umum: menghitung dividen per lot, padahal dividen dihitung per lembar; dan mengira tanggal ex menggugurkan hak orang yang sudah lama pegang, padahal yang tidak kebagian hanya pembeli sesudah tanggal itu.

Soal 3
Pesan dari Rara (19.47): "Harganya udah Rp178 lho. Pemilik terbesarnya aja tenang-tenang, nggak kedengeran jual. Berarti dia yakin harganya masih bakal naik."
Pilihan: a) Betul, laporannya menunjukkan ia membeli lagi di harga belasan rupiah. | b) Betul, laporannya menunjukkan ia membeli lagi di harga ratusan rupiah. | c) Keliru, laporannya menunjukkan ia menjual banyak di harga belasan rupiah. | d) Keliru, laporannya menunjukkan ia menjual banyak di harga ratusan rupiah.
Penjelasan: Ketiga kartu laporan itu penjualan, bukan pembelian: 70 juta, 179,5 juta, dan 50 juta lembar — seluruhnya 299,5 juta lembar, semuanya di harga Rp13 sampai Rp15, jauh di bawah harga hari ini. Perhatikan juga tanggalnya: transaksinya terjadi 12 Agustus sampai 14 Agustus, tetapi publik baru bisa membacanya pada 25 Agustus dan 1 September, ketika laporannya terbit. Pemilik besar berhak menjual; yang perlu dibaca calon pembeli adalah siapa yang ada di sisi jual. Salah-kaprah yang umum: menganggap "nggak kedengeran jual" sama dengan "tidak menjual".

#### Draf C
Soal 1
Pesan dari Sinta (18.05): "Gue baca pemilik terbesar jual 70.000.000 lembar, terus 179.500.000 lembar, terus 50.000.000 lembar. Habis itu dia masih pegang 58,7 persen. Berarti dia masih mayoritas dong."
Pilihan: a) Betul, setelah rangkaian penjualan, pemilik terbesar masih pegang 58,7 persen saham. | b) Keliru, penjualan 179.500.000 lembar bikin dia tak lagi mayoritas. | c) Betul, penjualan terakhir 50.000.000 lembar adalah yang terbesar dari tiga laporan. | d) Keliru, yang terakhir tercatat 59,375 persen, bukan angka yang disebut.
Penjelasan: Urutan laporannya begini: pemilik terbesar melepas 70.000.000 lembar pada 12 Agustus 2025, lalu 179.500.000 lembar pada 13 Agustus 2025, dan 50.000.000 lembar pada 14 Agustus 2025. Setelah rangkaian itu, catatan terakhir menunjukkan kepemilikannya masih 58,7 persen. Jadi meski jumlah lembar yang dilepas terlihat besar, porsi kepemilikannya masih di atas separuh. Angka 59,375 persen yang mungkin kamu lihat adalah posisi setelah transaksi 13 Agustus 2025, sebelum penjualan 14 Agustus 2025. Salah-kaprah yang umum: jumlah lembar yang dijual dikira langsung menentukan porsi kepemilikan, padahal yang menentukan persentase adalah sisa lembar dibagi total saham, dan di catatan terakhir angkanya 58,7 persen.

#### Draf D
Soal 1
Pesan dari Wawan (20.15): "Gue panik nih, pemilik terbesar katanya udah lepas 299,5 juta lembar saham. Tapi laporannya nggak lolos pemeriksaan, jadi angkanya belum tentu bener."
Pilihan: a) Betul, laporannya nggak lolos pemeriksaan, jadi angkanya nggak bisa dipercaya. | b) Keliru, laporannya lolos pemeriksaan, jumlahnya 3 laporan. | c) Betul, laporannya nggak lolos pemeriksaan, cuma kabar di grup doang. | d) Keliru, laporannya lolos pemeriksaan, tapi cuma satu laporan.
Penjelasan: Temanmu bilang laporan penjualan pemilik terbesar nggak lolos pemeriksaan. Yang ada di laporan kepemilikan saham yang diumumkan ke publik justru sebaliknya: penjualan yang lolos seluruh pemeriksaan tercatat 3 laporan, dengan total 299,5 juta lembar. Laporan terakhir juga menunjukkan kepemilikan pemilik terbesar masih 58,7 persen. Jadi klaim laporannya nggak lolos pemeriksaan nggak cocok dengan catatannya. Salah-kaprah yang umum: orang dengar kabar penjualan dari grup lalu menganggap laporannya nggak resmi, padahal laporannya diumumkan ke publik dan lolos pemeriksaan.

Soal 2
Pesan dari Ika (21.05): "Gue ragu nih, saham ini kan disetop bursa 30 Juni gara-gara laporan keuangan auditan tahunan belum diserahkan. Katanya cuma sampai 5 Juli doang, terus udah dibuka lagi, bener nggak sih?"
Pilihan: a) Betul, penghentiannya sudah dicabut dan sahamnya diperdagangkan lagi. | b) Keliru, tanggal pencabutan penghentiannya nggak ada di catatan. | c) Betul, penghentiannya dicabut begitu laporan keuangannya masuk. | d) Keliru, penghentiannya masih jalan sampai 8 Oktober 2025.
Penjelasan: Catatan bursa bilang perdagangan dihentikan sementara mulai 30 Juni 2025 karena laporan keuangan auditan tahunan belum diserahkan. Yang bikin klaim temanmu meleset: catatan yang sama juga menyebut tanggal pencabutannya nggak ada di data, jadi lama penghentiannya nggak bisa dipastikan. Di data harga harian memang ada penutupan 8 Oktober 2025, jadi sahamnya sudah diperdagangkan lagi di suatu waktu. Tapi itu nggak menunjukkan kapan persisnya penghentiannya dicabut, apalagi membenarkan tanggal yang disebut temanmu. Salah-kaprah yang umum: orang melihat sahamnya sudah jalan lagi sekarang lalu menganggap penghentiannya cuma sebentar dan tanggalnya pasti tercatat, padahal tanggal pencabutannya tidak ada di catatan.

## Kelompok 3

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
Pesan dari Wulan (18.35): "Gila, orang dalam Perusahaan U ada 8 laporan sepanjang Januari, dan ada yang isinya jual. Ini pasti ada yang disembunyiin, gue panik nih."
Pilihan: a) Betul, ada juga laporan yang isinya pengurangan saham. | b) Keliru, semua laporan itu isinya penambahan saham. | c) Betul, laporan itu terbitnya cuma dari pemilik terbesar. | d) Keliru, laporan itu terbitnya bukan cuma dari pemilik terbesar.
Penjelasan: Kalau kamu buka daftar laporan kepemilikan yang terbit Januari, isinya seragam: semuanya penambahan saham, nggak ada satu pun yang pengurangan. Jumlahnya sudah dirapikan jadi 8 laporan, dan yang mengirim bukan cuma satu pihak, pemilik terbesar lewat 2 laporan dan orang dalam lain lewat 6 laporan. Jadi kabar soal ada laporan yang isinya jual itu nggak ketemu di catatannya. Salah-kaprah yang umum: orang dengar kabar orang dalam jual langsung panik, padahal yang bisa dibaca cuma isi laporannya, dan di sini semuanya beli.

Soal 2
Pesan dari Fajar (19.50): "Gue denger katanya kalau lagi bagi dividen, harga jatuh sebanyak dividennya. Di Perusahaan U kayaknya pas banget deh, nggak ada selisihnya. Bener nggak sih? Gue ragu nih."
Pilihan: a) Betul, jatuhnya hari ini persis sebanyak dividen tunai yang dibagikan. | b) Keliru, jatuhnya hari ini lebih dalam dari dividen tunai yang dibagikan. | c) Betul, jatuhnya hari ini lebih dangkal dari dividen tunai yang dibagikan. | d) Keliru, harganya hari ini nggak jatuh sama sekali dari penutupan terakhir.
Penjelasan: Kalau kamu buka catatan harga, penutupan terakhir sebelum tanggal ex ada di Rp1.690 per lembar. Selisih dengan harga buka hari ini sudah dirapikan jadi Rp145 per lembar, sementara dividen tunai hari ini Rp130 per lembar. Dari situ kelihatan masih ada beda Rp15 per lembar, jadi jatuhnya nggak pas sama dividennya. Kabar bahwa jatuhnya persis sebanyak dividen itu nggak ketemu di catatannya. Salah-kaprah yang umum: orang mengira harga di tanggal ex selalu turun persis sebanyak dividennya, padahal catatannya bisa beda.

Soal 3
Pesan dari Sinta (21.40): "Katanya kalau lagi bagi dividen harga turun sebanyak dividennya, tapi di Perusahaan U hari ini kok jatuhnya nggak sama ya? Gue ragu nih, takut salah baca."
Pilihan: a) Betul, turunnya hari ini lebih besar dari dividen tunai yang dibagikan. | b) Betul, turunnya hari ini lebih kecil dari dividen tunai yang dibagikan. | c) Keliru, turunnya hari ini persis sama dengan dividen tunai yang dibagikan. | d) Keliru, harga bukanya tidak jatuh dari penutupan terakhir.
Penjelasan: Penutupan terakhir sebelum tanggal ex tercatat Rp1.690 per lembar, dan harga buka hari ini Rp1.545 per lembar. Selisih keduanya sudah dihitung jadi Rp145 per lembar, sedangkan dividen tunai yang dibagikan hari ini Rp130 per lembar. Dua angka itu memang nggak sama, jadi kabar bahwa jatuhnya nggak sama kayak dividen cocok dengan catatannya. Salah-kaprah yang umum: orang mengira harga di tanggal ex selalu turun persis sama banyak dengan dividennya, padahal catatannya menunjukkan angka yang beda.

#### Draf C
Soal 1
Pesan dari Sinta (20.14): "Eh, Perusahaan U hari ini tanggal ex dividen tunai kan? Katanya Rp130 per lembar."
Pilihan: a) Keliru, dividen tunai Rp45 per lembar dan tanggal ex-nya hari ini. | b) Betul, dividen tunai Rp130 per lembar dan tanggal ex-nya hari ini. | c) Betul, dividen tunai Rp130 per lembar dan tanggal ex-nya 15 Mei 2025. | d) Keliru, dividen tunai Rp130 per lembar dan tanggal ex-nya belum ditetapkan.
Penjelasan: Kartu daftar aksi korporasi 4 Mei 2026 mencatat dividen tunai Rp130 per lembar dengan tanggal ex 4 Mei 2026, jadi omongan soal tanggal ex hari ini dan besarannya cocok dengan dokumen. Kartu daftar aksi korporasi menegaskan pembagian ini memang tercatat di daftar. Salah-kaprah yang umum: menyamakan angka selisih harga pagi dengan besaran dividen, padahal besaran dividen dibaca dari daftar aksi korporasi.

Soal 2
Pesan dari Gilang (21.07): "Harga Perusahaan U tadi buka di Rp1.545, turun Rp145 dari penutupan terakhir sebelum ex."
Pilihan: a) Keliru, buka Rp1.545 dan selisihnya Rp15 dari penutupan sebelumnya. | b) Betul, buka Rp1.595 dan selisihnya Rp145 dari penutupan sebelumnya. | c) Betul, buka Rp1.545 dan selisihnya Rp145 dari penutupan sebelumnya. | d) Keliru, buka Rp1.545 dan selisihnya Rp130 dari penutupan sebelumnya.
Penjelasan: Kartu data harga harian bursa mencatat penutupan terakhir sebelum tanggal ex di Rp1.690 per lembar, dan kartu data harga harian bursa mencatat pembukaan hari ini di Rp1.545 per lembar. Selisihnya sudah dihitung di paket, yaitu Rp145 per lembar. Jadi omongan soal buka di Rp1.545 dan turun Rp145 cocok dengan kartu. Salah-kaprah yang umum: mengira selisih harga pagi harus sama persis dengan dividen per lembar, padahal keduanya dua angka yang berbeda.

Soal 3
Pesan dari Wulan (22.35): "Katanya orang dalam lain nambah 10 juta lembar saham Perusahaan U bulan Januari."
Pilihan: a) Keliru, orang dalam lain menambah 16,07 juta lembar di Januari. | b) Betul, orang dalam lain menambah 10 juta lembar lewat 6 laporan. | c) Keliru, orang dalam lain menambah 1 juta lembar lewat 6 laporan. | d) Betul, orang dalam lain menambah 16,07 juta lembar lewat 8 laporan.
Penjelasan: Kartu hitungan dari laporan Januari menunjukkan orang dalam lain menambah 16,07 juta lembar lewat 6 laporan sepanjang Januari. Kartu laporan kepemilikan saham mencatat pembelian terakhirnya. Angka yang disebut di obrolan tidak cocok dengan kartu mana pun. Salah-kaprah yang umum: mengira jumlah lembar yang ditambahkan sama dengan jumlah laporan yang terbit, padahal keduanya dua hal berbeda.
