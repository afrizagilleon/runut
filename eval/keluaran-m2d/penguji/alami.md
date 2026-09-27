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
Pesan dari Fajar (19.12): "Woi cek dong, saham Perusahaan D katanya dari Rp8 per lembar tanggal 1 Agustus 2025 tembus Rp178 per lembar tanggal 8 Oktober 2025? Serius itu?"
Pilihan: a) Betul, harga penutupannya memang naik dari Rp8 jadi Rp178 sesuai data harga bursa. | b) Keliru, data harga bursa tidak menunjukkan kenaikan seperti itu pada periode ini. | c) Betul, tapi angka itu bukan data resmi karena bursa belum menerbitkan datanya. | d) Keliru, yang melonjak bukan harga melainkan volume perdagangan hari ini saja.
Penjelasan: Kartu data harga harian bursa menulis penutupan 1 Agustus 2025 sebesar Rp8 per lembar, lalu penutupan 8 Oktober 2025 sebesar Rp178 per lembar. Kartu hitungan menyebut harga akhirnya 22,25 kali harga awalnya. Jadi omongan soal harga itu cocok dengan dokumennya. Salah-kaprah yang umum: mengira harga yang melonjak pasti kabar bohong, padahal langkah pertama hanya mencocokkan angkanya dengan data harga harian bursa sebelum percaya atau menolak.

Soal 2
Pesan dari Nadia (20.47): "Gila, katanya pemilik terbesar Perusahaan D udah buang 500 juta lembar sahamnya. Kata orang dalam beneran segitu, gimana ceknya?"
Pilihan: a) Betul, laporan kepemilikan memang mencatat penjualan sebesar itu dari pemilik terbesar. | b) Keliru, laporan yang tercatat totalnya 299,5 juta lembar, bukan 500 juta lembar. | c) Betul, karena pemilik terbesar memang boleh menjual kapan saja tanpa laporan. | d) Keliru, pemilik terbesar tidak menjual satu lembar pun menurut laporan publik.
Penjelasan: Kartu laporan kepemilikan mencatat penjualan pemilik terbesar 70 juta lembar, lalu 179,5 juta lembar, lalu 50 juta lembar. Kartu hitungannya merangkum total 299,5 juta lembar dari 3 laporan yang lolos pemeriksaan. Angka yang dikabarkan jauh lebih besar daripada yang tercatat. Salah-kaprah yang umum: langsung percaya angka dari orang dalam, padahal laporan kepemilikan yang diumumkan ke publik bisa dibaca sendiri untuk mencocokkan jumlahnya.

Soal 3
Pesan dari Iqbal (21.05): "Katanya dividen Perusahaan D gede banget, punya 10 lot dapat Rp140 ribu. Bener nggak sih kabarnya?"
Pilihan: a) Betul, dividen tunai memang dibagikan sebesar itu untuk pemegang 10 lot. | b) Keliru, soalnya 10 lot itu 100 lembar, bukan 1.000 lembar. | c) Betul, laporan korporasi memang mencatat pembayaran dividen sebesar itu. | d) Keliru, hitungannya 1.000 lembar × Rp0,14 = Rp140 sebelum pajak.
Penjelasan: Kartu aksi korporasi menulis dividen tunai Rp0,14 per lembar dengan tanggal ex 16 September 2025. Kartu hitungannya mengandaikan pemegang 10 lot yaitu 1.000 lembar menerima Rp140 sebelum pajak. Jadi kabar itu tidak sesuai dokumen. Salah-kaprah yang umum: menganggap angka dividen yang beredar pasti benar, padahal bisa dicocokkan dulu ke dokumen aksi korporasi dan kartu hitungannya.

#### Draf B
Soal 1
Pesan dari Dika (16.45): "Woy, saham Perusahaan D itu aneh banget. Dari Rp8 awal Agustus jadi Rp178 sekarang. Kata grup sebelah naiknya udah 22,25 kali lipat. Bener ya?"
Pilihan: a) Betul, dibandingkan dari harga awal Agustus, kenaikannya 22,25 kali. | b) Keliru, angka segitu hanya rumor, bursa tidak mencatat kenaikan harga. | c) Betul, wajar karena perusahaan baru membagikan dividen tunai. | d) Keliru, kenaikan itu terjadi bertahun-tahun, bukan dalam dua bulan.
Penjelasan: Kartu harga harian bursa mencatat penutupan Rp8 pada 1 Agustus 2025 dan Rp178 pada 8 Oktober 2025. Kartu hitungan 22,25 kali membandingkan kedua harga penutupan itu, jadi omongan ini cocok dengan dokumen. Kartu dividen hanya mencatat Rp0,14 per lembar dan tidak menyebut hubungannya dengan harga. Salah-kaprah yang umum: menganggap harga yang naik cepat pasti didorong dividen, padahal dokumen harga dan dokumen dividen memuat hal yang berbeda.

Soal 2
Pesan dari Sari (19.20): "Aku baru denger dari grup sebelah, katanya pemilik terbesar Perusahaan D jual 350 juta lembar. Bener nggak sih angkanya? Ada yang sempet lihat laporannya?"
Pilihan: a) Betul, tiga laporan penjualan pemilik terbesar memang tercatat di bursa. | b) Keliru, total yang tercatat di laporan resmi hanya 299,5 juta lembar. | c) Betul, angka itu persis seperti yang diumumkan pemilik terbesar. | d) Keliru, pemilik terbesar justru menambah kepemilikan, bukan menjual.
Penjelasan: Kartu laporan kepemilikan yang diumumkan ke publik mencatat penjualan 70 juta lembar, 179,5 juta lembar, dan 50 juta lembar oleh pemilik terbesar. Kartu hitungan 299,5 juta lembar menjumlahkan ketiganya, dan hasilnya lebih kecil dari angka yang disebut di omongan. Salah-kaprah yang umum: memercayai angka dari obrolan tanpa menunggu laporan resmi, padahal penjualan pemegang saham besar selalu ada laporan kepemilikannya yang bisa dicek.

Soal 3
Pesan dari Tomi (21.10): "Eh, saham Perusahaan D itu sempet dihentikan sementara kan? Katanya sih karena harganya naiknya kebanyakan. Bener gitu alasannya?"
Pilihan: a) Betul, bursa memang menghentikan saham yang harganya naik cepat. | b) Keliru, saham ini tidak pernah dihentikan sementara sama sekali. | c) Keliru, alasan resminya laporan keuangan auditan tahunan belum disampaikan. | d) Betul, katanya terkait dividen tunai yang baru dibagikan.
Penjelasan: Kartu pengumuman bursa mencatat perdagangan saham dihentikan sementara pada 30 Juni 2025 dengan alasan resmi belum menyampaikan laporan keuangan auditan tahunan. Kartu hitungan memang menunjukkan harga naik 22,25 kali, tapi itu data pergerakan harga, bukan alasan penghentian yang tertulis di dokumen. Salah-kaprah yang umum: mengira bursa menghentikan perdagangan karena harganya naik, padahal alasan resminya selalu tertulis di pengumuman penghentian.

#### Draf C
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

#### Draf D
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
Pesan dari Fajar (19.05): "Guys, hari ini saham Perusahaan U ex dividen tunai Rp130 per lembar kan? Berarti yang beli hari ini nggak dapat dividen dong?"
Pilihan: a) Betul, hari ini tanggal ex, beli hari ini tidak ikut dividen itu | b) Keliru, tanggal ex itu besok, beli hari ini masih ikut dividen | c) Betul, dividen tunai itu hanya untuk pemilik terbesar saja | d) Keliru, ex dividen artinya harga saham pasti langsung naik hari ini
Penjelasan: Kartu daftar aksi korporasi menulis dividen tunai dengan tanggal ex 4 Mei 2026, Rp130 per lembar. Tanggal ex artinya sejak tanggal itu pembeli baru tidak lagi tercatat untuk menerima dividen tersebut. Rekap aksi korporasinya juga mencatat 7 pembagian sejak 2020. Jadi omongan soal tanggal ex dan akibatnya sudah sesuai kartu. Salah-kaprah yang umum: mengira beli di tanggal ex masih dapat dividen, padahal yang berhak adalah yang sudah memegang saham sebelum tanggal ex.

Soal 2
Pesan dari Nadia (20.14): "Gila, katanya orang dalam Perusahaan U jual 70 juta lembar sepanjang Januari. Kok bisa sebesar itu?"
Pilihan: a) Betul, laporan Januari memang mencatat penjualan orang dalam | b) Keliru, laporan Januari itu seluruhnya pembelian, bukan jualan | c) Betul, orang dalam memang bebas jual kapan saja tanpa laporan | d) Keliru, yang beli hanya pemilik terbesar, orang dalam lain jual
Penjelasan: Rekap laporan kepemilikan orang dalam Januari menulis 8 laporan, seluruhnya pembelian. Jumlah lembar yang ditambahkan kedua orang dalam tercatat 17.069.900 lembar, dan salah satu laporannya beli 6.338.600 lembar. Jadi yang terjadi adalah pembelian, bukan penjualan, dan jumlahnya jauh dari yang dikatakan. Salah-kaprah yang umum: mengira laporan orang dalam selalu soal jual saham, padahal pembelian mereka juga wajib diumumkan ke publik.

Soal 3
Pesan dari Gilang (21.37): "Saham Perusahaan U turun pagi tadi, katanya turunnya persis sebesar dividen per lembar karena hari ini ex dividen. Bener gitu?"
Pilihan: a) Betul, penurunan hari ini memang sama persis dengan dividen per lembar | b) Betul, harga memang selalu turun sebesar dividen di tanggal ex | c) Keliru, penurunan hari ini lebih besar dari dividen per lembar | d) Keliru, harga penutupan hari ini malah lebih tinggi dari kemarin
Penjelasan: Kartu hitungan menulis jarak antara penutupan sebelum tanggal ex dan pembukaan hari ini turun Rp145, sedangkan dividen per lembar Rp130 per lembar. Kartu hitungan lain mencatat selisih keduanya lebih Rp15. Jadi penurunannya memang dekat dengan dividen, tapi tidak sama persis. Salah-kaprah yang umum: mengira harga turun persis sebesar dividen di tanggal ex, padahal jaraknya bisa lebih besar atau lebih kecil.

#### Draf C
Soal 1
Pesan dari Aji (16.20): "Eh, hari ini ex dividen tunai Perusahaan U. Katanya harga buka turun persis sebesar dividenya, Rp130 per lembar. Jadi pemegang saham gak rugi apa-apa dong."
Pilihan: a) Betul, ex dividen hari ini Rp130, wajar harga buka turun sebesar itu. | b) Keliru, harga buka turun Rp145 per lembar, lebih besar dari dividenya. | c) Betul, pembukaan hari ini Rp1.545, turun pas sebesar dividen tunai. | d) Keliru, dividen dibayar dari kas perusahaan, bukan dipotong dari harga saham di bursa.
Penjelasan: Kartu hitungan mencatat jarak dari penutupan terakhir sebelum tanggal ex ke pembukaan hari ini: Rp145 per lembar. Padahal dividen hari ini Rp130 per lembar, dan kartu hitungan lain mencatat selisihnya Rp15 per lembar. Jadi harga buka memang lebih rendah, tapi turunnya lebih besar dari dividen, bukan persis sebesar dividen. Salah-kaprah yang umum: mengira di tanggal ex dividen harga pasti terpotong persis sebesar dividen, padahal harga tetap ditentukan oleh transaksi pembeli dan penjual di pasar.

Soal 2
Pesan dari Sari (19.05): "Btw sepanjang Januari orang dalam Perusahaan U pada beli saham sendiri lho. Ada 8 laporan kepemilikan, semuanya pembelian, gak ada satu pun yang jual."
Pilihan: a) Betul, ada 8 laporan orang dalam sepanjang Januari dan semuanya pembelian. | b) Keliru, yang melapor hanya pemilik terbesar; orang dalam lain tidak melapor di Januari. | c) Betul, orang dalam memang membeli, tetapi setengah laporannya adalah penjualan. | d) Keliru, tidak ada laporan kepemilikan orang dalam yang terbit pada bulan Januari.
Penjelasan: Kartu hitungan mencatat 8 laporan kepemilikan orang dalam yang terbit Januari, dan seluruhnya pembelian, tanpa satu pun penjualan. Contohnya kartu pembelian 700.000 lembar oleh pemilik terbesar dan kartu pembelian 6.338.600 lembar oleh orang dalam lain. Jadi omongan Sari cocok dengan dokumen. Salah-kaprah yang umum: mengira laporan orang dalam pasti campuran beli dan jual, padahal dalam satu bulan bisa saja seluruh laporannya pembelian.

Soal 3
Pesan dari Wulan (21.40): "Aneh, katanya Perusahaan U rajin bagi dividen. Tahun lalu cuma Rp25 per lembar, sekarang tiba-tiba Rp130. Kok bisa lompat segitu sih?"
Pilihan: a) Betul, dividen naik dari Rp25 ke Rp130 dalam satu tahun terakhir. | b) Betul, tahun ini dividen Rp130 dan tahun lalu memang Rp25. | c) Keliru, ini pembagian dividen tunai pertama sejak perusahaan tercatat di bursa. | d) Keliru, dividen tahun lalu Rp45 per lembar, bukan Rp25.
Penjelasan: Kartu dividen mencatat pembagian tahun lalu dengan tanggal ex 15 Mei 2025 senilai Rp45 per lembar. Angka Rp25 per lembar justru tercatat pada pembagian dengan tanggal ex 4 Agustus 2022. Dividen tahun ini memang Rp130 per lembar, dan daftar aksi korporasi mencatat 7 pembagian dividen tunai. Jadi klaim Wulan soal dividen tahun lalu tidak cocok dengan dokumen. Salah-kaprah yang umum: mengira angka dividen tahun lalu bisa diingat seadanya, padahal perlu dicek ke daftar aksi korporasi.

#### Draf D
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

## Kelompok 3

#### Draf A
Soal 1
Pesan dari Andra (19.05): "Woi, saham Perusahaan T dihentikan sementara bursa hari ini. Katanya karena harganya naik terus 9 hari bursa berturut-turut, jadi dicooling down buat lindungi investor. Bener nggak sih?"
Pilihan: a) Betul, bursa umumkan cooling down karena harga naik signifikan. | b) Keliru, penghentiannya karena keraguan atas kelangsungan usaha perseroan. | c) Betul, penghentiannya karena volume perdagangan yang nol. | d) Keliru, bursa tidak akan menghentikan saham hanya karena harga.
Penjelasan: Pengumuman bursa yang terbit hari ini memang menyatakan perdagangan saham Perusahaan T dihentikan sementara, dengan alasan peningkatan harga kumulatif yang signifikan dalam rangka cooling down sebagai perlindungan investor penghentian 10 Desember 2025. Data harganya juga cocok: harga penutupan naik dari Rp48 menjadi Rp106, dan hitungannya tercatat naik 9 hari bursa berturut-turut. Jadi omongan ini sesuai dokumennya. Salah-kaprah yang umum: mengira penghentian sementara selalu tanda perusahaan bermasalah, padahal kali ini alasannya justru gerakan harga yang terlalu cepat.

Soal 2
Pesan dari Sinta (20.14): "Heh, Perusahaan T disuspend lagi ya? Pasti karena bursa ragu kelangsungan usahanya, kayak peristiwa 21 Januari lalu. Perusahaan ini mah emang bermasalah dari dulu."
Pilihan: a) Betul, penghentian hari ini memang karena keraguan kelangsungan usaha. | b) Keliru, alasan hari ini kenaikan harga yang signifikan. | c) Betul, saham yang pernah dihentikan pasti kelangsungan usahanya diragukan. | d) Keliru, penghentian hari ini karena perusahaan gagal bayar utang.
Penjelasan: Ada dua pengumuman penghentian yang berbeda. Yang terbit 21 Januari 2025 alasannya memang keraguan atas kelangsungan usaha perseroan. Tapi penghentian yang terbit 10 Desember 2025 alasannya peningkatan harga kumulatif yang signifikan, untuk cooling down dan melindungi investor. Jadi menyambungkan penghentian hari ini dengan keraguan kelangsungan usaha itu keliru; alasan lama dipakai untuk peristiwa baru. Salah-kaprah yang umum: menganggap semua penghentian sementara punya alasan yang sama, padahal tiap pengumuman menyebut alasan resminya sendiri.

Soal 3
Pesan dari Fajar (21.47): "Gila sih, Perusahaan T naik 5 kali lipat dari akhir November! Makanya bursa suspend hari ini buat cooling down. Gila nggak tuh?"
Pilihan: a) Betul, harganya memang naik 5 kali lipat sesuai data bursa. | b) Betul, naik 5 kali lipat itu wajar sebelum cooling down. | c) Keliru, penghentiannya karena RUPS, bukan karena harga. | d) Keliru, kenaikannya 2,21 kali, bukan 5 kali lipat.
Penjelasan: Data harga menunjukkan harga penutupan Rp48 pada 26 November 2025 lalu Rp106 pada 9 Desember 2025. Hitungan resminya: harga akhir hanya 2,21 kali harga awal, jauh dari angka yang dikirim di grup. Kenaikan memang terjadi dan bursa memang menghentikan perdagangan hari ini untuk cooling down penghentian 10 Desember 2025, tapi besaran kelipatannya keliru. Salah-kaprah yang umum: begitu lihat harga naik cepat, angkanya langsung dibesar-besarkan di kepala, padahal cukup cek data harga dan hitungan yang sudah tersedia.

#### Draf B
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
