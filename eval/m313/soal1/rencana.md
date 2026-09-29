# M3.13 D-1 — soal 1 DADA: analisis, varian, dan aturan pilih

Ditulis dan di-commit **sebelum** satu penguji pun dijalankan. Jawaban mentah penguji
masuk ke `eval/m313/soal1/jawaban/` sesudah commit ini.

## 1. Analisis: kenapa pemain salah

Data (lampiran kontrak `bukti-soal1.md`, data alpha s.d. 29 Sep, 40 pilihan terkunci):

| pilihan | teks | jumlah | porsi |
|---|---|---|---|
| a | Betul, pengumuman bursanya soal investor asing. | 4 | 10% |
| **b (kunci)** | Keliru, pengumumannya soal laporan keuangan telat. | 13 | 33% |
| c | Betul, pengumuman itu yang bikin harganya naik 22 kali. | **16** | **40%** |
| d | Keliru, pengumumannya soal harga yang naik terlalu cepat. | 7 | 18% |

27–29 Sep saja: 2/11 benar. Pembanding dengan pola `tanya` yang sama: ULTJ s1 22/30, DADA s2 21/33, DADA s3 13/25.

Struktur soal:

1. **Pesan Bayu memuat dua klaim yang nilainya berbeda.** "Saham D naik 22 kali" — BETUL (kartu harga
   menulis "naik 22 kali" huruf demi huruf). "Pasti mau dibeli investor asing, bursa udah umumin" —
   KELIRU (kartu pengumuman: penghentian karena laporan keuangan tahunan belum diserahkan).
   Soal lain yang dijawab baik (ULTJ s1, DADA s2, s3) tidak punya klaim benar yang menempel pada klaim salah
   dengan cara ini; di ULTJ s1 angka Nadia (Rp45) langsung dibantah kartu pertama.
2. **Pertanyaan `Omongan Bayu cocok dengan dokumennya?` tidak menyebut lingkupnya, dan tidak memakai kata
   yang dipakai pilihan.** Semua pilihan diawali "Betul, …"/"Keliru, …", sedangkan judulnya bertanya
   "cocok". Pemain yang mencocokkan bagian yang paling mudah dicocokkan — angka "22 kali" yang ditebalkan
   di kartu kedua — menemukan kecocokan persis, lalu mencari pilihan "Betul" yang menyebut 22 kali: **c**.
   Ini sejalan dengan tiga tulisan bebas ("sedang menanyakan apa dan membahas tentang apa") dan masukan
   lisan GIBEI ("cek omongan Bayu dengan dokumennya" atau "apakah omongan Bayu sesuai dokumennya?").
3. **Apakah pilihan c sendiri menjebak secara tidak adil?** Tidak terbukti. c memuat klaim sebab-akibat
   ("pengumuman itu yang bikin harganya naik") yang tidak ada di kartu mana pun, dan vonis "Betul" untuk
   pesan yang menyebut investor asing — dibantah kartu pertama. Pembaca yang tahu bahwa yang dinilai
   adalah **seluruh** pesan Bayu tidak punya jalan sah ke c. Yang membuat c menarik adalah kalimat
   tugasnya, bukan isi c. Karena itu fakta, kartu, pilihan, dan kunci **tidak diubah** (sesuai D-1);
   penguji "pembaca kartu" di bawah menjadi penjaganya (harus 3/3 b di tiap versi).
4. **Pola `tanya` soal lain tidak diubah.** Pola yang sama dijawab 22/30 (ULTJ s1), 21/33, 13/25: pola itu
   bukan penyebab tunggal; yang khas soal ini adalah dua klaim berbeda nilai (butir 1) bertemu judul yang
   tidak menyebut lingkup (butir 2). Validator mensyaratkan judul ≤ 60 karakter dan menyebut "Bayu".

## 2. Varian (hanya `tanya`, dan di V3 satu kalimat pengantar = `petunjuk` soal 1)

| versi | petunjuk (di atas pesan, teks kecil) | tanya (judul di atas pilihan) | mekanisme |
|---|---|---|---|
| V0 (sekarang) | — | Omongan Bayu cocok dengan dokumennya? | — |
| V1 | — | Menurut dokumennya, omongan Bayu betul atau keliru? | kata judul = kata pilihan ("betul/keliru"); pertanyaan vonis, bukan "cocok" |
| V2 | — | Apakah semua yang Bayu bilang betul menurut dokumennya? | lingkup: seluruh pesan |
| V3 | Pesan teman bisa memuat lebih dari satu hal; cek semuanya ke dokumen. | Menurut dokumennya, omongan Bayu betul atau keliru? | aturan main umum (bukan khusus soal ini) + judul V1 |

Tidak ada varian yang menyebut "pengumuman", "investor asing", atau bagian mana yang salah: itu bocoran.

Teks layar persis per versi: `layar-V*-penuh.txt` (penguji awam, pembaca kartu) dan `layar-V*-buta.txt`
(penebak buta; kedua kartu disembunyikan). Dibuat `buat-layar.mjs` dari teks layar sungguhan 360 × 640.

## 3. Protokol uji

Semua penguji = subagent Claude Opus **baru** per orang, dijalankan sinkron, tanpa alat, tanpa tahu ada
versi lain. Jawaban mentah disimpan utuh.

- **(a) Pemain awam, 5 per versi.** Diberi layar 1 + layar 2 versinya. Diminta memerankan orang awam
  (mahasiswa, belum pernah main saham) yang membaca sekali di ponsel. Menjawab berurutan:
  `TUGAS:` (tugasnya apa, kata-kata sendiri) · `JELAS:` (ya / ragu / tidak — jelas apa yang ditanyakan?) ·
  `JAWAB:` (satu huruf) · `ALASAN:` (satu–dua kalimat).
- **(b) Tebak buta, 3 per versi.** Layar yang sama tanpa isi kartu. Diminta menebak huruf yang dianggap
  benar oleh pembuat soal. `JAWAB:` · `ALASAN:`.
- **(c) Pembaca kartu, 3 per versi.** Layar penuh, diminta menjawab HANYA dari kartu dan menyebut kartu
  penentunya. `JAWAB:` · `KARTU:` · `ALASAN:`.

### Rubrik (dinilai dari jawaban mentah, per penguji awam)

- **paham-tugas = 1** bila KEDUANYA:
  - **P1** `TUGAS:` menyatakan bahwa pemain harus memutuskan betul/keliru (benar/salah, sesuai/tidak) omongan
    atau pesan Bayu dengan mengeceknya ke dokumen/kartu. Menyebut "cek/cocokkan omongan ke dokumen" tanpa
    menyebut bahwa hasilnya vonis betul/keliru → P1 = 0.
  - **P2** `ALASAN:` menilai klaim pengumuman bursa / investor asing (bukan hanya angka 22 kali).
    Alasan yang hanya bersandar pada "22 kali cocok" → P2 = 0.
- **benar = 1** bila `JAWAB: b`.
- **jelas** dicatat terpisah (ya = 1).

## 4. Aturan pilih (mengikat, ditulis sebelum uji)

1. **Syarat lolos** untuk setiap versi, termasuk V0:
   - (c) pembaca kartu **3/3** memilih b;
   - (b) tebak buta: jumlah penebak yang memilih b **≤ jumlah pada V0 di putaran yang sama**
     (V0 diuji ulang di putaran ini, bukan memakai angka lama).
2. Di antara versi yang lolos, pilih **paham-tugas tertinggi** (jumlah dari 5).
3. Seri → **benar** tertinggi (dari 5). Seri → **jelas = ya** terbanyak. Seri → perubahan terkecil dari V0
   (urutan: V1, V2, V3).
4. **V0 hanya dipertahankan bila ia sendiri paling tinggi tanpa seri** di langkah 2–3. Bila sebuah varian
   seri dengan V0 sampai langkah 3, varian yang dipilih: data pemain sungguhan (2/11, 13/40) dan empat
   keluhan tertulis/lisan adalah bukti terhadap V0 yang tidak ditangkap penguji simulasi.
5. Bila tidak ada varian yang lolos syarat 1, V0 dipertahankan dan hal itu dilaporkan di §9.
