# Pra-registrasi M2d-15: Opus 5.5 ditingkatkan (effort "medium", aturan kode di prompt, pra-periksa kode gratis, bank sudut)

Berkas ini di-commit **sebelum panggilan berbayar pertama M2d-15**, dan tidak diubah sesudahnya (kontrak M2d-15 D-0). Keadaan ledger OpenRouter saat berkas ini ditulis: 3.175 entri, entri terakhir `2026-10-02T18:31:40.804Z`, total US$11,267611 (`LLM_PAGU_USD` = 20). Belum ada entri bertag `m2d15/` atau `penyusun/m2d15-`. Entri pertama bertag itu di `.cache/llm/ledger.jsonl` harus lebih baru dari waktu commit berkas ini. Syarat itu dites di `factory/llm/bebas/praregistrasi-m2d15.test.ts`.

**Pra-registrasi lama tidak diubah:** M2d-7, M2d-8, M2d-10, A-1, A-2, M2d-11, dan M2d-13 (dites di berkas tes yang sama).

**Yang sudah dilihat eksekutor sebelum menulis berkas ini:** laporan dan data tersimpan M2d-11 (`docs/bukti/lingkar-agen-pemula.md`, audit satu soal di `-audit.md`), M2d-13 (`docs/bukti/lingkar-agen-penulis.md`, `eval/penyusun/m2d13-*/`, audit Opus satu soal `eval/keluaran-m2d13/audit-opus/nilai.json`), dan uji ulang suntingan M2d-14 (`alat/penyusun/rekaman/uji-ulang/`). Bank sudut (§5) dihitung dari data itu. Karena itu angka bank sudut **bukan** uji; uji M2d-15 hanya memakai data baru D-4.

Eksekutor yang menulis prompt, kode, dan berkas ini adalah Claude Opus. Penulis soal adalah Opus 5.5, auditor dan penilai mutu Opus dijalankan reviewer (juga Claude Opus). Ini pembaur sekeluarga (§9).

## 1. Yang diuji

M2d-15 menguji **satu paket perubahan** pada penulis bebas Opus M2d-13, bukan tiap perubahan sendiri-sendiri:
1. effort penalaran `"medium"` (M2d-13: `"low"`);
2. prompt penulis v2 — aturan gerbang kode yang relevan ditulis eksplisit dalam bahasa penulis, ditambah bank sudut;
3. pra-periksa kode gratis sebelum gerbang berbayar (≤ 2 tulis-ulang per versi);
4. pagu jalan yang memberi ruang lebih (US$1,40, M2d-13: US$0,60).

Pertanyaan: dengan paket ini, apakah Opus 5.5 menghasilkan **satu simulasi TIRT utuh yang layak tayang** (§2) dalam ≤ 2 jalan?

## 2. Patokan "layak tayang" (tidak diubah sesudah data ada)

Satu simulasi (3 omongan) **layak tayang** bila (a) DAN (b):

- **(a) Semua gerbang M2d-11, tidak diubah.** Persis gerbang penulis bebas M2d-13 (`docs/bukti/m2d13-praregistrasi.md` §4–§5): patokan M2d-11 dengan tiga penyesuaian penulis bebas yang sudah tertulis di sana. Urutannya: (1) kode — `periksaKodeBebas` di `factory/llm/bebas/mesin.ts` (validator `validasiM2d8`, gerbang kode M2d-8, A-2 kalender, detektor D1–D9 pada `AMBANG_M2D11`, angka-di-kartu, label pengecoh, umpan balik, sudut berbeda, anti-salin); (2) tebak rotasi 4 × 2 kondisi × 3 penebak (M2d-11 §3, lulus bila ≤ 5/12 pesan+pilihan dan tanpa konsistensi isi kunci); (3) pembaca kartu r0 + r2 (keduanya memilih kunci); (4) kritikus GLM-5.3 `effort:"high"` terkunci Wafer (keberatan tingkat 1 menolak). Ketiga omongan lulus dalam ≤ 3 versi masing-masing, lalu validator seluruh draf lolos sekali. Penebak, pembaca kartu, kritikus, model, dan setelannya **sama dengan M2d-11/M2d-13**. Fungsi gerbang dan ambang tidak disentuh milestone ini.
- **(b) Audit Opus satu soal per penguji, tanpa kartu:** untuk **tiap** omongan versi lulus, subagent Opus baru (satu soal × satu rotasi per subagent, 4 rotasi siklik, tanpa kartu, cara bagian "Ulang" `docs/bukti/lingkar-agen-pemula-audit.md`) memilih kunci di **≤ 2 dari 4** rotasi. Dijalankan **reviewer**. Eksekutor hanya menyiapkan paket dan tidak pernah menulis hasilnya.

Kelas hasil per jalan: **layak tayang** (a + b); **lulus gerbang, tidak layak** (a, gagal b di ≥ 1 omongan); **tidak terbit** (a gagal); **tersensor** (pagu menghentikan jalan sebelum ketiga omongan selesai; omongan yang belum selesai dihitung tidak lulus).

**Mutu bukan syarat.** Penilai Opus buta (reviewer) dan penilai GLM `effort:"high"` (§7) hanya dilaporkan.

## 3. Penulis dan setelan (beku sejak commit kode D-1/D-3)

- Model: `anthropic/claude-opus-5.5` saja, tanpa sufiks. Tidak ada penyempurna. Effort `"max"` terlarang.
- Setelan semua panggilan penulis (versi, tulis-ulang pra-periksa, ulangan tak terbaca): `reasoning: { effort: "medium" }`, `max_tokens` **16.000**, suhu 1,0 (syarat penalaran Anthropic), pagar penyedia M2d-7 dengan `max_price` $4/$20 per juta token. `max_tokens` dinaikkan dari 8.000 karena di effort "low" Opus sudah memakai 2,6–4,6 rb token penalaran + ±3 rb token jawaban; batas 8.000 berisiko memotong jawaban di "medium".
- Prompt: **prompt penulis v2** di berkas terpisah (D-1); prompt M2d-13 tetap ada dan tidak berubah. Prompt v2 dan bank sudut di-commit sebelum panggilan penulis pertama; hash prompt sistem dicatat di tiap jalan. **Prompt, bank, kode gerbang, dan setelan tidak berubah antar jalan.** Bank sudut beku: hasil M2d-15 tidak dimasukkan ke bank di antara jalan.
- Paket fakta: `eval/penyusun/m2d11-tirt-7/paket.json` apa adanya, sha256 `f7cabc6b2c9abca5ceb36d127b279438c9c3586e3c727de76da3a412fb85a45a` (kode menolak paket lain). Sectors tidak dipanggil.
- Jalan lewat pintu penyusun `--mesin bebas --penulis opus --prompt v2`, id `m2d15-opus-<n>`, log di `eval/penyusun/m2d15-opus-<n>/`.

## 4. Aturan versi dan pra-periksa

**Satu versi** = satu putaran: tulis → pra-periksa kode (≤ 2 tulis-ulang) → gerbang 1 kode resmi → (bila lolos) gerbang berbayar 2–4. Versi tetap terhitung walaupun berhenti di gerbang 1 kode. Paling banyak **3 versi per omongan**.

1. **Tulis.** Versi 1: satu panggilan menulis ketiga omongan. Versi 2–3: satu panggilan menulis ulang semua omongan yang ditolak, dengan versi yang ditolak dan alasan gerbangnya (bentuk M2d-13); omongan yang sudah lulus ikut sebagai konteks. Keluaran tak terbaca diulang sekali; tetap gagal = "tulis-gagal" (versi terpakai), seperti M2d-13 §8.
2. **Pra-periksa kode (gratis).** Fungsi yang dijalankan adalah fungsi gerbang 1 yang SAMA (`periksaKodeBebas`, dengan omongan lain dan himpunan omongan lulus yang sama), ditambah validator seluruh draf yang sama dengan pemeriksaan akhir (`validasiM2d8` bagian seluruh-draf, mis. `KUNCI_SERAGAM`) bila ketiga omongan ada. Omongan yang ditolak pra-periksa dikembalikan ke penulis dalam satu panggilan tulis-ulang, dengan alasan yang sama persis dengan gerbang. Paling banyak **2 tulis-ulang pra-periksa per versi**; tiap tulis-ulang dan alasannya dicatat. Tulis-ulang pra-periksa yang keluarannya tak terbaca tidak diulang; teks sebelumnya dipakai. Bila pagu jalan menolak tulis-ulang pra-periksa (`PaguTercapai` sebelum kirim), tulis-ulang itu **dilewati** dan dicatat, dan versi lanjut ke gerbang 1.
3. **Gerbang 1 kode resmi** dijalankan ulang atas teks akhir versi itu (fungsi sama), lalu gerbang berbayar per omongan. Pra-periksa tidak pernah meloloskan omongan: putusan selalu dari gerbang resmi. Tes D-3 membuktikan pra-periksa = gerbang 1 pada 30 versi tersimpan M2d-13.
4. Tanpa henti dini antar-omongan; ketiganya diproses sampai lulus atau versi ke-3 (M2d-13 §3).
5. Sesudah ketiganya lulus, validator seluruh draf dijalankan sekali; gagal = tidak terbit, tanpa versi tambahan (M2d-13 §3).

## 5. Bank sudut (D-2)

- Sumber, beku: jalan TIRT M2d-11 (`eval/penyusun/m2d11-tirt-1…7/hasil.json`), jalan penulis bebas M2d-13 (`eval/penyusun/m2d13-{opus,haiku}-{1,2}/hasil.json`; DeepSeek tidak punya versi terbaca), uji ulang suntingan M2d-14 (`alat/penyusun/rekaman/uji-ulang/`, ditandai "suntingan penyetuju, bukan penulis"), audit Opus satu soal M2d-11 (`eval/keluaran-m2d11/audit-opus/satu-soal/nilai.json`, hanya TIRT-7) dan M2d-13 (`eval/keluaran-m2d13/audit-opus/nilai.json`).
- Satu sudut = satu `fact_id` kartu penentu. Butir dengan dua kartu penentu dihitung di keduanya (ditandai).
- Per sudut: versi dicoba, sampai tebak rotasi, tertebak penebak (gagal/abu-abu rotasi), ditolak pembaca kartu, ditolak kritikus, lulus semua gerbang, dan audit Opus tanpa kartu Σk/Σn.
- Label (kode, dites): **gagal** bila Opus tanpa kartu Σk/Σn ≥ 0,75 dengan Σn ≥ 4, atau sampai rotasi ≥ 2 kali dan semuanya tertebak penebak; selain itu **terbukti** bila lulus semua gerbang ≥ 1 kali dan Opus Σk/Σn ≤ 0,5; selain itu **campuran**; tanpa versi = **belum dicoba**.
- **Prompt hanya menerima nama sudut, deskripsi dari paket (asal, tanggal, jenis), statistik, dan label — BUKAN teks soal** (dites: tidak ada potongan 5 kata dari pesan, pilihan, penjelasan, atau umpan balik versi yang pernah lulus di prompt v2).

## 6. Uang (ditegakkan kode)

- **Pagu milestone US$3,00** biaya nyata (`usage.cost`) atas tag `penyusun/m2d15-` + `m2d15/`, di atas `LLM_PAGU_USD`.
- **D-4 (jalan) ≤ US$2,70.** Pagu jalan = min(US$1,40; US$2,70 − biaya nyata jalan M2d-15 sebelumnya), dibulatkan ke bawah 4 desimal, ditegakkan `PencatatBiaya` sebelum tiap percobaan HTTP (perkiraan maksimum = `max_price` × (batas atas token masuk + `max_tokens`)). Jalan yang ditolak pagunya berhenti dan dicatat "tersensor".
- **D-5 penilai GLM** = US$3,00 − biaya nyata D-4 (paling sedikit US$0,30), tag `m2d15/mutu/`.
- Ledger sebelum mulai ±US$11,27; kerja berhenti bila pagu mana pun menolak, dan itu dilaporkan.

**Jalan.** Paling banyak 2 jalan. Jalan 1 selalu dijalankan. **Jalan 2** dijalankan bila (i) jalan 1 tidak terbit, atau (ii) jalan 1 terbit tetapi audit reviewer (§2 b) gagal di ≥ 1 omongan. Berhenti pada simulasi layak tayang pertama. Perkiraan (bukan janji): satu panggilan penulis effort "medium" ±US$0,20–0,35; perkiraan maksimum sebelum kirim ±US$0,42–0,50; gerbang berbayar ±US$0,03–0,05 per omongan-versi. Dengan pagu US$1,40, versi 3 bisa tidak terjangkau bila banyak tulis-ulang pra-periksa — itu dicatat sebagai tersensor, tidak diakali.

## 7. Paket untuk reviewer dan penilai GLM (D-5)

- **Audit Opus satu soal:** semua omongan versi akhir semua jalan (lulus atau tidak) × 4 rotasi tanpa kartu, satu berkas per soal-rotasi, kunci di luar `bahan/` — `eval/keluaran-m2d15/audit-opus/`.
- **Paket penilai mutu buta** (rubrik M2d-13 §7, teks sama): versi akhir omongan M2d-15 + 3 soal DADA tayang + 3 omongan templat TIRT-7 + 2 omongan Opus M2d-13 yang lulus (m2d13-opus-2 o1 dan o3); satu butir per berkas, asal disamarkan, urutan diacak benih tertulis — `eval/keluaran-m2d15/mutu-opus/`.
- **Penilai GLM-5.3:** `effort:"high"`, `max_tokens` 16.000, Wafer, penjaga penalaran 500 token, butir dan rubrik sama dengan paket Opus, urutan acak benih `m2d15-mutu`. Tak terbaca diulang sekali; tetap tak terbaca = hilang, dilaporkan. Butir yang tidak sempat dinilai karena pagu dilaporkan.

## 8. Ramalan arah (dinilai di laporan: sesuai / tidak / tak terukur)

| | ukuran | pembanding | ramalan |
|---|---|---|---|
| R1 | porsi versi yang berhenti di gerbang 1 kode resmi (sesudah pra-periksa) | M2d-13 Opus 5/12 | ≤ 1/6 |
| R2 | porsi omongan yang lolos pra-periksa pada tulisan pertama versi 1 | — | ≥ 2/3 |
| R3 | jalan 1 terbit (a) | M2d-13 Opus 0/2 jalan | ya |
| R4 | versi per omongan lulus (semua versi M2d-15 / omongan lulus) | Opus M2d-13 6,0; templat 9,7 | ≤ 2,0 |
| R5 | biaya nyata per omongan lulus | Opus M2d-13 US$0,39; templat ±US$0,15 | ≤ US$0,50 |
| R6 | laju kunci pilihan-saja (rotasi, jawaban terbaca) | Opus M2d-13 28 %; acak 25 % | ≤ 30 % |
| R7 | omongan versi lulus dengan audit Opus ≤ 2/4 | Opus M2d-13 versi akhir 2/6 | ≥ 2 dari 3 di jalan terbit |
| R8 | mutu penilai Opus buta, rata-rata versi akhir M2d-15 | Opus M2d-13 8,83; DADA 8,00; templat 7,67 | ≥ 8,5 |

Ramalan bukan patokan; meleset tidak mengubah §2.

## 9. Penolakan, galat, amandemen teknis

- Penebak, pembaca kartu, kritikus: aturan M2d-11 tanpa perubahan. Penulis: §4.
- **Amandemen teknis** (dicatat di kode, laporan, dan commit; berkas ini tidak diubah):
  - bila Opus menolak `effort:"medium"` (HTTP 4xx, biaya 0), setelan diganti `reasoning: { max_tokens: 8.000 }` (= 0,5 × `max_tokens`, padanan "medium" di dokumentasi OpenRouter), hal lain sama;
  - bila parameter diterima tetapi tidak dipatuhi — dua panggilan penulis pertama jalan 1 sama-sama berhenti di `max_tokens` tanpa JSON terbaca — setelan diganti sama seperti di atas untuk sisa milestone.
- **Galat kode** (bukan keluaran model) di tengah jalan: jalan dibuang dan diulang **sekali** di slot yang sama sesudah perbaikan di-commit; perbaikan tidak boleh mengubah gerbang, prompt, bank, atau setelan; biaya jalan yang dibuang tetap dihitung.
- Semua hitungan menyebut n terbaca dan tak terbaca. Tidak ada butir yang dibuang diam-diam.

## 10. Batas klaim

- n sangat kecil: 1–2 jalan, ≤ 6 omongan, satu emiten (TIRT), satu tanggal, satu sampel per panggilan.
- Empat perubahan sekaligus (§1): hasil tidak bisa diatribusikan ke effort, prompt, pra-periksa, atau bank sendiri-sendiri.
- Bank sudut berasal dari data kecil yang sebagian ditulis penulis lain (templat, Haiku) dan sebagian dari suntingan; labelnya opini rekayasa.
- Percobaan berulang (≤ 3 versi, ≤ 2 jalan) menaikkan peluang lulus karena kebetulan; jumlah versi dan jalan dilaporkan.
- LLM bukan pemula: "layak tayang" di sini = lulus gerbang dan audit model, bukan bukti pemain belajar.
- Penulis, auditor (b), penilai Opus, eksekutor, dan reviewer sekeluarga (Anthropic). Audit (b) bisa lebih lunak pada butir Opus (H2/H3 M2d-13 tak bisa disimpulkan). Penilai GLM M2d-13 menunjukkan efek langit-langit.
- Biaya per omongan lulus memakai harga dan penyedia OpenRouter 3 Okt; penyedia bisa berganti antar panggilan.
- Angka ramalan dan ambang label bank adalah pilihan rekayasa yang ditetapkan sebelum data D-4 ada.
