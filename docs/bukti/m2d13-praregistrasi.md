# Pra-registrasi M2d-13: keluarga penulis × penguji (H1–H4)

Berkas ini di-commit **sebelum panggilan berbayar pertama M2d-13**, dan tidak diubah sesudahnya (kontrak M2d-13 D-0). Keadaan ledger OpenRouter saat berkas ini ditulis: 2.850 entri, entri terakhir `2026-10-02T11:56:24.061Z`, total US$9,915756 (`LLM_PAGU_USD` = 20). Belum ada entri bertag `m2d13/` atau `penyusun/m2d13-`. Entri pertama bertag itu di `.cache/llm/ledger.jsonl` harus lebih baru dari waktu commit berkas ini. Syarat itu dites di `factory/llm/bebas/praregistrasi.test.ts`.

**Pra-registrasi lama tidak diubah:** M2d-7, M2d-8, M2d-10, A-1, A-2, dan M2d-11. Patokan lulus satu omongan di §4 mengikuti patokan M2d-11 (`docs/bukti/m2d11-praregistrasi.md` §1). Ada tiga penyesuaian, semuanya karena penulis bebas tidak punya proposisi templat. Ketiganya disebut di §4.

**Yang sudah dilihat eksekutor sebelum menulis berkas ini.** Eksekutor sudah membaca laporan dan agregat M2d-11 yang sudah terbit: prior huruf, proporsi kunci per keluarga, dan audit Opus satu-soal. Ia juga sudah membaca jejak model penulis M2d-3…M2d-10 (`jejak-agen.json`). Karena itu **D-A (analisis data lama) bersifat eksploratif**, dan angkanya tidak dipakai sebagai uji hipotesis. **Uji konfirmatori hanya memakai data baru D-B…D-D.**

Penulis prompt, rubrik, dan kode M2d-13 adalah eksekutor, yaitu Claude Opus. Penilai dan auditor Opus di D-C/D-D adalah reviewer, juga Claude Opus. Ini pembaur sekeluarga, dan dicatat di §10.

## 1. Definisi

- **Keluarga:** Anthropic (`anthropic/claude-opus-5.5`, `anthropic/claude-haiku-4.5`), DeepSeek (`deepseek/deepseek-v4.1-flash`), dan Z-AI (`z-ai/glm-5.3`). "Sekeluarga" berarti keluarganya sama. "Semodel" berarti modelnya sama persis. Keduanya dilaporkan terpisah.
- **Penebak rotasi:** tiga penebak M2d-11 tanpa perubahan (`MODEL_ROTASI`): Haiku 4.5 dengan suhu 0 dan `max_tokens` 300; DeepSeek dengan suhu 0, `max_tokens` 600, dan `reasoning.enabled:false`; GLM-5.3 dengan suhu 0, `max_tokens` 3.000, dan `effort:"minimal"`. Ada 4 rotasi siklik × 2 kondisi: **pilihan-saja** dan **pesan+pilihan**. Teks opsi disalin lalu dipetakan Dice, seperti M2d-11 §3.
- **Butir rotasi:** setiap versi omongan yang sampai ke tebak rotasi, artinya sudah lolos gerbang kode. Satu butir menghasilkan 12 jawaban per kondisi.
- **Laju kunci:** porsi jawaban yang memilih isi kunci. Hitungan **utama untuk hipotesis** hanya memakai jawaban terbaca. Jawaban tak terbaca dibuang dari pembilang dan penyebut, lalu jumlahnya dilaporkan per model dan per kondisi. Hitungan **kepekaan** memakai aturan M2d-11: jawaban tak terbaca dihitung sebagai memilih isi kunci. **Putusan gerbang selalu memakai aturan M2d-11**, tidak pernah hitungan utama.
- **Versi akhir:** versi terakhir sebuah omongan yang terbaca. Kalau omongan itu lulus, versi akhirnya adalah versi yang lulus. Kalau tidak lulus, versi akhirnya adalah versi ke-3, atau versi terbaca terakhir sebelum jalan berhenti.

## 2. Hipotesis, ukuran, ramalan, ambang

Ambang di bawah ini adalah **opini rekayasa** untuk n kecil, bukan uji signifikansi. Interval Wilson 95 % (untuk porsi) dilaporkan di samping setiap angka. Bila sel yang dibutuhkan punya kurang dari 4 butir, putusannya otomatis **tak bisa disimpulkan**.

### H1: keluaran LLM berpola khas yang mudah dikenali LLM
- **H1a (penebak, seperti "angka 7"):** prior huruf tiap penebak rotasi pada semua jawaban terpetakan D-B. Rotasi membuat kunci tersebar rata, jadi harapannya 25 % per huruf. Seorang penebak dinyatakan **berbias huruf** bila satu huruf ≥ 0,32 dari jawabannya dengan n ≥ 200. Ramalan: ya. **Mendukung** bila ≥ 2 dari 3 penebak berbias. **Tidak mendukung** bila 0 dari 3. Selain itu **tak bisa disimpulkan**.
- **H1b (penulis):** laju kunci **pilihan-saja** atas semua butir rotasi D-B. Ukurannya gabungan ketiga penebak dan per penulis. Ramalan: di atas peluang (0,25). **Mendukung** bila gabungan ≥ 0,40 DAN ≥ 2 dari 3 penulis masing-masing ≥ 0,35. **Tidak mendukung** bila gabungan ≤ 0,30. Selain itu tak bisa disimpulkan.
- **H1c (deskriptif):** sebaran huruf kunci yang dipilih penulis bebas. Satu huruf ≥ 50 % dari versinya dicatat sebagai pola. Ini bukan uji.

### H2: penebak sekeluarga buta terhadap bocoran penulisnya
Ukuran utamanya selisih-dalam-selisih (DiD) pada laju kunci **pesan+pilihan** atas butir rotasi D-B. GLM dipakai sebagai kendali karena tidak punya penulis sekeluarga. Dengan begitu, efek utama "penebak X memang lebih sering memilih kunci" dan "butir penulis Y memang lebih mudah" sama-sama terhapus.
- Δ_DS = [DeepSeek(butir DeepSeek) − DeepSeek(butir Anthropic)] − [GLM(butir DeepSeek) − GLM(butir Anthropic)]
- Δ_H = [Haiku(butir Anthropic) − Haiku(butir DeepSeek)] − [GLM(butir Anthropic) − GLM(butir DeepSeek)]

Butir Anthropic adalah gabungan butir penulis Opus dan Haiku. Varian semodel juga dilaporkan: Haiku pada butir Haiku dibandingkan pada butir DeepSeek.
- Ramalan H2: kedua Δ negatif, artinya penebak lebih jarang memilih kunci pada butir keluarganya sendiri.
- **Mendukung** bila Δ_DS ≤ −0,10 DAN Δ_H ≤ −0,10. **Tidak mendukung** bila keduanya ≥ 0. Selain itu tak bisa disimpulkan. Kondisi pilihan-saja dilaporkan sebagai pelengkap.
- **H2-Opus (menunggu reviewer):** laju kunci auditor Opus tanpa kartu (D-C) pada versi akhir penulis Opus dibandingkan pada versi akhir penulis DeepSeek, dikurangi selisih yang sama pada GLM (data rotasi pesan+pilihan untuk versi yang sama). Ambangnya sama: ≤ −0,10 berarti mendukung, ≥ 0 berarti tidak.
- **Pembaur yang wajib disebut:** jenis soal. Penulis bebas memilih sudutnya sendiri, sehingga butir tiap penulis bisa berbeda jenisnya. Laporan memuat sebaran kartu penentu (sudut) dan label pengecoh per penulis. Bila ada sudut yang dipakai ≥ 2 penulis, Δ juga dihitung khusus untuk sudut itu.

### H3: keluaran Haiku terasa "masuk akal" bagi Opus
- **H3a (auditor, menunggu reviewer):** laju kunci Opus tanpa kartu (D-C) pada versi akhir Haiku dikurangi pada versi akhir DeepSeek, lalu dikurangi selisih yang sama pada GLM. Ramalan: negatif, artinya butir Haiku lebih jarang ditebak Opus. **Mendukung** bila ≤ −0,15. **Tidak mendukung** bila ≥ 0.
- **H3b (penilai, menunggu reviewer):** self-preference S = rata-rata (skor Opus − skor GLM) pada butir Anthropic (penulis Opus dan Haiku), dikurangi rata-rata (skor Opus − skor GLM) pada butir DeepSeek. Skalanya rubrik §7, 0–10. Ramalan: positif. **Mendukung** bila S ≥ +1,0. **Tidak mendukung** bila S ≤ 0. Pembaur: rubrik dan prompt ditulis Claude.

### H4: Opus 5.5 sebagai penulis, tanpa penyempurna, menghasilkan soal lebih baik dengan revisi lebih sedikit
Ukuran per penulis W:
- **L_W:** jumlah omongan yang lulus (§4) dalam ≤ 3 versi, dari 3 × jumlah jalan.
- **V̄_W:** rata-rata versi per omongan. Omongan yang tidak lulus dihitung 3.
- **Q_W:** rata-rata skor mutu versi akhir, dihitung per penilai.
- Juga dilaporkan: jumlah simulasi terbit (3/3), biaya nyata per omongan lulus, dan distribusi gerbang penolak.

Pembanding pipeline lama adalah mesin templat M2d-11 dengan penyempurna Haiku. Di sana TIRT-7 butuh **29 versi untuk 3 omongan lulus (9,7 versi per omongan lulus)**, dan mutu 3 omongannya dinilai di D-D.
- **Mendukung** bila keempat syarat ini terpenuhi:
  - L_Opus ≥ max(L_Haiku, L_DeepSeek) + 1;
  - V̄_Opus ≤ min(V̄_Haiku, V̄_DeepSeek);
  - Q_Opus ≥ max(Q_Haiku, Q_DeepSeek) + 1,0 DAN Q_Opus ≥ Q_templat + 1,0 menurut **kedua** penilai;
  - versi per omongan lulus Opus < 9,7.
- **Tidak mendukung** bila L_Opus ≤ max(L lain) − 1, ATAU Q_Opus ≤ max(Q lain) − 1,0 menurut kedua penilai.
- Selain itu **tak bisa disimpulkan**.
- Sebelum skor penilai Opus ada, bagian mutu ditulis "sementara (GLM saja)". **Satu penilai saja tidak pernah cukup untuk "mendukung".** Kalau kedua penilai berbeda arah, bagian mutu tak bisa disimpulkan.

## 3. Eksperimen tiga penulis (D-B)

- **Paket fakta:** `eval/penyusun/m2d11-tirt-7/paket.json` apa adanya. Sha256 di `cee62be`: `f7cabc6b2c9abca5ceb36d127b279438c9c3586e3c727de76da3a412fb85a45a`. Isinya TIRT, T = 10 Desember 2025, 20 fakta. Kode menolak berjalan bila salinannya tidak sama persis. Sectors tidak dipanggil.
- **Penulis:** `anthropic/claude-opus-5.5`, `anthropic/claude-haiku-4.5`, `deepseek/deepseek-v4.1-flash`, tanpa sufiks. Tidak ada penyempurna.
- **Prompt:** SATU prompt yang sama, berkas yang sama, byte yang sama untuk ketiga model. Isinya:
  - paket fakta di atas;
  - 6 jenis kesalahan membaca (§4) dengan artinya;
  - daftar item-writing flaws dari riset: opsi terpanjang/terinci = kunci; angka/tanggal/kode unik hanya di kunci; kunci mengulang kata pesan; konvergensi; kata absolut/pelunak hanya di satu sisi; label tidak seimbang; urutan angka; lebih dari satu benar;
  - aturan "setiap angka/tanggal harus ada di kartu omongan itu" (§4);
  - 3 soal DADA tayang sebagai teladan gaya (pesan, pilihan, kunci, penjelasan);
  - larangan dua omongan bersudut sama;
  - skema keluaran.

  Prompt dan kode di-commit sebelum panggilan penulis pertama, dan hash commit-nya dicatat di laporan. **Tidak ada perubahan prompt, kode gerbang, atau setelan antar jalan.** Perbaikan galat kode diatur di §8.
- **Setelan penulis**, sama untuk ketiganya:
  - `reasoning: { effort: "low" }`, `max_tokens` 8.000, suhu 1,0. Suhu 1,0 dipakai karena penalaran Anthropic mensyaratkannya, dan nilai yang sama dipakai untuk semua.
  - Pagar penyedia M2d-7, dengan `max_price` = harga daftar 2 Okt: Opus $4/$20, Haiku $1/$5, DeepSeek $0,30/$1,20 per juta token.
  - Token penalaran dan penyedia dicatat dari tiap respons.
- **Keluaran** mengikuti skema draf M2d-11 (`OmonganDraf`) ditambah dua bagian:
  - `pengecoh`: untuk tiap huruf bukan-kunci, `{ jenis, rujukan: fact_id, umpan_balik }`;
  - `pertanyaan_cek`.

  Satu simulasi berisi 3 omongan.
- **Alur satu jalan:**
  1. **Versi 1:** satu panggilan menulis ketiga omongan.
  2. Tiap omongan diperiksa gerbang §4 sendiri-sendiri.
  3. **Versi 2 dan 3:** satu panggilan per putaran menulis ulang SEMUA omongan yang ditolak. Panggilan itu memuat versi yang ditolak dan alasan penolakan dari gerbang dalam bentuk teks M2d-11 (kode/detektor; isi yang dipilih tiap model di tebak rotasi; pilihan dan alasan pembaca kartu; keberatan dan arahan kritikus). Omongan yang sudah lulus ikut sebagai konteks dan tidak ditulis ulang.
  4. Paling banyak **3 versi per omongan**.
  5. **Tanpa henti dini:** ketiga omongan diproses sampai lulus atau sampai versi ke-3, walaupun omongan lain sudah gagal. Dengan begitu tiap penulis mendapat data yang sama banyak.
  6. Sesudah ketiganya lulus, validator seluruh draf dijalankan sekali; gagal berarti simulasi tidak terbit. Tidak ada versi tambahan.
- **Jalan:** 2 jalan per penulis, dengan urutan bergiliran: **Opus-1, Haiku-1, DeepSeek-1, Opus-2, Haiku-2, DeepSeek-2**. Id jalan `m2d13-<opus|haiku|deepseek>-<n>`. Log disimpan di `eval/penyusun/m2d13-…/`, lewat pintu penyusun `--mesin bebas --penulis <model>`.

## 4. Gerbang dan patokan lulus satu omongan

Urutan gerbang dan berhentinya sama dengan M2d-11 §5. Kalau satu gerbang menolak, gerbang berikutnya tidak dijalankan untuk versi itu.

1. **Kode (gratis):**
   - validator `validasiM2d8` atas omongan itu;
   - gerbang kode M2d-8, yaitu G, gaya, penilaian, kembar, rujukan huruf, mirip, dan artefak (kode yang diturunkan kalibrasi M2d-8 tetap dicatat dan tidak menolak);
   - kebocoran kalender A-2;
   - detektor D1–D9 pada ambang beku `AMBANG_M2D11`;
   - empat pemeriksaan baru:
     - **(a) angka-di-kartu:**
       - di pilihan, penjelasan, dan umpan balik, setiap angka atau tanggal yang ditulis dengan digit harus berupa rujukan `[[fact_id|teks]]` dengan `fact_id` ∈ `kartu` omongan itu, atau `[[hari-ini|10 Desember 2025]]`;
       - `[[misal|…]]` dilarang;
       - di pesan, setiap `angka_pesan` wajib punya `fact_id` ∈ `kartu`, dan andaian dilarang;
       - di umpan balik, frasa "kartu N" boleh dipakai bila 1 ≤ N ≤ jumlah kartu;
       - pertanyaan cek tidak boleh memuat digit;
       - angka yang ditulis dengan kata ("dua kali lipat") tidak diperiksa. Ini keterbatasan;
     - **(b) label pengecoh** (§5);
     - **(c) umpan balik** (§5);
     - **(d) sudut berbeda:** `kartu_penentu` sebuah omongan tidak boleh beririsan dengan `kartu_penentu` omongan lain dalam simulasi yang sama. Kalau beririsan, omongan bernomor lebih besar yang ditolak;
   - anti-salin: tidak ada 5-gram kata yang sama dengan 6 soal tayang.

   Pemeriksaan khusus templat M2d-10/11 (bukti kunci tunggal dari proposisi, kata wajib templat, angka pesan terkunci) **tidak berlaku**, karena penulis bebas tidak punya proposisi.
2. **Tebak rotasi:** 24 panggilan tanpa henti dini. Putusannya mengikuti M2d-11 §1 syarat 3 dan agregasi §3.4 persis: lulus bila ≤ 5/12 di pesan+pilihan dan tidak ada konsistensi isi kunci; 6/12 abu-abu dan dihitung tidak lulus; konsistensi huruf membuat model itu diabaikan.
3. **Pembaca kartu r0 + r2:** keduanya harus memilih kunci.
4. **Kritikus GLM-5.3:** `effort:"high"`, Wafer, setelan M2d-8. Keberatan tingkat 1 (`kunci`, `makna`, `aturan`) menolak. Kalau kritikus tidak menjawab, ia diperiksa sekali lagi; tidak menjawab dua kali berarti gagal.

**Lulus** berarti keempat gerbang di atas lolos. Ini setara syarat 1–6 M2d-11, dengan tiga penyesuaian yang sudah disebut di atas:
- syarat 4: label divalidasi secara struktur, bukan dari proposisi;
- syarat 5: umpan balik ditulis penulis, dan kode hanya memvalidasi strukturnya;
- syarat 2: diperketat dengan aturan angka-di-kartu.

## 5. Label pengecoh dan umpan balik (validasi kode)

- Tiap huruf bukan-kunci punya tepat satu entri `pengecoh`. Huruf kunci tidak boleh punya entri.
- `jenis` ∈ {`salah-periode`, `salah-entitas`, `nyaris-benar-angka`, `pertanyaan-lain`, `sebagian-benar`, `percaya-otoritas`}, dengan arti yang sama dengan M2d-11 (`NAMA_KESALAHAN`).
- `rujukan` ∈ `kartu` omongan itu.
- `percaya-otoritas` hanya sah bila pengecoh berawalan "Betul" dan kunci berawalan "Keliru", artinya pengecoh membenarkan teman yang salah.
- Ketepatan isi label (apakah pengecoh memang mewakili kesalahan itu) **tidak bisa diperiksa kode** untuk teks bebas. Hal ini dinilai penilai mutu (§7, kriteria 2) dan dilaporkan sebagai keterbatasan.
- `umpan_balik` tiap pengecoh harus:
  - memuat nama jenis kesalahannya (teks `NAMA_KESALAHAN`, huruf kecil);
  - memuat "kartu N", dengan N = nomor urut `rujukan` di `kartu`;
  - panjangnya ≤ 200 karakter.
- `penjelasan` harus merujuk minimal satu `kartu_penentu`.
- `pertanyaan_cek` diakhiri "?", panjangnya ≤ 20 kata, dan tanpa digit.

## 6. Pagu adil (ditegakkan kode)

- **Pagu milestone US$2,50** biaya nyata (`usage.cost`), untuk tag `m2d13/` dan `penyusun/m2d13-`, di atas `LLM_PAGU_USD`. Pagu ini dibagi dua:
  - **D-D (penilai GLM) US$0,40** (`m2d13/mutu/`). Bagian ini dicadangkan dan tidak bisa dipakai D-B.
  - **D-B US$2,10.**
- **Pagu per jalan** ditetapkan menurut perkiraan kebutuhan tiap penulis, dan dipakai di kedua putaran: Opus **US$0,60**, Haiku **US$0,30**, DeepSeek **US$0,22** (Σ = US$1,12). Perkiraannya:
  - harga penulis × (≈ 8 rb token masuk + ≤ 8 rb keluar) × 3 panggilan;
  - gerbang ≈ US$0,15–0,22 per jalan, dari biaya per peran di jalan M2d-11.

  Jalan yang menyentuh pagunya berhenti sebelum panggilan berikutnya, dan dicatat "terpotong pagu jalan". Omongan yang belum selesai dihitung tidak lulus, ditandai **tersensor**, dan analisis H4 dilaporkan dua kali: dengan dan tanpa jalan tersensor.
- **Putaran 1** (Opus-1, Haiku-1, DeepSeek-1) dimulai hanya bila sisa pagu D-B ≥ Σ pagu jalan.
- **Putaran 2** dimulai dengan pagu jalan penuh bila sisa pagu D-B ≥ US$1,12. Bila sisa < US$1,12 tetapi ≥ 1,25 × biaya nyata putaran 1, putaran 2 dimulai dengan pagu jalan yang diskalakan sama untuk semua penulis: pagu_W × sisa / 1,12. Selain itu, putaran 2 **tidak dijalankan untuk penulis mana pun**, sehingga tiap penulis tetap mendapat jumlah jalan yang sama, dan hal itu dilaporkan.

  Dengan aturan ini, pagu milestone tidak bisa memotong satu penulis di tengah putaran. Yang bisa memotong hanya pagu jalannya sendiri.
- Perkiraan sebelum kirim mengikuti `PencatatBiaya` yang sudah ada: `max_price` × (token masuk + `max_tokens`).
- Bila pagu milestone menghentikan kerja, kerja berhenti dan hal itu dilaporkan.

## 7. Rubrik mutu pemula (D-D)

**Butir yang dinilai:**
- versi akhir semua omongan dari semua jalan D-B;
- 3 omongan draf TIRT-7 (templat M2d-11);
- 3 soal DADA tayang.

**Cara menilai (buta):**
- Tiap butir dinilai **sendiri-sendiri**, satu butir per panggilan atau berkas, karena paket yang membundel beberapa soal terbukti membocorkan jawaban (audit M2d-11).
- Bentuk tampilannya seragam: pesan teman, kartu (teks), pilihan a–d, kunci, dan penjelasan. Label, umpan balik, nama penulis, dan asal butir tidak ditampilkan.
- Urutan dan id butir diacak kode (benih tertulis).
- Butir DADA memakai emiten lain. Ini pembeda yang tidak bisa disamarkan dan dicatat.

**Penilai:**
- **GLM-5.3** (berbayar, di pagu D-D): `effort:"medium"`, `max_tokens` 16.000, Wafer, penjaga penalaran dengan ambang 500 token. Jawaban tak terbaca diulang sekali; tetap tak terbaca berarti hilang, tidak diisi, dan dilaporkan.
- **Opus** (subagent, dijalankan reviewer): paket berkas satu butir dengan teks rubrik yang sama.

**Lima kriteria, masing-masing 0/1/2 (total 0–10):**
1. **Bergantung kartu.** 2 = jawaban hanya bisa dipastikan dengan membaca kartu; nada atau bentuk pilihan tidak menunjuk kunci. 1 = ada petunjuk kecil di luar kartu. 0 = bisa ditebak tanpa kartu.
2. **Pengecoh diagnostik.** 2 = tiap pengecoh mewakili satu salah baca yang masuk akal bagi pemula (salah tanggal, salah hal, angka mirip, menjawab hal lain, setengah benar, ikut omongan teman). 1 = sebagian pengecoh asal salah. 0 = pengecoh jelas mustahil atau tidak terkait.
3. **Penjelasan mengajar.** 2 = menunjuk kartu dan bagian penentu, serta menjelaskan mengapa pilihan yang menggoda salah. 1 = hanya menyebut jawaban. 0 = salah atau membingungkan.
4. **Bahasa untuk pemula.** 2 = pesan teman wajar; pilihan ringkas, sejajar, dan tanpa istilah yang tak dijelaskan. 1 = ada yang kaku atau panjang. 0 = sulit dipahami.
5. **Benar dan satu kunci.** 2 = kunci benar menurut kartu, tidak ada pilihan lain yang juga benar, dan tidak ada angka atau tanggal di luar kartu. 1 = ada keraguan kecil. 0 = kunci salah atau ada dua jawaban benar.

Ditambah satu jawaban **layak tayang untuk pemula: ya/tidak**, beserta alasan satu kalimat.

**Kesepakatan penilai yang dilaporkan:**
- ρ Spearman total skor;
- rata-rata |selisih|;
- urutan penulis menurut tiap penilai;
- kesepakatan layak tayang (porsi sama);
- S dari H3b.

## 8. Penolakan, tak terbaca, galat

- **Penulis:** keluaran tak terbaca, penolakan, JSON rusak, atau terpotong diulang sekali dengan panggilan baru. Kalau tetap gagal, versi itu dihitung "tulis-gagal": versinya terpakai, tidak lulus, dan dilaporkan per penulis.
- **Penebak, pembaca kartu, kritikus:** aturan M2d-11 tanpa perubahan.
- **Amandemen teknis.** Bila sebuah model menolak parameter (HTTP 4xx, biaya 0), dipakai setelan terdekat yang terdokumentasi dan sama untuk semua penulis yang terkena; untuk `effort`, cadangannya `reasoning.max_tokens` 1.600. Amandemen dicatat di kode, laporan, dan commit. Pra-registrasi ini tidak diubah.
- **Galat kode** di tengah jalan (bukan keluaran model): jalan itu dibuang dan diulang **sekali** di slot yang sama sesudah perbaikan di-commit. Perbaikan tidak boleh mengubah gerbang, prompt, atau setelan. Biaya jalan yang dibuang tetap dihitung di pagu dan dilaporkan.
- Semua hitungan menyebut n terbaca dan n tak terbaca. Tidak ada butir yang dibuang diam-diam.

## 9. Analisis gratis data M2d-11 (D-A, eksploratif)

**Atribusi penulis untuk 33 soal bank uji ulang:**
- 6 soal tayang: Claude Opus bersama pemilik, keluarga Anthropic dengan tangan manusia.
- 21 omongan M2d-3…M2d-8 (8 + 7 + 3 + 2 + 1): DeepSeek V4.1 Flash, sesuai langkah `susun`/`tulis-ulang`/`tulis-*` di `jejak-agen.json`. Di M2d-3 dan M2d-4 lewat Featherless; mulai M2d-5 lewat OpenRouter.
- 6 butir M2d-10 (v1, v2, pemanasan, A-1 ×2, A-2): **templat**. Pilihannya berasal dari teks kode yang ditulis Claude, pesannya dari DeepSeek, dan varian dipilih Haiku bila `penyempurna_dipakai`.
- Draf TIRT-7 juga masuk templat.
- Yang tak bisa dipastikan dari jejak ditulis "tak diketahui".

**Matriks penulis × penebak:**
- Kolom penebak: Haiku, DeepSeek, GLM (rotasi M2d-11, kedua kondisi); Opus satu-soal (audit reviewer, 8 butir); Opus luar lama (3 penguji, tanpa rotasi, berkas dibundel).
- Ukuran: laju kunci (utama dan kepekaan), konsistensi isi kunci (≥ 3/4 rotasi), prior huruf per penebak (seluruhnya dan per kelompok penulis), dan Δ sekeluarga dengan rumus §2.

**Pembaur yang wajib disebut:**
- **Seleksi:** omongan M2d-3…M2d-8 masuk bank karena sudah lolos penebak di dalam lingkar yang menyertakan DeepSeek. Akibatnya, butir DeepSeek sudah tersaring agar tidak tertebak DeepSeek, dan H2 tampak "terdukung" karena seleksi.
- Jenis soal dan pola berbeda antar milestone.
- Masa pembuatan dan host model berbeda.
- Tangan manusia ikut di soal tayang.
- Uji Opus luar lama dibundel dan tanpa rotasi.

Hasil D-A dilaporkan sebagai petunjuk, bukan putusan hipotesis.

## 10. Paket untuk reviewer dan batas klaim

**Paket untuk reviewer:**
- **D-C:** paket audit satu soal di `eval/keluaran-m2d13/audit-opus/`. Isinya versi akhir semua omongan tiap penulis, lulus atau tidak, 4 rotasi tanpa kartu, SATU soal per berkas. Kunci disimpan di luar folder bahan.
- **D-D:** paket penilai Opus, satu butir per berkas.
- Eksekutor tidak menulis hasil Opus. Bagian itu ditulis "menunggu reviewer".

**Batas klaim:**
- n kecil: ≤ 18 omongan dan ≤ 54 versi D-B.
- Satu emiten (TIRT) dan satu tanggal.
- Satu sampel per panggilan penulis.
- LLM bukan pemula, sehingga mutu yang diukur adalah menurut penilai LLM.
- Prompt, rubrik, teladan DADA, eksekutor, dan reviewer semuanya keluarga Anthropic. Ini bisa menguntungkan penulis Anthropic (pembaur H3/H4).
- Penyedia OpenRouter bisa berganti antar panggilan.
- Angka ambang di §2 adalah pilihan rekayasa yang ditetapkan sebelum data D-B ada.
