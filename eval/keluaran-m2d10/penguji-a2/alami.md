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
Pesan dari Rizky (20.15): "Gw yakin banget sahamnya disetop karena bursa ragu soal kelangsungan usahanya. Ga ada alasan lain deh."
Pilihan: a) Betul, penghentiannya karena keraguan atas kelangsungan usaha perseroan. | b) Keliru, penghentiannya tercatat pada 21 Januari awal tahun. | c) Keliru, penghentiannya karena kenaikan harga kumulatif pada 10 Desember. | d) Betul, volume perdagangannya 1.461.200 lembar pada hari sebelumnya.
Penjelasan: Rizky menyimpulkan penghentian saham Perusahaan T karena bursa ragu soal kelangsungan usaha. Catatan 10 Desember 2025 menyebut alasan resminya: kenaikan harga kumulatif yang signifikan, sebagai cooling down untuk perlindungan investor. Jadi untuk kejadian itu, pernyataannya tidak cocok. Memang ada catatan 21 Januari 2025 yang memuat keraguan atas kelangsungan usaha, tetapi itu penghentian di tanggal berbeda. Catatan volume 9 Desember 2025 hanya menunjukkan angka perdagangan, bukan sebab penghentian, jadi tidak menjawab alasan. Salah-kaprah yang umum: mengira semua penghentian saham punya alasan yang sama, padahal alasan resminya bisa berbeda.

#### Draf B
Soal 1
Pesan dari Tio (20.14): "Gw yakin deh harga penutupan Perusahaan T kemarin Rp97, itu angka yang gw inget banget."
Pilihan: a) Betul, penutupan 9 Desember memang Rp97. | b) Betul, Rp97 itu penutupan tertinggi sebelum hari ini. | c) Keliru, penutupan 9 Desember Rp106, bukan Rp97. | d) Keliru, penutupan 9 Desember Rp115, bukan Rp97.
Penjelasan: Di kartu tertulis harga penutupan 9 Desember adalah Rp106. Tio menyebut Rp97 untuk kemarin, padahal angka itu tertulis sebagai penutupan 8 Desember. Jadi yang benar: penutupan 9 Desember Rp106, bukan Rp97. Pilihan yang membenarkan Rp97 untuk 9 Desember keliru karena tertukar harinya. Salah-kaprah yang umum: memakai angka dari hari lain seolah-olah itu angka kemarin.

#### Draf C
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
